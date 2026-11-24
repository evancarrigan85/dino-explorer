#!/usr/bin/env python3
"""Animal silhouettes from PhyloPic (phylopic.org), with their credits.

For each wanted animal: look its name up on PhyloPic, then — if it has no silhouette — each broader group in turn
(the list in WANT), and take a silhouette whose licence lets us use it without restriction beyond credit:
CC0 1.0, the Public Domain Mark, or CC BY 3.0/4.0. Share-alike and non-commercial licences are never used.
Where the silhouette is of a broader group, it is recorded as "a relative's outline", and the page says so.

Writes:
  tiles/sil/<key>.png                  the silhouette, black on transparent, at most 512 px wide
  tools/source/silhouettes-data.js     SIL = { key: { f, w, h, by, lic, licUrl, of, level, img } }
     by      the credit PhyloPic gives (the artist), shown wherever the silhouette is
     of      the taxon the silhouette shows; level: 'own' (the animal itself or its genus), 'member' (the wanted name is a
             group, like "side-necked turtles", and the outline is one named member of it) or 'relative'
     img     PhyloPic image id, for the link back

Usage: python3 -I tools/build_silhouettes.py          (all of WANT)
       python3 -I tools/build_silhouettes.py --only k1,k2   (just these keys; the others stay as they are)
       python3 -I tools/build_silhouettes.py --coverage  (count how many of the page's animals PhyloPic covers; no files)
Requires Pillow. Network: api.phylopic.org, images.phylopic.org. The User-Agent is generic on purpose.
"""
import sys, json, io, time, os, re, urllib.request, urllib.parse, urllib.error
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'https://api.phylopic.org'
UA = {'User-Agent': 'BeforeUs-silhouettes/1.0'}
OK_LIC = {
    'https://creativecommons.org/publicdomain/zero/1.0/': 'CC0 1.0',
    'https://creativecommons.org/publicdomain/mark/1.0/': 'Public Domain',
    'https://creativecommons.org/licenses/by/3.0/': 'CC BY 3.0',
    'https://creativecommons.org/licenses/by/4.0/': 'CC BY 4.0',
}
# key: [the animal's own name, then broader groups to fall back on]; an optional "img=<uuid>" picks one silhouette
WANT = {
    # the Kem Kem scene
    'spinosaurus': ['Spinosaurus', 'img=0dd7eaf6-1caf-4579-9f42-340fa9f34c48'],   # standing at the shore: the scene puts it at the water’s edge
    'carcharodontosaurus': ['Carcharodontosaurus', 'Carcharodontosauridae'],
    'deltadromeus': ['Deltadromeus', 'Noasauridae', 'Ceratosauria'],
    'abelisaurid': ['Abelisauridae'],
    'rebbachisaurus': ['Rebbachisaurus', 'Rebbachisauridae'],
    'siroccopteryx': ['Siroccopteryx', 'Pterodactyloidea', 'img=97ce8bbd-68a1-4185-a23e-59dcad7d7f15'],   # sized by wingspan, so a view from below with the wings spread;
                                                   # PhyloPic’s three ornithocheirids are all side or ground views, and Pteranodon’s crest would mislead
    'alanqa': ['Alanqa', 'Azhdarchidae', 'img=a70cf93c-0f86-487e-b9c8-c4f2b45ed0e0'],   # Phosphatodraco, an azhdarchid also from Morocco (the first pick was a skull only)
    'sidenecked': ['Pleurodira'],
    'elosuchus': ['Elosuchus', 'Pholidosauridae'],
    'onchopristis': ['Onchopristis', 'Sclerorhynchidae', 'Pristidae'],
    'axelrodichthys': ['Axelrodichthys', 'Mawsoniidae', 'Actinistia'],
    'neoceratodus': ['Neoceratodus', 'Ceratodontidae', 'Dipnoi'],
    'obaichthys': ['Obaichthys', 'Lepisosteidae'],
    # the pilot sheet (docs/PLAN.md, Release 6 / 12.1)
    'trex': ['Tyrannosaurus'],
    'triceratops': ['Triceratops'],
    'stegosaurus': ['Stegosaurus'],
    'brachiosaurus': ['Brachiosaurus', 'Giraffatitan', 'Brachiosauridae'],
    'velociraptor': ['Velociraptor', 'Dromaeosauridae'],
    'mammoth': ['Mammuthus primigenius', 'Mammuthus'],
    'smilodon': ['Smilodon'],
    'dunkleosteus': ['Dunkleosteus'],
    'anomalocaris': ['Anomalocaris', 'Anomalocarididae'],
    'dimetrodon': ['Dimetrodon', 'img=ee7f1c8c-c98d-4611-aa4e-c112e86782e6'],   # a side view (the first pick was head-on)
    'tiktaalik': ['Tiktaalik', 'Elpistostegalia', 'Tetrapodomorpha'],
}

def get(path, **q):
    u = API + path + ('?' + urllib.parse.urlencode(q) if q else '')
    for tries in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404: return {}                  # PhyloPic says "no match" this way
            if tries == 4: raise
            time.sleep(2 + 3 * tries)
        except Exception as e:
            if tries == 4: raise
            time.sleep(2 + 3 * tries)

BUILD = None
def build():
    global BUILD
    if BUILD is None:
        req = urllib.request.Request(API + '/', headers=UA)
        with urllib.request.urlopen(req, timeout=60) as r: BUILD = json.load(r)['build']
    return BUILD

