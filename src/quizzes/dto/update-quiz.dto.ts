import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { QuizDifficulty, QuizStatus } from '../entities/quiz.enums.js';
import { CreateQuizQuestionDto } from './create-quiz.dto.js';

export class UpdateQuizDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Quiz title cannot be empty' })
  @MaxLength(160, { message: 'Quiz title cannot exceed 160 characters' })
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topicId?: number | null;

  @IsOptional()
  @IsEnum(QuizDifficulty)
  difficulty?: QuizDifficulty | null;

  @IsOptional()
  @IsEnum(QuizStatus)
  status?: QuizStatus;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateQuizQuestionDto)
  questions?: CreateQuizQuestionDto[];
}
