import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class DeleteAccountDto {
  @IsBoolean()
  confirm: boolean;

  @IsString()
  @IsNotEmpty({
    message: 'Confirmation email is required to delete your account',
  })
  @MaxLength(255)
  confirmEmail: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;
}
