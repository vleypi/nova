import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { CollaborationService, CanvasElementState } from '../collaboration/collaboration.service';

const makeElement = (overrides: Partial<CanvasElementState> = {}): CanvasElementState => ({
  id:        'el-1',
  type:      'text',
  userId:    'user-1',
  boardId:   'board-1',
  createdAt: 1_700_000_000_000,
  ...overrides,
});

describe('AiService', () => {
  let service: AiService;
  let collab: jest.Mocked<Partial<CollaborationService>>;
  let module: TestingModule;

  beforeEach(async () => {
    collab = {
      getBoardElements: jest.fn().mockResolvedValue([]),
      createElement:    jest.fn(),
      updateElement:    jest.fn(),
      deleteElements:   jest.fn(),
      getBoardUsers:    jest.fn(),
    } as any;

    module = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: CollaborationService, useValue: collab },
      ],
    }).compile();

    service = module.get(AiService);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await module.close();
  });

  it('is instantiable', () => {
    expect(service).toBeDefined();
  });

  describe('executeUpdateElement', () => {
    it('rejects forbidden fields (id/type/userId/boardId/createdAt/aiTransactionId/x/y)', async () => {
      const args = JSON.stringify({ elementId: 'el-1', fields: { x: 100 } });
      const result = await (service as any).executeUpdateElement('board-1', 'tx-1', args);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/x/i);
      expect(collab.updateElement).not.toHaveBeenCalled();
    });

    it('rejects empty fields object', async () => {
      const args = JSON.stringify({ elementId: 'el-1', fields: {} });
      const result = await (service as any).executeUpdateElement('board-1', 'tx-1', args);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/fields/i);
    });

    it('rejects more than 20 fields', async () => {
      const fields: Record<string, number> = {};
      for (let i = 0; i < 21; i++) fields[`k${i}`] = i;
      const args = JSON.stringify({ elementId: 'el-1', fields });
      const result = await (service as any).executeUpdateElement('board-1', 'tx-1', args);
      expect(result.success).toBe(false);
    });

    it('rejects when element does not exist (updateElement returns null)', async () => {
      (collab.updateElement as jest.Mock).mockResolvedValueOnce(null);
      const args = JSON.stringify({ elementId: 'missing', fields: { text: 'hi' } });
      const result = await (service as any).executeUpdateElement('board-1', 'tx-1', args);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });

    it('sanitizes html field through sanitizeRichTextHtml', async () => {
      (collab.getBoardElements as jest.Mock).mockResolvedValueOnce([makeElement({ id: 'el-1' })]);
      (collab.updateElement as jest.Mock).mockResolvedValueOnce(makeElement());
      const args = JSON.stringify({
        elementId: 'el-1',
        fields:    { html: '<script>alert(1)</script><div>ok</div>' },
      });
      await (service as any).executeUpdateElement('board-1', 'tx-1', args);
      const call = (collab.updateElement as jest.Mock).mock.calls[0];
      const patchedHtml = (call[2] as any).html;
      expect(patchedHtml).not.toMatch(/script/);
      expect(patchedHtml).toMatch(/<div>ok<\/div>/);
    });

    it('succeeds on valid update and returns elementId', async () => {
      (collab.getBoardElements as jest.Mock).mockResolvedValueOnce([makeElement({ id: 'el-1' })]);
      (collab.updateElement as jest.Mock).mockResolvedValueOnce(makeElement({ id: 'el-1' }));
      const args = JSON.stringify({ elementId: 'el-1', fields: { text: 'hello' } });
      const result = await (service as any).executeUpdateElement('board-1', 'tx-1', args);
      expect(result.success).toBe(true);
      expect(result.elementId).toBe('el-1');
      expect(collab.updateElement).toHaveBeenCalledWith('board-1', 'el-1', { text: 'hello' });
    });

    it('retargets to the single attached element when the model hallucinates an id', async () => {
      (collab.getBoardElements as jest.Mock).mockResolvedValueOnce([makeElement({ id: 'real-uuid' })]);
      (collab.updateElement as jest.Mock).mockResolvedValueOnce(makeElement({ id: 'real-uuid' }));
      const args = JSON.stringify({ elementId: 'mindmap-root-python', fields: { text: 'hi' } });
      const result = await (service as any).executeUpdateElement('board-1', 'tx-1', args, ['real-uuid']);
      expect(result.success).toBe(true);
      expect(result.elementId).toBe('real-uuid');
      expect(collab.updateElement).toHaveBeenCalledWith('board-1', 'real-uuid', { text: 'hi' });
    });

    it('does NOT retarget when more than one element is attached (ambiguous)', async () => {
      (collab.getBoardElements as jest.Mock).mockResolvedValueOnce([makeElement({ id: 'a' }), makeElement({ id: 'b' })]);
      const args = JSON.stringify({ elementId: 'made-up', fields: { text: 'hi' } });
      const result = await (service as any).executeUpdateElement('board-1', 'tx-1', args, ['a', 'b']);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
      expect(collab.updateElement).not.toHaveBeenCalled();
    });

    it('translates color → html <span> for shape (shapes have no text-color field)', async () => {
      (collab.getBoardElements as jest.Mock).mockResolvedValueOnce([
        makeElement({ id: 'sh-1', type: 'shape', text: 'Узел' } as Partial<CanvasElementState>),
      ]);
      (collab.updateElement as jest.Mock).mockResolvedValueOnce(
        makeElement({ id: 'sh-1', type: 'shape' } as Partial<CanvasElementState>),
      );
      const args = JSON.stringify({ elementId: 'sh-1', fields: { color: '#2563eb' } });
      const result = await (service as any).executeUpdateElement('board-1', 'tx-1', args);
      expect(result.success).toBe(true);
      const patch = (collab.updateElement as jest.Mock).mock.calls[0][2] as Record<string, unknown>;
      expect(patch.color).toBeUndefined();
      expect(patch.html).toMatch(/color:#2563eb/);
      expect(patch.html).toMatch(/Узел/);
    });

    it('accepts fields passed FLAT at top level (fixes empty-fields tool bug)', async () => {
      (collab.getBoardElements as jest.Mock).mockResolvedValueOnce([
        makeElement({ id: 'el-1', type: 'shape' } as Partial<CanvasElementState>),
      ]);
      (collab.updateElement as jest.Mock).mockResolvedValueOnce(
        makeElement({ id: 'el-1', type: 'shape' } as Partial<CanvasElementState>),
      );
      // No `fields` wrapper — fillColor passed directly, as the model now does.
      const args = JSON.stringify({ elementId: 'el-1', fillColor: '#EF4444' });
      const result = await (service as any).executeUpdateElement('board-1', 'tx-1', args);
      expect(result.success).toBe(true);
      expect(collab.updateElement).toHaveBeenCalledWith('board-1', 'el-1', { fillColor: '#EF4444' });
    });

    it('merges flat fields and nested fields object together', async () => {
      (collab.getBoardElements as jest.Mock).mockResolvedValueOnce([
        makeElement({ id: 'el-1', type: 'shape' } as Partial<CanvasElementState>),
      ]);
      (collab.updateElement as jest.Mock).mockResolvedValueOnce(
        makeElement({ id: 'el-1', type: 'shape' } as Partial<CanvasElementState>),
      );
      const args = JSON.stringify({ elementId: 'el-1', fillColor: '#EF4444', fields: { strokeWidth: 3 } });
      const result = await (service as any).executeUpdateElement('board-1', 'tx-1', args);
      expect(result.success).toBe(true);
      expect(collab.updateElement).toHaveBeenCalledWith('board-1', 'el-1', { fillColor: '#EF4444', strokeWidth: 3 });
    });

    it('errors clearly when no editable fields are provided at all', async () => {
      const args = JSON.stringify({ elementId: 'el-1' });
      const result = await (service as any).executeUpdateElement('board-1', 'tx-1', args);
      expect(result.success).toBe(false);
      expect(collab.updateElement).not.toHaveBeenCalled();
    });
  });

  describe('executeMoveElement', () => {
    it('rejects when element is a connector', async () => {
      (collab.getBoardElements as jest.Mock).mockResolvedValueOnce([
        makeElement({ id: 'c-1', type: 'connector' }),
      ]);
      const args = JSON.stringify({ elementId: 'c-1', x: 100, y: 200 });
      const result = await (service as any).executeMoveElement('board-1', 'tx-1', args);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/connector/i);
      expect(collab.updateElement).not.toHaveBeenCalled();
    });

    it('rejects when x or y is out of board bounds', async () => {
      (collab.getBoardElements as jest.Mock).mockResolvedValueOnce([makeElement({ id: 'el-1' })]);
      const result1 = await (service as any).executeMoveElement(
        'board-1', 'tx-1', JSON.stringify({ elementId: 'el-1', x: -1, y: 0 }),
      );
      expect(result1.success).toBe(false);

      (collab.getBoardElements as jest.Mock).mockResolvedValueOnce([makeElement({ id: 'el-1' })]);
      const result2 = await (service as any).executeMoveElement(
        'board-1', 'tx-1', JSON.stringify({ elementId: 'el-1', x: 0, y: 65_001 }),
      );
      expect(result2.success).toBe(false);
    });

    it('rejects when element does not exist', async () => {
      (collab.getBoardElements as jest.Mock).mockResolvedValueOnce([]);
      const args = JSON.stringify({ elementId: 'missing', x: 10, y: 20 });
      const result = await (service as any).executeMoveElement('board-1', 'tx-1', args);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });

    it('succeeds on valid move and calls updateElement with x/y patch', async () => {
      (collab.getBoardElements as jest.Mock).mockResolvedValueOnce([
        makeElement({ id: 'el-1', type: 'shape' }),
      ]);
      (collab.updateElement as jest.Mock).mockResolvedValueOnce(makeElement({ id: 'el-1' }));
      const args = JSON.stringify({ elementId: 'el-1', x: 500, y: 300 });
      const result = await (service as any).executeMoveElement('board-1', 'tx-1', args);
      expect(result.success).toBe(true);
      expect(collab.updateElement).toHaveBeenCalledWith('board-1', 'el-1', { x: 500, y: 300 });
    });
  });

  describe('executeDeleteElement', () => {
    it('rejects when element does not exist', async () => {
      (collab.getBoardElements as jest.Mock).mockResolvedValueOnce([]);
      const args = JSON.stringify({ elementId: 'missing' });
      const result = await (service as any).executeDeleteElement('board-1', 'tx-1', args);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });

    it('deletes a single element with no incoming connectors', async () => {
      (collab.getBoardElements as jest.Mock).mockResolvedValueOnce([
        makeElement({ id: 'el-1', type: 'shape' }),
      ]);
      const args = JSON.stringify({ elementId: 'el-1' });
      const result = await (service as any).executeDeleteElement('board-1', 'tx-1', args);
      expect(result.success).toBe(true);
      expect(result.deleted).toEqual(['el-1']);
      expect(collab.deleteElements).toHaveBeenCalledWith('board-1', ['el-1']);
    });

    it('cascades to connectors that reference the target (start or end)', async () => {
      (collab.getBoardElements as jest.Mock).mockResolvedValueOnce([
        makeElement({ id: 'node', type: 'shape' }),
        makeElement({ id: 'c-1', type: 'connector', start: { elementId: 'node', side: 'top' }, end: { elementId: 'x', side: 'top' } }),
        makeElement({ id: 'c-2', type: 'connector', start: { elementId: 'y', side: 'top' }, end: { elementId: 'node', side: 'bottom' } }),
        makeElement({ id: 'unrelated', type: 'shape' }),
      ]);
      const args = JSON.stringify({ elementId: 'node' });
      const result = await (service as any).executeDeleteElement('board-1', 'tx-1', args);
      expect(result.success).toBe(true);
      expect(new Set(result.deleted)).toEqual(new Set(['node', 'c-1', 'c-2']));
      const calledArg = (collab.deleteElements as jest.Mock).mock.calls[0][1];
      expect(new Set(calledArg)).toEqual(new Set(['node', 'c-1', 'c-2']));
    });
  });

  describe('buildDynamicContext with slots', () => {
    it('includes ПРИКРЕПЛЁННЫЕ ГРУППЫ block when slots are non-empty', () => {
      // exported via require since the function isn't exported by default
      const mod = require('./ai.service');
      const fn  = mod.__test_buildDynamicContext;
      const ctx = fn(
        [makeElement({ id: 'el-1' })],
        undefined,
        [{ slotId: 'slot-A', label: 'Заголовок', elements: [makeElement({ id: 'el-1', text: 'Hi' })] }],
      );
      expect(ctx).toMatch(/ПРИКРЕПЛЁННЫЕ ГРУППЫ/);
      expect(ctx).toMatch(/slot-A/);
      expect(ctx).toMatch(/Заголовок/);
      expect(ctx).toMatch(/el-1/);
    });

    it('omits ПРИКРЕПЛЁННЫЕ ГРУППЫ block when slots are empty or undefined', () => {
      const mod = require('./ai.service');
      const fn  = mod.__test_buildDynamicContext;
      const ctxA = fn([], undefined, []);
      const ctxB = fn([], undefined, undefined);
      expect(ctxA).not.toMatch(/ПРИКРЕПЛЁННЫЕ ГРУППЫ/);
      expect(ctxB).not.toMatch(/ПРИКРЕПЛЁННЫЕ ГРУППЫ/);
    });

    it('truncates per-slot JSON to 4000 chars', () => {
      const mod = require('./ai.service');
      const fn  = mod.__test_buildDynamicContext;
      const bigText = 'x'.repeat(10_000);
      const ctx = fn(
        [],
        undefined,
        [{ slotId: 'big', elements: [makeElement({ id: 'el-1', text: bigText })] }],
      );
      // The per-slot JSON line should be capped well below 10_000 chars.
      const slotLine = ctx.split('\n').find((l: string) => l.includes('Слот 1'));
      expect(slotLine).toBeDefined();
      expect(slotLine!.length).toBeLessThan(5000);
    });
  });

  describe('sanitizeChatHistory', () => {
    const fn = () => require('./ai.service').__test_sanitizeChatHistory;

    it('coalesces consecutive same-role messages (prevents Anthropic 400)', () => {
      const out = fn()([
        { role: 'user', content: 'сделай зелёным' }, // assistant-ход без текста был пропущен фронтом
        { role: 'user', content: 'теперь синим' },
      ]);
      expect(out).toHaveLength(1);
      expect(out[0].role).toBe('user');
      expect(out[0].content).toMatch(/сделай зелёным/);
      expect(out[0].content).toMatch(/теперь синим/);
    });

    it('drops empty/whitespace and non-user/assistant messages', () => {
      const out = fn()([
        { role: 'user', content: '  ' },
        { role: 'system', content: 'x' },
        { role: 'user', content: 'привет' },
        { role: 'assistant', content: 'здравствуйте' },
      ]);
      expect(out).toEqual([
        { role: 'user', content: 'привет' },
        { role: 'assistant', content: 'здравствуйте' },
      ]);
    });

    it('trims leading assistant messages (first must be user)', () => {
      const out = fn()([
        { role: 'assistant', content: 'я ассистент' },
        { role: 'user', content: 'окей' },
      ]);
      expect(out).toHaveLength(1);
      expect(out[0].role).toBe('user');
    });

    it('keeps a normal alternating history intact', () => {
      const input = [
        { role: 'user', content: 'a' },
        { role: 'assistant', content: 'b' },
        { role: 'user', content: 'c' },
      ];
      expect(fn()(input)).toEqual(input);
    });
  });

  describe('buildAttachedElementsPreamble', () => {
    const fn = () => require('./ai.service').__test_buildAttachedElementsPreamble;

    it('lists attached element ids inline with an explicit instruction', () => {
      const out = fn()([
        {
          slotId: 's1',
          elements: [
            makeElement({ id: 'uuid-1', type: 'shape', text: 'Узел A' } as Partial<CanvasElementState>),
            makeElement({ id: 'uuid-2', type: 'shape', text: 'Узел B' } as Partial<CanvasElementState>),
          ],
          missingIds: [],
        },
      ]);
      expect(out).toMatch(/ПРИКРЕПЛЁННЫЕ ЭЛЕМЕНТЫ/);
      expect(out).toMatch(/uuid-1/);
      expect(out).toMatch(/uuid-2/);
      expect(out).toMatch(/НЕ переспрашивай/);
    });

    it('returns empty string when nothing is attached', () => {
      expect(fn()([])).toBe('');
      expect(fn()([{ slotId: 's', elements: [], missingIds: [] }])).toBe('');
    });

    it('warns when attached elements failed to load', () => {
      const out = fn()([{ slotId: 's', elements: [], missingIds: ['x', 'y'] }]);
      expect(out).toMatch(/не загрузились/i);
      expect(out).toMatch(/заново/i);
    });
  });
});
