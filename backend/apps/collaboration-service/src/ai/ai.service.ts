import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { nanoid } from 'nanoid';
import { CollaborationService, CanvasElementState } from '../collaboration/collaboration.service';
import {
  AI_API_KEY,
  AI_AUTH_TOKEN,
  AI_BASE_URL,
  AI_MODEL,
  AI_TEMPERATURE,
  AI_MAX_OUTPUT_TOKENS,
  AI_THINKING,
  AI_EFFORT,
  AI_STREAM_TIMEOUT_MS,
} from '@app/common';



export type AiErrorCode = 'validation' | 'upstream' | 'timeout' | 'unknown';

export interface AiContextSlot {
  slotId:     string;
  label?:     string;
  elementIds: string[];
  elements?:  Array<Record<string, unknown>>;
}

export type AiChunkEvent =
  | { type: 'text';        txId: string; delta: string }
  | {
      type:       'element';
      txId:       string;
      step:       number;
      op:         'create' | 'update' | 'move' | 'delete';
      element?:   CanvasElementState;
      elementId?: string;
      patch?:     Record<string, unknown>;
      failure?:   string;
    }
  | { type: 'tool_failed'; txId: string; step: number; toolName: string; error: string }
  | {
      type:         'done';
      txId:         string;
      ok:           boolean;
      finalMessage: string;
      summary:      { created: number; updated: number; moved: number; deleted: number };
      error?:       { code: AiErrorCode; message: string };
    };


export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}


const TEXT_HTML_SCHEMA_DOC = `
Rich-text HTML schema (every line MUST be a top-level <div>):

  <div>plain line</div>
  <div><br></div>                                           — empty line
  <div data-li-type="bullet" data-li-level="0">item</div>   — bullet list item
  <div data-li-type="number" data-li-level="0">item</div>   — numbered list item
                                                              (numbering is auto-computed
                                                              for contiguous runs)

Inline formatting tags (place INSIDE <div>, they can be nested):
  <b>…</b>                                   bold
  <i>…</i>                                   italic
  <u>…</u>                                   underline
  <s>…</s>                                   strikethrough
  <a href="https://…">…</a>                  link (https:// only)
  <span style="color:#HEX">…</span>          text color
  <span style="background-color:#HEX">…</span> background highlight

RULES:
  • Every line of text MUST be wrapped in a <div>. No bare text at top level.
  • Lists: set data-li-type on the <div> (NOT <ul>/<ol> — those are ignored).
  • For empty lines, use <div><br></div> exactly.
  • Tags NOT in this list (h1, ul, p, table, img, script, style, etc.) are stripped.
  • on* event attributes and javascript: URLs are stripped.

Example (bullet list with mixed formatting):
  <div><b>Shopping list:</b></div>
  <div data-li-type="bullet" data-li-level="0">Milk</div>
  <div data-li-type="bullet" data-li-level="0"><span style="color:#ef4444">Red</span> apples</div>
  <div data-li-type="bullet" data-li-level="0"><u>Organic</u> bread</div>
`.trim();


type TAnchorSide = 'top' | 'right' | 'bottom' | 'left';
type TArrowEnd   = 'none' | 'arrow' | 'circle';


interface FunctionTool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

