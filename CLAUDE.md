# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

**Before Us — a deep-time atlas of Earth, life and people** (until November 2026 “Dino Time
Explorer”; the repository and the file `dino-explorer.html` keep the old name so the live address does
not change) is one web page: a map of the Earth that moves through a billion years (1000 Ma → today), with the
animals, the human family, the food webs, the history of discovery and recorded history placed on it. It is built
for Evan's kids and held to a museum standard: every claim should be traceable to published research,
and where something is a guess, a sketch or still argued over, the page says so.

## Start here, every session

1. `docs/PLAN.md` — what is done, what is next, in order, with the steps for each release. Pick the
   top unfinished release unless Evan says otherwise. Update it when a release ships.
2. `tools/README.md` — where each kind of content lives and how the generated blocks are rebuilt.

## The rules that have already cost time

1. **`dino-explorer.html` is generated. Never edit it.** Edit `tools/source/*` and run
   `node tools/source/assemble.mjs dino-explorer.html`. The build validates the data and prints
   `PROBLEMS:` and exits 1 if anything is wrong; a release with problems does not ship.
2. **Nothing is done until `node tools/test.js` prints `N passed, 0 failed`.** Add a check for every
   new behaviour in the same change. Look at the result too: screenshot desktop (1400×900) and a
   phone before saying a screen works.
3. **A reference appears only after `tools/verify_refs.py` has matched it in the Crossref registry**
   (title, year, first author) **as a published work** — not a preprint, not a conference abstract.
   Never type a DOI into `refs.json` by hand and never cite from memory. If a paper cannot be
   verified, the entry goes without a source and the coverage count says so. Run
   `python3 -I tools/verify_refs.py --audit` before any release that touches references.
   Titles from memory are often slightly wrong: when a line misses, fix the title or pin the DOI in
   the sixth column — do not loosen the matcher.
4. **Say what is uncertain, on the page.** Cards have `wrong`, `debate`, `left` and "How do we know?"
   fields for this. A map layer that is a sketch is labelled a sketch in "How this map is made"
   (`body.html`, `#mapAbout`). Do not draw something the data cannot support — e.g. today's mountains
   are only drawn for the last 5 million years, on purpose.
5. **Everything on screen is a function of the data, the timeline position and the clock — never
   chance.** `Math.random` is used only by the quiz and "Surprise me". Decorative motion on the map
   (wakes behind drifting land, light on the water, eruptions and impacts) runs off the clock, stops
   for readers who ask for reduced motion, and is switched off with `WorldMap.setMotion(false)`.
   Motion may decorate; it may not claim anything the data does not hold.
   **Every glow, ring or burst on the map is named on the map** (`SPARKS` labels, scene captions):
   an unlabelled lava glow over India was read as the asteroid.
6. **Text is for a curious 10-year-old and an adult reading over their shoulder.** Plain words, short
   sentences, no jargon without a gloss. Use `’` not `'` inside single-quoted JS strings.
7. **Never put a secret in a file or in chat.** API keys go through the environment's network secrets.
   Outside requests carry no personal details (the Crossref User-Agent is generic on purpose).
8. **The benchmark only goes up.** `tools/bench` scores the map against evidence it was not built from
   (paleomagnetic poles, climate rocks, fossil environments, named facts with sources). `tools/test.js`
   fails if any score drops below `tools/bench/baseline.json` or a fact that held now fails. After an
   improvement run `node tools/bench/bench.js --update` (it refuses if anything got worse). Never edit the
   baseline down to ship; add new facts (with verified sources) when you learn something the map should
   get right — a failing fact is a target, not a problem.
9. **Original work only.** The planned game is an original take on an evolution side-scroller; it does
   not copy the name, characters, levels or art of any existing game.

## Commands

