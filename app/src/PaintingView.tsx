// The painting of a site — how a site is seen (Evan, 25 Nov 2026: "the whole scene as one painting should be the way
// that we look at those sites … hotspots … for collecting everything on the scenes"). Zoom and pan it like a map (wheel,
// drag, pinch, double-tap); every animal and every part of the place is a spot (site.spots): hover to see its name, tap to
// read about it and add it to what you have found. What you have found is remembered on this device only.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Site, Spot } from './types';
import { sizeText, BASIS_WORDS, type Units } from './size';

const loadFound = (id: string): string[] => { try { const v = JSON.parse(localStorage.getItem('found:' + id) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const saveFound = (id: string, v: string[]) => { try { localStorage.setItem('found:' + id, JSON.stringify(v)); } catch { /* not kept: fine */ } };

export function spotTitle(site: Site, s: Spot) { return s.title || (s.cast && s.cast.length === 1 ? s.cast[0] : s.id); }

export function PaintingView({ site, units, onOpen3D, hints }: { site: Site; units: Units; onOpen3D: (name?: string) => void; hints: boolean }) {
  const P = site.painting!, spots = site.spots || [];
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });         // scale (1 = cover the screen), and the picture's offset in px
  const [size, setSize] = useState({ w: 1, h: 1 });
  const [open, setOpen] = useState<Spot | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [found, setFound] = useState<string[]>(() => loadFound(site.id));
  const [tray, setTray] = useState(false);

  // the picture's size on screen at scale 1: it covers the screen (on a phone, you pan along it)
  const base = useMemo(() => Math.max(size.w / P.w, size.h / P.h), [size, P]);
  const clamp = useCallback((v: { s: number; x: number; y: number }) => {
    const s = Math.min(3, Math.max(1, v.s)), w = P.w * base * s, h = P.h * base * s;
    return { s, x: Math.min(0, Math.max(size.w - w, v.x)), y: Math.min(0, Math.max(size.h - h, v.y)) };
  }, [P, base, size]);
  useEffect(() => {
    const el = box.current!; const fit = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, []);
  // open centred on the scene's leading animal (the first spot), once the real size is known; after that, keep the view
  const first = spots[0], placed = useRef(false);
  useEffect(() => {
    if (size.w < 2) return;
    if (!placed.current) {
      placed.current = true;
      setView(clamp({ s: 1, x: first ? size.w / 2 - first.x * P.w * base : (size.w - P.w * base) / 2, y: first ? size.h / 2 - first.y * P.h * base : (size.h - P.h * base) / 2 }));
    } else setView(v => clamp(v));
  }, [size, base, clamp, P, first]);

  // zoom about a point on screen
  const zoomAt = (px: number, py: number, f: number) => setView(v => {
    const s = Math.min(3, Math.max(1, v.s * f)), k = s / v.s;
    return clamp({ s, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
  });
  // pointers: drag to pan, two fingers to pinch
  const ptr = useRef(new Map<number, { x: number; y: number }>()), last = useRef({ d: 0, moved: 0 });
  const onDown = (e: React.PointerEvent) => { (e.target as Element).setPointerCapture?.(e.pointerId); ptr.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); last.current.moved = 0;
    if (ptr.current.size === 2) { const [a, b] = [...ptr.current.values()]; last.current.d = Math.hypot(a.x - b.x, a.y - b.y); } };
  const onMove = (e: React.PointerEvent) => {
    const p = ptr.current.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; ptr.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptr.current.size === 1) { last.current.moved += Math.abs(dx) + Math.abs(dy); setView(v => clamp({ ...v, x: v.x + dx, y: v.y + dy })); }
    else if (ptr.current.size === 2) {
      const [a, b] = [...ptr.current.values()], d = Math.hypot(a.x - b.x, a.y - b.y), r = box.current!.getBoundingClientRect();
      if (last.current.d) zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / last.current.d); last.current.d = d; last.current.moved += 10;
    }
  };
  const onUp = (e: React.PointerEvent) => { ptr.current.delete(e.pointerId); if (ptr.current.size < 2) last.current.d = 0; };
  useEffect(() => {
    const el = box.current!; const wheel = (e: WheelEvent) => { e.preventDefault(); const r = el.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.15 : 1 / 1.15); };
    el.addEventListener('wheel', wheel, { passive: false }); return () => el.removeEventListener('wheel', wheel);
  });

  const collect = (s: Spot) => {
    if (last.current.moved > 8) return;                             // that was a drag, not a tap
    setOpen(s); setTray(false);
    if (!found.includes(s.id)) { const v = [...found, s.id]; setFound(v); saveFound(site.id, v); }
  };
  const all = spots.length, got = spots.filter(s => found.includes(s.id)).length;
  const W = P.w * base * view.s, H = P.h * base * view.s;
  const castOf = (n: string) => site.cast.find(c => c.name === n)!;

  return <div className="pview" ref={box} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
    onDoubleClick={e => { const r = box.current!.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, view.s < 2.5 ? 1.8 : 1 / 3); }}>
    <div className="layer" style={{ width: W, height: H, transform: `translate(${view.x}px, ${view.y}px)` }}>
      <img src={P.f} alt={'A painting of ' + site.name.replace(/^The /, 'the ') + ', seen from the sky'} draggable={false} />
      {spots.map(s => {
        const f = found.includes(s.id), on = hover === s.id || open?.id === s.id;
        return <button key={s.id} className={'spot' + (f ? ' found' : '') + (on ? ' on' : '') + (hints || f ? '' : ' quiet')}
          style={{ left: s.x * W, top: s.y * H, width: 2 * s.r * W, height: 2 * s.r * W }}
          onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(h => h === s.id ? null : h)} onFocus={() => setHover(s.id)} onBlur={() => setHover(null)}
          onClick={e => { e.stopPropagation(); collect(s); }} aria-label={(f ? 'Found: ' : 'Find: ') + spotTitle(site, s)}>
          {(on || f) && <span className="tip">{f && '✓ '}{spotTitle(site, s)}</span>}
        </button>;
      })}
    </div>

    <button className="found-btn" onClick={() => setTray(t => !t)} aria-expanded={tray}>Found {got} of {all}</button>
    {tray && <div className="tray" role="dialog" aria-label="What you have found">
      <b>{got === all ? 'You found everything at ' + site.name.replace(/^The /, 'the ') + '!' : 'Find everything in the painting: hover or tap on it.'}</b>
      <ul>{spots.map(s => <li key={s.id} className={found.includes(s.id) ? 'got' : ''}>
        {found.includes(s.id) ? <button className="link" onClick={() => { setOpen(s); setTray(false); }}>✓ {spotTitle(site, s)}</button> : <span>?</span>}</li>)}</ul>
      {got > 0 && <button className="link small" onClick={() => { setFound([]); saveFound(site.id, []); }}>Start again</button>}
    </div>}

    {open && <aside className="panel spotcard">
      <button className="x" onClick={() => setOpen(null)} aria-label="Close">✕</button>
      <h2>{spotTitle(site, open)}</h2>
      {open.cast ? open.cast.map(n => { const c = castOf(n); return <section key={n}>
        {open.cast!.length > 1 && <h3>{c.name}</h3>}
        <p className="size">{sizeText(c, units)}</p>
        <p>{c.note.replace(/^./, x => x.toUpperCase())}.</p>
        {c.look && <p className="basis"><b>As reconstructed today:</b> {c.look.text}.</p>}
        {c.basis && <p className="basis"><b>{BASIS_WORDS[c.basis.k]}:</b> {c.basis.text}.</p>}
        <button className="link" onClick={() => onOpen3D(c.name)}>See it to scale in 3D →</button>
      </section>; })
      : <p>{open.text || (open.from ? site[open.from] : '')}</p>}
    </aside>}
  </div>;
}
