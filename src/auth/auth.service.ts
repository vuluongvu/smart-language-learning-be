import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource, IsNull, Repository } from 'typeorm';
import { comparePassword } from '../common/utils/hash.util.js';
import { User } from '../users/entities/user.entity.js';
import { UserProfileView, UsersService } from '../users/users.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { GoogleAuthDto } from './dto/google-auth.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { RefreshSession } from './entities/refresh-session.entity.js';
import { UserAuthProvider } from './entities/user-auth-provider.entity.js';
import { GoogleTokenVerifierService } from './google-token-verifier.service.js';

export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfileView;
}

interface RefreshJwtPayload {
  sub: number;
  type: string;
  jti: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function parseDurationMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly googleTokenVerifier: GoogleTokenVerifierService,
    @InjectRepository(UserAuthProvider)
    private readonly authProviderRepository: Repository<UserAuthProvider>,
    @InjectRepository(RefreshSession)
    private readonly refreshSessionRepository: Repository<RefreshSession>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokenResponse> {
    const user = await this.usersService.createWithPassword(dto);
    return this.issueSessionTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokenResponse> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await comparePassword(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueSessionTokens(user);
  }

  async googleLogin(dto: GoogleAuthDto): Promise<AuthTokenResponse> {
    const profile = await this.googleTokenVerifier.verifyIdToken(dto.idToken);

    const existingProvider = await this.authProviderRepository.findOne({
      where: {
        provider: 'google',
        providerUserId: profile.sub,
      },
    });

    if (existingProvider) {
      const user = await this.usersService.findById(existingProvider.userId);
      if (!user) {
        throw new NotFoundException('Linked user account not found');
      }
      return this.issueSessionTokens(user);
    }

    const existingEmailUser = await this.usersService.findByEmail(
      profile.email,
    );
    if (existingEmailUser) {
      throw new ConflictException(
        'An account with this email already exists. Please sign in with your password and link Google in Settings.',
      );
    }

    const createdUser = await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const providerRepo = manager.getRepository(UserAuthProvider);

      const newUser = await userRepo.save(
        userRepo.create({
          email: profile.email,
          passwordHash: null,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          timezone: dto.timezone ?? 'UTC',
        }),
      );

      await providerRepo.save(
        providerRepo.create({
          userId: newUser.id,
          provider: 'google',
          providerUserId: profile.sub,
          providerEmail: profile.email,
          linkedAt: new Date(),
        }),
      );

      return newUser;
    });

    return this.issueSessionTokens(createdUser);
  }

  async linkGoogleAccount(
    userId: number,
    dto: GoogleAuthDto,
  ): Promise<{ message: string; linkedProviders: string[] }> {
    const profile = await this.googleTokenVerifier.verifyIdToken(dto.idToken);

    const existingProvider = await this.authProviderRepository.findOne({
      where: {
        provider: 'google',
        providerUserId: profile.sub,
      },
    });

    if (existingProvider) {
      if (existingProvider.userId !== userId) {
        throw new ConflictException(
          'This Google account is already linked to another user',
        );
      }
      const currentProfile = await this.usersService.getMyProfile(userId);
      return {
        message: 'Google account is already linked',
        linkedProviders: currentProfile.linkedProviders,
      };
    }

    await this.authProviderRepository.save(
      this.authProviderRepository.create({
        userId,
        provider: 'google',
        providerUserId: profile.sub,
        providerEmail: profile.email,
        linkedAt: new Date(),
      }),
    );

    const updatedProfile = await this.usersService.getMyProfile(userId);
    return {
      message: 'Google account linked successfully',
      linkedProviders: updatedProfile.linkedProviders,
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthTokenResponse> {
    let payload: RefreshJwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshJwtPayload>(
        dto.refreshToken,
        { secret: this.getRefreshSecret() },
      );
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh' || !payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenHash = hashToken(dto.refreshToken);
    const session = await this.refreshSessionRepository.findOne({
      where: { tokenHash },
    });

    if (!session) {
      throw new UnauthorizedException('Refresh session not found');
    }

    if (session.revokedAt) {
      await this.refreshSessionRepository.update(
        { userId: session.userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.usersService.findById(session.userId);
    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    const refreshExpiration = this.getRefreshExpiration();
    const nextRefreshToken = await this.signRefreshToken(
      user.id,
      refreshExpiration,
    );
    const nextAccessToken = await this.signAccessToken(user);

    await this.dataSource.transaction(async (manager) => {
      const sessionRepo = manager.getRepository(RefreshSession);
      await sessionRepo.update({ id: session.id }, { revokedAt: new Date() });
      await sessionRepo.save(
        sessionRepo.create({
          userId: user.id,
          tokenHash: hashToken(nextRefreshToken),
          expiresAt: new Date(Date.now() + parseDurationMs(refreshExpiration)),
          revokedAt: null,
        }),
      );
    });

    return {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
      user: await this.usersService.getMyProfile(user.id),
    };
  }

  async logout(userId: number, dto: LogoutDto): Promise<{ message: string }> {
    if (dto.refreshToken) {
      await this.refreshSessionRepository.update(
        {
          userId,
          tokenHash: hashToken(dto.refreshToken),
          revokedAt: IsNull(),
        },
        { revokedAt: new Date() },
      );
    } else {
      await this.refreshSessionRepository.update(
        { userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    }

    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    return this.usersService.changePassword(userId, dto);
  }

  requestPasswordReset(): never {
    throw new ServiceUnavailableException(
      'Password reset email delivery is not configured (SMTP required)',
    );
  }

  confirmPasswordReset(): never {
    throw new ServiceUnavailableException(
      'Password reset email delivery is not configured (SMTP required)',
    );
  }

  private async issueSessionTokens(user: User): Promise<AuthTokenResponse> {
    const refreshExpiration = this.getRefreshExpiration();
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.signRefreshToken(user.id, refreshExpiration),
    ]);

    await this.refreshSessionRepository.save(
      this.refreshSessionRepository.create({
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + parseDurationMs(refreshExpiration)),
        revokedAt: null,
      }),
    );

    return {
      accessToken,
      refreshToken,
      user: await this.usersService.getMyProfile(user.id),
    };
  }

  private async signAccessToken(user: User): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    });
  }

  private async signRefreshToken(
    userId: number,
    expiresIn: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: userId,
        type: 'refresh',
        jti: randomUUID(),
      },
      {
        secret: this.getRefreshSecret(),
        expiresIn: expiresIn as never,
      },
    );
  }

  private getRefreshSecret(): string {
    const configured = this.configService
      .get<string>('JWT_REFRESH_SECRET')
      ?.trim();
    if (configured) {
      return configured;
    }
    return `${this.configService.getOrThrow<string>('JWT_SECRET')}:refresh`;
  }

  private getRefreshExpiration(): string {
    return (
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') ?? '7d'
    ).trim();
  }
}
