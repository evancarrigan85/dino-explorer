// Copies what the new app needs from the content and data modules into app/src/content (JSON) and app/public
// (pictures), so the app never reaches outside its own folder at run time. Run by `npm run dev` and `npm run build`.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SRC = path.join(ROOT, 'tools', 'source'), OUT = path.join(ROOT, 'app', 'src', 'content'), PUB = path.join(ROOT, 'app', 'public');
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(path.join(PUB, 'sil'), { recursive: true });

const { SITE_SCENES } = require(path.join(SRC, 'data_sites.js'));
// silhouettes-data.js is a browser file of constants: read the SIL object out of it
const silSrc = fs.readFileSync(path.join(SRC, 'silhouettes-data.js'), 'utf8');
const silAt = silSrc.indexOf('{', silSrc.indexOf('const SIL = ')), SIL = JSON.parse(silSrc.slice(silAt, silSrc.indexOf(';\n', silAt)));
const refs = JSON.parse(fs.readFileSync(path.join(SRC, 'refs.json'), 'utf8'));

// every picture passes the art review (tools/review_art.py, tools/paint/art.json) before a reader sees it: one that was
// not reviewed, failed, or was rejected by the curator is left out; the rest carry how they were checked
const REG = fs.existsSync(path.join(ROOT, 'tools', 'paint', 'art.json')) ? JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'paint', 'art.json'), 'utf8')) : {};
const shown = id => { const a = REG[id]; return !!(a && a.review && a.review.status !== 'fail' && !a.rejected && !a.held); };
const check = id => { const a = REG[id], r = a.review; return {
  status: r.status, reviewer: r.reviewer, date: r.date, approved: !!a.approved, version: a.version,
  items: r.items.map(i => ({ item: i.item.replace(/^MUST NOT: /, ''), kind: i.kind, verdict: i.verdict, why: i.why })), other: r.other_errors,
  emotion: r.emotion, emotionNotes: r.emotion_notes, hard: a.hard || null }; };
