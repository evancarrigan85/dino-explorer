// One-off assembler: merges the original page's content with the migration
// tables and new data, and writes the single self-contained page.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SRC = new URL('.', import.meta.url).pathname, OUT = process.argv[2];
const old = require('./old.js');
const { META } = require('./data_fix.js');
const { NEW } = require('./data_new.js');
const { HOMININS, MILESTONES } = require('./data_hominins.js');
const P = require('./data_periods.js');
const T = require('./data_time.js');
const C = require('./data_class.js');
let MORE = {}; try { MORE = require('./data_more.js').MORE; } catch (e) {}
const { CENOZOIC, WEIRD_NAMES } = require('./data_cenozoic.js');
const { EARLY } = require('./data_early.js');
const { ROOTS } = require('./data_roots.js');
const { GAPS } = require('./data_gaps.js');
const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const problems = [];

// ── periods ──
const periods = [];
for (const p0 of old.PERIODS) {
  const p = Object.assign({}, p0, P.PERIOD_EDITS[p0.id] || {});
  delete p.continentKey; p.creatures = [];
  periods.push(p);
  if (p.id === 'cryogenian') for (const q0 of [P.HADEAN, P.EOARCHEAN, P.PALEOARCHEAN, P.MESOARCHEAN, P.NEOARCHEAN, P.SIDERIAN, P.RHYACIAN, P.OROSIRIAN, P.STATHERIAN, P.CALYMMIAN, P.ECTASIAN, P.STENIAN, P.TONIAN]) { const q = Object.assign({}, q0); delete q.continentKey; q.creatures = []; periods.splice(periods.length - 1, 0, q); }
  if (p.id === 'cryogenian') { const e = Object.assign({}, P.EDIACARAN); delete e.continentKey; e.creatures = []; periods.push(e); }
}
const byId = Object.fromEntries(periods.map(p => [p.id, p]));
for (const p of periods) {
  [p.start, p.end] = T.PERIOD_BOUNDS[p.id];
  p.insight = P.INSIGHTS[p.id]; if (!p.insight) problems.push('no insight: ' + p.id);
}
byId.cryogenian.mapTitle = 'Snowball Earth'; byId.tonian.mapTitle = 'The World of Rodinia'; byId.statherian.mapTitle = 'The World of Nuna'; byId.quaternary.mapTitle = 'The Ice Age World'; byId.holocene.mapTitle = 'After the Ice Age';
const ORDER = ['name', 'emoji', 'diet', 'size', 'habitat', 'lived', 't', 'g', 'c', 'means', 'fact', 'know', 'debate', 'taxonomy', 'discovery', 'keyResearchers', 'citation', 'weird', 'sites'];
const tidy = c => { const o = {}; for (const k of ORDER) if (c[k] !== undefined && c[k] !== '') o[k] = c[k]; return o; };
for (const p0 of old.PERIODS) {
  for (const c0 of p0.creatures) {
    const m = META[c0.name]; if (!m) { problems.push('no meta: ' + c0.name); continue; }
    if (m.drop) continue;
    const c = Object.assign({}, c0);
    for (const k of ['name', 'fact', 'lived', 'know', 'debate']) if (m[k]) c[k] = m[k];
    Object.assign(c, P.CREATURE_INSIGHTS[c.name] || {});
    c.t = m.t; c.g = C.G_FIX[c.name] || m.g; c.sites = m.sites; c.c = C.LINEAGE[c.name];
    byId[m.move || p0.id].creatures.push(tidy(c));
  }
}
for (const set of [NEW, MORE, CENOZOIC, EARLY, ROOTS, GAPS]) for (const [pid, list] of Object.entries(set)) for (const c0 of list) {
  const c = Object.assign({}, c0); c.g = C.G_FIX[c.name] || c.g; c.c = c.c || C.LINEAGE[c.name];
  if (!byId[pid]) { problems.push('bad period ' + pid); continue; }
  byId[pid].creatures.push(tidy(c));
}
// weird & wonderful
const allC = periods.flatMap(p => p.creatures);
const allNames = new Set(allC.map(c => c.name));
for (const n of WEIRD_NAMES) { const c = allC.find(x => x.name === n); if (c) c.weird = 1; else problems.push('weird: no animal named ' + n); }
// checks
const keys = new Set(HOMININS.map(h => h.id));
const TYPES = ['dino', 'bird', 'ptero', 'marine', 'croc', 'reptile', 'synapsid', 'mammal', 'hominin', 'amphib', 'fish', 'invert', 'plant', 'micro'];
for (const p of periods) for (const c of p.creatures) {
  const k = slug(c.name); if (keys.has(k)) problems.push('duplicate key ' + k); keys.add(k);
  for (const f of ['name', 'emoji', 'diet', 'size', 'lived', 't', 'g', 'c', 'fact', 'sites']) if (c[f] === undefined) problems.push(c.name + ' missing ' + f);
  if (c.t && !(c.t[0] >= c.t[1])) problems.push(c.name + ' bad t');
  if (!TYPES.includes(c.g)) problems.push(c.name + ' bad type ' + c.g);
  if (c.t && (c.t[0] < p.end - 1e-9 || c.t[1] > p.start + 1e-9)) problems.push(`${c.name} [${c.t}] never overlaps its period ${p.id} [${p.start},${p.end}]`);
  for (const s of c.sites || []) if (!(Math.abs(s[0]) <= 90 && Math.abs(s[1]) <= 180 && typeof s[2] === 'string')) problems.push(c.name + ' bad site ' + JSON.stringify(s));
}
for (const h of HOMININS) for (const s of h.sites) if (!(Math.abs(s[0]) <= 90 && Math.abs(s[1]) <= 180)) problems.push(h.id + ' bad site');
// ── geology cards ──
const geo = old.GEO_FEATURES.map(f => {
  const g = { id: f.id, name: f.name, type: f.type, icon: f.icon, periods: f.periods, shortDesc: f.shortDesc, fullDesc: f.fullDesc, funFact: f.funFact };
  g.at = f.id in P.GEO_FIX ? P.GEO_FIX[f.id] : f.latlon;
  return g;
});

