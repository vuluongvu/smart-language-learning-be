import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { PaginationMeta } from '../common/dto/pagination-query.dto.js';
import { assertResourceOwnership } from '../common/guards/ownership.guard.js';
import { LanguagesService } from '../languages/languages.service.js';
import { TopicVocabulary } from '../topics/entities/topic-vocabulary.entity.js';
import { TopicsService } from '../topics/topics.service.js';
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
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVocabularyResult extends VocabularyItemView {
  duplicateWarning: boolean;
  existingMatchCount: number;
}

@Injectable()
export class VocabularyService {
  constructor(
    @InjectRepository(VocabularyItem)
    private readonly vocabularyRepository: Repository<VocabularyItem>,
    @InjectRepository(TopicVocabulary)
    private readonly topicVocabularyRepository: Repository<TopicVocabulary>,
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

    // Phase 4 will attach vocabulary_progress status; until then, non-'new' statuses have 0 rows
    if (
      query.reviewStatus &&
      query.reviewStatus !== 'all' &&
      query.reviewStatus !== 'new'
    ) {
      return {
        items: [],
        meta: { page, limit, total: 0, totalPages: 1 },
      };
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
    const topicsByVocab = await this.loadTopicsMap(items.map((i) => i.id));

    return {
      items: items.map((item) =>
        this.toView(item, topicsByVocab.get(item.id) ?? []),
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
  ): Promise<{
    exists: boolean;
    matches: Array<{ id: number; term: string; definition: string }>;
  }> {
    const normalized = term.trim().toLowerCase();
    if (!normalized) {
      return { exists: false, matches: [] };
    }

    const language = await this.languagesService.findActiveByCode('en');
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
    const topicsMap = await this.loadTopicsMap([item.id]);
    return this.toView(item, topicsMap.get(item.id) ?? []);
  }

  async create(
    userId: number,
    dto: CreateVocabularyDto,
  ): Promise<CreateVocabularyResult> {
    const term = dto.term.trim();
    const definition = dto.definition.trim();
    if (!term) {
      throw new BadRequestException('Term cannot be empty');
    }
    if (!definition) {
      throw new BadRequestException('Definition cannot be empty');
    }

    const code = (dto.languageCode ?? 'en').trim().toLowerCase();
    if (code !== 'en') {
      throw new BadRequestException(
        'MVP currently only supports English (en) vocabulary',
      );
    }

    const language = await this.languagesService.findActiveByCode('en');
    const uniqueTopicIds = Array.from(new Set(dto.topicIds ?? []));
    const ownedTopics = await this.topicsService.findOwnedTopicsByIds(
      userId,
      uniqueTopicIds,
    );

    const existingDup = await this.checkDuplicate(userId, term);

    const saved = await this.dataSource.transaction(async (manager) => {
      const vocabRepo = manager.getRepository(VocabularyItem);
      const tvRepo = manager.getRepository(TopicVocabulary);

      const created = await vocabRepo.save(
        vocabRepo.create({
          userId,
          languageId: language.id,
          term,
          pronunciation: this.normalizeOptional(dto.pronunciation),
          partOfSpeech: this.normalizeOptional(dto.partOfSpeech),
          definition,
          example: this.normalizeOptional(dto.example),
          notes: this.normalizeOptional(dto.notes),
          source: dto.source ?? VocabularySource.MANUAL,
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
    });

    return {
      ...this.toView(
        saved,
        ownedTopics.map((t) => ({ id: t.id, name: t.name })),
      ),
      duplicateWarning: existingDup.exists,
      existingMatchCount: existingDup.matches.length,
    };
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
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
