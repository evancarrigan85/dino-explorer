// A living scene: one fossil site at its own time, in 3D, to orbit, zoom and fly over — with everything on screen
// one tap from what it is and how we know.
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitImpl } from 'three-stdlib';
import { makeLand, type Land } from './scene/land';
import { hashString } from './scene/rng';
import { clock, LIGHT } from './scene/shared';
import { Terrain } from './scene/Terrain';
import { Water } from './scene/Water';
import { Sky } from './scene/Sky';
import { Plants } from './scene/Plants';
import { Animals, placeAnimals, type AnimalStyle } from './scene/Animals';
import { EarthIntro, WhereOnEarth } from './EarthIntro';
import { PaintingView } from './PaintingView';
import { Checked } from './Checked';
import { Logs } from './scene/Logs';
import { Look } from './scene/Look';
import type { Site } from './types';
import { sizeText, initialUnits, saveUnits, BASIS_WORDS, type Units } from './size';

const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const PHONE = typeof window !== 'undefined' && window.innerWidth < 768;
type View = { pos: THREE.Vector3; target: THREE.Vector3 };
// The scenes are seen from the sky (Evan, 25 Nov: "stay with the sky view … the ground level ones are bad"): an
// overview of the whole place, and the reader can turn, tilt and zoom within the sky but never come down to the ground.
const OVERVIEW: View = PHONE
  ? { pos: new THREE.Vector3(30, 175, 95), target: new THREE.Vector3(-5, 0, -35) }
  : { pos: new THREE.Vector3(75, 100, 125), target: new THREE.Vector3(0, 0, -28) };
const SKY = { minDistance: 45, maxDistance: 420, minPolar: Math.PI * 0.12, maxPolar: Math.PI * 0.36, clearance: 20 };

/** Runs the scene's clock (still for reduced motion), keeps the camera in the sky, and glides between views. */
function Director({ land, goal, onArrive, controls }: { land: Land; goal: { pos: THREE.Vector3; target: THREE.Vector3 } | null; onArrive: () => void; controls: React.RefObject<OrbitImpl | null> }) {
  const { camera } = useThree(), still = useMemo(reduceMotion, []);
  // for the checks (app/scripts/check.cjs): how high the camera is above the ground under it
  useEffect(() => { (window as unknown as { __sky: () => number }).__sky = () => camera.position.y - land.height(camera.position.x, camera.position.z); }, [camera, land]);
  useFrame((_, dt) => {
    if (!still) clock.value += Math.min(dt, 0.1);
    const c = controls.current;
    if (goal && c) {
      const k = still ? 1 : 1 - Math.pow(0.04, Math.min(dt, 0.1));
      camera.position.lerp(goal.pos, k); c.target.lerp(goal.target, k);
      if (camera.position.distanceTo(goal.pos) < 0.3) onArrive();
    }
    const floor = land.height(camera.position.x, camera.position.z) + SKY.clearance;
    if (camera.position.y < floor) camera.position.y = floor;
    c?.update();
  });
  return null;
}

