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
import {
  type LearningLanguageCode,
  SUPPORTED_LEARNING_LANGUAGES,
} from '../../common/constants/learning-languages.js';

export const ENGLISH_GOAL_BANDS = [
  'band_45_55',
  'band_55_65',
  'band_65_75',
] as const;

export const KOREAN_GOAL_BANDS = [
  'topik_1_2',
  'topik_3_4',
  'topik_5_6',
] as const;

export const LEARNING_GOAL_BANDS = [
  ...ENGLISH_GOAL_BANDS,
  ...KOREAN_GOAL_BANDS,
] as const;
export type LearningGoalBand = (typeof LEARNING_GOAL_BANDS)[number];

export const CEFR_GOAL_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export class LearningPathOverviewQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(48)
  band?: string;

  @ApiPropertyOptional({ enum: SUPPORTED_LEARNING_LANGUAGES })
  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;
}

export class UpdateLearningGoalDto {
  @ApiProperty({ enum: LEARNING_GOAL_BANDS })
  @IsIn(LEARNING_GOAL_BANDS)
  learningGoalBand: LearningGoalBand;

  @ApiPropertyOptional({ enum: SUPPORTED_LEARNING_LANGUAGES })
  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;

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

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  learningFocus?: string;

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

  @ApiPropertyOptional({ enum: SUPPORTED_LEARNING_LANGUAGES, default: 'en' })
  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;
}

export class GenerateUnitStudyGuideDto {
  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  focusGoal?: string;

  @ApiPropertyOptional({ enum: ['vi', 'en'], default: 'vi' })
  @IsOptional()
  @IsIn(['vi', 'en'])
  explanationLang?: 'vi' | 'en';
}

export class RegenerateAiUnitDto {
  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  focusGoal?: string;

  @ApiPropertyOptional({ enum: ['vi', 'en'], default: 'vi' })
  @IsOptional()
  @IsIn(['vi', 'en'])
  explanationLang?: 'vi' | 'en';
}
