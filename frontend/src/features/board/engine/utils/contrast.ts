const DARK_TEXT = "#1F1F1F";
const LIGHT_TEXT = "#F5F5F5";

// Порог YIQ-яркости: выше - фон светлый и текст тёмный, ниже - наоборот.
const YIQ_LIGHT_THRESHOLD = 160;

// Подбирает читаемый цвет текста для hex-фона по YIQ-яркости.
// Невалидный hex считаем тёмным фоном и возвращаем DARK_TEXT.
export function pickTextColor(bgHex: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(bgHex)) return DARK_TEXT;
  const r = parseInt(bgHex.slice(1, 3), 16);
  const g = parseInt(bgHex.slice(3, 5), 16);
  const b = parseInt(bgHex.slice(5, 7), 16);
  // YIQ-яркость по стандартной формуле NTSC.
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= YIQ_LIGHT_THRESHOLD ? DARK_TEXT : LIGHT_TEXT;
}
