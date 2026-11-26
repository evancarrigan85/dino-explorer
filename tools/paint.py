#!/usr/bin/env python3
"""Paintings of the landscapes behind "Life at the site" (and later the periods), made with Google's image model.

THE RULE: the painting is the land, the water, the plants and the light, never an animal. The animals on top are the
scientists' silhouettes (tiles/sil), placed by the page and drawn to scale. A picture of the land is still a claim, so
each prompt is built from the scene's own data (`paint` in data_sites.js: what the paper says the land, water, plants
and climate were), with what must be left out, and every candidate is looked at by eye before one is chosen. The page
says the picture is AI-made, names the model and shows what it was asked for.

    python3 -I tools/paint.py site kemkem [--n 3] [--pro] [--size 1K|2K] [--dry-run]   # make candidates
    python3 -I tools/paint.py choose kemkem 2          # candidate 2 becomes tiles/scenes/kemkem.webp
    python3 -I tools/paint.py ground kemkem --guide g.png [--n 2] [--pro] [--size 2K]   # the ground of a living scene
    python3 -I tools/paint.py choose-ground kemkem 1   # candidate 1 becomes the scene's ground swatches (app/public/ground/)
        (add --style knight to `ground`: Charles R. Knight's manner, drawn with today's science; see docs/ART.md)
    python3 -I tools/paint.py earth kemkem [--n 1] [--pro]     # the Earth opening (globe, region), repainted in Knight's manner
    python3 -I tools/paint.py choose-earth kemkem 1 2         # view 1, candidate 2 → app/public/earth/kemkem-1-painted.jpg,
                                                               #   only if its coasts still match the map (land/sea agreement)
    python3 -I tools/paint.py spent                    # what the log says was spent
    python3 -I tools/paint.py check                    # is the key accepted, and can it see the image models? (free)

THE API (checked against Google's docs in Sep 2026 for Groundwork's px/gemini.py, which this follows): the Interactions
API, POST /v1beta/interactions; the image comes back in `steps[].content[]`; output is set by a top-level
`response_format` with `image_size` "1K"/"2K" (capital K) and an `aspect_ratio`; only JPEG is returned.

THE KEY: on a Mac, `export GEMINI_API_KEY=...` in the shell (Groundwork already does); in a cloud session, a network
secret on the environment (header x-goog-api-key, host generativelanguage.googleapis.com) that the proxy puts on the
request, so this script then sends a placeholder. Never write it in a file. Newer Google keys start "AQ." rather than
"AIza"; `check` tries the x-goog-api-key header and then Authorization: Bearer, and says which one this key needs
(set PAINT_AUTH=bearer if it is the second).

WHAT STOPS A RUNAWAY BILL (the lesson Groundwork paid $25 for on 19 Sep 2026):
  PAINT_MAX_CALLS   default 8      calls one run may make
  PAINT_BUDGET_USD  default 0.75   estimated dollars one run may spend
  --dry-run or PAINT_DRY_RUN=1     print each request and its price; send nothing, need no key
Every call (made, failed or refused) is one line in tools/paint/spend.jsonl, which is committed: counts and prices,
never the image.
"""
import sys, os, io, json, time, base64, hashlib, subprocess, urllib.request, urllib.error
from PIL import Image, ImageDraw, ImageFilter

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


# The reconstruction brief (content/briefs/<site>.json, Evan, 25 Nov: "the research builds the world before the artist
# enters it"): the painter is told each decision with its status — what is documented and inferred it must show as given;
# what is imagined (the light, the moment) is its own to make, within the evidence; what the brief leaves out it must not
# paint. The art reviewer checks the picture against the same decisions (tools/review_art.py).
HISTORY = ('Deep-Time History Painting: the force and composition of a great history painting — light, gesture and the '
           'shape of the land arranged so the eye knows where to land first and what to find next, the landscape part of '
           'what is happening — painted with the calm naturalism of the classic natural-history muralists (in the manner '
           'of Charles R. Knight), and following TODAY\'s science exactly as described here. Find the drama in what the '
           'evidence holds; add no event it does not.')


def brief(sid):
    p = os.path.join(ROOT, 'content', 'briefs', sid + '.json')
    return json.load(open(p)) if os.path.exists(p) else None


def brief_lines(sid):
    """The brief's decisions as the painter needs them: what to show (documented and inferred, as given), what is the
    painter's own (imagined), and what must not be painted."""
    B = brief(sid)
    if not B: return None
    D = [d for L in ('place', 'landscape', 'life', 'moment') for d in B['layers'][L]]
    must = [d['picture'] for d in D if d.get('picture') and d['status'] != 'imagined']
    free = [d['picture'] if d.get('picture') else d['says'] for d in D if d['status'] == 'imagined']
    nots = [d['not'] for d in D if d.get('not')]
    return {'must': must, 'free': free, 'not': nots, 'brief': B}


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
    req = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode(), method='POST', headers=dict(auth(), **{'Content-Type': 'application/json'}))
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=240) as r: resp = json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        msg = e.read().decode('utf-8', 'replace')[:600]; log(dict(what, http=e.code, error=msg[:200])); sys.exit('gemini %s: %s' % (e.code, msg))
    except Exception as e:
        log(dict(what, http=0, error=str(e)[:200])); sys.exit('gemini: %s — the request went out and may have been billed' % e)
    log(dict(what, http=200, ms=int((time.time() - t0) * 1000), usage=resp.get('usage')))
    return resp


def auth(how=None):
    key = os.environ.get('GEMINI_API_KEY', 'put-on-by-the-proxy')
    return {'Authorization': 'Bearer ' + key} if (how or os.environ.get('PAINT_AUTH', '')) == 'bearer' else {'x-goog-api-key': key}


def check():
    """A free call (list the models) to see whether the key works, and how it must be sent."""
    if DRY: print('  DRY RUN: would GET /v1beta/models with the key (free). Not sent.'); return
    for how in ('header', 'bearer'):
        req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', headers=auth(how))
        try:
            with urllib.request.urlopen(req, timeout=30) as r: names = [m.get('name', '') for m in json.loads(r.read().decode()).get('models', [])]
        except urllib.error.HTTPError as e:
            print('  %s: refused (%s) %s' % ('x-goog-api-key' if how == 'header' else 'Authorization: Bearer', e.code, e.read().decode('utf-8', 'replace')[:160].replace('\n', ' '))); continue
        print('  the key works, sent as %s; %d models visible' % ('x-goog-api-key' if how == 'header' else 'Authorization: Bearer (set PAINT_AUTH=bearer)', len(names)))
        for m in (MODEL, MODEL_PRO): print('    %-26s %s' % (m, 'visible' if any(n.endswith('/' + m) for n in names) else 'NOT visible (billing? region? name changed?)'))
        return
    sys.exit('  the key was refused both ways: check it was copied whole, and that its project has billing turned on')


def images(resp):
    out = []
    for st in (resp or {}).get('steps', []):
        for part in st.get('content', []) or []:
            if part.get('type') == 'image' and part.get('data'): out.append(base64.b64decode(part['data']))
    return out


# The ground of a living scene (app/): the site's land seen from straight above, repainted richly from the app's own
# guide map (#/guide/<site>: the same land the 3D scene is built from), so every boundary stays where the scene has it.
# The trees, animals and moving water are added by the scene; the painting is the ground and the river bed only.
GROUND_STYLE = ('A richly detailed natural-history painting of a landscape seen from directly above, in the tradition of the '
                'hand-painted relief maps and museum diorama backgrounds of the twentieth century: gouache and watercolour on '
                'warm paper, natural earthy colours, soft hazy afternoon light, and fine, careful texture everywhere — '
                'grains and small pebbles on the gravel bars, ripple marks left by the current on the low sand, darker damp '
                'sand along every edge of the water, silt swirls and sand waves on the bed of the shallow river showing '
                'through brownish-green water, layered reddish sandstone on the face of the far bank, a few small low green '
                'plants near the water. Calm, documentary and precise, not dramatic or cinematic.')
