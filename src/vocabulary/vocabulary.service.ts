import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  isSupportedLearningLanguage,
  type LearningLanguageCode,
  normalizeLearningLanguage,
} from '../common/constants/learning-languages.js';
import { PaginationMeta } from '../common/dto/pagination-query.dto.js';
import { assertResourceOwnership } from '../common/guards/ownership.guard.js';
import {
  ReviewRating,
  VocabularyProgressStatus,
} from '../flashcards/entities/flashcard.enums.js';
import { VocabularyProgress } from '../flashcards/entities/vocabulary-progress.entity.js';
import { LanguagesService } from '../languages/languages.service.js';
import { Topic } from '../topics/entities/topic.entity.js';
import { TopicVocabulary } from '../topics/entities/topic-vocabulary.entity.js';
import { TopicsService } from '../topics/topics.service.js';
import { BulkCreateVocabularyDto } from './dto/ai-vocabulary.dto.js';
import { CreateVocabularyDto } from './dto/create-vocabulary.dto.js';
import { UpdateVocabularyDto } from './dto/update-vocabulary.dto.js';
import {
  VocabularyQueryDto,
  VocabularySortKey,
} from './dto/vocabulary-query.dto.js';
import {
  VocabularyItem,
  VocabularySource,
} from './entities/vocabulary-item.entity.js';

export interface VocabularyTopicRef {
  id: number;
  name: string;
}

export interface VocabularyProgressSummary {
  status: VocabularyProgressStatus;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  lastRating: ReviewRating | null;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  isDue: boolean;
}

export function toVocabularyProgressSummary(
  p: VocabularyProgress | null,
  now = new Date(),
): VocabularyProgressSummary {
  if (!p) {
    return {
      status: VocabularyProgressStatus.NEW,
      repetitions: 0,
      intervalDays: 0,
      easeFactor: 2.5,
      lastRating: null,
      lastReviewedAt: null,
      nextReviewAt: null,
      isDue: false,
    };
  }

  return {
    status: p.status,
    repetitions: p.repetitions,
    intervalDays: p.intervalDays,
    easeFactor: Number(p.easeFactor),
    lastRating: p.lastRating,
    lastReviewedAt: p.lastReviewedAt,
    nextReviewAt: p.nextReviewAt,
    isDue: Boolean(p.nextReviewAt && p.nextReviewAt.getTime() <= now.getTime()),
  };
}

