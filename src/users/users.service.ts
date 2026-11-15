import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ChangePasswordDto } from '../auth/dto/change-password.dto.js';
import { RefreshSession } from '../auth/entities/refresh-session.entity.js';
import { UserAuthProvider } from '../auth/entities/user-auth-provider.entity.js';
import { comparePassword, hashPassword } from '../common/utils/hash.util.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { UpdateProfileDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity.js';

export interface UserProfileView {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  timezone: string;
  isLeaderboardVisible: boolean;
  role: string;
  hasPassword: boolean;
  linkedProviders: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserAuthProvider)
    private readonly authProviderRepository: Repository<UserAuthProvider>,
    @InjectRepository(RefreshSession)
    private readonly refreshSessionRepository: Repository<RefreshSession>,
  ) {}

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async createWithPassword(dto: CreateUserDto): Promise<User> {
    const email = this.normalizeEmail(dto.email);
    const existing = await this.userRepository.findOneBy({ email });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await hashPassword(dto.password);
    const user = this.userRepository.create({
      email,
      passwordHash,
      displayName: dto.displayName.trim(),
      timezone: dto.timezone ?? 'UTC',
    });

    return this.userRepository.save(user);
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email: this.normalizeEmail(email) });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: this.normalizeEmail(email) })
      .getOne();
  }

  async findByIdWithPassword(id: number): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
  }

  async getMyProfile(userId: number): Promise<UserProfileView> {
    const user = await this.findByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const providers = await this.authProviderRepository.find({
      where: { userId },
      select: { provider: true },
    });

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      isLeaderboardVisible: user.isLeaderboardVisible,
      role: user.role,
      hasPassword: Boolean(user.passwordHash),
      linkedProviders: providers.map((p) => p.provider),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateMyProfile(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<UserProfileView> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.displayName !== undefined) {
      const trimmed = dto.displayName.trim();
      if (!trimmed) {
        throw new BadRequestException('Display name cannot be empty');
      }
      user.displayName = trimmed;
    }

    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl ?? null;
    }

    if (dto.timezone !== undefined) {
      user.timezone = dto.timezone;
    }

    if (dto.isLeaderboardVisible !== undefined) {
      user.isLeaderboardVisible = dto.isLeaderboardVisible;
    }

    await this.userRepository.save(user);
    return this.getMyProfile(userId);
  }

  async updateTimezone(
    userId: number,
    timezone: string,
  ): Promise<UserProfileView> {
    return this.updateMyProfile(userId, { timezone });
  }

  async updateLeaderboardVisibility(
    userId: number,
    isLeaderboardVisible: boolean,
  ): Promise<UserProfileView> {
    return this.updateMyProfile(userId, { isLeaderboardVisible });
  }

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException(
        'New password and confirmation do not match',
      );
    }

    const user = await this.findByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.passwordHash) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required');
      }
      if (dto.currentPassword === dto.newPassword) {
        throw new BadRequestException(
          'New password must be different from current password',
        );
      }

      const isValidPassword = await comparePassword(
        dto.currentPassword,
        user.passwordHash,
      );
      if (!isValidPassword) {
        throw new BadRequestException('Current password is incorrect');
      }
    }

    const passwordHash = await hashPassword(dto.newPassword);
    await this.userRepository.update({ id: user.id }, { passwordHash });
    await this.refreshSessionRepository.update(
      { userId: user.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );

    return { message: 'Password updated successfully' };
  }

  async deleteMyAccount(
    userId: number,
    dto: DeleteAccountDto,
  ): Promise<{ message: string }> {
    if (!dto.confirm) {
      throw new BadRequestException(
        'Account deletion must be explicitly confirmed',
      );
    }

    const user = await this.findByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.passwordHash) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Current password is required to delete your account',
        );
      }
      const isValid = await comparePassword(
        dto.currentPassword,
        user.passwordHash,
      );
      if (!isValid) {
        throw new BadRequestException('Current password is incorrect');
      }
    }

    await this.userRepository.delete({ id: user.id });
    return { message: 'Account deleted successfully' };
  }
}
