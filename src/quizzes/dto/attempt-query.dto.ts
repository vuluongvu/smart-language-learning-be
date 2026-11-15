import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { QuizAttemptStatus } from '../entities/quiz.enums.js';

export class AttemptQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(QuizAttemptStatus)
  status?: QuizAttemptStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quizId?: number;
}
