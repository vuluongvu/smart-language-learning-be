import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity({ name: 'refresh_sessions' })
@Index('IDX_refresh_sessions_user_id', ['userId'])
export class RefreshSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'token_hash', type: 'varchar', length: 128, unique: true })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'datetime', precision: 6 })
  expiresAt: Date;

  @Column({
    name: 'revoked_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
