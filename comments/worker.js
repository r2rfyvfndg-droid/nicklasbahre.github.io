const ARTICLE = /^(?:\/notizie\/[a-z0-9-]+\/|\/stankovic\.html)$/;
const NICKNAME = /^[\p{L}\p{N}_ .-]{2,24}$/u;
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

function json(data, status = 200, origin = '') {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) } });
}
function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  return origin === env.SITE_ORIGIN ? origin : '';
}
function authorized(request, env) {
  return Boolean(env.ADMIN_TOKEN && request.headers.get('Authorization') === `Bearer ${env.ADMIN_TOKEN}`);
}
async function verifyTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET || !token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token });
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) body.set('remoteip', ip);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body, signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true && result.action === 'comment' && result.hostname === new URL(env.SITE_ORIGIN).hostname;
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: origin ? 204 : 403, headers: origin ? {
        'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'Vary': 'Origin'
      } : {} });
    }
    if (!env.DB) return json({ error: 'Servizio non configurato' }, 503, origin);
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/comments' && request.method === 'GET') {
        const article = url.searchParams.get('article') || '';
        if (!ARTICLE.test(article)) return json({ error: 'Articolo non valido' }, 400, origin);
        const { results } = await env.DB.prepare(
          "SELECT id,nickname,body,created_at FROM comments WHERE article=? AND status='approved' ORDER BY created_at DESC LIMIT 50"
        ).bind(article).all();
        return json({ comments: results }, 200, origin);
      }
      if (url.pathname === '/api/comments' && request.method === 'POST') {
        if (!origin) return json({ error: 'Origine non consentita' }, 403);
        if (!env.COMMENT_LIMITER || !env.TURNSTILE_SECRET) return json({ error: 'Servizio non configurato' }, 503, origin);
        const ip = request.headers.get('CF-Connecting-IP') || '';
        const limit = await env.COMMENT_LIMITER.limit({ key: ip });
        if (!limit.success) return json({ error: 'Troppi tentativi. Riprova tra poco.' }, 429, origin);
        if (Number(request.headers.get('Content-Length') || 0) > 4096) return json({ error: 'Testo troppo lungo' }, 413, origin);
        const data = await request.json();
        const article = String(data.article || '');
        const nickname = String(data.nickname || '').trim();
        const body = String(data.body || '').trim();
        if (!ARTICLE.test(article) || !NICKNAME.test(nickname) || /^(nicklas\s*(?:bahre|news))$/i.test(nickname) || body.length < 10 || body.length > 1000)
          return json({ error: 'Controlla nickname e testo del commento.' }, 400, origin);
        if (!await verifyTurnstile(String(data.token || ''), request, env))
          return json({ error: 'Verifica antispam non riuscita. Riprova.' }, 403, origin);
        await env.DB.prepare("INSERT INTO comments (article,nickname,body,status) VALUES (?,?,?,'approved')")
          .bind(article,nickname,body).run();
        return json({ message: 'Commento pubblicato.' }, 201, origin);
      }
      if (url.pathname === '/api/comments/moderate' && request.method === 'GET') {
        if (!authorized(request, env)) return json({ error: 'Non autorizzato' }, 401, origin);
        const { results } = await env.DB.prepare(
          "SELECT id,article,nickname,body,status,created_at FROM comments WHERE status IN ('approved','pending') ORDER BY created_at DESC LIMIT 100"
        ).all();
        return json({ comments: results }, 200, origin);
      }
      if (url.pathname === '/api/comments/moderate' && request.method === 'POST') {
        if (!origin || !authorized(request, env)) return json({ error: 'Non autorizzato' }, 401, origin);
        const data = await request.json();
        if (!Number.isSafeInteger(data.id) || !['approved','rejected'].includes(data.status))
          return json({ error: 'Richiesta non valida' }, 400, origin);
        await env.DB.prepare("UPDATE comments SET status=? WHERE id=? AND status IN ('approved','pending')")
          .bind(data.status,data.id).run();
        return json({ ok: true }, 200, origin);
      }
      return json({ error: 'Non trovato' }, 404, origin);
    } catch {
      return json({ error: 'Servizio temporaneamente non disponibile' }, 503, origin);
    }
  }
};
