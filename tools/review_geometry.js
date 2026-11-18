// Review the map's geometry through the whole timeline (the review of 18 Nov 2026, made repeatable).
// Serves the page over a local http server (so the terrain loads), walks 720 → 0 Ma and prints what it
// finds: sudden changes in how much land is drawn, thin gaps in the land, labels on the wrong surface,
// how well the WebGL terrain sits on the traced coasts, and how the fossil sites fit the sea maps.
//
//   node tools/review_geometry.js            # every 2 Myr; about two minutes
//   node tools/review_geometry.js 0.5        # every half million years; slower
//
// It reports; it does not fail. The checks that must always hold are in tools/test.js. Rotations against
// the Merdith model are checked separately with pygplates (see docs/PLAN.md, 18 Nov 2026).
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http');
const root = path.join(__dirname, '..'), step = +(process.argv[2] || 2);
(async () => {
  const types = { '.html': 'text/html', '.bin': 'application/octet-stream', '.jpg': 'image/jpeg', '.txt': 'text/plain' };
  const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
  await new Promise(res => srv.listen(0, '127.0.0.1', res));
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(`http://127.0.0.1:${srv.address().port}/dino-explorer.html#100mya`); await p.waitForTimeout(900);
  await p.evaluate(() => { closeDoor(); WorldMap.setMotion(false); });
  await p.waitForFunction(() => WorldMap._sea().st === 'ready', null, { timeout: 20000 });
  const line = s => console.log(s);

  // 1. walk the timeline on the flat map, terrain off (plain geometry)
  await p.evaluate(() => WorldMap.setTerrain(false));
  const rows = [];
  for (let t0 = 720; t0 > 0; t0 -= 40) {
    const ts = []; for (let t = t0; t > Math.max(0, t0 - 40) - 1e-9; t -= step) ts.push(+t.toFixed(3));
    rows.push(...await p.evaluate(ts => ts.map(t => { setTime(t); WorldMap._draw(); const L = WorldMap._landStats(); return { t, frac: WorldMap._landFrac(), w: L.w, h: L.h, crack: L.crack / Math.max(1, L.landN), labels: WorldMap._labelsAt().filter(x => x.shown && x.land != null && ((x.kind === 'ocean' && x.land > 200) || (x.kind === 'land' && x.land < 40 && x.sea === 'none'))).map(x => x.text) }; }), ts));
  }
  rows.sort((a, b) => b.t - a.t);
  const jumps = rows.slice(1).map((r, i) => [rows[i], r]).filter(([a, b]) => a.w === b.w && a.h === b.h && Math.abs(b.frac - a.frac) > 0.02);
  line(`timeline: ${rows.length} frames, every ${step} Myr`);
  line(`  land share changing by more than 2 points between frames: ${jumps.length}` + (jumps.length ? ' — ' + jumps.slice(0, 12).map(([a, b]) => `${a.t}→${b.t} (${(a.frac * 100).toFixed(0)}→${(b.frac * 100).toFixed(0)}%)`).join(', ') : ''));
  const today = rows.find(r => r.t <= 0.001) || rows[rows.length - 1], worst = [...rows].sort((a, b) => b.crack - a.crack).slice(0, 5);
  line(`  thin gaps per land pixel: today ${today.crack.toFixed(4)}; worst ${worst.map(r => `${r.t} Ma ${r.crack.toFixed(4)}`).join(', ')}`);
  const lab = rows.filter(r => r.labels.length);
  line(`  labels on the wrong surface: ${lab.length} frames` + (lab.length ? ' — ' + lab.slice(0, 8).map(r => `${r.t}: ${r.labels.join(', ')}`).join('; ') : ''));

  // 2. the WebGL terrain against the traced coasts
  await p.evaluate(() => WorldMap.setTerrain(true));
  await p.waitForFunction(() => WorldMap.terrain, null, { timeout: 20000 }).catch(() => {});
  const reg = [];
  for (const [m, z, ll, t] of [['flat', 1, null, 300], ['flat', 3, [20, 40], 90], ['globe', 1, null, 160], ['globe', 2.2, [-30, 120], 30]]) {
    await p.evaluate(([m, z, ll, t]) => { WorldMap.setMode(m); WorldMap.reset && WorldMap.reset(); setTime(t); if (z > 1) WorldMap.zoomBy(z); if (ll) WorldMap.lookAt(WorldMap.attach(ll[0], ll[1], 0)); }, [m, z, ll, t]);
    await p.waitForTimeout(2000);
    const r = await p.evaluate(() => { WorldMap._draw(); return WorldMap._terReg(); });
    if (r) { const best = Object.entries(r).sort((a, b) => b[1] - a[1])[0]; reg.push(`${m} ×${z} ${t} Ma: best shift ${best[0]} (${(r['0,0'] * 100).toFixed(0)}% at 0,0)`); } else reg.push(`${m} ×${z} ${t} Ma: no terrain`);
  }
  line('terrain on the traced coasts (a best shift of 0,0 or ±1 is a match):\n  ' + reg.join('\n  '));

  // 3. the fossil sites against the sea maps
  await p.evaluate(() => { WorldMap.setMode('flat'); WorldMap.reset && WorldMap.reset(); });
  const fos = await p.evaluate(() => {
    const sea = /sea|ocean|reef|marine|seafloor|lagoon|shelf|coast|bay|plankton/i, landG = ['dino', 'ptero', 'bird', 'mammal', 'synapsid', 'amph', 'plant'], c = {}, bad = [];
    const add = (k, w) => { c[k] = c[k] || {}; c[k][w] = (c[k][w] || 0) + 1; };
    for (const a of ALL) { if (!a.sites) continue; const t = (a.t[0] + a.t[1]) / 2; if (t > 540 || t < 3) continue;
      for (const s of a.sites) { const w = WorldMap.seaAt(s[0], s[1], t) || 'no map';
        const k = (a.g === 'marine' || sea.test(a.habitat || '')) && !landG.includes(a.g) ? 'sea creatures' : a.g === 'dino' || a.g === 'synapsid' ? 'dinosaurs and synapsids' : 'others';
        add(k, w); if (k === 'sea creatures' && w === 'land') bad.push(`${a.name} (${s[2]}, ${t.toFixed(0)} Ma)`); } }
    return { c, bad };
  });
  line('fossil sites at the animal’s mid-time:');
  for (const [k, v] of Object.entries(fos.c)) { const n = Object.values(v).reduce((a, b) => a + b, 0); line(`  ${k} (${n}): ` + Object.entries(v).map(([w, x]) => `${w} ${(100 * x / n).toFixed(0)}%`).join(', ')); }
  line(`  sea creatures on dry land: ${fos.bad.slice(0, 15).join('; ')}${fos.bad.length > 15 ? ' …' : ''}`);
  line(`page errors: ${errs.length ? errs.slice(0, 5).join(' | ') : 'none'}`);
  await b.close(); srv.close();
})();
