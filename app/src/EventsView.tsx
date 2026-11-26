// The great events, painted (Evan, 25 Nov: "paintings for all the extinction events and other events like when things
// drifted, when things collided ... they all need to be painting"). Each painting is by AI in Knight's manner from the
// event's own words in this atlas; each says where it differs from the evidence, and lists the event's verified papers.
import { useEffect, useRef, useState } from 'react';
import events from './content/events.json';
import { Checked, type Check } from './Checked';

export interface PaintedEvent { id: string; kind: 'extinction' | 'crisis' | 'drift' | 'story'; title: string; t: number; text: string; f: string; w: number; h: number;
  model: string; prompt: string; differs: string; check: Check; papers: { key: string; doi: string; title: string; journal: string; year: number; authors: string[] }[] }
const ALL = events as PaintedEvent[];
const GROUPS: [PaintedEvent['kind'], string, string][] = [
  ['extinction', 'The great extinctions', 'When most of life died out'],
  ['crisis', 'Smaller crises', 'Shorter, sharper losses'],
  ['drift', 'Drifting and colliding', 'Continents splitting, closing and crashing together'],
  ['story', 'How the Earth was made', 'The Moon, the ice, the mountains, the seas'],
];
export const when = (t: number) => t === 0 ? 'today' : t < 0.1 ? `about ${Math.round(t * 1e6).toLocaleString('en')} years ago` : `about ${+t.toFixed(1)} million years ago`;

export function EventsView({ onBack }: { onBack: () => void }) {
  const [open, setOpen] = useState<PaintedEvent | null>(null);
  useEffect(() => { document.title = 'Great events · Before Us'; }, []);
  if (open) return <EventPainting e={open} onBack={() => setOpen(null)} />;
  return <main className="home events">
    <button className="link" onClick={onBack}>← Before Us</button>
    <h1>The great events</h1>
    <p className="sub">Extinctions, drifting continents and the making of the Earth — each painted in the manner of Charles R. Knight from what the evidence says happened, with the papers beneath.</p>
    {GROUPS.map(([k, title, sub]) => { const list = ALL.filter(e => e.kind === k); return list.length ? <section key={k}>
      <h2>{title}</h2><p className="sub">{sub}</p>
      <div className="grid">{list.map(e => <button key={e.id} className="ev" onClick={() => setOpen(e)}>
        <img src={e.f} alt="" loading="lazy" /><b>{e.title}</b><span>{when(e.t)}</span></button>)}</div>
    </section> : null; })}
  </main>;
}

function EventPainting({ e, onBack }: { e: PaintedEvent; onBack: () => void }) {
  const box = useRef<HTMLDivElement>(null), [s, setS] = useState(1), [o, setO] = useState({ x: 0, y: 0 }), drag = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { const el = box.current!; const w = (ev: WheelEvent) => { ev.preventDefault(); setS(v => Math.min(3, Math.max(1, v * (ev.deltaY < 0 ? 1.15 : 1 / 1.15)))); };
    el.addEventListener('wheel', w, { passive: false }); return () => el.removeEventListener('wheel', w); }, []);
  useEffect(() => { if (s === 1) setO({ x: 0, y: 0 }); }, [s]);
  return <div className="evp">
    <div className="evimg" ref={box} onDoubleClick={() => setS(v => v < 2 ? 2 : 1)}
      onPointerDown={ev => { drag.current = { x: ev.clientX, y: ev.clientY }; (ev.target as Element).setPointerCapture?.(ev.pointerId); }}
      onPointerMove={ev => { const d = drag.current; if (!d || s === 1) return; setO(v => ({ x: v.x + ev.clientX - d.x, y: v.y + ev.clientY - d.y })); drag.current = { x: ev.clientX, y: ev.clientY }; }}
      onPointerUp={() => { drag.current = null; }}>
      <img src={e.f} alt={'A painting of ' + e.title} draggable={false} style={{ transform: `translate(${o.x}px, ${o.y}px) scale(${s})` }} />
    </div>
    <aside className="evtext">
      <button className="link" onClick={onBack}>← All events</button>
      <h2>{e.title}</h2><p className="when">{when(e.t)}</p>
      <p>{e.text}</p>
      <p className="differs"><b>Where the painting differs from the evidence:</b> {e.differs}</p>
      <Checked c={e.check} />
      <p className="credit">Painted by AI ({e.model === 'gemini-3-pro-image' ? 'Google’s Gemini 3 Pro Image' : e.model}) in the manner of Charles R. Knight, from the words above.</p>
      <details className="prompt"><summary>What the painter was asked</summary><div>{e.prompt}</div></details>
      {e.papers.length > 0 && <><h3>The evidence</h3><ul className="papers">{e.papers.map(p => <li key={p.key}>{p.authors[0]}{p.authors.length > 1 ? ' et al.' : ''} ({p.year}). {p.title}. <i>{p.journal}</i>. <a href={'https://doi.org/' + p.doi} target="_blank" rel="noopener">doi:{p.doi}</a></li>)}</ul></>}
    </aside>
  </div>;
}
