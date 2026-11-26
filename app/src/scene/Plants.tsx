// The plants the brief names, and only those: "a few tall conifers related to monkey-puzzle trees (straight bare
// trunks, branches in tiers near the top) spaced along the far bank; low leafy shrubs and small plants at the water's
// edge; a few ferns." No grass, palms, cycads, broadleaf forest or flowers. Each kind is one instanced mesh, placed by a
// seeded generator, and moves in the wind (tall trees slowly, ferns quickly).
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { type Land } from './land';
import { rng, fbm } from './rng';
import { windy, clock, LIGHT, WIND } from './shared';

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
    const v = Math.floor(r() * 3); g.fillStyle = ['#6b8146', '#7b904c', '#5d7240'][v];
    g.beginPath(); g.ellipse(x, y, 7 + r() * 5, 3.5 + r() * 2, r() * 3.14, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function shrubGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) { const g = new THREE.PlaneGeometry(1.6, 1.3); g.translate(0, 0.62, 0); g.rotateY(i * 0.63); g.rotateZ((i - 2) * 0.12); parts.push(g); }
  for (let i = 0; i < 3; i++) { const g = new THREE.PlaneGeometry(1.7, 1.7); g.rotateX(-Math.PI / 2 + (i - 1) * 0.35); g.rotateY(i * 1.1); g.translate(0, 0.95 + i * 0.12, 0); parts.push(g); }   // the crown, seen from above
  const m = mergeGeometries(parts)!; m.computeVertexNormals(); return m;
}

interface Place { x: number; z: number; y: number; s: number; ry: number }

