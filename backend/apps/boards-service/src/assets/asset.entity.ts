import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AssetStatus = 'pending' | 'ready';

@Entity('assets')
@Index(['spaceId', 'sha256'], { unique: true })
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64 })
  spaceId: string;

  @Column({ type: 'varchar', length: 64 })
  boardId: string;

  @Column({ type: 'uuid' })
  uploadedBy: string;

  @Column({ type: 'varchar', length: 512 })
  storageKey: string;

  @Column({ type: 'varchar', length: 64 })
  mime: string;

  @Column({ type: 'int' })
  sizeBytes: number;

  @Column({ type: 'int' })
  width: number;

  @Column({ type: 'int' })
  height: number;

  @Column({ type: 'char', length: 64 })
  sha256: string;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: AssetStatus;

  @CreateDateColumn()
  createdAt: Date;
}
