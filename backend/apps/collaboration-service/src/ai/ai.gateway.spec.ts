import { Test, TestingModule } from '@nestjs/testing';
import { AiGateway } from './ai.gateway';
import { AiService } from './ai.service';
import { CollaborationService } from '../collaboration/collaboration.service';

const mockClient = () => {
  const emitted: Array<{ event: string; payload: unknown }> = [];
  return {
    id:    'sock-1',
    data:  { user: { id: 'user-1' } },
    emit:  (event: string, payload: unknown) => { emitted.push({ event, payload }); return true; },
    _emitted: emitted,
  } as any;
};

describe('AiGateway slot validation', () => {
  let gateway: AiGateway;
  let aiService: jest.Mocked<Partial<AiService>>;
  let collab:    jest.Mocked<Partial<CollaborationService>>;
  let module: TestingModule;

  beforeEach(async () => {
    aiService = { chat: jest.fn().mockResolvedValue({ txId: 'tx-1', ok: true }) } as any;
    collab    = {
      getBoardUsers: jest.fn().mockResolvedValue([{ id: 'user-1', email: '', name: '', avatar: '' }]),
    } as any;

    module = await Test.createTestingModule({
      providers: [
        AiGateway,
        { provide: AiService,            useValue: aiService },
        { provide: CollaborationService, useValue: collab },
      ],
    }).compile();

    gateway = module.get(AiGateway);
    // Stub the @WebSocketServer reference so forwardChunk room broadcasts don't crash.
    (gateway as any).server = { to: () => ({ emit: jest.fn() }) };
  });

  afterEach(async () => { await module.close(); });

  it('rejects payload with more than AI_MAX_CONTEXT_SLOTS slots', async () => {
    const client = mockClient();
    const slots = Array.from({ length: 11 }, (_, i) => ({ slotId: `s${i}`, elementIds: ['e1'] }));
    await gateway.handleAiMessage(client, {
      boardId: 'b-1', message: 'hi', contextSlots: slots,
    } as any);
    const err = client._emitted.find((e: any) => e.event === 'ai:error');
    expect(err).toBeDefined();
    expect((err!.payload as any).code).toBe('validation');
    expect(aiService.chat).not.toHaveBeenCalled();
  });

  it('rejects a slot with 0 elements', async () => {
    const client = mockClient();
    await gateway.handleAiMessage(client, {
      boardId: 'b-1', message: 'hi',
      contextSlots: [{ slotId: 's1', elementIds: [] }],
    } as any);
    expect(client._emitted.some((e: any) => e.event === 'ai:error' && (e.payload as any).code === 'validation')).toBe(true);
    expect(aiService.chat).not.toHaveBeenCalled();
  });

  it('rejects a slot with more than AI_MAX_ELEMENTS_PER_SLOT elements', async () => {
    const client = mockClient();
    const big = Array.from({ length: 101 }, (_, i) => `e${i}`);
    await gateway.handleAiMessage(client, {
      boardId: 'b-1', message: 'hi',
      contextSlots: [{ slotId: 's1', elementIds: big }],
    } as any);
    expect(client._emitted.some((e: any) => e.event === 'ai:error' && (e.payload as any).code === 'validation')).toBe(true);
    expect(aiService.chat).not.toHaveBeenCalled();
  });

  it('passes valid contextSlots to aiService.chat', async () => {
    const client = mockClient();
    await gateway.handleAiMessage(client, {
      boardId: 'b-1', message: 'hi',
      contextSlots: [{ slotId: 's1', elementIds: ['e1', 'e2'] }],
    } as any);
    expect(aiService.chat).toHaveBeenCalledTimes(1);
    const callArgs = (aiService.chat as jest.Mock).mock.calls[0];
    // chat(boardId, userId, message, history, viewportHint, contextSlots, onChunk)
    expect(callArgs[5]).toEqual([{ slotId: 's1', elementIds: ['e1', 'e2'] }]);
  });
});
