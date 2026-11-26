// Reconstruction briefs (content/briefs/<site>.json): what each scene rests on, decision by decision.
//   node tools/briefs.mjs              every brief: its decisions by status, and when they were last checked
//   node tools/briefs.mjs --ref KEY    every scene and decision that rests on a paper — the ones to review when that paper
//                                      changes (a new date for a deposit, a fossil read differently)
// The rules a brief must keep are checked by the build (tools/source/assemble.mjs) with checkBrief() from this file.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), DIR = path.join(ROOT, 'content', 'briefs');
export const LAYERS = ['place', 'landscape', 'life', 'moment', 'discovery'];
export const STATUS = ['documented', 'inferred', 'imagined'];
export const TOGETHER = ['same-bed', 'same-site', 'same-formation', 'nearby', 'same-interval'];
export function loadBriefs() { return fs.existsSync(DIR) ? fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort().map(f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))) : []; }

/** the rules: returns a list of problems (empty when the brief is sound) */
export function checkBrief(B, { refs, site }) {
  const P = [], who = 'brief ' + B.id, ids = new Set();
  if (!site) P.push(who + ': no site scene called ' + B.site);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(B.current_as_of || '')) P.push(who + ': current_as_of must be a date (when its decisions were last checked)');
  if (/'/.test(JSON.stringify(B))) P.push(who + ': use ’ not a straight quote');
  const spotsUsed = new Set();
  for (const L of LAYERS) {
    const D = (B.layers || {})[L];
    if (!Array.isArray(D) || !D.length) { P.push(who + ': no decisions in the layer ' + L); continue; }
    for (const d of D) {
      const w = who + ' › ' + L + ' › ' + d.id;
      if (!d.id || ids.has(d.id)) P.push(w + ': needs an id of its own'); ids.add(d.id);
      if (!d.says) P.push(w + ': no words for the reader (says)');
      if (!STATUS.includes(d.status)) P.push(w + ': status must be documented, inferred or imagined');
      if (L !== 'discovery' && !d.why) P.push(w + ': no reason (why)');
      if (d.status !== 'imagined' && !(d.refs && d.refs.length)) P.push(w + ': a ' + d.status + ' decision needs its papers (refs)');
      for (const k of d.refs || []) if (!refs[k]) P.push(w + ': paper ' + k + ' is not in refs.json (verify it with tools/verify_refs.py first)');
      if (L === 'life') {
        if (!TOGETHER.includes(d.together)) P.push(w + ': say whether the evidence puts them together (together: ' + TOGETHER.join(' | ') + ')');
        else if (d.status === 'documented' && ['nearby', 'same-interval'].includes(d.together)) P.push(w + ': documented at the site needs the same bed, site or formation; from ' + d.together + ' it is inferred');
      }
      if (d.cast && site && !site.cast.some(c => c.name === d.cast)) P.push(w + ': ' + d.cast + ' is not in the scene');
      for (const s of d.spots || []) { spotsUsed.add(s); if (site && !(site.spots || []).some(x => x.id === s)) P.push(w + ': no spot ' + s + ' in the painting'); }
    }
  }
  if (!(B.layers.moment || []).some(d => d.status === 'imagined' || d.status === 'documented')) P.push(who + ': the moment must say whether it is imagined');
  if (!(B.layers.discovery || []).some(d => d.status === 'documented')) P.push(who + ': the history of discovery needs at least one documented step');
  for (const s of (site && site.spots) || []) if (!spotsUsed.has(s.id)) P.push(who + ': the spot ' + s.id + ' in the painting rests on no decision');
  return P;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const briefs = loadBriefs(), ri = process.argv.indexOf('--ref');
  if (ri > 0) {
    const key = process.argv[ri + 1]; let n = 0;
    for (const B of briefs) for (const L of LAYERS) for (const d of B.layers[L] || []) if ((d.refs || []).includes(key)) {
      n++; console.log(`${B.id.padEnd(12)} ${L.padEnd(10)} ${d.id.padEnd(22)} ${d.status.padEnd(10)} ${d.says.slice(0, 90)}`);
    }
    console.log(n ? `\n${n} decision(s) rest on ${key}: review them if it changes. Then set current_as_of on each brief you rechecked.` : `No brief rests on ${key}.`);
  } else for (const B of briefs) {
    const all = LAYERS.flatMap(L => B.layers[L] || []), c = s => all.filter(d => d.status === s).length;
    console.log(`${B.id.padEnd(12)} ${String(all.length).padStart(3)} decisions: ${c('documented')} documented, ${c('inferred')} inferred, ${c('imagined')} imagined · ${new Set(all.flatMap(d => d.refs || [])).size} papers · current as of ${B.current_as_of}`);
  }
}
