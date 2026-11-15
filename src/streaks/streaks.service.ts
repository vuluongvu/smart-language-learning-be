import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, type EntityManager, Repository } from 'typeorm';
import {
  diffCalendarDays,
  formatDateInTimezone,
  getDaysInMonth,
  getWeekdaySundayFirst,
  normalizeDateOnly,
  resolveSafeTimezone,
} from '../common/utils/timezone.util.js';
import { User } from '../users/entities/user.entity.js';
import {
  ActivitySourceType,
  LearningActivityEvent,
} from './entities/learning-activity-event.entity.js';
import { UserDailyActivity } from './entities/user-daily-activity.entity.js';
import { UserStreak } from './entities/user-streak.entity.js';
import {
  StreakCalculatorService,
  type StreakStateSnapshot,
  type StreakTodayStatus,
} from './streak-calculator.service.js';

export interface RecordQualifiedActivityParams {
  userId: number;
  sourceType: ActivitySourceType;
  sourceId: number;
  occurredAt?: Date;
}

export interface RecordQualifiedActivityResult {
  recorded: boolean;
  duplicate: boolean;
  activityDate: string;
  currentStreak: number;
  longestStreak: number;
}

export interface StreakSummaryDto {
  currentStreak: number;
  longestStreak: number;
  status: StreakTodayStatus;
  isActiveToday: boolean;
  isAtRiskToday: boolean;
  lastActivityDate: string | null;
  currentStreakStartedAt: string | null;
  todayDate: string;
  timezone: string;
}

export type StreakCalendarDayStatus =
  'active' | 'missed' | 'inactive_today' | 'future' | 'before_registration';

export interface StreakCalendarDayDto {
  date: string;
  dayOfMonth: number;
  weekday: number;
  status: StreakCalendarDayStatus;
  activityCount: number;
  quizCompletions: number;
  flashcardCompletions: number;
}

export interface StreakCalendarResponseDto {
  month: string;
  year: number;
  monthNumber: number;
  firstDayWeekday: number;
  timezone: string;
  todayDate: string;
  registeredDate: string;
  totalActiveDays: number;
  totalMissedDays: number;
  days: StreakCalendarDayDto[];
}

