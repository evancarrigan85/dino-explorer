#!/usr/bin/env python3
"""Every picture made for Before Us is checked before a reader sees it (Evan, 25 Nov 2026: "every piece of artwork ...
goes through and verifies based on the scientific papers and evidence and inferences that we have, with the inspired
artwork theme and which version of the understanding ... but then it still has to evoke that emotional response").

THE REGISTRY  tools/paint/art.json — one entry per picture in use: what it shows (site, animal, event, ground, plants,
earth), its time, its file, the brief it was painted from, which VERSION of the science it follows (and the readings it
does not), its style, the hard checks it passed, the review, and the curator's sign-off.

THREE GATES
  1. Hard checks, by rule (tools/paint.py, at choose time): nothing that could not yet exist at its time (era rules);
     coasts that match the map (Earth pictures); an animal's shape inside the scientists' outline (IoU); sizes from data.
  2. The evidence review (here): a different model from the painter (Gemini 3.1 Pro, reading the picture) is given a
     checklist built from the data — what the evidence says must be there, what must not (era rules and the brief's
     "do not paint"), the version of the science it should follow — and answers item by item (shown / consistent /
     contradicted / cannot tell), lists any other mistake it sees, and scores the emotional response it should raise
     (wonder, life, light and atmosphere, clarity for a ten-year-old, a story that makes you ask more) with how to raise it
     without breaking the evidence. A picture with a contradicted "must not", or a contradicted core "must", fails.
  3. The curator (Evan) signs off: `python3 -I tools/review_art.py approve <id>` (or `reject <id> "why"`).
The page shows how each picture was checked; one that failed is not shown; one not yet signed off says so.

    python3 -I tools/review_art.py build             # (re)build the registry from the chosen pictures' records
    python3 -I tools/review_art.py review [id ...]   # review pictures (all not yet reviewed, or the ones named)
    python3 -I tools/review_art.py report            # what passed, what failed, what waits for sign-off
    python3 -I tools/review_art.py repair [id ...]   # paint failures again with the reviewer's objections, review each
                                                     # try, keep the best that passes (events, animals, the scene)
    python3 -I tools/review_art.py hold <id> "why"   # the builder keeps a picture out until it is reviewed again
    python3 -I tools/review_art.py approve <id> | reject <id> "why"

Cost: a review is one call to a text-and-vision model with a 1,600-pixel picture, about 2-3 cents (most of it the
model's thinking); logged in tools/paint/spend.jsonl with the token counts. REVIEW_MAX (default 60) caps the calls in one
run; a repair's painting is capped by paint.py's PAINT_MAX_CALLS and PAINT_BUDGET_USD, REPAIR_ROUNDS (default 3) tries each.
Order matters: zoom tiles (paint.py detail) are made only after a scene passes, since a repair repaints the scene.
"""
import sys, os, json, time, base64, io, subprocess, urllib.request, urllib.error
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REG = os.path.join(ROOT, 'tools', 'paint', 'art.json')
SPEND = os.path.join(ROOT, 'tools', 'paint', 'spend.jsonl')
PUB = os.path.join(ROOT, 'app', 'public')
REVIEWER = os.environ.get('REVIEW_MODEL', 'gemini-3.1-pro-preview')
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import importlib.util
_spec = importlib.util.spec_from_file_location('paint', os.path.join(ROOT, 'tools', 'paint.py')); paint = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(paint)


def load(): return json.load(open(REG)) if os.path.exists(REG) else {}
def save(r): json.dump(r, open(REG, 'w'), ensure_ascii=False, indent=1)
def jload(p): return json.load(open(p)) if os.path.exists(p) else None


