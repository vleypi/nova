/**
 * Тайминги и цвета для эффекта проявления AI-сгенерированных элементов
 * на канвасе. Эффект состоит из двух стадий: opacity overlay (короткая
 * «материализация») и indigo-glow halo (затухающая обводка).
 *
 * См. спек B § Fade-in Renderer Layer.
 */

/** Общая длительность glow halo, мс. */
export const AI_FADE_DURATION_MS = 600;

/** Длительность opacity-fade overlay, мс. Должна быть <= AI_FADE_DURATION_MS. */
export const AI_FADE_IN_MS = 200;

/** RGB triple для glow цвета (без alpha). Indigo-500. */
export const AI_GLOW_COLOR_RGB = "99, 102, 241";

/** Максимальная alpha glow на старте анимации. */
export const AI_GLOW_MAX_ALPHA = 0.7;

/** Радиус blur для shadow эффекта glow, в пикселях. */
export const AI_GLOW_BLUR = 16;
