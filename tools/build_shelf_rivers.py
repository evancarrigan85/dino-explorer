#!/usr/bin/env python3
"""Rivers across the dry sea floor: where today's rivers ran when the Ice Age sea was low.

When the sea fell by up to 130 m, the continental shelves came out of the water and the rivers ran on
across them to the new coast: the Channel River (the Rhine, Thames and Seine together) down what is now
the English Channel, the rivers of Sundaland, the Ur-Schatt down the Persian Gulf. Nobody has mapped all
of these channels, so this traces them: from each river mouth, the way water would run over today's
sea floor (the ETOPO 20-arc-minute grid the Ice Age coasts are drawn from), always downhill, filling
hollows until they spill, until it reaches water deeper than 135 m. The page draws each trace only as far
as the sea level of the moment leaves dry.

The ice changed where the water could go. For every ice outline in quaternary-data.js the tracing is done
again with the ice as a wall: so with the British and Scandinavian ice joined across the North Sea, the
Rhine finds its way south through the Strait of Dover into the Channel, as the sea-floor valleys and the
Channel River's mud in the Bay of Biscay show it did (Toucanne et al. 2009). Before about 450,000 years ago
the Strait of Dover was not yet cut (Gupta et al. 2017): for older outlines a chalk ridge closes it.

Limits, said on the page: today's sea floor, not the floor of the time (mud has filled old channels); a 37 km
grid, so a trace is a sketch of the route, not the channel; inland seas cut off from the ocean (the Black Sea,
the Caspian) end a river; the lakes that formed against the ice are not drawn.

Usage: python3 -I build_shelf_rivers.py etopo20data.gz etopo20lats.gz etopo20lons.gz rivers-data.js quaternary-data.js out.js
Requires numpy, Pillow.
"""
import sys, gzip, re, json, heapq
import numpy as np
from PIL import Image, ImageDraw

dfile, latf, lonf, rvjs, qjs, out = sys.argv[1:7]
log = lambda *a: print(*a, file=sys.stderr, flush=True)
A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
IDX = {c: i for i, c in enumerate(A)}
def reader(s):
    pos = [0]
    def u():
        r = sh = 0
        while True:
            c = IDX[s[pos[0]]]; pos[0] += 1; r += (c & 31) << sh; sh += 5
            if not c & 32: return r
    def z():
        v = u(); return -(v + 1) // 2 if v % 2 else v // 2
    return u, z

# ── the grid, on -180..180, north up ────────────────────────────────
d = np.loadtxt(gzip.open(dfile)); la = np.loadtxt(gzip.open(latf)); lo = np.loadtxt(gzip.open(lonf))
lo = ((lo + 180) % 360) - 180
order = np.argsort(lo[:-1]); lo = lo[:-1][order]; d = d[:, :-1][:, order]
d = d[::-1]; la = la[::-1]                           # row 0 = north
H, W = d.shape
STEP = 1 / 3
def cell(lon, lat):
    return int(np.clip(round((la[0] - lat) / STEP), 0, H - 1)), int(round((lon - lo[0]) / STEP)) % W
DEEP = -135

# the world ocean: sea floor joined to the open ocean through water (an inland sea is not ocean)
def flood(mask, seeds):
    seen = np.zeros_like(mask); st = list(seeds)
    for r, c in st: seen[r, c] = True
    while st:
        r, c = st.pop()
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                rr, cc = r + dr, (c + dc) % W
                if 0 <= rr < H and mask[rr, cc] and not seen[rr, cc]: seen[rr, cc] = True; st.append((rr, cc))
    return seen
ocean = flood(d < 0, [cell(-150, 0), cell(-30, 0), cell(80, -20)])
deep = ocean & (d < DEEP)
log(f'grid {W}x{H}; ocean cells {ocean.sum()}, deeper than {-DEEP} m {deep.sum()}')

# ── the rivers, exactly as the page has them ────────────────────────
txt = open(rvjs).read(); s = txt[txt.index('"') + 1:txt.rindex('"')]
u, z = reader(s)
lines = []
for _ in range(u()):
    r = u(); n = u(); x = y = 0; pts = []
    for _ in range(n): x += z(); y += z(); pts.append((x / 100, y / 100))
    lines.append((r, pts))
log(f'{len(lines)} river lines')
def wet(r, c, rad=1):
    for dr in range(-rad, rad + 1):
        for dc in range(-rad, rad + 1):
            rr, cc = r + dr, (c + dc) % W
            if 0 <= rr < H and ocean[rr, cc]: return True
    return False
mouths = []                                           # (lon, lat, rank class, cell)
for r, pts in lines:
    best = None
    for p in (pts[0], pts[-1]):
        rc = cell(*p)
        if wet(*rc) and (best is None or d[rc] < d[best[1]]): best = (p, rc)
    if best: mouths.append((best[0][0], best[0][1], 0 if r <= 2 else 1 if r <= 4 else 2, best[1]))
# one trace per mouth cell: several lines (a delta's arms) can share one
seen, M = {}, []
for m in sorted(mouths, key=lambda m: m[2]):
    if m[3] in seen: continue
    seen[m[3]] = len(M); M.append(m)
log(f'{len(M)} river mouths on the open sea')

# ── the ice outlines, from the page's own block ─────────────────────
q = open(qjs).read()
slices = json.loads(re.search(r'const ICE_SLICES = (\[.*?\]);\n', q).group(1))
s = re.search(r'const ICE_PACKED = "([^"]*)"', q).group(1); u, z = reader(s)
ice = []
for _ in range(u()):
    u(); polys = []
    for _ in range(u()):
        rings = []
        for _ in range(u()):
            n = u(); x = y = 0; ring = []
            for _ in range(n): x += z(); y += z(); ring.append((x / 10, y / 10))
            rings.append(ring)
        polys.append(rings)
    ice.append(polys)
