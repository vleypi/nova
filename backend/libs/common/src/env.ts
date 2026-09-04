import type { StringValue } from 'ms';

const int = (v: string | undefined, fallback: number) => {
  const n = parseInt(v ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

const num = (v: string | undefined, fallback: number) => {
  const n = parseFloat(v ?? '');
  return Number.isFinite(n) ? n : fallback;
};

export const JWT_SECRET          = process.env.JWT_SECRET          ?? 'secret';
export const JWT_ACCESS_EXPIRES  = (process.env.JWT_ACCESS_EXPIRES ?? '15m') as StringValue;
export const JWT_REFRESH_EXPIRES = (process.env.JWT_REFRESH_EXPIRES ?? '7d') as StringValue;

export const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:3000';

export const API_GATEWAY_PORT = int(process.env.API_GATEWAY_PORT, 4000);
export const SWAGGER_PATH     = process.env.SWAGGER_PATH ?? 'api/docs';

export const USERS_SERVICE_URL  = process.env.USERS_SERVICE_URL  ?? '127.0.0.1:5000';
export const AUTH_SERVICE_URL   = process.env.AUTH_SERVICE_URL   ?? '127.0.0.1:5001';
export const BOARDS_SERVICE_URL = process.env.BOARDS_SERVICE_URL ?? '127.0.0.1:5002';

export const COLLAB_SERVICE_PORT = int(process.env.COLLAB_SERVICE_PORT, 5003);
export const COLLAB_INTERNAL_URL = process.env.COLLAB_INTERNAL_URL ?? `http://127.0.0.1:${COLLAB_SERVICE_PORT}/internal`;
export const INTERNAL_API_KEY   = process.env.INTERNAL_API_KEY   ?? 'nova-internal-secret';

export const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
export const REDIS_PORT = int(process.env.REDIS_PORT, 6379);

export const POSTGRES_HOST      = process.env.POSTGRES_HOST      ?? 'localhost';
export const POSTGRES_PORT      = int(process.env.POSTGRES_PORT, 5432);
export const POSTGRES_USER      = process.env.POSTGRES_USER      ?? 'nova';
export const POSTGRES_PASSWORD  = process.env.POSTGRES_PASSWORD  ?? 'nova_secret';
export const POSTGRES_USERS_DB  = process.env.POSTGRES_USERS_DB  ?? 'nova_users';
export const POSTGRES_BOARDS_DB = process.env.POSTGRES_BOARDS_DB ?? 'nova_boards';

export const AI_API_KEY  = process.env.AI_API_KEY  ?? '';
// Bearer-токен (Authorization: Bearer ...). Для прокси/реселлеров с токеном вида cr_… / oat…
// Если задан — используется вместо AI_API_KEY (x-api-key). Для прямого Anthropic оставь пустым.
export const AI_AUTH_TOKEN = process.env.AI_AUTH_TOKEN ?? '';
// Пусто → Anthropic SDK использует https://api.anthropic.com по умолчанию.
// Задай явно, только если ходишь к Claude через прокси, говорящий на протоколе Anthropic.
export const AI_BASE_URL = process.env.AI_BASE_URL ?? '';
export const AI_MODEL    = process.env.AI_MODEL    ?? 'claude-sonnet-4-6';

// Tuning.
// AI_TEMPERATURE применяется только когда thinking выключен (Sonnet/Haiku его принимают).
// При AI_THINKING=adaptive temperature не отправляется (несовместимо с reasoning-режимом).
export const AI_TEMPERATURE       = num(process.env.AI_TEMPERATURE, 0.5);
// 4096 было мало для больших диаграмм (mindmap/roadmap = десятки tool-вызовов
// за ход, ход обрывался по лимиту). max_tokens — ПОТОЛОК, а не цель: модель
// останавливается сама по end_turn, поэтому щедрый дефолт ничего не стоит.
export const AI_MAX_OUTPUT_TOKENS = int(process.env.AI_MAX_OUTPUT_TOKENS, 32_000);
// Расширенное «мышление» Claude. disabled — быстро/дёшево (по умолчанию);
// adaptive — Claude сам решает, сколько рассуждать (лучше сложные диаграммы, но дороже/медленнее).
export const AI_THINKING          = (process.env.AI_THINKING ?? 'disabled') as 'disabled' | 'adaptive';
// Глубина мышления/расхода токенов: low | medium | high. Пусто → дефолт модели.
// Применяется только при AI_THINKING=adaptive. (max — только для Opus, на Sonnet нельзя.)
export const AI_EFFORT            = (process.env.AI_EFFORT || undefined) as 'low' | 'medium' | 'high' | undefined;

// Limits and timeouts for AI editing-tools + streaming flow (spec A).
export const AI_MAX_CONTEXT_SLOTS     = int(process.env.AI_MAX_CONTEXT_SLOTS,     10);
export const AI_MAX_ELEMENTS_PER_SLOT = int(process.env.AI_MAX_ELEMENTS_PER_SLOT, 100);
export const AI_STREAM_TIMEOUT_MS     = int(process.env.AI_STREAM_TIMEOUT_MS,     120_000);

// SMTP (Mailhog в dev / demo; в проде подменяется env-переменными)
export const SMTP_HOST = process.env.SMTP_HOST ?? 'localhost';
export const SMTP_PORT = int(process.env.SMTP_PORT, 1025);
export const SMTP_FROM = process.env.SMTP_FROM ?? 'Nova <no-reply@nova.local>';

// OAuth
export const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     ?? '';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';
export const GITHUB_CLIENT_ID     = process.env.GITHUB_CLIENT_ID     ?? '';
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET ?? '';

export const isProduction = (): boolean => process.env.NODE_ENV === 'production';

// Флаг Secure у auth-cookie. По умолчанию следует за NODE_ENV, но переопределяется явно:
// Secure-куки не сохраняются по http, а docker-стенд поднят на http://localhost.
export const isCookieSecure = (): boolean =>
  process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === 'true'
    : isProduction();
