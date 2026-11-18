import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  type LearningLanguageCode,
  SUPPORTED_LEARNING_LANGUAGES,
} from '../../common/constants/learning-languages.js';
import { CreateVocabularyDto } from './create-vocabulary.dto.js';

export type AiGenerateMode = 'topic' | 'passage';
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class AiEnrichVocabularyDto {
  @ApiProperty({ example: 'resilient' })
  @IsString()
  @MinLength(1, { message: 'Term cannot be empty' })
  @MaxLength(255)
  term: string;

  @ApiPropertyOptional({
    example: 'Workplace teamwork and handling pressure',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  context?: string;

  @ApiPropertyOptional({ enum: SUPPORTED_LEARNING_LANGUAGES, default: 'en' })
  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;
}

export class AiGenerateVocabularyDto {
  @ApiProperty({
    example: 'Environment and renewable energy vocabulary',
  })
  @IsString()
  @MinLength(2, { message: 'Prompt must be at least 2 characters' })
  @MaxLength(2000)
  prompt: string;

  @ApiPropertyOptional({ enum: ['topic', 'passage'], default: 'topic' })
  @IsOptional()
  @IsIn(['topic', 'passage'])
  mode?: AiGenerateMode;

  @ApiPropertyOptional({ enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] })
  @IsOptional()
  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  level?: CefrLevel;

  @ApiPropertyOptional({ minimum: 1, maximum: 10, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  count?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topicId?: number;

  @ApiPropertyOptional({ enum: SUPPORTED_LEARNING_LANGUAGES, default: 'en' })
  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;
}

export class AiExtractImageVocabularyDto {
  @ApiPropertyOptional({
    example: 'Focus on academic adjectives and phrasal verbs',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  prompt?: string;

  @ApiPropertyOptional({ enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  level?: CefrLevel;

  @ApiPropertyOptional({ minimum: 1, maximum: 15, default: 8 })
  @Transform(emptyToUndefined)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(15)
  count?: number;

  @ApiPropertyOptional({ example: 1 })
  @Transform(emptyToUndefined)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topicId?: number;

  @ApiPropertyOptional({ enum: SUPPORTED_LEARNING_LANGUAGES, default: 'en' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;
}

export class BulkCreateVocabularyDto {
  @ApiProperty({ type: [CreateVocabularyDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CreateVocabularyDto)
  items: CreateVocabularyDto[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  topicIds?: number[];

  @ApiPropertyOptional({ example: 'Technology' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  newTopicName?: string | null;

  @ApiPropertyOptional({ enum: SUPPORTED_LEARNING_LANGUAGES, default: 'en' })
  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;
}
