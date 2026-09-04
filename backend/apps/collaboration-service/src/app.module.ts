import { Module } from '@nestjs/common';
import { CollaborationModule } from './collaboration/collaboration.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [CollaborationModule, AiModule],
})
export class AppModule {}
