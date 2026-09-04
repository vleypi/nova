import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Space } from './entities/space.entity';
import { SpaceMember } from './entities/space-member.entity';
import { Board } from './entities/board.entity';
import { Favorite } from './entities/favorite.entity';
import { CanvasElement } from './entities/canvas-element.entity';
import { SpacesService } from './spaces.service';
import { BoardsService } from './boards.service';
import { BoardsController } from './boards.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Space, SpaceMember, Board, Favorite, CanvasElement]),
  ],
  controllers: [BoardsController],
  providers: [SpacesService, BoardsService],
  exports: [SpacesService, BoardsService],
})
export class BoardsModule {}
