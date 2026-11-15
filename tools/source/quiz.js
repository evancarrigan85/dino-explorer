// ============================================================
// QUIZ — questions built from the site's own data
// ============================================================
// Every question is generated from facts already on the site (dates,
// family trees, fossil sites, food webs, extinctions, the human story),
// so adding an animal adds questions. Each answer explains itself and
// offers "Show me" to travel there on the map.
const FAMOUS = ['Tyrannosaurus rex', 'Triceratops', 'Stegosaurus', 'Velociraptor', 'Brachiosaurus', 'Diplodocus', 'Ankylosaurus', 'Spinosaurus', 'Parasaurolophus',
  'Pteranodon', 'Quetzalcoatlus', 'Mosasaurus', 'Plesiosaurs', 'Ichthyosaurs', 'Allosaurus', 'Archaeopteryx', 'Iguanodon', 'Pachycephalosaurus', 'Apatosaurus', 'Brontosaurus',
  'Dilophosaurus', 'Gallimimus', 'Compsognathus', 'Carnotaurus', 'Giganotosaurus', 'Argentinosaurus', 'Deinonychus', 'Utahraptor', 'Oviraptor', 'Protoceratops', 'Edmontosaurus',
  'Coelophysis', 'Plateosaurus', 'Dimetrodon', 'Lystrosaurus', 'Trilobite', 'Anomalocaris', 'Hallucigenia', 'Dunkleosteus', 'Tiktaalik', 'Meganeura', 'Megalodon', 'Woolly Mammoth',
  'Saber-toothed Cat (Smilodon)', 'Giant Ground Sloth', 'Glyptodon', 'Dire Wolf (Aenocyon dirus)', 'Woolly Rhinoceros', 'Cave Bear', 'Megaloceros (Irish Elk)', 'Titanoboa', 'Basilosaurus',
  'Gastornis (Giant Bird)', 'Paraceratherium (Indricotherium)', 'Dodo (Raphus cucullatus)', 'Blue Whale', 'Platypus', 'Coelacanth', 'Ammonites', 'Eurypterid (Sea Scorpion)',
  'Liopleurodon', 'Kronosaurus', 'Sarcosuchus', 'Deinosuchus', 'Microraptor', 'Therizinosaurus', 'Amargasaurus', 'Baryonyx', 'Elasmosaurus', 'Smilodon', 'Arthropleura',
  'Helicoprion', 'Opabinia', 'Ambulocetus (Walking Whale)', 'Thylacine (Tasmanian Tiger)', 'Passenger Pigeon (Ectopistes migratorius)', 'Elasmotherium (Siberian Unicorn)'];
const IMPOSTOR_WHY = {
  ptero: 'Pterosaurs were flying reptiles — close cousins of the dinosaurs, but a separate branch.',
  marine: 'Sea reptiles like this lived alongside dinosaurs, but they belong to completely different branches of the reptile family.',
  synapsid: 'It belongs to the synapsids — the branch that leads to mammals. It is more closely related to you than to any dinosaur.',
  croc: 'It is on the crocodile side of the family, which split from the dinosaur side over 245 million years ago.',
  reptile: 'It is a reptile from outside the dinosaur family.',
  mammal: 'It is a mammal.', amphib: 'It is an amphibian.', fish: 'It is a fish.',
};
const EXT_CAUSE = { ordovician: 'An ice age', devonian: 'Oceans running out of oxygen', permian: 'Giant volcanic eruptions in Siberia', triassic: 'Eruptions as Pangaea split apart', cretaceous: 'An asteroid hitting Earth' };

