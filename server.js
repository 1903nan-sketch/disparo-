// Servidor mínimo: serve o site e faz proxy para a Evolution API.
// A API key fica só aqui no servidor, nunca vai pro navegador do cliente.
const http = require('http');
const fs = require('fs');
const path = require('path');

loadEnv();

const PORT = process.env.PORT || 3000;
const EVOLUTION_URL = (process.env.EVOLUTION_URL || '').replace(/\/+$/, '');
const EVOLUTION_APIKEY = process.env.EVOLUTION_APIKEY || '';
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!EVOLUTION_URL || !EVOLUTION_APIKEY) {
  console.error('Defina EVOLUTION_URL e EVOLUTION_APIKEY no .env');
  process.exit(1);
}

// Apenas estas rotas da Evolution podem ser chamadas pelo site
const ROUTES = {
  'POST /api/create': (i) => ['POST', '/instance/create'],
  'GET /api/connect': (i) => ['GET', `/instance/connect/${i}`],
  'GET /api/state': (i) => ['GET', `/instance/connectionState/${i}`],
  'POST /api/contacts': (i) => ['POST', `/chat/findContacts/${i}`],
  'POST /api/send': (i) => ['POST', `/message/sendText/${i}`],
  'DELETE /api/logout': (i) => ['DELETE', `/instance/logout/${i}`],
};

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');

  if (url.pathname.startsWith('/api/')) {
    const route = ROUTES[`${req.method} ${url.pathname}`];
    const instance = (url.searchParams.get('i') || '').trim();
    if (!route) return json(res, 404, { error: 'rota inválida' });
    if (!/^[a-zA-Z0-9_-]{3,40}$/.test(instance)) return json(res, 400, { error: 'instância inválida' });

    let body = await readBody(req);
    if (url.pathname === '/api/create') {
      body = JSON.stringify({ instanceName: instance, qrcode: true, integration: 'WHATSAPP-BAILEYS' });
    }

    const [method, target] = route(encodeURIComponent(instance));
    try {
      const r = await fetch(EVOLUTION_URL + target, {
        method,
        headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_APIKEY },
        body: method === 'GET' ? undefined : body || '{}',
      });
      const text = await r.text();
      res.writeHead(r.status, { 'Content-Type': 'application/json' });
      return res.end(text || '{}');
    } catch (e) {
      return json(res, 502, { error: 'Falha ao falar com a Evolution API: ' + e.message });
    }
  }

  // Arquivos estáticos
  const file = path.normalize(path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!file.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'proibido' });
  fs.readFile(file, (err, data) => {
    if (err) return json(res, 404, { error: 'não encontrado' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Rodando em http://localhost:${PORT}`));

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => resolve(data));
  });
}

function loadEnv() {
  const f = path.join(__dirname, '.env');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
