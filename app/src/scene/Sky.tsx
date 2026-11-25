// The sky: pale and hazy, warmest near the horizon, with the afternoon sun ahead and to the left.
import { useMemo } from 'react';
import * as THREE from 'three';
import { SKY_GLSL, skyUniforms, clock } from './shared';

export function Sky() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { ...skyUniforms(), uTime: clock },
    vertexShader: /* glsl */ `varying vec3 vDir; void main() { vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: /* glsl */ `varying vec3 vDir; uniform float uTime; ${SKY_GLSL}
float h1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n1(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h1(i), h1(i + vec2(1, 0)), u.x), mix(h1(i + vec2(0, 1)), h1(i + vec2(1, 1)), u.x), u.y); }
void main() {
  vec3 d = normalize(vDir); vec3 c = skyColor(d);
  // thin high cloud, stretched by the wind and drifting with it: hazy, never a storm (the brief: a pale sky)
  if (d.y > 0.0) {
    vec2 p = d.xz / (d.y + 0.08) * 1.4 + vec2(uTime * 0.012, uTime * 0.004);
    float n = n1(p * vec2(0.6, 2.2)) * 0.55 + n1(p * vec2(1.3, 4.1) + 7.0) * 0.3 + n1(p * 5.0 + 3.0) * 0.15;
    float cl = smoothstep(0.55, 0.85, n) * smoothstep(0.02, 0.25, d.y) * 0.35;
    c = mix(c, vec3(1.0, 0.98, 0.94), cl);
  }
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`,
  }), []);
  return <mesh material={material} renderOrder={-10} frustumCulled={false}><sphereGeometry args={[1200, 32, 16]} /></mesh>;
}
