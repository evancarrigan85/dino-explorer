# Tools

See `../CLAUDE.md` for the working rules and `../docs/PLAN.md` for what is next.

`dino-explorer.html` is a single self-contained page — open it in a browser; no build step is needed to use or edit it. Animals, periods, the human family and the time scale are plain data near the top of the main `<script>`; edit them in place.

The page is built from `tools/source/` with one command:

```
node tools/source/assemble.mjs dino-explorer.html
```

It checks every animal (fields present, dates inside its period, valid fossil sites) and prints a count. Where to edit:

| File | Holds |
|---|---|
| `data_new.js`, `data_more.js` | Animals added since the rebuild (one row each in `data_more.js`) |
| `data_fix.js` | Dates, fossil sites and corrections for the original animals (kept in `original.html`) |
| `data_class.js` | Lineage (family-tree path) for every animal |
| `data_hominins.js` | The human family and its turning points |
| `data_periods.js` | Period insights, museum notes, fossil sites, map labels |
| `data_time.js` | Epochs, ages and timeline events |
| `data_cultures.js`, `data_drowned.js`, `data_foodweb.js` | Ways of life, drowned sites, food webs |
| `data_finds.js` | The Finds tab: the history of fossil discovery |
| `data_early.js` | Life before the Cryogenian, from the birth of the Earth to 720 Ma, period by period; a span with no named fossil is empty on purpose, and its `lifeNote` in `data_periods.js` says why |
| `data_gaps.js` | Animals added to fill regions and periods the map had nothing in |
| `data_roots.js` | Proto-mammals, early mammals and dinosaurs added with the family trees |
| `data_you.js` | The reader's own line through time, eruptions and impacts on the map, the drift journey |
| `data_stories.js` | “Watch the Earth being made” stories in the Geology tab (the Great Lakes so far) |
| `data_mammals.js` | The Age of Mammals, epoch by epoch: a chapter (title, map title, Insights) for each epoch from the Paleocene to the Pliocene; sources under `p:<epoch>` |
| `data_history.js` | Empires, kingdoms and beliefs of the last 5,500 years (Humans tab) |
| `data_survival.js` | What helped people and what threatened them, by time (Humans tab, “At this time”); sources under `v:` |
| `data_extinctions.js` | The Extinctions view: one entry per event, with its scene and its steps |
| `data_trees.js` | The family trees: branches, the feature each one added, and which lineage paths hang on it |
| `data_climate.js` | Global temperature, one value per million years (Scotese et al. 2021) |
| `refs_wanted.txt` → `refs.json` | References we want to cite → what `verify_refs.py` confirmed in Crossref |
| `engine.js` / `app.js` / `style.css` / `body.html` | Map renderer, page logic, styles, markup |

Two blocks inside the page are **generated** and marked `GENERATED … do not edit`:

