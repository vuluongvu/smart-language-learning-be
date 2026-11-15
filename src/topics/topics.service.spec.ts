import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { LanguagesService } from '../languages/languages.service.js';
import { VocabularyItem } from '../vocabulary/entities/vocabulary-item.entity.js';
import { TopicVocabulary } from './entities/topic-vocabulary.entity.js';
import { Topic } from './entities/topic.entity.js';
import { TopicsService } from './topics.service.js';

describe('TopicsService', () => {
  let service: TopicsService;
  let topicRepo: {
    findOneBy: ReturnType<typeof vi.fn>;
    findBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };
  let tvRepo: {
    find: ReturnType<typeof vi.fn>;
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };
  let vocabRepo: { findOneBy: ReturnType<typeof vi.fn> };
  let languagesService: { findActiveByCode: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    topicRepo = {
      findOneBy: vi.fn(),
      findBy: vi.fn(),
      create: vi.fn((x) => x),
      save: vi.fn(async (x) => ({
        id: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...x,
      })),
      delete: vi.fn(async () => ({ affected: 1 })),
      createQueryBuilder: vi.fn(),
    };
    tvRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOneBy: vi.fn(),
      create: vi.fn((x) => x),
      save: vi.fn(async (x) => x),
      delete: vi.fn(async () => ({ affected: 1 })),
      createQueryBuilder: vi.fn(),
    };
    vocabRepo = {
      findOneBy: vi.fn(),
    };
    languagesService = {
      findActiveByCode: vi
        .fn()
        .mockResolvedValue({ id: 1, code: 'en', name: 'English' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopicsService,
        { provide: getRepositoryToken(Topic), useValue: topicRepo },
        { provide: getRepositoryToken(TopicVocabulary), useValue: tvRepo },
        { provide: getRepositoryToken(VocabularyItem), useValue: vocabRepo },
        { provide: LanguagesService, useValue: languagesService },
      ],
    }).compile();

    service = module.get<TopicsService>(TopicsService);
  });

  it('creates an English topic and rejects non-English MVP topics', async () => {
    const created = await service.create(10, {
      name: '  Technology ',
      description: 'Tech terms',
    });
    expect(created.name).toBe('Technology');
    expect(created.vocabularyCount).toBe(0);

    await expect(
      service.create(10, { name: 'Korean', languageCode: 'ko' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('prevents cross-user topic access', async () => {
    topicRepo.findOneBy.mockResolvedValue({
      id: 5,
      userId: 99,
      name: 'Private',
    });

    await expect(service.findOne(10, 5)).rejects.toThrow(ForbiddenException);
    await expect(service.update(10, 5, { name: 'Hacked' })).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.remove(10, 5)).rejects.toThrow(ForbiddenException);
  });

  it('detaches vocabulary without deleting the vocabulary item', async () => {
    topicRepo.findOneBy.mockResolvedValue({ id: 3, userId: 10 });
    vocabRepo.findOneBy.mockResolvedValue({ id: 7, userId: 10 });

    const res = await service.detachVocabulary(10, 3, 7);
    expect(res.message).toBe('Vocabulary removed from topic');
    expect(tvRepo.delete).toHaveBeenCalledWith({
      topicId: 3,
      vocabularyId: 7,
    });
  });

  it('throws NotFoundException when topic does not exist', async () => {
    topicRepo.findOneBy.mockResolvedValue(null);
    await expect(service.findOne(10, 404)).rejects.toThrow(NotFoundException);
  });
});
