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
  return { ...s, sil, papers, ground, earth };
});
fs.writeFileSync(path.join(OUT, 'sites.json'), JSON.stringify(sites, null, 1));
console.log('content: ' + sites.length + ' site scene(s), ' + sites.reduce((n, s) => n + Object.keys(s.sil).length, 0) + ' silhouettes');
