import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { UsersService } from '../users/users.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: vi.fn(),
            login: vi.fn(),
            googleLogin: vi.fn(),
            linkGoogleAccount: vi.fn(),
            refresh: vi.fn(),
            logout: vi.fn(),
            requestPasswordReset: vi.fn(),
            confirmPasswordReset: vi.fn(),
            changePassword: vi.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            getMyProfile: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
