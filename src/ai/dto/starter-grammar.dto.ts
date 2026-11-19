import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  type LearningLanguageCode,
  SUPPORTED_LEARNING_LANGUAGES,
} from '../../common/constants/learning-languages.js';

export const STARTER_GRAMMAR_LEVELS = ['A0', 'A1', 'A2'] as const;
export type StarterGrammarLevel = (typeof STARTER_GRAMMAR_LEVELS)[number];

export class GenerateStarterGrammarDto {
  @ApiProperty({
    example: 'Thì quá khứ đơn (Past Simple)',
    description: 'Grammar topic or question requested by the learner',
  })
  @IsString()
  @IsNotEmpty({ message: 'Topic cannot be empty' })
  @MaxLength(120)
  topic: string;

  @ApiPropertyOptional({ enum: STARTER_GRAMMAR_LEVELS, default: 'A0' })
  @IsOptional()
  @IsIn(STARTER_GRAMMAR_LEVELS)
  level?: StarterGrammarLevel;

  @ApiPropertyOptional({ enum: SUPPORTED_LEARNING_LANGUAGES, default: 'en' })
  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;

  @ApiPropertyOptional({ enum: ['vi', 'en'], default: 'vi' })
  @IsOptional()
  @IsIn(['vi', 'en'])
  explanationLanguage?: 'vi' | 'en';

  @ApiPropertyOptional({ minimum: 2, maximum: 6, default: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(6)
  exerciseCount?: number;
}
