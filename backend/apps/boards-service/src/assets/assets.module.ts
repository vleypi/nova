import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './asset.entity';
import { AssetsService, BOARD_ACCESS_CHECKER } from './assets.service';
import { minioProviders } from './minio.provider';
import { BoardAccessAdapter } from './board-access.adapter';
import { AssetsController } from './assets.controller';
import { BoardsModule } from '../boards/boards.module';

@Module({
  imports: [TypeOrmModule.forFeature([Asset]), BoardsModule],
  controllers: [AssetsController],
  providers: [
    AssetsService,
    BoardAccessAdapter,
    { provide: BOARD_ACCESS_CHECKER, useExisting: BoardAccessAdapter },
    ...minioProviders,
  ],
  exports: [AssetsService],
})
export class AssetsModule {}
