export const TEXT_TOOLBAR_Z_INDEX = 150;
export const TEXT_TOOLBAR_GAP = 90;
export const FONT_SIZE_STEP = 2;
export const MIN_TOOLBAR_FONT_SIZE = 4;
export const MAX_TOOLBAR_FONT_SIZE = 200;
export interface ITextToolbarAction {
  type: "action";
  id: string;
  tooltip: string;
  svgInner: string;
}
export type ITextToolbarItem =
  | ITextToolbarAction
  | {
      type: "separator";
    };
function sp(d: string): string {
  return `<path d="${d}" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
}
export const TEXT_TOOLBAR_ITEMS: ITextToolbarItem[] = [
  {
    type: "action",
    id: "fontStyle",
    tooltip: "Стиль шрифта",
    svgInner: sp("M4 7V4h16v3M9 20h6M12 4v16"),
  },
  {
    type: "action",
    id: "alignment",
    tooltip: "Выравнивание",
    svgInner: sp("M21 6H3M15 12H3M17 18H3"),
  },
  {
    type: "action",
    id: "list",
    tooltip: "Список",
    svgInner: sp("M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"),
  },
  {
    type: "action",
    id: "link",
    tooltip: "Вставить ссылку",
    svgInner: sp("M15 7h3a5 5 0 010 10h-3m-6 0H6A5 5 0 016 7h3M8 12h8"),
  },
  { type: "separator" },
  {
    type: "action",
    id: "textColor",
    tooltip: "Цвет текста",
    svgInner: `${sp("M4 20L12 4l8 16M7.5 14h9")}<rect x="3" y="21.5" width="18" height="2" rx="1" fill="currentColor"/>`,
  },
  {
    type: "action",
    id: "highlight",
    tooltip: "Цвет выделения",
    svgInner: sp("M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"),
  },
  { type: "separator" },
  {
    type: "action",
    id: "comment",
    tooltip: "Комментарий",
    svgInner: sp("M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"),
  },
  {
    type: "action",
    id: "lock",
    tooltip: "Заблокировать",
    svgInner: `<rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" stroke-width="2.25" fill="none"/>${sp("M7 11V7a5 5 0 0110 0v4")}`,
  },
  {
    type: "action",
    id: "ai",
    tooltip: "Nova AI",
    svgInner: sp(
      "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
    ),
  },
];
