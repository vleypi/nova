import {
  validateBoardId,
  validateCursorMove,
  validateElementCreate,
  validateElementUpdate,
  validateElementDelete,
  validateDrawingChunk,
} from './ws-validation';

describe('validateBoardId', () => {
  it.each([
    ['null payload', null],
    ['undefined payload', undefined],
    ['string payload', 'foo'],
    ['number payload', 42],
  ])('rejects %s with "Невалидный payload"', (_label, input) => {
    expect(validateBoardId(input)).toBe('Невалидный payload');
  });

  it.each([
    ['missing boardId', {}],
    ['non-string boardId', { boardId: 123 }],
    ['empty boardId', { boardId: '' }],
    ['whitespace-only boardId', { boardId: '   ' }],
  ])('rejects %s with "boardId обязателен"', (_label, input) => {
    expect(validateBoardId(input)).toBe('boardId обязателен');
  });

  it('accepts a non-empty boardId', () => {
    expect(validateBoardId({ boardId: 'board-1' })).toBeNull();
  });
});

describe('validateCursorMove', () => {
  it('propagates boardId error', () => {
    expect(validateCursorMove({})).toBe('boardId обязателен');
  });

  it.each([
    ['x missing', { boardId: 'b', y: 1 }],
    ['y missing', { boardId: 'b', x: 1 }],
    ['x is string', { boardId: 'b', x: '1', y: 1 }],
  ])('rejects %s', (_label, input) => {
    expect(validateCursorMove(input)).toBe('x и y должны быть числами');
  });

  it.each([
    ['x is NaN', { boardId: 'b', x: NaN, y: 1 }],
    ['x is Infinity', { boardId: 'b', x: Infinity, y: 1 }],
    ['y is -Infinity', { boardId: 'b', x: 0, y: -Infinity }],
  ])('rejects %s as non-finite', (_label, input) => {
    expect(validateCursorMove(input)).toBe('x и y должны быть конечными числами');
  });

  it('accepts a valid payload', () => {
    expect(validateCursorMove({ boardId: 'b', x: 10, y: 20 })).toBeNull();
  });
});

describe('validateElementCreate', () => {
  it('propagates boardId error', () => {
    expect(validateElementCreate({})).toBe('boardId обязателен');
  });

  it('rejects missing element', () => {
    expect(validateElementCreate({ boardId: 'b' })).toBe('element обязателен');
  });

  it('rejects element that is not an object', () => {
    expect(validateElementCreate({ boardId: 'b', element: 'foo' })).toBe('element обязателен');
  });

  it('rejects element without type', () => {
    expect(validateElementCreate({ boardId: 'b', element: {} })).toBe('element.type обязателен');
  });

  it('accepts an unknown element type without extra validation', () => {
    expect(validateElementCreate({ boardId: 'b', element: { type: 'rect' } })).toBeNull();
  });

  describe('image element', () => {
    const goodImage = {
      type: 'image',
      width: 100,
      height: 80,
      mime: 'image/png',
      sha256: 'a'.repeat(64),
      status: 'ready',
    };

    it('accepts a valid image element', () => {
      expect(validateElementCreate({ boardId: 'b', element: goodImage })).toBeNull();
    });

    it.each([
      ['width missing', { ...goodImage, width: undefined }, 'element.width обязателен'],
      ['width zero', { ...goodImage, width: 0 }, 'element.width обязателен'],
      ['height negative', { ...goodImage, height: -1 }, 'element.height обязателен'],
      ['mime non-string', { ...goodImage, mime: 123 }, 'element.mime обязателен'],
      ['sha256 wrong length', { ...goodImage, sha256: 'abc' }, 'element.sha256 должен быть 64 hex-символа'],
      ['sha256 uppercase', { ...goodImage, sha256: 'A'.repeat(64) }, 'element.sha256 должен быть 64 hex-символа'],
      ['invalid status', { ...goodImage, status: 'done' }, 'element.status должен быть pending|ready|failed'],
    ])('rejects %s', (_label, element, expected) => {
      expect(validateElementCreate({ boardId: 'b', element })).toBe(expected);
    });
  });

  describe('sticky element', () => {
    const goodSticky = {
      type: 'sticky',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      color: '#ffcc00',
      text: 'hello',
      html: '<p>hello</p>',
      fontSize: 16,
      autoFontSize: false,
      textAlign: 'left',
    };

    it('accepts a valid sticky', () => {
      expect(validateElementCreate({ boardId: 'b', element: goodSticky })).toBeNull();
    });

    it.each([
      ['x missing', { ...goodSticky, x: undefined }, 'element.x и element.y обязательны'],
      ['width below 40', { ...goodSticky, width: 39 }, 'element.width должен быть >= 40'],
      ['height below 40', { ...goodSticky, height: 10 }, 'element.height должен быть >= 40'],
      ['color not hex6', { ...goodSticky, color: 'red' }, 'element.color должен быть hex6'],
      ['color 3-digit hex', { ...goodSticky, color: '#fc0' }, 'element.color должен быть hex6'],
      ['text too long', { ...goodSticky, text: 'a'.repeat(50_001) }, 'element.text обязателен (<= 50000 символов)'],
      ['html too long', { ...goodSticky, html: 'a'.repeat(50_001) }, 'element.html обязателен (<= 50000 символов)'],
      ['fontSize below 8', { ...goodSticky, fontSize: 7 }, 'element.fontSize должен быть в диапазоне 8..96'],
      ['fontSize above 96', { ...goodSticky, fontSize: 200 }, 'element.fontSize должен быть в диапазоне 8..96'],
      ['autoFontSize not boolean', { ...goodSticky, autoFontSize: 'yes' }, 'element.autoFontSize должен быть boolean'],
      ['textAlign invalid', { ...goodSticky, textAlign: 'justify' }, 'element.textAlign должен быть left|center|right'],
    ])('rejects %s', (_label, element, expected) => {
      expect(validateElementCreate({ boardId: 'b', element })).toBe(expected);
    });
  });
});