# ── the registry ──────────────────────────────────────────────────────────────────────────────────────────────────────
def build():
    old, reg = load(), {}
    sites = paint.scenes()
    def keep(aid, entry):                                # keep review and sign-off if the picture itself has not changed
        prev = old.get(aid)
        if prev and prev.get('file') == entry['file'] and prev.get('sha') == entry.get('sha'):
            for k in ('review', 'approved', 'rejected', 'held'):
                if k in prev: entry[k] = prev[k]
        reg[aid] = entry
    for sid, s in sites.items():
        brief = s.get('paint') or {}
        env_version = {'text': 'The setting as described by the site review: %s %s' % (s['setting'], s['plants']), 'refs': [p for p in ('ibrahim2020b',)]}
        sc = jload(os.path.join(PUB, 'painted', 'scene-%s.json' % sid))
        BL = paint.brief_lines(sid)
        if sc and BL:                                    # the reconstruction brief: each decision the picture shows is an item to check
            D = [d for L in ('place', 'landscape', 'life', 'moment') for d in BL['brief']['layers'][L] if d.get('picture') or d.get('not')]
            musts = ['(%s) %s' % (d['status'], d['picture']) for d in D if d.get('picture') and d['status'] != 'imagined']
            musts += ['Sizes: %s is %s long; monkey-puzzle trees stand roughly 25-40 m tall' % (c['name'], c['size']) for c in s['cast'] if c.get('look')]
            alts = ' '.join(d['alternatives'] for d in D if d.get('alternatives'))
            keep('scene:' + sid, {'kind': 'scene', 'title': 'The painting of %s' % s['name'], 'file': sc['f'], 'sha': sha(sc['f']), 't': s['t'], 'style': 'Deep-Time History Painting',
                                  'brief': {'id': BL['brief']['id'], 'current_as_of': BL['brief']['current_as_of'], 'decisions': [d['id'] for d in D]},
                                  'context': 'The painter was free to imagine only: ' + '; '.join(BL['free']) + '. Everything else comes from the evidence.',
                                  'version': {'text': 'The site’s reconstruction brief, decision by decision (current as of %s)' % BL['brief']['current_as_of'], 'refs': sorted({k for d in D for k in d.get('refs', [])}), 'alternatives': alts or None},
                                  'must': musts, 'must_not': BL['not'] + [paint.era_rules(s['t'], False)], 'differs': sc.get('differs'), 'model': sc['model']})
        elif sc:
            musts = ['Land: ' + brief.get('land', ''), 'Water: ' + brief.get('water', ''), 'Plants: ' + brief.get('plants', ''), 'Light: ' + brief.get('light', '')]
            musts += ['%s, as reconstructed today: %s' % (c['name'], c['look']['text']) for c in s['cast'] if c.get('look')]
            musts += ['Sizes: %s is %s long; monkey-puzzle trees stand roughly 25-40 m tall' % (c['name'], c['size']) for c in s['cast'] if c.get('look')]
            keep('scene:' + sid, {'kind': 'scene', 'title': 'The painting of %s' % s['name'], 'file': sc['f'], 'sha': sha(sc['f']), 't': s['t'], 'style': 'knight',
                                  'version': env_version, 'must': musts, 'must_not': [brief.get('not', ''), paint.era_rules(s['t'], False)], 'differs': sc.get('differs'), 'model': sc['model']})
        gr = jload(os.path.join(PUB, 'ground', sid + '.json'))
        if gr:
            src = 'tools/paint/candidates/%s-ground/%s.jpg' % (sid, gr.get('candidate', 1))      # the painting the swatches were cut from
            keep('ground:' + sid, {'kind': 'ground', 'title': 'The painted ground of %s' % s['name'], 'file': gr['f'], 'review_file': src, 'sha': sha(gr['f']), 't': s['t'], 'style': 'knight',
                                   'context': 'Seen from high above on purpose: strips of this painting texture the ground of a 3D scene seen from the sky, under the 3D plants and animals.',
                                   'version': env_version, 'must': ['Land: ' + brief.get('land', ''), 'Water: ' + brief.get('water', '')], 'must_not': [brief.get('not', ''), paint.era_rules(s['t'], False)], 'model': gr['model']})
        for c in s['cast']:
            if not c.get('look') or not c.get('sil'): continue
            for ap in ('outline', 'free'):
                m = jload(os.path.join(PUB, 'painted', '%s-%s.json' % (c['sil'], ap)))
                if not m: continue
                hard = {'outline_iou': m.get('iou')} if ap == 'outline' else {}
                keep('animal:%s:%s' % (c['sil'], ap), {'kind': 'animal', 'title': '%s, painted %s' % (c['name'], 'in its outline' if ap == 'outline' else 'freely'), 'file': m['f'], 'sha': sha(m['f']),
                     't': s['t'], 'style': 'knight', 'site': sid, 'animal': c['name'], 'approach': ap, 'hard': hard,
                     'version': {'text': c['look'].get('version') or c['look']['text'], 'refs': c['look'].get('refs', []), 'alternatives': c['look'].get('alternatives')},
                     'must': ['%s as reconstructed today: %s' % (c['name'], c['look']['text'])], 'must_not': ['feathers or fur, unless the reconstruction above says so', 'any other animal', 'text'], 'model': m['model']})
        pl = jload(os.path.join(PUB, 'painted', sid + '-plants.json'))
        if pl:
            keep('plants:' + sid, {'kind': 'plants', 'title': 'The painted plants of %s' % s['name'], 'file': pl['f'], 'sha': sha(pl['f']), 't': s['t'], 'style': 'knight', 'version': env_version,
                                   'context': 'A sheet of four separate plants, cut out to be scattered over the ground of a 3D scene seen from the sky (the trees there are made separately). There is no landscape on purpose, and the background is empty. Judge only the plants.',
                                   'must': ['Four separate plants: a low, rounded, leafy shrub; a clump of ferns; a small low plant from the water\'s edge; a more open, spreading low shrub',
                                            'Every plant is of a kind that could grow there then. The place\'s plants: ' + brief.get('plants', '')], 'must_not': [brief.get('not', ''), paint.era_rules(s['t'], False)], 'model': 'gemini-3-pro-image'})
        ea = jload(os.path.join(PUB, 'earth', '%s-1-painted.json' % sid))
        if ea:
            keep('earth:' + sid, {'kind': 'earth', 'title': 'The Earth at the time of %s' % s['name'], 'file': ea['f'], 'sha': sha(ea['f']), 't': s['t'], 'style': 'knight',
                                  'version': {'text': "This atlas's own map of the time: plates (Merdith et al. 2021), seas (Kocsis & Scotese 2021), relief (Scotese & Wright 2018)", 'refs': ['merdith2021']},
                                  'hard': {'coasts': 'exact (shapes and colours from the map; brushwork only where it agrees)'},
                                  'context': 'The land and sea shapes are copied by rule from this atlas\'s plate model and seas map of the time, and checked by machine, not here: do not judge where the continents were. Judge only what was added on top (marks, symbols, objects, text) and the painting itself. The site is at the centre; the page marks it with its own ring.', 'must': ['A globe of the Earth as it was then, with the continents in their positions of that time'], 'must_not': ["today's continents and coastlines", 'text other than small map labels'], 'model': 'brush filter + gemini-3-pro-image texture'})
    evd = os.path.join(PUB, 'painted', 'events')
    for f in sorted(os.listdir(evd)) if os.path.isdir(evd) else []:
        if not f.endswith('.json'): continue
        e = json.load(open(os.path.join(evd, f)))
        sentences = [x.strip() + '.' for x in e['text'].replace('—', ',').split('. ') if len(x.strip()) > 12][:8]
        keep('event:' + e['id'], {'kind': 'event', 'title': e['title'], 'file': e['f'], 'sha': sha(e['f']), 't': e['t'], 'style': 'knight',
             'version': {'text': "This atlas's account of the event (its timeline and extinction text), from its verified papers", 'refs': []},
             'must': sentences, 'must_not': [paint.era_rules(e['t'], False) or 'nothing from a later or earlier time', 'text, labels, arrows or map lines'], 'differs': e.get('differs'), 'model': e['model']})
    save(reg); print('  registry: %d pictures (%s)' % (len(reg), ', '.join('%d %s' % (sum(1 for v in reg.values() if v['kind'] == k), k) for k in sorted({v['kind'] for v in reg.values()}))))


