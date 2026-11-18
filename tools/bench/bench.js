// The benchmark: how well the map agrees with independent evidence, scored so it can only get better.
//
//   node tools/bench/bench.js            # run, print every score and fact, compare with the baseline
//   node tools/bench/bench.js --update   # after an improvement: raise the baseline and log the run
//
// Scores (each 0–1, higher is better):
//   poles      paleomagnetic poles (Torsvik et al. 2012) carried by our plates to their age land within
//              their own error circle + 10° of a geographic pole — tests the plate model directly
//   ice        glacial deposits (Boucot et al. 2013, as in the rocks layer) lie poleward of 40° at their age
//   salt       salt and desert crusts lie within 45° of the equator (the dry belts; Cao et al. 2019)
//   tropics    bauxite, laterite and kaolin — weathering in hot, wet climates — lie within 40°
//   seaLife    fossil sites of sea creatures fall in the sea or on land the sea reached at its highest
//   landLife   dinosaur and synapsid sites fall on land or land the sea reached at its highest
//   facts      named facts (tools/bench/facts.js) that hold
// tools/test.js runs the same function and fails if any score drops below the baseline or a fact that
// passed fails. Never lower the baseline to make a release pass: fix the map, or explain in docs/PLAN.md.
const fs = require('fs'), path = require('path');
const HERE = __dirname, BASE = path.join(HERE, 'baseline.json'), HIST = path.join(HERE, 'history.jsonl');
const TOL = 0.005;                                   // scores are shares; allow half a point of noise

async function runBench(page) {
  const facts = require('./facts.js'), vgp = JSON.parse(fs.readFileSync(path.join(HERE, 'vgp.json'), 'utf8'));
  const refs = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'source', 'refs.json'), 'utf8'));
  for (const f of facts) for (const k of f.refs) if (!refs[k]) throw new Error(`fact ${f.id}: source ${k} is not a verified reference`);
  await page.waitForFunction(() => WorldMap._sea().st === 'ready', null, { timeout: 20000 });
  return page.evaluate(([facts, vgp]) => {
    const D = Math.PI / 180;
    const place = (lat, lon, t) => { const a = WorldMap.attach(lat, lon, t); return a && a.f >= 0 ? WorldMap.locate(a, t) : null; };   // [lon, lat]
    const km = (p, q) => { const a = Math.sin((q[1] - p[1]) * D / 2) ** 2 + Math.cos(p[1] * D) * Math.cos(q[1] * D) * Math.sin((q[0] - p[0]) * D / 2) ** 2; return 12742 * Math.asin(Math.min(1, Math.sqrt(a))); };
    const sitesOf = (name, sub) => { const c = ALL.find(x => x.name === name); return c && c.sites ? c.sites.filter(s => !sub || s[2].includes(sub)) : null; };
    const out = { scores: {}, detail: {}, facts: [] };
    // paleomagnetic poles
    let n = 0, ok = 0; const mis = [];
    for (const v of vgp) {
      if (v.age > WorldMap.MAXT) continue;
      const a = WorldMap.attach(v.site[0], v.site[1], v.age); if (!a || a.f < 0) continue;
      const m = WorldMap._famRotAt(a.f, v.age); if (!m) continue;
      const la = v.pole[0] * D, lo = v.pole[1] * D, P = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
      const z = m[6] * P[0] + m[7] * P[1] + m[8] * P[2], d = 90 - Math.abs(Math.asin(Math.max(-1, Math.min(1, z))) / D);
      n++; mis.push(d); if (d <= (v.a95 || 10) + 10) ok++;
    }
    mis.sort((a, b) => a - b);
    out.scores.poles = ok / n; out.detail.poles = { n, median: +mis[mis.length >> 1].toFixed(1), within: ok };
    // climate from the rocks
    const rk = { 0: [], 1: [], 2: [], 3: [] };
    for (let i = 0; i < ROCKS.length; i += 5) { const k = ROCKS[i], t = (ROCKS[i + 3] + ROCKS[i + 4]) / 2; const p = place(ROCKS[i + 1] * ROCK_CELL, ROCKS[i + 2] * ROCK_CELL, t); if (p) rk[k].push(Math.abs(p[1])); }
    const share = (a, f) => a.length ? a.filter(f).length / a.length : 0;
    out.scores.ice = share(rk[3], x => x >= 40); out.scores.salt = share(rk[1], x => x <= 45); out.scores.tropics = share(rk[2], x => x <= 40);
    out.detail.rocks = { glacial: rk[3].length, salt: rk[1].length, tropical: rk[2].length };
    // fossil sites against the sea maps
    const seaRe = /sea|ocean|reef|marine|seafloor|lagoon|shelf|coast|bay|plankton/i, landG = ['dino', 'ptero', 'bird', 'mammal', 'synapsid', 'amph', 'plant'];
    const c = { m: 0, mOk: 0, l: 0, lOk: 0 };
    for (const a of ALL) { if (!a.sites) continue; const t = (a.t[0] + a.t[1]) / 2; if (t > 540 || t < 3) continue;
      for (const s of a.sites) { const w = WorldMap.seaAt(s[0], s[1], t);
        if ((a.g === 'marine' || seaRe.test(a.habitat || '')) && !landG.includes(a.g)) { c.m++; if (w === 'sea' || w === 'reached') c.mOk++; }
        else if (a.g === 'dino' || a.g === 'synapsid') { c.l++; if (w === 'land' || w === 'reached') c.lOk++; } } }
    out.scores.seaLife = c.mOk / c.m; out.scores.landLife = c.lOk / c.l; out.detail.fossils = c;
    // named facts
    for (const f of facts) {
      let pass = false, got = null;
      const pts = f.animal ? (sitesOf(f.animal, f.site) || []).map(s => [s[0], s[1]]) : f.at ? [f.at] : [];
      if (f.kind === 'sea') { got = pts.map(p => WorldMap.seaAt(p[0], p[1], f.t)); pass = got.length > 0 && got.every(g => f.expect.includes(g)); }
      else if (f.kind === 'lat') { got = pts.map(p => { const q = place(p[0], p[1], f.t); return q ? +q[1].toFixed(1) : null; }); pass = got.length > 0 && got.every(v => v != null && (f.min == null || v >= f.min) && (f.max == null || v <= f.max)); }
      else if (f.kind === 'dist') { const a = place(f.a[0], f.a[1], f.t), b = place(f.b[0], f.b[1], f.t); got = a && b ? Math.round(km(a, b)) : null; pass = got != null && (f.min == null || got >= f.min) && (f.max == null || got <= f.max); }
      else if (f.kind === 'moved') { const d = t => { const a = place(f.a[0], f.a[1], t), b = place(f.b[0], f.b[1], t); return a && b ? km(a, b) : null; }; const x = d(f.from), y = d(f.to); got = x != null && y != null ? Math.round(x - y) : null; pass = got != null && got >= f.min; }
      out.facts.push({ id: f.id, pass, got, invalid: pts.length === 0 && (f.kind === 'sea' || f.kind === 'lat') });
    }
    out.scores.facts = out.facts.filter(f => f.pass).length / out.facts.length;
    return out;
  }, [facts, vgp]);
}

