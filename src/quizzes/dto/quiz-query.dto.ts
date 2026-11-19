import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  type LearningLanguageCode,
  SUPPORTED_LEARNING_LANGUAGES,
} from '../../common/constants/learning-languages.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { QuizDifficulty, QuizStatus } from '../entities/quiz.enums.js';

export type QuizSortKey = 'newest' | 'oldest' | 'title_asc' | 'title_desc';

export class QuizQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topicId?: number;

  @IsOptional()
  @IsEnum(QuizStatus)
  status?: QuizStatus;

  @IsOptional()
  @IsEnum(QuizDifficulty)
  difficulty?: QuizDifficulty;

  @IsOptional()
  @IsIn(['newest', 'oldest', 'title_asc', 'title_desc'])
  sortBy?: QuizSortKey;
}