const TOOLS: FunctionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_text_element',
      description:
        'Create a text element on the canvas. Use when the user asks to WRITE, CREATE, ADD, or DISPLAY content on the board — single words, lists, code, notes, or a NODE of a mindmap/diagram. For formatted content (bold, colors, lists, links) include the `html` field. For simple single-line labels (mindmap nodes, titles) pass only `text`. Do NOT use for conversational replies or answers to questions.',
      parameters: {
        type: 'object',
        required: ['text', 'x', 'y'],
        properties: {
          text: {
            type: 'string',
            description:
              'Plain-text fallback / search representation. ALWAYS provide. Use \\n for line breaks in plain mode (e.g. "1. first\\n2. second"). When html is provided, this should be the stripped-text version of it.',
          },
          html: {
            type: 'string',
            description:
              'Optional formatted HTML in the canonical div-per-line schema documented in the system prompt. Required when the user wants bold/italic/underline/strikethrough, colors, highlighted text, bullet or numbered lists, or links. If omitted, text is rendered plain.',
          },
          x: {
            type: 'number',
            description: 'World-space X coordinate (left edge of the element).',
          },
          y: {
            type: 'number',
            description: 'World-space Y coordinate (top edge of the element).',
          },
          fontSize: {
            type: 'number',
            description: 'Font size in px. Default: 16. 14 for dense lists, 22–28 for titles and mindmap roots, 18–20 for mindmap branch nodes.',
          },
          color: {
            type: 'string',
            description: 'Base text color (CSS color). Default: #222. Per-run overrides come from inline <span style="color:…"> in html.',
          },
          textAlign: {
            type: 'string',
            enum: ['left', 'center', 'right'],
            description: 'Text alignment. Default: left. Use center for mindmap node labels and titles.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_connector',
      description:
        'Draw a Bezier arrow between two existing elements. MUST be called AFTER the two target elements have been created — pass the elementId values returned by previous create_text_element tool results. Use this for mindmap edges, flow diagrams, dependency arrows, call-graphs. A connector attaches to a SIDE (top/right/bottom/left) of each element — choose the sides that produce a visually clean, non-crossing path. Self-loops (start == end) are rejected.',
      parameters: {
        type: 'object',
        required: ['startElementId', 'startSide', 'endElementId', 'endSide'],
        properties: {
          startElementId: {
            type: 'string',
            description: 'ID of the source element (from a previous tool result or from the current canvas layout).',
          },
          startSide: {
            type: 'string',
            enum: ['top', 'right', 'bottom', 'left'],
            description: 'Which side of the source element the arrow leaves from.',
          },
          endElementId: {
            type: 'string',
            description: 'ID of the target element.',
          },
          endSide: {
            type: 'string',
            enum: ['top', 'right', 'bottom', 'left'],
            description: 'Which side of the target element the arrow enters.',
          },
          strokeColor: {
            type: 'string',
            description: 'Stroke color (CSS). Default: #222. Use a distinct color only if the user asked to color-code relationships.',
          },
          strokeWidth: {
            type: 'number',
            description: 'Stroke width in px. Default: 2. Use 3 for emphasis, 1.5 for fine tree structures.',
          },
          startArrow: {
            type: 'string',
            enum: ['none', 'arrow', 'circle'],
            description: 'Decoration at the start endpoint. Default: none.',
          },
          endArrow: {
            type: 'string',
            enum: ['none', 'arrow', 'circle'],
            description: 'Decoration at the end endpoint. Default: arrow. For undirected edges (e.g. associations in mindmaps with no clear direction) set to "none".',
          },
          curved: {
            type: 'boolean',
            description: 'true = smooth Bezier curve (recommended, default). false = straight line.',
          },
          label: {
            type: 'string',
            description: 'Optional short label for the edge (relationship name).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_shape',
      description:
        'Создать геометрическую фигуру (прямоугольник, эллипс, ромб, треугольник) с заливкой и опциональным текстом внутри. ИСПОЛЬЗУЙ ДЛЯ УЗЛОВ MINDMAP — каждый узел должен быть фигурой с цветом, а не голым текстом. Также для блок-схем (состояний, действий, решений), классов в UML, контейнеров. Текст автоматически центрируется внутри фигуры при autoFontSize=true.',
      parameters: {
        type: 'object',
        required: ['shapeKind', 'x', 'y', 'width', 'height'],
        properties: {
          shapeKind: {
            type: 'string',
            enum: ['rect', 'ellipse', 'diamond', 'triangle'],
            description:
              'Тип фигуры. rect — прямоугольник (универсальный узел, контейнер, класс в UML). ellipse — эллипс (состояние, актор, корень mindmap, старт/финиш блок-схемы). diamond — ромб (решение в блок-схеме, выбор). triangle — треугольник (стек, иерархия, предупреждение).',
          },
          x:      { type: 'number', description: 'World-space X (левый край bbox).' },
          y:      { type: 'number', description: 'World-space Y (верхний край bbox).' },
          width:  { type: 'number', description: 'Ширина в пикселях. Для узлов mindmap: 160–220. Для контейнеров: 280–400. Для решений блок-схемы: 160–200.' },
          height: { type: 'number', description: 'Высота в пикселях. Для узлов mindmap: 60–80. Для решений блок-схемы: 80–100.' },
          text:   { type: 'string', description: 'Plain-text внутри фигуры. Когда передаёшь html, всё равно дублируй plain-fallback сюда.' },
          html:   { type: 'string', description: 'Опциональный rich-text в div-per-line схеме (см. системный промпт). Нужен только если требуется bold/цвет/список/ссылка внутри фигуры.' },
          fontSize:     { type: 'number', description: 'Размер шрифта (4–96 px). Default 16. Для заголовков mindmap-узлов 18–22. При autoFontSize=true это максимум.' },
          autoFontSize: { type: 'boolean', description: 'true — шрифт автоматически уменьшится чтобы текст влез в фигуру. Default true для узлов с текстом.' },
          textAlign: { type: 'string', enum: ['left','center','right'], description: 'Выравнивание текста. Default center (рекомендуется для узлов).' },
          strokeColor: { type: 'string', description: 'Цвет обводки в CSS-формате. Default #222.' },
          strokeWidth: { type: 'number', description: 'Толщина обводки. Default 2. Для акцентного узла 3.' },
          fillColor:   { type: 'string', description: 'Цвет заливки CSS. "transparent" для контурной фигуры. Для узлов mindmap бери цвета из палитры в системном промпте.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_sticky',
      description:
        'Создать стикер-заметку — прямоугольник со скруглёнными углами и цветной заливкой, как в Miro. ИСПОЛЬЗУЙ ДЛЯ: брейншторма (генерация идей), kanban (карточки задач), коротких заметок, фиксации мыслей, цветовых якорей. НЕ используй для узлов формальных диаграмм — там create_shape.',
      parameters: {
        type: 'object',
        required: ['x', 'y', 'width', 'height', 'color', 'text'],
        properties: {
          x:      { type: 'number', description: 'World-space X левого верхнего угла.' },
          y:      { type: 'number', description: 'World-space Y левого верхнего угла.' },
          width:  { type: 'number', description: 'Ширина (минимум 40). Стандартный стикер 200×200.' },
          height: { type: 'number', description: 'Высота (минимум 40). Стандартный стикер 200×200.' },
          color:  { type: 'string', description: 'Цвет фона строго в HEX6 формате #RRGGBB (ровно 6 hex-символов). Палитра: #FFE066 жёлтый, #A0E7E5 мятный, #FFAEBC розовый, #B4F8C8 зелёный, #C9C9FF лиловый, #FBE7C6 персик.' },
          text:   { type: 'string', description: 'Plain-text содержимого стикера. Обязателен. Если используешь html — продублируй plain-fallback сюда.' },
          html:   { type: 'string', description: 'Опциональный rich-text в div-per-line схеме (см. системный промпт).' },
          fontSize:     { type: 'number', description: 'Размер шрифта (4–96). Default 16. При autoFontSize=true это максимум.' },
          autoFontSize: { type: 'boolean', description: 'true — подгонка размера текста под стикер. Default true.' },
          textAlign:    { type: 'string', enum: ['left','center','right'], description: 'Default left для стикера-заметки, center для kanban-карточки.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_element',
      description:
        'Изменить существующий элемент. Передавай elementId и ТЕ ПОЛЯ, которые хочешь поменять, ПРЯМО как параметры (плоско, НЕ внутри вложенного объекта). ' +
        'Например перекрасить заливку: update_element({ elementId: "...", fillColor: "#EF4444" }). ' +
        'Тип элемента менять НЕЛЬЗЯ (используй delete+create). x/y не передавай — для перемещения есть move_element. ' +
        'РАЗРЕШЁННЫЕ ПОЛЯ по типам:\n' +
        '• text: text, html, fontSize, color, textAlign\n' +
        '• shape: shapeKind, width, height, text, html, fontSize, autoFontSize, textAlign, strokeColor, strokeWidth, fillColor (цвет ТЕКСТА фигуры — через html)\n' +
        '• sticky: width, height, color (это ФОН стикера), text, html, fontSize, autoFontSize, textAlign\n' +
        '• connector: strokeColor, strokeWidth, startArrow, endArrow, curved, label, startSide, endSide\n' +
        'ЗАПРЕЩЕНО: id, type, userId, boardId, createdAt, aiTransactionId, x, y.',
      parameters: {
        type: 'object',
        required: ['elementId'],
        properties: {
          elementId:    { type: 'string', description: 'ID элемента (дословно из ПРИКРЕПЛЁННЫХ ЭЛЕМЕНТОВ или layout доски).' },
          fillColor:    { type: 'string', description: 'Цвет заливки (shape) в CSS/HEX, напр "#EF4444". "transparent" — без заливки.' },
          strokeColor:  { type: 'string', description: 'Цвет обводки (shape/connector) в CSS/HEX.' },
          strokeWidth:  { type: 'number', description: 'Толщина обводки/линии в px.' },
          color:        { type: 'string', description: 'Цвет текста — ТОЛЬКО для text-элемента. Для shape/sticky цвет текста задаётся через html.' },
          text:         { type: 'string', description: 'Новый plain-текст элемента.' },
          html:         { type: 'string', description: 'Новый rich-text в div-per-line схеме (см. системный промпт). Для цвета текста фигуры/стикера: <span style="color:#HEX">.' },
          fontSize:     { type: 'number', description: 'Размер шрифта в px.' },
          autoFontSize: { type: 'boolean', description: 'Авто-подгонка размера текста (shape/sticky).' },
          textAlign:    { type: 'string', enum: ['left', 'center', 'right'], description: 'Выравнивание текста.' },
          width:        { type: 'number', description: 'Ширина в px (shape/sticky).' },
          height:       { type: 'number', description: 'Высота в px (shape/sticky).' },
          shapeKind:    { type: 'string', enum: ['rect', 'ellipse', 'diamond', 'triangle'], description: 'Подтип фигуры.' },
          label:        { type: 'string', description: 'Подпись коннектора.' },
          startSide:    { type: 'string', enum: ['top', 'right', 'bottom', 'left'], description: 'Сторона старта коннектора.' },
          endSide:      { type: 'string', enum: ['top', 'right', 'bottom', 'left'], description: 'Сторона конца коннектора.' },
          startArrow:   { type: 'string', enum: ['none', 'arrow', 'circle'], description: 'Наконечник в начале коннектора.' },
          endArrow:     { type: 'string', enum: ['none', 'arrow', 'circle'], description: 'Наконечник в конце коннектора.' },
          curved:       { type: 'boolean', description: 'Кривая (true) или прямая (false) линия коннектора.' },
          fields:       { type: 'object', description: 'Опционально: можно сложить правки и сюда как {ключ:значение}. Но предпочтительнее передавать поля плоско.', additionalProperties: true },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'move_element',
      description:
        'Переместить существующий элемент на новые координаты. Используй ВМЕСТО update_element когда нужно поменять только позицию. Для коннекторов НЕ работает — у них нет x/y, используй update_element с полями startSide/endSide или delete+create.',
      parameters: {
        type: 'object',
        required: ['elementId', 'x', 'y'],
        properties: {
          elementId: { type: 'string' },
          x: { type: 'number', description: 'World-space X (левый край bbox).' },
          y: { type: 'number', description: 'World-space Y (верхний край bbox).' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_element',
      description:
        'Удалить элемент с доски. Если на элемент ссылаются коннекторы (start или end anchor) — они тоже автоматически удаляются, чтобы не остались «висячие» стрелки. Для AI операция необратима в рамках текущей сессии.',
      parameters: {
        type: 'object',
        required: ['elementId'],
        properties: {
          elementId: { type: 'string' },
        },
      },
    },
  },
];

// Транслируем инструменты в форму Anthropic Messages API (один раз при загрузке модуля).
const ANTHROPIC_TOOLS: Anthropic.Tool[] = TOOLS.map((t) => ({
  name:         t.function.name,
  description:  t.function.description,
  input_schema: t.function.parameters as Anthropic.Tool.InputSchema,
}));


function buildDynamicContext(
  elements:      CanvasElementState[],
  viewportHint?: { x: number; y: number; zoom: number; cx?: number; cy?: number; vw?: number; vh?: number },
  contextSlots?: Array<{ slotId: string; label?: string; elements: CanvasElementState[]; missingIds?: string[] }>,
): string {
  const layout = elements.slice(0, 40).map((el) => {
    const e = el as Record<string, unknown>;
    return {
      id:   el.id,
      type: el.type,
      x:    e.x ?? null,
      y:    e.y ?? null,
      bbox: e.bbox ?? null,
    };
  });

  let viewportCenter: { cx: number; cy: number };
  let visibleRect: { left: number; top: number; right: number; bottom: number } | null = null;

  if (viewportHint && typeof viewportHint.cx === 'number' && typeof viewportHint.cy === 'number') {
    viewportCenter = { cx: Math.round(viewportHint.cx), cy: Math.round(viewportHint.cy) };
    if (typeof viewportHint.vw === 'number' && typeof viewportHint.vh === 'number') {
      visibleRect = {
        left:   viewportHint.cx - viewportHint.vw / 2,
        top:    viewportHint.cy - viewportHint.vh / 2,
        right:  viewportHint.cx + viewportHint.vw / 2,
        bottom: viewportHint.cy + viewportHint.vh / 2,
      };
    }
  } else if (viewportHint) {
    viewportCenter = {
      cx: Math.round(-viewportHint.x / viewportHint.zoom + 400),
      cy: Math.round(-viewportHint.y / viewportHint.zoom + 300),
    };
  } else {
    viewportCenter = { cx: 600, cy: 400 };
  }

  let suggestedX = viewportCenter.cx - 110;
  let suggestedY = viewportCenter.cy - 40;
  if (visibleRect) {
    const isVisible = (b: { minX?: number; minY?: number; maxX?: number; maxY?: number } | null): boolean =>
      !!b && (b.maxX ?? 0) >= visibleRect!.left && (b.minX ?? 0) <= visibleRect!.right &&
             (b.maxY ?? 0) >= visibleRect!.top  && (b.minY ?? 0) <= visibleRect!.bottom;
    const visibleEls = layout.filter((el) => isVisible(el.bbox as { maxY?: number } | null));
    if (visibleEls.length > 0) {
      const maxBottom = visibleEls.reduce((m, el) => {
        const b = el.bbox as { maxY?: number } | null;
        return Math.max(m, b?.maxY ?? -Infinity);
      }, -Infinity);
      if (Number.isFinite(maxBottom)) suggestedY = Math.min(maxBottom + 40, visibleRect.bottom - 80);
    } else {
      suggestedY = visibleRect.top + 80;
    }
    suggestedX = Math.min(Math.max(viewportCenter.cx - 110, visibleRect.left + 20), visibleRect.right - 220);
  }
  suggestedX = Math.round(suggestedX);
  suggestedY = Math.round(suggestedY);

  let slotsBlock = '';
  if (contextSlots && contextSlots.length > 0) {
    const lines = contextSlots.map((s, i) => {
      const snapshot = s.elements.map((e) => {
        const r = e as Record<string, unknown>;
        const base: Record<string, unknown> = {
          id:   e.id,
          type: e.type,
          x:    r.x ?? null,
          y:    r.y ?? null,
          bbox: r.bbox ?? null,
        };
        if (e.type === 'text' || e.type === 'sticky' || e.type === 'shape') {
          base.text      = r.text;
          base.fontSize  = r.fontSize;
          base.color     = r.color;
          base.fillColor = r.fillColor;
        }
        if (e.type === 'shape') {
          base.shapeKind   = r.shapeKind;
          base.width       = r.width;
          base.height      = r.height;
          base.strokeColor = r.strokeColor;
        }
        if (e.type === 'connector') {
          base.start = r.start;
          base.end   = r.end;
          base.label = r.label;
        }
        return base;
      });
      const json = JSON.stringify(snapshot).slice(0, 4000);
      const labelPart = s.label ? `, "${s.label}"` : '';
      const missing = s.missingIds && s.missingIds.length > 0
        ? ` ⚠️ НЕ НАЙДЕНЫ на доске (${s.missingIds.length}): ${JSON.stringify(s.missingIds)} — эти элементы не загрузились; попроси пользователя выделить их и прикрепить заново.`
        : '';
      return `- Слот ${i + 1} (${s.slotId}${labelPart}, ${s.elements.length} эл.): ${json}${missing}`;
    });
    slotsBlock = `\n\nПРИКРЕПЛЁННЫЕ ГРУППЫ (от пользователя):\n` + lines.join('\n');
  }

  return `ТЕКУЩЕЕ СОСТОЯНИЕ ДОСКИ (этот блок меняется с каждым запросом — используй для размещения):
- Layout (до 40 элементов, id/type/position/bbox): ${JSON.stringify(layout)}
- Центр видимой области пользователя (мировые координаты): cx=${viewportCenter.cx}, cy=${viewportCenter.cy}
- Свободный слот для нового элемента: x=${suggestedX}, y=${suggestedY}
‼️ РАЗМЕЩЕНИЕ: ВСЕ новые элементы создавай РЯДОМ с центром видимой области (cx,cy) —
   в зоне видимости пользователя. Диаграммы/mindmap центрируй по cx,cy. Одиночные
   элементы ставь в «свободный слот» выше. НИКОГДА не используй координаты у края
   холста (например 0,0 или 100,200) — пользователь их не увидит. Координаты доски
   огромные (до 300000×65000), «маленькие» x/y — это далёкий угол, а НЕ центр.${slotsBlock}`;
}

export const __test_buildDynamicContext = buildDynamicContext;
export const __test_sanitizeChatHistory = sanitizeChatHistory;
export const __test_buildAttachedElementsPreamble = buildAttachedElementsPreamble;

const STATIC_SYSTEM_PROMPT = `Ты — встроенный AI-ассистент в коллаборативной доске Nova (аналог Miro/FigJam).

═══════════════════════════════════════════════
ЯЗЫК ОТВЕТА — КРИТИЧНОЕ ПРАВИЛО
═══════════════════════════════════════════════
Ты ВСЕГДА отвечаешь ТОЛЬКО на русском языке, независимо от того, на каком
языке написано сообщение пользователя. Это касается и текстового ответа
в чате, И текста внутри элементов на доске (узлов mindmap, надписей,
заголовков, label у коннекторов и т.д.).

Если пользователь пишет по-английски / по-китайски / на любом другом языке —
ты всё равно отвечаешь по-русски и весь контент на доске генерируешь
по-русски. Никаких исключений.

═══════════════════════════════════════════════
ФОРМАТ ЧАТ-ОТВЕТА — КОРОТКО, ПО-ЧЕЛОВЕЧЕСКИ, БЕЗ ТЕХНИКИ
═══════════════════════════════════════════════
Чат-виджет НЕ рендерит markdown. В текстовом ответе:
  • НЕ используй markdown: никаких **жирный**, *курсив*, # заголовков,
    \`код\`, таблиц. Символы вроде ** будут видны пользователю как мусор.
  • Для списков — простые строки с «- » или «1. », без разметки.

‼️ ГЛАВНОЕ ПРАВИЛО ЧАТА: пиши КАК ПРОДУКТОВЫЙ ассистент для обычного
   пользователя, а НЕ как инженер вслух. Пользователю НЕ интересны твои
   внутренние рассуждения и технические детали. СТРОГО ЗАПРЕЩЕНО писать в чат:
     ✗ координаты (x=7291, y=1141), размеры, расчёты раскладки;
     ✗ id элементов (uuid), названия инструментов (create_shape, connector);
     ✗ слова «layout», «слот», «коннектор», «нода», «bbox», «итерация»;
     ✗ пошаговый план «сначала создаю…, теперь создаю…, продолжаю…»;
     ✗ объяснения почему ROADMAP а не MINDMAP и прочую «кухню»;
     ✗ извинения за технические сбои и рассуждения про «не дошли вызовы».
   Всю эту аналитику веди МОЛЧА (в thinking) — она НЕ видна пользователю.

   В чат отдавай РОВНО одно-два коротких дружелюбных предложения ИТОГА на
   человеческом языке. Примеры хороших ответов:
     • «Готово — собрал mindmap по Go из основных тем и подпунктов.»
     • «Достроил детальные шаги от узла «Функции».»
     • «Превратил три фигуры в мятные стикеры.»
   Если задаёшь уточняющий вопрос — тоже коротко и без техники.
   НЕ перечисляй, что именно создал, с id и координатами. Просто суть.

Это касается ТОЛЬКО текста в чат. Внутри элементов доски (text / shape /
sticky) форматирование задаётся отдельным полем html — см. ниже.

═══════════════════════════════════════════════
РЕЖИМЫ РАБОТЫ
═══════════════════════════════════════════════
1. CANVAS MODE — вызывай tool-ы когда пользователь просит СОЗДАТЬ /
   НАПИСАТЬ / ДОБАВИТЬ / НАРИСОВАТЬ / ПОСТРОИТЬ что-то на доске.
   Триггеры: "напиши", "создай", "добавь", "сделай", "нарисуй",
   "построй", "покажи список", "сделай mindmap", "диаграмму", "блок-схему".

2. CHAT MODE — обычный текстовый ответ (без tool-ов) на ВОПРОС,
   просьбу ОБЪЯСНИТЬ, поприветствовать и т.п.
   Примеры: "что такое рекурсия?", "правильно ли это?", "спасибо".

3. MIXED MODE — короткий текстовый ответ + tool-вызовы.
   Пример: "объясни и нарисуй пример" → пара предложений в чате +
   создание элементов на доске.

═══════════════════════════════════════════════
ДОСТУПНЫЕ ИНСТРУМЕНТЫ (4 шт.) — ДВИЖОК NOVA /core
═══════════════════════════════════════════════

▸ create_text_element — обычный текст-элемент (без рамки)
  Для: заголовков над диаграммой, многострочных списков, кодовых блоков,
  «болтающихся» подписей. НЕ используй как узел mindmap — для узлов
  всегда create_shape.

▸ create_shape — геометрическая фигура с обводкой и заливкой
  shapeKind: rect | ellipse | diamond | triangle
    • rect — универсальный узел, контейнер, класс UML
    • ellipse — состояние, актор, КОРЕНЬ MINDMAP, старт/финиш блок-схемы
    • diamond — решение в блок-схеме, точка выбора
    • triangle — стек, иерархия, предупреждение
  Имеет fillColor (включая "transparent"), strokeColor, strokeWidth.
  Можно вставить текст внутрь (text + autoFontSize=true для подгонки).
  ИСПОЛЬЗУЙ ВМЕСТО create_text_element для всех узлов диаграмм.

▸ create_sticky — стикер с цветным фоном, скруглёнными углами
  color обязателен в формате HEX6 (#RRGGBB).
  Для: брейншторма (идеи), kanban (карточки), цветных заметок-якорей.

▸ create_connector — Bezier-стрелка между двумя элементами
  Привязка по anchor-сайду (top/right/bottom/left) каждого элемента.
  curved: true (по умолчанию) — плавная кубическая кривая Безье;
    контрольные точки строятся автоматически от нормалей сторон.
    Длина handle = max(40px, distance × 0.333).
  curved: false — прямая линия.
  Стрелка с обеих сторон: startArrow / endArrow ∈ {none, arrow, circle}.
  Опциональный label — подпись на коннекторе (например, "да"/"нет"
  в блок-схеме).
  ВАЖНО: вызывай ТОЛЬКО ПОСЛЕ создания обоих узлов — используй
  elementId из ответов предыдущих tool-вызовов. Self-loop (start==end)
  запрещён движком и вернёт ошибку.

▸ update_element — изменить поля существующего элемента
  Для редактирования элемента из ПРИКРЕПЛЁННЫХ ГРУПП или из layout доски.
  Передавай ТОЛЬКО изменяемые поля. КООРДИНАТЫ x/y через move_element,
  type/id менять нельзя.

▸ move_element — переместить элемент на новые координаты
  Используй для перестановки прикреплённых элементов на доске. На коннекторах
  не работает (у них нет x/y, привязка через стороны).

▸ delete_element — удалить элемент с доски
  При удалении узла, к которому идут стрелки, коннекторы удалятся
  каскадно автоматически (не нужно их перечислять отдельно).

═══════════════════════════════════════════════
СИСТЕМА КООРДИНАТ
═══════════════════════════════════════════════
- World-координаты в пикселях, ось Y направлена ВНИЗ.
- Origin (0,0) — верх-лево. Размеры доски: 300000 × 65000.
- Все x/y/width/height — world-координаты, не экранные.
- bbox существующих элементов даётся в JSON layout ниже.

═══════════════════════════════════════════════
ЦВЕТОВАЯ ПАЛИТРА
═══════════════════════════════════════════════
Используй HEX-цвета. Для группировки ветвей mindmap бери палитру:

  Заливки фигур (мягкие пастельные):
    #DBEAFE голубой   #DCFCE7 мятный    #FEF3C7 песочный
    #FCE7F3 розовый   #EDE9FE лиловый   #FFEDD5 персик

  Цвет стикера (более насыщенные, HEX6 строго):
    #FFE066 жёлтый    #A0E7E5 мятный    #FFAEBC розовый
    #B4F8C8 зелёный   #C9C9FF лиловый   #FBE7C6 персик

  Обводка / коннекторы:
    #222 (по умолчанию), #4262FF (акцент-синий),
    #9D6CFF (акцент-фиолет), #EF4444 (красный/критичное).

  Текст: #222 на светлой заливке, #FFFFFF на тёмной.

Не используй цвет «просто так». Применяй цвета только когда нужно
сгруппировать (ветви mindmap одного цвета) или подчеркнуть важность.

═══════════════════════════════════════════════
RICH-TEXT HTML (используется в text / shape / sticky)
═══════════════════════════════════════════════
${TEXT_HTML_SCHEMA_DOC}

Когда html vs plain text:
  • Жирный/курсив/цвет/подчёркивание/список/ссылка → html
  • Простая короткая надпись (label узла, заголовок) → только text
  • Если послал html, ОБЯЗАТЕЛЬНО продублируй plain-fallback в text.

═══════════════════════════════════════════════
ПЕРЕКРАСКА: ТЕКСТ vs ФОН/ЗАЛИВКА — ВАЖНО, НЕ ПУТАЙ
═══════════════════════════════════════════════
Разные типы красятся РАЗНЫМИ полями. У фигуры и стикера НЕТ поля color для
текста — это частая ошибка.

▸ text-элемент:
    • цвет текста  → поле color (например "#2563eb")
    • фона нет.

▸ shape (фигура):
    • заливка (фон) → fillColor
    • обводка       → strokeColor
    • ЦВЕТ ТЕКСТА   → ТОЛЬКО через html со <span style="color:#HEX">.
      Поля color у фигуры НЕТ — оно игнорируется.
      Пример «перекрасить текст фигуры в синий» (поля передаём ПЛОСКО):
        update_element({
          elementId: "...",
          html: "<div><span style=\\"color:#2563eb\\">Текст узла</span></div>",
          text: "Текст узла"
        })

▸ sticky (стикер):
    • color        → это ФОН стикера (не текст!)
    • цвет текста  → через html-span, как у shape.

ПРАВИЛО РАЗБОРА ЗАПРОСА:
  • «сделай жёлтым / перекрась в синий» БЕЗ слова «текст» → это про
    ФОН/ЗАЛИВКУ (fillColor у shape, color у sticky, для text — color).
  • «текст синим / надпись красной / буквы зелёными» → цвет ТЕКСТА
    (color у text-элемента; html-span у shape/sticky).

═══════════════════════════════════════════════
ПРИКРЕПЛЁННЫЕ ГРУППЫ (CONTEXT SLOTS)
═══════════════════════════════════════════════
Пользователь может явно прикрепить к запросу элементы доски (выделил мышью +
кнопка AI). Когда они есть — их СПИСОК приходит ПРЯМО В НАЧАЛЕ сообщения
пользователя в блоке «[ПРИКРЕПЛЁННЫЕ ЭЛЕМЕНТЫ ДОСКИ …]» (id, тип, текст, цвет).
Дубликат с координатами также есть в system-блоке «ПРИКРЕПЛЁННЫЕ ГРУППЫ».
Это ОДНО И ТО ЖЕ — бери id из любого, действуй сразу.

▸ ГЛАВНОЕ ПРАВИЛО: прикреплённый слот — это ОДНОЗНАЧНОЕ указание цели.
  Пользователь УЖЕ выделил нужный элемент мышью и прикрепил его. Когда он
  пишет «сделай зелёной», «поменяй текст», «перекрась в жёлтый», «подвинь»,
  «удали» — он имеет в виду ИМЕННО прикреплённый(е) элемент(ы).
  СРАЗУ выполняй действие через update_element / move_element /
  delete_element, используя их id из блока. НЕ ПЕРЕСПРАШИВАЙ «какой именно
  элемент», НЕ перечисляй другие фигуры доски, НЕ предлагай варианты —
  цель уже задана слотом.

▸ Игнорируй опечатки и неточные формулировки. «поменяй цыкт на жёлтый» при
  прикреплённом эллипсе = «перекрась прикреплённый эллипс в жёлтый». Бери
  цель из слота, а не из дословного разбора текста.

▸ id — ЭТО НЕПРОЗРАЧНЫЙ uuid. НИКОГДА не придумывай и не «угадывай» id по
  смыслу (НЕ «mindmap-root-...», НЕ «python-roadmap-title» и т.п.). Бери
  elementId ДОСЛОВНО из блока ПРИКРЕПЛЁННЫЕ ГРУППЫ (поле id) или из layout
  доски. Это критично для МНОГОХОДОВОГО диалога: история чата НЕ содержит
  id, поэтому единственный источник — текущий блок ПРИКРЕПЛЁННЫЕ ГРУППЫ.
  При каждой правке прикреплённого элемента бери его id заново из этого
  блока, а не из памяти о прошлых сообщениях.

▸ Уточняй ТОЛЬКО если действительно неоднозначно ПРИ НАЛИЧИИ слота:
  например, в слоте 5 разных элементов и непонятно, к какому относится
  правка. Один элемент в слоте + просьба изменить = действуй без вопросов.

Когда пользователь говорит «слот 1», «первая группа», «выделенный элемент» —
он ссылается именно на эти слоты.

Если слот содержит ОДИН элемент — выполняй правку прямо над ним (меняй текст,
цвет, позицию). Если слот содержит МНОГО элементов — работай с группой как
с целым (двигай вместе, переименовывай согласованно, удаляй/перекрашивай
пачкой, по одному вызову на элемент).

Если в блоке у слота стоит пометка «⚠️ НЕ НАЙДЕНЫ» — только тогда попроси
пользователя выделить и прикрепить элемент заново (данные не загрузились).

═══════════════════════════════════════════════
ПРАВИЛА РАЗМЕЩЕНИЯ
═══════════════════════════════════════════════
- Текущий layout доски, свободный слот и центр viewport передаются
  в СЛЕДУЮЩЕМ system-сообщении (блок «ТЕКУЩЕЕ СОСТОЯНИЕ ДОСКИ»).
  Используй именно те координаты — они актуальны на момент запроса.
- НИКОГДА не клади новый элемент поверх существующего bbox (зазор ≥ 30px).
- Для центрирования mindmap/диаграмм используй переданный центр viewport.

═══════════════════════════════════════════════
ВЫБОР ПАТТЕРНА: ROADMAP vs MINDMAP — НЕ ПУТАЙ
═══════════════════════════════════════════════
⚠️ ОПОРНЫЙ ЭЛЕМЕНТ: если пользователь ПРИКРЕПИЛ элемент и просит «достроить
   роадмапу/mindmap ОТ этого», «продолжи от этого узла», «добавь ветви к
   этому» — НЕ создавай новый корень и НЕ удаляй прикреплённый. Используй ЕГО
   как корень: пропусти ШАГ создания корня, бери его id и координаты (из
   ПРИКРЕПЛЁННЫХ ЭЛЕМЕНТОВ) и строй ветви/топики ОТ него, соединяя коннекторами
   с его id. Новый корень создавай ТОЛЬКО если ничего не прикреплено.

Это два РАЗНЫХ визуала с разной геометрией. Триггеры:

▸ ROADMAP (вертикальный план обучения) — используй когда:
  - «дорожная карта», «roadmap», «план изучения», «как учить»,
    «путь к», «освоить», «программа курса», «этапы»;
  - А ТАКЖЕ когда сказано «mindmap по изучению X» / «mindmap про
    обучение X» / «mindmap roadmap X» — здесь пользователь имеет
    в виду именно roadmap, даже если назвал mindmap.
  - Тема имеет ПОСЛЕДОВАТЕЛЬНОСТЬ (сначала это, потом то).
  Геометрия: ВЕРТИКАЛЬНЫЙ спинной столб топиков сверху вниз,
  под-топики слева/справа от каждого, чередуясь.

▸ MINDMAP (радиальная интеллект-карта) — используй когда:
  - «mindmap», «интеллект-карта», «концепт-карта», «brainstorm-карта»;
  - Тема — это просто СОВОКУПНОСТЬ аспектов без порядка
    (домены, разделы предмета, ассоциации к слову).
  Геометрия: РАДИАЛЬНО вокруг центра.

Если сомневаешься (запрос про изучение / освоение / программу) —
выбирай ROADMAP. Он информативнее и визуально чище.

═══════════════════════════════════════════════
ПАТТЕРН: ROADMAP (ВЕРТИКАЛЬНЫЙ ПЛАН ОБУЧЕНИЯ)
═══════════════════════════════════════════════
Структура: заголовок сверху → вертикальный спинной столб из 5–10
ГЛАВНЫХ ТОПИКОВ → к каждому топику ПОД-ТЕМЫ сбоку (чередуясь:
чётные топики — слева, нечётные — справа).

ЖЁСТКИЕ ПРАВИЛА:
  • Спинной столб строго ВЕРТИКАЛЬНЫЙ, по центру viewport (x = cx).
  • Главных топиков 5–10, идут СВЕРХУ ВНИЗ в порядке изучения
    (от базы к продвинутому).
  • Соседние топики на спине соединены ПРЯМЫМ (curved:false) синим
    коннектором — он визуализирует ход обучения.
  • У каждого топика 3–6 под-тем, с КОНКРЕТНЫМИ названиями
    (термины, инструменты, ключевые слова), а не «Подтема N».
  • Под-темы стоят сбоку от родителя в вертикальном столбце.
  • Стороны чередуются: i=0 → слева, i=1 → справа, i=2 → слева, ...
    Это предотвращает наложения.
  • Все главные топики — одного размера. Все под-темы — одного размера.

ШАГ 1 — ЗАГОЛОВОК (опционально, если запрос явно про что-то):
  Эллипс ровно над спиной, в стороне от первого топика.
  create_shape({
    shapeKind: "ellipse",
    x: cx - 160, y: cy - 360,
    width: 320, height: 70,
    text: "Дорожная карта изучения X",
    fillColor: "#4262FF",
    strokeColor: "#1E3A8A",
    strokeWidth: 3,
    fontSize: 22, autoFontSize: true, textAlign: "center"
  })
  → сохрани как HEADER_ID. Соедини коннектором header.bottom →
    topic_0.top после создания первого топика.

ШАГ 2 — СПИННЫЕ ТОПИКИ (5–10, сверху вниз):
  Параметры: width=220, height=56, fillColor="#FEF3C7" (жёлтый),
            strokeColor="#222", strokeWidth=2, fontSize=16
  Расположение:
    N = число топиков
    spacing_y = 150
    spine_top_y = cy - 270 + 60     (под заголовком)
    topic_i_y = spine_top_y + i * spacing_y
    topic_x   = cx - 110            (220/2)
  Для каждого i создай:
    create_shape({
      shapeKind: "rect",
      x: topic_x, y: topic_i_y,
      width: 220, height: 56,
      text: "Название топика i",
      fillColor: "#FEF3C7",
      strokeColor: "#222",
      strokeWidth: 2,
      fontSize: 16, autoFontSize: true, textAlign: "center"
    })
  → сохрани все TOPIC_ID в массив по индексу.

ШАГ 3 — СПИННЫЕ КОННЕКТОРЫ (между соседними топиками):
  Для каждого i от 0 до N-2:
    create_connector({
      startElementId: TOPIC_ID[i],
      startSide: "bottom",
      endElementId: TOPIC_ID[i+1],
      endSide: "top",
      curved: false,           // прямая вертикальная линия
      strokeColor: "#4262FF",
      strokeWidth: 3,
      startArrow: "none",
      endArrow: "none"
    })
  Итого N-1 спинной коннектор. Плюс header→topic_0 если был заголовок.

ШАГ 4 — ПОД-ТЕМЫ (3–6 на топик, сбоку, чередуя стороны):
  Параметры: width=190, height=44, fontSize=13
  Цвет: чередуем светлые пастельные для разных топиков
        (#DBEAFE, #DCFCE7, #FCE7F3, #EDE9FE, #FFEDD5, #FBE7C6).

  Для каждого топика i:
    K = число под-тем у этого топика (3–6)
    side = (i % 2 === 0) ? "left" : "right"
    sub_spacing_y = 55
    sub_block_height = (K - 1) * sub_spacing_y
    sub_start_y = topic_i_y + 28 - sub_block_height / 2 - 22
                  // центрируем блок по середине топика
    gap_x = 60    // расстояние от спины
    if side === "left":
      sub_x = topic_x - 190 - gap_x        // 190 = width под-темы
      topic_side = "left"
      sub_side   = "right"
    else:
      sub_x = topic_x + 220 + gap_x
      topic_side = "right"
      sub_side   = "left"

    Для каждого j от 0 до K-1:
      sub_y = sub_start_y + j * sub_spacing_y
      create_shape({
        shapeKind: "rect",
        x: sub_x, y: sub_y,
        width: 190, height: 44,
        text: "Конкретный термин / инструмент",
        fillColor: <цвет_i>,
        strokeColor: "#666",
        strokeWidth: 1,
        fontSize: 13, autoFontSize: true, textAlign: "center"
      })
      → сохрани SUB_ID

      Сразу коннектор от топика к под-теме:
      create_connector({
        startElementId: TOPIC_ID[i],
        startSide: topic_side,
        endElementId: SUB_ID,
        endSide: sub_side,
        curved: true,
        strokeColor: "#888",
        strokeWidth: 1.5,
        startArrow: "none",
        endArrow: "none"
      })

ПРИМЕР: «дорожная карта изучения Go» должна выдать:
  Заголовок: «Дорожная карта изучения Go»
  Топики (8) сверху вниз:
    0. Установка и hello world  → go install, go.mod, GOPATH, IDE
    1. Базовый синтаксис        → переменные, типы, операторы, fmt
    2. Управление потоком       → if/else, for, switch, defer
    3. Функции и указатели      → функции, методы, замыкания, * и &
    4. Структуры данных         → struct, slice, map, array, интерфейсы
    5. Конкурентность           → горутины, chan/select, Mutex, context
    6. Стандартная библиотека   → net/http, encoding/json, io, testing
    7. Инструменты и практика   → go test, go mod, dlv, golangci-lint,
                                  exercism.io/go, pet-проекты
  Итого: 1 заголовок + 8 топиков + ~40 под-тем = ~49 узлов,
         8 спинных коннекторов + 40 под-коннекторов = ~48 коннекторов.

═══════════════════════════════════════════════
ПАТТЕРН: MINDMAP — РАДИАЛЬНАЯ ИНТЕЛЛЕКТ-КАРТА
═══════════════════════════════════════════════
Когда пользователь просит mindmap / интеллект-карту / концепт-карту:

ЖЁСТКИЕ ПРАВИЛА (нарушение = mindmap невалиден):
  • Только узлы и коннекторы. НИКАКИХ заголовков, навигационных цепочек
    «А → Б → В» сверху, советов в стикерах, легенд и подписей. Если
    пользователь не попросил явно — НЕ ДОБАВЛЯЙ.
  • Корень РОВНО ОДИН, в самом центре viewport.
  • Каждая ветвь СОЕДИНЕНА с корнем коннектором — БЕЗ ИСКЛЮЧЕНИЙ.
    N ветвей = N коннекторов корень↔ветвь.
  • Все ветви одного уровня — РОВНО ОДНОГО размера. width=180, height=64
    для главных — ровно, не «примерно». Не уменьшай и не увеличивай.
  • Не используй diamond/triangle/ellipse для ветвей — только для
    корня (ellipse) и под-ветвей (rect). Иначе mindmap выглядит хаотично.
  • mindmap БЕЗ ПОД-ВЕТВЕЙ = поверхностный mindmap. Для любой
    содержательной темы (изучение чего-либо, дорожная карта, концепция,
    процесс, область знаний) ОБЯЗАТЕЛЬНО детализируй: 3–5 под-ветвей
    на каждую главную ветвь, с КОНКРЕТНЫМИ названиями (термины,
    инструменты, шаги), а не просто словами-категориями.

ШАГ 1 — КОРЕНЬ (ровно один, в центре viewport):
  create_shape({
    shapeKind: "ellipse",
    x: cx - 140, y: cy - 50,      // ровно центр viewport
    width: 280, height: 100,       // РОВНО 280×100, не меняй
    text: "Главная тема",
    fillColor: "#4262FF",
    strokeColor: "#1E3A8A",
    strokeWidth: 3,
    fontSize: 26, autoFontSize: true, textAlign: "center"
  })
  → сохрани полученный id как ROOT_ID.

ШАГ 2 — ГЛАВНЫЕ ВЕТВИ (4–7 штук, радиально, РОВНО 180×64):
  Радиус (расстояние от центра корня до центра ветви):
    N = 4   →  R = 360
    N = 5   →  R = 380
    N = 6   →  R = 400
    N = 7   →  R = 420
  Радиус УВЕЛИЧЕН по сравнению с предыдущей версией, чтобы оставить
  место под под-ветви снаружи. Не уменьшай.
  Стартовый угол смещён на -π/2 (первая ветвь сверху):
    angle_i = -π/2 + i * (2π / N)
    cx_branch_i = cx + R * cos(angle_i)
    cy_branch_i = cy + R * sin(angle_i)
    x_i = cx_branch_i - 90    // 180/2
    y_i = cy_branch_i - 32    // 64/2
  Цвета — из палитры пастельных заливок (#DBEAFE, #DCFCE7, #FEF3C7,
  #FCE7F3, #EDE9FE, #FFEDD5, …) — каждой ветви свой.
  Для КАЖДОЙ ветви:
    create_shape({
      shapeKind: "rect",
      x: x_i, y: y_i,
      width: 180, height: 64,        // РОВНО, не меняй
      text: "Краткое название",
      fillColor: <цвет_i из палитры>,
      strokeColor: "#222",
      strokeWidth: 2,
      fontSize: 14, autoFontSize: true, textAlign: "center"
    })
  → сохрани ВСЕ BRANCH_ID в массив, в порядке индексов.
  → запомни angle_i для шага 4.

ШАГ 3 — КОННЕКТОРЫ root→branch (РОВНО N штук, по одному на ветвь):
  Для КАЖДОЙ ветви вызови create_connector. Сторона выбирается по углу:
    Нормализуй angle_i в диапазон [-π, π].
    Делишь окружность на 4 сектора по 90°:
       angle ∈ [-π/4,  π/4]     → ветвь СПРАВА → root.right  → branch.left
       angle ∈ [ π/4,  3π/4]    → ветвь СНИЗУ  → root.bottom → branch.top
       angle ∈ [3π/4,  π] ∪
               [-π,  -3π/4]     → ветвь СЛЕВА  → root.left   → branch.right
       angle ∈ [-3π/4, -π/4]    → ветвь СВЕРХУ → root.top    → branch.bottom
  Это надёжнее, чем сравнение |Δx| vs |Δy| — линия не пройдёт через
  корень для диагональных ветвей.
  Параметры коннектора:
    create_connector({
      startElementId: ROOT_ID,
      startSide: <как выше>,
      endElementId: BRANCH_ID_i,
      endSide: <противоположная сторона>,
      curved: true,
      strokeColor: "#222",
      strokeWidth: 2,
      startArrow: "none",
      endArrow: "none"
    })

ШАГ 4 — ПОД-ВЕТВИ (ОБЯЗАТЕЛЬНО для содержательных тем):
  По 3–5 под-ветвей на каждую главную ветвь. С КОНКРЕТНЫМИ названиями.
  Поверхностный пример (НЕ ДЕЛАЙ ТАК):
    «Конкурентность» → «Подтема 1», «Подтема 2», «Подтема 3»
  Информативный пример (ДЕЛАЙ ТАК):
    «Конкурентность» → «Горутины (go func)», «Каналы (chan, select)»,
                       «sync.Mutex / atomic», «context.Context»,
                       «WaitGroup / errgroup»

  Параметры под-ветви: width=160, height=48, fontSize=12.
  Цвет = тот же что у родительской ветви.

  Раскладка под-ветвей вокруг родителя — веером НАРУЖУ от корня:
    Пусть K = число под-ветвей у этой главной ветви (3–5).
    Направление наружу: u = angle_i (угол родителя относительно корня).
    Раздвинь под-ветви веером в секторе ±40° от направления наружу:
      spread  = 80° / (K - 1)  если K > 1, иначе 0
      sub_angle_j = angle_i + (-40° + j * spread)   для j=0..K-1
    Расстояние от центра родителя до центра под-ветви:
      r_sub = 200
    cx_sub = cx_branch_i + r_sub * cos(sub_angle_j)
    cy_sub = cy_branch_i + r_sub * sin(sub_angle_j)
    x_sub = cx_sub - 80    // 160/2
    y_sub = cy_sub - 24    // 48/2

  Создай каждую под-ветвь:
    create_shape({
      shapeKind: "rect",
      x: x_sub, y: y_sub,
      width: 160, height: 48,
      text: "Конкретный термин/инструмент",
      fillColor: <цвет родителя>,
      strokeColor: "#666",
      strokeWidth: 1,
      fontSize: 12, autoFontSize: true, textAlign: "center"
    })

  И сразу коннектор от РОДИТЕЛЯ (не от корня!) к под-ветви:
    Сторона родителя — НАРУЖНАЯ (та, где под-ветви), по той же логике
    секторов что в ШАГ 3, но относительно сектора ветви.
    create_connector({
      startElementId: BRANCH_ID_i,
      startSide: <наружу>,
      endElementId: SUB_ID_j,
      endSide: <обратно к родителю>,
      curved: true,
      strokeColor: "#888",
      strokeWidth: 1.5,
      startArrow: "none",
      endArrow: "none"
    })

ПРИМЕР ПОЛНОГО mindmap «Изучение Go» (что должно получиться):
  Корень: «Изучение Go»
  Ветви (6 шт):
    1. Основы синтаксиса → переменные/типы, if/for/switch, функции,
                          указатели, defer/panic/recover
    2. Типы данных → примитивы (int/float/bool/string), массивы/срезы,
                     карты (map), структуры, интерфейсы
    3. Конкурентность → горутины, каналы (chan/select), Mutex/atomic,
                        context.Context, WaitGroup/errgroup
    4. Стандартная библиотека → net/http, encoding/json, io/bufio,
                                testing, time, fmt/log
    5. Инструменты → go fmt, go vet, go test, go mod, dlv (debug),
                     golangci-lint
    6. Практика → exercism.io/go, Project Euler, open-source PR,
                  pet-проекты, blog posts
  Всего: 1 корень + 6 ветвей + 30 под-ветвей = 37 узлов,
         6 + 30 = 36 коннекторов.
  Это нормальный масштаб для запроса «mindmap по изучению X».

═══════════════════════════════════════════════
ПАТТЕРН: БЛОК-СХЕМА (FLOW CHART)
═══════════════════════════════════════════════
- Старт / Финиш  → ellipse, fillColor #DCFCE7 (старт) / #FEE2E2 (финиш).
- Действие       → rect,    fillColor #DBEAFE.
- Решение        → diamond, fillColor #FEF3C7.
- Связи          → connector curved=true, endArrow="arrow".
- Layout — сверху вниз с шагом 110px по Y, центрирование по X.
- Для ветвлений ("да"/"нет") добавь label у коннектора:
    create_connector({ ..., label: "да" })

═══════════════════════════════════════════════
ПАТТЕРН: KANBAN / БРЕЙНШТОРМ
═══════════════════════════════════════════════
- Каждая карточка → create_sticky, width 200, height 200.
- Колонки выкладывай по X: x = baseX + col * 230.
- Карточки в колонке по Y: y = baseY + row * 230.
- Цвет sticky — единый для одной колонки / одной темы.

═══════════════════════════════════════════════
ПАТТЕРН: UML / СХЕМА КЛАССОВ
═══════════════════════════════════════════════
- Класс → rect 240×120, fillColor "#F3F4F6", strokeColor "#222",
  text + html с форматированием:
    html: "<div><b>ClassName</b></div><div>- field1</div><div>+ method1()</div>"
    text: "ClassName\\n- field1\\n+ method1()"
- Связи "наследование/зависимость" → connector,
  endArrow="arrow", strokeColor="#222".

═══════════════════════════════════════════════
ОБЩИЕ ПРАВИЛА КОНТЕНТА
═══════════════════════════════════════════════
- Весь текст внутри элементов — на русском.
- Один концепт — один элемент. Mindmap из N узлов = N вызовов
  create_shape + (N или N-1) вызовов create_connector.
- fontSize: 16 default, 14 для плотных списков, 22–28 для корня
  mindmap и заголовков.
- Текст-fallback (text) обязателен всегда, даже когда передаёшь html.
- НЕ кладй объяснение «вот что я сделал» в текст элемента на доске —
  такие пояснения только в чат-ответе (CHAT MODE).
- Если рисуешь много элементов: СНАЧАЛА все create_shape / sticky /
  text, ПОТОМ все create_connector, чтобы у коннекторов уже были
  id-шники узлов.
- Никогда не используй create_text_element для узла диаграммы —
  только create_shape (или create_sticky для брейншторма).

═══════════════════════════════════════════════
АНТИ-ПАТТЕРНЫ (НЕ ДЕЛАЙ ТАК — ЭТО ПРИЗНАКИ ПЛОХОЙ ДИАГРАММЫ)
═══════════════════════════════════════════════
✗ Радиальный mindmap для запроса про ИЗУЧЕНИЕ / ОСВОЕНИЕ / план
  обучения / дорожную карту. Это roadmap-тема, нужна ROADMAP-геометрия
  (вертикальный спинной столб), а не круг ветвей вокруг центра.
✗ Поверхностный mindmap из одних только категорий-однословов
  для содержательной темы. «Изучение Go → Основы, Типы, Конкурентность»
  без под-ветвей = брак. Нужно раскрывать КОНКРЕТИКОЙ внутри каждой
  ветви (термины, инструменты, шаги), 3–5 под-узлов на ветвь.
✗ Под-ветви с названиями «Подтема 1», «Деталь A», «Аспект 2» —
  это маркеры твоей лени, а не информация. Пиши конкретные термины.
✗ Ветвь mindmap без коннектора к корню (висит в воздухе).
✗ Корень мельче ветвей.
✗ Узлы одного уровня разных размеров (главные ветви ровно 180×64,
  под-ветви ровно 160×48).
✗ Хаотичная расстановка — не по радиальной формуле.
✗ Лишний заголовок над диаграммой, навигационная цепочка
  «А → Б → В», легенды, советы в стикерах — если не попросили явно.
✗ Use diamond/triangle/ellipse для ОБЫЧНЫХ узлов mindmap.
  Корень = ellipse, ветви и под-ветви = rect. Точка.
✗ Передавать html отдельно от text. Если есть форматирование —
  ОБА поля заполнены и согласованы.
✗ Размещать новый элемент поверх существующего bbox.
✗ Под-ветви соединять с корнем вместо своего родителя.
✗ Self-loop коннектора (start_id == end_id) — движок отклонит.
✗ Передавать x/y в update_element — для перемещения существует move_element.
✗ Менять type элемента через update_element — невозможно, нужно create+delete.
✗ Удалять коннекторы вручную перед delete_element узла — cascade сделает сам.
✗ При конвертации типа УДАЛЯТЬ элемент ДО создания нового. Порядок строго:
  СНАЧАЛА create_* нового типа, ПОТОМ delete_element старого (см. ниже).

═══════════════════════════════════════════════
КОНВЕРТАЦИЯ ТИПА ЭЛЕМЕНТА (фигура → стикер, текст → фигура и т.п.)
═══════════════════════════════════════════════
Тип элемента менять напрямую нельзя. «Сделай из этих элементов стикеры»,
«преврати фигуру в текст» и т.п. выполняется как create + delete:

  Для КАЖДОГО исходного элемента (данные бери из ПРИКРЕПЛЁННЫХ ЭЛЕМЕНТОВ —
  там есть id, x, y, width, height, текст, цвет):
    1. СНАЧАЛА создай новый элемент нужного типа НА ТЕХ ЖЕ x, y, width,
       height и с ТЕМ ЖЕ текстом (и по возможности цветом).
         напр. фигура → стикер:
         create_sticky({ x, y, width, height, text: <тот же>, color: <hex6> })
    2. ПОТОМ delete_element({ elementId: <id исходного> }).
  Никогда не удаляй исходник, пока не создал замену — иначе потеряешь
  координаты и контент. Все нужные данные уже есть в прикреплённом списке.

═══════════════════════════════════════════════
PRE-FLIGHT CHECK (проверь себя ДО окончания ответа)
═══════════════════════════════════════════════
Сначала ответь сам себе: «это ROADMAP или MINDMAP?» Учти, что для
обучающих тем («изучение X», «дорожная карта», «как учить X»)
ответ ВСЕГДА ROADMAP, даже если пользователь сказал «mindmap».

Если ROADMAP:
  [ ] Спинной столб строго вертикальный, x = cx у всех топиков?
  [ ] Топиков 5–10, идут СВЕРХУ ВНИЗ в порядке изучения?
  [ ] Все топики одного размера (220×56), цвет #FEF3C7?
  [ ] N-1 спинных коннекторов (соседние топики, curved:false, синие)?
  [ ] У каждого топика 3–6 под-тем с КОНКРЕТНЫМИ названиями
      (а не «Подтема N»)?
  [ ] Стороны под-тем чередуются (0=left, 1=right, 2=left, ...)?
  [ ] У каждой под-темы коннектор к её РОДИТЕЛЬСКОМУ топику
      (не к соседнему, не к корню)?
  [ ] Все под-темы одного размера (190×44)?
  [ ] Никаких лишних элементов сверху/снизу/по бокам?
  [ ] Весь текст на русском?

Если MINDMAP:
  [ ] Есть РОВНО ОДИН корень в центре viewport, размер 280×100?
  [ ] Главных ветвей 4–7, ВСЕ ровно 180×64, форма rect?
  [ ] Тема содержательная?
      → ДА: у КАЖДОЙ главной ветви 3–5 под-ветвей с КОНКРЕТНЫМИ
        названиями (термины, инструменты, шаги), а не «Подтема N».
  [ ] Количество create_connector корень→ветвь = числу главных ветвей?
  [ ] У каждой под-ветви коннектор к её РОДИТЕЛЬСКОЙ ветви
      (НЕ к корню)?
  [ ] Каждый узел действительно соединён (id-шники сверены)?
  [ ] Нет лишних элементов (заголовков, стрелочных цепочек, советов
      в стикерах), которых пользователь не просил?
  [ ] Весь текст на русском?

Если хоть один пункт не выполнен — ПЕРЕД завершением вызови
недостающие create_shape / create_connector. Ответ с пропущенными
коннекторами / без под-узлов для содержательной темы / в неправильном
паттерне (mindmap вместо roadmap для обучающей темы) = брак.

═══════════════════════════════════════════════
ФИНАЛЬНОЕ НАПОМИНАНИЕ
═══════════════════════════════════════════════
Любой текст, который ты отдаёшь — и в чат, и в text / shape /
sticky / label — ВСЕГДА на русском языке. Это правило сильнее
всех остальных.`;



function sanitizeChatHistory(history: ChatMessage[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of history) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const content = typeof m.content === 'string' ? m.content.trim() : '';
    if (!content) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) {
      last.content = `${last.content}\n\n${content}`;
    } else {
      out.push({ role: m.role, content });
    }
  }
  while (out.length > 0 && out[0].role === 'assistant') out.shift();
  return out;
}


function buildAttachedElementsPreamble(
  slots: Array<{ slotId: string; label?: string; elements: CanvasElementState[]; missingIds: string[] }>,
): string {
  const elements = slots.flatMap((s) => s.elements);
  const missing  = slots.flatMap((s) => s.missingIds);

  if (elements.length === 0) {
    if (missing.length > 0) {
      return `[ВНИМАНИЕ: пользователь прикрепил элементы, но они не загрузились с доски ` +
             `(${missing.length}). Попроси его выделить элементы и прикрепить заново. ` +
             `НЕ придумывай id.]`;
    }
    return '';
  }

  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);

  const lines = elements.map((e) => {
    const r = e as Record<string, unknown>;
    const parts: string[] = [`id="${e.id}"`, `тип=${e.type}`];
    if (typeof r.shapeKind === 'string') parts.push(`форма=${r.shapeKind}`);

    const bbox = r.bbox as { minX?: number; minY?: number; maxX?: number; maxY?: number } | null | undefined;
    const x = num(r.x) ?? num(bbox?.minX);
    const y = num(r.y) ?? num(bbox?.minY);
    const w = num(r.width)  ?? (bbox && num(bbox.maxX) !== null && num(bbox.minX) !== null ? num(bbox.maxX)! - num(bbox.minX)! : null);
    const h = num(r.height) ?? (bbox && num(bbox.maxY) !== null && num(bbox.minY) !== null ? num(bbox.maxY)! - num(bbox.minY)! : null);
    if (x !== null) parts.push(`x=${x}`);
    if (y !== null) parts.push(`y=${y}`);
    if (w !== null) parts.push(`width=${w}`);
    if (h !== null) parts.push(`height=${h}`);

    if (r.text)      parts.push(`текст=${JSON.stringify(String(r.text).slice(0, 200))}`);
    if (r.fillColor) parts.push(`заливка=${r.fillColor}`);
    if (r.color && e.type === 'text') parts.push(`цвет_текста=${r.color}`);
    return `  • ${parts.join(' ')}`;
  });

  const missingNote = missing.length > 0
    ? `\n  ⚠️ Ещё ${missing.length} прикреплённых элемент(ов) не загрузились — про них спроси отдельно.`
    : '';

  return (
    `[ПРИКРЕПЛЁННЫЕ ЭЛЕМЕНТЫ ДОСКИ (${elements.length}) — пользователь ВЫДЕЛИЛ их и хочет, ` +
    `чтобы ты работал ИМЕННО с ними. Слова «эти элементы», «их», «выделенное», «они», ` +
    `«этот круг/блок» в сообщении ниже относятся к этому списку. Их id/координаты/размер — ниже.\n` +
    `ПРАВИЛА:\n` +
    `1) Используй эти id напрямую (update_element / move_element / delete_element / create_connector). ` +
    `НЕ переспрашивай «какие именно» и НЕ придумывай другие id.\n` +
    `2) ДОСТРОИТЬ / расширить / «сделай роадмапу ОТ этого» / «добавь к этому» → ` +
    `НЕ удаляй и НЕ пересоздавай прикреплённый элемент. Оставь его как есть (это ОПОРНЫЙ узел) ` +
    `и создавай НОВЫЕ элементы рядом, соединяя их коннекторами с его id. Новые элементы ` +
    `размещай вокруг его координат (x/y/width/height даны ниже), не поверх него.\n` +
    `3) Сменить ТИП (фигура→стикер и т.п.) → СНАЧАЛА create_* нового типа на ТЕХ ЖЕ ` +
    `x/y/width/height с тем же текстом, ПОТОМ delete_element старого. Никогда не удаляй до создания.\n` +
    `4) Удаляй прикреплённый элемент ТОЛЬКО если пользователь явно просит «удали»/«замени»/«сделай из него другой тип».\n` +
    lines.join('\n') + missingNote + `\n]`
  );
}


function textToHtml(text: string): string {
  const escape = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const lines = text.split('\n');
  return lines
    .map((line) => (line === '' ? '<div><br></div>' : `<div>${escape(line)}</div>`))
    .join('');
}


function textToColoredHtml(text: string, color: string): string {
  const escape = (s: string): string =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Допускаем только безопасные CSS-цвета (#hex или имя), иначе дефолт.
  const safeColor = /^#[0-9a-fA-F]{3,8}$/.test(color) || /^[a-zA-Z]+$/.test(color)
    ? color
    : '#222';
  return text
    .split('\n')
    .map((line) =>
      line === ''
        ? '<div><br></div>'
        : `<div><span style="color:${safeColor}">${escape(line)}</span></div>`,
    )
    .join('');
}


function sanitizeRichTextHtml(html: string): string {
  if (typeof html !== 'string') return '';
  let out = html;

  out = out.replace(
    /<(script|style|iframe|object|embed|noscript|template|math|svg|form|input|textarea|select|button|video|audio|canvas|img)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,
    '',
  );
  out = out.replace(
    /<(script|style|iframe|object|embed|noscript|template|math|svg|form|input|textarea|select|button|video|audio|canvas|img|meta|link|base|source|track|area|param|keygen)\b[^>]*\/?>/gi,
    '',
  );

  out = out.replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '');
  out = out.replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '');
  out = out.replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '');

  out = out.replace(
    /\s+(href|src|xlink:href|formaction|action)\s*=\s*(["'])\s*(javascript|data|vbscript):[^"']*\2/gi,
    '',
  );
  out = out.replace(
    /\s+(href|src|xlink:href|formaction|action)\s*=\s*(javascript|data|vbscript):[^\s>]+/gi,
    '',
  );

  return out;
}


const VALID_SIDES      = new Set<TAnchorSide>(['top', 'right', 'bottom', 'left']);
const VALID_ARROW_ENDS = new Set<TArrowEnd>(['none', 'arrow', 'circle']);


@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: Anthropic;

  constructor(private readonly collaborationService: CollaborationService) {
    this.client = new Anthropic({
      ...(AI_AUTH_TOKEN ? { authToken: AI_AUTH_TOKEN } : { apiKey: AI_API_KEY }),
      ...(AI_BASE_URL ? { baseURL: AI_BASE_URL } : {}),
    });
  }

  async chat(
    boardId:      string,
    userId:       string,
    message:      string,
    history:      ChatMessage[],
    viewportHint: { x: number; y: number; zoom: number; cx?: number; cy?: number; vw?: number; vh?: number } | undefined,
    contextSlots: AiContextSlot[],
    onChunk:      (e: AiChunkEvent) => void,
  ): Promise<{ txId: string; ok: boolean }> {
    const txId = nanoid();
    this.logger.log(`[ai] tx=${txId} start userId=${userId} boardId=${boardId} slots=${contextSlots.length} msg="${message.slice(0, 80)}"`);

    const ac = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const bumpDeadline = (): void => {
      clearTimeout(timer);
      timer = setTimeout(() => ac.abort(), AI_STREAM_TIMEOUT_MS);
      (timer as any).unref?.();
    };
    bumpDeadline();

    const summary = { created: 0, updated: 0, moved: 0, deleted: 0 };
    let step = 0;
    let finalText = '';

    const emit = (e: AiChunkEvent) => {
      if (e.type === 'element' || e.type === 'tool_failed') {
        (e as any).step = step;
        step++;
      }
      onChunk(e);
    };

    try {
      const allElements = await this.collaborationService.getBoardElements(boardId);
      const resolvedSlots = this.resolveContextSlots(allElements, contextSlots);
      const dynamicCtx    = buildDynamicContext(allElements, viewportHint, resolvedSlots);

      const attachedElementIds = resolvedSlots.flatMap((s) => s.elements.map((e) => e.id));

      const vc = (viewportHint && typeof viewportHint.cx === 'number' && typeof viewportHint.cy === 'number')
        ? { cx: viewportHint.cx, cy: viewportHint.cy }
        : null;
      const vr = (vc && viewportHint && typeof viewportHint.vw === 'number' && typeof viewportHint.vh === 'number')
        ? { left: vc.cx - viewportHint.vw / 2, top: vc.cy - viewportHint.vh / 2,
            right: vc.cx + viewportHint.vw / 2, bottom: vc.cy + viewportHint.vh / 2 }
        : null;
      let placeOffset: { dx: number; dy: number } | null = null;
      const adjustCreateArgs = (argsJson: string): string => {
        if (attachedElementIds.length > 0 || !vc) return argsJson;
        let a: Record<string, unknown>;
        try { a = JSON.parse(argsJson); } catch { return argsJson; }
        if (typeof a.x !== 'number' || typeof a.y !== 'number') return argsJson;
        const w = typeof a.width === 'number' ? a.width : 0;
        const h = typeof a.height === 'number' ? a.height : 0;
        if (placeOffset === null) {
          const ecx = a.x + w / 2, ecy = a.y + h / 2;
          const reach = vr ? Math.max(vr.right - vr.left, vr.bottom - vr.top) : 6000;
          const nearOrigin = ecx < 3000 && ecy < 3000 && (Math.abs(vc.cx) > 6000 || Math.abs(vc.cy) > 6000);
          const far = nearOrigin || Math.hypot(ecx - vc.cx, ecy - vc.cy) > reach * 1.2;
          placeOffset = far ? { dx: vc.cx - ecx, dy: vc.cy - ecy } : { dx: 0, dy: 0 };
          if (far) {
            this.logger.warn(
              `[ai] tx=${txId} placement: диаграмма в (${Math.round(ecx)},${Math.round(ecy)}) вне зоны ` +
              `видимости (cx=${vc.cx},cy=${vc.cy}) → сдвиг транзакции на (${Math.round(placeOffset.dx)},${Math.round(placeOffset.dy)})`,
            );
          }
        }
        a.x = (a.x as number) + placeOffset.dx;
        a.y = (a.y as number) + placeOffset.dy;
        return JSON.stringify(a);
      };

      const attachedPreamble = buildAttachedElementsPreamble(resolvedSlots);
      {
        const requested = contextSlots.reduce((n, s) => n + s.elementIds.length, 0);
        const resolved  = resolvedSlots.reduce((n, s) => n + s.elements.length, 0);
        const missing   = resolvedSlots.reduce((n, s) => n + s.missingIds.length, 0);
        this.logger.log(
          `[ai] tx=${txId} ctx2 inline=${attachedPreamble.length > 0} slots=${contextSlots.length} ` +
          `requested=${requested} resolved=${resolved} missing=${missing}`,
        );
        this.logger.log(`[ai] tx=${txId} viewport=${JSON.stringify(viewportHint ?? null)}`);
      }

      const system: Anthropic.TextBlockParam[] = [
        { type: 'text', text: STATIC_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: dynamicCtx },
      ];

      const userContent = attachedPreamble ? `${attachedPreamble}\n\n${message}` : message;

      const messages: Anthropic.MessageParam[] = sanitizeChatHistory([
        ...history,
        { role: 'user', content: userContent },
      ]).map((m) => ({ role: m.role, content: m.content } as Anthropic.MessageParam));

      for (let iter = 0; iter < 60; iter++) {
        const params: Record<string, unknown> = {
          model:      AI_MODEL,
          system,
          messages,
          tools:      ANTHROPIC_TOOLS,
          max_tokens: AI_MAX_OUTPUT_TOKENS,
        };
        if (AI_THINKING === 'adaptive') {
          params.thinking = { type: 'adaptive' };
          if (AI_EFFORT) params.output_config = { effort: AI_EFFORT };
        } else if (Number.isFinite(AI_TEMPERATURE)) {
          params.temperature = AI_TEMPERATURE;
        }

        const stream = this.client.messages.stream(
          params as unknown as Anthropic.MessageStreamParams,
          { signal: ac.signal },
        );

        for await (const event of stream) {
          bumpDeadline();
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta' &&
            event.delta.text
          ) {
            finalText += event.delta.text;
            emit({ type: 'text', txId, delta: event.delta.text });
          }
        }

        const finalMessage = await stream.finalMessage();

        messages.push({ role: 'assistant', content: finalMessage.content } as Anthropic.MessageParam);

        const toolUseBlocks = finalMessage.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
        );

        if (toolUseBlocks.length === 0) {
          break;
        }
        if (finalMessage.stop_reason === 'max_tokens') {
          this.logger.warn(`[ai] tx=${txId} ход обрезан по max_tokens — продолжаю достройку (iter=${iter})`);
        }

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of toolUseBlocks) {
          const inputJson = JSON.stringify(block.input ?? {});
          this.logger.log(`[ai] tx=${txId} tool=${block.name} input=${inputJson.slice(0, 300)}`);
          const toolResult = await this.executeTool(
            boardId, userId, txId, block.name, inputJson, emit, summary, attachedElementIds, adjustCreateArgs,
          );
          bumpDeadline(); 
          toolResults.push({
            type:        'tool_result',
            tool_use_id: block.id,
            content:     JSON.stringify(toolResult),
          });
        }
        messages.push({ role: 'user', content: toolResults });
      }

      this.logger.log(`[ai] tx=${txId} done ok=true summary=${JSON.stringify(summary)}`);
      onChunk({ type: 'done', txId, ok: true, finalMessage: finalText, summary });
      return { txId, ok: true };
    } catch (e) {
      const code: AiErrorCode = ac.signal.aborted ? 'timeout' : 'upstream';
      const msg = (e as any)?.message ?? String(e);
      this.logger.error(`[ai] tx=${txId} done ok=false code=${code} err=${msg}`);
      onChunk({ type: 'done', txId, ok: false, finalMessage: finalText, summary, error: { code, message: msg } });
      return { txId, ok: false };
    } finally {
      clearTimeout(timer);
    }
  }

  private async executeTool(
    boardId:  string,
    userId:   string,
    txId:     string,
    toolName: string,
    argsJson: string,
    emit:     (e: AiChunkEvent) => void,
    summary:  { created: number; updated: number; moved: number; deleted: number },
    attachedElementIds: string[] = [],
    adjustCreateArgs: (argsJson: string) => string = (s) => s,
  ): Promise<unknown> {
    switch (toolName) {
      case 'create_text_element': {
        const r = await this.executeCreateText(boardId, userId, txId, adjustCreateArgs(argsJson));
        if (r.element) {
          emit({ type: 'element', txId, step: 0, op: 'create', element: r.element });
          summary.created++;
        } else if (!(r.result as any)?.success) {
          emit({ type: 'tool_failed', txId, step: 0, toolName, error: String((r.result as any)?.error ?? 'unknown') });
        }
        return r.result;
      }
      case 'create_connector': {
        const r = await this.executeCreateConnector(boardId, userId, txId, argsJson);
        if (r.element) {
          emit({ type: 'element', txId, step: 0, op: 'create', element: r.element });
          summary.created++;
        } else if (!(r.result as any)?.success) {
          emit({ type: 'tool_failed', txId, step: 0, toolName, error: String((r.result as any)?.error ?? 'unknown') });
        }
        return r.result;
      }
      case 'create_shape': {
        const r = await this.executeCreateShape(boardId, userId, txId, adjustCreateArgs(argsJson));
        if (r.element) {
          emit({ type: 'element', txId, step: 0, op: 'create', element: r.element });
          summary.created++;
        } else if (!(r.result as any)?.success) {
          emit({ type: 'tool_failed', txId, step: 0, toolName, error: String((r.result as any)?.error ?? 'unknown') });
        }
        return r.result;
      }
      case 'create_sticky': {
        const r = await this.executeCreateSticky(boardId, userId, txId, adjustCreateArgs(argsJson));
        if (r.element) {
          emit({ type: 'element', txId, step: 0, op: 'create', element: r.element });
          summary.created++;
        } else if (!(r.result as any)?.success) {
          emit({ type: 'tool_failed', txId, step: 0, toolName, error: String((r.result as any)?.error ?? 'unknown') });
        }
        return r.result;
      }
      case 'update_element': {
        const r = await this.executeUpdateElement(boardId, txId, argsJson, attachedElementIds);
        if (r.success && r.elementId) {
          emit({ type: 'element', txId, step: 0, op: 'update', elementId: r.elementId, patch: r.patch });
          summary.updated++;
        } else if (!r.success) {
          emit({ type: 'tool_failed', txId, step: 0, toolName, error: r.error ?? 'unknown' });
        }
        return r;
      }
      case 'move_element': {
        const r = await this.executeMoveElement(boardId, txId, argsJson, attachedElementIds);
        if (r.success && r.elementId) {
          emit({ type: 'element', txId, step: 0, op: 'move', elementId: r.elementId, patch: r.patch });
          summary.moved++;
        } else if (!r.success) {
          emit({ type: 'tool_failed', txId, step: 0, toolName, error: r.error ?? 'unknown' });
        }
        return r;
      }
      case 'delete_element': {
        const r = await this.executeDeleteElement(boardId, txId, argsJson, attachedElementIds);
        if (r.success && r.deleted) {
          for (const id of r.deleted) {
            emit({ type: 'element', txId, step: 0, op: 'delete', elementId: id });
            summary.deleted++;
          }
        } else if (!r.success) {
          emit({ type: 'tool_failed', txId, step: 0, toolName, error: r.error ?? 'unknown' });
        }
        return r;
      }
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  }

  private resolveContextSlots(
    allElements: CanvasElementState[],
    slots:       AiContextSlot[],
  ): Array<{ slotId: string; label?: string; elements: CanvasElementState[]; missingIds: string[] }> {
    const byId = new Map(allElements.map((e) => [e.id, e]));
    return slots.map((s) => {
      const snapshotById = new Map<string, Record<string, unknown>>(
        (s.elements ?? [])
          .filter((e) => e && typeof (e as Record<string, unknown>).id === 'string')
          .map((e) => [(e as Record<string, unknown>).id as string, e as Record<string, unknown>]),
      );

      const elements:   CanvasElementState[] = [];
      const missingIds: string[]             = [];

      for (const id of s.elementIds) {
        const resolved = byId.get(id) ?? (snapshotById.get(id) as CanvasElementState | undefined);
        if (resolved) elements.push(resolved);
        else          missingIds.push(id);
      }

      if (missingIds.length > 0) {
        this.logger.warn(
          `[ai] slot ${s.slotId} (${s.label ?? '—'}): ${missingIds.length}/${s.elementIds.length} ` +
          `элемент(ов) не найдены ни в Redis, ни в снапшоте клиента: ${JSON.stringify(missingIds)}`,
        );
      }

      return { slotId: s.slotId, label: s.label, elements, missingIds };
    });
  }



  private async executeCreateText(
    boardId:  string,
    userId:   string,
    txId:     string,
    argsJson: string,
  ): Promise<{ result: unknown; element: CanvasElementState | null }> {
    try {
      const args = JSON.parse(argsJson) as {
        text:       string;
        html?:      string;
        x:          number;
        y:          number;
        fontSize?:  number;
        color?:     string;
        textAlign?: 'left' | 'center' | 'right';
      };

      if (typeof args.text !== 'string' || typeof args.x !== 'number' || typeof args.y !== 'number') {
        return { result: { success: false, error: 'text/x/y are required' }, element: null };
      }

      const safeHtml = args.html ? sanitizeRichTextHtml(args.html) : undefined;

      const element = await this.collaborationService.createElement(boardId, {
        type:            'text',
        text:            args.text,
        ...(safeHtml ? { html: safeHtml } : {}),
        x:               args.x,
        y:               args.y,
        fontSize:        args.fontSize  ?? 16,
        color:           args.color     ?? '#222',
        textAlign:       args.textAlign ?? 'left',
        userId,
        boardId,
        createdAt:       Date.now(),
        aiTransactionId: txId,
      });

      return { result: { success: true, elementId: element.id }, element };
    } catch (e) {
      return { result: { success: false, error: String(e) }, element: null };
    }
  }


  private async executeCreateConnector(
    boardId:  string,
    userId:   string,
    txId:     string,
    argsJson: string,
  ): Promise<{ result: unknown; element: CanvasElementState | null }> {
    try {
      const args = JSON.parse(argsJson) as {
        startElementId: string;
        startSide:      TAnchorSide;
        endElementId:   string;
        endSide:        TAnchorSide;
        strokeColor?:   string;
        strokeWidth?:   number;
        startArrow?:    TArrowEnd;
        endArrow?:      TArrowEnd;
        curved?:        boolean;
        label?:         string;
      };

      if (typeof args.startElementId !== 'string' || typeof args.endElementId !== 'string') {
        return { result: { success: false, error: 'startElementId and endElementId are required' }, element: null };
      }
      if (!VALID_SIDES.has(args.startSide) || !VALID_SIDES.has(args.endSide)) {
        return { result: { success: false, error: 'startSide and endSide must be one of top|right|bottom|left' }, element: null };
      }
      if (args.startElementId === args.endElementId) {
        return { result: { success: false, error: 'Self-loops are not allowed (startElementId === endElementId)' }, element: null };
      }
      if (args.startArrow && !VALID_ARROW_ENDS.has(args.startArrow)) {
        return { result: { success: false, error: 'startArrow must be one of none|arrow|circle' }, element: null };
      }
      if (args.endArrow && !VALID_ARROW_ENDS.has(args.endArrow)) {
        return { result: { success: false, error: 'endArrow must be one of none|arrow|circle' }, element: null };
      }


      const boardEls = await this.collaborationService.getBoardElements(boardId);
      const startEl  = boardEls.find((e) => e.id === args.startElementId);
      const endEl    = boardEls.find((e) => e.id === args.endElementId);
      if (!startEl) {
        return { result: { success: false, error: `startElementId not found: ${args.startElementId}` }, element: null };
      }
      if (!endEl) {
        return { result: { success: false, error: `endElementId not found: ${args.endElementId}` }, element: null };
      }
      if (startEl.type === 'connector' || endEl.type === 'connector') {
        return { result: { success: false, error: 'Connectors cannot attach to other connectors' }, element: null };
      }

      const element = await this.collaborationService.createElement(boardId, {
        type:        'connector',
        start:       { kind: 'anchor', elementId: args.startElementId, side: args.startSide },
        end:         { kind: 'anchor', elementId: args.endElementId,   side: args.endSide   },
        strokeColor: args.strokeColor ?? '#222',
        strokeWidth: args.strokeWidth ?? 2,
        startArrow:  args.startArrow  ?? 'none',
        endArrow:    args.endArrow    ?? 'arrow',
        curved:      args.curved      ?? true,
        ...(args.label ? { label: args.label } : {}),
        userId,
        boardId,
        createdAt:   Date.now(),
        aiTransactionId: txId,
      });

      return { result: { success: true, elementId: element.id }, element };
    } catch (e) {
      return { result: { success: false, error: String(e) }, element: null };
    }
  }


  private async executeCreateShape(
    boardId:  string,
    userId:   string,
    txId:     string,
    argsJson: string,
  ): Promise<{ result: unknown; element: CanvasElementState | null }> {
    try {
      const args = JSON.parse(argsJson) as {
        shapeKind:     'rect' | 'ellipse' | 'diamond' | 'triangle';
        x:             number;
        y:             number;
        width:         number;
        height:        number;
        text?:         string;
        html?:         string;
        fontSize?:     number;
        autoFontSize?: boolean;
        textAlign?:    'left' | 'center' | 'right';
        strokeColor?:  string;
        strokeWidth?:  number;
        fillColor?:    string;
      };

      const VALID_KINDS = new Set(['rect', 'ellipse', 'diamond', 'triangle']);
      if (!VALID_KINDS.has(args.shapeKind)) {
        return { result: { success: false, error: 'shapeKind должен быть один из rect|ellipse|diamond|triangle' }, element: null };
      }
      if (typeof args.x !== 'number' || typeof args.y !== 'number' ||
          typeof args.width !== 'number' || typeof args.height !== 'number') {
        return { result: { success: false, error: 'x, y, width, height обязательны и должны быть числами' }, element: null };
      }
      if (args.width <= 0 || args.height <= 0) {
        return { result: { success: false, error: 'width и height должны быть > 0' }, element: null };
      }

      const plainText = args.text ?? '';
      const safeHtml  = args.html
        ? sanitizeRichTextHtml(args.html)
        : (plainText ? textToHtml(plainText) : '');

      const element = await this.collaborationService.createElement(boardId, {
        type:            'shape',
        shapeKind:       args.shapeKind,
        x:               args.x,
        y:               args.y,
        width:           args.width,
        height:          args.height,
        text:            plainText,
        html:            safeHtml,
        fontSize:        args.fontSize     ?? 16,
        autoFontSize:    args.autoFontSize ?? true,
        textAlign:       args.textAlign    ?? 'center',
        strokeColor:     args.strokeColor  ?? '#222',
        strokeWidth:     args.strokeWidth  ?? 2,
        fillColor:       args.fillColor    ?? 'transparent',
        userId,
        boardId,
        createdAt:       Date.now(),
        aiTransactionId: txId,
      });

      return { result: { success: true, elementId: element.id }, element };
    } catch (e) {
      return { result: { success: false, error: String(e) }, element: null };
    }
  }


  private async executeCreateSticky(
    boardId:  string,
    userId:   string,
    txId:     string,
    argsJson: string,
  ): Promise<{ result: unknown; element: CanvasElementState | null }> {
    try {
      const args = JSON.parse(argsJson) as {
        x:             number;
        y:             number;
        width:         number;
        height:        number;
        color:         string;
        text:          string;
        html?:         string;
        fontSize?:     number;
        autoFontSize?: boolean;
        textAlign?:    'left' | 'center' | 'right';
      };

      if (typeof args.x !== 'number' || typeof args.y !== 'number' ||
          typeof args.width !== 'number' || typeof args.height !== 'number') {
        return { result: { success: false, error: 'x, y, width, height должны быть числами' }, element: null };
      }
      if (args.width < 40 || args.height < 40) {
        return { result: { success: false, error: 'width и height минимум 40' }, element: null };
      }
      if (typeof args.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(args.color)) {
        return { result: { success: false, error: 'color должен быть HEX6 строкой вида #RRGGBB' }, element: null };
      }
      if (typeof args.text !== 'string') {
        return { result: { success: false, error: 'text обязателен и должен быть строкой' }, element: null };
      }

      const safeHtml = args.html
        ? sanitizeRichTextHtml(args.html)
        : (args.text ? textToHtml(args.text) : '');

      const element = await this.collaborationService.createElement(boardId, {
        type:            'sticky',
        x:               args.x,
        y:               args.y,
        width:           args.width,
        height:          args.height,
        color:           args.color,
        text:            args.text,
        html:            safeHtml,
        fontSize:        args.fontSize     ?? 16,
        autoFontSize:    args.autoFontSize ?? true,
        textAlign:       args.textAlign    ?? 'left',
        userId,
        boardId,
        createdAt:       Date.now(),
        aiTransactionId: txId,
      });

      return { result: { success: true, elementId: element.id }, element };
    } catch (e) {
      return { result: { success: false, error: String(e) }, element: null };
    }
  }


  private async executeUpdateElement(
    boardId:  string,
    txId:     string,
    argsJson: string,
    attachedElementIds: string[] = [],
  ): Promise<{ success: boolean; error?: string; elementId?: string; patch?: Record<string, unknown> }> {
    const FORBIDDEN = new Set(['id', 'type', 'userId', 'boardId', 'createdAt', 'aiTransactionId', 'x', 'y']);

    let args: Record<string, unknown>;
    try {
      args = JSON.parse(argsJson);
    } catch {
      return { success: false, error: 'Invalid JSON arguments' };
    }

    if (typeof args.elementId !== 'string' || !args.elementId) {
      return { success: false, error: 'elementId is required' };
    }
    const elementId = args.elementId;

    const collected: Record<string, unknown> = {};
    if (args.fields && typeof args.fields === 'object' && !Array.isArray(args.fields)) {
      for (const [k, v] of Object.entries(args.fields as Record<string, unknown>)) collected[k] = v;
    }
    for (const [k, v] of Object.entries(args)) {
      if (k === 'elementId' || k === 'fields') continue;
      collected[k] = v;
    }

    const keys = Object.keys(collected);
    if (keys.length === 0) {
      return { success: false, error: 'no fields to update: передай хотя бы одно поле (например fillColor) прямо параметром' };
    }
    if (keys.length > 20) {
      return { success: false, error: 'too many fields (limit 20)' };
    }
    const forbiddenHit = keys.find((k) => FORBIDDEN.has(k));
    if (forbiddenHit) {
      return { success: false, error: `Field "${forbiddenHit}" is forbidden in update_element (use move_element for x/y; type/id are immutable)` };
    }

    const all = await this.collaborationService.getBoardElements(boardId);
    let target = all.find((e) => e.id === elementId);

    if (!target && attachedElementIds.length === 1) {
      const fallback = all.find((e) => e.id === attachedElementIds[0]);
      if (fallback) {
        this.logger.warn(
          `[ai] tx=${txId} update: id "${elementId}" не найден; ` +
          `подменяю на единственный прикреплённый ${fallback.id}`,
        );
        target = fallback;
      }
    }
    if (!target) {
      return { success: false, error: `Element not found: ${elementId}` };
    }

    const patch: Record<string, unknown> = { ...collected };

    if (typeof patch.color === 'string' && typeof patch.html !== 'string' && target.type === 'shape') {
      const t     = target as Record<string, unknown>;
      const plain = (typeof patch.text === 'string' ? patch.text : (t.text as string)) ?? '';
      if (plain) {
        patch.html = textToColoredHtml(plain, patch.color as string);
        delete patch.color; // у shape это поле не имеет смысла
        this.logger.log(`[ai] tx=${txId} shape color→html для ${target.id}`);
      }
    }

    if (typeof patch.html === 'string') {
      patch.html = sanitizeRichTextHtml(patch.html);
    }

    const updated = await this.collaborationService.updateElement(boardId, target.id, patch);
    if (!updated) {
      return { success: false, error: `Element not found: ${target.id}` };
    }

    this.logger.log(`[ai] tx=${txId} op=update elementId=${target.id}`);
    return { success: true, elementId: updated.id, patch };
  }

  private async executeMoveElement(
    boardId:  string,
    txId:     string,
    argsJson: string,
    attachedElementIds: string[] = [],
  ): Promise<{ success: boolean; error?: string; elementId?: string; patch?: Record<string, unknown> }> {
    let args: { elementId: string; x: number; y: number };
    try {
      args = JSON.parse(argsJson);
    } catch {
      return { success: false, error: 'Invalid JSON arguments' };
    }

    if (typeof args.elementId !== 'string' || !args.elementId) {
      return { success: false, error: 'elementId is required' };
    }
    if (typeof args.x !== 'number' || typeof args.y !== 'number') {
      return { success: false, error: 'x and y must be numbers' };
    }
    if (args.x < 0 || args.x > 300_000 || args.y < 0 || args.y > 65_000) {
      return { success: false, error: 'x must be in [0, 300000] and y in [0, 65000]' };
    }

    const all = await this.collaborationService.getBoardElements(boardId);
    let target = all.find((e) => e.id === args.elementId);
    if (!target && attachedElementIds.length === 1) {
      const fallback = all.find((e) => e.id === attachedElementIds[0]);
      if (fallback) {
        this.logger.warn(`[ai] tx=${txId} move: id "${args.elementId}" не найден; подменяю на ${fallback.id}`);
        target = fallback;
      }
    }
    if (!target) {
      return { success: false, error: `Element not found: ${args.elementId}` };
    }
    if (target.type === 'connector') {
      return { success: false, error: 'move_element does not work for connectors. Use update_element with startSide/endSide or delete+create.' };
    }

    const patch = { x: args.x, y: args.y };
    const updated = await this.collaborationService.updateElement(boardId, target.id, patch);
    if (!updated) {
      return { success: false, error: `Element not found at update time: ${target.id}` };
    }

    this.logger.log(`[ai] tx=${txId} op=move elementId=${target.id} x=${args.x} y=${args.y}`);
    return { success: true, elementId: updated.id, patch };
  }

  private async executeDeleteElement(
    boardId:  string,
    txId:     string,
    argsJson: string,
    attachedElementIds: string[] = [],
  ): Promise<{ success: boolean; error?: string; deleted?: string[] }> {
    let args: { elementId: string };
    try {
      args = JSON.parse(argsJson);
    } catch {
      return { success: false, error: 'Invalid JSON arguments' };
    }

    if (typeof args.elementId !== 'string' || !args.elementId) {
      return { success: false, error: 'elementId is required' };
    }

    const all = await this.collaborationService.getBoardElements(boardId);
    let target = all.find((e) => e.id === args.elementId);
    if (!target && attachedElementIds.length === 1) {
      const fallback = all.find((e) => e.id === attachedElementIds[0]);
      if (fallback) {
        this.logger.warn(`[ai] tx=${txId} delete: id "${args.elementId}" не найден; подменяю на ${fallback.id}`);
        target = fallback;
      }
    }
    if (!target) {
      return { success: false, error: `Element not found: ${args.elementId}` };
    }
    const targetId = target.id;

    const cascade = all
      .filter((e) => e.type === 'connector')
      .filter((c) => {
        const start = (c as Record<string, unknown>).start as { elementId?: string } | undefined;
        const end   = (c as Record<string, unknown>).end   as { elementId?: string } | undefined;
        return start?.elementId === targetId || end?.elementId === targetId;
      })
      .map((c) => c.id);

    const toDelete = [targetId, ...cascade];
    await this.collaborationService.deleteElements(boardId, toDelete);

    this.logger.log(`[ai] tx=${txId} op=delete elementId=${targetId} cascade=${cascade.length}`);
    return { success: true, deleted: toDelete };
  }
}
