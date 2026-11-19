import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  type LearningLanguageCode,
  SUPPORTED_LEARNING_LANGUAGES,
} from '../../common/constants/learning-languages.js';

export class ProgressOverviewQueryDto {
  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;
}

export class ProgressHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(90)
  days?: number = 14;

  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;
}
