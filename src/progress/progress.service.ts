import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import {
  addCalendarDays,
  normalizeDateOnly,
} from '../common/utils/timezone.util.js';
import { FlashcardReviewSession } from '../flashcards/entities/flashcard-review-session.entity.js';
import {
  FlashcardSessionStatus,
  ReviewRating,
  VocabularyProgressStatus,
} from '../flashcards/entities/flashcard.enums.js';
import { VocabularyProgress } from '../flashcards/entities/vocabulary-progress.entity.js';
import { QuizAnswer } from '../quizzes/entities/quiz-answer.entity.js';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity.js';
import { QuizAttemptStatus } from '../quizzes/entities/quiz.enums.js';
import { UserDailyActivity } from '../streaks/entities/user-daily-activity.entity.js';
import {
  StreaksService,
  type StreakSummaryDto,
} from '../streaks/streaks.service.js';
import { Topic } from '../topics/entities/topic.entity.js';
import { VocabularyItem } from '../vocabulary/entities/vocabulary-item.entity.js';
import type { ProgressHistoryQueryDto } from './dto/progress-history-query.dto.js';

export interface ProgressVocabularyMetricsDto {
  total: number;
  newCount: number;
  learningCount: number;
  masteredCount: number;
  dueFlashcardsCount: number;
  hardFlashcardsCount: number;
  topicCount: number;
}

export interface ProgressQuizMetricsDto {
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  totalQuestionsAnswered: number;
  correctAnswers: number;
  accuracyRate: number;
}

export interface ProgressFlashcardMetricsDto {
  completedSessions: number;
  streakEligibleSessions: number;
}

export interface DailyActivityPointDto {
  date: string;
  activityCount: number;
  quizCompletions: number;
  flashcardCompletions: number;
}

export interface RecentQuizAttemptSummaryDto {
  id: number;
  quizId: number;
  quizTitleSnapshot: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: string | null;
}

export interface WeakVocabularyItemDto {
  vocabularyId: number;
  term: string;
  pronunciation: string | null;
  partOfSpeech: string | null;
  definition: string;
  wrongCount: number;
  lastRating: ReviewRating | null;
  progressStatus: VocabularyProgressStatus;
}

export interface ProgressOverviewResponseDto {
  streak: StreakSummaryDto;
  vocabulary: ProgressVocabularyMetricsDto;
  quizzes: ProgressQuizMetricsDto;
  flashcards: ProgressFlashcardMetricsDto;
  recentActivity14d: DailyActivityPointDto[];
  weakVocabulary: WeakVocabularyItemDto[];
  recentQuizAttempts: RecentQuizAttemptSummaryDto[];
}

export interface ProgressHistoryResponseDto {
  days: number;
  timezone: string;
  todayDate: string;
  dailyActivities: DailyActivityPointDto[];
  recentAttempts: RecentQuizAttemptSummaryDto[];
  weakVocabulary: WeakVocabularyItemDto[];
}

