import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            register: vi.fn(),
            findByUsernameWithPassword: vi.fn(),
            changePassword: vi.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
