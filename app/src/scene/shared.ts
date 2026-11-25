// Shared pieces of the living scene: one clock for every moving thing, the light, the sky colour (used by the sky and
// by the water's reflections, so they agree), and the wind that moves the plants.
import * as THREE from 'three';

/** One clock for the whole scene, in seconds. Held still for readers who ask for reduced motion. */
export const clock = { value: 0 };

export const LIGHT = {
  // a hot, hazy dry-season afternoon under a pale sky (the brief): the sun ahead and to the left, fairly high
  sunDir: new THREE.Vector3(-0.55, 0.62, -0.56).normalize(),
  sunColor: new THREE.Color('#fff1d6'),
  zenith: new THREE.Color('#a7b9c9'),
  horizon: new THREE.Color('#ece0c4'),
  haze: new THREE.Color('#e6d8b8'),
  fogNear: 70,
  fogFar: 560,
};

export const WIND = { dir: new THREE.Vector2(0.86, 0.5).normalize() };

/** GLSL: the sky's colour in a direction (world space). */
export const SKY_GLSL = /* glsl */ `
uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uZenith; uniform vec3 uHorizon;
vec3 skyColor(vec3 d) {
  float y = max(d.y, 0.0);
  vec3 c = mix(uHorizon, uZenith, pow(y, 0.55));
  float s = max(dot(normalize(d), uSunDir), 0.0);
  c += uSunColor * (0.10 * pow(s, 6.0) + 0.35 * pow(s, 60.0) + 1.4 * pow(s, 900.0));
  c = mix(c, uHorizon * 1.02, (1.0 - smoothstep(0.0, 0.16, y)) * 0.55);   // haze low down
  return c;
}`;

export const skyUniforms = () => ({
  uSunDir: { value: LIGHT.sunDir }, uSunColor: { value: LIGHT.sunColor }, uZenith: { value: LIGHT.zenith }, uHorizon: { value: LIGHT.horizon },
});

/**
 * Make a standard material move in the wind. `height` is the plant's height in its own units; `freq` how fast it
 * sways (tall trees slowly, ferns quickly); `amp` how far its top moves, as a share of its height. Gusts travel across
 * the scene along the wind, so neighbouring plants move together and a wave of movement passes over the bank.
 */
export function windy<T extends THREE.Material>(m: T, height: number, freq: number, amp: number): T {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = clock;
    sh.uniforms.uWindDir = { value: WIND.dir };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
uniform float uTime; uniform vec2 uWindDir;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  vec3 base = vec3(0.0); mat3 rot = mat3(1.0);
  #ifdef USE_INSTANCING
    base = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; rot = mat3(instanceMatrix);
  #else
    base = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  #endif
  float bend = pow(clamp(position.y / ${height.toFixed(3)}, 0.0, 1.0), 1.7);
  float gust = 0.5 + 0.5 * sin(dot(base.xz, uWindDir) * 0.028 - uTime * 0.75);
  gust = gust * gust * gust;
  float sway = sin(uTime * ${freq.toFixed(3)} + base.x * 0.31 + base.z * 0.17) * (0.30 + 0.7 * gust) + 1.1 * gust;
  float flutter = sin(uTime * ${(freq * 3.7).toFixed(3)} + position.x * 3.1 + position.z * 2.3 + base.x) * (0.10 + 0.25 * gust);
  vec3 w = normalize(transpose(rot) * vec3(uWindDir.x, 0.0, uWindDir.y));
  transformed.xz += w.xz * (sway + flutter) * bend * ${(amp * height).toFixed(3)};
  transformed.y -= abs(sway) * bend * ${(amp * height * 0.18).toFixed(3)};
}`);
  };
  m.customProgramCacheKey = () => `windy-${height}-${freq}-${amp}`;
  return m;
}
