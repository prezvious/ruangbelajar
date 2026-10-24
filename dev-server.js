const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const auth = require('./api/auth.js');
const workspace = require('./api/workspace.js');

const appRoutes = new Set([
  '/',
  '/hari-ini',
  '/rencana',
  '/catatan',
  '/catatan-waktu',
  '/dasbor',
  '/materi',
  '/tracker',
  '/tryout',
  '/panduan',
  '/belajar',
  '/statistik',
  '/kalender',
  '/mata-pelajaran',
  '/pengaturan',
  '/akun',
  '/migrasi',
  '/sign-in',
  '/sign-up',
]);
const authRoutes = new Set(['/auth/verify']);
const publicFiles = new Set([
  'index.html',
  'auth.html',
  '403.html',
  '404.html',
  'favicon.svg',
]);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.md': 'text/plain; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
};
publicFiles.add('supabase-schema.sql');
publicFiles.add('MIGRATION.md');

async function notFound(res) {
  res.writeHead(404, {
    'Content-Type': types['.html'],
    'Cache-Control': 'no-store',
  });
  res.end(await fs.readFile(path.join(__dirname, '404.html')));
}

http
  .createServer(async (req, res) => {
    for (const header of require('./vercel.json').headers[0].headers)
      res.setHeader(header.key, header.value);
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/auth' || url.pathname === '/api/workspace') {
      const chunks = [];
      let bytes = 0;
      try {
        for await (const chunk of req) {
          bytes += chunk.length;
          if (
            bytes > (url.pathname === '/api/auth' ? 16384 : 4 * 1024 * 1024)
          ) {
            res.writeHead(413, { 'Content-Type': 'application/json' }).end(
              JSON.stringify({
                key:
                  url.pathname === '/api/workspace'
                    ? 'http.tooLarge'
                    : 'http.invalid',
                error: 'Payload too large',
              }),
            );
            return;
          }
          chunks.push(chunk);
        }
        // Decode only once: a UTF-8 character may span multiple network chunks.
        req.body = new TextDecoder('utf-8', { fatal: true }).decode(
          Buffer.concat(chunks, bytes),
        );
      } catch {
        if (!res.destroyed)
          res.writeHead(400, { 'Content-Type': 'application/json' }).end(
            JSON.stringify({
              key: 'http.invalid',
              error: 'Invalid request body',
            }),
          );
        return;
      }
      return (url.pathname === '/api/auth' ? auth : workspace)(req, res);
    }
    if (['/agenda', '/index.html'].includes(url.pathname)) {
      res.writeHead(308, { Location: '/' + url.search }).end();
      return;
    }
    const file = appRoutes.has(url.pathname)
      ? 'index.html'
      : authRoutes.has(url.pathname)
        ? 'auth.html'
        : url.pathname.slice(1);
    if (
      !publicFiles.has(file) &&
      !/^study\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(mjs|css)$/.test(file)
    ) {
      return notFound(res);
    }
    try {
      const content = await fs.readFile(path.join(__dirname, file));
      res
        .writeHead(
          file === '403.html' ? 403 : file === '404.html' ? 404 : 200,
          {
            'Content-Type': types[path.extname(file)],
            'Cache-Control': 'no-store',
            'Referrer-Policy': 'no-referrer',
          },
        )
        .end(content);
    } catch {
      return notFound(res);
    }
  })
  .listen(Number(process.env.PORT || 5174), '127.0.0.1', () =>
    console.log(`Ruang Belajar: http://localhost:${process.env.PORT || 5174}`),
  );
