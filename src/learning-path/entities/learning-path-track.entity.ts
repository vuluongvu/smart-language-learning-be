import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'learning_path_tracks' })
export class LearningPathTrack {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 48, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 80 })
  title: string;

  @Column({ name: 'cefr_level', type: 'varchar', length: 16 })
  cefrLevel: string;

  @Column({ name: 'language_code', type: 'varchar', length: 16, default: 'en' })
  languageCode: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ name: 'owner_user_id', type: 'int', nullable: true })
  ownerUserId: number | null;

  @Column({ name: 'is_ai_generated', type: 'boolean', default: false })
  isAiGenerated: boolean;

  @Column({ name: 'source_prompt', type: 'text', nullable: true })
  sourcePrompt: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
