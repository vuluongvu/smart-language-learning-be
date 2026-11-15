import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @IsNotEmpty({ message: 'New password cannot be empty' })
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(72, { message: 'New password cannot exceed 72 characters' })
  newPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Confirm password cannot be empty' })
  confirmPassword: string;
}
