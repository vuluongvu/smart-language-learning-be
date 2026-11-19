export const SUPPORTED_LEARNING_LANGUAGES = ['en', 'ko'] as const;

export type LearningLanguageCode =
  (typeof SUPPORTED_LEARNING_LANGUAGES)[number];

export function isSupportedLearningLanguage(
  value: unknown,
): value is LearningLanguageCode {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LEARNING_LANGUAGES as readonly string[]).includes(
      value.trim().toLowerCase(),
    )
  );
}

export function normalizeLearningLanguage(
  value?: string | null,
): LearningLanguageCode {
  const norm = value?.trim().toLowerCase();
  return norm === 'ko' ? 'ko' : 'en';
}

export function getLearningLanguageDisplayName(
  code: LearningLanguageCode,
): string {
  return code === 'ko' ? 'Korean' : 'English';
}
