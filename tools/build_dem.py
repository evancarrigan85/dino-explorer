#!/usr/bin/env python3
"""Height of the land and depth of the shallow seas, 540 million years ago to today.

Source: Scotese & Wright (2018), PALEOMAP Paleodigital Elevation Models (PaleoDEMs) for the
Phanerozoic, Zenodo doi 10.5281/zenodo.5460860, CC BY 4.0 — one 1-degree map of elevation and
ocean depth every 5 million years, 0–540 Ma, in ancient (PALEOMAP) positions.

The page carries everything on OUR plates (Merdith et al. 2021), so each map is first turned back to
today's positions: every pixel of the seas layer (tools/build_seas.py — the same pixels, in the same
order) is given its PALEOMAP plate, carried to the map's age with the PALEOMAP rotations that
Kocsis & Scotese (2021) used, and the elevation read there. Checked: the result agrees with their
coast and shelf-edge maps for 92–98% of pixels at every age tried.

Writes, beside the page (loaded on demand, like the close-up tiles):
    tiles/dem/mesh.bin       raw deflate: u32 nV, u32 nT; nV × (u16 pixel, u8 family+1); nT × 3 u16
                             — triangles between neighbouring pixels, one copy per plate where a
                             triangle straddles two plates, so the pieces overlap along their seams
    tiles/dem/s000.bin …     raw deflate: one byte per pixel per map (0 = no ground there then);
                             1–100 sea, 100 at sea level to 1 at -6,000 m; 101–255 land, 0 to 7,000 m
                             (square-root steps, so low ground and shallow water keep their detail)
and tools/source/dem-index.js (DEM_HAVE) so the page knows the files exist.

Usage:  python3 -I build_dem.py <gml-kocsis dir> <PaleoDEM 1° netCDF dir> <PALEOMAP v19o_r1c dir>
  gml-kocsis:  git clone https://github.com/js-arias/gml-kocsis
  netCDFs:     Scotese_Wright_2018_Maps_1-88_1degX1deg_PaleoDEMS_nc.zip from the Zenodo record
  v19o_r1c:    Data/paleomap_model_v19o_r1c in PaleoCoastlines_v7.1.zip (Kocsis & Scotese, CC BY 4.0),
               in https://github.com/adamkocsis/2019-07-04_paleoCoastlines (data/PaleoMAP/2020-08-10_v7)
Requires: numpy, scipy, netCDF4, pygplates.
"""
import sys, os, re, glob, math, zlib, struct, json, base64
import numpy as np
import netCDF4, pygplates
from scipy.spatial import ConvexHull

KZ, NC, PM = sys.argv[1], sys.argv[2], sys.argv[3]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'tiles', 'dem')
STEP = 5
log = lambda *a: print(*a, file=sys.stderr, flush=True)
os.makedirs(OUT, exist_ok=True)

# ── the pixels, exactly as build_seas.py lists them ─────────────────
ids = {}
for line in open(os.path.join(KZ, 'pixel-ids-360.tab')):
    if line[0] in '#p': continue
    a = line.split('\t'); ids[int(a[0])] = (float(a[1]), float(a[2]))
listed = set()
for line in open(os.path.join(KZ, 'kocsis-landscape-unrot-360-5.tab')):
    if line[0] == '#' or line.startswith('equator'): continue
    listed.add(int(line.split('\t')[2]))
pix = sorted(listed)
idx = {p: i for i, p in enumerate(pix)}

# the plate family of each pixel, read back from the page's own seas block
txt = open(os.path.join(HERE, 'source', 'seas-data.js')).read()
P = json.loads(re.sub(r'(\w+):', r'"\1":', txt[txt.index('{', txt.index('SEAS_PACKED')):txt.rindex('}') + 1]))
assert P['n'] == len(pix), 'seas-data.js was built from different pixels: rebuild it first'
blob = zlib.decompress(base64.b64decode(P['z']), -15); pos = 0; pid = 0
for i in range(len(pix)):
    v = sh = 0
    while True:
        c = blob[pos]; pos += 1; v |= (c & 127) << sh; sh += 7
        if not c & 128: break
    pid += v; assert pid == pix[i]
fam = [blob[pos + i] - 1 for i in range(len(pix))]
log(f'{len(pix)} pixels, families from seas-data.js')

# ── mesh: neighbouring pixels joined into triangles (a convex hull of points on a sphere is
#    their spherical Delaunay triangulation) ──────────────────────────
allp = sorted(ids)
xyz = np.array([[math.cos(math.radians(ids[p][0])) * math.cos(math.radians(ids[p][1])),
                 math.cos(math.radians(ids[p][0])) * math.sin(math.radians(ids[p][1])),
                 math.sin(math.radians(ids[p][0]))] for p in allp])
