import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'learning_path_tracks' })
export class LearningPathTrack {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 32, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 80 })
  title: string;

  @Column({ name: 'cefr_level', type: 'varchar', length: 16 })
  cefrLevel: string;

  @Column({ name: 'language_code', type: 'varchar', length: 16, default: 'en' })
  languageCode: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
