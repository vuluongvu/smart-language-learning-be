import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateVocabularyDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Term cannot be empty' })
  @MaxLength(255)
  term?: string;

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
  @MinLength(1, { message: 'Definition cannot be empty' })
  @MaxLength(5000)
  definition?: string;

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
}
