import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  type LearningLanguageCode,
  SUPPORTED_LEARNING_LANGUAGES,
} from '../../common/constants/learning-languages.js';
import {
  QuestionType,
  QuizDifficulty,
  QuizStatus,
} from '../entities/quiz.enums.js';

export class CreateQuestionOptionDto {
  @IsString()
  @MinLength(1, { message: 'Option text cannot be empty' })
  @MaxLength(1000)
  optionText: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuizQuestionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  vocabularyId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  vocabularyTerm?: string | null;

  @IsString()
  @MinLength(1, { message: 'Question text cannot be empty' })
  @MaxLength(4000)
  questionText: string;

  @IsEnum(QuestionType)
  questionType: QuestionType;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  explanation?: string | null;

  @IsArray()
  @ArrayMinSize(1, {
    message: 'Each question requires at least 1 option/answer',
  })
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionOptionDto)
  options: CreateQuestionOptionDto[];
}

export class CreateQuizDto {
  @IsString()
  @MinLength(1, { message: 'Quiz title cannot be empty' })
  @MaxLength(160, { message: 'Quiz title cannot exceed 160 characters' })
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;

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
