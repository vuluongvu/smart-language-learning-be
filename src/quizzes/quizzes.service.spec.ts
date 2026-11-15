import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';
import { LanguagesService } from '../languages/languages.service.js';
import { StreaksService } from '../streaks/streaks.service.js';
import { TopicVocabulary } from '../topics/entities/topic-vocabulary.entity.js';
import { Topic } from '../topics/entities/topic.entity.js';
import { TopicsService } from '../topics/topics.service.js';
import { VocabularyItem } from '../vocabulary/entities/vocabulary-item.entity.js';
import { VocabularyService } from '../vocabulary/vocabulary.service.js';
import { QuestionOption } from './entities/question-option.entity.js';
import { QuizAnswer } from './entities/quiz-answer.entity.js';
import { QuizAttempt } from './entities/quiz-attempt.entity.js';
import { QuizQuestion } from './entities/quiz-question.entity.js';
import { Quiz } from './entities/quiz.entity.js';
import {
  QuestionType,
  QuizAttemptStatus,
  QuizStatus,
} from './entities/quiz.enums.js';
import { QuizScoringService } from './quiz-scoring.service.js';
import { QuizzesService } from './quizzes.service.js';

describe('QuizzesService', () => {
  let service: QuizzesService;
  let quizRepo: Record<string, ReturnType<typeof vi.fn>>;
  let questionRepo: Record<string, ReturnType<typeof vi.fn>>;
  let optionRepo: Record<string, ReturnType<typeof vi.fn>>;
  let attemptRepo: Record<string, ReturnType<typeof vi.fn>>;
  let answerRepo: Record<string, ReturnType<typeof vi.fn>>;
  let topicRepo: Record<string, ReturnType<typeof vi.fn>>;
  let tvRepo: Record<string, ReturnType<typeof vi.fn>>;
  let vocabRepo: Record<string, ReturnType<typeof vi.fn>>;
  let topicsService: Record<string, ReturnType<typeof vi.fn>>;
  let vocabularyService: Record<string, ReturnType<typeof vi.fn>>;
  let languagesService: Record<string, ReturnType<typeof vi.fn>>;
  let dataSource: { transaction: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    quizRepo = {
      findOneBy: vi.fn(),
      save: vi.fn(),
      delete: vi.fn(),
      createQueryBuilder: vi.fn(),
    };
    questionRepo = {
      find: vi.fn(),
      countBy: vi.fn(),
      delete: vi.fn(),
    };
    optionRepo = {
      find: vi.fn(),
    };
    attemptRepo = {
      findOneBy: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn((x) => x),
      save: vi.fn(),
    };
    answerRepo = {
      find: vi.fn(),
      delete: vi.fn(),
      save: vi.fn(),
    };
    topicRepo = { findBy: vi.fn() };
    tvRepo = { find: vi.fn() };
    vocabRepo = { find: vi.fn() };
    topicsService = { findOwnedTopicsByIds: vi.fn().mockResolvedValue([]) };
    vocabularyService = {
      findOwnedItemsByIds: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
    };
    languagesService = {
      findActiveByCode: vi.fn().mockResolvedValue({ id: 1, code: 'en' }),
    };
    dataSource = {
      transaction: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizzesService,
        QuizScoringService,
        { provide: getRepositoryToken(Quiz), useValue: quizRepo },
        { provide: getRepositoryToken(QuizQuestion), useValue: questionRepo },
        { provide: getRepositoryToken(QuestionOption), useValue: optionRepo },
        { provide: getRepositoryToken(QuizAttempt), useValue: attemptRepo },
        { provide: getRepositoryToken(QuizAnswer), useValue: answerRepo },
        { provide: getRepositoryToken(Topic), useValue: topicRepo },
        { provide: getRepositoryToken(TopicVocabulary), useValue: tvRepo },
        { provide: getRepositoryToken(VocabularyItem), useValue: vocabRepo },
        { provide: TopicsService, useValue: topicsService },
        { provide: VocabularyService, useValue: vocabularyService },
        { provide: LanguagesService, useValue: languagesService },
        {
          provide: StreaksService,
          useValue: { recordQualifiedActivity: vi.fn() },
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(QuizzesService);
  });

  it('rejects publishing a quiz with 0 questions', async () => {
    await expect(
      service.create(1, {
        title: 'Empty Quiz',
        status: QuizStatus.PUBLISHED,
        questions: [],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects multiple-choice questions that do not have exactly 1 correct option', async () => {
    await expect(
      service.create(1, {
        title: 'Bad MCQ',
        status: QuizStatus.PUBLISHED,
        questions: [
          {
            questionText: 'Pick one',
            questionType: QuestionType.MULTIPLE_CHOICE,
            options: [
              { optionText: 'A', isCorrect: true },
              { optionText: 'B', isCorrect: true },
            ],
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('forbids accessing or starting an attempt on another user quiz', async () => {
    quizRepo.findOneBy.mockResolvedValue({
      id: 99,
      userId: 2,
      status: QuizStatus.PUBLISHED,
    });

    await expect(service.findOne(1, 99)).rejects.toThrow(ForbiddenException);
    await expect(service.startAttempt(1, 99)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('sanitizes in-progress attempts so answer keys and explanations are not exposed', async () => {
    attemptRepo.findOneBy.mockResolvedValue({
      id: 10,
      userId: 1,
      quizId: 5,
      quizTitleSnapshot: 'Daily Vocab',
      status: QuizAttemptStatus.IN_PROGRESS,
      score: '0.00',
      correctCount: 0,
      totalQuestions: 2,
      startedAt: new Date(),
      completedAt: null,
    });

    questionRepo.find.mockResolvedValue([
      {
        id: 100,
        quizId: 5,
        questionText: 'Meaning of "lucid"?',
        questionType: QuestionType.WORD_MEANING,
        explanation: 'Should stay hidden during attempt',
        orderIndex: 0,
      },
      {
        id: 101,
        quizId: 5,
        questionText: 'Stay _____ under pressure.',
        questionType: QuestionType.FILL_BLANK,
        explanation: 'Hidden explanation',
        orderIndex: 1,
      },
    ]);

    optionRepo.find.mockResolvedValue([
      {
        id: 1001,
        questionId: 100,
        optionText: 'clear and easy to understand',
        isCorrect: true,
        orderIndex: 0,
      },
      {
        id: 1002,
        questionId: 100,
        optionText: 'noisy',
        isCorrect: false,
        orderIndex: 1,
      },
      {
        id: 1003,
        questionId: 101,
        optionText: 'calm',
        isCorrect: true,
        orderIndex: 0,
      },
    ]);
    answerRepo.find.mockResolvedValue([]);

    const view = await service.getAttempt(1, 10);
    expect(view.status).toBe(QuizAttemptStatus.IN_PROGRESS);
    expect(view.questions).toHaveLength(2);
    expect(view.questions[0].options[0]).not.toHaveProperty('isCorrect');
    expect(view.questions[1].options).toEqual([]);
  });

  it('blocks double submission of an already-completed attempt', async () => {
    dataSource.transaction.mockImplementation(
      async (cb: (m: unknown) => Promise<void>) => {
        const manager = {
          getRepository: vi.fn().mockReturnValue({
            findOne: vi.fn().mockResolvedValue({
              id: 22,
              userId: 1,
              quizId: 5,
              status: QuizAttemptStatus.COMPLETED,
            }),
          }),
        };
        return cb(manager);
      },
    );

    await expect(service.submitAttempt(1, 22, { answers: [] })).rejects.toThrow(
      ConflictException,
    );
  });
});
