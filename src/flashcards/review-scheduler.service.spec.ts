import { LEARNING_CONSTANTS } from '../common/constants/learning.constants.js';
import {
  ReviewRating,
  VocabularyProgressStatus,
} from './entities/flashcard.enums.js';
import { ReviewSchedulerService } from './review-scheduler.service.js';

describe('ReviewSchedulerService', () => {
  let service: ReviewSchedulerService;
  const now = new Date('2026-11-16T08:00:00.000Z');

  beforeEach(() => {
    service = new ReviewSchedulerService();
  });

  it('resets repetitions and schedules short retry on AGAIN rating', () => {
    const result = service.schedule(
      { repetitions: 3, intervalDays: 12, easeFactor: 2.5 },
      ReviewRating.AGAIN,
      now,
    );

    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(0);
    expect(result.easeFactor).toBe(2.3);
    expect(result.status).toBe(VocabularyProgressStatus.LEARNING);
    expect(result.nextReviewAt.getTime()).toBe(
      now.getTime() + LEARNING_CONSTANTS.SM2_AGAIN_RETRY_MINUTES * 60_000,
    );
  });

  it('progresses intervals cleanly across GOOD ratings until reaching MASTERED', () => {
    const r1 = service.schedule(null, ReviewRating.GOOD, now);
    expect(r1.repetitions).toBe(1);
    expect(r1.intervalDays).toBe(1);
    expect(r1.status).toBe(VocabularyProgressStatus.LEARNING);

    const r2 = service.schedule(r1, ReviewRating.GOOD, now);
    expect(r2.repetitions).toBe(2);
    expect(r2.intervalDays).toBe(3);
    expect(r2.status).toBe(VocabularyProgressStatus.LEARNING);

    const r3 = service.schedule(r2, ReviewRating.GOOD, now);
    expect(r3.repetitions).toBe(3);
    expect(r3.intervalDays).toBe(8);
    expect(r3.status).toBe(VocabularyProgressStatus.LEARNING);

    const r4 = service.schedule(r3, ReviewRating.GOOD, now);
    expect(r4.repetitions).toBe(4);
    expect(r4.intervalDays).toBe(20);
    expect(r4.status).toBe(VocabularyProgressStatus.MASTERED);
  });

  it('clamps easeFactor between MIN and MAX bounds on HARD and EASY ratings', () => {
    const low = service.schedule(
      { repetitions: 1, intervalDays: 2, easeFactor: 1.3 },
      ReviewRating.HARD,
      now,
    );
    expect(low.easeFactor).toBe(LEARNING_CONSTANTS.SM2_MIN_EASE_FACTOR);

    const high = service.schedule(
      { repetitions: 2, intervalDays: 10, easeFactor: 3.5 },
      ReviewRating.EASY,
      now,
    );
    expect(high.easeFactor).toBe(LEARNING_CONSTANTS.SM2_MAX_EASE_FACTOR);
    expect(high.status).toBe(VocabularyProgressStatus.MASTERED);
  });

  it('evaluates centralized Streak completion threshold accurately', () => {
    expect(service.getStreakMinimumThreshold(12)).toBe(5);
    expect(service.getStreakMinimumThreshold(3)).toBe(3);

    expect(service.isSessionStreakEligible(0, 5)).toBe(false);
    expect(service.isSessionStreakEligible(4, 10)).toBe(false);
    expect(service.isSessionStreakEligible(5, 10)).toBe(true);
    expect(service.isSessionStreakEligible(2, 3)).toBe(false);
    expect(service.isSessionStreakEligible(3, 3)).toBe(true);
  });
});
