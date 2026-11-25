// Logs stranded on the sandbanks and at the water's edge. The site's plants are known mostly from petrified wood —
// "pieces of petrified wood, probably from conifers related to monkey-puzzle trees" — that is, from trunks the rivers
// carried and buried, so drift logs of those conifers belong here. Bleached and grey, lying mostly along the current.
import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { type Land } from './land';
import { rng } from './rng';

function logGeometry(): THREE.BufferGeometry {
  // a trunk 1 m long along x (scaled per log), a root flare at one end and two broken branch stubs
  const trunk = new THREE.CylinderGeometry(0.3, 0.42, 1, 8, 1); trunk.rotateZ(Math.PI / 2);
  const flare = new THREE.ConeGeometry(0.75, 0.22, 9, 1, true); flare.rotateZ(Math.PI / 2); flare.translate(0.52, 0, 0);
  const s1 = new THREE.CylinderGeometry(0.06, 0.09, 0.5, 5); s1.rotateZ(0.9); s1.translate(-0.12, 0.3, 0.05);
  const s2 = new THREE.CylinderGeometry(0.05, 0.08, 0.4, 5); s2.rotateX(1.1); s2.translate(0.18, 0.12, 0.3);
  const g = mergeGeometries([trunk, flare, s1, s2].map(x => x.toNonIndexed()))!; g.computeVertexNormals(); return g;
}

export function Logs({ land, seed, phone }: { land: Land; seed: number; phone: boolean }) {
  const { geometry, material, matrices } = useMemo(() => {
    const r = rng(seed + 404), out: THREE.Matrix4[] = [], q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < 4000 && out.length < (phone ? 12 : 22); i++) {
      const x = -260 + r() * 520, z = -200 + r() * 260, h = land.height(x, z);
      if (h < -0.2 || h > 0.55) continue;                       // stranded where the water reaches when it is high
      const len = 6 + r() * 11, girth = 0.7 + r() * 0.6;
      e.set(r() * 0.15, land.flowAngle + (r() - 0.5) * 1.3, 0); q.setFromEuler(e);
      out.push(new THREE.Matrix4().compose(new THREE.Vector3(x, h - 0.12 * girth, z), q, new THREE.Vector3(len, girth, girth)));
    }
    const mat = new THREE.MeshStandardMaterial({ color: '#b3a58f', roughness: 0.95 });
    return { geometry: logGeometry(), material: mat, matrices: out };
  }, [land, seed, phone]);
  return <instancedMesh args={[geometry, material, matrices.length]} castShadow={!phone} receiveShadow
    ref={m => { if (!m) return; matrices.forEach((mx, i) => m.setMatrixAt(i, mx)); m.instanceMatrix.needsUpdate = true; m.computeBoundingSphere(); }} />;
}