export interface VocabularyItemView {
  id: number;
  languageId: number;
  term: string;
  pronunciation: string | null;
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
  notes: string | null;
  source: VocabularySource;
  topics: VocabularyTopicRef[];
  progress: VocabularyProgressSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVocabularyResult extends VocabularyItemView {
  duplicateWarning: boolean;
  existingMatchCount: number;
}

export interface BulkCreateVocabularyResult {
  createdCount: number;
  createdTopic: VocabularyTopicRef | null;
  items: CreateVocabularyResult[];
}

interface PreparedVocabularyDraft {
  term: string;
  pronunciation: string | null;
  partOfSpeech: string | null;
  definition: string;
  example: string | null;
  notes: string | null;
  source: VocabularySource;
  languageCode: LearningLanguageCode;
  topicIds: number[];
}

@Injectable()
export class VocabularyService {
  constructor(
    @InjectRepository(VocabularyItem)
    private readonly vocabularyRepository: Repository<VocabularyItem>,
    @InjectRepository(TopicVocabulary)
    private readonly topicVocabularyRepository: Repository<TopicVocabulary>,
    @InjectRepository(VocabularyProgress)
    private readonly progressRepository: Repository<VocabularyProgress>,
    private readonly languagesService: LanguagesService,
    private readonly topicsService: TopicsService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    userId: number,
    query: VocabularyQueryDto,
  ): Promise<{ items: VocabularyItemView[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();
    const partOfSpeech = query.partOfSpeech?.trim();

    if (query.topicId) {
      // Ensure requested topic filter belongs to the current user
      await this.topicsService.findOwnedTopicsByIds(userId, [query.topicId]);
    }

    const qb = this.vocabularyRepository
      .createQueryBuilder('vocab')
      .where('vocab.userId = :userId', { userId });

    if (query.languageCode) {
      const language = await this.languagesService.findActiveByCode(
        query.languageCode,
      );
      qb.andWhere('vocab.languageId = :languageId', {
        languageId: language.id,
      });
    }

    if (query.topicId) {
      qb.innerJoin(
        'topic_vocabulary',
        'tvFilter',
        'tvFilter.vocabulary_id = vocab.id AND tvFilter.topic_id = :topicId',
        { topicId: query.topicId },
      );
    }

    if (search) {
      qb.andWhere(
        '(LOWER(vocab.term) LIKE :search OR LOWER(vocab.definition) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    if (partOfSpeech) {
      qb.andWhere('LOWER(vocab.partOfSpeech) = :partOfSpeech', {
        partOfSpeech: partOfSpeech.toLowerCase(),
      });
    }

    if (query.reviewStatus && query.reviewStatus !== 'all') {
      qb.leftJoin(
        'vocabulary_progress',
        'vp',
        'vp.vocabulary_id = vocab.id AND vp.user_id = :progressUserId',
        { progressUserId: userId },
      );

      switch (query.reviewStatus) {
        case 'new':
          qb.andWhere('(vp.id IS NULL OR vp.status = :newStatus)', {
            newStatus: VocabularyProgressStatus.NEW,
          });
          break;
        case 'learning':
          qb.andWhere('vp.status = :learningStatus', {
            learningStatus: VocabularyProgressStatus.LEARNING,
          });
          break;
        case 'mastered':
          qb.andWhere('vp.status = :masteredStatus', {
            masteredStatus: VocabularyProgressStatus.MASTERED,
          });
          break;
        case 'due':
          qb.andWhere(
            'vp.next_review_at IS NOT NULL AND vp.next_review_at <= :dueNow',
            { dueNow: new Date() },
          );
          break;
      }
    }

    const sortKey: VocabularySortKey = query.sortBy ?? 'newest';
    switch (sortKey) {
      case 'oldest':
        qb.orderBy('vocab.createdAt', 'ASC').addOrderBy('vocab.id', 'ASC');
        break;
      case 'term_asc':
        qb.orderBy('vocab.term', 'ASC').addOrderBy('vocab.id', 'ASC');
        break;
      case 'term_desc':
        qb.orderBy('vocab.term', 'DESC').addOrderBy('vocab.id', 'DESC');
        break;
      case 'newest':
      default:
        qb.orderBy('vocab.createdAt', 'DESC').addOrderBy('vocab.id', 'DESC');
        break;
    }

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    const vocabIds = items.map((i) => i.id);
    const [topicsByVocab, progressByVocab] = await Promise.all([
      this.loadTopicsMap(vocabIds),
      this.loadProgressMap(userId, vocabIds),
    ]);
    const now = new Date();

    return {
      items: items.map((item) =>
        this.toView(
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
    };
  }

  async checkDuplicate(
    userId: number,
    term: string,
    languageCode: LearningLanguageCode = 'en',
  ): Promise<{
    exists: boolean;
    matches: Array<{ id: number; term: string; definition: string }>;
  }> {
    const normalized = term.trim().toLowerCase();
    if (!normalized) {
      return { exists: false, matches: [] };
    }

    const language = await this.languagesService.findActiveByCode(
      normalizeLearningLanguage(languageCode),
    );
    const matches = await this.vocabularyRepository
      .createQueryBuilder('vocab')
      .select(['vocab.id', 'vocab.term', 'vocab.definition'])
      .where('vocab.userId = :userId', { userId })
      .andWhere('vocab.languageId = :languageId', { languageId: language.id })
      .andWhere('LOWER(TRIM(vocab.term)) = :normalized', { normalized })
      .orderBy('vocab.createdAt', 'DESC')
      .getMany();

    return {
      exists: matches.length > 0,
      matches: matches.map((m) => ({
        id: m.id,
        term: m.term,
        definition: m.definition,
      })),
    };
  }

  async findOne(userId: number, id: number): Promise<VocabularyItemView> {
    const item = await this.findOwnedItem(userId, id);
    const [topicsMap, progressMap] = await Promise.all([
      this.loadTopicsMap([item.id]),
      this.loadProgressMap(userId, [item.id]),
    ]);
    return this.toView(
      item,
      topicsMap.get(item.id) ?? [],
      progressMap.get(item.id) ?? null,
    );
  }

  async create(
    userId: number,
    dto: CreateVocabularyDto,
  ): Promise<CreateVocabularyResult> {
    const prepared = this.prepareDraft(dto);
    const newTopicName = this.normalizeOptional(dto.newTopicName);
    const language = await this.languagesService.findActiveByCode(
      prepared.languageCode,
    );
    const ownedTopics = await this.topicsService.findOwnedTopicsByIds(
      userId,
      prepared.topicIds,
    );

    const existingDup = await this.checkDuplicate(
      userId,
      prepared.term,
      prepared.languageCode,
    );

    const { saved, allTopics } = await this.dataSource.transaction(
      async (manager) => {
        const resolvedTopics = [...ownedTopics];
        if (newTopicName) {
          const { topic } =
            await this.topicsService.resolveOrCreateByNameWithinManager(
              manager,
              userId,
              language.id,
              newTopicName,
            );
          if (!resolvedTopics.some((t) => t.id === topic.id)) {
            resolvedTopics.push(topic);
          }
        }
        const created = await this.insertWithinManager(
          manager,
          userId,
          language.id,
          prepared,
          resolvedTopics,
        );
        return { saved: created, allTopics: resolvedTopics };
      },
    );

    return {
      ...this.toView(
        saved,
        allTopics.map((t) => ({ id: t.id, name: t.name })),
        null,
      ),
      duplicateWarning: existingDup.exists,
      existingMatchCount: existingDup.matches.length,
    };
  }

  async createBulk(
    userId: number,
    dto: BulkCreateVocabularyDto,
  ): Promise<BulkCreateVocabularyResult> {
    const sharedTopicIds = dto.topicIds ?? [];
    const newTopicName = this.normalizeOptional(dto.newTopicName);
    const bulkLangInput = dto.languageCode?.trim().toLowerCase();
    if (bulkLangInput && !isSupportedLearningLanguage(bulkLangInput)) {
      throw new BadRequestException(
        'Supported languages are English (en) and Korean (ko)',
      );
    }
    const preparedList = dto.items.map((item) =>
      this.prepareDraft(
        {
          ...item,
          languageCode: item.languageCode ?? bulkLangInput ?? 'en',
        },
        sharedTopicIds,
      ),
    );

    const bulkLanguageCode = normalizeLearningLanguage(
      bulkLangInput ?? preparedList[0]?.languageCode ?? 'en',
    );
    const language =
      await this.languagesService.findActiveByCode(bulkLanguageCode);
    const allTopicIds = Array.from(
      new Set(preparedList.flatMap((item) => item.topicIds)),
    );
    const ownedTopics = await this.topicsService.findOwnedTopicsByIds(
      userId,
      allTopicIds,
    );
    const topicById = new Map(ownedTopics.map((topic) => [topic.id, topic]));

    const existingTerms = await this.findExistingTermSet(
      userId,
      preparedList.map((item) => item.term),
      bulkLanguageCode,
    );

    const { savedRows, createdTopic } = await this.dataSource.transaction(
      async (manager) => {
        let extraTopic: Topic | null = null;
        let createdTopicRef: VocabularyTopicRef | null = null;
        if (newTopicName) {
          const resolved =
            await this.topicsService.resolveOrCreateByNameWithinManager(
              manager,
              userId,
              language.id,
              newTopicName,
            );
          extraTopic = resolved.topic;
          topicById.set(extraTopic.id, extraTopic);
          if (resolved.created) {
            createdTopicRef = {
              id: extraTopic.id,
              name: extraTopic.name,
            };
          }
        }

        const results: Array<{ saved: VocabularyItem; topics: Topic[] }> = [];
        for (const prepared of preparedList) {
          const itemTopics = prepared.topicIds
            .map((id) => topicById.get(id))
            .filter((topic): topic is Topic => Boolean(topic));
          if (extraTopic && !itemTopics.some((t) => t.id === extraTopic.id)) {
            itemTopics.push(extraTopic);
          }
          const saved = await this.insertWithinManager(
            manager,
            userId,
            language.id,
            prepared,
            itemTopics,
          );
          results.push({ saved, topics: itemTopics });
        }
        return { savedRows: results, createdTopic: createdTopicRef };
      },
    );

    const seenInBatch = new Set<string>();
    const items: CreateVocabularyResult[] = savedRows.map(
      ({ saved, topics }) => {
        const normalized = saved.term.trim().toLowerCase();
        const isDup =
          existingTerms.has(normalized) || seenInBatch.has(normalized);
        seenInBatch.add(normalized);
        return {
          ...this.toView(
            saved,
            topics.map((t) => ({ id: t.id, name: t.name })),
            null,
          ),
          duplicateWarning: isDup,
          existingMatchCount: isDup ? 1 : 0,
        };
      },
    );

    return {
      createdCount: items.length,
      createdTopic,
      items,
    };
  }

  async findExistingTermSet(
    userId: number,
    terms: string[],
    languageCode: LearningLanguageCode = 'en',
  ): Promise<Set<string>> {
    const normalized = Array.from(
      new Set(terms.map((t) => t.trim().toLowerCase()).filter(Boolean)),
    );
    if (normalized.length === 0) {
      return new Set();
    }

    const language = await this.languagesService.findActiveByCode(
      normalizeLearningLanguage(languageCode),
    );
    const rows = await this.vocabularyRepository
      .createQueryBuilder('vocab')
      .select('LOWER(TRIM(vocab.term))', 'normalizedTerm')
      .where('vocab.userId = :userId', { userId })
      .andWhere('vocab.languageId = :languageId', { languageId: language.id })
      .andWhere('LOWER(TRIM(vocab.term)) IN (:...normalized)', { normalized })
      .getRawMany<{ normalizedTerm: string }>();

    return new Set(rows.map((r) => r.normalizedTerm));
  }

  async listTopicTerms(
    userId: number,
    topicId: number,
    limit = 30,
  ): Promise<string[]> {
    const rows = await this.vocabularyRepository
      .createQueryBuilder('vocab')
      .select('vocab.term', 'term')
      .innerJoin(
        'topic_vocabulary',
        'tv',
        'tv.vocabulary_id = vocab.id AND tv.topic_id = :topicId',
        { topicId },
      )
      .where('vocab.userId = :userId', { userId })
      .orderBy('vocab.createdAt', 'DESC')
      .limit(limit)
      .getRawMany<{ term: string }>();

    return rows.map((r) => r.term);
  }

  async update(
    userId: number,
    id: number,
    dto: UpdateVocabularyDto,
  ): Promise<VocabularyItemView> {
    const item = await this.findOwnedItem(userId, id);

    if (dto.term !== undefined) {
      const trimmed = dto.term.trim();
      if (!trimmed) {
        throw new BadRequestException('Term cannot be empty');
      }
      item.term = trimmed;
    }

    if (dto.definition !== undefined) {
      const trimmed = dto.definition.trim();
      if (!trimmed) {
        throw new BadRequestException('Definition cannot be empty');
      }
      item.definition = trimmed;
    }

    if (dto.pronunciation !== undefined) {
      item.pronunciation = this.normalizeOptional(dto.pronunciation);
    }
    if (dto.partOfSpeech !== undefined) {
      item.partOfSpeech = this.normalizeOptional(dto.partOfSpeech);
    }
    if (dto.example !== undefined) {
      item.example = this.normalizeOptional(dto.example);
    }
    if (dto.notes !== undefined) {
      item.notes = this.normalizeOptional(dto.notes);
    }

    const uniqueTopicIds =
      dto.topicIds !== undefined ? Array.from(new Set(dto.topicIds)) : null;

    if (uniqueTopicIds !== null) {
      await this.topicsService.findOwnedTopicsByIds(userId, uniqueTopicIds);
    }

    await this.dataSource.transaction(async (manager) => {
      const vocabRepo = manager.getRepository(VocabularyItem);
      const tvRepo = manager.getRepository(TopicVocabulary);

      await vocabRepo.save(item);

      if (uniqueTopicIds !== null) {
        await tvRepo.delete({ vocabularyId: item.id });
        if (uniqueTopicIds.length > 0) {
          await tvRepo.save(
            uniqueTopicIds.map((topicId) =>
              tvRepo.create({ topicId, vocabularyId: item.id }),
            ),
          );
        }
      }
    });

    return this.findOne(userId, item.id);
  }

  async remove(
    userId: number,
    id: number,
  ): Promise<{ message: string; id: number }> {
    const item = await this.findOwnedItem(userId, id);
    await this.vocabularyRepository.delete({ id: item.id, userId });
    return { message: 'Vocabulary item deleted successfully', id: item.id };
  }

  async findOwnedItemsByIds(
    userId: number,
    vocabularyIds: number[],
  ): Promise<VocabularyItem[]> {
    if (vocabularyIds.length === 0) {
      return [];
    }
    const uniqueIds = Array.from(new Set(vocabularyIds));
    const items = await this.vocabularyRepository.findBy({ id: In(uniqueIds) });

    if (items.length !== uniqueIds.length) {
      throw new NotFoundException(
        'One or more vocabulary items were not found',
      );
    }

    for (const item of items) {
      assertResourceOwnership(item.userId, userId, 'Vocabulary item');
    }

    return items;
  }

  private async findOwnedItem(
    userId: number,
    id: number,
  ): Promise<VocabularyItem> {
    const item = await this.vocabularyRepository.findOneBy({ id });
    if (!item) {
      throw new NotFoundException('Vocabulary item not found');
    }
    assertResourceOwnership(item.userId, userId, 'Vocabulary item');
    return item;
  }

  private async loadTopicsMap(
    vocabularyIds: number[],
  ): Promise<Map<number, VocabularyTopicRef[]>> {
    const map = new Map<number, VocabularyTopicRef[]>();
    if (vocabularyIds.length === 0) {
      return map;
    }

    const links = await this.topicVocabularyRepository.find({
      where: { vocabularyId: In(vocabularyIds) },
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

  private async loadProgressMap(
    userId: number,
    vocabularyIds: number[],
  ): Promise<Map<number, VocabularyProgress>> {
    const map = new Map<number, VocabularyProgress>();
    if (vocabularyIds.length === 0) {
      return map;
    }

    const rows = await this.progressRepository.findBy({
      userId,
      vocabularyId: In(vocabularyIds),
    });
    for (const row of rows) {
      map.set(row.vocabularyId, row);
    }

    return map;
  }

  private prepareDraft(
    dto: CreateVocabularyDto,
    extraTopicIds: number[] = [],
  ): PreparedVocabularyDraft {
    const term = dto.term.trim();
    const definition = dto.definition.trim();
    if (!term) {
      throw new BadRequestException('Term cannot be empty');
    }
    if (!definition) {
      throw new BadRequestException('Definition cannot be empty');
    }

    const code = (dto.languageCode ?? 'en').trim().toLowerCase();
    if (!isSupportedLearningLanguage(code)) {
      throw new BadRequestException(
        'Supported languages are English (en) and Korean (ko)',
      );
    }

    return {
      term,
      pronunciation: this.normalizeOptional(dto.pronunciation),
      partOfSpeech: this.normalizeOptional(dto.partOfSpeech),
      definition,
      example: this.normalizeOptional(dto.example),
      notes: this.normalizeOptional(dto.notes),
      source: dto.source ?? VocabularySource.MANUAL,
      languageCode: code,
      topicIds: Array.from(
        new Set([...(dto.topicIds ?? []), ...extraTopicIds]),
      ),
    };
  }

  private async insertWithinManager(
    manager: EntityManager,
    userId: number,
    languageId: number,
    prepared: PreparedVocabularyDraft,
    ownedTopics: Topic[],
  ): Promise<VocabularyItem> {
    const vocabRepo = manager.getRepository(VocabularyItem);
    const tvRepo = manager.getRepository(TopicVocabulary);

    const created = await vocabRepo.save(
      vocabRepo.create({
        userId,
        languageId,
        term: prepared.term,
        pronunciation: prepared.pronunciation,
        partOfSpeech: prepared.partOfSpeech,
        definition: prepared.definition,
        example: prepared.example,
        notes: prepared.notes,
        source: prepared.source,
      }),
    );

    if (ownedTopics.length > 0) {
      await tvRepo.save(
        ownedTopics.map((topic) =>
          tvRepo.create({
            topicId: topic.id,
            vocabularyId: created.id,
          }),
        ),
      );
    }

    return created;
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private toView(
    item: VocabularyItem,
    topics: VocabularyTopicRef[],
    progress: VocabularyProgress | null,
    now = new Date(),
  ): VocabularyItemView {
    return {
      id: item.id,
      languageId: item.languageId,
      term: item.term,
      pronunciation: item.pronunciation,
      partOfSpeech: item.partOfSpeech,
      definition: item.definition,
      example: item.example,
      notes: item.notes,
      source: item.source,
      topics,
      progress: toVocabularyProgressSummary(progress, now),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
