import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AiRole = 'system' | 'user' | 'assistant';

export type AiMessageContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type AiMessageContent = string | AiMessageContentPart[];

export interface AiMessage {
  role: AiRole;
  content: AiMessageContent;
}

export type AiReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'default';
export type AiReasoningFormat = 'parsed' | 'hidden' | 'raw';

export interface AiChatOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  vision?: boolean;
  timeoutMs?: number;
  reasoningEffort?: AiReasoningEffort;
  reasoningFormat?: AiReasoningFormat;
}

export interface AiTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AiChatResult {
  model: string;
  content: string;
  usage?: AiTokenUsage;
}

interface GroqChatResponse {
  model: string;
  choices: {
    message: { role: string; content: string | null };
    finish_reason?: string | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ChatPayloadOverrides {
  omitReasoning?: boolean;
  omitResponseFormat?: boolean;
}

export const DEFAULT_GROQ_MODEL = 'qwen/qwen3.8-27b';
export const DEFAULT_GROQ_VISION_MODEL = 'qwen/qwen3.8-27b';
export const DEFAULT_GROQ_FALLBACK_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
] as const;
export const DEFAULT_GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo';
export const DEFAULT_GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
export const DEFAULT_CHAT_MAX_TOKENS = 768;
export const MAX_WHISPER_PROMPT_CHARS = 200;
export const DEFAULT_COOLDOWN_MS = 60_000;
export const MAX_COOLDOWN_MS = 3_600_000;

export interface UploadedAudioInput {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface AiTranscribeResult {
  model: string;
  text: string;
}

const REQUEST_TIMEOUT_MS = 30_000;
const VISION_REQUEST_TIMEOUT_MS = 60_000;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly modelCooldowns = new Map<string, number>();

  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    return (
      this.configService.get<string>('AI_PROVIDER') === 'groq' &&
      !!this.configService.get<string>('GROQ_API_KEY')
    );
  }

  get model(): string {
    return this.configService.get<string>('GROQ_MODEL') || DEFAULT_GROQ_MODEL;
  }

  get visionModel(): string {
    return (
      this.configService.get<string>('GROQ_VISION_MODEL')?.trim() ||
      DEFAULT_GROQ_VISION_MODEL
    );
  }

  /**
   * Ordered priority pool of chat models starting with primary model followed by configured fallbacks.
   */
  getCandidateModels(vision = false): string[] {
    if (vision) {
      const rawVisionFallbacks = this.configService
        .get<string>('GROQ_VISION_FALLBACK_MODELS')
        ?.trim();
      const visionFallbacks =
        !rawVisionFallbacks || rawVisionFallbacks.toLowerCase() === 'none'
          ? []
          : rawVisionFallbacks
              .split(',')
              .map((m) => m.trim())
              .filter(Boolean);
      return Array.from(new Set([this.visionModel, ...visionFallbacks]));
    }

    const rawFallbacks = this.configService
      .get<string>('GROQ_FALLBACK_MODELS')
      ?.trim();
    const fallbacks = !rawFallbacks
      ? [...DEFAULT_GROQ_FALLBACK_MODELS]
      : rawFallbacks.toLowerCase() === 'none'
        ? []
        : rawFallbacks
            .split(',')
            .map((m) => m.trim())
            .filter(Boolean);

    return Array.from(new Set([this.model, ...fallbacks]));
  }

  /**
   * Compute currently eligible models (skipping models in active rate-limit cooldown)
   * and minimum wait seconds if every candidate model is temporarily limited.
   */
  selectAvailableModels(
    now = Date.now(),
    vision = false,
  ): {
    available: string[];
    retryAfterSeconds: number;
  } {
    for (const [modelName, until] of this.modelCooldowns.entries()) {
      if (until <= now) {
        this.modelCooldowns.delete(modelName);
      }
    }

    const candidates = this.getCandidateModels(vision);
    const available = candidates.filter((m) => !this.modelCooldowns.has(m));
    if (available.length > 0) {
      return { available, retryAfterSeconds: 0 };
    }

    const earliestUntil = Math.min(
      ...candidates.map(
        (m) => this.modelCooldowns.get(m) ?? now + DEFAULT_COOLDOWN_MS,
      ),
    );
    return {
      available: [],
      retryAfterSeconds: Math.max(1, Math.ceil((earliestUntil - now) / 1000)),
    };
  }