def node_for(name):
    d = get('/nodes', build=build(), filter_name=name.lower(), embed_items='true', page=0)
    for it in d.get('_embedded', {}).get('items', []):
        names = [re.sub(r'<[^>]+>', '', ''.join(p.get('text', '') for p in n)) if isinstance(n, list) else str(n) for n in it.get('names', [])]
        title = it['_links']['self'].get('title', '')
        lead = lambda x: x.lower() == name.lower() or x.lower().startswith(name.lower() + ' ')   # "Brachiosaurus Riggs 1903"
        if lead(title) or any(lead(n) for n in names): return it['uuid'], title
    return None, None

def images_for(uuid):
    d = get('/images', build=build(), filter_clade=uuid, filter_license_nc='false', filter_license_sa='false', embed_items='true', page=0)
    return d.get('_embedded', {}).get('items', [])

def is_group(q):
    return q[:1].isupper() and ' ' not in q.strip() and q.endswith(('idae', 'inae', 'oidea', 'ia', 'ra'))

def pick(key, queries):
    want_img = next((q[4:] for q in queries if q.startswith('img=')), None)
    queries = [q for q in queries if not q.startswith('img=')]
    for i, q in enumerate(queries):
        uuid, title = node_for(q)
        if not uuid: continue
        ims = [im for im in images_for(uuid) if im['_links']['license']['href'] in OK_LIC]
        if i == 0 and q[:1].isupper() and ' ' not in q.strip() and not is_group(q):   # a genus: the picture must be of it
            ims = [im for im in ims if im['_links']['specificNode']['title'].split(' ')[0].lower() == q.lower()]
        if want_img:
            pinned = [im for im in ims if im['uuid'] == want_img]
            if not pinned and i < len(queries) - 1: continue      # the pinned picture sits under a broader group further down
            ims = pinned or ims
        if not ims: continue
        # the animal itself first, then public domain before credit-only, then the newest
        ims.sort(key=lambda im: (im['_links']['specificNode']['title'].lower() != q.lower() and not im['_links']['specificNode']['title'].lower().startswith(q.lower() + ' '),
                                 im['_links']['license']['href'] not in ('https://creativecommons.org/publicdomain/zero/1.0/', 'https://creativecommons.org/publicdomain/mark/1.0/'),
                                 im.get('created', '')), reverse=False)
        im = ims[0]
        genus = queries[0].split(' ')[0].lower()
        own = i == 0 or im['_links']['specificNode']['title'].split(' ')[0].lower() == genus
        return im, title, ('member' if i == 0 and is_group(q) else 'own' if own else 'relative')
    return None, None, None

def fetch_png(im):
    files = sorted(im['_links']['rasterFiles'], key=lambda r: int(r['sizes'].split('x')[0]))
    best = next((r for r in files if int(r['sizes'].split('x')[0]) >= 400), files[-1])
    with urllib.request.urlopen(urllib.request.Request(best['href'], headers=UA), timeout=120) as r: raw = r.read()
    img = Image.open(io.BytesIO(raw)).convert('RGBA')
    if img.width > 512: img = img.resize((512, round(img.height * 512 / img.width)), Image.LANCZOS)
    a = img.getchannel('A')
    out = Image.merge('LA', (Image.new('L', img.size, 0), a))      # black, with the silhouette's own edges
    buf = io.BytesIO(); out.save(buf, 'PNG', optimize=True); return buf.getvalue(), out.size

def main():
    if '--coverage' in sys.argv:
        names = json.load(open(sys.argv[sys.argv.index('--coverage') + 1]))
        own = rel = none = 0; misses = []
        for n in names:
            genus = n.split(' (')[0].split()[0]
            uuid, _ = node_for(n.split(' (')[0])
            if not uuid: uuid, _ = node_for(genus)
            ok = bool(uuid) and any(im['_links']['license']['href'] in OK_LIC for im in images_for(uuid))
            if ok: own += 1
            else: none += 1; misses.append(n)
            time.sleep(0.15)
        print(json.dumps({'checked': len(names), 'own or genus': own, 'none yet': none, 'misses': misses}, indent=1)); return
    os.makedirs(os.path.join(ROOT, 'tiles', 'sil'), exist_ok=True)
    out, keys = {}, list(WANT)
    if '--only' in sys.argv:
        keys = sys.argv[sys.argv.index('--only') + 1].split(',')
        old = open(os.path.join(ROOT, 'tools', 'source', 'silhouettes-data.js')).read()
        out = json.loads(old[old.index('const SIL = ') + 12:old.rindex(';')])
    for key in keys:
        q = WANT[key]
        im, title, level = pick(key, q)
        if not im: print('no silhouette for', key, file=sys.stderr); continue
        png, (w, h) = fetch_png(im)
        open(os.path.join(ROOT, 'tiles', 'sil', key + '.png'), 'wb').write(png)
        L = im['_links']
        out[key] = {'f': 'tiles/sil/' + key + '.png', 'w': w, 'h': h, 'by': im.get('attribution') or L.get('contributor', {}).get('title', ''),
                    'lic': OK_LIC[L['license']['href']], 'licUrl': L['license']['href'], 'of': L['specificNode']['title'], 'level': level, 'img': im['uuid']}
        print(f"{key:16s} {level:8s} {out[key]['of']:32s} {out[key]['lic']:10s} {out[key]['by']}  ({len(png) // 1024} KB)", file=sys.stderr)
        time.sleep(0.3)
    js = ('/* Animal silhouettes from PhyloPic (phylopic.org) — GENERATED by tools/build_silhouettes.py. Each is CC0, public domain '
          'or CC BY, and its credit is shown wherever it is used. The pictures themselves are in tiles/sil/. */\n'
          'const SIL = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    open(os.path.join(ROOT, 'tools', 'source', 'silhouettes-data.js'), 'w').write(js)

if __name__ == '__main__':
    main()