```
node tools/source/assemble.mjs dino-explorer.html     # build the page (validates all data)
node tools/test.js                                    # Playwright checks; must end "0 failed"
python3 -I tools/verify_refs.py                       # verify new/changed lines in refs_wanted.txt
python3 -I tools/verify_refs.py --only key1,key2      # re-check particular references
python3 -I tools/verify_refs.py --audit               # re-fetch every stored DOI; fails on preprints
node tools/bench/bench.js [--update]                  # score the map against independent evidence
node tools/review_geometry.js                         # walk the timeline: jumps, gaps, labels, terrain fit
```

One-time setup in a fresh container: `npm i -D playwright` is not needed in Claude cloud sessions
(Chromium and Playwright are pre-installed); elsewhere run `npm i -D playwright && npx playwright
install chromium`. Rebuilding the generated map data needs `pip install pygplates shapely numpy
matplotlib` — see `tools/README.md`.

## Shipping

The live site is GitHub Pages serving `main` (`index.html` redirects to `dino-explorer.html`).
Evan has authorised pushing releases straight to `main`: commit on the session branch, push it, then
`git push origin HEAD:main`. No pull request unless he asks for one. Each release is one commit that
builds, passes the checks and has been looked at.

## How the page fits together

- `tools/source/assemble.mjs` reads the original page (`original.html`, via `old.js`), applies the
  corrections in `data_fix.js`, merges every `data_*.js` file, validates, and writes one HTML file
  with everything inlined: styles, markup, d3-geo, plate data, shelf data, relief data, the map
  engine, the app and the quiz.
- **A tap on the map never moves the map or the time.** Selections made from the map set `noLook`,
  and `lookAt()` in `app.js` honours it; only choices made from a list turn the map, and they glide.
- **Close-up detail lives in `tiles/`** beside the page (terrain light and shadow; detailed modern coast),
  loaded on demand and indexed by `HILL_HAVE` / `COAST_HAVE` in the page. They show today's land, so
  they fade out before about 2 million years (terrain) and are used only in the last ~7,000 years
  (coast). Everything else stays inside the one file. While the flat map is dragged or zoomed it moves
  the last finished frame (`drawQuick`; a spin at full size slides each row of latitude by its own amount) and
  redraws properly 140 ms after the hand stops. While a hand is on the map (`interact()`) every frame is light —
  no WebGL terrain, dotted coast, soft glow or hill shading — and decorations never force a redraw; the full
  picture follows 160 ms after it lets go. A full deep-time frame costs 4× a light one.
- `engine.js` is `WorldMap`: a canvas map that carries today's coastlines back in time on their
  tectonic plates (Merdith et al. 2021), with Ice Age shorelines, ice, relief, labels, markers and a
  pin. It knows nothing about animals. From 540 Ma to 3 Ma it also draws **seas over the continents**
  (`seas-data.js`, from the Scotese & Wright 2018 PaleoDEMs — coast and shelf edge — and Kocsis &
  Scotese 2021 — blue stripes for land the sea reached at its highest), one map every 5 Myr, carried on
  our plates and traced into outlines in the page. There the land is the mapped land, not today's
  coast, and the coast ink is the edge of the land as drawn; a dotted line shows today's coast (after
  410 Ma). `WorldMap.seaAt()` and `seaShare()` answer “was this place under the sea?” and “how much
  of the continents was?”. The Geology tab charts it. Over the same span a **WebGL terrain layer**
  (`TER` in `engine.js`, data in `tiles/dem` from `build_dem.py`, Scotese & Wright 2018 PaleoDEMs)
  adds light and shadow on the land and the depth of the shallow seas; it only decorates (land and sea
  still come from the traced coasts), needs http (off on `file:`), and `WorldMap.setTerrain(false)`
  turns it off. `tools/test.js` serves the page over a local http server to check it.
  For the last 3.6 Ma, **sea level, ice sheets and rivers come from published records**
  (`quaternary-data.js` from `build_quaternary.py`; `shelf-rivers-data.js` from `build_shelf_rivers.py`):
  `seaLevel()`, `iceAt()` (PaleoMIST to 80 ka, Batchelor et al. 2019 before, faded by sea level),
  `WorldMap.underIce()`, and rivers traced across the dry sea floor with the ice as a wall.
