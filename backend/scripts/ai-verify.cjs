require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mod = require('@anthropic-ai/sdk');
const Anthropic = mod.default || mod;

const authToken = process.env.AI_AUTH_TOKEN;
const apiKey    = process.env.AI_API_KEY;
const baseURL   = process.env.AI_BASE_URL;
const model     = process.env.AI_MODEL || 'claude-sonnet-4-6';

const client = new Anthropic({
  ...(authToken ? { authToken } : { apiKey }),
  ...(baseURL ? { baseURL } : {}),
});

const textOf = (m) => (m.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
const tick = (b) => (b ? '✓' : '✗');

(async () => {
  let score = 0;
  const notes = [];

  // Большой стабильный префикс для проверки кеша (> ~2048 токенов для Sonnet).
  const bigPrefix =
    'Контрольный системный блок для проверки prompt caching Anthropic. ' .repeat(450);
  const system = [{ type: 'text', text: bigPrefix, cache_control: { type: 'ephemeral' } }];

  // ── 1. Идентичность + поле model + заголовки ───────────────────────────
  let h = null, m1 = null;
  try {
    const res = await client.messages
      .create({
        model,
        max_tokens: 80,
        system,
        messages: [{ role: 'user', content: 'В одном предложении: какая ты модель и какая компания тебя создала?' }],
      })
      .withResponse();
    m1 = res.data;
    h = res.response.headers;

    const idOk    = typeof m1.id === 'string' && m1.id.startsWith('msg_');
    const modelOk = typeof m1.model === 'string' && /claude/i.test(m1.model);
    console.log('reply            :', JSON.stringify(textOf(m1)));
    console.log('model field      :', m1.model, tick(modelOk));
    console.log('msg id           :', m1.id, tick(idOk));
    console.log('usage #1         :', JSON.stringify(m1.usage));
    if (idOk) score++;
    if (modelOk) score++;
    if (!/claude/i.test(m1.model)) notes.push('Поле model НЕ содержит "claude" — подозрительно.');

    const reqId = h.get('request-id') || h.get('x-request-id');
    const org   = h.get('anthropic-organization-id');
    const rlLim = h.get('anthropic-ratelimit-requests-limit') || h.get('anthropic-ratelimit-input-tokens-limit');
    const reqOk = !!reqId && /^req_/.test(reqId);
    const rlOk  = !!rlLim;
    console.log('hdr request-id   :', reqId || '(нет)', tick(reqOk));
    console.log('hdr org-id       :', org || '(нет)', tick(!!org));
    console.log('hdr ratelimit    :', rlLim || '(нет)', tick(rlOk));
    if (reqOk) score++;
    if (org) score++;
    if (rlOk) score++;
    if (!reqId && !org && !rlLim) notes.push('Нет ни одного фирменного заголовка Anthropic — прокси их не отдаёт.');
  } catch (e) {
    notes.push('Запрос #1 упал: ' + (e && e.message));
  }

  try {
    const r2 = await client.messages.create({
      model,
      max_tokens: 16,
      system,
      messages: [{ role: 'user', content: 'Ответь одним словом: два' }],
    });
    const u = r2.usage || {};
    const cacheRead = u.cache_read_input_tokens || 0;
    const cacheWrite1 = (m1 && m1.usage && m1.usage.cache_creation_input_tokens) || 0;
    console.log('usage #2         :', JSON.stringify(u));
    const cacheOk = cacheRead > 0;
    console.log('cache_read #2    :', cacheRead, tick(cacheOk), '(write #1 =', cacheWrite1, ')');
    if (cacheOk) { score += 2; }
    else notes.push('cache_read_input_tokens = 0 — настоящий Anthropic тут вернул бы кеш. Либо подмена, либо прокси не проксирует кеш.');
  } catch (e) {
    notes.push('Запрос #2 (кеш) упал: ' + (e && e.message));
  }

  try {
    const ct = await client.messages.countTokens({
      model,
      messages: [{ role: 'user', content: 'The quick brown fox jumps over the lazy dog.' }],
    });
    console.log('count_tokens     :', JSON.stringify(ct), '✓ (эндпоинт есть)');
    score++;
  } catch (e) {
    console.log('count_tokens     : ✗ (', e && e.status, e && e.message, ')');
    notes.push('Эндпоинт count_tokens не работает — у настоящего Anthropic он есть.');
  }

  console.log('\n==== ВЕРДИКТ ====');
  console.log('score =', score, '/ 8');
  if (score >= 6)      console.log('➜ Очень похоже на НАСТОЯЩИЙ Claude (реальный pass-through к Anthropic).');
  else if (score >= 3) console.log('➜ Неоднозначно: часть сигналов на месте, часть нет. Прокси что-то перезаписывает — смотри заметки.');
  else                 console.log('➜ ПОДОЗРИТЕЛЬНО: фирменных признаков Anthropic мало — возможна подмена модели.');
  if (notes.length) { console.log('\nЗаметки:'); notes.forEach((n) => console.log(' -', n)); }
})();
