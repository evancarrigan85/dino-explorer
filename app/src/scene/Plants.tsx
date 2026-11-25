// The plants the brief names, and only those: "a few tall conifers related to monkey-puzzle trees (straight bare
// trunks, branches in tiers near the top) spaced along the far bank; low leafy shrubs and small plants at the water's
// edge; a few ferns." No grass, palms, cycads, broadleaf forest or flowers. Each kind is one instanced mesh, placed by a
// seeded generator, and moves in the wind (tall trees slowly, ferns quickly).
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { type Land } from './land';
import { rng, fbm } from './rng';
import { windy } from './shared';

const tint = (geo: THREE.BufferGeometry, c: THREE.Color) => {
  const n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo;
};

/** A monkey-puzzle-like conifer, about 1 unit = 1 m: a straight bare trunk, and whorls of upswept branches near the top,
 *  each branch clothed in a rope of dark scale-leaves. */
function araucaria(seed: number, height: number): THREE.BufferGeometry {
  const r = rng(seed), parts: THREE.BufferGeometry[] = [];
  const bark = new THREE.Color('#6b5a4a'), leaf = new THREE.Color('#33472b'), leafHi = new THREE.Color('#465c35');
  const trunk = new THREE.CylinderGeometry(0.22, 0.45, height, 7, 4); trunk.translate(0, height / 2, 0); parts.push(tint(trunk, bark));
  const crownBase = height * (0.62 + r() * 0.08), whorls = 6 + Math.floor(r() * 3);
  for (let w = 0; w < whorls; w++) {
    const y = crownBase + (height - crownBase) * (w / whorls), len = (1 - w / whorls) * (height * 0.2) + 1.2;
    const nb = 5 + Math.floor(r() * 2), rot0 = r() * Math.PI * 2;
    for (let b = 0; b < nb; b++) {
      const a = rot0 + (b / nb) * Math.PI * 2, up = 0.35 + 0.25 * (w / whorls);
      // a branch: outward, then turning up at the tip (the candelabra shape)
      const pts = [new THREE.Vector3(0, y, 0), new THREE.Vector3(Math.cos(a) * len * 0.55, y + len * 0.12, Math.sin(a) * len * 0.55),
        new THREE.Vector3(Math.cos(a) * len, y + len * up, Math.sin(a) * len)];
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 0.32 + 0.1 * r(), 5, false);
      parts.push(tint(tube, r() < 0.5 ? leaf : leafHi));
    }
  }
  const top = new THREE.SphereGeometry(1.0, 7, 5); top.scale(1.1, 0.8, 1.1); top.translate(0, height + 0.2, 0); parts.push(tint(top, leaf));
  const g = mergeGeometries(parts.map(p => p.toNonIndexed()))!; g.computeVertexNormals(); return g;
}

/** a frond: a strip that arches outward, its leaflets drawn on a texture with transparent gaps */
function frondTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const g = cv.getContext('2d')!;
  g.strokeStyle = '#2e4a25'; g.lineWidth = 3; g.beginPath(); g.moveTo(64, 256); g.lineTo(64, 4); g.stroke();
  for (let i = 0; i < 26; i++) {
    const y = 250 - i * 9.4, w = 58 * Math.sin((i / 26) * Math.PI * 0.9 + 0.15);
    for (const s of [-1, 1]) {
      g.fillStyle = i % 3 ? '#4f7037' : '#5d7d40';
      g.beginPath(); g.ellipse(64 + s * w * 0.5, y - 2, w * 0.5, 4, s * -0.35, 0, 7); g.fill();
    }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function fernClump(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [], n = 9;
  for (let i = 0; i < n; i++) {
    const g = new THREE.PlaneGeometry(0.42, 1.3, 1, 6), p = g.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < p.count; k++) { const v = (p.getY(k) + 0.65) / 1.3; p.setY(k, Math.sin(v * 1.3) * 0.95); p.setZ(k, v * v * 0.85); }
    g.rotateY((i / n) * Math.PI * 2 + i * 0.3); parts.push(g);
  }
  const m = mergeGeometries(parts)!; m.computeVertexNormals(); return m;
}

