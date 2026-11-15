// ============================================================
// APP
// ============================================================
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ── kinds of animal ─────────────────────────────────────────────────
const TYPES = {
  dino: ['🦖', 'Dinosaurs'], bird: ['🐦', 'Birds'], ptero: ['🪶', 'Pterosaurs'], marine: ['🌊', 'Sea reptiles'],
  croc: ['🐊', 'Crocodile line'], reptile: ['🦎', 'Reptiles'], synapsid: ['🦴', 'Proto-mammals'], mammal: ['🐘', 'Mammals'],
  hominin: ['🧍', 'Human family'], amphib: ['🐸', 'Amphibians'], fish: ['🐟', 'Fishes'], invert: ['🦐', 'Invertebrates'],
  plant: ['🌿', 'Plants & fungi'], micro: ['🦠', 'Microbes'],
};
const TYPE_ORDER = Object.keys(TYPES);
const DIET = { herb: '🌿 Plant-eater', carn: '🥩 Meat-eater', omni: '🍖 Eats both', pred: '⚡ Predator', filter: '💧 Filter feeder' };

// ── index every animal ──────────────────────────────────────────────
const ALL = [], BY_KEY = {};
PERIODS.forEach(p => p.creatures.forEach(c => { c.key = slug(c.name); c.home = p; ALL.push(c); }));
HOMININS.forEach(h => {
  ALL.push({ key: h.id, name: h.name, nick: h.nick, emoji: h.emoji, diet: h.diet, size: h.height, habitat: h.habitat, lived: h.lived,
    fact: h.fact, know: h.know, t: h.t, g: 'hominin', c: HOMININ_LINEAGE[h.group], sites: h.sites, hom: h });
});
ALL.forEach(c => {
  BY_KEY[c.key] = c; c.path = c.c.split(' › ');
  // largest length mentioned in the size text, in metres — good enough to sort by
  let best = NaN; const re = /(\d+(?:\.\d+)?)\s*(?:[–-]\s*(\d+(?:\.\d+)?)\s*)?(mm|cm|meters?|metres?|m)\b/gi; let m;
  while ((m = re.exec(c.size || ''))) { const v = Math.max(+m[1], +(m[2] || 0)) * (/^mm/i.test(m[3]) ? 0.001 : /^cm/i.test(m[3]) ? 0.01 : 1); if (!(v <= best)) best = v; }
  c.len = best;
  c.search = (c.name + ' ' + (c.nick || '') + ' ' + c.c + ' ' + (c.means || '')).toLowerCase();
});
const sitesOf = c => c._s || (c._s = (c.sites || []).map(([la, lo, label]) => ({ at: WorldMap.attach(la, lo, Math.min(c.t[0], (c.t[0] + c.t[1]) / 2 + 1)), label })));

// ── time ────────────────────────────────────────────────────────────
const T_MAX = 720, MIN_SPAN = 0.02;
// The "storybook" scale used when the whole of time is in view: recent time
// is stretched, or the last few million years would be one pixel wide.
const STORY = [[0, 720], [50, 539], [220, 359], [360, 252], [660, 66], [820, 7], [940, 0.3], [985, 0.0117], [1000, 0]];
function storyTime(u) {
  u = clamp(u, 0, 1000);
  for (let i = 0; i < STORY.length - 1; i++) { const [u0, t0] = STORY[i], [u1, t1] = STORY[i + 1]; if (u <= u1) return t0 + (u - u0) / (u1 - u0) * (t1 - t0); }
  return 0;
}
function storyPos(t) {
  t = clamp(t, 0, T_MAX);
  for (let i = 0; i < STORY.length - 1; i++) { const [u0, t0] = STORY[i], [u1, t1] = STORY[i + 1]; if (t >= t1) return u0 + (t0 - t) / (t0 - t1) * (u1 - u0); }
  return 1000;
}
const tidy = t => { if (t <= 0) return 0; const m = Math.pow(10, 3 - Math.floor(Math.log10(t))); return Math.round(t * m) / m; };

const S = { t: 150, weird: false, period: null, tab: 'life', sel: null, scope: 'now', type: 'all', branch: 'all', sort: 'old', q: '', win: [T_MAX, 0], playing: false };
const isFull = () => S.win[0] >= T_MAX - 1e-6 && S.win[1] <= 1e-9;
const span = () => S.win[0] - S.win[1];
// position (0..1) across the detail timeline ⇄ time. Linear once zoomed in.
const posOf = t => isFull() ? storyPos(t) / 1000 : clamp((S.win[0] - t) / span(), 0, 1);
const timeAt = x => { x = clamp(x, 0, 1); return isFull() ? storyTime(x * 1000) : S.win[0] - x * span(); };

function getPeriod(t) {
  for (const p of PERIODS) if (t <= p.start && t >= p.end) return p;
  return t > PERIODS[0].start ? PERIODS[0] : PERIODS[PERIODS.length - 1];
}
function divAt(t, rank) { for (const d of DIVS) if (d[3] === rank && t <= d[1] && t > d[2]) return d[0]; return ''; }
const years = n => n.toLocaleString('en-US');
function fmtAgo(t) {
  if (t < 0.00005) return 'Today';
  const sp = span();
  if (t < 0.02) return years(Math.round(t * 1e6 / 100) * 100) + ' years ago';
  if (t < 1) return years(sp < 0.3 ? Math.round(t * 1e4) * 100 : Math.round(t * 1000) * 1000) + ' years ago';
  if (t < 10) return (sp < 3 ? t.toFixed(2) : t.toFixed(1)) + ' MYA';
  return (sp < 40 ? t.toFixed(1) : String(Math.round(t))) + ' MYA';
}
const fmtBound = t => t === 0 ? 'today' : t < 0.1 ? years(Math.round(t * 1e6)) + ' years ago' : t < 10 ? t + ' million' : String(t);
// a time written out in full: "2.58 million years ago", "11,700 years ago", "today"
const fmtLong = t => t <= 1e-9 ? 'today' : t < 1 ? years(Math.round(t * 1e6 / 100) * 100) + ' years ago' : tidy(t) + ' million years ago';
function fmtTick(t, step) {
  if (t <= 1e-9) return 'today';
  if (step >= 1) return Math.round(t) + ' M';
  if (step >= 0.1) return (Math.round(t * 10) / 10) + ' M';
  if (t >= 1) return (Math.round(t * 100) / 100) + ' M';
  const k = t * 1000; return (step >= 0.001 ? Math.round(k) : Math.round(k * 10) / 10) + 'k';
}
// how much time a few pixels of timeline cover here — the slack allowed when asking "was it alive now?"
function slack(t) {
  const w = $('rowPeriods').clientWidth || 800, x = posOf(t);
  return Math.max(Math.abs(timeAt(Math.min(1, x + 2 / w)) - timeAt(Math.max(0, x - 2 / w))) / 2, t * 0.0015);
}
const alive = (c, t, pad = slack(t)) => t <= c.t[0] + pad && t >= c.t[1] - pad;
const inPeriod = (c, p) => c.home === p || (!c.home && c.t[0] > p.end && c.t[1] < p.start);

