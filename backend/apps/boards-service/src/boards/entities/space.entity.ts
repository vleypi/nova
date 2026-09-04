import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import { SpaceMember } from './space-member.entity';
import { Board } from './board.entity';
import { generateShortId } from '@app/common';

@Entity('spaces')
export class Space {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = generateShortId();
  }

  @Column()
  name: string;

  @Column()
  ownerId: string;

  @Column({ unique: true })
  inviteCode: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => SpaceMember, (m) => m.space)
  members: SpaceMember[];

  @OneToMany(() => Board, (b) => b.space)
  boards: Board[];
}
