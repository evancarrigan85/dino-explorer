// The river: "broad, shallow, slow, brownish-green, braided around a pale sandbank island" (the brief). Waves of
// several lengths run with the current; the sky and the hazy sun are reflected (glints where the small waves catch it);
// the water is clearer where it is shallow, so the bed and its light patterns show through; foam gathers along the banks
// and streams off the sandbank. Depth comes from the same land the ground is made of.
import { useMemo } from 'react';
import * as THREE from 'three';
import { BOUNDS, WATER_LEVEL, type Land } from './land';
import { clock, LIGHT, SKY_GLSL, skyUniforms } from './shared';

function heightTexture(land: Land): THREE.DataTexture {
  // the ground's height under the water, -2.5..+1.5 m in one byte, for the water's depth
  const w = 512, h = 320, data = new Uint8Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = BOUNDS.x0 + (i + 0.5) / w * (BOUNDS.x1 - BOUNDS.x0), z = BOUNDS.z0 + (j + 0.5) / h * (BOUNDS.z1 - BOUNDS.z0);
    data[j * w + i] = Math.max(0, Math.min(255, Math.round((land.height(x, z) + 2.5) / 4 * 255)));
  }
  const t = new THREE.DataTexture(data, w, h, THREE.RedFormat, THREE.UnsignedByteType);
  t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}

const VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

const FRAG = /* glsl */ `
precision highp float;
varying vec3 vWorld;
uniform float uTime; uniform sampler2D uHeight; uniform vec4 uBounds; uniform vec2 uFlow;
uniform vec3 uShallow; uniform vec3 uDeep; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;
uniform float uDetail;
${SKY_GLSL}

float hsh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hsh(i), hsh(i + vec2(1, 0)), u.x), mix(hsh(i + vec2(0, 1)), hsh(i + vec2(1, 1)), u.x), u.y);
}
// small ripples: the slope of two layers of noise drifting with the current at different speeds
vec2 ripple(vec2 p, float t) {
  vec2 g = vec2(0.0); float e = 0.06;
  for (int k = 0; k < 2; k++) {
    float s = k == 0 ? 0.9 : 2.3; vec2 q = p * s - uFlow * t * (0.55 + 0.4 * float(k)) + float(k) * 17.0;
    float n = vnoise(q);
    g += vec2(vnoise(q + vec2(e, 0.0)) - n, vnoise(q + vec2(0.0, e)) - n) / e * (k == 0 ? 0.05 : 0.025);
  }
  return g;
}
// longer waves running with the current, each its own length and speed (a deep-water dispersion, slowed for a river)
vec2 waves(vec2 p, float t) {
  vec2 g = vec2(0.0);
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    float ang = atan(uFlow.y, uFlow.x) + (fi - 2.5) * 0.42 + sin(fi * 12.9) * 0.25;
    vec2 d = vec2(cos(ang), sin(ang));
    float L = 11.0 / (1.0 + fi * 0.85), k = 6.2831 / L, A = 0.05 / (1.0 + fi * 0.7);
    float w = sqrt(9.8 * k) * 0.5;
    g += d * k * A * cos(k * dot(d, p) - w * t + fi * 1.7);
  }
  return g;
}

void main() {
  vec2 uv = (vWorld.xz - uBounds.xy) / (uBounds.zw - uBounds.xy);
  float ground = texture2D(uHeight, uv).r * 4.0 - 2.5;
  float depth = ${WATER_LEVEL.toFixed(2)} - ground;
  if (depth < -0.02) discard;

  vec3 V = normalize(cameraPosition - vWorld);
  float dist = length(cameraPosition - vWorld);
  // calmer in the shallows, and smoothed with distance (the eye cannot see small waves far off)
  float calm = smoothstep(0.0, 0.6, depth), far = 1.0 - smoothstep(60.0, 380.0, dist);
  vec2 g = waves(vWorld.xz, uTime) * (0.35 + 0.65 * calm) + ripple(vWorld.xz, uTime) * far * uDetail;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));

  float cosT = max(dot(N, V), 0.0);
  float F = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);
  vec3 R = reflect(-V, N); R.y = abs(R.y);
  vec3 refl = skyColor(R);
  // the sun on the water: a broad hazy sheen and sharp glints where small waves face it
  float sd = max(dot(R, uSunDir), 0.0);
  vec3 sun = uSunColor * (0.25 * pow(sd, 40.0) + 5.0 * pow(sd, 1100.0) * (0.4 + 0.6 * far));

  // the water itself: silty, brownish-green, darker and less clear as it deepens
  float dk = smoothstep(0.0, 1.6, depth);
  vec3 body = mix(uShallow, uDeep, dk);
  body *= 0.85 + 0.25 * max(dot(N, uSunDir), 0.0);
  float clear = mix(0.5, 0.94, dk);                                   // how much of the bed is hidden

  // foam: along the edges, and in streaks drifting with the current past the sandbank
  float edge = 1.0 - smoothstep(0.02, 0.28, depth);
  float fn = vnoise(vWorld.xz * 1.1 - uFlow * uTime * 0.9) * 0.6 + vnoise(vWorld.xz * 3.7 - uFlow * uTime * 1.6) * 0.4;
  float foam = edge * smoothstep(0.5, 0.8, fn) * (0.5 + 0.35 * sin(uTime * 1.3 + vWorld.x * 0.2));
  foam += (1.0 - smoothstep(0.05, 0.5, depth)) * smoothstep(0.68, 0.85, fn) * 0.22;

  vec3 col = mix(body, refl * 0.82, F * 0.72) + sun;
  col = mix(col, vec3(0.86, 0.83, 0.76), clamp(foam, 0.0, 0.6));
  float alpha = clamp(mix(clear, 1.0, F) + foam * 0.6, 0.0, 1.0) * smoothstep(-0.02, 0.06, depth);

  float fogF = smoothstep(uFogNear, uFogFar, dist);
  col = mix(col, uFogColor, fogF);
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}`;

export function Water({ land, phone }: { land: Land; phone: boolean }) {
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(BOUNDS.x1 - BOUNDS.x0, BOUNDS.z1 - BOUNDS.z0, 1, 1);
    geo.rotateX(-Math.PI / 2); geo.translate((BOUNDS.x0 + BOUNDS.x1) / 2, WATER_LEVEL, (BOUNDS.z0 + BOUNDS.z1) / 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      uniforms: {
        ...skyUniforms(), uTime: clock, uHeight: { value: heightTexture(land) },
        uBounds: { value: new THREE.Vector4(BOUNDS.x0, BOUNDS.z0, BOUNDS.x1, BOUNDS.z1) },
        uFlow: { value: new THREE.Vector2(Math.cos(land.flowAngle), Math.sin(land.flowAngle)).multiplyScalar(0.9) },
        uShallow: { value: new THREE.Color('#8b8a5e') }, uDeep: { value: new THREE.Color('#4f5a3d') },
        uFogColor: { value: LIGHT.haze }, uFogNear: { value: LIGHT.fogNear }, uFogFar: { value: LIGHT.fogFar },
        uDetail: { value: phone ? 0.6 : 1 },
      },
    });
    return { geometry: geo, material: mat };
  }, [land, phone]);
  return <mesh geometry={geometry} material={material} renderOrder={5} />;
}