GROUND_LAYOUT = ('The attached picture is the guide map of this place, seen from straight above. Keep EVERY boundary exactly '
                 'where it is in the guide: blue is water (darker blue is deeper), beige is sand, the darker grey-brown patches '
                 'are gravel bars, the red band is the sandstone face of the far bank, the light brown above it is the level top '
                 'of the far bank. Do not move, add or remove any river channel, bank, island or bar. Repaint everything: do not '
                 'copy the guide\'s flat colours.')
GROUND_NEVER = ('Seen from straight above only: no horizon, no sky, no perspective. NO trees or tall plants (they are added '
                'separately), no tree shadows, NO animals of any kind, no footprints, no people, no buildings, no text, '
                'labels, border or frame.')


# Charles R. Knight (1874–1953) is named on purpose: he died in 1953 and much of his work is public domain, and
# docs/ART.md never allows a living artist's name. His manner; today's science: the brief (from the papers) decides
# what is painted (Evan, 25 Nov: "Charles Knight style but today's interpretations").
KNIGHT = ('Painted in the manner of Charles R. Knight (1874–1953), the American natural-history muralist: oil on canvas, '
          'confident visible brushwork, warm golden naturalistic light, soft atmospheric haze, a palette of ochres, siennas, '
          'olive greens and dusty blues, calm and dignified realism. Keep his warmth and his eye for the real world, but follow '
          "TODAY's science, not the science of his time: paint the land, water, plants and climate exactly as described here.")
# Nothing written: the painter imitates a muralist's signature in a corner unless told not to (the reviewer caught it on
# 9 of the first 32 event paintings, 25 Nov 2026).
NO_TEXT = 'No text of any kind: no signature, monogram, initials or date (not even small, in a corner), no labels, map lines, arrows, border or frame.'
# What a reviewer objected to in an earlier painting of the same subject (set by tools/review_art.py repair): added to the
# prompt so the next try does not repeat it.
AVOID = ''
GROUND_KNIGHT = ('A richly detailed painting of a landscape seen from directly above. ' + KNIGHT + ' Fine, careful texture '
                 'everywhere: grains and small pebbles on the gravel bars, ripple marks left by the current on the low sand, '
                 'darker damp sand along every edge of the water, silt swirls and sand waves on the bed of the shallow river '
                 'showing through brownish-green water, layered reddish sandstone on the face of the far bank, a few small low '
                 'green plants near the water.')


def ground(sid, guide, n, pro, size, style=None):
    s = scenes().get(sid) or sys.exit('no scene ' + sid)
    p = s.get('paint') or sys.exit('scene %s has no `paint` brief' % sid)
    text = '\n'.join([GROUND_KNIGHT if style == 'knight' else GROUND_STYLE, GROUND_LAYOUT, 'The place: %s, %s.' % (s['where'], s['when']),
                      'Land: %s.' % p['land'], 'Water: %s.' % p['water'], 'Light: %s.' % p['light'],
                      'Do not paint: %s.' % p['not'], GROUND_NEVER])
    d = os.path.join(CAND, sid + '-ground'); os.makedirs(d, exist_ok=True)
    os.makedirs(os.path.join(HERE, 'prompts'), exist_ok=True)
    open(os.path.join(HERE, 'prompts', sid + '-ground' + ('-' + style if style else '') + '.txt'), 'w').write(text)
    body = {'model': MODEL_PRO if pro else MODEL,
            'input': [{'type': 'text', 'text': text}, {'type': 'image', 'mime_type': 'image/png', 'data': base64.b64encode(open(guide, 'rb').read()).decode()}],
            'response_format': {'type': 'image', 'mime_type': 'image/jpeg', 'image_size': size, 'aspect_ratio': '16:9'}}
    have = len([f for f in os.listdir(d) if f.endswith('.jpg')])
    for i in range(n):
        for b in images(call(body)):
            have += 1; fn = os.path.join(d, '%d.jpg' % have); open(fn, 'wb').write(b)
            json.dump({'model': body['model'], 'size': size, 'prompt': text, 'style': style, 'made': time.strftime('%Y-%m-%d')}, open(fn[:-4] + '.json', 'w'))
            print('  candidate', fn)
    print('  this run: %d call(s), ~$%.2f' % (_calls, _spent))


# The Earth opening of a living scene, repainted: the pictures app/scripts/capture-earth.cjs takes of this atlas's own
# globe at the site's time (1: the globe, 2: the region), painted in Knight's manner. A coastline is a claim, so a
# painting is used only if its land and sea still match the map's (choose-earth measures it and refuses below 92%).
EARTH_VIEWS = {1: 'the whole planet seen from space', 2: 'one region of it seen from high above'}


def earth_prompt(s, view):
    return '\n'.join([
        'The attached picture is a scientific map of the Earth %s (%s), made from reconstructions of where the continents, '
        'seas and mountains were at that time.' % (s['when'], EARTH_VIEWS[view]),
        'Repaint it as a view of the real planet. ' + KNIGHT,
        'Deep blue open ocean; lighter turquoise shallow seas over the drowned edges of the continents; land in ochres and '
        'olive greens, darker green where it was wetter, paler where it was dry; a few thin wisps of white cloud that do not '
        'hide any coast' + ('; a thin glow of blue atmosphere at the edge of the globe; black space around it' if view == 1 else '') + '.',
        'Keep EVERY coastline, sea, island, shallow sea and mountain range exactly where and as it is: this is a scientific '
        'map. Do not move, add or remove any land.',
        "Remove the map's text labels, its round pins and any grid lines. No text, labels, borders, frame or animals."])


def earth(sid, n, pro):
    s = scenes().get(sid) or sys.exit('no scene ' + sid)
    d = os.path.join(CAND, sid + '-earth'); os.makedirs(d, exist_ok=True); os.makedirs(os.path.join(HERE, 'prompts'), exist_ok=True)
    for view in (1, 2):
        src = os.path.join(ROOT, 'app', 'public', 'earth', '%s-%d.jpg' % (sid, view))
        text = earth_prompt(s, view); open(os.path.join(HERE, 'prompts', '%s-earth-%d.txt' % (sid, view)), 'w').write(text)
        body = {'model': MODEL_PRO if pro else MODEL,
                'input': [{'type': 'text', 'text': text}, {'type': 'image', 'mime_type': 'image/jpeg', 'data': base64.b64encode(open(src, 'rb').read()).decode()}],
                'response_format': {'type': 'image', 'mime_type': 'image/jpeg', 'image_size': '2K' if pro else '1K', 'aspect_ratio': '1:1'}}
        for i in range(n):
            for b in images(call(body)):
                k = len([f for f in os.listdir(d) if f.startswith('%d-' % view) and f.endswith('.jpg')]) + 1
                fn = os.path.join(d, '%d-%d.jpg' % (view, k)); open(fn, 'wb').write(b)
                json.dump({'model': body['model'], 'prompt': text, 'made': time.strftime('%Y-%m-%d')}, open(fn[:-4] + '.json', 'w'))
                print('  candidate', fn)
    print('  this run: %d call(s), ~$%.2f' % (_calls, _spent))


def _sea(im, globe):
    # sea (True) or land per pixel, by colour; for the globe, only inside its disc
    import numpy as np
    a = np.asarray(im.convert('RGB').resize((600, 600), Image.LANCZOS)).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    sea = (b > r + 18) & (b >= g - 10)
    yy, xx = np.mgrid[0:600, 0:600]
    inside = ((xx - 300) ** 2 + (yy - 300) ** 2 < (300 * 0.86) ** 2) if globe else np.ones((600, 600), bool)
    return sea, inside