  async chat(
    messages: AiMessage[],
    options: AiChatOptions = {},
  ): Promise<AiChatResult> {
    return this.executeChatWithFailover(messages, options, (raw) => raw);
  }

  async chatJson<T extends object>(
    messages: AiMessage[],
    options: Omit<AiChatOptions, 'jsonMode'> = {},
  ): Promise<{ model: string; data: T; usage?: AiChatResult['usage'] }> {
    return this.executeChatWithFailover(
      messages,
      { ...options, jsonMode: true },
      (raw) => {
        const data = this.parseJsonObjectResponse<T>(raw.content);
        if (!data) {
          return null;
        }
        return {
          model: raw.model,
          data,
          ...(raw.usage ? { usage: raw.usage } : {}),
        };
      },
      'AI provider returned invalid JSON',
    );
  }

  private async executeChatWithFailover<T>(
    messages: AiMessage[],
    options: AiChatOptions,
    transform: (raw: AiChatResult, finishReason?: string | null) => T | null,
    invalidResultMessage = 'AI provider returned an unexpected error',
  ): Promise<T> {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException(
        'AI provider is disabled. Set AI_PROVIDER=groq and GROQ_API_KEY.',
      );
    }

    const baseUrl =
      this.configService.get<string>('GROQ_BASE_URL') || DEFAULT_GROQ_BASE_URL;
    const apiKey = this.configService.getOrThrow<string>('GROQ_API_KEY');
    const isVision = Boolean(options.vision);

