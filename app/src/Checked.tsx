// How a picture was checked (tools/review_art.py): the version of the science it follows, every item of its evidence
// checklist with the reviewer's verdict, anything else the reviewer saw, the curator's sign-off — and, kept apart, how
// the reviewer felt it works on a viewer.
export interface Check { status: 'pass' | 'fix'; reviewer: string; date: string; approved: boolean; version: { text: string; refs?: string[]; alternatives?: string | null };
  items: { item: string; kind: string; verdict: 'shown' | 'consistent' | 'contradicted' | 'cannot_tell'; why: string }[]; other: string[];
  emotion: Record<string, number>; emotionNotes: string; hard: Record<string, unknown> | null }
const MARK = { shown: '✓', consistent: '✓', contradicted: '✗', cannot_tell: '?' } as const;

export function Checked({ c }: { c: Check }) {
  return <details className="checked">
    <summary>How this picture was checked {c.status === 'pass' ? '· passed' : '· passed with fixes noted'} · {c.approved ? 'signed off by the curator' : 'awaiting the curator’s sign-off'}</summary>
    <p><b>The science it follows:</b> {c.version.text}.{c.version.alternatives ? <> <i>Other readings:</i> {c.version.alternatives}.</> : null}</p>
    {c.hard && <p><b>Checked by rule:</b> {Object.entries(c.hard).map(([k, v]) => `${k.replace('_', ' ')}: ${typeof v === 'number' ? Math.round(v * 100) + '%' : v}`).join('; ')}.</p>}
    <p><b>Checked against the evidence</b> by an AI reviewer ({c.reviewer}, a different model from the painter), {c.date}:</p>
    <ul className="items">{c.items.map((i, n) => <li key={n} className={i.verdict}><span>{MARK[i.verdict]}</span> {i.item.length > 140 ? i.item.slice(0, 140) + '…' : i.item}<small> — {i.why}</small></li>)}</ul>
    {c.other.length > 0 && <p><b>Also noticed:</b> {c.other.join(' ')}</p>}
    <p className="feel"><b>How it works on a viewer</b> (the reviewer, out of 5): wonder {c.emotion.wonder} · life {c.emotion.life} · light {c.emotion.light} · clarity {c.emotion.clarity} · story {c.emotion.story}. {c.emotionNotes}</p>
  </details>;
}
