import { Injectable } from '@nestjs/common';
import { LEARNING_CONSTANTS } from '../common/constants/learning.constants.js';
import {
  ReviewRating,
  VocabularyProgressStatus,
} from './entities/flashcard.enums.js';

export interface SchedulerState {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
}

export interface ScheduledResult extends SchedulerState {
  status: VocabularyProgressStatus;
  lastReviewedAt: Date;
  nextReviewAt: Date;
}

@Injectable()
export class ReviewSchedulerService {
  schedule(
    current: Partial<SchedulerState> | null | undefined,
    rating: ReviewRating,
    now: Date = new Date(),
  ): ScheduledResult {
    const prevReps = Math.max(0, current?.repetitions ?? 0);
    const prevInterval = Math.max(0, current?.intervalDays ?? 0);
    const prevEase = this.clampEase(
      current?.easeFactor ?? LEARNING_CONSTANTS.SM2_DEFAULT_EASE_FACTOR,
    );

    if (rating === ReviewRating.AGAIN) {
      return {
        repetitions: 0,
        intervalDays: 0,
        easeFactor: this.clampEase(prevEase - 0.2),
        status: VocabularyProgressStatus.LEARNING,
        lastReviewedAt: now,
        nextReviewAt: this.addMinutes(
          now,
          LEARNING_CONSTANTS.SM2_AGAIN_RETRY_MINUTES,
        ),
      };
    }

    let nextReps = prevReps + 1;
    let nextInterval = 1;
    let nextEase = prevEase;

    if (rating === ReviewRating.HARD) {
      nextInterval =
        prevReps === 0
          ? 1
          : Math.max(1, Math.round(Math.max(1, prevInterval) * 1.2));
      nextEase = this.clampEase(prevEase - 0.15);
    } else if (rating === ReviewRating.GOOD) {
      if (prevReps === 0) {
        nextInterval = 1;
      } else if (prevReps === 1) {
        nextInterval = 3;
      } else {
        nextInterval = Math.max(
          2,
          Math.round(Math.max(1, prevInterval) * prevEase),
        );
      }
      nextEase = this.clampEase(prevEase);
    } else {
      // ReviewRating.EASY
      if (prevReps === 0) {
        nextInterval = 4;
      } else if (prevReps === 1) {
        nextInterval = 6;
      } else {
        nextInterval = Math.max(
          4,
          Math.round(Math.max(1, prevInterval) * prevEase * 1.3),
        );
      }
      nextEase = this.clampEase(prevEase + 0.15);
    }

    const status =
      nextReps >= LEARNING_CONSTANTS.SM2_MASTERED_MIN_REPETITIONS &&
      nextInterval >= LEARNING_CONSTANTS.SM2_MASTERED_MIN_INTERVAL_DAYS
        ? VocabularyProgressStatus.MASTERED
        : VocabularyProgressStatus.LEARNING;

    return {
      repetitions: nextReps,
      intervalDays: nextInterval,
      easeFactor: nextEase,
      status,
      lastReviewedAt: now,
      nextReviewAt: this.addDays(now, nextInterval),
    };
  }

  getStreakMinimumThreshold(targetCount: number): number {
    if (targetCount <= 0) {
      return LEARNING_CONSTANTS.FLASHCARD_STREAK_MIN_CARDS;
    }
    return Math.min(LEARNING_CONSTANTS.FLASHCARD_STREAK_MIN_CARDS, targetCount);
  }

  isSessionStreakEligible(reviewedCount: number, targetCount: number): boolean {
    if (targetCount <= 0 || reviewedCount <= 0) {
      return false;
    }
    return reviewedCount >= this.getStreakMinimumThreshold(targetCount);
  }

  private clampEase(value: number): number {
    const clamped = Math.min(
      LEARNING_CONSTANTS.SM2_MAX_EASE_FACTOR,
      Math.max(LEARNING_CONSTANTS.SM2_MIN_EASE_FACTOR, value),
    );
    return Math.round(clamped * 100) / 100;
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60_000);
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60_000);
  }
}
