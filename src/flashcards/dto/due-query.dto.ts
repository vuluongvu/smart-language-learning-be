import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { FlashcardSessionMode } from '../entities/flashcard.enums.js';

export class DueFlashcardsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topicId?: number;

  @IsOptional()
  @IsEnum(FlashcardSessionMode)
  mode?: FlashcardSessionMode = FlashcardSessionMode.DUE_AND_NEW;
}