assert len(ice) == len(slices)
def ice_mask(polys):
    im = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(im)
    px = lambda p: ((p[0] - lo[0]) / STEP, (la[0] - p[1]) / STEP)
    for rings in polys:
        dr.polygon([px(p) for p in rings[0]], fill=1)
        for h in rings[1:]: dr.polygon([px(p) for p in h], fill=0)
    return np.array(im, dtype=bool)

# the Strait of Dover before it was cut: a chalk ridge from Kent to the Boulonnais
ridge = np.zeros((H, W), dtype=bool)
for lat in np.arange(50.6, 51.4, 0.1):
    for lon in np.arange(0.9, 2.1, 0.1):
        ridge[cell(lon, lat)] = True

DEEPF = deep.ravel().tolist()
def route(wall, ridge_on):
    """Priority flood from the deep ocean: each cell's downstream neighbour, the ice a wall (flat lists: fast)."""
    e = d.copy()
    if ridge_on: e[ridge & (e < 30)] = 30
    E = e.ravel().tolist(); Wl = wall.ravel().tolist(); N = H * W
    down = [-1] * N; fill = [float('inf')] * N; done = bytearray(N); hp = []
    for i in range(N):
        if DEEPF[i] and not Wl[i]: fill[i] = E[i]; hp.append((E[i], i))
    heapq.heapify(hp)
    lo_r, hi_r = 20 * W, (H - 60) * W
    while hp:
        h, i = heapq.heappop(hp)
        if done[i]: continue
        done[i] = 1
        if i < lo_r or i >= hi_r: continue             # nothing to route near the poles
        r, c = divmod(i, W)
        for dr in (-W, 0, W):
            for dc in (-1, 0, 1):
                if not dr and not dc: continue
                cc = c + dc
                j = r * W + dr + (cc % W)
                if done[j] or Wl[j]: continue
                nh = E[j] if E[j] > h else h
                if nh < fill[j]: fill[j] = nh; down[j] = i; heapq.heappush(hp, (nh, j))
    return np.array(down, dtype=np.int64).reshape(H, W)
def trace(down, m):
    r, c = m[3]; path = [(m[0], m[1], 0)]
    for _ in range(400):
        nx = down[r, c]
        if nx < 0: return None                         # walled in: no way to the sea
        r, c = divmod(int(nx), W)
        lon, lat = lo[c], la[r]
        if abs(lon - path[-1][0]) > 180: return None   # do not cross the date line
        if not ocean[r, c] and d[r, c] < 0: return path if len(path) > 1 else None   # an inland sea ends it
        path.append((round(float(lon), 2), round(float(lat), 2), int(min(0, d[r, c]))))
        if deep[r, c]: return path
    return None
def chaikin(p, n=2):
    for _ in range(n):
        q = [p[0]]
        for a, b in zip(p, p[1:]):
            q.append((a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25, a[2] * .75 + b[2] * .25))
            q.append((a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75, a[2] * .25 + b[2] * .75))
        q.append(p[-1]); p = q
    return [(round(x, 2), round(y, 2), round(z)) for x, y, z in p]

configs = [('open', np.zeros((H, W), dtype=bool), False), ('open-old', np.zeros((H, W), dtype=bool), True)]
for i, sl in enumerate(slices):
    key, src, frm = sl[0], sl[4], sl[2]
    if key in ('pm0', 'patlgm'): continue
    configs.append((key, ice_mask(ice[i]), frm >= 429))
paths, pid, table = [], {}, {}
def keep(p):
    k = json.dumps(p)
    if k not in pid: pid[k] = len(paths); paths.append(p)
    return pid[k]
for key, wall, old in configs:
    down = route(wall, old)
    got = []
    for mi, m in enumerate(M):
        if wall[m[3]]: got.append(-1); continue
        p = trace(down, m)
        got.append(keep(chaikin(p)) if p and len(p) > 1 and min(x[2] for x in p) < -5 else -1)
    table[key] = got
    log(f'  {key}: {sum(g >= 0 for g in got)} traces')
base = {False: table['open'], True: table['open-old']}
diff = {}
for key, wall, old in configs[2:]:
    b = base[old]; dd = [[mi, g] for mi, g in enumerate(table[key]) if g != b[mi]]
    if dd: diff[key] = dd
npts = sum(len(p) for p in paths)
# pack: the paths as zig-zag deltas (hundredths of a degree, metres)
buf = []
def uu(n):
    while True:
        c = n & 31; n >>= 5
        buf.append(A[c | (32 if n else 0)])
        if not n: break
def sz(n): uu(-n * 2 - 1 if n < 0 else n * 2)
uu(len(paths))
for p in paths:
    uu(len(p)); px = py = pz = 0
    for x, y, zz in p:
        x, y = round(x * 100), round(y * 100); sz(x - px); sz(y - py); sz(zz - pz); px, py, pz = x, y, zz
js = ('/* Rivers across the dry sea floor — GENERATED by tools/build_shelf_rivers.py from the ETOPO 20-arc-minute grid '
      '(NOAA, public domain), today\'s rivers (rivers-data.js) and the ice outlines (quaternary-data.js). */\n'
      f'const SHELF_RIVERS = {{ paths: "{"".join(buf)}", rank: {json.dumps([m[2] for m in M])}, open: {json.dumps(base[False])}, '
      f'old: {json.dumps(base[True])}, ice: {json.dumps(diff, separators=(",", ":"))} }};\n')
open(out, 'w').write(js)
log(f'{len(paths)} distinct traces, {npts} points; {len(diff)} ice outlines change some; {len(js) // 1024} KB')
