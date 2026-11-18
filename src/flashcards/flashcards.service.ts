import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import {
  type LearningLanguageCode,
  normalizeLearningLanguage,
} from '../common/constants/learning-languages.js';
import { PaginationMeta } from '../common/dto/pagination-query.dto.js';
import { assertResourceOwnership } from '../common/guards/ownership.guard.js';
import { LanguagesService } from '../languages/languages.service.js';
import { ActivitySourceType } from '../streaks/entities/learning-activity-event.entity.js';
import { StreaksService } from '../streaks/streaks.service.js';
import { TopicVocabulary } from '../topics/entities/topic-vocabulary.entity.js';
import { Topic } from '../topics/entities/topic.entity.js';
import { TopicsService } from '../topics/topics.service.js';
import { VocabularyItem } from '../vocabulary/entities/vocabulary-item.entity.js';
import {
  toVocabularyProgressSummary,
  VocabularyProgressSummary,
  VocabularyService,
  VocabularyTopicRef,
} from '../vocabulary/vocabulary.service.js';
import { CreateFlashcardSessionDto } from './dto/create-session.dto.js';
import { DueFlashcardsQueryDto } from './dto/due-query.dto.js';
import { FlashcardSessionQueryDto } from './dto/session-query.dto.js';
import { FlashcardReviewSession } from './entities/flashcard-review-session.entity.js';
import { FlashcardReview } from './entities/flashcard-review.entity.js';
import {
  FlashcardSessionMode,
  FlashcardSessionStatus,
  ReviewRating,
  VocabularyProgressStatus,
} from './entities/flashcard.enums.js';
import { VocabularyProgress } from './entities/vocabulary-progress.entity.js';
import { ReviewSchedulerService } from './review-scheduler.service.js';

export interface FlashcardCardView {
  id: number;
  term: string;
  pronunciation: string | null;
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
  notes: string | null;
  topics: VocabularyTopicRef[];
  progress: VocabularyProgressSummary;
  sessionLastRating: ReviewRating | null;
  sessionReviewCount: number;
}

export interface FlashcardDueSummary {
  totalCount: number;
  dueCount: number;
  newCount: number;
  learningCount: number;
  masteredCount: number;
  hardCount: number;
}

export interface FlashcardSessionSummaryView {
  id: number;
  topicId: number | null;
  topicName: string | null;
  languageCode: string;
  mode: FlashcardSessionMode;
  targetCount: number;
  reviewedCount: number;
  streakMinThreshold: number;
  isStreakEligible: boolean;
  status: FlashcardSessionStatus;
  startedAt: Date;
  completedAt: Date | null;
}

export interface FlashcardRatingBreakdown {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface FlashcardSessionDetailView extends FlashcardSessionSummaryView {
  cards: FlashcardCardView[];
  breakdown: FlashcardRatingBreakdown;
  forgottenVocabularyIds: number[];
}

@Injectable()
export class FlashcardsService {
  constructor(
    @InjectRepository(VocabularyItem)
    private readonly vocabularyRepository: Repository<VocabularyItem>,
    @InjectRepository(VocabularyProgress)
    private readonly progressRepository: Repository<VocabularyProgress>,
    @InjectRepository(FlashcardReviewSession)
    private readonly sessionRepository: Repository<FlashcardReviewSession>,
    @InjectRepository(FlashcardReview)
    private readonly reviewRepository: Repository<FlashcardReview>,
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(TopicVocabulary)
    private readonly topicVocabularyRepository: Repository<TopicVocabulary>,
    private readonly topicsService: TopicsService,
    private readonly vocabularyService: VocabularyService,
    private readonly scheduler: ReviewSchedulerService,
    private readonly streaksService: StreaksService,
    private readonly dataSource: DataSource,
    @Optional() private readonly languagesService?: LanguagesService,
  ) {}

