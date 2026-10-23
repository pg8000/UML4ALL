// Local preview only. No external packages needed.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const files = new Set(['index.html', 'style.css', 'engine.js', 'examples.js', 'app.js']);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
http.createServer((req, res) => {
  let file;
  try { file = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html'; }
  catch { res.writeHead(400); res.end(); return; }
  if (!files.has(file)) { res.writeHead(404); res.end('Not found'); return; }
  res.setHeader('Content-Type', mime[path.extname(file)]);
  fs.createReadStream(path.join(__dirname, file)).pipe(res);
}).listen(4173, '127.0.0.1', () => console.log('UML4ALL: http://127.0.0.1:4173'));
