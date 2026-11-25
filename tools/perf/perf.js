// How fast is the page? Loads it over http (as on GitHub Pages), then times the things a reader does: the first load,
// sitting still, dragging and zooming the map, scrubbing the timeline, playing, switching tabs, opening a site scene, and
// one full map frame at several times. Run on a desktop window and on a phone (390×844, CPU slowed 4×).
//   node tools/perf/perf.js [--json out.json]
// Numbers are from headless Chromium on this machine: compare runs with each other, not with a real phone.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..', '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.bin': 'application/octet-stream', '.txt': 'text/plain' };
const out = process.argv.includes('--json') ? process.argv[process.argv.indexOf('--json') + 1] : null;

const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});

// in the page before its own scripts: a frame recorder and a long-task log
const INIT = () => {
  window.__lt = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch (e) {}
  window.__raf = 0; const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = f => { window.__raf++; return raf(f); };
  window.__rec = { on: false, t: [] };
  window.__startRec = () => { const R = window.__rec; R.on = true; R.t = []; const loop = now => { if (!R.on) return; R.t.push(now); raf(loop); }; raf(loop); };
  window.__stopRec = () => { const R = window.__rec; R.on = false; return R.t; };
};

const q = (a, p) => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const frames = ts => { const d = []; for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
  return { frames: d.length, fps: d.length ? Math.round(1000 / (d.reduce((a, b) => a + b, 0) / d.length)) : 0, p50: +q(d, 0.5).toFixed(1), p95: +q(d, 0.95).toFixed(1), worst: +Math.max(0, ...d).toFixed(0), janky: d.length ? Math.round(100 * d.filter(x => x > 34).length / d.length) : 0 }; };