def choose_earth(sid, view, k):
    view = int(view); src = os.path.join(ROOT, 'app', 'public', 'earth', '%s-%d.jpg' % (sid, view))
    cand = os.path.join(CAND, sid + '-earth', '%d-%s.jpg' % (view, k)); meta = json.load(open(cand[:-4] + '.json'))
    a, inside = _sea(Image.open(src), view == 1); b, _ = _sea(Image.open(cand), view == 1)
    agree = float(((a == b) & inside).sum() / inside.sum())
    print('  land/sea agreement with the map: %.1f%%' % (100 * agree))
    if agree < 0.92: sys.exit('  refused: the painting moved the coasts too much (needs 92%). Choose another candidate or paint again.')
    out = os.path.join(ROOT, 'app', 'public', 'earth', '%s-%d-painted.jpg' % (sid, view))
    Image.open(cand).convert('RGB').resize((1400, 1400), Image.LANCZOS).save(out, 'JPEG', quality=86)
    json.dump({'f': 'earth/%s-%d-painted.jpg' % (sid, view), 'model': meta['model'], 'made': meta['made'], 'prompt': meta['prompt'],
               'agreement': round(agree, 3)}, open(out[:-4] + '.json', 'w'), ensure_ascii=False, indent=1)
    print('  %s ← candidate %s' % (out, k))


