// The Evidence (Evan, 25 Nov 2026): the reader lands on the painting; here they open it like a field notebook. Every part of
// the picture rests on decisions in the site's reconstruction brief (content/briefs/), each marked documented (a fossil
// or rock at this site shows it), inferred (several lines of evidence support it) or imagined (the painter's: the light,
// the moment), with its reason and the verified papers behind it.
import type { Brief, Decision, Status } from './types';

export const STATUS_WORDS: Record<Status, [string, string]> = {
  documented: ['Documented', 'a fossil or rock from this place shows it'],
  inferred: ['Inferred', 'researchers reason it from the evidence'],
  imagined: ['Imagined', 'the artist supplied it'],
};

export function Badge({ s }: { s: Status }) {
  return <span className={'badge ' + s} title={STATUS_WORDS[s][1]}>{STATUS_WORDS[s][0]}</span>;
}

export function DecisionCard({ d, brief }: { d: Decision; brief: Brief }) {
  return <li className={'decision ' + d.status}>
    <Badge s={d.status} /> <span className="says">{d.says}</span>
    {d.why && <p className="why">{d.why}</p>}
    {d.alternatives && <p className="alt"><b>Another reading:</b> {d.alternatives}</p>}
    {d.refs && d.refs.length > 0 && <p className="refs">{d.refs.map(k => { const r = brief.refs[k]; return r ?
      <a key={k} href={'https://doi.org/' + r.d} target="_blank" rel="noreferrer" title={r.t}>{r.a} {r.y}</a> : null; })}</p>}
  </li>;
}

/** decisions behind one part of the picture: those that name the spot, and the life decisions about the animals in it */
export function decisionsFor(brief: Brief, spot: string, cast: string[] = []) {
  const all = Object.values(brief.layers).flat();
  return all.filter(d => (d.spots || []).includes(spot) || (d.cast && cast.includes(d.cast) && !(d.spots || []).length));
}
/** the strongest claim made about a part of the picture: documented if anything there is documented */
export function strongest(ds: Decision[]): Status { return ds.some(d => d.status === 'documented') ? 'documented' : ds.some(d => d.status === 'inferred') ? 'inferred' : 'imagined'; }

export const QUESTIONS: { id: string; q: string; layers: (keyof Brief['layers'])[]; intro: string }[] = [
  { id: 'where', q: 'Where was this?', layers: ['place', 'landscape'], intro: 'Where the rocks are today, where that land was then, and what it was like.' },
  { id: 'what', q: 'What lived here?', layers: ['life'], intro: 'What is found in these rocks — and whether the evidence puts them together.' },
  { id: 'how', q: 'How do we know?', layers: ['discovery', 'moment'], intro: 'Who found it and who changed the picture — and what in this painting the artist supplied.' },
];

export function QuestionPanel({ brief, q, onClose }: { brief: Brief; q: typeof QUESTIONS[number]; onClose: () => void }) {
  const imagined = Object.values(brief.layers).flat().filter(d => d.status === 'imagined');
  return <aside className="panel evidence" role="dialog" aria-label={q.q}>
    <button className="x" onClick={onClose} aria-label="Close">✕</button>
    <h2>{q.q}</h2>
    <p className="intro">{q.intro}</p>
    {q.layers.map(L => <section key={L}>
      <h3>{({ place: 'Place and time', landscape: 'Landscape and climate', life: 'Life', moment: 'The moment in the picture', discovery: 'How we came to know it' } as const)[L]}</h3>
      <ul className="decisions">{brief.layers[L].map(d => <DecisionCard key={d.id} d={d} brief={brief} />)}</ul>
    </section>)}
    {q.id === 'how' && imagined.length > 0 && <section><h3>What the artist supplied</h3>
      <ul className="decisions">{imagined.map(d => <DecisionCard key={d.id} d={d} brief={brief} />)}</ul></section>}
    <p className="asof">Reconstruction brief current as of {brief.current_as_of}. <Badge s="documented" /> {STATUS_WORDS.documented[1]} · <Badge s="inferred" /> {STATUS_WORDS.inferred[1]} · <Badge s="imagined" /> {STATUS_WORDS.imagined[1]}.</p>
  </aside>;
}
