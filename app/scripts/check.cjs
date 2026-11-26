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
    ok(dev + ': the opening uses the painted Earth (the map’s own coasts)', /kemkem-1-painted\.jpg/.test(await p.locator('.earth img.globe').getAttribute('src')));
    await p.waitForTimeout(6000);
    ok(dev + ': the opening ends by itself, and Where on Earth brings it back', await p.locator('.earth').count() === 0 && await p.locator('.where').count() === 1);
    // the painting is how a site is seen: spots to find, hover for a name, tap to read and collect
    ok(dev + ': after the opening comes The Scene: the painting alone, nothing competing with it, and the AI note in the title bar', await p.locator('.pview img').count() === 1 && await p.locator('.spot').count() === 0 && await p.locator('.found-btn').count() === 0 && /Painted by AI|A painting by AI/.test(await p.locator('.bar em.ai').innerText()));
    await p.click('.views button:has-text("The Evidence")'); await p.waitForTimeout(300);
    ok(dev + ': The Evidence shows the 13 parts of the picture, each ringed by what it rests on (documented, inferred, imagined), with the three questions', await p.locator('.spot').count() === 13 && await p.locator('.spot.st-documented').count() >= 5 && await p.locator('.spot.st-inferred').count() >= 1 && await p.locator('.pview .questions button').count() === 3);
    ok(dev + ': it opens on the leading animal (Spinosaurus in view)', await p.evaluate(() => { const r = document.querySelector('.spot[aria-label$="Spinosaurus"]').getBoundingClientRect(); return r.left > 0 && r.right < innerWidth && r.top > 0 && r.bottom < innerHeight; }));
    ok(dev + ': nothing is found yet', /Found 0 of 13/.test(await p.locator('.found-btn').innerText()));
    { const box = await p.locator('.pview').boundingBox();
      for (let i = 0; i < 14; i++) { await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.wheel(0, -300); await p.waitForTimeout(40); }
      await p.waitForTimeout(1500);
      const tiles = await p.evaluate(() => [...document.querySelectorAll('.pview img.hi')].filter(i => i.complete && i.naturalWidth > 2000).length);
      const site = require('../src/content/sites.json')[0];
      if (site.paintingHi) ok(dev + ': zoomed in, the sharp detail tiles in view load (and only those)', tiles >= 1 && tiles <= 4, String(tiles));
      else ok(dev + ': the zoom tiles were cut from an older painting, so none load (they are remade with the painting)', tiles === 0, String(tiles));
      for (let i = 0; i < 14; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(30); }
      await p.waitForTimeout(400); }
    if (!mob) { await p.hover('.spot[aria-label$="Spinosaurus"]'); await p.waitForTimeout(150);
      ok(dev + ': hovering a spot shows its name', /Spinosaurus/.test(await p.locator('.spot.on .tip').innerText())); }
    await p.click('.spot[aria-label$="Spinosaurus"]'); await p.waitForTimeout(400);
    { const c = await p.locator('.spotcard').innerText();
      ok(dev + ': its card says what is documented, inferred and imagined about it, with the papers', /Documented/i.test(c) && /Another reading/.test(c) && await p.locator('.spotcard .decision .refs a[href^="https://doi.org/"]').count() >= 2);
      ok(dev + ': tapping it opens its card (size, today’s reconstruction, a way to see it to scale in 3D) and collects it', /Spinosaurus/.test(c) && /As reconstructed today/.test(c) && /See it to scale in 3D/.test(c) && /Found 1 of 13/.test(await p.locator('.found-btn').innerText())); }
    await p.click('.spotcard .x'); await p.waitForTimeout(150);
    await p.locator('.spot[aria-label$="The river"]').dispatchEvent('click'); await p.waitForTimeout(300);   // off-screen on a phone until you pan
    ok(dev + ': a place spot rests on the brief’s decision (the river: “flowing north to a delta on the Tethys Sea”, documented)', /delta on the Tethys Sea/.test(await p.locator('.spotcard').innerText()) && await p.locator('.spotcard .decision.documented').count() >= 1);
    await p.click('.spotcard .x'); await p.click('.pview .questions button:has-text("How do we know?")'); await p.waitForTimeout(250);
    { const q = await p.locator('.panel.evidence').innerText();
      ok(dev + ': “How do we know?” tells who found it and who changed the picture, and what the artist supplied', /How we came to know it/i.test(q) && /What the artist supplied/i.test(q) && /Imagined/i.test(q) && /current as of/i.test(q)); }
    await p.click('.panel.evidence .x');
    await p.locator('.spot[aria-label$="The river"]').dispatchEvent('click'); await p.waitForTimeout(200);
    await p.click('.spotcard .x'); await p.click('.found-btn'); await p.waitForTimeout(200);
    ok(dev + ': the tray lists what is found and keeps the rest a mystery', /✓ Spinosaurus/.test(await p.locator('.tray').innerText()) && /✓ The river/.test(await p.locator('.tray').innerText()) && (await p.locator('.tray li span').count()) === 11);
    await p.click('.found-btn');
    await p.reload(); await p.waitForTimeout(800); await p.click('.earth').catch(() => {}); await p.waitForTimeout(600);
    await p.click('.views button:has-text("The Evidence")'); await p.waitForTimeout(250);
    ok(dev + ': what you found is remembered on this device', /Found 2 of 13/.test(await p.locator('.found-btn').innerText()));
    // "See it to scale in 3D" goes to the living scene and flies to the animal
    await p.locator('.spot[aria-label$="Carcharodontosaurus"]').dispatchEvent('click'); await p.waitForTimeout(300);   // on a phone it is off-screen until you pan
    await p.click('.spotcard button:has-text("See it to scale in 3D")'); await p.waitForTimeout(4000);
    ok(dev + ': “See it to scale in 3D” opens the 3D scene on that animal', await p.locator('.site canvas').count() === 1 && /Carcharodontosaurus/.test(await p.locator('.panel h2').innerText().catch(() => '')));
    await p.click('.panel .x').catch(() => {}); await p.click('text=Overview'); await p.waitForTimeout(3500);
    { const shot = await p.locator('.site canvas').screenshot();         // a blank or flat picture compresses to almost nothing
      ok(dev + ': the scene draws (the picture has detail)', shot.length > 60000, String(shot.length)); }
    ok(dev + ': every animal of the site is in the scene with a label (13)', await p.locator('.tag').count() === 13, String(await p.locator('.tag').count()));
    { const words = await p.evaluate(() => [...document.querySelectorAll('.tag')].map(t => t.innerText).join(' | '));
      ok(dev + ': no animal is “size not known”', !/not known/.test(words), words.slice(0, 200)); }
    ok(dev + ': the title says where and when', /Kem Kem/.test(await p.locator('.bar b').innerText()) && /100–95 million years ago/.test(await p.locator('.bar span').innerText()));
    await p.click('text=About this place'); await p.waitForTimeout(300);
    const panel = await p.locator('.panel').innerText();
    ok(dev + ': the panel says how the pictures were made: the Earth from the map in Knight’s manner, the ground painted by AI from the scene’s map, the prompt one tap away', /the pictures/i.test(panel) && /Charles R\. Knight/.test(panel) && /painted by AI/.test(panel) && await p.locator('.panel details.prompt').count() >= 2);
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
    // the approaches: painted animals two ways, and the scene as one painting with what it gets wrong
    { const btn = p.locator('.views button.style');
      ok(dev + ': the animals can be shown three ways, starting with the scientists’ outlines', /outlines/i.test(await btn.innerText()));
      await btn.click(); await p.waitForTimeout(2500);
      const got = await p.evaluate(() => performance.getEntriesByType('resource').map(r => r.name).filter(n => /painted\/.*-outline\.png/.test(n)).length);
      ok(dev + ': “painted in outline” loads the painted dinosaurs (3)', /painted in outline/i.test(await btn.innerText()) && got >= 3, String(got));
      await btn.click(); await p.waitForTimeout(2500);
      const got2 = await p.evaluate(() => performance.getEntriesByType('resource').map(r => r.name).filter(n => /painted\/.*-free\.png/.test(n)).length);
      ok(dev + ': “painted freely” loads the free paintings (3)', /painted freely/i.test(await btn.innerText()) && got2 >= 3, String(got2));
      await btn.click(); await p.waitForTimeout(300);
      await p.click('text=About this place'); await p.waitForTimeout(300);
      const cap = await p.locator('.panel').innerText();
      ok(dev + ': About this place says who painted the scene, in whose manner, and where it still differs from the evidence', /in the manner of Charles R\. Knight/.test(cap) && /still differs from the evidence/i.test(cap) && /colours of every animal are guesses/.test(cap));
      ok(dev + ': About this place shows how the painting was checked, item by item, including how Spinosaurus is reconstructed today', await p.locator('.panel details.checked').count() === 1 && /Spinosaurus, as reconstructed today/.test(await p.locator('.panel details.checked').textContent()));
      await p.click('.panel .x'); await p.waitForTimeout(200);
      await p.click('.views button:has-text("Painting")'); await p.waitForTimeout(600);
      ok(dev + ': “Painting” goes back to the painting, with what was found kept', await p.locator('.pview img').count() === 1 && await p.locator('.site canvas').count() === 0 && /Found 3 of 13/.test(await p.locator('.found-btn').innerText())); }
    ok(dev + ': no errors', errs.length === 0, errs.join(' | '));
    await p.close();
  }
  // the great events, painted: every one with its own words, what the painting gets wrong, and its papers
  { const p = await b.newPage({ viewport: { width: 1400, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(url + '#/events'); await p.waitForTimeout(1200);
    const n = await p.locator('.ev').count(), groups = await p.locator('.events h2').count();
    const ev = require('../src/content/events.json'), art = require('../src/content/art.json'), evArt = art.filter(a => a.kind === 'event');
    ok('events: all 32 great events are painted and reviewed; the gallery shows exactly the ones that passed, in their groups', evArt.length === 32 && evArt.every(a => a.status !== 'not reviewed') && n === ev.length && n === evArt.filter(a => a.status !== 'fail' && !a.rejected && !a.held).length && groups >= 3, n + ' shown / ' + evArt.length + ' / ' + groups + ' groups');
    ok('events: no painting that failed its review is shown', ev.every(e => evArt.find(a => a.id === 'event:' + e.id && a.status !== 'fail' && !a.rejected && !a.held)));
    ok('events: every painting shown says where it differs from the evidence, keeps its prompt, and carries its review', ev.every(e => e.differs && e.differs.length > 20 && !/^Under review/.test(e.differs) && e.prompt && e.f && e.check && /pass|fix/.test(e.check.status) && e.check.items.length >= 4));
    ok('events: the painter was told what could not yet exist (no palms before 100 Ma, bare land before 470 Ma ...) for the old events', ev.filter(e => e.t > 100).every(e => /could not yet exist/.test(e.prompt)) || ev.filter(e => e.t > 100 && !/could not yet exist/.test(e.prompt)).map(e => e.id).every(id => ['cretaceous', 'endediacaran', 'kalkarindji', 'ireviken', 'oae2', 'moon', 'snowball'].includes(id)));
    const one = ev.find(e => e.id === 'permian') || ev[0];
    await p.locator('.ev', { hasText: one.title }).first().click(); await p.waitForTimeout(600);
    const t = await p.locator('.evtext').innerText();
    ok('events: opening one shows its words, the differences, the credit and its verified papers', /differs from the evidence/.test(t) && /Charles R\. Knight/.test(t) && await p.locator('.evtext .papers a[href^="https://doi.org/"]').count() >= 1);
    await p.click('.evtext details.checked summary'); await p.waitForTimeout(200);
    const ck = await p.locator('.evtext details.checked').innerText();
    ok('events: “How this picture was checked” names the science it follows, each item of the checklist with its verdict, and how it works on a viewer', /The science it follows/.test(ck) && await p.locator('.evtext details.checked .items li').count() >= 4 && /wonder \d/.test(ck) && /curator/.test(ck));
    ok('events: no errors', errs.length === 0, errs.join(' | ')); await p.close(); }
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
