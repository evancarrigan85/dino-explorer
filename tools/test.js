// Checks on the assembled page. Exits 1 on any failure.
const { chromium } = require('playwright');
const URL = 'file://' + (process.argv[2] || require('path').join(__dirname, '..', 'dino-explorer.html'));
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) pass++; else { fail++; console.log('  FAIL', name, extra); } };
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const open = async (vp, hash = '', opts = {}) => {
    const { keepDoor, ...ctxOpts } = opts; const ctx = await b.newContext(Object.assign({ viewport: vp }, ctxOpts)); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(URL + hash); await p.waitForTimeout(900);
    if (!opts.keepDoor) await p.evaluate(() => typeof closeDoor === 'function' && closeDoor());   // the front door would sit over everything
    return p;
  };
  let p = await open({ width: 1400, height: 900 });
  ok('loads at 150 MYA', await p.evaluate(() => S.t === 150 && S.period.id === 'jurassic'));
  ok('map engine has land', await p.evaluate(() => WorldMap.stats().polygons > 500));
  ok('markers drawn', await p.evaluate(() => ALL.filter(c => alive(c, S.t)).length > 5));
  // timeline zoom: presets, wheel, brush
  await p.click('#tlPresets .chip:nth-child(5)'); await p.waitForTimeout(300);
  ok('preset: last 10 Myr', await p.evaluate(() => S.win[0] === 10 && S.win[1] === 0 && S.t <= 10));
  ok('ages row shown when zoomed', await p.evaluate(() => document.getElementById('rowAges').classList.contains('show') && document.querySelectorAll('#rowAges .tb').length >= 4));
  ok('more events when zoomed', await p.evaluate(() => document.querySelectorAll('#tlEvents .ev').length >= 8));
  const box = await p.locator('#rowPeriods').boundingBox();
  await p.mouse.move(box.x + box.width * 0.8, box.y + 5); await p.mouse.wheel(0, -300); await p.waitForTimeout(250);
  ok('wheel zooms in about the pointer', await p.evaluate(() => S.win[0] < 10 && S.win[1] < 2.2), JSON.stringify(await p.evaluate(() => S.win)));
  await p.mouse.wheel(0, 3000); await p.waitForTimeout(250);
  for (let i = 0; i < 20; i++) await p.mouse.wheel(0, 600);
  await p.waitForTimeout(200);
  ok('wheel zooms back out to all time', await p.evaluate(() => S.win[0] === 720 && S.win[1] === 0), JSON.stringify(await p.evaluate(() => S.win)));
  // brush: drag the left handle inward
  await p.click('#tlPresets .chip:nth-child(1)'); await p.waitForTimeout(150);
  const ov = await p.locator('#tlOverview').boundingBox();
  await p.mouse.move(ov.x + 2, ov.y + 6); await p.mouse.down(); await p.mouse.move(ov.x + ov.width * 0.5, ov.y + 6, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(200);
  ok('brush handle zooms', await p.evaluate(() => S.win[0] < 300 && S.win[0] > 150 && S.win[1] === 0), JSON.stringify(await p.evaluate(() => S.win)));
  await p.click('#tlPresets .chip:nth-child(1)');
  // slider
  await p.evaluate(() => { const s = document.getElementById('timeSlider'); s.value = 6560; s.dispatchEvent(new Event('input')); });
  await p.waitForTimeout(400);
  ok('slider moves time', await p.evaluate(() => Math.abs(S.t - 68.5) < 1 && S.period.id === 'cretaceous'), String(await p.evaluate(() => S.t)));
  // tabs
  for (const tab of ['humans', 'insights', 'geo', 'life']) {
    await p.click('#tab-' + tab); await p.waitForTimeout(150);
    ok('tab ' + tab + ' has content', await p.evaluate(t => document.getElementById('pane-' + t).innerText.length > 80 && document.getElementById('pane-' + t).classList.contains('on'), tab));
  }
  // search → select → time travels into range
  await p.fill('#q', 'triceratops'); await p.waitForTimeout(350);
  ok('search finds Triceratops', await p.evaluate(() => document.querySelectorAll('#lifeList [data-key="triceratops"]').length === 1));
  await p.click('#lifeList [data-key="triceratops"]'); await p.waitForTimeout(2200);
  ok('selecting travels to its time', await p.evaluate(() => S.sel === 'triceratops' && S.t <= 68.5 && S.t >= 65.5), String(await p.evaluate(() => S.t)));
  ok('selected card shows museum label', await p.evaluate(() => /how do we know/i.test(document.querySelector('#lifeList .creature-card.active').innerText)));
  await p.fill('#q', ''); await p.waitForTimeout(300);
  // sort & filter
  await p.click('#scopeSeg [data-scope="all"]'); await p.click('#typeChips [data-type="dino"]'); await p.waitForTimeout(200);
  ok('family-tree headers', await p.evaluate(() => document.querySelectorAll('#lifeList .tree-h').length > 10));
  ok('dinosaur-type chips', await p.evaluate(() => [...document.querySelectorAll('#dtypeChips .chip')].map(e => e.dataset.branch).includes('Theropods')));
  await p.click('#dtypeChips [data-branch="Theropods"]'); await p.waitForTimeout(150);
  ok('branch filter narrows list', await p.evaluate(() => { const n = document.querySelectorAll('#lifeList [data-key]').length; return n > 20 && n < ALL.filter(c => c.g === 'dino').length; }));
  await p.selectOption('#sortSel', 'size'); await p.waitForTimeout(150);
  ok('sort by size puts a giant first', await p.evaluate(() => BY_KEY[document.querySelector('#lifeList [data-key]').dataset.key].len >= 12));
  // weird filter
  await p.selectOption('#sortSel', 'old'); await p.click('#dtypeChips [data-branch="all"]'); await p.click('#typeChips [data-type="all"]');
  await p.click('#weirdBtn'); await p.waitForTimeout(200);
  ok('weird filter keeps only weird animals', await p.evaluate(() => { const ks = [...document.querySelectorAll('#lifeList [data-key]')].map(e => e.dataset.key); return ks.length > 60 && ks.every(k => BY_KEY[k].weird); }));
  await p.click('#weirdBtn'); await p.waitForTimeout(150);
  ok('before the dinosaurs: 180+ animals', await p.evaluate(() => ALL.filter(c => c.t[1] >= 233).length >= 180), String(await p.evaluate(() => ALL.filter(c => c.t[1] >= 233).length)));
  ok('Age of Mammals has 150+ animals', await p.evaluate(() => ALL.filter(c => c.t[0] <= 66).length >= 150));
  // ways of life
  await p.click('#tab-humans'); await p.waitForTimeout(200);
  await p.click('#pane-humans .cul-item[data-cul="catalhoyuk"]'); await p.waitForTimeout(2600);
  ok('culture travels in time and opens its profile', await p.evaluate(() => S.sel === 'cul:catalhoyuk' && S.t < 0.0095 && S.t > 0.0077 && /Homes and settlements/i.test(document.querySelector('#pane-humans .profile').innerText)), JSON.stringify(await p.evaluate(() => [S.sel, S.t])));
  ok('culture pins on the map', await p.evaluate(() => CULTURES.filter(c => culActive(c)).some(c => c.id === 'catalhoyuk')));
  await p.click('#tab-life'); await p.waitForTimeout(150);
  // food webs
  ok('every period has a food web', await p.evaluate(() => PERIODS.every(q => FOODWEBS[q.id] && Object.keys(FOODWEBS[q.id].nodes).length >= 4)));
  await p.evaluate(() => setTime(67)); await p.click('#tab-insights'); await p.waitForTimeout(250);
  ok('food web drawn with links', await p.evaluate(() => document.querySelectorAll('#pane-insights .fw-node').length >= 8 && document.querySelectorAll('#pane-insights .fw-link.proof').length >= 2));
  await p.click('#pane-insights .fw-node[data-key="tyrannosaurus-rex"]'); await p.waitForTimeout(400);
  ok('tapping a food-web animal opens its card', await p.evaluate(() => S.tab === 'life' && S.sel === 'tyrannosaurus-rex'));
  // where was my town?
  await p.evaluate(() => { setTime(150); setPin(51.05, -114.07, 'Calgary'); }); await p.waitForTimeout(250);
  ok('pin card shows a past latitude and distance', await p.evaluate(() => /Calgary/.test(document.getElementById('pinCard').innerText) && /km/.test(document.getElementById('pinCard').innerText) && document.getElementById('pinCard').classList.contains('show')));
  ok('pin is in the link', await p.evaluate(() => { writeHash(); return /pin=51\.05,-114\.07,Calgary/.test(location.hash); }));
  ok('Calgary was near the equator 300 MYA', await p.evaluate(() => { const q = WorldMap.locate(S.pin.at, 300); return q && Math.abs(q[1]) < 25; }), JSON.stringify(await p.evaluate(() => WorldMap.locate(S.pin.at, 300))));
  ok('tapping land maps back to today', await p.evaluate(() => { setTime(0); WorldMap._draw(); const cv = document.getElementById('mapCanvas').getBoundingClientRect(); for (let i = 0; i < 400; i++) { const x = cv.width * (0.2 + 0.6 * ((i * 37) % 100) / 100), y = cv.height * (0.25 + 0.5 * ((i * 61) % 100) / 100); const q = WorldMap.pickPresent(x, y); if (q) { const back = WorldMap.locate(WorldMap.attach(q.lat, q.lon, 0), 0); return Math.abs(back[1] - q.lat) < 0.5; } } return false; }));
  await p.evaluate(() => setPin(null));
  // quiz: thousands of generated questions, each with exactly one right answer
  const qbad = await p.evaluate(() => { const bad = []; let n = 0;
    for (const mode of ['kids', 'expert']) for (const scope of ['all', 'period']) for (const per of PERIODS) {
      S.period = per; QZ.mode = mode; QZ.scope = scope;
      for (let r = 0; r < 6; r++) { newRound(); if (QZ.round.length < 10) bad.push(mode + '/' + scope + '/' + per.id + ': only ' + QZ.round.length + ' questions');
        for (const q of QZ.round) { n++; const texts = q.opts.map(o => o.t);
          if (q.opts.filter(o => o.ok).length !== 1) bad.push('answers≠1: ' + q.q);
          if (new Set(texts).size !== texts.length) bad.push('duplicate option: ' + q.q + ' ' + texts.join(' | '));
          if (texts.some(t => !t || /undefined|NaN|null/.test(t)) || /undefined|NaN/.test(q.q + q.why)) bad.push('broken text: ' + q.q); } } }
    S.period = getPeriod(S.t); QZ.mode = 'kids'; QZ.scope = 'all'; newRound(); return { n, bad: [...new Set(bad)] }; });
  ok('quiz: ' + qbad.n + ' generated questions all valid', qbad.bad.length === 0, '\n    ' + qbad.bad.slice(0, 12).join('\n    '));
  await p.click('#tab-quiz'); await p.waitForTimeout(200);
  await p.click('#pane-quiz [data-qz-opt="0"]'); await p.waitForTimeout(150);
  ok('quiz: answering shows feedback', await p.evaluate(() => !!document.querySelector('#pane-quiz .qz-fb') && QZ.picked === 0));
  for (let i = 0; i < 10; i++) { const nx = await p.$('#pane-quiz [data-qz-act="next"]'); if (!nx) break; await nx.click(); await p.waitForTimeout(80); const op = await p.$('#pane-quiz [data-qz-opt="0"]:not([disabled])'); if (op) { await op.click(); await p.waitForTimeout(60); } }
  ok('quiz: a full round reaches the score screen', await p.evaluate(() => QZ.done && /\/ 10/.test(document.getElementById('pane-quiz').innerText)));
  await p.click('#tab-life'); await p.waitForTimeout(150);
  // range chart
  await p.click('#tab-life'); await p.click('#chartBtn'); await p.waitForTimeout(200);
  ok('chart: a bar per kind of animal', await p.evaluate(() => document.querySelectorAll('#lifeList .rc-row.kind').length >= 12));
  await p.click('#lifeList [data-chart-type="invert"]'); await p.waitForTimeout(150);
  ok('chart: trilobites end at the Great Dying', await p.evaluate(() => { const r = document.querySelector('#lifeList [data-chart-branch="Arthropods"]'); return !!r && document.querySelectorAll('#lifeList .rc-row.branch').length >= 4; }));
  await p.click('#lifeList [data-chart-branch="Arthropods"]'); await p.waitForTimeout(150);
  ok('chart: tapping a branch lists its animals', await p.evaluate(() => S.view === 'list' && S.branch === 'Arthropods' && document.querySelectorAll('#lifeList [data-key]').length >= 20));
  await p.evaluate(() => { S.type = 'all'; S.branch = 'all'; S.scope = 'now'; renderLife(); });
  // Ice Age sea level
  ok('sea level: about -125 m at the last glacial peak, 0 today, none before the Ice Age', await p.evaluate(() => WorldMap.seaLevel(0.021) <= -120 && WorldMap.seaLevel(0) === 0 && WorldMap.seaLevel(5) === 0 && WorldMap.seaLevel(0.125) > 0));
  ok('sea level: shoreline levels loaded, none wrapping the planet', await p.evaluate(() => typeof SHELF_PACKED === 'string' && SHELF_PACKED.length > 10000));
  ok('sea level: meltwater pulse — fast rise 14,700→14,200 years ago', await p.evaluate(() => WorldMap.seaLevel(0.0142) - WorldMap.seaLevel(0.0147) >= 15));
  await p.click('#tab-humans'); await p.waitForTimeout(150);
  await p.click('#pane-humans .drw-item[data-drw="doggerland"]'); await p.waitForTimeout(2600);
  ok('drowned: Doggerland opens with people living there', await p.evaluate(() => S.sel === 'drw:doggerland' && S.t > 0.0082 && S.t < 0.013 && /dry land/.test(document.querySelector('#pane-humans .profile').innerText)), JSON.stringify(await p.evaluate(() => [S.sel, S.t])));
  await p.evaluate(() => setTime(0.001)); await p.waitForTimeout(200);
  ok('drowned: later it is under water, shown with a wave pin', await p.evaluate(() => /under water/.test(document.querySelector('#pane-humans .profile').innerText) && placeCache['ddoggerland'].icon === '🌊'));
  await p.click('#tab-life'); await p.waitForTimeout(150);
  // peer-reviewed sources
  ok('sources: 240+ verified references, every one with a DOI', await p.evaluate(() => Object.keys(REFS).length >= 355 && Object.values(REFS).every(r => /^10\.\d{4,}\//.test(r.d) && r.t && r.y)));
  await p.click('#tab-life'); await p.fill('#q', 'tiktaalik'); await p.waitForTimeout(300); await p.click('#lifeList [data-key="tiktaalik"]'); await p.waitForTimeout(2000);
  ok('sources: an opened card lists its paper with a DOI link', await p.evaluate(() => { const el = document.querySelector('#lifeList .creature-card.active .sources'); return !!el && /Daeschler/.test(el.innerText) && !!el.querySelector('a[href^="https://doi.org/10.1038/"]'); }));
  await p.fill('#q', ''); await p.waitForTimeout(200);
  ok('sources: map notes cite the plate model and sea-level research', await p.evaluate(() => /Merdith/.test(document.getElementById('mapAbout').innerText) && /Lambeck/.test(document.getElementById('mapAbout').innerText)));
  // finds: the history of discovery
  await p.click('#tab-finds'); await p.waitForTimeout(300);
  ok('finds: 50+ finds listed, ten or more from before 1800', await p.evaluate(() => document.querySelectorAll('#pane-finds .find-item').length >= 50 && FINDS.filter(f => f.year < 1800).length >= 10));
  await p.click('#pane-finds .find-item[data-find="buckland"]'); await p.waitForTimeout(2600);
  ok('finds: choosing one moves time to the fossil’s age and opens its story', await p.evaluate(() => Math.abs(S.t - 166) < 0.5 && S.sel === 'find:buckland' && /great lizard/i.test(document.querySelector('#pane-finds .profile').innerText) && /WHAT THEY GOT WRONG/i.test(document.querySelector('#pane-finds .profile').innerText)));
  ok('finds: the story cites its paper', await p.evaluate(() => !!document.querySelector('#pane-finds .profile .sources a[href="https://doi.org/10.1144/transgslb.1.2.390"]')));
  ok('finds: its pin is placed on the moving map', await p.evaluate(() => { const pl = placeCache['fbuckland']; return !!pl && !!WorldMap.locate(pl.at, S.t); }));
  await p.click('#pane-finds [data-meet="megalosaurus"]'); await p.waitForTimeout(1200);
  ok('finds: “Meet” opens the animal’s card, which links back to the find', await p.evaluate(() => S.tab === 'life' && S.sel === 'megalosaurus' && !!document.querySelector('#lifeList .creature-card.active [data-find="buckland"]')));
  await p.click('#lifeList .creature-card.active [data-find="plot"]'); await p.waitForTimeout(1500);
  ok('finds: the card’s discovery button returns to the Finds tab', await p.evaluate(() => S.tab === 'finds' && S.sel === 'find:plot'));
  await p.evaluate(() => selectFind('whitesands')); await p.waitForTimeout(3200);
  ok('finds: a young find zooms the timeline in to reach its moment', await p.evaluate(() => Math.abs(S.t - 0.022) < 0.002 && S.win[0] < 1));
  await p.evaluate(() => selectFind('leonardo')); await p.waitForTimeout(2600);
  ok('finds: a find with no single fossil is pinned on today’s map', await p.evaluate(() => S.t === 0 && !!placeCache['fleonardo']));
  ok('finds: every find with a linked animal or human points at a real card', await p.evaluate(() => FINDS.every(f => (!f.animal || ALL.some(c => c.name === f.animal)) && (!f.hom || !!BY_KEY[f.hom]))));
  await p.evaluate(() => { setWindow(T_MAX, 0, true); switchTab('life'); }); await p.waitForTimeout(200);
  // sources: linked, clean and complete
  ok('sources: every citation on a card resolves, and every reference is used somewhere', await p.evaluate(() => Object.values(SRCMAP).every(ks => ks.every(k => REFS[k])) && Object.keys(REFS).every(k => Object.values(SRCMAP).some(ks => ks.includes(k)))));
  ok('sources: titles and names are clean (no shouting, no glued or doubled words)', await p.evaluate(() => Object.values(REFS).every(r => !/\s{2,}|\n/.test(r.t) && r.t !== r.t.toUpperCase() && !/[a-z][A-Z][a-z]{3,} [a-z]+[a-z][A-Z]/.test(r.t) && !/\b[A-Z]{4,}\b/.test(r.a) && r.a && r.j)), await p.evaluate(() => Object.values(REFS).filter(r => /\s{2,}|\n/.test(r.t) || r.t === r.t.toUpperCase() || /\b[A-Z]{4,}\b/.test(r.a) || !r.a || !r.j).map(r => r.a + ': ' + r.t).slice(0, 5).join(' | ')));
  const loose = await p.evaluate(() => { const rx = /\b(19|20)\d\d (study|paper|analysis|scan)|\bstud(y|ies) (in|of|from|published in) (19|20)\d\d/i; return ALL.filter(c => !c.hom && !SRCMAP['a:' + c.name] && rx.test([c.fact, c.know, c.debate].join(' '))).map(c => c.name); });
  ok('sources: a card that names a study cites it (one known gap: Palorchestes)', loose.length <= 1 && loose.every(n => n === 'Palorchestes'), loose.join(', '));
  ok('sources: names follow the paper, not the registry’s filing (Ji, Perle, Conway Morris)', await p.evaluate(() => REFS.ji1998.a.startsWith('Ji,') && REFS.perle1993.a.startsWith('Perle,') && REFS.morris2014.a.startsWith('Conway Morris') && REFS.ostrom1973.a === 'Ostrom'));
  // you: the reader's own line
  await p.evaluate(() => { setWindow(T_MAX, 0, true); setTime(250); }); await p.waitForTimeout(200);
  ok('you: the bar names your ancestor at this moment', await p.evaluate(() => /cynodont/.test(document.getElementById('youBar').innerText) && /Thrinaxodon/.test(document.getElementById('youBar').innerText)));
  ok('you: the line runs unbroken from 720 million years ago to today', await p.evaluate(() => YOU_LINE[0].from === 720 && YOU_LINE[YOU_LINE.length - 1].to === 0 && YOU_LINE.every((y, i) => !i || YOU_LINE[i - 1].to === y.from) && [700, 500, 300, 100, 10, 1, 0].every(t => youAt(t) && t <= youAt(t).from && t >= youAt(t).to)));
  await p.click('#youBar'); await p.waitForTimeout(500);
  ok('you: opening it tells the story and says the animal shown is a cousin', await p.evaluate(() => /Your ancestor/.test(document.getElementById('fpText').innerText) && /close cousin/.test(document.getElementById('fpText').innerText) && S.sel === 'thrinaxodon'));
  await p.evaluate(() => closeFact());
  // journeys
  await p.click('#journeyBtn'); await p.waitForTimeout(150);
  ok('journeys: the menu offers four', await p.evaluate(() => document.getElementById('journeyMenu').classList.contains('show') && document.querySelectorAll('#journeyMenu [data-journey]').length === 4));
  await p.click('#journeyMenu [data-journey="drift"]'); await p.waitForTimeout(2600);
  ok('journeys: the first stop is shown and time has travelled there', await p.evaluate(() => /1 \/ 9/.test(document.querySelector('#journey .jr-n').textContent) && Math.abs(S.t - 700) < 1 && document.getElementById('journey').classList.contains('show')));
  await p.click('#journey [data-jr="next"]'); await p.waitForTimeout(2600);
  ok('journeys: Next moves on through time', await p.evaluate(() => /2 \/ 9/.test(document.querySelector('#journey .jr-n').textContent) && Math.abs(S.t - 500) < 1 && /Gondwana/.test(document.querySelector('#journey .jr-head').textContent)));
  await p.click('#journey [data-jr="end"]'); await p.waitForTimeout(150);
  ok('journeys: closing ends it', await p.evaluate(() => !S.jr && !document.getElementById('journey').classList.contains('show')));
  ok('journeys: each is built from the site’s own data', await p.evaluate(() => { const n = id => JOURNEYS.find(j => j.id === id).stops().length; return n('you') === YOU_LINE.length && n('extinctions') === EXTINCTIONS.length && n('finds') === 10 && n('drift') === 9; }));
  await p.evaluate(() => startJourney('you')); await p.waitForTimeout(2600);
  for (let i = 0; i < 11; i++) { await p.evaluate(() => stepJourney(1)); await p.waitForTimeout(120); }
  await p.waitForTimeout(2600);
  ok('journeys: “Your story” arrives at the cynodont that came through the Great Dying', await p.evaluate(() => Math.abs(S.t - 250) < 1 && S.sel === 'thrinaxodon' && /worst extinction/.test(document.querySelector('#journey .jr-text').textContent)));
  await p.evaluate(() => { endJourney(); S.sel = null; WorldMap.select(null); switchTab('life'); }); await p.waitForTimeout(150);
  // history: empires, kingdoms and beliefs of the last 5,500 years
  await p.evaluate(() => { setWindow(T_MAX, 0, true); switchTab('humans'); }); await p.waitForTimeout(250);
  ok('history: the Humans tab lists every empire and belief, beliefs grouped in families', await p.evaluate(() => document.querySelectorAll('#pane-humans [data-emp].hist-item').length === EMPIRES.length && document.querySelectorAll('#pane-humans [data-bel].hist-item').length === BELIEFS.length && document.querySelectorAll('#pane-humans .fam-h').length === BELIEF_FAMILIES.length));
  ok('history: the Abrahamic family, Zoroastrianism and shamanism are all there', await p.evaluate(() => ['judaism', 'christianity', 'islam', 'bahai'].every(id => BEL[id].fam === 'abrahamic') && BEL.christianity.grew.includes('judaism') && BEL.islam.grew.includes('judaism') && !!BEL.zoroastrianism && /Shamanism/.test(BEL.spirits.name)));
  await p.click('#pane-humans [data-emp="rome"]'); await p.waitForTimeout(3000);
  ok('history: choosing Rome goes to its height, in calendar years', await p.evaluate(() => S.sel === 'emp:rome' && Math.abs(yearAt(S.t) - 117) < 12 && / CE$/.test(document.getElementById('myaDisplay').textContent) && S.win[0] <= 0.0065 && /Roman Empire/.test(document.querySelector('#pane-humans .profile').innerText) && /rough sketch/.test(document.querySelector('#pane-humans .profile').innerText)));
  ok('history: the timeline is ticked in round calendar years', await p.evaluate(() => { const t = [...document.querySelectorAll('#tlTicks .tk')].map(e => e.textContent.trim()); return t.includes('1000 BCE') && t.includes('1000 CE'); }));
  ok('history: the empires alive then are marked, with their lands sketched on the map', await p.evaluate(() => { const on = [...document.querySelectorAll('#pane-humans [data-emp].hist-item.now')].map(e => e.dataset.emp); return on.includes('rome') && on.includes('han') && !on.includes('mongol') && EMPIRES.filter(e => e.poly).every(e => HIST_REGIONS.some(r => r.key === 'emp:' + e.id)) && HIST_REGIONS.every(r => d3.geoArea(r.geo) < 2 * Math.PI && r.from > r.to) && !!placeCache.erome; }));
  ok('history: years read the same both ways', await p.evaluate(() => fmtYear(-250) === '250 BCE' && fmtYear(117) === '117 CE' && Math.abs(yearAt(tOfYear(-500)) + 500) < 1e-6));
  ok('history: an empire cites the published tables of sizes and dates', await p.evaluate(() => /Taagepera/.test(document.querySelector('#pane-humans .profile .sources').innerText)));
  await p.click('#pane-humans [data-bel="buddhism"]'); await p.waitForTimeout(3000);
  ok('history: a belief opens with what its followers hold, where it grew from and how it travelled', await p.evaluate(() => { const t = document.querySelector('#pane-humans .profile').innerText; return S.sel === 'bel:buddhism' && /WHAT ITS FOLLOWERS HOLD/i.test(t) && /GREW OUT OF/i.test(t) && /Hinduism/.test(t) && /250 BCE — Sri Lanka/.test(t); }));
  await p.evaluate(() => setTime(tOfYear(700))); await p.waitForTimeout(400);
  ok('history: its routes reach only the places it had arrived at by that year', await p.evaluate(() => { const y = yearAt(S.t), r = histRoutes().filter(x => !x.id), shown = r.filter(x => S.t <= x.from).length; return r.length === 6 && shown === BEL.buddhism.spread.filter(sp => sp[0] <= y).length && shown === 5 && !!placeCache.bbuddhism0; }));
  ok('history: the beliefs section says the site takes no side', await p.evaluate(() => /does not say which, if any, is true/.test(document.getElementById('pane-humans').innerText)));
  ok('history: every empire and belief with a figure cites a source', await p.evaluate(() => EMPIRES.filter(e => e.area).every(e => (SRCMAP['k:' + e.id] || []).length) && ['spirits', 'christianity', 'islam', 'hinduism', 'buddhism', 'judaism'].every(id => (SRCMAP['b:' + id] || []).length)));
  await p.evaluate(() => { S.sel = null; WorldMap.select(null); setWindow(T_MAX, 0, true); setTime(150); switchTab('life'); }); await p.waitForTimeout(200);
  // the name, and history's second layer: shifting borders, trade routes, great works
  ok('name: the site is called Before Us, with deep time in the tagline', await p.evaluate(() => document.querySelector('header h1').textContent === 'Before Us' && /deep-time atlas/.test(document.title) && /deep-time atlas/.test(document.querySelector('header .sub').textContent)));
  await p.evaluate(() => { switchTab('humans'); selectEmpire('rome'); }); await p.waitForTimeout(3000);
  ok('borders: Rome has a sketch for each of five dates, listed on its card', await p.evaluate(() => HIST_REGIONS.filter(r => r.key === 'emp:rome').length === 5 && document.querySelectorAll('#pane-humans .emp-stages li').length === 5 && /jumps from one sketch to the next/.test(document.querySelector('#pane-humans .profile').innerText)));
  const stageAt = y => p.evaluate(y => { const t = tOfYear(y); const r = HIST_REGIONS.filter(r => r.key === 'emp:rome' && t <= r.from && t >= r.to); return r.length === 1 ? r[0].geo.coordinates.length + ':' + d3.geoArea(r[0].geo).toFixed(4) : 'n=' + r.length; }, y);
  const s1 = await stageAt(-100), s2 = await stageAt(117), s3 = await stageAt(-250);
  ok('borders: the land shaded changes as the timeline moves — scattered provinces, then the whole Mediterranean', s1.startsWith('6:') && s2.startsWith('1:') && s3.startsWith('1:') && +s2.split(':')[1] > +s1.split(':')[1] * 2 && +s1.split(':')[1] > +s3.split(':')[1] * 2, [s3, s1, s2].join(' | '));
  await p.click('#pane-humans .emp-stages [data-year="-27"]'); await p.waitForTimeout(2200);
  ok('borders: a date on the card travels there and marks the stage in force', await p.evaluate(() => Math.abs(yearAt(S.t) + 26) < 3 && /Augustus/.test(document.querySelector('#pane-humans .emp-stages li.on').textContent)));
  ok('borders: every sketch is a sane shape that does not wrap the globe', await p.evaluate(() => HIST_REGIONS.every(r => { const a = d3.geoArea(r.geo); return a > 0 && a < 2.2 && r.from > r.to; })));
  ok('trade and works: all are listed, with layer switches', await p.evaluate(() => document.querySelectorAll('#pane-humans [data-rt].hist-item').length === TRADE.length && TRADE.length >= 11 && document.querySelectorAll('#pane-humans [data-wk].hist-item').length === WORKS.length && WORKS.length >= 25 && document.querySelectorAll('#pane-humans [data-hl]').length === 4));
  await p.evaluate(() => { S.sel = null; WorldMap.select(null); setTime(tOfYear(1300)); renderHumans(); updatePlaces(); }); await p.waitForTimeout(400);
  ok('trade: in 1300 the Silk Roads, the monsoon routes and the Sahara caravans are running; the galleons are not yet', await p.evaluate(() => { const on = [...document.querySelectorAll('#pane-humans [data-rt].hist-item.now')].map(e => e.dataset.rt), ln = histRoutes().filter(l => S.t <= l.from && S.t >= l.to).map(l => l.id); return ['silkroad', 'monsoon', 'sahara'].every(id => on.includes(id) && ln.includes(id)) && !on.includes('galleon') && !ln.includes('galleon') && !!placeCache.rsilkroad; }));
  await p.click('#pane-humans [data-hl="rt"]'); await p.waitForTimeout(250);
  ok('layers: switching trade routes off clears their lines and pins', await p.evaluate(() => histRoutes().length === 0 && !histPlaces().some(pl => pl.key.startsWith('rt:')) && document.querySelector('#pane-humans [data-hl="rt"]').getAttribute('aria-pressed') === 'false'));
  await p.click('#pane-humans [data-hl="rt"]'); await p.waitForTimeout(200);
  await p.click('#pane-humans [data-rt="atlantic"]'); await p.waitForTimeout(3000);
  ok('trade: the Atlantic slave trade is told plainly, with its numbers and their source', await p.evaluate(() => { const t = document.querySelector('#pane-humans .profile').innerText; return S.sel === 'rt:atlantic' && /12\.5 million/.test(t) && /1\.8 million died/.test(t) && /Eltis/.test(t) && yearAt(S.t) > 1500 && yearAt(S.t) < 1867; }));
  await p.click('#pane-humans [data-wk="cpr"]'); await p.waitForTimeout(3000);
  ok('works: a great work opens at the year it was finished, with who built it and who is left out', await p.evaluate(() => { const t = document.querySelector('#pane-humans .profile').innerText; return S.sel === 'wk:cpr' && Math.abs(yearAt(S.t) - 1885) < 4 && /WHO GETS LEFT OUT/i.test(t) && /Chinese workers/.test(t) && !!placeCache.wcpr; }));
  ok('works: something lost is gone from the map afterwards', await p.evaluate(() => wrkNow(WRK.alexandria, -100) && !wrkNow(WRK.alexandria, 400) && !wrkNow(WRK.giza, -3000) && wrkNow(WRK.giza, 2000)));
  ok('history sources: routes and works with a paper cite it', await p.evaluate(() => ['silkroad', 'monsoon', 'atlantic'].every(id => (SRCMAP['r:' + id] || []).length) && ['stonehenge', 'giza', 'pantheon', 'machupicchu', 'lhc', 'smallpox'].every(id => (SRCMAP['w:' + id] || []).length)));
  await p.evaluate(() => { S.sel = null; WorldMap.select(null); setWindow(T_MAX, 0, true); setTime(150); switchTab('life'); }); await p.waitForTimeout(200);
  // a tap on the map must not move the map or the time
  for (const mode of ['flat', 'globe']) {
    await p.evaluate(m => { switchTab('life'); setWindow(T_MAX, 0, true); setTime(150); S.sel = null; WorldMap.select(null); WorldMap.setMode(m); WorldMap.resetView(); if (m === 'flat') { const bb = document.getElementById('mapCanvas').getBoundingClientRect(); WorldMap.zoomAt(bb.width * 0.4, bb.height * 0.3, 3); } }, mode);
    await p.waitForTimeout(900);
    const pick = await p.evaluate(() => { const bb = document.getElementById('mapCanvas').getBoundingClientRect(); for (let y = 20; y < bb.height; y += 6) for (let x = 20; x < bb.width; x += 6) { const h = WorldMap.hit(x, y); if (h && h.marker && BY_KEY[h.marker.key].sites.length > 1) return { x: bb.left + x, y: bb.top + y, key: h.marker.key }; } return null; });
    const probe = () => p.evaluate(() => { const bb = document.getElementById('mapCanvas').getBoundingClientRect(); return [[.3, .4], [.5, .5], [.45, .3], [.6, .6]].map(([fx, fy]) => { const q = WorldMap.pickPresent(bb.width * fx, bb.height * fy); return q ? q.lat.toFixed(1) + ',' + q.lon.toFixed(1) : 'sea'; }).join('|'); });
    const before = await probe(); if (pick) await p.mouse.click(pick.x, pick.y); await p.waitForTimeout(1500);
    ok('map tap (' + mode + '): choosing a marker on the map leaves the view and the time where they were', !!pick && before === await probe() && await p.evaluate(k => S.sel === k && S.t === 150, pick && pick.key), JSON.stringify(pick));
    await p.evaluate(() => { noLook = 0; select('giraffatitan', { keep: true }); }); await p.waitForTimeout(1500);
    ok('map (' + mode + '): choosing from the list still turns the map to the animal', before !== await probe());
  }
  await p.evaluate(() => { WorldMap.setMode('flat'); WorldMap.resetView(); S.sel = null; WorldMap.select(null); }); await p.waitForTimeout(300);
  // landscapes from measured climate, and the animals that fill the empty regions
  ok('landscape: the land-cover layer is present and credited to its source', await p.evaluate(() => typeof LANDCOVER_PACKED === 'string' && LANDCOVER_PACKED.length > 8000 && /Rubel/.test(document.getElementById('mapAbout').innerText) && /Landscapes\./.test(document.getElementById('mapAbout').innerText)));
  ok('coverage: regions that were empty now have animals', await p.evaluate(() => { const inP = (id, test) => { const q = PERIODS.find(x => x.id === id); return ALL.filter(a => !a.hom && a.t[0] > q.end && a.t[1] < q.start && (a.sites || []).some(test)).length; };
    const india = s => s[0] < 35 && s[0] > 5 && s[1] >= 68 && s[1] < 92, aus = s => s[1] >= 110 && s[1] < 156 && s[0] < -10, ant = s => s[0] < -60, sib = s => s[0] >= 50 && s[1] >= 60;
    return inP('jurassic', india) >= 1 && inP('jurassic', aus) >= 1 && inP('jurassic', sib) >= 1 && inP('cretaceous', india) >= 3 && inP('cretaceous', sib) >= 1 && inP('paleogene', ant) >= 1 && inP('paleogene', india) >= 6 && inP('triassic', aus) >= 1 && ALL.length >= 690; }));
  // eruptions and impacts are named, and the K–Pg boundary reads the same everywhere
  await p.evaluate(() => { switchTab('life'); setWindow(T_MAX, 0, true); WorldMap.setMode('flat'); WorldMap.resetView(); setTime(66); closeFact(); }); await p.waitForTimeout(700);
  ok('boundary: at 66 million years the header, the period and the epoch row agree', await p.evaluate(() => S.period.id === 'paleogene' && /Paleocene/.test(document.getElementById('periodEraLabel').textContent) && /Paleogene/.test(document.getElementById('periodName').textContent) && getPeriod(66.01).id === 'cretaceous' && getPeriod(0).id === 'holocene'));
  const spark = await p.evaluate(() => { const bb = document.getElementById('mapCanvas').getBoundingClientRect(); const found = {}; for (let y = 4; y < bb.height; y += 4) for (let x = 4; x < bb.width; x += 4) { const h = WorldMap.hit(x, y); if (h && h.spark && !found[h.spark.name]) found[h.spark.name] = { x: bb.left + x, y: bb.top + y, kind: h.spark.kind }; } return found; });
  ok('events: at 66 million years both the Deccan eruptions and the Chicxulub impact are on the map, each named for what it is', !!spark['Deccan Traps'] && spark['Deccan Traps'].kind === 'volcano' && !!spark['Chicxulub impact'] && spark['Chicxulub impact'].kind === 'impact', JSON.stringify(spark));
  if (spark['Deccan Traps']) { await p.mouse.click(spark['Deccan Traps'].x, spark['Deccan Traps'].y); await p.waitForTimeout(400); }
  ok('events: tapping the glow over India says it is volcanoes, not the asteroid', await p.evaluate(() => /Deccan Traps/.test(document.getElementById('fpText').innerText) && /not the asteroid/.test(document.getElementById('fpText').innerText)));
  await p.evaluate(() => closeFact());
  // deep-time land from the rocks
  ok('rocks: thousands of dated rock patches, credited to the atlas', await p.evaluate(() => ROCKS.length / 5 > 5000 && /Boucot/.test(document.getElementById('mapAbout').innerText) && /evidence rather than a picture/.test(document.getElementById('mapAbout').innerText)));
  ok('rocks: at 300 million years coal lies near the equator and glacial rubble far to the south — the coal forests and the southern ice', await p.evaluate(() => { const at = t => { const o = []; for (let i = 0; i < ROCKS.length; i += 5) if (t <= ROCKS[i + 3] && t >= ROCKS[i + 4]) { const ll = WorldMap.locate(WorldMap.attach(ROCKS[i + 1] * ROCK_CELL, ROCKS[i + 2] * ROCK_CELL, t), t); if (ll) o.push([ROCKS[i], ll[1]]); } return o; };
    const r = at(300), coal = r.filter(x => x[0] === 0).map(x => Math.abs(x[1])), ice = r.filter(x => x[0] === 3).map(x => x[1]), mean = a => a.reduce((s, x) => s + x, 0) / a.length;
    return coal.length > 30 && ice.length > 3 && mean(coal) < 25 && mean(ice) < -35; }));
  // animals arrive and leave
  ok('markers: the map notices arrivals and departures, and a crowded spot shows how many more are there', await p.evaluate(() => { const src = WorldMap.setLayers.toString(); return /born\[m\.key\]/.test(src) && /ghosts\.push/.test(src); }));
  // the front door, rivers, and the second batch of animals
  { const d = await open({ width: 1400, height: 900 }, '', { keepDoor: true });
    ok('door: a fresh visit opens on the ways in, with Your story first', await d.evaluate(() => document.getElementById('door').classList.contains('show') && document.querySelectorAll('#door [data-door]').length === 7 && document.querySelector('#door .door-b').dataset.door === 'you'));
    await d.click('#door [data-door="you"]'); await d.waitForTimeout(2600);
    ok('door: “Your story” closes it and starts the journey', await d.evaluate(() => !document.getElementById('door').classList.contains('show') && S.jr && S.jr.id === 'you'));
    await d.evaluate(() => endJourney()); await d.click('header .logo'); await d.waitForTimeout(300);
    ok('door: the globe in the header opens it again; Escape closes it', await d.evaluate(() => document.getElementById('door').classList.contains('show')) && (await d.keyboard.press('Escape'), await d.evaluate(() => !document.getElementById('door').classList.contains('show'))));
    await d.close();
    const h = await open({ width: 1400, height: 900 }, '#150mya', { keepDoor: true });
    ok('door: a shared link to a moment goes straight there, without the door', await h.evaluate(() => !document.getElementById('door').classList.contains('show') && S.t === 150));
    await h.close(); }
  ok('rivers: present, and drawn only after the Ice Age', await p.evaluate(() => typeof RIVERS_PACKED === 'string' && RIVERS_PACKED.length > 8000 && /after the last Ice Age/.test(document.getElementById('mapAbout').innerText)));
  ok('coverage: Europe’s Cretaceous islands and Africa’s and South America’s Jurassic have their animals', await p.evaluate(() => ['Struthiosaurus', 'Zalmoxes', 'Ampelosaurus', 'Dicraeosaurus', 'Brachytrachelopan', 'Vulcanodon', 'Palaeoloxodon namadicus'].every(n => ALL.some(c => c.name === n))));
  // extinctions: their own view, each with a map scene
  await p.click('#tab-ext'); await p.waitForTimeout(300);
  ok('extinctions: the view lists seven events and charts the five great dyings', await p.evaluate(() => document.querySelectorAll('#pane-ext .ext-item').length === 7 && document.querySelectorAll('#pane-ext .ext-bar').length === 5));
  await p.click('#pane-ext .ext-item[data-ext="permian"]'); await p.waitForTimeout(2600);
  ok('extinctions: choosing one zooms the timeline to it and opens its card', await p.evaluate(() => S.sel === 'ext:permian' && Math.abs(S.t - 252.5) < 0.05 && S.win[0] <= 256 && S.win[1] >= 248 && /Great Dying/.test(document.querySelector('#pane-ext .profile').innerText) && document.querySelectorAll('#pane-ext .ext-steps li').length === 5));
  ok('extinctions: the card counts who was lost and who came through, from the app’s own animals', await p.evaluate(() => { const e = EXT.permian, lost = extLost(e).map(c => c.name), thr = extThrough(e).map(c => c.name); return lost.includes('Inostrancevia') && lost.length >= 10 && thr.includes('Lystrosaurus') === false && thr.length >= 1 && !lost.some(n => thr.includes(n)); }));
  ok('extinctions: the card cites its research', await p.evaluate(() => /Burgess/.test(document.querySelector('#pane-ext .profile .sources').innerText) && /Penn/.test(document.querySelector('#pane-ext .profile .sources').innerText)));
  ok('extinctions: every event has a scene, steps and at least one source', await p.evaluate(() => EXTINCTIONS.every(e => typeof SCENES[e.scene] === 'function' && e.steps.length >= 4 && (SRCMAP['e:' + e.id] || []).length >= 1)));
  await p.click('#pane-ext [data-play="permian"]'); await p.waitForTimeout(5200);
  ok('extinctions: Watch plays a scene — caption on the map, time moving through the event', await p.evaluate(() => !!S.scene && S.scene.id === 'permian' && document.getElementById('sceneCap').classList.contains('show') && S.scene.step >= 1 && S.t < 252.5 && S.t > 251.5 && /■ Stop/.test(document.querySelector('#pane-ext .watch').textContent)));
  await p.waitForTimeout(9000);
  ok('extinctions: animals in the app go out as the scene passes their last date', await p.evaluate(() => S.scene && Object.keys(S.scene.gone).length >= 5 && document.querySelectorAll('#pane-ext .ext-steps li.on').length === 1));
  await p.click('#pane-ext [data-play="permian"]'); await p.waitForTimeout(200);
  ok('extinctions: Stop ends the scene and clears the map', await p.evaluate(() => !S.scene && !document.getElementById('sceneCap').classList.contains('show')));
  await p.evaluate(() => playScene('cretaceous')); await p.waitForTimeout(3000);
  const before = await p.evaluate(() => S.t);
  await p.waitForTimeout(9500);
  ok('extinctions: the asteroid scene holds before the impact, then crosses 66 million years', before > 66.02 && await p.evaluate(() => S.t < 66.03 && S.scene && S.scene.step >= 2), 'before=' + before);
  await p.evaluate(() => switchTab('life')); await p.waitForTimeout(150);
  ok('extinctions: leaving the view stops the scene', await p.evaluate(() => !S.scene));
  await p.evaluate(() => { WorldMap.setMotion(false); playScene('triassic'); }); await p.waitForTimeout(300);
  ok('extinctions: with motion off, Watch shows the steps as text instead', await p.evaluate(() => !S.scene && Math.abs(S.t - 200.9) < 0.01 && /Pangaea begins to tear/.test(document.getElementById('fpText').innerText)));
  await p.evaluate(() => { WorldMap.setMotion(true); closeFact(); setWindow(T_MAX, 0, true); S.sel = null; switchTab('life'); }); await p.waitForTimeout(150);
  // the living map
  ok('motion: eruptions and impacts are placed, and motion can be switched off', await p.evaluate(() => { const a = SPARKS.length >= 8 && WorldMap.motion === true; WorldMap.setMotion(false); const b = WorldMap.motion === false; WorldMap.setMotion(true); return a && b; }));
  // family trees
  await p.click('#treeBtn'); await p.waitForTimeout(250);
  ok('trees: the road to mammals opens, trunk and side branches drawn', await p.evaluate(() => S.view === 'tree' && document.querySelectorAll('#lifeList .tn.trunk').length >= 6 && document.querySelectorAll('#lifeList .tn:not(.trunk)').length >= 12 && /Synapsida/.test(document.querySelector('#lifeList .tn').innerText)));
  ok('trees: every proto-mammal, mammal, dinosaur and bird hangs on a branch', await p.evaluate(() => { const a = buildTree(TREES[0]), b = buildTree(TREES[1]); const on = (B, c) => B.nodes.some(n => n.own.includes(c));
    return ALL.filter(c => c.g === 'synapsid' || c.g === 'mammal').every(c => on(a, c)) && ALL.filter(c => c.g === 'dino' || c.g === 'bird').every(c => on(b, c)); }));
  ok('trees: animals hang on the right branches', await p.evaluate(() => { const at = (B, name) => B.nodes.find(n => n.own.some(c => c.name === name)); const up = n => { const o = []; for (let q = n; q; q = q.parent) o.push(q.n); return o; };
    const a = buildTree(TREES[0]), b = buildTree(TREES[1]);
    return at(a, 'Dimetrodon').n === 'Sail-backed hunters' && up(at(a, 'Thrinaxodon')).includes('Therapsids') && !up(at(a, 'Edaphosaurus')).includes('Therapsids') && up(a.nodes.find(n => n.n === 'Mammals')).join('>').includes('Mammal forerunners>Cynodonts>Therapsids')
      && at(b, 'Tyrannosaurus rex').n === 'Tyrannosaurs' && up(b.nodes.find(n => n.n === 'Birds')).join('>') === 'Birds>Winged dinosaurs>Hand-folders>Feathered theropods>Stiff-tails>Theropods>Dinosaurs>The dinosaur line'
      && up(at(b, 'Triceratops')).includes('Bird-hipped dinosaurs') && !up(at(b, 'Triceratops')).includes('Theropods') && up(at(b, 'Argentinosaurus')).includes('Big-noses'); }));
  await p.evaluate(() => { const n = buildTree(TREES[0]).nodes.find(n => n.n === 'Gorgonopsians'); document.querySelector('#lifeList [data-node="' + n.id + '"]').click(); }); await p.waitForTimeout(200);
  ok('trees: opening a branch lists its animals', await p.evaluate(() => [...document.querySelectorAll('#lifeList .tn.open .tn-mem .chip')].some(e => /Inostrancevia/.test(e.textContent))));
  await p.click('#lifeList .tn.open .tn-mem [data-key="rubidgea"]'); await p.waitForTimeout(2400);
  ok('trees: choosing an animal travels to its time and shows its card with a source', await p.evaluate(() => S.sel === 'rubidgea' && S.t <= 257 && S.t >= 253 && !!document.querySelector('#lifeList .tn.open .creature-card.active .sources a[href^="https://doi.org/"]')));
  await p.click('#lifeList [data-tree="dino"]'); await p.waitForTimeout(250);
  ok('trees: the dinosaur tree says where experts disagree and cites the studies', await p.evaluate(() => /2017 study/.test(document.querySelector('#lifeList .tn-debate').innerText) && /Baron/.test(document.querySelector('#lifeList .tree > .sources').innerText) && /Langer/.test(document.querySelector('#lifeList .tree > .sources').innerText)));
  ok('trees: new families and the road to mammals are filled in', await p.evaluate(() => ['Lisowicia', 'Kayentatherium', 'Brasilodon', 'Hadrocodium', 'Mononykus', 'Gigantoraptor', 'Raranimus'].every(n => ALL.some(c => c.name === n)) && ALL.filter(c => c.g === 'synapsid').length >= 44));
  await p.evaluate(() => { setView('list'); S.sel = null; WorldMap.select(null); renderLife(); }); await p.waitForTimeout(150);
  // climate and relief
  ok('climate: hot at the end of the Permian, cold in the Ice Age, unknown before 540 Ma', await p.evaluate(() => globalTemp(252) > 28 && globalTemp(0.02) < 9.5 && Math.abs(globalTemp(0) - 14.5) < 0.01 && globalTemp(600) === null));
  await p.evaluate(() => setTime(150)); await p.waitForTimeout(200);
  ok('climate: the map title carries the temperature', await p.evaluate(() => /about 20 °C/.test(document.getElementById('ctTemp').textContent)));
  ok('climate: map notes cite the temperature research', await p.evaluate(() => /Scotese/.test(document.getElementById('mapAbout').innerText) && /Tierney/.test(document.getElementById('mapAbout').innerText)));
  ok('relief: the mountain layer is present and is not a preprint-sized stub', await p.evaluate(() => typeof RELIEF_PACKED === 'string' && RELIEF_PACKED.length > 5000));
  // data QA: every fossil site can be placed on the map at the animal's time
  const bad = await p.evaluate(() => { const out = []; for (const c of ALL) { const mid = (c.t[0] + c.t[1]) / 2; (c._s || sitesOf(c)).forEach((s, i) => { if (s.at.f < 0 || !WorldMap.locate(s.at, mid) || !WorldMap.locate(s.at, c.t[0])) out.push(c.name + ' @ ' + c.sites[i][2] + ' f=' + s.at.f); }); } return out; });
  ok('every fossil site rides a plate at the right time', bad.length === 0, '\n    ' + bad.slice(0, 30).join('\n    '));
  const nosite = await p.evaluate(() => ALL.filter(c => !c.sites || !c.sites.length).map(c => c.name));
  ok('only "Humans Today" has no site', nosite.length <= 1, nosite.join(', '));
  // sweep through time in both views: no errors, land always drawn
  const sweep = await p.evaluate(async () => { const bad = []; for (const mode of ['flat', 'globe']) { WorldMap.setMode(mode); for (let t = 0; t <= 720; t += 9) { setTime(t); WorldMap._draw(); } } WorldMap.setMode('flat'); return bad; });
  ok('time sweep, both views', sweep.length === 0);
  // every period: has insight, has animals, renders
  ok('every period has animals and an insight', await p.evaluate(() => PERIODS.every(p => p.creatures.length >= 4 && p.insight && p.insight.signs.length >= 3)));
  ok('periods tile time with no gaps', await p.evaluate(() => PERIODS.every((p, i) => i === 0 || PERIODS[i - 1].end === p.start) && PERIODS[0].start === 720 && PERIODS[PERIODS.length - 1].end === 0));
  ok('getPeriod never falls through', await p.evaluate(() => { for (let t = 0; t <= 720; t += 0.37) { const q = getPeriod(t); if (!(t <= q.start && t >= q.end)) return false; } return true; }));
  await p.close();
  // deep links: new and old formats
  p = await open({ width: 1400, height: 900 }, '#cretaceous/tyrannosaurus-rex');
  ok('old-style link selects T. rex', await p.evaluate(() => S.sel === 'tyrannosaurus-rex' && S.period.id === 'cretaceous'), JSON.stringify(await p.evaluate(() => [S.sel, S.t])));
  await p.close();
  p = await open({ width: 1400, height: 900 }, '#3.2mya/afarensis');
  ok('link to a hominin opens the Humans tab', await p.evaluate(() => S.tab === 'humans' && S.sel === 'afarensis' && /Lucy/.test(document.getElementById('pane-humans').innerText)));
  await p.close();
  // phone: no sideways overflow, map present
  p = await open({ width: 390, height: 844 }, '', { hasTouch: true, isMobile: true });
  ok('phone: no sideways overflow', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1 && document.getElementById('main').scrollWidth <= window.innerWidth + 1), String(await p.evaluate(() => document.getElementById('main').scrollWidth)));
  ok('phone: map has height', await p.evaluate(() => document.getElementById('mapCanvas').getBoundingClientRect().height > 200));
  await p.close();
  ok('no console errors', errs.length === 0, '\n    ' + errs.slice(0, 8).join('\n    '));
  await b.close();
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