export function Plants({ land, seed, phone, sprites }: { land: Land; seed: number; phone: boolean; sprites?: { f: string; cells: { w: number; h: number }[] } | null }) {
  const kinds = useMemo(() => {
    const r = rng(seed + 101);
    const k = phone ? 0.45 : 1;
    // Plants grow in stands, as they do in nature (Evan, 25 Nov: "it certainly wasn't just barren, weird diorama with
    // weirdly placed tree fronds"): trees in groves along the far bank, a few alone further back; low thickets packed
    // along the wet edge, biggest in the middle of a stand and thinning to its rim; ferns in the shade under the groves;
    // only a few plants out on the open sand. Positions come from the scene's seed, so the scene is the same every time.
    const trees: Place[] = [], shrubs: Place[] = [], ferns: Place[] = [];
    const gauss = () => { let u = 0; for (let i = 0; i < 4; i++) u += r(); return (u - 2) / 0.577; };   // about normal, from the seeded stream
    const stand = (cx: number, cz: number, R: number, n: number, out: (p: Place, d: number) => void, minY = 0.12) => {
      for (let i = 0; i < n; i++) {
        const x = cx + gauss() * R * 0.5, z = cz + gauss() * R * 0.5, y = land.height(x, z);
        if (y < minY) continue;
        const d = Math.min(1, Math.hypot(x - cx, z - cz) / R);
        out({ x, z, y, s: (0.75 + r() * 0.6) * (1.25 - 0.55 * d), ry: r() * 6.28 }, d);
      }
    };
    // groves along the far bank, and the ferns that grow in their shade
    for (let x = -300; x < 300; x += 34 + r() * 60) {
      const cz = land.farBankZ(x) - 8 - r() * 26, nT = 3 + Math.floor(r() * 6);
      stand(x, cz, 14, nT, p => { if (p.y >= 1.2) trees.push({ ...p, s: 0.75 + r() * 0.5 }); }, 1.2);
      stand(x, cz + 4, 18, Math.floor((40 + r() * 60) * k), p => ferns.push(p), 1.2);
    }
    for (let i = 0; i < 7; i++) {                                  // a few trees alone, further back
      const x = -280 + r() * 560, z = land.farBankZ(x) - 60 - r() * 110, y = land.height(x, z);
      if (y >= 1.2) trees.push({ x, z, y, s: 0.75 + r() * 0.5, ry: r() * 6.28 });
    }
    // thickets along the wet edge of both banks: stand centres found where the ground is just above the water
    let made = 0;
    for (let i = 0; i < 6000 && made < 70 * k + 20; i++) {
      const x = -300 + r() * 600, z = -250 + r() * 340, y = land.height(x, z);
      if (Math.abs(y - 0.35) > 0.22 || r() > 0.5 + 0.5 * fbm(x * 0.03, z * 0.03, 2, seed + 21)) continue;
      made++;
      stand(x, z, 6 + r() * 10, Math.floor((30 + r() * 50) * k), (p, d) => (d < 0.45 && r() < 0.2 ? ferns : shrubs).push(p));
    }
    // a few small plants out on the open sand
    for (let i = 0; i < 1400 * k; i++) {
      const x = -300 + r() * 600, z = -250 + r() * 340, y = land.height(x, z);
      if (y < 0.5 || y > 1.1 || r() > 0.05) continue;
      shrubs.push({ x, z, y, s: 0.5 + r() * 0.4, ry: r() * 6.28 });
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
    {sprites ? <SpriteField sprites={sprites} shrubs={kinds.shrubs} ferns={kinds.ferns} seed={seed} /> : <>
      <instancedMesh key={'f' + kinds.ferns.length} ref={m => fill(m, kinds.ferns)} args={[assets.fern, assets.fernMat, kinds.ferns.length]} receiveShadow />
      <instancedMesh key={'s' + kinds.shrubs.length} ref={m => fill(m, kinds.shrubs)} args={[assets.shrub, assets.shrubMat, kinds.shrubs.length]} receiveShadow />
    </>}
  </group>;
}

/** The brief's low plants, painted in Knight's manner (tools/paint.py plants), as sprites that face the camera, stand on
 *  the ground where the plants are placed, sway in the scene's wind and fade into its haze. Cells: shrub, fern, herb, shrub2. */
function SpriteField({ sprites, shrubs, ferns, seed }: { sprites: { f: string; cells: { w: number; h: number }[] }; shrubs: Place[]; ferns: Place[]; seed: number }) {
  const mesh = useMemo(() => {
    const r = rng(seed + 77), all = [...ferns.map(p => ({ p, k: 1 })), ...shrubs.map(p => ({ p, k: [0, 0, 2, 3][Math.floor(r() * 4)] }))];
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const pos = new Float32Array(all.length * 3), sc = new Float32Array(all.length), kind = new Float32Array(all.length), ph = new Float32Array(all.length);
    all.forEach(({ p, k }, i) => { pos.set([p.x, p.y - 0.08, p.z], i * 3); sc[i] = (k === 1 ? 1.5 : k === 2 ? 0.9 : 1.9) * p.s; kind[i] = k; ph[i] = r() * 6.28; });
    g.setAttribute('iPos', new THREE.InstancedBufferAttribute(pos, 3)); g.setAttribute('iScale', new THREE.InstancedBufferAttribute(sc, 1));
    g.setAttribute('iKind', new THREE.InstancedBufferAttribute(kind, 1)); g.setAttribute('iPhase', new THREE.InstancedBufferAttribute(ph, 1));
    g.instanceCount = all.length; g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -60), 600);
    const tex = new THREE.TextureLoader().load(sprites.f); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const c = sprites.cells, asp = new THREE.Vector4(...c.map(x => x.h / x.w) as [number, number, number, number]);
    const mat = new THREE.ShaderMaterial({
      transparent: false, side: THREE.DoubleSide,
      uniforms: { uTex: { value: tex }, uTime: clock, uWind: { value: WIND.dir }, uAsp: { value: asp }, uWid: { value: new THREE.Vector4(...c.map(x => x.w) as [number, number, number, number]) },
        uFog: { value: LIGHT.haze }, uNear: { value: LIGHT.fogNear }, uFar: { value: LIGHT.fogFar } },
      vertexShader: /* glsl */ `
attribute vec3 iPos; attribute float iScale; attribute float iKind; attribute float iPhase;
uniform float uTime; uniform vec2 uWind; uniform vec4 uAsp; uniform vec4 uWid;
varying vec2 vUv; varying float vKind; varying float vDist; varying float vH;
float pick(vec4 v, float k) { return k < 0.5 ? v.x : k < 1.5 ? v.y : k < 2.5 ? v.z : v.w; }
void main() {
  float asp = pick(uAsp, iKind), h = iScale * asp, w = iScale;
  float gust = 0.5 + 0.5 * sin(dot(iPos.xz, uWind) * 0.028 - uTime * 0.75); gust = gust * gust * gust;
  float sway = (sin(uTime * (iKind == 1.0 ? 2.2 : 1.5) + iPhase) * (0.3 + 0.7 * gust) + gust) * 0.07 * position.y * position.y;
  vec4 mv = viewMatrix * vec4(iPos, 1.0);
  mv.xy += vec2((position.x + sway) * w, position.y * h);
  gl_Position = projectionMatrix * mv;
  vUv = vec2(position.x + 0.5, position.y); vKind = iKind; vDist = -mv.z; vH = asp * pick(uWid, iKind);
}`,
      fragmentShader: /* glsl */ `
uniform sampler2D uTex; uniform vec4 uWid; uniform vec3 uFog; uniform float uNear; uniform float uFar;
varying vec2 vUv; varying float vKind; varying float vDist; varying float vH;
void main() {
  float wid = vKind < 0.5 ? uWid.x : vKind < 1.5 ? uWid.y : vKind < 2.5 ? uWid.z : uWid.w;
  vec2 uv = vec2((vKind + 0.5 + (vUv.x - 0.5) * wid) / 4.0, vUv.y * vH);   // the sprite stands on its cell's bottom edge
  vec4 t = texture2D(uTex, uv); if (t.a < 0.45) discard;
  vec3 col = mix(t.rgb, uFog, smoothstep(uNear, uFar, vDist) * 0.9);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`,
    });
    return new THREE.Mesh(g, mat);
  }, [sprites, shrubs, ferns, seed]);
  return <primitive object={mesh} />;
}
