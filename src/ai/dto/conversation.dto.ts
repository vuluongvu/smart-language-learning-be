import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  type LearningLanguageCode,
  SUPPORTED_LEARNING_LANGUAGES,
} from '../../common/constants/learning-languages.js';
import type {
  ConversationLevel,
  ExplanationLanguage,
} from '../entities/ai-conversation-session.entity.js';

export class ListConversationsQueryDto {
  @ApiPropertyOptional({ enum: SUPPORTED_LEARNING_LANGUAGES })
  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;
}

export class StartConversationDto {
  @ApiProperty({ example: 'Ordering at a coffee shop' })
  @IsString()
  @MinLength(2, { message: 'Topic must be at least 2 characters' })
  @MaxLength(160)
  topic: string;

  @ApiPropertyOptional({ enum: SUPPORTED_LEARNING_LANGUAGES, default: 'en' })
  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode;

  @ApiPropertyOptional({
    enum: ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    default: 'B1',
  })
  @IsOptional()
  @IsIn(['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  level?: ConversationLevel;

  @ApiPropertyOptional({ enum: ['vi', 'en'], default: 'vi' })
  @IsOptional()
  @IsIn(['vi', 'en'])
  explanationLang?: ExplanationLanguage;
}

export class ReplyConversationDto {
  @ApiProperty({
    example: 'I would like an iced latte with oat milk, please.',
  })
  @IsString()
  @MinLength(1, { message: 'Answer cannot be empty' })
  @MaxLength(2000)
  answer: string;

  @ApiPropertyOptional({ enum: ['text', 'voice'], default: 'text' })
  @IsOptional()
  @IsIn(['text', 'voice'])
  inputMode?: 'text' | 'voice';
}