# ── the review ────────────────────────────────────────────────────────────────────────────────────────────────────────
SCHEMA = {'type': 'OBJECT', 'properties': {
    'items': {'type': 'ARRAY', 'items': {'type': 'OBJECT', 'properties': {
        'item': {'type': 'STRING'}, 'kind': {'type': 'STRING', 'enum': ['must', 'must_not', 'version']},
        'verdict': {'type': 'STRING', 'enum': ['shown', 'consistent', 'contradicted', 'cannot_tell']}, 'why': {'type': 'STRING'}}, 'required': ['item', 'kind', 'verdict', 'why']}},
    'other_errors': {'type': 'ARRAY', 'items': {'type': 'STRING'}},
    'emotion': {'type': 'OBJECT', 'properties': {k: {'type': 'INTEGER'} for k in ('wonder', 'life', 'light', 'clarity', 'story')}, 'required': ['wonder', 'life', 'light', 'clarity', 'story']},
    'emotion_notes': {'type': 'STRING'}, 'raise_it': {'type': 'STRING'}, 'style': {'type': 'STRING'}, 'differs': {'type': 'STRING'}},
    'required': ['items', 'other_errors', 'emotion', 'emotion_notes', 'raise_it', 'style', 'differs']}


def sha(f):
    return __import__('hashlib').sha256(open(os.path.join(PUB, f), 'rb').read()).hexdigest()[:12] if os.path.exists(os.path.join(PUB, f)) else None


