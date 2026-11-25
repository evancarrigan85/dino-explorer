// The shape of the land for a site scene, built from the scene's brief (`paint` in data_sites.js). For the Kem Kem:
// "a low, level far bank of pale sand and reddish sandstone; a wide, flat near shore of sand and small pebbles;
// a broad, shallow, slow river, braided around a pale sandbank island". The papers give the setting, not a survey,
// so the exact curves are illustrative — the page says so. Units are metres; the water surface is at height 0.
import { fbm, smoothstep } from './rng';

export const BOUNDS = { x0: -320, x1: 320, z0: -280, z1: 110 };   // the modelled ground; fog hides its edges
export const WATER_LEVEL = 0;

export interface Land {
  height(x: number, z: number): number;
  riverZ(x: number): number;          // centre line of the main channel
  farBankZ(x: number): number;        // where the far bank's top edge is
  nearEdgeZ(x: number): number;       // where the near shore meets the water
  island: { x: number; z: number; rx: number; rz: number };
  flowAngle: number;                  // radians, in the x–z plane: the way the water runs
}

export function makeLand(seed: number): Land {
  const riverZ = (x: number) => -26 + 9 * Math.sin(x / 52 + 0.4) + 4 * Math.sin(x / 19 + 1.3);
  const half = (x: number) => 40 + 6 * Math.sin(x / 37 + 2.1);           // half the river's width
  const farBankZ = (x: number) => riverZ(x) - half(x) - 7;
  const nearEdgeZ = (x: number) => riverZ(x) + half(x);
  const island = { x: 38, z: riverZ(38) + 7, rx: 52, rz: 9.5 };
  const bar = { x: -95, z: riverZ(-95) - 10, rx: 30, rz: 5 };            // a second, smaller bar: the river braids

  const ell = (x: number, z: number, e: { x: number; z: number; rx: number; rz: number }) => {
    const dx = (x - e.x) / e.rx, dz = (z - e.z) / e.rz; return Math.sqrt(dx * dx + dz * dz);
  };

  function height(x: number, z: number): number {
    const zc = riverZ(x), hw = half(x), across = z - zc;                 // negative: towards the far bank
    const detail = 0.12 * fbm(x * 0.09, z * 0.09, 3, seed) + 0.05 * fbm(x * 0.6, z * 0.6, 2, seed + 5);
    // the river bed: shallow, deepest a little off the centre line, with ripples of sand
    const t = Math.abs(across) / hw;
    let h = -1.7 * (1 - t * t) - 0.25 * (1 - t) + 0.18 * Math.sin(x * 0.21 + z * 0.05) * (1 - t);
    if (across > 0) {
      // the near shore: rises gently out of the water, wide and flat
      const out = across - hw;
      h = out < 0 ? h : 0.05 + Math.min(0.9, out * 0.045) + 0.25 * smoothstep(20, 70, out);
      if (out >= -6 && out < 0) h = Math.max(h, -0.35 + (out + 6) * 0.07);
    } else {
      // the far bank: a short slope of reddish sandstone, then a low, level top
      const out = -across - hw;                                          // metres beyond the water's edge
      if (out > 0) {
        const climb = smoothstep(2, 9, out);
        h = 0.15 + 2.0 * climb + 0.35 * fbm(x * 0.02, z * 0.02, 3, seed + 9) * climb;
      }
    }
    // the sandbank island and the smaller bar, just above the water
    const di = ell(x, z, island), db = ell(x, z, bar);
    if (di < 1.25) h = Math.max(h, 0.42 * (1 - smoothstep(0.55, 1.15, di)) - 0.25 * smoothstep(0.9, 1.25, di));
    if (db < 1.25) h = Math.max(h, 0.28 * (1 - smoothstep(0.5, 1.1, db)) - 0.25 * smoothstep(0.85, 1.25, db));
    return h + detail;
  }

  return { height, riverZ, farBankZ, nearEdgeZ, island, flowAngle: 0 };
}
