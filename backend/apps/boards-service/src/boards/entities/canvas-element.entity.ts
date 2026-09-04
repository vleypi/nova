import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ElementType, ElementData } from '@app/common';
import { Board } from './board.entity';

@Entity('canvas_elements')
export class CanvasElement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  boardId: string;

  @Column({ type: 'varchar' })
  type: ElementType;

  @Column({ type: 'float', default: 0 })
  x: number;

  @Column({ type: 'float', default: 0 })
  y: number;

  @Column({ type: 'float', default: 100 })
  width: number;

  @Column({ type: 'float', default: 100 })
  height: number;

  @Column({ type: 'float', default: 0 })
  rotation: number;

  @Column({ type: 'int', default: 0 })
  zIndex: number;

  @Column({ type: 'float', default: 1 })
  opacity: number;

  @Column({ type: 'simple-json' })
  data: ElementData;

  @Column({ default: false })
  isLocked: boolean;

  @Column()
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Board, (b) => b.elements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boardId' })
  board: Board;
}
