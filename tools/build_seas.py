#!/usr/bin/env python3
"""Seas over the continents, 540 million years ago to today.

Source: Kocsis & Scotese (2021), "Mapping paleocoastlines and continental flooding
during the Phanerozoic", Earth-Science Reviews 213, 103463 — their PaleoCoastlines
(CC-BY 4.0): for 81 moments, where the coast stood (at the highest the sea reached in
that stage, checked against marine fossils) and where each continent's edge lay
(the -1,400 m depth line of the PALEOMAP elevation models).

J. Salvador Arias turned those maps back to today's positions as equal-area pixels
about 1 degree across, one map every 5 million years:
    git clone https://github.com/js-arias/gml-kocsis
The page carries each pixel on the plate it sits on in OUR plate model (Merdith et
al. 2021, from plates-data.js), so the seas drift with the land the page draws.

Writes tools/source/seas-data.js:
    SEAS_PACKED = { step, stages, rows, n, z, share }
      rows   2 × pixels in each 1-degree ring (+1 when its centres start half a pixel east of -180),
             north pole first (181 rings)
      n      how many pixels are ever land or shelf
      z      base64 of raw-deflate of, in turn: those pixels' ids (LEB128 deltas); the plate family
             each rides on (+1; 0 = none; one byte each); a 2-bit matrix, pixel by pixel, stage by
             stage — 0 deep ocean or no data, 1 sea over the continent (coast to -1,400 m), 2 land
      share  per stage, tenths of a percent of the continents under the sea

Usage:  python3 -I build_seas.py <gml-kocsis dir>
Run it again whenever plates-data.js is rebuilt: the families come from there.
"""
import sys, os, re, json, math, zlib, base64
import numpy as np

SRC = sys.argv[1] if len(sys.argv) > 1 else 'gml-kocsis'
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

# ── the landscape, stage by stage ───────────────────────────────────
val = {}
ages = set()
for line in open(os.path.join(SRC, 'kocsis-landscape-unrot-360-5.tab')):
    if line[0] == '#' or line.startswith('equator'): continue
    _, age, px, v = line.split('\t')
    age = int(age) // 1_000_000; v = int(v)
    assert age % STEP == 0 and v in (1, 3), (age, v)
    val.setdefault(int(px), {})[age] = 1 if v == 1 else 2
    ages.add(age)
S = max(ages) // STEP + 1
assert sorted(ages) == [i * STEP for i in range(S)], 'missing stages'
pix = sorted(val)
M = np.zeros((len(pix), S), np.uint8)
for i, p in enumerate(pix):
    for a, v in val[p].items(): M[i, a // STEP] = v
log(f'{len(pix)} pixels are land or shelf at some stage; {S} stages, 0–{(S - 1) * STEP} Ma')

# share of the continents under the sea (pixels are equal-area, so counting is measuring)
share = []
for s in range(S):
    sea, land = int((M[:, s] == 1).sum()), int((M[:, s] == 2).sum())
    share.append(round(1000 * sea / max(1, sea + land)))

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

data = dict(step=STEP, stages=S, rows=counts, n=len(pix), z=z, share=share)
body = json.dumps(data, separators=(',', ':'))
body = re.sub(r'"(\w+)":', r'\1:', body)
with open(OUT, 'w') as fo:
    fo.write('/* Seas over the continents — GENERATED by tools/build_seas.py, do not edit.\n'
             '   Source: Kocsis & Scotese (2021), "Mapping paleocoastlines and continental flooding during\n'
             '   the Phanerozoic", Earth-Science Reviews 213, 103463 — PaleoCoastlines v7.1, CC-BY 4.0;\n'
             '   turned back to present-day positions as ~1-degree equal-area pixels by J. S. Arias\n'
             f'   (github.com/js-arias/gml-kocsis). {len(pix)} pixels, {S} stages of {STEP} million years. */\n'
             'const SEAS_PACKED = ' + body + ';\n')
log(f'wrote {OUT}: {os.path.getsize(OUT) / 1024:.0f} KB')
