import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { AiService, AiTokenUsage } from '../ai/ai.service.js';
import { TopicsService } from '../topics/topics.service.js';
import {
  AiEnrichVocabularyDto,
  AiExtractImageVocabularyDto,
  AiGenerateVocabularyDto,
} from './dto/ai-vocabulary.dto.js';
import { VocabularyService } from './vocabulary.service.js';

export const MAX_VOCAB_IMAGE_BYTES = 5 * 1024 * 1024;
export const DEFAULT_IMAGE_EXTRACT_COUNT = 8;

export interface UploadedImageInput {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface AiVocabularyDraft {
  term: string;
  pronunciation: string | null;
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
  notes: string | null;
  alreadyExists: boolean;
}

export interface AiEnrichVocabularyResult {
  model: string;
  item: AiVocabularyDraft & { existingMatchCount: number };
  usage?: AiTokenUsage;
}

export interface AiGenerateVocabularyResult {
  model: string;
  items: AiVocabularyDraft[];
  usage?: AiTokenUsage;
}

export interface AiExtractImageVocabularyResult extends AiGenerateVocabularyResult {
  suggestedTopic: string | null;
}

interface RawAiVocabItem {
  term?: unknown;
  pronunciation?: unknown;
  partOfSpeech?: unknown;
  definition?: unknown;
  example?: unknown;
  notes?: unknown;
}

const ENRICH_SYSTEM_PROMPT =
  'You are a bilingual English-Vietnamese dictionary assistant. ' +
  'Return valid JSON only for the requested English word or phrase with exact keys: ' +
  '{"term":"...","pronunciation":"/IPA/","partOfSpeech":"noun|verb|adjective|adverb|phrase|idiom|preposition","definition":"concise Vietnamese meaning","example":"natural English sentence","notes":"short Vietnamese usage tip or collocation, or null"}. ' +
  'Rules: definition and notes MUST be in Vietnamese; example MUST be in English.';

const GENERATE_SYSTEM_PROMPT =
  'You are a bilingual English-Vietnamese vocabulary curator. ' +
  'Return valid JSON only with shape {"items":[...]}. Each item MUST have exact keys: ' +
  '{"term":"English word or phrase","pronunciation":"/IPA/","partOfSpeech":"noun|verb|adjective|adverb|phrase|idiom|preposition","definition":"concise Vietnamese meaning","example":"natural English sentence","notes":"short Vietnamese usage tip or null"}. ' +
  'Rules: definition and notes MUST be in Vietnamese; example MUST be in English; avoid duplicate terms.';

const IMAGE_EXTRACT_SYSTEM_PROMPT =
  'You are a bilingual English-Vietnamese vocabulary curator with OCR and vision analysis. ' +
  'Inspect the image carefully: read any visible English text (book pages, notes, slides, screenshots, signs, menus) or identify key English concepts/objects shown if there is minimal text, and extract up to the requested number of useful English vocabulary words or phrases worth learning. ' +
  'Return valid JSON only with shape {"suggestedTopic":"short 2-4 word topic title or null","items":[...]}. ' +
  'Each item MUST have exact keys: ' +
  '{"term":"English word or phrase","pronunciation":"/IPA/","partOfSpeech":"noun|verb|adjective|adverb|phrase|idiom|preposition","definition":"concise Vietnamese meaning","example":"natural English sentence (prefer context from the image if applicable)","notes":"short Vietnamese usage tip or null"}. ' +
  'Rules: prioritize actual English terms visible in the image when text is present; definition and notes MUST be in Vietnamese; example MUST be in English; avoid duplicate terms; if no usable English vocabulary can be found, return {"suggestedTopic":null,"items":[]}.';

function detectImageMimeType(
  buffer: Buffer,
): 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buffer.length >= 6) {
    const header = buffer.subarray(0, 6).toString('ascii');
    if (header === 'GIF87a' || header === 'GIF89a') {
      return 'image/gif';
    }
  }
  return null;
}

@Injectable()
export class VocabularyAiService {
  constructor(
    private readonly aiService: AiService,
    private readonly vocabularyService: VocabularyService,
    private readonly topicsService: TopicsService,
  ) {}

  async enrichTerm(
    userId: number,
    dto: AiEnrichVocabularyDto,
  ): Promise<AiEnrichVocabularyResult> {
    const term = dto.term.trim();
    if (!term) {
      throw new BadRequestException('Term cannot be empty');
    }

    const contextHint = dto.context?.trim()
      ? `\nContext hint: ${dto.context.trim()}`
      : '';

    const { model, data, usage } =
      await this.aiService.chatJson<RawAiVocabItem>(
        [
          { role: 'system', content: ENRICH_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `English term: "${term}"${contextHint}`,
          },
        ],
        { temperature: 0.3, maxTokens: 320 },
      );

    const sanitized = this.sanitizeDraft(data, term);
    if (!sanitized) {
      throw new BadGatewayException(
        'AI provider did not return a valid vocabulary definition',
      );
    }

    const dup = await this.vocabularyService.checkDuplicate(
      userId,
      sanitized.term,
    );

    return {
      model,
      item: {
        ...sanitized,
        alreadyExists: dup.exists,
        existingMatchCount: dup.matches.length,
      },
      usage,
    };
  }

