import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { CollaborationService } from './collaboration.service';
import { CollaborationGateway } from './collaboration.gateway';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';

@Controller('internal')
@UseGuards(InternalApiKeyGuard)
export class CollabAdminController {
  constructor(
    private readonly collaborationService: CollaborationService,
    private readonly collaborationGateway: CollaborationGateway,
  ) {}

  @Get('online')
  async getOnline() {
    const boards = await this.collaborationService.getAllOnlineBoards();
    const uniqueUsers = new Set(boards.flatMap((b) => b.users.map((u) => u.id)));
    return {
      totalOnlineUsers:  uniqueUsers.size,
      totalOnlineBoards: boards.length,
      boards,
    };
  }

  @Post('disconnect/:userId')
  async disconnectUser(@Param('userId') userId: string) {
    const count = await this.collaborationGateway.disconnectUser(userId);
    return { success: true, disconnectedSockets: count };
  }

  @Post('broadcast')
  async broadcast(@Body() body: { message: string; type?: string }) {
    this.collaborationGateway.broadcastAll(body.message, body.type ?? 'info');
    return { success: true };
  }

  @Get('health')
  async health() {
    try {
      await this.collaborationService.getAllOnlineBoards();
      return { status: 'ok', redis: 'ok' };
    } catch {
      return { status: 'error', redis: 'error' };
    }
  }
}
