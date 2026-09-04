import { IGridLevel, TShapeKind } from "@/features/board/engine/types";
export const MIN_ZOOM = 0.01;
export const MAX_ZOOM = 4;
// Размеры рабочей области доски в мировых единицах. Камера не пускает viewport за эти границы.
export const BOARD_WORLD_WIDTH = 300000;
export const BOARD_WORLD_HEIGHT = 65000;
export const GRID_LEVELS: IGridLevel[] = [
  { size: 10, maxAlpha: 0.03 },
  { size: 50, maxAlpha: 0.03 },
  { size: 250, maxAlpha: 0.04 },
  { size: 1250, maxAlpha: 0.04 },
  { size: 6250, maxAlpha: 0.04 },
];
// Минимальный экранный шаг сетки в пикселях. Меньше — не рисуем.
export const GRID_MIN_SPACING_PX = 4;
// Максимальный экранный шаг сетки. Больше — линии слишком разнесены, невидимо.
export const GRID_MAX_SPACING_PX = 4000;
// Линии плавно появляются от GRID_FADE_IN_START до GRID_FADE_IN_START + GRID_FADE_IN_RANGE.
export const GRID_FADE_IN_START = 6;
export const GRID_FADE_IN_RANGE = 42;
// Линии плавно исчезают от GRID_MAX_SPACING_PX до GRID_MAX_SPACING_PX - GRID_FADE_OUT_RANGE.
export const GRID_FADE_OUT_RANGE = 2000;
// Порог видимости alpha. Ниже — пропускаем уровень.
export const GRID_MIN_ALPHA = 0.002;

// Чувствительность зума колесом мыши. Применяется как exp(-deltaY * sens).
export const WHEEL_ZOOM_SENSITIVITY = 0.01;

// Максимум картинок в LRU-кеше ImageCache. Старейшие вытесняются при превышении.
export const IMAGE_CACHE_DEFAULT_SIZE = 150;

// ImageCompressor: размеры в байтах, качество и пороги downscale.
// Картинки меньше SKIP_BELOW не сжимаем.
export const IMAGE_COMPRESS_SKIP_BELOW_BYTES = 50_000;
// Целевой потолок размера после сжатия.
export const IMAGE_COMPRESS_TARGET_MAX_BYTES = 1_000_000;
// Стартовое качество WebP.
export const IMAGE_COMPRESS_DEFAULT_QUALITY = 0.85;
// Если стартовое не помогло, пробуем эти значения по убыванию.
export const IMAGE_COMPRESS_FALLBACK_QUALITIES = [0.7, 0.5, 0.3];
// Минимальная сторона при downscale: ниже не уменьшаем.
export const IMAGE_COMPRESS_MIN_DIMENSION = 640;
// Коэффициент уменьшения каждой итерации downscale.
export const IMAGE_COMPRESS_DOWNSCALE_RATIO = 0.75;
// Качество WebP при downscale-итерациях.
export const IMAGE_COMPRESS_DOWNSCALE_QUALITY = 0.5;

// ImageUploader: общий дедлайн на все попытки загрузки одной картинки.
export const IMAGE_UPLOAD_OVERALL_TIMEOUT_MS = 30_000;
// Задержки между ретраями presign/PUT/confirm в миллисекундах.
export const IMAGE_UPLOAD_BACKOFFS = [300, 900];
// Через сколько миллисекунд после fail удалять элемент с доски.
export const IMAGE_UPLOAD_FAILED_CLEANUP_DELAY_MS = 5000;

// PasteHandler: лимиты и MIME-типы для вставки картинок.
export const PASTE_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const PASTE_MIME_WHITELIST: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
// Максимальная сторона вставляемой картинки на доске в мировых координатах.
export const PASTE_IMAGE_MAX_DIM = 1024;
// Минимальный интервал между двумя успешными paste, мс.
export const PASTE_DEBOUNCE_MS = 500;
// Окно для лимита на количество paste.
export const PASTE_WINDOW_MS = 60_000;
// Сколько paste за окно разрешено.
export const PASTE_WINDOW_LIMIT = 20;