def prompt(a):
    lines = ['You are reviewing one picture for Before Us, a natural-history atlas for children and families held to a museum '
             'standard: every claim must be traceable to published research, and where something is a guess the page says so.',
             'The picture: %s (%s), %s. It was painted by an image model in the manner of Charles R. Knight (oil, warm light, '
             'calm realism) but must follow TODAY\'s science.' % (a['title'], a['kind'], paint.when_words(a['t'])),
             'The version of the science it should follow: %s%s.' % (a['version']['text'], ('; other readings (not shown): ' + a['version']['alternatives']) if a['version'].get('alternatives') else ''),
             ] + (['What the picture is for: ' + a['context']] if a.get('context') else []) + ['', 'Check each item against what you SEE in the picture:']
    lines += ['MUST (from the evidence): ' + m for m in a['must'] if m]
    lines += ['MUST NOT: ' + m for m in a['must_not'] if m]
    lines += ['VERSION: does the picture follow the version of the science above?',
              '', 'For each item answer shown / consistent / contradicted / cannot_tell, with a short reason. For a MUST item: shown '
              '= it is clearly there, consistent = nothing in the picture goes against it, contradicted = the picture shows '
              'something else. For a MUST NOT item the verdict is about the RULE: consistent = the picture obeys it (the '
              'forbidden thing is absent), contradicted = ONLY if the forbidden thing IS in the picture. Be strict about '
              'anachronisms (plants or animals that did not exist yet), wrong anatomy for the version given, wrong sizes, '
              'and anything the evidence rules out. In other_errors list anything else that is wrong for the time and place. '
              'Then score, 1 (poor) to 5 (superb), the response it should raise in a curious ten-year-old and an adult: wonder '
              '(awe, scale, deep time), life (the place feels alive), light (light and atmosphere), clarity (one can read what '
              'is happening), story (it makes you want to know more). Say in raise_it how to raise those scores WITHOUT '
              'breaking the evidence, and in style how well it keeps Knight\'s manner. Last, in differs, write for the reader, in one '
              'or two short, plain sentences a curious ten-year-old can follow: where this picture is not what the evidence says, '
              'or where it shows a guess (what nobody knows). If nothing, write "Nothing we can see." Do not mention AI or a review.']
    if a.get('hard'): lines += ['(Already checked by rule, for your information: %s.)' % json.dumps(a['hard'])]
    return '\n'.join(lines)


def call(a):
    f = os.path.join(ROOT, a['review_file']) if a.get('review_file') else os.path.join(PUB, a['file'])
    im = Image.open(f).convert('RGB'); im.thumbnail((1600, 1600)); b = io.BytesIO(); im.save(b, 'JPEG', quality=88)
    body = {'contents': [{'role': 'user', 'parts': [{'text': prompt(a)}, {'inline_data': {'mime_type': 'image/jpeg', 'data': base64.b64encode(b.getvalue()).decode()}}]}],
            'generationConfig': {'responseMimeType': 'application/json', 'responseSchema': SCHEMA, 'temperature': 0.2}}
    req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent' % REVIEWER, data=json.dumps(body).encode(),
                                 headers={'x-goog-api-key': os.environ.get('GEMINI_API_KEY', ''), 'Content-Type': 'application/json'})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=300) as r: resp = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        msg = e.read().decode('utf-8', 'replace')[:300]; _log({'review': a['title'], 'model': REVIEWER, 'http': e.code, 'error': msg[:200]}); raise SystemExit('reviewer %s: %s' % (e.code, msg))
    u = resp.get('usageMetadata', {}); _log({'review': a['title'], 'model': REVIEWER, 'http': 200, 'ms': int((time.time() - t0) * 1000), 'usage': u,
                                           'est_usd': round(u.get('promptTokenCount', 0) * 2e-6 + u.get('candidatesTokenCount', 0) * 12e-6 + u.get('thoughtsTokenCount', 0) * 12e-6, 4)})
    return json.loads(resp['candidates'][0]['content']['parts'][0]['text'])


def _log(row):
    with open(SPEND, 'a') as f: f.write(json.dumps(dict(row, when=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()))) + '\n')


