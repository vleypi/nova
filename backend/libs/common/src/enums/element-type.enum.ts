export enum ElementType {
  SHAPE = 'SHAPE',
  TEXT = 'TEXT',
  STICKY_NOTE = 'STICKY_NOTE',
  IMAGE = 'IMAGE',
  ARROW = 'ARROW',
  FRAME = 'FRAME',
  PEN = 'PEN',
}

export interface ShapeData {
  shapeType: 'rectangle' | 'circle' | 'diamond' | 'triangle' | 'star' | 'hexagon';
  fill: string;
  stroke: string;
  strokeWidth: number;
  text?: string;
  fontSize?: number;
  textColor?: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface TextData {
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right';
  color: string;
}

export interface StickyNoteData {
  text: string;
  html?: string;
  fontSize: number;
  autoFontSize: boolean;
  textAlign: 'left' | 'center' | 'right';
  color: string;
}

export interface ImageData {
  src: string;
  objectFit: 'contain' | 'cover' | 'fill';
  alt?: string;
}

export interface ArrowData {
  points: { x: number; y: number }[];
  strokeColor: string;
  strokeWidth: number;
  startArrowType: 'none' | 'arrow' | 'circle';
  endArrowType: 'none' | 'arrow' | 'circle';
  fromElementId?: string;
  toElementId?: string;
  curved: boolean;
  label?: string;
}

export interface FrameData {
  title: string;
  backgroundColor: string;
  showTitle: boolean;
  childIds: string[];
}

export interface PenData {
  points: { x: number; y: number }[];
  strokeColor: string;
  strokeWidth: number;
  smoothing: number;
}

export type ElementData =
  | ShapeData
  | TextData
  | StickyNoteData
  | ImageData
  | ArrowData
  | FrameData
  | PenData;
