#!/usr/bin/env python3
"""Stage 1 of the map-data pipeline.

Builds the land outlines the page animates, from three public sources:

  * the Merdith et al. (2021) plate model — rotation file, static plate
    polygons and deep-time "coastline" polygons (read with pygplates);
  * Natural Earth 1:50m land (public domain) — today's true coastline.

Today's land is cut along the model's plate boundaries, so every piece of
coast knows which plate it rides on. Pieces that move identically are merged
into "families"; each family gets the rotation history that carries it from
today's position back to MAXT million years ago, thinned to sparse quaternion
keyframes. Before 410 Ma — where the model itself stops using present-day
coastlines — the model's own continental-block polygons are used instead.

The browser then rotates every polygon itself, so continents drift
continuously instead of jumping between a handful of pre-drawn maps.

Usage:
  python3 -I build_plates.py <MERDITH2021 dir> <ne_land.json> <out.json>

Requires: pygplates, numpy, shapely.
"""
import sys, math, json, collections
import numpy as np
import pygplates
from shapely.geometry import Polygon, MultiPolygon, box
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

MODEL_DIR, NE_FILE, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

MAXT = 720                 # oldest time the site shows (start of the Cryogenian)
SWITCH = 410               # the model uses present-day coastlines up to this age
SIMPLIFY_DEG = 0.07        # tolerance for outlines that survive to today
SIMPLIFY_OLD_DEG = 0.22    # tolerance for outlines that only exist in deep time
MIN_AREA_DEG2 = 0.10       # islands smaller than this are dropped
KEY_TOL_DEG = 0.2          # max error when thinning rotation keyframes
HEAL_DEG = 0.035           # closes hairline gaps between abutting blocks
SEAM_DEG = 0.12            # plate pieces overlap this much along shared seams
TILE = 30                  # Natural Earth is pre-cut into TILE-degree tiles

D2R = math.pi / 180.0
SIMPLIFY, SIMPLIFY_OLD = SIMPLIFY_DEG * D2R, SIMPLIFY_OLD_DEG * D2R
HEAL, SEAM = HEAL_DEG * D2R, SEAM_DEG * D2R
MIN_AREA = MIN_AREA_DEG2 * D2R * D2R        # steradians (LAEA is equal-area)

rot = pygplates.RotationModel(MODEL_DIR + '/1000_0_rotfile_Merdith_et_al.rot')
static = pygplates.FeatureCollection(MODEL_DIR + '/shapes_static_polygons_Merdith_et_al.gpmlz')
coast = pygplates.FeatureCollection(MODEL_DIR + '/shapes_coastlines_Merdith_et_al_v2.gpmlz')
log = lambda *a: print(*a, file=sys.stderr, flush=True)


def ll2xyz(ll):
    ll = np.asarray(ll, dtype=float)
    lo, la = ll[:, 0] * D2R, ll[:, 1] * D2R
    c = np.cos(la)
    return np.column_stack([c * np.cos(lo), c * np.sin(lo), np.sin(la)])


def quat(t, pid):
    fr = rot.get_rotation(float(t), pid)
    if fr.represents_identity_rotation():
        return (0.0, 0.0, 0.0, 1.0)
    pole, ang = fr.get_euler_pole_and_angle()
    x, y, z = pole.to_xyz()
    s = math.sin(ang / 2)
    return (x * s, y * s, z * s, math.cos(ang / 2))


# ── Lambert azimuthal equal-area about a centre ──────────────────────
def basis(c):
    up = np.array([0.0, 0.0, 1.0])
    e1 = np.cross(up, c)
    if np.linalg.norm(e1) < 1e-6:
        e1 = np.array([0.0, 1.0, 0.0])
    e1 /= np.linalg.norm(e1)
    return e1, np.cross(c, e1)


def fwd(xyz, fr):
    c, e1, e2 = fr
    d = np.clip(xyz @ c, -0.999999, 1.0)
    k = np.sqrt(2.0 / (1.0 + d))
    return np.column_stack([k * (xyz @ e1), k * (xyz @ e2)])