// ── emit ──
const J = JSON.stringify;
let data = `// ============================================================
// DATA — periods, animals, the human family, the time scale
// ============================================================
// An animal:  name, emoji, diet, size, habitat, lived (text), fact
//   t      [first, last] in million years ago      g  kind of animal
//   c      lineage, broad to narrow                means  what the name means
//   know / debate   museum-label notes ("How do we know?", "Still debated")
//   sites  fossil localities today [lat, lon, label] — the map carries each
//          one back to where that spot was when the animal was alive
const PERIODS = [\n`;
for (const p of periods) {
  const head = Object.assign({}, p); delete head.creatures; delete head.insight;
  data += `{\n  ${Object.entries(head).filter(([, v]) => v !== undefined).map(([k, v]) => k + ':' + J(v)).join(', ')},\n`;
  data += `  insight: ${J(p.insight, null, 1).replace(/\n\s*/g, ' ')},\n  creatures: [\n`;
  data += p.creatures.map(c => '    ' + J(c)).join(',\n') + '\n  ]\n},\n';
}
data += '];\n\n';
const hsrc = fs.readFileSync(SRC + 'data_hominins.js', 'utf8');
data += hsrc.slice(0, hsrc.indexOf("if (typeof module")).trim() + '\n';
const { FOODWEBS } = require('./data_foodweb.js');
for (const [pid, w] of Object.entries(FOODWEBS)) { if (!byId[pid]) problems.push('foodweb: bad period ' + pid); for (const [id, n] of Object.entries(w.nodes)) if (n[3] && !allNames.has(n[3])) problems.push('foodweb ' + pid + ': no animal named ' + n[3]); for (const l of w.links) if (!w.nodes[l[0]] || !w.nodes[l[1]]) problems.push('foodweb ' + pid + ': bad link ' + l.join('>')); }
const fsrc = fs.readFileSync(SRC + 'data_foodweb.js', 'utf8');
data += fsrc.slice(fsrc.indexOf('// ===='), fsrc.indexOf("if (typeof module")).trim() + '\n';
const dsrc = fs.readFileSync(SRC + 'data_drowned.js', 'utf8');
data += dsrc.slice(dsrc.indexOf('// ===='), dsrc.indexOf("if (typeof module")).trim() + '\n';
// ── peer-reviewed sources (verified against Crossref by tools/verify_refs.py) ──
const RAW = JSON.parse(fs.readFileSync(SRC + 'refs.json', 'utf8'));
const { CULTURES } = require('./data_cultures.js'), { DROWNED } = require('./data_drowned.js');
const { FINDS, FIND_ERAS, FIND_THEMES, INSPIRATIONS } = require('./data_finds.js');
const { TREES } = require('./data_trees.js');
const { EXTINCTIONS } = require('./data_extinctions.js');
{ const { STORIES } = require('./data_stories.js');
  for (const st of STORIES) {
    if (!st.steps.length || st.steps[0][0] !== 0 || st.steps.some((s, i) => i && s[0] <= st.steps[i - 1][0])) problems.push('story ' + st.id + ': steps must start at 0 and rise');
    const ck = st.ka || st.ma;
    if (!ck || ck[0][0] !== 0 || ck[ck.length - 1][0] !== 1 || ck.some((a, i) => i && (a[0] <= ck[i - 1][0] || a[1] > ck[i - 1][1]))) problems.push('story ' + st.id + ': the clock must run 0→1, forward in time');
    if (!st.onmap || !st.know || !st.debate) problems.push('story ' + st.id + ': needs onmap, know and debate');
    if (st.margin && st.margin.edges.some(e => e[1].length !== st.margin.lons.length)) problems.push('story ' + st.id + ': every ice edge needs one latitude per longitude');
  }
  const ssrc = fs.readFileSync(SRC + 'data_stories.js', 'utf8');
  data += ssrc.slice(ssrc.indexOf('// ===='), ssrc.indexOf("if (typeof module")).trim() + '\n';
}
{ for (const e of EXTINCTIONS) {
    const p = byId[e.id];
    if (!p || !P.INSIGHTS[e.id] || !P.INSIGHTS[e.id].ext) { problems.push('extinction ' + e.id + ': its period has no extinction entry in data_periods.js'); continue; }
    if (!(e.from > e.to && e.t <= e.from && e.t >= e.to - 1e-9)) problems.push('extinction ' + e.id + ': the scene must run through its moment');
    if (!(e.win[0] >= e.from && e.win[1] <= e.to)) problems.push('extinction ' + e.id + ': the timeline window must hold the scene');
    if (!e.steps.length || e.steps[0][0] !== 0 || e.steps.some((s, i) => i && s[0] <= e.steps[i - 1][0])) problems.push('extinction ' + e.id + ': steps must start at 0 and rise');
    if (!['ice', 'anoxia', 'traps', 'rift', 'impact', 'people', 'now'].includes(e.scene)) problems.push('extinction ' + e.id + ': unknown scene ' + e.scene);
  }
  const xsrc = fs.readFileSync(SRC + 'data_extinctions.js', 'utf8');
  data += xsrc.slice(xsrc.indexOf('// ===='), xsrc.indexOf("if (typeof module")).trim() + '\n';
}
const { SITE_SCENES } = require('./data_sites.js');
// silhouettes-data.js holds three constants: SIL (the scenes), SILI (every picture) and SILA (every animal card → picture)
const silSrc = fs.readFileSync(SRC + 'silhouettes-data.js', 'utf8');
const silConst = name => { const i = silSrc.indexOf('const ' + name + ' = '); if (i < 0) return null; const a = silSrc.indexOf('{', i); return JSON.parse(silSrc.slice(a, silSrc.indexOf(';\n', a))); };
{ const SILI = silConst('SILI'), SILA = silConst('SILA');
  if (SILA) {
    for (const [k, i] of Object.entries(SILI)) {
      if (!fs.existsSync(SRC + '../../tiles/sil/p/' + k + '.png')) problems.push('silhouette picture ' + k + ' is missing from tiles/sil/p');
      if (![0, 1, 2, 3].includes(i[3])) problems.push('silhouette picture ' + k + ' has a licence that is not CC0, public domain or CC BY');
    }
    for (const [n, a] of Object.entries(SILA)) { if (!allNames.has(n)) problems.push('silhouette for ' + n + ', which is not an animal here'); if (!SILI[a[0]]) problems.push('silhouette for ' + n + ': picture ' + a[0] + ' is not in SILI'); }
  }
}
{ const ok = new Set(['air', 'bank', 'edge', 'sand', 'water']);
  for (const st of SITE_SCENES) {
    if (!st.cast || !st.cast.length) problems.push('site ' + st.id + ': no animals');
    for (const c of st.cast || []) { if (!ok.has(c.zone)) problems.push('site ' + st.id + ': ' + c.name + ' has no zone'); if (c.len == null && c.size !== 'size not known') problems.push('site ' + st.id + ': ' + c.name + ' has no length, so its size must say “size not known”'); }
    for (const n of st.open || []) if (!allNames.has(n)) problems.push('site ' + st.id + ': opens from ' + n + ', which is not an animal here');
    { const SIL = silConst('SIL');
      for (const c of st.cast || []) if (c.sil && !SIL[c.sil]) problems.push('site ' + st.id + ': ' + c.name + ' wants silhouette ' + c.sil + ', which silhouettes-data.js does not have');
      for (const k in SIL) if (!fs.existsSync(SRC + '../../' + SIL[k].f)) problems.push('silhouette ' + k + ': ' + SIL[k].f + ' is missing'); }
  }
  const ssrc = fs.readFileSync(SRC + 'data_sites.js', 'utf8');
  data += ssrc.slice(ssrc.indexOf('// ===='), ssrc.indexOf("if (typeof module")).trim() + '\n';
}
const { EMPIRES, BELIEFS, BELIEF_FAMILIES, TRADE, WORKS, OLD } = require('./data_history.js');
{ const ids = new Set();
  for (const e of EMPIRES) {
    if (ids.has(e.id)) problems.push('empire ' + e.id + ': duplicate id'); ids.add(e.id);
    if (!(e.from < e.to && e.peak >= e.from && e.peak <= e.to)) problems.push('empire ' + e.id + ': peak must lie between its start and end');
    if (!(Math.abs(e.cap[0]) <= 90 && Math.abs(e.cap[1]) <= 180)) problems.push('empire ' + e.id + ': bad capital');
    if (e.poly && (e.poly.length < 4 || e.poly.some(q => !(Math.abs(q[0]) <= 90 && Math.abs(q[1]) <= 180)))) problems.push('empire ' + e.id + ': bad sketch');
    if (!e.story || !e.legacy || !e.where || !e.color) problems.push('empire ' + e.id + ': missing a field');
  }
  for (const b of BELIEFS) {
    if (ids.has(b.id)) problems.push('belief ' + b.id + ': duplicate id'); ids.add(b.id);
    if (!BELIEF_FAMILIES.some(f => f[0] === b.fam)) problems.push('belief ' + b.id + ': unknown family ' + b.fam);
    for (const g of b.grew || []) if (!BELIEFS.some(x => x.id === g)) problems.push('belief ' + b.id + ': grew from unknown ' + g);
    if (!b.idea || !b.who || !b.when || !b.today) problems.push('belief ' + b.id + ': missing a field');
    for (const sp of b.spread) if (!(sp[0] >= b.year && Math.abs(sp[1]) <= 90 && Math.abs(sp[2]) <= 180)) problems.push('belief ' + b.id + ': bad spread point ' + sp[3]);
  }
  const okPt = q => Array.isArray(q) && Math.abs(q[0]) <= 90 && Math.abs(q[1]) <= 180;
  for (const e of EMPIRES) for (const [i, st] of (e.stages || []).entries()) {
    if (!(st[0] >= e.from && st[0] <= e.to) || (i && st[0] <= e.stages[i - 1][0])) problems.push('empire ' + e.id + ': stage years must rise within its lifetime');
    if (st[1] === null ? !e.poly : st[1].some(poly => poly.length < 4 || !poly.every(okPt))) problems.push('empire ' + e.id + ': bad stage sketch at ' + st[0]);
    if (!st[2]) problems.push('empire ' + e.id + ': stage ' + st[0] + ' needs a note');
  }
  for (const r of TRADE) {
    if (ids.has(r.id)) problems.push('route ' + r.id + ': duplicate id'); ids.add(r.id);
    if (!(r.from < r.to) || !okPt(r.label) || !r.paths.length || r.paths.some(pa => pa.length < 2 || !pa.every(okPt))) problems.push('route ' + r.id + ': bad dates or path');
    if (!r.goods || !r.story || !r.legacy || !r.color) problems.push('route ' + r.id + ': missing a field');
  }
  for (const w of WORKS) {
    if (ids.has(w.id)) problems.push('work ' + w.id + ': duplicate id'); ids.add(w.id);
    if (!(w.year <= w.done) || !okPt(w.at) || (w.end != null && w.end < w.done)) problems.push('work ' + w.id + ': bad dates or place');
    if (!w.story || !w.who || !w.where) problems.push('work ' + w.id + ': missing a field');
  }
  for (const o of OLD) {
    if (ids.has(o.id)) problems.push('old place ' + o.id + ': duplicate id'); ids.add(o.id);
    if (!['sumer', 'nile', 'indus'].includes(o.area)) problems.push('old place ' + o.id + ': unknown area ' + o.area);
    if (!['city', 'river', 'fields'].includes(o.kind) || !okPt(o.at) || !(o.from < o.to) || !o.note) problems.push('old place ' + o.id + ': bad kind, place, dates or note');
    if (o.kind === 'river' && !(o.path && o.path.length > 1 && o.path.every(okPt))) problems.push('old place ' + o.id + ': bad river path');
    if (o.kind === 'fields' && !(o.poly && o.poly.length > 3 && o.poly.every(okPt))) problems.push('old place ' + o.id + ': bad fields sketch');
  }
  const hsrc = fs.readFileSync(SRC + 'data_history.js', 'utf8');
  data += hsrc.slice(hsrc.indexOf('// ===='), hsrc.indexOf("if (typeof module")).trim() + '\n';
}
const { YOU_LINE } = require('./data_you.js');
{ YOU_LINE.forEach((y, i) => {
    if (i && YOU_LINE[i - 1].to !== y.from) problems.push('you: gap or overlap before ' + y.from);
    if (!(y.at <= y.from && y.at >= y.to)) problems.push('you: "at" outside its range at ' + y.from);
    if (y.like && !allNames.has(y.like)) problems.push('you: no animal card named ' + y.like);
    if (y.hom && !HOMININS.some(h => h.id === y.hom)) problems.push('you: no hominin ' + y.hom);
    const c = y.like && allC.find(x => x.name === y.like); if (c && (y.at > c.t[0] + 12 || y.at < c.t[1] - 12)) problems.push('you: ' + y.like + ' did not live near ' + y.at);
  });
  if (YOU_LINE[0].from !== 4567 || YOU_LINE[YOU_LINE.length - 1].to !== 0) problems.push('you: the line must run from 720 to 0');
  const ysrc = fs.readFileSync(SRC + 'data_you.js', 'utf8');
  data += ysrc.slice(ysrc.indexOf('// ===='), ysrc.indexOf("if (typeof module")).trim() + '\n';
}
{ const paths = allC.map(c => c.c), ids = new Set();
  const walk = (n, tree) => {
    if (!n.n) problems.push('tree ' + tree + ': a branch has no name');
    for (const p of n.paths || []) if (!paths.some(q => q === p || q.startsWith(p + ' › '))) problems.push('tree ' + tree + ': no animal on the path "' + p + '" (branch ' + n.n + ')');
    const trunks = (n.kids || []).filter(k => k.trunk).length; if (trunks > 1) problems.push('tree ' + tree + ': ' + n.n + ' has two trunks');
    if (n.link && !TREES.some(t => t.id === n.link)) problems.push('tree ' + tree + ': ' + n.n + ' links to unknown tree ' + n.link);
    (n.kids || []).forEach(k => walk(k, tree));
  };
  for (const t of TREES) { if (ids.has(t.id)) problems.push('tree ' + t.id + ': duplicate id'); ids.add(t.id); walk(t.root, t.id); }
  const tsrc = fs.readFileSync(SRC + 'data_trees.js', 'utf8');
  data += tsrc.slice(tsrc.indexOf('// ===='), tsrc.indexOf("if (typeof module")).trim() + '\n';
}
{ const seen = new Set();
  for (const f of FINDS) {
    if (seen.has(f.id)) problems.push('find ' + f.id + ': duplicate id'); seen.add(f.id);
    if (!FIND_ERAS.some(e => e[0] === f.era)) problems.push('find ' + f.id + ': unknown era ' + f.era);
    if (!FIND_THEMES[f.theme]) problems.push('find ' + f.id + ': unknown theme ' + f.theme);
    if (f.animal && !allNames.has(f.animal)) problems.push('find ' + f.id + ': no animal card named ' + f.animal);
    if (f.hom && !HOMININS.some(h => h.id === f.hom)) problems.push('find ' + f.id + ': no hominin ' + f.hom);
    if (f.at && !(Math.abs(f.at[0]) <= 90 && Math.abs(f.at[1]) <= 180)) problems.push('find ' + f.id + ': bad coordinates');
    if (!f.story || !f.who || !f.where || !f.when || typeof f.year !== 'number') problems.push('find ' + f.id + ': missing a field');
  }
  const fsrc = fs.readFileSync(SRC + 'data_finds.js', 'utf8');
  data += fsrc.slice(fsrc.indexOf('// ===='), fsrc.indexOf("if (typeof module")).trim() + '\n';
}
{ // what helped people and what threatened them (Humans tab, “At this time”)
  const { SURVIVAL } = require('./data_survival.js'), seen = new Set();
  for (const v of SURVIVAL) {
    if (seen.has(v.id)) problems.push('survival ' + v.id + ': duplicate id'); seen.add(v.id);
    if (!['help', 'threat'].includes(v.kind)) problems.push('survival ' + v.id + ': kind must be help or threat');
    const w = v.t || v.y;
    if (!!v.t === !!v.y || !Array.isArray(w) || w.length !== 2 || !(v.t ? w[0] > w[1] && w[1] >= 0 : w[0] < w[1])) problems.push('survival ' + v.id + ': needs one of t [from, to] (Ma, from > to) or y [from, to] (calendar years)');
    if (!v.icon || !v.name || !v.text || !v.where) problems.push('survival ' + v.id + ': missing a field');
    if (/'/.test(v.name + v.text + v.where + (v.debate || ''))) problems.push('survival ' + v.id + ': use ’ not a straight quote');
  }
  const vsrc = fs.readFileSync(SRC + 'data_survival.js', 'utf8');
  data += vsrc.slice(vsrc.indexOf('// ===='), vsrc.indexOf("if (typeof module")).trim() + '\n';
}
const { CHAPTERS } = require('./data_mammals.js');
{ // the Age of Mammals, chapter by chapter: one per epoch, inside its period, in order
  const seen = new Set();
  for (const c of CHAPTERS) {
    if (seen.has(c.id) || byId[c.id]) problems.push('chapter ' + c.id + ': duplicate id'); seen.add(c.id);
    if (!(c.start > c.end) || !c.title || !c.desc || !c.mapTitle || !c.big || !c.know || !c.today || !Array.isArray(c.signs) || c.signs.length < 3) problems.push('chapter ' + c.id + ': missing a field');
    if (/'/.test(JSON.stringify(c))) problems.push('chapter ' + c.id + ': use ’ not a straight quote');
  }
  for (let i = 1; i < CHAPTERS.length; i++) if (CHAPTERS[i].start !== CHAPTERS[i - 1].end) problems.push('chapter ' + CHAPTERS[i].id + ': does not start where ' + CHAPTERS[i - 1].id + ' ends');
  const msrc = fs.readFileSync(SRC + 'data_mammals.js', 'utf8');
  data += msrc.slice(msrc.indexOf('// ===='), msrc.indexOf("if (typeof module")).trim() + '\n';
}
const okTarget = { a: n => allNames.has(n), h: id => HOMININS.some(h => h.id === id), c: id => CULTURES.some(c => c.id === id), d: id => DROWNED.some(d => d.id === id),
  p: id => !!byId[id] || CHAPTERS.some(c => c.id === id), f: id => !!FOODWEBS[id], x: id => FINDS.some(f => f.id === id), t: id => TREES.some(t => t.id === id), j: id => ['you', 'extinctions', 'drift', 'finds'].includes(id), e: id => EXTINCTIONS.some(e => e.id === id), k: id => EMPIRES.some(e => e.id === id), b: id => BELIEFS.some(b => b.id === id), r: id => TRADE.some(r => r.id === id), w: id => WORKS.some(w => w.id === id), o: id => ['sumer', 'nile', 'indus'].includes(id) || OLD.some(o => o.id === id), i: id => INSPIRATIONS.some(x => x.id === id), v: id => require('./data_survival.js').SURVIVAL.some(x => x.id === id), s: id => require('./data_stories.js').STORIES.some(st => st.id === id), m: id => ['plates', 'sealevel', 'time', 'climate', 'history', 'landcover', 'rocks', 'seas', 'terrain', 'checks', 'sound', 'ice', 'rivers', 'geoid'].includes(id), n: id => T.EVENTS.some(e => e[5] === id), z: id => require('./data_sites.js').SITE_SCENES.some(x => x.id === id) };
const REFS = {}, SRCMAP = {};
for (const [k, r] of Object.entries(RAW)) {
  if (!['journal-article', 'book-chapter', 'book', 'edited-book', 'monograph', 'reference-entry'].includes(r.type)) problems.push('source ' + k + ': not a published paper (' + r.type + ') — run tools/verify_refs.py --audit');
  // names as people should read them: the surname we were told to show, and no SHOUTING
  const names = r.authors.map((n, i) => i === 0 && r.first ? r.first : n === n.toUpperCase() && n !== 'et al.' ? n.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (x, s, c) => s + c.toUpperCase()) : n);
  REFS[k] = { a: names.length ? names.join(', ').replace(', et al.', ' et al.') : '', y: r.year, t: r.title, j: r.journal, d: r.doi };
  for (const t of r.targets) {
    const [kind, ...rest] = t.split(':'), id = rest.join(':');
    if (!okTarget[kind] || !okTarget[kind](id)) { problems.push('source ' + k + ': unknown target ' + t); continue; }
    (SRCMAP[t] = SRCMAP[t] || []).push(k);
  }
}
for (const t in SRCMAP) SRCMAP[t].sort((x, y) => REFS[x].y - REFS[y].y);
{ const X = require('./data_extinctions.js');
  for (const id of X.SMALL_CRISES || []) if (!T.EVENTS.some(e => e[5] === id)) problems.push('smaller crisis ' + id + ': no timeline event with that id'); }
{ const Y = require('./data_you.js');
  for (const sp of Y.SPARKS) { const ev = T.EVENTS.find(e => e[5] === sp[8]); if (!ev) problems.push('spark ' + sp[6] + ': belongs to no timeline event (its ninth element)'); else if (ev[0] > sp[2] + 2 || ev[0] < sp[3] - 2) problems.push('spark ' + sp[6] + ': its event ' + sp[8] + ' is at ' + ev[0] + ' Ma, outside its time'); } }
{ const ids = T.EVENTS.map(e => e[5]).filter(Boolean), seen = new Set();
  for (const id of ids) { if (seen.has(id)) problems.push('event id ' + id + ' is used twice'); seen.add(id); if (!SRCMAP['n:' + id]) problems.push('event ' + id + ' has an id but no verified source (n:' + id + ')'); } }
data += `// ── peer-reviewed sources: every entry verified against the Crossref DOI registry (tools/verify_refs.py) ──\nconst REFS = ${J(REFS)};\nconst SRCMAP = ${J(SRCMAP)};\n`;
{ // the benchmark's current scores (tools/bench), shown in "How this map is made"
  const base = JSON.parse(fs.readFileSync(SRC + '../bench/baseline.json', 'utf8'));
  const hist = fs.readFileSync(SRC + '../bench/history.jsonl', 'utf8').trim().split('\n').map(l => JSON.parse(l)), last = hist[hist.length - 1];
  data += `const BENCH = ${J({ scores: base.scores, facts: base.passing.length, of: last.of, date: last.date, runs: hist.length })};\n`;
}
const csrc = fs.readFileSync(SRC + 'data_cultures.js', 'utf8');
data += csrc.slice(0, csrc.indexOf("if (typeof module")).trim() + '\n';
data += `const HOMININ_LINEAGE = ${J(C.HOMININ_LINEAGE)};\n\n`;
data += `// ── geology cards ── (at: where to pin the card on the map, today's lat/lon; null = not pinned)\nconst GEO_FEATURES = [\n${geo.map(g => '  ' + J(g)).join(',\n')}\n];\n\n`;
const psrc = fs.readFileSync(SRC + 'data_periods.js', 'utf8');
data += psrc.slice(psrc.indexOf('// ── famous fossil sites'), psrc.indexOf('// Existing geology cards')).trim() + '\n\n';
const tsrc = fs.readFileSync(SRC + 'data_time.js', 'utf8');
data += tsrc.slice(tsrc.indexOf('// Epochs (rank 1)'), tsrc.indexOf("if (typeof module")).trim() + '\n';

const total = periods.reduce((n, p) => n + p.creatures.length, 0) + HOMININS.length;
const css = fs.readFileSync(SRC + 'style.css', 'utf8'), body = fs.readFileSync(SRC + 'body.html', 'utf8');
const d3 = fs.readFileSync(SRC + 'd3-geo-bundle.min.js', 'utf8').trim();
const plates = fs.readFileSync(SRC + 'plates-data.js', 'utf8').trim();
const shelf = fs.readFileSync(SRC + 'shelf-data.js', 'utf8').trim();
const relief = fs.readFileSync(SRC + 'relief-data.js', 'utf8').trim();
const landcover = fs.readFileSync(SRC + 'landcover-data.js', 'utf8').trim();
const rocks = fs.readFileSync(SRC + 'rocks-data.js', 'utf8').trim();
const seas = fs.readFileSync(SRC + 'seas-data.js', 'utf8').trim();
const demIndex = fs.readFileSync(SRC + 'dem-index.js', 'utf8').trim();
const rivers = fs.readFileSync(SRC + 'rivers-data.js', 'utf8').trim();
const quat = fs.readFileSync(SRC + 'silhouettes-data.js', 'utf8').trim() + '\n' + fs.readFileSync(SRC + 'quaternary-data.js', 'utf8').trim() + '\n' + fs.readFileSync(SRC + 'shelf-rivers-data.js', 'utf8').trim() + '\n' + fs.readFileSync(SRC + 'geoid-data.js', 'utf8').trim();
const hillIndex = fs.readFileSync(SRC + 'hill-index.js', 'utf8').trim();
const coastIndex = fs.readFileSync(SRC + 'coast-index.js', 'utf8').trim();
{ const csrc = fs.readFileSync(SRC + 'data_climate.js', 'utf8'); data += csrc.slice(csrc.indexOf('// ===='), csrc.indexOf("if (typeof module")).trim() + '\n'; }
const engine = fs.readFileSync(SRC + 'engine.js', 'utf8').trim(), quiz = fs.readFileSync(SRC + 'quiz.js', 'utf8').trim();
let app = fs.readFileSync(SRC + 'app.js', 'utf8').trim();
if (!/\ninit\(\);$/.test(app)) throw new Error('app.js must end with init();');
app = app.replace(/\ninit\(\);$/, '\n\n' + quiz + '\n\ninit();');
const desc = `Slide through 4.5 billion years of Earth and life — continents moving for the last 1.8 billion — continents that drift with real plate-tectonic data, ${Math.floor(total / 10) * 10}+ animals placed where their fossils were found, the whole human family, and a zoomable timeline from Snowball Earth to today.`;
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Before Us — a deep-time atlas of Earth, life and people</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="Before Us — a deep-time atlas of Earth, life and people">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%A6%95%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cinzel+Decorative:wght@400;700&display=swap" rel="stylesheet">
<style>
${css.trim()}
</style>
</head>
<body>
${body.trim()}

<!-- ─── GENERATED: d3-geo (map projection library, ISC licence, © Mike Bostock). Rebuild with tools/README.md — do not edit ─── -->
<script>
${d3}
</script>
<!-- ─── END GENERATED: d3-geo ─── -->

<!-- ─── GENERATED: plate data. Rebuild with tools/README.md — do not edit ─── -->
<script>
${plates}
</script>
<!-- ─── END GENERATED: plate data ─── -->

<!-- ─── GENERATED: continental shelves for Ice Age sea level. Rebuild with tools/build_shelf.py — do not edit ─── -->
<script>
${shelf}
</script>
<!-- ─── GENERATED: today's high ground, for the Ice Age map. Rebuild with tools/build_relief.py — do not edit ─── -->
<script>
${relief}
</script>
<!-- ─── GENERATED: today's landscapes from measured climate. Rebuild with tools/build_landcover.py — do not edit ─── -->
<script>
${landcover}
</script>
<!-- ─── GENERATED: climate read from dated rocks, for the deep-time land. Rebuild with tools/build_rocks.py — do not edit ─── -->
<script>
${rocks}
</script>
<!-- ─── GENERATED: seas over the continents, 540 million years ago to today. Rebuild with tools/build_seas.py — do not edit ─── -->
<script>
${seas}
</script>
<!-- ─── GENERATED: which ancient elevation maps exist (tiles/dem). Rebuild with tools/build_dem.py — do not edit ─── -->
<script>
${demIndex}
</script>
<!-- ─── GENERATED: today's great rivers and lakes. Rebuild with tools/build_rivers.py — do not edit ─── -->
<script>
${rivers}
</script>
<!-- ─── GENERATED: the last 3.6 million years — sea level, ice sheets, rivers on the dry sea floor. Rebuild with tools/build_quaternary.py, then tools/build_shelf_rivers.py — do not edit ─── -->
<script>
${quat}
</script>
<!-- ─── GENERATED: which terrain tiles exist (tiles/relief). Rebuild with tools/build_hillshade.py — do not edit ─── -->
<script>
${hillIndex}
</script>
<!-- ─── GENERATED: which detailed-coast tiles exist (tiles/coast). Rebuild with tools/build_coast.py — do not edit ─── -->
<script>
${coastIndex}
</script>
<!-- ─── END GENERATED: shelves ─── -->

<script>
${data.trim()}

${engine}

${app}
</script>
</body>
</html>
`;
fs.writeFileSync(OUT, html);
console.log(`animals ${total} (${periods.map(p => p.id.slice(0, 4) + ':' + p.creatures.length).join(' ')} + ${HOMININS.length} hominins) · dinosaurs ${periods.flatMap(p => p.creatures).filter(c => c.g === 'dino').length} · page ${(html.length / 1024).toFixed(0)} KB`);
if (problems.length) { console.log('PROBLEMS:\n  ' + problems.join('\n  ')); process.exitCode = 1; }
