import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const LEARNING_GOAL_BANDS = [
  'band_45_55',
  'band_55_65',
  'band_65_75',
] as const;
export type LearningGoalBand = (typeof LEARNING_GOAL_BANDS)[number];

export const CEFR_GOAL_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export class UpdateLearningGoalDto {
  @ApiProperty({ enum: LEARNING_GOAL_BANDS })
  @IsIn(LEARNING_GOAL_BANDS)
  learningGoalBand: LearningGoalBand;

  @ApiPropertyOptional({ enum: CEFR_GOAL_LEVELS })
  @IsOptional()
  @IsIn(CEFR_GOAL_LEVELS)
  currentLevel?: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 180 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(180)
  dailyGoalMinutes?: number;
}

export class QuizAnswerSubmissionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({ minimum: 0, maximum: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  selectedIndex: number;
}

export class SubmitUnitQuizDto {
  @ApiProperty({ type: [QuizAnswerSubmissionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerSubmissionDto)
  answers: QuizAnswerSubmissionDto[];
}

export class EvaluateUnitWritingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  text: string;

  @ApiPropertyOptional({ enum: ['vi', 'en'], default: 'vi' })
  @IsOptional()
  @IsIn(['vi', 'en'])
  explanationLang?: 'vi' | 'en';
}

export class StartUnitSpeakingDto {
  @ApiPropertyOptional({ enum: ['vi', 'en'], default: 'vi' })
  @IsOptional()
  @IsIn(['vi', 'en'])
  explanationLang?: 'vi' | 'en';
}

export class UnitNotebookWordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  term: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  partOfSpeech?: string | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  definition: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  example?: string | null;
}

export class SaveUnitWordsDto {
  @ApiProperty({ type: [UnitNotebookWordDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => UnitNotebookWordDto)
  words: UnitNotebookWordDto[];
}

export class GenerateAiLearningPathDto {
  @ApiProperty({ maxLength: 220 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(220)
  goalTopic: string;

  @ApiPropertyOptional({ maxLength: 4000 })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  sourceMaterial?: string;

  @ApiPropertyOptional({ enum: LEARNING_GOAL_BANDS })
  @IsOptional()
  @IsIn(LEARNING_GOAL_BANDS)
  targetBand?: LearningGoalBand;

  @ApiPropertyOptional({ enum: CEFR_GOAL_LEVELS })
  @IsOptional()
  @IsIn(CEFR_GOAL_LEVELS)
  currentLevel?: string;

  @ApiPropertyOptional({ minimum: 2, maximum: 4, default: 3 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(4)
  unitCount?: number;

  @ApiPropertyOptional({ enum: ['vi', 'en'], default: 'vi' })
  @IsOptional()
  @IsIn(['vi', 'en'])
  explanationLang?: 'vi' | 'en';
}

export class GenerateUnitStudyGuideDto {
  @ApiPropertyOptional({ maxLength: 1500 })
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  focusNote?: string;

  @ApiPropertyOptional({ enum: ['vi', 'en'], default: 'vi' })
  @IsOptional()
  @IsIn(['vi', 'en'])
  explanationLang?: 'vi' | 'en';
}

export class RegenerateAiUnitDto {
  @ApiPropertyOptional({ maxLength: 1500 })
  @IsOptional()
  @IsString()
  @MaxLength(1500)
  focusNote?: string;

  @ApiPropertyOptional({ enum: ['vi', 'en'], default: 'vi' })
  @IsOptional()
  @IsIn(['vi', 'en'])
  explanationLang?: 'vi' | 'en';
}
