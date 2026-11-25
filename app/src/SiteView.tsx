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
import { Animals, placeAnimals } from './scene/Animals';
import { EarthIntro, WhereOnEarth } from './EarthIntro';
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
  const setUnits = (u: Units) => { setUnitsState(u); saveUnits(u); };
  const [panel, setPanel] = useState(false);
  // the opening: the Earth at that time, zooming in; the scene's own fly-in starts when it ends
  const [intro, setIntro] = useState(!reduceMotion());
  const [goal, setGoal] = useState<View | null>(null);
  const endIntro = useCallback(() => { setIntro(false); if (!reduceMotion()) setGoal(OVERVIEW); }, []);
  const controls = useRef<OrbitImpl | null>(null);
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

  return <div className="site">
    <Canvas shadows={phone ? false : 'percentage'} dpr={phone ? [1, 1.6] : [1, 2]} gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: reduceMotion() ? OVERVIEW.pos.toArray() : start.toArray(), fov: phone ? 55 : 45, near: 0.5, far: 2500 }}
      onPointerMissed={() => setSelected(null)}
      onCreated={({ gl, scene }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; scene.fog = new THREE.Fog(LIGHT.haze, LIGHT.fogNear, LIGHT.fogFar); }}>
      <Sky />
      <hemisphereLight args={['#dfe6ec', '#b39a72', 0.9]} />
      <directionalLight position={LIGHT.sunDir.clone().multiplyScalar(300).toArray()} color={LIGHT.sunColor} intensity={2.4} castShadow={!phone}
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-160} shadow-camera-right={160} shadow-camera-top={160} shadow-camera-bottom={-160} shadow-camera-far={900} shadow-bias={-0.0004} />
      <Terrain land={land} seed={seed} phone={phone} ground={site.ground ? site.ground.f : null} />
      <Water land={land} phone={phone} />
      <Plants land={land} seed={seed} phone={phone} />
      <Logs land={land} seed={seed} phone={phone} />
      <Look phone={phone} />
      <Suspense fallback={null}><Animals site={site} land={land} selected={selected} onSelect={focus} labels={labels} phone={phone} units={units} /></Suspense>
      <OrbitControls ref={controls as never} makeDefault enableDamping dampingFactor={0.08} minDistance={SKY.minDistance} maxDistance={SKY.maxDistance}
        minPolarAngle={SKY.minPolar} maxPolarAngle={SKY.maxPolar} screenSpacePanning={false}
        target={OVERVIEW.target.toArray()} onStart={() => setGoal(null)} />
      <Director land={land} goal={goal} onArrive={() => setGoal(null)} controls={controls} />
    </Canvas>

    <header className="bar">
      <button className="back" onClick={onBack} aria-label="Back">←</button>
      <div><b>Life at {site.name.replace(/^The /, 'the ')}</b><span>{site.where} · {site.when}</span><em>{site.blurb}</em></div>
      <div className="units" role="group" aria-label="Units">
        <button className={units === 'metric' ? 'on' : ''} aria-pressed={units === 'metric'} onClick={() => setUnits('metric')}>m</button>
        <button className={units === 'imperial' ? 'on' : ''} aria-pressed={units === 'imperial'} onClick={() => setUnits('imperial')}>ft</button>
      </div>
    </header>
    <div className="views">
      <button onClick={() => { setSelected(null); setGoal(OVERVIEW); }}>Overview</button>
      <button onClick={() => setLabels(v => !v)}>{labels ? 'Hide names' : 'Names'}</button>
      <button onClick={() => setPanel(v => !v)}>{panel ? 'Close' : 'About this place'}</button>
    </div>
    <WhereOnEarth site={site} onOpen={() => { setPanel(false); setIntro(true); }} />
    {intro && <EarthIntro site={site} onDone={endIntro} />}
    <p className="note">A reconstruction from the site’s papers: the river, the plants and the light follow what they describe; the exact shape of the ground is illustrative. Animals are scientists’ silhouettes, to scale where the length is known.</p>

    {panel && <aside className="panel">
      <button className="x" onClick={() => setPanel(false)} aria-label="Close">✕</button>
      {sel ? <section>
        <button className="link" onClick={() => setSelected(null)}>← The place</button>
        <h2>{sel.name}</h2>
        <p className="size">{sizeText(sel, units)} · drawn to scale</p>
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
        <h3>Sources</h3>
        <ul className="papers">{site.papers.map(p => <li key={p.key}>{p.authors[0]}{p.authors.length > 1 ? ' et al.' : ''} ({p.year}). {p.title}. <i>{p.journal}</i>. <a href={'https://doi.org/' + p.doi} target="_blank" rel="noopener">doi:{p.doi}</a></li>)}</ul>
      </section>}
    </aside>}
  </div>;
}