/** a low leafy shrub: a cluster of leaf-covered cards */
function leafTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d')!;
  let s = 7; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 90; i++) {
    const x = 16 + r() * 96, y = 16 + r() * 96, d = Math.hypot(x - 64, y - 64); if (d > 52) continue;
    const v = Math.floor(r() * 3); g.fillStyle = ['#56693a', '#64783f', '#4a5e33'][v];
    g.beginPath(); g.ellipse(x, y, 7 + r() * 5, 3.5 + r() * 2, r() * 3.14, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function shrubGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) { const g = new THREE.PlaneGeometry(1.6, 1.3); g.translate(0, 0.62, 0); g.rotateY(i * 0.63); g.rotateZ((i - 2) * 0.12); parts.push(g); }
  const m = mergeGeometries(parts)!; m.computeVertexNormals(); return m;
}

interface Place { x: number; z: number; y: number; s: number; ry: number }

export function Plants({ land, seed, phone }: { land: Land; seed: number; phone: boolean }) {
  const kinds = useMemo(() => {
    const r = rng(seed + 101);
    const k = phone ? 0.45 : 1;
    // trees: spaced along the far bank, a few further back
    const trees: Place[] = [];
    for (let x = -300; x < 300; x += 11 + r() * 22) {
      const z = land.farBankZ(x) - 5 - r() * (r() < 0.3 ? 140 : 22), y = land.height(x, z);
      if (y < 1.2) continue; trees.push({ x, z, y, s: 0.75 + r() * 0.5, ry: r() * 6.28 });
    }
    // shrubs and ferns: mostly where the ground meets the water, thinner on the open sand and the bank top
    const shrubs: Place[] = [], ferns: Place[] = [];
    const tries = Math.floor(26000 * k);
    for (let i = 0; i < tries; i++) {
      const x = -300 + r() * 600, z = -250 + r() * 340, y = land.height(x, z);
      if (y < 0.12) continue;
      const edge = Math.exp(-Math.pow((y - 0.35) / 0.35, 2)), bank = z < land.riverZ(x) ? 0.25 : 0.05;
      const patch = 0.5 + 0.5 * fbm(x * 0.05, z * 0.05, 3, seed + 21);
      const p = (edge * 1.4 + bank) * patch * 0.12;
      if (r() > p) continue;
      const place = { x, z, y, s: 0.6 + r() * 0.9, ry: r() * 6.28 };
      if (r() < 0.22) ferns.push(place); else shrubs.push(place);
    }
    return { trees, shrubs, ferns };
  }, [land, seed, phone]);

  const assets = useMemo(() => {
    const tree = araucaria(seed + 5, 24);
    const treeMat = windy(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }), 24, 0.55, 0.012);
    const fern = fernClump();
    const fernMat = windy(new THREE.MeshStandardMaterial({ map: frondTexture(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 }), 1.0, 2.1, 0.11);
    const shrub = shrubGeo();
    const shrubMat = windy(new THREE.MeshStandardMaterial({ map: leafTexture(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 }), 1.3, 1.5, 0.06);
    return { tree, treeMat, fern, fernMat, shrub, shrubMat };
  }, [seed]);

  const fill = (mesh: THREE.InstancedMesh | null, list: Place[]) => {
    if (!mesh || (mesh.userData as { done?: boolean }).done) return;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    list.forEach((p, i) => { e.set(0, p.ry, 0); q.setFromEuler(e); m.compose(new THREE.Vector3(p.x, p.y - 0.05, p.z), q, new THREE.Vector3(p.s, p.s, p.s)); mesh.setMatrixAt(i, m); });
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); (mesh.userData as { done?: boolean }).done = true;
  };

  return <group>
    <instancedMesh key={'t' + kinds.trees.length} ref={m => fill(m, kinds.trees)} args={[assets.tree, assets.treeMat, kinds.trees.length]} castShadow={!phone} receiveShadow />
    <instancedMesh key={'f' + kinds.ferns.length} ref={m => fill(m, kinds.ferns)} args={[assets.fern, assets.fernMat, kinds.ferns.length]} receiveShadow />
    <instancedMesh key={'s' + kinds.shrubs.length} ref={m => fill(m, kinds.shrubs)} args={[assets.shrub, assets.shrubMat, kinds.shrubs.length]} receiveShadow />
  </group>;
}