| Block | Made by |
|---|---|
| d3-geo (map projections, ISC licence) | `npx esbuild tools/d3entry.js --bundle --minify --format=iife --global-name=d3` (after `npm i d3-geo@3 esbuild`) |
| `PLATE_DATA` (moving continents) | `build_plates.py` → `encode_plates.mjs` |
| `SHELF_PACKED` (Ice Age shorelines) | `build_shelf.py` |
| `RELIEF_PACKED` (today's high ground) | `build_relief.py` |
| `LANDCOVER_PACKED` (today's landscapes, from measured climate) | `build_landcover.py` |
| `ROCKS` (deep-time climate from dated rocks) | `build_rocks.py` |
| `SEAS_PACKED` (seas over the continents, 540 Ma → today, one map every 5 Myr) | `build_seas.py` (rebuild it whenever `PLATE_DATA` changes) |
| `DEM_HAVE` + `tiles/dem/` (ancient heights and depths: a mesh and 109 maps, about 1.2 MB) | `build_dem.py` (rebuild after `build_seas.py`) |
| `RIVERS_PACKED` (today's great rivers and lakes) | `build_rivers.py` |
| `QUAT_SL`, `ICE_SLICES`, `ICE_PACKED` (sea level and ice sheets of the last 3.6 Ma) | `build_quaternary.py` |
| `SHELF_RIVERS` (rivers across the dry sea floor, per ice outline) | `build_shelf_rivers.py` (after `build_quaternary.py` and `build_rivers.py`) |
| `HILL_HAVE` + `tiles/relief/` (terrain light and shadow, 3 levels) | `build_hillshade.py` |
| `COAST_HAVE` + `tiles/coast/` (detailed modern land and coastline) | `build_coast.py` |

**Tiles beside the page.** `tiles/relief/` (about 3.3 MB of grey JPEGs) and `tiles/coast/` (about 1 MB of
packed text) are the only files the page loads besides itself, and only when you zoom in. They are
served by GitHub Pages next to the page. Opened straight from disk the page still works: the terrain
images load, but the detailed coast does not (browsers will not `fetch` local files), so the plate
coastline is used.

## Rebuilding the seas over the continents

```
pip install numpy netCDF4 pygplates pyshp
git clone --depth 1 https://github.com/js-arias/gml-kocsis                         # only its equal-area pixel grid is used
# PaleoDEMs (1°, CC BY 4.0): Scotese_Wright_2018_Maps_1-88_1degX1deg_PaleoDEMS_nc.zip from https://zenodo.org/records/5460860
# PaleoCoastlines v7.1 (CC BY 4.0) and the PALEOMAP v19o_r1c model: in
#   https://github.com/adamkocsis/2019-07-04_paleoCoastlines → data/PaleoMAP/2020-08-10_v7 (CS/, CM/, PaleoCoastlines_v7.1.zip)
python3 -I tools/build_seas.py gml-kocsis <netCDF dir> <paleomap_model_v19o_r1c dir> <2020-08-10_v7 dir>
python3 -I tools/build_dem.py  gml-kocsis <netCDF dir> <paleomap_model_v19o_r1c dir>     # always after build_seas.py
```

Every pixel of the grid gets its PALEOMAP plate, is carried to each 5-Myr age with the PALEOMAP v19o_r1c
rotations (the model both sources were made on), and is read there: the **elevation map** gives the
coast (0 m) and the continent's edge (−1,400 m); the **coast map** of Kocsis & Scotese (2021), nearest
in age, gives the sea at its highest (pushed out to every sea creature's fossil). Classes: 0 deep ocean
or no ground, 1 sea over the continent, 2 land, 3 land the sea reached at its highest (drawn striped).
`build_seas.py` then ties each pixel to one of *our* plate families with the same rule as `attach()` in
`engine.js` — so rebuild the seas after the plates, and `build_dem.py` after the seas (it takes the
pixels, their order and families from `seas-data.js`).

Two things that cost time in the review of 18 Nov 2026:
- **pygplates silently reads nothing** from eight of the 162 PaleoCoastlines shapefiles (CS 155, 160,
  165, 170, 185, 195, 250, 325 Ma). `build_seas.py` reads them with pyshp instead (it agrees with
  pygplates exactly on the files pygplates can read) and stops if any file yields no outlines.
- **The ready-made pixel version** in `gml-kocsis` (`kocsis-landscape-unrot-*.tab`) behaves like the
  elevation maps' coast, not like Kocsis & Scotese's sea-at-its-highest coast, and disagrees with their
  original polygons for about a fifth of pixels (badly in the Triassic). Its values are no longer used.

In the page, `engine.js` unpacks the block with the browser's `DecompressionStream`, traces each map
into smooth outlines plate by plate (marching squares on a softened grid), and draws the sea over the
continents under the land, the maps' land into the land layer, and blue stripes over class 3. The land's
shape switches at the middle of a fade (545→540 and 5→3 Ma) so it is never half see-through; the coast
ink there is the edge of whatever land is drawn; the dotted line is today's coast.

## Rebuilding the ancient heights and depths

```
pip install numpy scipy netCDF4 pygplates
# 1° PaleoDEMs, CC BY 4.0: Scotese_Wright_2018_Maps_1-88_1degX1deg_PaleoDEMS_nc.zip from
#   https://zenodo.org/records/5460860 (the environment allows zenodo.org)
# PALEOMAP v19o_r1c rotations and plate polygons: Data/paleomap_model_v19o_r1c inside
#   PaleoCoastlines_v7.1.zip in https://github.com/adamkocsis/2019-07-04_paleoCoastlines (data/PaleoMAP/2020-08-10_v7)
python3 -I tools/build_dem.py gml-kocsis <netCDF dir> <paleomap_model_v19o_r1c dir>
```

The PaleoDEMs are in ancient (PALEOMAP) positions. `build_dem.py` gives every seas pixel its PALEOMAP
plate, carries it to each map's age with the rotations Kocsis & Scotese used, and reads the height
there — so heights ride the same pixels, families and plates as the seas. It agrees with their coast
and shelf-edge maps for 92–98% of pixels. In the page, `engine.js` (the `TER` block) draws the mesh
with WebGL2: each vertex is rotated by its plate's matrix (a small float texture updated every frame)
and projected with the same Equal Earth / orthographic formulas d3 uses; two maps are blended by
time. Two passes: sea depth (clipped to the traced sea, so the coast stays the traced one) and land
light-and-shadow (laid on the land layer with `overlay`). Data loads with `fetch`, so it needs http —
from `file:` and without WebGL the map is drawn as before. `WorldMap.setTerrain(false)` turns it off.

## Rebuilding the plate data

```
pip install pygplates shapely numpy
npm i d3-geo@3 world-atlas@2 topojson-client@3
git clone --depth 1 https://github.com/GPlates/gplates-web-service   # Merdith et al. 2021 model files
node -e "const t=require('topojson-client'),w=require('world-atlas/land-50m.json');const out=[];const add=g=>g.type==='Polygon'?out.push(g.coordinates):g.type==='MultiPolygon'?g.coordinates.forEach(c=>out.push(c)):(g.geometries||[]).forEach(add);(t.feature(w,w.objects.land).features||[]).forEach(f=>add(f.geometry));require('fs').writeFileSync('ne_land_50m.json',JSON.stringify(out))"
python3 tools/build_plates.py gplates-web-service/django/GWS/data/deprecated/MODELS/MERDITH2021 ne_land_50m.json plates_stage1.json 1.8Ga_model_GSF
# 1.8Ga_model_GSF: Cao et al. 2024, unzipped from https://zenodo.org/records/13628813 (CC BY 4.0). Without it the map stops at 1000 Ma.
node tools/encode_plates.mjs plates_stage1.json plates-data.js       # MAXT = 1000 in build_plates.py: the model's full reach
# then rebuild the seas and the terrain (build_seas.py, build_dem.py): they are tied to the plate families
```

Paste `plates-data.js` into the plate-data block of the page.

## The benchmark (`tools/bench`)

`bench.js` scores the map against evidence it was not built from, and `tools/test.js` refuses any
change that makes a score worse or breaks a fact that held:

| Score | What it checks | Source |
|---|---|---|
| poles | 367 paleomagnetic poles, carried by our plates to their age, land within their error + 10° of a pole | Torsvik et al. 2012 (`vgp.json`, from `build_vgp.py`) |
| ice / salt / tropics | glacial deposits poleward of 40°, salt within 45°, tropical clays within 40° at their age | Boucot et al. 2013 (the rocks layer); method of Cao et al. 2019 |
| seaLife / landLife | fossil sites of sea creatures in sea or striped land; dinosaurs and synapsids on land or stripes | the page's own animals |
| facts | named facts in `facts.js`, each with verified sources | events, stories, fossil sites |

`node tools/bench/bench.js` prints every score and fact; `--update` raises `baseline.json` after an
improvement and appends the run to `history.jsonl`. The page shows the current scores in "How this map
is made" (`BENCH`, inlined by `assemble.mjs`). To climb: pick a miss, find why (data, resolution or
model), fix it, add a fact for what you learned.

## Checks

```
npm i -D playwright && npx playwright install chromium
node tools/test.js
```

## Sources

- Plate motions and deep-time continental blocks: Merdith, A.S. et al. (2021), *Extending full-plate tectonic models into deep time*, Earth-Science Reviews 214, 103477.
- Present-day coastlines: Natural Earth (public domain), via the `world-atlas` package.
- Period boundaries: International Chronostratigraphic Chart, ICS 2024/12 (rounded).
- Hominin sizes and dates follow the Smithsonian Human Origins Program where it gives them.

## Rebuilding the last 3.6 million years (sea level, ice, rivers on the sea floor)

```
pip install numpy shapely pillow
git clone --depth 1 https://github.com/benmarwick/gsloid          # data-raw/spratt2016.txt: Spratt & Lisiecki 2016 (NOAA, public domain)
git clone --depth 1 https://github.com/evangowan/icesheet         # global/<region>/margins/*.gmt: PaleoMIST 1.0 (Gowan et al. 2021; CC BY 4.0 on PANGAEA)
# Berends et al. 2021 (CC BY 4.0): Berends_etal_2020_CP_supplement.dat from https://zenodo.org/records/3793592
# Batchelor et al. 2019 outlines (CC BY 4.0): ice_outlines.geojson from https://zenodo.org/records/24136563
python3 -I tools/build_quaternary.py gsloid/data-raw/spratt2016.txt Berends_etal_2020_CP_supplement.dat ice_outlines.geojson icesheet tools/source/quaternary-data.js
# ETOPO 20' (public domain): etopo20data.gz, etopo20lats.gz, etopo20lons.gz from github.com/matplotlib/basemap at v1.2.2rel/examples
python3 -I tools/build_shelf_rivers.py etopo20data.gz etopo20lats.gz etopo20lons.gz tools/source/rivers-data.js tools/source/quaternary-data.js tools/source/shelf-rivers-data.js
```

The shelf rivers take about a minute and a half: one priority-flood routing of the 20' grid per ice outline,
with the ice as a wall and, for outlines older than 450 ka, a chalk ridge across the Strait of Dover.
