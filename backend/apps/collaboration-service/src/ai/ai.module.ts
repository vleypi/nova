import { Module } from '@nestjs/common';
import { AiGateway } from './ai.gateway';
import { AiService } from './ai.service';
import { CollaborationModule } from '../collaboration/collaboration.module';

@Module({
  imports:   [CollaborationModule],
  providers: [AiGateway, AiService],
})
export class AiModule {}