def inv_xyz(xy, fr):
    c, e1, e2 = fr
    xy = np.asarray(xy, dtype=float)
    rho = np.hypot(xy[:, 0], xy[:, 1])
    rho = np.where(rho < 1e-12, 1e-12, rho)
    ang = 2.0 * np.arcsin(np.clip(rho / 2.0, -1, 1))
    p = (np.cos(ang)[:, None] * c[None, :]
         + (np.sin(ang) / rho)[:, None] * (xy[:, 0:1] * e1[None, :] + xy[:, 1:2] * e2[None, :]))
    return p / np.linalg.norm(p, axis=1)[:, None]


def xyz2ll(p):
    return np.column_stack([np.degrees(np.arctan2(p[:, 1], p[:, 0])),
                            np.degrees(np.arcsin(np.clip(p[:, 2], -1, 1)))])


def frame_of(xyz):
    c = xyz.mean(axis=0)
    if np.linalg.norm(c) < 1e-6:
        c = xyz[0]
    c = c / np.linalg.norm(c)
    e1, e2 = basis(c)
    return (c, e1, e2)


def cap_of(xyz):
    fr = frame_of(xyz)
    return fr, math.acos(float(np.clip((xyz @ fr[0]).min(), -1, 1)))


def poly_in(ext, holes, fr):
    try:
        pg = Polygon(fwd(ext, fr), [fwd(h, fr) for h in holes if len(h) >= 3])
    except Exception:
        return None
    if not pg.is_valid:
        pg = pg.buffer(0)
    return None if pg.is_empty else pg


def parts(geom):
    if geom is None or geom.is_empty:
        return []
    if isinstance(geom, Polygon):
        return [geom]
    return [g for g in getattr(geom, 'geoms', []) if isinstance(g, Polygon) and not g.is_empty]


def rings_xyz(pg, fr):
    return (inv_xyz(np.array(pg.exterior.coords)[:-1], fr),
            [inv_xyz(np.array(h.coords)[:-1], fr) for h in pg.interiors])


# ── 1. today's land, pre-cut into tiles so every piece is local ───────
ne = json.load(open(NE_FILE))
tiles = []                                   # (ext_xyz, [hole_xyz], cap frame, cap radius)
for rings in ne:
    try:
        pg0 = Polygon(rings[0], rings[1:])
    except Exception:
        continue
    if not pg0.is_valid:
        pg0 = pg0.buffer(0)
    for pg in parts(pg0):
        minx, miny, maxx, maxy = pg.bounds
        for tx in range(int(math.floor(minx / TILE)), int(math.floor(maxx / TILE)) + 1):
            for ty in range(int(math.floor(miny / TILE)), int(math.floor(maxy / TILE)) + 1):
                for piece in parts(pg.intersection(box(tx * TILE, ty * TILE, (tx + 1) * TILE, (ty + 1) * TILE))):
                    if piece.area < 1e-9:
                        continue
                    # densify so long tile edges stay put when re-projected
                    piece = piece.segmentize(0.5)
                    ext = ll2xyz(np.array(piece.exterior.coords)[:-1])
                    holes = [ll2xyz(np.array(h.coords)[:-1]) for h in piece.interiors]
                    fr, r = cap_of(ext)
                    tiles.append((ext, holes, fr, r))
log('natural earth tiles', len(tiles))
tile_c = np.array([t[2][0] for t in tiles])
tile_r = np.array([t[3] for t in tiles])

# ── 2. cut today's land along the model's plate boundaries ───────────
statics = []                                 # (pid, begin, end, ext, holes, centre, radius)
for f in static:
    pid = f.get_reconstruction_plate_id()
    b, e = f.get_valid_time()
    if e > MAXT:
        continue
    b = float(min(b, SWITCH)); e = float(max(e, 0.0))
    if b <= e:
        continue
    for g in f.get_geometries():
        if not isinstance(g, pygplates.PolygonOnSphere):
            continue
        g = g.to_tessellated(0.5 * D2R)       # so shared edges agree in every local projection
        ext = np.array([p.to_xyz() for p in g.get_exterior_ring_points()])
        holes = [np.array([p.to_xyz() for p in g.get_interior_ring_points(i)])
                 for i in range(g.get_number_of_interior_rings())]
        if len(ext) < 3:
            continue
        fr, r = cap_of(ext)
        if r > 2.6:                           # a polygon covering most of the globe: unusable here
            continue
        statics.append((pid, b, e, ext, holes, fr[0], r))
