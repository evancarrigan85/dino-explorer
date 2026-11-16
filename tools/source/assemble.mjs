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
const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const problems = [];

// ── periods ──
const periods = [];
for (const p0 of old.PERIODS) {
  const p = Object.assign({}, p0, P.PERIOD_EDITS[p0.id] || {});
  delete p.continentKey; p.creatures = [];
  periods.push(p);
  if (p.id === 'cryogenian') { const e = Object.assign({}, P.EDIACARAN); delete e.continentKey; e.creatures = []; periods.push(e); }
}
const byId = Object.fromEntries(periods.map(p => [p.id, p]));
for (const p of periods) {
  [p.start, p.end] = T.PERIOD_BOUNDS[p.id];
  p.insight = P.INSIGHTS[p.id]; if (!p.insight) problems.push('no insight: ' + p.id);
}
byId.cryogenian.mapTitle = 'Snowball Earth'; byId.quaternary.mapTitle = 'The Ice Age World'; byId.holocene.mapTitle = 'After the Ice Age';
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
for (const set of [NEW, MORE, CENOZOIC, EARLY, ROOTS]) for (const [pid, list] of Object.entries(set)) for (const c0 of list) {
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
const { FINDS, FIND_ERAS, FIND_THEMES } = require('./data_finds.js');
const { TREES } = require('./data_trees.js');
const { EXTINCTIONS } = require('./data_extinctions.js');
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
const { YOU_LINE } = require('./data_you.js');
{ YOU_LINE.forEach((y, i) => {
    if (i && YOU_LINE[i - 1].to !== y.from) problems.push('you: gap or overlap before ' + y.from);
    if (!(y.at <= y.from && y.at >= y.to)) problems.push('you: "at" outside its range at ' + y.from);
    if (y.like && !allNames.has(y.like)) problems.push('you: no animal card named ' + y.like);
    if (y.hom && !HOMININS.some(h => h.id === y.hom)) problems.push('you: no hominin ' + y.hom);
    const c = y.like && allC.find(x => x.name === y.like); if (c && (y.at > c.t[0] + 12 || y.at < c.t[1] - 12)) problems.push('you: ' + y.like + ' did not live near ' + y.at);
  });
  if (YOU_LINE[0].from !== 720 || YOU_LINE[YOU_LINE.length - 1].to !== 0) problems.push('you: the line must run from 720 to 0');
  const ysrc = fs.readFileSync(SRC + 'data_you.js', 'utf8');
  data += ysrc.slice(ysrc.indexOf('// ===='), ysrc.indexOf("if (typeof module")).trim() + '\n';
}
{ const paths = allC.map(c => c.c), ids = new Set();
  const walk = (n, tree) => {
    if (!n.n) problems.push('tree ' + tree + ': a branch has no name');
    for (const p of n.paths || []) if (!paths.some(q => q === p || q.startsWith(p + ' › '))) problems.push('tree ' + tree + ': no animal on the path "' + p + '" (branch ' + n.n + ')');
    const trunks = (n.kids || []).filter(k => k.trunk).length; if (trunks > 1) problems.push('tree ' + tree + ': ' + n.n + ' has two trunks');
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
const okTarget = { a: n => allNames.has(n), h: id => HOMININS.some(h => h.id === id), c: id => CULTURES.some(c => c.id === id), d: id => DROWNED.some(d => d.id === id),
  p: id => !!byId[id], f: id => !!FOODWEBS[id], x: id => FINDS.some(f => f.id === id), t: id => TREES.some(t => t.id === id), j: id => ['you', 'extinctions', 'drift', 'finds'].includes(id), e: id => EXTINCTIONS.some(e => e.id === id), m: id => ['plates', 'sealevel', 'time', 'climate'].includes(id) };
const REFS = {}, SRCMAP = {};
for (const [k, r] of Object.entries(RAW)) {
  if (!['journal-article', 'book-chapter', 'book', 'monograph', 'reference-entry'].includes(r.type)) problems.push('source ' + k + ': not a published paper (' + r.type + ') — run tools/verify_refs.py --audit');
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
data += `// ── peer-reviewed sources: every entry verified against the Crossref DOI registry (tools/verify_refs.py) ──\nconst REFS = ${J(REFS)};\nconst SRCMAP = ${J(SRCMAP)};\n`;
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
{ const csrc = fs.readFileSync(SRC + 'data_climate.js', 'utf8'); data += csrc.slice(csrc.indexOf('// ===='), csrc.indexOf("if (typeof module")).trim() + '\n'; }
const engine = fs.readFileSync(SRC + 'engine.js', 'utf8').trim(), quiz = fs.readFileSync(SRC + 'quiz.js', 'utf8').trim();
let app = fs.readFileSync(SRC + 'app.js', 'utf8').trim();
if (!/\ninit\(\);$/.test(app)) throw new Error('app.js must end with init();');
app = app.replace(/\ninit\(\);$/, '\n\n' + quiz + '\n\ninit();');
const desc = `Slide through 720 million years of life on a moving Earth — continents that drift with real plate-tectonic data, ${Math.floor(total / 10) * 10}+ animals placed where their fossils were found, the whole human family, and a zoomable timeline from Snowball Earth to today.`;
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>🦕 Dino Time Explorer</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="🦕 Dino Time Explorer">
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
