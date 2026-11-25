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
    bg = 'A plain, flat, pure white background: no ground, no shadow, no scenery, no other animals, no text, labels, border or frame.'
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
    for i in range(n):
        for b in images(call(body)):
            k = len([f for f in os.listdir(d) if f.startswith('%s-%s-' % (c['sil'], approach)) and f.endswith('.jpg')]) + 1
            fn = os.path.join(d, '%s-%s-%d.jpg' % (c['sil'], approach, k)); open(fn, 'wb').write(b)
            json.dump({'model': body['model'], 'prompt': text, 'approach': approach, 'animal': name, 'made': time.strftime('%Y-%m-%d')}, open(fn[:-4] + '.json', 'w'))
            print('  candidate', fn)
    print('  this run: %d call(s), ~$%.2f' % (_calls, _spent))


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
    p = s['paint']; looks = '; '.join('%s: %s' % (c['name'], c['look']['text']) for c in s['cast'] if c.get('look'))
    text = '\n'.join(['The attached picture is a 3D reconstruction of %s, %s, %s, seen from the sky.' % (s['name'].replace('The ', 'the '), s['where'], s['when']),
                      'Repaint it as ONE oil painting. ' + KNIGHT,
                      'Keep the composition EXACTLY: the river and its sandbanks, the low red sandstone face of the far bank, every '
                      'monkey-puzzle tree, and every animal where it is and as large as it is (the dark shapes are the animals).',
                      'Paint the dark shapes as the living animals, as reconstructed today: %s. The small shapes under the water '
                      'are fish; the shapes in the air are pterosaurs.' % looks,
                      'Land: %s. Water: %s. Plants: %s. Light: %s. Do not paint: %s.' % (p['land'], p['water'], p['plants'], p['light'], p['not']),
                      'No text, labels, border or frame.'])
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


def choose_scene(sid, k, differs):
    """A scene painting is kept only with a plain account of where it differs from the evidence (--differs "..."):
    the page shows it beside the picture, as the atlas does for old reconstructions."""
    if not differs: sys.exit('say where the painting differs from the evidence: --differs "..." (or "nothing we can see")')
    src = os.path.join(CAND, sid + '-scene', '%s.jpg' % k); meta = json.load(open(src[:-4] + '.json'))
    out_dir = os.path.join(ROOT, 'app', 'public', 'painted'); os.makedirs(out_dir, exist_ok=True)
    dst = os.path.join(out_dir, 'scene-%s.jpg' % sid)
    Image.open(src).convert('RGB').resize((1920, 1080), Image.LANCZOS).save(dst, 'JPEG', quality=86)
    json.dump({'f': 'painted/scene-%s.jpg' % sid, 'model': meta['model'], 'prompt': meta['prompt'], 'made': meta['made'], 'candidate': int(k),
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
    elif a[0] == 'choose-ground': choose_ground(a[1], a[2])
    elif a[0] == 'spent': spent()
    elif a[0] == 'check': check()
    else: sys.exit(__doc__)
