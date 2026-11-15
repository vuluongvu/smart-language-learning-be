import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { RefreshSession } from '../auth/entities/refresh-session.entity.js';
import { UserAuthProvider } from '../auth/entities/user-auth-provider.entity.js';
import { hashPassword } from '../common/utils/hash.util.js';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: {
    findOneBy: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
  };
  let providerRepo: { find: ReturnType<typeof vi.fn> };
  let refreshSessionRepo: { update: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    userRepo = {
      findOneBy: vi.fn(),
      create: vi.fn((x) => x),
      save: vi.fn(async (x) => ({ id: 1, ...x })),
      update: vi.fn(async () => ({ affected: 1 })),
      delete: vi.fn(async () => ({ affected: 1 })),
      createQueryBuilder: vi.fn(),
    };
    providerRepo = {
      find: vi.fn().mockResolvedValue([]),
    };
    refreshSessionRepo = {
      update: vi.fn(async () => ({ affected: 1 })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        {
          provide: getRepositoryToken(UserAuthProvider),
          useValue: providerRepo,
        },
        {
          provide: getRepositoryToken(RefreshSession),
          useValue: refreshSessionRepo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('normalizes email and rejects duplicates on registration', async () => {
    userRepo.findOneBy.mockResolvedValue({ id: 1 });
    await expect(
      service.createWithPassword({
        email: '  Learner@Example.COM ',
        displayName: 'Learner',
        password: 'Password123!',
      }),
    ).rejects.toThrow(ConflictException);
    expect(userRepo.findOneBy).toHaveBeenCalledWith({
      email: 'learner@example.com',
    });
  });

  it('changes password and revokes active refresh sessions', async () => {
    const currentHash = await hashPassword('OldPass123!');
    const qb = {
      addSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue({
        id: 1,
        passwordHash: currentHash,
      }),
    };
    userRepo.createQueryBuilder.mockReturnValue(qb);

    const res = await service.changePassword(1, {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass456!',
      confirmPassword: 'NewPass456!',
    });

    expect(res.message).toBe('Password updated successfully');
    expect(userRepo.update).toHaveBeenCalledTimes(1);
    expect(refreshSessionRepo.update).toHaveBeenCalledTimes(1);
  });

  it('requires explicit confirmation to delete account', async () => {
    await expect(
      service.deleteMyAccount(1, { confirm: false }),
    ).rejects.toThrow(BadRequestException);
  });
});