async function run(b, label, vp, mobile, port) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 3 : 2 });
  const p = await ctx.newPage(); await p.addInitScript(INIT);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Performance.enable');
  if (mobile) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const busy = async () => { const m = (await cdp.send('Performance.getMetrics')).metrics; const g = n => (m.find(x => x.name === n) || {}).value || 0; return { task: g('TaskDuration') * 1000, script: g('ScriptDuration') * 1000, layout: g('LayoutDuration') * 1000, style: g('RecalcStyleDuration') * 1000, heap: g('JSHeapUsedSize') }; };
  const R = { label };

  // 1. the first load
  const t0 = Date.now();
  await p.goto(`http://127.0.0.1:${port}/dino-explorer.html#150mya`, { waitUntil: 'load' });
  R.load = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0], fcp = performance.getEntriesByName('first-contentful-paint')[0];
    return { domReady: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: fcp ? Math.round(fcp.startTime) : null, longTasks: window.__lt.length, longestTask: Math.round(Math.max(0, ...window.__lt.map(x => x[1]))), blockedMs: Math.round(window.__lt.reduce((a, x) => a + Math.max(0, x[1] - 50), 0)) }; });
  await p.waitForTimeout(2500);
  await p.evaluate(() => { closeDoor(); });
  await p.waitForTimeout(1500);
  R.load.heapMB = +((await busy()).heap / 1048576).toFixed(0);
  R.webgl = await p.evaluate(() => { const g = document.createElement('canvas').getContext('webgl'); const d = g && g.getExtension('WEBGL_debug_renderer_info'); return g ? (d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'webgl') : 'none'; });

  // 2. sitting still for 5 s: how busy is the page when nobody touches it?
  { const a = await busy(), r0 = await p.evaluate(() => window.__raf); await p.waitForTimeout(5000); const z = await busy(), r1 = await p.evaluate(() => window.__raf);
    R.idle = { busyPct: +(100 * (z.task - a.task) / 5000).toFixed(1), framesAsked: r1 - r0 }; }

  const box = await p.locator('#mapCanvas').boundingBox(), cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const scenario = async (name, fn) => {
    await p.waitForTimeout(600);
    const lt0 = await p.evaluate(() => window.__lt.length), a = await busy();
    await p.evaluate(() => window.__startRec()); const s = Date.now(); await fn(); const ms = Date.now() - s;
    await p.waitForTimeout(400);                                  // the settle redraw after the hand lets go
    const ts = await p.evaluate(() => window.__stopRec()), z = await busy();
    const lt = await p.evaluate(n => window.__lt.slice(n), lt0);
    R[name] = Object.assign(frames(ts), { ms, scriptMs: Math.round(z.script - a.script), layoutMs: Math.round(z.layout + z.style - a.layout - a.style), longTasks: lt.length, longestTask: Math.round(Math.max(0, ...lt.map(x => x[1]))) });
  };

  // 3. drag the map for 1.5 s
  await scenario('drag', async () => { await p.mouse.move(cx, cy); await p.mouse.down(); for (let i = 1; i <= 45; i++) { await p.mouse.move(cx + Math.sin(i / 7) * box.width * 0.3, cy + Math.cos(i / 9) * box.height * 0.15); await p.waitForTimeout(33); } await p.mouse.up(); });
  // 4. zoom in and out with the wheel
  await scenario('zoom', async () => { await p.mouse.move(cx, cy); for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, i < 6 ? -120 : 120); await p.waitForTimeout(90); } });
  // 5. scrub the timeline from old to young, as a hand on the slider would
  const sl = await p.locator('#timeSlider').boundingBox();
  await scenario('scrub', async () => { const y = sl.y + sl.height / 2; await p.mouse.move(sl.x + sl.width * 0.05, y); await p.mouse.down(); for (let i = 0; i <= 40; i++) { await p.mouse.move(sl.x + sl.width * (0.05 + 0.9 * i / 40), y); await p.waitForTimeout(40); } await p.mouse.up(); });
  // 6. press Play for 3 s
  await p.evaluate(() => setTime(300));
  await scenario('play', async () => { await p.click('#playBtn'); await p.waitForTimeout(3000); await p.click('#playBtn'); });
  // 7. switch through every tab (time from the tap until the next frame is shown)
  R.tabs = {};
  for (const t of ['life', 'humans', 'insights', 'ext', 'finds', 'quiz', 'geo', 'life']) {
    await p.waitForTimeout(300);
    R.tabs[t] = await p.evaluate(id => new Promise(res => { const s = performance.now(); document.getElementById('tab-' + id).click(); requestAnimationFrame(() => requestAnimationFrame(() => res(Math.round(performance.now() - s)))); }), t);
  }
  // 8. open the Kem Kem site scene
  await p.evaluate(() => setTime(97));
  await p.waitForTimeout(800);
  R.site = await p.evaluate(() => new Promise(res => { const s = performance.now(); openSite('kemkem'); requestAnimationFrame(() => requestAnimationFrame(() => res(Math.round(performance.now() - s)))); }));
  await p.evaluate(() => closeSite());
  // 9. one full map frame at several times (WorldMap._draw is the whole picture, no shortcuts)
  R.fullFrame = {};
  for (const t of [0, 0.02, 3, 90, 250, 700, 1500]) {
    R.fullFrame[t + ' Ma'] = await p.evaluate(t => { setTime(t); WorldMap._draw(); const s = performance.now(); for (let i = 0; i < 3; i++) WorldMap._draw(); return Math.round((performance.now() - s) / 3); }, t);
  }
  // 10. the globe: switch it on and drag it
  await p.evaluate(() => setTime(150));
  await p.click('#mapGlobe'); await p.waitForTimeout(800);
  await scenario('globeDrag', async () => { await p.mouse.move(cx, cy); await p.mouse.down(); for (let i = 1; i <= 45; i++) { await p.mouse.move(cx + Math.sin(i / 7) * box.width * 0.25, cy + Math.cos(i / 9) * box.height * 0.1); await p.waitForTimeout(33); } await p.mouse.up(); });
  await p.click('#mapGlobe');
  await ctx.close();
  return R;
}

srv.listen(0, '127.0.0.1', async () => {
  const port = srv.address().port, b = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const html = fs.readFileSync(path.join(ROOT, 'dino-explorer.html'));
  const res = { when: new Date().toISOString(), page: { kb: Math.round(html.length / 1024), gzipKb: Math.round(zlib.gzipSync(html).length / 1024) } };
  res.desktop = await run(b, 'desktop 1400×900', { width: 1400, height: 900 }, false, port);
  res.phone = await run(b, 'phone 390×844, CPU 4× slower', { width: 390, height: 844 }, true, port);
  await b.close(); srv.close();
  console.log(JSON.stringify(res, null, 1));
  if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
});