export function SiteView({ site, onBack }: { site: Site; onBack: () => void }) {
  const phone = typeof window !== 'undefined' && (window.innerWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4);
  const seed = useMemo(() => hashString(site.id), [site.id]);
  const land = useMemo(() => makeLand(seed), [seed]);
  const placed = useMemo(() => placeAnimals(site, land), [site, land]);
  // the fly-in: from high above and further out, down to the overview
  const start = useMemo(() => OVERVIEW.target.clone().add(OVERVIEW.pos.clone().sub(OVERVIEW.target).multiplyScalar(1.9)), []);
  const [selected, setSelected] = useState<string | null>(null);
  const [labels, setLabels] = useState(true);
  const [units, setUnitsState] = useState<Units>(initialUnits);
  const [style, setStyle] = useState<AnimalStyle>('outline');
  // how the site is seen: its painting (with things to find), or the living 3D scene to explore at true scale
  const [mode, setMode] = useState<'painting' | '3d'>(site.painting && site.spots?.length ? 'painting' : '3d');
  const [look, setLook] = useState<'scene' | 'evidence'>('scene');      // the reader lands on the painting itself
  const [pending, setPending] = useState<string | null>(null);     // an animal to fly to once the 3D scene is up
  const STYLES: [AnimalStyle, string][] = [['outline', 'Outlines'], ['paint-outline', 'Painted in outline'], ['paint-free', 'Painted freely']];
  const anyPainted = site.cast.some(c => c.painted);
  const setUnits = (u: Units) => { setUnitsState(u); saveUnits(u); };
  const [panel, setPanel] = useState(false);
  // the opening: the Earth at that time, zooming in; the scene's own fly-in starts when it ends
  const [intro, setIntro] = useState(!reduceMotion());
  const [goal, setGoal] = useState<View | null>(null);
  const endIntro = useCallback(() => { setIntro(false); if (!reduceMotion()) setGoal(OVERVIEW); }, []);
  const controls = useRef<OrbitImpl | null>(null);
  const bar = useRef<HTMLElement>(null), [barH, setBarH] = useState(96);
  useEffect(() => { const el = bar.current; if (!el) return; const f = () => setBarH(el.offsetHeight); f(); const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect(); }, []);
  const sel = site.cast.find(c => c.name === selected);

  /** fly to an animal: still from the sky, keeping the direction the reader is looking from, closer in */
  const focus = (name: string) => {
    setSelected(name); setPanel(true);
    const p = placed.find(x => x.c.name === name), c = controls.current; if (!p || !c) return;
    const t = p.pos.clone().setY(Math.max(p.pos.y, 0) + (p.c.zone === 'air' ? 0 : p.h * 0.4));
    const from = c.object.position.clone().sub(c.target); from.y = 0; if (from.lengthSq() < 1) from.set(0, 0, 1); from.normalize();
    const dist = Math.min(110, Math.max(SKY.minDistance + 5, p.w * 5)), tilt = Math.PI * 0.27;
    const pos = t.clone().add(from.multiplyScalar(dist * Math.sin(tilt))).add(new THREE.Vector3(0, dist * Math.cos(tilt), 0));
    setGoal({ pos, target: t });
  };
  useEffect(() => { document.title = 'Life at ' + site.name.replace(/^The /, 'the ') + ' · Before Us'; }, [site]);
  useEffect(() => {                                                 // "See it to scale in 3D": wait for the scene, then fly there
    if (!pending || mode !== '3d') return; let id = 0;
    const go = () => { if (controls.current) { focus(pending); setPending(null); } else id = requestAnimationFrame(go); };
    id = requestAnimationFrame(go); return () => cancelAnimationFrame(id);
  });

  return <div className="site" style={{ ['--barH' as string]: barH + 'px' }}>
    {mode === 'painting' && <PaintingView site={site} units={units} look={look} onOpen3D={name => { setMode('3d'); setGoal(null); if (name) setPending(name); }} />}
    {mode === '3d' && <Canvas shadows={phone ? false : 'percentage'} dpr={phone ? [1, 1.6] : [1, 2]} gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: reduceMotion() ? OVERVIEW.pos.toArray() : start.toArray(), fov: phone ? 55 : 45, near: 0.5, far: 2500 }}
      onPointerMissed={() => setSelected(null)}
      onCreated={({ gl, scene }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; scene.fog = new THREE.Fog(LIGHT.haze, LIGHT.fogNear, LIGHT.fogFar); }}>
      <Sky />
      <hemisphereLight args={['#dfe6ec', '#b39a72', 0.9]} />
      <directionalLight position={LIGHT.sunDir.clone().multiplyScalar(300).toArray()} color={LIGHT.sunColor} intensity={2.4} castShadow={!phone}
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-160} shadow-camera-right={160} shadow-camera-top={160} shadow-camera-bottom={-160} shadow-camera-far={900} shadow-bias={-0.0004} />
      <Terrain land={land} seed={seed} phone={phone} ground={site.ground ? site.ground.f : null} />
      <Water land={land} phone={phone} />
      <Plants land={land} seed={seed} phone={phone} sprites={site.plantSprites} />
      <Logs land={land} seed={seed} phone={phone} />
      <Look phone={phone} />
      <Suspense fallback={null}><Animals site={site} land={land} selected={selected} onSelect={focus} labels={labels} phone={phone} units={units} style={style} /></Suspense>
      <OrbitControls ref={controls as never} makeDefault enableDamping dampingFactor={0.08} minDistance={SKY.minDistance} maxDistance={SKY.maxDistance}
        minPolarAngle={SKY.minPolar} maxPolarAngle={SKY.maxPolar} screenSpacePanning={false}
        target={OVERVIEW.target.toArray()} onStart={() => setGoal(null)} />
      <Director land={land} goal={goal} onArrive={() => setGoal(null)} controls={controls} />
    </Canvas>}

    <header className="bar" ref={bar}>
      <button className="back" onClick={onBack} aria-label="Back">←</button>
      <div><b>Life at {site.name.replace(/^The /, 'the ')}</b><span>{site.where} · {site.when}</span>{mode === 'painting' ? <em className="ai">{phone ? 'Painted by AI in Knight’s manner · see About' : 'A painting by AI in the manner of Charles R. Knight, from this place’s 3D reconstruction · “About this place” says where it differs from the evidence'}</em> : <em>{site.blurb}</em>}</div>
      <div className="units" role="group" aria-label="Units">
        <button className={units === 'metric' ? 'on' : ''} aria-pressed={units === 'metric'} onClick={() => setUnits('metric')}>m</button>
        <button className={units === 'imperial' ? 'on' : ''} aria-pressed={units === 'imperial'} onClick={() => setUnits('imperial')}>ft</button>
      </div>
    </header>
    <div className="views">
      {mode === 'painting' ? <>
        <button onClick={() => { setMode('3d'); setGoal(OVERVIEW); }}>Explore in 3D</button>
        <button onClick={() => setLook('scene')} aria-pressed={look === 'scene'}>The Scene</button>
        <button onClick={() => setLook('evidence')} aria-pressed={look === 'evidence'}>The Evidence</button>
        <button onClick={() => setPanel(v => !v)}>{panel ? 'Close' : 'About this place'}</button>
      </> : <>
      {site.painting && site.spots?.length ? <button onClick={() => { setMode('painting'); setSelected(null); }}>Painting</button> : null}
      <button onClick={() => { setSelected(null); setGoal(OVERVIEW); }}>Overview</button>
      {anyPainted && <button className="style" title="How the animals are drawn" onClick={() => setStyle(STYLES[(STYLES.findIndex(x => x[0] === style) + 1) % STYLES.length][0])}>{STYLES.find(x => x[0] === style)![1]}</button>}
      <button onClick={() => setLabels(v => !v)}>{labels ? 'Hide names' : 'Names'}</button>
      <button onClick={() => setPanel(v => !v)}>{panel ? 'Close' : 'About this place'}</button>
      </>}
    </div>
    <WhereOnEarth site={site} onOpen={() => { setPanel(false); setIntro(true); }} />
    {intro && <EarthIntro site={site} onDone={endIntro} />}
    {mode === '3d' && <p className="note">A reconstruction from the site’s papers: the river, the plants and the light follow what they describe; the exact shape of the ground is illustrative. Every animal is drawn to scale.</p>}

    {panel && <aside className="panel">
      <button className="x" onClick={() => setPanel(false)} aria-label="Close">✕</button>
      {sel ? <section>
        <button className="link" onClick={() => setSelected(null)}>← The place</button>
        <h2>{sel.name}</h2>
        <p className="size">{sizeText(sel, units)} · drawn to scale</p>
        {sel.look && style !== 'outline' && sel.painted && <p className="basis"><b>{style === 'paint-outline' ? 'Painted in its outline' : 'Painted freely'}:</b> as reconstructed today — {sel.look.text}. By AI in the manner of Charles R. Knight{style === 'paint-outline' && sel.painted.outline?.iou ? `; it fills the scientists’ outline (${Math.round(sel.painted.outline.iou * 100)}% match)` : style === 'paint-free' ? '; its shape is the painter’s, not a scientist’s outline' : ''}.</p>}
        {sel.basis && <p className="basis"><b>{BASIS_WORDS[sel.basis.k]}:</b> {sel.basis.text}{(() => {
          const paper = sel.basis.ref ? site.papers.find(p => p.key === sel.basis!.ref) : undefined;
          return paper ? <> — <a href={'https://doi.org/' + paper.doi} target="_blank" rel="noopener">{paper.authors[0]}{paper.authors.length > 1 ? ' et al.' : ''} {paper.year}</a></>
            : sel.basis.url ? <> — <a href={sel.basis.url} target="_blank" rel="noopener">source</a></> : null;
        })()}.</p>}
        <p>{sel.note}.</p>
        {sel.sil && site.sil[sel.sil] && <p className="credit">
          {site.sil[sel.sil].level !== 'own' && <>Outline of {site.sil[sel.sil].level === 'member' ? 'one member of the group' : 'a relative'}, <i>{site.sil[sel.sil].of}</i>. </>}
          Silhouette by <a href={'https://www.phylopic.org/images/' + site.sil[sel.sil].img} target="_blank" rel="noopener">{site.sil[sel.sil].by}</a> (<a href={site.sil[sel.sil].licUrl} target="_blank" rel="noopener">{site.sil[sel.sil].lic}</a>), PhyloPic.
        </p>}
      </section> : <section>
        <p className="blurb">{site.blurb}</p>
        <h3>The place</h3><p>{site.setting}</p>
        <h3>The rock</h3><p>{site.rock}</p>
        <h3>Plants</h3><p>{site.plants}</p>
        <h3>Who was found here</h3>
        <ol className="cast">{site.cast.map(c => <li key={c.name}><button className="link" onClick={() => focus(c.name)}><b>{c.name}</b></button> — {c.note} <i>({sizeText(c, units)}{c.basis ? '; ' + BASIS_WORDS[c.basis.k].toLowerCase() : ''})</i></li>)}</ol>
        <h3>How do we know?</h3><p>{site.know}</p>
        <h3>Still debated</h3><p>{site.debate}</p>
        <h3>What is a guess</h3><p>The exact shape of the river, banks and sandbank; where each plant stands; the animals’ poses and where they stand. The kinds of land, water and plants come from the papers below. Every animal is drawn to scale: most sizes come from papers; where none gives one, the animal’s card says whose estimate it is, or that it is a guess from living relatives.</p>
        <h3>The pictures</h3>
        {site.painting && <p>The painting of this place is by AI ({site.painting.model === 'gemini-3-pro-image' ? 'Google’s Gemini 3 Pro Image' : site.painting.model}) in the manner of Charles R. Knight, made from this scene’s own 3D view from the sky, with the animals as they are reconstructed today, then corrected where it strayed. <span className="differs"><b>Where it still differs from the evidence:</b> {site.painting.differs}</span></p>}
        {site.painting?.check && <Checked c={site.painting.check} />}
        {site.painting && <details className="prompt"><summary>What the painter of the scene was asked</summary><div>{site.painting.prompt}</div></details>}
        <p>{site.earth && <>The Earth at the start is this atlas’s own map of that time — every coast and shallow sea as the science has it — given a painted look in the manner of Charles R. Knight (1874–1953). </>}
          {site.ground && <>The ground is painted by AI ({site.ground.model === 'gemini-3-pro-image' ? 'Google’s Gemini 3 Pro Image' : site.ground.model}){/Charles R\. Knight/.test(site.ground.prompt) ? ' in the manner of Charles R. Knight, drawn with today’s science,' : ''} from this scene’s own map, and checked by eye; the scene lays its texture over the land, so the river and banks keep their shape. No animal is painted: they are the scientists’ silhouettes.</>}</p>
        {site.ground && <details className="prompt"><summary>What the painter was asked</summary><div>{site.ground.prompt}</div></details>}
        {anyPainted && <p>Some animals can also be shown painted (the “Animals” button), two ways: <b>in outline</b> — painted inside the scientists’ own silhouette and cut to it, so the shape is theirs; or <b>freely</b> — painted from today’s description alone, so the shape is the painter’s guess. Both by AI in Knight’s manner; colours are not known for any of them.</p>}
        <h3>Sources</h3>
        <ul className="papers">{site.papers.map(p => <li key={p.key}>{p.authors[0]}{p.authors.length > 1 ? ' et al.' : ''} ({p.year}). {p.title}. <i>{p.journal}</i>. <a href={'https://doi.org/' + p.doi} target="_blank" rel="noopener">doi:{p.doi}</a></li>)}</ul>
      </section>}
    </aside>}
  </div>;
}
