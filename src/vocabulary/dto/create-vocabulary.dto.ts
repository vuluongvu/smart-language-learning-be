import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { VocabularySource } from '../entities/vocabulary-item.entity.js';

export class CreateVocabularyDto {
  @IsString()
  @MinLength(1, { message: 'Term cannot be empty' })
  @MaxLength(255, { message: 'Term cannot exceed 255 characters' })
  term: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pronunciation?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  partOfSpeech?: string | null;

  @IsString()
  @MinLength(1, { message: 'Definition cannot be empty' })
  @MaxLength(5000)
  definition: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  example?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  languageCode?: string;

  @IsOptional()
  @IsEnum(VocabularySource)
  source?: VocabularySource;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  topicIds?: number[];
}