    const selection = this.selectAvailableModels(Date.now(), isVision);
    if (selection.available.length === 0) {
      throw new HttpException(
        `AI rate limit reached across all configured models. Please wait about ${selection.retryAfterSeconds}s and try again.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let lastFailure: {
      status: number;
      detail: string;
      response?: Response;
    } | null = null;
    let sawUnreachable = false;
    let sawInvalidTransform = false;

    for (let idx = 0; idx < selection.available.length; idx += 1) {
      const candidateModel = selection.available[idx];
      const hasMoreCandidates = idx < selection.available.length - 1;
      const attemptResult = await this.attemptCandidateChat(
        baseUrl,
        apiKey,
        candidateModel,
        messages,
        options,
      );

      if (attemptResult.kind === 'unreachable') {
        sawUnreachable = true;
        this.markModelUnavailable(candidateModel, 15_000, 504);
        if (hasMoreCandidates) {
          continue;
        }
        throw new BadGatewayException('AI provider is unreachable');
      }

      if (attemptResult.kind === 'ok') {
        const { result, finishReason } = attemptResult;
        const transformed = transform(result, finishReason);
        if (transformed !== null) {
          return transformed;
        }

        sawInvalidTransform = true;
        this.logger.warn(
          `Model ${candidateModel} returned empty or invalid structured output (finish_reason=${finishReason ?? 'unknown'})`,
        );

        // If structured json_object mode returned empty/truncated content on the final candidate,
        // retry once without response_format before failing.
        if (options.jsonMode && !hasMoreCandidates) {
          const fallbackAttempt = await this.attemptCandidateChat(
            baseUrl,
            apiKey,
            candidateModel,
            messages,
            options,
            { omitResponseFormat: true },
          );
          if (fallbackAttempt.kind === 'ok') {
            const retried = transform(
              fallbackAttempt.result,
              fallbackAttempt.finishReason,
            );
            if (retried !== null) {
              return retried;
            }
          }
        }

        if (hasMoreCandidates) {
          continue;
        }
        throw new BadGatewayException(invalidResultMessage);
      }

      const { status, detail, response } = attemptResult;
      lastFailure = { status, detail, response };

      if (
        status === HttpStatus.BAD_REQUEST &&
        detail.toLowerCase().includes('image')
      ) {
        throw new BadRequestException(
          'Unable to read the uploaded image. Please use a clear PNG, JPEG, WebP, or GIF image.',
        );
      }

      if (status === HttpStatus.UNAUTHORIZED) {
        this.logger.error(`Groq API error ${status}: ${detail}`);
        throw new BadGatewayException(
          'AI provider authentication failed (401). Verify GROQ_API_KEY.',
        );
      }

      if (status === HttpStatus.FORBIDDEN) {
        const lowerDetail = detail.toLowerCase();
        const cfRay = response.headers?.get?.('cf-ray');
        this.logger.error(
          `Groq API error 403${cfRay ? ` [cf-ray=${cfRay}]` : ''}: ${detail}`,
        );
        const isModelScoped =
          lowerDetail.includes('model') &&
          !lowerDetail.includes('network settings');
        if (isModelScoped && hasMoreCandidates) {
          this.markModelUnavailable(candidateModel, 300_000, status);
          continue;
        }
        throw new BadGatewayException(
          'AI provider denied this server request (403). Check AWS network/egress settings and GROQ_API_KEY permissions.',
        );
      }

      const isJsonValidateFailure =
        status === HttpStatus.BAD_REQUEST && this.isJsonValidationError(detail);
      const isFailoverStatus =
        status === HttpStatus.TOO_MANY_REQUESTS ||
        status === HttpStatus.NOT_FOUND ||
        status === HttpStatus.REQUEST_TIMEOUT ||
        status >= HttpStatus.INTERNAL_SERVER_ERROR ||
        isJsonValidateFailure;

      if (isFailoverStatus) {
        const cooldownMs =
          status === HttpStatus.NOT_FOUND
            ? MAX_COOLDOWN_MS
            : isJsonValidateFailure
              ? 10_000
              : this.computeCooldownMs(response, detail);
        this.markModelUnavailable(candidateModel, cooldownMs, status);
        if (hasMoreCandidates) {
          continue;
        }

        if (status === HttpStatus.TOO_MANY_REQUESTS) {
          const postExhaust = this.selectAvailableModels(Date.now(), isVision);
          this.throwMappedProviderError(
            'Groq API error',
            'AI provider returned an error',
            status,
            detail,
            response,
            postExhaust.retryAfterSeconds,
          );
        }
      }

      this.throwMappedProviderError(
        'Groq API error',
        'AI provider returned an error',
        status,
        detail,
        response,
      );
    }

    if (lastFailure) {
      this.throwMappedProviderError(
        'Groq API error',
        'AI provider returned an error',
        lastFailure.status,
        lastFailure.detail,
        lastFailure.response,
      );
    }

    if (sawInvalidTransform) {
      throw new BadGatewayException(invalidResultMessage);
    }
    if (sawUnreachable) {
      throw new BadGatewayException('AI provider is unreachable');
    }

    throw new BadGatewayException('AI provider returned an unexpected error');
  }

  private async attemptCandidateChat(
    baseUrl: string,
    apiKey: string,
    model: string,
    messages: AiMessage[],
    options: AiChatOptions,
    initialOverrides: ChatPayloadOverrides = {},
  ): Promise<
    | { kind: 'ok'; result: AiChatResult; finishReason?: string | null }
    | { kind: 'unreachable' }
    | { kind: 'http_error'; status: number; detail: string; response: Response }
  > {
    let overrides: ChatPayloadOverrides = { ...initialOverrides };

    for (let retry = 0; retry < 2; retry += 1) {
      const response = await this.sendChatRequest(
        baseUrl,
        apiKey,
        model,
        messages,
        options,
        overrides,
      );
      if (!response) {
        return { kind: 'unreachable' };
      }

      if (response.ok) {
        const data = (await response.json()) as GroqChatResponse;
        const choice = data.choices?.[0];
        const content = choice?.message?.content ?? '';
        return {
          kind: 'ok',
          finishReason: choice?.finish_reason,
          result: {
            model: data.model || model,
            content,
            usage: data.usage && {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens,
            },
          },
        };
      }

      const detail = await response.text().catch(() => '');

      // Retry same candidate without reasoning fields if provider rejects reasoning_* params.
      if (
        response.status === HttpStatus.BAD_REQUEST &&
        !overrides.omitReasoning &&
        this.isUnsupportedReasoningError(detail)
      ) {
        this.logger.warn(
          `Model ${model} rejected reasoning parameters; retrying without reasoning hints`,
        );
        overrides = { ...overrides, omitReasoning: true };
        continue;
      }

      // Retry same candidate once without response_format if Groq's JSON validator failed on it.
      if (
        response.status === HttpStatus.BAD_REQUEST &&
        options.jsonMode &&
        !overrides.omitResponseFormat &&
        this.isJsonValidationError(detail)
      ) {
        overrides = { ...overrides, omitResponseFormat: true };
        continue;
      }

      return { kind: 'http_error', status: response.status, detail, response };
    }

    return { kind: 'unreachable' };
  }

  private async sendChatRequest(
    baseUrl: string,
    apiKey: string,
    model: string,
    messages: AiMessage[],
    options: AiChatOptions,
    overrides: ChatPayloadOverrides = {},
  ): Promise<Response | null> {
    const timeoutMs =
      options.timeoutMs ??
      (options.vision ? VISION_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS);
    try {
      const body = this.buildChatPayload(model, messages, options, overrides);
      return await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      this.logger.error(
        `Groq request failed (${model}): ${(error as Error).message}`,
      );
      return null;
    }
  }

  private buildChatPayload(
    model: string,
    messages: AiMessage[],
    options: AiChatOptions,
    overrides: ChatPayloadOverrides = {},
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? DEFAULT_CHAT_MAX_TOKENS,
    };

    if (options.jsonMode && !overrides.omitResponseFormat) {
      payload.response_format = { type: 'json_object' };
    }

    if (!overrides.omitReasoning) {
      const lowerModel = model.toLowerCase();
      if (lowerModel.startsWith('openai/gpt-oss-')) {
        if (options.reasoningEffort || (options.jsonMode && !options.vision)) {
          payload.reasoning_effort =
            options.reasoningEffort && options.reasoningEffort !== 'default'
              ? options.reasoningEffort
              : 'low';
          payload.reasoning_format = options.reasoningFormat ?? 'parsed';
        }
      } else if (lowerModel.startsWith('qwen/')) {
        if (options.reasoningEffort && options.reasoningEffort !== 'default') {
          payload.reasoning_effort = options.reasoningEffort;
        } else if (options.jsonMode && !options.vision) {
          payload.reasoning_effort = 'none';
        }
        if (options.reasoningFormat) {
          payload.reasoning_format = options.reasoningFormat;
        }
      } else if (
        options.reasoningEffort &&
        options.reasoningEffort !== 'default'
      ) {
        payload.reasoning_effort = options.reasoningEffort;
        if (options.reasoningFormat) {
          payload.reasoning_format = options.reasoningFormat;
        }
      }
    }

    return payload;
  }

  private isJsonValidationError(detail: string): boolean {
    const lower = detail.toLowerCase();
    return (
      lower.includes('json_validate_failed') ||
      lower.includes('failed to generate json') ||
      lower.includes('failed to validate json')
    );
  }

  private isUnsupportedReasoningError(detail: string): boolean {
    const lower = detail.toLowerCase();
    return (
      lower.includes('reasoning_effort') || lower.includes('reasoning_format')
    );
  }

  private parseJsonObjectResponse<T extends object>(content: string): T | null {
    let cleaned = content
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    if (!cleaned) {
      return null;
    }

    try {
      const parsed = JSON.parse(cleaned) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return null;
      }
      return parsed as T;
    } catch {
      return null;
    }
  }

  private parseResetDurationMs(rawValue?: string | null): number | null {
    if (!rawValue) return null;
    const trimmed = rawValue.trim();
    if (!trimmed) return null;

    if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
      const secs = Number(trimmed);
      return Number.isFinite(secs) && secs > 0 ? Math.ceil(secs * 1000) : null;
    }

    let totalMs = 0;
    let matched = false;
    for (const part of trimmed.matchAll(/(\d+(?:\.\d+)?)\s*(ms|m|s|h)/gi)) {
      matched = true;
      const num = Number(part[1]);
      const unit = part[2].toLowerCase();
      if (!Number.isFinite(num)) continue;
      if (unit === 'h') totalMs += num * 3_600_000;
      else if (unit === 'm') totalMs += num * 60_000;
      else if (unit === 'ms') totalMs += num;
      else totalMs += num * 1000;
    }
    return matched && totalMs > 0 ? Math.ceil(totalMs) : null;
  }

  private computeCooldownMs(response: Response, detail = ''): number {
    const retryAfterMs = this.parseResetDurationMs(
      response.headers?.get?.('retry-after'),
    );
    if (retryAfterMs !== null) {
      return Math.min(MAX_COOLDOWN_MS, Math.max(5_000, retryAfterMs));
    }

    const tokenResetMs = this.parseResetDurationMs(
      response.headers?.get?.('x-ratelimit-reset-tokens'),
    );
    if (tokenResetMs !== null) {
      return Math.min(MAX_COOLDOWN_MS, Math.max(5_000, tokenResetMs));
    }

    const bodyMatch = detail.match(
      /try again in\s+(\d+(?:\.\d+)?\s*(?:ms|s|m|h))/i,
    );
    const bodyResetMs = this.parseResetDurationMs(bodyMatch?.[1]);
    if (bodyResetMs !== null) {
      return Math.min(MAX_COOLDOWN_MS, Math.max(5_000, bodyResetMs));
    }

    return response.status === HttpStatus.TOO_MANY_REQUESTS
      ? DEFAULT_COOLDOWN_MS
      : 15_000;
  }

  private markModelUnavailable(
    model: string,
    cooldownMs: number,
    statusCode: number,
    now = Date.now(),
  ): void {
    this.modelCooldowns.set(model, now + cooldownMs);
    this.logger.warn(
      `Model ${model} hit HTTP ${statusCode}; switching fallback pool and cooling down for ${Math.ceil(cooldownMs / 1000)}s`,
    );
  }

  async transcribeAudio(
    file: UploadedAudioInput,
    options: { language?: string; prompt?: string } = {},
  ): Promise<AiTranscribeResult> {
    if (!this.isEnabled()) {
      throw new ServiceUnavailableException(
        'AI provider is disabled. Set AI_PROVIDER=groq and GROQ_API_KEY.',
      );
    }
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Audio recording cannot be empty');
    }

    const baseUrl =
      this.configService.get<string>('GROQ_BASE_URL') || DEFAULT_GROQ_BASE_URL;
    const apiKey = this.configService.getOrThrow<string>('GROQ_API_KEY');

    const form = new FormData();
    const mime = file.mimetype || 'audio/webm';
    const blob = new Blob([new Uint8Array(file.buffer)], { type: mime });
    form.append('file', blob, file.originalname || 'speech.webm');
    form.append('model', DEFAULT_GROQ_WHISPER_MODEL);
    form.append('response_format', 'json');
    form.append('language', options.language?.trim() || 'en');
    if (options.prompt?.trim()) {
      form.append(
        'prompt',
        options.prompt.trim().slice(0, MAX_WHISPER_PROMPT_CHARS),
      );
    }

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(
        `Groq Whisper request failed: ${(error as Error).message}`,
      );
      throw new BadGatewayException(
        'AI speech transcription service is unreachable',
      );
    }

    if (!response.ok) {
      await this.throwProviderError(
        'Groq Whisper error',
        'AI transcription failed',
        response,
      );
    }

    const payload = (await response.json()) as { text?: unknown };
    const text = typeof payload.text === 'string' ? payload.text.trim() : '';

    return {
      model: DEFAULT_GROQ_WHISPER_MODEL,
      text,
    };
  }

  private async throwProviderError(
    logPrefix: string,
    clientLabel: string,
    response: Response,
    overrideWaitSeconds?: number,
  ): Promise<never> {
    const detail = await response.text().catch(() => '');
    this.throwMappedProviderError(
      logPrefix,
      clientLabel,
      response.status,
      detail,
      response,
      overrideWaitSeconds,
    );
  }

  private throwMappedProviderError(
    logPrefix: string,
    clientLabel: string,
    status: number,
    detail: string,
    response?: Response,
    overrideWaitSeconds?: number,
  ): never {
    this.logger.error(`${logPrefix} ${status}: ${detail}`);

    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      const retryAfterMs = response
        ? this.computeCooldownMs(response, detail)
        : null;
      const retrySec =
        overrideWaitSeconds && overrideWaitSeconds > 0
          ? overrideWaitSeconds
          : retryAfterMs !== null
            ? Math.ceil(retryAfterMs / 1000)
            : NaN;
      const waitHint =
        Number.isFinite(retrySec) && retrySec > 0
          ? `about ${retrySec}s`
          : 'a few seconds';
      throw new HttpException(
        `AI rate limit reached. Please wait ${waitHint} and try again.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (
      status === HttpStatus.BAD_REQUEST &&
      detail.toLowerCase().includes('image')
    ) {
      throw new BadRequestException(
        'Unable to read the uploaded image. Please use a clear PNG, JPEG, WebP, or GIF image.',
      );
    }

    throw new BadGatewayException(`${clientLabel} (${status})`);
  }
}