st_c = np.array([x[5] for x in statics])
st_r = np.array([x[6] for x in statics])
assigned = collections.defaultdict(list)     # static index -> [(ext_xyz, holes_xyz)]
n_left = 0
for text, tholes, tfr, tr in tiles:
    T = poly_in(text, tholes, tfr)
    if T is None:
        continue
    near = np.nonzero(np.arccos(np.clip(st_c @ tfr[0], -1, 1)) < st_r + tr + 0.03)[0]
    here = []
    for si in near:
        pid, b, e, ext, holes, c, r = statics[si]
        if float((ext @ tfr[0]).min()) < -0.9:
            continue
        S = poly_in(ext, holes, tfr)
        if S is None:
            continue
        S = S.buffer(SEAM)                    # neighbours overlap along seams → no hairlines
        here.append((si, S))
        try:
            for part in parts(T.intersection(S)):
                if part.area > 1e-9:
                    assigned[si].append(rings_xyz(part, tfr))
        except Exception:
            pass
    # Land the plate polygons leave uncovered (the model has real gaps along
    # old rift zones) goes to whichever plate is nearest, so no false lakes.
    if here:
        try:
            rest = T.difference(unary_union([S for _, S in here]))
        except Exception:
            rest = None
        for part in parts(rest):
            if part.area < 1e-9:
                continue
            si = min(here, key=lambda x: x[1].distance(part))[0]
            assigned[si].append(rings_xyz(part.buffer(SEAM * 0.5), tfr))
            n_left += 1
feats = []                                   # (pid, begin, end, [(ext, holes)], is_old)
for si, polys in assigned.items():
    pid, b, e = statics[si][:3]
    feats.append((pid, b, e, polys, False))
log('static polygons carrying land', len(feats), ' gap pieces reassigned', n_left)

# ── 3. the model's own continental blocks, for times before SWITCH ────
n_old = 0
for f in coast:
    pid = f.get_reconstruction_plate_id()
    b, e = f.get_valid_time()
    if b <= SWITCH or e > MAXT:
        continue
    b = float(min(b, MAXT)); e = float(max(e, SWITCH))
    polys = []
    for g in f.get_geometries():
        if not isinstance(g, pygplates.PolygonOnSphere):
            continue
        ext = np.array([p.to_xyz() for p in g.get_exterior_ring_points()])
        holes = [np.array([p.to_xyz() for p in g.get_interior_ring_points(i)])
                 for i in range(g.get_number_of_interior_rings())]
        if len(ext) >= 3:
            polys.append((ext, holes))
    if polys:
        feats.append((pid, b, e, polys, True))
        n_old += 1
log('deep-time blocks', n_old)

pids = sorted(set(f[0] for f in feats))
log('plates', len(pids))

# ── 4. dense rotation history per plate ──────────────────────────────
max_begin = collections.defaultdict(float)
for pid, b, e, _, _ in feats:
    max_begin[pid] = max(max_begin[pid], b)
dense = {}
for pid in pids:
    n = int(math.ceil(max_begin[pid])) + 1
    q = np.array([quat(t, pid) for t in range(0, n)])
    for i in range(1, len(q)):                 # keep neighbouring quats on one hemisphere
        if np.dot(q[i], q[i - 1]) < 0:
            q[i] = -q[i]
    dense[pid] = q

# ── 5. families: everything that moves identically while it exists ────
order = sorted(pids, key=lambda p: -max_begin[p])
reps, fam_of = [], {}
for pid in order:
    n = len(dense[pid])
    mine = np.round(dense[pid], 4)
    hit = None
    for i, (rp, rn) in enumerate(reps):
        if rn >= n and np.array_equal(np.round(dense[rp][:n], 4), mine):
            hit = i
            break
    if hit is None:
        reps.append((pid, n))
        hit = len(reps) - 1
    fam_of[pid] = hit
fam_feats = collections.defaultdict(list)
for pid, b, e, polys, old in feats:
    fam_feats[fam_of[pid]].append((b, e, polys, pid, old))
log('families', len(reps))


# ── thin a dense rotation track to sparse keyframes ──────────────────
def slerp(a, b, t):
    d = float(np.dot(a, b))
    if d < 0:
        b = -b; d = -d
    if d > 0.9995:
        r = a + t * (b - a)
        return r / np.linalg.norm(r)
    th = math.acos(d)
    return (math.sin((1 - t) * th) * a + math.sin(t * th) * b) / math.sin(th)


