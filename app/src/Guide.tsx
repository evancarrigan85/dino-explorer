// A tool, not a screen: the site's land as a flat map seen from straight above (#/guide/<site>), the same land the 3D scene
// is built from. tools/paint.py ground sends it to the image model as the layout to repaint, so the painting the scene
// wears (app/public/ground/<site>.webp) keeps the river, banks and sandbanks exactly where the scene has them.
// 1600 × 900 covers the land's bounds (stretched to 16:9; the painting is stretched back the same way).
import { useEffect, useRef } from 'react';
import { BOUNDS, makeLand } from './scene/land';
import { hashString, fbm, smoothstep } from './scene/rng';
import type { Site } from './types';

export function Guide({ site }: { site: Site }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!, W = 1600, H = 900, g = cv.getContext('2d')!, img = g.createImageData(W, H);
    const seed = hashString(site.id), land = makeLand(seed);
    const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t);
    const C = { deep: [61, 107, 138], shallow: [127, 176, 196], wet: [179, 154, 110], dry: [227, 207, 164], red: [176, 96, 60], top: [205, 177, 135], gravel: [143, 130, 112] };
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = BOUNDS.x0 + (i + 0.5) / W * (BOUNDS.x1 - BOUNDS.x0), z = BOUNDS.z0 + (j + 0.5) / H * (BOUNDS.z1 - BOUNDS.z0), h = land.height(x, z);
      const far = z < land.riverZ(x);
      let c: number[];
      if (h < 0) c = mix(C.shallow, C.deep, smoothstep(0, 1.6, -h));
      else if (h < 0.25) c = mix(C.wet, C.dry, smoothstep(0, 0.25, h));
      else if (far && h > 0.35 && z > land.farBankZ(x) - 2.5 && z < land.farBankZ(x) + 10) c = C.red;
      else if (h < 0.7 && fbm(x * 0.045, z * 0.045, 3, seed + 31) > 0.28) c = C.gravel;
      else c = far ? C.top : C.dry;
      const k = (j * W + i) * 4; img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    (window as unknown as { __guide: string }).__guide = cv.toDataURL('image/png');
  }, [site]);
  return <canvas ref={ref} width={1600} height={900} style={{ width: '100%' }} />;
}
