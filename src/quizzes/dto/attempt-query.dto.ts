import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import {
  type LearningLanguageCode,
  SUPPORTED_LEARNING_LANGUAGES,
} from '../../common/constants/learning-languages.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { QuizAttemptStatus } from '../entities/quiz.enums.js';

export class AttemptQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;

  @IsOptional()
  @IsEnum(QuizAttemptStatus)
  status?: QuizAttemptStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quizId?: number;
}