// Кастомный MIME для нашего clipboard-формата (board-элементы как JSON).
export const BOARD_CLIPBOARD_MIME = "application/x-nova-board+json";
export const BOARD_CLIPBOARD_VERSION = 1;

// WS-валидация: максимальные длины строк в принимаемых сообщениях.
export const WS_MAX_ID_LENGTH = 36;
export const WS_MAX_STRING_LENGTH = 50000;

// Шаг кнопочного зума (zoomIn умножает, zoomOut делит на эту величину).
export const ZOOM_STEP_FACTOR = 1.25;
// Скорость сходимости анимации кнопочного зума к цели (на каждый кадр).
export const ZOOM_ANIMATION_EASING = 0.18;
// Порог завершения анимации зума: ближе этого — финальный кадр в точку target.
export const ZOOM_ANIMATION_EPSILON = 0.001;
export const PAD_CSS = 512;
export const ERASER_TRAIL_DURATION = 100;
export const ERASER_TRAIL_RADIUS = 8;
export const ERASER_TRAIL_ALPHA = 1;
export const ERASER_TRAIL_COLOR = "rgba(180,180,180,1)";
export const HANDLE_RADIUS = 5;
export const HANDLE_HIT = 12;
export const DEFAULT_STROKE_COLOR = "#222";
export const DEFAULT_STROKE_WIDTH = 2;
export const ERASER_TOLERANCE = 4;
export const DEFAULT_TEXT_FONT_SIZE = 16;
export const DEFAULT_TEXT_COLOR = "#222";
export const TEXT_LINE_HEIGHT = 1.2;
export const TEXT_FONT_FAMILY = "Inter, sans-serif";
export const PASTE_OFFSET = 20;
export const CURSOR_THROTTLE_MS = 50;
export const MIN_TEXT_FONT_SIZE = 4;
// EditorResize: минимальный коэффициент масштабирования при ресайзе текста.
export const TEXT_RESIZE_MIN_SCALE = 0.1;
// EditorResize: минимум расстояния до якоря в начале ресайза, чтобы избежать деления на ноль.
export const TEXT_RESIZE_MIN_INITIAL_DIST = 1;
export const TEXT_OVERLAY_Z_INDEX = 100;
export const TEXT_HANDLE_Z_INDEX = 101;
export const TEXT_BORDER_COLOR = "rgba(66,98,255,0.7)";
export const TEXT_HANDLE_BG = "#fff";
export const TEXT_HANDLE_STROKE = "rgba(66,98,255,0.9)";
export const TEXT_OVERLAY_STROKE_W = 1.5;
export const TEXT_DRAG_BAR_H = 18;
export const TEXT_PLACEHOLDER = "Введите текст...";
// Минимальная ширина измеренного контента inline-редактора в пикселях. Ниже подставляем плейсхолдер.
export const EDITOR_MIN_CONTENT_WIDTH_PX = 4;
// Дополнение к ширине после плейсхолдера, чтобы каретка не упиралась в край.
export const EDITOR_PLACEHOLDER_WIDTH_PAD_PX = 2;
// Базовое горизонтальное поле inline-редактора в мировых единицах (умножается на zoom).
export const EDITOR_TEXT_FRAME_PAD_WORLD_PX = 2;
// Через сколько мс после последней активности камеры показать тулбар обратно.
export const EDITOR_TOOLBAR_REVEAL_DELAY_MS = 120;
// Длительность плавного появления и пропадания тулбара inline-редактора.
export const EDITOR_TOOLBAR_FADE_MS = 50;
// Окно после показа тулбара, поглощающее остаточную инерцию трекпада.
export const EDITOR_TOOLBAR_AFTER_SHOW_GRACE_MS = 300;
// Ниже этой совокупной дельты pan камеры активность считаем шумом трекпада на лифте, а не реальным жестом.
export const EDITOR_TOOLBAR_MIN_PAN_DELTA_PX = 1.5;
export const DEFAULT_CONNECTOR_COLOR = "#222";
export const DEFAULT_CONNECTOR_WIDTH = 2;
export const CONNECTOR_CTRL_MIN = 40;
export const CONNECTOR_CTRL_RATIO = 1 / 3;
export const CONNECTOR_HIT_TOLERANCE = 6;
export const CONNECTOR_BBOX_STEPS = 24;
export const CONNECTOR_HIT_STEPS = 32;
export const CONNECTOR_ARROW_HEAD_SIZE = 10;
export const ANCHOR_RADIUS = 7;
export const ANCHOR_HIT_RADIUS = 22;
export const ANCHOR_PAD_PX = 16;
export const SNAP_HOVER_PAD_PX = 28;
export const ANCHOR_FILL = "#fff";
export const ANCHOR_STROKE = "rgba(66,98,255,0.9)";
export const ANCHOR_LINE_WIDTH = 1.5;
// Идентификатор временного элемента-превью коннектора при создании.
export const CONNECTOR_PREVIEW_ID = "__connector_preview__";
// Прозрачность превью-коннектора при рисовании.
export const CONNECTOR_PREVIEW_ALPHA = 0.7;

