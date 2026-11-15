import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password cannot be empty' })
  password: string;
}
