import { vi } from 'vitest';
import {
  ReviewRating,
  VocabularyProgressStatus,
} from '../flashcards/entities/flashcard.enums.js';
import { ProgressService } from './progress.service.js';

describe('ProgressService', () => {
  const createDueQb = (dueCount: number) => ({
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getCount: vi.fn().mockResolvedValue(dueCount),
  });

  const createWrongAnswersQb = (
    rows: Array<{ vocabularyId: number; wrongCount: number }>,
  ) => ({
    innerJoin: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue(rows),
  });

  it('aggregates real vocabulary, quiz, streak, and weak vocabulary metrics', async () => {
    const vocabularyRepo = {
      count: vi.fn().mockResolvedValue(10),
      find: vi.fn().mockResolvedValue([
        {
          id: 42,
          term: 'resilient',
          pronunciation: '/rɪˈzɪl.jənt/',
          partOfSpeech: 'adjective',
          definition: 'able to recover quickly',
        },
      ]),
      createQueryBuilder: vi.fn().mockReturnValue(createDueQb(6)),
    };

    const progressRepo = {
      count: vi
        .fn()
        .mockResolvedValueOnce(3) // learning
        .mockResolvedValueOnce(2) // mastered
        .mockResolvedValueOnce(1), // hard
      find: vi
        .fn()
        .mockResolvedValueOnce([
          {
            vocabularyId: 42,
            lastRating: ReviewRating.AGAIN,
            status: VocabularyProgressStatus.LEARNING,
          },
        ])
        .mockResolvedValueOnce([
          {
            vocabularyId: 42,
            lastRating: ReviewRating.AGAIN,
            status: VocabularyProgressStatus.LEARNING,
          },
        ]),
    };

    const topicRepo = { count: vi.fn().mockResolvedValue(2) };

    const attemptRepo = {
      count: vi.fn().mockResolvedValue(3),
      find: vi.fn().mockResolvedValue([
        {
          id: 9,
          quizId: 4,
          quizTitleSnapshot: 'Daily Quiz B',
          score: '80.00',
          correctCount: 4,
          totalQuestions: 5,
          completedAt: new Date('2026-03-10T10:00:00Z'),
        },
        {
          id: 8,
          quizId: 3,
          quizTitleSnapshot: 'Daily Quiz A',
          score: '100.00',
          correctCount: 5,
          totalQuestions: 5,
          completedAt: new Date('2026-03-09T10:00:00Z'),
        },
      ]),
    };

    const answerRepo = {
      createQueryBuilder: vi
        .fn()
        .mockReturnValue(
          createWrongAnswersQb([{ vocabularyId: 42, wrongCount: 3 }]),
        ),
    };

    const sessionRepo = {
      count: vi
        .fn()
        .mockResolvedValueOnce(4) // completedSessions
        .mockResolvedValueOnce(2), // streakEligibleSessions
    };

    const dailyRepo = {
      find: vi.fn().mockResolvedValue([
        {
          activityDate: '2026-03-10',
          activityCount: 2,
          quizCompletions: 1,
          flashcardCompletions: 1,
        },
      ]),
    };

    const streaksService = {
      getMyStreak: vi.fn().mockResolvedValue({
        currentStreak: 2,
        longestStreak: 5,
        status: 'active_today',
        isActiveToday: true,
        isAtRiskToday: false,
        lastActivityDate: '2026-03-10',
        currentStreakStartedAt: '2026-03-09',
        todayDate: '2026-03-10',
        timezone: 'UTC',
      }),
    };

    const service = new ProgressService(
      vocabularyRepo as never,
      progressRepo as never,
      topicRepo as never,
      attemptRepo as never,
      answerRepo as never,
      sessionRepo as never,
      dailyRepo as never,
      streaksService as never,
    );

    const overview = await service.getOverview(1);

    expect(overview.vocabulary).toEqual({
      total: 10,
      newCount: 5,
      learningCount: 3,
      masteredCount: 2,
      dueFlashcardsCount: 6,
      hardFlashcardsCount: 1,
      topicCount: 2,
    });
    expect(overview.quizzes).toEqual({
      totalAttempts: 3,
      completedAttempts: 2,
      averageScore: 90,
      totalQuestionsAnswered: 10,
      correctAnswers: 9,
      accuracyRate: 90,
    });
    expect(overview.flashcards).toEqual({
      completedSessions: 4,
      streakEligibleSessions: 2,
    });
    expect(overview.recentActivity14d).toHaveLength(14);
    expect(overview.recentActivity14d[13]).toEqual({
      date: '2026-03-10',
      activityCount: 2,
      quizCompletions: 1,
      flashcardCompletions: 1,
    });
    expect(overview.weakVocabulary).toHaveLength(1);
    expect(overview.weakVocabulary[0].wrongCount).toBe(3);
    expect(overview.recentQuizAttempts).toHaveLength(2);
  });
});