// ── the clock: everything that follows the time cursor ─────────────
let lastAliveKey = '', panelTimer = 0, hashTimer = 0, tween = 0, lastSub = '';
function setTime(t, o = {}) {
  t = clamp(tidy(t), 0, T_MAX); S.t = t;
  WorldMap.setTime(t);
  const p = getPeriod(t), changed = p !== S.period;
  if (changed) { S.period = p; renderPeriod(); }
  updateClock(o.fromSlider);
  const now = ALL.filter(c => alive(c, t));
  const key = now.map(c => c.key).join('|');
  if (key !== lastAliveKey || changed) {
    lastAliveKey = key;
    if (S.sel && BY_KEY[S.sel] && !tween && !now.includes(BY_KEY[S.sel])) { S.sel = null; WorldMap.select(null); }
    updateMarkers(now);
    schedulePanel(o.fast ? 140 : 0);
  }
  if (S.tab === 'humans') {
    updateHumansCursor();
    const ck = CULTURES.filter(c => culActive(c)).map(c => c.id).join('|');
    if (ck !== lastCulKey) { lastCulKey = ck; updatePlaces(); document.querySelectorAll('.cul-item').forEach(el => el.classList.toggle('now', ck.split('|').includes(el.dataset.cul))); }
  }
  clearTimeout(hashTimer); hashTimer = setTimeout(writeHash, 350);
}
function updateClock(fromSlider) {
  const t = S.t, p = S.period;
  $('myaDisplay').textContent = fmtAgo(t);
  $('ctDate').textContent = fmtAgo(t).toUpperCase();
  if (!fromSlider) $('timeSlider').value = Math.round(posOf(t) * 10000);
  $('timeSlider').setAttribute('aria-valuetext', p.name + ', ' + fmtAgo(t));
  $('ovCursor').style.left = storyPos(t) / 10 + '%';
  const ep = divAt(t, 1), ag = divAt(t, 2), sub = p.id + '|' + ep + '|' + ag;
  if (sub !== lastSub) {
    lastSub = sub;
    $('periodEraLabel').innerHTML = esc(p.era) + (ep ? ' · <b>' + esc(ep) + '</b>' : '') + (ag ? ' · ' + esc(ag) : '');
    document.querySelectorAll('#tlDetail .tb').forEach(el => el.classList.toggle('cur', t <= +el.dataset.s && t > +el.dataset.e - 1e-9));
  }
}
function renderPeriod() {
  const p = S.period;
  $('eraBadge').textContent = p.era;
  $('periodName').innerHTML = esc(p.title || p.name + ' Period') + (p.title ? '<small>' + esc(p.name) + '</small>' : '');
  $('periodName').style.color = p.textColor;
  $('periodInfo').style.borderLeftColor = p.color;
  $('periodYears').textContent = p.end === 0 ? fmtLong(p.start) + ' – today'
    : p.end < 0.1 ? p.start + ' million – ' + fmtLong(p.end) : p.start + ' – ' + p.end + ' million years ago';
  $('periodDesc').textContent = p.desc;
  $('ctTitle').textContent = p.mapTitle || 'The ' + p.name + ' World';
  const rib = $('eventsRibbon');
  rib.classList.toggle('hidden', !p.event);
  if (p.event) { $('eventIcon').textContent = p.eventIcon || '💥'; $('eventText').textContent = p.event; }
  updatePlaces();
}

// ── what the map shows ──────────────────────────────────────────────
const typeOK = c => (S.type === 'all' || c.g === S.type) && (S.branch === 'all' || c.path[1] === S.branch) && (!S.weird || c.weird);
function updateMarkers(now) {
  now = now || ALL.filter(c => alive(c, S.t));
  WorldMap.setLayers({ markers: now.filter(c => typeOK(c) && c.sites && c.sites.length).map(c => ({ key: c.key, emoji: c.emoji, name: c.name, sites: sitesOf(c) })) });
}
const placeCache = {};
// cultures shown at the current moment: active now, with a little give so short-lived ones can be found
const CUL = Object.fromEntries(CULTURES.map(c => [c.id, c]));
const culActive = (c, t = S.t) => t <= c.t[0] * 1.06 + Math.max(0.0002, slack(t)) && t >= c.t[1] * 0.94 - Math.max(0.0002, slack(t));
const fmtYearsAgo = t => t <= 1e-9 ? 'today' : t >= 1 ? t + ' million years ago' : years(Math.round(t * 1e6 / 100) * 100) + ' years ago';
let lastCulKey = '';
function updatePlaces() {
  const p = S.period; let places = [];
  const mid = (p.start + p.end) / 2;
  if (S.tab === 'insights') places = SITES.filter(s => s[3].includes(p.id)).map(s => placeCache['s' + s[0] + p.id] || (placeCache['s' + s[0] + p.id] = { key: 'site:' + slug(s[0]), name: s[0], note: s[4], at: WorldMap.attach(s[1], s[2], mid) }));
  else if (S.tab === 'humans') places = CULTURES.filter(c => culActive(c)).flatMap(c => c.sites.map((s, i) => placeCache['c' + c.id + i] || (placeCache['c' + c.id + i] = { key: 'cul:' + c.id, name: s[2].split(/,| —/)[0], note: c.name, icon: c.icon, at: WorldMap.attach(s[0], s[1], (c.t[0] + c.t[1]) / 2) })));
  else if (S.tab === 'geo') places = GEO_FEATURES.filter(f => f.at && f.periods.includes(p.id)).map(f => placeCache['g' + f.id + p.id] || (placeCache['g' + f.id + p.id] = { key: 'geo:' + f.id, name: f.name, note: f.shortDesc, icon: f.icon, at: WorldMap.attach(f.at[0], f.at[1], mid) }));
  WorldMap.setLayers({ places });
}

// ── selecting things ────────────────────────────────────────────────
function select(key, o = {}) {
  if (key === S.sel && !o.keep) key = null;
  S.sel = key; WorldMap.select(key);
  const c = key && BY_KEY[key];
  if (c) {
    const look = () => { const s = sitesOf(c)[0]; if (s) WorldMap.lookAt(s.at); };
    if (!alive(c, S.t)) {
      let a = c.t[0], b = c.t[1];
      if (c.home) { a = Math.min(a, c.home.start); b = Math.max(b, c.home.end); if (a < b) { a = c.t[0]; b = c.t[1]; } }
      goTo(tidy((a + b) / 2), look);
    } else look();
    if (o.fromMap) {
      if (!(S.tab === 'humans' && c.hom) && S.tab !== 'life') switchTab('life');
      if (window.innerWidth < 768) showFact(c.emoji, '<b>' + esc(c.name) + '</b> — ' + esc(c.fact));
    }
  }
  updateMarkers(); schedulePanel(0);
  clearTimeout(hashTimer); hashTimer = setTimeout(writeHash, 350);
  if (c && S.tab === 'life') setTimeout(() => { const el = document.querySelector('#lifeList [data-key="' + key + '"].active'); if (el && window.innerWidth >= 768) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60);
}
function selectPlace(key, at, icon, html) {
  S.sel = S.sel === key ? null : key; WorldMap.select(S.sel);
  if (S.sel) { WorldMap.lookAt(at); if (html) showFact(icon, html); }
  document.querySelectorAll('.site,.geo-card').forEach(el => el.classList.toggle('sel', el.dataset.key === S.sel));
}

// ── moving through time ─────────────────────────────────────────────
function cancelTween() { if (tween) { cancelAnimationFrame(tween); tween = 0; } }
function goTo(t, done) {
  stopPlay(); cancelTween();
  t = clamp(t, 0, T_MAX);
  if (!isFull() && (t > S.win[0] || t < S.win[1])) { const sp = span(), a = clamp(t + sp / 2, sp, T_MAX); setWindow(a, a - sp, true); }
  const s0 = storyPos(S.t), s1 = storyPos(t), dur = clamp(Math.abs(s1 - s0) * 4.5, 300, 1700), t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    if (k >= 1) { tween = 0; setTime(t); if (done) done(); return; }
    setTime(storyTime(s0 + (s1 - s0) * e), { fast: true });
    tween = requestAnimationFrame(step);
  };
  tween = requestAnimationFrame(step);
}
let playRaf = 0;
function stopPlay() { if (!S.playing) return; S.playing = false; cancelAnimationFrame(playRaf); $('playBtn').textContent = '▶ Play'; schedulePanel(0); }
function startPlay() {
  cancelTween();
  let x = posOf(S.t); if (x > 0.998) x = 0;
  S.playing = true; $('playBtn').textContent = '⏸ Pause';
  let last = performance.now(); const dur = isFull() ? 110 : 50;
  const step = now => {
    if (!S.playing) return;
    x += Math.min(0.1, (now - last) / 1000) / dur; last = now;
    if (x >= 1) { setTime(S.win[1]); stopPlay(); return; }
    setTime(timeAt(x), { fast: true });
    playRaf = requestAnimationFrame(step);
  };
  playRaf = requestAnimationFrame(step);
}
function jumpPeriod(dir) {
  const i = PERIODS.indexOf(S.period), n = PERIODS[clamp(i + dir, 0, PERIODS.length - 1)];
  if (n && n !== S.period) goTo(tidy((n.start + n.end) / 2));
}

