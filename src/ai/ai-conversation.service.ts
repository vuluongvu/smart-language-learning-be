import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { assertResourceOwnership } from '../common/guards/ownership.guard.js';
import { AiMessage, AiService } from './ai.service.js';
import {
  ReplyConversationDto,
  StartConversationDto,
} from './dto/conversation.dto.js';
import {
  AiConversationSession,
  ConversationCommonMistake,
  ConversationLevel,
  ConversationSessionStatus,
  ConversationSummary,
  ConversationSummaryVocabItem,
  ExplanationLanguage,
} from './entities/ai-conversation-session.entity.js';
import {
  AiConversationTurn,
  AppropriatenessRating,
  ConversationFeedbackError,
  ConversationSuggestedWord,
  ConversationTurnFeedback,
  ErrorCategory,
} from './entities/ai-conversation-turn.entity.js';

export interface AiConversationTurnView {
  id: number;
  turnNumber: number;
  aiPrompt: string;
  userAnswer: string | null;
  feedback: ConversationTurnFeedback | null;
  answeredAt: Date | null;
  createdAt: Date;
}

export interface AiConversationSessionSummaryView {
  id: number;
  topic: string;
  level: ConversationLevel;
  explanationLang: ExplanationLanguage;
  status: ConversationSessionStatus;
  turnCount: number;
  summary: ConversationSummary | null;
  createdAt: Date;
  updatedAt: Date;
  endedAt: Date | null;
}

export interface AiConversationSessionDetailView extends AiConversationSessionSummaryView {
  turns: AiConversationTurnView[];
}

interface RawOpeningResponse {
  greeting?: unknown;
  openingQuestion?: unknown;
}

interface RawReplyResponse {
  appropriateness?: unknown;
  assessment?: unknown;
  notableErrors?: unknown;
  improvedVersion?: unknown;
  explanation?: unknown;
  suggestedWords?: unknown;
  followUpReaction?: unknown;
  nextQuestion?: unknown;
}

interface RawSummaryResponse {
  overallRemark?: unknown;
  commonMistakes?: unknown;
  newVocabulary?: unknown;
  improvementTips?: unknown;
}

const VALID_ERROR_CATEGORIES = new Set<ErrorCategory>([
  'grammar',
  'vocabulary',
  'phrasing',
  'tone',
]);

@Injectable()
export class AiConversationService {
  constructor(
    @InjectRepository(AiConversationSession)
    private readonly sessionRepo: Repository<AiConversationSession>,
    @InjectRepository(AiConversationTurn)
    private readonly turnRepo: Repository<AiConversationTurn>,
    private readonly aiService: AiService,
    private readonly dataSource: DataSource,
  ) {}

