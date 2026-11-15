import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  PaginationMeta,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto.js';
import { assertResourceOwnership } from '../common/guards/ownership.guard.js';
import { LanguagesService } from '../languages/languages.service.js';
import { ActivitySourceType } from '../streaks/entities/learning-activity-event.entity.js';
import { StreaksService } from '../streaks/streaks.service.js';
import { TopicVocabulary } from '../topics/entities/topic-vocabulary.entity.js';
import { Topic } from '../topics/entities/topic.entity.js';
import { TopicsService } from '../topics/topics.service.js';
import {
  VocabularyItem,
  VocabularySource,
} from '../vocabulary/entities/vocabulary-item.entity.js';
import {
  VocabularyItemView,
  VocabularyService,
} from '../vocabulary/vocabulary.service.js';
import { AttemptQueryDto } from './dto/attempt-query.dto.js';
import { CreateQuizDto, CreateQuizQuestionDto } from './dto/create-quiz.dto.js';
import { DraftFromVocabularyDto } from './dto/draft-from-vocabulary.dto.js';
import { QuizQueryDto, QuizSortKey } from './dto/quiz-query.dto.js';
import { SaveVocabularyFromQuizDto } from './dto/save-vocabulary-from-quiz.dto.js';
import { StartAttemptDto } from './dto/start-attempt.dto.js';
import { SubmitAttemptDto } from './dto/submit-attempt.dto.js';
import { UpdateQuizDto } from './dto/update-quiz.dto.js';
import { QuestionOption } from './entities/question-option.entity.js';
import { QuizAnswer } from './entities/quiz-answer.entity.js';
import { QuizAttempt } from './entities/quiz-attempt.entity.js';
import { QuizQuestion } from './entities/quiz-question.entity.js';
import { Quiz } from './entities/quiz.entity.js';
import {
  QuestionType,
  QuizAttemptStatus,
  QuizDifficulty,
  QuizStatus,
} from './entities/quiz.enums.js';
import { QuizScoringService } from './quiz-scoring.service.js';

