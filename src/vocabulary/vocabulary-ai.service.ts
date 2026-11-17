import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { AiService, AiTokenUsage } from '../ai/ai.service.js';
import { TopicsService } from '../topics/topics.service.js';
import {
  AiEnrichVocabularyDto,
  AiGenerateVocabularyDto,
} from './dto/ai-vocabulary.dto.js';
import { VocabularyService } from './vocabulary.service.js';

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
    let topicContext = '';
    let avoidTerms: string[] = [];

    if (dto.topicId) {
      const [topic] = await this.topicsService.findOwnedTopicsByIds(userId, [
        dto.topicId,
      ]);
      topicContext = `\nTarget topic: ${topic.name}${topic.description ? ` (${topic.description})` : ''}`;
      avoidTerms = await this.vocabularyService.listTopicTerms(
        userId,
        dto.topicId,
        30,
      );
    }

    const levelLine = dto.level ? `\nCEFR level: ${dto.level}` : '';
    const avoidLine =
      avoidTerms.length > 0
        ? `\nAvoid repeating these already-saved terms: ${avoidTerms.join(', ')}`
        : '';

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

    const rawItems = Array.isArray(data.items)
      ? (data.items as RawAiVocabItem[])
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
      if (deduped.length >= count) break;
    }

    if (deduped.length === 0) {
      throw new BadGatewayException(
        'AI provider returned no usable vocabulary items',
      );
    }

    const existingSet = await this.vocabularyService.findExistingTermSet(
      userId,
      deduped.map((d) => d.term),
    );

    return {
      model,
      items: deduped.map((draft) => ({
        ...draft,
        alreadyExists: existingSet.has(draft.term.toLowerCase()),
      })),
      usage,
    };
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
