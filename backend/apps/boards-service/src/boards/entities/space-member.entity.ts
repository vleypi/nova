import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { SpaceRole } from '@app/common';
import { Space } from './space.entity';

@Entity('space_members')
@Unique(['spaceId', 'userId'])
export class SpaceMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  spaceId: string;

  @Column()
  userId: string;

  @Column({ type: 'varchar', default: SpaceRole.MEMBER })
  role: SpaceRole;

  @Column({ default: true })
  canCreateBoards: boolean;

  @Column({ default: true })
  canEditBoards: boolean;

  @Column({ default: true })
  canDraw: boolean;

  @Column({ default: true })
  canDeleteBoards: boolean;

  @CreateDateColumn()
  joinedAt: Date;

  @ManyToOne(() => Space, (s) => s.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spaceId' })
  space: Space;
}