export interface QuizSummaryView {
  id: number;
  title: string;
  description: string | null;
  topicId: number | null;
  topicName: string | null;
  difficulty: QuizDifficulty | null;
  status: QuizStatus;
  questionCount: number;
  attemptCount: number;
  inProgressAttemptId: number | null;
  lastScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizOptionEditorView {
  id: number;
  optionText: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface QuizQuestionEditorView {
  id: number;
  vocabularyId: number | null;
  vocabularyTerm: string | null;
  questionText: string;
  questionType: QuestionType;
  explanation: string | null;
  orderIndex: number;
  options: QuizOptionEditorView[];
}

export interface QuizDetailView {
  id: number;
  title: string;
  description: string | null;
  topicId: number | null;
  topicName: string | null;
  difficulty: QuizDifficulty | null;
  status: QuizStatus;
  questions: QuizQuestionEditorView[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AttemptTakingOptionView {
  id: number;
  optionText: string;
  orderIndex: number;
}

export interface AttemptTakingQuestionView {
  id: number;
  questionText: string;
  questionType: QuestionType;
  orderIndex: number;
  options: AttemptTakingOptionView[];
  savedSelectedOptionId: number | null;
  savedAnswerText: string | null;
}

export interface AttemptCompletedAnswerView {
  id: number;
  questionId: number | null;
  questionText: string;
  questionType: QuestionType;
  selectedOptionId: number | null;
  answerText: string | null;
  correctAnswer: string;
  explanation: string | null;
  vocabularyId: number | null;
  vocabularyTerm: string | null;
  isCorrect: boolean;
  answeredAt: Date;
}

export interface AttemptDetailView {
  id: number;
  quizId: number;
  quizTitle: string;
  status: QuizAttemptStatus;
  score: number;
  correctCount: number;
  totalQuestions: number;
  startedAt: Date;
  completedAt: Date | null;
  questions: AttemptTakingQuestionView[];
  answers: AttemptCompletedAnswerView[];
}

export interface AttemptSummaryView {
  id: number;
  quizId: number;
  quizTitle: string;
  status: QuizAttemptStatus;
  score: number;
  correctCount: number;
  totalQuestions: number;
  startedAt: Date;
  completedAt: Date | null;
}

export interface DraftQuestionProposal {
  vocabularyId: number | null;
  vocabularyTerm: string | null;
  questionText: string;
  questionType: QuestionType;
  explanation: string | null;
  options: Array<{ optionText: string; isCorrect: boolean }>;
}

@Injectable()
export class QuizzesService {
  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(QuizQuestion)
    private readonly questionRepository: Repository<QuizQuestion>,
    @InjectRepository(QuestionOption)
    private readonly optionRepository: Repository<QuestionOption>,
    @InjectRepository(QuizAttempt)
    private readonly attemptRepository: Repository<QuizAttempt>,
    @InjectRepository(QuizAnswer)
    private readonly answerRepository: Repository<QuizAnswer>,
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(TopicVocabulary)
    private readonly topicVocabularyRepository: Repository<TopicVocabulary>,
    @InjectRepository(VocabularyItem)
    private readonly vocabularyRepository: Repository<VocabularyItem>,
    private readonly topicsService: TopicsService,
    private readonly vocabularyService: VocabularyService,
    private readonly languagesService: LanguagesService,
    private readonly scoringService: QuizScoringService,
    private readonly streaksService: StreaksService,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(
    userId: number,
    query: QuizQueryDto,
  ): Promise<{ items: QuizSummaryView[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;
    const search = query.search?.trim();

    if (query.topicId) {
      await this.topicsService.findOwnedTopicsByIds(userId, [query.topicId]);
    }

    const qb = this.quizRepository
      .createQueryBuilder('quiz')
      .where('quiz.userId = :userId', { userId });

    if (query.topicId) {
      qb.andWhere('quiz.topicId = :topicId', { topicId: query.topicId });
    }
    if (query.status) {
      qb.andWhere('quiz.status = :status', { status: query.status });
    }
    if (query.difficulty) {
      qb.andWhere('quiz.difficulty = :difficulty', {
        difficulty: query.difficulty,
      });
    }
    if (search) {
      qb.andWhere(
        "(LOWER(quiz.title) LIKE :search OR LOWER(COALESCE(quiz.description, '')) LIKE :search)",
        { search: `%${search.toLowerCase()}%` },
      );
    }

    const sortKey: QuizSortKey = query.sortBy ?? 'newest';
    switch (sortKey) {
      case 'oldest':
        qb.orderBy('quiz.createdAt', 'ASC').addOrderBy('quiz.id', 'ASC');
        break;
      case 'title_asc':
        qb.orderBy('quiz.title', 'ASC').addOrderBy('quiz.id', 'ASC');
        break;
      case 'title_desc':
        qb.orderBy('quiz.title', 'DESC').addOrderBy('quiz.id', 'DESC');
        break;
      case 'newest':
      default:
        qb.orderBy('quiz.createdAt', 'DESC').addOrderBy('quiz.id', 'DESC');
        break;
    }

    qb.skip((page - 1) * limit).take(limit);
    const [quizzes, total] = await qb.getManyAndCount();
    const quizIds = quizzes.map((q) => q.id);

    const [topicNames, questionCounts, attemptStats] = await Promise.all([
      this.loadTopicNamesMap(
        quizzes.map((q) => q.topicId).filter((id): id is number => id !== null),
      ),
      this.loadQuestionCountsMap(quizIds),
      this.loadAttemptStatsMap(userId, quizIds),
    ]);

    return {
      items: quizzes.map((quiz) => {
        const stats = attemptStats.get(quiz.id);
        return {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          topicId: quiz.topicId,
          topicName: quiz.topicId
            ? (topicNames.get(quiz.topicId) ?? null)
            : null,
          difficulty: quiz.difficulty,
          status: quiz.status,
          questionCount: questionCounts.get(quiz.id) ?? 0,
          attemptCount: stats?.attemptCount ?? 0,
          inProgressAttemptId: stats?.inProgressAttemptId ?? null,
          lastScore: stats?.lastScore ?? null,
          createdAt: quiz.createdAt,
          updatedAt: quiz.updatedAt,
        };
      }),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(userId: number, quizId: number): Promise<QuizDetailView> {
    const quiz = await this.findOwnedQuiz(userId, quizId);
    const [questions, topicNames] = await Promise.all([
      this.loadQuestionsWithOptions(quiz.id),
      quiz.topicId
        ? this.loadTopicNamesMap([quiz.topicId])
        : Promise.resolve(new Map<number, string>()),
    ]);

    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      topicId: quiz.topicId,
      topicName: quiz.topicId ? (topicNames.get(quiz.topicId) ?? null) : null,
      difficulty: quiz.difficulty,
      status: quiz.status,
      questions: questions.map(({ question, options }) => ({
        id: question.id,
        vocabularyId: question.vocabularyId,
        vocabularyTerm: question.vocabularyTerm,
        questionText: question.questionText,
        questionType: question.questionType,
        explanation: question.explanation,
        orderIndex: question.orderIndex,
        options: options.map((opt) => ({
          id: opt.id,
          optionText: opt.optionText,
          isCorrect: Boolean(opt.isCorrect),
          orderIndex: opt.orderIndex,
        })),
      })),
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt,
    };
  }

  async create(userId: number, dto: CreateQuizDto): Promise<QuizDetailView> {
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('Quiz title cannot be empty');
    }

    const status = dto.status ?? QuizStatus.DRAFT;
    const questions = dto.questions ?? [];
    const topicId = dto.topicId ?? null;

    if (topicId !== null) {
      await this.topicsService.findOwnedTopicsByIds(userId, [topicId]);
    }

    const vocabTermsMap = await this.validateQuestionsInput(
      userId,
      questions,
      status,
    );

    const savedId = await this.dataSource.transaction(async (manager) => {
      const quizRepo = manager.getRepository(Quiz);
      const quiz = await quizRepo.save(
        quizRepo.create({
          userId,
          topicId,
          title,
          description: this.normalizeOptional(dto.description),
          difficulty: dto.difficulty ?? null,
          status,
        }),
      );

      await this.insertQuestionsAndOptions(
        manager,
        quiz.id,
        questions,
        vocabTermsMap,
      );

      return quiz.id;
    });

    return this.findOne(userId, savedId);
  }

  async update(
    userId: number,
    quizId: number,
    dto: UpdateQuizDto,
  ): Promise<QuizDetailView> {
    const quiz = await this.findOwnedQuiz(userId, quizId);

    if (dto.title !== undefined) {
      const trimmed = dto.title.trim();
      if (!trimmed) {
        throw new BadRequestException('Quiz title cannot be empty');
      }
      quiz.title = trimmed;
    }

    if (dto.description !== undefined) {
      quiz.description = this.normalizeOptional(dto.description);
    }

    if (dto.difficulty !== undefined) {
      quiz.difficulty = dto.difficulty;
    }

    if (dto.topicId !== undefined) {
      if (dto.topicId !== null) {
        await this.topicsService.findOwnedTopicsByIds(userId, [dto.topicId]);
      }
      quiz.topicId = dto.topicId;
    }

    const nextStatus = dto.status ?? quiz.status;
    quiz.status = nextStatus;

    let vocabTermsMap = new Map<number, string>();
    if (dto.questions !== undefined) {
      vocabTermsMap = await this.validateQuestionsInput(
        userId,
        dto.questions,
        nextStatus,
      );
    } else if (nextStatus === QuizStatus.PUBLISHED) {
      const existingCount = await this.questionRepository.countBy({
        quizId: quiz.id,
      });
      if (existingCount === 0) {
        throw new BadRequestException(
          'A published quiz must have at least 1 question',
        );
      }
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Quiz).save(quiz);

      if (dto.questions !== undefined) {
        // Invalidate unfinished attempts because question IDs will be replaced;
        // completed attempts retain immutable answer snapshots cleanly.
        await manager.getRepository(QuizAttempt).delete({
          quizId: quiz.id,
          userId,
          status: QuizAttemptStatus.IN_PROGRESS,
        });

        await manager.getRepository(QuizQuestion).delete({ quizId: quiz.id });
        await this.insertQuestionsAndOptions(
          manager,
          quiz.id,
          dto.questions,
          vocabTermsMap,
        );
      }
    });

    return this.findOne(userId, quiz.id);
  }

  async remove(
    userId: number,
    quizId: number,
  ): Promise<{ message: string; id: number }> {
    const quiz = await this.findOwnedQuiz(userId, quizId);
    await this.quizRepository.delete({ id: quiz.id, userId });
    return { message: 'Quiz deleted successfully', id: quiz.id };
  }

  async draftFromVocabulary(
    userId: number,
    dto: DraftFromVocabularyDto,
  ): Promise<{ questions: DraftQuestionProposal[] }> {
    const requestedTypes =
      dto.questionTypes && dto.questionTypes.length > 0
        ? dto.questionTypes
        : [
            QuestionType.MULTIPLE_CHOICE,
            QuestionType.WORD_MEANING,
            QuestionType.FILL_BLANK,
          ];
    const targetCount = dto.count ?? 5;

    let selectedItems: VocabularyItem[] = [];
    if (dto.vocabularyIds && dto.vocabularyIds.length > 0) {
      selectedItems = await this.vocabularyService.findOwnedItemsByIds(
        userId,
        dto.vocabularyIds,
      );
    } else if (dto.topicId) {
      await this.topicsService.findOwnedTopicsByIds(userId, [dto.topicId]);
      const links = await this.topicVocabularyRepository.find({
        where: { topicId: dto.topicId },
      });
      const vocabIds = links.map((l) => l.vocabularyId);
      if (vocabIds.length > 0) {
        selectedItems = await this.vocabularyRepository.find({
          where: { id: In(vocabIds), userId },
          order: { createdAt: 'DESC', id: 'DESC' },
        });
      }
    } else {
      selectedItems = await this.vocabularyRepository.find({
        where: { userId },
        order: { createdAt: 'DESC', id: 'DESC' },
        take: Math.max(targetCount * 2, 20),
      });
    }

    if (selectedItems.length === 0) {
      throw new BadRequestException(
        'No vocabulary items found for the selected source. Add vocabulary items first or create questions manually.',
      );
    }

    const poolItems = await this.vocabularyRepository.find({
      where: { userId },
      order: { id: 'DESC' },
      take: 100,
    });

    const needsChoicesOnly = requestedTypes.every(
      (t) => t !== QuestionType.FILL_BLANK,
    );
    if (needsChoicesOnly && poolItems.length < 2) {
      throw new BadRequestException(
        'At least 2 vocabulary items in your bank are needed to build Multiple Choice or Word Meaning distractors, or include Fill in the Blank.',
      );
    }

    const chosen = selectedItems.slice(0, targetCount);
    const questions: DraftQuestionProposal[] = chosen.map((item, idx) => {
      let qType = requestedTypes[idx % requestedTypes.length];
      if (
        (qType === QuestionType.MULTIPLE_CHOICE ||
          qType === QuestionType.WORD_MEANING) &&
        poolItems.length < 2
      ) {
        qType = QuestionType.FILL_BLANK;
      }

      const explanationParts = [
        item.pronunciation ? `Pronunciation: ${item.pronunciation}` : null,
        item.partOfSpeech ? `Part of speech: ${item.partOfSpeech}` : null,
        `Meaning: ${item.definition}`,
        item.example ? `Example: "${item.example}"` : null,
      ].filter((part): part is string => Boolean(part));
      const explanation =
        explanationParts.length > 0 ? explanationParts.join(' · ') : null;

      if (qType === QuestionType.FILL_BLANK) {
        return {
          vocabularyId: item.id,
          vocabularyTerm: item.term,
          questionText: this.buildFillBlankPrompt(item),
          questionType: QuestionType.FILL_BLANK,
          explanation,
          options: [{ optionText: item.term, isCorrect: true }],
        };
      }

      const otherItems = this.shuffleArray(
        poolItems.filter(
          (other) =>
            other.id !== item.id &&
            other.term.trim().toLowerCase() !== item.term.trim().toLowerCase(),
        ),
      );

      if (qType === QuestionType.WORD_MEANING) {
        const distractors = otherItems
          .map((o) => o.definition.trim())
          .filter(
            (def, i, arr) =>
              def.toLowerCase() !== item.definition.trim().toLowerCase() &&
              arr.indexOf(def) === i,
          )
          .slice(0, 3);

        const options = this.shuffleArray([
          { optionText: item.definition.trim(), isCorrect: true },
          ...distractors.map((optionText) => ({
            optionText,
            isCorrect: false,
          })),
        ]);

        return {
          vocabularyId: item.id,
          vocabularyTerm: item.term,
          questionText: `Select the correct meaning for "${item.term}"`,
          questionType: QuestionType.WORD_MEANING,
          explanation,
          options,
        };
      }

      const distractors = otherItems
        .map((o) => o.term.trim())
        .filter((term, i, arr) => arr.indexOf(term) === i)
        .slice(0, 3);

      const options = this.shuffleArray([
        { optionText: item.term.trim(), isCorrect: true },
        ...distractors.map((optionText) => ({
          optionText,
          isCorrect: false,
        })),
      ]);

      return {
        vocabularyId: item.id,
        vocabularyTerm: item.term,
        questionText: `Which English word or phrase matches: "${item.definition.trim()}"?`,
        questionType: QuestionType.MULTIPLE_CHOICE,
        explanation,
        options,
      };
    });

    return { questions };
  }

  async saveVocabularyFromQuiz(
    userId: number,
    dto: SaveVocabularyFromQuizDto,
  ): Promise<{
    item: VocabularyItemView;
    createdNewItem: boolean;
    createdTopicId: number | null;
  }> {
    const requestedTopicIds = Array.from(new Set(dto.topicIds ?? []));
    await this.topicsService.findOwnedTopicsByIds(userId, requestedTopicIds);

    const newTopicName = dto.newTopicName?.trim() || null;
    const english =
      newTopicName || !dto.existingVocabularyId
        ? await this.languagesService.findActiveByCode('en')
        : null;
    const languageId = english?.id ?? null;
    const trimmedTerm = dto.term?.trim() ?? '';
    const trimmedDefinition = dto.definition?.trim() ?? '';

    if (!dto.existingVocabularyId) {
      if (!trimmedTerm) {
        throw new BadRequestException('Term cannot be empty');
      }
      if (!trimmedDefinition) {
        throw new BadRequestException('Definition cannot be empty');
      }
    }

    const txResult = await this.dataSource.transaction(async (manager) => {
      const topicRepo = manager.getRepository(Topic);
      const tvRepo = manager.getRepository(TopicVocabulary);
      const vocabRepo = manager.getRepository(VocabularyItem);

      let createdTopicId: number | null = null;
      const allTopicIds = [...requestedTopicIds];

      if (newTopicName && languageId !== null) {
        const createdTopic = await topicRepo.save(
          topicRepo.create({
            userId,
            languageId,
            name: newTopicName,
            description: this.normalizeOptional(dto.newTopicDescription),
          }),
        );
        createdTopicId = createdTopic.id;
        allTopicIds.push(createdTopic.id);
      }

      const uniqueTopics = Array.from(new Set(allTopicIds));

      if (dto.existingVocabularyId) {
        const existing = await vocabRepo.findOneBy({
          id: dto.existingVocabularyId,
        });
        if (!existing) {
          throw new NotFoundException('Vocabulary item not found');
        }
        assertResourceOwnership(existing.userId, userId, 'Vocabulary item');

        if (uniqueTopics.length > 0) {
          const existingLinks = await tvRepo.find({
            where: {
              vocabularyId: existing.id,
              topicId: In(uniqueTopics),
            },
          });
          const linkedSet = new Set(existingLinks.map((l) => l.topicId));
          const missingTopicIds = uniqueTopics.filter(
            (id) => !linkedSet.has(id),
          );

          if (missingTopicIds.length > 0) {
            await tvRepo.save(
              missingTopicIds.map((topicId) =>
                tvRepo.create({ topicId, vocabularyId: existing.id }),
              ),
            );
          }
        }

        return {
          vocabularyId: existing.id,
          createdNewItem: false,
          createdTopicId,
        };
      }

      const createdVocab = await vocabRepo.save(
        vocabRepo.create({
          userId,
          languageId: languageId ?? 0,
          term: trimmedTerm,
          pronunciation: this.normalizeOptional(dto.pronunciation),
          partOfSpeech: this.normalizeOptional(dto.partOfSpeech),
          definition: trimmedDefinition,
          example: this.normalizeOptional(dto.example),
          notes: this.normalizeOptional(dto.notes),
          source: VocabularySource.QUIZ,
        }),
      );

      if (uniqueTopics.length > 0) {
        await tvRepo.save(
          uniqueTopics.map((topicId) =>
            tvRepo.create({ topicId, vocabularyId: createdVocab.id }),
          ),
        );
      }

      return {
        vocabularyId: createdVocab.id,
        createdNewItem: true,
        createdTopicId,
      };
    });

    const item = await this.vocabularyService.findOne(
      userId,
      txResult.vocabularyId,
    );

    return {
      item,
      createdNewItem: txResult.createdNewItem,
      createdTopicId: txResult.createdTopicId,
    };
  }

  async startAttempt(
    userId: number,
    quizId: number,
    dto?: StartAttemptDto,
  ): Promise<AttemptDetailView> {
    const quiz = await this.findOwnedQuiz(userId, quizId);
    if (quiz.status !== QuizStatus.PUBLISHED) {
      throw new BadRequestException(
        'Only published quizzes can be attempted. Publish the quiz first.',
      );
    }

    const questionsCount = await this.questionRepository.countBy({
      quizId: quiz.id,
    });
    if (questionsCount === 0) {
      throw new BadRequestException('Cannot start a quiz with 0 questions');
    }

    if (!dto?.forceNew) {
      const existingInProgress = await this.attemptRepository.findOne({
        where: {
          userId,
          quizId: quiz.id,
          status: QuizAttemptStatus.IN_PROGRESS,
        },
        order: { startedAt: 'DESC', id: 'DESC' },
      });

      if (existingInProgress) {
        return this.getAttempt(userId, existingInProgress.id);
      }
    }

    const created = await this.attemptRepository.save(
      this.attemptRepository.create({
        userId,
        quizId: quiz.id,
        quizTitleSnapshot: quiz.title,
        score: '0.00',
        correctCount: 0,
        totalQuestions: questionsCount,
        status: QuizAttemptStatus.IN_PROGRESS,
        completedAt: null,
      }),
    );

    return this.getAttempt(userId, created.id);
  }

  async saveProgress(
    userId: number,
    attemptId: number,
    dto: SubmitAttemptDto,
  ): Promise<AttemptDetailView> {
    const attempt = await this.findOwnedAttempt(userId, attemptId);
    if (attempt.status === QuizAttemptStatus.COMPLETED) {
      throw new ConflictException('Quiz attempt has already been submitted');
    }

    const questionsWithOpts = await this.loadQuestionsWithOptions(
      attempt.quizId,
    );
    const questionMap = new Map(
      questionsWithOpts.map(({ question, options }) => [
        question.id,
        { question, options },
      ]),
    );

    const validatedEntries = dto.answers.map((ans) => {
      const entry = questionMap.get(ans.questionId);
      if (!entry) {
        throw new BadRequestException(
          `Question #${ans.questionId} does not belong to this quiz`,
        );
      }

      let selectedOptionId: number | null = null;
      let answerText: string | null = null;

      if (entry.question.questionType === QuestionType.FILL_BLANK) {
        const trimmed = ans.answerText?.trim() ?? '';
        answerText = trimmed || null;
      } else if (ans.selectedOptionId != null) {
        const matched = entry.options.find(
          (o) => o.id === ans.selectedOptionId,
        );
        if (!matched) {
          throw new BadRequestException(
            `Option #${ans.selectedOptionId} does not belong to question #${ans.questionId}`,
          );
        }
        selectedOptionId = matched.id;
        answerText = matched.optionText;
      }

      return {
        question: entry.question,
        selectedOptionId,
        answerText,
      };
    });

    await this.dataSource.transaction(async (manager) => {
      const answerRepo = manager.getRepository(QuizAnswer);
      const questionIds = validatedEntries.map((v) => v.question.id);
      if (questionIds.length > 0) {
        const existingDraftAnswers = await answerRepo.find({
          where: {
            attemptId: attempt.id,
            questionId: In(questionIds),
          },
          select: { id: true },
        });
        if (existingDraftAnswers.length > 0) {
          await answerRepo.delete({
            id: In(existingDraftAnswers.map((row) => row.id)),
          });
        }

        await answerRepo.save(
          validatedEntries.map(({ question, selectedOptionId, answerText }) =>
            answerRepo.create({
              attemptId: attempt.id,
              questionId: question.id,
              selectedOptionId,
              answerText,
              questionTextSnapshot: question.questionText,
              questionTypeSnapshot: question.questionType,
              correctAnswerSnapshot: '',
              explanationSnapshot: question.explanation,
              vocabularyIdSnapshot: question.vocabularyId,
              vocabularyTermSnapshot: question.vocabularyTerm,
              isCorrect: false,
            }),
          ),
        );
      }
    });

    return this.getAttempt(userId, attempt.id);
  }

  async submitAttempt(
    userId: number,
    attemptId: number,
    dto: SubmitAttemptDto,
  ): Promise<AttemptDetailView> {
    await this.dataSource.transaction(async (manager) => {
      const attemptRepo = manager.getRepository(QuizAttempt);
      const answerRepo = manager.getRepository(QuizAnswer);

      const attempt = await attemptRepo.findOne({
        where: { id: attemptId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!attempt) {
        throw new NotFoundException('Quiz attempt not found');
      }
      assertResourceOwnership(attempt.userId, userId, 'Quiz attempt');

      if (attempt.status === QuizAttemptStatus.COMPLETED) {
        throw new ConflictException('Quiz attempt has already been submitted');
      }

      const questionsWithOptions = await this.loadQuestionsWithOptions(
        attempt.quizId,
        manager,
      );
      if (questionsWithOptions.length === 0) {
        throw new BadRequestException(
          'Quiz has no questions remaining to grade',
        );
      }

      const questions = questionsWithOptions.map((item) => item.question);
      const optionsMap = new Map<number, QuestionOption[]>(
        questionsWithOptions.map((item) => [item.question.id, item.options]),
      );

      const graded = this.scoringService.gradeAttempt(
        questions,
        optionsMap,
        dto.answers,
      );

      const existingAnswers = await answerRepo.find({
        where: { attemptId: attempt.id },
        select: { id: true },
      });
      if (existingAnswers.length > 0) {
        await answerRepo.delete({
          id: In(existingAnswers.map((row) => row.id)),
        });
      }
      await answerRepo.save(
        graded.answers.map((ans) =>
          answerRepo.create({
            attemptId: attempt.id,
            questionId: ans.questionId,
            selectedOptionId: ans.selectedOptionId,
            answerText: ans.answerText,
            questionTextSnapshot: ans.questionTextSnapshot,
            questionTypeSnapshot: ans.questionTypeSnapshot,
            correctAnswerSnapshot: ans.correctAnswerSnapshot,
            explanationSnapshot: ans.explanationSnapshot,
            vocabularyIdSnapshot: ans.vocabularyIdSnapshot,
            vocabularyTermSnapshot: ans.vocabularyTermSnapshot,
            isCorrect: ans.isCorrect,
          }),
        ),
      );

      attempt.correctCount = graded.correctCount;
      attempt.totalQuestions = graded.totalQuestions;
      attempt.score = graded.score.toFixed(2);
      attempt.completedAt = new Date();
      attempt.status = QuizAttemptStatus.COMPLETED;
      await attemptRepo.save(attempt);

      await this.streaksService.recordQualifiedActivity(manager, {
        userId,
        sourceType: ActivitySourceType.QUIZ_ATTEMPT,
        sourceId: attempt.id,
        occurredAt: attempt.completedAt,
      });
    });

    return this.getAttempt(userId, attemptId);
  }

  async getAttempt(
    userId: number,
    attemptId: number,
  ): Promise<AttemptDetailView> {
    const attempt = await this.findOwnedAttempt(userId, attemptId);

    if (attempt.status === QuizAttemptStatus.COMPLETED) {
      const answers = await this.answerRepository.find({
        where: { attemptId: attempt.id },
        order: { id: 'ASC' },
      });

      return {
        id: attempt.id,
        quizId: attempt.quizId,
        quizTitle: attempt.quizTitleSnapshot,
        status: attempt.status,
        score: Number(attempt.score),
        correctCount: attempt.correctCount,
        totalQuestions: attempt.totalQuestions,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        questions: [],
        answers: answers.map((ans) => ({
          id: ans.id,
          questionId: ans.questionId,
          questionText: ans.questionTextSnapshot,
          questionType: ans.questionTypeSnapshot,
          selectedOptionId: ans.selectedOptionId,
          answerText: ans.answerText,
          correctAnswer: ans.correctAnswerSnapshot,
          explanation: ans.explanationSnapshot,
          vocabularyId: ans.vocabularyIdSnapshot,
          vocabularyTerm: ans.vocabularyTermSnapshot,
          isCorrect: Boolean(ans.isCorrect),
          answeredAt: ans.answeredAt,
        })),
      };
    }

    const [questionsWithOptions, draftAnswers] = await Promise.all([
      this.loadQuestionsWithOptions(attempt.quizId),
      this.answerRepository.find({ where: { attemptId: attempt.id } }),
    ]);

    const savedMap = new Map<number, QuizAnswer>();
    for (const ans of draftAnswers) {
      if (ans.questionId !== null) {
        savedMap.set(ans.questionId, ans);
      }
    }

    return {
      id: attempt.id,
      quizId: attempt.quizId,
      quizTitle: attempt.quizTitleSnapshot,
      status: attempt.status,
      score: Number(attempt.score),
      correctCount: attempt.correctCount,
      totalQuestions: attempt.totalQuestions,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      questions: questionsWithOptions.map(({ question, options }) => {
        const saved = savedMap.get(question.id);
        return {
          id: question.id,
          questionText: question.questionText,
          questionType: question.questionType,
          orderIndex: question.orderIndex,
          options:
            question.questionType === QuestionType.FILL_BLANK
              ? []
              : options.map((opt) => ({
                  id: opt.id,
                  optionText: opt.optionText,
                  orderIndex: opt.orderIndex,
                })),
          savedSelectedOptionId: saved?.selectedOptionId ?? null,
          savedAnswerText: saved?.answerText ?? null,
        };
      }),
      answers: [],
    };
  }

  async listQuizAttempts(
    userId: number,
    quizId: number,
    query: PaginationQueryDto,
  ): Promise<{ items: AttemptSummaryView[]; meta: PaginationMeta }> {
    await this.findOwnedQuiz(userId, quizId);
    return this.listAllAttempts(userId, {
      ...query,
      quizId,
    });
  }

  async listAllAttempts(
    userId: number,
    query: AttemptQueryDto,
  ): Promise<{ items: AttemptSummaryView[]; meta: PaginationMeta }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    if (query.quizId) {
      await this.findOwnedQuiz(userId, query.quizId);
    }

    const qb = this.attemptRepository
      .createQueryBuilder('attempt')
      .where('attempt.userId = :userId', { userId });

    if (query.quizId) {
      qb.andWhere('attempt.quizId = :quizId', { quizId: query.quizId });
    }
    if (query.status) {
      qb.andWhere('attempt.status = :status', { status: query.status });
    }

    qb.orderBy('attempt.startedAt', 'DESC')
      .addOrderBy('attempt.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [attempts, total] = await qb.getManyAndCount();
    return {
      items: attempts.map((a) => ({
        id: a.id,
        quizId: a.quizId,
        quizTitle: a.quizTitleSnapshot,
        status: a.status,
        score: Number(a.score),
        correctCount: a.correctCount,
        totalQuestions: a.totalQuestions,
        startedAt: a.startedAt,
        completedAt: a.completedAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  private async validateQuestionsInput(
    userId: number,
    questions: CreateQuizQuestionDto[],
    status: QuizStatus,
  ): Promise<Map<number, string>> {
    if (status === QuizStatus.PUBLISHED && questions.length === 0) {
      throw new BadRequestException(
        'A published quiz must have at least 1 question',
      );
    }

    const vocabIds = Array.from(
      new Set(
        questions
          .map((q) => q.vocabularyId)
          .filter((id): id is number => id != null),
      ),
    );
    const ownedVocabs = await this.vocabularyService.findOwnedItemsByIds(
      userId,
      vocabIds,
    );
    const vocabTermsMap = new Map<number, string>(
      ownedVocabs.map((v) => [v.id, v.term]),
    );

    questions.forEach((q, idx) => {
      const label = `Question #${idx + 1}`;
      if (!q.questionText.trim()) {
        throw new BadRequestException(
          `${label}: question text cannot be empty`,
        );
      }

      if (!q.options || q.options.length === 0) {
        throw new BadRequestException(
          `${label}: at least 1 option/answer is required`,
        );
      }

      for (const opt of q.options) {
        if (!opt.optionText.trim()) {
          throw new BadRequestException(
            `${label}: option text cannot be empty`,
          );
        }
      }

      if (q.questionType === QuestionType.FILL_BLANK) {
        if (q.options.length > 5) {
          throw new BadRequestException(
            `${label}: fill-in-the-blank supports up to 5 accepted answers`,
          );
        }
        if (q.options.some((opt) => !opt.isCorrect)) {
          throw new BadRequestException(
            `${label}: fill-in-the-blank answers must be marked as accepted correct answers`,
          );
        }
      } else {
        if (q.options.length < 2 || q.options.length > 6) {
          throw new BadRequestException(
            `${label}: multiple-choice and word-meaning questions require 2 to 6 options`,
          );
        }
        const correctCount = q.options.filter((opt) => opt.isCorrect).length;
        if (correctCount !== 1) {
          throw new BadRequestException(
            `${label}: select exactly 1 correct option`,
          );
        }
      }
    });

    return vocabTermsMap;
  }

  private async insertQuestionsAndOptions(
    manager: EntityManager,
    quizId: number,
    questions: CreateQuizQuestionDto[],
    vocabTermsMap: Map<number, string>,
  ): Promise<void> {
    if (questions.length === 0) {
      return;
    }

    const questionRepo = manager.getRepository(QuizQuestion);
    const optionRepo = manager.getRepository(QuestionOption);

    for (let i = 0; i < questions.length; i += 1) {
      const input = questions[i];
      const vocabularyId = input.vocabularyId ?? null;
      const vocabularyTerm =
        this.normalizeOptional(input.vocabularyTerm) ??
        (vocabularyId ? (vocabTermsMap.get(vocabularyId) ?? null) : null);

      const savedQuestion = await questionRepo.save(
        questionRepo.create({
          quizId,
          vocabularyId,
          vocabularyTerm,
          questionText: input.questionText.trim(),
          questionType: input.questionType,
          explanation: this.normalizeOptional(input.explanation),
          orderIndex: i,
        }),
      );

      await optionRepo.save(
        input.options.map((opt, optIndex) =>
          optionRepo.create({
            questionId: savedQuestion.id,
            optionText: opt.optionText.trim(),
            isCorrect: opt.isCorrect,
            orderIndex: optIndex,
          }),
        ),
      );
    }
  }

  private async loadQuestionsWithOptions(
    quizId: number,
    manager?: EntityManager,
  ): Promise<Array<{ question: QuizQuestion; options: QuestionOption[] }>> {
    const qRepo = manager
      ? manager.getRepository(QuizQuestion)
      : this.questionRepository;
    const oRepo = manager
      ? manager.getRepository(QuestionOption)
      : this.optionRepository;

    const questions = await qRepo.find({
      where: { quizId },
      order: { orderIndex: 'ASC', id: 'ASC' },
    });

    if (questions.length === 0) {
      return [];
    }

    const options = await oRepo.find({
      where: { questionId: In(questions.map((q) => q.id)) },
      order: { orderIndex: 'ASC', id: 'ASC' },
    });

    const optionsByQuestion = new Map<number, QuestionOption[]>();
    for (const opt of options) {
      const list = optionsByQuestion.get(opt.questionId) ?? [];
      list.push(opt);
      optionsByQuestion.set(opt.questionId, list);
    }

    return questions.map((question) => ({
      question,
      options: optionsByQuestion.get(question.id) ?? [],
    }));
  }

  private async findOwnedQuiz(userId: number, id: number): Promise<Quiz> {
    const quiz = await this.quizRepository.findOneBy({ id });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }
    assertResourceOwnership(quiz.userId, userId, 'Quiz');
    return quiz;
  }

  private async findOwnedAttempt(
    userId: number,
    id: number,
  ): Promise<QuizAttempt> {
    const attempt = await this.attemptRepository.findOneBy({ id });
    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found');
    }
    assertResourceOwnership(attempt.userId, userId, 'Quiz attempt');
    return attempt;
  }

  private async loadTopicNamesMap(
    topicIds: number[],
  ): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    const unique = Array.from(new Set(topicIds));
    if (unique.length === 0) {
      return map;
    }

    const topics = await this.topicRepository.findBy({ id: In(unique) });
    for (const topic of topics) {
      map.set(topic.id, topic.name);
    }
    return map;
  }

  private async loadQuestionCountsMap(
    quizIds: number[],
  ): Promise<Map<number, number>> {
    const map = new Map<number, number>();
    if (quizIds.length === 0) {
      return map;
    }

    const rows = await this.questionRepository
      .createQueryBuilder('qq')
      .select('qq.quizId', 'quizId')
      .addSelect('COUNT(qq.id)', 'cnt')
      .where('qq.quizId IN (:...quizIds)', { quizIds })
      .groupBy('qq.quizId')
      .getRawMany<{ quizId: number | string; cnt: string }>();

    for (const row of rows) {
      map.set(Number(row.quizId), Number(row.cnt));
    }
    return map;
  }

  private async loadAttemptStatsMap(
    userId: number,
    quizIds: number[],
  ): Promise<
    Map<
      number,
      {
        attemptCount: number;
        inProgressAttemptId: number | null;
        lastScore: number | null;
      }
    >
  > {
    const map = new Map<
      number,
      {
        attemptCount: number;
        inProgressAttemptId: number | null;
        lastScore: number | null;
      }
    >();
    if (quizIds.length === 0) {
      return map;
    }

    const attempts = await this.attemptRepository.find({
      where: { userId, quizId: In(quizIds) },
      order: { startedAt: 'DESC', id: 'DESC' },
    });

    for (const attempt of attempts) {
      const current = map.get(attempt.quizId) ?? {
        attemptCount: 0,
        inProgressAttemptId: null,
        lastScore: null,
      };
      current.attemptCount += 1;
      if (
        attempt.status === QuizAttemptStatus.IN_PROGRESS &&
        current.inProgressAttemptId === null
      ) {
        current.inProgressAttemptId = attempt.id;
      }
      if (
        attempt.status === QuizAttemptStatus.COMPLETED &&
        current.lastScore === null
      ) {
        current.lastScore = Number(attempt.score);
      }
      map.set(attempt.quizId, current);
    }

    return map;
  }

  private buildFillBlankPrompt(item: VocabularyItem): string {
    const example = item.example?.trim();
    const term = item.term.trim();
    if (example) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(example)) {
        return `Complete the sentence: "${example.replace(regex, '_____')}" (${item.definition.trim()})`;
      }
      const fallbackIdx = example.toLowerCase().indexOf(term.toLowerCase());
      if (fallbackIdx !== -1) {
        const masked =
          example.slice(0, fallbackIdx) +
          '_____' +
          example.slice(fallbackIdx + term.length);
        return `Complete the sentence: "${masked}" (${item.definition.trim()})`;
      }
    }

    return `Type the English word or phrase that means: "${item.definition.trim()}"`;
  }

  private shuffleArray<T>(list: T[]): T[] {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  private normalizeOptional(value: string | null | undefined): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
}
