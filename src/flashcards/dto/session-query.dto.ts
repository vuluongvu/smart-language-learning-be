import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import {
  type LearningLanguageCode,
  SUPPORTED_LEARNING_LANGUAGES,
} from '../../common/constants/learning-languages.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { FlashcardSessionStatus } from '../entities/flashcard.enums.js';

export class FlashcardSessionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;

  @IsOptional()
  @IsEnum(FlashcardSessionStatus)
  status?: FlashcardSessionStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topicId?: number;
}
