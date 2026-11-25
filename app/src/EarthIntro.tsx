// The opening of a living scene: the Earth at the site's own time, from this atlas's map (plates, seas and relief from
// the papers in "How this map is made"), turning to the site and zooming in, until the scene itself takes over.
// The pictures are made by app/scripts/capture-earth.cjs. Tap to skip; none for readers who ask for reduced motion.
import { useEffect, useState } from 'react';
import type { Site } from './types';

export function EarthIntro({ site, onDone }: { site: Site; onDone: () => void }) {
  const [stage, setStage] = useState(0);          // 0 globe · 1 region · 2 fading into the scene
  useEffect(() => {
    const t = [setTimeout(() => setStage(1), 2300), setTimeout(() => setStage(2), 4600), setTimeout(onDone, 5600)];
    return () => t.forEach(clearTimeout);
  }, [onDone]);
  return <div className={'earth s' + stage} onClick={onDone} role="dialog" aria-label={'The Earth ' + site.when}>
    <img className="globe" src={`earth/${site.id}-1.jpg`} alt="" />
    <img className="region" src={`earth/${site.id}-2.jpg`} alt="" />
    <div className="pin" aria-hidden="true" />
    <div className="cap">
      <b>The Earth {site.when}</b>
      <span>{site.name.replace(/^The /, 'the ').replace(/^./, c => c.toUpperCase())}, in what is now {site.where}</span>
      <small>Continents, seas and mountains from this atlas’s map · tap to skip</small>
    </div>
  </div>;
}

/** a small round view of the Earth at that time, with the site marked: tap to see the opening again */
export function WhereOnEarth({ site, onOpen }: { site: Site; onOpen: () => void }) {
  return <button className="where" onClick={onOpen} aria-label="Where on Earth: show the opening again">
    <img src={`earth/${site.id}-1.jpg`} alt="" /><span>Where on Earth</span>
  </button>;
}