@Injectable()
export class StreaksService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserStreak)
    private readonly userStreakRepository: Repository<UserStreak>,
    @InjectRepository(UserDailyActivity)
    private readonly dailyActivityRepository: Repository<UserDailyActivity>,
    private readonly calculator: StreakCalculatorService,
  ) {}

  async recordQualifiedActivity(
    manager: EntityManager,
    params: RecordQualifiedActivityParams,
  ): Promise<RecordQualifiedActivityResult> {
    // Locking the parent user row serializes concurrent qualifying commits for this learner
    // with a single PK record lock, preventing InnoDB gap-lock deadlocks.
    const user = await manager.getRepository(User).findOne({
      where: { id: params.userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const occurredAt = params.occurredAt ?? new Date();
    const timezone = resolveSafeTimezone(user.timezone);
    const activityDate = formatDateInTimezone(occurredAt, timezone);
    const eventKey = `${params.sourceType}:${params.sourceId}`;

    const eventRepo = manager.getRepository(LearningActivityEvent);
    const streakRepo = manager.getRepository(UserStreak);
    const dailyRepo = manager.getRepository(UserDailyActivity);

    // Use INSERT IGNORE so idempotency checks the current committed index rather than
    // a stale REPEATABLE READ transaction snapshot.
    const insertEventResult = await eventRepo
      .createQueryBuilder()
      .insert()
      .into(LearningActivityEvent)
      .values({
        userId: params.userId,
        eventKey,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        activityDate,
      })
      .orIgnore()
      .updateEntity(false)
      .execute();

    const rawEventResult = insertEventResult.raw as
      { affectedRows?: number } | undefined;
    if (Number(rawEventResult?.affectedRows ?? 1) === 0) {
      const existingEvent = await eventRepo.findOne({
        where: { eventKey },
        lock: { mode: 'pessimistic_read' },
      });
      const currentStreakRecord = await streakRepo.findOne({
        where: { userId: params.userId },
        lock: { mode: 'pessimistic_read' },
      });
      return {
        recorded: false,
        duplicate: true,
        activityDate:
          normalizeDateOnly(existingEvent?.activityDate) ?? activityDate,
        currentStreak: currentStreakRecord?.currentStreak ?? 0,
        longestStreak: currentStreakRecord?.longestStreak ?? 0,
      };
    }

    const isQuiz = params.sourceType === ActivitySourceType.QUIZ_ATTEMPT;
    const isFlashcard =
      params.sourceType === ActivitySourceType.FLASHCARD_SESSION;

    // Atomic upsert always increments the latest committed counters in InnoDB.
    await manager.query(
      `INSERT INTO user_daily_activities
         (user_id, activity_date, activity_count, quiz_completions, flashcard_completions)
       VALUES (?, ?, 1, ?, ?)
       ON DUPLICATE KEY UPDATE
         activity_count = activity_count + 1,
         quiz_completions = quiz_completions + VALUES(quiz_completions),
         flashcard_completions = flashcard_completions + VALUES(flashcard_completions)`,
      [params.userId, activityDate, isQuiz ? 1 : 0, isFlashcard ? 1 : 0],
    );

    // Ensure the user_streaks row exists before taking a FOR UPDATE current read.
    await streakRepo
      .createQueryBuilder()
      .insert()
      .into(UserStreak)
      .values({
        userId: params.userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        currentStreakStartedAt: null,
        streakAchievedAt: null,
      })
      .orIgnore()
      .updateEntity(false)
      .execute();

    const streak = await streakRepo.findOne({
      where: { userId: params.userId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!streak) {
      throw new NotFoundException('Streak row could not be loaded');
    }

    const currentSnapshot: StreakStateSnapshot = {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      lastActivityDate: normalizeDateOnly(streak.lastActivityDate),
      currentStreakStartedAt: normalizeDateOnly(streak.currentStreakStartedAt),
      streakAchievedAt: streak.streakAchievedAt,
    };

    const isHistorical =
      currentSnapshot.lastActivityDate !== null &&
      diffCalendarDays(currentSnapshot.lastActivityDate, activityDate) < 0;

    let nextState: StreakStateSnapshot;
    if (isHistorical) {
      const allDaily = await dailyRepo.find({
        where: { userId: params.userId },
        select: { activityDate: true },
        order: { activityDate: 'ASC' },
        lock: { mode: 'pessimistic_read' },
      });
      nextState = this.calculator.recomputeFromActivityDates(
        allDaily.map((d) => d.activityDate),
        currentSnapshot.longestStreak,
        currentSnapshot.streakAchievedAt ?? occurredAt,
      );
    } else {
      nextState = this.calculator.evaluateStreakUpdate(
        currentSnapshot,
        activityDate,
        occurredAt,
      );
    }

    streak.currentStreak = nextState.currentStreak;
    streak.longestStreak = nextState.longestStreak;
    streak.lastActivityDate = nextState.lastActivityDate;
    streak.currentStreakStartedAt = nextState.currentStreakStartedAt;
    streak.streakAchievedAt = nextState.streakAchievedAt;

    await streakRepo.save(streak);

    return {
      recorded: true,
      duplicate: false,
      activityDate,
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
    };
  }

  async getMyStreak(userId: number): Promise<StreakSummaryDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, timezone: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const streak = await this.userStreakRepository.findOne({
      where: { userId },
    });

    return this.buildSummaryFromRow(user.timezone, streak);
  }

  buildSummaryFromRow(
    userTimezone: string | null | undefined,
    streak: UserStreak | null,
    now: Date = new Date(),
  ): StreakSummaryDto {
    const timezone = resolveSafeTimezone(userTimezone);
    const todayDate = formatDateInTimezone(now, timezone);
    const storedCurrent = streak?.currentStreak ?? 0;
    const lastActivityDate = normalizeDateOnly(
      streak?.lastActivityDate ?? null,
    );
    const effectiveCurrent = this.calculator.computeEffectiveCurrentStreak(
      storedCurrent,
      lastActivityDate,
      todayDate,
    );
    const status = this.calculator.resolveTodayStatus(
      effectiveCurrent,
      lastActivityDate,
      todayDate,
    );
    const longestStreak = Math.max(
      streak?.longestStreak ?? 0,
      effectiveCurrent,
    );

    return {
      currentStreak: effectiveCurrent,
      longestStreak,
      status,
      isActiveToday: status === 'active_today',
      isAtRiskToday: status === 'at_risk',
      lastActivityDate,
      currentStreakStartedAt:
        effectiveCurrent > 0
          ? normalizeDateOnly(streak?.currentStreakStartedAt ?? null)
          : null,
      todayDate,
      timezone,
    };
  }

  async getCalendar(
    userId: number,
    month?: string,
  ): Promise<StreakCalendarResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, timezone: true, createdAt: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date();
    const timezone = resolveSafeTimezone(user.timezone);
    const todayDate = formatDateInTimezone(now, timezone);
    const registeredDate = formatDateInTimezone(user.createdAt, timezone);

    const targetMonth = month ?? todayDate.slice(0, 7);
    const [yearStr, monthStr] = targetMonth.split('-');
    const year = Number(yearStr);
    const monthNumber = Number(monthStr);
    const daysCount = getDaysInMonth(year, monthNumber);

    const startDate = `${targetMonth}-01`;
    const endDate = `${targetMonth}-${String(daysCount).padStart(2, '0')}`;

    const rows = await this.dailyActivityRepository.find({
      where: {
        userId,
        activityDate: Between(startDate, endDate),
      },
      order: { activityDate: 'ASC' },
    });

    const activityByDate = new Map<string, UserDailyActivity>();
    for (const row of rows) {
      const normalized = normalizeDateOnly(row.activityDate);
      if (normalized) {
        activityByDate.set(normalized, row);
      }
    }

    const days: StreakCalendarDayDto[] = [];
    let totalActiveDays = 0;
    let totalMissedDays = 0;

    for (let day = 1; day <= daysCount; day += 1) {
      const date = `${targetMonth}-${String(day).padStart(2, '0')}`;
      const row = activityByDate.get(date);
      const activityCount = row?.activityCount ?? 0;
      const quizCompletions = row?.quizCompletions ?? 0;
      const flashcardCompletions = row?.flashcardCompletions ?? 0;

      let status: StreakCalendarDayStatus;
      if (date > todayDate) {
        status = 'future';
      } else if (activityCount > 0) {
        status = 'active';
        totalActiveDays += 1;
      } else if (date === todayDate) {
        status = 'inactive_today';
      } else if (date < registeredDate) {
        status = 'before_registration';
      } else {
        status = 'missed';
        totalMissedDays += 1;
      }

      days.push({
        date,
        dayOfMonth: day,
        weekday: getWeekdaySundayFirst(date),
        status,
        activityCount,
        quizCompletions,
        flashcardCompletions,
      });
    }

    return {
      month: targetMonth,
      year,
      monthNumber,
      firstDayWeekday: getWeekdaySundayFirst(startDate),
      timezone,
      todayDate,
      registeredDate,
      totalActiveDays,
      totalMissedDays,
      days,
    };
  }
}