// sticky notes 
export const DEFAULT_STICKY_SIZE = 200;
export const MIN_STICKY_SIZE = 40;
export const STICKY_PADDING = 12;
export const STICKY_MIN_FONT_SIZE = 8;
export const STICKY_MAX_FONT_SIZE = 96;
export const STICKY_DEFAULT_FONT_SIZE = 24;
export const STICKY_CORNER_RADIUS = 2;
export const STICKY_SHADOW_BLUR = 8;
export const STICKY_SHADOW_Y_OFFSET = 2;
export const STICKY_SHADOW_ALPHA = 0.15;
export const STICKY_PALETTE: readonly string[] = [
  "#FFF4A3",
  "#FFC870", "#FF8A8A",
  "#FFC3E6", "#FF9EE0",
  "#B8C8FF",
  "#A8E0FF", "#6FA8F0",
  "#9FE0CC", "#74D499",
  "#CDEF9F", "#A7E063",
  "#1F1F1F",
];
export const STICKY_DEFAULT_COLOR = STICKY_PALETTE[0];
export const STICKY_FIXED_FONT_SIZES = [12, 16, 20, 24, 32, 48, 64] as const;

// shapes
// Дефолтный fill для новых фигур: пустая заливка, видна только обводка.
export const DEFAULT_SHAPE_FILL = "transparent";
// Размер фигуры при click-to-default (без drag).
export const DEFAULT_SHAPE_SIZE = 100;
// Минимальная сторона фигуры после ресайза/создания, чтоб не было нулевых фигур.
export const MIN_SHAPE_SIZE = 8;

// Внутренний padding текста внутри фигуры. Соответствует STICKY_PADDING.
export const SHAPE_TEXT_PADDING = 12;

// Диапазон auto-fit размера шрифта внутри фигуры. Совпадает со sticky-диапазоном,
// но имена shape-специфичные: будущее изменение sticky-границ не должно неявно
// тянуть shape за собой.
export const SHAPE_MIN_FONT_SIZE = 8;
export const SHAPE_MAX_FONT_SIZE = 96;
export const SHAPE_DEFAULT_FONT_SIZE = 24;

// Палитра для fill-picker'а в shape-edit-toolbar. "transparent" - спецзначение для
// обводки без заливки (overlay показывает полу-белый fallback во время edit).
export const SHAPE_FILL_PALETTE: readonly string[] = [
  "transparent",
  "#FFFFFF", "#1F1F1F",
  "#FFE066", "#FF8A8A",
  "#FFC3E6", "#B8C8FF",
  "#A8E0FF", "#9FE0CC",
  "#CDEF9F",
];

