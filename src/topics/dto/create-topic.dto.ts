import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
  @IsString()
  @MaxLength(16)
  languageCode?: string;
}
