// The size of an animal in words, from its numbers, in metric or imperial units. The same function as sizeText in
// tools/source/data_sites.js (app/scripts/check.cjs holds the two to the same words).
import type { CastMember } from './types';

export type Units = 'metric' | 'imperial';

export function sizeText(c: CastMember, units: Units): string {
  const z = c.sz; if (!z) return c.size || '';
  const imp = units === 'imperial', top = Math.max(z.a, z.b || 0);
  const unit = imp ? (top * 3.28084 < 3 ? 'in' : 'ft') : (top < 1 ? 'cm' : 'm');
  const num = (m: number) => {
    if (unit === 'in') return String(Math.round(m * 39.3701));
    if (unit === 'ft') { const ft = m * 3.28084; return String(ft < 10 ? Math.round(ft * 2) / 2 : Math.round(ft)); }
    if (unit === 'cm') return String(Math.round(m * 20) * 5);
    return String(m < 10 ? Math.round(m * 10) / 10 : Math.round(m * 2) / 2);
  };
  const u = ' ' + unit, a = num(z.a) + u;
  const t = z.k === 'range' ? num(z.a) + '–' + num(z.b ?? z.a) + u : z.k === 'upto' ? 'up to ' + a : z.k === 'ormore' ? a + ' or more'
    : z.k === 'past' ? 'may have grown past ' + a : 'about ' + a + (z.b ? ', perhaps up to ' + num(z.b) + u : '');
  return (z.m ? z.m + ' ' : '') + t;
}

/** the reader's choice, remembered on this device; first time, feet for the US, metres elsewhere */
export function initialUnits(): Units {
  try { const v = localStorage.getItem('units'); if (v === 'metric' || v === 'imperial') return v; } catch { /* private window */ }
  return /^en-US|^en-LR|^my\b/i.test(navigator.language || '') ? 'imperial' : 'metric';
}
export function saveUnits(u: Units) { try { localStorage.setItem('units', u); } catch { /* not kept: fine */ } }

export const BASIS_WORDS: Record<string, string> = {
  paper: 'From a paper', museum: 'A museum’s estimate', popular: 'Published estimates vary', relatives: 'A guess from its relatives',
};
