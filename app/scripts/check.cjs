// Checks on the built app (app/dist), served over http as it will be: node app/scripts/check.cjs  (after npm run build)
// Exits 1 on any failure. Uses the Playwright installed at the repository root.
const { chromium } = require('../../node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', 'dist');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) pass++; else { fail++; console.log('  FAIL', name, extra); } };
const srv = http.createServer((q, r) => { let f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  const url = 'http://127.0.0.1:' + srv.address().port + '/';
  const b = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  for (const [dev, vp, mob] of [['desktop', { width: 1400, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const p = await b.newPage({ viewport: vp, isMobile: mob, hasTouch: mob }); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(url); await p.waitForTimeout(400);
    ok(dev + ': the home page lists the Kem Kem scene', await p.locator('a.card[href="#/site/kemkem"]').count() === 1);
    await p.click('a.card[href="#/site/kemkem"]'); await p.waitForTimeout(6000);
    { const shot = await p.locator('.site canvas').screenshot();         // a blank or flat picture compresses to almost nothing
      ok(dev + ': the scene draws (the picture has detail)', shot.length > 60000, String(shot.length)); }
    ok(dev + ': every animal of the site is in the scene with a label (13)', await p.locator('.tag').count() === 13, String(await p.locator('.tag').count()));
    ok(dev + ': the title says where and when', /Kem Kem/.test(await p.locator('.bar b').innerText()) && /100–95 million years ago/.test(await p.locator('.bar span').innerText()));
    await p.click('text=About this place'); await p.waitForTimeout(300);
    const panel = await p.locator('.panel').innerText();
    ok(dev + ': the panel gives the place, how we know, what is debated, what is a guess, and the papers with DOIs', ['The place', 'How do we know?', 'Still debated', 'What is a guess', 'Sources'].every(h => panel.toLowerCase().includes(h.toLowerCase())) && await p.locator('.panel .papers a[href^="https://doi.org/"]').count() >= 8);
    await p.locator('.panel .cast button', { hasText: 'Spinosaurus' }).click(); await p.waitForTimeout(2500);
    const card = await p.locator('.panel').innerText();
    ok(dev + ': choosing an animal shows its size, whether it is to scale, and its silhouette credit and licence', /about 17 m/.test(card) && /drawn to scale/.test(card) && /Silhouette by/.test(card) && /CC0|CC BY/.test(card));
    await p.click('.panel .x'); await p.waitForTimeout(200);
    ok(dev + ': the panel closes from its own button', await p.locator('.panel').count() === 0);
    await p.click('text=Fly over'); await p.waitForTimeout(3000);
    ok(dev + ': no errors', errs.length === 0, errs.join(' | '));
    await p.close();
  }
  // reduced motion: no fly-in, and the clock stays still
  { const ctx = await b.newContext({ viewport: { width: 1000, height: 700 }, reducedMotion: 'reduce' }); const p = await ctx.newPage();
    await p.goto(url + '#/site/kemkem'); await p.waitForTimeout(2500);
    const a = await p.screenshot(); await p.waitForTimeout(1200); const c = await p.screenshot();
    ok('reduced motion: the scene holds still', Buffer.compare(a, c) === 0); await ctx.close(); }
  await b.close(); srv.close();
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
});
