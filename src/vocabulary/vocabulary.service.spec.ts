import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';
import { VocabularyProgress } from '../flashcards/entities/vocabulary-progress.entity.js';
import { LanguagesService } from '../languages/languages.service.js';
import { TopicVocabulary } from '../topics/entities/topic-vocabulary.entity.js';
import { TopicsService } from '../topics/topics.service.js';
import {
  VocabularyItem,
  VocabularySource,
} from './entities/vocabulary-item.entity.js';
import { VocabularyService } from './vocabulary.service.js';

describe('VocabularyService', () => {
  let service: VocabularyService;
  let vocabRepo: {
    findOneBy: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };
  let tvRepo: { find: ReturnType<typeof vi.fn> };
  let progressRepo: { findBy: ReturnType<typeof vi.fn> };
  let topicsService: {
    findOwnedTopicsByIds: ReturnType<typeof vi.fn>;
    resolveOrCreateByNameWithinManager: ReturnType<typeof vi.fn>;
  };
  let languagesService: { findActiveByCode: ReturnType<typeof vi.fn> };
  let dataSource: { transaction: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const dupQb = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([]),
    };
    vocabRepo = {
      findOneBy: vi.fn(),
      delete: vi.fn(async () => ({ affected: 1 })),
      createQueryBuilder: vi.fn().mockReturnValue(dupQb),
    };
    tvRepo = {
      find: vi.fn().mockResolvedValue([]),
    };
    progressRepo = {
      findBy: vi.fn().mockResolvedValue([]),
    };
    topicsService = {
      findOwnedTopicsByIds: vi.fn().mockResolvedValue([]),
      resolveOrCreateByNameWithinManager: vi.fn(),
    };
    languagesService = {
      findActiveByCode: vi
        .fn()
        .mockResolvedValue({ id: 1, code: 'en', name: 'English' }),
    };
    dataSource = {
      transaction: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VocabularyService,
        { provide: getRepositoryToken(VocabularyItem), useValue: vocabRepo },
        { provide: getRepositoryToken(TopicVocabulary), useValue: tvRepo },
        {
          provide: getRepositoryToken(VocabularyProgress),
          useValue: progressRepo,
        },
        { provide: TopicsService, useValue: topicsService },
        { provide: LanguagesService, useValue: languagesService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<VocabularyService>(VocabularyService);
  });

  it('creates a phrase vocabulary item linked to multiple topics and flags duplicate warning', async () => {
    const dupQb = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi
        .fn()
        .mockResolvedValue([
          { id: 1, term: 'break the ice', definition: 'old' },
        ]),
    };
    vocabRepo.createQueryBuilder.mockReturnValue(dupQb);
    topicsService.findOwnedTopicsByIds.mockResolvedValue([
      { id: 1, name: 'Business' },
      { id: 2, name: 'Travel' },
    ]);

    const txVocabRepo = {
      create: vi.fn((x) => ({
        id: 11,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...x,
      })),
      save: vi.fn(async (x) => x),
    };
    const txTvRepo = {
      create: vi.fn((x) => x),
      save: vi.fn(async (x) => x),
    };
    dataSource.transaction.mockImplementation(async (cb) =>
      cb({
        getRepository: (entity: unknown) =>
          entity === VocabularyItem ? txVocabRepo : txTvRepo,
      }),
    );

    const created = await service.create(10, {
      term: 'break the ice',
      definition: 'Make people feel more comfortable in a social setting',
      partOfSpeech: 'phrase',
      topicIds: [1, 2],
    });

    expect(created.term).toBe('break the ice');
    expect(created.source).toBe(VocabularySource.MANUAL);
    expect(created.topics).toHaveLength(2);
    expect(created.duplicateWarning).toBe(true);
    expect(created.existingMatchCount).toBe(1);
  });

  it('rejects empty trimmed term or non-English language', async () => {
    await expect(
      service.create(10, { term: '   ', definition: 'meaning' }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.create(10, {
        term: 'hello',
        definition: 'greeting',
        languageCode: 'ko',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects accessing another user vocabulary item', async () => {
    vocabRepo.findOneBy.mockResolvedValue({ id: 5, userId: 88 });
    await expect(service.findOne(10, 5)).rejects.toThrow(ForbiddenException);
    await expect(service.remove(10, 5)).rejects.toThrow(ForbiddenException);
  });

  it('applies reviewStatus filter and attaches vocabulary progress summary on findAll', async () => {
    const listQb = {
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      take: vi.fn().mockReturnThis(),
      getManyAndCount: vi.fn().mockResolvedValue([
        [
          {
            id: 21,
            userId: 10,
            languageId: 1,
            term: 'resilient',
            pronunciation: null,
            partOfSpeech: 'adjective',
            definition: 'able to recover quickly',
            example: null,
            notes: null,
            source: VocabularySource.MANUAL,
            createdAt: new Date('2026-11-12T00:00:00Z'),
            updatedAt: new Date('2026-11-12T00:00:00Z'),
          },
        ],
        1,
      ]),
    };
    vocabRepo.createQueryBuilder.mockReturnValue(listQb);
    progressRepo.findBy.mockResolvedValue([
      {
        userId: 10,
        vocabularyId: 21,
        status: 'learning',
        repetitions: 1,
        intervalDays: 1,
        easeFactor: '2.50',
        lastRating: 'good',
        lastReviewedAt: new Date('2026-11-14T00:00:00Z'),
        nextReviewAt: new Date('2026-11-15T00:00:00Z'),
      },
    ]);

    const res = await service.findAll(10, { reviewStatus: 'learning' });
    expect(listQb.leftJoin).toHaveBeenCalled();
    expect(listQb.andWhere).toHaveBeenCalled();
    expect(res.items[0].progress.status).toBe('learning');
    expect(res.items[0].progress.repetitions).toBe(1);
  });

  it('creates bulk AI vocabulary items in a single transaction with duplicate warnings', async () => {
    const rawQb = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getRawMany: vi
        .fn()
        .mockResolvedValue([{ normalizedTerm: 'sustainable' }]),
    };
    vocabRepo.createQueryBuilder.mockReturnValue(rawQb);
    topicsService.findOwnedTopicsByIds.mockResolvedValue([
      { id: 4, name: 'Environment' },
    ]);

    let seq = 100;
    const txVocabRepo = {
      create: vi.fn((x) => ({
        id: seq++,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...x,
      })),
      save: vi.fn(async (x) => x),
    };
    const txTvRepo = {
      create: vi.fn((x) => x),
      save: vi.fn(async (x) => x),
    };
    dataSource.transaction.mockImplementation(async (cb) =>
      cb({
        getRepository: (entity: unknown) =>
          entity === VocabularyItem ? txVocabRepo : txTvRepo,
      }),
    );

    const res = await service.createBulk(10, {
      topicIds: [4],
      items: [
        {
          term: 'sustainable',
          definition: 'Bền vững',
          source: VocabularySource.AI,
        },
        {
          term: 'mitigate',
          definition: 'Giảm nhẹ',
          source: VocabularySource.AI,
        },
      ],
    });

    expect(res.createdCount).toBe(2);
    expect(res.createdTopic).toBeNull();
    expect(res.items[0].source).toBe(VocabularySource.AI);
    expect(res.items[0].duplicateWarning).toBe(true);
    expect(res.items[0].topics).toEqual([{ id: 4, name: 'Environment' }]);
    expect(res.items[1].duplicateWarning).toBe(false);
  });

  it('resolves or creates newTopicName during bulk AI vocabulary creation', async () => {
    const rawQb = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getRawMany: vi.fn().mockResolvedValue([]),
    };
    vocabRepo.createQueryBuilder.mockReturnValue(rawQb);
    topicsService.resolveOrCreateByNameWithinManager.mockResolvedValue({
      topic: { id: 9, name: 'Công nghệ' },
      created: true,
    });

    const txVocabRepo = {
      create: vi.fn((x) => ({
        id: 200,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...x,
      })),
      save: vi.fn(async (x) => x),
    };
    const txTvRepo = {
      create: vi.fn((x) => x),
      save: vi.fn(async (x) => x),
    };
    dataSource.transaction.mockImplementation(async (cb) =>
      cb({
        getRepository: (entity: unknown) =>
          entity === VocabularyItem ? txVocabRepo : txTvRepo,
      }),
    );

    const res = await service.createBulk(10, {
      newTopicName: 'Công nghệ',
      items: [
        {
          term: 'algorithm',
          definition: 'Thuật toán',
          source: VocabularySource.AI,
        },
      ],
    });

    expect(
      topicsService.resolveOrCreateByNameWithinManager,
    ).toHaveBeenCalledWith(expect.anything(), 10, 1, 'Công nghệ');
    expect(res.createdTopic).toEqual({ id: 9, name: 'Công nghệ' });
    expect(res.items[0].topics).toEqual([{ id: 9, name: 'Công nghệ' }]);
  });
});
