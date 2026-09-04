import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardsModule } from './boards/boards.module';
import { AssetsModule } from './assets/assets.module';
import { Space } from './boards/entities/space.entity';
import { SpaceMember } from './boards/entities/space-member.entity';
import { Board } from './boards/entities/board.entity';
import { Favorite } from './boards/entities/favorite.entity';
import { CanvasElement } from './boards/entities/canvas-element.entity';
import { Asset } from './assets/asset.entity';
import {
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_BOARDS_DB,
  isProduction,
} from '@app/common';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: POSTGRES_HOST,
      port: POSTGRES_PORT,
      username: POSTGRES_USER,
      password: POSTGRES_PASSWORD,
      database: POSTGRES_BOARDS_DB,
      entities: [Space, SpaceMember, Board, Favorite, CanvasElement, Asset],
      synchronize: !isProduction(),
      migrations: ['dist/apps/boards-service/migrations/*.js'],
      migrationsRun: isProduction(),
    }),
    BoardsModule,
    AssetsModule,
  ],
})
export class AppModule {}
