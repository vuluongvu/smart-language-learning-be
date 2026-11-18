import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import {
  AiConversationService,
  AiConversationSessionDetailView,
} from '../ai/ai-conversation.service.js';
import { AiService } from '../ai/ai.service.js';
import { ConversationLevel } from '../ai/entities/ai-conversation-session.entity.js';
import { LanguagesService } from '../languages/languages.service.js';
import { TopicVocabulary } from '../topics/entities/topic-vocabulary.entity.js';
import { Topic } from '../topics/entities/topic.entity.js';
import { TopicsService } from '../topics/topics.service.js';
import { User } from '../users/entities/user.entity.js';
import {
  VocabularyItem,
  VocabularySource,
} from '../vocabulary/entities/vocabulary-item.entity.js';
import { VocabularyService } from '../vocabulary/vocabulary.service.js';
import {
  EvaluateUnitWritingDto,
  GenerateAiLearningPathDto,
  GenerateUnitStudyGuideDto,
  LEARNING_GOAL_BANDS,
  RegenerateAiUnitDto,
  SaveUnitWordsDto,
  StartUnitSpeakingDto,
  SubmitUnitQuizDto,
  UpdateLearningGoalDto,
} from './dto/learning-path.dto.js';
import { LearningPathPart } from './entities/learning-path-part.entity.js';
import { LearningPathTrack } from './entities/learning-path-track.entity.js';
import {
  LearningPathUnit,
  UnitReadingListening,
  UnitStudyGuide,
  UnitVocabWord,
  UnitWritingPrompt,
} from './entities/learning-path-unit.entity.js';
import {
  UnitWritingError,
  UnitWritingFeedback,
  UnitWritingSuggestedWord,
  UserUnitProgress,
} from './entities/user-unit-progress.entity.js';
import { LearningPathAiService } from './learning-path-ai.service.js';
import { LearningPathCatalogService } from './learning-path-catalog.service.js';

export type UnitNodeStatus = 'completed' | 'active' | 'locked';

export interface UnitProgressView {
  vocabCompleted: boolean;
  quizCompleted: boolean;
  quizScore: number | null;
  writingCompleted: boolean;
  writingSubmission: string | null;
  writingFeedback: UnitWritingFeedback | null;
  speakingCompleted: boolean;
  speakingSessionId: number | null;
  topicId: number | null;
  skillsDone: number;
  totalSkills: number;
  percentDone: number;
  completedAt: Date | null;
}

export interface LearningPathUnitNodeView {
  id: number;
  unitNumber: number;
  slug: string;
  title: string;
  topicName: string;
  icon: string;
  themeColor: string;
  grammarFocus: string;
  wordCount: number;
  unlocked: boolean;
  status: UnitNodeStatus;
  progress: UnitProgressView;
}

export interface LearningPathPartView {
  id: number;
  partNumber: number;
  title: string;
  subtitle: string;
  units: LearningPathUnitNodeView[];
}

export interface LearningPathTrackSummary {
  id: number;
  code: string;
  title: string;
  cefrLevel: string;
  languageCode: string;
  summary: string;
  isAiGenerated: boolean;
  sourcePrompt: string | null;
}

export interface LearningPathOverview {
  goal: {
    learningGoalBand: string;
    currentLevel: string;
    dailyGoalMinutes: number;
  };
  tracks: LearningPathTrackSummary[];
  activeTrack: LearningPathTrackSummary;
  parts: LearningPathPartView[];
  stats: {
    completedUnits: number;
    totalUnits: number;
    recommendedUnitId: number | null;
  };
}

export interface UnitVocabWordView extends UnitVocabWord {
  inNotebook: boolean;
}

export interface LearningPathUnitDetailView {
  id: number;
  unitNumber: number;
  slug: string;
  title: string;
  topicName: string;
  icon: string;
  themeColor: string;
  grammarFocus: string;
  track: LearningPathTrackSummary;
  part: {
    id: number;
    partNumber: number;
    title: string;
    subtitle: string;
  };
  vocabulary: UnitVocabWordView[];
  readingListening: UnitReadingListening;
  writing: UnitWritingPrompt;
  speakingTopicPrompt: string;
  isCustomAiTrack: boolean;
  studyGuide: UnitStudyGuide | null;
  progress: UnitProgressView;
}

export interface UnitQuizSubmissionResult {
  score: number;
  correctCount: number;
  total: number;
  results: Array<{
    questionId: string;
    selectedIndex: number;
    correctIndex: number;
    isCorrect: boolean;
    explanation: string;
  }>;
  progress: UnitProgressView;
}

