export const LEARNING_CONSTANTS = {
  /** Minimum distinct cards reviewed to count a flashcard session as Streak-eligible (or all cards if target < 5). */
  FLASHCARD_STREAK_MIN_CARDS: 5,
  SM2_DEFAULT_EASE_FACTOR: 2.5,
  SM2_MIN_EASE_FACTOR: 1.3,
  SM2_MAX_EASE_FACTOR: 3.5,
  SM2_MASTERED_MIN_REPETITIONS: 2,
  SM2_MASTERED_MIN_INTERVAL_DAYS: 14,
  SM2_AGAIN_RETRY_MINUTES: 10,
} as const;
