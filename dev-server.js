const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const auth = require('./api/auth.js');

const appRoutes = new Set(['/', '/dasbor', '/materi', '/tracker', '/tryout', '/panduan']);
const authRoutes = new Set(['/sign-in', '/sign-up', '/auth/verify']);
const publicFiles = new Set(['index.html', 'auth.html', 'styles.css', 'themes.css', 'tracker.css', 'auth.css', 'app.js', 'data.js', 'icons.js', 'tracker.js', 'tracker-data.js', 'themes.js', 'auth-client.js', 'auth-page.js', 'favicon.svg']);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/auth') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 16384) {
        res.writeHead(413).end();
        return;
      }
    }
    req.body = body;
    return auth(req, res);
  }
  if (['/agenda', '/index.html'].includes(url.pathname)) {
    res.writeHead(308, { Location: '/' + url.search }).end();
    return;
  }
  const file = appRoutes.has(url.pathname) ? 'index.html' : authRoutes.has(url.pathname) ? 'auth.html' : url.pathname.slice(1);
  if (!publicFiles.has(file)) {
    res.writeHead(404).end('Not found');
    return;
  }
  try {
    const content = await fs.readFile(path.join(__dirname, file));
    res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }).end(content);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(Number(process.env.PORT || 5174), '127.0.0.1', () => console.log(`Ruang Belajar: http://localhost:${process.env.PORT || 5174}`));
