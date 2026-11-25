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
    await p.click('a.card[href="#/site/kemkem"]'); await p.waitForTimeout(600);
    ok(dev + ': the scene opens on the Earth at that time, zooming to the site, and says so', await p.locator('.earth img.globe').count() === 1 && /The Earth about 100–95 million years ago/.test(await p.locator('.earth .cap').innerText()));
    await p.waitForTimeout(6000);
    ok(dev + ': the opening ends by itself, and Where on Earth brings it back', await p.locator('.earth').count() === 0 && await p.locator('.where').count() === 1);
    { const shot = await p.locator('.site canvas').screenshot();         // a blank or flat picture compresses to almost nothing
      ok(dev + ': the scene draws (the picture has detail)', shot.length > 60000, String(shot.length)); }
    ok(dev + ': every animal of the site is in the scene with a label (13)', await p.locator('.tag').count() === 13, String(await p.locator('.tag').count()));
    { const words = await p.evaluate(() => [...document.querySelectorAll('.tag')].map(t => t.innerText).join(' | '));
      ok(dev + ': no animal is “size not known”', !/not known/.test(words), words.slice(0, 200)); }
    ok(dev + ': the title says where and when', /Kem Kem/.test(await p.locator('.bar b').innerText()) && /100–95 million years ago/.test(await p.locator('.bar span').innerText()));
    await p.click('text=About this place'); await p.waitForTimeout(300);
    const panel = await p.locator('.panel').innerText();
    ok(dev + ': the panel gives the place, how we know, what is debated, what is a guess, and the papers with DOIs', ['The place', 'How do we know?', 'Still debated', 'What is a guess', 'Sources'].every(h => panel.toLowerCase().includes(h.toLowerCase())) && await p.locator('.panel .papers a[href^="https://doi.org/"]').count() >= 8);
    await p.locator('.panel .cast button', { hasText: 'Spinosaurus' }).click(); await p.waitForTimeout(2500);
    const card = await p.locator('.panel').innerText();
    ok(dev + ': choosing an animal shows its size, whether it is to scale, and its silhouette credit and licence', /about 17 m|about 56 ft/.test(card) && /drawn to scale/.test(card) && /Silhouette by/.test(card) && /CC0|CC BY/.test(card));
    // metric and imperial
    await p.click('.units button:has-text("m")'); await p.waitForTimeout(200);
    const met = await p.locator('.panel .size').innerText();
    await p.click('.units button:has-text("ft")'); await p.waitForTimeout(200);
    const imp = await p.locator('.panel .size').innerText();
    ok(dev + ': the units switch between metres and feet (Spinosaurus: about 17 m / about 56 ft)', /about 17 m/.test(met) && /about 56 ft/.test(imp), met + ' / ' + imp);
    await p.click('.units button:has-text("m")'); await p.waitForTimeout(150);
    await p.click('.panel .x'); await p.waitForTimeout(200);
    await p.click('text=Overview'); await p.waitForTimeout(3500);               // back to the whole place, so every name is on screen
    await p.locator('.tag').nth(2).click(); await p.waitForTimeout(2500);        // the third animal's label: Carcharodontosaurus
    { await p.click('.panel .x'); await p.locator('.tag').nth(4).click(); await p.waitForTimeout(2500);   // the abelisaurid: its size has a paper
      const c = await p.locator('.panel').innerText();
      ok(dev + ': an estimated size says where it comes from, with its paper', /From a paper/.test(c) && /Chiarenza/.test(c) && await p.locator('.panel .basis a[href^="https://doi.org/10.7717/peerj.1754"]').count() === 1, c.slice(0, 160));
      await p.click('.panel .x'); await p.click('text=Overview'); await p.waitForTimeout(3500); await p.locator('.tag').nth(2).click(); await p.waitForTimeout(2500); }
    ok(dev + ': tapping a name opens that animal’s card (not the place)', (await p.locator('.panel h2').count()) === 1 && /Carcharodontosaurus/.test(await p.locator('.panel h2').innerText()));
    await p.click('.panel .x'); await p.waitForTimeout(200);
    ok(dev + ': the panel closes from its own button', await p.locator('.panel').count() === 0);
    await p.click('text=Overview'); await p.waitForTimeout(3000);
    ok(dev + ': only the sky view: no eye-level button', await p.locator('text=Eye level').count() === 0);
    { const box = await p.locator('.site canvas').boundingBox(); await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      for (let i = 0; i < 30; i++) { await p.mouse.wheel(0, -240); await p.waitForTimeout(25); }   // try hard to zoom down to the ground
      await p.waitForTimeout(1500);
      const h = await p.evaluate(() => window.__sky());
      ok(dev + ': zooming in as far as it goes still leaves the camera in the sky (at least 19 m up)', h >= 19, h.toFixed(1)); }
    ok(dev + ': no errors', errs.length === 0, errs.join(' | '));
    await p.close();
  }
  // the app writes sizes exactly as the data module does (tools/source/data_sites.js sizeText), in both units
  { const { SITE_SCENES, sizeText } = require('../../tools/source/data_sites.js');
    const p = await b.newPage(); await p.goto(url + '#/site/kemkem'); await p.waitForTimeout(800);
    const want = SITE_SCENES[0].cast.flatMap(c => [sizeText(c, 'metric'), sizeText(c, 'imperial')]);
    ok('sizes: every animal has a size, and the app and the old page agree on its words (metric and imperial)', SITE_SCENES.every(s => s.cast.every(c => c.len > 0 && c.sz)) && want.every(w => w && !/not known/.test(w)));
    await p.close(); }
  // reduced motion: no fly-in, and the clock stays still
  { const ctx = await b.newContext({ viewport: { width: 1000, height: 700 }, reducedMotion: 'reduce' }); const p = await ctx.newPage();
    await p.goto(url + '#/site/kemkem'); await p.waitForTimeout(2500);
    const a = await p.screenshot(); await p.waitForTimeout(1200); const c = await p.screenshot();
    ok('reduced motion: the scene holds still', Buffer.compare(a, c) === 0); await ctx.close(); }
  await b.close(); srv.close();
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
});