const withCheck = (id, obj) => obj && shown(id) ? { ...obj, check: check(id) } : null;
const gated = [];
// the reconstruction brief of a site (content/briefs/): every decision, with the papers it rests on (verified, from refs.json)
const briefOf = id => {
  const f = path.join(ROOT, 'content', 'briefs', id + '.json'); if (!fs.existsSync(f)) return null;
  const B = JSON.parse(fs.readFileSync(f, 'utf8')), keys = new Set(Object.values(B.layers).flat().flatMap(d => d.refs || []));
  const short = a => (a || []).length > 2 ? a[0] + ' et al.' : (a || []).join(' & ');
  return { ...B, refs: Object.fromEntries([...keys].map(k => [k, { a: short(refs[k].authors), y: refs[k].year, t: refs[k].title, j: refs[k].journal, d: refs[k].doi }])) };
};
const sites = SITE_SCENES.map(s => {
  const sil = {};
  for (const c of s.cast) if (c.sil && SIL[c.sil]) {
    const k = SIL[c.sil]; sil[c.sil] = { ...k, f: 'sil/' + path.basename(k.f) };
    fs.copyFileSync(path.join(ROOT, k.f), path.join(PUB, 'sil', path.basename(k.f)));
  }
  const papers = Object.entries(refs).filter(([, r]) => (r.targets || []).includes('z:' + s.id)).map(([key, r]) => ({ key, doi: r.doi, title: r.title, journal: r.journal, year: r.year, authors: r.authors }));
  // the painted ground (tools/paint.py ground / choose-ground), if this site has one
  const gj = path.join(PUB, 'ground', s.id + '.json');
  const ground = fs.existsSync(gj) ? JSON.parse(fs.readFileSync(gj, 'utf8')) : null;
  // the Earth opening, painted (tools/paint.py earth-brush), if this site has it
  const ej = path.join(PUB, 'earth', s.id + '-1-painted.json');
  const earth = fs.existsSync(ej) ? JSON.parse(fs.readFileSync(ej, 'utf8')) : null;
  // painted animals (tools/paint.py animal / choose-animal), two approaches each, and the scene painting
  const pj = f => { const p = path.join(PUB, 'painted', f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; };
  const cast = s.cast.map(c => {
    if (!c.sil) return c;
    const outline = withCheck(`animal:${c.sil}:outline`, pj(c.sil + '-outline.json')), free = withCheck(`animal:${c.sil}:free`, pj(c.sil + '-free.json'));
    return outline || free ? { ...c, painted: { outline, free } } : c;
  });
  // the painting's detail tiles (tools/paint.py detail / detail-assemble): loaded only when the reader zooms in
  const hi0 = pj(s.id + '-hi/index.json'), sc = pj('scene-' + s.id + '.json'), hi = hi0 && sc && hi0.candidate === sc.candidate ? hi0 : null;   // zoom tiles only for the painting they were cut from
  if (hi0 && !hi) console.log('zoom tiles for ' + s.id + ' were cut from another painting (' + hi0.candidate + ', now ' + (sc && sc.candidate) + '): not used until remade');
  for (const [id, v] of [['scene:' + s.id, pj('scene-' + s.id + '.json')], ['ground:' + s.id, ground], ['earth:' + s.id, earth], ['plants:' + s.id, pj(s.id + '-plants.json')]]) if (v && !shown(id)) gated.push(id);
  return { ...s, brief: briefOf(s.id), cast, sil, papers, ground: withCheck('ground:' + s.id, ground), earth: withCheck('earth:' + s.id, earth), painting: withCheck('scene:' + s.id, pj('scene-' + s.id + '.json')), plantSprites: withCheck('plants:' + s.id, pj(s.id + '-plants.json')), paintingHi: hi ? { dir: 'painted/' + s.id + '-hi', n: hi.n } : null };
});
fs.writeFileSync(path.join(OUT, 'sites.json'), JSON.stringify(sites, null, 1));

// the great events, painted (tools/paint.py event / choose-event), each with its verified papers
const evDir = path.join(PUB, 'painted', 'events'), prefix = { extinction: 'e:', crisis: 'n:', drift: 'n:', story: 's:' };
const events = fs.existsSync(evDir) ? fs.readdirSync(evDir).filter(f => f.endsWith('.json')).map(f => {
  const e = JSON.parse(fs.readFileSync(path.join(evDir, f), 'utf8')), tgt = prefix[e.kind] + e.id;
  const papers = Object.entries(refs).filter(([, r]) => (r.targets || []).includes(tgt)).map(([key, r]) => ({ key, doi: r.doi, title: r.title, journal: r.journal, year: r.year, authors: r.authors }));
  if (!shown('event:' + e.id)) { gated.push('event:' + e.id); return null; }
  return { id: e.id, kind: e.kind, title: e.title, t: e.t, text: e.text, f: e.f, w: e.w, h: e.h, model: e.model, prompt: e.prompt, differs: e.differs, papers, check: check('event:' + e.id) };
}).filter(Boolean).sort((a, b) => b.t - a.t) : [];
fs.writeFileSync(path.join(OUT, 'events.json'), JSON.stringify(events, null, 1));
console.log('content: ' + events.length + ' painted events');
if (gated.length) console.log('art review: left out (not reviewed, failed or rejected): ' + gated.join(', '));
// the review page: every picture, its review and sign-off
fs.writeFileSync(path.join(OUT, 'art.json'), JSON.stringify(Object.entries(REG).map(([id, a]) => ({ id, kind: a.kind, title: a.title, file: a.file, t: a.t, version: a.version,
  status: a.review ? a.review.status : 'not reviewed', emotion: a.review ? a.review.emotion : null, emotionAvg: a.review ? a.review.emotion_avg : null, raise: a.review ? a.review.raise_it : '',
  bad: a.review ? a.review.items.filter(i => i.verdict === 'contradicted').map(i => i.item.replace(/^MUST NOT: /, '') + ' — ' + i.why) : [], other: a.review ? a.review.other_errors : [],
  approved: !!a.approved, rejected: a.rejected ? a.rejected.why || 'rejected' : null, held: a.held ? a.held.why : null })), null, 1));
console.log('content: ' + sites.length + ' site scene(s), ' + sites.reduce((n, s) => n + Object.keys(s.sil).length, 0) + ' silhouettes');
