import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';
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
  let topicsService: { findOwnedTopicsByIds: ReturnType<typeof vi.fn> };
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
    topicsService = {
      findOwnedTopicsByIds: vi.fn().mockResolvedValue([]),
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
});
