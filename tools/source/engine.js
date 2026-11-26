// ============================================================
// WORLD MAP ENGINE — plate-tectonic reconstruction on canvas
// ============================================================
// Continents are stored once, in today's coordinates, as polygons grouped
// into rigid "families". Each family carries a rotation history (sparse
// quaternion keyframes from the Merdith et al. 2021 plate model). For any
// moment in time the engine rotates every polygon to where its plate was
// and hands the result to d3-geo, which projects and clips it. Nothing is
// pre-drawn, so land drifts continuously as the time slider moves.
const WorldMap = (() => {
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;

  // ── level of detail ────────────────────────────────────────────────
  // Douglas–Peucker on the unit sphere (chord distance). A phone showing the
  // whole world needs a tenth of the points a zoomed-in desktop does, and the
  // per-frame cost is all in the points.
  function thinRing(xyz, tol) {
    const n = xyz.length / 3; if (n < 8) return xyz;
    const keep = new Uint8Array(n); keep[0] = 1;
    // split the closed ring at the vertex farthest from vertex 0
    let far = 0, fd = -1;
    for (let i = 1; i < n; i++) { const d = (xyz[i*3]-xyz[0])**2 + (xyz[i*3+1]-xyz[1])**2 + (xyz[i*3+2]-xyz[2])**2; if (d > fd) { fd = d; far = i; } }
    keep[far] = 1;
    const t2 = tol * tol, stack = [[0, far], [far, n]];
    while (stack.length) {
      const [a, b] = stack.pop(); if (b - a < 2) continue;
      const bi = b % n, ax = xyz[a*3], ay = xyz[a*3+1], az = xyz[a*3+2];
      const dx = xyz[bi*3] - ax, dy = xyz[bi*3+1] - ay, dz = xyz[bi*3+2] - az, L2 = dx*dx + dy*dy + dz*dz || 1e-12;
      let md = -1, mi = -1;
      for (let i = a + 1; i < b; i++) {
        const px = xyz[i*3] - ax, py = xyz[i*3+1] - ay, pz = xyz[i*3+2] - az;
        let k = (px*dx + py*dy + pz*dz) / L2; k = k < 0 ? 0 : k > 1 ? 1 : k;
        const ex = px - k*dx, ey = py - k*dy, ez = pz - k*dz, d = ex*ex + ey*ey + ez*ez;
        if (d > md) { md = d; mi = i; }
      }
      if (md > t2) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
    }
    let m = 0; for (let i = 0; i < n; i++) m += keep[i];
    if (m < 3) return null;
    const out = new Float32Array(m * 3); let j = 0;
    for (let i = 0; i < n; i++) if (keep[i]) { out[j++] = xyz[i*3]; out[j++] = xyz[i*3+1]; out[j++] = xyz[i*3+2]; }
    return out;
  }
  // Spherical area of a ring as d3 sees it: under 2π for a properly wound
  // outline, over 2π when the winding is reversed (d3 then fills everything
  // *except* the ring — one bad ring paints the whole globe as land).
  function ringArea(xyz) {
    const c = [];
    for (let i = 0; i < xyz.length; i += 3) c.push([Math.atan2(xyz[i + 1], xyz[i]) * 180 / Math.PI, Math.asin(Math.max(-1, Math.min(1, xyz[i + 2]))) * 180 / Math.PI]);
    c.push(c[0]);
    return d3.geoArea({ type: 'Polygon', coordinates: [c] });
  }
  /* Thinned copy of a polygon. Thinning a sliver can fold it over itself and
     flip its winding, so every thinned ring is checked against the original
     and the original is kept whenever the result is not clearly the same shape. */
  function thin(rings, tolDeg) {
    const tol = tolDeg * Math.PI / 180, out = [];
    for (let i = 0; i < rings.length; i++) {
      const full = rings[i], hole = i > 0;
      const aFull = hole ? 4 * Math.PI - ringArea(full) : ringArea(full);
      if (aFull < tol * tol * 0.5) { if (hole) continue; return []; }   // too small to see at this scale
      const r = thinRing(full, tol);
      if (!r) { if (hole) continue; return []; }
      const a = hole ? 4 * Math.PI - ringArea(r) : ringArea(r);
      out.push(a > aFull * 0.4 && a < aFull * 2.5 ? r : full);
    }
    return out;
  }

  // ── decode the packed plate data ───────────────────────────────────
  const fams = [], polys = [];
  (function decode(P) {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const lut = new Int8Array(128);
    for (let i = 0; i < 64; i++) lut[A.charCodeAt(i)] = i;
    const d = P.d; let pos = 0;
    const u = () => { let r = 0, sh = 0, c; do { c = lut[d.charCodeAt(pos++)]; r += (c & 31) * Math.pow(2, sh); sh += 5; } while (c & 32); return r; };
    const s = () => { const v = u(); return (v % 2) ? -(v + 1) / 2 : v / 2; };
    const nf = u();
    for (let f = 0; f < nf; f++) {
      const n = u(), t = new Float32Array(n), q = new Float32Array(n * 4);
      let pt = 0; const pq = [0, 0, 0, P.qs];
      for (let k = 0; k < n; k++) {
        pt += u(); t[k] = pt;
        for (let i = 0; i < 4; i++) pq[i] += s();
        const L = Math.hypot(pq[0], pq[1], pq[2], pq[3]) || 1;
        for (let i = 0; i < 4; i++) q[k * 4 + i] = pq[i] / L;
      }
      fams.push({ t, q, m: new Float64Array(9), stamp: -1, ok: false });
    }
    const np = u();
    for (let p = 0; p < np; p++) {
      const f = u(), hi = u() / 10, lo = (u() - 1) / 10, nr = u(), rings = [];
      for (let r = 0; r < nr; r++) {
        const n = u(), xyz = new Float32Array(n * 3);
        let lon = 0, lat = 0;
        for (let i = 0; i < n; i++) {
          lon += s(); lat += s();
          const lo_ = lon / P.cs * D2R, la_ = lat / P.cs * D2R, c = Math.cos(la_);
          xyz[i * 3] = c * Math.cos(lo_); xyz[i * 3 + 1] = c * Math.sin(lo_); xyz[i * 3 + 2] = Math.sin(la_);
        }
        rings.push(xyz);
      }
      // bounding cap of the outer ring — a cheap first test for "is this point on this block?"
      const o = rings[0]; let cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < o.length; i += 3) { cx += o[i]; cy += o[i + 1]; cz += o[i + 2]; }
      const L = Math.hypot(cx, cy, cz) || 1; cx /= L; cy /= L; cz /= L;
      let cosr = 1;
      for (let i = 0; i < o.length; i += 3) cosr = Math.min(cosr, o[i] * cx + o[i + 1] * cy + o[i + 2] * cz);
      polys.push({ f, hi, lo, rings, lod: [rings, thin(rings, 0.3), thin(rings, 0.8)], c: [cx, cy, cz], cosr });
    }
  })(PLATE_DATA);
  const MAXT = PLATE_DATA.maxT, EARTH_AGE = 4567;   // the map can go back to the Earth’s birth; the land only to MAXT

  // ── rotation of a family at time t (million years ago) ─────────────
  let stamp = 0;
  function famRot(fi, t) {
    const F = fams[fi];
    // cache per frame AND per time: a frame asks about one moment, but a trail
    // or a lookup asks about many in a row
    if (F.stamp === stamp && F.tt === t) return F.ok ? F.m : null;
    F.stamp = stamp; F.tt = t;
    const T = F.t, n = T.length;
    if (t > T[n - 1] + 1e-6) { F.ok = false; return null; }
    let i = 0;
    if (n > 1) { let lo = 0, hi = n - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (T[mid] <= t) lo = mid; else hi = mid; } i = lo; }
    const j = Math.min(i + 1, n - 1), Q = F.q;
    let ax = Q[i * 4], ay = Q[i * 4 + 1], az = Q[i * 4 + 2], aw = Q[i * 4 + 3];
    let bx = Q[j * 4], by = Q[j * 4 + 1], bz = Q[j * 4 + 2], bw = Q[j * 4 + 3];
    const span = T[j] - T[i], k = span > 0 ? Math.min(1, Math.max(0, (t - T[i]) / span)) : 0;
    let dot = ax * bx + ay * by + az * bz + aw * bw;
    if (dot < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; dot = -dot; }
    let wa = 1 - k, wb = k;
    if (dot < 0.9995) { const th = Math.acos(dot), sn = Math.sin(th); wa = Math.sin((1 - k) * th) / sn; wb = Math.sin(k * th) / sn; }
    let x = wa * ax + wb * bx, y = wa * ay + wb * by, z = wa * az + wb * bz, w = wa * aw + wb * bw;
    const L = Math.hypot(x, y, z, w) || 1; x /= L; y /= L; z /= L; w /= L;
    const m = F.m;
    m[0] = 1 - 2 * (y * y + z * z); m[1] = 2 * (x * y - z * w); m[2] = 2 * (x * z + y * w);
    m[3] = 2 * (x * y + z * w); m[4] = 1 - 2 * (x * x + z * z); m[5] = 2 * (y * z - x * w);
    m[6] = 2 * (x * z - y * w); m[7] = 2 * (y * z + x * w); m[8] = 1 - 2 * (x * x + y * y);
    F.ok = true;
    return m;
  }
  const visible = (p, t) => t <= p.hi && t > p.lo;

  // ── which block does a present-day place sit on? ───────────────────
  // Planar ray-cast in a gnomonic view centred on the test point: great
  // circles become straight lines there, so it is exact on the sphere.
  function ringContains(xyz, v) {
    const [vx, vy, vz] = v;
    // tangent basis at v
    let ex = -vy, ey = vx, ez = 0; let L = Math.hypot(ex, ey);
    if (L < 1e-9) { ex = 1; ey = 0; L = 1; } ex /= L; ey /= L;
    const nx = vy * ez - vz * ey, ny = vz * ex - vx * ez, nz = vx * ey - vy * ex;
    let inside = false, n = xyz.length / 3, px = 0, py = 0, pOk = false;
    const X = new Float64Array(n), Y = new Float64Array(n), OK = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const x = xyz[i * 3], y = xyz[i * 3 + 1], z = xyz[i * 3 + 2], d = x * vx + y * vy + z * vz;
      if (d > 0.05) { OK[i] = 1; X[i] = (x * ex + y * ey + z * ez) / d; Y[i] = (x * nx + y * ny + z * nz) / d; }
    }
    for (let i = 0, j = n - 1; i < n; j = i++) {
      if (!OK[i] || !OK[j]) continue;          // edges on the far hemisphere cannot cross a short ray
      if ((Y[i] > 0) !== (Y[j] > 0) && 0 < (X[j] - X[i]) * (0 - Y[i]) / (Y[j] - Y[i]) + X[i]) inside = !inside;
    }
    return inside;
  }
  function toXYZ(lat, lon) { const c = Math.cos(lat * D2R); return [c * Math.cos(lon * D2R), c * Math.sin(lon * D2R), Math.sin(lat * D2R)]; }
  /* Tie a present-day location to the plate block it sits on. What matters is
     that the block's plate has a known position at `age`: a fossil site must
     be carried back to the animal's own time. If the ground it sits on did
     not exist yet (younger crust), it rides with the nearest block that did. */
  // Blocks from the older model (before the join, when there is one) never carry a place younger than the join.
  const JOIN = PLATE_DATA.join || Infinity;
  function attach(lat, lon, age = 0) {
    const v = toXYZ(lat, lon), end = f => fams[f].t[fams[f].t.length - 1], older = p => age <= JOIN && p.lo >= JOIN;
    let inside = null, insideEnd = -1;
    for (const p of polys) {
      if (older(p)) continue;
      if (p.c[0] * v[0] + p.c[1] * v[1] + p.c[2] * v[2] < p.cosr - 0.02) continue;
      if (!ringContains(p.rings[0], v)) continue;
      const e = end(p.f); if (e > insideEnd) { insideEnd = e; inside = p; }
    }
    if (inside && insideEnd >= age) return { f: inside.f, v, lat, lon };
    const nearest = minEnd => {
      let best = null, bd = -2;
      for (const p of polys) {
        if (end(p.f) < minEnd || older(p)) continue;
        const dc = p.c[0] * v[0] + p.c[1] * v[1] + p.c[2] * v[2];
        if (dc < Math.cos(Math.min(Math.PI, Math.acos(Math.max(-1, p.cosr)) + 0.3))) continue;
        const o = p.rings[0];
        for (let i = 0; i < o.length; i += 3) { const d = o[i] * v[0] + o[i + 1] * v[1] + o[i + 2] * v[2]; if (d > bd) { bd = d; best = p; } }
      }
      return bd >= Math.cos(15 * D2R) ? best : null;
    };
    const old = nearest(age);
    if (old) return { f: old.f, v, lat, lon };
    if (inside) return { f: inside.f, v, lat, lon };
    const any = nearest(0);
    return { f: any ? any.f : -1, v, lat, lon };
  }
  /* Where was an attached place at time t? Returns [lon, lat] or null if its
     plate has no history that far back. */
  function locate(a, t) {
    if (a.f < 0) return t < 1 ? [a.lon, a.lat] : null;
    const m = famRot(a.f, t); if (!m) return null;
    const [x, y, z] = a.v;
    const X = m[0] * x + m[1] * y + m[2] * z, Y = m[3] * x + m[4] * y + m[5] * z, Z = m[6] * x + m[7] * y + m[8] * z;
    return [Math.atan2(Y, X) * R2D, Math.asin(Math.max(-1, Math.min(1, Z))) * R2D];
  }

  // ── seas over the continents, 540 million years ago to today ───────
  // Kocsis & Scotese (2021) mapped, for 81 moments, where the coast stood (at the highest the sea
  // reached) and where each continent's edge lay (1,400 m down). J. S. Arias turned their maps back to
  // today's positions as ~1° pixels, one map every 5 million years. Here each pixel rides on its
  // plate, so the seas drift with the land; the pixels are read as a grid and traced into smooth
  // outlines once per map, plate by plate.
  const SEA = { P: typeof SEAS_PACKED === 'undefined' ? null : SEAS_PACKED, st: 'idle', cache: new Map() };
  const GW = 360, GH = 181;
  function seaLoad() {
    if (!SEA.P || SEA.st !== 'idle') return;
    if (typeof DecompressionStream === 'undefined' || typeof Response === 'undefined') { SEA.st = 'none'; return; }
    SEA.st = 'loading';
    const P = SEA.P, bin = Uint8Array.from(atob(P.z), ch => ch.charCodeAt(0));
    new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer().then(buf => {
      const b = new Uint8Array(buf), n = P.n, S = P.stages; let pos = 0, id = 0;
      const total = P.rows.reduce((a, r) => a + (r >> 1), 0), where = new Int32Array(total).fill(-1);
      const ids = new Int32Array(n);
      for (let i = 0; i < n; i++) { let v = 0, sh = 0, c; do { c = b[pos++]; v += (c & 127) * 2 ** sh; sh += 7; } while (c & 128); id += v; where[id] = i; ids[i] = id; }
      const fam = new Int16Array(n); for (let i = 0; i < n; i++) fam[i] = b[pos++] - 1;
      const val = new Uint8Array(n * S); for (let i = 0; i < n * S; i++) val[i] = (b[pos + (i >> 2)] >> ((i & 3) * 2)) & 3;
      // the pixel under each grid point: rings every degree from the north pole, points every degree from -179.5°
      const cell = new Int32Array(GW * GH).fill(-1); let first = 0;
      P.rows.forEach((r, i) => {
        const nn = r >> 1, off = (r & 1) / 2, w = 360 / nn;
        for (let j = 0; j < GW; j++) cell[i * GW + j] = where[first + ((Math.round((j + 0.5) / w - off) % nn) + nn) % nn];
        first += nn;
      });
      Object.assign(SEA, { S, fam, val, cell, where, ids, st: 'ready' });
      dirty = true; schedule();
      if (api.onSeas) api.onSeas();
    }).catch(() => { SEA.st = 'none'; });
  }
  /* Outlines of one indicator (lv 1: sea over the continent or land; lv 2: land), traced plate by plate.
     The 0/1 grid is softened a little first, so the outline runs smoothly between pixel centres
     instead of in steps. Each plate's region is grown by one pixel into its neighbours, so pieces
     overlap a little along their seams, the way the land pieces do. Rings keep the inside on their
     right as d3 expects (clockwise, seen from above). */
  const SK = GW * GH * 2, sNext = new Int32Array(SK), sStamp = new Int32Array(SK), sPt = new Float32Array(SK * 3); let sRun = 0;
  function seaTrace(V, F, lv) {
    const N = GW * GH, I = new Float32Array(N), T = new Float32Array(N), B = new Float32Array(N), Fg = new Float32Array(N);
    for (let g = 0; g < N; g++) I[g] = V[g] >= lv ? 1 : 0;
    for (let i = 0; i < GH; i++) { const g = i * GW; for (let j = 0; j < GW; j++) T[g + j] = (I[g + (j + GW - 1) % GW] + 6 * I[g + j] + I[g + (j + 1) % GW]) / 8; }
    for (let i = 0; i < GH; i++) { const u = Math.max(0, i - 1) * GW, d = Math.min(GH - 1, i + 1) * GW, g = i * GW; for (let j = 0; j < GW; j++) B[g + j] = (T[u + j] + 6 * T[g + j] + T[d + j]) / 8; }
    // each plate's patch of the grid: the rows it holds, and the shortest run of columns (it may wrap past 180°)
    // (every cell of the plate counts, not only the ones that are in: the one-pixel overlap into a
    // neighbour can reach past the plate's own land, and the patch must hold all of it)
    const box = new Map();
    for (let g = 0; g < N; g++) {
      const f = F[g]; if (f < 0) continue;
      const i = (g / GW) | 0; let r = box.get(f);
      if (!r) box.set(f, r = { a: i, b: i, cols: new Uint8Array(GW), any: false });
      if (i < r.a) r.a = i; if (i > r.b) r.b = i; r.cols[g - i * GW] = 1; if (I[g]) r.any = true;
    }
    const out = [], D2 = Math.PI / 180;
    for (const [f, r] of box) {
      if (!r.any) continue;
      // the widest gap between used columns is where the patch does not reach
      let gapLen = 0, gapEnd = 0, run = 0;
      for (let k = 0; k < 2 * GW; k++) { if (r.cols[k % GW]) run = 0; else if (++run > gapLen) { gapLen = Math.min(run, GW); gapEnd = k % GW; } }
      const r0 = Math.max(0, r.a - 2), r1 = Math.min(GH - 1, r.b + 2), pole = r0 === 0 || r1 === GH - 1;
      const full = pole || gapLen < 6, c0 = full ? 0 : (gapEnd + 1 - 2 + GW) % GW, nc = full ? GW : GW - gapLen + 4;
      for (let i = r0; i <= r1; i++) for (let q = 0; q < nc; q++) {
        const j = (c0 + q) % GW, g = i * GW + j;
        const mine = F[g] === f || (j > 0 ? F[g - 1] : F[g + GW - 1]) === f || (j < GW - 1 ? F[g + 1] : F[g - GW + 1]) === f || (i > 0 && F[g - GW] === f) || (i < GH - 1 && F[g + GW] === f);
        Fg[g] = mine ? B[g] : 0;
      }
      for (const i of [0, GH - 1]) if (i >= r0 && i <= r1) {           // a pole ring is one point: give it one value
        let m = 0; for (let j = 0; j < GW; j++) m += Fg[i * GW + j];
        m /= GW; for (let j = 0; j < GW; j++) Fg[i * GW + j] = m;
      }
      const inside = (i, j) => i >= r0 && i <= r1 && (full || ((j - c0 + GW) % GW) < nc);
      const at = (i, j) => inside(i, j) ? Fg[i * GW + j] : 0;
      const run_ = ++sRun, starts = [];
      const cross = (key, v0, v1, lon, lat, horiz) => {
        if (sStamp[key] !== run_) {
          sStamp[key] = run_; sNext[key] = -1;
          const k = (0.5 - v0) / (v1 - v0), lo = (horiz ? lon + k : lon) * D2, la = (horiz ? lat : lat - k) * D2, c = Math.cos(la);
          sPt[key * 3] = c * Math.cos(lo); sPt[key * 3 + 1] = c * Math.sin(lo); sPt[key * 3 + 2] = Math.sin(la);
        }
        return key;
      };
      const link = (a, b) => { sNext[a] = b; starts.push(a); };
      const rows = Math.min(r1, GH - 1), ncs = full ? GW : nc - 1;
      for (let i = r0; i < rows; i++) for (let q = 0; q < ncs; q++) {
        const j = (c0 + q) % GW, j1 = (j + 1) % GW, a = at(i, j), b = at(i, j1), c = at(i + 1, j1), d = at(i + 1, j);
        const A = a >= 0.5, Bq = b >= 0.5, C = c >= 0.5, Dq = d >= 0.5;
        if (A === Bq && Bq === C && C === Dq) continue;
        const lon = -179.5 + j, lat = 90 - i;
        // the square's edges clockwise from its north-west corner: top, right, bottom, left.
        // e[k][1] true: walking clockwise round the square we leave the inside there (an exit)
        const e = [];
        if (A !== Bq) e.push([cross((i * GW + j) * 2, a, b, lon, lat, true), A]);
        if (Bq !== C) e.push([cross((i * GW + j1) * 2 + 1, b, c, lon + 1, lat, false), Bq]);
        if (C !== Dq) e.push([cross(((i + 1) * GW + j) * 2, d, c, lon, lat - 1, true), C]);
        if (Dq !== A) e.push([cross((i * GW + j) * 2 + 1, a, d, lon, lat, false), Dq]);
        // an exit joins the next entry: the outline then keeps the inside on its right, as d3 wants
        if (e.length === 2) { if (e[0][1]) link(e[0][0], e[1][0]); else link(e[1][0], e[0][0]); }
        else { const joined = (a + b + c + d) / 4 >= 0.5; for (let k = 0; k < 4; k++) if (e[k][1]) link(e[k][0], e[(k + (joined ? 1 : 3)) % 4][0]); }
      }
      const rings = [], buf = [];
      for (const k0 of starts) {
        if (sNext[k0] < 0) continue;
        buf.length = 0; let k = k0, guard = 0;
        let closed = false;
        while (k >= 0 && guard++ < 200000) { buf.push(k); const nk = sNext[k]; sNext[k] = -1; if (nk === k0) { closed = true; break; } k = nk; }
        if (!closed || buf.length < 4) { if (!closed) SEA.open = (SEA.open || 0) + 1; continue; }   // an outline that does not close would fill the world
        const a3 = new Float32Array(buf.length * 3);
        for (let n = 0; n < buf.length; n++) { const q = buf[n] * 3; a3[n * 3] = sPt[q]; a3[n * 3 + 1] = sPt[q + 1]; a3[n * 3 + 2] = sPt[q + 2]; }
        rings.push(a3);
      }
      if (rings.length) out.push({ f, rings });
    }
    return out;
  }
  /* Thinned copies of traced rings, ring by ring (a plate's rings mix outlines and holes, in any order). */
  function seaThin(fr, tolDeg) {
    const tol = tolDeg * Math.PI / 180, small = tol * tol * 0.5;
    return fr.map(({ f, rings }) => ({ f, rings: rings.map(full => {
      const A = ringArea(full), hole = A > 2 * Math.PI, aFull = hole ? 4 * Math.PI - A : A;
      if (aFull < small) return null;
      const r = thinRing(full, tol); if (!r) return null;
      const a0 = ringArea(r), a = hole ? 4 * Math.PI - a0 : a0;
      return (a0 > 2 * Math.PI) === hole && a > aFull * 0.4 && a < aFull * 2.5 ? r : full;
    }).filter(Boolean) })).filter(x => x.rings.length);
  }
  function seaStage(s) {
    let c = SEA.cache.get(s); if (c) return c;
    const N = GW * GH, V = new Uint8Array(N), F = new Int16Array(N).fill(-1), S = SEA.S;
    for (let g = 0; g < N; g++) { const k = SEA.cell[g]; if (k < 0) continue; V[g] = SEA.val[k * S + s]; F[g] = SEA.fam[k]; }
    // M: the continent and its drowned edge (1–3); L: land (2–3); R: land the sea reached at its highest (3)
    const M = seaTrace(V, F, 1), L = seaTrace(V, F, 2), R = seaTrace(V, F, 3);
    return seaKeep(s, { M: [M], L: [L], R: [R] });   // thinner copies are made when a view first asks for them
  }
  function seaKeep(s, c) {
    if (SEA.cache.size > 30) SEA.cache.delete(SEA.cache.keys().next().value);
    SEA.cache.set(s, c); return c;
  }
  /* Tracing a stage costs 50–150 ms on a phone, so where the browser allows it, it runs in a background worker and a
     hand on the timeline never waits for it. Until the stage asked for arrives, a frame drawn by the loop shows the
     nearest stage already traced (at most 4 steps of 5 Myr away, 12 while a hand is moving, carried on the plates to the right time) and the map
     redraws when the right one comes. The worker runs this same seaTrace on the same grids, so its outlines are
     identical (tools/test.js checks). With no worker (a page opened from a file, an old browser), or for anything drawn
     outside the loop (WorldMap._draw, the review hooks), the stage is traced on the spot, as before. */
  const SW = { w: null, busy: -1, want: -1, ahead: -1, failed: false, made: 0 };
  let seaLoop = false;                                 // true while the frame loop draws: only then may a stage come late
  function seaWorker() {
    if (SW.w || SW.failed) return SW.w;
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) { SW.failed = true; return null; }
    try {
      const src = 'const GW = ' + GW + ', GH = ' + GH + ', SK = GW * GH * 2, sNext = new Int32Array(SK), sStamp = new Int32Array(SK), sPt = new Float32Array(SK * 3);\n' +
        'let sRun = 0; const SEA = {}; let D = null;\n' + seaTrace.toString() + '\n' + thinRing.toString() + '\n' + seaThin.toString() + '\n' +
        // d3.geoArea of one ring, as d3-geo computes it (area.js), for the thinning's safety check
        'const d3 = { geoArea(o) { const c = o.coordinates[0], R = Math.PI / 180, Q = Math.PI / 4; let sum = 0, l0, cp0, sp0;\n' +
        '  for (let i = 0; i < c.length; i++) { let l = c[i][0] * R, f = c[i][1] * R / 2 + Q; const cp = Math.cos(f), sp = Math.sin(f);\n' +
        '    if (i) { const dl = l - l0, sd = dl >= 0 ? 1 : -1, ad = sd * dl, k = sp0 * sp; sum += Math.atan2(k * sd * Math.sin(ad), cp0 * cp + k * Math.cos(ad)); }\n' +
        '    l0 = l; cp0 = cp; sp0 = sp; }\n' +
        '  return 2 * (sum < 0 ? 2 * Math.PI + sum : sum); } };\n' + ringArea.toString() + '\n' +
        'onmessage = e => { const m = e.data; if (m.init) { D = m; return; }\n' +
        '  const s = m.s, N = GW * GH, V = new Uint8Array(N), F = new Int16Array(N).fill(-1), S = D.S;\n' +
        '  for (let g = 0; g < N; g++) { const k = D.cell[g]; if (k < 0) continue; V[g] = D.val[k * S + s]; F[g] = D.fam[k]; }\n' +
        '  const T = [1, 2, 3].map(lv => { const a = seaTrace(V, F, lv); return [a, seaThin(a, 0.3), seaThin(a, 0.8)]; }), tr = new Set();\n' +
        '  for (const x of T) for (const y of x) for (const p of y) for (const r of p.rings) tr.add(r.buffer);\n' +
        '  postMessage({ s, M: T[0], L: T[1], R: T[2] }, [...tr]); };';
      const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      w.onmessage = e => {
        const { s, M, L, R } = e.data; SW.busy = -1; SW.made++;
        if (!SEA.cache.has(s)) seaKeep(s, { M, L, R });   // each with its two thinner copies already made
        if (s === seaStep(time) && seaFade(time) > 0) { dirty = true; schedule(); }
        seaNext();
      };
      w.onerror = e => { if (e && e.preventDefault) e.preventDefault(); SW.failed = true; SW.w = null; SW.busy = -1; try { w.terminate(); } catch (x) {} dirty = true; schedule(); };
      w.postMessage({ init: true, cell: SEA.cell, val: SEA.val, fam: SEA.fam, S: SEA.S });
      SW.w = w;
    } catch (e) { SW.failed = true; SW.w = null; }
    return SW.w;
  }
  function seaNext() {                                 // one stage at a time: the one wanted now, else the next one ahead
    if (!SW.w || SW.busy >= 0) return;
    let s = -1;
    if (SW.want >= 0 && !SEA.cache.has(SW.want)) s = SW.want;
    else if (SW.ahead >= 0 && SW.ahead < SEA.S && !SEA.cache.has(SW.ahead)) s = SW.ahead;
    SW.want = -1; if (s === SW.ahead) SW.ahead = -1;
    if (s < 0) return;
    SW.busy = s; SW.w.postMessage({ s });
  }
  function seaPick(st) {
    const c = SEA.cache.get(st); if (c) return c;
    if (seaLoop && seaWorker()) {
      SW.want = st; seaNext();
      for (let d = 1, dmax = lite ? 12 : 4; d <= dmax; d++) { const n = SEA.cache.get(st - d) || SEA.cache.get(st + d); if (n) return n; }   // a hand moving fast may outrun the worker: up to 60 Myr away until it stops
    }
    return seaStage(st);
  }
  /* How strongly the seas show at time t: from 540 million years ago (where the maps begin) to the
     start of the Ice Age, when today's coasts and the Ice Age shorelines take over. */
  const seaFade = t => t <= 3 ? 0 : t < 5 ? (t - 3) / 2 : t <= 540 ? 1 : t < 545 ? (545 - t) / 5 : 0;
  const seaStep = t => SEA.P ? Math.max(0, Math.min(SEA.P.stages - 1, Math.round(t / SEA.P.step))) : -1;

  // ── terrain: the height of the land and the depth of the shallow seas, 540 Ma to the Ice Age ──
  // Scotese & Wright (2018) PaleoDEMs, one map every 5 million years, turned back to today's positions
  // on the same pixels as the seas (tools/build_dem.py) and loaded from tiles/dem as needed. WebGL draws
  // them: each point rides its own plate, the light falls from the north-west, and the picture blends
  // from one map to the next. It only adds light, shadow and water depth — where land and sea are
  // still comes from the traced coasts — so with no WebGL or no files the map is simply as before.
  let terOn = true, grMask = null, grx = null;
  const TER = { have: typeof DEM_HAVE === 'undefined' ? null : DEM_HAVE, st: 'idle', maps: new Map(), busy: new Set(), pair: '', drawn: 0 };
  const TEX_W = 256, EXAG = 90;
  const inflate = buf => new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
  function terPixelLL(i) {                             // present-day [lat, lon] of the i-th listed pixel
    const id = SEA.ids[i], R = SEA.P.rows; let first = 0, r = 0;
    while (first + (R[r] >> 1) <= id) { first += R[r] >> 1; r++; }
    const nn = R[r] >> 1, off = (R[r] & 1) / 2;
    return [90 - r, -180 + (id - first + off) * 360 / nn];
  }
  const TER_VS = `#version 300 es
precision highp float; precision highp int;
in vec3 aPos; in vec3 aCen; in float aFam; in float aPix;
uniform sampler2D uFam, uA, uB; uniform float uMix, uShift; uniform int uMode, uLayer;
uniform vec2 uRot, uTr, uSize; uniform float uScale;
out float vE, vShade, vVis, vLam, vW; out vec3 vP;
const float PI = 3.14159265358979;
float wrapPi(float a) { return a - 6.28318530718 * floor((a + PI) / 6.28318530718); }
vec3 rot(vec4 r0, vec4 r1, vec4 r2, vec3 p) { return vec3(dot(r0.xyz, p), dot(r1.xyz, p), dot(r2.xyz, p)); }
void main() {
  int f = int(aFam + 0.5), px = int(aPix + 0.5);
  vec4 r0 = texelFetch(uFam, ivec2(f, 0), 0), r1 = texelFetch(uFam, ivec2(f, 1), 0), r2 = texelFetch(uFam, ivec2(f, 2), 0);
  ivec2 tc = ivec2(px % ${TEX_W}, px / ${TEX_W});
  vec4 A = texelFetch(uA, tc, 0), B = texelFetch(uB, tc, 0);
  bool hA = A.x > -90000.0, hB = B.x > -90000.0;
  float m = hA && hB ? uMix : (hA ? 0.0 : 1.0);
  vE = mix(A.x, B.x, m);
  vec3 n0 = mix(hA ? A.yzw : B.yzw, hB ? B.yzw : A.yzw, m), n = normalize(n0);
  vW = clamp(length(n0) * 2.0 - 1.0, 0.0, 1.0);
  vVis = (r0.w > 0.5 && (hA || hB || uLayer == 3)) ? 1.0 : -1.0; vP = aPos;
  vec3 q = rot(r0, r1, r2, aPos), c = rot(r0, r1, r2, aCen), nw = rot(r0, r1, r2, n);
  // light from the north-west, high in the sky, in the ground's own frame at this time
  vec3 up = normalize(q), east = normalize(vec3(-q.y, q.x, 0.0) + vec3(1e-6, 0.0, 0.0)), north = cross(up, east);
  vec3 nl = vec3(dot(nw, east), dot(nw, north), dot(nw, up)), L = normalize(vec3(-0.55, 0.55, 0.62));
  vShade = dot(nl, L) / L.z;
  float lam = atan(q.y, q.x), phi = asin(clamp(q.z, -1.0, 1.0));
  vec2 s;
  if (uMode == 0) {                                   // Equal Earth, the same formula d3 uses
    float lc = wrapPi(atan(c.y, c.x) + uRot.x);
    lam = lc + wrapPi(lam + uRot.x - lc) + uShift; vLam = lam;
    float l = asin(0.8660254 * sin(phi)), l2 = l * l, l6 = l2 * l2 * l2;
    float x = lam * cos(l) / (0.8660254 * (1.340264 + 3.0 * -0.081106 * l2 + l6 * (7.0 * 0.000893 + 9.0 * 0.003796 * l2)));
    float y = l * (1.340264 + -0.081106 * l2 + l6 * (0.000893 + 0.003796 * l2));
    s = uTr + uScale * vec2(x, -y);
  } else {                                            // the globe: d3's rotation, then orthographic
    lam += uRot.x; vec3 p = vec3(cos(lam) * cos(phi), sin(lam) * cos(phi), sin(phi));
    float cp = cos(uRot.y), sp = sin(uRot.y);
    float X = p.x * cp - p.z * sp, Z = p.z * cp + p.x * sp;
    vLam = 0.0; if (X < 0.0) vVis = min(vVis, X * 50.0);
    s = uTr + uScale * vec2(p.y, -Z);
  }
  gl_Position = vec4(s.x / uSize.x * 2.0 - 1.0, 1.0 - s.y / uSize.y * 2.0, 0.0, 1.0);
}`;
  const TER_FS = `#version 300 es
precision highp float; precision highp int;
in float vE, vShade, vVis, vLam, vW; in vec3 vP;
uniform int uLayer, uMode; uniform vec3 uDeep; uniform float uAlpha, uZoom;
out vec4 o;
float h3(vec3 p) { p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
float fbm(vec3 p, int oct) { float s = 0.0, a = 0.5, n = 0.0; for (int i = 0; i < 6; i++) { if (i >= oct) break; s += a * vn(p); n += a; a *= 0.5; p = p * 2.03 + vec3(1.7, 9.2, 3.1); } return s / n; }
void main() {
  if (vVis < 0.0 || (uMode == 0 && abs(vLam) > 3.14159265)) discard;
  if (uLayer == 3) {                                  // the ground's own texture, computed where each piece of land is today, so it rides its plate
    vec3 p = normalize(vP);
    float m1 = fbm(p * 3.2, 4), m2 = fbm(p * 15.0 + 3.0, 4), m3 = fbm(p * 70.0 + 7.0, 3), m4 = vn(p * 380.0);
    float zd = smoothstep(1.5, 5.0, uZoom), ze = smoothstep(5.0, 14.0, uZoom);       // finer grain appears as you come close
    float v = 0.5 + (m1 - 0.5) * 0.34 + (m2 - 0.5) * 0.26 + (m3 - 0.5) * (0.12 + 0.14 * zd) + (m4 - 0.5) * 0.12 * ze;
    vec3 c = vec3(v) + vec3(0.035, 0.005, -0.03) * (m1 - 0.5) * 2.0 + vec3(-0.025, 0.03, -0.012) * (m2 - 0.5) * 2.0;
    o = vec4(c * uAlpha, uAlpha); return;
  }
  if (uLayer == 2) { o = vec4(vE >= 0.0 && vW > 0.5 ? 1.0 : 0.0); return; }   // review only: the elevation maps' own dry land
  if (uLayer == 1) {                                  // land: light and shadow, and high ground a little paler
    float e = max(vE, 0.0), g = clamp(0.5 + (vShade - 1.0) * 1.25, 0.1, 0.8) + 0.05 * smoothstep(800.0, 4000.0, e);
    float a = uAlpha * vW; o = vec4(vec3(g) * a, a);
  } else {                                            // shallow seas: paler where shallow, deepening to the ocean's own blue
    float d = max(-vE, 4.0);
    vec3 c = mix(vec3(0.74, 0.95, 0.90), vec3(0.47, 0.84, 0.86), smoothstep(0.0, 80.0, d));
    c = mix(c, vec3(0.30, 0.66, 0.79), smoothstep(80.0, 400.0, d));
    c = mix(c, uDeep, smoothstep(400.0, 2200.0, d));
    c *= clamp(0.85 + (vShade - 1.0) * 0.6, 0.7, 1.15);
    float a = uAlpha * vW; o = vec4(c * a, a);        // the page clips this to the traced sea, so its edge is the smooth one
  }
}`;
  function terGL() {                                   // set up WebGL once; null if this browser cannot
    if (TER.gl !== undefined) return TER.gl;
    TER.gl = null;
    try {
      if (!TER.have || typeof DecompressionStream === 'undefined' || location.protocol === 'file:') return null;
      const cv = document.createElement('canvas'), gl = cv.getContext('webgl2', { premultipliedAlpha: true, antialias: true, alpha: true });
      if (!gl) return null;
      const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, TER_VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, TER_FS)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      const U = {}; for (const k of ['uFam', 'uA', 'uB', 'uMix', 'uShift', 'uMode', 'uRot', 'uTr', 'uSize', 'uScale', 'uLayer', 'uDeep', 'uAlpha', 'uZoom']) U[k] = gl.getUniformLocation(pr, k);
      const tex = (w, h, fmt, ifmt, type) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST); gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, null); return t; };
      const th = Math.ceil(TER.have.n / TEX_W);
      Object.assign(TER, { cv, pr, U, th,
        tFam: tex(256, 3, gl.RGBA, gl.RGBA32F, gl.FLOAT), tA: tex(TEX_W, th, gl.RGBA, gl.RGBA32F, gl.FLOAT), tB: tex(TEX_W, th, gl.RGBA, gl.RGBA32F, gl.FLOAT),
        famBuf: new Float32Array(256 * 3 * 4) });
      TER.gl = gl;
    } catch (e) { TER.gl = null; TER.err = String(e && e.message || e); }
    return TER.gl;
  }
  function terLoadMesh() {
    if (TER.st !== 'idle') return; TER.st = 'loading';
    fetch('tiles/dem/mesh.bin').then(r => { if (!r.ok) throw new Error('mesh ' + r.status); return r.arrayBuffer(); }).then(inflate).then(buf => {
      const dv = new DataView(buf), nV = dv.getUint32(0, true), nT = dv.getUint32(4, true);
      const vp = new Uint16Array(nV), vf = new Uint8Array(nV);
      for (let i = 0; i < nV; i++) { vp[i] = dv.getUint16(8 + i * 3, true); vf[i] = dv.getUint8(10 + i * 3); }
      const t0 = 8 + nV * 3, tri = new Uint16Array(nT * 3); for (let i = 0; i < nT * 3; i++) tri[i] = dv.getUint16(t0 + i * 2, true);
      // one entry per corner of every triangle (no shared corners: each knows its triangle's middle)
      const P3 = new Float32Array(SEA.P.n * 3);
      for (let i = 0; i < SEA.P.n; i++) { const [la, lo] = terPixelLL(i), c = Math.cos(la * D2R); P3[i * 3] = c * Math.cos(lo * D2R); P3[i * 3 + 1] = c * Math.sin(lo * D2R); P3[i * 3 + 2] = Math.sin(la * D2R); }
      const data = new Float32Array(nT * 3 * 8);
      for (let t = 0; t < nT; t++) {
        let cx = 0, cy = 0, cz = 0;
        for (let k = 0; k < 3; k++) { const p = vp[tri[t * 3 + k]]; cx += P3[p * 3]; cy += P3[p * 3 + 1]; cz += P3[p * 3 + 2]; }
        const L = Math.hypot(cx, cy, cz) || 1;
        for (let k = 0; k < 3; k++) {
          const v = tri[t * 3 + k], p = vp[v], o = (t * 3 + k) * 8;
          data[o] = P3[p * 3]; data[o + 1] = P3[p * 3 + 1]; data[o + 2] = P3[p * 3 + 2];
          data[o + 3] = cx / L; data[o + 4] = cy / L; data[o + 5] = cz / L; data[o + 6] = vf[v] - 1; data[o + 7] = p;
        }
      }
      const gl = TER.gl; TER.vao = gl.createVertexArray(); gl.bindVertexArray(TER.vao);
      const buf2 = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf2); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      [['aPos', 3, 0], ['aCen', 3, 12], ['aFam', 1, 24], ['aPix', 1, 28]].forEach(([nm, sz, off]) => { const l = gl.getAttribLocation(TER.pr, nm); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, sz, gl.FLOAT, false, 32, off); });
      gl.bindVertexArray(null);
      // pixels at the mesh's edge (an edge used by one triangle only): the picture fades out there
      const ec = new Map(), uniq = new Set(), edge = new Uint8Array(SEA.P.n);
      for (let t = 0; t < nT; t++) {
        const a = [vp[tri[t * 3]], vp[tri[t * 3 + 1]], vp[tri[t * 3 + 2]]].sort((x, y) => x - y), key = a.join(',');
        if (uniq.has(key)) continue; uniq.add(key);
        for (const [x, y] of [[a[0], a[1]], [a[1], a[2]], [a[0], a[2]]]) { const k = x * 65536 + y; ec.set(k, (ec.get(k) || 0) + 1); }
      }
      for (const [k, n] of ec) if (n === 1) { edge[Math.floor(k / 65536)] = 1; edge[k % 65536] = 1; }
      Object.assign(TER, { nVert: nT * 3, tri, vp, P3, edge, st: 'ready' });
      dirty = true; schedule();
    }).catch(e => { TER.st = 'none'; TER.err = String(e && e.message || e); });
  }
  /* One map: elevation per pixel, and the direction its ground faces (from the triangles around it). */
  function terLoadMap(s) {
    if (TER.maps.has(s) || TER.busy.has(s) || TER.st !== 'ready') return;
    TER.busy.add(s);
    fetch('tiles/dem/s' + String(s * TER.have.step).padStart(3, '0') + '.bin').then(r => { if (!r.ok) throw new Error('map ' + r.status); return r.arrayBuffer(); }).then(inflate).then(buf => {
      const code = new Uint8Array(buf), n = SEA.P.n, E = new Float32Array(n), out = new Float32Array(TEX_W * TER.th * 4).fill(-99999);
      for (let i = 0; i < n; i++) { const c = code[i]; E[i] = c === 0 ? NaN : c <= 100 ? -6000 * ((100 - c) / 99) ** 2 : 7000 * ((c - 101) / 154) ** 2; }
      const N = new Float32Array(n * 3), P3 = TER.P3, tri = TER.tri, vp = TER.vp, k = EXAG / 6371000;
      for (let t = 0; t < tri.length; t += 3) {
        const a = vp[tri[t]], b = vp[tri[t + 1]], c = vp[tri[t + 2]];
        if (a === b || b === c || a === c) continue;
        const ea = 1 + (E[a] || 0) * k, eb = 1 + (E[b] || 0) * k, ec = 1 + (E[c] || 0) * k;
        const ax = P3[a * 3] * ea, ay = P3[a * 3 + 1] * ea, az = P3[a * 3 + 2] * ea;
        const ux = P3[b * 3] * eb - ax, uy = P3[b * 3 + 1] * eb - ay, uz = P3[b * 3 + 2] * eb - az, wx = P3[c * 3] * ec - ax, wy = P3[c * 3 + 1] * ec - ay, wz = P3[c * 3 + 2] * ec - az;
        let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
        if (nx * ax + ny * ay + nz * az < 0) { nx = -nx; ny = -ny; nz = -nz; }     // outward
        for (const v of [a, b, c]) { N[v * 3] += nx; N[v * 3 + 1] += ny; N[v * 3 + 2] += nz; }
      }
      // a pixel next to missing ground, or at the mesh's edge, gets weight 0, so the picture fades out
      // over one triangle instead of stopping in steps; the weight rides in the normal's length (0.5–1)
      const wgt = new Uint8Array(n).fill(1);
      for (let i = 0; i < n; i++) if (TER.edge[i] || E[i] !== E[i]) wgt[i] = 0;
      for (let t = 0; t < tri.length; t += 3) { const a = vp[tri[t]], b = vp[tri[t + 1]], c = vp[tri[t + 2]]; if (E[a] !== E[a] || E[b] !== E[b] || E[c] !== E[c]) wgt[a] = wgt[b] = wgt[c] = 0; }
      for (let i = 0; i < n; i++) {
        if (E[i] !== E[i]) continue;
        const L = (Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1) / (wgt[i] ? 1 : 0.5);
        out[i * 4] = E[i]; out[i * 4 + 1] = N[i * 3] / L; out[i * 4 + 2] = N[i * 3 + 1] / L; out[i * 4 + 3] = N[i * 3 + 2] / L;
      }
      TER.maps.set(s, out); TER.busy.delete(s);
      if (TER.maps.size > 14) for (const key of TER.maps.keys()) { if (TER.maps.size <= 14) break; if (!TER.pair.split(',').includes(String(key))) TER.maps.delete(key); }
      dirty = true; schedule();
    }).catch(() => { TER.busy.delete(s); TER.maps.set(s, null); });
  }
  /* Draw one layer ('sea' or 'land') of the terrain for time t into TER.cv, the size of the map.
     Returns the canvas, or null when there is nothing to draw (yet). */
  function terDraw(t, layer, alpha) {
    if (!terOn) return null;
    const gl = terGL(); if (!gl || TER.have.n !== (SEA.P && SEA.P.n) || SEA.st !== 'ready') return null;
    if (TER.st === 'idle') terLoadMesh();
    if (TER.st !== 'ready') return null;
    const step = TER.have.step, x = Math.max(0, Math.min(TER.have.stages - 1.0001, t / step)), sA = Math.floor(x), sB = Math.min(TER.have.stages - 1, sA + 1), f = x - sA;
    terLoadMap(sA); terLoadMap(sB);
    const mA = TER.maps.get(sA), mB = TER.maps.get(sB);
    if (!mA && !mB && layer !== 'ground') return null;                    // the ground's texture needs only the plates
    const cv = TER.cv;
    const tw = Math.ceil(canvas.width / 2), th2 = Math.ceil(canvas.height / 2);      // half size: the maps are 1° — the coasts' own outlines keep the edges sharp
    if (cv.width !== tw || cv.height !== th2) { cv.width = tw; cv.height = th2; }
    const pk = sA + ',' + sB;
    if (TER.pair !== pk && (mA || mB)) {               // the two maps either side of t
      TER.pair = pk;
      gl.bindTexture(gl.TEXTURE_2D, TER.tA); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TEX_W, TER.th, gl.RGBA, gl.FLOAT, mA || mB);
      gl.bindTexture(gl.TEXTURE_2D, TER.tB); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TEX_W, TER.th, gl.RGBA, gl.FLOAT, mB || mA);
      // prefetch the next map along
      if (f > 0.5 && sB + 1 < TER.have.stages) terLoadMap(sB + 1); else if (sA > 0) terLoadMap(sA - 1);
    }
    const FB = TER.famBuf;                             // every plate's rotation now
    for (let i = 0; i < fams.length && i < 256; i++) {
      const m = famRot(i, t);
      for (let r = 0; r < 3; r++) { const o = (r * 256 + i) * 4; if (m) { FB[o] = m[r * 3]; FB[o + 1] = m[r * 3 + 1]; FB[o + 2] = m[r * 3 + 2]; FB[o + 3] = 1; } else FB[o + 3] = 0; }
    }
    gl.bindTexture(gl.TEXTURE_2D, TER.tFam); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 3, gl.RGBA, gl.FLOAT, FB);
    gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(TER.pr); gl.bindVertexArray(TER.vao);
    gl.disable(gl.BLEND);                              // pieces overlap along their seams: the last one drawn wins, nothing doubles
    const U = TER.U, r = proj.rotate(), tr = proj.translate();
    [[TER.tFam, 'uFam'], [TER.tA, 'uA'], [TER.tB, 'uB']].forEach(([tx, nm], i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tx); gl.uniform1i(U[nm], i); });
    gl.uniform1f(U.uMix, mA && mB ? f : 0); gl.uniform1i(U.uMode, mode === 'flat' ? 0 : 1);
    gl.uniform2f(U.uRot, r[0] * D2R, r[1] * D2R); gl.uniform2f(U.uTr, tr[0], tr[1]); gl.uniform2f(U.uSize, W, H); gl.uniform1f(U.uScale, proj.scale());
    gl.uniform1i(U.uLayer, layer === 'land' ? 1 : layer === 'dry' ? 2 : layer === 'ground' ? 3 : 0); gl.uniform1f(U.uAlpha, alpha); gl.uniform1f(U.uZoom, zoom);
    const deep = hex(mix(pal.o2, '#123a5c', 0.35)).map(v => v / 255); gl.uniform3f(U.uDeep, deep[0], deep[1], deep[2]);
    gl.uniform1f(U.uShift, 0); gl.drawArrays(gl.TRIANGLES, 0, TER.nVert);    // (a triangle across the map's edge loses a sliver under 1° wide)
    gl.bindVertexArray(null);
    if (layer === 'ground') TER.ground = (TER.ground || 0) + 1; else TER.drawn++;   // the ground's grain only borrows the mesh
    return cv;
  }

  // ── the living finish (WebGL): the sea's colour, its waves, glint and surf; clouds and wind (Evan, 25 Nov: "the way
  // we render the water, the way we render the wind, the movement, to make it feel living when you're navigating a simple
  // globe. The way that the texture of the ground is built"). One full-screen pass, drawn per pixel through the map's
  // own projection turned inside out, so it lines up with the coasts exactly; it only colours what the map already
  // holds. The sea's shading is illustrative; the clouds and wind follow today's wind belts (trade winds, westerlies,
  // polar easterlies) as a moving sketch, not a weather record. All of it runs off the clock and holds still for readers
  // who ask for less motion. Without WebGL the map draws as before.
  const FIN = { gl: undefined, landStamp: -1, drawn: [0, 0, 0] };
  const FIN_VS = `#version 300 es
in vec2 aP; void main() { gl_Position = vec4(aP, 0.0, 1.0); }`;
  const FIN_FS = `#version 300 es
precision highp float;
uniform int uMode, uPass; uniform vec2 uRot, uTr, uSize, uRes; uniform float uScale, uTime, uOcean, uCloud, uWind, uZoom, uHaze;
uniform vec3 uO1, uO2, uO3; uniform sampler2D uLand;
uniform vec3 uRing, uBare, uLandBase; uniform vec4 uB1, uB2;
out vec4 o;
const float PI = 3.14159265358979;
float h3(vec3 p) { p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.13)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1, 0, 0)), f.x), mix(h3(i + vec3(0, 1, 0)), h3(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(h3(i + vec3(0, 0, 1)), h3(i + vec3(1, 0, 1)), f.x), mix(h3(i + vec3(0, 1, 1)), h3(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
float fbm(vec3 p, int oct) { float s = 0.0, a = 0.5, n = 0.0; for (int i = 0; i < 7; i++) { if (i >= oct) break; s += a * vn(p); n += a; a *= 0.5; p = p * 2.03 + vec3(1.7, 9.2, 3.1); } return s / n; }
vec3 rotZ(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z); }
vec4 over(vec4 d, vec4 s) { return s + d * (1.0 - s.a); }
// the map's projection, inside out: screen point -> longitude and latitude in the map's own frame, and the view normal
bool inv(vec2 s, out vec2 ll, out vec3 n) {
  vec2 v = (s - uTr) / uScale;
  if (uMode == 1) {
    float py = v.x, Z = -v.y, r2 = py * py + Z * Z; if (r2 > 1.0) return false;
    float X = sqrt(1.0 - r2), cp = cos(uRot.y), sp = sin(uRot.y);
    float px = X * cp + Z * sp, pz = Z * cp - X * sp;
    ll = vec2(atan(py, px) - uRot.x, asin(clamp(pz, -1.0, 1.0))); n = vec3(v.x, -v.y, X); return true;
  }
  float y = -v.y, l = y;
  for (int i = 0; i < 6; i++) { float l2 = l * l, l6 = l2 * l2 * l2;
    float fy = l * (1.340264 - 0.081106 * l2 + l6 * (0.000893 + 0.003796 * l2)) - y, fp = 1.340264 - 3.0 * 0.081106 * l2 + l6 * (7.0 * 0.000893 + 9.0 * 0.003796 * l2); l -= fy / fp; }
  float l2 = l * l, l6 = l2 * l2 * l2, fp = 1.340264 - 3.0 * 0.081106 * l2 + l6 * (7.0 * 0.000893 + 9.0 * 0.003796 * l2);
  float lam = v.x * 0.8660254 * fp / cos(l); if (abs(lam) > PI + 0.002 || abs(l) > 1.4) return false;
  ll = vec2(lam - uRot.x, asin(clamp(sin(l) / 0.8660254, -1.0, 1.0))); n = vec3(0.0, 0.0, 1.0); return true;
}
float cloudAt(vec3 q, float belt) { float c = fbm(q * vec3(2.4, 2.4, 4.6) + vec3(3.1, 1.7, 0.0), 6); return smoothstep(0.6 - 0.18 * belt, 0.74 - 0.1 * belt, c); }
void main() {
  vec2 s = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) * (uSize / uRes);
  vec2 ll; vec3 n; if (!inv(s, ll, n)) { o = vec4(0.0); return; }
  float lat = ll.y, a = abs(lat) * 180.0 / PI;
  vec3 P = vec3(cos(lat) * cos(ll.x), cos(lat) * sin(ll.x), sin(lat));
  vec3 L = normalize(vec3(-0.45, 0.5, 0.75)), V = vec3(0.0, 0.0, 1.0), Hn = normalize(L + V);
  if (uPass == 2) {                                   // the land's colour: wet, dry and cold belts, drier deep inland, by the age's warmth and plants
    vec2 uv = gl_FragCoord.xy / uRes; uv.y = 1.0 - uv.y;
    float ins = 0.0, cnt = 0.0;                       // how much of the ground round this point is land, in rings of about 4°, 9° and 16°
    for (int k = 0; k < 3; k++) { float r = uRing[k];
      for (int i = 0; i < 10; i++) { float an = float(i) * 0.6283185 + float(k) * 0.31; vec2 q = uv + vec2(cos(an), sin(an)) * r / uSize;
        if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) continue; ins += texture(uLand, q).a * (k == 0 ? 1.4 : 1.0); cnt += (k == 0 ? 1.4 : 1.0); } }
    float land = cnt > 0.0 ? ins / cnt : 0.6, I = smoothstep(0.62, 0.97, land), coast = 1.0 - smoothstep(0.4, 0.72, land);
    float green = uB1.x, arid = uB1.y, cont = uB1.z, grass = uB1.w, warm = uB2.x, icy = uB2.y, lush = uB2.z;
    float n = fbm(P * 3.4 + vec3(11.0), 4), n2 = fbm(P * 11.0 + vec3(3.0), 3);
    float sh = warm * 4.0;                             // a warm world pushes the belts toward the poles
    a = clamp(a + (fbm(P * 2.3 + vec3(21.0), 4) - 0.5) * 16.0, 0.0, 90.0);   // belts follow latitude loosely, not as ruled lines
    float wetTrop = 1.0 - smoothstep(9.0 + sh, 16.0 + sh, a);
    float bd = (a - 24.0 - sh * 0.8) / (7.0 + warm * 2.0), dryBelt = exp(-bd * bd);
    float cold = smoothstep(55.0 + warm * 16.0, 72.0 + warm * 16.0, a);
    float d = clamp(dryBelt * arid + I * cont * (1.0 - wetTrop) * 0.9 - coast * 0.22 - wetTrop * 0.3 + (n - 0.5) * 0.5 + (n2 - 0.5) * 0.15, 0.0, 1.0);
    vec3 RAIN = vec3(0.30, 0.45, 0.22), TEMP = vec3(0.39, 0.52, 0.28), BOREAL = vec3(0.31, 0.42, 0.27), TUNDRA = vec3(0.63, 0.62, 0.5);
    vec3 STEPPE = vec3(0.73, 0.67, 0.44), DESERT = vec3(0.86, 0.76, 0.53), GRASS = vec3(0.72, 0.68, 0.39);
    vec3 g = mix(RAIN, TEMP, smoothstep(12.0, 35.0, a)); g = mix(g, BOREAL, smoothstep(45.0, 62.0, a)); g = mix(g, mix(BOREAL, TUNDRA, icy), cold);
    g = mix(g, RAIN * 0.88, lush * wetTrop * 0.6);    // the coal-age swamp forests
    g *= 0.92 + 0.16 * n2;
    vec3 dry = mix(STEPPE, DESERT, smoothstep(0.55, 0.9, d)); dry = mix(dry, GRASS, grass * (1.0 - smoothstep(0.78, 0.95, d)));
    vec3 c = mix(g, dry, smoothstep(0.3, 0.75, d));
    float ge = clamp(green * (1.0 + coast * 0.7 * (1.0 - green)) - I * 0.4 * (1.0 - green), 0.0, 1.0);   // the first plants keep to the wet ground by the coasts
    c = mix(uBare * (0.9 + 0.2 * n), c, ge);
    c = mix(c, uLandBase, 0.1);                        // in the atlas's own palette
    o = vec4(c, 1.0); return;
  }
  if (uPass == 0) {                                   // the open sea: broad changes of colour, like depth and currents
    float basin = fbm(P * 2.1 + vec3(3.0), 4), curr = fbm(rotZ(P, 0.3) * vec3(6.0, 6.0, 11.0) + vec3(5.0), 4);
    vec3 c = mix(uO1, uO2, smoothstep(0.3, 0.72, basin * 0.75 + 0.25 * curr));
    c = mix(c, uO3, smoothstep(0.5, 1.0, a / 90.0) * 0.5);                                 // colder and darker toward the poles
    c = mix(c, c * vec3(0.93, 1.04, 1.03), (1.0 - smoothstep(10.0, 35.0, a)) * 0.6);         // a little more turquoise in the tropics
    c *= 0.93 + 0.1 * (curr - 0.5);
    if (uMode == 1) { float dif = clamp(dot(n, L), 0.0, 1.0); c *= 0.8 + 0.3 * dif;
      c = mix(c, vec3(0.82, 0.9, 0.95), pow(1.0 - n.z, 3.0) * 0.32 * uHaze); }          // the air at the rim
    o = vec4(c, 1.0); return;
  }
  float sec = uTime;
  // the wind belts: easterly trade winds, the westerlies, easterlies round the poles
  float wT = 1.0 - smoothstep(25.0, 35.0, a), wP = smoothstep(58.0, 68.0, a), wW = 1.0 - wT - wP;
  vec3 pT = rotZ(P, -0.011 * sec), pW = rotZ(P, 0.017 * sec), pP = rotZ(P, -0.007 * sec);
  // the cloudiest belts are the tropical rains near the equator and the storm tracks of the westerlies; the clearest the dry belts near 25°
  float b1 = (a - 4.0) / 8.0, b2 = (a - 50.0) / 11.0, b3 = (a - 24.0) / 6.0;      // (squared by hand: pow() of a negative number is undefined)
  float belt = clamp(0.32 + 0.6 * exp(-b1 * b1) + 0.5 * exp(-b2 * b2) - 0.25 * exp(-b3 * b3), 0.0, 1.0);
  float cov = wT * cloudAt(pT, belt) + wW * cloudAt(pW + vec3(7.0), belt) + wP * cloudAt(pP + vec3(13.0), belt);
  float sh = wT * cloudAt(rotZ(pT, -0.012) + vec3(0.0, 0.0, 0.012), belt) + wW * cloudAt(rotZ(pW + vec3(7.0), -0.012) + vec3(0.0, 0.0, 0.012), belt) + wP * cloudAt(rotZ(pP + vec3(13.0), -0.012) + vec3(0.0, 0.0, 0.012), belt);
  float zf = 1.0 - smoothstep(3.0, 7.0, uZoom);       // clouds thin out as you come close, so the ground shows
  vec4 acc = vec4(0.0);
  acc = over(acc, vec4(0.0, 0.0, 0.0, 0.13 * sh * (1.0 - cov) * uCloud * zf));       // their shadows on the ground and sea
  // the sea: waves moving with the wind, the sun's glint, and surf along the coasts
  vec2 uv = gl_FragCoord.xy / uRes; uv.y = 1.0 - uv.y;
  float landA = texture(uLand, uv).a, sea = (1.0 - landA) * uOcean;
  if (sea > 0.01) {
    float k = 42.0 * clamp(uZoom, 1.0, 6.0);
    vec3 pw = wT * pT + wW * pW + wP * pP;
    float h = fbm(rotZ(pw, 0.004 * sec) * k + vec3(0.0, 0.0, sec * 0.08), 3) * 0.6 + fbm(rotZ(pw, -0.006 * sec) * k * 1.7 + vec3(4.0, 0.0, -sec * 0.06), 2) * 0.4;
    vec3 nw = normalize(n + vec3(dFdx(h), -dFdy(h), 0.0) * 9.0);
    float g = max(dot(nw, Hn), 0.0), gl0 = max(dot(n, Hn), 0.0);
    float glint = (pow(g, 260.0) * 0.8 + pow(gl0, 30.0) * 0.3 * smoothstep(0.55, 0.75, h)) * smoothstep(0.9, 0.98, gl0) + pow(gl0, 14.0) * 0.16;   // sparkles only where the sun is reflected
    if (uMode == 0) glint = pow(max(0.0, 1.0 - distance(s / uSize, vec2(0.3, 0.3)) * 1.8), 3.0) * 0.12 * smoothstep(0.6, 0.85, h);
    float band = smoothstep(0.58, 0.78, h) * 0.06;                                         // the swell, faintly
    float near = 0.0;
    for (int i = 0; i < 8; i++) { float an = float(i) * 0.7853982; vec2 d = vec2(cos(an), sin(an)) / uRes;
      near = max(near, texture(uLand, uv + d * 1.6).a * 0.9); near = max(near, texture(uLand, uv + d * 3.5).a * 0.35); }
    float sets = smoothstep(0.45, 0.75, vn(P * 90.0 + vec3(0.0, 0.0, sec * 0.25)));          // the surf breaks in moving sets, not as an outline
    float surf = near * sets * (0.55 + 0.45 * sin(sec * 1.6 + h * 14.0 + ll.x * 60.0 + ll.y * 40.0)) * 0.9;
    float wa = clamp(band + glint + surf * 0.42, 0.0, 0.9) * sea; acc = over(acc, vec4(vec3(wa), wa));   // premultiplied: white at that strength
  }
  // the wind itself: faint streaks running with each belt
  vec3 qT = rotZ(P, -0.03 * sec), qW = rotZ(P, 0.045 * sec), qP = rotZ(P, -0.02 * sec), q = wT * qT + wW * qW + wP * qP;
  float line = 1.0 - abs(vn(q * vec3(1.6, 1.6, 90.0)) * 2.0 - 1.0);                      // thin ridges running east–west
  float st = smoothstep(0.93, 0.995, line) * smoothstep(0.42, 0.7, vn(q * vec3(3.0, 3.0, 6.0) + vec3(0.0, 0.0, 2.0)));
  float sa = st * 0.2 * uWind * zf * (0.35 + 0.65 * (1.0 - landA)); acc = over(acc, vec4(vec3(sa), sa));   // fainter over land
  // the clouds, brightest on top
  float lit = uMode == 1 ? 0.86 + 0.18 * clamp(dot(n, L), 0.0, 1.0) : 1.0;
  acc = over(acc, vec4(vec3(0.97, 0.98, 1.0) * lit * (0.9 + 0.1 * cov), 1.0) * (cov * 0.6 * uCloud * zf));
  o = acc;
}`;
  function finGL() {
    if (FIN.gl !== undefined) return FIN.gl;
    FIN.gl = null;
    try {
      const cv = document.createElement('canvas'), gl = cv.getContext('webgl2', { premultipliedAlpha: true, antialias: false, alpha: true });
      if (!gl) return null;
      const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
      const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, FIN_VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FIN_FS)); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
      const U = {}; for (const k of ['uMode', 'uPass', 'uRot', 'uTr', 'uSize', 'uRes', 'uScale', 'uTime', 'uOcean', 'uCloud', 'uWind', 'uZoom', 'uHaze', 'uO1', 'uO2', 'uO3', 'uLand', 'uRing', 'uBare', 'uLandBase', 'uB1', 'uB2']) U[k] = gl.getUniformLocation(pr, k);
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'aP'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
      const tLand = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tLand);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      Object.assign(FIN, { cv, pr, U, vao, tLand });
      FIN.gl = gl;
    } catch (e) { FIN.gl = null; FIN.err = String(e && e.message || e); }
    return FIN.gl;
  }
  let finOn = true, finQuick = false;
  /* The climate of an age, for the land's colour (a sketch): how far plants had spread (greening), the global temperature
     (TEMP_MA, Scotese et al. 2021) — warm ages push the belts poleward and grow forests near the poles, cold ones bring
     tundra — how dry the subtropical belts and the interiors of big continents were (Pangaea's interior was the driest),
     the coal-age swamp forests, and grassland only in the last 20 million years. */
  function biomeOf(t) {
    const T = typeof TEMP_MA !== 'undefined' ? (TEMP_MA[Math.max(0, Math.min(TEMP_MA.length - 1, Math.round(t)))] || 145) / 10 : 15;
    const warm = Math.max(0, Math.min(1, (T - 15) / 11)), icy = Math.max(0, Math.min(1, (19 - T) / 5));
    const arid = t > 300 ? 0.6 : t > 175 ? 0.95 : t > 145 ? 0.75 : t > 66 ? 0.55 : t > 34 ? 0.3 : 0.45 + 0.3 * (1 - t / 34);
    const cont = t > 300 ? 0.45 : t > 170 ? 0.85 : 0.45, grass = Math.max(0, Math.min(1, (20 - t) / 14)), lush = t <= 360 && t > 300 ? 1 : 0;
    return { green: greening(t), arid, cont, grass, warm, icy, lush };
  }
  function finLand(t) {                                // upload the land as it is now (its shape), then colour it
    const gl = finGL(); if (!gl) return null;
    try { gl.bindTexture(gl.TEXTURE_2D, FIN.tLand); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, land); FIN.landStamp = stamp; FIN.noLand = false; }
    catch (e) { FIN.noLand = true; return null; }
    return finDraw(2, { biome: biomeOf(t) });
  }
  const finOK = () => finOn && !projGeoid && !!finGL();
  /* pass 0: the sea, for the full redraw; pass 1: what moves (waves, glint, surf, clouds, wind), for the decoration layer.
     Returns the canvas (at a fraction of the screen's pixels: all of it is soft), or null. */
  function finDraw(pass, o = {}) {
    const gl = finGL(); if (!gl) return null;
    const k = o.quick || W < 768 ? (W < 768 && dpr > 1.5 ? 0.26 : 0.34) : 0.5, cv = FIN.cv;   // all of it is soft: phones' dense screens need far fewer pixels
    const rw = Math.max(2, Math.round(canvas.width * k)), rh = Math.max(2, Math.round(canvas.height * k));
    if (cv.width !== rw || cv.height !== rh) { cv.width = rw; cv.height = rh; }
    gl.viewport(0, 0, rw, rh); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.disable(gl.BLEND);
    gl.useProgram(FIN.pr); gl.bindVertexArray(FIN.vao);
    const U = FIN.U, r = proj.rotate(), tr = proj.translate(), col = h => hex(h).map(v => v / 255);
    gl.uniform1i(U.uMode, mode === 'flat' ? 0 : 1); gl.uniform1i(U.uPass, pass);
    gl.uniform2f(U.uRot, r[0] * D2R, r[1] * D2R); gl.uniform2f(U.uTr, tr[0], tr[1]); gl.uniform2f(U.uSize, W, H); gl.uniform2f(U.uRes, rw, rh); gl.uniform1f(U.uScale, proj.scale());
    gl.uniform1f(U.uTime, o.sec || 0); gl.uniform1f(U.uZoom, zoom); gl.uniform1f(U.uHaze, bd().dark ? 1.2 : 0.8);
    gl.uniform1f(U.uCloud, o.cloud == null ? 1 : o.cloud); gl.uniform1f(U.uWind, o.wind == null ? 1 : o.wind);
    const [a1, a2, a3] = [col(pal.o1), col(pal.o2), col(pal.o3)]; gl.uniform3f(U.uO1, ...a1); gl.uniform3f(U.uO2, ...a2); gl.uniform3f(U.uO3, ...a3);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, FIN.tLand); gl.uniform1i(U.uLand, 0);
    let ocean = o.ocean || 0;
    if (pass === 1 && ocean > 0 && FIN.landStamp !== stamp) {      // the land, as the coast mask for surf and glint (not allowed on file: pages: the land has read local pictures)
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, land); FIN.landStamp = stamp; FIN.noLand = false; } catch (e) { FIN.noLand = true; }
    }
    if (FIN.noLand) ocean = 0;
    gl.uniform1f(U.uOcean, ocean);
    if (pass === 2) {                                  // the land's colour needs the age's climate and the land itself
      const ppd = proj.scale() * D2R, cap = 0.6 * Math.max(W, H), B = o.biome;
      gl.uniform3f(U.uRing, Math.min(cap, 4 * ppd), Math.min(cap, 9 * ppd), Math.min(cap, 16 * ppd));
      gl.uniform4f(U.uB1, B.green, B.arid, B.cont, B.grass); gl.uniform4f(U.uB2, B.warm, B.icy, B.lush, 0);
      gl.uniform3f(U.uBare, ...col(pal.bare)); gl.uniform3f(U.uLandBase, ...col(pal.land));
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null);
    FIN.drawn[pass] = (FIN.drawn[pass] || 0) + 1;
    return cv;
  }

  // ── view state ─────────────────────────────────────────────────────
  let canvas, ctx, fx, fctx, W = 0, H = 0, dpr = 1;
  let land, lctx, paper, sheet, sctx;         // offscreen layers
  const q = [], qc = [];                      // quarter-size scratch layers
  let sheetKey = '';
  let mode = 'flat', time = 0;
  let zoom = 1, panX = 0, panY = 0;           // flat view
  let rotL = -20, rotP = -15;                 // globe view (centre lon/lat, negated)
  let centerLon = 0;                          // flat view central meridian
  let proj = null, baseScale = 1, baseT = [0, 0];
  let dirty = true, raf = 0;
  let layers = { labels: [], markers: [], places: [], oceans: [], notes: [], superocean: [], sparks: [], regions: [], routes: [], rocks: [], fauna: [], pin: null, banner: null };
  let selected = null, hits = [], rings = [];
  let pal = null;
  const QS = 4;                               // soft effects are built at 1/4 size
  const api = {};

  // ── the real shape: today's gravity shape (the geoid, EGM2008), every bump made GEO_X times taller ──
  // Only on the globe and only for today: nobody has a gravity map of the ancient Earth. The bulge at the equator
  // (21 km of radius) is left out: at this size it would squash the globe flat. In this view the globe is a d3
  // projection whose every point is pushed out or in by its height, so the land, labels and pins all follow it.
  const R_EARTH = 6371000, GEO_T = 0.0001;
  let geoX = 10000;                                      // how many times taller the bumps are drawn (the card’s slider: 1 = real size)
  const geoFit = () => 1 / (1 + geoX * 86 / R_EARTH);     // shrink the globe so the highest bump still fits
  let geoidOn = false, projGeoid = false, geoRot = null, geoGrid = null;
  function geoidGrid() {
    if (geoGrid || typeof GEOID === 'undefined') return geoGrid;
    const s = GEOID.packed, A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let pos = 0; const u = () => { let r = 0, sh = 0; for (;;) { const c = A.indexOf(s[pos++]); r += (c & 31) << sh; sh += 5; if (!(c & 32)) return r; } };
    const g = new Float32Array(GEOID.w * GEOID.h);
    for (let j = 0; j < GEOID.h; j++) { let v = 0; for (let i = 0; i < GEOID.w; i++) { const n = u(); v += n & 1 ? -(n + 1) / 2 : n / 2; g[j * GEOID.w + i] = v * GEOID.unit; } }
    return (geoGrid = g);
  }
  /* the geoid's height above the smooth shape at a present-day place, in metres (bilinear between 2° cells) */
  function geoidAt(lon, lat) {
    const G = geoidGrid(); if (!G) return 0;
    const w = GEOID.w, st = GEOID.step;
    let x = ((lon + 180) / st) % w; if (x < 0) x += w;
    const y = Math.max(0, Math.min(GEOID.h - 1, (lat + 90) / st));
    const x0 = Math.floor(x), y0 = Math.min(GEOID.h - 2, Math.floor(y)), fx = x - x0, fy = y - y0, x1 = (x0 + 1) % w;
    return (G[y0 * w + x0] * (1 - fx) + G[y0 * w + x1] * fx) * (1 - fy) + (G[(y0 + 1) * w + x0] * (1 - fx) + G[(y0 + 1) * w + x1] * fx) * fy;
  }
  const geoidShows = () => geoidOn && mode === 'globe' && time <= GEO_T && !!geoidGrid();
  const geoF = (l, p) => { const g = geoRot.invert([l * R2D, p * R2D]); return 1 + geoX * geoidAt(g[0], g[1]) / R_EARTH; };
  const orthoInv = (x, y) => { const z = Math.sqrt(x * x + y * y), c = Math.asin(z), sc = Math.sin(c), cc = Math.cos(c); return [Math.atan2(x * sc, z * cc), Math.asin(z && y * sc / z)]; };
  function geoidRaw(l, p) { const f = geoF(l, p), cp = Math.cos(p); return [cp * Math.sin(l) * f, Math.sin(p) * f]; }
  geoidRaw.invert = (x, y) => {                          // undo the push: guess, see how far that spot is pushed, guess again
    let X = x, Y = y;
    for (let i = 0; i < 10; i++) {
      const r0 = Math.hypot(X, Y), k = r0 > 0.9999 ? 0.9999 / r0 : 1;   // keep the guess on the globe's disc
      const r = orthoInv(X * k, Y * k), f = geoF(r[0], r[1]), nX = x / f, nY = y / f;
      const moved = Math.abs(nX - X) + Math.abs(nY - Y); X = nX; Y = nY;
      if (moved < 1e-7) break;
    }
    return orthoInv(X, Y);
  };

  function setupProjection() {
    const pad = Math.max(8, Math.min(W, H) * 0.03);
    if (mode === 'flat') {
      proj = d3.geoEqualEarth().rotate([-centerLon, 0]).fitExtent([[pad, pad * 1.1], [W - pad, H - pad * 1.1]], { type: 'Sphere' });
    } else {
      proj = d3.geoOrthographic().rotate([rotL, rotP]).clipAngle(90).fitExtent([[pad, pad], [W - pad, H - pad]], { type: 'Sphere' });
      projGeoid = geoidShows();
      if (projGeoid) { geoRot = d3.geoRotation([rotL, rotP]); proj = d3.geoProjection(geoidRaw).precision(1.5).clipAngle(90).rotate([rotL, rotP]).scale(proj.scale() * geoFit()).translate(proj.translate()); }
    }
    baseScale = proj.scale(); baseT = proj.translate();
    applyView();
  }
  function applyView() {
    if (!proj) return;
    proj.scale(baseScale * zoom);
    if (mode === 'flat') {
      // keep the map from being dragged off the sheet
      const mx = (zoom - 1) * W * 0.5, my = (zoom - 1) * H * 0.5;
      panX = Math.max(-mx, Math.min(mx, panX)); panY = Math.max(-my, Math.min(my, panY));
      proj.translate([baseT[0] + panX, baseT[1] + panY]).rotate([-centerLon, 0]);
    } else {
      proj.translate(baseT).rotate([rotL, rotP]);
      if (projGeoid) geoRot = d3.geoRotation([rotL, rotP]);
    }
    // a one-finger swipe scrolls the page unless the map itself can be dragged
    if (canvas) canvas.style.touchAction = (mode === 'flat' && zoom <= 1.001) ? 'pan-y' : 'none';
    // On the flat map, a pan or zoom first moves the last finished picture (cheap), then redraws it
    // properly once the hand stops. The globe turns, so it always redraws.
    if (mode === 'flat' && snap && snap.mode === 'flat' && !dirty) { viewDirty = true; clearTimeout(settle); settle = setTimeout(() => { dirty = true; schedule(); }, 140); }
    else dirty = true;
    schedule();
    if (api.onView) api.onView();
  }

  // ── paper: the sheet the map is drawn on ───────────────────────────
  function rnd(i, s = 1) { const h = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return h - Math.floor(h); }
  // ── backdrops: what the map sits on. Atlas (old paper), Field book (after Lhwyd’s 1699 field guide and
  //    Gessner’s woodcuts), Workshop (a cutting mat under a lamp), Planetarium (a dome of stars), Space ──
  let backdrop = 'atlas';
  const BD = {
    atlas: { shadow: 'rgba(60,34,8,0.6)', blur: 20, rim: 'rgba(58,34,10,0.9)', grain: 1, sea: 'waves', dark: false },
    fieldbook: { shadow: 'rgba(60,44,24,0.35)', blur: 8, rim: 'rgba(38,30,22,0.9)', grain: 0.55, sea: 'hatch', dark: false },
    workshop: { shadow: 'rgba(0,0,0,0.75)', blur: 26, rim: 'rgba(16,14,10,0.95)', grain: 0, sea: 'waves', dark: true },
    planetarium: { shadow: 'rgba(120,170,255,0.5)', blur: 34, rim: 'rgba(170,200,255,0.55)', grain: 0, sea: 'waves', dark: true },
    space: { shadow: 'rgba(110,175,255,0.75)', blur: 42, rim: 'rgba(170,215,255,0.5)', grain: 0, sea: 'none', dark: true },
  };
  const bd = () => BD[backdrop] || BD.atlas;
  function stars(c, w, h, n, seed, band) {               // fixed stars: the same sky on every visit
    for (let i = 0; i < n; i++) {
      let x = rnd(i, seed) * w, y = rnd(i, seed + 1) * h;
      if (band && i % 3 === 0) { const u = rnd(i, seed + 2); x = u * w; y = h * (0.85 - 0.7 * u) + (rnd(i, seed + 3) - 0.5) * h * 0.18; }   // the Milky Way: a crowded band
      const r = (0.35 + rnd(i, seed + 4) ** 3 * 1.3) * dpr, a = 0.25 + rnd(i, seed + 5) * 0.7, warm = rnd(i, seed + 6);
      c.fillStyle = warm > 0.85 ? `rgba(255,214,170,${a})` : warm < 0.12 ? `rgba(170,200,255,${a})` : `rgba(255,255,255,${a})`;
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
  }
  function makePaper() {
    paper = document.createElement('canvas'); paper.width = canvas.width; paper.height = canvas.height;
    const c = paper.getContext('2d'), w = paper.width, h = paper.height;
    if (backdrop === 'fieldbook') {
      c.fillStyle = '#f2e9d0'; c.fillRect(0, 0, w, h);
      const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.62);
      v.addColorStop(0, 'rgba(255,250,235,0)'); v.addColorStop(1, 'rgba(150,118,70,0.28)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
      const step = 18 * dpr;                              // a surveyor’s squared page
      c.lineWidth = Math.max(1, 0.6 * dpr);
      for (let x = step / 2; x < w; x += step) { c.strokeStyle = 'rgba(70,110,160,0.16)'; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      for (let y = step / 2; y < h; y += step) { c.strokeStyle = 'rgba(70,110,160,0.16)'; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      c.strokeStyle = 'rgba(190,60,50,0.4)'; c.lineWidth = 1.2 * dpr; c.beginPath(); c.moveTo(40 * dpr, 0); c.lineTo(40 * dpr, h); c.stroke();   // the margin rule
      for (let i = 0; i < 18; i++) {                      // a few old stains
        const x = rnd(i, 31) * w, y = rnd(i, 37) * h, r = (8 + rnd(i, 41) * 30) * dpr, f = c.createRadialGradient(x, y, 0, x, y, r);
        f.addColorStop(0, `rgba(140,96,40,${0.04 + rnd(i, 43) * 0.05})`); f.addColorStop(1, 'rgba(140,96,40,0)'); c.fillStyle = f; c.fillRect(x - r, y - r, r * 2, r * 2);
      }
      sheetKey = ''; return;
    }
    if (backdrop === 'workshop') {
      const g = c.createRadialGradient(w * 0.38, h * 0.3, Math.min(w, h) * 0.05, w * 0.5, h * 0.5, Math.hypot(w, h) * 0.7);
      g.addColorStop(0, '#355a4c'); g.addColorStop(0.55, '#203d34'); g.addColorStop(1, '#0d1a16'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      const step = 16 * dpr;                              // a cutting mat’s grid, every fifth line stronger
      for (let i = 0, x = 0; x < w; x += step, i++) { c.strokeStyle = i % 5 ? 'rgba(210,235,220,0.07)' : 'rgba(210,235,220,0.16)'; c.lineWidth = Math.max(1, 0.6 * dpr); c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      for (let i = 0, y = 0; y < h; y += step, i++) { c.strokeStyle = i % 5 ? 'rgba(210,235,220,0.07)' : 'rgba(210,235,220,0.16)'; c.lineWidth = Math.max(1, 0.6 * dpr); c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      c.strokeStyle = 'rgba(235,225,190,0.5)'; c.lineWidth = Math.max(1, 0.8 * dpr);   // ruler ticks along the top and left edges
      for (let i = 0, x = 0; x < w; x += step / 2, i++) { const l = (i % 10 === 0 ? 12 : i % 2 === 0 ? 7 : 4) * dpr; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, l); c.stroke(); }
      for (let i = 0, y = 0; y < h; y += step / 2, i++) { const l = (i % 10 === 0 ? 12 : i % 2 === 0 ? 7 : 4) * dpr; c.beginPath(); c.moveTo(0, y); c.lineTo(l, y); c.stroke(); }
      sheetKey = ''; return;
    }
    if (backdrop === 'planetarium' || backdrop === 'space') {
      const g = c.createRadialGradient(w * 0.5, h * 0.42, Math.min(w, h) * 0.05, w * 0.5, h * 0.5, Math.hypot(w, h) * 0.66);
      if (backdrop === 'planetarium') { g.addColorStop(0, '#1a2c55'); g.addColorStop(0.6, '#0b1430'); g.addColorStop(1, '#02040c'); }
      else { g.addColorStop(0, '#05070f'); g.addColorStop(1, '#000003'); }
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      if (backdrop === 'space') {                         // a faint band of the galaxy behind the stars
        c.save(); c.translate(w / 2, h / 2); c.rotate(-0.6);
        const b = c.createLinearGradient(0, -h * 0.22, 0, h * 0.22); b.addColorStop(0, 'rgba(120,130,170,0)'); b.addColorStop(0.5, 'rgba(150,150,190,0.12)'); b.addColorStop(1, 'rgba(120,130,170,0)');
        c.fillStyle = b; c.fillRect(-w, -h * 0.22, w * 2, h * 0.44); c.restore();
      } else {                                            // the dome’s horizon, lit from below
        const hz = c.createLinearGradient(0, h * 0.72, 0, h); hz.addColorStop(0, 'rgba(40,90,120,0)'); hz.addColorStop(1, 'rgba(40,110,140,0.35)'); c.fillStyle = hz; c.fillRect(0, h * 0.72, w, h * 0.28);
      }
      stars(c, w, h, Math.round(w * h / (backdrop === 'space' ? 2600 : 4200) / dpr), backdrop === 'space' ? 101 : 211, backdrop === 'space');
      sheetKey = ''; return;
    }
    const g = c.createRadialGradient(w * 0.5, h * 0.48, Math.min(w, h) * 0.1, w * 0.5, h * 0.5, Math.hypot(w, h) * 0.62);
    g.addColorStop(0, '#f1dfb4'); g.addColorStop(0.6, '#e3c88f'); g.addColorStop(1, '#b98f52');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // foxing — the rusty blooms on old paper; seeded so it never re-rolls
    for (let i = 0; i < 46; i++) {
      const x = rnd(i, 3) * w, y = rnd(i, 7) * h, r = (6 + rnd(i, 11) * 34) * dpr;
      const f = c.createRadialGradient(x, y, 0, x, y, r);
      f.addColorStop(0, `rgba(122,74,18,${0.05 + rnd(i, 13) * 0.07})`); f.addColorStop(1, 'rgba(122,74,18,0)');
      c.fillStyle = f; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // fibres
    c.globalAlpha = 0.05; c.strokeStyle = '#6b4a1e'; c.lineWidth = dpr * 0.6;
    for (let i = 0; i < 220; i++) {
      const x = rnd(i, 17) * w, y = rnd(i, 19) * h, a = rnd(i, 23) * Math.PI, l = (4 + rnd(i, 29) * 16) * dpr;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
    c.globalAlpha = 1;
    sheetKey = '';
  }
  let grain = null, wavePat = null;
  function makePatterns() {
    // paper grain as translucent specks, laid over the finished map with an
    // ordinary (cheap) blend rather than a multiply pass
    const n = document.createElement('canvas'); n.width = n.height = 160;
    const c = n.getContext('2d'), id = c.createImageData(160, 160);
    for (let i = 0; i < 160 * 160; i++) {
      const v = rnd(i, 5), dark = v < 0.5;
      id.data[i * 4] = dark ? 70 : 255; id.data[i * 4 + 1] = dark ? 44 : 246; id.data[i * 4 + 2] = dark ? 12 : 214;
      id.data[i * 4 + 3] = Math.floor(Math.abs(v - 0.5) * 2 * 15);
    }
    c.putImageData(id, 0, 0); grain = ctx.createPattern(n, 'repeat');
    const sea = bd().sea; wavePat = null;
    if (sea === 'waves') {
      const wv = document.createElement('canvas'); wv.width = Math.round(56 * dpr); wv.height = Math.round(30 * dpr);
      const wc = wv.getContext('2d'); wc.scale(dpr, dpr);
      wc.strokeStyle = 'rgba(255,255,255,0.5)'; wc.lineWidth = 0.7; wc.lineCap = 'round';
      wc.beginPath(); wc.moveTo(4, 9); wc.quadraticCurveTo(9, 6, 14, 9); wc.quadraticCurveTo(19, 12, 24, 9); wc.stroke();
      wc.beginPath(); wc.moveTo(32, 23); wc.quadraticCurveTo(37, 20, 42, 23); wc.quadraticCurveTo(47, 26, 52, 23); wc.stroke();
      wavePat = ctx.createPattern(wv, 'repeat');
    } else if (sea === 'hatch') {                        // the engraver’s sea: fine level lines, as in old copperplate maps
      const wv = document.createElement('canvas'); wv.width = Math.round(40 * dpr); wv.height = Math.max(3, Math.round(4 * dpr));
      const wc = wv.getContext('2d'); wc.fillStyle = 'rgba(28,40,60,0.55)'; wc.fillRect(0, 0, wv.width, Math.max(1, Math.round(0.6 * dpr)));
      wavePat = ctx.createPattern(wv, 'repeat');
    }
  }

  // ── palette: sea and land colours shift with the climate of the age ─
  const PALS = [
    // [mya, oceanCentre, oceanMid, oceanEdge, landBase]
    [4567, '#e07a3e', '#a8461f', '#5a1d0c', '#d3c3a2'],          // after the Moon-forming impact the surface may have been molten
    [4430, '#e07a3e', '#a8461f', '#5a1d0c', '#d3c3a2'],
    [4380, '#a3cbd6', '#74a6b8', '#44728a', '#d3c3a2'],          // by 4.4 Ga, liquid water (Jack Hills zircons)
    [1800, '#a3cbd6', '#74a6b8', '#44728a', '#d3c3a2'],          // 1800 Ma to the Tonian: open sea, bare rock
    [1000, '#a3cbd6', '#74a6b8', '#44728a', '#d3c3a2'],
    [724, '#a3cbd6', '#74a6b8', '#44728a', '#d3c3a2'],
    [720, '#cfe0ea', '#9fbacb', '#6a879c', '#d8c69c'],
    [640, '#cfe0ea', '#9fbacb', '#6a879c', '#d8c69c'],
    [620, '#a3cbd6', '#74a6b8', '#44728a', '#dcc08a'],
    [460, '#a3cbd6', '#74a6b8', '#44728a', '#dcc08a'],
    [444, '#b4cedb', '#84a8bc', '#4f768e', '#dac290'],
    [430, '#a3cbd6', '#74a6b8', '#44728a', '#dcc08a'],
    [320, '#a9cbd6', '#789fb4', '#476c86', '#d6bd88'],
    [290, '#b6cbd9', '#829db6', '#4b6584', '#dcb87c'],
    [252, '#b9c9d6', '#8a9cb2', '#52627e', '#e2b272'],
    [200, '#a8d2d6', '#72aeb8', '#3f7a8a', '#dfc084'],
    [100, '#aad8da', '#72b0bc', '#3d7686', '#e0c288'],
    [56,  '#a8d2d8', '#72a8ba', '#3f6f86', '#ddc088'],
    [30,  '#a8c9d8', '#739fb6', '#3f6680', '#d8bd88'],
    [3,   '#a8c8d8', '#719cb5', '#3c627e', '#d6bc8a'],
    [1,   '#b8d2e0', '#84a8c0', '#4a6f8c', '#d4be94'],
    [0.02,'#b8d2e0', '#84a8c0', '#4a6f8c', '#d4be94'],
    [0,   '#a8c8d8', '#719cb5', '#3c627e', '#d6bc8a'],
  ];
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  function palette(t) {
    let i = 0; while (i < PALS.length - 2 && PALS[i + 1][0] > t) i++;
    const a = PALS[i], b = PALS[i + 1], k = a[0] === b[0] ? 0 : Math.max(0, Math.min(1, (a[0] - t) / (a[0] - b[0])));
    const land = mix(a[4], b[4], k);
    return { o1: mix(a[1], b[1], k), o2: mix(a[2], b[2], k), o3: mix(a[3], b[3], k), land, bare: mix(land, '#c4ab8c', 0.55), green: greening(t) };
  }

  // ── ice: how far the polar caps reached, by age ────────────────────
  // [mya, southCapRadius°, northCapRadius°, seaIceSouth°, seaIceNorth°]
  // Radii are degrees from the pole. Land inside a cap is drawn as ice.
  // Sources: Snowball Earth glaciations (Sturtian ~717–660 Ma, Marinoan
  // ~650–635 Ma), the end-Ordovician (Hirnantian) ice age, the Late
  // Paleozoic Ice Age (~335–260 Ma) and the Cenozoic icehouse (Antarctic
  // ice from ~34 Ma, northern ice from ~2.6 Ma). Extents are approximate.
  const ICE = [
    [720, 0, 0, 0, 0], [718, 20, 20, 30, 30], [716, 90, 90, 90, 90], [661, 90, 90, 90, 90], [659, 12, 12, 20, 20],
    [652, 10, 10, 15, 15], [649, 90, 90, 90, 90], [636, 90, 90, 90, 90], [634, 8, 8, 12, 12], [630, 0, 0, 0, 0],
    [456, 0, 0, 0, 0], [448, 20, 0, 26, 0], [444.5, 40, 0, 46, 0], [442, 30, 0, 36, 0], [436, 14, 0, 20, 0], [428, 0, 0, 0, 0],
    [366, 0, 0, 0, 0], [360, 14, 0, 20, 0], [352, 10, 0, 16, 0], [340, 14, 0, 20, 0], [325, 30, 0, 36, 0], [305, 42, 0, 47, 0],
    [296, 47, 0, 52, 0], [288, 42, 0, 48, 0], [278, 28, 0, 34, 0], [268, 16, 0, 22, 0], [258, 0, 0, 0, 0],
    [35, 0, 0, 0, 0], [33.5, 19, 0, 23, 0], [26, 17, 0, 21, 0], [15, 19, 0, 23, 0], [13, 24, 0, 27, 0],
    [3.2, 26, 0, 28, 6], [2.6, 26, 0, 30, 14], [0.02, 26, 0, 31, 18], [0, 26, 0, 28, 12],
  ];
  function ice(t) {
    let i = 0; while (i < ICE.length - 2 && ICE[i + 1][0] > t) i++;
    const a = ICE[i], b = ICE[i + 1], k = a[0] === b[0] ? 0 : Math.max(0, Math.min(1, (a[0] - t) / (a[0] - b[0])));
    const L = j => a[j] + (b[j] - a[j]) * k;
    return { s: L(1), n: L(2), ss: L(3), sn: L(4) };
  }

  // ── Ice Age sea level ──────────────────────────────────────────────
  // Global average ("eustatic") sea level in metres relative to today. The last 30,000 years follow
  // Lambeck et al. (2014, PNAS), with the fast rise of meltwater pulse 1A about 14,500 years ago. Before
  // that, QUAT_SL (tools/build_quaternary.py): the Spratt & Lisiecki (2016) stack of seven deep-sea
  // records to 798,000 years ago, then the Berends et al. (2021) reconstruction to 3.6 million years,
  // one value per 1,000 years, about ±10 m. The two blend between 26 and 32 ka.
  const SL = [[0, 0], [2, 0], [4, -1], [6, -3], [7, -6], [8, -15], [8.5, -20], [9, -28], [10, -40], [11.5, -55], [12.5, -65], [14.2, -80], [14.7, -100], [16.5, -110], [19, -125], [21, -130], [26, -130], [30, -90], [32, -85]];
  const QSL = (() => {
    if (typeof QUAT_SL === 'undefined') return null;
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', lut = new Int8Array(128);
    for (let i = 0; i < 64; i++) lut[A.charCodeAt(i)] = i;
    const d = QUAT_SL, out = new Int16Array(3601); let pos = 0, v = 0;
    for (let i = 0; i < 3601; i++) { let r = 0, sh = 0, c; do { c = lut[d.charCodeAt(pos++)]; r += (c & 31) * Math.pow(2, sh); sh += 5; } while (c & 32); v += r % 2 ? -(r + 1) / 2 : r / 2; out[i] = v; }
    return out;
  })();
  function seaLevel(t) {
    const ka = t * 1000;
    if (ka > 3600) return 0;
    const q = () => { if (!QSL) return 0; const i = Math.min(3599, Math.floor(ka)), k = ka - i; return QSL[i] * (1 - k) + QSL[i + 1] * k; };
    if (ka >= 32) return Math.round(q());
    let i = 0; while (i < SL.length - 2 && SL[i + 1][0] < ka) i++;
    const [a0, b0] = SL[i], [a1, b1] = SL[i + 1], k = Math.max(0, Math.min(1, (ka - a0) / (a1 - a0))), tab = b0 + (b1 - b0) * k;
    if (ka <= 26) return Math.round(tab);
    const w = (ka - 26) / 6; return Math.round(tab * (1 - w) + q() * w);
  }
  // Shorelines at each sea-level drop (metres below today): decode the packed levels.
  const unpackLevels = d => {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', lut = new Int8Array(128);
    for (let i = 0; i < 64; i++) lut[A.charCodeAt(i)] = i;
    let pos = 0;
    const u = () => { let r = 0, sh = 0, c; do { c = lut[d.charCodeAt(pos++)]; r += (c & 31) * Math.pow(2, sh); sh += 5; } while (c & 32); return r; };
    const z = () => { const v = u(); return v % 2 ? -(v + 1) / 2 : v / 2; };
    const out = [], nl = u();
    for (let l = 0; l < nl; l++) {
      const metres = u(), np = u(), geoms = [];
      for (let p = 0; p < np; p++) {
        const nr = u(), rings = [];
        for (let r = 0; r < nr; r++) { const n = u(), ring = []; let x = 0, y = 0; for (let i = 0; i < n; i++) { x += z(); y += z(); ring.push([x / 10, y / 10]); } ring.push(ring[0]); rings.push(ring); }
        const g = { type: 'Polygon', coordinates: rings };
        if (d3.geoArea(g) > 2 * Math.PI) rings.forEach(r => r.reverse());
        geoms.push(g);
      }
      out.push({ m: metres, geo: { type: 'GeometryCollection', geometries: geoms } });
    }
    return out;
  };
  const SHELF_LV = typeof SHELF_PACKED === 'undefined' ? [] : unpackLevels(SHELF_PACKED);
  // ── the ice sheets of the last 3.6 million years (tools/build_quaternary.py) ──
  // To 80,000 years ago: PaleoMIST 1.0 (Gowan et al. 2021), a reconstruction every 2,500 years; the map fades
  // from one to the next and never draws an edge moving, because nothing here knows where it stood in between.
  // Before that: Batchelor et al. (2019), the northern ice at 12 moments, each drawn only while the sea level
  // says the ice was near that size (the sea falls as the ice grows). Where nobody mapped an outline — for
  // example 1.78 to 0.93 million years ago — the nearest one in time stands in, paler, as does Patagonia's.
  // Today's ice (Greenland, the Arctic islands) is there from 2.7 million years ago, when the northern ice began.
  const ICE_LV = typeof ICE_PACKED === 'undefined' ? [] : unpackLevels(ICE_PACKED);
  const ICE_S = typeof ICE_SLICES === 'undefined' ? [] : ICE_SLICES.map((s, i) => ({ key: s[0], label: s[1], from: s[2], to: s[3], src: s[4], low: s[5], geo: ICE_LV[i] && ICE_LV[i].geo, i }));
  const ICE_PM = ICE_S.filter(s => /^pm\d/.test(s.key)).sort((a, b) => a.from - b.from);
  const ICE_BAT = ICE_S.filter(s => s.src === 'batchelor2019'), ICE_PAT = ICE_S.find(s => s.key === 'patlgm');
  const smooth = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
  function iceAt(t) {                              // what to draw: [{ s: outline, w: weight 0–1, stand: a stand-in }]
    const ka = t * 1000, out = [];
    if (!ICE_PM.length || ka > 3600) return out;
    if (ka <= 80) {
      let i = 0; while (i < ICE_PM.length - 2 && ICE_PM[i + 1].from < ka) i++;
      const a = ICE_PM[i], b = ICE_PM[i + 1], k = Math.max(0, Math.min(1, (ka - a.from) / (b.from - a.from)));
      if (k < 0.98) out.push({ s: a, w: 1 - k }); if (k > 0.02) out.push({ s: b, w: k });
      return out;
    }
    const sl = seaLevel(t), m = ka < 84 ? (ka - 80) / 4 : 1;      // from 84 down to 80 ka, hand over to PaleoMIST's 80,000-year map
    const g = smooth(2900, 2700, ka);
    if (g * m > 0.02) out.push({ s: ICE_PM[0], w: g * m });
    let s = ICE_BAT.find(b => ka <= b.from && ka >= b.to); const stand = !s;
    if (!s) s = ICE_BAT.reduce((best, b) => { const d = Math.min(Math.abs(ka - b.from), Math.abs(ka - b.to)); return !best || d < best.d ? { b, d } : best; }, null).b;
    const w = smooth(0.35, 0.9, sl < 0 && s.low < 0 ? sl / s.low : 0) * (stand ? 0.6 : 1) * m;
    if (w > 0.02) out.push({ s, w, stand });
    const wp = ICE_PAT ? smooth(0.35, 0.9, sl < 0 ? sl / ICE_PAT.low : 0) * 0.6 * m : 0;
    if (wp > 0.02) out.push({ s: ICE_PAT, w: wp, stand: true });
    if (m < 1) out.push({ s: ICE_PM[ICE_PM.length - 1], w: 1 - m });
    return out;
  }
  let iceP = {};
  // Today's high ground (metres above the sea). Mountains are young, so it is only drawn for the Ice Age and after.
  const RELIEF_LV = typeof RELIEF_PACKED === 'undefined' ? [] : unpackLevels(RELIEF_PACKED);
  // Today's landscapes from measured climate (build_landcover.py). Only drawn for recorded history: further
  // back the deserts and forests were elsewhere, and nothing here knows where.
  const COVER_LV = typeof LANDCOVER_PACKED === 'undefined' ? [] : unpackLevels(LANDCOVER_PACKED);
  const COVER = { 1: ['#3d7a45', 'trees', '#1f5229'], 2: ['#b7b560', 'grass', '#7f8a35'], 3: ['#cfbd80', 'grass', '#a08a4a'], 4: ['#e8d29a', 'sand', '#b9975a'], 5: ['#7fae68', 'trees', '#4c7f43'],
    6: ['#b0ac62', 'grass', '#7d7a3a'], 7: ['#5c8a68', 'trees', '#35604a'], 8: ['#b5b39a', 'sand', '#8a8872'], 9: ['#f3f8fb', null, null] };
  let coverP = {}, coverTiles = {};
  // Today's great rivers and lakes (build_rivers.py) — drawn only after the Ice Age, when the ice had gone.
  const RIVERS = (() => {
    if (typeof RIVERS_PACKED === 'undefined') return null;
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', lut = new Int8Array(128);
    for (let i = 0; i < 64; i++) lut[A.charCodeAt(i)] = i;
    const d = RIVERS_PACKED; let pos = 0;
    const u = () => { let r = 0, sh = 0, c; do { c = lut[d.charCodeAt(pos++)]; r += (c & 31) * Math.pow(2, sh); sh += 5; } while (c & 32); return r; };
    const z = () => { const v = u(); return v % 2 ? -(v + 1) / 2 : v / 2; };
    const pts = () => { const n = u(), o = []; let x = 0, y = 0; for (let i = 0; i < n; i++) { x += z(); y += z(); o.push([x / 100, y / 100]); } return o; };   // hundredths of a degree
    const byRank = [[], [], []], nl = u();
    for (let i = 0; i < nl; i++) { const r = u(); byRank[r <= 2 ? 0 : r <= 4 ? 1 : 2].push(pts()); }
    const lakes = [], nk = u();
    for (let i = 0; i < nk; i++) { const ring = pts(); ring.push(ring[0]); const g = { type: 'Polygon', coordinates: [ring] }; if (d3.geoArea(g) > 2 * Math.PI) ring.reverse(); lakes.push(ring); }
    return { lines: byRank.map(ls => ({ type: 'MultiLineString', coordinates: ls })), lakes: { type: 'MultiPolygon', coordinates: lakes.map(r => [r]) } };
  })();
  let riverP = null, rvCv = null, rvx = null;
  // Rivers across the dry sea floor (build_shelf_rivers.py): from each river mouth, the way water runs over
  // today's sea floor to deep water, traced again for every ice outline with the ice as a wall. Each point
  // carries the depth of the sea floor there, so a trace is drawn only as far as the sea of the moment leaves dry.
  const SHELF_RV = (() => {
    if (typeof SHELF_RIVERS === 'undefined') return null;
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', lut = new Int8Array(128);
    for (let i = 0; i < 64; i++) lut[A.charCodeAt(i)] = i;
    const d = SHELF_RIVERS.paths; let pos = 0;
    const u = () => { let r = 0, sh = 0, c; do { c = lut[d.charCodeAt(pos++)]; r += (c & 31) * Math.pow(2, sh); sh += 5; } while (c & 32); return r; };
    const z = () => { const v = u(); return v % 2 ? -(v + 1) / 2 : v / 2; };
    const paths = [], np = u();
    for (let i = 0; i < np; i++) { const n = u(), p = []; let x = 0, y = 0, q = 0; for (let j = 0; j < n; j++) { x += z(); y += z(); q += z(); p.push([x / 100, y / 100, q]); } paths.push(p); }
    return { paths, rank: SHELF_RIVERS.rank, open: SHELF_RIVERS.open, old: SHELF_RIVERS.old, ice: SHELF_RIVERS.ice };
  })();
  let shelfRvKey = '', shelfRvP = null;
  const lakeFade = t => t <= 0.0095 ? 1 : t >= 0.0125 ? 0 : (0.0125 - t) / 0.003, riverFade = t => t <= 3 ? 1 : t >= 3.3 ? 0 : (3.3 - t) / 0.3;
  function shelfRivers(t, sl, ice) {           // [MultiLineString per width class] for this moment
    if (!SHELF_RV || sl > -5) return null;
    const ka = t * 1000, ids = (ka > 450 ? SHELF_RV.old : SHELF_RV.open).slice();
    const top = ice.filter(x => x.s.key !== 'pm0' && x.s.key !== 'patlgm').sort((a, b) => b.w - a.w)[0];
    const key = top && top.w >= 0.5 ? top.s.key : '';
    for (const [m, g] of (key && SHELF_RV.ice[key]) || []) ids[m] = g;
    const out = [[], [], []];
    ids.forEach((g, m) => {
      if (g < 0) return;
      const p = SHELF_RV.paths[g], line = [[p[0][0], p[0][1]]];
      for (let j = 1; j < p.length; j++) {
        if (p[j][2] <= sl) { const a = p[j - 1], b = p[j], k = (a[2] - sl) / Math.max(1e-6, a[2] - b[2]); line.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); break; }
        line.push([p[j][0], p[j][1]]);
      }
      if (line.length > 1) out[SHELF_RV.rank[m]].push(line);
    });
    return { key: key + '|' + (ka > 450 ? 'old' : 'open') + '|' + sl, lines: out.map(ls => ({ type: 'MultiLineString', coordinates: ls })) };
  }
  // Detailed modern land and coastline (build_coast.py), swapped in when zoomed in on the last few thousand
  // years — while the sea stands where it stands now and the plates have not moved enough to matter.
  // (browsers will not fetch files for a page opened straight from disk: then the plate coastline is used)
  const coastHas = typeof COAST_HAVE === 'undefined' || location.protocol === 'file:' ? null : new Set(COAST_HAVE.split(','));
  const coastTiles = {}; let coastKey = '', coastPaths = null;
  function coastTile(x, y) {
    const k = x + '_' + y; let c = coastTiles[k];
    if (c) return c;
    c = coastTiles[k] = { ok: false };
    if (!coastHas || !coastHas.has(k)) { c.ok = true; c.empty = true; return c; }
    fetch('tiles/coast/' + k + '.txt').then(r => r.ok ? r.text() : Promise.reject(r.status)).then(txt => {
      const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', lut = new Int8Array(128);
      for (let i = 0; i < 64; i++) lut[A.charCodeAt(i)] = i;
      let pos = 0;
      const u = () => { let r = 0, sh = 0, ch; do { ch = lut[txt.charCodeAt(pos++)]; r += (ch & 31) * Math.pow(2, sh); sh += 5; } while (ch & 32); return r; };
      const z = () => { const v = u(); return v % 2 ? -(v + 1) / 2 : v / 2; };
      const pts = () => { const n = u(), o = []; let x = 0, y = 0; for (let i = 0; i < n; i++) { x += z(); y += z(); o.push([x / 100, y / 100]); } return o; };
      const polys = [], np = u();
      for (let i = 0; i < np; i++) { const nr = u(), rings = []; for (let r = 0; r < nr; r++) { const ring = pts(); ring.push(ring[0]); rings.push(ring); } if (d3.geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI) rings.forEach(r => r.reverse()); polys.push(rings); }
      const lines = [], nl = u(); for (let i = 0; i < nl; i++) lines.push(pts());
      c.land = { type: 'MultiPolygon', coordinates: polys }; c.coast = { type: 'MultiLineString', coordinates: lines }; c.ok = true;
      coastKey = ''; dirty = true; schedule();
    }).catch(() => { c.ok = true; c.empty = true; c.failed = true; });
    return c;
  }
  // the detailed land for the view, or null to use the plate model (not zoomed in, too long ago, or still loading)
  function detailedLand(t, vk) {
    if (!coastHas || hideBox || zoom < 3 || t > 0.0065 || seaLevel(t) < -2) return null;
    let lo0 = 999, lo1 = -999, la0 = 999, la1 = -999;
    for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) {
      const ll = proj.invert && proj.invert([W * i / 6, H * j / 6]); if (!ll || !isFinite(ll[0])) continue;
      if (mode === 'globe') { const r = proj.rotate(); if (d3.geoDistance(ll, [-r[0], -r[1]]) > Math.PI / 2) continue; }
      lo0 = Math.min(lo0, ll[0]); lo1 = Math.max(lo1, ll[0]); la0 = Math.min(la0, ll[1]); la1 = Math.max(la1, ll[1]);
    }
    if (lo0 > lo1 || lo1 - lo0 > 120) return null;
    const T = COAST_TILE, tiles = [];
    for (let tx = Math.floor((lo0 - 2 + 180) / T); tx <= Math.floor((lo1 + 2 + 180) / T); tx++) for (let ty = Math.floor((90 - la1 - 2) / T); ty <= Math.floor((90 - la0 + 2) / T); ty++) {
      if (tx < 0 || tx >= 360 / T || ty < 0 || ty >= 180 / T) continue;
      tiles.push(coastTile(tx, ty));
    }
    if (tiles.some(c => !c.ok) || tiles.some(c => c.failed) || tiles.length > 40) return null;
    const key = vk + '|' + tiles.length;
    if (key !== coastKey) {
      const fill = new Path2D(), ink = new Path2D();
      for (const c of tiles) if (!c.empty) { fill.addPath(geoP(c.land)); ink.addPath(geoP(c.coast)); }
      coastKey = key; coastPaths = { fill, ink };
    }
    return coastPaths;
  }
  // Terrain texture (build_hillshade.py): grey tiles of today's light and shadow beside the page, laid
  // over the land so zooming in shows ridges and valleys. Fetched only for what is in view; if the tiles
  // are missing (the page saved on its own) the map simply has none.
  const HILL = [[0, 360, 900], [1, 45, 450], [2, 15, 450]];          // level, tile size (degrees), tile pixels
  const hillImg = {}; let hillCv = null, hillCx = null, hillFail = 0;
  const hillHas = typeof HILL_HAVE === 'undefined' ? null : Object.fromEntries(Object.entries(HILL_HAVE).map(([z, v]) => [z, new Set(v.split(','))]));
  function hillTile(z, x, y) {
    const k = z + '/' + x + '_' + y; let h = hillImg[k];
    if (!h && hillHas && !hillHas[z].has(x + '_' + y)) h = hillImg[k] = { ok: false, bad: true, img: null };   // open sea: no file
    if (!h) {
      h = hillImg[k] = { ok: false, img: new Image() };
      h.img.onload = () => { h.ok = true; dirty = true; schedule(); };
      h.img.onerror = () => { h.bad = true; if (z === 0) hillFail = 1; };
      h.img.src = 'tiles/relief/z' + z + '/' + x + '_' + y + '.jpg';
    }
    return h;
  }
  function drawHill(L, alpha) {
    if (hillFail) return;
    if (!hillCv) { hillCv = document.createElement('canvas'); hillCx = hillCv.getContext('2d'); }
    if (hillCv.width !== land.width || hillCv.height !== land.height) { hillCv.width = land.width; hillCv.height = land.height; }
    const X = hillCx; X.setTransform(1, 0, 0, 1, 0, 0); X.globalCompositeOperation = 'source-over'; X.globalAlpha = 1; X.clearRect(0, 0, hillCv.width, hillCv.height);
    // screen pixels per degree, roughly, to pick the level of detail
    const c0 = proj.invert ? proj.invert([W / 2, H / 2]) : null, a0 = c0 && proj(c0), b0 = c0 && proj([c0[0] + 1, c0[1]]);
    const ppd = a0 && b0 && isFinite(b0[0]) ? Math.abs(b0[0] - a0[0]) * dpr : 3;
    const z = ppd < 4 ? 0 : ppd < 14 ? 1 : 2, deg = HILL[z][1], px = HILL[z][2];
    const n = Math.max(1, Math.min(30, Math.ceil(deg * ppd / dpr / 70)));   // cells per tile side, ~70 screen px each
    const pr = (lo, la) => project([lo, la]);
    let drawn = 0;
    for (let ty = 0; ty < (z ? 180 / deg : 1); ty++) for (let tx = 0; tx < 360 / deg; tx++) {
      const lo0 = -180 + tx * deg, la0 = 90 - ty * deg, dg = Math.min(deg, 180), lo1 = lo0 + deg, la1 = la0 - dg;
      // skip tiles plainly out of view: test a 3x3 grid of points
      let seen = false;
      for (let i = 0; i <= 2 && !seen; i++) for (let j = 0; j <= 2 && !seen; j++) { const q = pr(lo0 + deg * i / 2, la0 - dg * j / 2); if (q && q[0] > -W && q[0] < 2 * W && q[1] > -H && q[1] < 2 * H) seen = true; }
      if (!seen && z) continue;
      let h = hillTile(z, tx, ty), img = h.img, sx0 = 0, sy0 = 0, sw = px, sh = z ? px : 450;
      if (h.bad && z) continue;                     // open sea
      if (!h.ok) {                                   // not loaded yet: borrow the coarser level
        if (z === 2) { const p1 = hillTile(1, Math.floor(tx / 3), Math.floor(ty / 3)); if (p1.ok) { img = p1.img; sx0 = (tx % 3) * 150; sy0 = (ty % 3) * 150; sw = sh = 150; } else continue; }
        else if (z === 1) { const p0 = hillTile(0, 0, 0); if (p0.ok) { img = p0.img; sx0 = tx * 112.5; sy0 = ty * 112.5; sw = sh = 112.5; } else continue; }
        else continue;
        if (h.bad && z) { /* a sea tile: nothing to draw, and the coarser one is flat there too */ continue; }
      }
      const nc = z ? n : Math.max(8, n), nr = z ? n : Math.max(4, Math.round(n / 2));
      for (let i = 0; i < nc; i++) for (let j = 0; j < nr; j++) {
        const la = la0 - dg * j / nr, lb = la0 - dg * (j + 1) / nr, oa = lo0 + deg * i / nc, ob = lo0 + deg * (i + 1) / nc;
        const p00 = pr(oa, la), p10 = pr(ob, la), p01 = pr(oa, lb); if (!p00 || !p10 || !p01) continue;
        if (Math.abs(p10[0] - p00[0]) > W / 3) continue;                        // straddles the map's edge
        const mx = Math.min(p00[0], p10[0], p01[0]), Mx = Math.max(p00[0], p10[0], p01[0]), my = Math.min(p00[1], p10[1], p01[1]), My = Math.max(p00[1], p10[1], p01[1]);
        if (Mx < -80 || mx > W + 80 || My < -80 || my > H + 80) continue;
        const cw = sw / nc, ch = sh / nr, cx = sx0 + i * cw, cy = sy0 + j * ch;
        const A = (p10[0] - p00[0]) / cw, B = (p10[1] - p00[1]) / cw, C = (p01[0] - p00[0]) / ch, D = (p01[1] - p00[1]) / ch;
        X.setTransform(A * dpr, B * dpr, C * dpr, D * dpr, (p00[0] - A * cx - C * cy) * dpr, (p00[1] - B * cx - D * cy) * dpr);
        X.drawImage(img, cx, cy, cw + 0.8, ch + 0.8, cx, cy, cw + 0.8, ch + 0.8); drawn++;
      }
    }
    if (!drawn) return;
    X.setTransform(1, 0, 0, 1, 0, 0); X.globalCompositeOperation = 'destination-in'; X.drawImage(land, 0, 0);   // land only
    L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = 'overlay'; L.globalAlpha = alpha; L.drawImage(hillCv, 0, 0); L.restore();
  }
  // Deep time: climate read from the rocks (build_rocks.py). Each dated rock site paints a soft patch of the
  // land around it — coal green, salt and desert crust sandy, bauxite and kaolin deep green, glacial rubble white —
  // carried on its plate. Land with no patch has no rock evidence in the dataset, and stays plain.
  const ROCK = [['#4f8a4f', 'trees', '#2b5a30'], ['#ead49c', 'sand', '#b08f52'], ['#2f7038', 'trees', '#17421f'], ['#f2f7fb', null, null]];
  let rockSprites = null;
  function rockSprite(k, plain = false) {             // plain: the colour only (the living finish gives the ground its texture)
    if (!rockSprites) rockSprites = {};
    if (rockSprites[k + (plain ? 'p' : '')]) return rockSprites[k + (plain ? 'p' : '')];
    const n = 96, cv = document.createElement('canvas'); cv.width = cv.height = n;
    const x = cv.getContext('2d'), [tint, grain0, ink] = ROCK[k], grain = plain ? null : grain0;
    if (grain) { x.fillStyle = x.strokeStyle = ink; x.lineCap = 'round';
      for (let i = 0; i < 26; i++) {                      // fixed marks, densest in the middle
        const a = i * 2.39996, d = Math.sqrt((i + 0.5) / 26) * n * 0.4, px = n / 2 + Math.cos(a) * d, py = n / 2 + Math.sin(a) * d;
        if (grain === 'trees') { x.beginPath(); x.arc(px, py, 3.1, Math.PI, 0); x.arc(px + 4, py, 2.4, Math.PI, 0); x.fill(); }
        else { x.beginPath(); x.arc(px, py, 1.2, 0, 7); x.fill(); }
      } }
    x.globalCompositeOperation = 'destination-over';
    const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); g.addColorStop(0, tint); g.addColorStop(0.3, tint); g.addColorStop(1, tint + '00');
    x.fillStyle = g; x.fillRect(0, 0, n, n);
    x.globalCompositeOperation = 'destination-in';        // fade the whole patch, grain and all, to nothing at its edge
    const m = x.createRadialGradient(n / 2, n / 2, n * 0.05, n / 2, n / 2, n / 2); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = m; x.fillRect(0, 0, n, n);
    return rockSprites[k + (plain ? 'p' : '')] = cv;
  }
  // markers that arrive and leave: when each first appeared, where it was last drawn, and the ones just gone
  let born = {}, lastAt = {}, ghosts = [], animUntil = 0;
  // emoji on the map are drawn by the app's icon painter when it has one (setIconPainter), else as text
  let iconPaint = null;
  const glyph = (c, e, x, y, px) => { if (iconPaint && iconPaint(c, e, x, y, px)) return; c.font = `${Math.round(px)}px ${EMOJI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(e, x, y); };
  const markText = (c, mk, x, y, r) => { c.font = `700 ${Math.round(r * (mk.length > 1 ? 0.82 : 1.05))}px Cinzel,Georgia,'Times New Roman',serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#3a2410'; c.fillText(mk, x, y + r * 0.06); };
  // small repeating marks that give each landscape its grain: clumps for forest, ticks for grass, grains for sand
  function coverTile(kind, ink) {
    const key = kind + ink; if (coverTiles[key]) return coverTiles[key];
    const n = Math.round(26 * dpr), cv = document.createElement('canvas'); cv.width = cv.height = n;
    const x = cv.getContext('2d'); x.scale(n / 26, n / 26); x.fillStyle = x.strokeStyle = ink; x.lineCap = 'round';
    const spots = [[4, 5], [15, 3], [22, 10], [9, 14], [18, 19], [3, 21], [12, 23], [24, 23]];        // fixed, so the grain never flickers
    for (const [a, b] of spots) {
      if (kind === 'trees') { x.beginPath(); x.arc(a, b, 1.7, Math.PI, 0); x.arc(a + 2.2, b, 1.3, Math.PI, 0); x.fill(); }
      else if (kind === 'grass') { x.lineWidth = 0.7; x.beginPath(); x.moveTo(a, b); x.lineTo(a + 0.8, b - 2.2); x.moveTo(a + 1.6, b); x.lineTo(a + 2, b - 1.7); x.stroke(); }
      else { x.beginPath(); x.arc(a, b, 0.55, 0, 7); x.fill(); }
    }
    const pat = lctx.createPattern(cv, 'repeat'); pat.setTransform && pat.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]));
    return coverTiles[key] = pat;
  }
  let shelfKey = '', shelfP = {}, reliefP = {}, seabed = null;
  // ── motion: wakes behind drifting land, light on the water, eruptions and impacts ──
  // All of it runs off the clock, never chance, and all of it stops when the reader asks for less motion.
  let motion = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let trail = null, tctx = null, trailKey = '', trailT = null, trailLife = 0;   // where the land was a moment ago
  let liveUntil = 0, swell = null, sphereP = null, sphereKey = '';
  const wake = () => { if (motion) { liveUntil = performance.now() + 14000; schedule(); } };
  // A scene the page wants drawn over the map (an extinction playing out). The engine only lends
  // it a canvas and a few helpers; what the scene means is the page's business.
  let fxHook = null, fxStill = false, scn = null, scx = null, glide = 0;
  // While a hand is on the map the frames are light — no terrain shading, dotted coast or soft glow — and the full
  // picture follows 160 ms after it lets go. Only touches, drags, pinches and the wheel do this, never the page itself.
  let lite = false, liteTimer = 0;
  function interact() { lite = true; clearTimeout(liteTimer); liteTimer = setTimeout(() => { lite = false; dirty = true; schedule(); }, 160); }
  let snap = null, snapCv = null, viewDirty = false, settle = 0, iceOff = false, hideBox = null, inkCv = null, ictx = null, todayCv = null, tdx = null, dotPat = null, terMask = null, tmx = null, reachPat = null;
  const inHide = p => { if (!hideBox) return false; const lo = Math.atan2(p.c[1], p.c[0]) * R2D, la = Math.asin(p.c[2]) * R2D; return lo >= hideBox[0] && lo <= hideBox[2] && la >= hideBox[1] && la <= hideBox[3]; };
  const fxHelp = {
    get W() { return W; }, get H() { return H; }, get zoom() { return zoom; },
    pt: at => project(locate(at, time)),
    circle(at, deg) { const ll = locate(at, time); return ll ? geoP(d3.geoCircle().center(ll).radius(Math.max(0.2, Math.min(179.5, deg))).precision(2.5)()) : null; },
    cap: (south, deg) => capPath(south, deg),
    /* a present-day [lon, lat] on screen, for scenes of the last few thousand years (plates have barely moved) */
    ll: (lon, lat) => project([lon, lat]),
    /* where a plate-carried point was at another time, on today's screen */
    ptAt: (at, t) => project(locate(at, t)),
    /* Draw one layer of the scene, clipped to the globe, and keep only the part over 'sea', over 'land', or 'all'. */
    layer(mask, draw) {
      if (!scn) { scn = document.createElement('canvas'); scx = scn.getContext('2d'); }
      if (scn.width !== fx.width || scn.height !== fx.height) { scn.width = fx.width; scn.height = fx.height; }
      scx.setTransform(1, 0, 0, 1, 0, 0); scx.globalAlpha = 1; scx.globalCompositeOperation = 'source-over'; scx.clearRect(0, 0, scn.width, scn.height);
      scx.save(); scx.setTransform(dpr, 0, 0, dpr, 0, 0); scx.clip(geoP({ type: 'Sphere' })); draw(scx); scx.restore();
      if (mask !== 'all') { scx.setTransform(1, 0, 0, 1, 0, 0); scx.globalAlpha = 1; scx.globalCompositeOperation = mask === 'sea' ? 'destination-out' : 'destination-in'; scx.drawImage(land, 0, 0); scx.globalCompositeOperation = 'source-over'; }
      fctx.save(); fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.drawImage(scn, 0, 0); fctx.restore();
    },
    /* A soft band of colour hugging the coasts (the land's outline, swollen by r pixels). */
    halo(c, r, color) {
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.globalAlpha = 0.5; c.drawImage(land, Math.cos(a) * r * dpr, Math.sin(a) * r * dpr); }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-in'; c.fillStyle = color; c.fillRect(0, 0, scn.width, scn.height); c.restore();
    },
  };

  // ── drawing ────────────────────────────────────────────────────────
  const sink = {
    p: null, _l: NaN, _p: NaN,
    polygonStart() { this._l = 0; }, polygonEnd() { this._l = NaN; },
    lineStart() { this._p = 0; },
    lineEnd() { if (this._l === 0) this.p.closePath(); this._p = NaN; },
    point(x, y) { if (this._p === 0) { this.p.moveTo(x, y); this._p = 1; } else this.p.lineTo(x, y); },
    sphere() {}
  };
  // ── water the deep past did not have ──
  // Where no map of the ancient land is in charge (before 540 Ma, and from 3 to 2.6 Ma) the land is today's coast carried
  // on its plates. Today's lakes are holes in it — nearly all cut by the ice ages of the last 2.6 Myr — and Hudson Bay and
  // the Baltic are basins the ice sheets pressed down and the sea then flooded. So there the lakes are not cut out and the
  // two basins are filled, each riding its own plate. Big enclosed seas (the Black Sea, the Caspian) stay until 540 Ma.
  const FILL_T = 2.6, BIG_HOLE = 0.004;                  // steradians: about 160,000 km²
  const PLUGS = [
    { name: 'Hudson Bay', anchor: [56.5, -89], ring: [[-97, 58.5], [-95.5, 61], [-94.5, 63], [-91, 64.8], [-87.5, 66.6], [-87.5, 68.5], [-85, 70.3], [-81, 70.8], [-77, 70], [-73.5, 67.5], [-72.5, 65], [-70, 64.2], [-65.8, 62.4], [-64.6, 61.3], [-64.9, 60.1], [-67.2, 57.6], [-70, 57.8], [-71.5, 60.5], [-76.5, 61.5], [-77.6, 60.5], [-76.3, 58.5], [-76.5, 56], [-78, 54.6], [-78.2, 52], [-79.9, 50.4], [-82.3, 51.6], [-82.7, 53.6], [-83.5, 55], [-85, 54.8], [-88, 56], [-90.6, 56.9], [-92.6, 56.6], [-95.5, 57.8]] },
    { name: 'the Baltic', anchor: [60.5, 16.5], ring: [[10.8, 54], [13, 53.7], [16.5, 54.2], [19.5, 54.2], [21, 55], [21, 56.6], [22.5, 57], [24.5, 56.8], [24.8, 58.6], [23, 59], [24.5, 59.2], [28, 59.3], [30.5, 59.8], [29.5, 60.6], [26.5, 60.7], [22.5, 60.6], [21.8, 62], [21, 63.2], [23.5, 64.6], [25, 65.4], [24.5, 66.2], [22, 66], [21, 64.8], [18.8, 63.6], [17.3, 62.4], [17.2, 61], [18.8, 60.3], [18.8, 59.4], [17, 58.6], [16.3, 57.4], [16, 56.2], [14, 55.4], [12.9, 55.6], [12.4, 55], [11.2, 55.2]] },
  ].map(P => { let ring = P.ring.concat([P.ring[0]]); if (d3.geoArea({ type: 'Polygon', coordinates: [ring] }) > 2 * Math.PI) ring = ring.slice().reverse(); return { ...P, ring, xyz: ring.map(([lo, la]) => toXYZ(la, lo)), tt: NaN, f: -1 }; });
  const holeArea = xyz => { const r = []; for (let i = 0; i < xyz.length; i += 3) r.push([Math.atan2(xyz[i + 1], xyz[i]) * R2D, Math.asin(Math.max(-1, Math.min(1, xyz[i + 2]))) * R2D]); if (r.length < 4) return 0; r.push(r[0]); const a = d3.geoArea({ type: 'Polygon', coordinates: [r] }); return Math.min(a, 4 * Math.PI - a); };
  /* the family a basin rides at time t: the plate under its anchor, on the shore */
  /* attach() depends on the age only through which plate families still exist then (their last ages) and whether the
     age is past the join of the two models, so the answer is the same for every age between two of those breaks:
     ask again only when the time crosses one. */
  let ENDS = null;
  function ageKey(age) {
    if (!ENDS) ENDS = [...new Set(fams.map(f => f.t[f.t.length - 1]))].sort((a, b) => a - b);
    let lo = 0, hi = ENDS.length; while (lo < hi) { const m = (lo + hi) >> 1; if (ENDS[m] < age) lo = m + 1; else hi = m; }
    return (age <= JOIN ? 'y' : 'n') + lo;
  }
  function plugFam(P, t) { const k = ageKey(t); if (P.tt !== k) { P.tt = k; const a = attach(P.anchor[0], P.anchor[1], t); P.f = a ? a.f : -1; } return P.f; }
  function landPath(t, fill = false) {
    const path = new Path2D(); sink.p = path;
    const st = proj.stream(sink);
    // pick the coarsest outline whose error stays under about a pixel
    const pxPerDeg = proj.scale() * D2R * (mode === 'flat' ? 0.86 : 1);
    const lod = 0.8 * pxPerDeg <= 1.15 ? 2 : 0.3 * pxPerDeg <= 1.15 ? 1 : 0;
    for (const p of polys) {
      if (!visible(p, t) || inHide(p)) continue;
      const rings_ = p.lod[lod]; if (!rings_.length) continue;
      const m = famRot(p.f, t); if (!m) continue;
      if (fill && rings_.length > 1 && !p.hb) p.hb = [];
      if (fill && rings_.length > 1 && !p.hb[lod]) p.hb[lod] = rings_.map((r, i) => i > 0 && holeArea(r) > BIG_HOLE);
      st.polygonStart();
      for (let ri = 0; ri < rings_.length; ri++) {
        const xyz = rings_[ri];
        if (fill && ri > 0 && (t > 540 || !p.hb[lod][ri])) continue;   // a lake the deep past did not have
        st.lineStart();
        for (let i = 0; i < xyz.length; i += 3) {
          const x = xyz[i], y = xyz[i + 1], z = xyz[i + 2];
          const X = m[0] * x + m[1] * y + m[2] * z, Y = m[3] * x + m[4] * y + m[5] * z, Z = m[6] * x + m[7] * y + m[8] * z;
          st.point(Math.atan2(Y, X) * R2D, Math.asin(Z > 1 ? 1 : Z < -1 ? -1 : Z) * R2D);
        }
        st.lineEnd();
      }
      st.polygonEnd();
    }
    if (fill) for (const P of PLUGS) {                   // Hudson Bay and the Baltic, filled, on their plates
      const f = plugFam(P, t); if (f < 0) continue;
      const m = famRot(f, t); if (!m) continue;
      st.polygonStart(); st.lineStart();
      for (const [x, y, z] of P.xyz) { const X = m[0] * x + m[1] * y + m[2] * z, Y = m[3] * x + m[4] * y + m[5] * z, Z = m[6] * x + m[7] * y + m[8] * z; st.point(Math.atan2(Y, X) * R2D, Math.asin(Z > 1 ? 1 : Z < -1 ? -1 : Z) * R2D); }
      st.lineEnd(); st.polygonEnd();
    }
    return path;
  }
  const geoP = obj => { const p = new Path2D(); d3.geoPath(proj, p)(obj); return p; };
  /* The traced seas of one map, each plate's rings carried to time t, as one path. */
  function seaPath(fr, t) {
    const path = new Path2D(); sink.p = path;
    const st = proj.stream(sink);
    for (const { f, rings } of fr) {
      const m = famRot(f, t); if (!m) continue;
      st.polygonStart();
      for (const xyz of rings) {
        st.lineStart();
        for (let i = 0; i < xyz.length; i += 3) {
          const x = xyz[i], y = xyz[i + 1], z = xyz[i + 2];
          const X = m[0] * x + m[1] * y + m[2] * z, Y = m[3] * x + m[4] * y + m[5] * z, Z = m[6] * x + m[7] * y + m[8] * z;
          st.point(Math.atan2(Y, X) * R2D, Math.asin(Z > 1 ? 1 : Z < -1 ? -1 : Z) * R2D);
        }
        st.lineEnd();
      }
      st.polygonEnd();
    }
    return path;
  }
  /* The seas to draw this frame, or null: the sea over the continents (M: everything inside the
     continents' edges) and the land as mapped for that moment (L). */
  function seaNow(t) {
    const k = seaFade(t);
    if (k <= 0 || !SEA.P || hideBox) return null;
    if (SEA.st !== 'ready') { seaLoad(); return null; }
    const st = seaStep(t), c = seaPick(st);
    if (SEA.last !== undefined && SEA.last !== st) {             // time is moving: trace the next map while the reader looks at this one
      const nx = st + Math.sign(st - SEA.last);
      if (nx >= 0 && nx < SEA.S && !SEA.cache.has(nx)) {
        if (SW.w) { SW.ahead = nx; seaNext(); }
        else setTimeout(() => { if (!SEA.cache.has(nx)) seaStage(nx); }, 16);
      }
    }
    SEA.last = st;
    const pxPerDeg = proj.scale() * D2R * (mode === 'flat' ? 0.86 : 1);      // the same choice of detail as the land
    const lod = 0.8 * pxPerDeg <= 1.15 ? 2 : 0.3 * pxPerDeg <= 1.15 ? 1 : 0;
    const tol = [0, 0.3, 0.8][lod];
    for (const x of [c.M, c.L, c.R]) if (!x[lod]) x[lod] = seaThin(x[0], tol);
    // the land's shape switches at the middle of a fade (k ½): half-erased land would let the ocean show through
    return { k, snap: k >= 0.5, M: seaPath(c.M[lod], t), L: seaPath(c.L[lod], t), R: seaPath(c.R[lod], t) };
  }
  const capGeo = (poleLat, radius) => d3.geoCircle().center([0, poleLat]).radius(radius).precision(5)();
  const graticule = d3.geoGraticule().step([30, 30]).extent([[-180, -89.99], [180, 89.99]]);
  const latY = lat => proj([centerLon, lat])[1];
  /* A polar cap as a path. On the flat map parallels are straight lines, so
     a cap is just a rectangle; on the globe it has to be projected. */
  function capPath(south, radius) {
    radius = Math.min(89.9, radius);
    if (mode === 'flat') {
      const p = new Path2D(), y = latY(south ? -(90 - radius) : 90 - radius);
      if (south) p.rect(-10, y, W + 20, H - y + 10); else p.rect(-10, -10, W + 20, y + 10);
      return p;
    }
    return geoP(capGeo(south ? -90 : 90, radius));
  }

  // Land tint by latitude: a first-order sketch of climate belts — wet
  // tropics, dry subtropics, temperate, polar. Illustrative, not measured.
  const BELTS = [[0, '#aab26b'], [9, '#b2b56e'], [17, '#d3bd7c'], [25, '#e2c488'], [33, '#d9c184'], [42, '#bfb975'], [52, '#adb06d'], [62, '#a8aa70'], [72, '#b7b287'], [90, '#c8c2a2']];
  function beltColor(lat) {
    lat = Math.abs(lat);
    let i = 0; while (i < BELTS.length - 2 && BELTS[i + 1][0] <= lat) i++;
    const a = BELTS[i], b = BELTS[i + 1], k = Math.max(0, Math.min(1, (lat - a[0]) / (b[0] - a[0])));
    // Before plants colonised the land (~470 Ma on) there was nothing green
    // to show: bare rock everywhere, whatever the latitude.
    return mix(pal.bare, mix(mix(a[1], b[1], k), pal.land, 0.38), pal.green);
  }
  // how green the land is allowed to be: nothing before ~470 Ma, forests by ~360 Ma
  function greening(t) { return t >= 470 ? 0 : t >= 420 ? (470 - t) / 50 * 0.3 : t >= 360 ? 0.3 + (420 - t) / 60 * 0.7 : 1; }

  // ── the world ocean: label it where open water is widest ───────────
  let soT = -99, soAt = null, soView = '';
  function widestOcean(t) {
    const vk = mode + '|' + Math.round(centerLon / 12);
    if (soAt && Math.abs(t - soT) < 2 && vk === soView) return soAt;
    if (vk !== soView) soAt = null;
    soT = t; soView = vk;
    const pts = [];
    for (const p of polys) {
      if (!visible(p, t)) continue;
      const m = famRot(p.f, t); if (!m) continue;
      const o = (p.lod[2].length ? p.lod[2] : p.lod[1])[0] || p.rings[0];
      for (let i = 0; i < o.length; i += 6) {
        const x = o[i], y = o[i + 1], z = o[i + 2];
        pts.push(m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z);
      }
    }
    let best = null, bestScore = -9, prevScore = -9;
    for (let la = -48; la <= 48; la += 12) for (let lo = -180; lo < 180; lo += 12) {
      // on the flat map, stay clear of the left and right edges so the name is not cut off
      if (mode === 'flat' && Math.abs(((lo - centerLon + 540) % 360) - 180) > 138) continue;
      const v = toXYZ(la, lo); let near = -1;
      for (let i = 0; i < pts.length; i += 3) { const d = pts[i] * v[0] + pts[i + 1] * v[1] + pts[i + 2] * v[2]; if (d > near) near = d; }
      const score = Math.acos(Math.min(1, near)) - Math.abs(la) * D2R * 0.25;   // prefer low latitudes: easier to read
      if (score > bestScore) { bestScore = score; best = [lo, la]; }
      if (soAt && soAt[0] === lo && soAt[1] === la) prevScore = score;
    }
    // stay put unless somewhere else is clearly better, so the label does not hop about
    if (!soAt || prevScore < bestScore - 0.1) soAt = best;
    return soAt;
  }

  let lastMs = 0;
  let fullDraws = 0;
  /* the geoid's heights as colour (blue lower, orange higher) and as light and shadow on the bumps, built at a
     third of the size and only again when the view changes */
  let gCv = null, gx = null, gKey = '';
  const GEO_RAMP = [[-107, [44, 78, 160]], [-55, [104, 146, 204]], [0, [242, 238, 224]], [40, [236, 168, 88]], [86, [188, 66, 28]]];
  function geoColor(n) {
    let i = 0; while (i < GEO_RAMP.length - 2 && n > GEO_RAMP[i + 1][0]) i++;
    const [a, ca] = GEO_RAMP[i], [b, cb] = GEO_RAMP[i + 1], u = Math.max(0, Math.min(1, (n - a) / (b - a)));
    return [0, 1, 2].map(k => ca[k] + (cb[k] - ca[k]) * u);
  }
  function drawGeoid(c) {
    const s = 3, gw = Math.ceil(W / s), gh = Math.ceil(H / s), key = [rotL.toFixed(2), rotP.toFixed(2), zoom.toFixed(3), W, H, geoX].join('|');
    if (key !== gKey) {
      gKey = key;
      if (!gCv) { gCv = document.createElement('canvas'); gx = gCv.getContext('2d'); }
      gCv.width = gw; gCv.height = gh;
      const img = gx.createImageData(gw, gh), D = img.data, N = new Float32Array(gw * gh).fill(NaN);
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const ll = proj.invert([(i + 0.5) * s, (j + 0.5) * s]); if (ll && ll[0] === ll[0] && ll[1] === ll[1]) N[j * gw + i] = geoidAt(ll[0], ll[1]); }
      const k = geoX / R_EARTH * proj.scale() / (2 * s);       // metres of geoid to the slope of the drawn bump
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
        const n = N[j * gw + i]; if (n !== n) continue;
        const l = N[j * gw + Math.max(0, i - 1)], r = N[j * gw + Math.min(gw - 1, i + 1)], u = N[Math.max(0, j - 1) * gw + i], d = N[Math.min(gh - 1, j + 1) * gw + i];
        const sx = (r === r && l === l) ? (r - l) * k : 0, sy = (d === d && u === u) ? (d - u) * k : 0;
        const sh = Math.max(0.55, Math.min(1.4, 1 + 0.5 * (sx + sy)));   // light from the upper left
        const col = geoColor(n), o = (j * gw + i) * 4;
        D[o] = Math.min(255, col[0] * sh); D[o + 1] = Math.min(255, col[1] * sh); D[o + 2] = Math.min(255, col[2] * sh); D[o + 3] = 255;
      }
      gx.putImageData(img, 0, 0);
    }
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = true; c.globalAlpha = 0.6; c.drawImage(gCv, 0, 0, canvas.width, canvas.height); c.restore();
  }
  function draw() {
    if (mode === 'globe' && geoidShows() !== projGeoid) setupProjection();
    dirty = false; stamp++; fullDraws++;
    const t0 = performance.now();
    const t = time, c = ctx;
    pal = palette(t);
    const sphere = geoP({ type: 'Sphere' });
    const b = d3.geoPath(proj).bounds({ type: 'Sphere' });
    const cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2, rad = Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1]) / 2;

    // the sheet (paper + the globe's drop shadow) only changes with the view
    const key = [mode, zoom.toFixed(3), panX | 0, panY | 0, W, H, projGeoid ? rotL.toFixed(2) + ',' + rotP.toFixed(2) + ',' + geoX : ''].join('|');
    if (key !== sheetKey) {
      sheetKey = key;
      sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.drawImage(paper, 0, 0);
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.save(); sctx.shadowColor = bd().shadow; sctx.shadowBlur = bd().blur * dpr; sctx.shadowOffsetY = bd().dark ? 0 : 3 * dpr;
      sctx.fillStyle = '#6a8ea0'; sctx.fill(sphere); sctx.restore();
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(sheet, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    // sea
    const og = c.createRadialGradient(cx - rad * 0.15, cy - rad * 0.2, rad * 0.05, cx, cy, rad * 1.05);
    og.addColorStop(0, pal.o1); og.addColorStop(0.55, pal.o2); og.addColorStop(1, pal.o3);
    c.save(); c.clip(sphere);
    const oc = finOK() ? finDraw(0) : null;                                   // the living finish: depth, currents, light and the air at the rim
    if (oc) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(oc, 0, 0, canvas.width, canvas.height); c.restore(); }
    else { c.fillStyle = og; c.fillRect(0, 0, W, H); }
    if (backdrop === 'space' || backdrop === 'planetarium') { c.globalAlpha = 0.42; c.fillStyle = '#05162e'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }   // a planet’s sea, seen from far off
    if (wavePat && (!oc || bd().sea === 'hatch')) { c.globalAlpha = bd().sea === 'hatch' ? 0.5 : 0.3; c.fillStyle = wavePat; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }

    // sea ice: soft-edged, so it reads as pack ice rather than a hard line
    const I = ice(t);
    for (const [south, r] of [[true, I.ss], [false, I.sn]]) {
      if (r < 0.5) continue;
      if (r >= 89) { c.globalAlpha = 0.78; c.fillStyle = '#f4fafd'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; continue; }
      if (mode === 'flat') {
        const y0 = latY((south ? -1 : 1) * (90 - r)), y1 = latY((south ? -1 : 1) * 89.9);
        const g = c.createLinearGradient(0, y0, 0, y1);
        g.addColorStop(0, 'rgba(244,250,253,0)'); g.addColorStop(0.4, 'rgba(244,250,253,0.42)'); g.addColorStop(1, 'rgba(244,250,253,0.7)');
        c.fillStyle = g; c.fillRect(0, Math.min(y0, y1), W, Math.abs(y1 - y0) + 2);
      } else {
        c.fillStyle = '#f4fafd'; c.globalAlpha = 0.17;
        for (const k of [1, 0.86, 0.72, 0.58]) c.fill(capPath(south, r * k));
        c.globalAlpha = 1;
      }
    }

    // graticule
    c.lineWidth = 0.6; c.strokeStyle = 'rgba(40,58,78,0.20)';
    c.stroke(geoP(graticule()));
    c.setLineDash([5, 4]); c.lineWidth = 0.9; c.strokeStyle = 'rgba(40,48,66,0.42)';
    c.stroke(geoP({ type: 'LineString', coordinates: Array.from({ length: 73 }, (_, i) => [-180 + i * 5, 0]) }));
    c.setLineDash([]);

    // deep time: the open ocean a shade deeper (the same before and after the sea maps begin, so 540 Ma is no seam)
    const deepK = t <= 3 ? 0 : t < 5 ? (t - 3) / 2 : 1;
    if (deepK > 0 && !hideBox) { c.globalAlpha = 0.3 * deepK; c.fillStyle = '#0f3358'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
    // the sea over the continents and their edges, paler than the deep ocean
    const sea = seaNow(t);
    if (sea) {
      c.globalAlpha = 0.86 * sea.k; c.fillStyle = mix(pal.o1, '#d6f2e6', 0.55); c.fill(sea.M);
      c.globalAlpha = 0.55 * sea.k; c.strokeStyle = mix(pal.o1, '#f4fbf6', 0.65); c.lineWidth = 1; c.stroke(sea.M);
      c.globalAlpha = 1;
      const tc = lite ? null : terDraw(t, 'sea', 0.95 * sea.k);       // how deep the shallow seas were, inside the traced sea
      if (tc) { c.save(); c.clip(sea.M); c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(tc, 0, 0, canvas.width, canvas.height); c.restore(); }
    }

    // Ice Age: the continental shelves come out of the sea as the water drops
    const sl = seaLevel(t), iceNow = iceAt(t);
    const vk = [mode, zoom.toFixed(3), panX | 0, panY | 0, centerLon.toFixed(2), rotL.toFixed(2), rotP.toFixed(2), W, H, projGeoid && geoX].join('|');
    if (vk !== shelfKey) { shelfKey = vk; shelfP = {}; reliefP = {}; coverP = {}; riverP = null; iceP = {}; shelfRvP = null; }
    if (sl < -1 && SHELF_LV.length && !hideBox) {
      const lv = i => shelfP[i] || (shelfP[i] = geoP(SHELF_LV[i].geo));
      // the deepest level already reached is drawn in full; the next one fades in
      const drop = -sl; let k = -1; while (k + 1 < SHELF_LV.length && SHELF_LV[k + 1].m <= drop) k++;
      const nxt = k + 1 < SHELF_LV.length ? k + 1 : -1, lo = k >= 0 ? SHELF_LV[k].m : 0;
      const frac = nxt >= 0 ? (drop - lo) / (SHELF_LV[nxt].m - lo) : 0;
      const layersToDraw = []; if (k >= 0) layersToDraw.push([k, 1]); if (nxt >= 0 && frac > 0.02) layersToDraw.push([nxt, frac]);
      for (const [i, a] of layersToDraw) { c.globalAlpha = 0.92 * a; c.fillStyle = '#efe2b8'; c.fill(lv(i)); }
      if (!seabed) {                                         // dotted texture: dry seabed, not old land
        const sb = document.createElement('canvas'); sb.width = sb.height = Math.round(9 * dpr);
        const sc = sb.getContext('2d'); sc.fillStyle = 'rgba(120,84,34,0.55)'; sc.beginPath(); sc.arc(2 * dpr, 2 * dpr, 0.75 * dpr, 0, 7); sc.moveTo(7.25 * dpr, 6.5 * dpr); sc.arc(6.5 * dpr, 6.5 * dpr, 0.75 * dpr, 0, 7); sc.fill();
        seabed = c.createPattern(sb, 'repeat'); seabed.setTransform && seabed.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0]));
      }
      for (const [i, a] of layersToDraw) { c.globalAlpha = 0.65 * a; c.fillStyle = seabed; c.fill(lv(i)); }
      const sr = t <= 3.3 ? shelfRivers(t, sl, iceNow) : null;            // the rivers ran on across the dry sea floor
      if (sr) {
        if (sr.key !== shelfRvKey || !shelfRvP) { shelfRvKey = sr.key; shelfRvP = sr.lines.map(g => geoP(g)); }
        const zw = Math.min(2.2, 0.75 + zoom * 0.25);
        c.lineCap = c.lineJoin = 'round'; c.strokeStyle = '#5f8fae';
        [[1.5, 0.85], [1.0, 0.75], [0.65, zoom > 1.6 ? 0.6 : 0.45]].forEach(([w, a], i) => { c.globalAlpha = a; c.lineWidth = w * zw; c.stroke(shelfRvP[i]); });
      }
      c.globalAlpha = 1;
    }

    // ── the wake: a pale ghost of where the land was a moment ago, fading like a long exposure ──
    if (motion) {
      if (!trail) { trail = document.createElement('canvas'); tctx = trail.getContext('2d'); }
      if (trail.width !== land.width || trail.height !== land.height) { trail.width = land.width; trail.height = land.height; trailKey = ''; }
      const tk = [mode, zoom.toFixed(3), panX | 0, panY | 0, centerLon.toFixed(2), rotL.toFixed(2), rotP.toFixed(2)].join('|');
      tctx.setTransform(1, 0, 0, 1, 0, 0);
      if (tk !== trailKey) { trailKey = tk; trailT = null; trailLife = 0; tctx.clearRect(0, 0, trail.width, trail.height); }
      const moved = trailT !== null && trailT !== t;
      if (moved || trailLife > 0) {
        tctx.globalCompositeOperation = 'destination-out'; tctx.globalAlpha = 1; tctx.fillStyle = `rgba(0,0,0,${moved ? 0.085 : 0.13})`; tctx.fillRect(0, 0, trail.width, trail.height);
        if (moved) {
          tctx.globalCompositeOperation = 'source-over'; tctx.globalAlpha = 0.42; tctx.drawImage(land, 0, 0);       // `land` still holds the previous frame
          tctx.globalCompositeOperation = 'source-in'; tctx.globalAlpha = 1; tctx.fillStyle = '#b9a06a'; tctx.fillRect(0, 0, trail.width, trail.height);
          trailLife = 34;
        } else if (--trailLife <= 0) tctx.clearRect(0, 0, trail.width, trail.height);
        tctx.globalCompositeOperation = 'source-over';
      }
      trailT = t;
    }

    // ── land, built on its own layer so overlapping blocks merge ──
    const det = detailedLand(t, [mode, zoom.toFixed(3), panX | 0, panY | 0, centerLon.toFixed(2), rotL.toFixed(2), rotP.toFixed(2), W, H].join('|'));
    const lp = det ? det.fill : landPath(t, t > FILL_T && !(sea && sea.snap));
    const L = lctx;
    L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = 'source-over'; L.globalAlpha = 1;
    L.clearRect(0, 0, land.width, land.height);
    L.setTransform(dpr, 0, 0, dpr, 0, 0);
    L.fillStyle = pal.land; L.fill(lp);
    const guide = !lite && sea && sea.snap && t < 405 ? sea.k * Math.min(1, (405 - t) / 5) : 0;   // before 410 Ma the land is the model's own blocks, not today's coasts
    if (guide) {
      if (!todayCv) { todayCv = document.createElement('canvas'); tdx = todayCv.getContext('2d'); }
      if (todayCv.width !== land.width || todayCv.height !== land.height) { todayCv.width = land.width; todayCv.height = land.height; }
      tdx.setTransform(1, 0, 0, 1, 0, 0); tdx.globalAlpha = 1; tdx.globalCompositeOperation = 'copy'; tdx.drawImage(land, 0, 0); tdx.globalCompositeOperation = 'source-over';
    }
    if (sea && sea.snap) {                         // where the maps say sea, today's land goes; the maps' land comes in
      L.globalCompositeOperation = 'destination-out'; L.globalAlpha = 1; L.fill(sea.M);
      L.globalCompositeOperation = 'source-over'; L.fill(sea.L);
    }
    L.globalCompositeOperation = 'source-atop';
    const bc = finOK() && t <= MAXT ? finLand(t) : null;                    // the living finish: the land coloured by its climate
    if (bc) { L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.imageSmoothingEnabled = true; L.drawImage(bc, 0, 0, land.width, land.height); L.restore(); }
    else if (mode === 'flat') {
      const yN = latY(89.9), yS = latY(-89.9), g = L.createLinearGradient(0, yN, 0, yS);
      for (let la = 90; la >= -90; la -= 6) g.addColorStop(Math.max(0, Math.min(1, (latY(Math.max(-89.9, Math.min(89.9, la))) - yN) / (yS - yN))), beltColor(la));
      L.fillStyle = g; L.fillRect(0, 0, W, H);
    } else {
      for (let la = 0; la < 86; la += 6) {
        L.fillStyle = beltColor(la + 3);
        L.fill(capPath(false, 90 - la)); L.fill(capPath(true, 90 - la));
      }
    }
    // deep time: the land near each dated rock takes the look of the climate that rock records
    if (layers.rocks.length && t > 0.009) {
      warmRocks();
      const order = [2, 0, 1, 3];
      for (const k of order) for (const R of layers.rocks) {
        if (R.k !== k || t > R.from || t < R.to) continue;
        if (R.at === undefined) { R.at = attach(R.lat, R.lon, (R.from + R.to) / 2); if (R.at.f < 0) R.at = null; }
        if (!R.at) continue;
        const ll = locate(R.at, t); if (!ll) continue;
        const p = project(ll); if (!p) continue;
        const q2 = proj([ll[0], Math.max(-89, Math.min(89, ll[1] + (ll[1] > 0 ? -6 : 6)))]); if (!q2) continue;
        const rad = Math.max(5, Math.min(140, Math.hypot(q2[0] - p[0], q2[1] - p[1])));
        if (!inView(p[0], p[1], -rad)) continue;
        L.globalAlpha = k === 3 ? 0.85 : 0.62; L.drawImage(rockSprite(k, finOK()), p[0] - rad, p[1] - rad, rad * 2, rad * 2);
      }
      L.globalAlpha = 1;
    }
    // today's landscapes, for recorded history only: a wash of colour and a grain for each
    const cf = t <= 0.0058 ? 1 : t >= 0.009 ? 0 : (0.009 - t) / 0.0032;
    if (cf > 0 && COVER_LV.length) {
      for (const lv of COVER_LV) {
        const [tint, grain, ink] = COVER[lv.m] || []; if (!tint) continue;
        const pth = coverP[lv.m] || (coverP[lv.m] = geoP(lv.geo));
        const zc = Math.max(0.4, Math.min(1, 1.25 - zoom / 16));          // coarse zones fade a little as you come close
        L.globalAlpha = 0.66 * cf * zc; L.fillStyle = tint; L.fill(pth);
        if (grain) { L.globalAlpha = 0.5 * cf * zc; L.fillStyle = coverTile(grain, ink); L.fill(pth); }
      }
      L.globalAlpha = 1;
    }
    // the ground's own texture, riding its plate (the living finish): mottled at three scales, with grain close up
    if (!lite && finOn && t <= MAXT) {
      const gt = terDraw(t, 'ground', 0.9);
      if (gt) {
        if (!grMask) { grMask = document.createElement('canvas'); grx = grMask.getContext('2d'); }
        if (grMask.width !== land.width || grMask.height !== land.height) { grMask.width = land.width; grMask.height = land.height; }
        grx.imageSmoothingEnabled = true; grx.globalCompositeOperation = 'copy'; grx.drawImage(gt, 0, 0, land.width, land.height); grx.globalCompositeOperation = 'destination-in'; grx.drawImage(land, 0, 0); grx.globalCompositeOperation = 'source-over';
        L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = 1; L.globalCompositeOperation = 'soft-light'; L.drawImage(grMask, 0, 0); L.restore();
      }
    }
    // today's terrain as light and shadow — only while the land is where it is today (last ~2 million years)
    const hf = t <= 1 ? 1 : t >= 2 ? 0 : 2 - t;
    if (hf > 0 && !lite && !projGeoid) drawHill(L, 0.85 * hf);   // the light-and-shadow pictures are flat: they cannot follow the bumps
    // deep time: light and shadow from the ancient elevation maps, kept to the land
    if (sea) {
      const tc = lite ? null : terDraw(t, 'land', 0.9 * sea.k);
      if (tc) {
        if (!terMask) { terMask = document.createElement('canvas'); tmx = terMask.getContext('2d'); }
        if (terMask.width !== land.width || terMask.height !== land.height) { terMask.width = land.width; terMask.height = land.height; }
        tmx.imageSmoothingEnabled = true; tmx.globalCompositeOperation = 'copy'; tmx.drawImage(tc, 0, 0, land.width, land.height); tmx.globalCompositeOperation = 'destination-in'; tmx.drawImage(land, 0, 0); tmx.globalCompositeOperation = 'source-over';
        L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = 1; L.globalCompositeOperation = 'overlay'; L.drawImage(terMask, 0, 0); L.restore();
      }
    }
    // land the sea reached at its highest (Kocsis & Scotese): blue stripes over it
    if (sea && sea.snap) {
      if (!reachPat) { const d = Math.max(1, Math.round(dpr)), pc = document.createElement('canvas'); pc.width = pc.height = 7 * d; const px = pc.getContext('2d');
        px.strokeStyle = 'rgba(28,104,150,0.9)'; px.lineWidth = 1.3 * d; px.beginPath(); for (const o of [-7, 0, 7]) { px.moveTo(o * d, 7 * d); px.lineTo((o + 7) * d, 0); } px.stroke();
        reachPat = L.createPattern(pc, 'repeat'); reachPat.setTransform && reachPat.setTransform(new DOMMatrix([1 / dpr, 0, 0, 1 / dpr, 0, 0])); }
      L.save(); L.globalCompositeOperation = 'source-atop';
      L.globalAlpha = 0.16 * sea.k; L.fillStyle = '#5aa9c9'; L.fill(sea.R);
      L.globalAlpha = 0.55 * sea.k; L.fillStyle = reachPat; L.fill(sea.R); L.restore();
    }
    // Today's great rivers, back to 3 million years ago: most of them already ran where they run now (the
    // exceptions are in "How this map is made"); where the ice lay they are hidden under it. Today's lakes only
    // after the Ice Age: before that the ice covered or scoured many of them, and others dried out.
    const lkf = lakeFade(t), rvf = riverFade(t);
    if (rvf > 0 && RIVERS) {
      if (!riverP) riverP = { lines: RIVERS.lines.map(g => geoP(g)), lakes: geoP(RIVERS.lakes) };
      if (lkf > 0) {
        L.globalAlpha = 0.95 * lkf; L.fillStyle = pal.o2; L.fill(riverP.lakes);
        if (zoom > 2.5) { L.globalAlpha = Math.min(1, (zoom - 2.5) / 3) * 0.7 * lkf; L.lineWidth = 1.1; L.strokeStyle = '#2f5c78'; L.lineJoin = 'round'; L.stroke(riverP.lakes); }   // a fine shore line when close
      }
      if (!rvCv) { rvCv = document.createElement('canvas'); rvx = rvCv.getContext('2d'); }
      if (rvCv.width !== land.width || rvCv.height !== land.height) { rvCv.width = land.width; rvCv.height = land.height; }
      rvx.setTransform(1, 0, 0, 1, 0, 0); rvx.globalCompositeOperation = 'source-over'; rvx.globalAlpha = 1; rvx.clearRect(0, 0, rvCv.width, rvCv.height);
      rvx.setTransform(dpr, 0, 0, dpr, 0, 0); rvx.lineCap = rvx.lineJoin = 'round'; rvx.strokeStyle = '#5f8fae';
      const zw = Math.min(2.2, 0.75 + zoom * 0.25);
      [[1.5, 0.85], [1.0, 0.7], [0.65, zoom > 1.6 ? 0.6 : 0]].forEach(([w, a], i) => { if (!a) return; rvx.globalAlpha = a; rvx.lineWidth = w * zw; rvx.stroke(riverP.lines[i]); });
      rvx.globalCompositeOperation = 'destination-out';                // no river runs on top of the ice
      for (const it of iceNow) { if (iceOff && it.s !== ICE_PM[0]) continue; rvx.globalAlpha = Math.min(1, it.w * 1.25); rvx.fill(iceP[it.s.i] || (iceP[it.s.i] = geoP(it.s.geo))); }
      rvx.globalCompositeOperation = 'source-over';
      L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = rvf; L.drawImage(rvCv, 0, 0); L.setTransform(dpr, 0, 0, dpr, 0, 0);
      L.globalAlpha = 1;
    }
    // today's mountains, tinted darker the higher they stand — only while the ranges were where they are now
    const rf = t <= 2.6 ? 1 : t >= 5 ? 0 : (5 - t) / 2.4;
    if (rf > 0 && RELIEF_LV.length) {
      const al = [0.13, 0.16, 0.2];
      RELIEF_LV.forEach((lv, i) => { L.globalAlpha = (al[i] || 0.15) * rf; L.fillStyle = '#5a3610'; L.fill(reliefP[i] || (reliefP[i] = geoP(lv.geo))); });
      L.globalAlpha = 1;
    }
    // lands a state held (a sketch the page supplies): a wash of its colour and a dashed edge, on land only
    for (const R of layers.regions) {
      if (t > R.from || t < R.to) continue;
      const pth = geoP(R.geo), on = R.key === selected;
      L.globalAlpha = on ? 0.58 : 0.42; L.fillStyle = R.color; L.fill(pth);
      L.globalAlpha = on ? 1 : 0.9; L.strokeStyle = R.color; L.lineWidth = on ? 2.6 : 1.3; L.setLineDash([5, 3]); L.stroke(pth); L.setLineDash([]);
    }
    L.globalAlpha = 1;
    // land ice, feathered at its edge
    for (const [south, r] of [[true, I.s], [false, I.n]]) {
      if (r < 0.5) continue;
      if (mode === 'flat' && r < 89) {
        const sg = south ? -1 : 1, y0 = latY(sg * (90 - Math.min(89.9, r + 6))), y1 = latY(sg * (90 - r)), y2 = latY(sg * 89.9);
        const g = L.createLinearGradient(0, y0, 0, y2), k = Math.min(0.98, Math.abs((y1 - y0) / ((y2 - y0) || 1)));
        g.addColorStop(0, 'rgba(243,248,251,0)'); g.addColorStop(k, 'rgba(243,248,251,0.95)'); g.addColorStop(1, 'rgba(243,248,251,0.97)');
        L.fillStyle = g; L.fillRect(0, Math.min(y0, y2), W, Math.abs(y2 - y0) + 2);
      } else {
        L.fillStyle = '#f3f8fb';
        L.globalAlpha = 0.4; L.fill(capPath(south, r + 6)); L.fill(capPath(south, r + 3));
        L.globalAlpha = 0.95; L.fill(capPath(south, r));
        L.globalAlpha = 1;
      }
    }

    // ── soft effects, built at quarter size (cheap) ──
    const qw = q[0].width, qh = q[0].height;
    const Q = i => { const x = qc[i]; x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, qw, qh); return x; };
    const ring = (x, src, r, a) => { x.globalAlpha = a; for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4 + 0.39; x.drawImage(src, Math.cos(an) * r, Math.sin(an) * r); } x.globalAlpha = 1; };
    const k4 = dpr / QS * 2;                       // effect radii scale with pixel density
    if (!lite) {
    let x = Q(0); x.imageSmoothingQuality = 'low'; x.drawImage(land, 0, 0, qw, qh);            // q0: land silhouette
    x = Q(1); x.fillStyle = '#54300e'; x.fillRect(0, 0, qw, qh);
    x.globalCompositeOperation = 'destination-out'; x.drawImage(q[0], 0, 0);                   // q1: everything but land
    x = Q(2); ring(x, q[1], 0.8 * k4, 0.13); ring(x, q[1], 1.9 * k4, 0.06);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(q[0], 0, 0);                    // q2: inner coastal wash
    x = Q(1); x.drawImage(q[0], 0, 0); x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#e2f6f2'; x.fillRect(0, 0, qw, qh);                                         // q1: pale silhouette
    x = Q(3); ring(x, q[1], 1.1 * k4, 0.12); ring(x, q[1], 2.6 * k4, 0.07);                    // q3: shelf glow
    }

    // shelf glow → ink coastline → land → coastal wash
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = true;
    if (!lite) c.drawImage(q[3], 0, 0, land.width, land.height);
    if (motion && trail && trailLife > 0) { c.save(); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clip(sphere); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 0.7; c.drawImage(trail, 0, 0); c.restore(); }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Plate pieces overlap along their seams, so stroking every piece and
    // then laying the merged land on top leaves ink only on true coasts.
    const vInk = sea && sea.snap ? 0 : 1;
    if (vInk > 0) { c.globalAlpha = vInk; c.strokeStyle = 'rgba(52,30,10,0.95)'; c.lineWidth = det ? 2.2 : 2.6; c.lineJoin = 'round'; c.stroke(det ? det.ink : lp); c.globalAlpha = 1; }
    if (sea && sea.snap) {                         // the coast is the edge of the land as drawn: a dark rim, a little wider than it
      if (!inkCv) { inkCv = document.createElement('canvas'); ictx = inkCv.getContext('2d'); }
      if (inkCv.width !== land.width || inkCv.height !== land.height) { inkCv.width = land.width; inkCv.height = land.height; }
      ictx.setTransform(1, 0, 0, 1, 0, 0); ictx.globalAlpha = 1; ictx.globalCompositeOperation = 'copy'; ictx.drawImage(land, 0, 0);
      ictx.globalCompositeOperation = 'source-in'; ictx.fillStyle = 'rgb(52,30,10)'; ictx.fillRect(0, 0, inkCv.width, inkCv.height);
      ictx.globalCompositeOperation = 'source-over';
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 0.6;
      const r = 1.3 * dpr;
      for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) c.drawImage(inkCv, dx * r * 0.8, dy * r * 0.8);
      c.globalAlpha = 1; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (guide) {                                   // today's coast, dotted, where the sea now covers it (the land drawn next hides the rest)
      const ix = ictx, w = inkCv.width, h = inkCv.height, d = Math.max(1, Math.round(dpr));
      ix.setTransform(1, 0, 0, 1, 0, 0); ix.globalAlpha = 1; ix.globalCompositeOperation = 'source-over'; ix.clearRect(0, 0, w, h);
      for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) ix.drawImage(todayCv, dx, dy);
      ix.globalCompositeOperation = 'destination-out'; ix.drawImage(todayCv, 0, 0);
      if (!dotPat) { const pc = document.createElement('canvas'); pc.width = pc.height = 4 * d; const px = pc.getContext('2d'); px.fillStyle = '#2c1c0c'; px.fillRect(0, 0, 2 * d, 2 * d); px.fillRect(2 * d, 2 * d, 2 * d, 2 * d); dotPat = ix.createPattern(pc, 'repeat'); }
      ix.globalCompositeOperation = 'source-in'; ix.fillStyle = dotPat; ix.fillRect(0, 0, w, h); ix.globalCompositeOperation = 'source-over';
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 0.5 * guide; c.drawImage(inkCv, 0, 0); c.globalAlpha = 1; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(land, 0, 0);
    if (!lite) c.drawImage(q[2], 0, 0, land.width, land.height);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    // the ice sheets, from the published reconstructions (iceAt above)
    for (const it of iceNow) {
      if (iceOff && it.s !== ICE_PM[0]) continue;           // a story draws its own ice; Greenland stays
      const p = iceP[it.s.i] || (iceP[it.s.i] = geoP(it.s.geo));
      c.globalAlpha = 0.85 * it.w; c.fillStyle = '#f3f8fb'; c.fill(p);
      c.globalAlpha = 0.7 * it.w; c.strokeStyle = 'rgba(110,145,180,0.9)'; c.lineWidth = 0.9; c.setLineDash(it.stand ? [1.5, 3.5] : [3, 3]); c.stroke(p); c.setLineDash([]);
    }
    c.globalAlpha = 1;
    if (projGeoid && !lite) drawGeoid(c);   // the colours follow when the hand lets go
    c.restore();                                   // un-clip from the sphere

    // globe shading and rim
    if (mode === 'globe') {
      const sg = c.createRadialGradient(cx - rad * 0.35, cy - rad * 0.4, rad * 0.1, cx, cy, rad);
      sg.addColorStop(0, 'rgba(255,250,235,0.20)'); sg.addColorStop(0.6, 'rgba(255,250,235,0)'); sg.addColorStop(1, 'rgba(30,18,6,0.42)');
      c.fillStyle = sg; c.fill(sphere);
    }
    if (mode === 'globe' && oc) {                     // the air round the planet, lit from the same side
      const ag = c.createRadialGradient(cx - rad * 0.05, cy - rad * 0.06, rad * 0.985, cx, cy, rad * 1.075);
      ag.addColorStop(0, bd().dark ? 'rgba(150,200,255,0.55)' : 'rgba(150,190,225,0.42)'); ag.addColorStop(1, 'rgba(150,190,225,0)');
      c.save(); c.beginPath(); c.arc(cx, cy, rad * 1.075, 0, 7); c.arc(cx, cy, rad * 0.99, 0, 7, true); c.fillStyle = ag; c.fill('evenodd'); c.restore();
    }
    c.lineWidth = 1.6; c.strokeStyle = bd().rim; c.stroke(sphere);

    curSea = sea;
    drawOverlays(c, t, lp);

    // one sheet of grain over everything
    if (grain && bd().grain) { c.globalAlpha = bd().grain; c.fillStyle = grain; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
    lastMs = performance.now() - t0;
    // keep this frame, and the view it was drawn in, for quick moves
    if (!snapCv) snapCv = document.createElement('canvas');
    if (snapCv.width !== canvas.width || snapCv.height !== canvas.height) { snapCv.width = canvas.width; snapCv.height = canvas.height; }
    const sx = snapCv.getContext('2d'); sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalAlpha = 1; sx.globalCompositeOperation = 'copy'; sx.drawImage(canvas, 0, 0);
    snap = { mode, scale: proj.scale(), tx: proj.translate()[0], ty: proj.translate()[1], lon: centerLon, zoom }; viewDirty = false;
    drawFx();
    if (api.onDraw) api.onDraw();
  }
  function drawQuick() {
    viewDirty = false;
    const k = proj.scale() / snap.scale, [tx, ty] = proj.translate(), c = ctx;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.drawImage(sheet, 0, 0);                                       // paper behind whatever the old frame does not cover
    const dl = ((centerLon - snap.lon + 540) % 360) - 180;
    if (Math.abs(dl) > 1e-6 && Math.abs(k - 1) < 1e-6) {
      // the world turned on its axis (the flat map at full size): each row of latitude slides by its own amount and
      // wraps round at the edge of the map, so the picture follows the hand exactly until the proper redraw
      const top = proj([centerLon, 89.9])[1], bot = proj([centerLon, -89.9])[1], step = 3, cv = snapCv.width;
      for (let y = top; y < bot; y += step) {
        const la = proj.invert([proj([centerLon, 0])[0], y + step / 2]); if (!la) continue;
        const xc = proj([centerLon, la[1]])[0], hw = proj([centerLon + 179.999, la[1]])[0] - xc; if (!(hw > 0)) continue;
        const sh = -dl / 180 * hw, Y = Math.floor(y * dpr), Hh = Math.ceil(step * dpr) + 1, a = xc - hw + 1.5, b = xc + hw - 1.5;
        for (const o of [0, -2 * (hw - 1.5), 2 * (hw - 1.5)]) {       // each copy only where its source lies inside the map
          const off = sh + o, d0 = Math.max(a, a + off), d1 = Math.min(b, b + off); if (d1 <= d0) continue;
          const X0 = Math.round(d0 * dpr), X1 = Math.round(d1 * dpr), S0 = Math.round((d0 - off) * dpr);
          if (X1 > X0 && S0 >= 0 && S0 + (X1 - X0) <= cv) c.drawImage(snapCv, S0, Y, X1 - X0, Hh, X0, Y, X1 - X0, Hh);
        }
      }
    } else {
      c.setTransform(k, 0, 0, k, dpr * (tx - snap.tx * k), dpr * (ty - snap.ty * k));
      c.imageSmoothingEnabled = true; c.drawImage(snapCv, 0, 0);
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    hits = []; rings = []; faunaAt = []; faunaHits = []; plantsAt = [];   // positions are stale until the proper redraw
    finQuick = true; try { drawFx(); } finally { finQuick = false; }
  }

  // ── labels and markers ─────────────────────────────────────────────
  const FONT = "'Cinzel','Georgia','Book Antiqua',serif";
  const EMOJI = "system-ui,'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  /* split words into lines no wider than maxW at this size; a ' · ' always starts a new line when wrapping is needed */
  function wrapText(c, s, size, o, maxW) {
    c.font = `${o.italic ? 'italic ' : ''}${o.weight || 700} ${size}px ${o.font || FONT}`;
    try { c.letterSpacing = (o.spacing ?? 1.4) + 'px'; } catch (e) {}
    const w = x => c.measureText(x).width, out = [];
    if (w(s) <= maxW) out.push(s);
    else for (const part of s.split(' · ')) {
      const greedy = mw => { const ls = []; let line = '';
        for (const word of part.split(' ')) { const tryL = line ? line + ' ' + word : word; if (line && w(tryL) > mw) { ls.push(line); line = word; } else line = tryL; }
        if (line) ls.push(line); return ls; };
      // as even as possible: the narrowest width that still needs no more lines than the full width does
      const k = greedy(maxW).length; let lo = maxW / 2, hi = maxW;
      for (let i = 0; i < 8; i++) { const mid = (lo + hi) / 2; if (greedy(mid).length <= k) hi = mid; else lo = mid; }
      out.push(...greedy(hi));
    }
    try { c.letterSpacing = '0px'; } catch (e) {}
    return out;
  }
  let bannerLines = 0;
  /* the key to the gravity shape, and the names of its deepest low and highest high */
  function geoidLegend(c) {
    const narrow = W < 600, w = narrow ? Math.min(170, W * 0.46) : Math.min(230, W * 0.5), x0 = narrow ? 12 : W / 2 - w / 2, y = narrow ? 50 : 16;
    const mid = x0 + w / 2, fs = narrow ? 9.5 : 11;
    if (!projGeoid) { text(c, 'The gravity shape is shown for today only', narrow ? x0 : W / 2, y + 6, fs, { italic: true, weight: 400, spacing: 0.3, align: narrow ? 'left' : 'center' }); boxes.push([narrow ? x0 : W / 2 - w / 2, y - 4, w, 20]); return; }
    c.fillStyle = 'rgba(246,231,190,0.86)'; c.strokeStyle = 'rgba(46,21,6,0.35)'; c.lineWidth = 0.8; c.beginPath(); c.roundRect ? c.roundRect(x0 - 8, y - 7, w + 16, 46, 5) : c.rect(x0 - 8, y - 7, w + 16, 46); c.fill(); c.stroke();
    const nx = Math.round(geoX).toLocaleString('en');
    text(c, geoX <= 1 ? (narrow ? 'Gravity shape · real size' : 'Today’s gravity shape · at real size') : narrow ? 'Gravity shape · bumps ×' + nx : 'Today’s gravity shape · bumps ' + nx + '× taller', mid, y + 4, fs, { spacing: 0.4 });
    const g = c.createLinearGradient(x0, 0, x0 + w, 0);
    GEO_RAMP.forEach(([n, col]) => g.addColorStop((n + 107) / 193, 'rgb(' + col.join(',') + ')'));
    c.fillStyle = g; c.fillRect(x0, y + 14, w, 7); c.strokeStyle = 'rgba(46,21,6,0.5)'; c.lineWidth = 0.8; c.strokeRect(x0, y + 14, w, 7);
    text(c, Math.round(-GEOID.peak[0]) + ' m lower', x0, y + 31, 9.5, { align: 'left', weight: 600, spacing: 0.2 });
    text(c, Math.round(GEOID.peak[1]) + ' m higher', x0 + w, y + 31, 9.5, { align: 'right', weight: 600, spacing: 0.2 });
    boxes.push([x0 - 4, y - 6, w + 8, 46]);
    for (const [ll, name] of [[GEOID.low, 'the deepest low'], [GEOID.high, 'the highest high']]) {
      const p = project([ll[0], ll[1]]); if (!p) continue;
      c.beginPath(); c.arc(p[0], p[1], 3.5, 0, 7); c.fillStyle = '#2e1506'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#f6e7be'; c.stroke();
      const tw = name.length * 6.6, bx = [p[0] - tw / 2, p[1] + 6, tw, 15];
      if (!free(boxes, ...bx)) continue;
      text(c, name, p[0], p[1] + 13, 11, { spacing: 0.3 }); boxes.push(bx);
    }
  }
  function text(c, s, x, y, size, o = {}) {
    c.font = `${o.italic ? 'italic ' : ''}${o.weight || 700} ${size}px ${o.font || FONT}`;
    c.textAlign = o.align || 'center'; c.textBaseline = 'middle';
    try { c.letterSpacing = (o.spacing ?? 1.4) + 'px'; } catch (e) {}
    c.lineJoin = 'round';
    if (o.halo !== false) { c.lineWidth = o.haloW || 3.2; c.strokeStyle = o.halo || 'rgba(246,231,190,0.88)'; c.strokeText(s, x, y); }
    c.fillStyle = o.color || '#2e1506'; c.fillText(s, x, y);
    try { c.letterSpacing = '0px'; } catch (e) {}
  }
  const boxes = [], mboxes = [];
  const free = (bs, x, y, w, h) => { for (const b of bs) if (x < b[0] + b[2] && x + w > b[0] && y < b[1] + b[3] && y + h > b[1]) return false; return true; };
  let curLand = null;
  let curSea = null;
  /* is the land drawn here? In deep time that is today's land the sea maps leave, or the maps' own land */
  function onLand(x, y) {
    if (!curLand) return false;
    const X = x * dpr, Y = y * dpr;
    if (curSea && curSea.snap) return ctx.isPointInPath(curSea.L, X, Y) || (ctx.isPointInPath(curLand, X, Y) && !ctx.isPointInPath(curSea.M, X, Y));
    return ctx.isPointInPath(curLand, X, Y);
  }
  const onShelf = (x, y) => !!(curSea && curSea.snap && ctx.isPointInPath(curSea.M, x * dpr, y * dpr));
  function inView(x, y, m = 4) { return x > m && y > m && x < W - m && y < H - m; }
  function project(lonlat) {
    if (!lonlat) return null;
    if (mode === 'globe') {
      const r = proj.rotate();
      if (d3.geoDistance(lonlat, [-r[0], -r[1]]) > Math.PI / 2 - 0.02) return null;
    }
    return proj(lonlat);
  }

  function drawOverlays(c, t, lp) {
    boxes.length = 0; mboxes.length = 0; hits = []; rings = []; curLand = lp; placeFauna(t); plantsAt = [];
    const zs = Math.min(1.5, 0.82 + zoom * 0.18) * Math.max(0.72, Math.min(1.15, W / 900));
    const label = (s, p, size, o, bs = boxes) => {
      const w = s.length * size * (o.wk || 0.74) + 8, h = size * 1.3;
      const x = o.align === 'left' ? p[0] : p[0] - w / 2;
      if (!free(bs, x, p[1] - h / 2, w, h)) return false;
      bs.push([x, p[1] - h / 2, w, h]); text(c, s, p[0], p[1], size, o); return true;
    };
    // before the oldest plate map: say plainly that there is no map of the land
    if (geoidOn && mode === 'globe') geoidLegend(c);
    bannerLines = 0;
    if (t > MAXT && layers.banner) {
      // two lines of words, each wrapped to the width left between the map's buttons
      const [a, b] = layers.banner, maxW = W - 2 * Math.min(72, W * 0.17);
      const s1 = Math.min(22, Math.max(14, W / 26)), s2 = Math.min(13, Math.max(10.5, W / 46));
      const o1 = { spacing: 1.2, color: '#2a1608', haloW: 4 }, o2 = { italic: true, weight: 400, spacing: 0.3, color: '#2a1608', haloW: 3.4 };
      const L1 = wrapText(c, a, s1, o1, maxW), L2 = b ? wrapText(c, b, s2, o2, maxW) : [];
      const h1 = s1 * 1.25, h2 = s2 * 1.45, gap = L2.length ? s2 * 0.7 : 0, tall = L1.length * h1 + gap + L2.length * h2;
      let y = H / 2 - tall / 2;
      L1.forEach(l => { text(c, l, W / 2, y + h1 / 2, s1, o1); y += h1; });
      y += gap;
      L2.forEach(l => { text(c, l, W / 2, y + h2 / 2, s2, o2); y += h2; });
      bannerLines = L1.length + L2.length;
      boxes.push([W / 2 - maxW / 2, H / 2 - tall / 2 - 6, maxW, tall + 12]);
    }
    // continents ride their plates
    for (const L of layers.labels) {
      if (t > L.from || t < L.to) continue;
      const p = project(locate(L.at, t)); if (!p || !inView(p[0], p[1], 10)) continue;
      if (curSea && curSea.snap && !onLand(p[0], p[1]) && !onShelf(p[0], p[1])) continue;   // a continent's name never floats on open ocean
      const size = (L.size || 13) * zs;
      c.globalAlpha = Math.max(0.3, Math.min(1, Math.min(L.from - t, t - L.to) / 5 + 0.3));
      label(L.text.toUpperCase(), p, size, { spacing: size * 0.14 });
      c.globalAlpha = 1;
    }
    // oceans sit between the plates that define them
    const sea = { italic: true, weight: 400, color: '#16304f', halo: 'rgba(214,236,238,0.55)', haloW: 2.6, wk: 0.72 };
    for (const O of layers.oceans) {
      if (t > O.from || t < O.to) continue;
      const a = locate(O.a, t), b2 = locate(O.b, t); if (!a || !b2) continue;
      if (d3.geoDistance(a, b2) * R2D < (O.min || 14)) continue;
      const p = project(d3.geoInterpolate(a, b2)(O.k ?? 0.5)); if (!p || !inView(p[0], p[1], 12)) continue;
      if (onLand(p[0], p[1])) continue;
      const size = (O.size || 11.5) * zs;
      label(O.text, p, size, Object.assign({ spacing: size * 0.16 }, sea));
    }
    for (const [name, from, to] of layers.superocean) {
      if (t > from || t <= to) continue;
      const p = project(widestOcean(t)); if (!p || !inView(p[0], p[1], 20) || onLand(p[0], p[1])) continue;
      const size = 14 * zs;
      label(name, p, size, Object.assign({ spacing: size * 0.2 }, sea));
    }
    // notes: things today's coastline cannot show (Ice Age land bridges)
    for (const N of layers.notes) {
      if (t > N.from || t < N.to || seaLevel(t) > -(N.drop || 40) || (N.zoom && zoom < N.zoom)) continue;
      const p = project([N.lon, N.lat]); if (!p || !inView(p[0], p[1], 10)) continue;
      const size = 9.5 * zs;
      c.beginPath(); c.arc(p[0], p[1], 2.2, 0, 7); c.fillStyle = 'rgba(40,70,60,0.85)'; c.fill();
      label(N.text, [p[0] + 6, p[1]], size, { align: 'left', italic: true, weight: 400, color: '#1f3d33', spacing: 0.4, haloW: 3, wk: 0.6 });
    }
    // routes: a dashed line from where something began to where it had reached by now
    for (const R of layers.routes) {
      if (t > R.from || (R.to != null && t < R.to)) continue;
      const a = locate(R.a, t), b = locate(R.b, t); if (!a || !b) continue;
      const it = d3.geoInterpolate(a, b);
      c.save(); c.setLineDash(R.dash || [6, 4]); c.lineWidth = (R.width || 1.7) * (R.key && R.key === selected ? 1.7 : 1); c.lineCap = 'round'; c.strokeStyle = R.color || 'rgba(120,40,20,0.85)';
      c.stroke(geoP({ type: 'LineString', coordinates: Array.from({ length: 25 }, (_, i) => it(i / 24)) })); c.restore();
    }
    const sparkLabels = [];
    // great eruptions and impacts: always named, so a glow is never a mystery (the animated glow is on the fx layer)
    for (const sp of layers.sparks) {
      if (t > sp.from || t < sp.to) continue;
      const p = project(locate(sp.at, t)); if (!p || !inView(p[0], p[1], 10)) continue;
      const imp = sp.kind === 'impact', sz = 10.5 * zs;
      const ly = p[1] + (sp.r || 26) * zs * 0.55 + 9, bw = Math.max(sp.name.length * sz * 0.58, 100) + 12;
      sparkLabels.push([sp, p, ly, sz, imp]);
      boxes.push([p[0] - bw / 2, ly - sz, bw, sz * 2.7]); mboxes.push([p[0] - bw / 2, p[1] - 16 * zs, bw, ly - p[1] + 16 * zs + sz * 2]);   // animals make room for it
      hits.push({ x: p[0], y: p[1], r: 16 * zs, spark: sp });
    }
    // places: famous fossil sites and geological features
    for (const P of layers.places) {
      const p = project(locate(P.at, t)); if (!p || !inView(p[0], p[1], 6)) continue;
      const r = 4.2 * zs;
      if (P.icon) {
        glyph(c, P.icon, p[0], p[1], 15 * zs);
      } else {
        c.save(); c.translate(p[0], p[1]); c.rotate(Math.PI / 4);
        c.fillStyle = P.key === selected ? '#d8421a' : '#8a2b12'; c.strokeStyle = 'rgba(250,236,200,0.95)'; c.lineWidth = 1.2;
        c.fillRect(-r, -r, r * 2, r * 2); c.strokeRect(-r, -r, r * 2, r * 2); c.restore();
      }
      hits.push({ x: p[0], y: p[1], r: r + 7, place: P });
      if (P.key === selected) rings.push([p[0], p[1], r + 5]);
      const size = 10.5 * zs;
      if (P.key === selected || zoom >= 1.7 || layers.places.length <= 12 || P.label)   // a crowded map names only what is picked, until you zoom in
      label(P.name, [p[0] + (P.icon ? 11 : r + 5) * 1, p[1]], size, { align: 'left', spacing: 0.3, weight: P.key === selected ? 700 : 400, haloW: 3, wk: 0.62 });
    }
    // creatures: one medallion each at a fossil site; the selected one shows
    // every site. Crowded localities fan out around the spot they share.
    const R0 = 12 * zs;
    const place = (p, r) => {
      const tries = [[0, 0]];
      for (let i = 0; i < 6; i++) tries.push([Math.cos(i * Math.PI / 3) * 2.15 * r, Math.sin(i * Math.PI / 3) * 2.15 * r]);
      for (let i = 0; i < 12; i++) tries.push([Math.cos(i * Math.PI / 6 + 0.26) * 4.3 * r, Math.sin(i * Math.PI / 6 + 0.26) * 4.3 * r]);
      for (const [dx, dy] of tries) {
        const x = p[0] + dx, y = p[1] + dy;
        if (inView(x, y, r) && free(mboxes, x - r, y - r, r * 2, r * 2)) { mboxes.push([x - r, y - r, r * 2, r * 2]); return [x, y]; }
      }
      return null;
    };
    const nowMs = performance.now(), crowd = {};
    const medal = (m, at, strong) => {
      const p = project(locate(at, t)); if (!p || !inView(p[0], p[1], -16)) return;
      const r = (strong ? 1.2 : 1) * R0;
      const q_ = strong ? (mboxes.push([p[0] - r, p[1] - r, r * 2, r * 2]), p) : place(p, r);
      if (!q_) { const ck = Math.round(p[0] / (R0 * 5)) + ',' + Math.round(p[1] / (R0 * 5)), cr = crowd[ck] || (crowd[ck] = { x: p[0], y: p[1], n: 0 }); cr.n++; return; }   // no room: counted, and shown as "+N"
      const age = motion && born[m.key] ? (nowMs - born[m.key]) / 420 : 1, grow = age >= 1 ? 1 : 1 - Math.pow(1 - Math.max(0, age), 3);
      if (grow < 1) { c.save(); c.globalAlpha = grow; c.translate(q_[0], q_[1] + (1 - grow) * 9); c.scale(0.6 + 0.4 * grow, 0.6 + 0.4 * grow); c.translate(-q_[0], -q_[1]); }
      if (m.dim && !strong) { c.save(); c.globalAlpha *= 0.55; }      // a relative that is not alive at this moment
      const pic = m.pic ? m.pic() : null;    // a silhouette from the app, once it has loaded; the emoji until then
      lastAt[m.key] = [q_[0], q_[1], r, m.emoji, !!pic, pic, m.mark];
      if (q_ !== p && (q_[0] !== p[0] || q_[1] !== p[1])) {
        c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q_[0], q_[1]); c.strokeStyle = 'rgba(60,34,10,0.7)'; c.lineWidth = 1; c.stroke();
        c.beginPath(); c.arc(p[0], p[1], 2, 0, 7); c.fillStyle = 'rgba(60,34,10,0.9)'; c.fill();
      }
      c.beginPath(); c.arc(q_[0], q_[1], r, 0, 7);
      c.fillStyle = strong ? 'rgba(255,246,216,0.98)' : 'rgba(247,233,196,0.92)'; c.fill();
      c.lineWidth = strong ? 2 : 1; c.strokeStyle = strong ? 'rgba(190,60,20,0.95)' : 'rgba(70,40,12,0.8)'; c.stroke();
      if (pic) {                                // fitted so its corners stay inside the disc: long shapes use the full width
        const a = pic.width / pic.height, h = 1.74 * r / Math.sqrt(a * a + 1), w = a * h;
        c.drawImage(pic, q_[0] - w / 2, q_[1] - h / 2, w, h);
      } else if (m.mark) markText(c, m.mark, q_[0], q_[1], r);    // no picture: a lettered roundel, as on a printed map
      else glyph(c, m.emoji, q_[0], q_[1] + r * 0.08, r * 1.25);
      if (m.dim && !strong) c.restore();
      if (m.tag) text(c, m.tag, q_[0], q_[1] + r + 6 * zs, 8.5 * zs, { align: 'center', spacing: 0.2, weight: 700, haloW: 3, font: "system-ui,-apple-system,'Segoe UI',sans-serif" });
      if (grow < 1) c.restore();
      hits.push({ x: q_[0], y: q_[1], r: r + 3, marker: m });
      if (strong) rings.push([q_[0], q_[1], r]);
      return q_;
    };
    const sel = layers.markers.find(m => m.key === selected);
    if (sel) {
      for (const s of sel.sites) {
        const q_ = medal(sel, s.at, true); if (!q_) continue;
        const size = 11 * zs, w = s.label.length * size * 0.56 + 10, left = q_[0] > W - w - R0 * 2;
        text(c, s.label, q_[0] + (left ? -(R0 * 1.2 + 7) : R0 * 1.2 + 7), q_[1], size, { align: left ? 'right' : 'left', spacing: 0.3, weight: 700, haloW: 3.8, font: "system-ui,-apple-system,'Segoe UI',sans-serif" });
      }
    }
    const walking = faunaShow() >= 0.5 ? new Set(faunaAt.map(g => g.f.key)) : null;   // their animals stand in for these pins, named
    for (const m of layers.markers) { if (m === sel || (walking && walking.has(m.key))) continue; for (const s of m.sites) { if (medal(m, s.at, false)) break; } }
    // where animals would not fit: a badge with how many more are here — tap it to zoom in
    for (const k in crowd) {
      const cr = crowd[k], bx = cr.x + R0 * 0.2, by = cr.y - R0 * 1.5, br = 8.5 * zs, tx = '+' + cr.n;
      if (!inView(bx, by, br)) continue;
      c.beginPath(); c.arc(bx, by, br, 0, 7); c.fillStyle = 'rgba(52,30,10,0.92)'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = 'rgba(250,236,200,0.95)'; c.stroke();
      c.font = `700 ${Math.round(9 * zs)}px system-ui,-apple-system,'Segoe UI',sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fbeecb'; c.fillText(tx, bx, by + 0.5);
      hits.push({ x: bx, y: by, r: br + 4, more: cr });
    }
    for (const [sp, p, ly, sz, imp] of sparkLabels) {
      glyph(c, imp ? '☄️' : '🌋', p[0], p[1], 15 * zs);
      text(c, sp.name, p[0], ly, sz, { weight: 700, spacing: 0.4, haloW: 3.6, color: imp ? '#7a1e08' : '#5a1608', font: "system-ui,-apple-system,'Segoe UI',sans-serif" });
      text(c, imp ? 'asteroid impact' : 'volcanic eruptions', p[0], ly + sz * 1.15, sz * 0.82, { weight: 500, spacing: 0.4, haloW: 3, color: '#4a2a14', italic: true, font: "system-ui,-apple-system,'Segoe UI',sans-serif" });
    }
    placePlants(t);                                                // after the words and pins, so plants keep clear of them
    // animals that have just gone: a medallion fading and sinking where it stood
    if (ghosts.length) {
      ghosts = ghosts.filter(g => nowMs - g.t < 520);
      for (const g of ghosts) {
        const u = (nowMs - g.t) / 520;
        c.save(); c.globalAlpha = 0.85 * (1 - u) * (1 - u);
        c.beginPath(); c.arc(g.x, g.y + u * 7, g.r * (1 - 0.25 * u), 0, 7); c.fillStyle = 'rgba(214,200,170,0.9)'; c.fill(); c.lineWidth = 1; c.strokeStyle = 'rgba(70,40,12,0.6)'; c.stroke();
        const gy = g.y + u * 7;
        if (g.pic) { const a = g.pic.width / g.pic.height, h = 1.74 * g.r / Math.sqrt(a * a + 1); c.drawImage(g.pic, g.x - a * h / 2, gy - h / 2, a * h, h); }
        else if (g.mark) markText(c, g.mark, g.x, gy, g.r);
        else glyph(c, g.e, g.x, gy + g.r * 0.08, g.r * 1.25);
        c.restore();
      }
    }
    // a dropped pin: its whole journey as a dotted trail, today's spot, and where it is now
    const PN = layers.pin;
    if (PN) {
      let prev = null;
      c.save(); c.setLineDash([3, 3]); c.lineWidth = 1.6; c.strokeStyle = 'rgba(176,32,20,0.55)'; c.beginPath();
      for (const [tt, lo, la] of PN.trail) {
        const p = project([lo, la]);
        if (p && prev && Math.abs(p[0] - prev[0]) < W / 3) c.lineTo(p[0], p[1]); else if (p) c.moveTo(p[0], p[1]);
        prev = p;
      }
      c.stroke(); c.restore();
      const today = project(locate(PN.at, 0));
      if (today && t > 0.5) { c.beginPath(); c.arc(today[0], today[1], 4, 0, 7); c.lineWidth = 1.5; c.strokeStyle = '#b02014'; c.stroke(); text(c, 'today', today[0] + 7, today[1], 9 * zs, { align: 'left', weight: 400, spacing: 0.4, haloW: 2.6, color: '#7a1a10' }); }
      const p = project(locate(PN.at, t));
      if (p) {
        const r = 7 * zs;
        c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 4; c.shadowOffsetY = 1.5;
        c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0] - r * 0.78, p[1] - r * 1.55); c.arc(p[0], p[1] - r * 2, r, Math.PI * 0.82, Math.PI * 0.18, false); c.closePath();
        c.fillStyle = '#d0281a'; c.fill(); c.restore();
        c.beginPath(); c.arc(p[0], p[1] - r * 2, r * 0.38, 0, 7); c.fillStyle = '#fff4e0'; c.fill();
        text(c, PN.name, p[0], p[1] - r * 3.6, 11.5 * zs, { spacing: 0.5, weight: 700, haloW: 3.6, color: '#5a1008' });
        hits.push({ x: p[0], y: p[1] - r * 2, r: r + 3, pin: PN });
      }
    }
    // latitude ticks on the flat map
    if (mode === 'flat' && zoom < 1.3) {
      for (const la of [60, 30, 0, -30, -60]) {
        const p = proj([centerLon - 179.9, la]); if (!p) continue;
        text(c, la === 0 ? 'EQUATOR' : Math.abs(la) + '°' + (la > 0 ? 'N' : 'S'), p[0] + 6, p[1] - 6, 8.5 * zs, { align: 'left', weight: 400, color: 'rgba(40,40,60,0.75)', halo: false, spacing: 0.8 });
      }
    }
  }
  // the pulsing rings of the current selection live on their own small layer,
  // so they can animate without redrawing the whole map
  // A tile of soft, wavy strokes; two copies sliding past each other read as light moving on water.
  function makeSwell() {
    const n = 220, cv = document.createElement('canvas'); cv.width = cv.height = n;
    const x = cv.getContext('2d'); x.lineCap = 'round'; x.strokeStyle = 'rgba(255,255,255,0.9)';
    for (let i = 0; i < 9; i++) {                      // fixed strokes: the pattern is the same on every visit
      const y0 = (i + 0.5) * n / 9, amp = 5 + (i * 7 % 5), ph = i * 1.9, len = (0.35 + (i * 3 % 4) * 0.12) * n, x0 = (i * 83) % n;
      x.lineWidth = 1.1 + (i % 3) * 0.5;
      for (const off of [0, -n]) {                     // drawn twice so the tile wraps
        x.beginPath();
        for (let k = 0; k <= 40; k++) { const u = k / 40, px = x0 + off + u * len, py = y0 + Math.sin(u * Math.PI * 2 + ph) * amp * Math.sin(u * Math.PI); k ? x.lineTo(px, py) : x.moveTo(px, py); }
        x.stroke();
      }
    }
    return cv;
  }
  // ── life on the map: animals walking, swimming and flying round their fossil sites (data_mapfauna.js, creatures.js) ──
  // Shown only when zoomed in (FAUNA_Z), far larger than life, each group kept to its own ground: land animals on the land
  // of that time, swimmers in its sea (onLand, the same test the labels use), fliers and shore animals anywhere near.
  // Placed on every full redraw (never under a moving hand); walked in the decoration frames, by the clock alone.
  let faunaAt = [], faunaHits = [], faunaWhy = [];
  let lifeOn = false;                                  // off until the close-up is redrawn (Evan, 25 Nov: not good enough yet); setLifeUpClose(true) for work on it
  const FAUNA_Z = () => mode === 'flat' ? [3.5, 5] : [2.5, 3.5];
  const faunaShow = () => { const [a, b] = FAUNA_Z(); return Math.max(0, Math.min(1, (zoom - a) / (b - a))); };
  const faunaLen = f => Math.min(110, (9 + 5 * Math.log2(1 + (f.span || f.m))) * Math.max(0.9, Math.min(3, mode === 'flat' ? 0.7 + zoom * 0.15 : 0.6 + zoom * 0.3))) * (f.span ? 0.42 : 1);
  function placeFauna(t) {
    faunaAt = []; faunaHits = []; faunaWhy = [];
    if (!lifeOn || !layers.fauna.length || faunaShow() <= 0 || fxHook) return;
    // the biggest groups choose their ground first; fliers last, as they need none
    const order = layers.fauna.slice().sort((a, b) => (a.where === 'air') - (b.where === 'air') || b.n - a.n);
    for (const f of order) {
      const ll = locate(f.at, t), p = ll && project(ll); if (!p || !inView(p[0], p[1], -60)) { faunaWhy.push(f.name + ': off ' + JSON.stringify(p)); continue; }
      const L = faunaLen(f), k = f.where === 'air' ? 3.2 : f.where === 'sea' ? 2.2 : 1.5, maxD = 2.5 * L + 20;
      const good = (x, y) => f.where === 'land' ? onLand(x, y) : f.where === 'sea' ? !onLand(x, y) : true;
      const fits = (x, y, R) => { let n = good(x, y) ? 1 : 0; for (let i = 0; i < 8; i++) n += good(x + Math.cos(i * 0.785) * R, y + Math.sin(i * 0.785) * R) ? 1 : 0; return n; };
      // the same animal at a site close to one already drawn: one group stands for both
      if (faunaAt.some(g => g.f.name === f.name && Math.hypot(g.cx - p[0], g.cy - p[1]) < 4 * L)) continue;
      // a spot near the site (never more than a few body lengths away) that is all the right ground and clear of the
      // groups already there; where there is little room the group keeps to a smaller round, and a herd is drawn smaller
      let best = null;
      for (const sc of [1, 0.6, 0.35]) for (const nn of [...new Set([f.n, Math.ceil(f.n / 2), Math.ceil(f.n / 4)])]) {
        if (best) break;
        const amp = L * k * 0.6 * sc, R = amp + (nn > 1 ? 0.6 * L * Math.sqrt(nn) : 0) + 0.5 * L;
        for (let ring = 0; ring <= 3 && !best; ring++) for (let i = 0; i < (ring ? 8 : 1) && !best; i++) {
          const d = ring * 0.9 * R; if (d > maxD) continue;
          const a = i * 0.785 + f.seed * 6.28, x = p[0] + Math.cos(a) * d, y = p[1] + Math.sin(a) * d;
          if (f.where !== 'air' && faunaAt.some(g => g.f.where !== 'air' && Math.hypot(g.cx - x, g.cy - y) < (g.R + R) * 0.45)) continue;   // fliers claim no ground
          // and reached from the site over the same ground (a herd on the coast does not cross the sea to the next land)
          if (d > 0 && ![0.35, 0.55, 0.75].every(u => good(p[0] + (x - p[0]) * u, p[1] + (y - p[1]) * u))) continue;
          if (fits(x, y, R) >= 8) best = [x, y, R, amp, nn];
        }
      }
      if (!best) { faunaWhy.push(f.name + ': no room of the right ground near ' + p.map(Math.round)); continue; }   // left out, not moved away
      faunaAt.push({ f, cx: best[0], cy: best[1], L, R: best[2], amp: best[3], n: best[4] });
    }
  }
  function drawFauna(now) {
    faunaHits = [];
    const show = faunaShow(); if (!faunaAt.length || show <= 0) return;
    const sec = decoNow(now) / 1000;
    for (const g of faunaAt) {
      const f = g.f, L = g.L, sea = f.where === 'sea', air = f.where === 'air', rot = f.seed * 6.28;
      const w = air ? 0.16 : sea ? 0.12 : 0.07;                // how fast round the path, radians a second
      let mx = 0, my = 0, low = -1e9;
      for (let i = 0; i < g.n; i++) {
        // the path: a slow figure of eight (a loop for fliers), each member a little behind the one before; grazers dawdle
        const tau = rot * 3 + w * sec + (air || sea ? 0 : 0.35 * Math.sin(0.22 * sec + rot)) - i * 0.035;
        const ex = Math.cos(tau), ey = air ? Math.sin(tau) : 0.55 * Math.sin(2 * tau), dx = -Math.sin(tau), dy = air ? Math.cos(tau) : 1.1 * Math.cos(2 * tau);
        const cr = Math.cos(rot), sr = Math.sin(rot), hx = dx * cr - dy * sr, hy = dx * sr + dy * cr, h = Math.atan2(hy, hx);
        const o = i ? [0.6 * L * Math.sqrt(i) * Math.cos(i * 2.39996), 0.6 * L * Math.sqrt(i) * Math.sin(i * 2.39996)] : [0, 0];
        const x = g.cx + (ex * cr - ey * sr) * g.amp + o[0], y = g.cy + (ex * sr + ey * cr) * g.amp + o[1];
        const size = L * (1 - ((i * 7) % 5) * 0.04);            // not all the same size
        const phase = air ? sec * 0.9 + i * 0.31 : sea ? sec * 0.45 + f.seed * 3 : tau * g.amp / (0.55 * L) + i * 0.37;
        CREATURES.draw(fctx, f.plan, x, y, h, size, phase, { alpha: show, variant: f.variant, span: f.span ? f.span / f.m * 0.42 * 2.2 : undefined, alt: air ? 1.4 : undefined });
        faunaHits.push({ x, y, r: Math.max(12, size * 0.42), marker: { key: f.key, name: f.name }, fauna: f });
        mx += x / g.n; my += y / g.n; low = Math.max(low, y);
      }
      // its name, under the group's home ground, so nothing on the map goes unnamed
      const nm = f.n > 1 ? f.name + ' (' + (f.as || 'a group') + ')' : f.name;
      fctx.globalAlpha = show; fctx.font = `italic 600 ${Math.round(Math.max(10, Math.min(13, L * 0.3)))}px ${FONT}`; fctx.textAlign = 'center'; fctx.textBaseline = 'top';
      fctx.lineWidth = 3; fctx.strokeStyle = 'rgba(250,240,215,0.85)'; const ly = (air ? my : low) + L * (air ? 0.9 : 0.45); fctx.strokeText(nm, mx, ly); fctx.fillStyle = '#3a2410'; fctx.fillText(nm, mx, ly); fctx.globalAlpha = 1;
    }
  }
  // ── plants on the map, when zoomed in (Evan, 25 Nov: "the trees and the vegetation, when you zoom in, should be the
  // animated swaying in the wind versions … or the barren wasteland, you should be able to see that animated") ──
  // A sketch, and the page says so: the KINDS follow the broad first appearances (no land plants before about 470 Ma,
  // the first trees about 385, club-moss forests in the coal age, conifers and cycads, flowering trees after about 100,
  // grass only in the last 20 million years); how THICK they grow follows the climate belts of the map's land tint (wet
  // tropics, dry belts near 25°, temperate, cold) — illustrative, not measured. Bare land before plants gets wind ripples
  // and dark microbial mats. Placed on a grid tied to the ground (it does not slide as the map pans), kept off the ice
  // and clear of the map's words and pins; swayed by a gust that rolls across the map, by the clock alone.
  let plantsAt = [], plantSpr = {};
  const PLANT_INK = '#22301a';
  function plantSprite(kind) {
    if (plantSpr[kind]) return plantSpr[kind];
    const n = Math.round(40 * Math.min(2, dpr)), cv = document.createElement('canvas'); cv.width = cv.height = n;
    const x = cv.getContext('2d'), k = n / 40; x.scale(k, k); x.translate(20, 20); x.lineCap = 'round'; x.lineJoin = 'round';
    const shadow = (fn, dx = 2.2, dy = 3) => { x.save(); x.translate(dx, dy); x.globalAlpha = 0.25; fn('#1a140a'); x.restore(); };
    const star = (r, m, inner, col) => { x.fillStyle = col; x.beginPath(); for (let i = 0; i <= m * 2; i++) { const a = i * Math.PI / m - Math.PI / 2, rr = i % 2 ? inner : r; i ? x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : x.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.fill(); };
    const fronds = (r, m, col, w = 1.3) => { x.strokeStyle = col; x.lineWidth = w; for (let i = 0; i < m; i++) { const a = i * 2 * Math.PI / m + 0.3; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(Math.cos(a + 0.25) * r * 0.6, Math.sin(a + 0.25) * r * 0.6, Math.cos(a) * r, Math.sin(a) * r); x.stroke();
      for (let j = 1; j < 4; j++) { const u = j / 4, px = Math.cos(a) * r * u, py = Math.sin(a) * r * u; x.lineWidth = w * 0.6; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a + 0.9) * r * 0.22, py + Math.sin(a + 0.9) * r * 0.22); x.moveTo(px, py); x.lineTo(px + Math.cos(a - 0.9) * r * 0.22, py + Math.sin(a - 0.9) * r * 0.22); x.stroke(); x.lineWidth = w; } } };
    const blobs = (r, col, light) => { for (const [dx, dy, rr] of [[-3, -2, .62], [3, -2.5, .58], [-2, 3, .6], [3.5, 2.5, .55], [0, 0, .7]]) { x.fillStyle = col; x.beginPath(); x.arc(dx * r / 9, dy * r / 9, r * rr, 0, 7); x.fill(); }
      x.fillStyle = light; x.globalAlpha = 0.5; x.beginPath(); x.arc(-r * 0.3, -r * 0.3, r * 0.35, 0, 7); x.fill(); x.globalAlpha = 1; };
    switch (kind) {
      case 'conifer': shadow(c => star(9, 8, 4.5, c), 4, 5); star(9, 8, 4.5, '#2c4a2a'); star(5, 8, 2.5, '#3f6236'); break;
      case 'archaeopteris': shadow(c => star(9, 7, 5.5, c), 4, 5); star(9, 7, 5.5, '#3a5a30'); fronds(7, 7, '#5a7a3e', 1); break;
      case 'lycopsid': x.save(); x.globalAlpha = 0.28; x.strokeStyle = '#1a140a'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(1, 1); x.lineTo(11, 15); x.stroke(); x.restore();   // a tall bare trunk: its long shadow
        star(6, 6, 3, '#2f4a26'); fronds(6, 6, '#4b6a34', 1.1); break;
      case 'horsetail': for (const [dx, dy] of [[-4, -2], [3, -3], [0, 3], [5, 3]]) { x.save(); x.translate(dx, dy); star(3, 8, 1, '#4c6a3a'); x.restore(); } break;
      case 'cycad': shadow(c => fronds(8, 9, c, 1.5)); fronds(8, 9, '#3e5f2e', 1.5); x.fillStyle = '#6a5030'; x.beginPath(); x.arc(0, 0, 1.6, 0, 7); x.fill(); break;
      case 'fern': fronds(7, 6, '#5d8a43', 1.2); break;
      case 'broadleaf': shadow(c => blobs(9, c, c), 3, 4); blobs(9, '#3f6a33', '#7da35a'); break;
      case 'palm': shadow(c => fronds(10, 7, c, 1.8), 4, 5); fronds(10, 7, '#4a7034', 1.8); break;
      case 'grass': x.strokeStyle = '#9a9a4a'; x.lineWidth = 1; for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.22; x.beginPath(); x.moveTo((i - 4) * 0.8, 4); x.lineTo((i - 4) * 0.8 + Math.cos(a) * 7, 4 + Math.sin(a) * 7); x.stroke(); } break;
      case 'scrub': blobs(4.5, '#7a7a52', '#a3a274'); break;
      case 'moss': for (const [dx, dy, r] of [[-5, -1, 3], [1, -3, 2.6], [4, 2, 3.2], [-2, 4, 2.4]]) { x.fillStyle = '#6a7240'; x.globalAlpha = 0.85; x.beginPath(); x.arc(dx, dy, r, 0, 7); x.fill(); } x.globalAlpha = 1; break;
      case 'mat': x.fillStyle = '#4e4636'; x.globalAlpha = 0.45; for (const [dx, dy, r] of [[-4, 0, 5], [3, -2, 4], [2, 4, 3.5]]) { x.beginPath(); x.ellipse(dx, dy, r * 1.3, r * 0.8, 0.4, 0, 7); x.fill(); } x.globalAlpha = 1; break;
      case 'ripple': x.strokeStyle = 'rgba(120,90,50,0.55)'; x.lineWidth = 0.9; for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(-10, i * 4); x.quadraticCurveTo(0, i * 4 - 2.4, 10, i * 4); x.stroke(); } break;
      case 'dune': x.strokeStyle = 'rgba(150,110,60,0.6)'; x.lineWidth = 1.3; x.beginPath(); x.moveTo(-12, 3); x.quadraticCurveTo(-2, -6, 12, 2); x.stroke(); x.strokeStyle = 'rgba(255,240,200,0.5)'; x.beginPath(); x.moveTo(-11, 4.5); x.quadraticCurveTo(-1, -4.2, 11, 3.5); x.stroke(); break;
    }
    return plantSpr[kind] = cv;
  }
  // how wet each belt of latitude is, in the same sketch as the land tint: wet tropics, dry near 25°, temperate, cold
  const wetAt = lat => { const a = Math.abs(lat); return a < 10 ? 1 : a < 17 ? 0.75 : a < 33 ? 0.2 : a < 52 ? 0.75 : a < 66 ? 0.55 : 0.2; };
  function plantKind(t, lat, h) {
    const w = wetAt(lat), cold = Math.abs(lat) > 58, dry = w < 0.3;
    if (t > 717 && t < 1800 || t > 470) return t >= 635 && t <= 717 ? null : h < 0.8 ? 'ripple' : 'mat';      // bare land (none on the Snowball's ice)
    if (t > 390) return w > 0.5 && h < 0.75 ? 'moss' : h < 0.35 ? 'ripple' : null;
    if (t > 359) return dry ? (h < 0.4 ? 'ripple' : null) : h < 0.55 ? 'archaeopteris' : h < 0.8 ? 'fern' : 'moss';
    if (t > 299) return dry ? (h < 0.3 ? 'dune' : h < 0.45 ? 'conifer' : null) : h < 0.5 ? 'lycopsid' : h < 0.72 ? 'horsetail' : 'fern';
    if (t > 100) return dry ? (h < 0.35 ? 'dune' : h < 0.6 ? 'scrub' : null) : h < 0.45 ? 'conifer' : h < 0.68 ? 'cycad' : 'fern';
    if (t > 66) return dry ? (h < 0.35 ? 'dune' : h < 0.6 ? 'scrub' : null) : h < 0.35 ? 'conifer' : h < 0.55 ? 'broadleaf' : h < 0.7 ? 'cycad' : 'fern';
    if (t > 20) return dry ? (h < 0.35 ? 'dune' : h < 0.65 ? 'scrub' : null) : cold ? (h < 0.7 ? 'conifer' : 'fern') : Math.abs(lat) < 20 && h < 0.3 ? 'palm' : h < 0.7 ? 'broadleaf' : 'conifer';
    if (t < 3 && seaLevel(t) < -60) return Math.abs(lat) > 40 ? (h < 0.8 ? 'grass' : 'conifer') : dry ? (h < 0.3 ? 'dune' : h < 0.7 ? 'grass' : 'scrub') : h < 0.45 ? 'grass' : 'broadleaf';   // an ice age: cold, dry steppe
    if (cold) return Math.abs(lat) > 68 ? (h < 0.4 ? 'grass' : null) : h < 0.75 ? 'conifer' : 'grass';
    return dry ? (h < 0.25 ? 'dune' : h < 0.6 ? 'scrub' : 'grass') : w < 0.8 ? (h < 0.5 ? 'grass' : h < 0.8 ? 'broadleaf' : 'conifer') : Math.abs(lat) < 20 && h < 0.25 ? 'palm' : h < 0.85 ? 'broadleaf' : 'fern';
  }
  function placePlants(t) {
    plantsAt = [];
    if (!lifeOn || faunaShow() <= 0 || fxHook || t > MAXT || !proj.invert) return;
    const ppd = proj.scale() * Math.PI / 180, step = (W < 768 ? 20 : 15) / ppd, g = Math.pow(2, Math.round(Math.log2(step)));   // ~15 px apart, on a ladder so they stay put
    const c0 = proj.invert([W / 2, H / 2]); if (!c0) return;
    const spanLat = (H / 2 + 30) / ppd, spanLon = (W / 2 + 30) / ppd;
    const h = (i, j, s) => { const v = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
    const ice = t < 3.6 ? iceAt(t) : null, blocked = (x, y) => [boxes, mboxes].some(bs => bs.some(b => x > b[0] - 6 && x < b[0] + b[2] + 6 && y > b[1] - 6 && y < b[1] + b[3] + 6));
    let n = 0;
    const cap = W < 768 ? 1500 : 4200;
    // stands and clearings: a smooth field over the ground (a few degrees across), so plants grow in masses, not dots
    const patch = (lon, lat) => 0.5 + 0.26 * Math.sin(lon * 0.9 + lat * 0.5 + 1.1) + 0.16 * Math.sin(lon * 2.3 - lat * 1.9 + 2.3) + 0.09 * Math.sin(lon * 5.7 + lat * 4.9);
    for (let i = Math.floor((c0[1] - spanLat) / g); i <= Math.ceil((c0[1] + spanLat) / g) && n < cap; i++) {
      const lat0 = i * g; if (Math.abs(lat0) > 85) continue;
      const gl = g / Math.max(0.25, Math.cos(lat0 * Math.PI / 180)), sl = spanLon / Math.max(0.25, Math.cos(lat0 * Math.PI / 180));
      for (let j = Math.floor((c0[0] - sl) / gl); j <= Math.ceil((c0[0] + sl) / gl) && n < cap; j++) {
        n++;
        const lat = lat0 + (h(i, j, 1) - 0.5) * g * 0.8, lon = j * gl + (h(i, j, 2) - 0.5) * gl * 0.8;
        const dense = Math.max(0, Math.min(1, (patch(lon, lat) - 0.62 + 0.45 * wetAt(lat)) * 2.2));   // 1 in a stand, 0 in a clearing
        if (h(i, j, 3) > 0.06 + 0.94 * dense) continue;
        const kind = plantKind(t, lat, h(i, j, 4)); if (!kind) continue;
        const p = project([lon, lat]); if (!p || !inView(p[0], p[1], -20) || !onLand(p[0], p[1]) || blocked(p[0], p[1])) continue;
        if (ice && ice.some(x => x.w > 0.5 && d3.geoContains(x.s.geo, [lon, lat]))) continue;
        plantsAt.push({ x: p[0], y: p[1], kind, s: (0.7 + h(i, j, 5) * 0.45) * (0.8 + 0.45 * dense), ph: h(i, j, 6) * 6.28 });
      }
    }
  }
  function drawPlants(now) {
    const show = faunaShow(); if (!plantsAt.length || show <= 0) return;
    const sec = decoNow(now) / 1000, size = Math.max(14, Math.min(30, 10 + zoom * (mode === 'flat' ? 1.1 : 2)));
    fctx.globalAlpha = show * 0.95;
    for (const P of plantsAt) {
      const spr = plantSprite(P.kind), s = size * P.s, gust = 0.55 + 0.45 * Math.sin(sec * 0.8 - P.x * 0.012 - P.y * 0.004);   // a gust rolling across
      const bend = P.kind === 'grass' ? 0.22 : P.kind === 'ripple' || P.kind === 'dune' || P.kind === 'mat' ? 0 : P.kind === 'fern' || P.kind === 'moss' ? 0.1 : 0.06;
      const sw = bend * gust * Math.sin(sec * 2.1 + P.ph), drift = P.kind === 'ripple' || P.kind === 'dune' ? ((sec * (P.kind === 'dune' ? 0.4 : 1.6) + P.ph) % 4) - 2 : 0;
      fctx.save(); fctx.translate(P.x + sw * s * 0.6 + drift, P.y); fctx.rotate(sw); fctx.drawImage(spr, -s / 2, -s / 2, s, s); fctx.restore();
    }
    fctx.globalAlpha = 1;
  }
  const sparksNow = () => motion && !fxHook ? layers.sparks.filter(sp => time <= sp.from && time >= sp.to) : [];   // a playing scene draws its own
  function drawFx() {
    const now = performance.now();
    fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.globalAlpha = 1; fctx.globalCompositeOperation = 'source-over'; fctx.clearRect(0, 0, fx.width, fx.height);
    // light on the water: only while someone is exploring, eased in and out, never over land
    const live = motion ? Math.max(0, Math.min(1, (liveUntil - now) / 2500)) : 0;
    if (proj && finOK()) {                             // waves, the sun's glint, surf on the coasts, clouds and the wind
      const fc = finDraw(1, { sec: decoNow(now) / 1000, ocean: finQuick || lite ? 0 : 1, quick: finQuick });
      if (fc) { fctx.save(); fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.imageSmoothingEnabled = true; fctx.drawImage(fc, 0, 0, fx.width, fx.height); fctx.restore(); }
    } else if (live > 0 && proj) {
      if (!swell) swell = makeSwell();
      const vk = [mode, zoom.toFixed(3), panX | 0, panY | 0, W, H].join('|');
      if (vk !== sphereKey || !sphereP) { sphereKey = vk; sphereP = geoP({ type: 'Sphere' }); }
      fctx.save(); fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.clip(sphereP);
      const sec = now / 1000, pat = fctx.createPattern(swell, 'repeat');
      for (const [sx, sy, sc, a] of [[7, 2.2, 1.3, 0.15], [-4.5, 3.1, 0.85, 0.1]]) {
        pat.setTransform(new DOMMatrix([sc, 0, 0, sc, (sec * sx) % (220 * sc), (sec * sy) % (220 * sc)]));
        fctx.globalAlpha = a * live; fctx.fillStyle = pat; fctx.fillRect(0, 0, W, H);
      }
      // glints: sun catching the waves — a fixed scatter of points, each flashing on its own beat
      for (let i = 0; i < 150; i++) {
        const lat = (rnd(i, 51) - 0.5) * 2 * (20 + 25 * rnd(i, 52)), lon = rnd(i, 53) * 360 - 180, p = project([lon, lat]); if (!p) continue;
        const a = Math.pow(Math.max(0, Math.sin(sec * (0.5 + rnd(i, 59) * 0.9) + rnd(i, 57) * 6.28)), 10) * live; if (a < 0.02) continue;
        const r = (2.2 + rnd(i, 61) * 3) * Math.min(1.6, 0.8 + zoom * 0.2);
        fctx.globalAlpha = a * 0.9; fctx.strokeStyle = '#ffffff'; fctx.lineWidth = 0.9;
        fctx.beginPath(); fctx.moveTo(p[0] - r, p[1]); fctx.lineTo(p[0] + r, p[1]); fctx.moveTo(p[0], p[1] - r * 0.7); fctx.lineTo(p[0], p[1] + r * 0.7); fctx.stroke();
        fctx.globalAlpha = a * 0.5; fctx.fillStyle = '#fffbea'; fctx.beginPath(); fctx.arc(p[0], p[1], 1.3, 0, 7); fctx.fill();
      }
      fctx.globalAlpha = 1;
      fctx.restore();
      fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.globalAlpha = 1; fctx.globalCompositeOperation = 'destination-out'; fctx.drawImage(land, 0, 0); fctx.globalCompositeOperation = 'source-over';
      // clouds drifting with today’s wind belts: westward in the tropics (the trade winds), eastward further out
      fctx.save(); fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.clip(sphereP);
      for (let i = 0; i < 28; i++) {
        const trade = i % 2 === 0, sgn = rnd(i, 71) < 0.5 ? -1 : 1, lat = sgn * (trade ? 6 + rnd(i, 73) * 16 : 36 + rnd(i, 73) * 20);
        const lon = ((rnd(i, 75) * 360 + sec * (trade ? -0.7 : 1.1) * (0.7 + rnd(i, 77) * 0.6)) % 360 + 540) % 360 - 180;
        const wd = 9 + rnd(i, 79) * 13, p = project([lon, lat]), q = project([lon + wd / 2, lat]); if (!p || !q) continue;
        const rx = Math.hypot(q[0] - p[0], q[1] - p[1]); if (rx < 2 || rx > W) continue;
        for (let k = 0; k < 3; k++) {
          const ox = (k - 1) * rx * 0.55, oy = (rnd(i * 3 + k, 81) - 0.5) * rx * 0.25, rr = rx * (0.55 + rnd(i * 3 + k, 83) * 0.3);
          fctx.save(); fctx.translate(p[0] + ox, p[1] + oy); fctx.scale(1, 0.38);
          const g = fctx.createRadialGradient(0, 0, 0, 0, 0, rr); g.addColorStop(0, `rgba(255,255,255,${0.24 * live})`); g.addColorStop(1, 'rgba(255,255,255,0)');
          fctx.fillStyle = g; fctx.beginPath(); fctx.arc(0, 0, rr, 0, 7); fctx.fill(); fctx.restore();
        }
      }
      fctx.restore();
    }
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // eruptions glow and breathe; impacts send out rings
    for (const sp of sparksNow()) {
      const p = project(locate(sp.at, time)); if (!p) continue;
      const zs = Math.min(1.8, 0.75 + zoom * 0.25), R = (sp.r || 26) * zs, sec = decoNow(now) / 1000;
      if (sp.kind === 'impact') {
        const g = fctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], R * 0.7);
        g.addColorStop(0, 'rgba(255,250,225,0.95)'); g.addColorStop(0.35, 'rgba(255,190,90,0.55)'); g.addColorStop(1, 'rgba(255,120,40,0)');
        fctx.fillStyle = g; fctx.beginPath(); fctx.arc(p[0], p[1], R * 0.7, 0, 7); fctx.fill();
        for (let i = 0; i < 3; i++) { const k = ((sec / 2.6) + i / 3) % 1; fctx.beginPath(); fctx.arc(p[0], p[1], 4 + k * R * 2.6, 0, 7); fctx.strokeStyle = `rgba(255,236,190,${0.75 * (1 - k)})`; fctx.lineWidth = 2.2 * (1 - k) + 0.6; fctx.stroke(); }
      } else {
        const breathe = 0.82 + 0.12 * Math.sin(sec * 1.7) + 0.06 * Math.sin(sec * 4.3 + 1.3);
        const g = fctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], R * breathe);
        g.addColorStop(0, 'rgba(255,214,120,0.9)'); g.addColorStop(0.3, 'rgba(240,96,30,0.6)'); g.addColorStop(0.7, 'rgba(150,30,14,0.28)'); g.addColorStop(1, 'rgba(90,20,10,0)');
        fctx.fillStyle = g; fctx.beginPath(); fctx.arc(p[0], p[1], R * breathe, 0, 7); fctx.fill();
        for (let i = 0; i < 4; i++) { const u = ((sec / 3.2) + i / 4) % 1, px = p[0] + Math.sin(i * 2.1 + sec * 0.6) * R * 0.18 + u * R * 0.25, py = p[1] - u * R * 1.25; fctx.beginPath(); fctx.arc(px, py, R * (0.12 + u * 0.3), 0, 7); fctx.fillStyle = `rgba(74,62,58,${0.4 * Math.sin(u * Math.PI)})`; fctx.fill(); }   // ash rising
        const k = (sec / 4) % 1; fctx.beginPath(); fctx.arc(p[0], p[1], R * (0.6 + k * 1.3), 0, 7); fctx.strokeStyle = `rgba(70,50,44,${0.3 * (1 - k)})`; fctx.lineWidth = 5 * (1 - k) + 1; fctx.stroke();   // ash spreading
      }
    }
    if (plantsAt.length) { fctx.save(); drawPlants(now); fctx.restore(); fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.globalAlpha = 1; }
    if (faunaAt.length) { fctx.save(); drawFauna(now); fctx.restore(); fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.globalAlpha = 1; }
    if (fxHook) { fctx.save(); fxHook(fctx, fxHelp, now); fctx.restore(); fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.globalAlpha = 1; fctx.globalCompositeOperation = 'source-over'; }
    if (!rings.length) return;
    const k = motion ? (decoNow(now) % 1700) / 1700 : 0.25;     // at rest, the ring stays drawn, a little way out
    for (const [x, y, r] of rings) {
      fctx.beginPath(); fctx.arc(x, y, r + 3 + k * 16, 0, 7);
      fctx.strokeStyle = `rgba(200,62,20,${0.8 * (1 - k)})`; fctx.lineWidth = 2; fctx.stroke();
    }
  }

  /* Tie every dated rock to its plate in idle moments (each is otherwise tied the first time the clock reaches it,
     which made a hand on the timeline wait), once per list of rocks. */
  let rocksWarm = null;
  function warmRocks() {
    const list = layers.rocks; if (rocksWarm === list) return; rocksWarm = list; let i = 0;
    const later = f => window.requestIdleCallback ? requestIdleCallback(f, { timeout: 3000 }) : setTimeout(() => f(null), 60);
    const step = dl => {
      if (rocksWarm !== list) return;
      do { const R = list[i++]; if (R && R.at === undefined) { R.at = attach(R.lat, R.lon, (R.from + R.to) / 2); if (R.at.f < 0) R.at = null; } }
      while (i < list.length && dl && dl.timeRemaining() > 4);
      if (i < list.length) later(step);
    };
    later(step);
  }
  // ── loop ───────────────────────────────────────────────────────────
  /* The loop. Frames that change the map (a new time, a move, a fading wake, pins coming and going, a scene) run at the
     screen's rate. Frames that only decorate (light on the water, clouds, an eruption breathing, the ring round the
     chosen pin) run at about 30 a second, and only while someone is exploring (liveUntil, 14 s after the last touch);
     then they come to rest, drawn still, and the page asks for no frames at all until something changes. */
  let fxTimer = 0;
  function schedule() { if (fxTimer) { clearTimeout(fxTimer); fxTimer = 0; } if (!raf) raf = requestAnimationFrame(tick); }
  function scheduleDeco() { if (!raf && !fxTimer) fxTimer = setTimeout(() => { fxTimer = 0; schedule(); }, 33); }
  function tick() {
    raf = 0; seaLoop = true;
    try { if (dirty) { clearTimeout(settle); draw(); } else if (viewDirty && snap) drawQuick(); else drawFx(); }
    finally { seaLoop = false; }
    if (document.hidden) return;
    const now = performance.now();
    if ((trailLife > 0 || now < animUntil) && !dirty && !lite) dirty = true;             // keep fading the wake after the land stops — but not under a moving hand
    if (trailLife > 0 || (fxHook && !fxStill) || now < animUntil) schedule();
    else if (motion && now < liveUntil + 40) scheduleDeco();
  }
  const decoNow = now => motion ? Math.min(now, liveUntil) : 0;   // decorations stop where the exploring stopped
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    for (const cv of [canvas, fx, land, sheet]) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    for (const cv of q) { cv.width = Math.ceil(canvas.width / QS); cv.height = Math.ceil(canvas.height / QS); }
    seabed = null; coverTiles = {}; lastAt = {}; ghosts = []; makePaper(); makePatterns(); setupProjection();
  }

  // ── pointer, wheel and touch ───────────────────────────────────────
  function bind() {
    const pts = new Map(); let moved = 0, downAt = 0, pinch = 0, trail = [];   // trail: recent [time, dx, dy] of a one-finger drag
    const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener('pointerdown', () => { glide++; });   // touching the map cancels any glide in progress
    canvas.addEventListener('pointerdown', wake); canvas.addEventListener('pointermove', e => { if (performance.now() > liveUntil - 9000) wake(); });
    canvas.addEventListener('pointerdown', e => {
      pts.set(e.pointerId, pos(e)); moved = 0; downAt = performance.now(); trail = [];
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); }
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });
    canvas.addEventListener('pointermove', e => {
      const p = pos(e), prev = pts.get(e.pointerId);
      if (!prev) {                                  // hover
        const h = api.hit(p[0], p[1]);
        canvas.style.cursor = h ? 'pointer' : (mode === 'globe' || zoom > 1 ? 'grab' : 'default');
        if (api.onHover) api.onHover(h, p[0], p[1]);
        return;
      }
      pts.set(e.pointerId, p);
      if (pts.size === 1) {
        const dx = p[0] - prev[0], dy = p[1] - prev[1]; moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 4) { interact(); api.panBy(dx, dy); canvas.style.cursor = 'grabbing'; const n = performance.now(); trail.push([n, dx, dy]); while (trail.length && n - trail[0][0] > 90) trail.shift(); }
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch > 0) { interact(); } if (pinch > 0) api.zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / pinch);
        pinch = d; moved += 10;
      }
    });
    const up = e => {
      const p = pts.get(e.pointerId); pts.delete(e.pointerId); pinch = 0;
      // a flick keeps the map coasting, easing to a stop — like sliding a sheet of paper across a table
      if (motion && moved > 6 && !pts.size && trail.length > 1 && performance.now() - trail[trail.length - 1][0] < 60) {
        const span = Math.max(16, trail[trail.length - 1][0] - trail[0][0]);
        let vx = trail.reduce((a, q) => a + q[1], 0) / span, vy = trail.reduce((a, q) => a + q[2], 0) / span;   // px per ms
        if (Math.hypot(vx, vy) > 0.25) {
          const id = ++glide; let last = performance.now();
          const coast = now => { if (id !== glide) return; const dt = Math.min(40, now - last); last = now; vx *= Math.pow(0.9955, dt); vy *= Math.pow(0.9955, dt); if (Math.hypot(vx, vy) < 0.02) return; interact(); api.panBy(vx * dt, vy * dt); requestAnimationFrame(coast); };
          requestAnimationFrame(coast);
        }
      }
      trail = [];
      if (p && moved <= 6 && performance.now() - downAt < 600 && e.type === 'pointerup') {
        const h = api.hit(p[0], p[1]);
        if (api.onPick) api.onPick(h, p[0], p[1]);
      }
      canvas.style.cursor = '';
    };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', () => { if (api.onHover) api.onHover(null, 0, 0); });
    canvas.addEventListener('wheel', e => { e.preventDefault(); interact(); const p = pos(e); api.zoomAt(p[0], p[1], e.deltaY < 0 ? 1.18 : 1 / 1.18); }, { passive: false });
    canvas.addEventListener('dblclick', e => { const p = pos(e); api.zoomAt(p[0], p[1], 2); });
  }

  // ── public API ─────────────────────────────────────────────────────
  Object.assign(api, {
    MAXT, attach, locate, seaLevel,
    ice: t => iceAt(t).map(x => ({ key: x.s.key, label: x.s.label, w: +x.w.toFixed(3), stand: !!x.stand, src: x.s.src })),
    _rivers: t => ({ rivers: riverFade(t), lakes: lakeFade(t) }),
    _markers: () => layers.markers.map(m => ({ key: m.key, dim: !!m.dim, tag: m.tag || null, sites: m.sites.length })),
    shelfRivers: t => { const r = shelfRivers(t, seaLevel(t), iceAt(t)); return r && r.lines.map(g => g.coordinates); },
    underIce: (lat, lon, t) => iceAt(t).reduce((m, x) => Math.max(m, d3.geoContains(x.s.geo, [lon, lat]) ? x.w : 0), 0),
    /* The present-day place under a tap at the current time: find the plate
       piece under the point, then undo that plate's rotation. Null over sea. */
    pickPresent(x, y) {
      if (!proj || !proj.invert) return null;
      const ll = proj.invert([x, y]); if (!ll || !isFinite(ll[0]) || !isFinite(ll[1])) return null;
      if (mode === 'globe') { const r = proj.rotate(); if (d3.geoDistance(ll, [-r[0], -r[1]]) > Math.PI / 2) return null; }
      const p = toXYZ(ll[1], ll[0]); stamp++;
      for (const q of polys) {
        if (!visible(q, time)) continue;
        const m = famRot(q.f, time); if (!m) continue;
        const [a, b, cc] = q.c;
        if ((m[0] * a + m[1] * b + m[2] * cc) * p[0] + (m[3] * a + m[4] * b + m[5] * cc) * p[1] + (m[6] * a + m[7] * b + m[8] * cc) * p[2] < q.cosr - 0.02) continue;
        const r0 = q.rings[0], R = new Float32Array(r0.length);
        for (let i = 0; i < r0.length; i += 3) { const X = r0[i], Y = r0[i + 1], Z = r0[i + 2]; R[i] = m[0] * X + m[1] * Y + m[2] * Z; R[i + 1] = m[3] * X + m[4] * Y + m[5] * Z; R[i + 2] = m[6] * X + m[7] * Y + m[8] * Z; }
        if (!ringContains(R, p)) continue;
        const v = [m[0] * p[0] + m[3] * p[1] + m[6] * p[2], m[1] * p[0] + m[4] * p[1] + m[7] * p[2], m[2] * p[0] + m[5] * p[1] + m[8] * p[2]];
        return { lat: Math.asin(Math.max(-1, Math.min(1, v[2]))) * R2D, lon: Math.atan2(v[1], v[0]) * R2D };
      }
      return null;
    },
    init(cv, fxCanvas) {
      canvas = cv; ctx = cv.getContext('2d');
      fx = fxCanvas; fctx = fx.getContext('2d');
      land = document.createElement('canvas'); lctx = land.getContext('2d');
      sheet = document.createElement('canvas'); sctx = sheet.getContext('2d');
      for (let i = 0; i < 4; i++) { q[i] = document.createElement('canvas'); qc[i] = q[i].getContext('2d'); }
      resize(); bind();
      if (window.ResizeObserver) new ResizeObserver(() => resize()).observe(cv);
      else window.addEventListener('resize', resize);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { dirty = true; schedule(); });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
    },
    get time() { return time; },
    setTime(t) { t = Math.max(0, Math.min(EARTH_AGE, t)); if (t !== time) { time = t; dirty = true; wake(); schedule(); } },
    /* a hand is moving something (the timeline): light frames until it stops, then the full picture 160 ms later */
    interact() { interact(); },
    /* A scene to draw over the map every frame, or null to stop. Called as fn(ctx, helpers, now). */
    setFx(fn, o) { fxHook = fn || null; fxStill = !!(o && o.still); schedule(); },
    /* hide the drawn North American ice sheet while a story draws its own, retreating one */
    setIceOff(on) { iceOff = !!on; dirty = true; schedule(); },
    /* hide today's land inside a [lon0, lat0, lon1, lat1] box while a story draws its own (null to stop) */
    setHideBox(b) { hideBox = b || null; shelfKey = ''; dirty = true; schedule(); },
    /* turn the map to a present-day [lon, lat] */
    lookAtLL(lon, lat) { api.lookAt({ ll: [lon, lat] }); },
    /* Decorative motion on or off (tests and screenshots turn it off; so does the reader's reduced-motion setting). */
    setIconPainter(fn) { iconPaint = fn; dirty = true; schedule(); },
    setMotion(on) { motion = !!on; trailLife = 0; liveUntil = 0; if (tctx) tctx.clearRect(0, 0, trail.width, trail.height); dirty = true; schedule(); },
    motion,
    get mode() { return mode; },
    /* today's gravity shape on the globe (see geoidAt) */
    setGeoid(on) { geoidOn = !!on; gKey = ''; setupProjection(); },
    /* how many times taller the gravity bumps are drawn: 1 (real size) to 20,000 */
    setGeoidScale(x) { geoX = Math.max(1, Math.min(20000, +x || 1)); gKey = ''; setupProjection(); },
    geoidAt,
    _geoidShown: () => projGeoid,
    _screen: (lon, lat) => project([lon, lat]),
    /* is this present-day place drawn as land now? (carried on its plate to the map's time) */
    _landHere(lat, lon) { const a = attach(lat, lon, time), ll = locate(a, time), p = ll && project(ll); return p ? onLand(p[0], p[1]) : null; },
    /* how far the globe's edge strays from a circle: [shortest, longest] distance from the centre, in pixels */
    _limb() { const rot = d3.geoRotation(proj.rotate()), c = proj.translate(), r = [];
      for (let a = 0; a < 360; a += 4) { const sa = Math.sin(a * D2R) * 0.9995, ph = Math.asin(sa), la = Math.asin(Math.cos(a * D2R) * 0.9995 / Math.cos(ph)), p = proj(rot.invert([la * R2D, ph * R2D])); if (p) r.push(Math.hypot(p[0] - c[0], p[1] - c[1])); }
      return [Math.min(...r), Math.max(...r)]; },
    setMode(m) { mode = m; zoom = 1; panX = panY = 0; setupProjection(); },
    get zoom() { return zoom; },
    zoomAt(x, y, f) {
      const z = Math.max(1, Math.min(mode === 'flat' ? 36 : 18, zoom * f)), k = z / zoom;
      if (mode === 'flat') { const tx = proj.translate(); panX += (x - tx[0]) * (1 - k); panY += (y - tx[1]) * (1 - k); }
      zoom = z; if (zoom <= 1.001) { zoom = 1; panX = panY = 0; } applyView();
    },
    zoomBy(f) { api.zoomAt(W / 2, H / 2, f); },
    panBy(dx, dy) {
      if (mode === 'flat') {
        if (zoom > 1) { panX += dx; panY += dy; }
        else { centerLon -= dx / (baseScale * 0.86) * R2D; centerLon = ((centerLon + 540) % 360) - 180; }
      } else { const k = R2D / (baseScale * zoom); rotL += dx * k; rotP = Math.max(-89, Math.min(89, rotP - dy * k)); }
      applyView();
    },
    resetView() { zoom = 1; panX = panY = 0; centerLon = 0; rotL = -20; rotP = -15; applyView(); },
    /* Bring a place into view: turn the globe to it, or re-centre a zoomed flat map. */
    lookAt(at) {
      const ll = at && at.ll ? at.ll : locate(at, time); if (!ll) return;
      // glide there rather than jump; the globe turns the short way round
      let to = null;
      if (mode === 'globe') { let dl = ((-ll[0] - rotL + 540) % 360) - 180; to = { rotL: rotL + dl, rotP: -Math.max(-70, Math.min(70, ll[1])) }; }
      else if (zoom > 1) { const p = proj(ll); if (p) to = { panX: panX + W / 2 - p[0], panY: panY + H / 2 - p[1] }; }
      if (!to) return;
      // a long hop on a zoomed-in flat map flies like a camera: up, across, and down again
      if (mode === 'flat' && motion && zoom > 1.8) {
        const p = proj(ll), z0 = zoom, far = Math.hypot(p[0] - W / 2, p[1] - H / 2) / Math.max(W, H);
        if (far > 0.45) {
          const c0 = [(W / 2 - baseT[0] - panX) / z0, (H / 2 - baseT[1] - panY) / z0], c1 = [(p[0] - baseT[0] - panX) / z0, (p[1] - baseT[1] - panY) / z0];
          const dip = Math.min(0.75, 1 - Math.max(1, z0 / (1 + far * 3)) / z0), t0 = performance.now(), dur = 900 + 500 * Math.min(1, far), id = ++glide;
          const step = now => {
            if (id !== glide) return;
            const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            zoom = z0 * (1 - dip * Math.sin(Math.PI * k));
            const cx = c0[0] + (c1[0] - c0[0]) * e, cy = c0[1] + (c1[1] - c0[1]) * e;
            panX = W / 2 - baseT[0] - zoom * cx; panY = H / 2 - baseT[1] - zoom * cy;
            applyView(); if (k < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step); return;
        }
      }
      const from = { rotL, rotP, panX, panY }, far = mode === 'globe' ? Math.hypot(to.rotL - rotL, to.rotP - rotP) / 90 : Math.hypot(to.panX - panX, to.panY - panY) / Math.max(W, H);
      if (!motion || far < 0.02) { if (mode === 'globe') { rotL = to.rotL; rotP = to.rotP; } else { panX = to.panX; panY = to.panY; } applyView(); return; }
      const t0 = performance.now(), dur = 380 + 420 * Math.min(1, far), id = ++glide;
      const step = now => {
        if (id !== glide) return;                       // a newer move, or the reader's own drag, takes over
        const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        for (const key in to) { const v = from[key] + (to[key] - from[key]) * e; if (key === 'rotL') rotL = v; else if (key === 'rotP') rotP = v; else if (key === 'panX') panX = v; else panY = v; }
        applyView(); if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    setLayers(l) {
      if (l.markers && motion) {
        const now = performance.now(), had = new Set(layers.markers.map(m => m.key)), has = new Set(l.markers.map(m => m.key));
        // a wholesale change (a new tab, a filter, a jump through time) is not an arrival or an extinction
        const added = l.markers.filter(m => !had.has(m.key)), gone = layers.markers.filter(m => !has.has(m.key));
        if (had.size && added.length <= 14) for (const m of added) born[m.key] = now;
        if (gone.length <= 14) for (const m of gone) { const a = lastAt[m.key]; if (a) ghosts.push({ x: a[0], y: a[1], r: a[2], e: a[3], pic: a[5], mark: a[6], t: now }); }
        for (const m of gone) { delete born[m.key]; delete lastAt[m.key]; }
        if (added.length || gone.length) animUntil = now + 560;
      }
      Object.assign(layers, l); dirty = true; schedule();
    },
    select(key) { if (key !== selected) { selected = key; dirty = true; schedule(); } },
    hit(x, y) { for (const L of [faunaHits, hits]) for (let i = L.length - 1; i >= 0; i--) { const h = L[i]; if (Math.hypot(h.x - x, h.y - y) <= h.r) return h; } return null; },
    redraw() { dirty = true; schedule(); },
    resize,
    stats: () => ({ families: fams.length, polygons: polys.length, ms: lastMs }),
    _draw: () => { lite = false; draw(); }, _drawLite: () => { lite = true; draw(); lite = false; },
    _seaWorker: () => ({ on: !!SW.w, failed: SW.failed, made: SW.made, busy: SW.busy, cached: [...SEA.cache.keys()] }),
    _rest() { liveUntil = performance.now() - 100; schedule(); },
    setFinish(on) { finOn = !!on; dirty = true; schedule(); },
    setLifeUpClose(on) { lifeOn = !!on; dirty = true; schedule(); },
    get lifeUpClose() { return lifeOn; },
    _finish: () => ({ ok: !!finGL(), err: FIN.err || null, drawn: FIN.drawn.slice(), ground: TER.ground || 0, terErr: TER.err || null }),
    _plants: () => { const k = {}; for (const P of plantsAt) k[P.kind] = (k[P.kind] || 0) + 1; return k; },
    _fauna: () => ({ why: faunaWhy, asked: layers.fauna.length, show: faunaShow(), scene: !!fxHook, placed: faunaAt.map(g => ({ name: g.f.name, n: g.n, x: g.cx, y: g.cy, L: g.L, where: g.f.where, land: onLand(g.cx, g.cy) })), hits: faunaHits.map(h => [Math.round(h.x * 10) / 10, Math.round(h.y * 10) / 10, h.marker.name]) }),   // as if the last touch was 14 s ago
    _plugCheck(ts) { return ts.every(t => PLUGS.every(P => { const a = attach(P.anchor[0], P.anchor[1], t); return plugFam(P, t) === (a ? a.f : -1); })); },
    _seaTraceBoth(s) {                                 // the worker's outlines for stage s, and this page's, for the check
      return new Promise(res => { const w = seaWorker(); if (!w) return res(null); SEA.cache.delete(s);
        const done = () => { const a = SEA.cache.get(s); SEA.cache.delete(s); const b = seaStage(s); for (const x of [b.M, b.L, b.R]) { x[1] = seaThin(x[0], 0.3); x[2] = seaThin(x[0], 0.8); } res({ a, b }); };
        const was = w.onmessage; w.onmessage = e => { was(e); if (e.data.s === s) { w.onmessage = was; done(); } }; SW.want = s; seaNext(); }); }, _interact: interact, _isLite: () => lite, _bannerLines: () => bannerLines, _ctx: () => ctx, _hill: () => Object.values(hillImg).filter(h => h.ok).length, _fullDraws: () => fullDraws,   
    /* Which land pieces cover a present-day point (for checks): 'index:family[from..to]' list. */
    /* How much of the continents was under the sea at t, in percent (and today), from the same maps; null where there are none. */
    seaShare(t) { if (!SEA.P || seaFade(t) <= 0) return null; const i = seaStep(t); return { pct: SEA.P.share[i] / 10, high: SEA.P.high[i] / 10, today: SEA.P.share[0] / 10, map: i * SEA.P.step }; },
    /* Was a present-day place under the sea at t? 'sea', 'land', 'reached' (dry land the sea covered at its highest),
       'none' (no continent there on the maps), or null (no maps for t, or not loaded yet). */
    seaAt(lat, lon, t) {
      if (SEA.st !== 'ready' || seaFade(t) <= 0) return null;
      const i = Math.max(0, Math.min(GH - 1, Math.round(90 - lat))); let first = 0;
      for (let r = 0; r < i; r++) first += SEA.P.rows[r] >> 1;
      const R = SEA.P.rows[i], nn = R >> 1, off = (R & 1) / 2, k = SEA.where[first + ((Math.round((lon + 180) / (360 / nn) - off) % nn) + nn) % nn];
      const v = k < 0 ? 0 : SEA.val[k * SEA.S + seaStep(t)];
      return v === 1 ? 'sea' : v === 2 ? 'land' : v === 3 ? 'reached' : 'none';
    },
    /* share of the map's sheet the land layer covers, sampled on a coarse grid (tests) */
    _pins() { return Object.fromEntries(Object.entries(lastAt).map(([k, a]) => [k, a[4]])); },
    _landFrac() { const d = lctx.getImageData(0, 0, land.width, land.height).data, w = land.width; let n = 0, k = 0; for (let y = 4; y < land.height; y += 16) for (let x = 4; x < w; x += 16) { const sx = x / dpr, sy = y / dpr; const ll = proj.invert && proj.invert([sx, sy]); if (!ll || !isFinite(ll[0]) || (mode === 'globe' && d3.geoDistance(ll, [-proj.rotate()[0], -proj.rotate()[1]]) > 1.5)) continue; n++; if (d[(y * w + x) * 4 + 3] > 128) k++; } return n ? k / n : 0; },
    _seaCheck() {                                   // every map: traced area against the pixels' area, for both outlines (tests)
      const area = r => { const c = []; for (let i = 0; i < r.length; i += 3) c.push([Math.atan2(r[i + 1], r[i]) * R2D, Math.asin(Math.max(-1, Math.min(1, r[i + 2]))) * R2D]); c.push(c[0]); return d3.geoArea({ type: 'Polygon', coordinates: [c] }); };
      const net = fr => fr.flatMap(x => x.rings).map(area).reduce((a, A) => a + (A > 2 * Math.PI ? A - 4 * Math.PI : A), 0);
      const total = SEA.P.rows.reduce((a, r) => a + (r >> 1), 0), out = [], badFam = [];
      for (let st = 0; st < SEA.S; st++) {
        const c = seaStage(st); let nM = 0, nL = 0;
        for (let k = 0; k < SEA.P.n; k++) { if (SEA.fam[k] < 0) continue; const v = SEA.val[k * SEA.S + st]; if (v >= 1) nM++; if (v >= 2) nL++; }
        out.push([st * SEA.P.step, net(c.M[0]) / (nM * 4 * Math.PI / total), net(c.L[0]) / (nL * 4 * Math.PI / total)]);
        for (const fr of [...c.M[0], ...c.L[0]]) {                 // as d3 reads it: one plate's outlines together must not cover half the globe
          const A = d3.geoArea({ type: 'Polygon', coordinates: fr.rings.map(r => { const q = []; for (let i = 0; i < r.length; i += 3) q.push([Math.atan2(r[i + 1], r[i]) * R2D, Math.asin(Math.max(-1, Math.min(1, r[i + 2]))) * R2D]); q.push(q[0]); return q; }) });
          if (A > 2 * Math.PI) badFam.push([st * SEA.P.step, fr.f, +A.toFixed(2)]);
        }
      }
      return { maps: out, open: SEA.open || 0, badFam };
    },
    /* the ancient relief and sea depth (WebGL): on by default; off draws the map as it was without them */
    setTerrain(on) { terOn = !!on; dirty = true; schedule(); },
    /* what the map sits on: 'atlas', 'fieldbook', 'workshop', 'planetarium' or 'space' */
    setBackdrop(name) { if (!BD[name] || name === backdrop) return; backdrop = name; if (canvas) { makePaper(); makePatterns(); sheetKey = ''; dirty = true; schedule(); } },
    BACKDROPS: Object.keys(BD),
    /* how solid one terrain layer is where a present-day place sits now, 0–255 (tests) */
    _terPx(layer, lat, lon) {
      const cv = terDraw(time, layer, 1); if (!cv) return null;
      const ll = locate(attach(lat, lon, time), time), p = ll && project(ll); if (!p) return null;
      const gl = TER.gl, x = Math.round(p[0] * dpr / 2), y = cv.height - 1 - Math.round(p[1] * dpr / 2), px = new Uint8Array(4);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return px[3];
    },
    _terShot(layer) { const cv = terDraw(time, layer, 1); return cv ? cv.toDataURL('image/png') : null; },
    _ter() { return { st: TER.st, gl: !!TER.gl, err: TER.err || '', maps: [...TER.maps.keys()].filter(k => TER.maps.get(k)), drawn: TER.drawn, n: TER.nVert || 0 }; },
    _sea() {
      const s0 = SEA.st === 'ready' ? seaStage(seaStep(time)) : null, s = s0 && { M: s0.M[0], L: s0.L[0] };
      if (!s) return { st: SEA.st, fade: seaFade(time) };
      const area = r => { const c = []; for (let i = 0; i < r.length; i += 3) c.push([Math.atan2(r[i + 1], r[i]) * R2D, Math.asin(Math.max(-1, Math.min(1, r[i + 2]))) * R2D]); c.push(c[0]); return d3.geoArea({ type: 'Polygon', coordinates: [c] }); };
      const net = fr => fr.flatMap(x => x.rings).map(area).reduce((a, A) => a + (A > 2 * Math.PI ? A - 4 * Math.PI : A), 0);   // outlines add, holes take away
      let nM = 0; const st = seaStep(time); for (let k = 0; k < SEA.P.n; k++) if (SEA.val[k * SEA.S + st] >= 1 && SEA.fam[k] >= 0) nM++;
      const total = SEA.P.rows.reduce((a, r) => a + (r >> 1), 0);
      return { st: SEA.st, fade: seaFade(time), M: s.M.reduce((a, x) => a + x.rings.length, 0), L: s.L.reduce((a, x) => a + x.rings.length, 0),
        pts: [...s.M, ...s.L].reduce((a, x) => a + x.rings.reduce((b, r) => b + r.length / 3, 0), 0), mArea: net(s.M), pxArea: nM * 4 * Math.PI / total };
    },
    /* the colour drawn where a present-day place sits now, and how solid the land layer is there (tests) */
    _px(lat, lon) { const a = attach(lat, lon, time), ll = locate(a, time); if (!ll) return null; const p = project(ll); if (!p) return null; const x = Math.round(p[0] * dpr), y = Math.round(p[1] * dpr); return { rgb: Array.from(ctx.getImageData(x, y, 1, 1).data).slice(0, 3), land: lctx.getImageData(x, y, 1, 1).data[3] }; },
    // ── review probes (tools/test.js and tools/review_geometry.js): read-only views of the geometry ──
    _landCanvas() { return land; },
    /* where the drawn land comes from, sampled on a grid over the map: still today's outline with no sea map under it,
       today's land taken by the sea maps, or land the sea maps add (review) */
    _landSources() {
      const t = time, lp = landPath(t), sea = seaNow(t), c = ctx, o = { today: 0, todayUnmapped: 0, flooded: 0, mapped: 0, total: 0 };
      c.save(); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let y = 4; y < H; y += 6) for (let x = 4; x < W; x += 6) {
        const ll = proj.invert && proj.invert([x, y]); if (!ll || !isFinite(ll[0])) continue;
        if (mode === 'globe' && d3.geoDistance(ll, [-proj.rotate()[0], -proj.rotate()[1]]) > 1.5) continue;
        o.total++;
        const inLp = c.isPointInPath(lp, x * dpr, y * dpr), inM = sea && c.isPointInPath(sea.M, x * dpr, y * dpr), inL = sea && c.isPointInPath(sea.L, x * dpr, y * dpr);
        if (inL) o.mapped++; else if (inLp && inM) o.flooded++; else if (inLp) { if (sea) o.todayUnmapped++; else o.today++; }
      }
      c.restore(); return o;
    },
    /* does the WebGL terrain sit on the traced coasts? the elevation maps' dry land against the traced land,
       overlap for shifts of -3..3 half-size pixels — best at 0,0 when the two projections agree (review) */
    _terReg() {
      const cv = terDraw(time, 'dry', 1), sea = seaNow(time); if (!cv || !sea) return null;
      const gl = TER.gl, w = cv.width, h = cv.height, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : px[((h - 1 - y) * w + x) * 4 + 3] > 127;
      const pts = []; const c = ctx; c.save(); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let y = 2; y < h; y += 3) for (let x = 2; x < w; x += 3) pts.push([x, y, c.isPointInPath(sea.L, (x + 0.5) * 2, (y + 0.5) * 2)]);
      c.restore();
      const res = {};
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { let ok = 0, n = 0; for (const [x, y, m] of pts) { const g = A(x + dx, y + dy); if (g || m) { n++; if (g && m) ok++; } } res[dx + ',' + dy] = n ? ok / n : 0; }
      return res;
    },
    _famInfo() { return fams.map(F => ({ end: F.t[F.t.length - 1], keys: F.t.length })); },
    _famRotAt(f, t) { stamp++; const m = famRot(f, t); return m ? Array.from(m) : null; },
    _polys() { return polys.map(p => ({ f: p.f, hi: p.hi, lo: p.lo, c: p.c, pts: p.rings[0].length / 3, area: ringArea(p.rings[0]) })); },
    /* thin gaps in the land layer: sea pixels with land within 2 px on both sides (across or down) */
    _landStats() {
      const w = land.width, h = land.height, d = lctx.getImageData(0, 0, w, h).data, L = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) L[i] = d[i * 4 + 3] > 128 ? 1 : 0;
      let landN = 0, crack = 0; const where = [];
      for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
        const i = y * w + x; if (L[i]) { landN++; continue; }
        const hz = (L[i - 1] || L[i - 2]) && (L[i + 1] || L[i + 2]), vt = (L[i - w] || L[i - 2 * w]) && (L[i + w] || L[i + 2 * w]);
        if (hz || vt) { crack++; if (where.length < 4000) where.push([x / dpr | 0, y / dpr | 0]); }
      }
      return { landN, crack, where, w, h, dpr };
    },
    _labelsAt() {
      const at = p => { if (!p) return null; const x = Math.round(p[0] * dpr), y = Math.round(p[1] * dpr); if (x < 0 || y < 0 || x >= land.width || y >= land.height) return null; return lctx.getImageData(x, y, 1, 1).data[3]; };
      const out = [];
      for (const L of layers.labels) { if (time > L.from || time < L.to) continue; const ll = locate(L.at, time), p = ll && project(ll); out.push({ kind: 'land', text: L.text, x: p && p[0], y: p && p[1], land: at(p), sea: api.seaAt(L.at.lat, L.at.lon, time), shown: !!p && !(curSea && curSea.snap && !onLand(p[0], p[1]) && !onShelf(p[0], p[1])) }); }
      for (const O of layers.oceans) { if (time > O.from || time < O.to) continue; const a = locate(O.a, time), b = locate(O.b, time); if (!a || !b) continue; const m = d3.geoInterpolate(a, b)(O.k ?? 0.5), p = project(m); out.push({ kind: 'ocean', text: O.text, x: p && p[0], y: p && p[1], land: at(p), shown: !!p && !onLand(p[0], p[1]) }); }
      return out;
    },
    _cover(lat, lon) { const D = Math.PI / 180, c = Math.cos(lat * D), P = [c * Math.cos(lon * D), c * Math.sin(lon * D), Math.sin(lat * D)], o = [];
      polys.forEach((q, i) => { if (q.c[0] * P[0] + q.c[1] * P[1] + q.c[2] * P[2] < q.cosr - 0.02) return; if (ringContains(q.rings[0], P)) o.push(i + ':f' + q.f + '[' + q.hi + '..' + q.lo + ']'); }); return o.join(' '); },
  });
  // Object.assign copies a getter's value once; these must stay live (the globe button reads `mode`)
  Object.defineProperties(api, { fxOn: { get: () => !!fxHook, configurable: true }, time: { get: () => time, configurable: true }, mode: { get: () => mode, configurable: true }, zoom: { get: () => zoom, configurable: true }, motion: { get: () => motion, configurable: true }, backdrop: { get: () => backdrop, configurable: true }, terrain: { get: () => terOn && !!TER.gl && TER.st === 'ready', configurable: true }, geoid: { get: () => geoidOn, configurable: true }, geoidScale: { get: () => geoX, configurable: true } });
  return api;
})();
