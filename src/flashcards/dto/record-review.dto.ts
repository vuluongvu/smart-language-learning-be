import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';
import { ReviewRating } from '../entities/flashcard.enums.js';

export class RecordFlashcardReviewDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vocabularyId: number;

  @IsEnum(ReviewRating)
  rating: ReviewRating;
}
