// The Earth at each site's own time, from this atlas's own map (plates, seas, relief: the sources in "How this map is
// made"), seen from space and zooming in on the site: three pictures per site for the opening of its living scene.
//   node app/scripts/capture-earth.cjs        (after building dino-explorer.html; writes app/public/earth/<site>-<n>.jpg)
const { chromium } = require('../../node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..'), OUT = path.join(ROOT, 'app', 'public', 'earth');
const { SITE_SCENES } = require(path.join(ROOT, 'tools', 'source', 'data_sites.js'));
const T = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.bin': 'application/octet-stream', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const ZOOMS = [1, 4.5, 16];                 // the whole globe; the region; close in

const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
srv.listen(0, '127.0.0.1', async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 2400, height: 1500 }, deviceScaleFactor: 1 });
  for (const s of SITE_SCENES) {
    await p.goto(`http://127.0.0.1:${srv.address().port}/dino-explorer.html#${s.t}mya`); await p.waitForTimeout(2500);
    await p.evaluate(() => { closeDoor(); WorldMap.setMotion(false); });
    // only the map itself: no buttons, title card, notes or pins (the old map's animal pins, painted over, read as eyes: the
    // reviewer caught it, 25 Nov 2026). The opening marks the site with its own ring, and says what it is.
    await p.addStyleTag({ content: '.map-ctl,#cartouche,#mapNote,#youBar,#eventsRibbon,#mapTip,#sceneCap,#pinPanel,#siteScene,#journey,#mapAbout,#benchNote{display:none!important}' });
    await p.evaluate(() => document.getElementById('mapGlobe').click()); await p.waitForTimeout(800);
    await p.evaluate(at => { WorldMap.lookAt(WorldMap.attach(at[0], at[1], S.t)); }, s.at);
    await p.waitForTimeout(1500);
    const box = await p.locator('#mapArea').boundingBox();
    for (let i = 0; i < ZOOMS.length; i++) {
      await p.evaluate(z => { const W = document.getElementById('mapCanvas').clientWidth, H = document.getElementById('mapCanvas').clientHeight; WorldMap.zoomAt(W / 2, H / 2, z / WorldMap.zoom); }, ZOOMS[i]);
      await p.evaluate(() => WorldMap.setLayers({ markers: [], pin: null })); await p.waitForTimeout(2200);
      await p.evaluate(() => WorldMap.setLayers({ markers: [], pin: null })); await p.waitForTimeout(400);
      // a square around the centre, where the site is
      const side = Math.min(box.width, box.height), clip = { x: box.x + (box.width - side) / 2, y: box.y + (box.height - side) / 2, width: side, height: side };
      await p.screenshot({ path: path.join(OUT, `${s.id}-${i + 1}.jpg`), type: 'jpeg', quality: 84, clip });
    }
    console.log(s.id, 'at', s.t, 'Ma:', ZOOMS.length, 'pictures');
  }
  await b.close(); srv.close();
});