def verdict(r):
    bad_not = [i for i in r['items'] if i['kind'] == 'must_not' and i['verdict'] == 'contradicted']
    bad_must = [i for i in r['items'] if i['kind'] in ('must', 'version') and i['verdict'] == 'contradicted']
    emo = r['emotion']; avg = sum(emo.values()) / len(emo)
    status = 'fail' if bad_not or len(bad_must) >= 2 or (bad_must and r['other_errors']) else ('fix' if bad_must or r['other_errors'] else 'pass')
    return status, round(avg, 2)


def review(ids):
    reg = load(); todo = [k for k in (ids or reg) if k in reg and (ids or 'review' not in reg[k])]
    cap = int(os.environ.get('REVIEW_MAX', 60))
    for n, k in enumerate(todo[:cap]):
        a = reg[k]; r = call(a); status, emo = verdict(r)
        a['review'] = dict(r, status=status, emotion_avg=emo, reviewer=REVIEWER, date=time.strftime('%Y-%m-%d')); a.pop('held', None)
        save(reg)
        print('  %-36s %-4s emotion %.1f  %s' % (k, status, emo, '; '.join(i['item'][:40] + ' → ' + i['verdict'] for i in r['items'] if i['verdict'] == 'contradicted')[:150]))
    if len(todo) > cap: print('  %d more not reviewed (REVIEW_MAX=%d)' % (len(todo) - cap, cap))


# ── repair: paint again, with the reviewer's objections, until a picture passes ─────────────────────────────────────────
# A picture that fails is painted again with what the reviewer objected to added to the prompt ("do NOT repeat these
# mistakes"); every new candidate is reviewed with the same checklist; the best one that does not fail (pass before fix,
# then the higher emotion score) replaces the picture, with the reviewer's plain words on where it differs. A picture
# that still fails after REPAIR_ROUNDS tries stays out of the app. Spending is capped by paint.py (PAINT_MAX_CALLS,
# PAINT_BUDGET_USD) for the whole run. An event whose words still say "Under review." is reviewed again first, for them.
RANK = {'pass': 2, 'fix': 1, 'fail': 0}


def objections(r):
    return [i['why'] for i in r['items'] if i['verdict'] == 'contradicted'] + list(r.get('other_errors') or [])


def _avoid(notes):
    seen, out = set(), []
    for n in notes:
        n = n.strip().rstrip('.') + '.'
        if n not in seen: seen.add(n); out.append(n)
    return 'A scientific reviewer turned down an earlier painting of this. Do NOT repeat any of these mistakes: ' + ' '.join(out[-12:])


def _paint_again(k, a, notes):
    paint.AVOID = _avoid(notes) if notes else ''
    if a['kind'] == 'event': return paint.event_paint(k.split(':', 1)[1], 1, True)
    if a['kind'] == 'animal': return paint.animal(a['site'], a['animal'], a['approach'], 1, True)
    if a['kind'] == 'scene':
        sid = k.split(':', 1)[1]; cur = json.load(open(os.path.join(PUB, 'painted', 'scene-%s.json' % sid)))['candidate']
        paint.AVOID = ''
        return paint.scene_fix(sid, cur, _avoid(notes).replace('A scientific reviewer turned down an earlier painting of this. Do NOT repeat any of these mistakes: ', 'A scientific reviewer found these mistakes; correct them: '), 1, True)
    return []


def _take(k, a, fn, r, st, emo):
    """make candidate fn the picture for k, with its review; False if the pipeline's own rule refuses it (an outline)"""
    words = (r.get('differs') or '').strip() or 'Nothing we can see.'
    try:
        if a['kind'] == 'event': paint.choose_event(k.split(':', 1)[1], int(fn[:-4].rsplit('-', 1)[1]), words)
        elif a['kind'] == 'animal': paint.choose_animal(a['site'], a['animal'], a['approach'], int(fn[:-4].rsplit('-', 1)[1]))
        elif a['kind'] == 'scene': paint.choose_scene(k.split(':', 1)[1], int(os.path.basename(fn)[:-4]), words)
    except SystemExit as e:
        print('   ', e); return False
    a['sha'] = sha(a['file']); a['differs'] = words; a.pop('approved', None)
    a['review'] = dict(r, status=st, emotion_avg=emo, reviewer=REVIEWER, date=time.strftime('%Y-%m-%d'), candidate=os.path.relpath(fn, ROOT))
    return True