// Палитра для stroke-picker'а в shape-edit-toolbar.
export const SHAPE_STROKE_PALETTE: readonly string[] = [
  "#1F1F1F", "#666666",
  "#E53935", "#F4511E",
  "#FB8C00", "#FFB300",
  "#43A047", "#039BE5",
  "#3949AB", "#8E24AA",
];

// Полный список shapeKind для kind-switcher в shape-edit-toolbar.
export const SHAPE_KIND_LIST: readonly TShapeKind[] = [
  "rect",
  "ellipse",
  "diamond",
  "triangle",
];

// history
export const MAX_HISTORY_SIZE = 200;

// AI context slots: максимум элементов в одном слоте.
// Должен совпадать с бэк AI_MAX_ELEMENTS_PER_SLOT (валидация в gateway).
export const MAX_SLOT_ELEMENTS = 100;

// Минимальное расстояние до якоря при drag-resize, ниже которого считаем делитель нулём.
export const RESIZE_MIN_DELTA_THRESHOLD = 0.01;

// SelectTool: двойной клик
// Максимальный интервал между двумя нажатиями, считающимися двойным кликом.
export const DOUBLE_CLICK_MS = 350;
// Максимальное смещение между двумя нажатиями, считающимися двойным кликом.
export const DOUBLE_CLICK_SLOP_PX = 6;

// selection
export const SELECTION_BORDER_COLOR = "rgba(66,98,255,0.7)";
export const SELECTION_GROUP_BORDER_COLOR = "rgba(66,98,255,0.85)";
export const SELECTION_HANDLE_FILL = "#fff";
export const SELECTION_HANDLE_STROKE = "rgba(66,98,255,0.9)";
export const SELECTION_LINE_WIDTH = 1.5;
// Расстояние от края контейнера, на котором включается авто-пан при drag-rect.
export const SELECTION_AUTOPAN_EDGE_MARGIN = 50;
// Скорость авто-пана в пикселях за кадр.
export const SELECTION_AUTOPAN_SPEED = 14;
// Если экранное смещение от старта меньше этого числа, считаем кликом, а не drag-rect.
export const SELECTION_CLICK_THRESHOLD_PX = 3;

// image placeholder
export const IMAGE_PLACEHOLDER_BG = "#f3f4f6";
export const IMAGE_PLACEHOLDER_BORDER = "#9ca3af";
export const IMAGE_PLACEHOLDER_TEXT = "#6b7280";
export const IMAGE_FAILED_BORDER = "#dc2626";
export const IMAGE_PLACEHOLDER_BORDER_WIDTH = 2;
export const IMAGE_PLACEHOLDER_INSET_PX = 1;
export const IMAGE_PLACEHOLDER_FONT = "12px system-ui, sans-serif";
export const IMAGE_PLACEHOLDER_TEXT_BOTTOM_PAD_PX = 6;

// image spinner (placeholder во время загрузки)
export const IMAGE_SPINNER_MAX_RADIUS_PX = 12;
export const IMAGE_SPINNER_RADIUS_DIVIDER = 4;
export const IMAGE_SPINNER_LINE_WIDTH = 2.5;
export const IMAGE_SPINNER_PERIOD_MS = 600;
export const IMAGE_SPINNER_ARC_ANGLE = Math.PI * 1.4;

// Минимальная ширина штриха после resize.
export const STROKE_MIN_WIDTH = 0.5;

// Минимальная толщина линии коннектора после resize.
export const CONNECTOR_MIN_STROKE_WIDTH = 0.5;

// Минимальная сторона картинки после resize, чтобы placeholder text оставался читабельным.
export const MIN_IMAGE_SIZE = 16;

// Горизонтальный отступ bbox текста, чтобы каретка не упиралась в край.
export const TEXT_BBOX_PAD_PX = 2;

// Цвет ссылок в rich-тексте (синий).
export const TEXT_LINK_COLOR = "#4262ff";
