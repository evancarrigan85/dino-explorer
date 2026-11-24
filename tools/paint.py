#!/usr/bin/env python3
"""Paintings of the landscapes behind "Life at the site" (and later the periods), made with Google's image model.

THE RULE: the painting is the land, the water, the plants and the light, never an animal. The animals on top are the
scientists' silhouettes (tiles/sil), placed by the page and drawn to scale. A picture of the land is still a claim, so
each prompt is built from the scene's own data (`paint` in data_sites.js: what the paper says the land, water, plants
and climate were), with what must be left out, and every candidate is looked at by eye before one is chosen. The page
says the picture is AI-made, names the model and shows what it was asked for.

    python3 -I tools/paint.py site kemkem [--n 3] [--pro] [--size 1K|2K] [--dry-run]   # make candidates
    python3 -I tools/paint.py choose kemkem 2          # candidate 2 becomes tiles/scenes/kemkem.webp
    python3 -I tools/paint.py spent                    # what the log says was spent

THE API (checked against Google's docs in Sep 2026 for Groundwork's px/gemini.py, which this follows): the Interactions
API, POST /v1beta/interactions; the image comes back in `steps[].content[]`; output is set by a top-level
`response_format` with `image_size` "1K"/"2K" (capital K) and an `aspect_ratio`; only JPEG is returned.

THE KEY is a network secret on the environment (header x-goog-api-key, host generativelanguage.googleapis.com): the
proxy puts it on the request, so this script sends a placeholder unless GEMINI_API_KEY is set. Never write it in a file.

WHAT STOPS A RUNAWAY BILL (the lesson Groundwork paid $25 for on 19 Sep 2026):
  PAINT_MAX_CALLS   default 8      calls one run may make
  PAINT_BUDGET_USD  default 0.75   estimated dollars one run may spend
  --dry-run or PAINT_DRY_RUN=1     print each request and its price; send nothing, need no key
Every call (made, failed or refused) is one line in tools/paint/spend.jsonl, which is committed: counts and prices,
never the image.
"""
import sys, os, io, json, time, base64, hashlib, subprocess, urllib.request, urllib.error
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, 'tools', 'paint')
CAND = os.path.join(HERE, 'candidates')                 # not committed (see .gitignore): candidates waiting for a look
SPEND = os.path.join(HERE, 'spend.jsonl')
OUT = os.path.join(ROOT, 'tiles', 'scenes')
DATA = os.path.join(ROOT, 'tools', 'source', 'paintings-data.js')
ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions'
MODEL, MODEL_PRO = 'gemini-3.1-flash-image', 'gemini-3-pro-image'
# Google's prices as recorded in Groundwork's px/gemini.py (Google's page dated 16 Sep 2026), USD per output image
PRICE = {MODEL: {'1K': .067, '2K': .101}, MODEL_PRO: {'1K': .134, '2K': .134}}
DRY = '--dry-run' in sys.argv or os.environ.get('PAINT_DRY_RUN', '0').lower() not in ('', '0', 'false', 'no', 'off')
_calls, _spent = 0, 0.0

# One look for every painting, so the scenes read as one atlas: a museum diorama painting, not a film still.
STYLE = ('A landscape painting for a natural-history museum: gouache and watercolour on warm paper, soft natural light, '
         'muted earthy colours, gentle visible brushwork, calm and documentary rather than dramatic or cinematic. '
         'A wide view at eye level, as if standing on a low sandbank.')
LAYOUT = ('Use the attached sketch for the layout ONLY: the far bank and horizon run straight across the picture at about '
          '45% from the top; the river fills the band below it; a pale sandbank island sits right of centre in the river; '
          'a sandy near shore runs along the bottom edge. Keep the far bank low and level, and keep the sky open and plain, '
          'because small animal silhouettes will be placed on the bank, in the water and in the sky afterwards. '
          'Repaint everything: do not copy the sketch’s flat colours or shapes.')
