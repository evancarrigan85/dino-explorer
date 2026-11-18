#!/usr/bin/env python3
"""Seas over the continents, 540 million years ago to today.

Two published sources, both CC BY 4.0, both made on the PALEOMAP plate model:
  * Scotese & Wright (2018), PALEOMAP PaleoDEMs (Zenodo 10.5281/zenodo.5460860): one 1-degree map of
    height and depth every 5 million years. Its 0 m line is the coast the page draws, and its -1,400 m
    line the edge of the continents (the same depth Kocsis & Scotese use for it).
  * Kocsis & Scotese (2021), Earth-Science Reviews 213, 103463 — PaleoCoastlines v7.1: for 81 moments,
    the coast at the HIGHEST the sea reached in that stretch of time, pushed out to every sea-living
    fossil of that age. Land the elevation maps call dry but that these maps put under the sea is kept
    as its own class: "land the sea reached at its highest".

Both are turned back to today's positions here: every pixel of an equal-area grid about 1 degree across
(J. S. Arias's pixelation, github.com/js-arias/gml-kocsis — only its grid is used) gets its PALEOMAP
plate, is carried to each age with the PALEOMAP v19o_r1c rotations Kocsis & Scotese used, and is read
there. The page then carries each pixel on OUR plates (Merdith et al. 2021, from plates-data.js).

Writes tools/source/seas-data.js:
    SEAS_PACKED = { step, stages, rows, n, z, share, high }
      rows   2 × pixels in each 1-degree ring (+1 when its centres start half a pixel east of -180),
             north pole first (181 rings)
      n      how many pixels are ever land or sea over a continent
      z      base64 of raw-deflate of, in turn: those pixels' ids (LEB128 deltas); the plate family
             each rides on (+1; 0 = none; one byte each); a 2-bit matrix, pixel by pixel, stage by
             stage — 0 deep ocean or no ground then, 1 sea over the continent (coast to -1,400 m),
             2 land, 3 land the sea reached at its highest
      share  per stage, tenths of a percent of the continents under the sea (classes 1 / 1+2+3)
      high   the same with the sea at its highest ((1+3) / (1+2+3))

Usage:  python3 -I build_seas.py <gml-kocsis dir> <PaleoDEM 1-degree netCDF dir> <PALEOMAP v19o_r1c dir> <PaleoCoastlines v7 dir (CS/, CM/)>
Run it again whenever plates-data.js is rebuilt (the families come from there), then build_dem.py.
"""
import sys, os, re, json, math, zlib, base64, glob
import numpy as np
import netCDF4, pygplates, shapefile

SRC, NC, PM, KC = sys.argv[1:5]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'source', 'seas-data.js')
STEP = 5
log = lambda *a: print(*a, file=sys.stderr, flush=True)

# ── the pixel grid ──────────────────────────────────────────────────
ids = {}
for line in open(os.path.join(SRC, 'pixel-ids-360.tab')):
    if line[0] in '#p': continue
    a = line.split('\t'); ids[int(a[0])] = (float(a[1]), float(a[2]))
rows, base = [], []
for pid in sorted(ids):
    lat = ids[pid][0]
    if not rows or rows[-1][0] != lat: rows.append([lat, 0]); base.append(pid)
    rows[-1][1] += 1
assert len(rows) == 181 and rows[0][0] == 90 and rows[-1][0] == -90, 'unexpected pixelation'
half = []                                     # rings are staggered: centres start at -180 or half a pixel east of it
for r, (lat, n) in enumerate(rows):
    w = 360 / n
    off = round((ids[base[r]][1] + 180) / w * 2) / 2
    assert off in (0, 0.5), (lat, n, off)
    half.append(int(off * 2))
    for k in range(n):                        # the page finds a pixel from its ring and longitude: check that rule
        lon = ids[base[r] + k][1]
        assert abs(lon - (-180 + (k + off) * w)) < 1e-3, (lat, n, k, lon)
        assert round((lon + 180) / w - off) % n == k
