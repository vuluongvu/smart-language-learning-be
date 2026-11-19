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

export class CreateTopicDto {
  @IsString()
  @MinLength(1, { message: 'Topic name cannot be empty' })
  @MaxLength(120, { message: 'Topic name cannot exceed 120 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  languageCode?: LearningLanguageCode | string;
}
