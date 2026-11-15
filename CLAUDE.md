# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

**Dino Time Explorer** is one web page: a map of the Earth that moves through 720 million years, with
the animals, the human family, the food webs and the history of discovery placed on it. It is built
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
5. **Everything on screen is a function of the data and the timeline position.** `Math.random` is used
   only by the quiz and "Surprise me".
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
- `engine.js` is `WorldMap`: a canvas map that carries today's coastlines back in time on their
  tectonic plates (Merdith et al. 2021), with Ice Age shorelines, ice, relief, labels, markers and a
  pin. It knows nothing about animals.
- `app.js` holds the state `S`, the zoomable timeline, and one render function per tab:
  Life, Humans, Insights, Finds, Quiz, Geology. Map pins for a tab are built in `updatePlaces()`.
- Sources: `refs_wanted.txt` (what we want to cite, and which entries each paper supports) →
  `verify_refs.py` → `refs.json` (what Crossref confirmed) → `REFS`/`SRCMAP` in the page.
  Target prefixes: `a:` animal name, `h:` hominin id, `c:` culture id, `d:` drowned site id,
  `p:` period id, `f:` food web, `x:` find id, `m:` map layer (`plates|sealevel|climate|time`).

## Network

This environment reaches GitHub, npm, PyPI, Crossref and `api.pixellab.ai`. It does **not** reach
`zenodo.org`, `www.earthbyte.org` or `paleobiodb.org`; releases in `docs/PLAN.md` that need them say
so, and the host has to be approved by Evan first.
