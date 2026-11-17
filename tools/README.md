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
| `data_gaps.js` | Animals added to fill regions and periods the map had nothing in |
| `data_roots.js` | Proto-mammals, early mammals and dinosaurs added with the family trees |
| `data_you.js` | The reader's own line through time, eruptions and impacts on the map, the drift journey |
| `data_stories.js` | “Watch the Earth being made” stories in the Geology tab (the Great Lakes so far) |
| `data_history.js` | Empires, kingdoms and beliefs of the last 5,500 years (Humans tab) |
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
| `RIVERS_PACKED` (today's great rivers and lakes) | `build_rivers.py` |
| `HILL_HAVE` + `tiles/relief/` (terrain light and shadow, 3 levels) | `build_hillshade.py` |
| `COAST_HAVE` + `tiles/coast/` (detailed modern land and coastline) | `build_coast.py` |

**Tiles beside the page.** `tiles/relief/` (about 3.3 MB of grey JPEGs) and `tiles/coast/` (about 1 MB of
packed text) are the only files the page loads besides itself, and only when you zoom in. They are
served by GitHub Pages next to the page. Opened straight from disk the page still works: the terrain
images load, but the detailed coast does not (browsers will not `fetch` local files), so the plate
coastline is used.

## Rebuilding the plate data

```
pip install pygplates shapely numpy
npm i d3-geo@3 world-atlas@2 topojson-client@3
git clone --depth 1 https://github.com/GPlates/gplates-web-service   # Merdith et al. 2021 model files
node -e "const t=require('topojson-client'),w=require('world-atlas/land-50m.json');const out=[];const add=g=>g.type==='Polygon'?out.push(g.coordinates):g.type==='MultiPolygon'?g.coordinates.forEach(c=>out.push(c)):(g.geometries||[]).forEach(add);(t.feature(w,w.objects.land).features||[]).forEach(f=>add(f.geometry));require('fs').writeFileSync('ne_land_50m.json',JSON.stringify(out))"
python3 tools/build_plates.py gplates-web-service/django/GWS/data/deprecated/MODELS/MERDITH2021 ne_land_50m.json plates_stage1.json
node tools/encode_plates.mjs plates_stage1.json plates-data.js
```

Paste `plates-data.js` into the plate-data block of the page.

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
