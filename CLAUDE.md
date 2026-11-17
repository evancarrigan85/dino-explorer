# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

**Before Us — a deep-time atlas of Earth, life and people** (until November 2026 “Dino Time
Explorer”; the repository and the file `dino-explorer.html` keep the old name so the live address does
not change) is one web page: a map of the Earth that moves through 720 million years, with the
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
8. **Original work only.** The planned game is an original take on an evolution side-scroller; it does
   not copy the name, characters, levels or art of any existing game.

## Commands

```
node tools/source/assemble.mjs dino-explorer.html     # build the page (validates all data)
node tools/test.js                                    # Playwright checks; must end "0 failed"
python3 -I tools/verify_refs.py                       # verify new/changed lines in refs_wanted.txt
python3 -I tools/verify_refs.py --only key1,key2      # re-check particular references
python3 -I tools/verify_refs.py --audit               # re-fetch every stored DOI; fails on preprints
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
  the last finished frame (`drawQuick`) and redraws properly 140 ms after the hand stops.
- `engine.js` is `WorldMap`: a canvas map that carries today's coastlines back in time on their
  tectonic plates (Merdith et al. 2021), with Ice Age shorelines, ice, relief, labels, markers and a
  pin. It knows nothing about animals.
- `app.js` holds the state `S`, the zoomable timeline, and one render function per tab:
  Life, Humans, Insights, Extinctions, Finds, Quiz, Geology. Map pins for a tab are built in
  `updatePlaces()`.
  The Life tab has three views: the list, the range chart and the family trees (`data_trees.js`).
  `data_you.js` holds the reader's own line (`YOU_LINE`, shown in the bar under the map), the eruptions
  and impacts drawn on the map (`SPARKS`), and feeds the guided journeys (`JOURNEYS` in `app.js`).
  `data_extinctions.js` holds the Extinctions view; each event names a scene in `SCENES` (`app.js`),
  a function of progress 0→1 drawn over the map through `WorldMap.setFx()`, while `playScene()` runs
  the timeline through the event. A scene illustrates the order of events the card describes — it
  must not show anything the card does not say.
  `data_history.js` holds the empires, kingdoms and beliefs of the last 5,500 years, shown in the
  Humans tab, with trade routes (`TRADE`) and great works (`WORKS`). Years there are calendar years
  (negative = BCE); `tOfYear()`/`yearAt()` convert. Empire shapes are hand sketches and the page says
  so; an empire with `stages` has a sketch per date and the map switches between them — it never
  draws a border moving, because nothing here knows where it was in between. Beliefs are described in their
  followers' own terms (“Muslims hold that…”), never judged, and every one gets the same care.
- Sources: `refs_wanted.txt` (what we want to cite, and which entries each paper supports) →
  `verify_refs.py` → `refs.json` (what Crossref confirmed) → `REFS`/`SRCMAP` in the page.
  Target prefixes: `a:` animal name, `h:` hominin id, `c:` culture id, `d:` drowned site id,
  `p:` period id, `f:` food web, `x:` find id, `t:` family tree id, `j:` journey id, `e:` extinction id, `k:` empire id, `b:` belief id,
  `r:` trade route id, `w:` great work id, `m:` map layer
  (`plates|sealevel|climate|rocks|landcover|history|time`).

## Network

This environment reaches GitHub, npm, PyPI, Crossref and `api.pixellab.ai`. It does **not** reach
`zenodo.org`, `www.earthbyte.org` or `paleobiodb.org`; releases in `docs/PLAN.md` that need them say
so, and the host has to be approved by Evan first.