NEVER = ('The picture must contain NO animals of any kind: no dinosaurs, reptiles, crocodiles, birds, pterosaurs, fish, '
         'insects or footprints; no people; no buildings, boats, roads or fences; no text, letters, signature, watermark, '
         'border or frame. Plants, land, water and sky only.')


def scenes():
    js = "console.log(JSON.stringify(require(%r).SITE_SCENES))" % os.path.join(ROOT, 'tools', 'source', 'data_sites.js')
    return {s['id']: s for s in json.loads(subprocess.check_output(['node', '-e', js]).decode())}


def prompt_for(s):
    p = s.get('paint')
    if not p: sys.exit('scene %s has no `paint` brief in data_sites.js' % s['id'])
    bits = [STYLE, LAYOUT,
            'The place: %s, %s.' % (s['where'], s['when']),
            'Land: %s.' % p['land'], 'Water: %s.' % p['water'], 'Plants: %s.' % p['plants'], 'Light and weather: %s.' % p['light'],
            'Do not paint: %s.' % p['not'], NEVER]
    return '\n'.join(bits)


def sketch(path):
    """The layout guide, 16:9. Its bands are the page's zones (drawSite in app.js), placed so that the page's
    width-fitted 2:1 crop of a 16:9 painting puts them where the page expects them."""
    W, H = 1600, 900
    y = lambda f: round(H * (0.0556 + 0.889 * f))         # canvas fraction -> picture row
    im = Image.new('RGB', (W, H), (236, 214, 170)); d = ImageDraw.Draw(im)
    d.rectangle([0, y(0.43), W, y(0.5)], fill=(176, 150, 98))                       # far bank
    d.rectangle([0, y(0.48), W, y(0.86)], fill=(98, 140, 156))                      # river
    d.ellipse([W * 0.57, y(0.585), W * 0.83, y(0.655)], fill=(226, 205, 150))       # sandbank island
    d.rectangle([0, y(0.86), W, H], fill=(199, 165, 104))                           # near shore
    im.save(path)
    return path


def log(row):
    os.makedirs(HERE, exist_ok=True)
    with open(SPEND, 'a') as f: f.write(json.dumps(dict(row, when=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()))) + '\n')


def call(body):
    global _calls, _spent
    usd = PRICE.get(body['model'], PRICE[MODEL_PRO]).get(body['response_format']['image_size'], .134)
    cap_n = int(os.environ.get('PAINT_MAX_CALLS', 8)); cap_usd = float(os.environ.get('PAINT_BUDGET_USD', .75))
    what = {'model': body['model'], 'size': body['response_format']['image_size'], 'refs': sum(1 for x in body['input'] if x['type'] == 'image'), 'est_usd': usd}
    if _calls + 1 > cap_n or _spent + usd > cap_usd + 1e-9:
        if not DRY: log(dict(what, refused='cap'))
        sys.exit('paint: the next call (~$%.3f) would pass this run\'s cap (%d calls, $%.2f; spent ~$%.2f). Nothing sent.\n'
                 '       Raise it on purpose: PAINT_MAX_CALLS=%d PAINT_BUDGET_USD=%.2f ...' % (usd, cap_n, cap_usd, _spent, cap_n * 2, cap_usd * 2))
    _calls += 1; _spent += usd
    if DRY:
        t = next(x['text'] for x in body['input'] if x['type'] == 'text')
        print('  DRY RUN  %s %s ~$%.3f  (%d chars of prompt, %d reference image)  — not sent' % (what['model'], what['size'], usd, len(t), what['refs']))
        return None
    req = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode(), method='POST',
                                 headers={'x-goog-api-key': os.environ.get('GEMINI_API_KEY', 'put-on-by-the-proxy'), 'Content-Type': 'application/json'})
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=240) as r: resp = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        msg = e.read().decode('utf-8', 'replace')[:600]; log(dict(what, http=e.code, error=msg[:200])); sys.exit('gemini %s: %s' % (e.code, msg))
    except Exception as e:
        log(dict(what, http=0, error=str(e)[:200])); sys.exit('gemini: %s — the request went out and may have been billed' % e)
    log(dict(what, http=200, ms=int((time.time() - t0) * 1000), usage=resp.get('usage')))
    return resp