interface RawWritingEvalResponse {
  estimatedBand?: unknown;
  summary?: unknown;
  notableErrors?: unknown;
  upgradedVersion?: unknown;
  explanation?: unknown;
  suggestedWords?: unknown;
}

@Injectable()
export class LearningPathService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(LearningPathTrack)
    private readonly trackRepo: Repository<LearningPathTrack>,
    @InjectRepository(LearningPathPart)
    private readonly partRepo: Repository<LearningPathPart>,
    @InjectRepository(LearningPathUnit)
    private readonly unitRepo: Repository<LearningPathUnit>,
    @InjectRepository(UserUnitProgress)
    private readonly progressRepo: Repository<UserUnitProgress>,
    @InjectRepository(VocabularyItem)
    private readonly vocabRepo: Repository<VocabularyItem>,
    @InjectRepository(TopicVocabulary)
    private readonly topicVocabRepo: Repository<TopicVocabulary>,
    private readonly catalogService: LearningPathCatalogService,
    private readonly topicsService: TopicsService,
    private readonly vocabularyService: VocabularyService,
    private readonly languagesService: LanguagesService,
    private readonly aiService: AiService,
    private readonly aiConversationService: AiConversationService,
    private readonly learningPathAiService: LearningPathAiService,
    private readonly dataSource: DataSource,
  ) {}

  async getOverview(
    userId: number,
    requestedBand?: string,
  ): Promise<LearningPathOverview> {
    await this.catalogService.ensureSeeded();

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const tracks = await this.trackRepo.find({
      where: [{ ownerUserId: IsNull() }, { ownerUserId: userId }],
      order: { isAiGenerated: 'ASC', sortOrder: 'ASC', id: 'ASC' },
    });
    if (tracks.length === 0) {
      throw new NotFoundException('Learning path catalog is empty');
    }

    const goalBand = user.learningGoalBand || 'band_45_55';
    const targetBandCode = requestedBand?.trim() || goalBand;
    const activeTrack =
      tracks.find((t) => t.code === targetBandCode) ??
      tracks.find((t) => t.code === goalBand) ??
      tracks[0];

    const parts = await this.partRepo.find({
      where: { trackId: activeTrack.id },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    const partIds = parts.map((p) => p.id);
    const units =
      partIds.length > 0
        ? await this.unitRepo.find({
            where: { partId: In(partIds) },
            order: { unitNumber: 'ASC', id: 'ASC' },
          })
        : [];

    const unitIds = units.map((u) => u.id);
    const progressRows =
      unitIds.length > 0
        ? await this.progressRepo.find({
            where: { userId, unitId: In(unitIds) },
          })
        : [];
    const progressByUnit = new Map(progressRows.map((p) => [p.unitId, p]));

    const sortedUnits = [...units].sort((a, b) => a.unitNumber - b.unitNumber);
    const unlockMap = new Map<number, boolean>();
    for (let i = 0; i < sortedUnits.length; i += 1) {
      const unit = sortedUnits[i];
      const currentProgress = progressByUnit.get(unit.id) ?? null;
      const currentDone = this.countCompletedSkills(currentProgress);
      if (i === 0 || currentDone > 0) {
        unlockMap.set(unit.id, true);
        continue;
      }
      const prevUnit = sortedUnits[i - 1];
      const prevDone = this.countCompletedSkills(
        progressByUnit.get(prevUnit.id) ?? null,
      );
      unlockMap.set(unit.id, prevDone >= 2);
    }

    let completedUnits = 0;
    let recommendedUnitId: number | null = null;
    const unitsByPart = new Map<number, LearningPathUnitNodeView[]>();

    for (const unit of sortedUnits) {
      const progressView = this.toProgressView(
        progressByUnit.get(unit.id) ?? null,
      );
      const unlocked = unlockMap.get(unit.id) ?? false;
      const status: UnitNodeStatus =
        progressView.skillsDone >= 4
          ? 'completed'
          : unlocked
            ? 'active'
            : 'locked';

      if (status === 'completed') {
        completedUnits += 1;
      } else if (unlocked && recommendedUnitId === null) {
        recommendedUnitId = unit.id;
      }

      const list = unitsByPart.get(unit.partId) ?? [];
      list.push({
        id: unit.id,
        unitNumber: unit.unitNumber,
        slug: unit.slug,
        title: unit.title,
        topicName: unit.topicName,
        icon: unit.icon,
        themeColor: unit.themeColor,
        grammarFocus: unit.grammarFocus,
        wordCount: unit.vocabularyJson.length,
        unlocked,
        status,
        progress: progressView,
      });
      unitsByPart.set(unit.partId, list);
    }

    return {
      goal: {
        learningGoalBand: goalBand,
        currentLevel: user.currentLevel || 'B1',
        dailyGoalMinutes: user.dailyGoalMinutes || 15,
      },
      tracks: tracks.map((t) => this.toTrackSummary(t)),
      activeTrack: this.toTrackSummary(activeTrack),
      parts: parts.map((p) => ({
        id: p.id,
        partNumber: p.partNumber,
        title: p.title,
        subtitle: p.subtitle,
        units: unitsByPart.get(p.id) ?? [],
      })),
      stats: {
        completedUnits,
        totalUnits: sortedUnits.length,
        recommendedUnitId,
      },
    };
  }

  async updateGoal(
    userId: number,
    dto: UpdateLearningGoalDto,
  ): Promise<LearningPathOverview> {
    if (!LEARNING_GOAL_BANDS.includes(dto.learningGoalBand)) {
      throw new BadRequestException('Invalid learning goal band');
    }

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.learningGoalBand = dto.learningGoalBand;
    if (dto.currentLevel !== undefined) {
      user.currentLevel = dto.currentLevel;
    }
    if (dto.dailyGoalMinutes !== undefined) {
      user.dailyGoalMinutes = dto.dailyGoalMinutes;
    }
    await this.userRepo.save(user);

    return this.getOverview(userId, dto.learningGoalBand);
  }

  async getUnitDetail(
    userId: number,
    unitId: number,
  ): Promise<LearningPathUnitDetailView> {
    const { unit, part, track } = await this.loadUnitContext(unitId, userId);
    const progress = await this.progressRepo.findOneBy({ userId, unitId });

    const existingTerms = await this.vocabularyService.findExistingTermSet(
      userId,
      unit.vocabularyJson.map((w) => w.term),
    );

    return {
      id: unit.id,
      unitNumber: unit.unitNumber,
      slug: unit.slug,
      title: unit.title,
      topicName: unit.topicName,
      icon: unit.icon,
      themeColor: unit.themeColor,
      grammarFocus: unit.grammarFocus,
      track: this.toTrackSummary(track),
      part: {
        id: part.id,
        partNumber: part.partNumber,
        title: part.title,
        subtitle: part.subtitle,
      },
      vocabulary: unit.vocabularyJson.map((word) => ({
        ...word,
        inNotebook: existingTerms.has(word.term.trim().toLowerCase()),
      })),
      readingListening: unit.readingPassageJson,
      writing: unit.writingPromptJson,
      speakingTopicPrompt: unit.speakingTopicPrompt,
      isCustomAiTrack: track.isAiGenerated && track.ownerUserId === userId,
      studyGuide: progress?.aiStudyGuideJson ?? unit.studyGuideJson ?? null,
      progress: this.toProgressView(progress),
    };
  }

  async syncUnitVocabToNotebook(
    userId: number,
    unitId: number,
  ): Promise<{
    topicId: number;
    topicName: string;
    addedCount: number;
    alreadyInNotebookCount: number;
    totalUnitWords: number;
    progress: UnitProgressView;
  }> {
    const { unit } = await this.loadUnitContext(unitId, userId);
    const progress = await this.getOrCreateProgress(userId, unitId);
    const topic = await this.resolveUnitTopic(userId, unit, progress);

    const language = await this.languagesService.findActiveByCode('en');
    const unitTerms = unit.vocabularyJson.map((w) =>
      w.term.trim().toLowerCase(),
    );
    const existingRows =
      unitTerms.length > 0
        ? await this.vocabRepo
            .createQueryBuilder('vocab')
            .where('vocab.userId = :userId', { userId })
            .andWhere('vocab.languageId = :languageId', {
              languageId: language.id,
            })
            .andWhere('LOWER(TRIM(vocab.term)) IN (:...terms)', {
              terms: unitTerms,
            })
            .getMany()
        : [];

    const existingByTerm = new Map<string, VocabularyItem>();
    for (const row of existingRows) {
      const key = row.term.trim().toLowerCase();
      if (!existingByTerm.has(key)) {
        existingByTerm.set(key, row);
      }
    }

    const missingWords = unit.vocabularyJson.filter(
      (w) => !existingByTerm.has(w.term.trim().toLowerCase()),
    );

    if (missingWords.length > 0) {
      await this.vocabularyService.createBulk(userId, {
        topicIds: [topic.id],
        items: missingWords.map((w) => ({
          term: w.term,
          pronunciation: w.pronunciation,
          partOfSpeech: w.partOfSpeech,
          definition: w.definition,
          example: w.example,
          notes: w.notes,
          source: VocabularySource.IMPORT,
        })),
      });
    }

    // Ensure any pre-existing notebook words from this Unit are also linked to the Unit's topic
    const existingIdsToLink = Array.from(existingByTerm.values()).map(
      (v) => v.id,
    );
    if (existingIdsToLink.length > 0) {
      const existingLinks = await this.topicVocabRepo.find({
        where: {
          topicId: topic.id,
          vocabularyId: In(existingIdsToLink),
        },
      });
      const linkedSet = new Set(existingLinks.map((l) => l.vocabularyId));
      const newLinks = existingIdsToLink
        .filter((id) => !linkedSet.has(id))
        .map((vocabularyId) =>
          this.topicVocabRepo.create({ topicId: topic.id, vocabularyId }),
        );
      if (newLinks.length > 0) {
        await this.topicVocabRepo.save(newLinks);
      }
    }

    progress.vocabCompleted = true;
    progress.topicId = topic.id;
    this.updateCompletedTimestamp(progress);
    const saved = await this.progressRepo.save(progress);

    return {
      topicId: topic.id,
      topicName: topic.name,
      addedCount: missingWords.length,
      alreadyInNotebookCount: unit.vocabularyJson.length - missingWords.length,
      totalUnitWords: unit.vocabularyJson.length,
      progress: this.toProgressView(saved),
    };
  }

  async submitUnitQuiz(
    userId: number,
    unitId: number,
    dto: SubmitUnitQuizDto,
  ): Promise<UnitQuizSubmissionResult> {
    const { unit } = await this.loadUnitContext(unitId, userId);
    const questions = unit.readingPassageJson.questions;
    const answerByQuestionId = new Map(
      dto.answers.map((a) => [a.questionId, a.selectedIndex]),
    );

    const results = questions.map((q) => {
      const selectedIndex = answerByQuestionId.get(q.id) ?? -1;
      const isCorrect = selectedIndex === q.correctIndex;
      return {
        questionId: q.id,
        selectedIndex,
        correctIndex: q.correctIndex,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const correctCount = results.filter((r) => r.isCorrect).length;
    const total = questions.length;
    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    const progress = await this.getOrCreateProgress(userId, unitId);
    progress.quizCompleted = true;
    progress.quizScore =
      progress.quizScore !== null ? Math.max(progress.quizScore, score) : score;
    this.updateCompletedTimestamp(progress);
    const saved = await this.progressRepo.save(progress);

    return {
      score,
      correctCount,
      total,
      results,
      progress: this.toProgressView(saved),
    };
  }

  async evaluateUnitWriting(
    userId: number,
    unitId: number,
    dto: EvaluateUnitWritingDto,
  ): Promise<{
    feedback: UnitWritingFeedback;
    progress: UnitProgressView;
  }> {
    const cleanText = dto.text.trim();
    if (cleanText.length < 10) {
      throw new BadRequestException(
        'Please write at least a full English sentence before submitting.',
      );
    }

    const { unit, track } = await this.loadUnitContext(unitId, userId);
    const explainLangName =
      dto.explanationLang === 'en' ? 'English' : 'Vietnamese';

    const normalizedLower = cleanText.toLowerCase();
    const targetTerms = unit.writingPromptJson.targetTerms;
    const usedTargetTerms = targetTerms.filter((term) =>
      normalizedLower.includes(term.toLowerCase()),
    );
    const missedTargetTerms = targetTerms.filter(
      (term) => !normalizedLower.includes(term.toLowerCase()),
    );

    const { data } = await this.aiService.chatJson<RawWritingEvalResponse>(
      [
        {
          role: 'system',
          content:
            `You evaluate a learner's short English paragraph for Unit "${unit.title}". Target Band: ${unit.writingPromptJson.targetBand} (CEFR ${track.cefrLevel}). Grammar focus: ${unit.grammarFocus}. Explanation language: ${explainLangName}.\n` +
            `Return ONLY valid JSON:\n` +
            `{\n` +
            `  "estimatedBand": "short Band estimate string like Band 5.0",\n` +
            `  "summary": "clear evaluation whether the paragraph is accurate, natural, and fits the prompt (in ${explainLangName})",\n` +
            `  "notableErrors": [{"original":"wrong phrase","correction":"better phrase","reason":"concise reason in ${explainLangName}"}],\n` +
            `  "upgradedVersion": "natural rewritten paragraph calibrated to ${unit.writingPromptJson.targetBand} (do not use overly obscure C2 vocabulary if target is lower)",\n` +
            `  "explanation": "concise Markdown tips (**bold**, numbered points separated by newlines) in ${explainLangName}",\n` +
            `  "suggestedWords": [{"term":"word/phrase","partOfSpeech":"noun|verb|adjective|adverb|phrase|null","definition":"meaning in ${explainLangName}","example":"short English sentence"}]\n` +
            `}\n` +
            `Rules: Keep notableErrors <= 4 items ([] if none) and suggestedWords <= 3 items.`,
        },
        {
          role: 'user',
          content:
            `Prompt: ${unit.writingPromptJson.prompt}\n` +
            `Target vocabulary to try using: ${targetTerms.join(', ')}\n` +
            `Learner's writing:\n${cleanText}`,
        },
      ],
      { temperature: 0.4, maxTokens: 780 },
    );

    const feedback = this.sanitizeWritingFeedback(
      data,
      cleanText,
      unit.writingPromptJson.targetBand,
      usedTargetTerms,
      missedTargetTerms,
      dto.explanationLang ?? 'vi',
    );

    const progress = await this.getOrCreateProgress(userId, unitId);
    progress.writingCompleted = true;
    progress.writingSubmission = cleanText;
    progress.writingFeedbackJson = feedback;
    this.updateCompletedTimestamp(progress);
    const saved = await this.progressRepo.save(progress);

    return {
      feedback,
      progress: this.toProgressView(saved),
    };
  }

  async startUnitSpeaking(
    userId: number,
    unitId: number,
    dto: StartUnitSpeakingDto,
  ): Promise<{
    session: AiConversationSessionDetailView;
    progress: UnitProgressView;
  }> {
    const { unit, track } = await this.loadUnitContext(unitId, userId);
    const progress = await this.getOrCreateProgress(userId, unitId);

    if (progress.speakingSessionId) {
      try {
        const existing = await this.aiConversationService.getSessionDetail(
          userId,
          progress.speakingSessionId,
        );
        if (existing.status === 'active') {
          return { session: existing, progress: this.toProgressView(progress) };
        }
      } catch {
        // Fall through to start a fresh speaking session if previous session no longer exists
      }
    }

    const level = this.mapCefrToConversationLevel(track.cefrLevel);
    const targetWordsHint = unit.vocabularyJson
      .slice(0, 5)
      .map((w) => w.term)
      .join(', ');
    const session = await this.aiConversationService.startSession(userId, {
      topic:
        `${unit.title}: ${unit.speakingTopicPrompt} (try words: ${targetWordsHint})`.slice(
          0,
          160,
        ),
      level,
      explanationLang: dto.explanationLang ?? 'vi',
    });

    progress.speakingSessionId = session.id;
    const saved = await this.progressRepo.save(progress);

    return {
      session,
      progress: this.toProgressView(saved),
    };
  }

  async completeUnitSpeaking(
    userId: number,
    unitId: number,
  ): Promise<{ progress: UnitProgressView }> {
    await this.loadUnitContext(unitId, userId);
    const progress = await this.getOrCreateProgress(userId, unitId);
    progress.speakingCompleted = true;
    this.updateCompletedTimestamp(progress);
    const saved = await this.progressRepo.save(progress);

    return {
      progress: this.toProgressView(saved),
    };
  }

  async saveWordsToUnitNotebook(
    userId: number,
    unitId: number,
    dto: SaveUnitWordsDto,
  ): Promise<{
    topicId: number;
    topicName: string;
    addedCount: number;
    skippedCount: number;
  }> {
    const { unit } = await this.loadUnitContext(unitId, userId);
    const progress = await this.getOrCreateProgress(userId, unitId);
    const topic = await this.resolveUnitTopic(userId, unit, progress);

    const existing = await this.vocabularyService.findExistingTermSet(
      userId,
      dto.words.map((w) => w.term),
    );
    const seen = new Set<string>();
    const newWords = dto.words.filter((w) => {
      const norm = w.term.trim().toLowerCase();
      if (!norm || existing.has(norm) || seen.has(norm)) {
        return false;
      }
      seen.add(norm);
      return true;
    });

    if (newWords.length > 0) {
      await this.vocabularyService.createBulk(userId, {
        topicIds: [topic.id],
        items: newWords.map((w) => ({
          term: w.term.trim(),
          partOfSpeech: w.partOfSpeech ?? null,
          definition: w.definition.trim(),
          example: w.example ?? null,
          source: VocabularySource.AI,
        })),
      });
    }

    if (progress.topicId !== topic.id) {
      progress.topicId = topic.id;
      await this.progressRepo.save(progress);
    }

    return {
      topicId: topic.id,
      topicName: topic.name,
      addedCount: newWords.length,
      skippedCount: dto.words.length - newWords.length,
    };
  }

  async generateAiLearningPath(
    userId: number,
    dto: GenerateAiLearningPathDto,
  ): Promise<LearningPathOverview> {
    const goalTopic = dto.goalTopic.trim();
    if (goalTopic.length < 3) {
      throw new BadRequestException(
        'Please describe your learning goal or topic clearly.',
      );
    }

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const targetBand = dto.targetBand ?? user.learningGoalBand ?? 'band_45_55';
    const currentLevel = dto.currentLevel ?? user.currentLevel ?? 'B1';
    const unitCount = dto.unitCount ?? 3;
    const lang = dto.explanationLang ?? 'vi';

    const outline = await this.learningPathAiService.generatePathOutline({
      goalTopic,
      sourceMaterial: dto.sourceMaterial,
      targetBand,
      currentLevel,
      unitCount,
      explanationLang: lang,
    });

    const generatedPacks: Array<{
      outline: (typeof outline.units)[number];
      pack: Awaited<ReturnType<LearningPathAiService['generateUnitStudyPack']>>;
    }> = [];
    const avoidTerms: string[] = [];

    for (const unitOutline of outline.units) {
      const pack = await this.learningPathAiService.generateUnitStudyPack({
        goalTopic,
        unit: unitOutline,
        targetBand,
        sourceMaterial: dto.sourceMaterial,
        avoidTerms,
        explanationLang: lang,
      });
      avoidTerms.push(...pack.vocabulary.map((w) => w.term));
      generatedPacks.push({ outline: unitOutline, pack });
    }

    const uniqueSuffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
    const trackCode = `ai-${userId}-${uniqueSuffix}`.slice(0, 46);

    const createdTrack = await this.dataSource.transaction(async (manager) => {
      const tRepo = manager.getRepository(LearningPathTrack);
      const pRepo = manager.getRepository(LearningPathPart);
      const uRepo = manager.getRepository(LearningPathUnit);

      const track = await tRepo.save(
        tRepo.create({
          code: trackCode,
          title: outline.trackTitle,
          cefrLevel: outline.cefrLevel,
          languageCode: 'en',
          summary: outline.trackSummary,
          ownerUserId: userId,
          isAiGenerated: true,
          sourcePrompt: goalTopic,
          sortOrder: 100,
        }),
      );

      const part = await pRepo.save(
        pRepo.create({
          trackId: track.id,
          partNumber: 1,
          title: outline.partTitle,
          subtitle: outline.partSubtitle,
          sortOrder: 1,
        }),
      );

      for (let i = 0; i < generatedPacks.length; i += 1) {
        const { outline: uOut, pack } = generatedPacks[i];
        await uRepo.save(
          uRepo.create({
            partId: part.id,
            unitNumber: uOut.unitNumber,
            slug: `${trackCode}-u${uOut.unitNumber}`.slice(0, 78),
            title: uOut.title,
            topicName: uOut.topicName,
            icon: uOut.icon,
            themeColor: uOut.themeColor,
            grammarFocus: uOut.grammarFocus,
            vocabularyJson: pack.vocabulary,
            readingPassageJson: pack.readingListening,
            writingPromptJson: pack.writing,
            speakingTopicPrompt: uOut.speakingTopicPrompt,
            studyGuideJson: pack.studyGuide,
            sortOrder: i + 1,
          }),
        );
      }

      return track;
    });

    return this.getOverview(userId, createdTrack.code);
  }

  async deleteAiTrack(
    userId: number,
    trackId: number,
  ): Promise<LearningPathOverview> {
    const track = await this.trackRepo.findOneBy({ id: trackId });
    if (
      !track ||
      (track.ownerUserId !== null && track.ownerUserId !== userId)
    ) {
      throw new NotFoundException('Custom AI learning path not found');
    }
    if (!track.isAiGenerated || track.ownerUserId !== userId) {
      throw new BadRequestException('Curated learning paths cannot be deleted');
    }

    await this.trackRepo.remove(track);
    return this.getOverview(userId);
  }

  async generateUnitStudyGuide(
    userId: number,
    unitId: number,
    dto: GenerateUnitStudyGuideDto,
  ): Promise<{ studyGuide: UnitStudyGuide }> {
    const { unit, track } = await this.loadUnitContext(unitId, userId);
    const studyGuide = await this.learningPathAiService.generateStudyGuideOnly({
      unitTitle: unit.title,
      grammarFocus: unit.grammarFocus,
      targetTerms: unit.vocabularyJson.map((w) => w.term),
      bandLabel: track.title,
      cefrLevel: track.cefrLevel,
      focusNote: dto.focusNote,
      explanationLang: dto.explanationLang ?? 'vi',
    });

    const progress = await this.getOrCreateProgress(userId, unitId);
    progress.aiStudyGuideJson = studyGuide;
    await this.progressRepo.save(progress);

    return { studyGuide };
  }

  async regenerateAiUnitMaterials(
    userId: number,
    unitId: number,
    dto: RegenerateAiUnitDto,
  ): Promise<LearningPathUnitDetailView> {
    const { unit, track } = await this.loadUnitContext(unitId, userId);
    if (!track.isAiGenerated || track.ownerUserId !== userId) {
      throw new BadRequestException(
        'Only AI-generated custom units can regenerate full materials',
      );
    }

    const lang = dto.explanationLang ?? 'vi';
    const matchingBandCode =
      LEARNING_GOAL_BANDS.find(
        (b) =>
          this.learningPathAiService.resolveBandMetadata(b).targetCefr ===
          track.cefrLevel,
      ) ?? 'band_45_55';

    const pack = await this.learningPathAiService.generateUnitStudyPack({
      goalTopic: track.sourcePrompt || track.title,
      unit: {
        unitNumber: unit.unitNumber,
        title: unit.title,
        topicName: unit.topicName,
        grammarFocus: unit.grammarFocus,
        icon: unit.icon,
        themeColor: unit.themeColor,
        speakingTopicPrompt: unit.speakingTopicPrompt,
      },
      targetBand: matchingBandCode,
      sourceMaterial: dto.focusNote,
      explanationLang: lang,
    });

    unit.vocabularyJson = pack.vocabulary;
    unit.readingPassageJson = pack.readingListening;
    unit.writingPromptJson = pack.writing;
    unit.studyGuideJson = pack.studyGuide;
    await this.unitRepo.save(unit);

    const progress = await this.progressRepo.findOneBy({ userId, unitId });
    if (progress && progress.aiStudyGuideJson) {
      progress.aiStudyGuideJson = null;
      await this.progressRepo.save(progress);
    }

    return this.getUnitDetail(userId, unitId);
  }

  private async loadUnitContext(
    unitId: number,
    userId: number,
  ): Promise<{
    unit: LearningPathUnit;
    part: LearningPathPart;
    track: LearningPathTrack;
  }> {
    await this.catalogService.ensureSeeded();

    const unit = await this.unitRepo.findOneBy({ id: unitId });
    if (!unit) {
      throw new NotFoundException('Learning unit not found');
    }

    const part = await this.partRepo.findOneBy({ id: unit.partId });
    if (!part) {
      throw new NotFoundException('Learning unit part not found');
    }

    const track = await this.trackRepo.findOneBy({ id: part.trackId });
    if (
      !track ||
      (track.ownerUserId !== null && track.ownerUserId !== userId)
    ) {
      throw new NotFoundException('Learning track not found');
    }

    return { unit, part, track };
  }

  private async getOrCreateProgress(
    userId: number,
    unitId: number,
  ): Promise<UserUnitProgress> {
    const existing = await this.progressRepo.findOneBy({ userId, unitId });
    if (existing) {
      return existing;
    }
    return this.progressRepo.save(
      this.progressRepo.create({
        userId,
        unitId,
        vocabCompleted: false,
        quizCompleted: false,
        quizScore: null,
        writingCompleted: false,
        writingSubmission: null,
        writingFeedbackJson: null,
        speakingCompleted: false,
        speakingSessionId: null,
        topicId: null,
        aiStudyGuideJson: null,
        completedAt: null,
      }),
    );
  }

  private async resolveUnitTopic(
    userId: number,
    unit: LearningPathUnit,
    progress: UserUnitProgress,
  ): Promise<Topic> {
    const language = await this.languagesService.findActiveByCode('en');

    if (progress.topicId) {
      const existingOwned = await this.dataSource
        .getRepository(Topic)
        .findOneBy({ id: progress.topicId, userId });
      if (existingOwned) {
        return existingOwned;
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const resolved =
        await this.topicsService.resolveOrCreateByNameWithinManager(
          manager,
          userId,
          language.id,
          unit.topicName,
        );
      return resolved.topic;
    });
  }

  private sanitizeWritingFeedback(
    raw: RawWritingEvalResponse,
    originalText: string,
    targetBand: string,
    usedTargetTerms: string[],
    missedTargetTerms: string[],
    lang: 'vi' | 'en',
  ): UnitWritingFeedback {
    const errorsInput = Array.isArray(raw.notableErrors)
      ? raw.notableErrors
      : [];
    const notableErrors: UnitWritingError[] = [];
    for (const item of errorsInput.slice(0, 4)) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const original = this.cleanString(obj.original, 280);
      const correction = this.cleanString(obj.correction, 280);
      const reason = this.cleanString(obj.reason, 400);
      if (original && correction && reason) {
        notableErrors.push({ original, correction, reason });
      }
    }

    const wordsInput = Array.isArray(raw.suggestedWords)
      ? raw.suggestedWords
      : [];
    const suggestedWords: UnitWritingSuggestedWord[] = [];
    for (const item of wordsInput.slice(0, 3)) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Record<string, unknown>;
      const term = this.cleanString(obj.term, 140);
      const definition = this.cleanString(obj.definition, 400);
      const example = this.cleanString(obj.example, 400) ?? '';
      if (term && definition) {
        suggestedWords.push({
          term,
          partOfSpeech:
            this.cleanString(obj.partOfSpeech, 48)?.toLowerCase() ?? null,
          definition,
          example,
        });
      }
    }

    const defaultSummary =
      lang === 'vi'
        ? 'Bài viết truyền đạt được ý chính và bám sát chủ đề bài học.'
        : 'Your paragraph communicates the main idea clearly and fits the prompt.';
    const defaultExplain =
      lang === 'vi'
        ? 'Hãy đối chiếu với phiên bản nâng cấp để học thêm cấu trúc tự nhiên hơn ở mức mục tiêu của bạn.'
        : 'Compare your draft with the upgraded version to notice smoother phrasing at your target band.';

    return {
      estimatedBand: this.cleanString(raw.estimatedBand, 48) ?? `${targetBand}`,
      summary: this.cleanString(raw.summary, 600) ?? defaultSummary,
      usedTargetTerms,
      missedTargetTerms,
      notableErrors,
      upgradedVersion:
        this.cleanString(raw.upgradedVersion, 1400) ?? originalText,
      explanation: this.cleanString(raw.explanation, 1200) ?? defaultExplain,
      suggestedWords,
    };
  }

  private cleanString(value: unknown, maxLen: number): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null') {
      return null;
    }
    return trimmed.slice(0, maxLen);
  }

  private mapCefrToConversationLevel(cefr: string): ConversationLevel {
    if (
      cefr === 'A1' ||
      cefr === 'A2' ||
      cefr === 'B1' ||
      cefr === 'B2' ||
      cefr === 'C1' ||
      cefr === 'C2'
    ) {
      return cefr;
    }
    return 'B1';
  }

  private countCompletedSkills(progress: UserUnitProgress | null): number {
    if (!progress) {
      return 0;
    }
    let count = 0;
    if (progress.vocabCompleted) count += 1;
    if (progress.quizCompleted) count += 1;
    if (progress.writingCompleted) count += 1;
    if (progress.speakingCompleted) count += 1;
    return count;
  }

  private updateCompletedTimestamp(progress: UserUnitProgress): void {
    const done = this.countCompletedSkills(progress);
    if (done >= 4 && !progress.completedAt) {
      progress.completedAt = new Date();
    }
  }

  private toTrackSummary(track: LearningPathTrack): LearningPathTrackSummary {
    return {
      id: track.id,
      code: track.code,
      title: track.title,
      cefrLevel: track.cefrLevel,
      languageCode: track.languageCode,
      summary: track.summary,
      isAiGenerated: Boolean(track.isAiGenerated),
      sourcePrompt: track.sourcePrompt ?? null,
    };
  }

  private toProgressView(progress: UserUnitProgress | null): UnitProgressView {
    const skillsDone = this.countCompletedSkills(progress);
    const totalSkills = 4;
    return {
      vocabCompleted: progress?.vocabCompleted ?? false,
      quizCompleted: progress?.quizCompleted ?? false,
      quizScore: progress?.quizScore ?? null,
      writingCompleted: progress?.writingCompleted ?? false,
      writingSubmission: progress?.writingSubmission ?? null,
      writingFeedback: progress?.writingFeedbackJson ?? null,
      speakingCompleted: progress?.speakingCompleted ?? false,
      speakingSessionId: progress?.speakingSessionId ?? null,
      topicId: progress?.topicId ?? null,
      skillsDone,
      totalSkills,
      percentDone: Math.round((skillsDone / totalSkills) * 100),
      completedAt: progress?.completedAt ?? null,
    };
  }
}
