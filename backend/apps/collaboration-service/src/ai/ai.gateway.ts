import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  AiService,
  ChatMessage,
  AiContextSlot,
  AiChunkEvent,
} from './ai.service';
import { CollaborationService } from '../collaboration/collaboration.service';
import { WsRateLimiter, WS_RATE_LIMITS } from '../guards/ws-rate-limiter';
import {
  CLIENT_URL,
  AI_MAX_CONTEXT_SLOTS,
  AI_MAX_ELEMENTS_PER_SLOT,
} from '@app/common';

interface AiMessagePayload {
  boardId:       string;
  message:       string;
  history?:      ChatMessage[];
  viewportHint?: { x: number; y: number; zoom: number; cx?: number; cy?: number; vw?: number; vh?: number };
  contextSlots?: AiContextSlot[];
}

@WebSocketGateway({
  cors: {
    origin:      CLIENT_URL,
    credentials: true,
  },
})
export class AiGateway {
  @WebSocketServer()
  server!: Server;

  private readonly rateLimiter = new WsRateLimiter();

  constructor(
    private readonly aiService:            AiService,
    private readonly collaborationService: CollaborationService,
  ) {}

  @SubscribeMessage('ai:message')
  async handleAiMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()     data:   AiMessagePayload,
  ): Promise<void> {
    const user = (client.data as { user?: { id: string } }).user;

    if (!user?.id) {
      client.emit('ai:error', { code: 'unauthorized', message: 'Не авторизован' });
      return;
    }
    if (!data?.boardId || !data?.message?.trim()) {
      client.emit('ai:error', { code: 'validation', message: 'boardId и message обязательны' });
      return;
    }

    const limit = WS_RATE_LIMITS['ai:message'];
    if (limit && !this.rateLimiter.allow(client.id, 'ai:message', limit[0], limit[1])) {
      client.emit('ai:error', { code: 'rate_limit', message: 'Слишком много запросов к AI' });
      return;
    }

    const boardUsers = await this.collaborationService.getBoardUsers(data.boardId);
    if (!boardUsers.some((u) => u.id === user.id)) {
      client.emit('ai:error', { code: 'no_access', message: 'Нет доступа к доске' });
      return;
    }

    const slots = data.contextSlots ?? [];
    if (slots.length > AI_MAX_CONTEXT_SLOTS) {
      client.emit('ai:error', {
        code:    'validation',
        message: `Слотов больше ${AI_MAX_CONTEXT_SLOTS}`,
      });
      return;
    }
    for (const s of slots) {
      if (!s || typeof s.slotId !== 'string' || !Array.isArray(s.elementIds)) {
        client.emit('ai:error', { code: 'validation', message: 'Некорректный slot' });
        return;
      }
      if (s.elementIds.length === 0 || s.elementIds.length > AI_MAX_ELEMENTS_PER_SLOT) {
        client.emit('ai:error', {
          code:    'validation',
          message: `Слот должен содержать от 1 до ${AI_MAX_ELEMENTS_PER_SLOT} элементов`,
        });
        return;
      }
      if (s.elements !== undefined &&
          (!Array.isArray(s.elements) || s.elements.length > AI_MAX_ELEMENTS_PER_SLOT)) {
        client.emit('ai:error', { code: 'validation', message: 'Некорректный snapshot слота' });
        return;
      }
    }

    await this.aiService.chat(
      data.boardId,
      user.id,
      data.message.trim(),
      data.history ?? [],
      data.viewportHint,
      slots,
      (event) => this.forwardChunk(client, data.boardId, event),
    );
  }

  private forwardChunk(client: Socket, boardId: string, event: AiChunkEvent): void {
    const room = `board:${boardId}`;

    switch (event.type) {
      case 'text':
        client.emit('ai:chunk:text', { txId: event.txId, delta: event.delta });
        return;

      case 'element': {
        client.emit('ai:chunk:element', {
          txId:      event.txId,
          step:      event.step,
          op:        event.op,
          element:   event.element,
          elementId: event.elementId,
          patch:     event.patch,
          failure:   event.failure,
        });
        if (event.op === 'create' && event.element) {
          this.server.to(room).emit('element:created', { element: event.element });
        } else if ((event.op === 'update' || event.op === 'move') && event.elementId) {
          this.server.to(room).emit('element:updated', {
            elementId: event.elementId,
            patch:     event.patch ?? {},
          });
        } else if (event.op === 'delete' && event.elementId) {
          this.server.to(room).emit('element:deleted', { elementIds: [event.elementId] });
        }
        return;
      }

      case 'tool_failed':
        client.emit('ai:chunk:tool_failed', event);
        return;

      case 'done':
        client.emit('ai:done', event);
        return;
    }
  }
}