  async getDueQueue(
    userId: number,
    query: DueFlashcardsQueryDto,
  ): Promise<{
    items: FlashcardCardView[];
    meta: PaginationMeta;
    summary: FlashcardDueSummary;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const mode = query.mode ?? FlashcardSessionMode.DUE_AND_NEW;

    if (query.topicId) {
      await this.topicsService.findOwnedTopicsByIds(userId, [query.topicId]);
    }

    const now = new Date();
    const { items: scopedItems, progressByVocab } =
      await this.loadScopedVocabularyAndProgress(
        userId,
        query.topicId,
        query.languageCode,
      );

    const summary = this.computeDueSummary(scopedItems, progressByVocab, now);
    const filtered = this.filterAndOrderByMode(
      scopedItems,
      progressByVocab,
      mode,
      now,
    );

    const total = filtered.length;
    const sliced = filtered.slice((page - 1) * limit, page * limit);
    const topicsByVocab = await this.loadTopicsMap(sliced.map((v) => v.id));

    return {
      items: sliced.map((item) =>
        this.toCardView(
          item,
          topicsByVocab.get(item.id) ?? [],
          progressByVocab.get(item.id) ?? null,
          now,
        ),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      summary,
    };
  }

  async createSession(
    userId: number,
    dto: CreateFlashcardSessionDto,
  ): Promise<FlashcardSessionDetailView> {
    if (dto.topicId) {
      await this.topicsService.findOwnedTopicsByIds(userId, [dto.topicId]);
    }

    const limit = dto.limit ?? 20;
    let mode = dto.mode ?? FlashcardSessionMode.DUE_AND_NEW;
    let selectedCards: VocabularyItem[] = [];

    if (dto.vocabularyIds && dto.vocabularyIds.length > 0) {
      mode = FlashcardSessionMode.CUSTOM;
      const owned = await this.vocabularyService.findOwnedItemsByIds(
        userId,
        dto.vocabularyIds,
      );
      const byId = new Map(owned.map((v) => [v.id, v]));
      const orderedUniqueIds = Array.from(new Set(dto.vocabularyIds));
      selectedCards = orderedUniqueIds
        .map((id) => byId.get(id))
        .filter((v): v is VocabularyItem => Boolean(v))
        .slice(0, limit);
    } else {
      const now = new Date();
      const { items: scopedItems, progressByVocab } =
        await this.loadScopedVocabularyAndProgress(
          userId,
          dto.topicId ?? undefined,
          dto.languageCode,
        );
      selectedCards = this.filterAndOrderByMode(
        scopedItems,
        progressByVocab,
        mode,
        now,
      ).slice(0, limit);
    }

    if (selectedCards.length === 0) {
      throw new BadRequestException(
        'No matching vocabulary cards found for this review session. Add vocabulary items or choose another study mode.',
      );
    }

    const cardIds = selectedCards.map((c) => c.id);
    const created = await this.sessionRepository.save(
      this.sessionRepository.create({
        userId,
        topicId: dto.topicId ?? null,
        languageCode: normalizeLearningLanguage(dto.languageCode),
        mode,
        cardIds,
        targetCount: cardIds.length,
        reviewedCount: 0,
        isStreakEligible: false,
        status: FlashcardSessionStatus.IN_PROGRESS,
        completedAt: null,
      }),
    );

    return this.getSession(userId, created.id);
  }

  async listSessions(
    userId: number,
    query: FlashcardSessionQueryDto,
  ): Promise<{ items: FlashcardSessionSummaryView[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (query.topicId) {
      await this.topicsService.findOwnedTopicsByIds(userId, [query.topicId]);
    }

    const qb = this.sessionRepository
      .createQueryBuilder('session')
      .where('session.userId = :userId', { userId });

    if (query.languageCode) {
      qb.andWhere('session.languageCode = :languageCode', {
        languageCode: query.languageCode,
      });
    }
    if (query.status) {
      qb.andWhere('session.status = :status', { status: query.status });
    }
    if (query.topicId) {
      qb.andWhere('session.topicId = :topicId', { topicId: query.topicId });
    }

    qb.orderBy('session.startedAt', 'DESC')
      .addOrderBy('session.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [sessions, total] = await qb.getManyAndCount();
    const topicIds = sessions
      .map((s) => s.topicId)
      .filter((id): id is number => id !== null);
    const topicNames = await this.loadTopicNamesMap(topicIds);

    return {
      items: sessions.map((s) => this.toSessionSummary(s, topicNames)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getSession(
    userId: number,
    sessionId: number,
  ): Promise<FlashcardSessionDetailView> {
    const session = await this.findOwnedSession(userId, sessionId);
    const now = new Date();

    const cardIds = Array.isArray(session.cardIds) ? session.cardIds : [];
    const [items, progressRows, reviews, topicNames, topicsMap] =
      await Promise.all([
        cardIds.length > 0
          ? this.vocabularyRepository.find({
              where: { id: In(cardIds), userId },
            })
          : Promise.resolve([]),
        cardIds.length > 0
          ? this.progressRepository.find({
              where: { userId, vocabularyId: In(cardIds) },
            })
          : Promise.resolve([]),
        this.reviewRepository.find({
          where: { sessionId: session.id },
          order: { reviewedAt: 'ASC', id: 'ASC' },
        }),
        session.topicId
          ? this.loadTopicNamesMap([session.topicId])
          : Promise.resolve(new Map<number, string>()),
        this.loadTopicsMap(cardIds),
      ]);

    const itemById = new Map(items.map((item) => [item.id, item]));
    const progressByVocab = new Map(
      progressRows.map((p) => [p.vocabularyId, p]),
    );

    const latestReviewByVocab = new Map<number, ReviewRating>();
    const reviewCountByVocab = new Map<number, number>();
    const breakdown: FlashcardRatingBreakdown = {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    };

    for (const review of reviews) {
      latestReviewByVocab.set(review.vocabularyId, review.rating);
      reviewCountByVocab.set(
        review.vocabularyId,
        (reviewCountByVocab.get(review.vocabularyId) ?? 0) + 1,
      );
      breakdown[review.rating] += 1;
    }

    const cards: FlashcardCardView[] = cardIds
      .map((id) => itemById.get(id))
      .filter((item): item is VocabularyItem => Boolean(item))
      .map((item) =>
        this.toCardView(
          item,
          topicsMap.get(item.id) ?? [],
          progressByVocab.get(item.id) ?? null,
          now,
          latestReviewByVocab.get(item.id) ?? null,
          reviewCountByVocab.get(item.id) ?? 0,
        ),
      );

    const forgottenVocabularyIds = Array.from(latestReviewByVocab.entries())
      .filter(
        ([, rating]) =>
          rating === ReviewRating.AGAIN || rating === ReviewRating.HARD,
      )
      .map(([vocabId]) => vocabId);

    const summary = this.toSessionSummary(session, topicNames);

    return {
      ...summary,
      cards,
      breakdown,
      forgottenVocabularyIds,
    };
  }

  async recordReview(
    userId: number,
    sessionId: number,
    vocabularyId: number,
    rating: ReviewRating,
  ): Promise<{
    session: FlashcardSessionDetailView;
    updatedProgress: VocabularyProgressSummary;
  }> {
    const now = new Date();

    const updatedProgress = await this.dataSource.transaction(
      async (manager) => {
        const sessionRepo = manager.getRepository(FlashcardReviewSession);
        const vocabRepo = manager.getRepository(VocabularyItem);
        const progressRepo = manager.getRepository(VocabularyProgress);
        const reviewRepo = manager.getRepository(FlashcardReview);

        const session = await sessionRepo.findOne({
          where: { id: sessionId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!session) {
          throw new NotFoundException('Flashcard review session not found');
        }
        assertResourceOwnership(session.userId, userId, 'Flashcard session');

        if (session.status === FlashcardSessionStatus.COMPLETED) {
          throw new ConflictException(
            'This review session has already been completed',
          );
        }

        const cardIds = Array.isArray(session.cardIds) ? session.cardIds : [];
        if (!cardIds.includes(vocabularyId)) {
          throw new BadRequestException(
            `Vocabulary item #${vocabularyId} is not part of this review session`,
          );
        }

        const vocabItem = await vocabRepo.findOne({
          where: { id: vocabularyId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!vocabItem) {
          throw new NotFoundException('Vocabulary item not found');
        }
        assertResourceOwnership(vocabItem.userId, userId, 'Vocabulary item');

        await reviewRepo.save(
          reviewRepo.create({
            sessionId: session.id,
            vocabularyId,
            rating,
            reviewedAt: now,
          }),
        );

        let progress = await progressRepo.findOne({
          where: { userId, vocabularyId },
        });

        const scheduled = this.scheduler.schedule(
          progress
            ? {
                repetitions: progress.repetitions,
                intervalDays: progress.intervalDays,
                easeFactor: Number(progress.easeFactor),
              }
            : null,
          rating,
          now,
        );

        if (!progress) {
          progress = progressRepo.create({
            userId,
            vocabularyId,
            repetitions: scheduled.repetitions,
            intervalDays: scheduled.intervalDays,
            easeFactor: scheduled.easeFactor.toFixed(2),
            lastRating: rating,
            lastReviewedAt: scheduled.lastReviewedAt,
            nextReviewAt: scheduled.nextReviewAt,
            status: scheduled.status,
          });
        } else {
          progress.repetitions = scheduled.repetitions;
          progress.intervalDays = scheduled.intervalDays;
          progress.easeFactor = scheduled.easeFactor.toFixed(2);
          progress.lastRating = rating;
          progress.lastReviewedAt = scheduled.lastReviewedAt;
          progress.nextReviewAt = scheduled.nextReviewAt;
          progress.status = scheduled.status;
        }

        const savedProgress = await progressRepo.save(progress);

        const distinctRow = await reviewRepo
          .createQueryBuilder('r')
          .select('COUNT(DISTINCT r.vocabularyId)', 'cnt')
          .where('r.sessionId = :sessionId', { sessionId: session.id })
          .getRawOne<{ cnt: string }>();

        const reviewedCount = Number(distinctRow?.cnt ?? 0);
        session.reviewedCount = reviewedCount;
        session.isStreakEligible = this.scheduler.isSessionStreakEligible(
          reviewedCount,
          session.targetCount,
        );
        await sessionRepo.save(session);

        return this.toProgressSummary(savedProgress, now);
      },
    );

    const session = await this.getSession(userId, sessionId);
    return {
      session,
      updatedProgress,
    };
  }

  async completeSession(
    userId: number,
    sessionId: number,
  ): Promise<FlashcardSessionDetailView> {
    await this.dataSource.transaction(async (manager) => {
      const sessionRepo = manager.getRepository(FlashcardReviewSession);
      const reviewRepo = manager.getRepository(FlashcardReview);

      const session = await sessionRepo.findOne({
        where: { id: sessionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!session) {
        throw new NotFoundException('Flashcard review session not found');
      }
      assertResourceOwnership(session.userId, userId, 'Flashcard session');

      if (session.status === FlashcardSessionStatus.COMPLETED) {
        return;
      }

      const distinctRow = await reviewRepo
        .createQueryBuilder('r')
        .select('COUNT(DISTINCT r.vocabularyId)', 'cnt')
        .where('r.sessionId = :sessionId', { sessionId: session.id })
        .getRawOne<{ cnt: string }>();

      const reviewedCount = Number(distinctRow?.cnt ?? 0);
      session.reviewedCount = reviewedCount;
      session.isStreakEligible = this.scheduler.isSessionStreakEligible(
        reviewedCount,
        session.targetCount,
      );
      session.status = FlashcardSessionStatus.COMPLETED;
      session.completedAt = new Date();
      await sessionRepo.save(session);

      if (session.isStreakEligible) {
        await this.streaksService.recordQualifiedActivity(manager, {
          userId,
          sourceType: ActivitySourceType.FLASHCARD_SESSION,
          sourceId: session.id,
          occurredAt: session.completedAt,
        });
      }
    });

    return this.getSession(userId, sessionId);
  }

  private async loadScopedVocabularyAndProgress(
    userId: number,
    topicId?: number,
    languageCode?: LearningLanguageCode,
  ): Promise<{
    items: VocabularyItem[];
    progressByVocab: Map<number, VocabularyProgress>;
  }> {
    const qb = this.vocabularyRepository
      .createQueryBuilder('vocab')
      .where('vocab.userId = :userId', { userId });

    if (languageCode && this.languagesService) {
      const language =
        await this.languagesService.findActiveByCode(languageCode);
      qb.andWhere('vocab.languageId = :languageId', {
        languageId: language.id,
      });
    }

    if (topicId) {
      qb.innerJoin(
        'topic_vocabulary',
        'tv',
        'tv.vocabulary_id = vocab.id AND tv.topic_id = :topicId',
        { topicId },
      );
    }

    const items = await qb
      .orderBy('vocab.createdAt', 'DESC')
      .addOrderBy('vocab.id', 'DESC')
      .getMany();

    if (items.length === 0) {
      return { items: [], progressByVocab: new Map() };
    }

    const progressRows = await this.progressRepository.find({
      where: {
        userId,
        vocabularyId: In(items.map((i) => i.id)),
      },
    });

    return {
      items,
      progressByVocab: new Map(progressRows.map((p) => [p.vocabularyId, p])),
    };
  }

  private computeDueSummary(
    items: VocabularyItem[],
    progressByVocab: Map<number, VocabularyProgress>,
    now: Date,
  ): FlashcardDueSummary {
    let dueCount = 0;
    let newCount = 0;
    let learningCount = 0;
    let masteredCount = 0;
    let hardCount = 0;

    for (const item of items) {
      const p = progressByVocab.get(item.id);
      if (!p || p.status === VocabularyProgressStatus.NEW) {
        newCount += 1;
      } else if (p.status === VocabularyProgressStatus.LEARNING) {
        learningCount += 1;
      } else if (p.status === VocabularyProgressStatus.MASTERED) {
        masteredCount += 1;
      }

      if (p?.nextReviewAt && p.nextReviewAt.getTime() <= now.getTime()) {
        dueCount += 1;
      }

      if (
        p?.lastRating === ReviewRating.AGAIN ||
        p?.lastRating === ReviewRating.HARD
      ) {
        hardCount += 1;
      }
    }

    return {
      totalCount: items.length,
      dueCount,
      newCount,
      learningCount,
      masteredCount,
      hardCount,
    };
  }

  private filterAndOrderByMode(
    items: VocabularyItem[],
    progressByVocab: Map<number, VocabularyProgress>,
    mode: FlashcardSessionMode,
    now: Date,
  ): VocabularyItem[] {
    const isNew = (item: VocabularyItem): boolean => {
      const p = progressByVocab.get(item.id);
      return !p || p.status === VocabularyProgressStatus.NEW;
    };

    const isDue = (item: VocabularyItem): boolean => {
      const p = progressByVocab.get(item.id);
      return Boolean(
        p?.nextReviewAt && p.nextReviewAt.getTime() <= now.getTime(),
      );
    };

    const isHard = (item: VocabularyItem): boolean => {
      const p = progressByVocab.get(item.id);
      return (
        p?.lastRating === ReviewRating.AGAIN ||
        p?.lastRating === ReviewRating.HARD
      );
    };

    let filtered: VocabularyItem[];
    switch (mode) {
      case FlashcardSessionMode.DUE_ONLY:
        filtered = items.filter((item) => isDue(item));
        break;
      case FlashcardSessionMode.NEW_ONLY:
        filtered = items.filter((item) => isNew(item));
        break;
      case FlashcardSessionMode.HARD_ONLY:
        filtered = items.filter((item) => isHard(item));
        break;
      case FlashcardSessionMode.ALL:
      case FlashcardSessionMode.CUSTOM:
        filtered = [...items];
        break;
      case FlashcardSessionMode.DUE_AND_NEW:
      default:
        filtered = items.filter((item) => isDue(item) || isNew(item));
        break;
    }

    // Prioritize due cards first (earliest nextReviewAt first), then new cards
    return [...filtered].sort((a, b) => {
      const aDue = isDue(a) ? 0 : 1;
      const bDue = isDue(b) ? 0 : 1;
      if (aDue !== bDue) return aDue - bDue;

      const pa = progressByVocab.get(a.id);
      const pb = progressByVocab.get(b.id);
      const timeA = pa?.nextReviewAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const timeB = pb?.nextReviewAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (timeA !== timeB) return timeA - timeB;

      return b.id - a.id;
    });
  }

  private async findOwnedSession(
    userId: number,
    id: number,
  ): Promise<FlashcardReviewSession> {
    const session = await this.sessionRepository.findOneBy({ id });
    if (!session) {
      throw new NotFoundException('Flashcard review session not found');
    }
    assertResourceOwnership(session.userId, userId, 'Flashcard session');
    return session;
  }

  private async loadTopicNamesMap(
    topicIds: number[],
  ): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    const unique = Array.from(new Set(topicIds));
    if (unique.length === 0) return map;

    const topics = await this.topicRepository.findBy({ id: In(unique) });
    for (const t of topics) {
      map.set(t.id, t.name);
    }
    return map;
  }

  private async loadTopicsMap(
    vocabularyIds: number[],
  ): Promise<Map<number, VocabularyTopicRef[]>> {
    const map = new Map<number, VocabularyTopicRef[]>();
    const unique = Array.from(new Set(vocabularyIds));
    if (unique.length === 0) return map;

    const links = await this.topicVocabularyRepository.find({
      where: { vocabularyId: In(unique) },
      relations: { topic: true },
    });

    for (const link of links) {
      if (!link.topic) continue;
      const list = map.get(link.vocabularyId) ?? [];
      list.push({ id: link.topic.id, name: link.topic.name });
      map.set(link.vocabularyId, list);
    }
    return map;
  }

  private toProgressSummary(
    p: VocabularyProgress | null,
    now: Date,
  ): VocabularyProgressSummary {
    return toVocabularyProgressSummary(p, now);
  }

  private toCardView(
    item: VocabularyItem,
    topics: VocabularyTopicRef[],
    progress: VocabularyProgress | null,
    now: Date,
    sessionLastRating: ReviewRating | null = null,
    sessionReviewCount = 0,
  ): FlashcardCardView {
    return {
      id: item.id,
      term: item.term,
      pronunciation: item.pronunciation,
      partOfSpeech: item.partOfSpeech,
      definition: item.definition,
      example: item.example,
      notes: item.notes,
      topics,
      progress: this.toProgressSummary(progress, now),
      sessionLastRating,
      sessionReviewCount,
    };
  }

  private toSessionSummary(
    session: FlashcardReviewSession,
    topicNames: Map<number, string>,
  ): FlashcardSessionSummaryView {
    return {
      id: session.id,
      topicId: session.topicId,
      topicName: session.topicId
        ? (topicNames.get(session.topicId) ?? null)
        : null,
      languageCode: session.languageCode ?? 'en',
      mode: session.mode,
      targetCount: session.targetCount,
      reviewedCount: session.reviewedCount,
      streakMinThreshold: this.scheduler.getStreakMinimumThreshold(
        session.targetCount,
      ),
      isStreakEligible: Boolean(session.isStreakEligible),
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
    };
  }
}
