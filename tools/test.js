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
  ok('wheel zooms back out to all time', await p.evaluate(() => S.win[0] === T_MAX && T_MAX === 4567 && S.win[1] === 0), JSON.stringify(await p.evaluate(() => S.win)));
  // brush: drag the left handle inward
  await p.click('#tlPresets .chip:nth-child(1)'); await p.waitForTimeout(150);
  const ov = await p.locator('#tlOverview').boundingBox();
  await p.mouse.move(ov.x + 2, ov.y + 6); await p.mouse.down(); await p.mouse.move(ov.x + ov.width * 0.5, ov.y + 6, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(200);
  ok('brush handle zooms', await p.evaluate(() => S.win[0] < 300 && S.win[0] > 150 && S.win[1] === 0), JSON.stringify(await p.evaluate(() => S.win)));
  await p.click('#tlPresets .chip:nth-child(1)');
  // slider
  await p.evaluate(() => { const s = document.getElementById('timeSlider'); s.value = Math.round(storyPos(68.3) * (+s.max / 1000)); s.dispatchEvent(new Event('input')); });
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
  ok('every period from 1.8 billion years on has a food web (before that, life is known only as microbes and traces)', await p.evaluate(() => PERIODS.every(q => q.start > 1800 || (FOODWEBS[q.id] && Object.keys(FOODWEBS[q.id].nodes).length >= 4))));
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
  ok('sea level: about -125 m at the last glacial peak, 0 today; the last interglacial near today’s level, MIS 11 above it; nothing before 3.6 Ma', await p.evaluate(() => WorldMap.seaLevel(0.021) <= -120 && WorldMap.seaLevel(0) === 0 && WorldMap.seaLevel(5) === 0 && WorldMap.seaLevel(0.121) >= -3 && WorldMap.seaLevel(0.402) > 5));
  ok('sea level: published records all the way back — the MIS 12 lowstand (430 ka) below -110 m, glacials of 1.2 Ma shallower, the warm Pliocene above today', await p.evaluate(() => WorldMap.seaLevel(0.43) <= -110 && [1.15, 1.2, 1.25].some(t => WorldMap.seaLevel(t) < -30) && Math.min(...[1.1, 1.15, 1.2, 1.25, 1.3].map(t => WorldMap.seaLevel(t))) > -100 && Math.max(...Array.from({ length: 60 }, (_, i) => WorldMap.seaLevel(3.0 + i * 0.01))) > 5));
  ok('ice: PaleoMIST over Chicago at the last glacial peak and in MIS 6 (Batchelor); gone in the warm Eemian; London never under it', await p.evaluate(() => WorldMap.underIce(41.9, -87.6, 0.02) > 0.9 && WorldMap.underIce(41.9, -87.6, 0.14) > 0.9 && WorldMap.underIce(41.9, -87.6, 0.121) === 0 && [0.02, 0.14, 0.45].every(t => WorldMap.underIce(51.5, -0.1, t) === 0) && WorldMap.ice(0.02)[0].src === 'gowan2021'));
  ok('ice: Greenland’s ice from 2.7 Ma to today; the last of the Laurentide over Quebec 7,500 years ago, gone by 5,000; unmapped glacials get a paler stand-in, marked so', await p.evaluate(() => WorldMap.underIce(72, -40, 0) > 0.9 && WorldMap.underIce(72, -40, 1) > 0.9 && WorldMap.underIce(72, -40, 3.2) === 0 && WorldMap.underIce(55, -75, 0.0075) > 0.9 && WorldMap.underIce(55, -75, 0.005) === 0 && WorldMap.ice(1.2).some(x => x.stand) && WorldMap.ice(0.14).some(x => x.key === 'mis6' && !x.stand)));
  ok('rivers: today’s rivers drawn back to 3 million years ago, lakes only after the Ice Age', await p.evaluate(() => WorldMap._rivers(2.5).rivers === 1 && WorldMap._rivers(0.05).lakes === 0 && WorldMap._rivers(0.005).lakes === 1 && WorldMap._rivers(4).rivers === 0));
  const shelfRv = await p.evaluate(() => { const near = (t, lat, lon, km) => (WorldMap.shelfRivers(t) || []).flat(2).some(pt => Math.hypot(pt[1] - lat, (pt[0] - lon) * Math.cos(lat * Math.PI / 180)) * 111 < km); return { lgmChannel: near(0.02, 49.9, -3.5, 80), lgmGulf: near(0.02, 27, 52, 80), lgmSunda: near(0.02, 3, 107.5, 150), dover630: near(0.63, 51, 1.5, 25), dover20: near(0.02, 51, 1.5, 40), eemian: WorldMap.shelfRivers(0.121) }; });
  ok('rivers on the dry sea floor: at the last glacial peak the Channel River, the Ur-Schatt and Sundaland’s rivers; none in the Eemian; nothing through the Strait of Dover before it was cut', shelfRv.lgmChannel && shelfRv.lgmGulf && shelfRv.lgmSunda && shelfRv.dover20 && !shelfRv.dover630 && !shelfRv.eemian, JSON.stringify(shelfRv));
  ok('ice, rivers and sea level cite their papers in “How this map is made”', await p.evaluate(() => ['batchelor2019', 'gowan2021'].every(k => (SRCMAP['m:ice'] || []).includes(k)) && ['toucanne2009', 'gupta2017', 'voris2000'].every(k => (SRCMAP['m:rivers'] || []).includes(k)) && ['spratt2016', 'berends2021', 'lambeck2014'].every(k => (SRCMAP['m:sealevel'] || []).includes(k)) && /Channel River/.test(document.getElementById('mapAbout').textContent)));
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
  ok('finds: before modern science grows — 15+ finds from before 1800, and every one from 1500–1800 cites a source', await p.evaluate(() => FINDS.filter(f => f.year < 1800).length >= 15 && FINDS.filter(f => f.year >= 1500 && f.year < 1800).every(f => (SRCMAP['x:' + f.id] || []).length > 0)));
  ok('finds: the fairy-loaf sea urchins cite the archaeology and folklore papers, and take the map to the Chalk sea', await p.evaluate(() => { selectFind('echinoids'); return ['mcnamara2007', 'oakley1965b'].every(k => (SRCMAP['x:echinoids'] || []).includes(k)) && /thunderstones/.test(FIND.echinoids.story); }));
  await p.waitForTimeout(2200);
  ok('finds: …and the map moves to 80 Ma, where the urchins lived', await p.evaluate(() => Math.abs(S.t - 80) < 1));
  ok('finds: “What this atlas borrows” lists the drawings and maps it follows, each linked to its story or source', await p.evaluate(() => { const rows = [...document.querySelectorAll('#pane-finds .insp-row')]; return rows.length === INSPIRATIONS.length && rows.length >= 9 && rows.every(r => r.dataset.find || r.querySelector('.sources')) && /field-book look/.test(document.querySelector('#pane-finds .insp').innerText); }));
  await p.evaluate(() => selectFind('buckland')); await p.waitForTimeout(2600);
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
  ok('you: the line runs unbroken from the birth of the Earth to today', await p.evaluate(() => YOU_LINE[0].from === 4567 && YOU_LINE[YOU_LINE.length - 1].to === 0 && YOU_LINE.every((y, i) => !i || YOU_LINE[i - 1].to === y.from) && [700, 500, 300, 100, 10, 1, 0].every(t => youAt(t) && t <= youAt(t).from && t >= youAt(t).to)));
  await p.click('#youBar'); await p.waitForTimeout(500);
  ok('you: opening it tells the story and says the animal shown is a cousin', await p.evaluate(() => /Your ancestor/.test(document.getElementById('fpText').innerText) && /close cousin/.test(document.getElementById('fpText').innerText) && S.sel === 'thrinaxodon'));
  await p.evaluate(() => closeFact());
  // journeys
  await p.click('#journeyBtn'); await p.waitForTimeout(150);
  ok('journeys: the menu offers four', await p.evaluate(() => document.getElementById('journeyMenu').classList.contains('show') && document.querySelectorAll('#journeyMenu [data-journey]').length === 4));
  await p.click('#journeyMenu [data-journey="drift"]'); await p.waitForTimeout(2600);
  ok('journeys: the first stop is shown and time has travelled there', await p.evaluate(() => /1 \/ 11/.test(document.querySelector('#journey .jr-n').textContent) && Math.abs(S.t - 1800) < 1 && document.getElementById('journey').classList.contains('show')));
  await p.click('#journey [data-jr="next"]'); await p.waitForTimeout(2600);
  ok('journeys: Next moves on through time', await p.evaluate(() => /2 \/ 11/.test(document.querySelector('#journey .jr-n').textContent) && Math.abs(S.t - 1000) < 1 && /Rodinia/.test(document.querySelector('#journey .jr-head').textContent)));
  await p.click('#journey [data-jr="end"]'); await p.waitForTimeout(150);
  ok('journeys: closing ends it', await p.evaluate(() => !S.jr && !document.getElementById('journey').classList.contains('show')));
  ok('journeys: each is built from the site’s own data', await p.evaluate(() => { const n = id => JOURNEYS.find(j => j.id === id).stops().length; return n('you') === YOU_LINE.length && n('extinctions') === EXTINCTIONS.length && n('finds') === 10 && n('drift') === 11; }));
  await p.evaluate(() => startJourney('you')); await p.waitForTimeout(2600);
  for (let i = 0; i < 13; i++) { await p.evaluate(() => stepJourney(1)); await p.waitForTimeout(120); }
  await p.waitForTimeout(2600);
  ok('journeys: “Your story” arrives at the cynodont that came through the Great Dying', await p.evaluate(() => Math.abs(S.t - 250) < 1 && S.sel === 'thrinaxodon' && /worst extinction/.test(document.querySelector('#journey .jr-text').textContent)));
  await p.evaluate(() => { endJourney(); S.sel = null; WorldMap.select(null); switchTab('life'); }); await p.waitForTimeout(150);
  // history: empires, kingdoms and beliefs of the last 5,500 years
  await p.evaluate(() => { setWindow(T_MAX, 0, true); switchTab('humans'); }); await p.waitForTimeout(250);
  ok('history: the Humans tab lists every empire and belief, beliefs grouped in families', await p.evaluate(() => document.querySelectorAll('#pane-humans [data-emp].hist-item').length === EMPIRES.length && document.querySelectorAll('#pane-humans [data-bel].hist-item').length === BELIEFS.length && document.querySelectorAll('#pane-humans .fam-h:not(.area-h)').length === BELIEF_FAMILIES.length));
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
  ok('history: its routes reach only the places it had arrived at by that year', await p.evaluate(() => { const y = yearAt(S.t), r = histRoutes().filter(x => !x.id && !x.key), shown = r.filter(x => S.t <= x.from).length; return r.length === 6 && shown === BEL.buddhism.spread.filter(sp => sp[0] <= y).length && shown === 5 && !!placeCache.bbuddhism0; }));
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
  ok('trade and works: all are listed, with layer switches', await p.evaluate(() => document.querySelectorAll('#pane-humans [data-rt].hist-item').length === TRADE.length && TRADE.length >= 11 && document.querySelectorAll('#pane-humans [data-wk].hist-item').length === WORKS.length && WORKS.length >= 25 && document.querySelectorAll('#pane-humans [data-hl]').length === 5));
  await p.evaluate(() => { S.sel = null; WorldMap.select(null); setTime(tOfYear(1300)); renderHumans(); updatePlaces(); }); await p.waitForTimeout(400);
  ok('trade: in 1300 the Silk Roads, the monsoon routes and the Sahara caravans are running; the galleons are not yet', await p.evaluate(() => { const on = [...document.querySelectorAll('#pane-humans [data-rt].hist-item.now')].map(e => e.dataset.rt), ln = histRoutes().filter(l => S.t <= l.from && S.t >= l.to).map(l => l.id); return ['silkroad', 'monsoon', 'sahara'].every(id => on.includes(id) && ln.includes(id)) && !on.includes('galleon') && !ln.includes('galleon') && !!placeCache.rsilkroad; }));
  await p.click('#pane-humans [data-hl="rt"]'); await p.waitForTimeout(250);
  ok('layers: switching trade routes off clears their lines and pins', await p.evaluate(() => histRoutes().filter(l => l.id).length === 0 && !histPlaces().some(pl => pl.key.startsWith('rt:')) && document.querySelector('#pane-humans [data-hl="rt"]').getAttribute('aria-pressed') === 'false'));
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
  ok('events: tapping the glow over India says it is volcanoes, not the asteroid', await p.evaluate(() => /Deccan Traps/.test(document.getElementById('fpText').innerText) && /not the asteroid/.test(document.getElementById('fpText').innerText) && /one-two punch/.test(document.getElementById('fpText').innerText)));
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
  // more family trees, linked to each other and to the cards
  ok('trees: four trees, and every fish, amphibian, reptile, sea reptile, croc and pterosaur hangs on a branch', await p.evaluate(() => TREES.length >= 4 && ALL.filter(c => ['fish', 'amphib', 'reptile', 'marine', 'croc', 'ptero'].includes(c.g)).every(c => TREES.some(T => buildTree(T).nodes.some(n => n.own.includes(c))))));
  ok('trees: pterosaurs, ichthyosaurs and mosasaurs are not on the dinosaur branch', await p.evaluate(() => { const up = (T, name) => { const B = buildTree(TREES.find(t => t.id === T)); let n = B.nodes.find(n => n.own.some(c => c.name === name)); const o = []; for (; n; n = n.parent) o.push(n.n); return o; };
    const q = up('reptile', 'Quetzalcoatlus'), ic = up('reptile', 'Shonisaurus'), mo = up('reptile', 'Mosasaurus');
    return q[0] === 'Pterosaurs' && q.includes('The bird line') && !q.some(x => /Dinosaur/.test(x)) && ic[0] === 'Reptiles that went back to sea' && mo[0] === 'Lizards and snakes'; }));
  ok('trees: the fish tree runs jaws → bone → lobe-fins → limbs → the land egg, and links on to the mammal and reptile trees', await p.evaluate(() => { const B = buildTree(TREES.find(t => t.id === 'fish')), trunk = []; for (let n = B.nodes[0]; n; n = (n.kids || []).find(k => k.trunk)) trunk.push(n.n);
    return trunk.join('>') === 'Animals with a backbone line>Fishes with jaws>Bony fishes>Lobe-finned fishes>Fishes with limbs>Four-legged animals>Egg-layers on land>The reptile line' && B.nodes.some(n => n.link === 'synapsid'); }));
  await p.evaluate(() => { switchTab('life'); setView('list'); S.q = 'tiktaalik'; renderLife(); }); await p.waitForTimeout(200);
  await p.evaluate(() => select('tiktaalik', { keep: true })); await p.waitForTimeout(1500);
  await p.click('#lifeList .creature-card.active [data-tree-go]'); await p.waitForTimeout(900);
  ok('trees: a card’s “Family tree” button opens its tree at its branch, with the card shown', await p.evaluate(() => S.view === 'tree' && S.tree === 'fish' && S.sel === 'tiktaalik' && /Fishes with limbs/.test(document.querySelector('#lifeList .tn.open').innerText) && !!document.querySelector('#lifeList .tn.open .creature-card.active')));
  await p.evaluate(() => { setView('list'); S.tree = null; S.treeOpen = {}; S.q = ''; $('q').value = ''; S.sel = null; WorldMap.select(null); renderLife(); }); await p.waitForTimeout(150);
  // Sumer: the first cities on the river as it ran then; the globe button; deeper zoom
  ok('globe: the button switches to the globe and back to the flat map', await p.evaluate(() => { const a = WorldMap.mode; document.getElementById('mapGlobe').click(); const b = WorldMap.mode; document.getElementById('mapGlobe').click(); const c = WorldMap.mode; return a === 'flat' && b === 'globe' && c === 'flat'; }));
  ok('zoom: the flat map zooms in to city scale', await p.evaluate(() => { WorldMap.resetView(); for (let i = 0; i < 8; i++) WorldMap.zoomBy(2); const z = WorldMap.zoom; WorldMap.resetView(); return z >= 30; }));
  await p.evaluate(() => { switchTab('humans'); }); await p.waitForTimeout(200);
  await p.click('#pane-humans [data-old="ur-city"]'); await p.waitForTimeout(3200);
  ok('Sumer: Ur opens in the third millennium BCE, with the Euphrates as it ran then, the watered fields, and their sources', await p.evaluate(() => { const y = yearAt(S.t), t = document.querySelector('#pane-humans .profile').innerText;
    return S.sel === 'old:ur-city' && y > -2600 && y < -2000 && /river moved away/.test(t) && /Jotheri/.test(t) && /Lambeck/.test(t)
      && histRoutes().some(l => l.key === 'old:euphrates-old' && S.t <= l.from && S.t >= l.to) && OLD_REGIONS.length >= 1 && ['eridu', 'uruk', 'ur-city', 'nippur'].every(id => !!placeCache['o' + id]); }));
  ok('rivers: today’s rivers are stored to about a kilometre, not ten', await p.evaluate(() => typeof RIVERS_PACKED === 'string' && RIVERS_PACKED.length > 30000));
  await p.evaluate(() => { S.sel = null; WorldMap.select(null); setWindow(T_MAX, 0, true); setTime(150); switchTab('life'); }); await p.waitForTimeout(200);
  // close-up detail: terrain tiles, detailed coast tiles, quick panning; the Nile and the Indus
  { const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
    const hill = await p.evaluate(() => typeof HILL_HAVE === 'object' ? Object.fromEntries(Object.entries(HILL_HAVE).map(([z, v]) => [z, v.split(',')])) : null);
    ok('terrain: the tile index matches the tiles on disk, at three levels of detail', !!hill && Object.keys(hill).length === 3 && Object.entries(hill).every(([z, ks]) => ks.every(k => fs.existsSync(path.join(root, 'tiles/relief/z' + z + '/' + k + '.jpg')))) && hill[2].length > 100);
    const coast = await p.evaluate(() => typeof COAST_HAVE === 'string' ? COAST_HAVE.split(',') : null);
    ok('coast: the detailed-coast index matches the tiles on disk', !!coast && coast.length > 400 && coast.every(k => fs.existsSync(path.join(root, 'tiles/coast/' + k + '.txt')))); }
  await p.evaluate(() => { switchTab('life'); setWindow(0.0062, 0, true); setTime(tOfYear(100)); WorldMap.resetView(); }); await p.waitForTimeout(1500);
  ok('terrain: the light-and-shadow tiles load and are drawn over the land in recorded history', await p.evaluate(() => new Promise(res => { let n = 0; const check = () => { const k = WorldMap._hill(); if (k > 0 || ++n > 50) res(k > 0); else setTimeout(check, 100); }; check(); })));
  ok('quick pan: panning the zoomed flat map moves the last picture, then redraws properly once', await p.evaluate(async () => { const bb = document.getElementById('mapCanvas').getBoundingClientRect(); WorldMap.zoomAt(bb.width * 0.5, bb.height * 0.4, 6); await new Promise(r => setTimeout(r, 500)); const d0 = WorldMap._fullDraws(), a = performance.now(); for (let i = 0; i < 20; i++) { WorldMap.panBy(5, 2); await new Promise(r => requestAnimationFrame(r)); } const el = performance.now() - a, d1 = WorldMap._fullDraws(); await new Promise(r => setTimeout(r, 500)); const d2 = WorldMap._fullDraws(); WorldMap.resetView(); return el < 1500 && d1 - d0 <= 3 && d2 > d1; }));
  await p.evaluate(() => { setWindow(T_MAX, 0, true); switchTab('humans'); S.histOff = {}; renderHumans(); }); await p.waitForTimeout(300);
  ok('first cities: grouped into Sumer, the Nile and the Indus', await p.evaluate(() => /Sumer/.test(document.getElementById('pane-humans').innerText) && /lost branches/.test(document.getElementById('pane-humans').innerText) && /river that dried up/.test(document.getElementById('pane-humans').innerText) && OLD.filter(o => o.area === 'nile').length >= 7 && OLD.filter(o => o.area === 'indus').length >= 7));
  await p.click('#pane-humans [data-old="ghaggar"]'); await p.waitForTimeout(3200);
  ok('Indus: the Ghaggar–Hakra opens in Indus times, drawn as a sketch, citing the river studies', await p.evaluate(() => { const t = document.querySelector('#pane-humans .profile').innerText; return S.sel === 'old:ghaggar' && yearAt(S.t) > -3000 && yearAt(S.t) < -1600 && /Giosan/.test(t) && /Sarasvati/.test(t) && histRoutes().some(l => l.key === 'old:ghaggar' && S.t <= l.from && S.t >= l.to); }));
  await p.click('#pane-humans [data-old="canopic"]'); await p.waitForTimeout(3200);
  ok('Nile: the lost Canopic branch is drawn, and its card cites the delta studies', await p.evaluate(() => S.sel === 'old:canopic' && /Stanley/.test(document.querySelector('#pane-humans .profile').innerText) && histRoutes().some(l => l.key === 'old:canopic' && S.t <= l.from && S.t >= l.to)));
  await p.evaluate(() => { S.sel = null; WorldMap.select(null); setWindow(T_MAX, 0, true); setTime(150); switchTab('life'); }); await p.waitForTimeout(200);
  // no land missing from today's outline (a band of Siberia and Scandinavia was, until Nov 2026)
  ok('land: northern Siberia and Scandinavia are covered by today’s land in every era since 410 million years ago', await p.evaluate(() => [[67, 90], [68, 100], [66, 120], [66, 80], [66, 60], [67, 28], [68, 20], [69, 125], [65, 105]].every(([la, lo]) => WorldMap._cover(la, lo).split(' ').some(x => /\.\.-0\.1\]/.test(x)))));
  ok('lakes: the big lakes are drawn — all five Great Lakes, Victoria and Baikal among them', await p.evaluate(() => {
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', lut = new Int8Array(128); for (let i = 0; i < 64; i++) lut[A.charCodeAt(i)] = i;
    const d = RIVERS_PACKED; let pos = 0; const u = () => { let r = 0, sh = 0, c; do { c = lut[d.charCodeAt(pos++)]; r += (c & 31) * Math.pow(2, sh); sh += 5; } while (c & 32); return r; }; const z = () => { const v = u(); return v % 2 ? -(v + 1) / 2 : v / 2; };
    const pts = () => { const n = u(), o = []; let x = 0, y = 0; for (let i = 0; i < n; i++) { x += z(); y += z(); o.push([x / 100, y / 100]); } return o; };
    const nl = u(); for (let i = 0; i < nl; i++) { u(); pts(); } const nk = u(), lakes = []; for (let i = 0; i < nk; i++) { const r = pts(); r.push(r[0]); lakes.push({ type: 'Polygon', coordinates: [d3.geoArea({ type: 'Polygon', coordinates: [r] }) > 2 * Math.PI ? r.slice().reverse() : r] }); }
    const wet = (lon, lat) => lakes.some(g => d3.geoContains(g, [lon, lat]));
    return nk >= 100 && [[-87.5, 47.6], [-87.0, 43.5], [-82.4, 44.8], [-81.2, 42.2], [-77.8, 43.6], [33, -1], [108, 53.5]].every(([lo, la]) => wet(lo, la)); }));
  // stories: the Earth being made (Geology tab)
  await p.evaluate(() => { switchTab('geo'); }); await p.waitForTimeout(200);
  ok('stories: the Geology tab offers “How the Great Lakes were made”, with its sources', await p.evaluate(() => /How the Great Lakes were made/.test(document.getElementById('pane-geo').innerText) && (SRCMAP['s:greatlakes'] || []).length >= 4));
  await p.click('#pane-geo [data-story="greatlakes"]'); await p.waitForTimeout(800);
  ok('stories: Watch starts at the height of the Ice Age, hides the animals, and draws its own ice', await p.evaluate(() => !!S.story && S.t > 0.02 && document.getElementById('sceneCap').classList.contains('show') && /26,000 years ago/.test(document.getElementById('sceneCap').innerText) && WorldMap.motion));
  await p.waitForTimeout(13000);
  ok('stories: halfway through, the ice has melted back and time has moved on to the meltwater lakes', await p.evaluate(() => { const e = iceEdge(STORY_BY.greatlakes.margin, S.t * 1000), at = lo => e.find(x => x[0] === lo)[1]; const m = STORY_BY.greatlakes.margin, start = iceEdge(m, 26).find(x => x[0] === -84)[1], end = iceEdge(m, 8).find(x => x[0] === -84)[1]; return S.story && S.t < 0.0145 && S.t > 0.0105 && at(-84) > start + 4 && start < 40 && end > 55 && S.story.step >= 3; }));
  await p.click('#sceneCap [data-story]'); await p.waitForTimeout(200);
  ok('stories: Stop ends it and gives the map back', await p.evaluate(() => !S.story && !document.getElementById('sceneCap').classList.contains('show')));
  await p.evaluate(() => { WorldMap.resetView(); setWindow(T_MAX, 0, true); setTime(150); switchTab('life'); }); await p.waitForTimeout(200);
  // more stories, and the camera
  ok('stories: seven of them, each with steps, evidence and at least three verified sources', await p.evaluate(() => STORIES.length >= 7 && STORIES.every(st => st.steps.length >= 6 && st.know && st.debate && st.onmap && (SRCMAP['s:' + st.id] || []).length >= 3 && typeof STORY_SCENES[st.id] === 'function')));
  ok('stories: the Moon is made in a giant impact, told as a model — the card says what is argued over and cites the papers it rests on', await p.evaluate(() => { const st = STORY_BY.moon, src = SRCMAP['s:moon'] || []; return /computer models/.test(st.blurb) && /argued over/.test(st.debate) && /4\.51/.test(st.debate) && /not to scale/.test(st.onmap) && ['canup2001', 'hartmann1975', 'wiechert2001', 'dickey1994', 'barboni2017', 'borg2011', 'wilde2001'].every(k => src.includes(k)); }));
  for (const [id, wait, test] of [['missoula', 10000, '() => S.t < 0.0185 && S.t > 0.0165 && WorldMap.fxOn'], ['snowball', 9000, '() => S.t < 700 && S.t > 661 && WorldMap.fxOn && snowIce(S.t) === 1'], ['moon', 8500, '() => S.t < 4520 && S.t > 4500 && S.win[0] <= 4567 && S.win[1] >= 4300 && S.win[0] - S.win[1] < 400 && WorldMap.fxOn && /Theia/.test(document.getElementById("sceneCap").innerText)'], ['himalaya', 9000, '() => S.t < 72 && S.t > 30 && !!S.story.india'], ['mediterranean', 14500, '() => S.t < 5.97 && S.t > 5.33'], ['hawaii', 11000, '() => S.t < 4 && S.t > 1 && !!S.story']]) {
    await p.evaluate(id => { switchTab('geo'); playStory(id); }, id); await p.waitForTimeout(wait);
    ok('stories: ' + id + ' plays — caption up, clock running through its own stretch of time', await p.evaluate(new Function('return (' + test + ')()')) && await p.evaluate(() => document.getElementById('sceneCap').classList.contains('show')));
    await p.evaluate(() => stopStory()); await p.waitForTimeout(150);
  }
  ok('stories: Hawaii hides today’s islands while it builds its own, and gives them back after', await p.evaluate(() => !S.story && WorldMap._cover(19.6, -155.5) !== ''));
  // the real shape: today's gravity shape (the geoid) on the globe
  const lumpy = () => p.evaluate(() => { const [a, b] = WorldMap._limb(); return b / a; });
  await p.evaluate(() => switchTab('geo')); await p.waitForTimeout(200);
  ok('geoid: the card starts folded, with a way to read more', await p.evaluate(() => !!document.querySelector('#pane-geo [data-geoid-open]') && !/GRACE/.test(document.getElementById('pane-geo').innerText)));
  await p.click('#pane-geo [data-geoid-open]'); await p.waitForTimeout(150);
  ok('geoid: the Geology tab explains the real shape — what it is, why it is drawn taller, how we know, what is argued over — with its sources', await p.evaluate(() => { const t = document.getElementById('pane-geo').innerText; return /The real shape of the Earth/i.test(t) && /10,000 times taller/.test(t) && /GRACE/.test(t) && /south of India/.test(t) && /Today only/.test(t) && ['pavlis2012', 'tapley2004', 'pal2023'].every(k => (SRCMAP['m:geoid'] || []).includes(k)); }));
  await p.click('#pane-geo [data-geoid]'); await p.waitForTimeout(900);
  ok('geoid: one tap turns to the globe, today, with the gravity shape showing and the animals stepping aside', await p.evaluate(() => WorldMap.mode === 'globe' && S.t === 0 && WorldMap.geoid && WorldMap._geoidShown() && WorldMap._markers().length === 0 && /Back to the round globe/.test(document.querySelector('#pane-geo [data-geoid]').textContent)));
  ok('geoid: the globe’s edge is lumpy — its farthest point more than 10% farther out than its nearest', await lumpy() > 1.1, String(await lumpy()));
  { const slide = v => p.evaluate(v => { const s = document.getElementById('geoidScale'); s.value = v; s.dispatchEvent(new Event('input', { bubbles: true })); }, v);
    await slide(0); await p.waitForTimeout(250); const real = await lumpy(), realTxt = await p.evaluate(() => WorldMap.geoidScale === 1 && /real size/.test(document.getElementById('geoidScaleV').textContent));
    await slide(1000); await p.waitForTimeout(250); const big = await lumpy(), bigOk = await p.evaluate(() => WorldMap.geoidScale === 20000);
    await slide(930); await p.waitForTimeout(250); const back = await p.evaluate(() => WorldMap.geoidScale);
    ok('geoid: the slider shrinks the bumps to real size — a round ball — and stretches them to 20,000×', real < 1.001 && realTxt && big > 1.2 && bigOk && back === 10000, [real, realTxt, big, bigOk, back].join(' ')); }
  ok('geoid: the deepest low south of India, the highest high over New Guinea, Iceland high and Hudson Bay low, as EGM2008 has them', await p.evaluate(() => WorldMap.geoidAt(78, 4) < -95 && WorldMap.geoidAt(144, -4) > 70 && WorldMap.geoidAt(-20, 64) > 50 && WorldMap.geoidAt(-85, 60) < -30 && GEOID.peak[0] < -106 && GEOID.peak[1] > 85));
  ok('geoid: a tap on the lumpy globe still finds the place under the finger (Sri Lanka)', await p.evaluate(() => { const s = WorldMap._screen(80.7, 7.8), q = s && WorldMap.pickPresent(s[0], s[1]); return !!q && Math.abs(q.lon - 80.7) < 0.3 && Math.abs(q.lat - 7.8) < 0.3; }));
  await p.evaluate(() => setTime(10)); await p.waitForTimeout(300);
  ok('geoid: today only — 10 million years ago the globe is round again and the animals are back', await p.evaluate(() => !WorldMap._geoidShown() && WorldMap._markers().length > 0) && await lumpy() < 1.01);
  await p.evaluate(() => setTime(0)); await p.waitForTimeout(300);
  await p.click('#pane-geo [data-geoid]'); await p.waitForTimeout(400);
  ok('geoid: off again, the globe is round', await p.evaluate(() => !WorldMap.geoid && !WorldMap._geoidShown()) && await lumpy() < 1.01);
  ok('geoid: “How this map is made” explains the real shape and cites EGM2008', await p.evaluate(() => /The real shape\./.test(document.getElementById('mapAbout').textContent) && !!document.querySelector('#mapAbout .sources a[href="https://doi.org/10.1029/2011jb008916"]')));
  await p.evaluate(() => WorldMap.setMode('flat'));
  await p.evaluate(() => { WorldMap.resetView(); setWindow(T_MAX, 0, true); setTime(150); switchTab('life'); }); await p.waitForTimeout(400);
  ok('camera: a flick keeps the zoomed map coasting after the finger lifts', await (async () => { await p.evaluate(() => WorldMap.zoomBy(4)); await p.waitForTimeout(400); const bb = await (await p.$('#mapCanvas')).boundingBox();
    const probe = () => p.evaluate(() => { const q = WorldMap.pickPresent(document.getElementById('mapCanvas').getBoundingClientRect().width / 2, 300); return q ? q.lat.toFixed(2) + ',' + q.lon.toFixed(2) : 'sea'; });
    await p.mouse.move(bb.x + 600, bb.y + 300); await p.mouse.down(); for (let i = 1; i <= 8; i++) { await p.mouse.move(bb.x + 600 - i * 25, bb.y + 300); await p.waitForTimeout(12); } await p.mouse.up();
    await p.waitForTimeout(40); const a = await probe(); await p.waitForTimeout(700); return a !== await probe(); })());
  ok('camera: a long jump on the zoomed map pulls back and swoops in', await p.evaluate(async () => { WorldMap.resetView(); WorldMap.zoomBy(4); noLook = 0; await new Promise(r => setTimeout(r, 300)); let min = 99; const t0 = performance.now(); select('giraffatitan', { keep: true }); while (performance.now() - t0 < 1600) { min = Math.min(min, WorldMap.zoom); await new Promise(r => requestAnimationFrame(r)); } const end = WorldMap.zoom; S.sel = null; WorldMap.select(null); WorldMap.resetView(); return min < 3 && Math.abs(end - 4) < 0.01; }));
  { const q = await open(null, '#0.0059mya', { ...require('playwright').devices['iPhone 13'] });
    await q.waitForTimeout(600);
    const box = await q.evaluate(() => { const c = document.getElementById('cartouche').getBoundingClientRect(), m = document.getElementById('mapArea').getBoundingClientRect(); return { h: c.height, w: c.width, mw: m.width, title: getComputedStyle(document.querySelector('#cartouche .ct-title')).display, text: document.getElementById('cartouche').innerText, note: document.getElementById('mapNote').getBoundingClientRect().width }; });
    ok('phone: the title box is one slim line with the date and temperature, and the map note is short', box.h < 30 && box.w < box.mw * 0.62 && box.title === 'none' && /YEARS AGO/.test(box.text) && /°C/.test(box.text) && box.note < box.mw * 0.6, JSON.stringify(box));
    await q.tap('#cartouche'); await q.waitForTimeout(200);
    ok('phone: tapping the title box opens it in full', await q.evaluate(() => document.getElementById('cartouche').classList.contains('open') && getComputedStyle(document.querySelector('#cartouche .ct-title')).display === 'block'));
    await q.close(); }
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
  // seas over the continents (Kocsis & Scotese 2021, carried on our plates)
  await p.evaluate(() => setTime(450)); await p.waitForFunction(() => WorldMap._sea().st === 'ready', null, { timeout: 10000 }); await p.waitForTimeout(150);
  const sea450 = await p.evaluate(() => WorldMap._sea());
  ok('seas: the maps unpack and trace into outlines at 450 Ma', sea450.M > 50 && sea450.L > 50, JSON.stringify(sea450));
  { const chk = await p.evaluate(() => WorldMap._seaCheck());
    ok('seas: on all 109 maps every outline closes, no plate’s outline reads as most of the globe, and traced areas match the pixels', chk.open === 0 && chk.badFam.length === 0 && chk.maps.length === 109 && chk.maps.every(m => m[1] > 0.9 && m[1] < 1.4 && (m[2] > 0.9 && m[2] < 1.4)), JSON.stringify({ open: chk.open, bad: chk.badFam.slice(0, 5), off: chk.maps.filter(m => !(m[1] > 0.9 && m[1] < 1.4 && m[2] > 0.9 && m[2] < 1.4)).slice(0, 5) })); }
  // (the globe faces the land: Pangaea alone fills about 70% of it, so the globe's limit is higher)
  { const swamp = await p.evaluate(() => { const out = []; for (const mode of ['flat', 'globe']) { WorldMap.setMode(mode); for (let t = 5; t <= 540; t += 5) { setTime(t); WorldMap._draw(); if (WorldMap._landFrac() > (mode === 'flat' ? 0.6 : 0.8)) out.push(mode + ' ' + t); } } WorldMap.setMode('flat'); setTime(450); return out; });
    ok('seas: no map from 540 Ma to today is swamped with land (flat and globe)', swamp.length === 0, swamp.join(', ')); }
  ok('seas: outlines wind the right way (traced area matches the pixels)', sea450.mArea / sea450.pxArea > 0.9 && sea450.mArea / sea450.pxArea < 1.4, JSON.stringify(sea450));
  ok('seas: about half the Ordovician continents under the sea, under a tenth in the Triassic; no maps before 540 Ma or in the Ice Age', await p.evaluate(() => { const a = WorldMap.seaShare(450), tr = WorldMap.seaShare(205); return a && a.pct > 35 && a.pct < 55 && tr.pct < 10 && WorldMap.seaShare(600) === null && WorldMap.seaShare(1) === null; }));
  ok('seas: Kansas under the seaway at 90 Ma, dry at 200 Ma', await p.evaluate(() => WorldMap.seaAt(39, -98.4, 90) === 'sea' && WorldMap.seaAt(39, -98.4, 200) === 'land' && WorldMap.seaAt(39, -98.4, 1) === null));
  await p.evaluate(() => setTime(90)); await p.waitForTimeout(200);
  const probe = await p.evaluate(() => { WorldMap._draw(); return [WorldMap._px(39, -98.4), WorldMap._px(-29, 25), WorldMap.seaAt(-29, 25, 90)]; });
  ok('seas: drawn as sea where the maps say sea (Kansas), as land where they say land (South Africa)', probe[0].land < 20 && probe[1].land > 235 && probe[2] === 'land', JSON.stringify(probe));
  ok('seas: the map title says how much of the continents was under the sea', await p.evaluate(() => { const s = WorldMap.seaShare(90); return new RegExp('sea over ' + Math.round(s.pct) + '% of the continents · today ' + Math.round(s.today) + '%').test(document.getElementById('ctSea').textContent) && s.high > s.pct; }));
  ok('seas: the map note names pale blue and the dotted coast', await p.evaluate(() => /Pale blue/.test(document.getElementById('mnLong').textContent) && /dotted/.test(document.getElementById('mnLong').textContent)));
  await p.evaluate(() => setTime(450)); await p.waitForTimeout(150);
  ok('seas: no dotted coast before 410 Ma (the land there is the model’s own blocks)', await p.evaluate(() => /Pale blue/.test(document.getElementById('mnLong').textContent) && !/dotted/.test(document.getElementById('mnLong').textContent)));
  await p.evaluate(() => setTime(1)); await p.waitForTimeout(150);
  ok('seas: none in the Ice Age — title and note go back to today’s coasts', await p.evaluate(() => document.getElementById('ctSea').textContent === '' && /Continents move/.test(document.getElementById('mnLong').textContent)));
  ok('terrain: map notes explain heights and depths, say they are estimates, and cite the atlas', await p.evaluate(() => { const t = document.getElementById('mapAbout').innerText; return /Heights and depths/.test(t) && /estimates/.test(t) && /Scotese and Wright, 2018/.test(t) && /WebGL/.test(t) && /Atlas of Phanerozoic Paleogeographic Maps/.test(t); }));
  ok('seas: map notes explain the seas, their limits, and cite Kocsis', await p.evaluate(() => { const t = document.getElementById('mapAbout').innerText; return /Seas over the land/.test(t) && /highest/.test(t) && /540 million/.test(t) && /Kocsis/.test(t) && /Scotese and Wright/.test(t) && /blue stripes/.test(t) && /another plate model/.test(t) && /jump hundreds of kilometres/.test(t); }));
  await p.evaluate(() => { setTime(250); switchTab('geo'); }); await p.waitForTimeout(250);
  ok('seas: the Geology tab charts the seas through time, with a cursor at now', await p.evaluate(() => { const c = document.getElementById('seasCur'); return !!c && Math.abs(+c.getAttribute('x1') - seaX(250)) < 0.2 && new RegExp('250 MYA: ' + Math.round(WorldMap.seaShare(250).pct) + '%.*' + Math.round(WorldMap.seaShare(250).high) + '% when it rose highest').test(document.getElementById('seasNow').textContent); }));
  ok('seas: the chart says how high the sea was is argued over, and cites both sides', await p.evaluate(() => { const t = document.getElementById('seasCard').textContent; return /argued over/.test(t) && /Haq/.test(document.querySelector('#seasCard .sources').textContent) && /Miller/.test(document.querySelector('#seasCard .sources').textContent); }));
  { const box = await p.evaluate(() => { document.getElementById('seasSvg').scrollIntoView({ block: 'center' }); const r = document.getElementById('seasSvg').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
    await p.mouse.click(box[0] + box[2] * (1 - 100 / 540), box[1] + box[3] / 2); await p.waitForTimeout(2200);
    ok('seas: tapping the chart travels to that time', await p.evaluate(() => Math.abs(S.t - 100) < 6), String(await p.evaluate(() => S.t))); }
  await p.evaluate(() => { setTime(90); setPin(39, -98.4, 'Kansas', true); }); await p.waitForTimeout(200);
  ok('seas: a pin in Kansas at 90 Ma says it lay under the sea', await p.evaluate(() => /under the sea/.test(document.getElementById('pinCard').innerText)));
  await p.evaluate(() => { setTime(200); }); await p.waitForTimeout(150);
  ok('seas: …and at 200 Ma that it was dry land', await p.evaluate(() => /dry land/.test(document.getElementById('pinCard').innerText)));
  await p.evaluate(() => { setPin(null); switchTab('life'); setTime(150); }); await p.waitForTimeout(150);
  // the review of 18 Nov 2026: fossils against the sea maps, clean fades, labels on the right surface
  const fos = await p.evaluate(() => {
    const sea = /sea|ocean|reef|marine|seafloor|lagoon|shelf|coast|bay|plankton/i, landG = ['dino', 'ptero', 'bird', 'mammal', 'synapsid', 'amph', 'plant'], c = { m: 0, mOk: 0, l: 0, lOk: 0 };
    for (const a of ALL) { if (!a.sites) continue; const t = (a.t[0] + a.t[1]) / 2; if (t > 540 || t < 3) continue;
      for (const s of a.sites) { const w = WorldMap.seaAt(s[0], s[1], t);
        if ((a.g === 'marine' || sea.test(a.habitat || '')) && !landG.includes(a.g)) { c.m++; if (w === 'sea' || w === 'reached') c.mOk++; }
        else if (a.g === 'dino' || a.g === 'synapsid') { c.l++; if (w === 'land' || w === 'reached') c.lOk++; } } }
    return c; });
  ok('seas: sea creatures’ fossils sit in the sea or the striped land (≥80%), dinosaurs’ on land or the stripes (≥90%) — as the map notes say', fos.mOk / fos.m >= 0.8 && fos.lOk / fos.l >= 0.9, JSON.stringify(fos));
  const fade = await p.evaluate(() => [4, 542.6, 100].map(t => { setTime(t); WorldMap._draw(); const L = WorldMap._landCanvas(), d = L.getContext('2d').getImageData(0, 0, L.width, L.height).data; let land = 0, half = 0; for (let i = 3; i < d.length; i += 4) { if (d[i] > 215) land++; else if (d[i] > 40) half++; } return +(half / Math.max(1, land)).toFixed(4); }));
  ok('seas: no half-see-through land while the sea maps fade in or out (only coast edges are soft; a half-faded map was over 0.5)', fade.every(f => f < 0.2), JSON.stringify(fade));
  const lab = await p.evaluate(() => { const bad = []; for (let t = 500; t >= 230; t -= 2.5) { setTime(t); WorldMap._draw(); for (const L of WorldMap._labelsAt()) { if (!L.shown || L.land == null) continue; if (L.kind === 'ocean' && L.land > 200) bad.push(t + ' ' + L.text); if (L.kind === 'land' && L.land < 40 && L.sea === 'none') bad.push(t + ' ' + L.text); } } setTime(150); return bad; });
  ok('labels: a continent’s name never floats on open ocean, an ocean’s never sits on land (500–230 Ma)', lab.length === 0, lab.slice(0, 8).join(', '));
  // backdrops: five, cycled by the 🎨 button and remembered on this device
  { const corner = () => { const c = document.getElementById('mapCanvas'), d = c.getContext('2d').getImageData(4, 4, 1, 1).data; return d[0] + d[1] + d[2]; };
    const r = await p.evaluate(async c => { const cf = eval(c); setTime(90); WorldMap._draw(); const atlas = cf(); const seen = [WorldMap.backdrop];
      for (let i = 0; i < 5; i++) { document.getElementById('mapStyle').click(); seen.push(WorldMap.backdrop); }
      WorldMap.setBackdrop('space'); WorldMap._draw(); const space = cf(); let kept = null; try { kept = localStorage.getItem('beforeus.backdrop'); } catch (e) {}
      WorldMap.setBackdrop('atlas'); WorldMap._draw(); try { localStorage.removeItem('beforeus.backdrop'); } catch (e) {}
      return { atlas, space, seen, kept }; }, corner.toString());
    ok('backdrops: the 🎨 button cycles all five and back, and the choice is remembered', new Set(r.seen).size === 5 && r.seen[0] === r.seen[5] && r.kept != null, JSON.stringify(r));
    ok('backdrops: space is dark around the map, the atlas is paper', r.space < 60 && r.atlas > 400, JSON.stringify(r)); }
  ok('backdrops: “How this map is made” names the field book’s inspiration and says the moving water is decoration', await p.evaluate(() => { const t = document.getElementById('mapAbout').textContent; return /Lhwyd/.test(t) && /decoration/.test(t) && /less motion/.test(t); }));
  // sounds of the time: off by default, and only what there is evidence for
  ok('sound: off until asked for', await p.evaluate(() => !SoundOfTime.on && document.getElementById('soundBtn').getAttribute('aria-pressed') === 'false'));
  ok('sound: wind and waves only before 165 Ma; insect song from 165 Ma; bird calls from 67 Ma; only wind in a Snowball Earth', await p.evaluate(() => {
    const L = t => SoundOfTime.layers(t);
    return !L(300).insects && !L(300).birds && L(300).surf === 1 && L(160).insects && !L(160).birds && L(60).birds && L(60).insects && L(700).surf === 0 && L(700).wind === 1 && L(20).wind < L(0.02).wind; }));
  await p.click('#soundBtn'); await p.waitForTimeout(400);
  ok('sound: the button starts it, says what you are hearing, and cites the katydid and the voice box', await p.evaluate(() => { const t = document.getElementById('mapAbout').textContent, src = (SRCMAP['m:sound'] || []).join(); return SoundOfTime.on && !!SoundOfTime.running && document.getElementById('soundBtn').getAttribute('aria-pressed') === 'true' && /Archaboilus/.test(t) && /Vegavis/.test(t) && /gu2012/.test(src) && /clarke2016/.test(src); }));
  await p.click('#soundBtn'); await p.waitForTimeout(200);
  ok('sound: …and stops it again', await p.evaluate(() => !SoundOfTime.on));
  // what helped people, and what threatened them (Humans tab, “At this time”, data_survival.js)
  await p.evaluate(() => setTime(0.074)); await p.click('#tab-humans'); await p.waitForTimeout(300);
  const svIds = () => p.evaluate(() => Object.fromEntries(['help', 'threat'].map(k => [k, [...document.querySelectorAll('#hfSurv .sv-' + k + ' .sv-item')].map(e => e.dataset.sv)])));
  let sv = await svIds();
  ok('humans: “At this time” lists what helped and what threatened — at 74,000 years ago fire, shellfish and the Toba eruption, not dogs or the plague', sv.threat.includes('toba') && sv.threat.includes('hunted') && sv.help.includes('fire') && sv.help.includes('shore') && !sv.help.includes('dogs') && !sv.threat.includes('plague'), JSON.stringify(sv));
  ok('humans: every help and threat cites a verified paper; Toba cites both sides of the argument', await p.evaluate(() => SURVIVAL.length >= 20 && SURVIVAL.every(v => (SRCMAP['v:' + v.id] || []).length > 0) && ['ambrose1998', 'lane2013'].every(k => SRCMAP['v:toba'].includes(k))));
  await p.click('#hfSurv .sv-item[data-sv="toba"] summary'); await p.click('#hfSurv .sv-item[data-sv="stone"] summary'); await p.waitForTimeout(150);
  ok('humans: opening one shows how we know, where, what is argued over, and the papers', await p.evaluate(() => { const d = document.querySelector('#hfSurv .sv-item[data-sv="toba"]'); return d.open && /Lake Malawi/.test(d.innerText) && !!d.querySelector('.sv-debate') && !!d.querySelector('.sources a[href="https://doi.org/10.1073/pnas.1301474110"]'); }));
  await p.evaluate(() => setTime(0.0042)); await p.waitForTimeout(200);
  sv = await svIds();
  ok('humans: it follows the clock — in 2200 BCE the great drought and salty fields; not the Black Death, not Toba', sv.threat.includes('drought') && sv.threat.includes('salt') && !sv.threat.includes('plague') && !sv.threat.includes('toba') && sv.help.includes('rice'), JSON.stringify(sv));
  ok('humans: an entry opened stays open while the time moves', await p.evaluate(() => document.querySelector('#hfSurv .sv-item[data-sv="stone"]').open));
  await p.evaluate(() => setTime(tOfYear(1350))); await p.waitForTimeout(200);
  ok('humans: the Black Death shows in the 1350s', (await svIds()).threat.includes('plague'));
  await p.evaluate(() => setTime(5)); await p.waitForTimeout(200);
  ok('humans: before the oldest stone tools it says none are known, and still names the danger of being hunted', await p.evaluate(() => /oldest stone tools yet found are 3\.3 million/.test(document.querySelector('#hfSurv .sv-help').innerText) && !!document.querySelector('#hfSurv .sv-item[data-sv="hunted"]')));
  await p.evaluate(() => setTime(20)); await p.waitForTimeout(200);
  ok('humans: nothing before the human family', await p.evaluate(() => document.getElementById('hfSurv').innerHTML.trim() === ''));
  // the Age of Mammals, chapter by chapter (data_mammals.js)
  const chap = await p.evaluate(() => [62, 45, 30, 15, 4].map(t => { setTime(t); return [document.getElementById('periodName').textContent, document.getElementById('ctTitle').textContent]; }));
  ok('mammals: each epoch from 66 to 2.58 Ma has its own chapter — the header and the map title change', chap.map(c => c[1]).join() === 'The Paleocene World,The Eocene World,The Oligocene World,The Miocene World,The Pliocene World' && /The Hothouse/.test(chap[1][0]) && /Pliocene · Neogene/.test(chap[4][0]), JSON.stringify(chap));
  ok('mammals: every chapter cites verified papers, and the Ice Age keeps its own card', await p.evaluate(() => CHAPTERS.every(c => (SRCMAP['p:' + c.id] || []).length >= 3) && (setTime(1), S.chapter === null && /Ice Age/.test(document.getElementById('periodName').textContent))));
  await p.evaluate(() => setTime(45)); await p.click('#tab-insights'); await p.waitForTimeout(250);
  ok('mammals: the Insights tab opens on the chapter, then the whole period', await p.evaluate(() => { const t = document.getElementById('pane-insights').innerText; return /Eocene: The Hothouse/i.test(t) && /Azolla/.test(t) && /The whole Paleogene/i.test(t) && !!document.querySelector('#pane-insights .sources'); }));
  ok('mammals: the Paleocene and Oligocene filled in — 20+ and 30+ animals; every new one placed and sourced', await p.evaluate(() => { const n = (a, b) => ALL.filter(c => !c.hom && c.t[0] >= b && c.t[1] < a).length; const added = ['Torrejonia', 'Tsidiiyazhi', 'Waimanu', 'Anthracosuchus', 'Messel moths', 'Llanocetus', 'Saadanius', 'Ucayalipithecus', 'Rukwapithecus', 'Kairuku', 'Nyanzapithecus (“Alesi”)', 'Phoberomys', 'Arctic camel (Paracamelus)', 'Protarctos', 'Chasmaporthetes (running hyena)']; return n(66, 56) >= 20 && n(33.9, 23) >= 30 && added.every(a => BY_NAME[a] && BY_NAME[a].sites && BY_NAME[a].sites.length && (SRCMAP['a:' + a] || []).length); }));
  ok('mammals: more of the Age of Mammals on the timeline — the first penguins, the Azolla fern, the Great Break, Africa meets Eurasia, camels in the Arctic', await p.evaluate(() => ['The first penguins', 'A fern covers the Arctic Ocean', 'The Great Break', 'Africa joins Eurasia', 'Camels in the Arctic'].every(n => EVENTS.some(e => e[3] === n)) && EVENTS.filter(e => e[0] < 66 && e[0] >= 2.58).length >= 25));
  await p.evaluate(() => setTime(5.6)); await p.waitForTimeout(150);
  ok('mammals: at 5.6 Ma the map shows the Mediterranean dried to salt, without playing the story; not before or after', await p.evaluate(() => { const on = S.ambient === 'mediterranean' && WorldMap.fxOn; setTime(6.2); const before = !WorldMap.fxOn; setTime(5.2); const after = !WorldMap.fxOn; setTime(5.6); return on && before && after && WorldMap.fxOn; }));
  // kin through time: from any card, the whole family branch on one time axis and on the map
  await p.click('#tab-life'); await p.evaluate(() => { setView('list'); setTime(0.02); select(ALL.find(c => c.name === 'Woolly Mammoth').key); }); await p.waitForTimeout(1500);
  ok('kin: the mammoth’s card offers all its elephant kin through time', await p.evaluate(() => /All 1\d elephants & kin through time/.test((document.querySelector('#lifeList .creature-card.active [data-kin]') || {}).textContent || '')));
  await p.click('#lifeList .creature-card.active [data-kin]'); await p.waitForTimeout(500);
  const kin = await p.evaluate(() => { const rows = [...document.querySelectorAll('#lifeList .kin-row')], m = WorldMap._markers(), K = KIN[S.kin]; return { view: S.view, rows: rows.length, first: rows[0] && rows[0].querySelector('.kn').firstChild.textContent.trim(), now: document.querySelectorAll('#lifeList .kin-row.now').length, markers: m.length, members: K.filter(c => c.sites && c.sites.length).length, dimOk: m.every(x => x.dim === !alive(BY_KEY[x.key], S.t)), tags: m.every(x => !!x.tag) }; });
  ok('kin: every elephant relative, oldest first, on one axis; on the map every one’s site, faded when not alive now, each with its age', kin.view === 'kin' && kin.rows >= 15 && kin.first === 'Eritherium' && kin.now >= 4 && kin.markers === kin.members && kin.dimOk && kin.tags, JSON.stringify(kin));
  await p.click('#lifeList .kin-row[data-key="deinotherium"]'); await p.waitForTimeout(2600);
  ok('kin: tapping one takes the map to its time, and the view stays', await p.evaluate(() => S.sel === 'deinotherium' && S.t <= 20 && S.t >= 1 && S.view === 'kin' && document.querySelector('#lifeList .kin-row.sel[data-key="deinotherium"]')));
  await p.click('#lifeList [data-kin-back]'); await p.waitForTimeout(300);
  ok('kin: back to the list, and the map shows only what is alive again', await p.evaluate(() => S.view === 'list' && WorldMap._markers().every(x => !x.dim && !x.tag)));
  // dragging: the picture follows the hand without full redraws, and frames are light until it lets go
  {
    await p.evaluate(() => { WorldMap.setMode('flat'); WorldMap.resetView(); setTime(100); }); await p.waitForTimeout(900);
    const bb = await (await p.$('#mapCanvas')).boundingBox(), cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
    const f0 = await p.evaluate(() => WorldMap._fullDraws());
    await p.mouse.move(cx, cy); await p.mouse.down(); for (let i = 1; i <= 20; i++) { await p.mouse.move(cx + i * 10, cy); await p.waitForTimeout(16); }
    const mid = await p.evaluate(() => [WorldMap._fullDraws(), WorldMap._isLite()]); await p.mouse.up(); await p.waitForTimeout(1800);   // a flick coasts to a stop first
    ok('drag: spinning the flat map moves the last picture row by row — at most a few (light) redraws in 20 moves, and the full picture comes back after', mid[0] - f0 <= 4 && mid[1] === true && await p.evaluate(f => WorldMap._fullDraws() > f && !WorldMap._isLite(), f0), JSON.stringify([mid[0] - f0, mid[1]]));
    ok('drag: a light frame is quicker than a full one in deep time (about 4× with the terrain on, over http)', await p.evaluate(() => { let a = 0, b = 0; for (let i = 0; i < 3; i++) { WorldMap._draw(); a += WorldMap.stats().ms; WorldMap._drawLite(); b += WorldMap.stats().ms; } return b < a; }));
    await p.evaluate(() => WorldMap.resetView());
  }
  // back to a billion years: the Tonian and Rodinia (Merdith et al. 2021 reaches 1000 Ma)
  ok('tonian: the map and timeline reach 1,000 million years ago, with its own period card and map title', await p.evaluate(() => { setTime(1000); return T_MAX === 4567 && WorldMap.MAXT === 1800 && S.t === 1000 && S.period.id === 'tonian' && document.getElementById('ctTitle').textContent === 'The World of Rodinia' && WorldMap.stats().polygons > 500; }));
  ok('tonian: the land moves between 1,000 and 720 Ma (Rodinia gathers, then breaks up)', await p.evaluate(() => { const a = WorldMap.attach(40, -100, 0), b = WorldMap.attach(-25, 135, 0); const d = t => { const x = WorldMap.locate(a, t), y = WorldMap.locate(b, t); return x && y ? Math.round(d3.geoDistance(x, y) * 6371) : null; }; const v = [d(1000), d(850), d(730)]; return v.every(x => x != null) && new Set(v).size === 3; }));
  ok('tonian: its life is placed and sourced — the oldest fungus and green seaweed, a possible sponge (marked as argued over), vase-shaped amoebae', await p.evaluate(() => ['Ourasphaira', 'Proterocladus', 'Possible sponge (Little Dal reefs)', 'Vase-shaped microfossils'].every(n => BY_NAME[n] && BY_NAME[n].sites && (SRCMAP['a:' + n] || []).length) && !!BY_NAME['Possible sponge (Little Dal reefs)'].debate && (SRCMAP['p:tonian'] || []).length >= 5));
  ok('tonian: a seaweed is labelled as making its own food, a fungus as breaking down dead matter — not as a plant-eater', await p.evaluate(() => { setTime(990); S.scope = 'now'; renderLife(); const t = document.getElementById('lifeList').innerText; return /Makes its own food from sunlight/.test(t) && /Breaks down dead matter/.test(t); }));
  // back to 1.8 billion years: Nuna and the boring billion (Cao et al. 2024 before 1000 Ma, Merdith et al. 2021 after)
  ok('nuna: four periods from 1,800 to 1,000 Ma, each with its card, insights, food web and sources', await p.evaluate(() => ['statherian', 'calymmian', 'ectasian', 'stenian'].every(id => { const q = PERIODS.find(x => x.id === id); return q && q.insight && q.insight.signs.length >= 4 && FOODWEBS[id] && (SRCMAP['p:' + id] || []).length >= 2; }) && (setTime(1700), S.period.id === 'statherian')));
  ok('nuna: the plates come from Cao et al. 2024 before 1,000 Ma and ease into Merdith et al. 2021 without a jump', await p.evaluate(() => { const pts = [[40, -100], [-25, 135], [0, 20], [60, 100]].map(([la, lo]) => WorldMap.attach(la, lo, 1000)); let worst = 0; for (let t = 990; t < 1070; t += 5) for (const a of pts) { const x = WorldMap.locate(a, t), y = WorldMap.locate(a, t + 5); if (!x || !y) return false; worst = Math.max(worst, d3.geoDistance(x, y) * 180 / Math.PI); } return worst < 4 && (SRCMAP['m:plates'] || []).includes('cao2024') && PLATE_DATA.join === 1000; }));
  ok('nuna: its life is placed and sourced — Qingshania, the Gaoyuzhuang seaweeds, Bangiomorpha, the Torridon lake microbes; Rafatazmia marked as argued over', await p.evaluate(() => ['Qingshania', 'Gaoyuzhuang seaweeds', 'Rafatazmia', 'Tappania', 'Bangiomorpha', 'Torridon lake microbes'].every(n => BY_NAME[n] && BY_NAME[n].sites && (SRCMAP['a:' + n] || []).length) && !!BY_NAME['Rafatazmia'].debate));
  ok('nuna: places younger than 1,000 Ma never ride on the older model’s blocks', await p.evaluate(() => { const a = WorldMap.attach(56, 4, 385.5), b = WorldMap.attach(48, -64, 406); const la = WorldMap.locate(a, 385.5), lb = WorldMap.locate(b, 406); return !!la && !!lb && Math.abs(la[1] - 56) > 20 && Math.abs(lb[1] - 48) > 20; }));
  // back to the birth of the Earth: no map of the land before 1.8 Ga, and the page says so
  ok('early earth: the timeline reaches 4,567 Ma; the map follows past its plate data and draws no land there', await p.evaluate(() => { setTime(4000); WorldMap._draw(); return S.t === 4000 && WorldMap.time === 4000 && WorldMap.MAXT === 1800 && S.period.id === 'eoarchean' && WorldMap._markers().length === 0; }));
  ok('early earth: the map says plainly that nobody knows where the land was — and that the youngest Earth may have been molten', await p.evaluate(() => { setTime(3000); const a = lastBanner; setTime(4500); const b = lastBanner; setTime(1000); return /Nobody knows where the land was/.test(a) && /molten/.test(b) && lastBanner === ''; }));
  ok('early earth: “How this map is made” says why no land is drawn before 1.8 billion years', await p.evaluate(() => /Before 1\.8 billion years ago no published model says where the land was/.test(document.getElementById('mapAbout').textContent)));
  ok('deep time: today’s lakes and the young basins of Hudson Bay and the Baltic are not drawn on Nuna or Rodinia; today they are', await p.evaluate(() => { const q = (la, lo) => WorldMap._landHere(la, lo); setTime(1500); WorldMap._draw(); const old = [q(60, -86), q(47.7, -87.5), q(66, -120.9), q(62.5, 19.5)]; setTime(800); WorldMap._draw(); old.push(q(60, -86), q(47.5, -87.9)); setTime(0); WorldMap._draw(); const now = [q(60, -86), q(62.5, 19.5)]; setTime(150); return old.every(x => x === true) && now.every(x => x === false); }));
  // life at the site (Release 12.2): the Kem Kem, opened from the Spinosaurus card
  await p.evaluate(() => { switchTab('life'); setTime(97); select(ALL.find(c => c.name === 'Spinosaurus').key); }); await p.waitForTimeout(600);
  ok('sites: the Spinosaurus card offers life at the Kem Kem rivers', await p.evaluate(() => !!document.querySelector('[data-site="kemkem"]')));
  await p.click('[data-site="kemkem"]'); await p.waitForTimeout(500);
  ok('sites: the scene opens over the map and draws every animal the site lists, each labelled, with its caption', await p.evaluate(() => { const el = document.getElementById('siteScene'), s = SITE.kemkem; return el.classList.contains('show') && S.site === 'kemkem' && Object.keys(S.siteDrawn).length === s.cast.length && s.cast.every(c => c.name in S.siteDrawn) && /to scale/.test(el.textContent) && /size not known/.test(el.textContent) && /Stromer’s riddle/.test(el.textContent); }));
  ok('sites: the bars show every known length to scale beside a grown-up person; animals with no known length get no bar', await p.evaluate(() => { const B = S.siteBars, s = SITE.kemkem, known = s.cast.filter(c => c.len), unknown = s.cast.filter(c => !c.len); const near = (a, b) => Math.abs(a - b) / b < 0.02; return known.every(c => near(B[c.name] / B.Spinosaurus, c.len / 17)) && near(B['a grown-up person'] / B.Spinosaurus, 1.7 / 17) && unknown.every(c => !(c.name in B) && c.size === 'size not known'); }));
  await p.waitForFunction(() => S.siteDrawn && SITE.kemkem.cast.every(c => S.siteDrawn[c.name] && S.siteDrawn[c.name].sil), null, { timeout: 8000 }).catch(() => {});
  ok('sites: every animal is drawn as a PhyloPic silhouette, known lengths to scale, and every silhouette is credited with its licence', await p.evaluate(() => { const d = S.siteDrawn, s = SITE.kemkem; const allSil = s.cast.every(c => d[c.name] && d[c.name].sil); const r = d.Spinosaurus.w / d.Carcharodontosaurus.w; const credits = document.querySelector('#siteScene .ss-credits').textContent; return allSil && Math.abs(r - 17 / 12.5) / (17 / 12.5) < 0.02 && s.cast.every(c => credits.includes(SIL[c.sil].by)) && /CC0|CC BY/.test(credits) && /outline of a relative/.test(document.getElementById("siteScene").textContent) && /outline of one member of the group, Ekrixinatosaurus/.test(document.getElementById("siteScene").textContent); }), await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(S.siteDrawn).map(([k, v]) => [k, v.sil])))));
  ok('sites: the site cites the Kem Kem review and both sides of the Spinosaurus debate', await p.evaluate(() => ['ibrahim2020b', 'lang2013', 'hone2021', 'sereno2022', 'fabbri2022', 'ibrahim2020'].every(k => (SRCMAP['z:kemkem'] || []).includes(k)) && !!document.querySelector('#siteScene .sources')));
  await p.click('#siteScene [data-site-close]'); await p.waitForTimeout(200);
  ok('sites: closing gives the map back', await p.evaluate(() => !S.site && !document.getElementById('siteScene').classList.contains('show')));
  await p.evaluate(() => setTime(150));
  ok('early earth: on a wide screen the banner stays two lines', await p.evaluate(() => { setTime(3000); WorldMap._draw(); const n = WorldMap._bannerLines(); setTime(1000); return n === 2; }));
  // more events, period by period (Release 13): no period left empty, and every new event cites its paper
  ok('events: every period from the Ediacaran on has at least three timeline events, every older one at least one, and the Permian is no longer empty', await p.evaluate(() => { const n = P => EVENTS.filter(e => e[0] <= P.start && e[0] > P.end).length; return PERIODS.every(P => n(P) >= (P.start <= 635 ? 3 : 1)) && n(PERIODS.find(P => P.id === 'permian')) >= 5; }));
  ok('events: the Cretaceous has at least a dozen events for its 77 million years', await p.evaluate(() => EVENTS.filter(e => e[0] <= 143 && e[0] > 66).length >= 12));
  await p.evaluate(() => switchTab('ext')); await p.waitForTimeout(250);
  ok('crises: the Extinctions tab lists the smaller crises, oldest first, each a timeline event with its papers', await p.evaluate(() => { const rows = [...document.querySelectorAll('#pane-ext .crisis')], ts = SMALL_CRISES.map(id => EVENTS.find(e => e[5] === id)[0]); return rows.length === SMALL_CRISES.length && rows.length >= 12 && ts.every((t, i) => !i || t < ts[i - 1]) && SMALL_CRISES.every(id => (SRCMAP['n:' + id] || []).length); }));
  await p.click('#pane-ext .crisis[data-crisis="hangenberg"]'); await p.waitForFunction(() => Math.abs(S.t - 359.3) < 1, null, { timeout: 10000 }).catch(() => {}); await p.waitForTimeout(400);
  ok('crises: tapping one goes to its time and shows its papers', await p.evaluate(() => Math.abs(S.t - 359.3) < 1 && /Hangenberg/.test(document.getElementById('fpText').textContent) && /Kaiser et al\. 201[56]/.test(document.getElementById('fpText').textContent)), await p.evaluate(() => S.t.toFixed(2) + ' ' + S.win.join('-') + ' ' + document.getElementById('fpText').textContent));
  await p.evaluate(() => { closeFact(); switchTab('life'); }); await p.waitForTimeout(150);
  ok('snowball: the ice reaches the tropics in both freezes and is gone between them and after the thaw', await p.evaluate(() => snowIce(690) === 1 && snowIce(640) === 1 && snowIce(652) === 0 && snowIce(720) === 0 && snowIce(630) === 0));
  ok('snowball: the map shows the ice whenever the clock is inside a freeze, without playing the story; not before or after', await p.evaluate(() => { setTime(690); const on = S.ambient === 'snowball' && WorldMap.fxOn; setTime(600); const after = !WorldMap.fxOn; setTime(750); const before = !WorldMap.fxOn; setTime(150); return on && after && before; }));
  ok('events: every event with an id cites a verified paper', await p.evaluate(() => EVENTS.filter(e => e[5]).length >= 24 && EVENTS.filter(e => e[5]).every(e => (SRCMAP['n:' + e[5]] || []).length > 0)));
  await p.evaluate(() => { setWindow(300, 250, true); setTime(270); }); await p.waitForTimeout(300);
  { const idx = await p.evaluate(() => EVENTS.findIndex(e => e[5] === 'capitanian'));
    await p.click('#tlEvents .ev[data-ev="' + idx + '"]'); await p.waitForTimeout(250);
    ok('events: tapping a timeline event shows its papers, each a link', await p.evaluate(() => { const t = document.getElementById('fpText'); return /Capitanian/.test(t.textContent) && /Wignall et al\. 2009/.test(t.textContent) && /Day et al\. 2015/.test(t.textContent) && t.querySelectorAll('.fp-src a[href^="https://doi.org/"]').length === 2; }), await p.evaluate(() => document.getElementById('fpText').textContent)); }
  ok('sparks: the Ontong Java eruptions stay off the map — the plates here carry continents, not the Pacific floor', await p.evaluate(() => !SPARKS.some(sp => sp[8] === 'ontongjava') && EVENTS.some(e => e[5] === 'ontongjava')));
  ok('sparks: every eruption and impact on the map belongs to a timeline event that cites its papers, at the right time', await p.evaluate(() => SPARKS.length >= 22 && SPARKS.every(sp => { const ev = EVENTS.find(e => e[5] === sp[8]); return ev && (SRCMAP['n:' + sp[8]] || []).length && ev[0] <= sp[2] + 2 && ev[0] >= sp[3] - 2; })));
  ok('sparks: the early animal age has its own eruptions now (Kalkarindji, Viluy), and recorded history its own (Vesuvius, Tambora)', await p.evaluate(() => ['kalkarindji', 'viluy', 'vesuvius', 'tambora'].every(id => SPARKS.some(sp => sp[8] === id))));
  { await p.evaluate(() => { closeFact(); setWindow(150, 120, true); setTime(134); WorldMap.setMotion(false); WorldMap._draw(); }); await p.waitForTimeout(300);
    const at = await p.evaluate(() => { const sp = SPARKS.find(s => s[8] === 'parana'), a = WorldMap.attach(sp[0], sp[1], (sp[2] + sp[3]) / 2), ll = WorldMap.locate(a, 134); return ll && WorldMap._screen(ll[0], ll[1]); });
    const bb = await (await p.$('#mapCanvas')).boundingBox();
    if (at) { await p.mouse.click(bb.x + at[0], bb.y + at[1]); await p.waitForTimeout(250); }
    ok('sparks: tapping an eruption on the map names it and shows its papers', !!at && await p.evaluate(() => { const t = document.getElementById('fpText'); return /Paraná–Etendeka/.test(t.textContent) && /Thiede (et al\. )?2010/.test(t.textContent) && !!t.querySelector('.fp-src a[href^="https://doi.org/"]'); }), await p.evaluate(() => document.getElementById('fpText').textContent)); }
  await p.evaluate(() => { closeFact(); setWindow(T_MAX, 0, true); setTime(150); }); await p.waitForTimeout(200);
  ok('early earth: eight new cards (an eon, four eras, three periods), named as such, each with sources; life sourced, with the argued-over finds marked', await p.evaluate(() => ['hadean', 'eoarchean', 'paleoarchean', 'mesoarchean', 'neoarchean', 'siderian', 'rhyacian', 'orosirian'].every(id => (SRCMAP['p:' + id] || []).length >= 1 && PERIODS.find(x => x.id === id)) && (setTime(4200), /Hadean Eon/.test(document.getElementById('periodName').textContent)) && (setTime(3300), /Paleoarchean Era/.test(document.getElementById('periodName').textContent)) && ['Isua cones (possible stromatolites)', 'Strelley Pool stromatolites', 'Dresser hot-spring microbes', 'Moodies river mats', 'Francevillian fossils', 'Gunflint microbes'].every(n => BY_NAME[n] && (SRCMAP['a:' + n] || []).length) && !!BY_NAME['Isua cones (possible stromatolites)'].debate && !!BY_NAME['Francevillian fossils'].debate && (setTime(150), true)));
  // the benchmark: the map against independent evidence, never worse than the recorded baseline
  { const { runBench, regressions, loadBase } = require('./bench/bench.js'); const run = await runBench(p), bad = regressions(run, loadBase());
    ok('benchmark: no score below the baseline and no fact that held now failing (tools/bench)', bad.length === 0, '\n    ' + bad.join('\n    '));
    ok('benchmark: every named fact names a verified source and a real place', run.facts.every(f => !f.invalid));
    ok('benchmark: “How this map is made” shows the scores and cites the poles and the rocks method', await p.evaluate(() => { const t = document.getElementById('mapAbout').textContent; return /How we check this map/.test(t) && /\d+% of 367 directions of ancient magnetism/.test(t) && /Torsvik/.test(t) && /Cao/.test(t); })); }
  // data QA: every fossil site can be placed on the map at the animal's time
  const bad = await p.evaluate(() => { const out = []; for (const c of ALL) { if (c.t[1] > WorldMap.MAXT) continue;   // older than any map of the land: no plate to ride
    const mid = (c.t[0] + c.t[1]) / 2; (c._s || sitesOf(c)).forEach((s, i) => { if (s.at.f < 0 || !WorldMap.locate(s.at, mid) || !WorldMap.locate(s.at, c.t[0])) out.push(c.name + ' @ ' + c.sites[i][2] + ' f=' + s.at.f); }); } return out; });
  ok('every fossil site rides a plate at the right time (except life older than any map of the land)', bad.length === 0, '\n    ' + bad.slice(0, 30).join('\n    '));
  const nosite = await p.evaluate(() => ALL.filter(c => !c.sites || !c.sites.length).map(c => c.name));
  ok('only "Humans Today" has no site', nosite.length <= 1, nosite.join(', '));
  // sweep through time in both views: no errors, land always drawn
  const sweep = await p.evaluate(async () => { const bad = []; for (const mode of ['flat', 'globe']) { WorldMap.setMode(mode); for (let t = 0; t <= 1800; t += 9) { setTime(t); WorldMap._draw(); } } WorldMap.setMode('flat'); return bad; });
  ok('time sweep, both views', sweep.length === 0);
  // every period: has insight, has animals, renders
  ok('every period has animals and an insight (before 1,000 Ma, at least one sourced fossil — or a note on the card saying why there is none)', await p.evaluate(() => PERIODS.every(p => (p.start > 1000 ? p.creatures.length >= 1 || !!p.lifeNote : p.creatures.length >= 4) && p.insight && p.insight.signs.length >= 3)));
  ok('a period with no named fossil says why, in the Life list', await p.evaluate(() => { setTime(1300); S.scope = 'now'; S.q = ''; renderLife(); const ok = S.period.id === 'ectasian' && /Rocks this old are scarce/.test(document.getElementById('lifeList').innerText); setTime(150); return ok; }));
  ok('periods tile time with no gaps', await p.evaluate(() => PERIODS.every((p, i) => i === 0 || PERIODS[i - 1].end === p.start) && PERIODS[0].start === 4567 && PERIODS[0].id === 'hadean' && PERIODS[PERIODS.length - 1].end === 0));
  ok('getPeriod never falls through', await p.evaluate(() => { for (let t = 0; t <= 4567; t += 0.37) { const q = getPeriod(t); if (!(t <= q.start && t >= q.end)) return false; } return true; }));
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
  ok('phone: the no-map banner wraps to fit between the map buttons instead of running under them', await p.evaluate(() => { setTime(4500); WorldMap._draw(); const n = WorldMap._bannerLines(); setTime(1000); WorldMap._draw(); return n >= 3 && WorldMap._bannerLines() === 0; }));
  await p.close();
  // ancient relief and sea depth (WebGL, from tiles/dem): needs the page served over http, as on GitHub Pages
  {
    const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
    ok('terrain: a mesh and one elevation map per 5 million years sit beside the page', fs.existsSync(path.join(root, 'tiles/dem/mesh.bin')) && Array.from({ length: 109 }, (_, i) => 'tiles/dem/s' + String(i * 5).padStart(3, '0') + '.bin').every(f => fs.existsSync(path.join(root, f))));
    const types = { '.html': 'text/html', '.bin': 'application/octet-stream', '.jpg': 'image/jpeg', '.png': 'image/png', '.txt': 'text/plain' };
    const srv = require('http').createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
    await new Promise(res => srv.listen(0, '127.0.0.1', res));
    const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } }); p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto('http://127.0.0.1:' + srv.address().port + '/dino-explorer.html#90mya'); await p.waitForTimeout(900);
    await p.evaluate(() => closeDoor());
    await p.waitForFunction(() => WorldMap.terrain && WorldMap._ter().maps.length >= 2, null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(300);
    const ter = await p.evaluate(() => WorldMap._ter());
    ok('terrain: WebGL draws the ancient relief from the elevation maps, served over http', ter.st === 'ready' && ter.gl && ter.drawn > 0 && ter.maps.includes(18), JSON.stringify(ter));
    const tp = await p.evaluate(() => [WorldMap._terPx('sea', 39, -98.4), WorldMap._terPx('land', -29, 25), WorldMap._terPx('land', 39, -98.4)]);
    ok('terrain: sea depth where the seaway was (Kansas), relief on dry land (South Africa)', tp[0] > 200 && tp[1] > 200, JSON.stringify(tp));
    const shelf = await p.evaluate(() => { WorldMap._draw(); const a = WorldMap._px(39, -98.4).rgb; WorldMap.setTerrain(false); WorldMap._draw(); const b = WorldMap._px(39, -98.4).rgb; WorldMap.setTerrain(true); WorldMap._draw(); return [a, b]; });
    ok('terrain: switching it off gives the plain map back, and on draws something different', shelf[0].join() !== shelf[1].join(), JSON.stringify(shelf));
    await p.evaluate(() => setTime(600)); await p.waitForTimeout(200);
    ok('terrain: nothing before the elevation maps begin (540 Ma)', await p.evaluate(() => { const d = WorldMap._ter().drawn; WorldMap._draw(); return WorldMap._ter().drawn === d; }));
    // silhouettes from PhyloPic on the map pins, the cards and the lists (Release 12.1): served over http, as on the live site
    await p.evaluate(() => { setTime(150); switchTab('life'); }); await p.waitForTimeout(400);
    await p.waitForFunction(() => Object.values(WorldMap._pins()).filter(Boolean).length >= 5, null, { timeout: 10000 }).catch(() => {});
    const pins = await p.evaluate(() => { const d = WorldMap._pins(), ks = Object.keys(d), card = k => ALL.find(c => c.key === k); return { n: ks.length, pic: ks.filter(k => d[k]).length, wrong: ks.filter(k => d[k] && !silOf(card(k))).length }; });
    ok('silhouettes: map pins draw PhyloPic silhouettes, and only for animals that have one', pins.pic >= 5 && pins.wrong === 0, JSON.stringify(pins));
    const sc = await p.evaluate(async () => {
      const own = ALL.find(c => c.name === 'Tyrannosaurus rex'), rel = ALL.find(c => !c.hom && silOf(c) && silOf(c).lv === 2);
      const cardOf = c => document.querySelector(`.creature-card.active[data-key="${c.key}"]`);
      const until = async f => { for (let i = 0; i < 80 && !f(); i++) await new Promise(r => setTimeout(r, 100)); return f(); };   // select() travels to the animal’s time first
      select(own.key); await until(() => cardOf(own) && cardOf(own).querySelector('.sil-credit'));
      const a = cardOf(own), pic = a && a.querySelector('.sil-pic'), url = pic && (pic.style.maskImage || pic.style.webkitMaskImage || '').replace(/^url\("?|"?\)$/g, '');
      const got = url ? (await fetch(url)).ok : false, s = silOf(own), credit = a && a.querySelector('.sil-credit');
      select(rel.key); await until(() => cardOf(rel) && cardOf(rel).querySelector('.sil-credit')); const b = cardOf(rel);
      return { got, url, credit: !!credit && credit.textContent.includes(s.by) && !!credit.querySelector(`a[href="${LIC_URL[s.lic]}"]`) && !!credit.querySelector('a[href*="phylopic.org/images/"]'),
        rel: !!b && !!b.querySelector('.sil-rel') && /outline of a relative/.test(b.textContent) && b.textContent.includes(silOf(rel).of), rows: document.querySelectorAll('.crow .sil-pic').length };
    });
    ok('silhouettes: a card shows its silhouette and credits the artist, the licence and the PhyloPic page', sc.got && sc.credit, JSON.stringify(sc));
    ok('silhouettes: a card drawn with a relative’s outline says so, and names the relative', sc.rel, JSON.stringify(sc));
    const cr = await p.evaluate(async () => { switchTab('finds'); await new Promise(r => setTimeout(r, 300)); const e = document.querySelector('.sil-credits'); const artists = [...new Set(Object.values(SILI).map(i => i[2] || 'unnamed artists'))];
      return !!e && e.textContent.includes(Object.keys(SILI).length + ' drawings') && artists.every(n => e.textContent.includes(n)) && Object.values(SILI).every(i => [0, 1, 2, 3].includes(i[3])); });
    ok('silhouettes: “What this atlas borrows” credits every artist, and every drawing is CC0, public domain or CC BY', cr);
    await ctx.close(); srv.close();
  }
  ok('terrain: off when the page is opened from a file (browsers will not load its data there)', await (async () => { const q = await open({ width: 900, height: 700 }, '#90mya'); await q.waitForTimeout(1500); const r = await q.evaluate(() => !WorldMap.terrain && WorldMap._ter().drawn === 0); await q.close(); return r; })());
  ok('silhouettes: off when the page is opened from a file (the map could not read its own pixels), so the emoji stay', await (async () => { const q = await open({ width: 900, height: 700 }, '#150mya'); await q.waitForTimeout(1200); const r = await q.evaluate(() => !SIL_HTTP && !document.querySelector('.sil-pic') && Object.values(WorldMap._pins()).every(v => !v)); await q.close(); return r; })());
  ok('no console errors', errs.length === 0, '\n    ' + errs.slice(0, 8).join('\n    '));
  await b.close();
  console.log(`${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
