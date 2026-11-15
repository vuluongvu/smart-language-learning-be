import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsIanaTimezone } from '../../common/validators/is-iana-timezone.validator.js';

export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty({ message: 'Google ID token is required' })
  idToken: string;

  @IsOptional()
  @IsIanaTimezone()
  timezone?: string;
}