- `app.js` holds the state `S`, the zoomable timeline, and one render function per tab:
  Life, Humans, Insights, Extinctions, Finds, Quiz, Geology. Map pins for a tab are built in
  `updatePlaces()`.
  The Life tab has four views: the list, the range chart, the family trees (`data_trees.js`) and kin through
  time (`S.view = 'kin'`, `KIN`/`kinOf()`): one family branch on a time axis, with every member's site on the
  map (`dim` and `tag` on a marker fade it and label its age).
  `data_you.js` holds the reader's own line (`YOU_LINE`, shown in the bar under the map), the eruptions
  and impacts drawn on the map (`SPARKS`), and feeds the guided journeys (`JOURNEYS` in `app.js`).
  `data_extinctions.js` holds the Extinctions view; each event names a scene in `SCENES` (`app.js`),
  a function of progress 0→1 drawn over the map through `WorldMap.setFx()`, while `playScene()` runs
  the timeline through the event. A scene illustrates the order of events the card describes — it
  must not show anything the card does not say.
  `data_stories.js` holds “Watch the Earth being made” in the Geology tab — the same idea for how land
  formed (first: the Great Lakes). `playStory()` runs the clock through `ka`, `STORY_SCENES` draws
  over the map, and while a story plays the map's own ice is hidden (`setIceOff`) and animals step aside.
  `data_mammals.js` holds the Age of Mammals chapter by chapter: each epoch from the Paleocene to the
  Pliocene has a chapter (`S.chapter`, `getChapter()`) that takes over the header, the map title and the
  top of the Insights tab; sources under `p:<epoch id>`. `AMBIENT` in `app.js` draws a story's picture
  on the map whenever the clock is inside it (the dry Mediterranean, 5.97–5.33 Ma).
  `data_survival.js` holds what helped people and what threatened them (“At this time” in the Humans
  tab): each entry has a window in Ma (`t`) or calendar years (`y`) and starts at its oldest evidence.
  `data_history.js` holds the empires, kingdoms and beliefs of the last 5,500 years, shown in the
  Humans tab, with trade routes (`TRADE`) and great works (`WORKS`). Years there are calendar years
  (negative = BCE); `tOfYear()`/`yearAt()` convert. Empire shapes are hand sketches and the page says
  so; an empire with `stages` has a sketch per date and the map switches between them — it never
  draws a border moving, because nothing here knows where it was in between. Beliefs are described in their
  followers' own terms (“Muslims hold that…”), never judged, and every one gets the same care.
- Sources: `refs_wanted.txt` (what we want to cite, and which entries each paper supports) →
  `verify_refs.py` → `refs.json` (what Crossref confirmed) → `REFS`/`SRCMAP` in the page.
  Target prefixes: `a:` animal name, `h:` hominin id, `c:` culture id, `d:` drowned site id,
  `p:` period id, `f:` food web, `x:` find id, `t:` family tree id, `j:` journey id, `e:` extinction id, `s:` story id, `k:` empire id, `b:` belief id,
  `r:` trade route id, `w:` great work id, `v:` help or threat id (`data_survival.js`), `i:` inspiration id, `m:` map layer
  (`plates|seas|terrain|sealevel|ice|rivers|climate|rocks|landcover|history|time|checks|sound`).

## Network

This environment reaches GitHub, npm, PyPI, Crossref, `zenodo.org` (allowed 17 Nov 2026) and
`api.pixellab.ai`. It does **not** reach `www.earthbyte.org` or `paleobiodb.org`; releases in `docs/PLAN.md` that need them say
so, and the host has to be approved by Evan first. Public GitHub repositories can be cloned with
`git clone` even though the GitHub API is scoped to this project — search them with
`gh api -X GET search/repositories` first: that is how the ancient-coast data was found when the
usual hosts were closed. Check each dataset's licence before using it.
