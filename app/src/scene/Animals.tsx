// The animals of the site: the scientists' silhouettes (PhyloPic), standing in the scene like cut-outs in a museum
// diorama. A known length is drawn to scale (a pterosaur's width is its wingspan, so it is seen from below); an animal
// whose size is not known is paler and not to scale, and its label says so. Movement claims nothing: pterosaurs glide in
// slow circles, fish drift under the surface, everything on land stands still.
import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { type Land } from './land';
import { clock, LIGHT } from './shared';
import type { Site, CastMember } from '../types';

const INK = { land: new THREE.Color('#3a2410'), water: new THREE.Color('#17384a') };
const DEFAULT_W: Record<string, number> = { bank: 5.5, edge: 6, sand: 0.9, water: 1.8, air: 4 };

function cutoutMaterial(tex: THREE.Texture, ink: THREE.Color, opacity: number) {
  return new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide,
    uniforms: { uTex: { value: tex }, uInk: { value: ink }, uOpacity: { value: opacity }, uFogColor: { value: LIGHT.haze }, uFogNear: { value: LIGHT.fogNear }, uFogFar: { value: LIGHT.fogFar } },
    vertexShader: /* glsl */ `varying vec2 vUv; varying float vDist; void main() { vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform sampler2D uTex; uniform vec3 uInk; uniform float uOpacity; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;
varying vec2 vUv; varying float vDist;
void main() { float a = texture2D(uTex, vUv).a; if (a < 0.35) discard;
  vec3 c = uInk * (0.75 + 0.5 * vUv.y);
  c = mix(c, uFogColor, smoothstep(uFogNear, uFogFar, vDist) * 0.9);
  gl_FragColor = vec4(c, a * uOpacity);
  #include <colorspace_fragment>
}`,
  });
}

interface Placed { c: CastMember; n: number; pos: THREE.Vector3; w: number; h: number; known: boolean }

function place(site: Site, land: Land): Placed[] {
  const used: Record<string, number> = {};
  const spots: Record<string, (i: number) => THREE.Vector3> = {
    bank: i => { const x = [-58, -22, 10, 46][i % 4]; const z = land.farBankZ(x) - 4; return new THREE.Vector3(x, land.height(x, z), z); },
    edge: i => { const x = -14 + i * 30; const z = land.nearEdgeZ(x) - 4; return new THREE.Vector3(x, land.height(x, z), z); },
    sand: i => { const x = land.island.x - 14 + i * 5; const z = land.island.z; return new THREE.Vector3(x, land.height(x, z), z); },
    water: i => { const x = [-8, 22, -48, 62, 5][i % 5]; const z = land.riverZ(x) + [6, -10, -2, 12, -18][i % 5]; return new THREE.Vector3(x, [-0.06, -0.5, -0.8, -0.6, -0.9][i % 5], z); },
    air: i => new THREE.Vector3([-18, 40][i % 2], [26, 38][i % 2], [-30, -62][i % 2]),
  };
  return site.cast.map((c, n) => {
    const i = used[c.zone] = (used[c.zone] ?? -1) + 1;
    const sil = c.sil ? site.sil[c.sil] : undefined;
    const w = c.len ?? DEFAULT_W[c.zone] ?? 3, h = sil ? w * sil.h / sil.w : w * 0.5;
    return { c, n: n + 1, pos: spots[c.zone](i), w, h, known: c.len != null };
  });
}