// ── the zoomable timeline ───────────────────────────────────────────
const PRESETS = [['All time', T_MAX, 0], ['Paleozoic', 539, 252], ['Age of Dinosaurs', 252, 66], ['Age of Mammals', 66, 0],
  ['Last 10 million years', 10, 0], ['Last million years', 1, 0], ['Last 100,000 years', 0.1, 0]];
const ABBR = { cryogenian: 'Cryo', ediacaran: 'Edi', cambrian: 'Cam', ordovician: 'Ord', silurian: 'Sil', devonian: 'Dev', carboniferous: 'Carb', permian: 'Perm',
  triassic: 'Tri', jurassic: 'Jur', cretaceous: 'Cret', paleogene: 'Pg', neogene: 'Ng', quaternary: 'Q', holocene: 'H' };
function setWindow(a, b, keepTime) {
  a = Math.min(a, T_MAX); b = Math.max(b, 0);
  if (a - b < MIN_SPAN) { const m = (a + b) / 2; a = Math.min(T_MAX, m + MIN_SPAN / 2); b = Math.max(0, a - MIN_SPAN); a = b + MIN_SPAN; }
  if (a - b > T_MAX * 0.97) { a = T_MAX; b = 0; }
  S.win = [a, b];
  renderTimeline();
  if (!keepTime && (S.t > a || S.t < b)) setTime(clamp(S.t, b, a)); else { lastSub = ''; updateClock(); }
  if (S.scope === 'view') schedulePanel(60);
}
function zoomAbout(tA, x, f) {
  if (isFull() && f > 1) return;
  const sp = clamp(span() * f, MIN_SPAN, T_MAX);
  if (sp > T_MAX * 0.97) return setWindow(T_MAX, 0);
  let a = tA + x * sp, b = a - sp;
  if (a > T_MAX) { a = T_MAX; b = a - sp; } if (b < 0) { b = 0; a = sp; }
  setWindow(a, b);
}
function renderTimeline() {
  const W = $('rowPeriods').clientWidth || 800, sp = span(), full = isFull();
  const block = (name, s, e, color, abbr) => {
    const x0 = posOf(Math.min(s, S.win[0])), x1 = posOf(Math.max(e, S.win[1]));
    if (s <= S.win[1] || e >= S.win[0] || x1 - x0 <= 0) return '';
    const px = (x1 - x0) * W, lab = name.length * 6.1 + 8 <= px ? name : abbr && abbr.length * 6.1 + 6 <= px ? abbr : '';
    return `<div class="tb" data-s="${s}" data-e="${e}" title="${esc(name)}" style="left:${(x0 * 100).toFixed(3)}%;width:${((x1 - x0) * 100).toFixed(3)}%;background:${color}">${esc(lab)}</div>`;
  };
  $('rowPeriods').innerHTML = PERIODS.map(p => block(p.name, p.start, p.end, p.color, ABBR[p.id])).join('');
  const shade = (rank, a1, a2) => DIVS.filter(d => d[3] === rank).map((d, i) => {
    const p = getPeriod((d[1] + d[2]) / 2);
    return block(d[0], d[1], d[2], `color-mix(in srgb, ${p.color} ${i % 2 ? a1 : a2}%, #0b1020)`, d[0].replace(/^(Early|Middle|Late) .*/, '$1'));
  }).join('');
  $('rowEpochs').innerHTML = shade(1, 62, 78);
  const ages = !full && W / sp * 4 >= 30;
  $('rowAges').classList.toggle('show', ages); $('timeSlider').classList.toggle('ages', ages);
  $('rowAges').innerHTML = ages ? shade(2, 44, 58) : '';
  // ticks
  let ticks = [];
  if (full) ticks = [700, 635, 539, 487, 443, 420, 359, 299, 252, 201, 143, 66, 23, 2.58, 0].map(t => [t, t === 0 ? 'today' : t + ' M']);
  else {
    const want = sp / Math.max(3, W / 84), steps = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001, 0.0005];
    let st = steps[0]; for (const s of steps) if (s >= want) st = s;
    for (let t = Math.floor(S.win[0] / st + 1e-9) * st; t >= S.win[1] - 1e-9; t -= st) ticks.push([Math.max(0, t), fmtTick(Math.max(0, t), st)]);
  }
  let lastX = -99, firstX = 1e9;                       // ticks run left to right; skip any that would collide
  $('tlTicks').innerHTML = ticks.map(([t, lab]) => { const x = posOf(t) * W; if (x < lastX + 44 || x < 10 || x > W - 14) return ''; lastX = x; firstX = Math.min(firstX, x); return `<span class="tk" style="left:${(x / W * 100).toFixed(2)}%">${lab}</span>`; }).join('')
    + (firstX > 110 ? `<span class="tk" style="left:0;transform:none;color:#5f6c85">${full ? 'million years ago →' : 'M = million years ago →'}</span>` : '');
  // events: more of them the further in you zoom
  const maxLevel = full ? 2 : sp > 300 ? 2 : sp > 60 ? 3 : sp > 6 ? 4 : 5;
  const evs = EVENTS.filter(e => e[1] <= maxLevel && e[0] <= S.win[0] && e[0] >= S.win[1]).sort((a, b) => a[1] - b[1] || b[0] - a[0]);
  const taken = [], placed = [];
  const clear = (x0, x1) => !taken.some(([a, b]) => x0 < b && x1 > a);
  for (const e of evs) { const x = clamp(posOf(e[0]) * W, 8, W - 8); if (clear(x - 9, x + 9)) { taken.push([x - 9, x + 9]); placed.push({ e, x, lab: false }); } }
  for (const p of placed) { const w = p.e[3].length * 5.7 + 10; if (p.x + 10 + w < W && clear(p.x + 9.5, p.x + 10 + w)) { taken.push([p.x + 9.5, p.x + 10 + w]); p.lab = true; } }
  $('tlEvents').innerHTML = placed.map(p => `<button class="ev${p.e[1] === 1 ? ' big' : ''}${p.lab ? ' lab' : ''}" data-ev="${EVENTS.indexOf(p.e)}" style="left:${(p.x / W * 100).toFixed(2)}%" title="${esc(p.e[3])} — ${esc(fmtLong(p.e[0]))}">${p.e[2]}${p.lab ? '<b>' + esc(p.e[3]) + '</b>' : ''}</button>`).join('');
  // overview
  $('ovBlocks').innerHTML = PERIODS.map(p => `<div class="ovb" style="left:${storyPos(p.start) / 10}%;width:${(storyPos(p.end) - storyPos(p.start)) / 10}%;background:${p.color}"></div>`).join('');
  const b = $('ovBrush'); b.style.left = storyPos(S.win[0]) / 10 + '%'; b.style.width = (storyPos(S.win[1]) - storyPos(S.win[0])) / 10 + '%';
  b.classList.toggle('full', full);
  $('tlOut').disabled = full; $('tlIn').disabled = sp <= MIN_SPAN * 1.01;
  document.querySelectorAll('#tlPresets .chip').forEach((el, i) => el.classList.toggle('on', Math.abs(PRESETS[i][1] - S.win[0]) < 1e-6 && Math.abs(PRESETS[i][2] - S.win[1]) < 1e-9));
  $('timelineHint').textContent = full ? 'Drag to travel through time · scroll or pinch on the timeline to zoom in · or pick a range above'
    : 'Showing ' + fmtLong(S.win[0]) + ' → ' + fmtLong(S.win[1]) + ' · drag the white window above to move along';
}
function bindTimeline() {
  $('tlPresets').innerHTML = PRESETS.map((p, i) => `<button class="chip" data-i="${i}">${p[0]}</button>`).join('');
  $('tlPresets').addEventListener('click', e => { const el = e.target.closest('.chip'); if (!el) return; stopPlay(); cancelTween(); const p = PRESETS[+el.dataset.i]; setWindow(p[1], p[2]); });
  $('tlIn').onclick = () => zoomAbout(S.t, posOf(S.t), 0.5);
  $('tlOut').onclick = () => zoomAbout(S.t, posOf(S.t), 2);
  const sl = $('timeSlider');
  sl.addEventListener('input', () => { stopPlay(); cancelTween(); setTime(timeAt(sl.value / 10000), { fast: true, fromSlider: true }); });
  sl.addEventListener('change', () => schedulePanel(0));
  const det = $('tlDetail'), xIn = cx => { const r = $('rowPeriods').getBoundingClientRect(); return clamp((cx - r.left) / r.width, 0, 1); };
  det.addEventListener('wheel', e => { e.preventDefault(); const x = xIn(e.clientX); zoomAbout(timeAt(x), x, e.deltaY < 0 ? 0.72 : 1 / 0.72); }, { passive: false });
  let pinch = 0;
  const dist = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  det.addEventListener('touchstart', e => { if (e.touches.length === 2) { pinch = dist(e); e.preventDefault(); } }, { passive: false });
  det.addEventListener('touchmove', e => {
    if (!pinch || e.touches.length !== 2) return; e.preventDefault();
    const d = dist(e), f = pinch / d; if (Math.abs(f - 1) < 0.05) return;
    const x = xIn((e.touches[0].clientX + e.touches[1].clientX) / 2); zoomAbout(timeAt(x), x, f); pinch = d;
  }, { passive: false });
  det.addEventListener('touchend', () => { pinch = 0; });
  $('tlEvents').addEventListener('click', e => { const el = e.target.closest('.ev'); if (!el) return; const ev = EVENTS[+el.dataset.ev]; goTo(ev[0]); showFact(ev[2], '<b>' + esc(ev[3]) + '</b> — ' + esc(ev[4])); });
  // overview: drag the window, drag its edges, or click to jump
  const ov = $('tlOverview'), br = $('ovBrush');
  const tAt = cx => { const r = ov.getBoundingClientRect(); return storyTime(clamp((cx - r.left) / r.width, 0, 1) * 1000); };
  br.addEventListener('pointerdown', e => {
    e.stopPropagation(); stopPlay(); cancelTween();
    const mode = e.target.classList.contains('l') ? 'l' : e.target.classList.contains('r') ? 'r' : 'move', t0 = tAt(e.clientX), w0 = S.win.slice();
    br.setPointerCapture(e.pointerId);
    const move = ev => {
      const tp = tAt(ev.clientX); let [a, b] = w0;
      if (mode === 'l') a = Math.max(tp, b + MIN_SPAN);
      else if (mode === 'r') b = Math.min(tp, a - MIN_SPAN);
      else { const sp = a - b; a = clamp(w0[0] + (tp - t0), sp, T_MAX); b = a - sp; }
      setWindow(a, b);
    };
    const up = () => { br.removeEventListener('pointermove', move); br.removeEventListener('pointerup', up); br.removeEventListener('pointercancel', up); };
    br.addEventListener('pointermove', move); br.addEventListener('pointerup', up); br.addEventListener('pointercancel', up);
  });
  ov.addEventListener('pointerdown', e => {
    if (e.target.closest('#ovBrush')) return;
    const t = tAt(e.clientX);
    if (!isFull()) { const sp = span(), a = clamp(t + sp / 2, sp, T_MAX); setWindow(a, a - sp, true); }
    goTo(tidy(t));
  });
  $('playBtn').onclick = () => S.playing ? stopPlay() : startPlay();
  $('prevBtn').onclick = () => jumpPeriod(-1); $('nextBtn').onclick = () => jumpPeriod(1);
  window.addEventListener('resize', () => renderTimeline());
}