  async generateBatch(
    userId: number,
    dto: AiGenerateVocabularyDto,
  ): Promise<AiGenerateVocabularyResult> {
    const prompt = dto.prompt.trim();
    if (!prompt) {
      throw new BadRequestException('Prompt cannot be empty');
    }

    const mode = dto.mode ?? 'topic';
    const count = dto.count ?? 5;
    const { topicContext, avoidLine } = await this.resolveTopicContext(
      userId,
      dto.topicId,
    );

    const levelLine = dto.level ? `\nCEFR level: ${dto.level}` : '';

    const userPrompt =
      mode === 'passage'
        ? `Extract up to ${count} useful English vocabulary words or phrases from the passage below.${levelLine}${topicContext}${avoidLine}\n\nPassage:\n${prompt}`
        : `Generate ${count} practical English vocabulary words or phrases for this request: "${prompt}".${levelLine}${topicContext}${avoidLine}`;

    const { model, data, usage } = await this.aiService.chatJson<{
      items?: unknown;
    }>(
      [
        { role: 'system', content: GENERATE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: mode === 'passage' ? 0.3 : 0.6,
        maxTokens: Math.min(1400, 165 * count + 140),
      },
    );

    const items = await this.finalizeDrafts(userId, data.items, count);
    if (items.length === 0) {
      throw new BadGatewayException(
        'AI provider returned no usable vocabulary items',
      );
    }

    return {
      model,
      items,
      usage,
    };
  }

  async extractFromImage(
    userId: number,
    file: UploadedImageInput | undefined,
    dto: AiExtractImageVocabularyDto,
  ): Promise<AiExtractImageVocabularyResult> {
    const dataUrl = this.validateAndEncodeImage(file);
    const count = dto.count ?? DEFAULT_IMAGE_EXTRACT_COUNT;
    const { topicContext, avoidLine } = await this.resolveTopicContext(
      userId,
      dto.topicId,
    );

    const levelLine = dto.level ? `\nTarget CEFR level: ${dto.level}` : '';
    const focusLine = dto.prompt?.trim()
      ? `\nLearner focus instruction: ${dto.prompt.trim()}`
      : '';

    const instructionText =
      `Extract up to ${count} useful English vocabulary words or phrases from this image.` +
      `${levelLine}${topicContext}${avoidLine}${focusLine}`;

    const { model, data, usage } = await this.aiService.chatJson<{
      suggestedTopic?: unknown;
      items?: unknown;
    }>(
      [
        { role: 'system', content: IMAGE_EXTRACT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: instructionText },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      {
        temperature: 0.25,
        maxTokens: Math.min(2048, 175 * count + 220),
        vision: true,
        timeoutMs: 60_000,
      },
    );

    const items = await this.finalizeDrafts(userId, data.items, count);
    if (items.length === 0) {
      throw new BadRequestException(
        'No English vocabulary could be extracted from this image. Try a clearer image or add a focus prompt.',
      );
    }

    return {
      model,
      suggestedTopic: this.cleanText(data.suggestedTopic, 120),
      items,
      usage,
    };
  }

  private validateAndEncodeImage(file?: UploadedImageInput): string {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Image file is required');
    }
    if (file.buffer.length > MAX_VOCAB_IMAGE_BYTES) {
      throw new BadRequestException('Image file size must not exceed 5 MB');
    }

    const detectedMime = detectImageMimeType(file.buffer);
    if (!detectedMime) {
      throw new BadRequestException(
        'Unsupported image format. Please upload a PNG, JPEG, WebP, or GIF file.',
      );
    }

    return `data:${detectedMime};base64,${file.buffer.toString('base64')}`;
  }

  private async resolveTopicContext(
    userId: number,
    topicId?: number,
  ): Promise<{ topicContext: string; avoidLine: string }> {
    if (!topicId) {
      return { topicContext: '', avoidLine: '' };
    }

    const [topic] = await this.topicsService.findOwnedTopicsByIds(userId, [
      topicId,
    ]);
    const topicContext = `\nTarget topic: ${topic.name}${topic.description ? ` (${topic.description})` : ''}`;
    const avoidTerms = await this.vocabularyService.listTopicTerms(
      userId,
      topicId,
      30,
    );
    const avoidLine =
      avoidTerms.length > 0
        ? `\nAvoid repeating these already-saved terms: ${avoidTerms.join(', ')}`
        : '';

    return { topicContext, avoidLine };
  }

  private async finalizeDrafts(
    userId: number,
    rawItemsInput: unknown,
    limit: number,
  ): Promise<AiVocabularyDraft[]> {
    const rawItems = Array.isArray(rawItemsInput)
      ? (rawItemsInput as RawAiVocabItem[])
      : [];

    const deduped: Array<Omit<AiVocabularyDraft, 'alreadyExists'>> = [];
    const seen = new Set<string>();
    for (const raw of rawItems) {
      const draft = this.sanitizeDraft(raw);
      if (!draft) continue;
      const key = draft.term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(draft);
      if (deduped.length >= limit) break;
    }

    if (deduped.length === 0) {
      return [];
    }

    const existingSet = await this.vocabularyService.findExistingTermSet(
      userId,
      deduped.map((d) => d.term),
    );

    return deduped.map((draft) => ({
      ...draft,
      alreadyExists: existingSet.has(draft.term.toLowerCase()),
    }));
  }

  private sanitizeDraft(
    raw: RawAiVocabItem,
    fallbackTerm?: string,
  ): Omit<AiVocabularyDraft, 'alreadyExists'> | null {
    const term = this.cleanText(raw.term, 255) ?? fallbackTerm?.trim() ?? null;
    const definition = this.cleanText(raw.definition, 5000);
    if (!term || !definition) {
      return null;
    }

    const rawPos = this.cleanText(raw.partOfSpeech, 64)?.toLowerCase() ?? null;

    return {
      term,
      pronunciation: this.cleanText(raw.pronunciation, 255),
      partOfSpeech: rawPos,
      definition,
      example: this.cleanText(raw.example, 5000),
      notes: this.cleanText(raw.notes, 5000),
    };
  }

  private cleanText(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null') {
      return null;
    }
    return trimmed.slice(0, maxLength);
  }
}