def images(resp):
    out = []
    for st in (resp or {}).get('steps', []):
        for part in st.get('content', []) or []:
            if part.get('type') == 'image' and part.get('data'): out.append(base64.b64decode(part['data']))
    return out


def site(sid, n, pro, size):
    s = scenes().get(sid) or sys.exit('no scene ' + sid)
    text = prompt_for(s)
    os.makedirs(os.path.join(CAND, sid), exist_ok=True)
    ref = sketch(os.path.join(CAND, sid, 'layout.png'))
    os.makedirs(os.path.join(HERE, 'prompts'), exist_ok=True)
    open(os.path.join(HERE, 'prompts', sid + '.txt'), 'w').write(text)      # committed: what the model was asked, word for word
    body = {'model': MODEL_PRO if pro else MODEL,
            'input': [{'type': 'text', 'text': text}, {'type': 'image', 'mime_type': 'image/png', 'data': base64.b64encode(open(ref, 'rb').read()).decode()}],
            'response_format': {'type': 'image', 'mime_type': 'image/jpeg', 'image_size': size, 'aspect_ratio': '16:9'}}
    have = len([f for f in os.listdir(os.path.join(CAND, sid)) if f.endswith('.jpg')])
    for i in range(n):
        got = images(call(body))
        for b in got:
            have += 1; fn = os.path.join(CAND, sid, '%d.jpg' % have); open(fn, 'wb').write(b)
            json.dump({'model': body['model'], 'size': size, 'prompt': text, 'made': time.strftime('%Y-%m-%d')}, open(fn[:-4] + '.json', 'w'))
            print('  candidate', fn)
    print('  this run: %d call(s), ~$%.2f' % (_calls, _spent))


def choose(sid, k):
    src = os.path.join(CAND, sid, '%s.jpg' % k); meta = json.load(open(src[:-4] + '.json'))
    os.makedirs(OUT, exist_ok=True)
    im = Image.open(src).convert('RGB')
    if im.width > 1600: im = im.resize((1600, round(im.height * 1600 / im.width)), Image.LANCZOS)
    dst = os.path.join(OUT, sid + '.webp'); im.save(dst, 'WEBP', quality=82, method=6)
    old = open(DATA).read() if os.path.exists(DATA) else ''
    cur = json.loads(old[old.index('{', old.index('const PAINT')):old.rindex('}') + 1]) if 'const PAINT' in old else {}
    cur[sid] = {'f': 'tiles/scenes/%s.webp' % sid, 'w': im.width, 'h': im.height, 'model': meta['model'], 'made': meta['made'],
                'prompt': meta['prompt'], 'sha': hashlib.sha256(open(dst, 'rb').read()).hexdigest()[:12]}
    open(DATA, 'w').write('/* Paintings of the scenes — GENERATED by tools/paint.py choose. AI-made landscapes (no animals), each checked by\n'
                          '   eye against its scene’s data; the page says so and shows the prompt. Pictures in tiles/scenes/. */\n'
                          'const PAINT = ' + json.dumps(cur, ensure_ascii=False, indent=1) + ';\n')
    print('  %s ← candidate %s (%d KB)' % (dst, k, os.path.getsize(dst) // 1024))


def spent():
    rows = [json.loads(l) for l in open(SPEND)] if os.path.exists(SPEND) else []
    ok = [r for r in rows if r.get('http') == 200]
    print('  %d calls logged, %d made an image, ~$%.2f estimated' % (len(rows), len(ok), sum(r.get('est_usd', 0) for r in ok)))


if __name__ == '__main__':
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    opt = lambda k, d: sys.argv[sys.argv.index(k) + 1] if k in sys.argv else d
    if not a: sys.exit(__doc__)
    if a[0] == 'site': site(a[1], int(opt('--n', 3)), '--pro' in sys.argv, opt('--size', '1K'))
    elif a[0] == 'choose': choose(a[1], a[2])
    elif a[0] == 'spent': spent()
    else: sys.exit(__doc__)
