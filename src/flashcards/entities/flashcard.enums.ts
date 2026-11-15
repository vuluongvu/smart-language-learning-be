export enum ReviewRating {
  AGAIN = 'again',
  HARD = 'hard',
  GOOD = 'good',
  EASY = 'easy',
}

export enum VocabularyProgressStatus {
  NEW = 'new',
  LEARNING = 'learning',
  MASTERED = 'mastered',
}

export enum FlashcardSessionStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum FlashcardSessionMode {
  DUE_AND_NEW = 'due_and_new',
  DUE_ONLY = 'due_only',
  NEW_ONLY = 'new_only',
  HARD_ONLY = 'hard_only',
  ALL = 'all',
  CUSTOM = 'custom',
}
