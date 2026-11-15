import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';
import { TopicVocabulary } from '../topics/entities/topic-vocabulary.entity.js';
import { Topic } from '../topics/entities/topic.entity.js';
import { TopicsService } from '../topics/topics.service.js';
import {
  VocabularyItem,
  VocabularySource,
} from '../vocabulary/entities/vocabulary-item.entity.js';
import { VocabularyService } from '../vocabulary/vocabulary.service.js';
import { FlashcardReviewSession } from './entities/flashcard-review-session.entity.js';
import { FlashcardReview } from './entities/flashcard-review.entity.js';
import {
  FlashcardSessionMode,
  FlashcardSessionStatus,
  ReviewRating,
  VocabularyProgressStatus,
} from './entities/flashcard.enums.js';
import { VocabularyProgress } from './entities/vocabulary-progress.entity.js';
import { FlashcardsService } from './flashcards.service.js';
import { ReviewSchedulerService } from './review-scheduler.service.js';

describe('FlashcardsService', () => {
  let service: FlashcardsService;
  let vocabRepo: Record<string, ReturnType<typeof vi.fn>>;
  let progressRepo: Record<string, ReturnType<typeof vi.fn>>;
  let sessionRepo: Record<string, ReturnType<typeof vi.fn>>;
  let reviewRepo: Record<string, ReturnType<typeof vi.fn>>;
  let topicRepo: Record<string, ReturnType<typeof vi.fn>>;
  let tvRepo: Record<string, ReturnType<typeof vi.fn>>;
  let topicsService: Record<string, ReturnType<typeof vi.fn>>;
  let vocabularyService: Record<string, ReturnType<typeof vi.fn>>;
  let dataSource: { transaction: ReturnType<typeof vi.fn> };

  const makeVocab = (id: number, term: string): VocabularyItem =>
    ({
      id,
      userId: 10,
      languageId: 1,
      term,
      pronunciation: null,
      partOfSpeech: 'noun',
      definition: `${term} meaning`,
      example: null,
      notes: null,
      source: VocabularySource.MANUAL,
      createdAt: new Date('2026-11-10T00:00:00Z'),
      updatedAt: new Date('2026-11-10T00:00:00Z'),
    }) as VocabularyItem;

  beforeEach(async () => {
    vocabRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    progressRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
    };
    sessionRepo = {
      create: vi.fn((x) => ({
        id: 100,
        startedAt: new Date('2026-11-15T10:00:00Z'),
        ...x,
      })),
      save: vi.fn(async (x) => x),
      findOneBy: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    reviewRepo = {
      find: vi.fn().mockResolvedValue([]),
    };
    topicRepo = {
      findBy: vi.fn().mockResolvedValue([]),
    };
    tvRepo = {
      find: vi.fn().mockResolvedValue([]),
    };
    topicsService = {
      findOwnedTopicsByIds: vi.fn().mockResolvedValue([]),
    };
    vocabularyService = {
      findOwnedItemsByIds: vi.fn().mockResolvedValue([]),
    };
    dataSource = {
      transaction: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlashcardsService,
        ReviewSchedulerService,
        { provide: getRepositoryToken(VocabularyItem), useValue: vocabRepo },
        {
          provide: getRepositoryToken(VocabularyProgress),
          useValue: progressRepo,
        },
        {
          provide: getRepositoryToken(FlashcardReviewSession),
          useValue: sessionRepo,
        },
        { provide: getRepositoryToken(FlashcardReview), useValue: reviewRepo },
        { provide: getRepositoryToken(Topic), useValue: topicRepo },
        { provide: getRepositoryToken(TopicVocabulary), useValue: tvRepo },
        { provide: TopicsService, useValue: topicsService },
        { provide: VocabularyService, useValue: vocabularyService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<FlashcardsService>(FlashcardsService);
  });

  it('computes due queue summary counts and orders due cards before new cards', async () => {
    const newCard = makeVocab(1, 'novice');
    const dueCard = makeVocab(2, 'resilient');
    const futureCard = makeVocab(3, 'fluent');

    const qb = {
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([newCard, dueCard, futureCard]),
    };
    vocabRepo.createQueryBuilder.mockReturnValue(qb);

    progressRepo.find.mockResolvedValue([
      {
        vocabularyId: 2,
        userId: 10,
        status: VocabularyProgressStatus.LEARNING,
        repetitions: 1,
        intervalDays: 1,
        easeFactor: '2.35',
        lastRating: ReviewRating.HARD,
        lastReviewedAt: new Date(Date.now() - 86_400_000),
        nextReviewAt: new Date(Date.now() - 3_600_000),
      },
      {
        vocabularyId: 3,
        userId: 10,
        status: VocabularyProgressStatus.MASTERED,
        repetitions: 4,
        intervalDays: 21,
        easeFactor: '2.65',
        lastRating: ReviewRating.EASY,
        lastReviewedAt: new Date(Date.now() - 86_400_000),
        nextReviewAt: new Date(Date.now() + 86_400_000 * 20),
      },
    ]);

    const result = await service.getDueQueue(10, {
      mode: FlashcardSessionMode.DUE_AND_NEW,
    });

    expect(result.summary).toEqual({
      totalCount: 3,
      dueCount: 1,
      newCount: 1,
      learningCount: 1,
      masteredCount: 1,
      hardCount: 1,
    });
    expect(result.items.map((item) => item.id)).toEqual([2, 1]);
  });

  it('rejects session creation when no cards match and creates streak-aware session for valid cards', async () => {
    const emptyQb = {
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    };
    vocabRepo.createQueryBuilder.mockReturnValue(emptyQb);

    await expect(
      service.createSession(10, { mode: FlashcardSessionMode.DUE_ONLY }),
    ).rejects.toThrow(BadRequestException);

    const v1 = makeVocab(11, 'clarity');
    const v2 = makeVocab(12, 'momentum');
    vocabularyService.findOwnedItemsByIds.mockResolvedValue([v1, v2]);
    sessionRepo.findOneBy.mockResolvedValue({
      id: 100,
      userId: 10,
      topicId: null,
      mode: FlashcardSessionMode.CUSTOM,
      cardIds: [11, 12],
      targetCount: 2,
      reviewedCount: 0,
      isStreakEligible: false,
      status: FlashcardSessionStatus.IN_PROGRESS,
      startedAt: new Date('2026-11-15T10:00:00Z'),
      completedAt: null,
    });
    vocabRepo.find.mockResolvedValue([v1, v2]);

    const session = await service.createSession(10, {
      vocabularyIds: [11, 12],
    });
    expect(session.targetCount).toBe(2);
    expect(session.streakMinThreshold).toBe(2);
    expect(session.cards).toHaveLength(2);
  });

  it('rejects review updates on completed sessions or non-session cards', async () => {
    dataSource.transaction.mockImplementation(async (cb) =>
      cb({
        getRepository: (entity: unknown) => {
          if (entity === FlashcardReviewSession) {
            return {
              findOne: vi.fn().mockResolvedValue({
                id: 50,
                userId: 10,
                cardIds: [11, 12],
                status: FlashcardSessionStatus.COMPLETED,
              }),
            };
          }
          return {};
        },
      }),
    );

    await expect(
      service.recordReview(10, 50, 11, ReviewRating.GOOD),
    ).rejects.toThrow(ConflictException);

    dataSource.transaction.mockImplementation(async (cb) =>
      cb({
        getRepository: (entity: unknown) => {
          if (entity === FlashcardReviewSession) {
            return {
              findOne: vi.fn().mockResolvedValue({
                id: 50,
                userId: 10,
                cardIds: [11, 12],
                status: FlashcardSessionStatus.IN_PROGRESS,
              }),
            };
          }
          return {};
        },
      }),
    );

    await expect(
      service.recordReview(10, 50, 999, ReviewRating.GOOD),
    ).rejects.toThrow(BadRequestException);
  });

  it('records review rating transactionally, updates SRS progress, and enforces session ownership', async () => {
    const v1 = makeVocab(11, 'clarity');
    const sessionRow = {
      id: 55,
      userId: 10,
      topicId: null,
      mode: FlashcardSessionMode.CUSTOM,
      cardIds: [11, 12, 13, 14, 15, 16],
      targetCount: 6,
      reviewedCount: 0,
      isStreakEligible: false,
      status: FlashcardSessionStatus.IN_PROGRESS,
      startedAt: new Date('2026-11-15T10:00:00Z'),
      completedAt: null,
    };

    const txSessionRepo = {
      findOne: vi.fn().mockResolvedValue(sessionRow),
      save: vi.fn(async (x) => x),
    };
    const txVocabRepo = {
      findOneBy: vi.fn().mockResolvedValue(v1),
    };
    const txProgressRepo = {
      findOne: vi.fn().mockResolvedValue(null),
      create: vi.fn((x) => x),
      save: vi.fn(async (x) => x),
    };
    const txReviewRepo = {
      create: vi.fn((x) => x),
      save: vi.fn(async (x) => x),
      createQueryBuilder: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({ cnt: '5' }),
      }),
    };

    dataSource.transaction.mockImplementation(async (cb) =>
      cb({
        getRepository: (entity: unknown) => {
          if (entity === FlashcardReviewSession) return txSessionRepo;
          if (entity === VocabularyItem) return txVocabRepo;
          if (entity === VocabularyProgress) return txProgressRepo;
          if (entity === FlashcardReview) return txReviewRepo;
          return {};
        },
      }),
    );

    sessionRepo.findOneBy.mockResolvedValue(sessionRow);
    vocabRepo.find.mockResolvedValue([v1]);
    progressRepo.find.mockResolvedValue([
      {
        userId: 10,
        vocabularyId: 11,
        repetitions: 1,
        intervalDays: 4,
        easeFactor: '2.65',
        lastRating: ReviewRating.EASY,
        lastReviewedAt: new Date(),
        nextReviewAt: new Date(Date.now() + 86_400_000 * 4),
        status: VocabularyProgressStatus.LEARNING,
      },
    ]);
    reviewRepo.find.mockResolvedValue([
      { vocabularyId: 11, rating: ReviewRating.EASY },
    ]);

    const res = await service.recordReview(10, 55, 11, ReviewRating.EASY);
    expect(res.updatedProgress.intervalDays).toBe(4);
    expect(res.updatedProgress.status).toBe(VocabularyProgressStatus.LEARNING);
    expect(sessionRow.reviewedCount).toBe(5);
    expect(sessionRow.isStreakEligible).toBe(true);

    sessionRepo.findOneBy.mockResolvedValue({ ...sessionRow, userId: 99 });
    await expect(service.getSession(10, 55)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('completes session idempotently without double-writing already completed sessions', async () => {
    const completedAt = new Date('2026-11-15T10:15:00Z');
    const existingCompleted = {
      id: 77,
      userId: 10,
      topicId: null,
      mode: FlashcardSessionMode.CUSTOM,
      cardIds: [11, 12],
      targetCount: 2,
      reviewedCount: 2,
      isStreakEligible: true,
      status: FlashcardSessionStatus.COMPLETED,
      startedAt: new Date('2026-11-15T10:00:00Z'),
      completedAt,
    };

    const txSessionRepo = {
      findOne: vi.fn().mockResolvedValue(existingCompleted),
      save: vi.fn(),
    };
    dataSource.transaction.mockImplementation(async (cb) =>
      cb({
        getRepository: () => txSessionRepo,
      }),
    );
    sessionRepo.findOneBy.mockResolvedValue(existingCompleted);
    vocabRepo.find.mockResolvedValue([]);

    const result = await service.completeSession(10, 77);
    expect(txSessionRepo.save).not.toHaveBeenCalled();
    expect(result.status).toBe(FlashcardSessionStatus.COMPLETED);
    expect(result.completedAt).toEqual(completedAt);
  });
});