interface WrongVocabAggregateRow {
  vocabularyId: string | number;
  wrongCount: string | number;
}

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(VocabularyItem)
    private readonly vocabularyRepository: Repository<VocabularyItem>,
    @InjectRepository(VocabularyProgress)
    private readonly progressRepository: Repository<VocabularyProgress>,
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(QuizAttempt)
    private readonly attemptRepository: Repository<QuizAttempt>,
    @InjectRepository(QuizAnswer)
    private readonly answerRepository: Repository<QuizAnswer>,
    @InjectRepository(FlashcardReviewSession)
    private readonly sessionRepository: Repository<FlashcardReviewSession>,
    @InjectRepository(UserDailyActivity)
    private readonly dailyActivityRepository: Repository<UserDailyActivity>,
    private readonly streaksService: StreaksService,
  ) {}

  async getOverview(userId: number): Promise<ProgressOverviewResponseDto> {
    const streak = await this.streaksService.getMyStreak(userId);
    const now = new Date();

    const [
      totalVocab,
      learningCount,
      masteredCount,
      dueFlashcardsCount,
      hardFlashcardsCount,
      topicCount,
      totalAttempts,
      completedAttempts,
      completedSessions,
      streakEligibleSessions,
      recentActivity14d,
      weakVocabulary,
    ] = await Promise.all([
      this.vocabularyRepository.count({ where: { userId } }),
      this.progressRepository.count({
        where: { userId, status: VocabularyProgressStatus.LEARNING },
      }),
      this.progressRepository.count({
        where: { userId, status: VocabularyProgressStatus.MASTERED },
      }),
      this.countDueFlashcards(userId, now),
      this.progressRepository.count({
        where: {
          userId,
          lastRating: In([ReviewRating.AGAIN, ReviewRating.HARD]),
        },
      }),
      this.topicRepository.count({ where: { userId } }),
      this.attemptRepository.count({ where: { userId } }),
      this.attemptRepository.find({
        where: { userId, status: QuizAttemptStatus.COMPLETED },
        select: {
          id: true,
          quizId: true,
          quizTitleSnapshot: true,
          score: true,
          correctCount: true,
          totalQuestions: true,
          completedAt: true,
        },
        order: { completedAt: 'DESC', id: 'DESC' },
      }),
      this.sessionRepository.count({
        where: { userId, status: FlashcardSessionStatus.COMPLETED },
      }),
      this.sessionRepository.count({
        where: {
          userId,
          status: FlashcardSessionStatus.COMPLETED,
          isStreakEligible: true,
        },
      }),
      this.buildDailyActivitySeries(userId, streak.todayDate, 14),
      this.getWeakVocabulary(userId, 8),
    ]);

    const newCount = Math.max(0, totalVocab - learningCount - masteredCount);

    let totalQuestionsAnswered = 0;
    let correctAnswers = 0;
    let scoreSum = 0;
    for (const attempt of completedAttempts) {
      totalQuestionsAnswered += attempt.totalQuestions;
      correctAnswers += attempt.correctCount;
      scoreSum += Number(attempt.score);
    }

    const averageScore =
      completedAttempts.length > 0
        ? Number((scoreSum / completedAttempts.length).toFixed(2))
        : 0;
    const accuracyRate =
      totalQuestionsAnswered > 0
        ? Number(((correctAnswers / totalQuestionsAnswered) * 100).toFixed(2))
        : 0;

    return {
      streak,
      vocabulary: {
        total: totalVocab,
        newCount,
        learningCount,
        masteredCount,
        dueFlashcardsCount,
        hardFlashcardsCount,
        topicCount,
      },
      quizzes: {
        totalAttempts,
        completedAttempts: completedAttempts.length,
        averageScore,
        totalQuestionsAnswered,
        correctAnswers,
        accuracyRate,
      },
      flashcards: {
        completedSessions,
        streakEligibleSessions,
      },
      recentActivity14d,
      weakVocabulary,
      recentQuizAttempts: completedAttempts.slice(0, 5).map((attempt) => ({
        id: attempt.id,
        quizId: attempt.quizId,
        quizTitleSnapshot: attempt.quizTitleSnapshot,
        score: Number(attempt.score),
        correctCount: attempt.correctCount,
        totalQuestions: attempt.totalQuestions,
        completedAt: attempt.completedAt
          ? attempt.completedAt.toISOString()
          : null,
      })),
    };
  }

  async getHistory(
    userId: number,
    query: ProgressHistoryQueryDto,
  ): Promise<ProgressHistoryResponseDto> {
    const days = query.days ?? 14;
    const streak = await this.streaksService.getMyStreak(userId);

    const [dailyActivities, recentAttemptRows, weakVocabulary] =
      await Promise.all([
        this.buildDailyActivitySeries(userId, streak.todayDate, days),
        this.attemptRepository.find({
          where: { userId, status: QuizAttemptStatus.COMPLETED },
          select: {
            id: true,
            quizId: true,
            quizTitleSnapshot: true,
            score: true,
            correctCount: true,
            totalQuestions: true,
            completedAt: true,
          },
          order: { completedAt: 'DESC', id: 'DESC' },
          take: 15,
        }),
        this.getWeakVocabulary(userId, 20),
      ]);

    return {
      days,
      timezone: streak.timezone,
      todayDate: streak.todayDate,
      dailyActivities,
      recentAttempts: recentAttemptRows.map((attempt) => ({
        id: attempt.id,
        quizId: attempt.quizId,
        quizTitleSnapshot: attempt.quizTitleSnapshot,
        score: Number(attempt.score),
        correctCount: attempt.correctCount,
        totalQuestions: attempt.totalQuestions,
        completedAt: attempt.completedAt
          ? attempt.completedAt.toISOString()
          : null,
      })),
      weakVocabulary,
    };
  }

  private async countDueFlashcards(userId: number, now: Date): Promise<number> {
    return this.vocabularyRepository
      .createQueryBuilder('v')
      .leftJoin(
        VocabularyProgress,
        'vp',
        'vp.vocabulary_id = v.id AND vp.user_id = :userId',
        { userId },
      )
      .where('v.user_id = :userId', { userId })
      .andWhere(
        '(vp.id IS NULL OR vp.next_review_at IS NULL OR vp.next_review_at <= :now)',
        { now },
      )
      .getCount();
  }

  private async buildDailyActivitySeries(
    userId: number,
    todayDate: string,
    days: number,
  ): Promise<DailyActivityPointDto[]> {
    const startDate = addCalendarDays(todayDate, -(days - 1));
    const rows = await this.dailyActivityRepository.find({
      where: {
        userId,
        activityDate: Between(startDate, todayDate),
      },
      order: { activityDate: 'ASC' },
    });

    const map = new Map<string, UserDailyActivity>();
    for (const row of rows) {
      const normalized = normalizeDateOnly(row.activityDate);
      if (normalized) {
        map.set(normalized, row);
      }
    }

    const points: DailyActivityPointDto[] = [];
    for (let i = 0; i < days; i += 1) {
      const date = addCalendarDays(startDate, i);
      const row = map.get(date);
      points.push({
        date,
        activityCount: row?.activityCount ?? 0,
        quizCompletions: row?.quizCompletions ?? 0,
        flashcardCompletions: row?.flashcardCompletions ?? 0,
      });
    }
    return points;
  }

  private async getWeakVocabulary(
    userId: number,
    limit: number,
  ): Promise<WeakVocabularyItemDto[]> {
    const wrongRows = await this.answerRepository
      .createQueryBuilder('ans')
      .innerJoin(QuizAttempt, 'att', 'att.id = ans.attempt_id')
      .select('ans.vocabulary_id_snapshot', 'vocabularyId')
      .addSelect('COUNT(*)', 'wrongCount')
      .where('att.user_id = :userId', { userId })
      .andWhere('att.status = :status', {
        status: QuizAttemptStatus.COMPLETED,
      })
      .andWhere('ans.is_correct = :isCorrect', { isCorrect: false })
      .andWhere('ans.vocabulary_id_snapshot IS NOT NULL')
      .groupBy('ans.vocabulary_id_snapshot')
      .orderBy('wrongCount', 'DESC')
      .limit(limit * 2)
      .getRawMany<WrongVocabAggregateRow>();

    const hardProgressRows = await this.progressRepository.find({
      where: {
        userId,
        lastRating: In([ReviewRating.AGAIN, ReviewRating.HARD]),
      },
      take: limit * 2,
    });

    const wrongCountByVocabId = new Map<number, number>();
    for (const row of wrongRows) {
      const vocabId = Number(row.vocabularyId);
      const count = Number(row.wrongCount);
      if (Number.isInteger(vocabId) && vocabId > 0 && count > 0) {
        wrongCountByVocabId.set(vocabId, count);
      }
    }

    const candidateIds = new Set<number>(wrongCountByVocabId.keys());
    const hardProgressByVocabId = new Map<number, VocabularyProgress>();
    for (const row of hardProgressRows) {
      candidateIds.add(row.vocabularyId);
      hardProgressByVocabId.set(row.vocabularyId, row);
    }

    if (candidateIds.size === 0) {
      return [];
    }

    const ids = Array.from(candidateIds);
    const [items, allProgressRows] = await Promise.all([
      this.vocabularyRepository.find({
        where: { userId, id: In(ids) },
      }),
      this.progressRepository.find({
        where: { userId, vocabularyId: In(ids) },
      }),
    ]);

    const progressMap = new Map<number, VocabularyProgress>();
    for (const p of allProgressRows) {
      progressMap.set(p.vocabularyId, p);
    }

    const weakItems: WeakVocabularyItemDto[] = items.map((item) => {
      const progress =
        progressMap.get(item.id) ?? hardProgressByVocabId.get(item.id);
      return {
        vocabularyId: item.id,
        term: item.term,
        pronunciation: item.pronunciation,
        partOfSpeech: item.partOfSpeech,
        definition: item.definition,
        wrongCount: wrongCountByVocabId.get(item.id) ?? 0,
        lastRating: progress?.lastRating ?? null,
        progressStatus: progress?.status ?? VocabularyProgressStatus.NEW,
      };
    });

    weakItems.sort((a, b) => {
      if (b.wrongCount !== a.wrongCount) {
        return b.wrongCount - a.wrongCount;
      }
      const ratingRank = (r: ReviewRating | null) =>
        r === ReviewRating.AGAIN ? 2 : r === ReviewRating.HARD ? 1 : 0;
      const rDiff = ratingRank(b.lastRating) - ratingRank(a.lastRating);
      if (rDiff !== 0) {
        return rDiff;
      }
      return a.term.localeCompare(b.term);
    });

    return weakItems.slice(0, limit);
  }
}
