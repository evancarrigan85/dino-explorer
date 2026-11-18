#!/usr/bin/env python3
"""The last 3.6 million years from the evidence: sea level and the northern ice sheets.

Sources:
  Sea level, 0-798 ka   Spratt & Lisiecki (2016), Climate of the Past 12, 1079-1092 — a stack (average) of
              seven published sea-level records from deep-sea cores, scaled to the dated Holocene and
              Last Glacial Maximum shorelines; the "long PC1" column, one value per 1,000 years, about
              ±10 m. NOAA World Data Center for Paleoclimatology, spratt2016.txt (public domain), also in
              github.com/benmarwick/gsloid (data-raw/spratt2016.txt).
  Sea level, 798 ka-3.6 Ma   Berends, de Boer & van de Wal (2021), Climate of the Past 17, 361-377 — an
              ice-sheet model run through the deep-sea oxygen-isotope record, every 100 years (CC BY 4.0;
              Zenodo 10.5281/zenodo.3793592, Berends_etal_2020_CP_supplement.dat). Where both exist
              (440-780 ka) they agree to a few metres; the page blends them over 780-798 ka.
  The page keeps Lambeck et al. (2014) for the last 30,000 years, where the dated shorelines are better
  than any stack; it blends into this curve between 26 and 32 ka.
  Ice, 0-80 ka   PaleoMIST 1.0 (Gowan et al. 2021, Nature Communications 12, 1199): ice-sheet margins
              every 2,500 years for North America (with Greenland), Eurasia and Patagonia. The margin
              files are in github.com/evangowan/icesheet (global/<region>/margins/<years>.gmt), the
              program that made the reconstruction; the data are also on PANGAEA (CC BY 4.0).
  Ice, 80 ka-3.6 Ma   Batchelor et al. (2019), Nature Communications 10, 3713: best-estimate outlines of
              the northern ice sheets for 18 moments (osf.io/7jen3, CC BY 4.0), used here from the
              copy in Zenodo 10.5281/zenodo.24136563 (ice_outlines.geojson, unchanged from the source).

Writes tools/source/quaternary-data.js:
  QUAT_SL      sea level in whole metres, one value per 1,000 years from 3,600 ka to today (packed)
  ICE_SLICES   one entry per ice outline: [key, label, from ka, to ka, source, lowest sea level in its window]
  ICE_PACKED   the outlines, packed like the shorelines (tenths of a degree), in ICE_SLICES order

Usage: python3 -I build_quaternary.py spratt2016.txt berends.dat ice_outlines.geojson <icesheet repo> quaternary-data.js
Requires numpy, shapely.
"""
import sys, os, json
import numpy as np
from shapely.geometry import Polygon, MultiPolygon, shape, box
from shapely.ops import unary_union
from shapely.geometry.polygon import orient

sp, bd, bat, ism, out = sys.argv[1:6]
log = lambda *a: print(*a, file=sys.stderr, flush=True)
A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
buf = []
def u(n):
    while True:
        c = n & 31; n >>= 5
        buf.append(A[c | (32 if n else 0)])
        if not n: break
def sz(n): u(-n * 2 - 1 if n < 0 else n * 2)

# ── sea level: one value per kyr ───────────────────────────────────
d = np.loadtxt(bd, comments='%')
ka, sl = -d[:, 0], d[:, 1]                         # kyr ago (positive), metres
order = np.argsort(ka); ka, sl = ka[order], sl[order]
grid = np.arange(0, 3601)
ber = np.interp(grid, ka, sl)
rows = [l.split() for l in open(sp, encoding='latin-1') if l.strip() and l.strip()[0].isdigit()]
spr = {int(float(r[0])): float(r[5]) for r in rows if r[5].lower() != 'nan'}       # long PC1
assert min(spr) == 0 and max(spr) == 798 and len(spr) == 799, 'expected 0-798 ka, one per kyr'
w = np.clip((grid - 780) / 18, 0, 1)               # 0 up to 780 ka, 1 from 798 ka
sprg = np.array([spr.get(int(k), 0.0) for k in grid])
SL = np.round(sprg * (1 - w) + ber * w).astype(int)
log(f'sea level: {len(SL)} values, lowest {SL.min()} m at {grid[SL.argmin()]} ka, highest {SL.max()} m')
def lowest(a, b):                                  # lowest sea level between a and b ka
    return int(SL[int(min(a, b)):int(max(a, b)) + 1].min())

