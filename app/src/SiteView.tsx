// A living scene: one fossil site at its own time, in 3D, to orbit, zoom and fly over — with everything on screen
// one tap from what it is and how we know.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
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
import type { Site } from './types';

const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const PHONE = typeof window !== 'undefined' && window.innerWidth < 768;
const VIEWS = PHONE ? {
  eye: { pos: new THREE.Vector3(3, 3.0, 36), target: new THREE.Vector3(-13, 4, 4) },
  air: { pos: new THREE.Vector3(40, 120, 150), target: new THREE.Vector3(-5, 0, -25) },
} : {
  eye: { pos: new THREE.Vector3(6, 3.4, 46), target: new THREE.Vector3(-10, 3, -30) },
  air: { pos: new THREE.Vector3(70, 95, 120), target: new THREE.Vector3(0, 0, -30) },
};

/** Runs the scene's clock (still for reduced motion), keeps the camera above the ground, and glides between views. */
function Director({ land, goal, onArrive, controls }: { land: Land; goal: { pos: THREE.Vector3; target: THREE.Vector3 } | null; onArrive: () => void; controls: React.RefObject<OrbitImpl | null> }) {
  const { camera } = useThree(), still = useMemo(reduceMotion, []);
  useFrame((_, dt) => {
    if (!still) clock.value += Math.min(dt, 0.1);
    const c = controls.current;
    if (goal && c) {
      const k = still ? 1 : 1 - Math.pow(0.04, Math.min(dt, 0.1));
      camera.position.lerp(goal.pos, k); c.target.lerp(goal.target, k);
      if (camera.position.distanceTo(goal.pos) < 0.3) onArrive();
    }
    const floor = land.height(camera.position.x, camera.position.z) + 1.4;
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
  const views = useMemo(() => {
    const hero = placed.find(p => p.c.zone === 'edge' && p.known) ?? placed.find(p => p.c.zone === 'edge');
    if (!hero) return VIEWS;
    // looking past it across the river; on a phone (a tall, narrow view) from further back, so it fits
    const t = phone ? new THREE.Vector3(hero.pos.x + 1, 3.6, hero.pos.z - 14) : new THREE.Vector3(hero.pos.x + 6, 3.2, hero.pos.z - 30);
    const pos = phone ? new THREE.Vector3(hero.pos.x + 7, 3.4, hero.pos.z + 60) : new THREE.Vector3(hero.pos.x + 22, 3.4, hero.pos.z + 32);
    pos.y = Math.max(pos.y, land.height(pos.x, pos.z) + 1.8);
    return { eye: { pos, target: t }, air: VIEWS.air };
  }, [placed, land, phone]);
  const [selected, setSelected] = useState<string | null>(null);
  const [labels, setLabels] = useState(true);
  const [panel, setPanel] = useState(false);
  const [goal, setGoal] = useState<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(reduceMotion() ? null : 'eye' as never);
  const controls = useRef<OrbitImpl | null>(null);
  const sel = site.cast.find(c => c.name === selected);

  const focus = (name: string) => {
    setSelected(name); setPanel(true);
    const p = placed.find(x => x.c.name === name); if (!p) return;
    const t = p.pos.clone().setY(Math.max(p.pos.y, 0) + p.h * 0.5), back = Math.max(10, p.w * 1.6);
    const from = new THREE.Vector3(t.x + back * 0.35, t.y + back * 0.35, t.z + back);
    from.y = Math.max(from.y, land.height(from.x, from.z) + 2);
    setGoal({ pos: from, target: t });
  };
  useEffect(() => { document.title = 'Life at ' + site.name.replace(/^The /, 'the ') + ' · Before Us'; }, [site]);

  return <div className="site">
    <Canvas shadows={phone ? false : 'percentage'} dpr={phone ? [1, 1.6] : [1, 2]} gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: reduceMotion() ? views.eye.pos.toArray() : views.air.pos.toArray(), fov: phone ? 55 : 45, near: 0.2, far: 2500 }}
      onPointerMissed={() => setSelected(null)}
      onCreated={({ gl, scene }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; scene.fog = new THREE.Fog(LIGHT.haze, LIGHT.fogNear, LIGHT.fogFar); }}>
      <Sky />
      <hemisphereLight args={['#dfe6ec', '#b39a72', 0.9]} />
      <directionalLight position={LIGHT.sunDir.clone().multiplyScalar(300).toArray()} color={LIGHT.sunColor} intensity={2.4} castShadow={!phone}
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-160} shadow-camera-right={160} shadow-camera-top={160} shadow-camera-bottom={-160} shadow-camera-far={900} shadow-bias={-0.0004} />
      <Terrain land={land} seed={seed} phone={phone} />
      <Water land={land} phone={phone} />
      <Plants land={land} seed={seed} phone={phone} />
      <Suspense fallback={null}><Animals site={site} land={land} selected={selected} onSelect={focus} labels={labels} phone={phone} /></Suspense>
      <OrbitControls ref={controls as never} makeDefault enableDamping dampingFactor={0.08} minDistance={4} maxDistance={420} maxPolarAngle={Math.PI * 0.495}
        target={views.eye.target.toArray()} onStart={() => setGoal(null)} />
      <Director land={land} goal={(goal as unknown) === 'eye' ? views.eye : goal} onArrive={() => setGoal(null)} controls={controls} />
    </Canvas>

    <header className="bar">
      <button className="back" onClick={onBack} aria-label="Back">←</button>
      <div><b>Life at {site.name.replace(/^The /, 'the ')}</b><span>{site.where} · {site.when}</span><em>{site.blurb}</em></div>
    </header>
    <div className="views">
      <button onClick={() => setGoal(views.eye)}>Eye level</button>
      <button onClick={() => setGoal(views.air)}>Fly over</button>
      <button onClick={() => setLabels(v => !v)}>{labels ? 'Hide names' : 'Names'}</button>
      <button onClick={() => setPanel(v => !v)}>{panel ? 'Close' : 'About this place'}</button>
    </div>
    <p className="note">A reconstruction from the site’s papers: the river, the plants and the light follow what they describe; the exact shape of the ground is illustrative. Animals are scientists’ silhouettes, to scale where the length is known.</p>

    {panel && <aside className="panel">
      <button className="x" onClick={() => setPanel(false)} aria-label="Close">✕</button>
      {sel ? <section>
        <button className="link" onClick={() => setSelected(null)}>← The place</button>
        <h2>{sel.name}</h2>
        <p className="size">{sel.size}{sel.len == null ? ' · drawn paler, not to scale' : ' · drawn to scale'}</p>
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
        <ol className="cast">{site.cast.map(c => <li key={c.name}><button className="link" onClick={() => focus(c.name)}><b>{c.name}</b></button> — {c.note} <i>({c.size})</i></li>)}</ol>
        <h3>How do we know?</h3><p>{site.know}</p>
        <h3>Still debated</h3><p>{site.debate}</p>
        <h3>What is a guess</h3><p>The exact shape of the river, banks and sandbank; where each plant stands; the animals’ poses and where they stand. The kinds of land, water and plants, and the animals’ sizes, come from the papers below.</p>
        <h3>Sources</h3>
        <ul className="papers">{site.papers.map(p => <li key={p.key}>{p.authors[0]}{p.authors.length > 1 ? ' et al.' : ''} ({p.year}). {p.title}. <i>{p.journal}</i>. <a href={'https://doi.org/' + p.doi} target="_blank" rel="noopener">doi:{p.doi}</a></li>)}</ul>
      </section>}
    </aside>}
  </div>;
}