  async listSessions(
    userId: number,
  ): Promise<AiConversationSessionSummaryView[]> {
    const rows = await this.sessionRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC', id: 'DESC' },
      take: 20,
    });
    return rows.map((row) => this.toSessionSummaryView(row));
  }

  async getSessionDetail(
    userId: number,
    sessionId: number,
  ): Promise<AiConversationSessionDetailView> {
    const session = await this.findOwnedSession(userId, sessionId);
    const turns = await this.loadSortedTurns(session.id);
    return this.toSessionDetailView(session, turns);
  }

  async startSession(
    userId: number,
    dto: StartConversationDto,
  ): Promise<AiConversationSessionDetailView> {
    const topic = dto.topic.trim();
    if (topic.length < 2) {
      throw new BadRequestException('Topic must be at least 2 characters');
    }
    const level: ConversationLevel = dto.level ?? 'B1';
    const explanationLang: ExplanationLanguage = dto.explanationLang ?? 'vi';

    const { data } = await this.aiService.chatJson<RawOpeningResponse>(
      [
        {
          role: 'system',
          content:
            'You are a friendly English conversation coach starting a guided 1-on-1 practice session. ' +
            'Return ONLY valid JSON with exact keys: {"greeting":"...","openingQuestion":"..."}. ' +
            'Rules: Both fields MUST be written in natural English calibrated strictly to the requested CEFR level. ' +
            'greeting: 1 short warm sentence welcoming the learner to the scenario. ' +
            'openingQuestion: 1 clear, inviting first English question directly on the topic to get them speaking.',
        },
        {
          role: 'user',
          content: `Topic: "${topic}"\nTarget CEFR level: ${level}\nGenerate the opening greeting and first English question.`,
        },
      ],
      { temperature: 0.7, maxTokens: 220 },
    );

    const aiPrompt = this.buildOpeningPrompt(data);

    const saved = await this.dataSource.transaction(async (manager) => {
      const session = await manager.save(
        AiConversationSession,
        manager.create(AiConversationSession, {
          userId,
          topic,
          level,
          explanationLang,
          status: 'active',
          turnCount: 0,
          summaryJson: null,
          endedAt: null,
        }),
      );

      const firstTurn = await manager.save(
        AiConversationTurn,
        manager.create(AiConversationTurn, {
          sessionId: session.id,
          turnNumber: 1,
          aiPrompt,
          userAnswer: null,
          feedbackJson: null,
          answeredAt: null,
        }),
      );

      return { session, firstTurn };
    });

    return this.toSessionDetailView(saved.session, [saved.firstTurn]);
  }

  async replyToTurn(
    userId: number,
    sessionId: number,
    dto: ReplyConversationDto,
  ): Promise<AiConversationSessionDetailView> {
    const session = await this.findOwnedSession(userId, sessionId);
    if (session.status !== 'active') {
      throw new BadRequestException(
        'This conversation session has already ended.',
      );
    }

    const answer = dto.answer.trim();
    if (!answer) {
      throw new BadRequestException('Answer cannot be empty');
    }

    const turns = await this.loadSortedTurns(session.id);
    const activeTurn = [...turns].reverse().find((t) => t.userAnswer === null);

    if (!activeTurn) {
      throw new BadRequestException(
        'No pending question found in this conversation session.',
      );
    }

    const explanationLanguageName =
      session.explanationLang === 'en' ? 'English' : 'Vietnamese';

    const messages = this.buildReplyPromptMessages(
      session,
      turns,
      activeTurn,
      answer,
      explanationLanguageName,
      dto.inputMode === 'voice',
    );

    const { data } = await this.aiService.chatJson<RawReplyResponse>(messages, {
      temperature: 0.5,
      maxTokens: 800,
    });

    const parsed = this.parseReplyPayload(
      data,
      answer,
      session.explanationLang,
    );

    const { updatedSession, updatedTurn, nextTurn } =
      await this.dataSource.transaction(async (manager) => {
        activeTurn.userAnswer = answer;
        activeTurn.feedbackJson = parsed.feedback;
        activeTurn.answeredAt = new Date();
        const savedTurn = await manager.save(AiConversationTurn, activeTurn);

        const createdNextTurn = await manager.save(
          AiConversationTurn,
          manager.create(AiConversationTurn, {
            sessionId: session.id,
            turnNumber: activeTurn.turnNumber + 1,
            aiPrompt: parsed.nextAiPrompt,
            userAnswer: null,
            feedbackJson: null,
            answeredAt: null,
          }),
        );

        session.turnCount += 1;
        const savedSession = await manager.save(AiConversationSession, session);

        return {
          updatedSession: savedSession,
          updatedTurn: savedTurn,
          nextTurn: createdNextTurn,
        };
      });

    const mergedTurns = turns.map((t) =>
      t.id === updatedTurn.id ? updatedTurn : t,
    );
    mergedTurns.push(nextTurn);

    return this.toSessionDetailView(updatedSession, mergedTurns);
  }

  async endSession(
    userId: number,
    sessionId: number,
  ): Promise<AiConversationSessionDetailView> {
    const session = await this.findOwnedSession(userId, sessionId);
    const turns = await this.loadSortedTurns(session.id);

    if (session.status === 'completed') {
      return this.toSessionDetailView(session, turns);
    }

    const answeredTurns = turns.filter((t) => t.userAnswer !== null);
    let summary: ConversationSummary;

    if (answeredTurns.length === 0) {
      summary = this.emptySessionSummary(session.explanationLang);
    } else {
      const languageName =
        session.explanationLang === 'en' ? 'English' : 'Vietnamese';
      const digest = answeredTurns.slice(-8).map((t) => ({
        turn: t.turnNumber,
        q: this.truncateText(t.aiPrompt, 140),
        a: this.truncateText(t.userAnswer, 220),
        errs: (t.feedbackJson?.notableErrors ?? []).map(
          (e) => `${e.original} => ${e.correction}`,
        ),
        words: (t.feedbackJson?.suggestedWords ?? []).map((w) => w.term),
      }));

      const { data } = await this.aiService.chatJson<RawSummaryResponse>(
        [
          {
            role: 'system',
            content:
              `Summarize this English practice session concisely. Return ONLY valid JSON: ` +
              `{"overallRemark":"...","commonMistakes":[{"pattern":"...","example":"...","suggestion":"..."}],` +
              `"newVocabulary":[{"term":"...","partOfSpeech":"noun|verb|adjective|adverb|phrase|null","definition":"...","example":"..."}],` +
              `"improvementTips":["..."]}. ` +
              `Write overallRemark, commonMistakes[].pattern/suggestion, newVocabulary[].definition, improvementTips[] in ${languageName}; examples & terms in English.`,
          },
          {
            role: 'user',
            content: `Topic: "${session.topic}" (${session.level}, explain in ${languageName})\nDigest:\n${JSON.stringify(digest)}`,
          },
        ],
        { temperature: 0.4, maxTokens: 850 },
      );

      summary = this.parseSummaryPayload(data, session.explanationLang);
    }

    session.status = 'completed';
    session.endedAt = new Date();
    session.summaryJson = summary;

    const saved = await this.sessionRepo.save(session);
    return this.toSessionDetailView(saved, turns);
  }

  private async findOwnedSession(
    userId: number,
    sessionId: number,
  ): Promise<AiConversationSession> {
    const session = await this.sessionRepo.findOneBy({ id: sessionId });
    if (!session) {
      throw new NotFoundException('Conversation session not found');
    }
    assertResourceOwnership(session.userId, userId, 'Conversation session');
    return session;
  }

  private async loadSortedTurns(
    sessionId: number,
  ): Promise<AiConversationTurn[]> {
    return this.turnRepo.find({
      where: { sessionId },
      order: { turnNumber: 'ASC', id: 'ASC' },
    });
  }

  private buildOpeningPrompt(raw: RawOpeningResponse): string {
    const greeting = this.cleanText(raw.greeting, 400);
    const question = this.cleanText(raw.openingQuestion, 600);
    if (!question) {
      throw new BadGatewayException(
        'AI provider failed to generate an opening question',
      );
    }
    return greeting ? `${greeting}\n\n${question}` : question;
  }

  private buildReplyPromptMessages(
    session: AiConversationSession,
    turns: AiConversationTurn[],
    activeTurn: AiConversationTurn,
    answer: string,
    explanationLanguageName: string,
    isVoiceInput = false,
  ): AiMessage[] {
    const priorHistory = turns
      .filter((t) => t.id !== activeTurn.id && t.userAnswer !== null)
      .slice(-4)
      .map(
        (t) =>
          `Coach: ${this.truncateText(t.aiPrompt, 180)}\nLearner: ${this.truncateText(t.userAnswer, 220)}`,
      )
      .join('\n\n');

    const speechNote = isVoiceInput
      ? '\n- Input is from speech-to-text: focus on spoken grammar/word choice and ignore punctuation artifacts.'
      : '';

    const systemPrompt =
      `You are an English conversation coach. Topic: "${session.topic}" | Level: ${session.level} | Explain in: ${explanationLanguageName}.\n` +
      `Return ONLY valid JSON:\n` +
      `{\n` +
      `  "appropriateness": "great" | "good" | "needs_work",\n` +
      `  "assessment": "State clearly if the reply is correct/natural or has mistakes + brief evaluation in ${explanationLanguageName}",\n` +
      `  "notableErrors": [{"original":"...","correction":"...","category":"grammar|vocabulary|phrasing|tone","reason":"concise reason in ${explanationLanguageName}"}],\n` +
      `  "improvedVersion": "natural English rewrite at ${session.level}",\n` +
      `  "explanation": "concise Markdown tips (**bold**, numbered points separated by newlines) in ${explanationLanguageName}",\n` +
      `  "suggestedWords": [{"term":"word/phrase","partOfSpeech":"noun|verb|adjective|adverb|phrase|null","definition":"meaning in ${explanationLanguageName}","example":"short English example"}],\n` +
      `  "followUpReaction": "1 warm English reaction sentence to the reply",\n` +
      `  "nextQuestion": "1 connected English follow-up question building on the reply (stay on topic)"\n` +
      `}\n` +
      `Rules: Keep notableErrors <= 3 items ([] if none) and suggestedWords <= 3 items. Write improvedVersion, followUpReaction, nextQuestion in ${session.level} English.${speechNote}`;

    const userContent =
      (priorHistory ? `Previous turns:\n${priorHistory}\n\n` : '') +
      `Current Coach Question:\n${activeTurn.aiPrompt}\n\n` +
      `Learner's Answer:\n${answer}`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ];
  }

  private parseReplyPayload(
    raw: RawReplyResponse,
    originalAnswer: string,
    lang: ExplanationLanguage,
  ): { feedback: ConversationTurnFeedback; nextAiPrompt: string } {
    const rawAppropriateness = this.cleanText(raw.appropriateness, 32);
    const appropriateness: AppropriatenessRating =
      rawAppropriateness === 'great' ||
      rawAppropriateness === 'good' ||
      rawAppropriateness === 'needs_work'
        ? rawAppropriateness
        : 'good';

    const reaction = this.cleanText(raw.followUpReaction, 400);
    const nextQuestion = this.cleanText(raw.nextQuestion, 600);
    if (!nextQuestion) {
      throw new BadGatewayException(
        'AI provider failed to generate a follow-up question',
      );
    }

    const errorsInput = Array.isArray(raw.notableErrors)
      ? raw.notableErrors
      : [];
    const notableErrors: ConversationFeedbackError[] = [];
    for (const item of errorsInput.slice(0, 5)) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const original = this.cleanText(obj.original, 300);
      const correction = this.cleanText(obj.correction, 300);
      const reason = this.cleanText(obj.reason, 500);
      const rawCat = this.cleanText(obj.category, 32)?.toLowerCase() ?? '';
      const category: ErrorCategory = VALID_ERROR_CATEGORIES.has(
        rawCat as ErrorCategory,
      )
        ? (rawCat as ErrorCategory)
        : 'phrasing';
      if (original && correction && reason) {
        notableErrors.push({ original, correction, category, reason });
      }
    }

    const suggestedWords = this.parseVocabList(raw.suggestedWords, 4);

    const defaultAssessment =
      lang === 'vi'
        ? 'Câu trả lời phù hợp với ngữ cảnh cuộc hội thoại.'
        : 'Your reply fits the conversation well.';
    const defaultExplanation =
      lang === 'vi'
        ? 'Bạn có thể tham khảo phiên bản cải thiện để diễn đạt tự nhiên hơn.'
        : 'Compare your reply with the improved version to make it sound more natural.';

    return {
      feedback: {
        appropriateness,
        assessment: this.cleanText(raw.assessment, 800) ?? defaultAssessment,
        notableErrors,
        improvedVersion:
          this.cleanText(raw.improvedVersion, 1200) ?? originalAnswer,
        explanation:
          this.cleanText(raw.explanation, 1500) ?? defaultExplanation,
        suggestedWords,
      },
      nextAiPrompt: reaction ? `${reaction}\n\n${nextQuestion}` : nextQuestion,
    };
  }

  private parseSummaryPayload(
    raw: RawSummaryResponse,
    lang: ExplanationLanguage,
  ): ConversationSummary {
    const defaultRemark =
      lang === 'vi'
        ? 'Bạn đã hoàn thành tốt phiên luyện hội thoại hôm nay.'
        : 'Great effort completing this guided conversation session.';

    const rawMistakes = Array.isArray(raw.commonMistakes)
      ? raw.commonMistakes
      : [];
    const commonMistakes: ConversationCommonMistake[] = [];
    for (const entry of rawMistakes.slice(0, 6)) {
      if (!entry || typeof entry !== 'object') continue;
      const obj = entry as Record<string, unknown>;
      const pattern = this.cleanText(obj.pattern, 300);
      const suggestion = this.cleanText(obj.suggestion, 500);
      const example = this.cleanText(obj.example, 400) ?? '';
      if (pattern && suggestion) {
        commonMistakes.push({ pattern, example, suggestion });
      }
    }

    const newVocabulary = this.parseVocabList(raw.newVocabulary, 8);

    const rawTips = Array.isArray(raw.improvementTips)
      ? raw.improvementTips
      : [];
    const improvementTips = rawTips
      .map((tip) => this.cleanText(tip, 400))
      .filter((tip): tip is string => Boolean(tip))
      .slice(0, 5);

    return {
      overallRemark: this.cleanText(raw.overallRemark, 1000) ?? defaultRemark,
      commonMistakes,
      newVocabulary,
      improvementTips,
    };
  }

  private parseVocabList(
    input: unknown,
    maxCount: number,
  ): Array<ConversationSuggestedWord & ConversationSummaryVocabItem> {
    if (!Array.isArray(input)) {
      return [];
    }
    const items: Array<
      ConversationSuggestedWord & ConversationSummaryVocabItem
    > = [];
    const seen = new Set<string>();
    for (const raw of input) {
      if (!raw || typeof raw !== 'object') continue;
      const obj = raw as Record<string, unknown>;
      const term = this.cleanText(obj.term, 160);
      const definition = this.cleanText(obj.definition, 500);
      if (!term || !definition) continue;
      const key = term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        term,
        partOfSpeech:
          this.cleanText(obj.partOfSpeech, 48)?.toLowerCase() ?? null,
        definition,
        example: this.cleanText(obj.example, 400),
      });
      if (items.length >= maxCount) break;
    }
    return items;
  }

  private emptySessionSummary(lang: ExplanationLanguage): ConversationSummary {
    return {
      overallRemark:
        lang === 'vi'
          ? 'Phiên hội thoại đã kết thúc trước khi bạn gửi câu trả lời đầu tiên. Hãy bắt đầu phiên mới và thử trả lời bằng tiếng Anh nhé.'
          : 'This session ended before any English reply was submitted. Start a new session whenever you are ready to practice!',
      commonMistakes: [],
      newVocabulary: [],
      improvementTips: [
        lang === 'vi'
          ? 'Thử viết 2–3 câu tiếng Anh ngắn gọn cho câu hỏi đầu tiên ở phiên tiếp theo.'
          : 'Try answering the opening question with 2–3 short English sentences in your next session.',
      ],
    };
  }

  private truncateText(
    value: string | null | undefined,
    maxLength: number,
  ): string {
    if (!value) {
      return '';
    }
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (normalized.length <= maxLength) {
      return normalized;
    }
    return `${normalized.slice(0, maxLength - 1)}…`;
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

  private toSessionSummaryView(
    row: AiConversationSession,
  ): AiConversationSessionSummaryView {
    return {
      id: row.id,
      topic: row.topic,
      level: row.level,
      explanationLang: row.explanationLang,
      status: row.status,
      turnCount: row.turnCount,
      summary: row.summaryJson ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      endedAt: row.endedAt,
    };
  }

  private toSessionDetailView(
    row: AiConversationSession,
    turns: AiConversationTurn[],
  ): AiConversationSessionDetailView {
    return {
      ...this.toSessionSummaryView(row),
      turns: turns.map((t) => ({
        id: t.id,
        turnNumber: t.turnNumber,
        aiPrompt: t.aiPrompt,
        userAnswer: t.userAnswer,
        feedback: t.feedbackJson ?? null,
        answeredAt: t.answeredAt,
        createdAt: t.createdAt,
      })),
    };
  }
}