counts = [2 * n + h for (_, n), h in zip(rows, half)]   # pixels in the ring, doubled, +1 if staggered

# ── each map, read at every pixel's position at that time ───────────
rot = pygplates.RotationModel(os.path.join(PM, 'm06c9h_3id_forPgeog_19o_r1c.rot'))
part = pygplates.PlatePartitioner(pygplates.FeatureCollection(os.path.join(PM, 'PALEOMAP_PlatePolygons__forPgeog_v19o.gpml')), rot)
allp = sorted(ids); plate, born = {}, {}
for p in allp:
    r = part.partition_point(pygplates.PointOnSphere(*ids[p])); ft = r.get_feature() if r else None
    plate[p] = ft.get_reconstruction_plate_id() if ft else None; born[p] = ft.get_valid_time()[0] if ft else -1
dems = {}
for f in glob.glob(os.path.join(NC, '**', '*.nc'), recursive=True):
    m = re.search(r'_([0-9.]+)Ma\.nc$', f)
    if m: dems[round(float(m.group(1)) / STEP) * STEP] = f
S = len(dems); assert sorted(dems) == [i * STEP for i in range(S)], 'need one elevation map per 5 Myr'
slices = sorted(int(re.match(r'(\d+)Ma', os.path.basename(f)).group(1)) for f in glob.glob(os.path.join(KC, 'CS', '*Ma_CS_v7.shp')))
assert len(slices) > 70, 'PaleoCoastlines CS polygons not found'
still = pygplates.RotationModel(pygplates.FeatureCollection())
def polys(path):
    """A coast or margin map as two finders, outlines and holes. Read with pyshp: pygplates' own shapefile
    import silently returns nothing for eight of the 162 files (CS 155, 160, 165, 170, 185, 195, 250, 325 Ma).
    ESRI rings: outlines clockwise, holes counter-clockwise."""
    ext, hol = [], []
    for sh in shapefile.Reader(path).shapes():
        cuts = list(sh.parts) + [len(sh.points)]
        for a, b in zip(cuts, cuts[1:]):
            ring = sh.points[a:b]
            if len(ring) < 4: continue
            area = sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(ring, ring[1:]))
            f = pygplates.Feature(); f.set_geometry(pygplates.PolygonOnSphere([(y, x) for x, y in ring]))
            (ext if area < 0 else hol).append(f)
    P = lambda fs: pygplates.PlatePartitioner(pygplates.FeatureCollection(fs), still) if fs else None
    e, h = P(ext), P(hol)
    assert ext, f'no outlines read from {path}'
    return lambda q: bool(e and e.partition_point(q)) and not (h and h.partition_point(q))
def sample(z, lat, lon):
    y, x = lat + 90, lon + 180
    i, j = min(179, int(math.floor(y))), min(359, int(math.floor(x))); fy, fx = y - i, x - j
    return z[i, j] * (1 - fx) * (1 - fy) + z[i, j + 1] * fx * (1 - fy) + z[i + 1, j] * (1 - fx) * fy + z[i + 1, j + 1] * fx * fy
full = np.zeros((len(allp), S), np.uint8); agree = [0, 0]
for s in range(S):
    t = s * STEP
    z = netCDF4.Dataset(dems[t]).variables['z'][:].filled(np.nan).astype(float)
    k = min(slices, key=lambda x: (abs(x - t), x))                  # the nearest coast map (the younger on a tie)
    cs = polys(os.path.join(KC, 'CS', f'{k}Ma_CS_v7.shp')); cm = polys(os.path.join(KC, 'CM', f'{k}Ma_CM_v7.shp'))
    for i, p in enumerate(allp):
        if plate[p] is None or born[p] < t: continue
        q = rot.get_rotation(float(t), plate[p]) * pygplates.PointOnSphere(*ids[p])
        e = sample(z, *q.to_lat_lon())
        hi = 0 if not cm(q) else (2 if cs(q) else 1)                 # the coast maps: 0 / sea 1 / land 2
        if e != e: e = -9999
        v = 2 if e >= 0 else (1 if e >= -1400 else 0)               # the elevation maps' coast and continental edge
        if v == 0 and hi: v = hi                                    # (rare) the coast maps see a continent here
        if v == 2 and hi == 1: v = 3                                # dry on the elevation maps, sea at its highest
        full[i, s] = v
        if v and hi: agree[0] += 1; agree[1] += (v != 1) == (hi == 2) or v == 3
    if s % 20 == 0: log(f'  {t} Ma (coast map {k} Ma)')
