import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'languages' })
export class Language {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 16, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