def qerr_deg(a, b):
    return 2.0 * math.degrees(math.acos(min(1.0, abs(float(np.dot(a, b))))))


def keyframes(q, n):
    keys, i = [0], 0
    while i < n - 1:
        j, best = i + 1, i + 1
        while j < n:
            if any(qerr_deg(slerp(q[i], q[j], (k - i) / (j - i)), q[k]) > KEY_TOL_DEG for k in range(i + 1, j)):
                break
            best = j
            j += 1
        keys.append(best)
        i = best
    return keys


# ── 6. build each family ─────────────────────────────────────────────
families, total_pts, total_polys = [], 0, 0
for fi in range(len(reps)):
    fl = fam_feats[fi]
    allxyz = np.vstack([ext for b, e, polys, pid, old in fl for ext, holes in polys])
    fr = frame_of(allxyz)

    def outline(geoms, tol):
        """Merge, heal, simplify; return polygons as lon/lat ring lists."""
        u = unary_union(geoms)
        u = u.buffer(HEAL, join_style=2).buffer(-HEAL, join_style=2)
        area = u.area
        u = u.simplify(tol, preserve_topology=True)
        out = []
        for pg in parts(u):
            if pg.area < MIN_AREA:
                continue
            pg = orient(pg, sign=-1.0)
            ext, holes = rings_xyz(pg, fr)
            rings = [xyz2ll(ext)] + [xyz2ll(h) for h, hr in zip(holes, pg.interiors) if Polygon(hr).area >= MIN_AREA * 2]
            if len(rings[0]) >= 3:
                out.append([np.round(r, 3).tolist() for r in rings])
        return out, area

    def project(group, keep):
        geoms = []
        for fb, fe, polys, pid, old in group:
            if keep(fb):
                for ext, holes in polys:
                    pg = poly_in(ext, holes, fr)
                    if pg is not None:
                        geoms.append(pg)
        return geoms

    versions = []
    # (a) deep time: one merged outline per distinct begin age, each REPLACING
    #     the one before it, handing over to today's coastlines at SWITCH.
    old = [x for x in fl if x[4]]
    prev_area = -1.0
    for b in sorted(set(round(x[0], 1) for x in old), reverse=True):
        geoms = project(old, lambda fb: round(fb, 1) >= b)
        if not geoms:
            continue
        out, area = outline(geoms, SIMPLIFY_OLD)
        if abs(area - prev_area) < 1e-9:
            continue                                   # nothing new appeared
        prev_area = area
        if out:
            if versions:
                versions[-1]['lo'] = b
            versions.append({'b': b, 'lo': SWITCH, 'polys': out, 'old': True, 'last': False})
    # (b) today's land: pieces are ADDED as their crust appears, never redrawn.
    #     Neighbouring pieces overlap by SEAM, so no seams show between them.
    new = [x for x in fl if not x[4]]
    for b in sorted(set(round(x[0], 1) for x in new), reverse=True):
        group = [x for x in new if round(x[0], 1) == b]
        geoms = project(group, lambda fb: True)
        if not geoms:
            continue
        out, area = outline(geoms, SIMPLIFY)
        if out:
            versions.append({'b': b, 'lo': min(x[1] for x in group), 'polys': out, 'old': False, 'last': True})
    if not versions:
        continue
    versions.sort(key=lambda v: -v['b'])
    n = int(math.ceil(versions[0]['b'])) + 1
    q = dense[reps[fi][0]][:n]
    keys = [[int(k)] + [round(float(v), 5) for v in q[k]] for k in keyframes(q, n)]
    total_pts += sum(len(r) for v in versions for p in v['polys'] for r in p)
    total_polys += sum(len(v['polys']) for v in versions)
    families.append({'pids': sorted(set(x[3] for x in fl)), 'keys': keys, 'versions': versions})

log('families kept', len(families), 'polygons', total_polys, 'points', total_pts,
    'keyframes', sum(len(f['keys']) for f in families))
log('  deep-time points', sum(len(r) for f in families for v in f['versions'] if v['old'] for p in v['polys'] for r in p),
    ' present-coast points', sum(len(r) for f in families for v in f['versions'] if not v['old'] for p in v['polys'] for r in p))
json.dump({'maxT': MAXT, 'families': families}, open(OUT, 'w'), separators=(',', ':'))