keep = [i for i in range(len(allp)) if full[i].any()]
pix = [allp[i] for i in keep]; M = full[keep]
log(f'{len(pix)} pixels are land or sea over a continent at some stage; {S} stages, 0–{(S - 1) * STEP} Ma')

# share of the continents under the sea (pixels are equal-area, so counting is measuring)
share, high = [], []
for s in range(S):
    c = np.bincount(M[:, s], minlength=4); cont = max(1, c[1] + c[2] + c[3])
    share.append(round(1000 * c[1] / cont)); high.append(round(1000 * (c[1] + c[3]) / cont))

# ── which of the page's plate families each pixel rides on ──────────
txt = open(os.path.join(HERE, 'source', 'plates-data.js')).read()
P = json.loads(re.sub(r'(\w+):', r'"\1":', txt[txt.index('{', txt.index('PLATE_DATA')):txt.rindex('}') + 1]))
A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
LUT = {c: i for i, c in enumerate(A)}
d, pos = P['d'], 0
def u():
    global pos
    r = sh = 0
    while True:
        c = LUT[d[pos]]; pos += 1
        r += (c & 31) << sh; sh += 5
        if not c & 32: return r
def s_():
    v = u(); return -(v + 1) // 2 if v % 2 else v // 2
fam_end = []
for f in range(u()):
    n = u(); t = 0
    for k in range(n):
        t += u()
        for _ in range(4): s_()
    fam_end.append(t)
polys = []
D2R = math.pi / 180
for p in range(u()):
    f, hi, lo, nr = u(), u() / 10, (u() - 1) / 10, u()
    rings = []
    for r in range(nr):
        n = u(); lon = lat = 0; pts = []
        for i in range(n):
            lon += s_(); lat += s_(); pts.append((lon / P['cs'], lat / P['cs']))
        rings.append(np.array(pts))
    o = rings[0]
    la, lo_ = o[:, 1] * D2R, o[:, 0] * D2R
    xyz = np.column_stack([np.cos(la) * np.cos(lo_), np.cos(la) * np.sin(lo_), np.sin(la)])
    c = xyz.sum(0); c /= np.linalg.norm(c)
    polys.append(dict(f=f, xyz=xyz, c=c, cosr=float((xyz @ c).min())))
assert pos == len(d), 'plates-data.js did not decode cleanly'
log(f'{len(fam_end)} plate families, {len(polys)} pieces')

def ring_contains(xyz, v):
    """Same test as the page's engine: ray-cast in a gnomonic view centred on v."""
    vx, vy, vz = v
    ex, ey = -vy, vx; L = math.hypot(ex, ey)
    if L < 1e-9: ex, ey, L = 1.0, 0.0, 1.0
    ex /= L; ey /= L; ez = 0.0
    nx, ny, nz = vy * ez - vz * ey, vz * ex - vx * ez, vx * ey - vy * ex
    dd = xyz @ v; ok = dd > 0.05
    X = np.where(ok, (xyz[:, 0] * ex + xyz[:, 1] * ey) / np.where(ok, dd, 1), 0)
    Y = np.where(ok, (xyz @ np.array([nx, ny, nz])) / np.where(ok, dd, 1), 0)
    Xj, Yj, okj = np.roll(X, 1), np.roll(Y, 1), np.roll(ok, 1)
    with np.errstate(divide='ignore', invalid='ignore'):
        cross = ok & okj & ((Y > 0) != (Yj > 0)) & (0 < (Xj - X) * (0 - Y) / (Yj - Y) + X)
    return bool(cross.sum() % 2)

