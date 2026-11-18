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

export interface AiChatOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  vision?: boolean;
  timeoutMs?: number;
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
  choices: { message: { role: string; content: string | null } }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
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

    for (let idx = 0; idx < selection.available.length; idx += 1) {
      const candidateModel = selection.available[idx];
      const response = await this.sendChatRequest(
        baseUrl,
        apiKey,
        candidateModel,
        messages,
        options,
      );

      if (response.ok) {
        const data = (await response.json()) as GroqChatResponse;
        const content = data.choices?.[0]?.message?.content ?? '';

        return {
          model: data.model || candidateModel,
          content,
          usage: data.usage && {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          },
        };
      }

      const isFailoverStatus =
        response.status === HttpStatus.TOO_MANY_REQUESTS ||
        response.status === HttpStatus.SERVICE_UNAVAILABLE;

      if (isFailoverStatus) {
        const cooldownMs = this.computeCooldownMs(response);
        this.markModelUnavailable(candidateModel, cooldownMs, response.status);
        if (idx < selection.available.length - 1) {
          continue;
        }
        const postExhaust = this.selectAvailableModels(Date.now(), isVision);
        await this.throwProviderError(
          'Groq API error',
          'AI provider returned an error',
          response,
          postExhaust.retryAfterSeconds,
        );
      }

      await this.throwProviderError(
        'Groq API error',
        'AI provider returned an error',
        response,
      );
    }

    throw new BadGatewayException('AI provider returned an unexpected error');
  }

  private async sendChatRequest(
    baseUrl: string,
    apiKey: string,
    model: string,
    messages: AiMessage[],
    options: AiChatOptions,
  ): Promise<Response> {
    const timeoutMs =
      options.timeoutMs ??
      (options.vision ? VISION_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS);
    try {
      return await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? DEFAULT_CHAT_MAX_TOKENS,
          ...(options.jsonMode
            ? { response_format: { type: 'json_object' } }
            : {}),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      this.logger.error(`Groq request failed: ${(error as Error).message}`);
      throw new BadGatewayException('AI provider is unreachable');
    }
  }

  private computeCooldownMs(response: Response): number {
    const retryAfterRaw = response.headers?.get?.('retry-after');
    const retrySec = retryAfterRaw ? Number(retryAfterRaw) : NaN;
    if (Number.isFinite(retrySec) && retrySec > 0) {
      return Math.min(
        MAX_COOLDOWN_MS,
        Math.max(5_000, Math.ceil(retrySec * 1000)),
      );
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

  async chatJson<T extends object>(
    messages: AiMessage[],
    options: Omit<AiChatOptions, 'jsonMode'> = {},
  ): Promise<{ model: string; data: T; usage?: AiChatResult['usage'] }> {
    const result = await this.chat(messages, { ...options, jsonMode: true });
    let cleaned = result.content
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

    try {
      const parsed = JSON.parse(cleaned) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Expected JSON object');
      }
      return {
        model: result.model,
        data: parsed as T,
        usage: result.usage,
      };
    } catch (error) {
      this.logger.error(
        `Invalid JSON from AI provider: ${(error as Error).message}`,
      );
      throw new BadGatewayException('AI provider returned invalid JSON');
    }
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
    this.logger.error(`${logPrefix} ${response.status}: ${detail}`);

    if (response.status === HttpStatus.TOO_MANY_REQUESTS) {
      const retryAfterRaw = response.headers?.get?.('retry-after');
      const retrySec =
        overrideWaitSeconds && overrideWaitSeconds > 0
          ? overrideWaitSeconds
          : retryAfterRaw
            ? Math.ceil(Number(retryAfterRaw))
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
      response.status === HttpStatus.BAD_REQUEST &&
      detail.toLowerCase().includes('image')
    ) {
      throw new BadRequestException(
        'Unable to read the uploaded image. Please use a clear PNG, JPEG, WebP, or GIF image.',
      );
    }

    throw new BadGatewayException(`${clientLabel} (${response.status})`);
  }
}