// ── the panel ───────────────────────────────────────────────────────
function schedulePanel(ms) { clearTimeout(panelTimer); panelTimer = setTimeout(renderPanel, ms); }
function renderPanel() {
  if (S.tab === 'life') renderLife();
  else if (S.tab === 'humans') renderHumans();
  else if (S.tab === 'insights') renderInsights();
  else renderGeo();
}
function switchTab(tab) {
  S.tab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
  document.querySelectorAll('.tabpane').forEach(p => p.classList.toggle('on', p.id === 'pane-' + tab));
  if (S.sel && !BY_KEY[S.sel] && !(tab === 'humans' && S.sel.startsWith('cul:'))) { S.sel = null; WorldMap.select(null); }
  updatePlaces(); renderPanel();
  $('panelContent').scrollTop = 0;
}

// --- Life ---
function scopeItems() {
  if (S.q) return ALL.filter(c => c.search.includes(S.q));
  if (S.scope === 'now') { const pad = slack(S.t); return ALL.filter(c => alive(c, S.t, pad)); }
  if (S.scope === 'view') return ALL.filter(c => c.t[0] >= S.win[1] && c.t[1] <= S.win[0]);
  if (S.scope === 'period') return ALL.filter(c => inPeriod(c, S.period));
  return ALL;
}
// how big, next to a 10-year-old (about 1.4 m tall)
function sizeHTML(c) {
  const L = c.len; if (!(L > 0)) return '';
  if (L < 0.12) return `<div class="sizecmp"><span>📏 Small enough to sit in your hand.</span></div>`;
  const KID = 1.4, maxM = Math.max(L, KID), W = 250, px = W / maxM, kidH = KID * px, bar = Math.max(3, L * px), H = Math.max(kidH, 22) + 16;
  const ratio = L / KID, words = ratio >= 1.5 ? `About ${ratio >= 10 ? Math.round(ratio) : ratio.toFixed(1)} times as long as a 10-year-old is tall` : ratio >= 0.75 ? 'About as big as a 10-year-old' : ratio >= 0.35 ? 'About as long as a 10-year-old\'s leg' : 'About as long as your arm';
  const kid = (x, h) => { const s = h / 140; return `<g transform="translate(${x},${H - 2 - h}) scale(${s})" fill="#8fb4ff"><circle cx="20" cy="14" r="13"/><rect x="8" y="30" width="24" height="52" rx="10"/><rect x="9" y="76" width="9" height="62" rx="4.5"/><rect x="22" y="76" width="9" height="62" rx="4.5"/><rect x="-3" y="34" width="8" height="44" rx="4" transform="rotate(12 1 34)"/><rect x="35" y="34" width="8" height="44" rx="4" transform="rotate(-12 39 34)"/></g>`; };
  return `<div class="sizecmp"><svg viewBox="0 0 ${W + 70} ${H}" width="100%" style="max-width:${W + 70}px" role="img" aria-label="${esc(words)}">
    ${kid(4, kidH)}<rect x="${Math.max(10, kidH * 0.3) + 18}" y="${H - 12}" width="${bar.toFixed(1)}" height="10" rx="5" fill="#f0c040"/>
    <text x="${Math.max(10, kidH * 0.3) + 22 + bar}" y="${H - 3}" font-size="10" fill="#d9c27a">${L >= 1 ? (+L.toFixed(1)) + ' m' : Math.round(L * 100) + ' cm'}</text>
    <line x1="0" x2="${W + 70}" y1="${H - 1}" y2="${H - 1}" stroke="#3a4560"/></svg><span>📏 ${esc(words)} — the biggest measurement given.</span></div>`;
}
function cardHTML(c, open) {
  const h = c.hom, L = [];
  const sec = (title, body) => body ? `<div class="label-sec"><h5>${title}</h5>${body}</div>` : '';
  if (open) {
    L.push(sizeHTML(c));
    L.push(sec('🔎 How do we know?', esc(c.know || '')));
    L.push(sec('❓ Still debated', esc(c.debate || '')));
    if (h) L.push(`<div class="label-sec"><button class="linkbtn" data-open-hom="${c.key}">Full profile in the Humans tab →</button></div>`);
    L.push(sec('📜 Discovery', esc(c.discovery || '')));
    L.push(sec('🧬 Classification', c.taxonomy ? `<span class="tax">${esc(c.taxonomy)}</span>` : ''));
    L.push(sec('👩‍🔬 Key researchers', esc(c.keyResearchers || '')));
    L.push(sec('📚 Reference', esc(c.citation || '')));
    if (c.sites && c.sites.length) L.push(`<div class="found">📍 <b>Fossils found at:</b> ${c.sites.map(s => esc(s[2])).join(' · ')} <span style="opacity:.7">— shown on the map where those places were at the time.</span></div>`);
  }
  return `<div class="creature-card${open ? ' active' : ''}" data-key="${c.key}">
    <div class="creature-top"><div class="creature-emoji">${c.emoji}</div><div class="creature-title">
      <div class="creature-name">${esc(c.name)}${c.nick ? `<i>${esc(c.nick)}</i>` : ''}</div>
      ${c.means ? `<div class="creature-means">“${esc(c.means)}”</div>` : ''}
      <div class="creature-size">${esc(c.size || '')}</div><div class="creature-lived">${esc(c.lived || '')}</div>
    </div></div>
    ${c.habitat ? `<div class="creature-habitat">🏠 ${esc(c.habitat)}</div>` : ''}
    <div class="creature-fact">${esc(c.fact)}</div>
    <div class="creature-chips"><span class="diet-chip diet-${c.diet}">${DIET[c.diet] || esc(c.diet)}</span><span class="habitat-badge">${TYPES[c.g][0]} ${TYPES[c.g][1]}</span>${c.weird ? '<span class="habitat-badge">🤪 Weird & wonderful</span>' : ''}${!open && (c.know || c.debate) ? '<span class="habitat-badge">🔎 How do we know?</span>' : ''}</div>
    <div class="lineage">🧬 <b>${esc(c.path[0])}</b>${c.path.slice(1).map(s => ' › ' + esc(s)).join('')}</div>
    ${L.join('')}</div>`;
}
const rowHTML = (c, isAlive, tree) => `<div class="crow${isAlive ? ' alive' : ''}" data-key="${c.key}"><span class="e">${c.emoji}</span><span class="n">${esc(c.name)}<small>${esc(tree ? c.size || '' : c.path.slice(1).join(' › ') || c.path[0])}</small></span><span class="w">${esc(c.lived || '')}</span></div>`;
function renderLife() {
  const scope = scopeItems().filter(c => !S.weird || c.weird);
  // chips: kinds present in this scope, then the branches of the chosen kind
  const counts = {}; scope.forEach(c => counts[c.g] = (counts[c.g] || 0) + 1);
  if (S.type !== 'all' && !counts[S.type]) counts[S.type] = 0;
  $('typeChips').innerHTML = `<button class="chip${S.type === 'all' ? ' on' : ''}" data-type="all">All<small>${scope.length}</small></button>` +
    TYPE_ORDER.filter(g => g in counts).map(g => `<button class="chip${S.type === g ? ' on' : ''}" data-type="${g}">${TYPES[g][0]} ${TYPES[g][1]}<small>${counts[g]}</small></button>`).join('');
  let items = scope.filter(c => S.type === 'all' || c.g === S.type);
  const bc = {}; if (S.type !== 'all') items.forEach(c => { if (c.path[1]) bc[c.path[1]] = (bc[c.path[1]] || 0) + 1; });
  if (S.branch !== 'all' && !bc[S.branch]) S.branch = 'all';
  const bks = Object.keys(bc).sort();
  $('dtypeChips').innerHTML = bks.length > 1 ? `<button class="chip${S.branch === 'all' ? ' on' : ''}" data-branch="all">All ${esc(TYPES[S.type][1].toLowerCase())}</button>` + bks.map(b => `<button class="chip${S.branch === b ? ' on' : ''}" data-branch="${esc(b)}">${esc(b)}<small>${bc[b]}</small></button>`).join('') : '';
  if (S.branch !== 'all') items = items.filter(c => c.path[1] === S.branch);
  const gi = c => TYPE_ORDER.indexOf(c.g);
  const cmp = { old: (a, b) => b.t[0] - a.t[0] || a.name.localeCompare(b.name), young: (a, b) => a.t[1] - b.t[1] || a.t[0] - b.t[0],
    name: (a, b) => a.name.localeCompare(b.name), size: (a, b) => (isNaN(b.len) ? -1 : b.len) - (isNaN(a.len) ? -1 : a.len),
    tree: (a, b) => gi(a) - gi(b) || a.c.localeCompare(b.c) || b.t[0] - a.t[0] }[S.sort];
  items = items.slice().sort(cmp);
  $('lifeCount').textContent = items.length + (items.length === 1 ? ' animal' : ' animals');
  const p = S.period, pad = slack(S.t);
  const title = S.q ? 'Search results' : S.scope === 'now' ? 'Alive ' + (S.t < 0.00005 ? 'today' : fmtAgo(S.t))
    : S.scope === 'view' ? (isFull() ? 'All of time in view' : 'Lived in the part of the timeline in view') : S.scope === 'period' ? 'Life of the ' + p.name : 'Every animal on the site';
  let html = `<div class="list-h">${esc(title)}${S.scope === 'now' && !S.q ? `<small>${esc(divAt(S.t, 1) || p.name)}</small>` : ''}</div>`;
  if (!items.length) {
    // nothing at this instant: offer the nearest in time, either side
    const pool = ALL.filter(typeOK);
    const before = pool.filter(c => c.t[1] > S.t).sort((a, b) => a.t[1] - b.t[1])[0], after = pool.filter(c => c.t[0] < S.t).sort((a, b) => b.t[0] - a.t[0])[0];
    html += `<div class="empty">${S.q ? 'No animal matches “' + esc(S.q) + '”.' : S.scope === 'now' ? 'No animal on this site is recorded at exactly this moment' + (S.type !== 'all' ? ' in this group' : '') + '.' : 'Nothing here' + (S.type !== 'all' ? ' in this group' : '') + '.'}<br>` +
      (S.scope === 'now' && !S.q ? [before && `<button class="linkbtn" data-jump="${before.key}">← earlier: ${esc(before.name)}</button>`, after && `<button class="linkbtn" data-jump="${after.key}">later: ${esc(after.name)} →</button>`].filter(Boolean).join(' ') : '') + '</div>';
  } else {
    const rich = S.scope === 'now' && !S.q && items.length <= 40 && S.sort !== 'tree';
    let last = [];
    for (const c of items) {
      if (S.sort === 'tree') {
        for (let d = 0; d < Math.min(3, c.path.length); d++) {
          if (c.path.slice(0, d + 1).join('›') !== last.slice(0, d + 1).join('›')) {
            const pre = c.path.slice(0, d + 1).join(' › '), n = items.filter(x => x.c === pre || x.c.startsWith(pre + ' › ')).length;
            html += `<div class="tree-h${d ? ' l' + (d + 1) : ''}">${d === 0 ? TYPES[c.g][0] + ' ' : ''}${esc(c.path[d])}<small>${n}</small></div>`;
          }
        }
        last = c.path;
      }
      html += (rich || c.key === S.sel) ? cardHTML(c, c.key === S.sel) : rowHTML(c, S.scope !== 'now' && alive(c, S.t, pad), S.sort === 'tree');
    }
  }
  $('lifeList').innerHTML = html;
}
function bindLife() {
  $('q').placeholder = 'Search ' + ALL.length + ' animals…';
  $('q').addEventListener('input', e => { S.q = e.target.value.trim().toLowerCase(); schedulePanel(120); });
  $('scopeSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; S.scope = b.dataset.scope; S.q = ''; $('q').value = ''; document.querySelectorAll('#scopeSeg button').forEach(x => x.classList.toggle('on', x === b)); if (S.scope !== 'now' && S.sort === 'old' && S.scope === 'all') { S.sort = 'tree'; $('sortSel').value = 'tree'; } renderLife(); });
  $('typeChips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; S.type = b.dataset.type; S.branch = 'all'; updateMarkers(); renderLife(); });
  $('dtypeChips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; S.branch = b.dataset.branch; updateMarkers(); renderLife(); });
  $('sortSel').addEventListener('change', e => { S.sort = e.target.value; renderLife(); });
  $('weirdBtn').addEventListener('click', () => { S.weird = !S.weird; $('weirdBtn').classList.toggle('on', S.weird); $('weirdBtn').setAttribute('aria-pressed', String(S.weird)); updateMarkers(); renderLife(); });
  $('rollBtn').addEventListener('click', () => {
    const pool = ALL.filter(c => typeOK(c) && c.key !== S.sel && c.sites && c.sites.length);
    const c = pool[Math.floor(Math.random() * pool.length)]; if (!c) return;
    S.scope = 'now'; S.q = ''; $('q').value = ''; document.querySelectorAll('#scopeSeg button').forEach(x => x.classList.toggle('on', x.dataset.scope === 'now'));
    if (!isFull() && (c.t[0] < S.win[1] || c.t[1] > S.win[0])) setWindow(T_MAX, 0, true);
    select(c.key, { keep: true });
    showFact(c.emoji, '<b>' + esc(c.name) + '</b> — ' + esc(c.fact));
  });
  $('lifeList').addEventListener('click', e => {
    const hom = e.target.closest('[data-open-hom]'); if (hom) { switchTab('humans'); return; }
    const j = e.target.closest('[data-jump]'); if (j) { select(j.dataset.jump, { keep: true }); return; }
    const el = e.target.closest('[data-key]'); if (el) select(el.dataset.key);
  });
}

// --- Human family ---
const hx = t => (1 - Math.sqrt(clamp(t, 0, 7) / 7)) * 100;
const shortName = n => n.replace(/^Australopithecus /, 'Au. ').replace(/^Paranthropus /, 'P. ').replace(/^Homo /, 'H. ').replace(/^Ardipithecus /, 'Ar. ').replace(/ (tchadensis|tugenensis|platyops)$/, '');
const GROUPS = { early: 'Earliest hominins', austral: 'Australopiths', paran: 'Robust australopiths', homo: 'Humans (Homo)' };
function profileHTML(h) {
  const li = a => '<ul>' + a.map(x => '<li>' + x + '</li>').join('') + '</ul>';
  const sec = (t, b) => `<div class="label-sec"><h5>${t}</h5>${b}</div>`;
  return `<div class="profile" data-key="${h.id}"><h3>${esc(h.name)}${h.nick ? `<span>${esc(h.nick)}</span>` : ''}</h3>
    <dl class="facts"><dt>When</dt><dd>${esc(h.lived)}</dd><dt>Where</dt><dd>${esc(h.where)}</dd><dt>Height</dt><dd>${esc(h.height)}</dd><dt>Weight</dt><dd>${esc(h.weight)}</dd>
    <dt>Brain</dt><dd>${h.brain ? 'about ' + years(h.brain) + ' cm³ <span style="color:var(--muted)">(ours: about 1,350)</span><div class="brain"><i style="width:${Math.min(100, h.brain / 14.5)}%"></i></div>' : 'Unknown'}</dd></dl>
    <div class="creature-fact">${esc(h.fact)}</div>
    ${sec('🔎 How do we know?', esc(h.know))}${sec('🏕 How they lived', esc(h.survive))}${sec('🌳 Where they fit in the family', esc(h.tree))}${sec('📜 Discovery', esc(h.discovery))}
    ${sec('🦴 Key fossils', li(h.fossils.map(f => '<b>' + esc(f[0]) + '</b> — ' + esc(f[1]))))}${sec('❓ Still unanswered', li(h.questions.map(esc)))}
    <div class="found">📍 <b>Found at:</b> ${h.sites.map(s => esc(s[2])).join(' · ')}</div></div>`;
}
function renderHumans() {
  const hs = HOMININS.slice().sort((a, b) => b.t[0] - a.t[0]), pad = slack(S.t), sel = S.sel && BY_KEY[S.sel] && BY_KEY[S.sel].hom;
  const ticks = [[7, '7 M'], [6, '6'], [5, '5'], [4, '4'], [3, '3'], [2, '2'], [1, '1 M'], [0.5, '500k'], [0.1, '100k']];
  const rows = hs.map(h => {
    const x0 = hx(h.t[0]), x1 = hx(h.t[1]), right = (x0 + x1) / 2 > 52;
    return `<div class="hf-row${alive(h, S.t, pad) ? ' alive' : ''}${sel === h ? ' sel' : ''}" data-key="${h.id}" title="${esc(h.name)} — ${esc(h.lived)}">
      <div class="hf-bar g-${h.group}" style="left:${x0.toFixed(2)}%;width:${Math.max(0.6, x1 - x0).toFixed(2)}%"></div>
      <div class="hf-lab" style="${right ? `right:${(100 - x0 + 1.2).toFixed(2)}%` : `left:${(x1 + 1.2).toFixed(2)}%`}">${esc(shortName(h.name))}</div></div>`;
  }).join('');
  const ms = MILESTONES.slice().sort((a, b) => b[0] - a[0]).map(m => `<div class="ms-item${S.t > m[0] + pad ? ' future' : ''}" data-t="${m[0]}"><span class="when">${m[0] >= 1 ? m[0] + ' MYA' : years(Math.round(m[0] * 1e6)) + ' yrs'}</span><span>${m[1]}</span><div><b>${esc(m[2])}</b><span>${esc(m[3])}</span></div></div>`).join('');
  const nowList = hs.filter(h => alive(h, S.t, pad));
  $('pane-humans').innerHTML = `<div class="hf">
    <div class="hf-intro">The human family: every known branch of the last 7 million years. For most of that time several kinds of human lived at once — being the only one is new.</div>
    <div class="hf-chart" id="hfChart"><div style="position:relative;margin:0 8px">
      <div class="hf-axis">${ticks.map(([t, l]) => `<span style="left:${hx(t)}%">${l}</span>`).join('')}</div>${rows}
      <div class="hf-cursor" id="hfCursor"></div></div></div>
    <div class="hf-legend">${Object.keys(GROUPS).map(g => `<span><i class="g-${g}"></i>${GROUPS[g]}</span>`).join('')}</div>
    <div class="hf-note" id="hfNote"></div>
    ${S.sel && S.sel.startsWith('cul:') && CUL[S.sel.slice(4)] ? cultureHTML(CUL[S.sel.slice(4)]) : sel ? profileHTML(sel) : `<div class="empty">${S.t > 7.05 ? '' : nowList.length ? 'Tap a bar — or a marker on the map — to meet them.' : ''}</div>`}
    <div class="ms"><div class="list-h" style="padding-left:2px">Ways of life <small>homes, settlements and cultures — tap one, or a pin on the map</small></div>${CULTURES.map(c => `<div class="ms-item cul-item${culActive(c) ? ' now' : ''}${S.sel === 'cul:' + c.id ? ' sel' : ''}" data-cul="${c.id}"><span class="when">${c.t[0] >= 1 ? c.t[0] + ' MYA' : years(Math.round(c.t[0] * 1e6 / 100) * 100) + ' yrs'}</span><span>${c.icon}</span><div><b>${esc(c.name)}</b><span>${esc(c.where)}</span></div></div>`).join('')}</div>
    <div class="ms"><div class="list-h" style="padding-left:2px">Turning points</div>${ms}</div></div>`;
  updateHumansCursor();
}
function updateHumansCursor() {
  const cur = $('hfCursor'); if (!cur) return;
  const pad = slack(S.t), on = S.t <= 7.05;
  cur.style.display = on ? '' : 'none'; cur.style.left = hx(S.t) + '%';
  const nowList = []; document.querySelectorAll('.hf-row').forEach(el => { const a = alive(BY_KEY[el.dataset.key], S.t, pad); el.classList.toggle('alive', a); if (a) nowList.push(BY_KEY[el.dataset.key].name); });
  document.querySelectorAll('.ms-item').forEach(el => el.classList.toggle('future', S.t > +el.dataset.t + pad));
  $('hfNote').innerHTML = on ? (nowList.length ? `<b style="color:#e6ebf5">${fmtAgo(S.t)}:</b> ${nowList.length} kind${nowList.length > 1 ? 's' : ''} of human relative alive — ${nowList.map(n => esc(shortName(n))).join(', ')}.` : `<b style="color:#e6ebf5">${fmtAgo(S.t)}:</b> no fossils of the human family are known from this moment.`)
    : `You are at ${fmtAgo(S.t)} — long before the human family. <button class="linkbtn" data-goto="7" style="margin-left:6px">Go to 7 million years ago</button>`;
}
function cultureHTML(c) {
  const sec = (t, b) => b ? `<div class="label-sec"><h5>${t}</h5>${esc(b)}</div>` : '';
  return `<div class="profile culture" data-key="cul:${c.id}"><h3 style="font-style:normal">${c.icon} ${esc(c.name)}</h3>
    <dl class="facts"><dt>When</dt><dd>${esc(c.when)}</dd><dt>Where</dt><dd>${esc(c.where)}</dd><dt>Who</dt><dd>${esc(c.who)}</dd></dl>
    ${sec('🏠 Homes and settlements', c.home)}${sec('🍖 Food', c.food)}${sec('🛠 Tools and inventions', c.tools)}${sec('🎨 Art and beliefs', c.beliefs)}
    ${sec('🔎 How do we know?', c.know)}${sec('❓ Still debated', c.debate)}
    <div class="found">📍 <b>On the map:</b> ${c.sites.map(s => esc(s[2])).join(' · ')}</div></div>`;
}
function selectCulture(id, fromMap) {
  const c = CUL[id]; if (!c) return;
  const key = 'cul:' + id;
  S.sel = key; WorldMap.select(key);
  const look = () => { const pl = placeCache['c' + id + '0']; if (pl) WorldMap.lookAt(pl.at); };
  if (S.tab !== 'humans') switchTab('humans');
  if (!culActive(c)) {
    const mid = tidy((c.t[0] + c.t[1]) / 2);
    // zoom the timeline so a short-lived culture is wide enough to see
    const sp = Math.max(0.02, (c.t[0] - c.t[1]) * 4, mid * 0.5);
    if (isFull() || span() > sp * 3 || mid > S.win[0] || mid < S.win[1]) { const a = Math.min(T_MAX, mid + sp / 2); setWindow(a, Math.max(0, a - sp), true); }
    goTo(mid, () => { updatePlaces(); look(); renderHumans(); });
  } else { updatePlaces(); look(); }
  renderHumans();
  if (fromMap && window.innerWidth < 768) showFact(c.icon, '<b>' + esc(c.name) + '</b> — ' + esc(c.home));
  setTimeout(() => { const el = document.querySelector('#pane-humans .profile'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 80);
}
function bindHumans() {
  $('pane-humans').addEventListener('click', e => {
    const g = e.target.closest('[data-goto]'); if (g) { if (!isFull() && S.win[0] < 7) setWindow(10, 0, true); goTo(+g.dataset.goto); return; }
    const cu = e.target.closest('.cul-item'); if (cu) { selectCulture(cu.dataset.cul); return; }
    const m = e.target.closest('.ms-item'); if (m) { goTo(+m.dataset.t); return; }
    const r = e.target.closest('.hf-row'); if (r) select(r.dataset.key);
  });
}

// --- Insights ---
function renderInsights() {
  const p = S.period, I = p.insight, sites = SITES.filter(s => s[3].includes(p.id));
  $('pane-insights').innerHTML = `<div class="ins">
    <div class="list-h" style="padding:2px 0 0">${esc(p.title || p.name)} · the big picture</div>
    <div class="ins-big">${esc(I.big)}</div>
    <div class="signs">${I.signs.map(s => `<div class="sign"><div class="i">${s[0]}</div><div><b>${esc(s[1])}</b><span>${esc(s[2])}</span></div></div>`).join('')}</div>
    <div class="ins-sec"><h4>🔎 How do we know?</h4>${esc(I.know)}</div>
    <div class="ins-sec"><h4>🌍 Why it matters today</h4>${esc(I.today)}</div>
    ${I.ext ? `<div class="ext"><h4>☠️ ${esc(I.ext.name)}</h4><dl><dt>When</dt><dd>${esc(I.ext.when)}</dd><dt>Lost</dt><dd>${esc(I.ext.toll)}</dd><dt>Cause</dt><dd>${esc(I.ext.cause)}</dd></dl></div>` : ''}
    ${foodWebHTML(p)}
    ${p.funFact ? `<div class="ins-sec"><h4>💡 Did you know?</h4>${esc(p.funFact)}</div>` : ''}
    ${sites.length ? `<div class="ins-sec"><h4>📍 Famous fossil sites — shown on the map</h4>${sites.map(s => `<div class="site${S.sel === 'site:' + slug(s[0]) ? ' sel' : ''}" data-key="site:${slug(s[0])}"><span class="d">◆</span><div><b>${esc(s[0])}</b>${esc(s[4])}</div></div>`).join('')}</div>` : ''}
    <div class="src">Dates follow the International Chronostratigraphic Chart (2024 edition), rounded — older books give slightly different numbers. Temperature, CO₂ and sea-level figures are published estimates with real uncertainty; where specialists disagree, the text says so. Continents: plate model of Merdith et al. (2021), <i>Earth-Science Reviews</i> 214. Coastlines: Natural Earth.</div></div>`;
}
// ── food web: one real ecosystem per period, drawn as tiers ──
const BY_NAME = Object.fromEntries(ALL.map(c => [c.name, c]));
function foodWebHTML(p) {
  const w = FOODWEBS[p.id]; if (!w) return '';
  const W = 380, TH = 74, H = TH * 4 + 6, ids = Object.keys(w.nodes), pos = {};
  for (let tier = 0; tier < 4; tier++) {
    const row = ids.filter(id => w.nodes[id][2] === tier), n = row.length, bw = Math.min(88, (W - 8) / Math.max(1, n) - 6);
    row.forEach((id, i) => { pos[id] = { x: 4 + (W - 8) * (i + 0.5) / n, y: H - 6 - TH * tier - TH / 2, w: bw }; });
  }
  const NH = 40;
  const links = w.links.map(([a, b, kind, note], i) => {
    const A = pos[a], B = pos[b]; if (!A || !B) return '';
    const x1 = A.x, y1 = A.y - NH / 2, x2 = B.x, y2 = B.y + NH / 2 + 3;
    const mx = (x1 + x2) / 2 + (x1 === x2 ? 14 : 0), my = (y1 + y2) / 2;
    return `<path class="fw-link ${kind}" data-i="${i}" d="M${x1.toFixed(1)} ${y1} Q${mx.toFixed(1)} ${my} ${x2.toFixed(1)} ${y2}" marker-end="url(#fwArrow${kind === 'proof' ? 'P' : 'L'})"><title>${esc(w.nodes[a][0])} → eaten by ${esc(w.nodes[b][0])}${note ? ' — ' + esc(note) : ''}</title></path>`;
  }).join('');
  const split = s => { if (s.length <= 13) return [s]; const k = s.lastIndexOf(' ', 13); return k > 3 ? [s.slice(0, k), s.slice(k + 1)] : [s]; };
  const nodes = ids.map(id => {
    const [label, emoji, tier, site] = w.nodes[id], P = pos[id], c = site && BY_NAME[site], lines = split(label);
    return `<g class="fw-node${c ? ' link' : ''}" ${c ? `data-key="${c.key}"` : ''} transform="translate(${(P.x - P.w / 2).toFixed(1)},${P.y - NH / 2})">
      <rect width="${P.w.toFixed(1)}" height="${NH}" rx="7" class="t${tier}"/>
      <text x="${(P.w / 2).toFixed(1)}" y="15" text-anchor="middle" font-size="14">${emoji}</text>
      ${lines.map((l, j) => `<text x="${(P.w / 2).toFixed(1)}" y="${lines.length > 1 ? 26 + j * 9.5 : 31}" text-anchor="middle" font-size="${Math.min(lines.length > 1 ? 8 : 8.8, (P.w - 4) / (l.length * 0.56)).toFixed(1)}" class="fw-lab">${esc(l)}</text>`).join('')}
      ${c ? `<title>${esc(c.name)} — tap to open its card</title>` : ''}</g>`;
  }).join('');
  const tiers = ['Makes its own food', 'Plant-eaters & filter-feeders', 'Hunters', 'Top predators'];
  const proofs = w.links.filter(l => l[3]);
  return `<div class="ins-sec"><h4>🍖 Who ate whom — ${esc(w.title)}</h4><div style="color:var(--muted);font-size:.7rem;margin-bottom:5px">${esc(w.where)}. ${esc(w.note)}</div>
    <div class="fw"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Food web: ${esc(w.title)}">
      <defs><marker id="fwArrowP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="#ff9a5a"/></marker>
      <marker id="fwArrowL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="#7f9cc6"/></marker></defs>
      ${[3, 2, 1, 0].map(t => `<rect x="0" y="${H - 6 - TH * (t + 1)}" width="${W}" height="${TH}" class="fw-band b${t}"/><text x="4" y="${H - 6 - TH * (t + 1) + 9}" class="fw-tier">${tiers[t]}</text>`).join('')}
      ${links}${nodes}</svg></div>
    <div class="fw-key"><span><i class="proof"></i>Fossil proof of the meal</span><span><i class="likely"></i>Likely, from teeth, size and who lived together</span><span>Arrows point to the eater · tap an animal to open it</span></div>
    <div class="fw-note" id="fwNote"></div>
    ${proofs.length ? `<details class="fw-how"><summary>How do we know who ate whom? (${proofs.length})</summary>${proofs.map(l => `<div><b>${esc(w.nodes[l[0]][0])} → ${esc(w.nodes[l[1]][0])}</b> <span class="${l[2]}">${l[2] === 'proof' ? 'fossil proof' : 'likely'}</span><br>${esc(l[3])}</div>`).join('')}</details>` : ''}</div>`;
}
function bindInsights() {
  $('pane-insights').addEventListener('click', e => {
    const fn = e.target.closest('.fw-node.link'); if (fn) { const k = fn.dataset.key; switchTab('life'); select(k, { keep: true }); return; }
    const fl = e.target.closest('.fw-link'); if (fl) { const w = FOODWEBS[S.period.id], l = w.links[+fl.dataset.i]; $('fwNote').innerHTML = `<b>${esc(w.nodes[l[0]][0])}</b> eaten by <b>${esc(w.nodes[l[1]][0])}</b> — ${l[2] === 'proof' ? 'fossil proof' : 'likely'}${l[3] ? ': ' + esc(l[3]) : '.'}`; return; }
    const el = e.target.closest('.site'); if (!el) return;
    const s = SITES.find(x => 'site:' + slug(x[0]) === el.dataset.key), pl = placeCache['s' + s[0] + S.period.id];
    if (pl) selectPlace(pl.key, pl.at);
  });
}

// --- Geology ---
function renderGeo() {
  const p = S.period, fs = GEO_FEATURES.filter(f => f.periods && f.periods.includes(p.id));
  $('pane-geo').innerHTML = `<div class="geo-list"><div class="list-h" style="padding:2px 4px 8px">Geology of the ${esc(p.name)}</div>` + (fs.length ? fs.map(f => `
    <div class="geo-card${S.sel === 'geo:' + f.id ? ' sel expanded' : ''}" data-key="geo:${f.id}">
      <div class="geo-card-top"><div class="geo-icon">${f.icon}</div><div class="geo-info"><div class="geo-name">${esc(f.name)}</div><div class="geo-short">${esc(f.shortDesc || '')}</div></div></div>
      <div class="geo-full">${f.fullDesc ? `<div style="margin-bottom:5px">${esc(f.fullDesc)}</div>` : ''}${f.funFact ? `<div class="geo-fun">💡 ${esc(f.funFact)}</div>` : ''}</div>
      ${f.type ? `<div><span class="geo-type-badge">${esc(f.type)}</span>${f.at ? '<span class="geo-type-badge" style="margin-left:4px">📍 on the map</span>' : ''}</div>` : ''}</div>`).join('')
    : '<div class="empty">No geological features recorded for this period yet.</div>') + '</div>';
}
function bindGeo() {
  $('pane-geo').addEventListener('click', e => {
    const el = e.target.closest('.geo-card'); if (!el) return;
    el.classList.toggle('expanded');
    const f = GEO_FEATURES.find(x => 'geo:' + x.id === el.dataset.key), pl = placeCache['g' + f.id + S.period.id];
    if (pl && el.classList.contains('expanded')) { if (S.sel !== pl.key) selectPlace(pl.key, pl.at); } else if (pl && S.sel === pl.key) selectPlace(pl.key, pl.at);
  });
}

// ── popup, hash, map wiring ─────────────────────────────────────────
let factTimer = 0;
function showFact(emoji, html) {
  clearTimeout(factTimer);
  $('fpEmoji').textContent = emoji; $('fpText').innerHTML = html;
  $('factPopup').classList.add('show');
  factTimer = setTimeout(closeFact, 9000);
}
function closeFact() { $('factPopup').classList.remove('show'); clearTimeout(factTimer); }

function writeHash() {
  const parts = [String(S.t) + 'mya']; if (S.sel && BY_KEY[S.sel]) parts.push(S.sel);
  const next = '#' + parts.join('/');
  if (location.hash !== next) { try { history.replaceState(null, '', next); } catch (e) {} }
}
function readHash() {
  const raw = decodeURIComponent((location.hash || '').replace(/^#/, '')); if (!raw) return false;
  const [a, b] = raw.split('/'); let t;
  const m = /^([0-9.]+)mya$/.exec(a);
  if (m) t = parseFloat(m[1]); else { const p = PERIODS.find(p => p.id === a); if (!p) return false; t = (p.start + p.end) / 2; }
  if (!(t >= 0)) return false;
  const c = b && BY_KEY[b];
  setTime(c && !alive(c, t, 0) ? (c.t[0] + c.t[1]) / 2 : t);
  if (c) { S.sel = c.key; WorldMap.select(c.key); updateMarkers(); if (c.hom) switchTab('humans'); else renderPanel(); }
  return true;
}

function init() {
  WorldMap.init($('mapCanvas'), $('mapFx'));
  WorldMap.setLayers({
    labels: LABELS.map(([text, lat, lon, from, to, size]) => ({ text, from, to, size, at: WorldMap.attach(lat, lon, from) })),
    oceans: OCEANS.map(([text, a, b, from, to, min, k]) => ({ text, from, to, min, k, a: WorldMap.attach(a[0], a[1], from), b: WorldMap.attach(b[0], b[1], from) })),
    superocean: SUPEROCEAN,
    notes: ICE_AGE_NOTES.map(([name, lat, lon, what]) => ({ text: name + ' · ' + what, lat, lon, from: 2.58, to: 0.0117 })),
  });
  WorldMap.onPick = h => {
    if (!h) { $('mapAbout').classList.remove('show'); return; }
    if (h.marker) select(h.marker.key, { fromMap: true, keep: true });
    else if (h.place && h.place.key.startsWith('cul:')) selectCulture(h.place.key.slice(4), true);
    else if (h.place) { selectPlace(h.place.key, h.place.at, h.place.icon || '📍', '<b>' + esc(h.place.name) + '</b> — ' + esc(h.place.note || '')); if (S.sel !== h.place.key) closeFact(); }
  };
  const tip = $('mapTip');
  WorldMap.onHover = (h, x, y) => {
    if (!h) { tip.style.display = 'none'; return; }
    tip.innerHTML = h.marker ? esc(h.marker.name) + '<small>click for its story</small>' : esc(h.place.name);
    tip.style.display = 'block'; tip.style.left = x + 'px'; tip.style.top = y + 'px';
  };
  WorldMap.onView = () => { $('mapGlobe').textContent = WorldMap.mode === 'globe' ? '🗺' : '🌐'; };
  $('mapGlobe').onclick = () => WorldMap.setMode(WorldMap.mode === 'globe' ? 'flat' : 'globe');
  $('mapIn').onclick = () => WorldMap.zoomBy(1.6); $('mapOut').onclick = () => WorldMap.zoomBy(1 / 1.6); $('mapReset').onclick = () => WorldMap.resetView();
  $('mapNote').onclick = () => $('mapAbout').classList.toggle('show'); $('mapAboutX').onclick = () => $('mapAbout').classList.remove('show');
  $('eventsRibbon').onclick = () => switchTab('insights');
  $('fpClose').onclick = closeFact;
  document.querySelector('.tab-bar').addEventListener('click', e => { const b = e.target.closest('.tab-btn'); if (b) switchTab(b.dataset.tab); });
  document.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') jumpPeriod(-1); else if (e.key === 'ArrowRight') jumpPeriod(1); else if (e.key === 'Escape') { closeFact(); $('mapAbout').classList.remove('show'); }
  });
  window.addEventListener('hashchange', readHash);
  bindTimeline(); bindLife(); bindHumans(); bindInsights(); bindGeo();
  renderTimeline();
  if (!readHash()) {
    setTime(150);
    setTimeout(() => showFact('🦕', '<b>Welcome, time explorers!</b> Drag the timeline to watch the continents drift. Zoom into any stretch of it for more detail. Tap an animal to see where its fossils were found — carried back to where that spot was at the time.'), 900);
  }
  renderPanel();
}
init();