allpts = np.vstack([p['xyz'] for p in polys])
owner = np.concatenate([np.full(len(p['xyz']), i) for i, p in enumerate(polys)])
ends = np.array([fam_end[p['f']] for p in polys])
def nearest(v, min_end):
    ok = ends[owner] >= min_end
    if not ok.any(): return None
    dots = np.where(ok, allpts @ v, -2)
    i = int(dots.argmax())
    return polys[owner[i]] if dots[i] >= math.cos(15 * D2R) else None
def attach(lat, lon, age):
    """The page's own rule (engine.js attach): the block it sits on if that plate goes back far enough,
    else the nearest block that does, within 15 degrees."""
    la, lo_ = lat * D2R, lon * D2R
    v = np.array([math.cos(la) * math.cos(lo_), math.cos(la) * math.sin(lo_), math.sin(la)])
    inside, inside_end = None, -1
    for p in polys:
        if p['c'] @ v < p['cosr'] - 0.02: continue
        if not ring_contains(p['xyz'], v): continue
        e = fam_end[p['f']]
        if e > inside_end: inside_end, inside = e, p
    if inside is not None and inside_end >= age: return inside['f']
    old = nearest(v, age)
    if old is not None: return old['f']
    if inside is not None: return inside['f']
    anyp = nearest(v, 0)
    return anyp['f'] if anyp is not None else -1

fam = []
for i, p in enumerate(pix):
    lat, lon = ids[p]
    oldest = int(np.nonzero(M[i])[0].max()) * STEP
    fam.append(attach(lat, lon, min(oldest, P['maxT'])))
    if i % 4000 == 0: log(f'  attached {i}/{len(pix)}')
log(f'{sum(1 for f in fam if f < 0)} pixels ride on no plate')

# ── pack ────────────────────────────────────────────────────────────
# one deflated blob: the pixel ids (as LEB128 deltas), the family of each (+1, one byte), then the 2-bit matrix
deltas = [pix[0]] + [b - a for a, b in zip(pix, pix[1:])]
head = bytearray()
for v in deltas:
    while True:
        c = v & 127; v >>= 7
        head.append(c | (128 if v else 0))
        if not v: break
assert max(fam) + 1 < 256
head += bytes(f + 1 for f in fam)
flat = M.reshape(-1)
pad = (-len(flat)) % 4
flat = np.concatenate([flat, np.zeros(pad, np.uint8)]).reshape(-1, 4)
packed = bytes(head) + (flat[:, 0] | flat[:, 1] << 2 | flat[:, 2] << 4 | flat[:, 3] << 6).astype(np.uint8).tobytes()
co = zlib.compressobj(9, zlib.DEFLATED, -15)
z = base64.b64encode(co.compress(packed) + co.flush()).decode()
back = zlib.decompress(base64.b64decode(z), -15)          # check the round trip the page will do
assert back == packed

data = dict(step=STEP, stages=S, rows=counts, n=len(pix), z=z, share=share, high=high)
body = json.dumps(data, separators=(',', ':'))
body = re.sub(r'"(\w+)":', r'\1:', body)
with open(OUT, 'w') as fo:
    fo.write('/* Seas over the continents — GENERATED by tools/build_seas.py, do not edit.\n'
             '   Sources (CC BY 4.0): Scotese & Wright (2018) PALEOMAP PaleoDEMs — coast and continental edge;\n'
             '   Kocsis & Scotese (2021) PaleoCoastlines v7.1 — the coast at the sea\'s highest. Both turned back to\n'
             '   present-day positions with the PALEOMAP v19o_r1c rotations on ~1-degree equal-area pixels\n'
             f'   (grid: J. S. Arias, github.com/js-arias/gml-kocsis). {len(pix)} pixels, {S} stages of {STEP} million years. */\n'
             'const SEAS_PACKED = ' + body + ';\n')
log(f'wrote {OUT}: {os.path.getsize(OUT) / 1024:.0f} KB')
