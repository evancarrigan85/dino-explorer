// Saves a site's 3D overview, without names or buttons, for tools/paint.py scene (the painting keeps its composition):
//   node app/scripts/scene-guide.cjs kemkem   →  tools/paint/guides/kemkem-scene.png
const { chromium } = require('../../node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', 'dist'), id = process.argv[2] || 'kemkem';
const OUT = path.join(__dirname, '..', '..', 'tools', 'paint', 'guides', id + '-scene.png');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  const b = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=metal'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });   // no opening, no motion: a still overview
  await p.goto(`http://127.0.0.1:${srv.address().port}/#/site/${id}`); await p.waitForTimeout(4000);
  await p.click('text=Hide names'); await p.addStyleTag({ content: '.bar,.views,.note,.where{display:none!important}' }); await p.waitForTimeout(800);
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); await p.screenshot({ path: OUT });
  console.log('guide', OUT); await b.close(); srv.close();
});
