import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsIanaTimezone } from '../../common/validators/is-iana-timezone.validator.js';

export class CreateUserDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Display name cannot be empty' })
  @MaxLength(100, { message: 'Display name cannot exceed 100 characters' })
  displayName: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72, { message: 'Password cannot exceed 72 characters' })
  password: string;

  @IsOptional()
  @IsIanaTimezone()
  timezone?: string;
}
