// Checks on the assembled page. Exits 1 on any failure.
const { chromium } = require('playwright');
const URL = 'file://' + (process.argv[2] || require('path').join(__dirname, '..', 'dino-explorer.html'));
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) pass++; else { fail++; console.log('  FAIL', name, extra); } };
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const open = async (vp, hash = '', opts = {}) => {
    const ctx = await b.newContext(Object.assign({ viewport: vp }, opts)); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(URL + hash); await p.waitForTimeout(900); return p;
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
