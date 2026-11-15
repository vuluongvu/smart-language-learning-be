import {
  formatDateInTimezone,
  resolveSafeTimezone,
} from '../common/utils/timezone.util.js';
import {
  StreakCalculatorService,
  type StreakStateSnapshot,
} from './streak-calculator.service.js';

describe('StreakCalculatorService', () => {
  const calculator = new StreakCalculatorService();

  const emptyState: StreakStateSnapshot = {
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    currentStreakStartedAt: null,
    streakAchievedAt: null,
  };

  it('starts a streak at 1 on the first qualified activity', () => {
    const occurredAt = new Date('2026-03-10T10:00:00Z');
    const result = calculator.evaluateStreakUpdate(
      emptyState,
      '2026-03-10',
      occurredAt,
    );

    expect(result).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastActivityDate: '2026-03-10',
      currentStreakStartedAt: '2026-03-10',
      streakAchievedAt: occurredAt,
      changed: true,
      incremented: true,
      reset: false,
    });
  });

  it('does not increment currentStreak twice on the same calendar date', () => {
    const firstAt = new Date('2026-03-10T08:00:00Z');
    const secondAt = new Date('2026-03-10T20:00:00Z');
    const afterFirst = calculator.evaluateStreakUpdate(
      emptyState,
      '2026-03-10',
      firstAt,
    );
    const afterSecond = calculator.evaluateStreakUpdate(
      afterFirst,
      '2026-03-10',
      secondAt,
    );

    expect(afterSecond.currentStreak).toBe(1);
    expect(afterSecond.longestStreak).toBe(1);
    expect(afterSecond.streakAchievedAt).toEqual(firstAt);
    expect(afterSecond.incremented).toBe(false);
    expect(afterSecond.reset).toBe(false);
  });

  it('increments currentStreak and longestStreak on consecutive days including leap day', () => {
    const t1 = new Date('2024-02-28T12:00:00Z');
    const t2 = new Date('2024-02-29T12:00:00Z');
    const t3 = new Date('2024-03-01T12:00:00Z');

    const s1 = calculator.evaluateStreakUpdate(emptyState, '2024-02-28', t1);
    const s2 = calculator.evaluateStreakUpdate(s1, '2024-02-29', t2);
    const s3 = calculator.evaluateStreakUpdate(s2, '2024-03-01', t3);

    expect(s3.currentStreak).toBe(3);
    expect(s3.longestStreak).toBe(3);
    expect(s3.currentStreakStartedAt).toBe('2024-02-28');
    expect(s3.lastActivityDate).toBe('2024-03-01');
  });

  it('resets currentStreak to 1 when at least 1 day is missed while preserving longestStreak', () => {
    const s3: StreakStateSnapshot = {
      currentStreak: 5,
      longestStreak: 7,
      lastActivityDate: '2026-03-10',
      currentStreakStartedAt: '2026-03-06',
      streakAchievedAt: new Date('2026-03-10T10:00:00Z'),
    };
    const nextAt = new Date('2026-03-12T09:00:00Z');

    const res = calculator.evaluateStreakUpdate(s3, '2026-03-12', nextAt);

    expect(res.currentStreak).toBe(1);
    expect(res.longestStreak).toBe(7);
    expect(res.currentStreakStartedAt).toBe('2026-03-12');
    expect(res.reset).toBe(true);
  });

  it('computes effective current streak as 0 after missing yesterday without mutating longest', () => {
    expect(
      calculator.computeEffectiveCurrentStreak(4, '2026-03-10', '2026-03-10'),
    ).toBe(4);
    expect(
      calculator.computeEffectiveCurrentStreak(4, '2026-03-10', '2026-03-11'),
    ).toBe(4);
    expect(
      calculator.computeEffectiveCurrentStreak(4, '2026-03-10', '2026-03-12'),
    ).toBe(0);
    expect(calculator.resolveTodayStatus(4, '2026-03-10', '2026-03-10')).toBe(
      'active_today',
    );
    expect(calculator.resolveTodayStatus(4, '2026-03-10', '2026-03-11')).toBe(
      'at_risk',
    );
    expect(calculator.resolveTodayStatus(0, '2026-03-10', '2026-03-12')).toBe(
      'inactive',
    );
  });

  it('handles DST transitions across America/New_York without skipping calendar days', () => {
    // 2026 US DST spring forward: Sunday 2026-03-08 02:00 -> 03:00
    const tz = resolveSafeTimezone('America/New_York');
    const dayBefore = formatDateInTimezone(
      new Date('2026-03-08T04:30:00Z'),
      tz,
    ); // 2026-03-07 23:30 EST
    const dstDay = formatDateInTimezone(new Date('2026-03-08T08:30:00Z'), tz); // 2026-03-08 04:30 EDT

    expect(dayBefore).toBe('2026-03-07');
    expect(dstDay).toBe('2026-03-08');

    const s1 = calculator.evaluateStreakUpdate(
      emptyState,
      dayBefore,
      new Date('2026-03-08T04:30:00Z'),
    );
    const s2 = calculator.evaluateStreakUpdate(
      s1,
      dstDay,
      new Date('2026-03-08T08:30:00Z'),
    );
    expect(s2.currentStreak).toBe(2);
  });

  it('recomputes longest streak when bridging a late historical date', () => {
    const recomputed = calculator.recomputeFromActivityDates(
      ['2026-03-01', '2026-03-03', '2026-03-02', '2026-03-04'],
      2,
      new Date('2026-03-04T10:00:00Z'),
    );

    expect(recomputed.currentStreak).toBe(4);
    expect(recomputed.longestStreak).toBe(4);
    expect(recomputed.currentStreakStartedAt).toBe('2026-03-01');
    expect(recomputed.lastActivityDate).toBe('2026-03-04');
  });
});
