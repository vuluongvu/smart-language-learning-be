import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LearningPathTrack } from './learning-path-track.entity.js';

@Entity({ name: 'learning_path_parts' })
export class LearningPathPart {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'track_id', type: 'int' })
  trackId: number;

  @ManyToOne(() => LearningPathTrack, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track: LearningPathTrack;

  @Column({ name: 'part_number', type: 'int' })
  partNumber: number;

  @Column({ type: 'varchar', length: 120 })
  title: string;

  @Column({ type: 'varchar', length: 255 })
  subtitle: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
