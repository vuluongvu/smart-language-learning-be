import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { QuestionType } from '../entities/quiz.enums.js';

export class DraftFromVocabularyDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topicId?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  vocabularyIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  count?: number = 5;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(QuestionType, { each: true })
  questionTypes?: QuestionType[];
}