function Animal({ p, site, selected, onSelect, labels, phone }: { p: Placed; site: Site; selected: boolean; onSelect: (n: string) => void; labels: boolean; phone: boolean }) {
  const sil = p.c.sil ? site.sil[p.c.sil] : undefined;
  const tex = useLoader(THREE.TextureLoader, sil ? sil.f : 'sil/spinosaurus.png');
  const flat = p.c.zone === 'water' || p.c.zone === 'air';
  const mat = useMemo(() => cutoutMaterial(tex, p.c.zone === 'water' && p.pos.y < -0.1 ? INK.water : INK.land, p.known ? (p.c.zone === 'water' && p.pos.y < -0.1 ? 0.75 : 1) : 0.62), [tex, p]);
  const reflMat = useMemo(() => cutoutMaterial(tex, INK.land, 0.22), [tex]);
  const g = useRef<THREE.Group>(null), body = useRef<THREE.Mesh>(null), tag = useRef<HTMLButtonElement>(null);
  const seed = p.n * 1.7;

  useFrame(({ camera }) => {
    const G = g.current; if (!G) return;
    if (tag.current) { const d = camera.position.distanceTo(G.position); tag.current.style.transform = 'scale(' + Math.max(0.62, Math.min(1, 60 / d)).toFixed(3) + ')'; }
    const t = clock.value;
    if (p.c.zone === 'air') {               // a slow glide on a wide circle, banked into the turn
      const r = 22 + p.n, w = 0.11 / (1 + p.n * 0.05), a = t * w + seed;
      G.position.set(p.pos.x + Math.cos(a) * r, p.pos.y + Math.sin(t * 0.2 + seed) * 1.5, p.pos.z + Math.sin(a) * r);
      G.rotation.set(0, -a, 0); if (body.current) body.current.rotation.z = 0.35;
    } else if (p.c.zone === 'water') {      // drifting under the surface, a lazy figure of eight
      const a = t * 0.05 + seed, R = 7 + p.n * 0.6;
      const x = p.pos.x + Math.sin(a) * R, z = p.pos.z + Math.sin(2 * a) * R * 0.35;
      const dx = Math.cos(a) * R, dz = Math.cos(2 * a) * R * 0.7;
      G.position.set(x, p.pos.y, z); G.rotation.set(0, Math.atan2(-dz, dx), 0);
    } else {                                // standing: the cut-out turns to face the viewer
      G.position.copy(p.pos); G.rotation.set(0, Math.atan2(camera.position.x - p.pos.x, camera.position.z - p.pos.z), 0);
    }
  });

  const label = labels && <Html position={[0, flat ? 1.2 : p.h + 0.8, 0]} center zIndexRange={[20, 0]}>
    <button ref={tag} className={'tag' + (selected ? ' on' : '') + (p.known ? '' : ' unk')} onClick={() => onSelect(p.c.name)}>
      {phone ? <b>{p.n}</b> : <><b>{p.c.name}</b><i>{p.c.size}</i></>}
    </button>
  </Html>;

  return <group ref={g}>
    {flat ? (
      <mesh ref={body} material={mat} rotation={[-Math.PI / 2, 0, 0]} renderOrder={p.pos.y < -0.1 ? 1 : 8}
        onClick={e => { e.stopPropagation(); onSelect(p.c.name); }}>
        <planeGeometry args={[p.w, p.h]} />
      </mesh>
    ) : <>
      <mesh material={mat} position={[0, p.h / 2, 0]} renderOrder={6} onClick={e => { e.stopPropagation(); onSelect(p.c.name); }}>
        <planeGeometry args={[p.w, p.h]} />
      </mesh>
      {/* a soft shadow where it stands, and its reflection where it stands in the water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} renderOrder={2}>
        <circleGeometry args={[p.w * 0.42, 24]} /><meshBasicMaterial color="#2b1d10" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      {p.c.zone === 'edge' && <mesh material={reflMat} position={[0, -p.h / 2 + p.pos.y * 2, 0]} scale={[1, -1, 1]} renderOrder={1}>
        <planeGeometry args={[p.w, p.h]} />
      </mesh>}
    </>}
    {label}
  </group>;
}

export function placeAnimals(site: Site, land: Land) { return place(site, land); }

export function Animals({ site, land, selected, onSelect, labels, phone }: { site: Site; land: Land; selected: string | null; onSelect: (n: string) => void; labels: boolean; phone: boolean }) {
  const placed = useMemo(() => place(site, land), [site, land]);
  return <group>{placed.map(p => <Animal key={p.c.name} p={p} site={site} selected={selected === p.c.name} onSelect={onSelect} labels={labels} phone={phone} />)}</group>;
}
