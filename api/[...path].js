// Proxy HTTP de mesma origem: o navegador mantém o cookie HttpOnly na Vercel.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const configured = process.env.BACKEND_ORIGIN;
  if (!configured || !configured.startsWith('https://')) return res.status(503).json({ error: 'Backend ainda não configurado.' });
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end();
  const pathname = new URL(req.url, 'https://local.invalid').pathname;
  if (!pathname.startsWith('/api/')) return res.status(404).end();
  try {
    const response = await fetch(new URL(pathname, new URL(configured).origin), {
      method: req.method, redirect: 'error', signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', ...(req.headers.cookie ? { Cookie: req.headers.cookie } : {}),
        ...(req.headers.origin ? { Origin: req.headers.origin } : {}) },
      ...(req.method === 'POST' ? { body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}) } : {}),
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader('Set-Cookie', cookies);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(response.status).send(await response.text());
  } catch { res.status(502).json({ error: 'Backend indisponível. Tente novamente.' }); }
};
