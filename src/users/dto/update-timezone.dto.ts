import { IsNotEmpty, IsString } from 'class-validator';
import { IsIanaTimezone } from '../../common/validators/is-iana-timezone.validator.js';

export class UpdateTimezoneDto {
  @IsString()
  @IsNotEmpty()
  @IsIanaTimezone()
  timezone: string;
}
