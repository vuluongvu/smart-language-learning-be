import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class DeleteAccountDto {
  @IsBoolean()
  confirm: boolean;

  @IsOptional()
  @IsString()
  currentPassword?: string;
}
