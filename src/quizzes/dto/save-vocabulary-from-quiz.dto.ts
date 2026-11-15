import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class SaveVocabularyFromQuizDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  existingVocabularyId?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  term?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  definition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  pronunciation?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  partOfSpeech?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  example?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  topicIds?: number[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  newTopicName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  newTopicDescription?: string | null;
}