/* Compare a run with the baseline: the list of things that got worse (empty = fine). */
function regressions(run, base) {
  const bad = [];
  for (const [k, v] of Object.entries(base.scores || {})) if ((run.scores[k] ?? 0) < v - TOL) bad.push(`${k} ${(run.scores[k] * 100).toFixed(1)}% < ${(v * 100).toFixed(1)}%`);
  for (const id of base.passing || []) { const f = run.facts.find(x => x.id === id); if (!f || !f.pass) bad.push(`fact ${id} no longer holds (${JSON.stringify(f && f.got)})`); }
  return bad;
}
const loadBase = () => fs.existsSync(BASE) ? JSON.parse(fs.readFileSync(BASE, 'utf8')) : { scores: {}, passing: [] };

module.exports = { runBench, regressions, loadBase };

if (require.main === module) (async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
  await p.goto('file://' + path.join(HERE, '..', '..', 'dino-explorer.html') + '#100mya'); await p.waitForTimeout(900);
  const run = await runBench(p), base = loadBase(), bad = regressions(run, base);
  for (const [k, v] of Object.entries(run.scores)) console.log(`${k.padEnd(9)} ${(v * 100).toFixed(1).padStart(5)}%   baseline ${base.scores[k] != null ? (base.scores[k] * 100).toFixed(1) + '%' : '—'}`);
  console.log('detail', JSON.stringify(run.detail));
  for (const f of run.facts) console.log(`  ${f.pass ? 'ok  ' : 'MISS'} ${f.id}${f.invalid ? ' (no such place in the data)' : ''}  ${JSON.stringify(f.got)}`);
  if (bad.length) console.log('\nWORSE THAN THE BASELINE:\n  ' + bad.join('\n  '));
  if (process.argv.includes('--update')) {
    if (bad.length) { console.log('\nNot updating: fix what got worse first.'); process.exitCode = 1; }
    else {
      const next = { scores: Object.fromEntries(Object.entries(run.scores).map(([k, v]) => [k, Math.max(v, base.scores[k] ?? 0)])), passing: run.facts.filter(f => f.pass).map(f => f.id) };
      fs.writeFileSync(BASE, JSON.stringify(next, null, 1) + '\n');
      fs.appendFileSync(HIST, JSON.stringify({ date: new Date().toISOString().slice(0, 10), scores: Object.fromEntries(Object.entries(run.scores).map(([k, v]) => [k, +v.toFixed(4)])), passing: next.passing.length, of: run.facts.length }) + '\n');
      console.log('\nBaseline raised and run logged in tools/bench/history.jsonl');
    }
  }
  await b.close();
})();
