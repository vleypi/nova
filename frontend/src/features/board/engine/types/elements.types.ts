// Точка в мировых координатах.
export interface IPoint {
  x: number;
  y: number;
}

// Прямоугольник в мировых координатах. Хранится у каждого элемента для RBush-индекса.
export interface IStrokeBbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

// Чистая геометрия штриха карандаша. Используется и в IStrokeElement, и для текущего рисуемого штриха в рендерере.
export interface IStroke {
  points: IPoint[];
  color: string;
  width: number;
  bbox?: IStrokeBbox;
}

// Общая основа всех элементов доски. Конкретные типы расширяют её и сужают type до строкового литерала.
export interface IBaseElement {
  id: string;
  type: string;
  userId: string;
  boardId: string;
  createdAt: number;
  /** Если элемент создан в рамках AI-транзакции, бэк присылает её id здесь.
   *  Используется для группировки undo и фильтрации в трекере. */
  aiTransactionId?: string;
  bbox?: IStrokeBbox;
}

// Штрих карандаша как элемент доски.
export interface IStrokeElement extends IBaseElement, IStroke {
  type: "stroke";
}

// Текстовый блок. html хранит размеченный контент, text - plain-текст для поиска и копирования.
export interface ITextElement extends IBaseElement {
  type: "text";
  text: string;
  html?: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  textAlign?: "left" | "center" | "right";
}

// Сторона элемента, к которой может привязываться endpoint коннектора.
export type TAnchorSide = "top" | "right" | "bottom" | "left";

// Тип наконечника на конце коннектора.
export type TArrowEnd = "none" | "arrow" | "circle";

// Конец коннектора: либо свободная точка в мире, либо привязка к стороне элемента.
export type TConnectorEndpoint =
  | {
      kind: "free";
      x: number;
      y: number;
    }
  | {
      kind: "anchor";
      elementId: string;
      side: TAnchorSide;
    };

// Коннектор-стрелка между двумя точками. Может быть прямой или кривой Безье.
export interface IConnectorElement extends IBaseElement {
  type: "connector";
  start: TConnectorEndpoint;
  end: TConnectorEndpoint;
  strokeColor: string;
  strokeWidth: number;
  startArrow: TArrowEnd;
  endArrow: TArrowEnd;
  curved: boolean;
  label?: string;
}

// Стикер с rich-текстом и фоном. Размер фиксированный, текст автоподгоняется при autoFontSize.
export interface IStickyElement extends IBaseElement {
  type: "sticky";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  html: string;
  text: string;
  fontSize: number;
  autoFontSize: boolean;
  textAlign: "left" | "center" | "right";
}

// Жизненный цикл картинки на доске.
// pending - локально создан, идёт upload; ready - на сервере, src указывает на proxy-url; failed - upload не удался.
export type TImageStatus = "pending" | "ready" | "failed";

// Картинка на доске. До завершения upload src=null, после - proxy-url с сервера.
export interface IImageElement extends IBaseElement {
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  mime: string;
  sha256: string;
  status: TImageStatus;
  src: string | null;
  assetId: string | null;
  objectFit: "contain" | "cover" | "fill";
  alt?: string;
}

// Дискриминатор подтипа фигуры. Все четыре кладутся в один bbox-прямоугольник.
export type TShapeKind = "rect" | "ellipse" | "diamond" | "triangle";

// Геометрическая фигура. Hit и draw диспетчеризуются по shapeKind, остальное общее.
// fillColor === "transparent" означает только обводку без заливки.
// Содержит rich-text по образцу sticky: text + html + autoFontSize.
export interface IShapeElement extends IBaseElement {
  type: "shape";
  shapeKind: TShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  text: string;
  html: string;
  fontSize: number;
  autoFontSize: boolean;
  textAlign: "left" | "center" | "right";
}

// Главный union всех элементов доски. Дискриминатор - поле type.
// Добавление нового типа элемента требует расширить этот union и зарегистрировать handler.
export type IElement =
  | IStrokeElement
  | ITextElement
  | IConnectorElement
  | IStickyElement
  | IImageElement
  | IShapeElement;

// Точка следа ластика на экране. sx/sy в screen-пикселях, t - timestamp для затухания.
export interface IEraserTrailPoint {
  sx: number;
  sy: number;
  t: number;
}

// Bbox группы выделенных элементов в экранных координатах.
export interface IGroupBbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Снимок состояния одного элемента. data специфична для типа и непрозрачна снаружи.
export interface IElementSnapshot {
  id: string;
  data: unknown;
}

// Изменение одного элемента в history-entry: до и после.
export interface IElementChange {
  id: string;
  oldData: unknown;
  newData: unknown;
}
