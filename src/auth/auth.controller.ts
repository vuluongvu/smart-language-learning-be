import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { GoogleAuthDto } from './dto/google-auth.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new learner account with email' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Sign in with email and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Get('google/config')
  @ApiOperation({
    summary: 'Get public Google OAuth client configuration for web sign-in',
  })
  getGoogleConfig() {
    return this.authService.getGoogleConfig();
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('google')
  @ApiOperation({ summary: 'Sign in or register using Google ID token' })
  googleLogin(@Body() dto: GoogleAuthDto) {
    return this.authService.googleLogin(dto);
  }

  @ApiBearerAuth()
  @Post('google/link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Link a Google account to the authenticated user' })
  linkGoogle(
    @CurrentUser('userId') userId: number,
    @Body() dto: GoogleAuthDto,
  ) {
    return this.authService.linkGoogleAccount(userId, dto);
  }

  @ApiBearerAuth()
  @Post('google/unlink')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Unlink Google account from the authenticated user (requires a password set)',
  })
  unlinkGoogle(@CurrentUser('userId') userId: number) {
    return this.authService.unlinkGoogleAccount(userId);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Revoke refresh session and sign out' })
  logout(@CurrentUser('userId') userId: number, @Body() dto: LogoutDto) {
    return this.authService.logout(userId, dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset email (requires SMTP configuration)',
  })
  forgotPassword(@Body() _dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset();
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  @ApiOperation({
    summary: 'Confirm password reset token (requires SMTP configuration)',
  })
  resetPassword(@Body() _dto: ResetPasswordDto) {
    return this.authService.confirmPasswordReset();
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  getProfile(@CurrentUser('userId') userId: number) {
    return this.usersService.getMyProfile(userId);
  }

  @ApiBearerAuth()
  @Patch('change-password')
  @ApiOperation({ summary: 'Change password for authenticated user' })
  changePassword(
    @CurrentUser('userId') userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }
}
