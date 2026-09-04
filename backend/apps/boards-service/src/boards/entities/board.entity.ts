import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
} from 'typeorm';
import { Space } from './space.entity';
import { CanvasElement } from './canvas-element.entity';
import { generateShortId } from '@app/common';

@Entity('boards')
export class Board {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = generateShortId();
  }

  @Column({ default: 'Untitled board' })
  name: string;

  @Column()
  spaceId: string;

  @Column()
  createdBy: string;

  @Column({ default: false })
  isPrivate: boolean;

  @Column({ nullable: true })
  thumbnail: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Space, (s) => s.boards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spaceId' })
  space: Space;

  @OneToMany(() => CanvasElement, (el) => el.board)
  elements: CanvasElement[];
}
