import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../common/enums/role.enum.js';
import { Exclude } from 'class-transformer';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Exclude()
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  passwordHash: string | null;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 64, default: 'UTC' })
  timezone: string;

  @Column({
    name: 'is_leaderboard_visible',
    type: 'boolean',
    default: true,
  })
  isLeaderboardVisible: boolean;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
