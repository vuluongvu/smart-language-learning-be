import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { isSupportedLearningLanguage } from '../common/constants/learning-languages.js';
import { PaginationMeta } from '../common/dto/pagination-query.dto.js';
import { assertResourceOwnership } from '../common/guards/ownership.guard.js';
import { LanguagesService } from '../languages/languages.service.js';
import { VocabularyItem } from '../vocabulary/entities/vocabulary-item.entity.js';
import { CreateTopicDto } from './dto/create-topic.dto.js';
import { TopicQueryDto } from './dto/topic-query.dto.js';
import { UpdateTopicDto } from './dto/update-topic.dto.js';
import { TopicVocabulary } from './entities/topic-vocabulary.entity.js';
import { Topic } from './entities/topic.entity.js';

export interface TopicSummary {
  id: number;
  name: string;
  description: string | null;
  languageId: number;
  vocabularyCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TopicDetail extends TopicSummary {
  vocabularyItems: Array<{
    id: number;
    term: string;
    pronunciation: string | null;
    partOfSpeech: string | null;
    definition: string;
    example: string | null;
    notes: string | null;
    source: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(TopicVocabulary)
    private readonly topicVocabularyRepository: Repository<TopicVocabulary>,
    @InjectRepository(VocabularyItem)
    private readonly vocabularyRepository: Repository<VocabularyItem>,
    private readonly languagesService: LanguagesService,
  ) {}

  async findAll(
    userId: number,
    query: TopicQueryDto,
  ): Promise<{ items: TopicSummary[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();

    const qb = this.topicRepository
      .createQueryBuilder('topic')
      .where('topic.userId = :userId', { userId });

    if (query.languageCode) {
      const language = await this.languagesService.findActiveByCode(
        query.languageCode,
      );
      qb.andWhere('topic.languageId = :languageId', {
        languageId: language.id,
      });
    }

    if (search) {
      qb.andWhere(
        "(LOWER(topic.name) LIKE :search OR LOWER(COALESCE(topic.description, '')) LIKE :search)",
        { search: `%${search.toLowerCase()}%` },
      );
    }

    qb.orderBy('topic.updatedAt', 'DESC')
      .addOrderBy('topic.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [topics, total] = await qb.getManyAndCount();
    const counts = await this.getVocabularyCounts(topics.map((t) => t.id));

    return {
      items: topics.map((t) => this.toSummary(t, counts.get(t.id) ?? 0)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(userId: number, topicId: number): Promise<TopicDetail> {
    const topic = await this.findOwnedTopic(userId, topicId);

    const links = await this.topicVocabularyRepository.find({
      where: { topicId: topic.id },
      relations: { vocabulary: true },
      order: { addedAt: 'DESC' },
    });

    const vocabularyItems = links
      .map((link) => link.vocabulary)
      .filter((v): v is VocabularyItem => Boolean(v && v.userId === userId))
      .map((v) => ({
        id: v.id,
        term: v.term,
        pronunciation: v.pronunciation,
        partOfSpeech: v.partOfSpeech,
        definition: v.definition,
        example: v.example,
        notes: v.notes,
        source: v.source,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      }));

    return {
      ...this.toSummary(topic, vocabularyItems.length),
      vocabularyItems,
    };
  }

  async create(userId: number, dto: CreateTopicDto): Promise<TopicSummary> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Topic name cannot be empty');
    }

    const code = (dto.languageCode ?? 'en').trim().toLowerCase();
    if (!isSupportedLearningLanguage(code)) {
      throw new BadRequestException(
        'Supported languages are English (en) and Korean (ko)',
      );
    }

    const language = await this.languagesService.findActiveByCode(code);

    const saved = await this.topicRepository.save(
      this.topicRepository.create({
        userId,
        languageId: language.id,
        name,
        description: dto.description?.trim() ? dto.description.trim() : null,
      }),
    );

    return this.toSummary(saved, 0);
  }

  async update(
    userId: number,
    topicId: number,
    dto: UpdateTopicDto,
  ): Promise<TopicSummary> {
    const topic = await this.findOwnedTopic(userId, topicId);

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      if (!trimmed) {
        throw new BadRequestException('Topic name cannot be empty');
      }
      topic.name = trimmed;
    }

    if (dto.description !== undefined) {
      topic.description = dto.description?.trim()
        ? dto.description.trim()
        : null;
    }

    const saved = await this.topicRepository.save(topic);
    const counts = await this.getVocabularyCounts([saved.id]);
    return this.toSummary(saved, counts.get(saved.id) ?? 0);
  }

  async remove(
    userId: number,
    topicId: number,
  ): Promise<{ message: string; id: number }> {
    const topic = await this.findOwnedTopic(userId, topicId);
    await this.topicRepository.delete({ id: topic.id, userId });
    return { message: 'Topic deleted successfully', id: topic.id };
  }

  async attachVocabulary(
    userId: number,
    topicId: number,
    vocabularyId: number,
  ): Promise<{ message: string; topicId: number; vocabularyId: number }> {
    await this.findOwnedTopic(userId, topicId);

    const vocab = await this.vocabularyRepository.findOneBy({
      id: vocabularyId,
    });
    if (!vocab) {
      throw new NotFoundException('Vocabulary item not found');
    }
    assertResourceOwnership(vocab.userId, userId, 'Vocabulary item');

    const existing = await this.topicVocabularyRepository.findOneBy({
      topicId,
      vocabularyId,
    });

    if (!existing) {
      await this.topicVocabularyRepository.save(
        this.topicVocabularyRepository.create({
          topicId,
          vocabularyId,
        }),
      );
    }

    return {
      message: 'Vocabulary attached to topic',
      topicId,
      vocabularyId,
    };
  }

  async detachVocabulary(
    userId: number,
    topicId: number,
    vocabularyId: number,
  ): Promise<{ message: string; topicId: number; vocabularyId: number }> {
    await this.findOwnedTopic(userId, topicId);

    const vocab = await this.vocabularyRepository.findOneBy({
      id: vocabularyId,
    });
    if (!vocab) {
      throw new NotFoundException('Vocabulary item not found');
    }
    assertResourceOwnership(vocab.userId, userId, 'Vocabulary item');

    await this.topicVocabularyRepository.delete({
      topicId,
      vocabularyId,
    });

    return {
      message: 'Vocabulary removed from topic',
      topicId,
      vocabularyId,
    };
  }

  async findOwnedTopicsByIds(
    userId: number,
    topicIds: number[],
  ): Promise<Topic[]> {
    if (topicIds.length === 0) {
      return [];
    }
    const uniqueIds = Array.from(new Set(topicIds));
    const topics = await this.topicRepository.findBy({ id: In(uniqueIds) });

    if (topics.length !== uniqueIds.length) {
      throw new NotFoundException('One or more topics were not found');
    }

    for (const topic of topics) {
      assertResourceOwnership(topic.userId, userId, 'Topic');
    }

    return topics;
  }

  async resolveOrCreateByNameWithinManager(
    manager: EntityManager,
    userId: number,
    languageId: number,
    rawName: string,
  ): Promise<{ topic: Topic; created: boolean }> {
    const trimmed = rawName.trim();
    if (!trimmed) {
      throw new BadRequestException('Topic name cannot be empty');
    }

    const topicRepo = manager.getRepository(Topic);
    const existing = await topicRepo
      .createQueryBuilder('topic')
      .where('topic.userId = :userId', { userId })
      .andWhere('topic.languageId = :languageId', { languageId })
      .andWhere('LOWER(TRIM(topic.name)) = :normalized', {
        normalized: trimmed.toLowerCase(),
      })
      .orderBy('topic.id', 'ASC')
      .getOne();

    if (existing) {
      return { topic: existing, created: false };
    }

    const saved = await topicRepo.save(
      topicRepo.create({
        userId,
        languageId,
        name: trimmed.slice(0, 120),
        description: null,
      }),
    );

    return { topic: saved, created: true };
  }

  private async findOwnedTopic(
    userId: number,
    topicId: number,
  ): Promise<Topic> {
    const topic = await this.topicRepository.findOneBy({ id: topicId });
    if (!topic) {
      throw new NotFoundException('Topic not found');
    }
    assertResourceOwnership(topic.userId, userId, 'Topic');
    return topic;
  }

  private async getVocabularyCounts(
    topicIds: number[],
  ): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (topicIds.length === 0) {
      return map;
    }

    const rows = await this.topicVocabularyRepository
      .createQueryBuilder('tv')
      .select('tv.topicId', 'topicId')
      .addSelect('COUNT(tv.vocabularyId)', 'cnt')
      .where('tv.topicId IN (:...topicIds)', { topicIds })
      .groupBy('tv.topicId')
      .getRawMany<{ topicId: number | string; cnt: string }>();

    for (const row of rows) {
      map.set(Number(row.topicId), Number(row.cnt));
    }

    return map;
  }

  private toSummary(topic: Topic, vocabularyCount: number): TopicSummary {
    return {
      id: topic.id,
      name: topic.name,
      description: topic.description,
      languageId: topic.languageId,
      vocabularyCount,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
    };
  }
}
