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
const sitesOf = c => c._s || (c._s = (c.sites || []).map(([la, lo, label]) => ({ at: WorldMap.attach(la, lo, c.t[0]), label })));

// ── time ────────────────────────────────────────────────────────────
const T_MAX = 720, MIN_SPAN = 0.006;
// recorded history: the last few thousand years are shown in calendar years
const NOW_YEAR = 2025, HIST_T = 0.0056;
const yearAt = t => NOW_YEAR - t * 1e6, tOfYear = y => Math.max(0, (NOW_YEAR - y) / 1e6);
const fmtYear = y => { y = Math.round(y); return y < 0 ? -y + ' BCE' : y === 0 ? '1 BCE' : y + ' CE'; };   // -250 is 250 BCE
const calYear = (t, step = 1) => fmtYear(Math.round(yearAt(t) / step) * step);
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

const S = { t: 150, view: 'list', weird: false, period: null, tab: 'life', sel: null, scope: 'now', type: 'all', branch: 'all', sort: 'old', q: '', win: [T_MAX, 0], playing: false };
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
  if (t < 0.00002) return 'Today';
  const sp = span();
  if (t < HIST_T && sp <= 0.03) return calYear(t, sp > 0.004 ? 10 : sp > 0.0015 ? 5 : 1);
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
  if (t < 0.012 && step < 0.001) return calYear(t, step >= 0.0005 ? 100 : step >= 0.00005 ? 10 : 1);
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
  if (S.pin) updatePinCard();
  updateYou();
  if (S.tab === 'humans') {
    updateHumansCursor();
    const ck = histKey() + '#' + CULTURES.filter(c => culActive(c)).map(c => c.id).join('|') + '#' + DROWNED.filter(d => drwShown(d)).map(d => d.id + (drwWet(d) ? 'w' : 'd')).join('|');
    if (ck !== lastCulKey) { lastCulKey = ck; updatePlaces(); document.querySelectorAll('.cul-item').forEach(el => el.classList.toggle('now', ck.split('|').includes(el.dataset.cul))); histMark(); }
  }
  clearTimeout(hashTimer); hashTimer = setTimeout(writeHash, 350);
}
function updateClock(fromSlider) {
  const t = S.t, p = S.period;
  $('myaDisplay').textContent = fmtAgo(t);
  const sl = WorldMap.seaLevel(t);
  $('ctDate').textContent = fmtAgo(t).toUpperCase() + (sl <= -10 ? ' · SEA ' + sl + ' M' : sl >= 4 ? ' · SEA +' + sl + ' M' : '');
  const T = globalTemp(t), dT = T == null ? 0 : T - TEMP_TODAY;
  $('ctTemp').textContent = T == null ? '' : '🌡 about ' + Math.round(T) + ' °C · ' + (Math.abs(dT) < 0.75 ? 'much like today' : Math.round(Math.abs(dT)) + '° ' + (dT > 0 ? 'warmer' : 'colder') + ' than today');
  $('ctDate').title = sl <= -10 ? 'Sea level about ' + (-sl) + ' m lower than today — the paler land around today’s coasts was dry ground' : '';
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
  if (S.tab === 'humans' && inHistory()) now = now.filter(c => c.hom);   // recorded history: the map is for empires and beliefs
  if (S.tab === 'finds') { const f = S.sel && S.sel.startsWith('find:') && FIND[S.sel.slice(5)]; now = now.filter(c => f && f.animal === c.name); }   // the find pins have the map to themselves
  WorldMap.setLayers({ markers: now.filter(c => typeOK(c) && c.sites && c.sites.length).map(c => ({ key: c.key, emoji: c.emoji, name: c.name, sites: sitesOf(c) })) });
}
const placeCache = {};
// cultures shown at the current moment: active now, with a little give so short-lived ones can be found
const CUL = Object.fromEntries(CULTURES.map(c => [c.id, c]));
const culActive = (c, t = S.t) => t <= c.t[0] * 1.06 + Math.max(0.0002, slack(t)) && t >= c.t[1] * 0.94 - Math.max(0.0002, slack(t));
const fmtYearsAgo = t => t <= 1e-9 ? 'today' : t >= 1 ? t + ' million years ago' : years(Math.round(t * 1e6 / 100) * 100) + ' years ago';
let lastCulKey = '';
// drowned places: shown from when people lived there until today
const DRW = Object.fromEntries(DROWNED.map(d => [d.id, d]));
const drwShown = (d, t = S.t) => t <= d.lived[0] * 1.15 + 0.0005;
const drwWet = (d, t = S.t) => t <= d.drowned;
const CAUSE = { sea: '🌊 Drowned by the rising sea', lake: '🌊 Drowned by a rising lake', quake: '💥 Sank in earthquakes', volcano: '🌋 Sank as volcanic ground subsided' };
function updatePlaces() {
  const p = S.period; let places = [];
  const mid = (p.start + p.end) / 2;
  if (S.tab === 'insights') places = SITES.filter(s => s[3].includes(p.id)).map(s => placeCache['s' + s[0] + p.id] || (placeCache['s' + s[0] + p.id] = { key: 'site:' + slug(s[0]), name: s[0], note: s[4], at: WorldMap.attach(s[1], s[2], mid) }));
  else if (S.tab === 'humans') places = CULTURES.filter(c => culActive(c)).flatMap(c => c.sites.map((s, i) => placeCache['c' + c.id + i] || (placeCache['c' + c.id + i] = { key: 'cul:' + c.id, name: s[2].split(/,| —/)[0], note: c.name, icon: c.icon, at: WorldMap.attach(s[0], s[1], (c.t[0] + c.t[1]) / 2) })))
    .concat(histPlaces())
    .concat(DROWNED.filter(d => drwShown(d) && (!inHistory() || d.lived[0] <= HIST_T * 1.2 || S.sel === 'drw:' + d.id)).map(d => { const pc = placeCache['d' + d.id] || (placeCache['d' + d.id] = { key: 'drw:' + d.id, name: d.name.split(' —')[0], note: d.story, at: WorldMap.attach(d.site[0], d.site[1], 0.1) }); pc.icon = drwWet(d) ? '🌊' : d.icon; return pc; }));
  else if (S.tab === 'finds') places = FINDS.filter(f => f.at && (S.sel === 'find:' + f.id || (f.age == null ? S.t < 0.0117 : f.age <= p.start && f.age > p.end)))
    .map(f => placeCache['f' + f.id] || (placeCache['f' + f.id] = { key: 'find:' + f.id, name: f.title, note: f.when + ' · ' + f.where, icon: f.icon, at: WorldMap.attach(f.at[0], f.at[1], f.age || 0) }));
  else if (S.tab === 'geo') places = GEO_FEATURES.filter(f => f.at && f.periods.includes(p.id)).map(f => placeCache['g' + f.id + p.id] || (placeCache['g' + f.id + p.id] = { key: 'geo:' + f.id, name: f.name, note: f.shortDesc, icon: f.icon, at: WorldMap.attach(f.at[0], f.at[1], mid) }));
  WorldMap.setLayers({ places, regions: S.tab === 'humans' ? HIST_REGIONS.filter(r => histOn('emp') || r.key === S.sel) : [], routes: S.tab === 'humans' ? histRoutes() : [] });
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
  ['Last 10 million years', 10, 0], ['Last million years', 1, 0], ['Last 100,000 years', 0.1, 0], ['Since the Ice Age', 0.03, 0], ['Recorded history', HIST_T, 0]];
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
    if (S.win[0] < 0.012 && st <= 0.002) {            // recorded history: ticks on round calendar years
      const ys = [2000, 1000, 500, 200, 100, 50, 20, 10].find(v => v <= st * 1e6 * 1.0001) || 10;
      for (let y = Math.ceil(yearAt(S.win[0]) / ys) * ys; y <= yearAt(S.win[1]); y += ys) ticks.push([tOfYear(y), fmtYear(y)]);
    } else
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
  else if (S.tab === 'quiz') renderQuiz();
  else if (S.tab === 'finds') renderFinds();
  else if (S.tab === 'ext') renderExt();
  else renderGeo();
}
function switchTab(tab) {
  if (S.scene && tab !== 'ext') stopScene();
  S.tab = tab; closeFact();
  document.querySelectorAll('.tab-btn').forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
  document.querySelectorAll('.tabpane').forEach(p => p.classList.toggle('on', p.id === 'pane-' + tab));
  if (S.sel && !BY_KEY[S.sel] && !(tab === 'humans' && /^(cul|drw|emp|bel|rt|wk):/.test(S.sel)) && !(tab === 'finds' && /^find:/.test(S.sel)) && !(tab === 'ext' && /^ext:/.test(S.sel))) { S.sel = null; WorldMap.select(null); }
  updateMarkers(); updatePlaces(); renderPanel();
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
// ── peer-reviewed sources ──
const cite = k => { const r = REFS[k]; return `<li>${esc(r.a)} (${r.y}). ${esc(r.t)}. <i>${esc(r.j)}</i>. <a href="https://doi.org/${esc(r.d)}" target="_blank" rel="noopener">doi.org/${esc(r.d)}</a></li>`; };
function srcHTML(target, title) {
  const ks = SRCMAP[target]; if (!ks || !ks.length) return '';
  return `<div class="label-sec sources"><h5>📚 ${title || 'Peer-reviewed sources'}</h5><ul>${ks.map(cite).join('')}</ul></div>`;
}
function allSourcesHTML() {
  const n = Object.keys(REFS).length, has = t => !!SRCMAP[t];
  const rate = (list, f) => { const k = list.filter(f).length; return `${k} of ${list.length}`; };
  const cov = [['animal entries', rate(ALL.filter(c => !c.hom), c => has('a:' + c.name))], ['human species', rate(HOMININS, h => has('h:' + h.id))], ['cultures', rate(CULTURES, c => has('c:' + c.id))],
    ['drowned sites', rate(DROWNED, d => has('d:' + d.id))], ['periods', rate(PERIODS, p => has('p:' + p.id))], ['food webs', rate(Object.keys(FOODWEBS), id => has('f:' + id))], ['discovery stories', rate(FINDS, f => has('x:' + f.id))]];
  const keys = Object.keys(REFS).sort((x, y) => REFS[x].a.localeCompare(REFS[y].a) || REFS[x].y - REFS[y].y);
  return `<details class="fw-how all-src"><summary>📚 All ${n} peer-reviewed sources on this site</summary>
    <div class="src-note">Every reference is checked against the Crossref DOI registry — title, year and first author must match a registered paper before it can appear here. Coverage so far: ${cov.map(c => `${c[1]} ${c[0]}`).join(' · ')}. Entries without a listed source draw on standard references and museum summaries, and are being sourced one by one.</div>
    <ul>${keys.map(cite).join('')}</ul></details>`;
}
function cardHTML(c, open) {
  const h = c.hom, L = [];
  const sec = (title, body) => body ? `<div class="label-sec"><h5>${title}</h5>${body}</div>` : '';
  if (open) {
    L.push(sizeHTML(c));
    L.push(findLinks(c));
    L.push(srcHTML(c.hom ? 'h:' + c.key : 'a:' + c.name));
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
    <div class="creature-chips"><span class="diet-chip diet-${c.diet}">${DIET[c.diet] || esc(c.diet)}</span><span class="habitat-badge">${TYPES[c.g][0]} ${TYPES[c.g][1]}</span>${c.weird ? '<span class="habitat-badge">🤪 Weird & wonderful</span>' : ''}${!open && SRCMAP[(c.hom ? 'h:' + c.key : 'a:' + c.name)] ? `<span class="habitat-badge" title="Peer-reviewed sources">📚 ${SRCMAP[(c.hom ? 'h:' + c.key : 'a:' + c.name)].length}</span>` : ''}${!open && (c.know || c.debate) ? '<span class="habitat-badge">🔎 How do we know?</span>' : ''}</div>
    <div class="lineage">🧬 <b>${esc(c.path[0])}</b>${c.path.slice(1).map(s => ' › ' + esc(s)).join('')}</div>
    ${L.join('')}</div>`;
}
const rowHTML = (c, isAlive, tree) => `<div class="crow${isAlive ? ' alive' : ''}" data-key="${c.key}"><span class="e">${c.emoji}</span><span class="n">${esc(c.name)}<small>${esc(tree ? c.size || '' : c.path.slice(1).join(' › ') || c.path[0])}</small></span><span class="w">${esc(c.lived || '')}</span></div>`;
// ── when each group lived: a range chart, oldest group at the top ──
const EXT_LINES = [[445, 'End-Ordovician'], [372, 'Late Devonian'], [252, 'The Great Dying'], [201, 'End-Triassic'], [66, 'The asteroid']];
function chartHTML() {
  const pool = ALL.filter(c => !S.weird || c.weird), x = t => (storyPos(t) / 10).toFixed(2);
  const spanOf = list => [Math.max(...list.map(c => c.t[0])), Math.min(...list.map(c => c.t[1]))];
  const row = (label, list, cls, attrs, color) => {
    const [a, b] = spanOf(list), alive = list.some(c => alive_(c));
    return `<div class="rc-row ${cls}${alive ? ' now' : ''}" ${attrs} title="${esc(label)}: ${esc(fmtLong(a))} → ${esc(fmtLong(b))} · ${list.length} on this site">
      <div class="rc-lab">${label}<small>${list.length}</small></div>
      <div class="rc-track"><div class="rc-bar" style="left:${x(a)}%;width:${Math.max(0.8, x(b) - x(a))}%;background:${color}"></div></div></div>`;
  };
  const alive_ = c => alive(c, S.t);
  const kinds = TYPE_ORDER.map(g => [g, pool.filter(c => c.g === g)]).filter(([, l]) => l.length).sort((p, q) => spanOf(q[1])[0] - spanOf(p[1])[0]);
  const COL = { micro: '#7fb3a8', plant: '#5fae62', invert: '#c98d4b', fish: '#4f9fd6', amphib: '#7bc47f', synapsid: '#c97a5b', reptile: '#9dbb5a', croc: '#6f9a5d', marine: '#3fb3c4', ptero: '#b78ad6', dino: '#e2a33a', bird: '#e2d05a', mammal: '#d2765c', hominin: '#f0c040' };
  let rows = '';
  for (const [g, list] of kinds) {
    rows += row(`${TYPES[g][0]} ${TYPES[g][1]}`, list, 'kind' + (S.type === g ? ' open' : ''), `data-chart-type="${g}"`, COL[g]);
    if (S.type === g) {
      const br = {}; list.forEach(c => (br[c.path[1] || c.path[0]] = br[c.path[1] || c.path[0]] || []).push(c));
      Object.entries(br).sort((p, q) => spanOf(q[1])[0] - spanOf(p[1])[0]).forEach(([b, l]) => { rows += row(esc(b), l, 'branch', `data-chart-branch="${esc(b)}" data-chart-of="${g}"`, COL[g]); });
    }
  }
  const ticks = [[539, '539 M'], [252, '252'], [66, '66'], [2.58, '2.6'], [0, 'now']];
  return `<div class="list-h">When each group lived<small>Oldest at the top. Tap a group to see its branches, a branch to list its animals.</small></div>
    <div class="rc"><div class="rc-axis"><div></div><div class="rc-track">${ticks.map(([t, l]) => `<span style="left:${x(t)}%">${l}</span>`).join('')}</div></div>
      <div class="rc-body">${EXT_LINES.map(([t, n]) => `<div class="rc-ext" style="left:calc(var(--lab) + (100% - var(--lab)) * ${x(t)} / 100)" title="${esc(n)} — ${t} million years ago"></div>`).join('')}
      <div class="rc-cur" style="left:calc(var(--lab) + (100% - var(--lab)) * ${x(S.t)} / 100)"></div>${rows}</div></div>
    <div class="hf-note">Bars span the animals on this site, so they show when each group appears here — not always its full history. Red lines are the five great mass extinctions; the white line is now on the timeline. Bars for groups alive at that moment are bright. Time is stretched toward the present so recent groups are visible.</div>`;
}
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
  if (S.view === 'chart') { $('lifeList').innerHTML = chartHTML(); $('lifeCount').textContent = ''; return; }
  if (S.view === 'tree') { $('lifeList').innerHTML = treeHTML(); $('lifeCount').textContent = ''; return; }
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
  $('treeBtn').addEventListener('click', () => setView(S.view === 'tree' ? 'list' : 'tree'));
  $('chartBtn').addEventListener('click', () => { S.view = S.view === 'chart' ? 'list' : 'chart'; $('treeBtn').classList.remove('on'); $('treeBtn').setAttribute('aria-pressed', 'false'); $('chartBtn').classList.toggle('on', S.view === 'chart'); $('chartBtn').setAttribute('aria-pressed', String(S.view === 'chart')); renderLife(); });
  $('lifeList').addEventListener('click', e => {
    const kt = e.target.closest('[data-chart-type]'); if (kt) { S.type = S.type === kt.dataset.chartType ? 'all' : kt.dataset.chartType; S.branch = 'all'; updateMarkers(); renderLife(); e.stopPropagation(); return; }
    const kb = e.target.closest('[data-chart-branch]'); if (kb) { S.type = kb.dataset.chartOf; S.branch = kb.dataset.chartBranch; S.view = 'list'; S.scope = 'all'; S.sort = 'old'; $('sortSel').value = 'old'; $('chartBtn').classList.remove('on'); document.querySelectorAll('#scopeSeg button').forEach(x => x.classList.toggle('on', x.dataset.scope === 'all')); updateMarkers(); renderLife(); e.stopPropagation(); }
  }, true);
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
    <div class="found">📍 <b>Found at:</b> ${h.sites.map(s => esc(s[2])).join(' · ')}</div>${srcHTML('h:' + h.id)}</div>`;
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
    ${S.sel && S.sel.startsWith('rt:') && TRD[S.sel.slice(3)] ? routeHTML(TRD[S.sel.slice(3)]) : S.sel && S.sel.startsWith('wk:') && WRK[S.sel.slice(3)] ? workHTML(WRK[S.sel.slice(3)]) : S.sel && S.sel.startsWith('emp:') && EMP[S.sel.slice(4)] ? empireHTML(EMP[S.sel.slice(4)]) : S.sel && S.sel.startsWith('bel:') && BEL[S.sel.slice(4)] ? beliefHTML(BEL[S.sel.slice(4)]) : S.sel && S.sel.startsWith('drw:') && DRW[S.sel.slice(4)] ? drownedHTML(DRW[S.sel.slice(4)]) : S.sel && S.sel.startsWith('cul:') && CUL[S.sel.slice(4)] ? cultureHTML(CUL[S.sel.slice(4)]) : sel ? profileHTML(sel) : `<div class="empty">${S.t > 7.05 ? '' : nowList.length ? 'Tap a bar — or a marker on the map — to meet them.' : ''}</div>`}
    <div class="ms"><div class="list-h" style="padding-left:2px">Ways of life <small>homes, settlements and cultures — tap one, or a pin on the map</small></div>${CULTURES.map(c => `<div class="ms-item cul-item${culActive(c) ? ' now' : ''}${S.sel === 'cul:' + c.id ? ' sel' : ''}" data-cul="${c.id}"><span class="when">${c.t[0] >= 1 ? c.t[0] + ' MYA' : years(Math.round(c.t[0] * 1e6 / 100) * 100) + ' yrs'}</span><span>${c.icon}</span><div><b>${esc(c.name)}</b><span>${esc(c.where)}</span></div></div>`).join('')}</div>
    ${histListsHTML()}
    <div class="ms"><div class="list-h" style="padding-left:2px">Drowned worlds <small>places people lived that are now under water — 🌊 on the map once flooded</small></div>${DROWNED.map(d => `<div class="ms-item cul-item drw-item${drwShown(d) ? ' now' : ''}${S.sel === 'drw:' + d.id ? ' sel' : ''}" data-drw="${d.id}"><span class="when">${d.drowned >= 0.001 ? years(Math.round(d.drowned * 1e6 / 100) * 100) + ' yrs' : Math.round(d.drowned * 1e6) + ' yrs'}</span><span>${d.icon}</span><div><b>${esc(d.name)}</b><span>${esc(d.where)} · ${esc(d.depth)}</span></div></div>`).join('')}</div>
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
    <div class="found">📍 <b>On the map:</b> ${c.sites.map(s => esc(s[2])).join(' · ')}</div>${srcHTML('c:' + c.id)}</div>`;
}
function drownedHTML(d) {
  const sec = (t, b) => b ? `<div class="label-sec"><h5>${t}</h5>${esc(b)}</div>` : '';
  const now = S.t > d.lived[0] ? 'People had not arrived yet at this moment on the timeline.' : S.t > d.drowned ? 'At this moment on the timeline it is dry land — people are living here.' : 'At this moment on the timeline it is under water.';
  return `<div class="profile culture drowned" data-key="drw:${d.id}"><h3 style="font-style:normal">${d.icon} ${esc(d.name)}</h3>
    <dl class="facts"><dt>Where</dt><dd>${esc(d.where)}</dd><dt>People</dt><dd>${esc(fmtLong(d.lived[0]).replace(' ago', ''))} → ${esc(fmtLong(d.lived[1]))}</dd><dt>Drowned</dt><dd>${esc(fmtLong(d.drowned))}</dd><dt>Today</dt><dd>${esc(d.depth)}</dd><dt>Why</dt><dd>${CAUSE[d.cause]}</dd></dl>
    <div class="drw-now">${now}</div>
    <div class="creature-fact">${esc(d.story)}</div>${sec('🔎 How do we know?', d.know)}${sec('❓ Still debated', d.debate)}
    <div class="found">📍 <b>On the map:</b> ${esc(d.site[2])}</div>${srcHTML('d:' + d.id)}</div>`;
}
function selectDrowned(id, fromMap) {
  const d = DRW[id]; if (!d) return;
  S.sel = 'drw:' + id; WorldMap.select(S.sel);
  if (S.tab !== 'humans') switchTab('humans');
  const target = tidy((d.lived[0] + d.lived[1]) / 2);
  const look = () => { const pl = placeCache['d' + id]; if (pl) WorldMap.lookAt(pl.at); };
  if (Math.abs(S.t - target) > Math.max(0.0005, target * 0.15)) {
    const sp = Math.max(0.02, d.lived[0] * 1.6);
    if (isFull() || span() > sp * 3 || target > S.win[0] || target < S.win[1]) setWindow(Math.min(T_MAX, sp), 0, true);
    goTo(target, () => { updatePlaces(); look(); renderHumans(); });
  } else { updatePlaces(); look(); }
  renderHumans();
  if (fromMap && window.innerWidth < 768) showFact(d.icon, '<b>' + esc(d.name) + '</b> — ' + esc(d.story));
  setTimeout(() => { const el = document.querySelector('#pane-humans .profile'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 80);
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
    const hl = e.target.closest('[data-hl]'); if (hl) { S.histOff = S.histOff || {}; S.histOff[hl.dataset.hl] = !S.histOff[hl.dataset.hl]; updatePlaces(); renderHumans(); return; }
    const hg = e.target.closest('[data-hist-go]'); if (hg) { travel(tOfYear(1), () => { updatePlaces(); renderHumans(); }); return; }
    const yr = e.target.closest('[data-year]'); if (yr) { travel(tOfYear(+yr.dataset.year + 1), () => { updatePlaces(); renderHumans(); }); return; }
    const rt = e.target.closest('[data-rt]'); if (rt) { selectHist('rt', rt.dataset.rt); return; }
    const wk = e.target.closest('[data-wk]'); if (wk) { selectHist('wk', wk.dataset.wk); return; }
    const em = e.target.closest('[data-emp]'); if (em) { selectEmpire(em.dataset.emp); return; }
    const be = e.target.closest('[data-bel]'); if (be) { selectBelief(be.dataset.bel); return; }
    const dw = e.target.closest('.drw-item'); if (dw) { selectDrowned(dw.dataset.drw); return; }
    const cu = e.target.closest('.cul-item'); if (cu) { selectCulture(cu.dataset.cul); return; }
    const m = e.target.closest('.ms-item'); if (m) { goTo(+m.dataset.t); return; }
    const r = e.target.closest('.hf-row'); if (r) select(r.dataset.key);
  });
}

// --- Family trees: who branched from whom ---
// Hang every animal on the branch with the longest matching lineage path, once per tree.
const TREE_BUILT = {};
function buildTree(T) {
  if (TREE_BUILT[T.id]) return TREE_BUILT[T.id];
  const nodes = []; let seq = 0;
  const prep = (n, parent, depth) => {
    n.id = T.id + seq++; n.parent = parent; n.depth = depth; n.own = []; nodes.push(n);
    if (n.auto) {     // one folded-away twig per group under this path
      const claimed = nodes.concat(allPaths(T.root)).flatMap(x => x.paths || []);
      const groups = [...new Set(ALL.filter(c => c.path[0] === n.paths[0] && c.path[1]).map(c => c.path[0] + ' › ' + c.path[1]))].filter(p => !claimed.includes(p));
      n.kids = groups.map(p => ({ n: p.split(' › ')[1], paths: [p], twig: true }));
    }
    (n.kids || []).forEach(k => prep(k, n, k.trunk ? depth : depth + 1));
  };
  const allPaths = n => [n].concat((n.kids || []).flatMap(allPaths));
  prep(T.root, null, 0);
  for (const c of ALL) {
    const ps = c.path.join(' › '); let best = null, len = -1;
    for (const n of nodes) for (const p of n.paths || []) if ((ps === p || ps.startsWith(p + ' › ')) && p.length > len) { best = n; len = p.length; }
    if (best) best.own.push(c);
  }
  const total = n => { n.all = n.own.concat((n.kids || []).flatMap(total)); n.t0 = Math.max(0, ...n.all.map(c => c.t[0])); n.t1 = n.all.length ? Math.min(...n.all.map(c => c.t[1])) : 0; return n.all; };
  total(T.root);
  for (const n of nodes) if (n.auto) n.kids.sort((a, b) => b.t0 - a.t0);
  return TREE_BUILT[T.id] = { nodes, max: T.root.t0, byId: Object.fromEntries(nodes.map(n => [n.id, n])) };
}
function treeHTML() {
  const T = TREES.find(t => t.id === S.tree) || TREES[0], B = buildTree(T), open = S.treeOpen || (S.treeOpen = {});
  const x = t => (100 * (1 - t / B.max)).toFixed(2), pad = slack(S.t);
  const sel = S.sel && BY_KEY[S.sel];
  if (sel) for (const n of B.nodes) if (n.own.includes(sel)) { open[n.id] = true; for (let p = n.parent; p; p = p.parent) if (p.auto) open[p.id] = true; }   // show where the chosen animal hangs
  const row = n => {
    if (n.twig && !open[n.parent.id]) return '';
    const live = n.all.length && S.t <= n.t0 + pad && S.t >= n.t1 - pad, isOpen = !!open[n.id], kids = n.kids || [];
    const members = isOpen ? n.own.slice().sort((a, b) => b.t[0] - a.t[0]) : [];
    return `<div class="tn${n.trunk || !n.parent ? ' trunk' : ''}${n.twig ? ' twig' : ''}${live ? ' live' : ''}${isOpen ? ' open' : ''}" style="--d:${n.depth + (n.twig ? 1 : 0)}">
      <button class="tn-head" data-node="${n.id}" aria-expanded="${isOpen}">
        <span class="tn-name">${n.trunk ? '<i class="tn-arrow">↓</i>' : ''}${esc(n.n)}${n.sci ? ` <em>${esc(n.sci)}</em>` : ''}</span><span class="tn-n">${n.all.length}</span>
        <span class="tn-bar">${n.all.length ? `<i style="left:${x(n.t0)}%;width:${Math.max(1.2, x(n.t1) - x(n.t0)).toFixed(2)}%"></i>` : ''}${S.t <= B.max ? `<b style="left:${x(S.t)}%"></b>` : ''}</span>
      </button>
      ${n.step ? `<div class="tn-step"><b>＋</b> ${esc(n.step)}</div>` : ''}
      ${isOpen ? `<div class="tn-body">${n.note ? `<p>${esc(n.note)}</p>` : ''}${n.debate ? `<p class="tn-deb">❓ ${esc(n.debate)}</p>` : ''}
        ${n.all.length ? `<p class="tn-when">${esc(fmtLong(n.t0).replace(' ago', ''))} → ${esc(fmtLong(n.t1))} · from the ${n.all.length} in this app</p>` : ''}
        ${members.length ? `<div class="tn-mem">${members.map(c => `<button class="chip${c.key === S.sel ? ' on' : ''}${alive(c, S.t, pad) ? ' now' : ''}" data-key="${c.key}">${c.emoji} ${esc(c.name)}</button>`).join('')}</div>` : ''}
        ${n.auto ? `<p class="tn-when">${kids.length} groups branch from here — listed below.</p>` : !members.length && kids.length ? `<p class="tn-when">Its members are on the branches below.</p>` : ''}
        ${sel && n.own.includes(sel) ? cardHTML(sel, true) : ''}</div>` : ''}
    </div>${kids.filter(k => !k.trunk).map(row).join('')}${kids.filter(k => k.trunk).map(row).join('')}`;
  };
  const ticks = []; for (let t = Math.ceil(B.max / 50) * 50; t >= 0; t -= 50) if (t <= B.max) ticks.push(t);
  return `<div class="tree">
    <div class="chips" id="treeChips">${TREES.map(t => `<button class="chip${t === T ? ' on' : ''}" data-tree="${t.id}">${t.icon} ${esc(t.title)}</button>`).join('')}<button class="chip" data-tree="humans">🧍 The human family →</button></div>
    <div class="hf-intro">${esc(T.intro)}</div>
    <div class="tn-key"><span><i class="k-trunk"></i>the main trunk</span><span><b>＋</b> a new feature, inherited by everything below</span><span><i class="k-bar"></i>when its members lived (${ticks.map(t => t || 'today').join(' · ')} million years ago)</span><span>number = animals in this app · tap a branch to open it</span></div>
    ${row(T.root)}
    <div class="ins-sec tn-debate"><h4>❓ Where the experts disagree</h4>${esc(T.debate)}</div>
    ${srcHTML('t:' + T.id, 'Sources for this tree')}</div>`;
}
function setView(v) {
  S.view = v;
  $('treeBtn').classList.toggle('on', v === 'tree'); $('treeBtn').setAttribute('aria-pressed', String(v === 'tree'));
  $('chartBtn').classList.toggle('on', v === 'chart'); $('chartBtn').setAttribute('aria-pressed', String(v === 'chart'));
  renderLife(); $('panelContent').scrollTop = 0;
}
function bindTree() {
  $('lifeList').addEventListener('click', e => {
    if (S.view !== 'tree') return;
    const tc = e.target.closest('[data-tree]');
    if (tc) { e.stopPropagation(); if (tc.dataset.tree === 'humans') { switchTab('humans'); return; } S.tree = tc.dataset.tree; S.treeOpen = {}; renderLife(); return; }
    const nh = e.target.closest('[data-node]');
    if (nh) { e.stopPropagation(); const o = S.treeOpen || (S.treeOpen = {}); o[nh.dataset.node] = !o[nh.dataset.node]; if (!o[nh.dataset.node] && S.sel && BY_KEY[S.sel]) { const n = buildTree(TREES.find(t => t.id === S.tree) || TREES[0]).byId[nh.dataset.node]; if (n && n.own.includes(BY_KEY[S.sel])) { S.sel = null; WorldMap.select(null); } } renderLife(); }
  }, true);
}

// --- Finds: how people found out ---
const FIND = Object.fromEntries(FINDS.map(f => [f.id, f]));
const findLinks = c => { const fs = FINDS.filter(f => c.hom ? f.hom === c.key : f.animal === c.name); return fs.length ? `<div class="found find-links">⛏️ <b>How it was found:</b> ${fs.map(f => `<button class="linkbtn" data-find="${f.id}">${esc(f.title)} · ${esc(f.when)}</button>`).join(' ')}</div>` : ''; };
// years on the strip: ancient times squeezed on the left, the last two centuries given most of the room
const findX = y => y < 1600 ? 1 + 9 * clamp((y + 700) / 2300, 0, 1) : y < 1800 ? 10 + 12 * (y - 1600) / 200 : 22 + 77 * (y - 1800) / 230;
function findHTML(f) {
  const sec = (t, b) => b ? `<div class="label-sec"><h5>${t}</h5>${esc(b)}</div>` : '';
  const c = f.animal && ALL.find(x => x.name === f.animal), h = f.hom && BY_KEY[f.hom];
  return `<div class="profile culture find" data-key="find:${f.id}"><h3 style="font-style:normal">${f.icon} ${esc(f.title)}</h3>
    <dl class="facts"><dt>When</dt><dd>${esc(f.when)}</dd><dt>Who</dt><dd>${esc(f.who)}</dd><dt>Where</dt><dd>${esc(f.where)}</dd>${f.age != null ? `<dt>Fossil age</dt><dd>${esc(fmtLong(f.age))}</dd>` : ''}</dl>
    <div class="creature-fact">${esc(f.story)}</div>
    ${sec('🙃 What they got wrong', f.wrong)}${sec('🙋 Who gets left out', f.left)}${sec('❓ Still debated', f.debate)}${sec('💡 Why it mattered', f.mattered)}
    ${c || h ? `<div class="found">${c ? `<button class="linkbtn" data-meet="${c.key}">${c.emoji} Meet ${esc(c.name)}</button> ` : ''}${h ? `<button class="linkbtn" data-meet="${h.key}" data-hom="1">🧍 Meet ${esc(shortName(h.name))}</button>` : ''}</div>` : ''}
    ${f.at ? `<div class="found">📍 <b>On the map:</b> ${f.age != null ? 'the pin marks the spot — carried back to where it was on Earth when this fossil was alive.' : 'the pin marks the place today.'}</div>` : ''}${srcHTML('x:' + f.id)}</div>`;
}
function renderFinds() {
  const th = S.findTheme || 'all', show = f => th === 'all' || f.theme === th, sel = S.sel && S.sel.startsWith('find:') && FIND[S.sel.slice(5)];
  const lanes = Object.keys(FIND_THEMES), ticks = [[-700, 'ancient'], [1600, '1600'], [1800, '1800'], [1850, '1850'], [1900, '1900'], [1950, '1950'], [2000, '2000']];
  const dots = FINDS.map(f => `<button class="fd th-${f.theme}${show(f) ? '' : ' off'}${sel === f ? ' sel' : ''}" data-find="${f.id}" style="left:${findX(f.year).toFixed(2)}%;top:${lanes.indexOf(f.theme) * 16 + 4}px" title="${esc(f.when + ' — ' + f.title)}" aria-label="${esc(f.when + ', ' + f.title)}"></button>`).join('');
  const n1800 = FINDS.filter(f => f.year < 1800).length;
  $('pane-finds').innerHTML = `<div class="hf finds">
    <div class="hf-intro">Nobody has ever seen a living dinosaur. Everything on this site was worked out from finds like these — ${FINDS.length} of them, from ancient guesses to last year’s laboratories. People got a lot wrong on the way, and the cards say what.</div>
    <div class="chips" id="findChips"><button class="chip${th === 'all' ? ' on' : ''}" data-theme="all">All <small>${FINDS.length}</small></button>${lanes.map(k => `<button class="chip${th === k ? ' on' : ''}" data-theme="${k}">${FIND_THEMES[k]} <small>${FINDS.filter(f => f.theme === k).length}</small></button>`).join('')}</div>
    <div class="fstrip" aria-label="Finds by year"><div class="fs-in" style="height:${lanes.length * 16 + 6}px">${ticks.map(([y]) => `<i style="left:${findX(y)}%"></i>`).join('')}${dots}</div>
      <div class="hf-axis fs-axis">${ticks.map(([y, l]) => `<span style="left:${findX(y)}%">${l}</span>`).join('')}</div></div>
    <div class="hf-legend">${lanes.map(k => `<span><i class="th-${k}"></i>${FIND_THEMES[k].replace(/^\S+ /, '')}</span>`).join('')}</div>
    <div class="hf-note">Each dot is a find. ${n1800} come from before 1800 — what people knew before fossil science began.</div>
    ${sel ? findHTML(sel) : '<div class="empty">Tap a dot or a row — the map jumps to the world that fossil lived in.</div>'}
    ${FIND_ERAS.map(([id, name, sub]) => { const fs = FINDS.filter(f => f.era === id && show(f)).sort((a, b) => a.year - b.year); return fs.length ? `<div class="ms"><div class="list-h" style="padding-left:2px">${esc(name)} <small>${esc(sub)}</small></div>${fs.map(f => `<div class="ms-item cul-item find-item now${sel === f ? ' sel' : ''}" data-find="${f.id}"><span class="when">${esc(f.when)}</span><span>${f.icon}</span><div><b>${esc(f.title)}</b><span>${esc(f.who.split(/;|, with| \(/)[0])} · ${esc(f.where.split(/,| \(/)[0])}</span></div></div>`).join('')}</div>` : ''; }).join('')}
    <div class="src">Dates are when a fossil was found or first described. Where a story is a later legend or still argued over, the card says so.</div></div>`;
}
function selectFind(id, fromMap) {
  const f = FIND[id]; if (!f) return;
  S.sel = 'find:' + id; WorldMap.select(S.sel);
  updateMarkers();
  if (S.tab !== 'finds') switchTab('finds');
  const look = () => { updatePlaces(); const pl = placeCache['f' + id]; if (pl) WorldMap.lookAt(pl.at); };
  if (f.at) {
    travel(f.age == null ? 0 : f.age, () => { look(); renderFinds(); }) || look();
  } else updatePlaces();
  renderFinds();
  if (fromMap && window.innerWidth < 768) showFact(f.icon, '<b>' + esc(f.title) + '</b> (' + esc(f.when) + ') — ' + esc(f.story));
  setTimeout(() => { const el = document.querySelector('#pane-finds .profile'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 80);
}
function bindFinds() {
  $('pane-finds').addEventListener('click', e => {
    const ch = e.target.closest('[data-theme]'); if (ch) { S.findTheme = ch.dataset.theme; renderFinds(); return; }
    const m = e.target.closest('[data-meet]'); if (m) { switchTab(m.dataset.hom ? 'humans' : 'life'); select(m.dataset.meet, { keep: true }); return; }
    const f = e.target.closest('[data-find]'); if (f) selectFind(f.dataset.find);
  });
  // "How it was found" buttons on animal and human cards, anywhere else on the page
  document.addEventListener('click', e => { const f = e.target.closest('[data-find]'); if (f && !f.closest('#pane-finds')) { e.stopPropagation(); e.preventDefault(); selectFind(f.dataset.find); } }, true);
}

// --- Extinctions: the great dyings, each with a scene on the map ---
const EXT = Object.fromEntries(EXTINCTIONS.map(e => [e.id, e]));
const extInfo = e => PERIODS.find(p => p.id === e.id).insight.ext;
const extLost = e => ALL.filter(c => !c.hom && c.t[1] <= e.lost[0] && c.t[1] >= e.lost[1] && c.t[1] > 0).sort((a, b) => b.t[1] - a.t[1]);
const extThrough = e => ALL.filter(c => !c.hom && c.t[0] > e.lost[0] && c.t[1] < e.lost[1] - (e.lost[0] - e.lost[1]) * 0.5).sort((a, b) => (b.t[0] - b.t[1]) - (a.t[0] - a.t[1]));
function renderExt() {
  const sel = S.sel && S.sel.startsWith('ext:') && EXT[S.sel.slice(4)], five = EXTINCTIONS.filter(e => e.pct);
  const chip = c => `<button class="chip" data-meet="${c.key}">${c.emoji} ${esc(c.name)}</button>`;
  const detail = e => {
    const x = extInfo(e), lost = extLost(e), thr = extThrough(e), playing = S.scene && S.scene.id === e.id;
    return `<div class="profile culture ext" data-key="ext:${e.id}"><h3 style="font-style:normal">${e.icon} ${esc(x.name)}</h3>
      <dl class="facts"><dt>When</dt><dd>${esc(x.when)}</dd><dt>Lost</dt><dd>${esc(x.toll)}</dd><dt>Cause</dt><dd>${esc(x.cause)}</dd><dt>Recovery</dt><dd>${esc(e.recovery)}</dd></dl>
      <button class="watch" data-play="${e.id}">${playing ? '■ Stop' : '▶ Watch it happen on the map'}</button>
      <div class="label-sec"><h5>🎬 What happened, step by step</h5><ol class="ext-steps">${e.steps.map((st, i) => `<li${playing && S.scene.step === i ? ' class="on"' : ''}>${esc(st[1])}</li>`).join('')}</ol></div>
      ${lost.length ? `<div class="label-sec"><h5>🕯 Last seen about now — ${lost.length} in this app</h5><div class="tn-mem">${lost.slice(0, 36).map(chip).join('')}${lost.length > 36 ? `<span class="more">+ ${lost.length - 36} more</span>` : ''}</div></div>` : ''}
      ${thr.length ? `<div class="label-sec"><h5>🌱 Came through — ${thr.length} in this app</h5><div class="tn-mem">${thr.slice(0, 18).map(chip).join('')}${thr.length > 18 ? `<span class="more">+ ${thr.length - 18} more</span>` : ''}</div></div>` : ''}
      <div class="label-sec"><h5>🌅 Who inherited the world</h5>${esc(e.winners)}</div>
      <div class="label-sec"><h5>🔎 How do we know?</h5>${esc(e.know)}</div><div class="label-sec"><h5>❓ Still debated</h5>${esc(e.debate)}</div>
      ${srcHTML('e:' + e.id)}</div>`;
  };
  $('pane-ext').innerHTML = `<div class="hf exts">
    <div class="hf-intro">At least five times, most of the living things on Earth have died within a short time. Each time life came back — but different. You are here because of who came through. Pick one, then watch it happen on the map.</div>
    <div class="ext-chart" aria-label="Share of species lost in each of the five great dyings">${five.map(e => `<button class="ext-bar${sel === e ? ' sel' : ''}" data-ext="${e.id}"><span class="eb-n">${e.icon} ${esc(e.short)}</span>
      <span class="eb-t"><i style="width:${e.pct[0]}%"></i>${e.pct[1] > e.pct[0] ? `<i class="hi" style="left:${e.pct[0]}%;width:${e.pct[1] - e.pct[0]}%"></i>` : ''}</span><span class="eb-v">${e.pct[0] === e.pct[1] ? e.pct[0] : e.pct[0] + '–' + e.pct[1]}%</span></button>`).join('')}
      <div class="hf-note">Share of species lost — best estimates, worked out mostly from sea-life fossils. Paler bar = the range of estimates.</div></div>
    ${sel ? detail(sel) : ''}
    <div class="ms"><div class="list-h" style="padding-left:2px">The great dyings <small>oldest first</small></div>${EXTINCTIONS.map(e => { const x = extInfo(e); return `<div class="ms-item cul-item now ext-item${sel === e ? ' sel' : ''}" data-ext="${e.id}"><span class="when">${e.t >= 1 ? tidy(e.t) + ' MYA' : e.t > 0 ? years(Math.round(e.t * 1e6 / 100) * 100) + ' yrs' : 'now'}</span><span>${e.icon}</span><div><b>${esc(e.short)}</b><span>${esc(x.name)} · ${esc(x.toll.split(/[;:]/)[0])}</span></div></div>`; }).join('')}</div>
    <div class="src">The map scenes are illustrations of what the evidence says happened, in order — not pictures of what it looked like. Colours, speeds and sizes are chosen to be read, and each card says what is still argued over.</div></div>`;
}
function selectExt(id, o = {}) {
  const e = EXT[id]; if (!e) return;
  if (S.scene && S.scene.id !== id) stopScene();
  S.sel = 'ext:' + id; WorldMap.select(null);
  if (S.tab !== 'ext') switchTab('ext');
  if (!o.stay) { setWindow(e.win[0], e.win[1], true); goTo(e.from, () => renderExt()); }
  renderExt();
  if (!o.stay) setTimeout(() => { const el = document.querySelector('#pane-ext .profile'); if (el && window.innerWidth >= 768) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 80);
}

// ── scenes: what each extinction did, drawn over the map ──
// Every scene is a function of k (0 → 1 through the scene) and the clock; nothing is left to chance.
const ramp = (k, a, b) => clamp((k - a) / (b - a), 0, 1), bump = (k, a, b, c, d) => Math.min(ramp(k, a, b), 1 - ramp(k, c, d));
const fillAll = (g, color) => c => { c.fillStyle = color; c.fillRect(0, 0, g.W, g.H); };
const glow = (c, p, R, stops) => { const gr = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], R); stops.forEach(([o, col]) => gr.addColorStop(o, col)); c.fillStyle = gr; c.beginPath(); c.arc(p[0], p[1], R, 0, 7); c.fill(); };
const LAVA = [[0, 'rgba(255,224,130,0.95)'], [0.3, 'rgba(244,104,30,0.7)'], [0.7, 'rgba(150,30,14,0.3)'], [1, 'rgba(90,20,10,0)']];
const SCENES = {
  // Ordovician: ice grows over the polar land, the seas chill and drain, then stagnate as it melts
  ice(g, k, sc) {
    const ice = bump(k, 0.1, 0.44, 0.6, 0.8), out = 1 - ramp(k, 0.94, 1);
    g.layer('sea', fillAll(g, `rgba(170,205,240,${0.3 * ice * out})`));
    g.layer('sea', c => g.halo(c, 7 * ice, `rgba(226,210,160,${0.75 * ice})`));                       // sea floor left dry
    g.layer('all', c => { for (const [d, a] of [[0, 0.9], [5, 0.45], [10, 0.2]]) { c.fillStyle = `rgba(244,249,252,${a * Math.min(1, ice * 1.4)})`; c.fill(g.cap(true, 4 + 36 * ice - d + (d ? 0 : 0))); } });
    g.layer('sea', fillAll(g, `rgba(72,40,92,${0.42 * bump(k, 0.6, 0.8, 0.94, 1)})`));                 // oxygen-poor water
  },
  // Devonian: land greens, nutrients wash off the coasts, the seas go stagnant
  anoxia(g, k, sc, now) {
    const out = 1 - ramp(k, 0.94, 1), pulse = 0.85 + 0.15 * Math.sin(now / 900);
    g.layer('land', fillAll(g, `rgba(46,128,58,${0.42 * ramp(k, 0.03, 0.3) * out})`));
    g.layer('sea', c => g.halo(c, 4 + 12 * ramp(k, 0.26, 0.55), `rgba(132,158,62,${0.6 * bump(k, 0.26, 0.45, 0.8, 0.95)})`));
    g.layer('sea', fillAll(g, `rgba(66,34,86,${0.46 * ramp(k, 0.48, 0.72) * pulse * out})`));
  },
  // End-Permian: lava in Siberia, gas round the planet, heat on land, acid and airless seas
  traps(g, k, sc, now) {
    const out = 1 - ramp(k, 0.94, 1), p = sc.at && g.pt(sc.at);
    g.layer('all', c => { const path = sc.at && g.circle(sc.at, 6 + 174 * ramp(k, 0.14, 0.5)); if (path) { c.fillStyle = `rgba(176,84,34,${0.2 * ramp(k, 0.14, 0.24) * out})`; c.fill(path); } });
    g.layer('land', fillAll(g, `rgba(206,84,22,${0.3 * ramp(k, 0.34, 0.58) * out})`));
    g.layer('sea', fillAll(g, `rgba(84,30,92,${0.46 * ramp(k, 0.52, 0.76) * out})`));
    if (p) g.layer('all', c => glow(c, p, (26 + 70 * ramp(k, 0.02, 0.3)) * (0.92 + 0.08 * Math.sin(now / 420)) * out, LAVA));
  },
  // End-Triassic: a line of eruptions where Pangaea tears, then the same gases and acid seas
  rift(g, k, sc, now) {
    const out = 1 - ramp(k, 0.94, 1), pts = (sc.ats || []).map(a => g.pt(a)).filter(Boolean), on = ramp(k, 0.02, 0.28);
    g.layer('all', c => { const path = sc.ats[2] && g.circle(sc.ats[2], 6 + 174 * ramp(k, 0.2, 0.55)); if (path) { c.fillStyle = `rgba(176,84,34,${0.18 * ramp(k, 0.2, 0.3) * out})`; c.fill(path); } });
    g.layer('land', fillAll(g, `rgba(206,84,22,${0.24 * ramp(k, 0.4, 0.6) * out})`));
    g.layer('sea', fillAll(g, `rgba(84,30,92,${0.36 * ramp(k, 0.44, 0.68) * out})`));
    g.layer('all', c => {
      if (pts.length > 1) { c.lineCap = c.lineJoin = 'round'; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); for (const [w, col] of [[14, `rgba(240,96,30,${0.28 * on * out})`], [5, `rgba(255,214,120,${0.8 * on * out})`]]) { c.lineWidth = w; c.strokeStyle = col; c.stroke(); } }
      pts.forEach((p, i) => glow(c, p, 22 * on * out * (0.85 + 0.15 * Math.sin(now / 380 + i * 1.7)) + 0.01, LAVA));
    });
  },
  // End-Cretaceous: the fall, the flash, the shock wave, fire, then darkness — and the sky clearing
  impact(g, k, sc, now) {
    const p = sc.at && g.pt(sc.at), hit = 0.2;
    if (k < hit && p) g.layer('all', c => {                                                           // the rock coming in
      const u = Math.pow(k / hit, 1.6), x = p[0] + (1 - u) * g.W * 0.42, y = p[1] - (1 - u) * g.H * 0.62;
      const gr = c.createLinearGradient(x, y, x + g.W * 0.07, y - g.H * 0.1); gr.addColorStop(0, 'rgba(255,236,190,0.95)'); gr.addColorStop(1, 'rgba(255,170,80,0)');
      c.strokeStyle = gr; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + g.W * 0.07, y - g.H * 0.1); c.stroke();
      glow(c, [x, y], 7, [[0, 'rgba(255,255,240,1)'], [1, 'rgba(255,200,120,0)']]);
    });
    if (k >= hit) {
      g.layer('land', fillAll(g, `rgba(226,74,20,${0.4 * bump(k, hit, 0.3, 0.42, 0.58)})`));           // fires
      g.layer('all', fillAll(g, `rgba(10,9,13,${0.66 * bump(k, 0.3, 0.48, 0.8, 0.96)})`));             // soot and dust
      g.layer('all', c => {
        const w = ramp(k, hit, 0.5), path = sc.at && g.circle(sc.at, 2 + 176 * w);
        if (path && w < 1) { c.strokeStyle = `rgba(255,232,186,${0.9 * (1 - w)})`; c.lineWidth = 2 + 3 * (1 - w); c.stroke(path); }
        if (p) glow(c, p, 30 * (1 - 0.5 * ramp(k, 0.3, 0.9)), [[0, 'rgba(255,250,225,0.95)'], [0.35, 'rgba(255,170,70,0.6)'], [1, 'rgba(255,110,40,0)']]);
        c.fillStyle = `rgba(255,252,240,${0.92 * (1 - ramp(k, hit, hit + 0.07))})`; c.fillRect(0, 0, g.W, g.H);   // the flash
      });
    }
  },
  // Ice Age giants: people arriving, land by land, as the timeline runs
  people(g, k, sc, now) {
    const ka = S.t * 1000, out = 1 - ramp(k, 0.95, 1);
    g.layer('all', c => {
      for (const [, , when, name, at] of sc.arrive) {
        if (ka > when) continue;
        const u = clamp((when - ka) / (when * 0.3 + 1.5), 0, 1), path = g.circle(at, 2 + 20 * u), p = g.pt(at);
        if (path) { c.fillStyle = `rgba(240,170,60,${0.2 * (1 - u * 0.6) * out})`; c.fill(path); c.strokeStyle = `rgba(250,196,90,${0.85 * (1 - u * 0.7) * out})`; c.lineWidth = 1.6; c.stroke(path); }
        if (p) { c.font = '600 11px Inter,system-ui,sans-serif'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = `rgba(20,14,6,${0.75 * out})`; c.fillStyle = `rgba(255,236,190,${out})`; const tx = '🚶 ' + name + ' · about ' + when + ',000 yrs ago'; c.strokeText(tx, p[0], p[1] - 9); c.fillText(tx, p[0], p[1] - 9); }
      }
    });
  },
  // Now: nothing but the last sightings, which the player draws for every scene
  now() {},
};
// time through a scene: mostly a steady run, with two exceptions
const sceneTime = (e, k) => e.scene === 'impact' ? (k < 0.2 ? e.from - (e.from - 66.03) * (k / 0.2) : 66.03 - (66.03 - e.to) * ramp(k, 0.3, 0.9))
  : e.scene === 'people' ? e.from * Math.pow(e.to / e.from, k) : e.from + (e.to - e.from) * ramp(k, 0.04, 0.96);
let sceneRaf = 0;
function stopScene(done) {
  cancelAnimationFrame(sceneRaf); WorldMap.setFx(null);
  $('sceneCap').classList.remove('show'); document.body.classList.remove('scening');
  const was = S.scene; S.scene = null;
  if (was && S.tab === 'ext') renderExt();
  if (was && done) { const e = EXT[was.id]; showFact(e.icon, '<b>' + esc(extInfo(e).name) + '.</b> ' + esc(e.winners) + '<br><small><button class="linkbtn" data-play="' + e.id + '">↻ Watch again</button></small>', 14000); }
}
function playScene(id) {
  const e = EXT[id]; if (!e) return;
  if (S.scene) { const same = S.scene.id === id; stopScene(); if (same) return; }
  stopPlay(); cancelTween(); closeFact();
  if (S.sel !== 'ext:' + id) selectExt(id, { stay: true });
  setWindow(e.win[0], e.win[1], true); setTime(e.from);
  const lost = extLost(e).filter(c => c.sites && c.sites.length).map(c => ({ c, at: sitesOf(c)[0].at, end: c.t[1] }));
  if (!WorldMap.motion) {     // reduced motion: no scene, just the before and after — the steps are listed on the card
    setTime(e.to); showFact(e.icon, '<b>' + esc(extInfo(e).name) + '.</b> ' + e.steps.map(s => esc(s[1])).join(' '), 20000); return;
  }
  const dur = e.scene === 'now' ? 16000 : 21000;
  S.scene = { id, step: -1, t0: performance.now(), gone: {},
    at: e.at && !Array.isArray(e.at[0]) ? WorldMap.attach(e.at[0], e.at[1], e.t) : null, ats: e.at && Array.isArray(e.at[0]) ? e.at.map(a => WorldMap.attach(a[0], a[1], e.t)) : [],
    arrive: PEOPLE_ARRIVE.map(a => a.concat([WorldMap.attach(a[0], a[1], 0.05)])) };
  document.body.classList.add('scening');
  if (window.innerWidth < 768) $('mapArea').scrollIntoView({ block: 'center', behavior: 'smooth' });
  WorldMap.setFx((c, g, now) => {
    const sc = S.scene; if (!sc) return;
    const k = clamp((now - sc.t0) / dur, 0, 1);
    SCENES[e.scene](g, k, sc, now);
    // last sightings: every animal in the app whose record ends inside this scene goes out where its fossils lie
    g.layer('all', cx => {
      for (const v of lost) {
        if (S.t > v.end) continue;
        const t1 = sc.gone[v.c.key] || (sc.gone[v.c.key] = now), u = (now - t1) / 2200; if (u >= 1) continue;
        const p = g.pt(v.at); if (!p) continue;
        cx.beginPath(); cx.arc(p[0], p[1], 9 + 20 * u, 0, 7); cx.strokeStyle = `rgba(255,96,64,${0.85 * (1 - u)})`; cx.lineWidth = 2.4 * (1 - u) + 0.4; cx.stroke();
        cx.globalAlpha = Math.max(0, 1 - u * 1.3); cx.font = '15px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(v.c.emoji, p[0], p[1] - 14 * u); cx.globalAlpha = 1;
      }
    });
  });
  const tick = now => {
    const sc = S.scene; if (!sc || sc.id !== id) return;
    const k = clamp((now - sc.t0) / dur, 0, 1);
    setTime(sceneTime(e, k), { fast: true });
    let i = 0; while (i + 1 < e.steps.length && e.steps[i + 1][0] <= k) i++;
    if (i !== sc.step) {
      sc.step = i;
      $('sceneCap').innerHTML = `<div class="sc-top"><span>${e.icon} ${esc(e.short)}</span><span class="sc-n">${i + 1} / ${e.steps.length}</span><button data-play="${id}" aria-label="Stop">■</button></div><div class="sc-text">${esc(e.steps[i][1])}</div><div class="jr-bar"><i id="scBar"></i></div>`;
      $('sceneCap').classList.add('show');
      document.querySelectorAll('#pane-ext .ext-steps li').forEach((li, n) => li.classList.toggle('on', n === i));
    }
    const bar = $('scBar'); if (bar) bar.style.width = (k * 100).toFixed(1) + '%';
    if (k >= 1) { setTime(e.to); setTimeout(() => { if (S.scene === sc) stopScene(true); }, 1600); return; }
    sceneRaf = requestAnimationFrame(tick);
  };
  renderExt(); sceneRaf = requestAnimationFrame(tick);
}
function bindExt() {
  $('pane-ext').addEventListener('click', e => {
    const m = e.target.closest('[data-meet]'); if (m) { stopScene(); switchTab('life'); if (S.view !== 'list') setView('list'); select(m.dataset.meet, { keep: true }); return; }
    if (e.target.closest('[data-play]')) return;       // handled below, wherever the button is
    const x = e.target.closest('[data-ext]'); if (x) selectExt(x.dataset.ext);
  });
  document.addEventListener('click', e => { const b = e.target.closest('[data-play]'); if (b) playScene(b.dataset.play); });
}

// --- History: empires, kingdoms and beliefs of the last 5,500 years ---
const EMP = Object.fromEntries(EMPIRES.map(e => [e.id, e])), BEL = Object.fromEntries(BELIEFS.map(b => [b.id, b]));
const empNow = (e, y = yearAt(S.t)) => y >= e.from && y <= e.to;
const belNow = (b, y = yearAt(S.t)) => y >= b.year && (b.end == null || y <= b.end);
const inHistory = () => S.t <= HIST_T * 1.04;
// each sketch as a shape the map can draw (d3 wants the outline to run clockwise)
const sketch = polys => ({ type: 'MultiPolygon', coordinates: polys.map(poly => { const ring = poly.map(q => [q[1], q[0]]); ring.push(ring[0]); if (d3.geoArea({ type: 'Polygon', coordinates: [ring] }) > 2 * Math.PI) ring.reverse(); return [ring]; }) });
// where an empire has several sketches, each is on the map from its year until the next one's
const empStages = e => e.stages ? e.stages.map((st, i) => ({ year: st[0], until: i + 1 < e.stages.length ? e.stages[i + 1][0] : e.to, polys: st[1] || [e.poly], note: st[2] })) : e.poly ? [{ year: e.from, until: e.to, polys: [e.poly], note: '' }] : [];
const HIST_REGIONS = EMPIRES.flatMap(e => empStages(e).map((st, i, all) => ({ key: 'emp:' + e.id, color: e.color, geo: sketch(st.polys), from: tOfYear(st.year), to: tOfYear(st.until) + (i + 1 < all.length ? 5e-7 : 0) })));   // a sketch ends half a year before the next begins
const TRD = Object.fromEntries(TRADE.map(r => [r.id, r])), WRK = Object.fromEntries(WORKS.map(w => [w.id, w]));
const trdNow = (r, y = yearAt(S.t)) => y >= r.from && y <= r.to;
const wrkNow = (w, y = yearAt(S.t)) => y >= w.year && (w.end == null || y <= w.end);
const HIST_LAYERS = [['emp', '🏛 Empires'], ['bel', '🕊 Beliefs'], ['rt', '🐪 Trade routes'], ['wk', '🏗 Great works']];
const histOn = k => !S.histOff || !S.histOff[k];
const selBelief = () => S.sel && S.sel.startsWith('bel:') ? BEL[S.sel.slice(4)] : null;
function histPlaces() {
  if (!inHistory()) return [];
  const out = [], sb = selBelief(), y = yearAt(S.t);
  if (histOn('emp') || (S.sel || '').startsWith('emp:')) for (const e of EMPIRES) if ((histOn('emp') && empNow(e)) || S.sel === 'emp:' + e.id) out.push(placeCache['e' + e.id] || (placeCache['e' + e.id] = { key: 'emp:' + e.id, name: e.name, note: e.kind + ' · ' + e.where, icon: e.icon, at: WorldMap.attach(e.cap[0], e.cap[1], 0) }));
  for (const b of BELIEFS) if (b.origin && (b === sb || (histOn('bel') && belNow(b)))) out.push(placeCache['b' + b.id] || (placeCache['b' + b.id] = { key: 'bel:' + b.id, name: b.name, note: b.where, icon: b.icon, at: WorldMap.attach(b.origin[0], b.origin[1], 0) }));
  for (const r of TRADE) if ((histOn('rt') && trdNow(r, y)) || S.sel === 'rt:' + r.id) out.push(placeCache['r' + r.id] || (placeCache['r' + r.id] = { key: 'rt:' + r.id, name: r.name, note: r.goods, icon: r.icon, at: WorldMap.attach(r.label[0], r.label[1], 0) }));
  for (const w of WORKS) if ((histOn('wk') && wrkNow(w, y)) || S.sel === 'wk:' + w.id) out.push(placeCache['w' + w.id] || (placeCache['w' + w.id] = { key: 'wk:' + w.id, name: w.name, note: w.where, icon: w.icon, at: WorldMap.attach(w.at[0], w.at[1], 0) }));
  if (sb) sb.spread.forEach((sp, i) => { if (sp[0] <= y) out.push(placeCache['b' + sb.id + i] || (placeCache['b' + sb.id + i] = { key: 'bel:' + sb.id, name: sp[3] + ' · ' + fmtYear(sp[0]), note: sb.name, icon: sb.icon, at: WorldMap.attach(sp[1], sp[2], 0) })); });
  return out;
}
let TRADE_LINES = null;
function histRoutes() {
  if (!inHistory()) return [];
  if (!TRADE_LINES) TRADE_LINES = TRADE.flatMap(r => r.paths.flatMap(pa => pa.slice(1).map((q, i) => ({ id: r.id, key: 'rt:' + r.id, a: WorldMap.attach(pa[i][0], pa[i][1], 0), b: WorldMap.attach(q[0], q[1], 0), from: tOfYear(r.from), to: tOfYear(r.to), color: r.color, width: 2.3, dash: [9, 3] }))));
  const out = TRADE_LINES.filter(l => histOn('rt') || S.sel === l.key), sb = selBelief();
  if (sb && sb.origin) { const a = WorldMap.attach(sb.origin[0], sb.origin[1], 0); sb.spread.forEach(sp => out.push({ a, b: WorldMap.attach(sp[1], sp[2], 0), from: tOfYear(sp[0]), color: 'rgba(110,40,120,0.85)' })); }
  return out;
}
// what is on the map right now — when this changes, the pins and the list highlights are refreshed
const histKey = () => { if (!inHistory()) return ''; const y = yearAt(S.t), sb = selBelief(); return EMPIRES.filter(e => empNow(e, y)).map(e => e.id + (e.stages ? e.stages.filter(st => st[0] <= y).length : '')).join(',') + ';' + BELIEFS.filter(b => belNow(b, y)).map(b => b.id).join(',') + ';' + (sb ? sb.spread.filter(sp => sp[0] <= y).length : '') + ';' + TRADE.filter(r => trdNow(r, y)).map(r => r.id).join(',') + ';' + WORKS.filter(w => wrkNow(w, y)).length; };
function histMark() {
  const y = yearAt(S.t);
  document.querySelectorAll('#pane-humans [data-emp].hist-item').forEach(el => el.classList.toggle('now', inHistory() && empNow(EMP[el.dataset.emp], y)));
  document.querySelectorAll('#pane-humans [data-bel].hist-item').forEach(el => el.classList.toggle('now', inHistory() && belNow(BEL[el.dataset.bel], y)));
  document.querySelectorAll('#pane-humans [data-rt].hist-item').forEach(el => el.classList.toggle('now', inHistory() && trdNow(TRD[el.dataset.rt], y)));
  document.querySelectorAll('#pane-humans [data-wk].hist-item').forEach(el => el.classList.toggle('now', inHistory() && wrkNow(WRK[el.dataset.wk], y)));
  if (S.sel && S.sel.startsWith('emp:') && EMP[S.sel.slice(4)] && EMP[S.sel.slice(4)].stages) { const el = document.querySelector('#pane-humans .emp-stages'); if (el) el.outerHTML = stagesHTML(EMP[S.sel.slice(4)]); }
}
function histListsHTML() {
  const y = yearAt(S.t), hist = inHistory();
  const emp = EMPIRES.slice().sort((a, b) => a.from - b.from).map(e => `<div class="ms-item hist-item${hist && empNow(e, y) ? ' now' : ''}${S.sel === 'emp:' + e.id ? ' sel' : ''}" data-emp="${e.id}"><span class="when">${fmtYear(e.from).replace(' CE', '')}</span><span>${e.icon}</span><div><b>${esc(e.name)}</b><span>${esc(e.kind)} · ${esc(e.where)}</span></div></div>`).join('');
  const bel = BELIEF_FAMILIES.map(([id, name, sub]) => `<div class="fam-h"><b>${esc(name)}</b><span>${esc(sub)}</span></div>` + BELIEFS.filter(b => b.fam === id).sort((a, b) => a.year - b.year).map(b => `<div class="ms-item hist-item${hist && belNow(b, y) ? ' now' : ''}${S.sel === 'bel:' + b.id ? ' sel' : ''}" data-bel="${b.id}"><span class="when">${b.year <= -5000 ? 'earliest' : fmtYear(b.year).replace(' CE', '')}</span><span>${b.icon}</span><div><b>${esc(b.name)}</b><span>${esc(b.where)}${b.end != null ? ' · no longer practised as it was' : ''}</span></div></div>`).join('')).join('');
  const rts = TRADE.slice().sort((a, b) => a.from - b.from).map(r => `<div class="ms-item hist-item${hist && trdNow(r, y) ? ' now' : ''}${S.sel === 'rt:' + r.id ? ' sel' : ''}" data-rt="${r.id}"><span class="when">${fmtYear(r.from).replace(' CE', '')}</span><span>${r.icon}</span><div><b>${esc(r.name)}</b><span>${esc(r.goods.split(/[;—.]/)[0])}</span></div></div>`).join('');
  const wks = WORKS.slice().sort((a, b) => a.year - b.year).map(w => `<div class="ms-item hist-item${hist && wrkNow(w, y) ? ' now' : ''}${S.sel === 'wk:' + w.id ? ' sel' : ''}" data-wk="${w.id}"><span class="when">${fmtYear(w.year).replace(' CE', '')}</span><span>${w.icon}</span><div><b>${esc(w.name)}</b><span>${esc(w.where)}</span></div></div>`).join('');
  return `<div class="ms hist-top"><div class="list-h" style="padding-left:2px">Recorded history <small>the last 5,500 years</small></div>
      <div class="hist-layers"><span>On the map:</span>${HIST_LAYERS.map(([k, l]) => `<button class="chip${histOn(k) ? ' on' : ''}" data-hl="${k}" aria-pressed="${histOn(k)}">${l}</button>`).join('')}</div>
      ${hist ? '' : `<div class="hf-note" style="margin:2px 2px 0">You are at ${esc(fmtAgo(S.t))} — before any of this. <button class="linkbtn" data-hist-go="1">Go to recorded history</button></div>`}</div>
    <div class="ms"><div class="list-h" style="padding-left:2px">Empires and kingdoms <small>tap one to go to its height; its lands are sketched on the map, and for the biggest the border shifts as time moves</small></div>${emp}</div>
    <div class="ms"><div class="list-h" style="padding-left:2px">Trade routes <small>the roads and sea lanes that tied the world together</small></div>${rts}</div>
    <div class="ms"><div class="list-h" style="padding-left:2px">Great works <small>things people built, or did, together</small></div>${wks}</div>
    <div class="ms"><div class="list-h" style="padding-left:2px">Beliefs <small>where each began and how far it travelled</small></div>
      <div class="hf-note" style="margin:0 2px 6px">Each is described the way its own followers would put it, as fairly as we can. This site does not say which, if any, is true — that is for you and your family.</div>${bel}</div>`;
}
function empireHTML(e) {
  const sec = (t, b) => b ? `<div class="label-sec"><h5>${t}</h5>${esc(b)}</div>` : '';
  return `<div class="profile culture hist" data-key="emp:${e.id}" style="border-color:${e.color}"><h3 style="font-style:normal">${e.icon} ${esc(e.name)}</h3>
    <dl class="facts"><dt>What</dt><dd>${esc(e.kind)}</dd><dt>When</dt><dd>${fmtYear(e.from)} → ${e.to >= NOW_YEAR ? 'today' : fmtYear(e.to)}</dd><dt>At its height</dt><dd>about ${fmtYear(e.peak)}${e.area ? ` · about ${e.area} million km²` : ''}</dd><dt>Chief city</dt><dd>${esc(e.cap[2])}</dd><dt>Where</dt><dd>${esc(e.where)}</dd></dl>
    <div class="creature-fact">${esc(e.story)}</div>${e.stages ? stagesHTML(e) : ''}${sec('🎁 What it left us', e.legacy)}${sec('❓ Still debated', e.debate)}
    <div class="found">📍 <b>On the map:</b> ${e.stages ? 'the shaded land is a rough sketch of what it held at each of the dates above. The border jumps from one sketch to the next — nobody surveyed it, and it is not drawn moving in between.' : e.poly ? 'the shaded land is a rough sketch of its greatest reach, about ' + fmtYear(e.peak) + '. Real borders were fuzzy and kept moving; it was smaller before and after.' : 'its lands were scattered across the oceans, so only its capital is marked.'}</div>${srcHTML('k:' + e.id)}</div>`;
}
function stagesHTML(e) {
  const y = yearAt(S.t), sts = empStages(e), cur = inHistory() ? sts.filter(st => st.year <= y + 0.5 && y <= st.until).pop() : null;
  return `<div class="label-sec emp-stages"><h5>🗺 How its borders moved</h5><ul>${sts.map(st => `<li class="${st === cur ? 'on' : ''}"><button class="linkbtn" data-year="${st.year}">${fmtYear(st.year)}</button> ${esc(st.note)}</li>`).join('')}</ul></div>`;
}
function routeHTML(r) {
  const sec = (t, x) => x ? `<div class="label-sec"><h5>${t}</h5>${esc(x)}</div>` : '';
  return `<div class="profile culture hist" data-key="rt:${r.id}" style="border-color:${r.color}"><h3 style="font-style:normal">${r.icon} ${esc(r.name)}</h3>
    <dl class="facts"><dt>When</dt><dd>${fmtYear(r.from)} → ${r.to >= NOW_YEAR ? 'today' : fmtYear(r.to)}</dd><dt>Carried</dt><dd>${esc(r.goods)}</dd></dl>
    <div class="creature-fact">${esc(r.story)}</div>${sec('🎁 What it changed', r.legacy)}${sec('🔎 How do we know?', r.know)}${sec('❓ Still debated', r.debate)}
    <div class="found">📍 <b>On the map:</b> the line joins its main stops with straight hops. Real caravans and ships wandered, and there were many side routes.</div>${srcHTML('r:' + r.id)}</div>`;
}
function workHTML(w) {
  const sec = (t, x) => x ? `<div class="label-sec"><h5>${t}</h5>${esc(x)}</div>` : '';
  return `<div class="profile culture hist" data-key="wk:${w.id}"><h3 style="font-style:normal">${w.icon} ${esc(w.name)}</h3>
    <dl class="facts"><dt>Built</dt><dd>${fmtYear(w.year)}${w.done > w.year ? ' → ' + (w.done >= NOW_YEAR ? 'still growing' : fmtYear(w.done)) : ''}${w.done - w.year >= 2 && w.done < NOW_YEAR ? ' · about ' + years(w.done - w.year) + ' years' : ''}</dd>${w.end != null ? `<dt>Lost</dt><dd>by about ${fmtYear(w.end)}</dd>` : ''}<dt>Where</dt><dd>${esc(w.where)}</dd><dt>Who</dt><dd>${esc(w.who)}</dd></dl>
    <div class="creature-fact">${esc(w.story)}</div>${sec('🙃 What people get wrong', w.wrong)}${sec('🙋 Who gets left out', w.left)}${sec('🎁 What it left us', w.legacy)}${sec('🔎 How do we know?', w.know)}${sec('❓ Still debated', w.debate)}${srcHTML('w:' + w.id)}</div>`;
}
function selectHist(kind, id, fromMap) {
  const x = kind === 'rt' ? TRD[id] : WRK[id]; if (!x) return;
  S.sel = kind + ':' + id; WorldMap.select(S.sel);
  if (S.tab !== 'humans') switchTab('humans');
  const look = () => { updatePlaces(); const pl = placeCache[(kind === 'rt' ? 'r' : 'w') + id]; if (pl) WorldMap.lookAt(pl.at); renderHumans(); };
  const on = kind === 'rt' ? trdNow(x) : wrkNow(x), target = kind === 'rt' ? x.from + Math.min(400, (Math.min(x.to, NOW_YEAR) - x.from) * 0.5) : Math.min(x.done, NOW_YEAR - 1);
  if (!(inHistory() && on && fromMap)) travel(tOfYear(target), look) || look(); else look();
  renderHumans();
  if (fromMap && window.innerWidth < 768) showFact(x.icon, '<b>' + esc(x.name) + '</b> — ' + esc(x.story));
  setTimeout(() => { const el = document.querySelector('#pane-humans .profile'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 80);
}
function beliefHTML(b) {
  const sec = (t, x) => x ? `<div class="label-sec"><h5>${t}</h5>${esc(x)}</div>` : '';
  const fam = BELIEF_FAMILIES.find(f => f[0] === b.fam), kin = BELIEFS.filter(x => x !== b && x.fam === b.fam), kids = BELIEFS.filter(x => (x.grew || []).includes(b.id));
  const link = x => `<button class="linkbtn" data-bel="${x.id}">${x.icon} ${esc(x.name)}</button>`;
  return `<div class="profile culture hist belief" data-key="bel:${b.id}"><h3 style="font-style:normal">${b.icon} ${esc(b.name)}</h3>
    <dl class="facts"><dt>Began</dt><dd>${esc(b.when)}</dd><dt>Where</dt><dd>${esc(b.origin ? b.origin[2] : b.where)}</dd><dt>Who</dt><dd>${esc(b.who)}</dd><dt>Family</dt><dd>${esc(fam[1])}</dd></dl>
    <div class="label-sec" style="border-top:0;padding-top:0"><h5>💭 What its followers hold</h5>${esc(b.idea)}</div>
    ${(b.grew || []).length ? `<div class="label-sec"><h5>🌱 Grew out of</h5>${b.grew.map(g => link(BEL[g])).join(' ')}</div>` : ''}
    ${kids.length ? `<div class="label-sec"><h5>🌿 Later traditions that drew on it</h5>${kids.map(link).join(' ')}</div>` : ''}
    ${b.spread.length ? `<div class="label-sec"><h5>🧭 How it travelled</h5><ul>${b.spread.map(sp => `<li>${fmtYear(sp[0])} — ${esc(sp[3])}</li>`).join('')}</ul></div>` : ''}
    ${sec('🌍 Today', b.today)}${sec('🔎 How do we know?', b.know)}${sec('❓ Still debated', b.debate)}
    ${kin.length ? `<div class="label-sec"><h5>👪 Same family</h5>${kin.map(link).join(' ')}</div>` : ''}
    ${b.origin ? `<div class="found">📍 <b>On the map:</b> its place of origin, and a dashed line to each place it had reached by the year on the timeline. Dates are when it arrived, roughly.</div>` : ''}${srcHTML('b:' + b.id)}</div>`;
}
function selectEmpire(id, fromMap) {
  const e = EMP[id]; if (!e) return;
  S.sel = 'emp:' + id; WorldMap.select(S.sel);
  if (S.tab !== 'humans') switchTab('humans');
  const look = () => { updatePlaces(); const pl = placeCache['e' + id]; if (pl) WorldMap.lookAt(pl.at); renderHumans(); };
  if (!(fromMap && empNow(e))) travel(tOfYear(e.peak), look) || look(); else look();
  renderHumans();
  if (fromMap && window.innerWidth < 768) showFact(e.icon, '<b>' + esc(e.name) + '</b> — ' + esc(e.story));
  setTimeout(() => { const el = document.querySelector('#pane-humans .profile'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 80);
}
function selectBelief(id, fromMap) {
  const b = BEL[id]; if (!b) return;
  S.sel = 'bel:' + id; WorldMap.select(S.sel);
  if (S.tab !== 'humans') switchTab('humans');
  const look = () => { updatePlaces(); const pl = placeCache['b' + id]; if (pl) WorldMap.lookAt(pl.at); renderHumans(); };
  // go to its beginning unless we are already somewhere in its lifetime
  const start = Math.max(b.year, -5400) + (b.spread.length ? Math.min(400, (b.spread[b.spread.length - 1][0] - b.year) * 0.5) : 0);
  if (!(inHistory() && belNow(b) && yearAt(S.t) >= b.year)) travel(tOfYear(start), look) || look(); else look();
  renderHumans();
  if (fromMap && window.innerWidth < 768) showFact(b.icon, '<b>' + esc(b.name) + '</b> — ' + esc(b.idea));
  setTimeout(() => { const el = document.querySelector('#pane-humans .profile'); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 80);
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
    ${srcHTML('p:' + p.id, 'Sources for this period')}
    ${foodWebHTML(p)}${srcHTML('f:' + p.id, 'Sources for this food web')}
    ${p.funFact ? `<div class="ins-sec"><h4>💡 Did you know?</h4>${esc(p.funFact)}</div>` : ''}
    ${sites.length ? `<div class="ins-sec"><h4>📍 Famous fossil sites — shown on the map</h4>${sites.map(s => `<div class="site${S.sel === 'site:' + slug(s[0]) ? ' sel' : ''}" data-key="site:${slug(s[0])}"><span class="d">◆</span><div><b>${esc(s[0])}</b>${esc(s[4])}</div></div>`).join('')}</div>` : ''}
    ${allSourcesHTML()}
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

// ── "Where was my town?" ────────────────────────────────────────────
const CITIES = ('Toronto,43.65,-79.38;Montréal,45.5,-73.57;Vancouver,49.28,-123.12;Calgary,51.05,-114.07;Edmonton,53.55,-113.49;Ottawa,45.42,-75.7;Winnipeg,49.9,-97.14;' +
  'Halifax,44.65,-63.57;Québec City,46.81,-71.21;Saskatoon,52.13,-106.67;Regina,50.45,-104.6;Victoria,48.43,-123.37;St. John\'s,47.56,-52.71;Whitehorse,60.72,-135.06;Yellowknife,62.45,-114.37;Iqaluit,63.75,-68.52;Drumheller,51.46,-112.71;' +
  'New York,40.71,-74.01;Los Angeles,34.05,-118.24;Chicago,41.88,-87.63;Houston,29.76,-95.37;Phoenix,33.45,-112.07;Denver,39.74,-104.99;Seattle,47.61,-122.33;San Francisco,37.77,-122.42;Miami,25.76,-80.19;Atlanta,33.75,-84.39;Boston,42.36,-71.06;Washington DC,38.9,-77.04;Dallas,32.78,-96.8;Salt Lake City,40.76,-111.89;Anchorage,61.22,-149.9;Honolulu,21.31,-157.86;' +
  'Mexico City,19.43,-99.13;Havana,23.11,-82.37;Bogotá,4.71,-74.07;Lima,-12.05,-77.04;Santiago,-33.45,-70.67;Buenos Aires,-34.6,-58.38;São Paulo,-23.55,-46.63;Rio de Janeiro,-22.91,-43.17;Manaus,-3.12,-60.02;Caracas,10.48,-66.9;Quito,-0.18,-78.47;La Paz,-16.5,-68.15;' +
  'London,51.51,-0.13;Edinburgh,55.95,-3.19;Dublin,53.35,-6.26;Paris,48.86,2.35;Madrid,40.42,-3.7;Lisbon,38.72,-9.14;Rome,41.9,12.5;Berlin,52.52,13.4;Amsterdam,52.37,4.9;Brussels,50.85,4.35;Zürich,47.38,8.54;Vienna,48.21,16.37;Prague,50.08,14.44;Warsaw,52.23,21.01;Stockholm,59.33,18.07;Oslo,59.91,10.75;Copenhagen,55.68,12.57;Helsinki,60.17,24.94;Reykjavík,64.15,-21.94;Athens,37.98,23.73;Istanbul,41.01,28.98;Kyiv,50.45,30.52;Moscow,55.76,37.62;' +
  'Cairo,30.04,31.24;Casablanca,33.57,-7.59;Lagos,6.52,3.38;Accra,5.6,-0.19;Nairobi,-1.29,36.82;Addis Ababa,9.03,38.74;Johannesburg,-26.2,28.05;Cape Town,-33.92,18.42;Kinshasa,-4.44,15.27;Dar es Salaam,-6.79,39.21;Antananarivo,-18.88,47.51;' +
  'Dubai,25.2,55.27;Riyadh,24.71,46.68;Tehran,35.69,51.39;Jerusalem,31.77,35.21;Mumbai,19.08,72.88;Delhi,28.61,77.21;Kolkata,22.57,88.36;Karachi,24.86,67.0;Kathmandu,27.72,85.32;Dhaka,23.81,90.41;Bangkok,13.76,100.5;Singapore,1.35,103.82;Jakarta,-6.21,106.85;Manila,14.6,120.98;' +
  'Beijing,39.9,116.41;Shanghai,31.23,121.47;Hong Kong,22.32,114.17;Seoul,37.57,126.98;Tokyo,35.68,139.69;Osaka,34.69,135.5;Ulaanbaatar,47.89,106.91;' +
  'Sydney,-33.87,151.21;Melbourne,-37.81,144.96;Brisbane,-27.47,153.03;Perth,-31.95,115.86;Adelaide,-34.93,138.6;Darwin,-12.46,130.84;Hobart,-42.88,147.33;Auckland,-36.85,174.76;Wellington,-41.29,174.78;Christchurch,-43.53,172.64')
  .split(';').map(s => { const [n, a, b] = s.split(','); return [n, +a, +b]; });
const KM = (la1, lo1, la2, lo2) => { const r = Math.PI / 180, a = Math.sin((la2 - la1) * r / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin((lo2 - lo1) * r / 2) ** 2; return 12742 * Math.asin(Math.min(1, Math.sqrt(a))); };
function setPin(lat, lon, name, quiet) {
  if (lat == null) { S.pin = null; WorldMap.setLayers({ pin: null }); $('pinCard').classList.remove('show'); writeHash(); return; }
  const at = WorldMap.attach(lat, lon, T_MAX), trail = [];
  for (let t = 0; t <= T_MAX; t += 1.5) { const p = WorldMap.locate(at, t); if (p) trail.push([t, p[0], p[1]]); }
  S.pin = { lat, lon, name: name || (Math.abs(lat).toFixed(1) + '°' + (lat >= 0 ? 'N' : 'S') + ' ' + Math.abs(lon).toFixed(1) + '°' + (lon >= 0 ? 'E' : 'W')), at };
  WorldMap.setLayers({ pin: { at, name: S.pin.name, trail } });
  updatePinCard(); writeHash();
  if (!quiet) { $('pinPanel').classList.remove('show'); WorldMap.lookAt(at); }
}
function updatePinCard() {
  const P = S.pin, card = $('pinCard'); if (!P) { card.classList.remove('show'); return; }
  const now = WorldMap.locate(P.at, S.t);
  let html = `<button class="pc-x" aria-label="Remove pin">✕</button><div class="pc-h">📍 ${esc(P.name)} · ${esc(fmtAgo(S.t))}</div>`;
  if (!now) html += 'This piece of land has no reconstructed position this far back.';
  else {
    const la = now[1], A = Math.abs(la), moved = KM(P.lat, P.lon, la, now[0]);
    const belt = S.period.id === 'cryogenian' ? 'probably buried under the ice of Snowball Earth' : A < 10 ? 'right by the equator — hot and wet' : A < 30 ? 'in the tropics\' dry belt — think savanna or desert' : A < 55 ? 'in the mid-latitudes — warm to temperate' : A < 70 ? 'far ' + (la > 0 ? 'north' : 'south') + ' — cool, with long dark winters' : 'near the ' + (la > 0 ? 'North' : 'South') + ' Pole';
    html += S.t < 0.05 ? `Here today, at ${A.toFixed(0)}°${la >= 0 ? 'N' : 'S'}.` : `It was at <b>${A.toFixed(0)}°${la >= 0 ? 'N' : 'S'}</b>, ${belt}. That is about <b>${years(Math.round(moved / 100) * 100)} km</b> from where it is now.`;
    const near = [];
    for (const c of ALL) { if (!c.sites || !alive(c, S.t)) continue; let best = 1e9, lab = ''; for (const s of c.sites) { const d = KM(P.lat, P.lon, s[0], s[1]); if (d < best) { best = d; lab = s[2]; } } near.push([best, c, lab]); }
    near.sort((a, b) => a[0] - b[0]);
    const top = near.slice(0, 3);
    if (top.length) html += `<div class="pc-near">${top[0][0] < 2000 ? 'Lived nearby' : 'Nearest fossils from this moment'}: ${top.map(([d, c]) => `<span data-key="${c.key}">${c.emoji} ${esc(c.name)}</span> (${years(Math.round(d / 10) * 10)} km)`).join(', ')}</div>`;
    html += '<div class="pc-note">The dotted line is its whole journey. Coastlines are today\'s, so it may have been under a shallow sea.</div>';
  }
  card.innerHTML = html; card.classList.add('show');
}
function bindPin() {
  $('cityList').innerHTML = CITIES.map(c => `<option value="${esc(c[0])}">`).join('');
  $('mapPin').onclick = () => { $('pinPanel').classList.toggle('show'); $('mapAbout').classList.remove('show'); if ($('pinPanel').classList.contains('show')) setTimeout(() => $('pinSearch').focus(), 50); };
  $('pinPanelX').onclick = () => $('pinPanel').classList.remove('show');
  const go = () => { const q = $('pinSearch').value.trim().toLowerCase(); if (!q) return; const c = CITIES.find(c => c[0].toLowerCase() === q) || CITIES.find(c => c[0].toLowerCase().startsWith(q)); if (c) { setPin(c[1], c[2], c[0]); $('pinSearch').value = ''; } else $('pinHint').textContent = 'Not in the list — tap the map instead, or use your location.'; };
  $('pinSearch').addEventListener('change', go); $('pinSearch').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  $('pinGeo').onclick = () => {
    if (!navigator.geolocation) { $('pinHint').textContent = 'Location is not available in this browser.'; return; }
    $('pinHint').textContent = 'Finding you…';
    navigator.geolocation.getCurrentPosition(p => { $('pinHint').textContent = '…or tap any land on the map.'; setPin(+p.coords.latitude.toFixed(2), +p.coords.longitude.toFixed(2), 'My place'); },
      () => { $('pinHint').textContent = 'Could not get your location — type a city or tap the map.'; }, { timeout: 10000 });
  };
  $('pinClear').onclick = () => { setPin(null); $('pinPanel').classList.remove('show'); };
  $('pinCard').addEventListener('click', e => {
    if (e.target.closest('.pc-x')) { setPin(null); return; }
    const k = e.target.closest('[data-key]'); if (k) { if (S.tab !== 'life') switchTab('life'); select(k.dataset.key, { keep: true }); }
  });
}

// ── climate ─────────────────────────────────────────────────────────
// Earth's average temperature at a moment, °C (null before 540 Ma, where the curve stops).
// The source curve has one value per million years, which hides the Ice Age swings, so inside
// the Ice Age the cooling is scaled from sea level: about 6 °C colder than today when the sea was 125 m down.
function globalTemp(t) {
  if (t > TEMP_MA.length - 1) return null;
  if (t < 2.58) return TEMP_TODAY + 6.1 * WorldMap.seaLevel(t) / 125;
  const i = Math.floor(t), k = t - i;
  return (TEMP_MA[i] * (1 - k) + TEMP_MA[Math.min(TEMP_MA.length - 1, i + 1)] * k) / 10;
}
const tempColor = T => { const st = [[9, [58, 110, 200]], [14.5, [150, 200, 235]], [19, [240, 226, 150]], [24, [240, 160, 70]], [33, [200, 40, 30]]];
  let j = 0; while (j < st.length - 2 && T > st[j + 1][0]) j++; const [a, ca] = st[j], [b, cb] = st[j + 1], k = clamp((T - a) / (b - a), 0, 1);
  return 'rgb(' + ca.map((v, n) => Math.round(v + (cb[n] - v) * k)).join(',') + ')'; };
function renderClimateStrip() {
  const stops = []; for (let t = TEMP_MA.length - 1; t >= 0; t -= 2) stops.push(tempColor(TEMP_MA[t] / 10) + ' ' + (storyPos(t) / 10).toFixed(2) + '%');
  stops.push(tempColor(TEMP_TODAY) + ' 100%');
  const x0 = storyPos(TEMP_MA.length - 1) / 10;
  $('ovTemp').style.cssText = 'left:' + x0 + '%;background:linear-gradient(90deg,' + stops.map(s => { const [c, p] = s.split(/ (?=[\d.]+%$)/); return c + ' ' + ((parseFloat(p) - x0) / (100 - x0) * 100).toFixed(2) + '%'; }).join(',') + ')';
}

// Go to a moment, zooming the timeline in or out so that moment is wide enough to stand on.
// Returns false (and does nothing) when we are already there.
function travel(target, done) {
  if (Math.abs(S.t - target) <= (target < HIST_T ? 0.000004 : Math.max(0.00002, target * 0.02))) return false;
  const sp = target < HIST_T ? HIST_T * 1.1 : Math.max(0.03, target * 4);
  if (!isFull() && (target > S.win[0] || target < S.win[1] || span() > sp * 40)) setWindow(T_MAX, 0, true);
  if (isFull() && target < 5) setWindow(Math.min(T_MAX, sp), 0, true);
  goTo(target, done); return true;
}

// ── you: the reader's own line through deep time ────────────────────
const youAt = t => YOU_LINE.find(y => t <= y.from && t >= y.to) || YOU_LINE[0];
const youLike = y => y.hom ? BY_KEY[y.hom] : y.like ? ALL.find(c => c.name === y.like) : null;
const YOU_NOTE = 'We show a close cousin from the fossil record. The real ancestor has almost certainly never been found — and could not be told apart if it were.';
let lastYou = null;
function updateYou() {
  const y = youAt(S.t); if (y === lastYou) return; lastYou = y;
  const c = youLike(y);
  $('youBar').innerHTML = `<span class="yb-k">🧬 Your ancestor at this moment</span><span class="yb-v"><b>${esc(y.what)}</b>${c ? ` — like ${esc(shortName(c.name))} ${c.emoji || ''}` : ''}</span><span class="yb-go">›</span>`;
}
function openYou() {
  const y = youAt(S.t), c = youLike(y);
  showFact('🧬', `<b>Your ancestor, ${esc(fmtLong(S.t))}:</b> ${esc(y.text)}<br><small>${c ? esc(YOU_NOTE) + ' ' : ''}<button class="linkbtn" data-journey="you">▶ Follow your whole story</button></small>`, 20000);
  if (c) { if (c.hom) { switchTab('humans'); select(c.key, { keep: true }); } else { if (S.tab !== 'life') switchTab('life'); if (S.view !== 'list') setView('list'); select(c.key, { keep: true }); } }
}

// ── journeys: guided trips through time ─────────────────────────────
const EXT_T = { ordovician: 444, devonian: 372, permian: 251.9, triassic: 201.4, cretaceous: 66.02, quaternary: 0.02, holocene: 0 };
const JOURNEYS = [
  { id: 'you', icon: '🧬', title: 'Your story', blurb: 'From a speck in a frozen sea to you: your own ancestors, stop by stop.',
    stops: () => YOU_LINE.map(y => { const c = youLike(y); return { t: y.at, head: y.what.charAt(0).toUpperCase() + y.what.slice(1), text: y.text, key: c && c.key, hom: !!y.hom, note: c ? 'Shown: ' + shortName(c.name) + ', a close cousin of your real ancestor.' : '' }; }) },
  { id: 'drift', icon: '🌍', title: 'The drifting continents', blurb: 'Watch one supercontinent form and break into the world you know.', stops: () => DRIFT_STOPS },
  { id: 'extinctions', icon: '☠️', title: 'The great dyings', blurb: 'Five times most of life was wiped out — and what came through.',
    stops: () => EXTINCTIONS.map(e => { const x = extInfo(e); return { ext: e.id, t: e.t, head: x.name, text: 'Lost: ' + x.toll + '. ' + x.cause, note: 'Press “Watch it happen” in the panel to see it play out on the map.' }; }) },
  { id: 'finds', icon: '⛏️', title: 'How we found out', blurb: 'Ten discoveries that changed what people thought the past was.',
    stops: () => ['plot', 'anning', 'buckland', 'archaeopteryx', 'gobi', 'wegener', 'lucy', 'asteroid', 'sinosauropteryx', 'tiktaalik'].map(id => FIND[id]).filter(Boolean).map(f => ({ find: f.id, head: f.title + ' · ' + f.when, text: f.story })) },
];
let jTimer = 0;
function journeyStops() { const j = S.jr && JOURNEYS.find(x => x.id === S.jr.id); return j ? (j._s || (j._s = j.stops())) : []; }
function startJourney(id) {
  if (!JOURNEYS.some(j => j.id === id)) return;
  closeFact(); $('journeyMenu').classList.remove('show'); $('journeyBtn').setAttribute('aria-expanded', 'false');
  S.jr = { id, i: 0, auto: false }; showStop();
}
function endJourney() { clearTimeout(jTimer); S.jr = null; document.body.classList.remove('journeying'); $('journey').classList.remove('show'); $('journey').innerHTML = ''; }
function stepJourney(d) { const n = journeyStops().length; if (!S.jr) return; const i = S.jr.i + d; if (i < 0 || i >= n) { if (i >= n) S.jr.auto = false; renderStop(); return; } S.jr.i = i; showStop(); }
function renderStop() {
  const j = JOURNEYS.find(x => x.id === S.jr.id), st = journeyStops(), s = st[S.jr.i], last = S.jr.i === st.length - 1;
  $('journey').innerHTML = `<div class="jr-top"><span class="jr-t">${j.icon} ${esc(j.title)}</span><span class="jr-n">${S.jr.i + 1} / ${st.length}</span><button class="jr-x" data-jr="end" aria-label="End journey">✕</button></div>
    <div class="jr-bar"><i style="width:${((S.jr.i + 1) / st.length * 100).toFixed(1)}%"></i></div>
    <div class="jr-head">${esc(s.head)}${s.t != null ? ` <small>${esc(fmtLong(s.t))}</small>` : ''}</div>
    <div class="jr-text">${esc(s.text)}</div>${s.note ? `<div class="jr-note">${esc(s.note)}</div>` : ''}
    <div class="jr-ctl"><button class="linkbtn" data-jr="prev"${S.jr.i ? '' : ' disabled'}>◀ Back</button><button class="linkbtn" data-jr="auto" aria-pressed="${S.jr.auto}">${S.jr.auto ? '⏸ Pause' : '▶ Play it for me'}</button><button class="linkbtn jr-next" data-jr="${last ? 'end' : 'next'}">${last ? 'Finish ✓' : 'Next ▶'}</button></div>`;
  $('journey').classList.add('show'); document.body.classList.add('journeying');
}
function showStop() {
  clearTimeout(jTimer);
  const s = journeyStops()[S.jr.i]; renderStop();
  const arrived = () => {
    if (!S.jr) return;
    if (s.key && BY_KEY[s.key] && alive(BY_KEY[s.key], S.t, slack(S.t))) { if (s.hom) { switchTab('humans'); select(s.key, { keep: true }); } else { if (S.tab !== 'life') switchTab('life'); if (S.view !== 'list') setView('list'); select(s.key, { keep: true }); } }
    else if (s.tab && S.tab !== s.tab) switchTab(s.tab);
    if (S.jr.auto) jTimer = setTimeout(() => stepJourney(1), 9000 + s.text.length * 28);
  };
  if (s.find) { selectFind(s.find); setTimeout(arrived, 2200); }
  else if (s.ext) { selectExt(s.ext); setTimeout(arrived, 2200); }
  else { if (S.sel) { S.sel = null; WorldMap.select(null); } travel(s.t, arrived) || arrived(); }
}
function bindJourneys() {
  $('journeyMenu').innerHTML = JOURNEYS.map(j => `<button role="menuitem" data-journey="${j.id}"><b>${j.icon} ${esc(j.title)}</b><span>${esc(j.blurb)}</span></button>`).join('');
  $('journeyBtn').onclick = e => { e.stopPropagation(); const on = $('journeyMenu').classList.toggle('show'); $('journeyBtn').setAttribute('aria-expanded', String(on)); };
  document.addEventListener('click', e => {
    const j = e.target.closest('[data-journey]'); if (j) { startJourney(j.dataset.journey); return; }
    if (!e.target.closest('#journeyMenu')) { $('journeyMenu').classList.remove('show'); $('journeyBtn').setAttribute('aria-expanded', 'false'); }
  });
  $('journey').addEventListener('click', e => {
    const b = e.target.closest('[data-jr]'); if (!b || !S.jr) return;
    const a = b.dataset.jr;
    if (a === 'end') endJourney(); else if (a === 'next') { S.jr.auto = false; stepJourney(1); } else if (a === 'prev') { S.jr.auto = false; stepJourney(-1); }
    else if (a === 'auto') { S.jr.auto = !S.jr.auto; clearTimeout(jTimer); renderStop(); if (S.jr.auto) jTimer = setTimeout(() => stepJourney(1), 6000); }
  });
  $('youBar').onclick = openYou;
  // on a phone the map is too small to carry the caption, so it sits just under the map instead
  const place = () => { const small = window.innerWidth < 768; for (const j of [$('journey'), $('sceneCap')]) { if (small && j.parentNode.id === 'mapArea') $('mapArea').after(j); else if (!small && j.parentNode.id !== 'mapArea') $('mapArea').appendChild(j); j.classList.toggle('below', small); } };
  place(); window.addEventListener('resize', place);
}

// ── popup, hash, map wiring ─────────────────────────────────────────
let factTimer = 0;
function showFact(emoji, html, ms) {
  clearTimeout(factTimer);
  $('fpEmoji').textContent = emoji; $('fpText').innerHTML = html;
  $('factPopup').classList.add('show');
  factTimer = setTimeout(closeFact, ms || 9000);
}
function closeFact() { $('factPopup').classList.remove('show'); clearTimeout(factTimer); }

function writeHash() {
  const parts = [String(S.t) + 'mya']; if (S.sel && BY_KEY[S.sel]) parts.push(S.sel);
  if (S.pin) parts.push('pin=' + S.pin.lat.toFixed(2) + ',' + S.pin.lon.toFixed(2) + ',' + encodeURIComponent(S.pin.name));
  const next = '#' + parts.join('/');
  if (location.hash !== next) { try { history.replaceState(null, '', next); } catch (e) {} }
}
function readHash() {
  const raw = decodeURIComponent((location.hash || '').replace(/^#/, '')); if (!raw) return false;
  const segs = raw.split('/'), pinSeg = segs.find(s => s.startsWith('pin=')), [a, b] = segs.filter(s => !s.startsWith('pin=')); let t;
  if (pinSeg) { const [la, lo, ...nm] = pinSeg.slice(4).split(','); if (isFinite(+la) && isFinite(+lo)) setTimeout(() => setPin(+la, +lo, nm.join(',') || null, true), 0); }
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
    sparks: SPARKS.map(([lat, lon, from, to, kind, r, name]) => ({ at: WorldMap.attach(lat, lon, (from + to) / 2), from, to, kind, r, name })),
  });
  WorldMap.onPick = (h, x, y) => {
    if (!h) {
      $('mapAbout').classList.remove('show');
      if ($('pinPanel').classList.contains('show')) { const q = WorldMap.pickPresent(x, y); if (q) setPin(+q.lat.toFixed(2), +q.lon.toFixed(2), null); else $('pinHint').textContent = 'That spot was open ocean then — tap land, or type a city.'; }
      return;
    }
    if (h.marker) select(h.marker.key, { fromMap: true, keep: true });
    else if (h.pin) updatePinCard();
    else if (h.place && h.place.key.startsWith('cul:')) selectCulture(h.place.key.slice(4), true);
    else if (h.place && h.place.key.startsWith('drw:')) selectDrowned(h.place.key.slice(4), true);
    else if (h.place && h.place.key.startsWith('find:')) selectFind(h.place.key.slice(5), true);
    else if (h.place && h.place.key.startsWith('emp:')) selectEmpire(h.place.key.slice(4), true);
    else if (h.place && h.place.key.startsWith('bel:')) selectBelief(h.place.key.slice(4), true);
    else if (h.place && /^(rt|wk):/.test(h.place.key)) selectHist(h.place.key.slice(0, 2), h.place.key.slice(3), true);
    else if (h.place) { selectPlace(h.place.key, h.place.at, h.place.icon || '📍', '<b>' + esc(h.place.name) + '</b> — ' + esc(h.place.note || '')); if (S.sel !== h.place.key) closeFact(); }
  };
  const tip = $('mapTip');
  WorldMap.onHover = (h, x, y) => {
    if (!h) { tip.style.display = 'none'; return; }
    tip.innerHTML = h.marker ? esc(h.marker.name) + '<small>click for its story</small>' : h.pin ? esc(h.pin.name) + '<small>your pin</small>' : esc(h.place.name);
    tip.style.display = 'block'; tip.style.left = x + 'px'; tip.style.top = y + 'px';
  };
  WorldMap.onView = () => { $('mapGlobe').textContent = WorldMap.mode === 'globe' ? '🗺' : '🌐'; };
  $('mapGlobe').onclick = () => WorldMap.setMode(WorldMap.mode === 'globe' ? 'flat' : 'globe');
  $('mapIn').onclick = () => WorldMap.zoomBy(1.6); $('mapOut').onclick = () => WorldMap.zoomBy(1 / 1.6); $('mapReset').onclick = () => WorldMap.resetView();
  $('mapAbout').insertAdjacentHTML('beforeend', ['m:plates', 'm:sealevel', 'm:climate', 'm:history', 'm:time'].map(t => srcHTML(t, { 'm:plates': 'Plate model', 'm:sealevel': 'Sea level', 'm:climate': 'Temperature', 'm:history': 'Sizes and dates of empires', 'm:time': 'Time scale' }[t])).join(''));
  $('mapNote').onclick = () => $('mapAbout').classList.toggle('show'); $('mapAboutX').onclick = () => $('mapAbout').classList.remove('show');
  $('eventsRibbon').onclick = () => switchTab('insights');
  $('fpClose').onclick = closeFact;
  document.querySelector('.tab-bar').addEventListener('click', e => { const b = e.target.closest('.tab-btn'); if (b) switchTab(b.dataset.tab); });
  document.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') jumpPeriod(-1); else if (e.key === 'ArrowRight') jumpPeriod(1); else if (e.key === 'Escape') { closeFact(); $('mapAbout').classList.remove('show'); }
  });
  window.addEventListener('hashchange', readHash);
  bindPin(); bindTimeline(); bindLife(); bindHumans(); bindInsights(); bindGeo(); bindQuiz(); bindFinds(); bindTree(); bindJourneys(); bindExt();
  renderTimeline(); renderClimateStrip();
  if (!readHash()) {
    setTime(150);
    setTimeout(() => showFact('🦕', '<b>Welcome, time explorers!</b> Drag the timeline to watch the continents drift. Zoom into any stretch of it for more detail. Tap an animal to see where its fossils were found — carried back to where that spot was at the time.<br><button class="linkbtn" data-journey="you" style="margin-top:6px">🧬 Start with your own story</button>', 16000), 900);
  }
  renderPanel();
}
init();