def earth_brush(sid):
    """The Earth opening with a painted look and NOT ONE coast moved. The image model's repaints (`earth`) pulled the
    ancient continents toward today's (25 Nov 2026: 76-89% land/sea agreement, all refused), so the picture is put
    together instead: the SHAPES and COLOURS are the atlas's own map (softened by a small oil-paint brush filter,
    Kuwahara: each pixel takes the calmest of the four squares around it); the BRUSHWORK is the light and shade of the
    Knight-manner repaint (its texture only, relative to its own blur), used only where the repaint agrees with the map
    about land and sea; then a warm grade and a faint canvas grain. Every coast and shelf sea is exactly as mapped."""
    import numpy as np
    W3 = np.array([0.299, 0.587, 0.114]); lumf = lambda x: np.einsum('...c,c->...', x, W3)
    for view in (1, 2):
        src = os.path.join(ROOT, 'app', 'public', 'earth', '%s-%d.jpg' % (sid, view))
        a = np.asarray(Image.open(src).convert('RGB').resize((1400, 1400), Image.LANCZOS)).astype(np.float64) / 255
        r = 3
        lum = lumf(a)
        def box(x):        # mean over every (r+1)x(r+1) square, by summed-area table; result[y, x] = square ending at (y, x)
            s = np.pad(x, ((1, 0), (1, 0)) + ((0, 0),) * (x.ndim - 2)).cumsum(0).cumsum(1)
            k = r + 1; return (s[k:, k:] - s[:-k, k:] - s[k:, :-k] + s[:-k, :-k]) / (k * k)
        mean, var = box(a), box(lum ** 2) - box(lum) ** 2
        H, W = lum.shape; best = np.full((H, W), np.inf); out = np.zeros_like(a)
        for dy in (0, r):                                    # the four squares: up-left, up-right, down-left, down-right
            for dx in (0, r):
                ys = np.clip(np.arange(H) - r + dy, 0, mean.shape[0] - 1); xs = np.clip(np.arange(W) - r + dx, 0, mean.shape[1] - 1)
                m, v = mean[np.ix_(ys, xs)], var[np.ix_(ys, xs)]
                pick = v < best; best = np.where(pick, v, best); out[pick] = m[pick]
        # the brushwork of the best-agreeing Knight-manner repaint, where it agrees with the map about land and sea
        cands = sorted(f for f in os.listdir(os.path.join(CAND, sid + '-earth')) if f.startswith('%d-' % view) and f.endswith('.jpg')) if os.path.isdir(os.path.join(CAND, sid + '-earth')) else []
        best_c, best_agree = None, 0
        for f in cands:
            sm, inside = _sea(Image.open(src), view == 1); sc, _ = _sea(Image.open(os.path.join(CAND, sid + '-earth', f)), view == 1)
            ag = float(((sm == sc) & inside).sum() / inside.sum())
            if ag > best_agree: best_c, best_agree = f, ag
        used = None
        if best_c:
            p = np.asarray(Image.open(os.path.join(CAND, sid + '-earth', best_c)).convert('RGB').resize((1400, 1400), Image.LANCZOS)).astype(np.float64) / 255
            pl = lumf(p); blur = np.asarray(Image.fromarray((pl * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(9))).astype(np.float64) / 255
            detail = np.clip(pl / np.maximum(blur, 0.05), 0.72, 1.3)
            mask = lambda im: np.asarray(Image.fromarray(im).resize((1400, 1400), Image.NEAREST))
            sm, _ = _sea(Image.open(src), False); sc, _ = _sea(Image.open(os.path.join(CAND, sid + '-earth', best_c)), False)
            same = mask(((sm == sc) * 255).astype(np.uint8)) > 127
            # ... and never over a mark the painter was shown but the map no longer has (the old capture's animal pins,
            # painted into eyes: <view>-marks.png, white where the brushwork must not be used)
            mk = os.path.join(CAND, sid + '-earth', '%d-marks.png' % view)
            if os.path.exists(mk): same &= ~(np.asarray(Image.open(mk).convert('L').resize((1400, 1400), Image.NEAREST)) > 127)
            soft = np.asarray(Image.fromarray((same * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))).astype(np.float64) / 255
            out = out * (1 + (detail - 1) * soft * 0.9)[..., None]
            used = best_c
        out = out * np.array([1.05, 1.0, 0.9])               # warm, as in Knight's murals
        g = lumf(out); out = g[..., None] + (out - g[..., None]) * 0.92
        out = (out - 0.5) * 1.06 + 0.5
        rng_ = np.random.default_rng(97 + view)              # canvas grain: fixed seed, the same picture every time
        out += (rng_.normal(0, 0.012, (H, W)))[..., None]
        dst = os.path.join(ROOT, 'app', 'public', 'earth', '%s-%d-painted.jpg' % (sid, view))
        Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(dst, 'JPEG', quality=86)
        json.dump({'f': 'earth/%s-%d-painted.jpg' % (sid, view),
                   'method': "this atlas's own map (shapes and colours, every coast exactly as mapped), softened by an oil-paint brush filter, with the brushwork of a Charles R. Knight-manner repaint by Gemini 3 Pro Image where it agrees with the map, and a warm grade",
                   'texture_from': used, 'texture_agreement': round(best_agree, 3) if used else None, 'made': time.strftime('%Y-%m-%d')},
                  open(dst[:-4] + '.json', 'w'), ensure_ascii=False, indent=1)
        print('  %s (texture from %s, %.1f%% agreement)' % (dst, used, 100 * best_agree) if used else '  %s (brush filter only)' % dst)


# Animals in Knight's manner, as reconstructed today (Evan, 25 Nov: "do a few dinosaurs ... in a few different approaches").
# Two approaches, to compare:
#   outline — the scientists' own silhouette (PhyloPic, the same one the scene draws) is the shape guide; the painting is
#             cut to that exact outline, and refused if the painted animal strays from it (IoU below 0.8);
#   free    — painted from the brief alone, side on; cut out from its plain background. Its shape is the model's.
# The brief is `look` in data_sites.js; colours are not known and the brief says so. Never the only picture of an animal:
# the page says which approach a picture is, by which model, and keeps the silhouette's credit.
def _animal(sid, name):
    s = scenes().get(sid) or sys.exit('no scene ' + sid)
    c = next((c for c in s['cast'] if c['name'] == name), None) or sys.exit('no animal %s at %s' % (name, sid))
    if not c.get('look'): sys.exit('%s has no `look` brief in data_sites.js' % name)
    return s, c


def _outline_guide(key):
    """the silhouette as a black shape on white, centred in 16:9, and where it sits (to cut the painting back out)"""
    sil = Image.open(os.path.join(ROOT, 'tiles', 'sil', key + '.png')).convert('LA')
    W, H = 1600, 900; sc = min(W * 0.84 / sil.width, H * 0.74 / sil.height)
    w, h = round(sil.width * sc), round(sil.height * sc); x, y = (W - w) // 2, (H - h) // 2
    alpha = sil.getchannel('A').resize((w, h), Image.LANCZOS)
    g = Image.new('L', (W, H), 255); g.paste(0, (x, y, x + w, y + h), alpha)
    return g.convert('RGB'), (x, y, w, h), alpha


def animal(sid, name, approach, n, pro):
    s, c = _animal(sid, name)
    bg = 'A plain, flat, pure white background: no ground, no shadow, no scenery, no other animals. ' + NO_TEXT + ((' ' + AVOID) if AVOID else '')
    if approach == 'outline':
        guide, _, _ = _outline_guide(c['sil'])
        text = '\n'.join(['The attached picture is the scientists\' outline (silhouette) of %s, seen from the side.' % name,
                          'Paint this animal alive, filling EXACTLY this outline: keep every edge where it is (snout, jaws, head, '
                          'neck, back, legs, feet, arms, tail); add nothing outside it and leave none of it empty.', KNIGHT,
                          'How %s is reconstructed today: %s.' % (name, c['look']['text']),
                          'Warm afternoon light from the upper left, as in the rest of the scene. ' + bg])
        inp = [{'type': 'text', 'text': text}, {'type': 'image', 'mime_type': 'image/png', 'data': base64.b64encode(_png(guide)).decode()}]
    else:
        text = '\n'.join(['Paint %s alive, seen exactly from the side, the whole animal from the tip of the snout to the tip of '
                          'the tail, filling most of the picture\'s width.' % name, KNIGHT,
                          'How %s is reconstructed today: %s.' % (name, c['look']['text']),
                          'Warm afternoon light from the upper left. ' + bg])
        inp = [{'type': 'text', 'text': text}]
    d = os.path.join(CAND, sid + '-animals'); os.makedirs(d, exist_ok=True); os.makedirs(os.path.join(HERE, 'prompts'), exist_ok=True)
    open(os.path.join(HERE, 'prompts', '%s-%s-%s.txt' % (sid, c['sil'], approach)), 'w').write(text)
    body = {'model': MODEL_PRO if pro else MODEL, 'input': inp,
            'response_format': {'type': 'image', 'mime_type': 'image/jpeg', 'image_size': '2K' if pro else '1K', 'aspect_ratio': '16:9'}}
    made = []
    for i in range(n):
        for b in images(call(body)):
            k = len([f for f in os.listdir(d) if f.startswith('%s-%s-' % (c['sil'], approach)) and f.endswith('.jpg')]) + 1
            fn = os.path.join(d, '%s-%s-%d.jpg' % (c['sil'], approach, k)); open(fn, 'wb').write(b)
            json.dump({'model': body['model'], 'prompt': text, 'approach': approach, 'animal': name, 'made': time.strftime('%Y-%m-%d')}, open(fn[:-4] + '.json', 'w'))
            print('  candidate', fn); made.append(fn)
    print('  this run: %d call(s), ~$%.2f' % (_calls, _spent))
    return made


def _png(im):
    b = io.BytesIO(); im.save(b, 'PNG'); return b.getvalue()


def choose_animal(sid, name, approach, k):
    """Cut a painted animal out for the scene. outline: the painting is cut to the silhouette's exact outline, if the
    painted animal fills it (IoU >= 0.8); free: cut from its white background."""
    import numpy as np
    s, c = _animal(sid, name)
    src = os.path.join(CAND, sid + '-animals', '%s-%s-%s.jpg' % (c['sil'], approach, k)); meta = json.load(open(src[:-4] + '.json'))
    im = Image.open(src).convert('RGB').resize((1600, 900), Image.LANCZOS); a = np.asarray(im).astype(int)
    painted = (np.abs(a - 255).sum(2) > 60)                             # not the white background
    out_dir = os.path.join(ROOT, 'app', 'public', 'painted'); os.makedirs(out_dir, exist_ok=True)
    dst = os.path.join(out_dir, '%s-%s.png' % (c['sil'], approach)); info = {}
    if approach == 'outline':
        _, (x, y, w, h), alpha = _outline_guide(c['sil'])
        sil = np.zeros((900, 1600), bool); sil[y:y + h, x:x + w] = np.asarray(alpha) > 128
        iou = float((painted & sil).sum() / max(1, (painted | sil).sum()))
        print('  outline agreement (IoU): %.1f%%' % (100 * iou))
        if iou < 0.8: sys.exit('  refused: the painted animal strays from the scientists\' outline (needs 80%). Choose another or paint again.')
        crop = np.asarray(im.crop((x, y, x + w, y + h))).astype(np.float64)
        inside = np.asarray(alpha).astype(np.float64) / 255
        gap = (np.abs(crop - 255).sum(2) <= 60) & (inside > 0.5)          # inside the outline but left unpainted
        if gap.any():                                                      # fill from the paint around it (normalised blur)
            ok_ = (~gap & (inside > 0.5)).astype(np.float64)
            blur = lambda z, r: np.asarray(Image.fromarray(np.uint8(np.clip(z, 0, 255))).filter(ImageFilter.GaussianBlur(r))).astype(np.float64)
            for r in (3, 8, 20):
                num = np.stack([blur(crop[..., i] * ok_, r) for i in range(3)], 2); den = blur(ok_ * 255, r)[..., None] / 255
                fill = num / np.maximum(den, 1e-3); crop = np.where((gap & (den[..., 0] > 0.05))[..., None], fill, crop)
            info['filled_px'] = int(gap.sum())
        rgba = Image.fromarray(np.uint8(np.clip(crop, 0, 255))).convert('RGBA'); rgba.putalpha(alpha)
        info['iou'] = round(iou, 3)
    else:
        ys, xs = np.where(painted); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        m = Image.fromarray((painted * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(1.0))
        rgba = im.convert('RGBA'); rgba.putalpha(m); rgba = rgba.crop((x0, y0, x1, y1))
    if rgba.width > 1024: rgba = rgba.resize((1024, round(rgba.height * 1024 / rgba.width)), Image.LANCZOS)
    rgba.save(dst, 'PNG', optimize=True)
    json.dump(dict(info, f='painted/%s-%s.png' % (c['sil'], approach), w=rgba.width, h=rgba.height, approach=approach, model=meta['model'],
                   prompt=meta['prompt'], made=meta['made'], candidate=int(k)), open(dst[:-4] + '.json', 'w'), ensure_ascii=False, indent=1)
    print('  %s ← candidate %s (%dx%d)' % (dst, k, rgba.width, rgba.height))


# The whole scene as one painting, made from the scene's own overview (a screenshot of the 3D scene: its river, banks,
# trees and animals where and as large as they are), repainted in Knight's manner with the animals as reconstructed today.
def scene_paint(sid, guide, n, pro):
    s = scenes().get(sid) or sys.exit('no scene ' + sid)
    p = s['paint']; looks = '; '.join('%s: %s' % (c['name'], c['look']['text']) for c in s['cast'] if c.get('look')); BL = brief_lines(sid)
    text = '\n'.join(['The attached picture is a 3D reconstruction of %s, %s, %s, seen from the sky.' % (s['name'].replace('The ', 'the '), s['where'], s['when']),
                      'Repaint it as ONE oil painting. ' + (HISTORY if BL else KNIGHT),
                      'Keep the composition EXACTLY: the river and its sandbanks, the low red sandstone face of the far bank, every '
                      'monkey-puzzle tree, and every animal where it is and as large as it is (the dark shapes are the animals).',
                      'Paint the dark shapes as the living animals, as reconstructed today: %s. The small shapes under the water '
                      'are fish; the shapes in the air are pterosaurs.' % looks,
                      *(['From the evidence (show these as given): ' + '; '.join(BL['must']) + '.',
                         'Your own to imagine, within the evidence: ' + '; '.join(BL['free']) + '.',
                         'Do not paint: ' + '; '.join(BL['not']) + '.'] if BL else
                        ['Land: %s. Water: %s. Plants: %s. Light: %s. Do not paint: %s.' % (p['land'], p['water'], p['plants'], p['light'], p['not'])]),
                      NO_TEXT])
    d = os.path.join(CAND, sid + '-scene'); os.makedirs(d, exist_ok=True); os.makedirs(os.path.join(HERE, 'prompts'), exist_ok=True)
    open(os.path.join(HERE, 'prompts', sid + '-scene.txt'), 'w').write(text)
    body = {'model': MODEL_PRO if pro else MODEL,
            'input': [{'type': 'text', 'text': text}, {'type': 'image', 'mime_type': 'image/png', 'data': base64.b64encode(open(guide, 'rb').read()).decode()}],
            'response_format': {'type': 'image', 'mime_type': 'image/jpeg', 'image_size': '2K' if pro else '1K', 'aspect_ratio': '16:9'}}
    for i in range(n):
        for b in images(call(body)):
            k = len([f for f in os.listdir(d) if f.endswith('.jpg')]) + 1
            fn = os.path.join(d, '%d.jpg' % k); open(fn, 'wb').write(b)
            json.dump({'model': body['model'], 'prompt': text, 'made': time.strftime('%Y-%m-%d')}, open(fn[:-4] + '.json', 'w'))
            print('  candidate', fn)
    print('  this run: %d call(s), ~$%.2f' % (_calls, _spent))


def scene_fix(sid, k, fix, n, pro):
    """Correct a scene painting where it differs from the evidence: the painting and plain instructions go back to the
    model, which is asked to change only those things. A new candidate, looked at by eye like any other."""
    if not fix: sys.exit('say what to correct: --fix "..."')
    src = os.path.join(CAND, sid + '-scene', '%s.jpg' % k)
    text = '\n'.join(['The attached oil painting (in the manner of Charles R. Knight) shows %s, seen from the sky.' % scenes()[sid]['name'].replace('The ', 'the '),
                      'Correct ONLY these things, and keep everything else exactly as it is — the composition, the river, the '
                      'sandbanks, the trees, the light, the brushwork and the other animals: ' + fix, NO_TEXT])
    d = os.path.join(CAND, sid + '-scene')
    body = {'model': MODEL_PRO if pro else MODEL,
            'input': [{'type': 'text', 'text': text}, {'type': 'image', 'mime_type': 'image/jpeg', 'data': base64.b64encode(open(src, 'rb').read()).decode()}],
            'response_format': {'type': 'image', 'mime_type': 'image/jpeg', 'image_size': '2K' if pro else '1K', 'aspect_ratio': '16:9'}}
    base = json.load(open(src[:-4] + '.json')); made = []
    for i in range(n):
        for b in images(call(body)):
            kk = len([f for f in os.listdir(d) if f.endswith('.jpg')]) + 1
            fn = os.path.join(d, '%d.jpg' % kk); open(fn, 'wb').write(b)
            json.dump({'model': body['model'], 'prompt': base['prompt'] + '\n\nThen corrected: ' + fix, 'fixed_from': int(k), 'made': time.strftime('%Y-%m-%d')}, open(fn[:-4] + '.json', 'w'))
            print('  candidate', fn); made.append(fn)
    print('  this run: %d call(s), ~$%.2f' % (_calls, _spent))
    return made


# Paintings of the great events (Evan, 25 Nov: "paintings for all the extinction events and other events like when things
# drifted, when things collided ... they all need to be painting"): the extinctions (data_extinctions.js), the smaller
# crises and the drift and collision events of the timeline (data_time.js EVENTS, each with verified sources), and the
# Earth-building stories (data_stories.js). Each brief is the event's own text; the painter is told to show only that.
EVENT_IDS = {
    'extinction': ['ordovician', 'devonian', 'permian', 'triassic', 'cretaceous', 'quaternary', 'holocene'],
    'crisis': ['endediacaran', 'kalkarindji', 'spice', 'ireviken', 'lau', 'hangenberg', 'coalforest', 'capitanian', 'carnian', 'toarcian', 'oae2', 'petm', 'grandecoupure'],
    'drift': ['grenville', 'midcontinent', 'mackenzie', 'iapetus', 'southatlantic'],
    'story': ['moon', 'snowball', 'himalaya', 'mediterranean', 'missoula', 'hawaii', 'greatlakes'],
}


def event_brief(eid):
    js = ("const X=require(%r), T=require(%r), S=require(%r); console.log(JSON.stringify({ext: X.EXTINCTIONS, ev: T.EVENTS.filter(e => e[5]), st: S.STORIES}))"
          % tuple(os.path.join(ROOT, 'tools', 'source', f) for f in ('data_extinctions.js', 'data_time.js', 'data_stories.js')))
    D = json.loads(subprocess.check_output(['node', '-e', js]).decode())
    e = next((x for x in D['ext'] if x['id'] == eid), None)
    if e: return {'kind': 'extinction', 'title': e['short'], 't': e['t'], 'text': ' '.join(s[1] for s in e['steps'])}
    s = next((x for x in D['st'] if x['id'] == eid), None)
    if s:
        when = s['ma'][0][1] if s.get('ma') else s['ka'][0][1] / 1000
        return {'kind': 'story', 'title': s['title'], 't': when, 'text': s['blurb'] + ' ' + ' '.join(x[1] for x in s['steps'])}
    v = next((x for x in D['ev'] if x[5] == eid), None) or sys.exit('no event ' + eid)
    return {'kind': 'drift' if eid in EVENT_IDS['drift'] else 'crisis', 'title': v[3], 't': v[0], 'text': v[4]}


def era_rules(t, positive=True):
    """What plants could not yet exist at time t (Ma): the painter otherwise puts palms and lush green on every
    'prehistoric' landscape (25 Nov 2026: 16 of 32 event paintings did). Broad, well-established first appearances.
    With `positive`, also what the ground WAS covered in, and how plants grow: the bans alone gave bare stage sets with
    a few fronds dotted about (Evan, 25 Nov: "it may not be lush ... but it certainly wasn't just barren, weird diorama")."""
    r, ok = [], ''
    if t > 470:
        r.append('NO plants of any kind on land, nothing green or leafy (dark crusts of microbes on damp ground are fine): all life is in the water')
        ok = ('The land is real, weathered ground, not a stage: grey and red rock, gravel, and wide sheets of sand and mud spread '
              'by rain and broad shallow rivers (with no roots to hold the soil, rivers ran in wide braided sheets), wind-rippled '
              'sand, dark wrinkled crusts of microbial mats on damp ground and tidal flats, and a sea full of life')
    elif t > 390:
        r.append('NO trees, shrubs or bushes: the only land plants are tiny, low, moss-like plants a few centimetres tall, near water')
        ok = ('Near water the ground is carpeted with them: low green and brown mats of tiny moss-like and liverwort-like plants '
              'and small leafless forked stems, spreading in patches like a thin felt over damp mud; drier ground is still '
              'bare rock and sand')
    elif t > 359:
        r.append('NO palms, conifers, cycads or flowering plants')
        ok = ('The trees are Archaeopteris: tall trees shaped like a conifer, with a straight trunk and spreading side branches '
              'carrying flat fern-like leaves — NOT palm-shaped — in forests along rivers and coasts, with low ferny and '
              'leafless forked plants and a litter of fallen branches beneath them')
    elif t > 299:
        r.append('NO palms or flowering plants')
        ok = ('The forests are giant club-moss trees (Lepidodendron, Sigillaria): tall straight bare trunks covered in a diamond-shaped '
              'scale pattern, ending in a few short forked branches with grassy tufts — NOT palm-shaped; with giant horsetails (Calamites, '
              'jointed stems with whorls of needle leaves) and tree ferns, standing close together in swamps over dark water, with '
              'fallen trunks and a dense undergrowth of ferns')
    if 0 < t <= 299 and t > 100:
        r.append('NO palm trees (palms appear about 100 million years ago) and nothing palm-shaped (no tall slender trunk with a crown of big fan or feather leaves), and NO flowering plants' + (' or flowers' if t > 130 else ' except a few small early ones'))
        ok = ('The trees are conifers (pine-like and monkey-puzzle-like)' + (', seed ferns like Glossopteris with tongue-shaped leaves' if t > 252 else ', ginkgos') +
              ', tree ferns, and cycads — cycads only as SHORT, stout, barrel-trunked plants no taller than a person. Where it is wet the '
              'ground is covered with ferns and horsetails (there is no grass), in thick stands; where it is dry, scattered low shrubs '
              'and bare ground')
    if 0 < t <= 100 and t > 66:
        r.append('NO grass or grassland')
        ok = ok or ('Conifers, ferns, cycads and early flowering trees and shrubs; ferns and horsetails, not grass, cover wet ground')
    if t > 580: r.append('NO animals of any kind, not even in the sea: life is microbes and simple algae, too small or too plain to see from the sky (at most green or brown scum in shallow water)')
    elif t > 541: r.append('NO animals except simple, soft-bodied sea creatures on the sea floor (the Ediacaran kind: fronds, discs, quilted mats)')
    if ok and t <= 470: ok += ('. Plants grow as they do in nature: in continuous stands, thickets and carpets where there is water, '
                               'thinning gradually where it is drier — never single plants dotted evenly over bare ground like a model')
    return (('What could not yet exist then, so must not be painted: ' + '; '.join(r) + '.') if r else '') + ((' ' + ok + '.') if ok and positive else '')


def when_words(t):
    return 'today' if t == 0 else ('about %s years ago' % format(round(t * 1e6), ',') if t < 0.1 else 'about %s million years ago' % ('%g' % round(t, 1)))


def event_paint(eid, n, pro):
    b = event_brief(eid)
    text = '\n'.join(['A painting for a natural-history museum: %s, %s.' % (b['title'], when_words(b['t'])), KNIGHT,
                      'What happened, from the scientific evidence: ' + b['text'],
                      'Paint the moment as seen from high in the sky: a wide view of the land and sea where it happened, as they '
                      'were THEN — the continents, coasts, plants and life of that time, not today\'s. Show only what the '
                      'description says. Living things only where it names them, small, as they are reconstructed today; none '
                      'where it does not.', era_rules(b['t']), AVOID, NO_TEXT])
    d = os.path.join(CAND, 'events'); os.makedirs(d, exist_ok=True); os.makedirs(os.path.join(HERE, 'prompts', 'events'), exist_ok=True)
    open(os.path.join(HERE, 'prompts', 'events', eid + '.txt'), 'w').write(text)
    body = {'model': MODEL_PRO if pro else MODEL, 'input': [{'type': 'text', 'text': text}],
            'response_format': {'type': 'image', 'mime_type': 'image/jpeg', 'image_size': '2K' if pro else '1K', 'aspect_ratio': '16:9'}}
    made = []
    for i in range(n):
        for img in images(call(body)):
            k = len([f for f in os.listdir(d) if f.startswith(eid + '-') and f.endswith('.jpg')]) + 1
            fn = os.path.join(d, '%s-%d.jpg' % (eid, k)); open(fn, 'wb').write(img)
            json.dump(dict(b, id=eid, model=body['model'], prompt=text, made=time.strftime('%Y-%m-%d')), open(fn[:-4] + '.json', 'w'), ensure_ascii=False)
            print('  candidate', fn); made.append(fn)
    return made


def choose_event(eid, k, differs):
    if not differs: sys.exit('say where the painting differs from the evidence: --differs "..." (or "nothing we can see")')
    src = os.path.join(CAND, 'events', '%s-%s.jpg' % (eid, k)); meta = json.load(open(src[:-4] + '.json'))
    out = os.path.join(ROOT, 'app', 'public', 'painted', 'events'); os.makedirs(out, exist_ok=True)
    im = Image.open(src).convert('RGB'); dst = os.path.join(out, eid + '.jpg'); im.save(dst, 'JPEG', quality=86)
    json.dump(dict(meta, f='painted/events/%s.jpg' % eid, w=im.width, h=im.height, candidate=int(k), differs=differs),
              open(dst[:-4] + '.json', 'w'), ensure_ascii=False, indent=1)
    print('  %s ← candidate %s' % (dst, k))


# Zooming into a scene painting without blur (Evan, 25 Nov: "improve zooming fidelity"): the painting is cut into a 3x3
# grid of overlapping crops, each repainted at 3x the detail by the model ("keep every shape exactly"), checked against
# its crop (a repaint that moved things is replaced by a plain enlargement), colour-matched, blended across the overlaps,
# and cut into nine tiles the page loads only when the reader zooms in (app/public/painted/<scene>-hi/r-c.jpg).
DETAIL_N, DETAIL_OVERLAP = 3, 0.12


def detail(sid, pro, only=None):
    src = os.path.join(ROOT, 'app', 'public', 'painted', 'scene-%s.jpg' % sid); im = Image.open(src).convert('RGB'); W, H = im.size
    only = set(only.split(',')) if only else None                  # e.g. "0-1,1-0": retry the tiles that strayed
    d = os.path.join(CAND, sid + '-detail'); os.makedirs(d, exist_ok=True)
    text = ('The attached picture is one part of a larger oil painting in the manner of Charles R. Knight. Repaint EXACTLY this '
            'part at much higher resolution, with finer, sharper oil brushwork and detail: keep every shape, edge, colour, '
            'shadow and position exactly where it is; do not add, remove, move or restyle anything; no text, border or frame.')
    for r in range(DETAIL_N):
        for c in range(DETAIL_N):
            if only and '%d-%d' % (r, c) not in only: continue
            x0, y0, x1, y1 = _detail_box(W, H, r, c)
            crop = im.crop((x0, y0, x1, y1)); b = io.BytesIO(); crop.save(b, 'JPEG', quality=92)
            body = {'model': MODEL_PRO if pro else MODEL,
                    'input': [{'type': 'text', 'text': text}, {'type': 'image', 'mime_type': 'image/jpeg', 'data': base64.b64encode(b.getvalue()).decode()}],
                    'response_format': {'type': 'image', 'mime_type': 'image/jpeg', 'image_size': '2K' if pro else '1K', 'aspect_ratio': '16:9'}}
            got = images(call(body))
            if got: open(os.path.join(d, '%d-%d.jpg' % (r, c)), 'wb').write(got[0]); print('  tile', r, c)
    print('  this run: %d call(s), ~$%.2f' % (_calls, _spent))


def _detail_box(W, H, r, c):
    tw, th = W / DETAIL_N, H / DETAIL_N; ox, oy = tw * DETAIL_OVERLAP, th * DETAIL_OVERLAP
    return int(max(0, c * tw - ox)), int(max(0, r * th - oy)), int(min(W, (c + 1) * tw + ox)), int(min(H, (r + 1) * th + oy))


def detail_assemble(sid):
    import numpy as np
    src = os.path.join(ROOT, 'app', 'public', 'painted', 'scene-%s.jpg' % sid); im = Image.open(src).convert('RGB'); W, H = im.size
    S = 3; BW, BH = W * S, H * S
    acc = np.zeros((BH, BW, 3), np.float32); wsum = np.zeros((BH, BW, 1), np.float32); report = []
    for r in range(DETAIL_N):
        for c in range(DETAIL_N):
            x0, y0, x1, y1 = _detail_box(W, H, r, c); cw, ch = x1 - x0, y1 - y0
            crop = np.asarray(im.crop((x0, y0, x1, y1)).resize((cw * S, ch * S), Image.LANCZOS)).astype(np.float32)
            fn = os.path.join(CAND, sid + '-detail', '%d-%d.jpg' % (r, c)); used = 'enlarged'
            if os.path.exists(fn):
                t = np.asarray(Image.open(fn).convert('RGB').resize((cw * S, ch * S), Image.LANCZOS)).astype(np.float32)
                small = lambda a: np.asarray(Image.fromarray(np.uint8(np.clip(a, 0, 255))).resize((cw // 4, ch // 4), Image.BILINEAR)).astype(np.float32).mean(2)
                A, B = small(crop), small(t); A -= A.mean(); B -= B.mean()
                corr = float((A * B).sum() / (np.sqrt((A * A).sum() * (B * B).sum()) + 1e-6))
                if corr > 0.88:                                   # same picture: match its colours to the original crop
                    t = (t - t.mean((0, 1))) / (t.std((0, 1)) + 1e-6) * crop.std((0, 1)) + crop.mean((0, 1)); crop = t; used = 'repainted'
                report.append('%d-%d %s (%.2f)' % (r, c, used, corr))
            else: report.append('%d-%d enlarged (no tile)' % (r, c))
            # weights: 1 in the middle, falling to 0 across the overlap, so neighbours blend without seams
            wy = np.minimum(1, np.minimum(np.arange(ch * S) + 1, ch * S - np.arange(ch * S)) / (H / DETAIL_N * DETAIL_OVERLAP * S + 1))
            wx = np.minimum(1, np.minimum(np.arange(cw * S) + 1, cw * S - np.arange(cw * S)) / (W / DETAIL_N * DETAIL_OVERLAP * S + 1))
            if x0 == 0: wx[:len(wx) // 2] = 1
            if y0 == 0: wy[:len(wy) // 2] = 1
            if x1 == W: wx[len(wx) // 2:] = 1
            if y1 == H: wy[len(wy) // 2:] = 1
            w = (wy[:, None] * wx[None, :])[..., None].astype(np.float32)
            acc[y0 * S:y0 * S + ch * S, x0 * S:x0 * S + cw * S] += crop * w; wsum[y0 * S:y0 * S + ch * S, x0 * S:x0 * S + cw * S] += w
    big = np.uint8(np.clip(acc / np.maximum(wsum, 1e-6), 0, 255))
    out = os.path.join(ROOT, 'app', 'public', 'painted', sid + '-hi'); os.makedirs(out, exist_ok=True)
    tw, th = BW // DETAIL_N, BH // DETAIL_N
    for r in range(DETAIL_N):
        for c in range(DETAIL_N):
            Image.fromarray(big[r * th:(r + 1) * th, c * tw:(c + 1) * tw]).save(os.path.join(out, '%d-%d.jpg' % (r, c)), 'JPEG', quality=82)
    cand = json.load(open(src[:-4] + '.json')).get('candidate')                     # the tiles are only good for this painting
    json.dump({'n': DETAIL_N, 'scale': S, 'tw': tw, 'th': th, 'tiles': report, 'candidate': cand}, open(os.path.join(out, 'index.json'), 'w'), indent=1)
    print('  ' + '\n  '.join(report)); print('  %s: %dx%d in %d tiles' % (out, BW, BH, DETAIL_N * DETAIL_N))


# Plants for the 3D scene, painted (Evan, 25 Nov: the 3D vegetation looked artificial): one sheet of the brief's own plant
# kinds, seen from about 45 degrees above like the scene's camera, cut into sprites (app/public/painted/<site>-plants.png).
def plants(sid, n, pro):
    s = scenes().get(sid) or sys.exit('no scene ' + sid); p = s['paint']
    text = '\n'.join(['A sheet of four separate plants for a natural-history museum diorama. ' + KNIGHT,
                      'Each plant stands alone on a PURE WHITE background, with wide white space between them, in a row from left '
                      'to right, all seen from about 45 degrees above (as from a low aircraft), lit from the upper left:',
                      '1) a low, rounded, leafy shrub about one and a half metres tall, with small leaves; 2) a clump of ferns about '
                      'one metre tall; 3) a small low leafy plant from the water\'s edge, half a metre tall; 4) a more open, spreading '
                      'low shrub.',
                      'They grow at %s, %s: %s. Do not paint: %s.' % (s['where'], s['when'], p['plants'], p['not']),
                      'No ground, no shadows, no soil, no pot, no text, numbers, labels, border or frame.'])
    d = os.path.join(CAND, sid + '-plants'); os.makedirs(d, exist_ok=True)
    os.makedirs(os.path.join(HERE, 'prompts'), exist_ok=True); open(os.path.join(HERE, 'prompts', sid + '-plants.txt'), 'w').write(text)
    body = {'model': MODEL_PRO if pro else MODEL, 'input': [{'type': 'text', 'text': text}],
            'response_format': {'type': 'image', 'mime_type': 'image/jpeg', 'image_size': '2K' if pro else '1K', 'aspect_ratio': '16:9'}}
    for i in range(n):
        for b in images(call(body)):
            k = len([f for f in os.listdir(d) if f.endswith('.jpg')]) + 1; fn = os.path.join(d, '%d.jpg' % k); open(fn, 'wb').write(b)
            json.dump({'model': body['model'], 'prompt': text, 'made': time.strftime('%Y-%m-%d')}, open(fn[:-4] + '.json', 'w')); print('  candidate', fn)


def choose_plants(sid, k):
    """Cut the four plants out of a sheet (split where whole columns are white) into a 4-cell atlas with alpha."""
    import numpy as np
    src = os.path.join(CAND, sid + '-plants', '%s.jpg' % k); im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(int)
    ink = np.abs(a - 255).sum(2) > 45
    # the plants by their shapes: connected areas of paint on a quarter-size mask (they may overlap side to side)
    q = ink[::4, ::4]; H4, W4 = q.shape; lab = np.zeros(q.shape, np.int32); n = 0; sizes = {}
    for y0 in range(H4):
        for x0 in range(W4):
            if q[y0, x0] and not lab[y0, x0]:
                n += 1; st = [(y0, x0)]; lab[y0, x0] = n; cnt = 0
                while st:
                    y, x = st.pop(); cnt += 1
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            yy, xx = y + dy, x + dx
                            if 0 <= yy < H4 and 0 <= xx < W4 and q[yy, xx] and not lab[yy, xx]: lab[yy, xx] = n; st.append((yy, xx))
                sizes[n] = cnt
    big = sorted(sizes, key=sizes.get, reverse=True)[:4]
    if len(big) < 4 or sizes[big[3]] < 300: sys.exit('found fewer than 4 plants: choose another sheet')
    comp = {}
    for c in big:
        ys, xs = np.where(lab == c); comp[c] = (xs.min() * 4, ys.min() * 4, xs.max() * 4 + 4, ys.max() * 4 + 4)
    order = sorted(big, key=lambda c: comp[c][0])
    atlas = Image.new('RGBA', (2048, 512), (0, 0, 0, 0)); meta = []
    for i, c in enumerate(order):
        x0, y0, x1, y1 = comp[c]
        mine = np.kron(lab == c, np.ones((4, 4), bool))[:ink.shape[0], :ink.shape[1]]
        m = np.asarray(Image.fromarray(np.uint8(mine) * 255).filter(ImageFilter.MaxFilter(9))) > 0     # this plant's area, a little grown
        sel = (ink & m)[y0:y1, x0:x1]
        mask = Image.fromarray(np.uint8(sel) * 255).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1))
        sp = im.crop((x0, y0, x1, y1)).convert('RGBA'); sp.putalpha(mask)
        sc = min(500 / sp.width, 500 / sp.height); sp = sp.resize((max(1, int(sp.width * sc)), max(1, int(sp.height * sc))), Image.LANCZOS)
        atlas.paste(sp, (i * 512 + (512 - sp.width) // 2, 512 - sp.height), sp)          # standing on the cell's bottom edge
        meta.append({'w': sp.width / 512, 'h': sp.height / 512})
    out = os.path.join(ROOT, 'app', 'public', 'painted'); os.makedirs(out, exist_ok=True)
    atlas.save(os.path.join(out, sid + '-plants.png'), optimize=True)
    json.dump({'f': 'painted/%s-plants.png' % sid, 'cells': meta, 'kinds': ['shrub', 'fern', 'herb', 'shrub2'], 'candidate': int(k)},
              open(os.path.join(out, sid + '-plants.json'), 'w'), indent=1)
    print('  plants:', meta)


def choose_scene(sid, k, differs):
    """A scene painting is kept only with a plain account of where it differs from the evidence (--differs "..."):
    the page shows it beside the picture, as the atlas does for old reconstructions."""
    if not differs: sys.exit('say where the painting differs from the evidence: --differs "..." (or "nothing we can see")')
    src = os.path.join(CAND, sid + '-scene', '%s.jpg' % k); meta = json.load(open(src[:-4] + '.json'))
    out_dir = os.path.join(ROOT, 'app', 'public', 'painted'); os.makedirs(out_dir, exist_ok=True)
    dst = os.path.join(out_dir, 'scene-%s.jpg' % sid)
    im = Image.open(src).convert('RGB'); im.save(dst, 'JPEG', quality=88)          # full size: the page lets readers zoom in
    json.dump({'f': 'painted/scene-%s.jpg' % sid, 'w': im.width, 'h': im.height, 'model': meta['model'], 'prompt': meta['prompt'], 'made': meta['made'], 'candidate': int(k),
               'differs': differs}, open(dst[:-4] + '.json', 'w'), ensure_ascii=False, indent=1)
    print('  %s ← candidate %s' % (dst, k))


def choose_ground(sid, k):
    """Turn a ground painting into the swatches a scene paints its land with. The image model keeps the guide's layout
    only roughly (the river drifts and changes shape), so the painting is not laid on the land as a whole: it is cut into
    four strips — the sand on top of the far bank, the layered sandstone of its face, the river bed, the near shore with
    its ripples and gravel — and the scene paints each zone of its own land with its strip, tiled along the river. The
    land's shape stays exactly the scene's; the painting gives the surface."""
    src = os.path.join(CAND, sid + '-ground', '%s.jpg' % k); meta = json.load(open(src[:-4] + '.json'))
    im = Image.open(src).convert('RGB').resize((1600, 900), Image.LANCZOS); W, H = im.size
    px = im.load()
    rows = [sum(1 for x in range(0, W, 4) if px[x, y][0] - px[x, y][1] > 55 and px[x, y][0] > 120) / (W / 4) for y in range(H)]
    band = [y for y, f in enumerate(rows) if f > 0.35] or sys.exit('no sandstone band found in this painting: choose another')
    r0, r1 = min(band), max(band)
    strips = {'top': (max(10, int(r0 * 0.12)), r0 - 10), 'stone': (r0 + 4, r1 - 4), 'bed': (r1 + 30, int(r1 + 0.45 * (H - r1))), 'near': (int(H * 0.84), H - 8)}
    atlas = Image.new('RGB', (2048, 2048))
    for i, key in enumerate(['top', 'stone', 'bed', 'near']):
        y0, y1 = strips[key]
        if y1 - y0 < 20: sys.exit('the %s strip is too thin (%d rows): choose another painting' % (key, y1 - y0))
        atlas.paste(im.crop((0, y0, W, y1)).resize((2048, 512), Image.LANCZOS), (0, i * 512))
    out = os.path.join(ROOT, 'app', 'public', 'ground'); os.makedirs(out, exist_ok=True)
    dst = os.path.join(out, sid + '.webp'); atlas.save(dst, 'WEBP', quality=86, method=6)
    json.dump({'f': 'ground/%s.webp' % sid, 'strips': ['top', 'stone', 'bed', 'near'], 'rows': strips, 'model': meta['model'], 'made': meta['made'],
               'prompt': meta['prompt'], 'candidate': int(k), 'sha': hashlib.sha256(open(dst, 'rb').read()).hexdigest()[:12]},
              open(os.path.join(out, sid + '.json'), 'w'), ensure_ascii=False, indent=1)
    print('  %s ← candidate %s: strips %s (%d KB)' % (dst, k, strips, os.path.getsize(dst) // 1024))


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
    elif a[0] == 'ground': ground(a[1], opt('--guide', None) or sys.exit('--guide <png> is needed'), int(opt('--n', 2)), '--pro' in sys.argv, opt('--size', '2K'), opt('--style', None))
    elif a[0] == 'earth': earth(a[1], int(opt('--n', 1)), '--pro' in sys.argv)
    elif a[0] == 'choose-earth': choose_earth(a[1], a[2], a[3])
    elif a[0] == 'earth-brush': earth_brush(a[1])
    elif a[0] == 'animal': animal(a[1], a[2], opt('--approach', 'outline'), int(opt('--n', 1)), '--pro' in sys.argv)
    elif a[0] == 'choose-animal': choose_animal(a[1], a[2], a[3], a[4])
    elif a[0] == 'scene': scene_paint(a[1], opt('--guide', None) or sys.exit('--guide <png> is needed'), int(opt('--n', 2)), '--pro' in sys.argv)
    elif a[0] == 'choose-scene': choose_scene(a[1], a[2], opt('--differs', None))
    elif a[0] == 'detail': detail(a[1], '--pro' in sys.argv, opt('--only', None))
    elif a[0] == 'plants': plants(a[1], int(opt('--n', 1)), '--pro' in sys.argv)
    elif a[0] == 'choose-plants': choose_plants(a[1], a[2])
    elif a[0] == 'detail-assemble': detail_assemble(a[1])
    elif a[0] == 'event': event_paint(a[1], int(opt('--n', 1)), '--pro' in sys.argv)
    elif a[0] == 'choose-event': choose_event(a[1], a[2], opt('--differs', None))
    elif a[0] == 'events': print(' '.join(i for v in EVENT_IDS.values() for i in v))
    elif a[0] == 'scene-fix': scene_fix(a[1], a[2], opt('--fix', None), int(opt('--n', 2)), '--pro' in sys.argv)
    elif a[0] == 'choose-ground': choose_ground(a[1], a[2])
    elif a[0] == 'spent': spent()
    elif a[0] == 'check': check()
    else: sys.exit(__doc__)