describe('validateElementUpdate', () => {
  it('propagates boardId error', () => {
    expect(validateElementUpdate({})).toBe('boardId обязателен');
  });

  it.each([
    ['missing elementId', { boardId: 'b', patch: {} }, 'elementId обязателен'],
    ['elementId not string', { boardId: 'b', elementId: 1, patch: {} }, 'elementId обязателен'],
    ['missing patch', { boardId: 'b', elementId: 'e1' }, 'patch обязателен'],
    ['patch is string', { boardId: 'b', elementId: 'e1', patch: 'x' }, 'patch обязателен'],
  ])('rejects %s', (_label, input, expected) => {
    expect(validateElementUpdate(input)).toBe(expected);
  });

  it('accepts a valid update', () => {
    expect(validateElementUpdate({ boardId: 'b', elementId: 'e1', patch: { color: '#fff' } })).toBeNull();
  });
});

describe('validateElementDelete', () => {
  it('propagates boardId error', () => {
    expect(validateElementDelete({})).toBe('boardId обязателен');
  });

  it.each([
    ['elementIds not array', { boardId: 'b', elementIds: 'e1' }, 'elementIds должен быть непустым массивом'],
    ['empty array', { boardId: 'b', elementIds: [] }, 'elementIds должен быть непустым массивом'],
  ])('rejects %s', (_label, input, expected) => {
    expect(validateElementDelete(input)).toBe(expected);
  });

  it.each([
    ['contains a number', { boardId: 'b', elementIds: ['ok', 42] }],
    ['contains an empty string', { boardId: 'b', elementIds: ['ok', ''] }],
    ['contains whitespace only', { boardId: 'b', elementIds: ['ok', '   '] }],
  ])('rejects when %s', (_label, input) => {
    expect(validateElementDelete(input)).toBe('Все elementIds должны быть непустыми строками');
  });

  it('accepts a valid id list', () => {
    expect(validateElementDelete({ boardId: 'b', elementIds: ['e1', 'e2'] })).toBeNull();
  });
});

describe('validateDrawingChunk', () => {
  const good = { boardId: 'b', elementId: 'e1', points: [{ x: 0, y: 0 }], color: '#000000', width: 2 };

  it('propagates boardId error', () => {
    expect(validateDrawingChunk({})).toBe('boardId обязателен');
  });

  it.each([
    ['missing elementId', { ...good, elementId: undefined }, 'elementId обязателен'],
    ['elementId not string', { ...good, elementId: 1 }, 'elementId обязателен'],
    ['points not array', { ...good, points: 'nope' }, 'points должен быть массивом'],
    ['color not string', { ...good, color: 0xff0000 }, 'color обязателен'],
    ['width zero', { ...good, width: 0 }, 'width должен быть положительным числом'],
    ['width negative', { ...good, width: -3 }, 'width должен быть положительным числом'],
    ['width Infinity', { ...good, width: Infinity }, 'width должен быть положительным числом'],
  ])('rejects %s', (_label, input, expected) => {
    expect(validateDrawingChunk(input)).toBe(expected);
  });

  it('accepts a valid chunk', () => {
    expect(validateDrawingChunk(good)).toBeNull();
  });

  it('accepts an empty points array (no minimum length is enforced)', () => {
    expect(validateDrawingChunk({ ...good, points: [] })).toBeNull();
  });
});
