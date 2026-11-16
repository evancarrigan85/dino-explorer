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
  const MAXT = PLATE_DATA.maxT;

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
  function attach(lat, lon, age = 0) {
    const v = toXYZ(lat, lon), end = f => fams[f].t[fams[f].t.length - 1];
    let inside = null, insideEnd = -1;
    for (const p of polys) {
      if (p.c[0] * v[0] + p.c[1] * v[1] + p.c[2] * v[2] < p.cosr - 0.02) continue;
      if (!ringContains(p.rings[0], v)) continue;
      const e = end(p.f); if (e > insideEnd) { insideEnd = e; inside = p; }
    }
    if (inside && insideEnd >= age) return { f: inside.f, v, lat, lon };
    const nearest = minEnd => {
      let best = null, bd = -2;
      for (const p of polys) {
        if (end(p.f) < minEnd) continue;
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
  let layers = { labels: [], markers: [], places: [], oceans: [], notes: [], superocean: [], sparks: [], pin: null };
  let selected = null, hits = [], rings = [];
  let pal = null;
  const QS = 4;                               // soft effects are built at 1/4 size
  const api = {};

  function setupProjection() {
    const pad = Math.max(8, Math.min(W, H) * 0.03);
    if (mode === 'flat') {
      proj = d3.geoEqualEarth().rotate([-centerLon, 0]).fitExtent([[pad, pad * 1.1], [W - pad, H - pad * 1.1]], { type: 'Sphere' });
    } else {
      proj = d3.geoOrthographic().rotate([rotL, rotP]).clipAngle(90).fitExtent([[pad, pad], [W - pad, H - pad]], { type: 'Sphere' });
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
    }
    // a one-finger swipe scrolls the page unless the map itself can be dragged
    if (canvas) canvas.style.touchAction = (mode === 'flat' && zoom <= 1.001) ? 'pan-y' : 'none';
    dirty = true; schedule();
    if (api.onView) api.onView();
  }

  // ── paper: the sheet the map is drawn on ───────────────────────────
  function rnd(i, s = 1) { const h = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return h - Math.floor(h); }
  function makePaper() {
    paper = document.createElement('canvas'); paper.width = canvas.width; paper.height = canvas.height;
    const c = paper.getContext('2d'), w = paper.width, h = paper.height;
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
    const wv = document.createElement('canvas'); wv.width = Math.round(56 * dpr); wv.height = Math.round(30 * dpr);
    const wc = wv.getContext('2d'); wc.scale(dpr, dpr);
    wc.strokeStyle = 'rgba(255,255,255,0.5)'; wc.lineWidth = 0.7; wc.lineCap = 'round';
    wc.beginPath(); wc.moveTo(4, 9); wc.quadraticCurveTo(9, 6, 14, 9); wc.quadraticCurveTo(19, 12, 24, 9); wc.stroke();
    wc.beginPath(); wc.moveTo(32, 23); wc.quadraticCurveTo(37, 20, 42, 23); wc.quadraticCurveTo(47, 26, 52, 23); wc.stroke();
    wavePat = ctx.createPattern(wv, 'repeat');
  }

  // ── palette: sea and land colours shift with the climate of the age ─
  const PALS = [
    // [mya, oceanCentre, oceanMid, oceanEdge, landBase]
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
  // Northern ice sheets at their greatest Ice Age extent (present-day coords, approximate).
  const SHEETS = {
    laurentide: [[48,-124.5],[47,-122.5],[47.5,-117],[47.5,-112],[47.2,-106],[47,-101],[45,-99.5],[43,-97.5],[41.7,-93.6],[43,-91],[40,-89.5],[39.5,-86.5],[39.5,-84],[40.5,-81.5],[41.2,-79.5],[41,-76],[40.6,-74.2],[41,-71.5],[41.3,-70],[42.5,-66.5],[44.5,-60],[46.5,-53],[52,-52.5],[56,-58.5],[61,-62.5],[66,-60],[72,-70],[76,-76],[81,-70],[83,-78],[81.5,-95],[79,-108],[76,-122],[71,-128],[69.5,-135],[68.5,-138],[65,-134],[62,-137],[61,-141],[60,-147],[59,-153],[57,-156],[56,-152],[58.5,-143],[57,-137.5],[54,-134],[50,-129.5]],
    greenland: [[60.5,-45],[63,-50.5],[67,-52.5],[70,-53.5],[74,-56.5],[77,-65],[79.5,-65],[81.5,-55],[82.5,-38],[81.5,-22],[78,-20],[74,-21],[70.5,-24],[68.5,-28],[66,-37.5],[63,-41.5]],
    eurasian: [[51.4,-10.5],[50.9,-6.5],[51.6,-3.2],[52.6,-1.5],[53,0.5],[53.8,3],[53.6,7],[53.2,10],[52.3,13.5],[52,16.5],[53,20],[54.2,24],[55.3,28],[56.5,32.5],[59,38],[61.5,43.5],[64.5,46],[67.5,48.5],[69.5,56],[71,62],[74,70],[77.5,80],[80.5,85],[82,70],[82,40],[81.5,15],[79.5,7],[75,13],[72,15],[69.5,13.5],[66.5,8.5],[63,3.5],[61.5,0.5],[60.5,-3.5],[58.5,-9.5],[55.5,-10.5],[53.5,-12]],
    patagonian: [[-38.5,-71.5],[-42,-71],[-46,-71],[-50,-71.5],[-52,-69.5],[-53.5,-68.5],[-55.3,-67],[-55.8,-70],[-53,-74.5],[-49,-75.8],[-45,-75],[-41.5,-74],[-39,-72.6]],
  };
  function sheetGeo(name) {
    const r = SHEETS[name].map(([la, lo]) => [lo, la]); r.push(r[0]);
    const g = { type: 'Polygon', coordinates: [r] };
    if (d3.geoArea(g) > 2 * Math.PI) g.coordinates[0].reverse();
    return g;
  }
  const SHEET_GEO = {}; for (const k in SHEETS) SHEET_GEO[k] = sheetGeo(k);

  // ── Ice Age sea level ──────────────────────────────────────────────
  // Global average ("eustatic") sea level in metres relative to today. The
  // last 30,000 years follow Lambeck et al. (2014, PNAS), including the fast
  // rise of meltwater pulse 1A about 14,500 years ago; older values are
  // simplified from published reconstructions of the last 800,000 years (100,000-year cycles, about
  // 120–130 m lower at each glacial peak). Before 800,000 years ago the
  // cycles were shorter (41,000 years) and shallower; that part is drawn as
  // a smooth 41,000-year wave. Before 2.6 million years ago: no lowstands.
  const SL = [[0, 0], [2, 0], [4, -1], [6, -3], [7, -6], [8, -15], [8.5, -20], [9, -28], [10, -40], [11.5, -55], [12.5, -65], [14.2, -80], [14.7, -100], [16.5, -110], [19, -125], [21, -130], [26, -130], [30, -90], [45, -75], [60, -85], [70, -80], [80, -25], [90, -50],
    [100, -25], [110, -45], [118, -10], [125, 6], [130, -30], [135, -110], [150, -120], [160, -110], [190, -80], [200, -30], [215, -10], [230, -60], [240, -5], [255, -80],
    [270, -110], [290, -60], [325, 0], [340, -60], [360, -105], [380, -40], [405, 5], [420, -60], [435, -125], [460, -70], [480, -40], [500, -70], [530, -30], [560, -80],
    [600, -60], [630, -120], [660, -60], [690, -30], [720, -70], [760, -50], [790, -100], [800, -60]];
  function seaLevel(t) {
    const ka = t * 1000;
    if (ka > 2580) return 0;
    if (ka > 800) return Math.round(-45 + 30 * Math.cos(2 * Math.PI * (ka - 800) / 41));
    let i = 0; while (i < SL.length - 2 && SL[i + 1][0] < ka) i++;
    const [a0, b0] = SL[i], [a1, b1] = SL[i + 1], k = Math.max(0, Math.min(1, (ka - a0) / (a1 - a0)));
    return Math.round(b0 + (b1 - b0) * k);
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
  // Today's high ground (metres above the sea). Mountains are young, so it is only drawn for the Ice Age and after.
  const RELIEF_LV = typeof RELIEF_PACKED === 'undefined' ? [] : unpackLevels(RELIEF_PACKED);
  let shelfKey = '', shelfP = {}, reliefP = {}, seabed = null;
  // ── motion: wakes behind drifting land, light on the water, eruptions and impacts ──
  // All of it runs off the clock, never chance, and all of it stops when the reader asks for less motion.
  let motion = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let trail = null, tctx = null, trailKey = '', trailT = null, trailLife = 0;   // where the land was a moment ago
  let liveUntil = 0, swell = null, sphereP = null, sphereKey = '';
  const wake = () => { if (motion) { liveUntil = performance.now() + 14000; schedule(); } };

  // ── drawing ────────────────────────────────────────────────────────
  const sink = {
    p: null, _l: NaN, _p: NaN,
    polygonStart() { this._l = 0; }, polygonEnd() { this._l = NaN; },
    lineStart() { this._p = 0; },
    lineEnd() { if (this._l === 0) this.p.closePath(); this._p = NaN; },
    point(x, y) { if (this._p === 0) { this.p.moveTo(x, y); this._p = 1; } else this.p.lineTo(x, y); },
    sphere() {}
  };
  function landPath(t) {
    const path = new Path2D(); sink.p = path;
    const st = proj.stream(sink);
    // pick the coarsest outline whose error stays under about a pixel
    const pxPerDeg = proj.scale() * D2R * (mode === 'flat' ? 0.86 : 1);
    const lod = 0.8 * pxPerDeg <= 1.15 ? 2 : 0.3 * pxPerDeg <= 1.15 ? 1 : 0;
    for (const p of polys) {
      if (!visible(p, t)) continue;
      const rings_ = p.lod[lod]; if (!rings_.length) continue;
      const m = famRot(p.f, t); if (!m) continue;
      st.polygonStart();
      for (const xyz of rings_) {
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
  const geoP = obj => { const p = new Path2D(); d3.geoPath(proj, p)(obj); return p; };
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
  function draw() {
    dirty = false; stamp++;
    const t0 = performance.now();
    const t = time, c = ctx;
    pal = palette(t);
    const sphere = geoP({ type: 'Sphere' });
    const b = d3.geoPath(proj).bounds({ type: 'Sphere' });
    const cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2, rad = Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1]) / 2;

    // the sheet (paper + the globe's drop shadow) only changes with the view
    const key = [mode, zoom.toFixed(3), panX | 0, panY | 0, W, H].join('|');
    if (key !== sheetKey) {
      sheetKey = key;
      sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.drawImage(paper, 0, 0);
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.save(); sctx.shadowColor = 'rgba(60,34,8,0.6)'; sctx.shadowBlur = 20 * dpr; sctx.shadowOffsetY = 3 * dpr;
      sctx.fillStyle = '#6a8ea0'; sctx.fill(sphere); sctx.restore();
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(sheet, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    // sea
    const og = c.createRadialGradient(cx - rad * 0.15, cy - rad * 0.2, rad * 0.05, cx, cy, rad * 1.05);
    og.addColorStop(0, pal.o1); og.addColorStop(0.55, pal.o2); og.addColorStop(1, pal.o3);
    c.save(); c.clip(sphere);
    c.fillStyle = og; c.fillRect(0, 0, W, H);
    if (wavePat) { c.globalAlpha = 0.3; c.fillStyle = wavePat; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }

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

    // Ice Age: the continental shelves come out of the sea as the water drops
    const sl = seaLevel(t);
    const vk = [mode, zoom.toFixed(3), panX | 0, panY | 0, centerLon.toFixed(2), rotL.toFixed(2), rotP.toFixed(2), W, H].join('|');
    if (vk !== shelfKey) { shelfKey = vk; shelfP = {}; reliefP = {}; }
    if (sl < -1 && SHELF_LV.length) {
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
    const lp = landPath(t);
    const L = lctx;
    L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = 'source-over'; L.globalAlpha = 1;
    L.clearRect(0, 0, land.width, land.height);
    L.setTransform(dpr, 0, 0, dpr, 0, 0);
    L.fillStyle = pal.land; L.fill(lp);
    L.globalCompositeOperation = 'source-atop';
    if (mode === 'flat') {
      const yN = latY(89.9), yS = latY(-89.9), g = L.createLinearGradient(0, yN, 0, yS);
      for (let la = 90; la >= -90; la -= 6) g.addColorStop(Math.max(0, Math.min(1, (latY(Math.max(-89.9, Math.min(89.9, la))) - yN) / (yS - yN))), beltColor(la));
      L.fillStyle = g; L.fillRect(0, 0, W, H);
    } else {
      for (let la = 0; la < 86; la += 6) {
        L.fillStyle = beltColor(la + 3);
        L.fill(capPath(false, 90 - la)); L.fill(capPath(true, 90 - la));
      }
    }
    // today's mountains, tinted darker the higher they stand — only while the ranges were where they are now
    const rf = t <= 2.6 ? 1 : t >= 5 ? 0 : (5 - t) / 2.4;
    if (rf > 0 && RELIEF_LV.length) {
      const al = [0.13, 0.16, 0.2];
      RELIEF_LV.forEach((lv, i) => { L.globalAlpha = (al[i] || 0.15) * rf; L.fillStyle = '#5a3610'; L.fill(reliefP[i] || (reliefP[i] = geoP(lv.geo))); });
      L.globalAlpha = 1;
    }
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
    let x = Q(0); x.imageSmoothingQuality = 'low'; x.drawImage(land, 0, 0, qw, qh);            // q0: land silhouette
    x = Q(1); x.fillStyle = '#54300e'; x.fillRect(0, 0, qw, qh);
    x.globalCompositeOperation = 'destination-out'; x.drawImage(q[0], 0, 0);                   // q1: everything but land
    x = Q(2); ring(x, q[1], 0.8 * k4, 0.13); ring(x, q[1], 1.9 * k4, 0.06);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(q[0], 0, 0);                    // q2: inner coastal wash
    x = Q(1); x.drawImage(q[0], 0, 0); x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#e2f6f2'; x.fillRect(0, 0, qw, qh);                                         // q1: pale silhouette
    x = Q(3); ring(x, q[1], 1.1 * k4, 0.12); ring(x, q[1], 2.6 * k4, 0.07);                    // q3: shelf glow

    // shelf glow → ink coastline → land → coastal wash
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = true;
    c.drawImage(q[3], 0, 0, land.width, land.height);
    if (motion && trail && trailLife > 0) { c.save(); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clip(sphere); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 0.7; c.drawImage(trail, 0, 0); c.restore(); }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Plate pieces overlap along their seams, so stroking every piece and
    // then laying the merged land on top leaves ink only on true coasts.
    c.strokeStyle = 'rgba(52,30,10,0.95)'; c.lineWidth = 2.6; c.lineJoin = 'round'; c.stroke(lp);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(land, 0, 0);
    c.drawImage(q[2], 0, 0, land.width, land.height);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    // northern ice sheets of the last 2.6 million years
    if (t <= 2.7) {
      const full = t > 0.0125;                // after the Ice Age only Greenland keeps its sheet
      const k = Math.min(1, (2.7 - t) / 0.2);
      for (const name of full ? ['laurentide', 'eurasian', 'patagonian', 'greenland'] : ['greenland']) {
        const p = geoP(SHEET_GEO[name]);
        c.globalAlpha = (name === 'greenland' ? 0.92 : 0.8) * k; c.fillStyle = '#f3f8fb'; c.fill(p);
        c.globalAlpha = 0.7 * k; c.strokeStyle = 'rgba(110,145,180,0.9)'; c.lineWidth = 0.9; c.setLineDash([3, 3]); c.stroke(p); c.setLineDash([]);
      }
      c.globalAlpha = 1;
    }
    c.restore();                                   // un-clip from the sphere

    // globe shading and rim
    if (mode === 'globe') {
      const sg = c.createRadialGradient(cx - rad * 0.35, cy - rad * 0.4, rad * 0.1, cx, cy, rad);
      sg.addColorStop(0, 'rgba(255,250,235,0.20)'); sg.addColorStop(0.6, 'rgba(255,250,235,0)'); sg.addColorStop(1, 'rgba(30,18,6,0.42)');
      c.fillStyle = sg; c.fill(sphere);
    }
    c.lineWidth = 1.6; c.strokeStyle = 'rgba(58,34,10,0.9)'; c.stroke(sphere);

    drawOverlays(c, t, lp);

    // one sheet of grain over everything
    if (grain) { c.fillStyle = grain; c.fillRect(0, 0, W, H); }
    lastMs = performance.now() - t0;
    drawFx();
    if (api.onDraw) api.onDraw();
  }

  // ── labels and markers ─────────────────────────────────────────────
  const FONT = "'Cinzel','Georgia','Book Antiqua',serif";
  const EMOJI = "system-ui,'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
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
  function onLand(x, y) { return curLand ? ctx.isPointInPath(curLand, x * dpr, y * dpr) : false; }
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
    boxes.length = 0; mboxes.length = 0; hits = []; rings = []; curLand = lp;
    const zs = Math.min(1.5, 0.82 + zoom * 0.18) * Math.max(0.72, Math.min(1.15, W / 900));
    const label = (s, p, size, o, bs = boxes) => {
      const w = s.length * size * (o.wk || 0.74) + 8, h = size * 1.3;
      const x = o.align === 'left' ? p[0] : p[0] - w / 2;
      if (!free(bs, x, p[1] - h / 2, w, h)) return false;
      bs.push([x, p[1] - h / 2, w, h]); text(c, s, p[0], p[1], size, o); return true;
    };
    // continents ride their plates
    for (const L of layers.labels) {
      if (t > L.from || t < L.to) continue;
      const p = project(locate(L.at, t)); if (!p || !inView(p[0], p[1], 10)) continue;
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
      if (t > N.from || t < N.to || seaLevel(t) > -40) continue;
      const p = project([N.lon, N.lat]); if (!p || !inView(p[0], p[1], 10)) continue;
      const size = 9.5 * zs;
      c.beginPath(); c.arc(p[0], p[1], 2.2, 0, 7); c.fillStyle = 'rgba(40,70,60,0.85)'; c.fill();
      label(N.text, [p[0] + 6, p[1]], size, { align: 'left', italic: true, weight: 400, color: '#1f3d33', spacing: 0.4, haloW: 3, wk: 0.6 });
    }
    // places: famous fossil sites and geological features
    for (const P of layers.places) {
      const p = project(locate(P.at, t)); if (!p || !inView(p[0], p[1], 6)) continue;
      const r = 4.2 * zs;
      if (P.icon) {
        c.font = `${Math.round(15 * zs)}px ${EMOJI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000';
        c.fillText(P.icon, p[0], p[1]);
      } else {
        c.save(); c.translate(p[0], p[1]); c.rotate(Math.PI / 4);
        c.fillStyle = P.key === selected ? '#d8421a' : '#8a2b12'; c.strokeStyle = 'rgba(250,236,200,0.95)'; c.lineWidth = 1.2;
        c.fillRect(-r, -r, r * 2, r * 2); c.strokeRect(-r, -r, r * 2, r * 2); c.restore();
      }
      hits.push({ x: p[0], y: p[1], r: r + 7, place: P });
      if (P.key === selected) rings.push([p[0], p[1], r + 5]);
      const size = 10.5 * zs;
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
    const medal = (m, at, strong) => {
      const p = project(locate(at, t)); if (!p || !inView(p[0], p[1], -16)) return;
      const r = (strong ? 1.2 : 1) * R0;
      const q_ = strong ? (mboxes.push([p[0] - r, p[1] - r, r * 2, r * 2]), p) : place(p, r); if (!q_) return;
      if (q_ !== p && (q_[0] !== p[0] || q_[1] !== p[1])) {
        c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(q_[0], q_[1]); c.strokeStyle = 'rgba(60,34,10,0.7)'; c.lineWidth = 1; c.stroke();
        c.beginPath(); c.arc(p[0], p[1], 2, 0, 7); c.fillStyle = 'rgba(60,34,10,0.9)'; c.fill();
      }
      c.beginPath(); c.arc(q_[0], q_[1], r, 0, 7);
      c.fillStyle = strong ? 'rgba(255,246,216,0.98)' : 'rgba(247,233,196,0.92)'; c.fill();
      c.lineWidth = strong ? 2 : 1; c.strokeStyle = strong ? 'rgba(190,60,20,0.95)' : 'rgba(70,40,12,0.8)'; c.stroke();
      c.font = `${Math.round(r * 1.25)}px ${EMOJI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000';
      c.fillText(m.emoji, q_[0], q_[1] + r * 0.08);
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
    for (const m of layers.markers) { if (m === sel) continue; for (const s of m.sites) { if (medal(m, s.at, false)) break; } }
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
  const sparksNow = () => motion ? layers.sparks.filter(sp => time <= sp.from && time >= sp.to) : [];
  function drawFx() {
    const now = performance.now();
    fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.globalAlpha = 1; fctx.globalCompositeOperation = 'source-over'; fctx.clearRect(0, 0, fx.width, fx.height);
    // light on the water: only while someone is exploring, eased in and out, never over land
    const live = motion ? Math.max(0, Math.min(1, (liveUntil - now) / 2500)) : 0;
    if (live > 0 && proj) {
      if (!swell) swell = makeSwell();
      const vk = [mode, zoom.toFixed(3), panX | 0, panY | 0, W, H].join('|');
      if (vk !== sphereKey || !sphereP) { sphereKey = vk; sphereP = geoP({ type: 'Sphere' }); }
      fctx.save(); fctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.clip(sphereP);
      const sec = now / 1000, pat = fctx.createPattern(swell, 'repeat');
      for (const [sx, sy, sc, a] of [[7, 2.2, 1.3, 0.15], [-4.5, 3.1, 0.85, 0.1]]) {
        pat.setTransform(new DOMMatrix([sc, 0, 0, sc, (sec * sx) % (220 * sc), (sec * sy) % (220 * sc)]));
        fctx.globalAlpha = a * live; fctx.fillStyle = pat; fctx.fillRect(0, 0, W, H);
      }
      fctx.restore();
      fctx.setTransform(1, 0, 0, 1, 0, 0); fctx.globalAlpha = 1; fctx.globalCompositeOperation = 'destination-out'; fctx.drawImage(land, 0, 0); fctx.globalCompositeOperation = 'source-over';
    }
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // eruptions glow and breathe; impacts send out rings
    for (const sp of sparksNow()) {
      const p = project(locate(sp.at, time)); if (!p) continue;
      const zs = Math.min(1.8, 0.75 + zoom * 0.25), R = (sp.r || 26) * zs, sec = now / 1000;
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
        const k = (sec / 4) % 1; fctx.beginPath(); fctx.arc(p[0], p[1], R * (0.6 + k * 1.3), 0, 7); fctx.strokeStyle = `rgba(70,50,44,${0.3 * (1 - k)})`; fctx.lineWidth = 5 * (1 - k) + 1; fctx.stroke();   // ash spreading
      }
    }
    if (!rings.length) return;
    const k = (now % 1700) / 1700;
    for (const [x, y, r] of rings) {
      fctx.beginPath(); fctx.arc(x, y, r + 3 + k * 16, 0, 7);
      fctx.strokeStyle = `rgba(200,62,20,${0.8 * (1 - k)})`; fctx.lineWidth = 2; fctx.stroke();
    }
  }

  // ── loop ───────────────────────────────────────────────────────────
  function schedule() { if (!raf) raf = requestAnimationFrame(tick); }
  function tick() {
    raf = 0;
    if (dirty) draw(); else drawFx();
    if (document.hidden) return;
    if (trailLife > 0 && !dirty) dirty = true;                       // keep fading the wake after the land stops
    if (rings.length || trailLife > 0 || (motion && (performance.now() < liveUntil || sparksNow().length))) schedule();
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    for (const cv of [canvas, fx, land, sheet]) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    for (const cv of q) { cv.width = Math.ceil(canvas.width / QS); cv.height = Math.ceil(canvas.height / QS); }
    seabed = null; makePaper(); makePatterns(); setupProjection();
  }

  // ── pointer, wheel and touch ───────────────────────────────────────
  function bind() {
    const pts = new Map(); let moved = 0, downAt = 0, pinch = 0;
    const pos = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.addEventListener('pointerdown', wake); canvas.addEventListener('pointermove', e => { if (performance.now() > liveUntil - 9000) wake(); });
    canvas.addEventListener('pointerdown', e => {
      pts.set(e.pointerId, pos(e)); moved = 0; downAt = performance.now();
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
        if (moved > 4) { api.panBy(dx, dy); canvas.style.cursor = 'grabbing'; }
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch > 0) api.zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d / pinch);
        pinch = d; moved += 10;
      }
    });
    const up = e => {
      const p = pts.get(e.pointerId); pts.delete(e.pointerId); pinch = 0;
      if (p && moved <= 6 && performance.now() - downAt < 600 && e.type === 'pointerup') {
        const h = api.hit(p[0], p[1]);
        if (api.onPick) api.onPick(h, p[0], p[1]);
      }
      canvas.style.cursor = '';
    };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', () => { if (api.onHover) api.onHover(null, 0, 0); });
    canvas.addEventListener('wheel', e => { e.preventDefault(); const p = pos(e); api.zoomAt(p[0], p[1], e.deltaY < 0 ? 1.18 : 1 / 1.18); }, { passive: false });
    canvas.addEventListener('dblclick', e => { const p = pos(e); api.zoomAt(p[0], p[1], 2); });
  }

  // ── public API ─────────────────────────────────────────────────────
  Object.assign(api, {
    MAXT, attach, locate, seaLevel,
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
    setTime(t) { t = Math.max(0, Math.min(MAXT, t)); if (t !== time) { time = t; dirty = true; wake(); schedule(); } },
    /* Decorative motion on or off (tests and screenshots turn it off; so does the reader's reduced-motion setting). */
    setMotion(on) { motion = !!on; api.motion = motion; trailLife = 0; liveUntil = 0; if (tctx) tctx.clearRect(0, 0, trail.width, trail.height); dirty = true; schedule(); },
    motion,
    get mode() { return mode; },
    setMode(m) { mode = m; zoom = 1; panX = panY = 0; setupProjection(); },
    get zoom() { return zoom; },
    zoomAt(x, y, f) {
      const z = Math.max(1, Math.min(mode === 'flat' ? 10 : 5, zoom * f)), k = z / zoom;
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
      const ll = locate(at, time); if (!ll) return;
      if (mode === 'globe') { rotL = -ll[0]; rotP = -Math.max(-70, Math.min(70, ll[1])); applyView(); }
      else if (zoom > 1) { const p = proj(ll); if (p) { panX += W / 2 - p[0]; panY += H / 2 - p[1]; applyView(); } }
    },
    setLayers(l) { Object.assign(layers, l); dirty = true; schedule(); },
    select(key) { if (key !== selected) { selected = key; dirty = true; schedule(); } },
    hit(x, y) { for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (Math.hypot(h.x - x, h.y - y) <= h.r) return h; } return null; },
    redraw() { dirty = true; schedule(); },
    resize,
    stats: () => ({ families: fams.length, polygons: polys.length, ms: lastMs }),
    _draw: draw, _ctx: () => ctx,
  });
  return api;
})();
