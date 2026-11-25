// The new Before Us app (docs/REBUILD.md, Step 3). For now: the living site scenes. Addresses are kept in the hash
// (#/site/kemkem) so the app works from any static host; clean paths come with the hosting decision (Step 4).
import { useEffect, useState } from 'react';
import sites from './content/sites.json';
import type { Site } from './types';
import { SiteView } from './SiteView';
import { Guide } from './Guide';

const ALL = sites as unknown as Site[];
const route = () => { const m = location.hash.match(/^#\/site\/([a-z0-9-]+)/); return m ? m[1] : null; };
const guideRoute = () => { const m = location.hash.match(/^#\/guide\/([a-z0-9-]+)/); return m ? m[1] : null; };

export function App() {
  const [id, setId] = useState(route());
  useEffect(() => { const f = () => setId(route()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  const site = ALL.find(s => s.id === id), guide = ALL.find(s => s.id === guideRoute());
  if (guide) return <Guide site={guide} />;
  if (site) return <SiteView site={site} onBack={() => { location.hash = ''; }} />;
  return <main className="home">
    <h1>Before Us</h1>
    <p className="sub">Living scenes — a preview of the new app. Step into one place at its own time.</p>
    {ALL.map(s => <a key={s.id} className="card" href={'#/site/' + s.id}><b>Life at {s.name.replace(/^The /, 'the ')}</b><span>{s.where} · {s.when}</span><p>{s.blurb}</p></a>)}
  </main>;
}
