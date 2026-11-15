import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';
import { Role } from '../common/enums/role.enum.js';
import { hashPassword } from '../common/utils/hash.util.js';
import { User } from '../users/entities/user.entity.js';
import { UserProfileView, UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';
import { RefreshSession } from './entities/refresh-session.entity.js';
import { UserAuthProvider } from './entities/user-auth-provider.entity.js';
import { GoogleTokenVerifierService } from './google-token-verifier.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    createWithPassword: ReturnType<typeof vi.fn>;
    findByEmailWithPassword: ReturnType<typeof vi.fn>;
    findByEmail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    getMyProfile: ReturnType<typeof vi.fn>;
    changePassword: ReturnType<typeof vi.fn>;
  };
  let jwtService: {
    signAsync: ReturnType<typeof vi.fn>;
    verifyAsync: ReturnType<typeof vi.fn>;
  };
  let googleTokenVerifier: { verifyIdToken: ReturnType<typeof vi.fn> };
  let authProviderRepo: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
  let refreshSessionRepo: {
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let dataSource: { transaction: ReturnType<typeof vi.fn> };

  const baseProfile: UserProfileView = {
    id: 1,
    email: 'learner@example.com',
    displayName: 'Learner',
    avatarUrl: null,
    timezone: 'Asia/Ho_Chi_Minh',
    isLeaderboardVisible: true,
    role: Role.USER,
    hasPassword: true,
    linkedProviders: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(async () => {
    usersService = {
      createWithPassword: vi.fn(),
      findByEmailWithPassword: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn(),
      getMyProfile: vi.fn().mockResolvedValue(baseProfile),
      changePassword: vi.fn(),
    };
    jwtService = {
      signAsync: vi
        .fn()
        .mockResolvedValueOnce('access-jwt')
        .mockResolvedValueOnce('refresh-jwt'),
      verifyAsync: vi.fn(),
    };
    googleTokenVerifier = {
      verifyIdToken: vi.fn(),
    };
    authProviderRepo = {
      findOne: vi.fn(),
      create: vi.fn((x) => x),
      save: vi.fn(async (x) => x),
    };
    refreshSessionRepo = {
      create: vi.fn((x) => x),
      save: vi.fn(async (x) => x),
      findOne: vi.fn(),
      update: vi.fn(async () => ({ affected: 1 })),
    };
    dataSource = {
      transaction: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              if (key === 'JWT_REFRESH_EXPIRATION') return '7d';
              return '';
            }),
            getOrThrow: vi.fn(() => 'super-secret-jwt-key-at-least-32-chars'),
          },
        },
        { provide: DataSource, useValue: dataSource },
        {
          provide: GoogleTokenVerifierService,
          useValue: googleTokenVerifier,
        },
        {
          provide: getRepositoryToken(UserAuthProvider),
          useValue: authProviderRepo,
        },
        {
          provide: getRepositoryToken(RefreshSession),
          useValue: refreshSessionRepo,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registers a new user and issues session tokens', async () => {
    const created = {
      id: 1,
      email: 'learner@example.com',
      role: Role.USER,
    } as User;
    usersService.createWithPassword.mockResolvedValue(created);

    const res = await service.register({
      email: 'learner@example.com',
      displayName: 'Learner',
      password: 'Password123!',
      timezone: 'Asia/Ho_Chi_Minh',
    });

    expect(res.accessToken).toBe('access-jwt');
    expect(res.refreshToken).toBe('refresh-jwt');
    expect(res.user.email).toBe('learner@example.com');
    expect(refreshSessionRepo.save).toHaveBeenCalledTimes(1);
  });

  it('throws generic UnauthorizedException on invalid login credentials', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);
    await expect(
      service.login({ email: 'missing@example.com', password: 'secret' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

    const hashed = await hashPassword('CorrectPass123');
    usersService.findByEmailWithPassword.mockResolvedValue({
      id: 1,
      email: 'learner@example.com',
      passwordHash: hashed,
      role: Role.USER,
    });
    await expect(
      service.login({ email: 'learner@example.com', password: 'WrongPass' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
  });

  it('logs in with valid email and password', async () => {
    const hashed = await hashPassword('CorrectPass123');
    usersService.findByEmailWithPassword.mockResolvedValue({
      id: 1,
      email: 'learner@example.com',
      passwordHash: hashed,
      role: Role.USER,
    });

    const res = await service.login({
      email: 'learner@example.com',
      password: 'CorrectPass123',
    });

    expect(res.accessToken).toBe('access-jwt');
    expect(res.refreshToken).toBe('refresh-jwt');
  });

  it('rejects Google login when email already belongs to a password account without linking', async () => {
    googleTokenVerifier.verifyIdToken.mockResolvedValue({
      sub: 'google-sub-123',
      email: 'learner@example.com',
      emailVerified: true,
      displayName: 'Learner',
      avatarUrl: null,
    });
    authProviderRepo.findOne.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue({ id: 1 } as User);

    await expect(
      service.googleLogin({ idToken: 'valid-google-token' }),
    ).rejects.toThrow(ConflictException);
  });

  it('creates a new user and provider link on first-time Google login', async () => {
    googleTokenVerifier.verifyIdToken.mockResolvedValue({
      sub: 'google-sub-999',
      email: 'newgoogle@example.com',
      emailVerified: true,
      displayName: 'Google Learner',
      avatarUrl: 'https://example.com/a.png',
    });
    authProviderRepo.findOne.mockResolvedValue(null);
    usersService.findByEmail.mockResolvedValue(null);

    const txUserRepo = {
      create: vi.fn((x) => ({ id: 42, role: Role.USER, ...x })),
      save: vi.fn(async (x) => x),
    };
    const txProviderRepo = {
      create: vi.fn((x) => x),
      save: vi.fn(async (x) => x),
    };
    dataSource.transaction.mockImplementation(async (cb) =>
      cb({
        getRepository: (entity: unknown) =>
          entity === User ? txUserRepo : txProviderRepo,
      }),
    );

    const res = await service.googleLogin({
      idToken: 'valid-google-token',
      timezone: 'Asia/Ho_Chi_Minh',
    });

    expect(res.accessToken).toBe('access-jwt');
    expect(txUserRepo.save).toHaveBeenCalledTimes(1);
    expect(txProviderRepo.save).toHaveBeenCalledTimes(1);
  });

  it('rejects fake Google tokens', async () => {
    googleTokenVerifier.verifyIdToken.mockRejectedValue(
      new UnauthorizedException('Invalid or expired Google ID token'),
    );

    await expect(
      service.googleLogin({ idToken: 'fake-token' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('revokes all sessions if a previously revoked refresh token is reused', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 1,
      type: 'refresh',
      jti: 'abc',
    });
    refreshSessionRepo.findOne.mockResolvedValue({
      id: 9,
      userId: 1,
      revokedAt: new Date('2026-01-01T00:00:00Z'),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      service.refresh({ refreshToken: 'reused-token' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(refreshSessionRepo.update).toHaveBeenCalledTimes(1);
  });

  it('does not simulate forgot-password email sending when SMTP is unconfigured', () => {
    expect(() => service.requestPasswordReset()).toThrow(
      ServiceUnavailableException,
    );
    expect(() => service.confirmPasswordReset()).toThrow(
      ServiceUnavailableException,
    );
  });

  it('throws NotFoundException when linked Google provider points to missing user', async () => {
    googleTokenVerifier.verifyIdToken.mockResolvedValue({
      sub: 'google-sub-1',
      email: 'ghost@example.com',
      emailVerified: true,
      displayName: 'Ghost',
      avatarUrl: null,
    });
    authProviderRepo.findOne.mockResolvedValue({ userId: 999 });
    usersService.findById.mockResolvedValue(null);

    await expect(service.googleLogin({ idToken: 'token' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
