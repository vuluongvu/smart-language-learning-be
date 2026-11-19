import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  type LearningLanguageCode,
  SUPPORTED_LEARNING_LANGUAGES,
} from '../../common/constants/learning-languages.js';
import { IsIanaTimezone } from '../../common/validators/is-iana-timezone.validator.js';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Display name cannot be empty' })
  @MaxLength(100, { message: 'Display name cannot exceed 100 characters' })
  displayName?: string;

  @IsOptional()
  @IsUrl(
    { require_protocol: true },
    { message: 'Avatar URL must be a valid URL' },
  )
  @MaxLength(500)
  avatarUrl?: string | null;

  @IsOptional()
  @IsIanaTimezone()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  isLeaderboardVisible?: boolean;

  @IsOptional()
  @IsIn(SUPPORTED_LEARNING_LANGUAGES)
  learningLanguage?: LearningLanguageCode;
}