const QZ = { mode: 'kids', scope: 'all', round: [], i: 0, score: 0, picked: null, best: 0, done: false };
try { QZ.best = +localStorage.getItem('dte.quizBest') || 0; } catch (e) {}
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const mid = c => (c.t[0] + c.t[1]) / 2;
const overlap = (a, b) => a.t[0] >= b.t[1] && b.t[0] >= a.t[1];
const nm = c => c.name.replace(/ \(.*\)$/, '');
function qPool() {
  let pool = ALL.filter(c => c.g !== 'micro' && c.g !== 'plant');
  if (QZ.mode === 'kids') { const f = new Set(FAMOUS); pool = pool.filter(c => f.has(c.name) || c.hom && /Lucy|Turkana|Neanderthal|sapiens|Hobbit/.test(c.nick + c.name)); }
  if (QZ.scope === 'period') { const p = S.period, inP = pool.filter(c => inPeriod(c, p)); if (inP.length >= 6) pool = inP; }
  return pool;
}
const GEN = {
  first(pool) {
    const a = pick(pool), b = pick(pool.filter(c => c !== a && !overlap(a, c) && Math.abs(mid(a) - mid(c)) > Math.max(1, 0.2 * Math.max(mid(a), mid(c)))));
    if (!b) return null;
    const older = mid(a) > mid(b) ? a : b;
    return { q: 'Which came first?', opts: shuffle([a, b]).map(c => ({ t: c.emoji + ' ' + nm(c), ok: c === older })), show: older.key,
      why: `${nm(older)} lived ${older.lived}; ${nm(older === a ? b : a)} lived ${(older === a ? b : a).lived}.` };
  },
  sameTime(pool) {
    const x = pick(pool), yes = shuffle(pool.filter(c => c !== x && overlap(c, x))), no = shuffle(pool.filter(c => !overlap(c, x) && Math.abs(mid(c) - mid(x)) > Math.max(2, mid(x) * 0.3)));
    if (!yes.length || no.length < 3) return null;
    const y = yes[0];
    return { q: `Which of these was alive at the same time as ${nm(x)}?`, emoji: x.emoji, opts: shuffle([y, ...no.slice(0, 3)]).map(c => ({ t: c.emoji + ' ' + nm(c), ok: c === y })), show: y.key,
      why: `${nm(x)}: ${x.lived}. ${nm(y)}: ${y.lived}. The others lived millions of years earlier or later.` };
  },
  when(pool) {
    const x = pick(pool.filter(c => c.home)); if (!x) return null;
    const i = PERIODS.indexOf(x.home), far = shuffle(PERIODS.filter((p, j) => Math.abs(j - i) >= 2)).slice(0, 3);
    return { q: `When did ${nm(x)} live?`, emoji: x.emoji, opts: shuffle([x.home, ...far]).map(p => ({ t: (p.title || p.name) + (p.title ? '' : ' Period'), ok: p === x.home })), show: x.key,
      why: `${nm(x)} lived ${x.lived} — in the ${x.home.name}${x.home.title ? '' : ' Period'} (${x.home.start}–${x.home.end || 'today'} million years ago).` };
  },
  where(pool) {
    const x = pick(pool.filter(c => c.sites && c.sites.length)); if (!x) return null;
    const s = pick(x.sites), others = [];
    for (const c of shuffle(ALL)) { if (others.length >= 3) break; if (!c.sites || !c.sites.length || c === x) continue; const o = pick(c.sites); if (x.sites.every(t => KM(t[0], t[1], o[0], o[1]) > 3000) && others.every(t => KM(t[0], t[1], o[0], o[1]) > 1500)) others.push(o); }
    if (others.length < 3) return null;
    const lab = l => l.replace(/ — .*$/, '');
    return { q: `Where have fossils of ${nm(x)} been found?`, emoji: x.emoji, opts: shuffle([s, ...others]).map(o => ({ t: '📍 ' + lab(o[2]), ok: o === s })), show: x.key,
      why: `${nm(x)} fossils come from ${x.sites.map(t => lab(t[2])).join(', ')}.` };
  },
  notDino(pool) {
    const dinos = shuffle(pool.filter(c => c.g === 'dino')), fakes = pool.filter(c => IMPOSTOR_WHY[c.g] && c.g !== 'mammal' && c.g !== 'fish' && c.g !== 'amphib');
    if (dinos.length < 3 || !fakes.length) return null;
    const f = pick(fakes);
    return { q: 'Which one of these is NOT a dinosaur?', opts: shuffle([...dinos.slice(0, 3), f]).map(c => ({ t: c.emoji + ' ' + nm(c), ok: c === f })), show: f.key,
      why: `${nm(f)} — ${IMPOSTOR_WHY[f.g]} (${f.path.join(' › ')})` };
  },
  biggest(pool) {
    const sized = shuffle(pool.filter(c => c.len > 0.3));
    for (let k = 0; k < 20; k++) {
      const four = shuffle(sized).slice(0, 4).sort((a, b) => b.len - a.len);
      if (four.length < 4 || four[0].len < four[1].len * 1.4) continue;
      return { q: 'Which of these was the biggest?', opts: shuffle(four).map(c => ({ t: c.emoji + ' ' + nm(c), ok: c === four[0] })), show: four[0].key,
        why: four.map(c => `${nm(c)}: ${c.size}`).join(' · ') };
    }
    return null;
  },
  ate() {
    const ws = Object.entries(FOODWEBS), fam = new Set(FAMOUS);
    const cands = ws.flatMap(([pid, w]) => w.links.filter(l => w.nodes[l[1]][2] >= 2 && (QZ.mode !== 'kids' || fam.has(w.nodes[l[1]][3]) || w.nodes[l[1]][0] === 'Humans')).map(l => [pid, w, l]));
    if (!cands.length) return null;
    const [pid, w, l] = pick(cands);
    const eater = w.nodes[l[1]], food = w.nodes[l[0]], pi = PERIODS.findIndex(p => p.id === pid);
    const wrong = shuffle(ws.filter(([q]) => Math.abs(PERIODS.findIndex(p => p.id === q) - pi) >= 3).flatMap(([, v]) => Object.values(v.nodes))).filter((n, i, a) => a.findIndex(m => m[0] === n[0]) === i && n[0] !== food[0]).slice(0, 3);
    if (wrong.length < 3) return null;
    const c = eater[3] && BY_NAME[eater[3]];
    return { q: `What was on the menu for ${eater[0]}?`, emoji: eater[1], opts: shuffle([food, ...wrong]).map(n => ({ t: n[1] + ' ' + n[0], ok: n === food })), show: c && c.key,
      why: `${eater[0]} ate ${food[0].toLowerCase()} — ${l[2] === 'proof' ? 'and there is fossil proof' : 'most likely'}.${l[3] ? ' ' + l[3] : ''} The other choices lived at completely different times.` };
  },
  extinction() {
    const ids = Object.keys(EXT_CAUSE), id = pick(ids), p = PERIODS.find(q => q.id === id), e = p.insight.ext;
    return { q: `What caused the ${e.name.replace(/ \(.*\)| — .*$/g, '')}?`, emoji: '☠️', opts: shuffle([id, ...shuffle(ids.filter(k => k !== id)).slice(0, 3)]).map(k => ({ t: EXT_CAUSE[k], ok: k === id })),
      time: p.end, why: `${e.when}. ${e.cause} Lost: ${e.toll.charAt(0).toLowerCase() + e.toll.slice(1)}.` };
  },
  nickname() {
    const hs = HOMININS.filter(h => /“/.test(h.nick) && !/,/.test(h.nick)), h = pick(hs), others = shuffle(HOMININS.filter(o => o !== h)).slice(0, 3);
    return { q: `Which human relative is nicknamed ${h.nick}?`, emoji: '🦴', opts: shuffle([h, ...others]).map(o => ({ t: o.name, ok: o === h })), show: h.id, why: h.fact };
  },
  culture() {
    const c = pick(CULTURES.filter(c => c.id !== 'cities-today')), others = shuffle(CULTURES.filter(o => o !== c && o.where !== c.where && o.id !== 'cities-today')).filter((o, i, arr) => arr.findIndex(z => z.where === o.where) === i).slice(0, 3);
    return { q: `Where was this? “${c.home.split('.')[0]}.”`, emoji: c.icon, opts: shuffle([c, ...others]).map(o => ({ t: o.where, ok: o === c })), culture: c.id,
      why: `${c.name} — ${c.where}, ${c.when.toLowerCase()}.` };
  },
};
const KIDS_TYPES = ['first', 'first', 'sameTime', 'when', 'where', 'notDino', 'notDino', 'biggest', 'biggest', 'ate', 'ate', 'extinction', 'nickname'];
const EXPERT_TYPES = ['first', 'sameTime', 'sameTime', 'when', 'where', 'where', 'notDino', 'biggest', 'ate', 'ate', 'extinction', 'nickname', 'culture', 'culture'];
function newRound() {
  const pool = qPool(), types = QZ.mode === 'kids' ? KIDS_TYPES : EXPERT_TYPES, seen = new Set(), out = [];
  for (let k = 0; out.length < 10 && k < 200; k++) {
    const q = GEN[pick(types)](pool); if (!q) continue;
    const sig = q.q + q.opts.map(o => o.t).sort().join('|'); if (seen.has(q.q) || seen.has(sig)) continue;
    seen.add(q.q); seen.add(sig); out.push(q);
  }
  Object.assign(QZ, { round: out, i: 0, score: 0, picked: null, done: false });
}
function renderQuiz() {
  if (!QZ.round.length) newRound();
  const el = $('pane-quiz'), q = QZ.round[QZ.i], n = QZ.round.length;
  const head = `<div class="qz-top"><div class="seg qz-seg" data-qz="mode"><button data-v="kids" class="${QZ.mode === 'kids' ? 'on' : ''}">🧒 Kids</button><button data-v="expert" class="${QZ.mode === 'expert' ? 'on' : ''}">🎓 Expert</button></div>
    <div class="seg qz-seg" data-qz="scope"><button data-v="all" class="${QZ.scope === 'all' ? 'on' : ''}">All of time</button><button data-v="period" class="${QZ.scope === 'period' ? 'on' : ''}">This period</button></div></div>`;
  if (QZ.done) {
    const stars = QZ.score >= 9 ? '🌟🌟🌟' : QZ.score >= 6 ? '🌟🌟' : QZ.score >= 3 ? '🌟' : '🦴';
    const msg = QZ.score === n ? 'Perfect — a real palaeontologist!' : QZ.score >= 7 ? 'Brilliant work!' : QZ.score >= 4 ? 'Good digging — keep exploring!' : 'Every expert started somewhere. Try again!';
    el.innerHTML = `<div class="qz">${head}<div class="qz-card qz-end"><div class="qz-stars">${stars}</div><div class="qz-big">${QZ.score} / ${n}</div><div>${msg}</div><div class="qz-best">Best score: ${QZ.best} / 10</div><button class="qz-next" data-qz-act="again">Play again</button></div></div>`;
    return;
  }
  const answered = QZ.picked != null, right = answered && q.opts[QZ.picked].ok;
  el.innerHTML = `<div class="qz">${head}
    <div class="qz-prog"><span>Question ${QZ.i + 1} of ${n}</span><span>Score ${QZ.score}${QZ.best ? ' · best ' + QZ.best : ''}</span></div>
    <div class="qz-bar"><i style="width:${(QZ.i + (answered ? 1 : 0)) / n * 100}%"></i></div>
    <div class="qz-card">${q.emoji ? `<div class="qz-emoji">${q.emoji}</div>` : ''}<div class="qz-q">${esc(q.q)}</div>
      <div class="qz-opts${q.opts.length === 2 ? ' two' : ''}">${q.opts.map((o, i) => `<button class="qz-opt${answered ? (o.ok ? ' right' : i === QZ.picked ? ' wrong' : ' dim') : ''}" data-qz-opt="${i}" ${answered ? 'disabled' : ''}>${esc(o.t)}</button>`).join('')}</div>
      ${answered ? `<div class="qz-fb ${right ? 'yes' : 'no'}"><b>${right ? pick(['Correct! 🎉', 'Yes! 🦖', 'Spot on! ⭐', 'Nailed it! 🦴']) : 'Not quite.'}</b> ${esc(q.why)}</div>
        <div class="qz-acts">${q.show || q.time != null || q.culture ? '<button class="linkbtn" data-qz-act="show">🗺 Show me</button>' : ''}<button class="qz-next" data-qz-act="next">${QZ.i + 1 < n ? 'Next question →' : 'See my score'}</button></div>` : ''}
    </div></div>`;
}
function bindQuiz() {
  $('pane-quiz').addEventListener('click', e => {
    const sg = e.target.closest('.qz-seg button'); if (sg) { QZ[sg.parentElement.dataset.qz] = sg.dataset.v; newRound(); renderQuiz(); return; }
    const o = e.target.closest('[data-qz-opt]');
    if (o && QZ.picked == null) { QZ.picked = +o.dataset.qzOpt; if (QZ.round[QZ.i].opts[QZ.picked].ok) QZ.score++; renderQuiz(); return; }
    const a = e.target.closest('[data-qz-act]'); if (!a) return;
    const act = a.dataset.qzAct, q = QZ.round[QZ.i];
    if (act === 'next') {
      QZ.i++; QZ.picked = null;
      if (QZ.i >= QZ.round.length) { QZ.done = true; if (QZ.score > QZ.best) { QZ.best = QZ.score; try { localStorage.setItem('dte.quizBest', String(QZ.best)); } catch (err) {} } }
      renderQuiz(); $('panelContent').scrollTop = 0;
    } else if (act === 'again') { newRound(); renderQuiz(); }
    else if (act === 'show') {
      if (q.culture) { selectCulture(q.culture); return; }
      if (q.show && BY_KEY[q.show]) { if (!isFull()) setWindow(T_MAX, 0, true); S.sel = null; select(q.show, { keep: true }); }
      else if (q.time != null) { if (!isFull()) setWindow(T_MAX, 0, true); goTo(q.time + 0.3); }
      if (window.innerWidth < 768) document.getElementById('mapArea').scrollIntoView({ behavior: 'smooth' });
    }
  });
}
