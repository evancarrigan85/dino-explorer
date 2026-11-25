// The ground: one mesh shaped by the land's height function, coloured by what the brief says it is made of —
// wet and dry sand, small pebbles, the reddish sandstone of the far bank — with moving light patterns (caustics)
// on the shallow river bed.
import { useMemo } from 'react';
import * as THREE from 'three';
import { BOUNDS, type Land } from './land';
import { clock } from './shared';
import { fbm, smoothstep } from './rng';

function detailTexture(seed: number): THREE.CanvasTexture {
  // grains and small pebbles, tiled across the sand
  const n = 512, cv = document.createElement('canvas'); cv.width = cv.height = n;
  const g = cv.getContext('2d')!; g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, n, n);
  let s = seed >>> 0; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 9000; i++) { const v = 150 + r() * 105; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * n, r() * n, 1 + r() * 1.5, 1 + r() * 1.5); }
  for (let i = 0; i < 700; i++) {            // pebbles: small rounded stones, lit from above
    const x = r() * n, y = r() * n, rad = 1.5 + r() * 4.5, v = 95 + r() * 120;
    const gr = g.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 0, x, y, rad);
    gr.addColorStop(0, `rgb(${v + 40},${v + 38},${v + 34})`); gr.addColorStop(1, `rgb(${v - 30},${v - 32},${v - 36})`);
    g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, rad, rad * (0.6 + r() * 0.4), r() * 3, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(70, 45);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function Terrain({ land, seed, phone }: { land: Land; seed: number; phone: boolean }) {
  const { geometry, material } = useMemo(() => {
    const W = BOUNDS.x1 - BOUNDS.x0, D = BOUNDS.z1 - BOUNDS.z0;
    const sx = phone ? 220 : 360, sz = phone ? 140 : 230;
    const geo = new THREE.PlaneGeometry(W, D, sx, sz); geo.rotateX(-Math.PI / 2);
    geo.translate((BOUNDS.x0 + BOUNDS.x1) / 2, 0, (BOUNDS.z0 + BOUNDS.z1) / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute, col = new Float32Array(pos.count * 3);
    const C = {
      bed: new THREE.Color('#7d6f52'), bedDeep: new THREE.Color('#5d5641'), wet: new THREE.Color('#a68d63'),
      dry: new THREE.Color('#dcc89f'), pale: new THREE.Color('#e8d9b5'), red: new THREE.Color('#b0603c'),
      redPale: new THREE.Color('#c98a5e'), top: new THREE.Color('#cdb187'), green: new THREE.Color('#8d8a58'),
    };
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), h = land.height(x, z); pos.setY(i, h);
      const far = z < land.riverZ(x);
      if (h < -0.05) c.copy(C.bed).lerp(C.bedDeep, smoothstep(0, 1.7, -h));
      else if (h < 0.25) c.copy(C.wet).lerp(C.dry, smoothstep(-0.05, 0.25, h));
      else if (far && h > 0.35 && h < 2.0) {
        // the sandstone face: bands of red and paler rock, as layers laid down by the river
        const band = 0.5 + 0.5 * Math.sin(h * 9.0 + fbm(x * 0.05, z * 0.05, 2, seed) * 2.0);
        c.copy(C.red).lerp(C.redPale, band);
      } else if (far) c.copy(C.top).lerp(C.green, 0.35 * smoothstep(0.1, 0.6, fbm(x * 0.03, z * 0.03, 3, seed + 3) * 0.5 + 0.5));
      else c.copy(C.dry).lerp(C.pale, 0.5 + 0.5 * fbm(x * 0.04, z * 0.04, 3, seed + 7));
      c.multiplyScalar(0.94 + 0.12 * fbm(x * 0.15, z * 0.15, 2, seed + 11));
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: detailTexture(seed), roughness: 0.95, metalness: 0 });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = clock;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vWorld; uniform float uTime;
vec2 cHash(vec2 p) { p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
// a moving network of bright lines: where the waves above focus the sun on the bed
float cLayer(vec2 p, float t) {
  vec2 g = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 o = vec2(float(x), float(y)), h = cHash(g + o);
    vec2 r = o + 0.5 + 0.42 * sin(t + 6.2831 * h) - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return 1.0 - smoothstep(0.0, 0.16, sqrt(d2) - sqrt(d1));
}`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if (vWorld.y < 0.02) {
  vec2 q = vWorld.xz * 0.42 - vec2(uTime * 0.35, 0.0);
  float ca = cLayer(q, uTime * 0.9) * 0.6 + cLayer(q * 1.37 + 3.1, uTime * 1.1) * 0.4;
  float depth = clamp(-vWorld.y, 0.0, 2.0);
  totalEmissiveRadiance += vec3(1.0, 0.95, 0.8) * pow(ca, 2.0) * 0.22 * smoothstep(0.0, 0.25, depth) * (1.0 - depth / 2.2);
}`);
    };
    return { geometry: geo, material: mat };
  }, [land, seed, phone]);
  return <mesh geometry={geometry} material={material} receiveShadow />;
}
