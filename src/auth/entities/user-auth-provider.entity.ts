import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity({ name: 'user_auth_providers' })
@Unique('UQ_provider_provider_user', ['provider', 'providerUserId'])
@Index('IDX_user_auth_providers_user_id', ['userId'])
export class UserAuthProvider {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 32 })
  provider: string;

  @Column({ name: 'provider_user_id', type: 'varchar', length: 255 })
  providerUserId: string;

  @Column({
    name: 'provider_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  providerEmail: string | null;

  @Column({ name: 'linked_at', type: 'datetime', precision: 6 })
  linkedAt: Date;
}
