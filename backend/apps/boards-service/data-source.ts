import * as dotenv from 'dotenv';
dotenv.config({ override: true });
import { DataSource } from 'typeorm';
import { Space } from './src/boards/entities/space.entity';
import { SpaceMember } from './src/boards/entities/space-member.entity';
import { Board } from './src/boards/entities/board.entity';
import { Favorite } from './src/boards/entities/favorite.entity';
import { CanvasElement } from './src/boards/entities/canvas-element.entity';
import { Asset } from './src/assets/asset.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: parseInt(process.env.POSTGRES_PORT ?? '5432'),
  username: process.env.POSTGRES_USER ?? 'nova',
  password: process.env.POSTGRES_PASSWORD ?? 'nova_secret',
  database: process.env.POSTGRES_BOARDS_DB ?? 'nova_boards',
  entities: [Space, SpaceMember, Board, Favorite, CanvasElement, Asset],
  migrations: ['apps/boards-service/src/migrations/*.ts'],
});
