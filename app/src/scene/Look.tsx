// The finish over the whole picture: a soft glow where the sun catches the water, a warm, slightly richer grade, a
// vignette, and from the sky a gentle tilt-shift — the band in focus across the middle, the near and far edges soft —
// so the place reads like a model in a museum case, the "city view" Evan asked for. Lighter on phones.
import { EffectComposer, Bloom, Vignette, HueSaturation, BrightnessContrast, TiltShift2, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

export function Look({ phone }: { phone: boolean }) {
  if (phone) return <EffectComposer multisampling={0}><HueSaturation saturation={-0.06} /><ToneMapping mode={ToneMappingMode.ACES_FILMIC} /><Vignette offset={0.3} darkness={0.45} /></EffectComposer>;
  return <EffectComposer multisampling={4}>
    <Bloom intensity={0.6} luminanceThreshold={1.05} luminanceSmoothing={0.15} mipmapBlur />
    <HueSaturation saturation={-0.06} />
    <BrightnessContrast brightness={0.0} contrast={0.06} />
    <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    <TiltShift2 blur={0.1} taper={0.55} start={[0, 0.5]} end={[1, 0.5]} samples={8} direction={[0, 1]} />
    <Vignette offset={0.3} darkness={0.5} />
  </EffectComposer>;
}