def repair(ids):
    reg = load(); rounds = int(os.environ.get('REPAIR_ROUNDS', 3))
    under = lambda a: a['kind'] == 'event' and str(a.get('differs') or '').startswith('Under review')
    todo = ids or [k for k, a in reg.items() if a.get('review') and (a['review']['status'] == 'fail' or under(a)) and not a.get('approved') and a['kind'] in ('event', 'animal', 'scene')]
    print('  to repair: %d' % len(todo))
    for k in todo:
        a = reg[k]; notes = objections(a['review']) if a.get('review') else []
        if under(a) and a['review']['status'] != 'fail':           # passed, but its words were never written: review again for them
            r = call(a); st, emo = verdict(r)
            if st != 'fail':
                ej = os.path.join(PUB, 'painted', 'events', k.split(':', 1)[1] + '.json'); e = json.load(open(ej))
                e['differs'] = (r.get('differs') or '').strip() or 'Nothing we can see.'; json.dump(e, open(ej, 'w'), ensure_ascii=False, indent=1)
                a['differs'] = e['differs']; a['review'] = dict(r, status=st, emotion_avg=emo, reviewer=REVIEWER, date=time.strftime('%Y-%m-%d'))
                save(reg); print('  %-34s %s on a second look; its words written' % (k, st)); continue
            notes += objections(r)
        best = None
        for n in range(rounds):
            try: fns = _paint_again(k, a, notes)
            except SystemExit as e: print('  stopped:', e); save(reg); return
            for fn in fns:
                r = call(dict(a, review_file=os.path.relpath(fn, ROOT))); st, emo = verdict(r)
                print('  %-34s try %d: %-4s emotion %.1f  %s' % (k, n + 1, st, emo, '; '.join(objections(r))[:110]))
                notes += objections(r)
                if st != 'fail' and (not best or (RANK[st], emo) > (RANK[best[2]], best[3])) and _take(k, a, fn, r, st, emo):
                    best = (fn, r, st, emo); save(reg)
            if best: break
        if not best: print('  %-34s still fails after %d tries: it stays out of the app' % (k, rounds))
    save(reg)


def report():
    reg = load(); rows = sorted(reg.items(), key=lambda kv: (kv[1].get('review', {}).get('status', 'z'), kv[0]))
    for k, a in rows:
        rv = a.get('review'); s = rv['status'] if rv else 'not reviewed'
        sign = 'approved' if a.get('approved') else ('REJECTED' if a.get('rejected') else 'HELD: ' + a['held']['why'][:40] if a.get('held') else 'awaiting sign-off')
        print('  %-36s %-12s %-18s %s' % (k, s, sign, ('emotion %.1f' % rv['emotion_avg']) if rv else ''))
        if rv and s != 'pass':
            for i in rv['items']:
                if i['verdict'] == 'contradicted': print('      ✗ %s — %s' % (i['item'][:70], i['why'][:120]))
            for e in rv['other_errors'][:3]: print('      ! %s' % e[:150])


def hold(k, why):
    """The builder keeps a picture out of the app until it is reviewed again (the reason is kept): e.g. when the rule it
    was checked against turns out to have been too loose. Not a review and not a sign-off; `review <id>` clears it."""
    reg = load(); a = reg.get(k) or sys.exit('no picture ' + k)
    a['held'] = {'why': why or '', 'date': time.strftime('%Y-%m-%d')}; save(reg); print('  %s held: %s' % (k, why))


def sign(k, ok, why=None):
    reg = load(); a = reg.get(k) or sys.exit('no picture ' + k)
    if ok: a['approved'] = {'by': 'Evan', 'date': time.strftime('%Y-%m-%d')}; a.pop('rejected', None)
    else: a['rejected'] = {'by': 'Evan', 'date': time.strftime('%Y-%m-%d'), 'why': why or ''}; a.pop('approved', None)
    save(reg); print('  %s %s' % (k, 'approved' if ok else 'rejected'))


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: sys.exit(__doc__)
    if a[0] == 'build': build()
    elif a[0] == 'review': review(a[1:])
    elif a[0] == 'report': report()
    elif a[0] == 'repair': repair(a[1:])
    elif a[0] == 'hold': hold(a[1], ' '.join(a[2:]))
    elif a[0] == 'approve': sign(a[1], True)
    elif a[0] == 'reject': sign(a[1], False, a[2] if len(a) > 2 else '')
    else: sys.exit(__doc__)