# ── ice outlines ────────────────────────────────────────────────────
TOL, MIN_AREA = 0.12, 0.25                         # degrees, square degrees (about 2,000 km² at 60°N)
frame = box(-180, -60, 180, 89.5)
def clean(g):
    g = g.buffer(0).intersection(frame).simplify(TOL, preserve_topology=True)
    parts = g.geoms if isinstance(g, MultiPolygon) else [g] if isinstance(g, Polygon) else [x for x in getattr(g, 'geoms', []) if isinstance(x, Polygon)]
    polys = []
    for q in parts:
        if q.is_empty or q.area < MIN_AREA: continue
        q = orient(q, sign=-1.0)
        rings = [q.exterior] + [h for h in q.interiors if Polygon(h).area > MIN_AREA]
        polys.append([[v for x, y in list(r.coords)[:-1] for v in (round(x * 10), round(y * 10))] for r in rings])
    return polys
def gmt(path):
    rings, cur, kind = [], None, 'P'
    for line in open(path):
        if line.startswith('>'):
            if cur: rings.append((kind, cur))
            cur, kind = [], 'P'; continue
        if line.startswith('# @H'):
            if cur: rings.append((kind, cur))
            cur, kind = [], 'H'; continue
        if line.startswith('#') or not line.strip(): continue
        x, y = map(float, line.split()[:2]); cur.append((x, y))
    if cur: rings.append((kind, cur))
    shells = []
    for k, r in rings:
        if len(r) < 4: continue
        if k == 'P': shells.append([r, []])
        elif shells: shells[-1][1].append(r)
    return unary_union([Polygon(s, h).buffer(0) for s, h in shells])

slices, packed = [], []
REG = ['North_America', 'Eurasia', 'Patagonia']
for yr in range(0, 80001, 2500):
    g = unary_union([gmt(os.path.join(ism, 'global', r, 'margins', f'{yr}.gmt')) for r in REG])
    slices.append([f'pm{yr // 100}', f'{yr:,} years ago' if yr else 'today', yr / 1000, yr / 1000, 'gowan2021', int(SL[yr // 1000])])
    packed.append(clean(g))
# Patagonia at the last glacial peak: stands in, paler, for the southern ice of older glacials (Batchelor
# et al. mapped only the north)
slices.append(['patlgm', 'Patagonia, 20,000 years ago', 20, 20, 'gowan2021', int(SL[20])])
packed.append(clean(gmt(os.path.join(ism, 'global', 'Patagonia', 'margins', '20000.gmt'))))
F = {f['properties']['key']: f for f in json.load(open(bat))['features']}
WIN = [('mis5a', 86, 72), ('mis5b', 92, 86), ('mis5c', 108, 92), ('mis5d', 117, 108), ('mis6', 190, 132), ('mis8', 279, 243),
       ('mis10', 365, 337), ('mis12', 477, 429), ('mis16', 677, 622), ('mis20', 928, 790), ('emat', 2600, 1780), ('lgauss', 3590, 2600)]
for k, a, b in WIN:
    f = F[k]; assert 'Batchelor' in f['properties']['source']
    slices.append([k, f['properties']['label'], a, b, 'batchelor2019', lowest(a, b)])
    packed.append(clean(shape(f['geometry'])))
u(len(packed))
total = 0
for i, polys in enumerate(packed):
    u(i); u(len(polys))
    for p in polys:
        u(len(p))
        for r in p:
            u(len(r) // 2); px = py = 0; total += len(r) // 2
            for j in range(0, len(r), 2):
                sz(r[j] - px); sz(r[j + 1] - py); px, py = r[j], r[j + 1]
ice = ''.join(buf); buf.clear()
log(f'ice: {len(packed)} outlines, {total} points, {len(ice) // 1024} KB')
# sea level, packed as zig-zag deltas
p = 0
for v in SL: sz(int(v) - p); p = int(v)
sls = ''.join(buf)
with open(out, 'w') as fo:
    fo.write('/* The last 3.6 million years — GENERATED by tools/build_quaternary.py. Sea level: Spratt & Lisiecki 2016 (0-798 ka), '
             'Berends et al. 2021 (to 3.6 Ma, CC BY 4.0), one value per 1,000 years. Ice: PaleoMIST 1.0, Gowan et al. 2021, every 2,500 years to 80 ka; Batchelor et al. 2019 '
             'before that (both CC BY 4.0). */\n')
    fo.write('const QUAT_SL = "' + sls + '";\n')
    fo.write('const ICE_SLICES = ' + json.dumps(slices, separators=(',', ':')) + ';\n')
    fo.write('const ICE_PACKED = "' + ice + '";\n')
log(f'{os.path.getsize(out) // 1024} KB written')
