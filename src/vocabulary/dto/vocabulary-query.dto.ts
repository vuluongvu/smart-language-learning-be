import { Type } from 'class-transformer';
import {
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

export type VocabularySortKey = 'newest' | 'oldest' | 'term_asc' | 'term_desc';
export type VocabularyReviewStatusFilter =
  'all' | 'new' | 'learning' | 'mastered' | 'due';

export class VocabularyQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topicId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  partOfSpeech?: string;

  @IsOptional()
  @IsIn(['all', 'new', 'learning', 'mastered', 'due'])
  reviewStatus?: VocabularyReviewStatusFilter = 'all';

  @IsOptional()
  @IsIn(['newest', 'oldest', 'term_asc', 'term_desc'])
  sortBy?: VocabularySortKey = 'newest';
}

export class CheckDuplicateQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  term?: string;

  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;
}
