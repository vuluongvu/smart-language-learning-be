import {
  diffCalendarDays,
  normalizeDateOnly,
} from '../common/utils/timezone.util.js';

export interface StreakStateSnapshot {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  currentStreakStartedAt: string | null;
  streakAchievedAt: Date | null;
}

export interface StreakUpdateResult extends StreakStateSnapshot {
  changed: boolean;
  incremented: boolean;
  reset: boolean;
}

export type StreakTodayStatus = 'active_today' | 'at_risk' | 'inactive';

export class StreakCalculatorService {
  evaluateStreakUpdate(
    state: StreakStateSnapshot,
    activityDateYmd: string,
    occurredAt: Date,
  ): StreakUpdateResult {
    const lastYmd = normalizeDateOnly(state.lastActivityDate);

    if (!lastYmd) {
      return {
        currentStreak: 1,
        longestStreak: Math.max(state.longestStreak, 1),
        lastActivityDate: activityDateYmd,
        currentStreakStartedAt: activityDateYmd,
        streakAchievedAt: occurredAt,
        changed: true,
        incremented: true,
        reset: false,
      };
    }

    const gapDays = diffCalendarDays(lastYmd, activityDateYmd);

    if (gapDays === 0) {
      const preservedCurrent = Math.max(1, state.currentStreak);
      return {
        currentStreak: preservedCurrent,
        longestStreak: Math.max(state.longestStreak, preservedCurrent),
        lastActivityDate: lastYmd,
        currentStreakStartedAt: state.currentStreakStartedAt ?? lastYmd,
        streakAchievedAt: state.streakAchievedAt ?? occurredAt,
        changed: state.currentStreak === 0,
        incremented: false,
        reset: false,
      };
    }

    if (gapDays === 1) {
      const nextCurrent = state.currentStreak + 1;
      return {
        currentStreak: nextCurrent,
        longestStreak: Math.max(state.longestStreak, nextCurrent),
        lastActivityDate: activityDateYmd,
        currentStreakStartedAt: state.currentStreakStartedAt ?? lastYmd,
        streakAchievedAt: occurredAt,
        changed: true,
        incremented: true,
        reset: false,
      };
    }

    if (gapDays > 1) {
      return {
        currentStreak: 1,
        longestStreak: Math.max(state.longestStreak, 1),
        lastActivityDate: activityDateYmd,
        currentStreakStartedAt: activityDateYmd,
        streakAchievedAt: occurredAt,
        changed: true,
        incremented: true,
        reset: state.currentStreak > 0,
      };
    }

    // Late historical event earlier than lastActivityDate: preserve active state.
    return {
      currentStreak: state.currentStreak,
      longestStreak: state.longestStreak,
      lastActivityDate: lastYmd,
      currentStreakStartedAt: state.currentStreakStartedAt,
      streakAchievedAt: state.streakAchievedAt,
      changed: false,
      incremented: false,
      reset: false,
    };
  }

  recomputeFromActivityDates(
    rawDates: Array<string | Date>,
    existingLongestStreak: number,
    fallbackAchievedAt: Date,
  ): StreakStateSnapshot {
    const uniqueSorted = Array.from(
      new Set(
        rawDates
          .map((d) => normalizeDateOnly(d))
          .filter((d): d is string => Boolean(d)),
      ),
    ).sort();

    if (uniqueSorted.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: existingLongestStreak,
        lastActivityDate: null,
        currentStreakStartedAt: null,
        streakAchievedAt: null,
      };
    }

    let longest = Math.max(existingLongestStreak, 1);
    let runLength = 1;
    let runStart = uniqueSorted[0];

    for (let i = 1; i < uniqueSorted.length; i += 1) {
      const prev = uniqueSorted[i - 1];
      const curr = uniqueSorted[i];
      if (diffCalendarDays(prev, curr) === 1) {
        runLength += 1;
      } else {
        runLength = 1;
        runStart = curr;
      }
      if (runLength > longest) {
        longest = runLength;
      }
    }

    return {
      currentStreak: runLength,
      longestStreak: longest,
      lastActivityDate: uniqueSorted[uniqueSorted.length - 1],
      currentStreakStartedAt: runStart,
      streakAchievedAt: fallbackAchievedAt,
    };
  }

  computeEffectiveCurrentStreak(
    storedCurrentStreak: number,
    lastActivityDate: string | Date | null,
    todayYmd: string,
  ): number {
    const lastYmd = normalizeDateOnly(lastActivityDate);
    if (!lastYmd || storedCurrentStreak <= 0) {
      return 0;
    }

    const daysSinceLast = diffCalendarDays(lastYmd, todayYmd);
    return daysSinceLast <= 1 ? storedCurrentStreak : 0;
  }

  resolveTodayStatus(
    effectiveCurrentStreak: number,
    lastActivityDate: string | Date | null,
    todayYmd: string,
  ): StreakTodayStatus {
    const lastYmd = normalizeDateOnly(lastActivityDate);
    if (effectiveCurrentStreak <= 0 || !lastYmd) {
      return 'inactive';
    }
    const daysSinceLast = diffCalendarDays(lastYmd, todayYmd);
    if (daysSinceLast <= 0) {
      return 'active_today';
    }
    return daysSinceLast === 1 ? 'at_risk' : 'inactive';
  }
}
