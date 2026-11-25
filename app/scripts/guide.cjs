// Saves a site's guide map (#/guide/<site>, from the built app) for tools/paint.py ground:
//   node app/scripts/guide.cjs kemkem   →  tools/paint/guides/kemkem-ground.png
const { chromium } = require('../../node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', 'dist'), id = process.argv[2] || 'kemkem';
const OUT = path.join(__dirname, '..', '..', 'tools', 'paint', 'guides', id + '-ground.png');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  const b = await chromium.launch(), p = await b.newPage();
  await p.goto(`http://127.0.0.1:${srv.address().port}/#/guide/${id}`);
  const url = await p.waitForFunction(() => window.__guide, null, { timeout: 60000 }).then(h => h.jsonValue());
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, Buffer.from(url.split(',')[1], 'base64'));
  console.log('guide', OUT); await b.close(); srv.close();
});
