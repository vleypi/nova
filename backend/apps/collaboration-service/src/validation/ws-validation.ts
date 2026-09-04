export function validateBoardId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return 'Невалидный payload';
  const { boardId } = data as Record<string, unknown>;
  if (!boardId || typeof boardId !== 'string' || boardId.trim().length === 0) {
    return 'boardId обязателен';
  }
  return null;
}

export function validateCursorMove(data: unknown): string | null {
  const baseErr = validateBoardId(data);
  if (baseErr) return baseErr;
  const { x, y } = data as Record<string, unknown>;
  if (typeof x !== 'number' || typeof y !== 'number') {
    return 'x и y должны быть числами';
  }
  if (!isFinite(x) || !isFinite(y)) {
    return 'x и y должны быть конечными числами';
  }
  return null;
}

export function validateElementCreate(data: unknown): string | null {
  const baseErr = validateBoardId(data);
  if (baseErr) return baseErr;
  const { element } = data as Record<string, unknown>;
  if (!element || typeof element !== 'object') {
    return 'element обязателен';
  }
  const el = element as Record<string, unknown>;
  const { type } = el;
  if (!type || typeof type !== 'string') {
    return 'element.type обязателен';
  }
  if (type === 'image') {
    if (typeof el.width !== 'number' || el.width <= 0) return 'element.width обязателен';
    if (typeof el.height !== 'number' || el.height <= 0) return 'element.height обязателен';
    if (typeof el.mime !== 'string') return 'element.mime обязателен';
    if (typeof el.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(el.sha256)) {
      return 'element.sha256 должен быть 64 hex-символа';
    }
    if (el.status !== 'pending' && el.status !== 'ready' && el.status !== 'failed') {
      return 'element.status должен быть pending|ready|failed';
    }
  }
  if (type === 'sticky') {
    if (typeof el.x !== 'number' || typeof el.y !== 'number') {
      return 'element.x и element.y обязательны';
    }
    if (typeof el.width !== 'number' || el.width < 40) {
      return 'element.width должен быть >= 40';
    }
    if (typeof el.height !== 'number' || el.height < 40) {
      return 'element.height должен быть >= 40';
    }
    if (typeof el.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(el.color)) {
      return 'element.color должен быть hex6';
    }
    if (typeof el.text !== 'string' || el.text.length > 50000) {
      return 'element.text обязателен (<= 50000 символов)';
    }
    if (typeof el.html !== 'string' || el.html.length > 50000) {
      return 'element.html обязателен (<= 50000 символов)';
    }
    if (typeof el.fontSize !== 'number' || el.fontSize < 8 || el.fontSize > 96) {
      return 'element.fontSize должен быть в диапазоне 8..96';
    }
    if (typeof el.autoFontSize !== 'boolean') {
      return 'element.autoFontSize должен быть boolean';
    }
    if (el.textAlign !== 'left' && el.textAlign !== 'center' && el.textAlign !== 'right') {
      return 'element.textAlign должен быть left|center|right';
    }
  }
  return null;
}

export function validateElementUpdate(data: unknown): string | null {
  const baseErr = validateBoardId(data);
  if (baseErr) return baseErr;
  const { elementId, patch } = data as Record<string, unknown>;
  if (!elementId || typeof elementId !== 'string') {
    return 'elementId обязателен';
  }
  if (!patch || typeof patch !== 'object') {
    return 'patch обязателен';
  }
  return null;
}

export function validateElementDelete(data: unknown): string | null {
  const baseErr = validateBoardId(data);
  if (baseErr) return baseErr;
  const { elementIds } = data as Record<string, unknown>;
  if (!Array.isArray(elementIds) || elementIds.length === 0) {
    return 'elementIds должен быть непустым массивом';
  }
  if (!elementIds.every((id) => typeof id === 'string' && id.trim().length > 0)) {
    return 'Все elementIds должны быть непустыми строками';
  }
  return null;
}

export function validateDrawingChunk(data: unknown): string | null {
  const baseErr = validateBoardId(data);
  if (baseErr) return baseErr;
  const { elementId, points, color, width } = data as Record<string, unknown>;
  if (!elementId || typeof elementId !== 'string') return 'elementId обязателен';
  if (!Array.isArray(points)) return 'points должен быть массивом';
  if (typeof color !== 'string') return 'color обязателен';
  if (typeof width !== 'number' || !isFinite(width) || width <= 0) return 'width должен быть положительным числом';
  return null;
}
