// ============================================================
// CREATURES — small animals drawn on the map, seen from the sky
// ============================================================
// Evan, 25 Nov 2026: "a top-down globe view version of some of these animals … charming vector drawn, like the SimCity
// example where you zoom in … mosasaurus swimming in the shoreline, triceratops, all these big megafauna … with
// animations." Each animal is drawn from above as a body plan — a spine that bends, a body whose width follows the
// plan's profile, legs that step in time, a tail or neck that sways, flippers that paddle, wings that beat — in the map's
// own inks. Everything is a function of the arguments (no chance): the map passes the clock.
//
// A plan is a sketch of how that kind of animal is built, seen from above; it is not a reconstruction of one species.
// The page says so ("How this map is made"), draws them far larger than life so they can be seen, and never colours them
// as if their colours were known.
//
//   CREATURES.draw(ctx, plan, x, y, heading, L, phase, opt)
//     plan     a key of CREATURES.PLANS          x, y   centre, in canvas units      heading  radians, 0 = facing +x
//     L        length from snout to tail tip      phase  the gait, in cycles (one stride per 1)
//     opt      { alpha, shadow: true|false, alt: height above the ground for fliers (in L), variant }
const CREATURES = (() => {
  const TAU = Math.PI * 2;
  // profile: [u, half-width] from the snout (u 0) to the tail tip (u 1), as fractions of the length
  // legs:    [u, length, thickness, phase]; feet reach out sideways and swing fore and aft
  // wave:    sway of the spine: tail (walkers), neck (long necks), or a travelling wave (swimmers)
  const PLANS = {
    theropod: { fill: '#6e5236', profile: [[0, .016], [.04, .045], [.1, .066], [.15, .05], [.2, .036], [.3, .075], [.42, .08], [.55, .05], [.75, .022], [1, .004]],
      legs: [[.42, .17, .05, 0], [.42, .17, .05, .5]], arms: [[.27, .055, .022]], gait: 'biped', tail: .035, eyes: .06 },
    ceratopsian: { fill: '#86663f', profile: [[0, .02], [.04, .045], [.09, .07], [.12, .07], [.15, .075], [.22, .085], [.3, .12], [.48, .15], [.62, .115], [.8, .04], [1, .006]],
      frill: [.12, .2],
      legs: [[.31, .12, .055, 0], [.31, .12, .055, .5], [.6, .13, .06, .5], [.6, .13, .06, 0]], gait: 'quad', tail: .02, eyes: .08, horns: 'brow' },
    hadrosaur: { fill: '#7a6040', profile: [[0, .038], [.03, .042], [.06, .024], [.12, .032], [.2, .034], [.3, .095], [.45, .115], [.58, .088], [.78, .035], [1, .005]],
      legs: [[.3, .08, .03, 0], [.3, .08, .03, .5], [.5, .15, .055, .5], [.5, .15, .055, 0]], gait: 'quad', tail: .03, eyes: .07 },
    sauropod: { fill: '#857462', profile: [[0, .012], [.02, .018], [.045, .012], [.3, .022], [.36, .06], [.48, .11], [.6, .1], [.68, .06], [.85, .02], [1, .003]],
      legs: [[.42, .07, .045, 0], [.42, .07, .045, .5], [.6, .075, .05, .5], [.6, .075, .05, 0]], gait: 'quad', tail: .03, neck: .045, eyes: .02 },
    ankylosaur: { fill: '#76603f', profile: [[0, .04], [.07, .07], [.13, .06], [.24, .16], [.44, .185], [.6, .14], [.7, .05], [.9, .022], [.94, .055], [.985, .05], [1, 0]],
      legs: [[.27, .08, .05, 0], [.27, .08, .05, .5], [.58, .09, .055, .5], [.58, .09, .055, 0]], gait: 'quad', tail: .025, eyes: .06, spikes: true },
    stegosaur: { fill: '#7c6743', profile: [[0, .012], [.06, .03], [.15, .034], [.3, .08], [.5, .1], [.62, .08], [.8, .03], [1, .006]],
      legs: [[.3, .08, .035, 0], [.3, .08, .035, .5], [.56, .12, .05, .5], [.56, .12, .05, 0]], gait: 'quad', tail: .03, eyes: .05, plates: true },
    mosasaur: { fill: '#34474e', profile: [[0, .008], [.05, .034], [.12, .045], [.2, .05], [.4, .056], [.6, .04], [.84, .02], [.92, .03], [.97, .02], [1, 0]],
      flippers: [[.21, .085, .03], [.45, .07, .026]], swim: .06, eyes: .07 },
    plesiosaur: { fill: '#3b4d52', profile: [[0, .012], [.035, .02], [.06, .012], [.36, .02], [.44, .08], [.58, .11], [.72, .08], [.84, .03], [1, .004]],
      flippers: [[.47, .17, .045], [.7, .15, .04]], flap: true, swim: .02, neck: .03, eyes: .025 },
    shark: { fill: '#43535a', profile: [[0, .01], [.07, .055], [.25, .09], [.5, .075], [.75, .03], [.86, .016], [.9, .03], [1, .002]],
      flippers: [[.28, .14, .035]], swim: .07, eyes: .05, fin: true },
    ichthyosaur: { fill: '#3a4c52', profile: [[0, .004], [.08, .02], [.16, .06], [.35, .085], [.55, .065], [.8, .022], [.88, .03], [1, .002]],
      flippers: [[.24, .1, .03], [.5, .06, .022]], swim: .06, eyes: .14, fin: true },
    pterosaur: { fill: '#9a7856', profile: [[0, .006], [.1, .02], [.2, .045], [.26, .03], [.34, .06], [.46, .075], [.6, .055], [.72, .02], [.8, .006], [1, 0]],
      wings: [.36, .66], eyes: .2, crest: true },
    proboscidean: { fill: '#6a4b33', profile: [[0, .022], [.05, .026], [.09, .07], [.14, .13], [.2, .12], [.3, .16], [.55, .17], [.76, .12], [.86, .03], [.95, .01], [1, 0]],
      legs: [[.32, .075, .06, 0], [.32, .075, .06, .5], [.68, .08, .065, .5], [.68, .08, .065, 0]], gait: 'quad', tail: .015, eyes: .1, tusks: true, trunk: true },
    croc: { fill: '#5e5a3c', profile: [[0, .014], [.1, .038], [.19, .05], [.3, .09], [.45, .1], [.58, .08], [.8, .03], [1, .004]],
      legs: [[.3, .11, .03, 0], [.3, .11, .03, .5], [.55, .13, .035, .5], [.55, .13, .035, 0]], gait: 'quad', tail: .05, eyes: .1, sprawl: true },
    synapsid: { fill: '#7a5638', profile: [[0, .02], [.08, .05], [.16, .05], [.3, .09], [.48, .1], [.6, .07], [.8, .025], [1, .004]],
      legs: [[.3, .11, .035, 0], [.3, .11, .035, .5], [.56, .12, .04, .5], [.56, .12, .04, 0]], gait: 'quad', tail: .04, eyes: .07, sprawl: true, sail: true },
  };
  const INK = '#2a1a0c';
  const lerpProfile = (pr, u) => { let i = 0; while (i < pr.length - 2 && pr[i + 1][0] < u) i++; const a = pr[i], b = pr[i + 1], k = Math.max(0, Math.min(1, (u - a[0]) / (b[0] - a[0] || 1))); return a[1] + (b[1] - a[1]) * k; };
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(Math.max(0, Math.min(255, f > 0 ? v + (255 - v) * f : v * (1 + f))))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };

  // the spine: points from snout to tail, bent by the sway, with the side direction at each point
  function spine(P, x, y, h, L, phase) {
    const N = 22, fx = Math.cos(h), fy = Math.sin(h), out = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N; let off = 0;
      if (P.swim) off = L * (0.012 + P.swim * u * u) * Math.sin(TAU * phase - u * TAU * 0.9);            // a travelling wave
      if (P.tail) off += L * P.tail * Math.pow(Math.max(0, u - 0.5) / 0.5, 1.6) * Math.sin(TAU * phase * 0.5 + 0.8);
      if (P.neck) off += L * P.neck * Math.pow(Math.max(0, 0.35 - u) / 0.35, 1.4) * Math.sin(TAU * phase * 0.21 + 1.7);
      const s = L * (0.5 - u);
      out.push([x + fx * s - fy * off, y + fy * s + fx * off]);
    }
    return out.map((p, i) => {
      const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)], dx = a[0] - b[0], dy = a[1] - b[1], d = Math.hypot(dx, dy) || 1;
      return { x: p[0], y: p[1], fx: dx / d, fy: dy / d, nx: -dy / d, ny: dx / d, u: i / (out.length - 1) };
    });
  }
  const at = (S, u) => { const f = u * (S.length - 1), i = Math.min(S.length - 2, Math.floor(f)), k = f - i, a = S[i], b = S[i + 1];
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, fx: a.fx, fy: a.fy, nx: a.nx, ny: a.ny }; };

  function outline(c, P, S, L, grow = 0) {
    const pts = S.map(s => [s, lerpProfile(P.profile, s.u) * L + grow]);
    const left = pts.map(([s, w]) => [s.x + s.nx * w, s.y + s.ny * w]), right = pts.map(([s, w]) => [s.x - s.nx * w, s.y - s.ny * w]).reverse();
    const ring = left.concat(right);
    c.beginPath(); c.moveTo((ring[0][0] + ring[ring.length - 1][0]) / 2, (ring[0][1] + ring[ring.length - 1][1]) / 2);
    for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; c.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    c.closePath();
  }
  function limbs(c, P, S, L, phase, col) {
    c.lineCap = 'round'; c.strokeStyle = col;
    for (const [u, len, th, ph] of P.legs || []) {
      const s = at(S, u), side = ph === 0 ? (u < 0.45 ? 1 : -1) : (u < 0.45 ? -1 : 1), w = lerpProfile(P.profile, u) * L;
      const swing = Math.sin(TAU * (phase + ph)), lift = P.gait === 'biped' ? 0.65 : 0.5, out = P.sprawl ? 0.95 : 0.8;
      const hx = s.x + s.nx * side * w * 0.6, hy = s.y + s.ny * side * w * 0.6;
      const kx = hx + s.nx * side * len * L * out + s.fx * len * L * lift * swing, ky = hy + s.ny * side * len * L * out + s.fy * len * L * lift * swing;
      c.lineWidth = Math.max(0.8, th * L); c.beginPath(); c.moveTo(hx, hy);
      if (P.sprawl) { const ex = hx + s.nx * side * len * L * 0.6, ey = hy + s.ny * side * len * L * 0.6; c.lineTo(ex, ey); c.lineTo(kx - s.fx * len * L * 0.2, ky - s.fy * len * L * 0.2); }
      else c.lineTo(kx, ky);
      c.stroke();
      c.fillStyle = col; c.beginPath(); c.arc(kx, ky, Math.max(0.7, th * L * 0.62), 0, TAU); c.fill();   // the foot, down on the ground
    }
    for (const [u, len, th] of P.arms || []) for (const side of [1, -1]) {
      const s = at(S, u), w = lerpProfile(P.profile, u) * L;
      c.lineWidth = Math.max(0.6, th * L); c.beginPath(); c.moveTo(s.x + s.nx * side * w * 0.7, s.y + s.ny * side * w * 0.7);
      c.lineTo(s.x + s.nx * side * (w + len * L * 0.5) + s.fx * len * L * 0.6, s.y + s.ny * side * (w + len * L * 0.5) + s.fy * len * L * 0.6); c.stroke();
    }
  }
  function flippers(c, P, S, L, phase, col) {
    c.fillStyle = col;
    for (const [u, len, th] of P.flippers || []) for (const side of [1, -1]) {
      const s = at(S, u), w = lerpProfile(P.profile, u) * L;
      const beat = P.flap ? 0.55 * Math.sin(TAU * phase + (side > 0 ? 0 : 0)) : 0.18 * Math.sin(TAU * phase + side);
      const ang = Math.atan2(s.ny * side, s.nx * side) + (P.flap ? -0.5 + beat : -0.75 + beat) * side;   // swept back
      const bx = s.x + s.nx * side * w * 0.8, by = s.y + s.ny * side * w * 0.8, ex = bx + Math.cos(ang) * len * L, ey = by + Math.sin(ang) * len * L;
      c.save(); c.translate((bx + ex) / 2, (by + ey) / 2); c.rotate(Math.atan2(ey - by, ex - bx));
      c.beginPath(); c.ellipse(0, 0, len * L / 2, Math.max(0.7, th * L), 0, 0, TAU); c.fill(); c.restore();
    }
    if (P.fin) {                                       // the tail fin, seen from above: a crescent across the tail
      const s = at(S, 0.97), w = L * 0.1;
      c.beginPath(); c.moveTo(s.x + s.nx * w - s.fx * L * 0.04, s.y + s.ny * w - s.fy * L * 0.04); c.quadraticCurveTo(s.x + s.fx * L * 0.02, s.y + s.fy * L * 0.02, s.x - s.nx * w - s.fx * L * 0.04, s.y - s.ny * w - s.fy * L * 0.04);
      c.quadraticCurveTo(s.x - s.fx * L * 0.01, s.y - s.fy * L * 0.01, s.x + s.nx * w - s.fx * L * 0.04, s.y + s.ny * w - s.fy * L * 0.04); c.fill();
    }
  }
  function wings(c, P, S, L, phase, col, span) {
    // from above: the arm runs out and a little forward to the wrist, the long wing finger sweeps back to the tip, and
    // the membrane's trailing edge curves in to the ankle. The beat folds the wings in and out.
    const [u0, u1] = P.wings, a = at(S, u0), b = at(S, u1), beat = 0.72 + 0.28 * Math.cos(TAU * phase);
    for (const side of [1, -1]) {
      const half = span * beat / 2, px = (k, f) => [a.x + a.nx * side * half * k + a.fx * L * f, a.y + a.ny * side * half * k + a.fy * L * f];
      const wrist = px(0.42, 0.16), tip = px(1, -0.3), tr = px(0.62, -0.32), knee = px(0.16, -0.36);
      c.fillStyle = col; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(wrist[0], wrist[1]);
      c.quadraticCurveTo(px(0.75, 0.06)[0], px(0.75, 0.06)[1], tip[0], tip[1]);
      c.quadraticCurveTo(tr[0], tr[1], knee[0], knee[1]); c.quadraticCurveTo(b.x + b.nx * side * L * 0.05, b.y + b.ny * side * L * 0.05, b.x, b.y); c.closePath(); c.fill();
      c.strokeStyle = shade(col, -0.35); c.lineWidth = Math.max(0.6, L * 0.022); c.lineCap = 'round';      // the arm and the wing finger
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(wrist[0], wrist[1]); c.quadraticCurveTo(px(0.75, 0.06)[0], px(0.75, 0.06)[1], tip[0], tip[1]); c.stroke();
    }
  }
  function extras(c, P, S, L, phase, col, ink, opt) {
    c.lineCap = 'round';
    const head = at(S, 0.05), fx = head.fx, fy = head.fy;
    if (P.horns) {                                      // brow horns forward from above the eyes; a short nose horn
      c.strokeStyle = '#e8dcc0'; c.lineWidth = Math.max(0.7, L * 0.016);
      const centro = opt.variant === 'nose', s = at(S, 0.1), w = lerpProfile(P.profile, 0.1) * L * 0.55;
      if (!centro) for (const side of [1, -1]) { c.beginPath(); c.moveTo(s.x + s.nx * side * w, s.y + s.ny * side * w); c.lineTo(s.x + s.nx * side * w * 1.25 + fx * L * 0.11, s.y + s.ny * side * w * 1.25 + fy * L * 0.11); c.stroke(); }
      const n = at(S, 0.02); c.beginPath(); c.moveTo(n.x, n.y); c.lineTo(n.x + fx * L * (centro ? 0.09 : 0.035), n.y + fy * L * (centro ? 0.09 : 0.035)); c.stroke();
    }
    if (P.frill) {                                      // the frill: a shield behind the head, over the neck
      const [u, w] = P.frill, f = at(S, u), fw = w * L, back = L * 0.13;
      c.fillStyle = shade(col, 0.16); c.strokeStyle = ink; c.lineWidth = Math.max(0.5, L * 0.01);
      c.beginPath(); c.moveTo(f.x + f.nx * fw * 0.55 + f.fx * L * 0.03, f.y + f.ny * fw * 0.55 + f.fy * L * 0.03);
      c.quadraticCurveTo(f.x + f.nx * fw * 1.05 - f.fx * back * 0.2, f.y + f.ny * fw * 1.05 - f.fy * back * 0.2, f.x + f.nx * fw * 0.6 - f.fx * back, f.y + f.ny * fw * 0.6 - f.fy * back);
      c.quadraticCurveTo(f.x - f.fx * back * 1.5, f.y - f.fy * back * 1.5, f.x - f.nx * fw * 0.6 - f.fx * back, f.y - f.ny * fw * 0.6 - f.fy * back);
      c.quadraticCurveTo(f.x - f.nx * fw * 1.05 - f.fx * back * 0.2, f.y - f.ny * fw * 1.05 - f.fy * back * 0.2, f.x - f.nx * fw * 0.55 + f.fx * L * 0.03, f.y - f.ny * fw * 0.55 + f.fy * L * 0.03);
      c.closePath(); c.fill(); c.stroke();
    }
    if (P.plates) {                                     // two rows of plates, staggered, along the back; spikes at the tail
      for (let i = 0; i < 11; i++) { const u = 0.17 + i * 0.055, s = at(S, u), side = i % 2 ? 1 : -1, r = L * (0.05 - Math.abs(u - 0.44) * 0.07);
        if (r <= 0) continue;
        const ox = s.nx * side * L * 0.012, oy = s.ny * side * L * 0.012;
        c.beginPath(); c.moveTo(s.x + ox + s.fx * r, s.y + oy + s.fy * r); c.lineTo(s.x + ox + s.nx * side * r * 0.75, s.y + oy + s.ny * side * r * 0.75); c.lineTo(s.x + ox - s.fx * r, s.y + oy - s.fy * r); c.closePath();
        c.fillStyle = shade(col, -0.3); c.fill(); c.strokeStyle = shade(col, 0.35); c.lineWidth = Math.max(0.4, L * 0.006); c.stroke(); }
      c.strokeStyle = '#e8dcc0'; c.lineWidth = Math.max(0.6, L * 0.01);
      for (const side of [1, -1]) for (const u of [0.92, 0.97]) { const s = at(S, u); c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x + s.nx * side * L * 0.06 - s.fx * L * 0.03, s.y + s.ny * side * L * 0.06 - s.fy * L * 0.03); c.stroke(); }
    }
    if (P.spikes) {                                     // spikes round the armour's edge
      c.fillStyle = shade(col, -0.3);
      for (let i = 0; i < 7; i++) for (const side of [1, -1]) { const u = 0.26 + i * 0.06, s = at(S, u), w = lerpProfile(P.profile, u) * L;
        c.beginPath(); c.arc(s.x + s.nx * side * w * 0.95, s.y + s.ny * side * w * 0.95, L * 0.012, 0, TAU); c.fill(); }
      c.fillStyle = shade(col, -0.15); for (let i = 0; i < 5; i++) { const s = at(S, 0.3 + i * 0.07); c.beginPath(); c.arc(s.x, s.y, L * 0.014, 0, TAU); c.fill(); }
    }
    if (P.sail) {                                       // the sail, seen from above: a ridge of spines down the back
      c.strokeStyle = shade(col, -0.35); c.lineWidth = Math.max(0.8, L * 0.02);
      c.beginPath(); for (let i = 0; i <= 10; i++) { const s = at(S, 0.25 + i * 0.035); i ? c.lineTo(s.x, s.y) : c.moveTo(s.x, s.y); } c.stroke();
    }
    if (P.tusks) {
      c.strokeStyle = '#efe6cf'; c.lineWidth = Math.max(0.8, L * 0.02);
      const s = at(S, 0.08);
      for (const side of [1, -1]) { c.beginPath(); c.moveTo(s.x + s.nx * side * L * 0.03, s.y + s.ny * side * L * 0.03);
        c.quadraticCurveTo(s.x + s.nx * side * L * 0.09 + fx * L * 0.08, s.y + s.ny * side * L * 0.09 + fy * L * 0.08, s.x + s.nx * side * L * 0.04 + fx * L * 0.15, s.y + s.ny * side * L * 0.04 + fy * L * 0.15); c.stroke(); }
    }
    if (P.trunk) {
      const s = at(S, 0.02), sw = Math.sin(TAU * phase * 0.4) * L * 0.04;
      c.strokeStyle = col; c.lineWidth = Math.max(0.8, L * 0.03);
      c.beginPath(); c.moveTo(s.x, s.y); c.quadraticCurveTo(s.x + fx * L * 0.06, s.y + fy * L * 0.06, s.x + fx * L * 0.1 + head.nx * sw, s.y + fy * L * 0.1 + head.ny * sw); c.stroke();
    }
    if (P.crest) {                                      // a crest swept back from the head
      const s = at(S, 0.18); c.strokeStyle = shade(col, -0.2); c.lineWidth = Math.max(0.6, L * 0.02);
      c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x - s.fx * L * 0.12, s.y - s.fy * L * 0.12); c.stroke();
    }
    if (P.eyes) {                                       // two dark eyes, one each side of the head
      const s = at(S, P.eyes), w = lerpProfile(P.profile, P.eyes) * L * 0.62, r = Math.max(0.55, L * 0.011);
      c.fillStyle = '#1a1008'; for (const side of [1, -1]) { c.beginPath(); c.arc(s.x + s.nx * side * w, s.y + s.ny * side * w, r, 0, TAU); c.fill(); }
    }
  }

  function draw(c, plan, x, y, h, L, phase, opt = {}) {
    const P = PLANS[plan]; if (!P || L < 2) return;
    const col = opt.fill || P.fill, dark = shade(col, -0.32), alpha = opt.alpha == null ? 1 : opt.alpha;
    const S = spine(P, x, y, h, L, phase), span = (opt.span || 2.3) * L;
    c.save(); c.globalAlpha = alpha;
    if (opt.shadow !== false) {                         // a soft shadow on the ground, the light from the upper left
      const alt = P.wings ? (opt.alt == null ? 1.6 : opt.alt) : 0.06;
      c.save(); c.translate(L * alt * 0.55, L * alt * 0.8); c.globalAlpha = alpha * (P.wings ? 0.16 : 0.24);
      const sh = '#1e140a'; if (P.wings) wings(c, P, S, L, phase, sh, span); limbs(c, P, S, L, phase, sh); flippers(c, P, S, L, phase, sh);
      c.fillStyle = sh; outline(c, P, S, L); c.fill(); c.restore();
    }
    if (P.swim && opt.wake !== false) {                 // a swimmer's wake: pale ripples spreading back from the head
      const hd = S[0], tl = S[S.length - 1];
      c.strokeStyle = 'rgba(240,248,250,0.5)'; c.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const back = L * (0.35 + k * 0.4), spread = L * (0.12 + k * 0.16), bx = tl.x - tl.fx * back * 0.6, by = tl.y - tl.fy * back * 0.6;
        c.globalAlpha = alpha * (0.75 - k * 0.22); c.lineWidth = Math.max(0.6, L * (0.02 - k * 0.005));
        for (const side of [1, -1]) { c.beginPath(); c.moveTo(hd.x + hd.nx * side * L * 0.03, hd.y + hd.ny * side * L * 0.03);
          c.quadraticCurveTo(hd.x - hd.fx * L * 0.5 + hd.nx * side * spread, hd.y - hd.fy * L * 0.5 + hd.ny * side * spread, bx + tl.nx * side * spread * 1.6, by + tl.ny * side * spread * 1.6); c.stroke(); }
      }
      c.globalAlpha = alpha;
    }
    if (P.wings) wings(c, P, S, L, phase, shade(col, 0.12), span);
    limbs(c, P, S, L, phase, dark); flippers(c, P, S, L, phase, dark);
    outline(c, P, S, L); c.fillStyle = col; c.fill();
    c.strokeStyle = P.swim ? 'rgba(225,238,240,0.9)' : INK; c.lineWidth = Math.max(0.5, L * (P.swim ? 0.016 : 0.012)); c.stroke();
    // light along the back: the body reads as round, not flat
    c.strokeStyle = shade(col, 0.28); c.globalAlpha = alpha * 0.55; c.lineCap = 'round';
    c.lineWidth = Math.max(0.6, lerpProfile(P.profile, 0.45) * L * 0.7);
    c.beginPath(); for (let i = 4; i < S.length - 5; i++) { const s = S[i], o = lerpProfile(P.profile, s.u) * L * 0.18; i > 4 ? c.lineTo(s.x + s.nx * o, s.y + s.ny * o) : c.moveTo(s.x + s.nx * o, s.y + s.ny * o); } c.stroke();
    c.globalAlpha = alpha;
    extras(c, P, S, L, phase, col, INK, opt);
    c.restore();
  }
  return { PLANS, draw };
})();
if (typeof module !== 'undefined') module.exports = { CREATURES };
