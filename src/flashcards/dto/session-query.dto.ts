import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { FlashcardSessionStatus } from '../entities/flashcard.enums.js';

export class FlashcardSessionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(FlashcardSessionStatus)
  status?: FlashcardSessionStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topicId?: number;
}