hull = ConvexHull(xyz)
verts, vkey, tris = [], {}, []
def vert(i, f):
    k = (i, f)
    if k not in vkey: vkey[k] = len(verts); verts.append(k)
    return vkey[k]
for a, b, c in hull.simplices:
    pa, pb, pc = allp[a], allp[b], allp[c]
    if pa not in idx or pb not in idx or pc not in idx: continue
    ia, ib, ic = idx[pa], idx[pb], idx[pc]
    # wind every triangle the same way (counter-clockwise seen from outside) — not needed by the
    # page, which does not cull, but it keeps the file tidy
    if np.dot(np.cross(xyz[b] - xyz[a], xyz[c] - xyz[a]), xyz[a]) < 0: ib, ic = ic, ib
    for f in sorted({fam[ia], fam[ib], fam[ic]} - {-1}):
        tris.append((vert(ia, f), vert(ib, f), vert(ic, f)))
assert len(verts) < 65536
mesh = struct.pack('<II', len(verts), len(tris)) + b''.join(struct.pack('<HB', i, f + 1) for i, f in verts) + b''.join(struct.pack('<HHH', *t) for t in tris)
co = zlib.compressobj(9, zlib.DEFLATED, -15); open(os.path.join(OUT, 'mesh.bin'), 'wb').write(co.compress(mesh) + co.flush())
log(f'mesh: {len(verts)} vertices, {len(tris)} triangles')

# ── each map, turned back to today's positions ──────────────────────
rot = pygplates.RotationModel(os.path.join(PM, 'm06c9h_3id_forPgeog_19o_r1c.rot'))
part = pygplates.PlatePartitioner(pygplates.FeatureCollection(os.path.join(PM, 'PALEOMAP_PlatePolygons__forPgeog_v19o.gpml')), rot)
plate, born = [], []
for p in pix:
    r = part.partition_point(pygplates.PointOnSphere(*ids[p]))
    ft = r.get_feature() if r else None
    plate.append(ft.get_reconstruction_plate_id() if ft else None); born.append(ft.get_valid_time()[0] if ft else -1)
files = {}
for f in glob.glob(os.path.join(NC, '**', '*.nc'), recursive=True):
    m = re.search(r'_([0-9.]+)Ma\.nc$', f)
    if m: files[round(float(m.group(1)) / STEP) * STEP] = f
S = len(P['share']); assert sorted(files) == [i * STEP for i in range(S)], 'need one map per stage'

def code(e):
    if e != e: return 0
    if e < 0: return 100 - int(round(99 * math.sqrt(min(1.0, -e / 6000))))
    return 101 + int(round(154 * math.sqrt(min(1.0, e / 7000))))
def sample(z, lat, lon):
    y, x = lat + 90, lon + 180
    i, j = min(179, int(math.floor(y))), min(359, int(math.floor(x))); fy, fx = y - i, x - j
    return z[i, j] * (1 - fx) * (1 - fy) + z[i, j + 1] * fx * (1 - fy) + z[i + 1, j] * (1 - fx) * fy + z[i + 1, j + 1] * fx * fy
total = 0
for s in range(S):
    t = s * STEP
    nc = netCDF4.Dataset(files[t]); z = nc.variables['z'][:].filled(np.nan).astype(float)
    assert z.shape == (181, 361) and nc.variables['lat'][0] == -90 and nc.variables['lon'][0] == -180
    out = bytearray(len(pix))
    for i, p in enumerate(pix):
        if plate[i] is None or born[i] < t: continue
        lat, lon = (rot.get_rotation(float(t), plate[i]) * pygplates.PointOnSphere(*ids[p])).to_lat_lon()
        out[i] = code(sample(z, lat, lon))
    co = zlib.compressobj(9, zlib.DEFLATED, -15); b = co.compress(bytes(out)) + co.flush()
    open(os.path.join(OUT, f's{t:03d}.bin'), 'wb').write(b); total += len(b)
    if s % 20 == 0: log(f'  map {t} Ma: {len(b) / 1024:.1f} KB')
log(f'{S} maps, {total / 1024:.0f} KB in all')
with open(os.path.join(HERE, 'source', 'dem-index.js'), 'w') as fo:
    fo.write('/* Height of the land and depth of the shallow seas: which files exist in tiles/dem — GENERATED by\n'
             '   tools/build_dem.py from Scotese & Wright (2018) PaleoDEMs, CC BY 4.0. */\n'
             f'const DEM_HAVE = {{ step: {STEP}, stages: {S}, n: {len(pix)}, v: {len(verts)}, t: {len(tris)} }};\n')
