# The rebuild: from one generated page to an app that can grow

Written 25 Nov 2026, in the first local session on Evan’s Mac. Evan: “move it off this initial build structure into
something more robust that we can grow with … professional grade instead of just a personal project.” He approved the
approach (“proceed”). Read `CLAUDE.md` first; every rule there still applies. `docs/PLAN.md` says how this fits with
the content releases.

## What stays, and what changes

**Stays, because it is already professional-grade:** the content (745 animals, 24 hominins, sites, stories, history),
the sources pipeline (`refs_wanted.txt` → `verify_refs.py` → `refs.json`, Crossref-checked), the plate, seas, terrain,
ice and sea-level data and the scripts that build them, the benchmark (`tools/bench`), the 306 checks in
`tools/test.js`, and the rules on uncertainty and sources. None of this is thrown away; it moves.

**Changes, because it is what makes the site feel like a personal project:**

| Today | Why it holds us back |
|---|---|
| One generated 2.3 MB page (920 KB zipped); everything inlined | Every visit downloads and starts everything, before the reader sees anything; nothing can be cached on its own |
| `app.js`: 230 KB, ~280 top-level functions, one global state `S`, screens built by pasting HTML strings (38 `innerHTML` writes) | Every feature touches every other; small changes break distant screens; no types to catch mistakes |
| Data in patch layers: `original.html` (the first version) → `old.js` → `data_fix.js` → `data_new.js`, `data_more.js` … | Nobody can say where an animal “lives”; adding one means knowing the history |
| The address keeps only the time, the chosen animal and the pin (`#150mya/<key>/pin=…`) | Tabs, site scenes, stories, journeys and empires cannot be linked to or shared |
| The map does all its geometry on the main thread, for every new time | The timeline stutters on phones (see the numbers below) |
| GitHub Pages straight from `main`; the checks run only when a session remembers to | No preview to look at on a phone before a change is live; nothing stops a broken push |

## Step 0 — measured (done, 25 Nov)

`node tools/perf/perf.js` loads the page over http and times what a reader does, on a desktop window (1400×900) and on
a phone (390×844, CPU slowed 4×). Headless Chromium on Evan’s Mac (Apple M4, GPU on): **compare runs with each other,
not with a real phone** — a mid-range Android phone is slower than this. The second run is kept in
`tools/perf/baseline.json` (the first, cold run had a 1.1 s load on desktop; the warm runs agree with each other).

| What the reader does | Desktop | Phone | Verdict |
|---|---|---|---|
| Scrub the timeline (hand on the slider) | 52–56 fps, p95 33 ms | **19–20 fps, 40 % of frames late, p95 133–150 ms, 32 long tasks** | The main glitch |
| Press Play | 58–60 fps | **36 fps**, 10 % late | Second |
| Sit still, touch nothing (5 s) | **60 frames a second asked for, 7 % CPU** | **60 frames a second, 3–4 % CPU** | Never rests: battery and heat |
| Drag the map | 59 fps; one 67 ms hitch when the hand lets go | same | Smooth while moving; the hitch is the full redraw replacing the quick one |
| Zoom with the wheel | 53–60 fps | 60 fps | Fine |
| Drag the globe | 59 fps | 49 fps | Fine |
| Switch tab (tap → shown) | 24–50 ms | 41–130 ms (Humans 125–130) | Humans and Finds feel slow on a phone |
| Open the Kem Kem scene | 30–35 ms | 116–123 ms | Borderline |
| First load (first paint / ready) | 0.25–1.5 s / 0.4–2.3 s | 0.3–0.9 s / 1.0–1.5 s, 370 ms blocked | Everything parsed before anything is useful |

**Where the time goes (a CPU profile of the phone scrub).** Drawing a frame is cheap: a full map at a time already
seen takes 2–10 ms on desktop and 6–20 ms on the phone. What costs is **every new time**: 66–138 ms on the phone, because
the engine recomputes the geometry for that time on the main thread — tracing the seas outlines from their grids
(`seaTrace`/`seaNow`, about a quarter of all scrub time), carrying the coastlines on their plates and projecting them
(`landPath`, d3-geo). So the first fix is **not** a new renderer; it is moving that work out of the reader’s way.
WebGL drawing stays on the list for later, if the numbers still call for it.

## The target

```
content/        the data, one validated file per kind (animals, hominins, sites, stories, empires, events, sources …)
                + schemas; the build refuses anything that breaks them (as assemble.mjs does today)
engine/         the map (WorldMap), TypeScript; per-time geometry in a Web Worker; knows nothing about animals
app/            the interface: React + TypeScript + Vite; one component per screen; a real address for every view
                (/life/spinosaurus, /site/kemkem, /at/95-ma, /story/snowball-earth …); offline and home-screen ready
tools/          the data pipelines (Python) and checks, as now; tools/perf with budgets
tests/          the Playwright checks, ported one for one, plus the performance budgets
```

Why these: **React + TypeScript** has the largest ecosystem and is what most tools, examples and future helpers know;
TypeScript catches the class of mistake that now only shows up on screen. **Vite** builds it, splits it into files that
load as needed and are cached between visits. **Web Worker** for the engine: the slider never waits for geometry.
**CI (GitHub Actions)**: every push builds, validates, runs the checks, the benchmark and the performance budgets; a
failing push cannot go live. **Preview links**: every branch gets its own address to look at on a phone first.

## The steps (in order; one or more sessions each)

Each step ends with everything passing and the live site still working. The old page stays live until Step 4.

1. **Engine speed — shipped 25 Nov** (numbers in `tools/perf/after-step1.json`). What was done, and how it differed from
   the plan below: a second profile showed the seas were the cost only at a *new* 5-Myr stage, so instead of shipping
   traced outlines as files, **the tracing and thinning run in a Web Worker** (`SW` in `engine.js`; built from the
   page’s own `seaTrace`/`seaThin`, so the outlines are identical — checked for four stages); while a stage is on its
   way the loop draws the nearest one traced (≤ 4 steps, ≤ 12 under a moving hand) and redraws when it comes; anything
   drawn outside the loop (`WorldMap._draw`, review hooks) still traces on the spot. The timeline slider now gives
   **light frames while the hand moves** (`WorldMap.interact()`), as map drags always did. Hudson Bay and the Baltic are
   re-attached only when the time crosses a plate break (`ageKey`, exact). Every fossil site and dated rock is tied to its
   plate **in idle moments after load** (`warmSites`, `warmRocks`) instead of the first time the clock reaches it. **Play**
   moves the map on about 30 times a second. **Decorations** (water light, clouds, eruptions, the chosen pin’s ring) run
   at ~30 fps and **only while someone is exploring** (14 s after the last touch, as designed), then rest, drawn still:
   **0 frames and 0 % CPU at rest** (was 60 frames a second forever). Results on the phone settings: scrub **20 → 51
   fps, late frames 41 % → 1 %**; Play 36 → 43 fps, late 10 % → 1 % (the 50 fps budget is not met as counted, because
   the map now changes 30 times a second by design; revisit with the renderer in Step 5); desktop scrub 56 → 60 fps.
   Settled frames are pixel-identical to before at five times on desktop and phone; benchmark unchanged; 308 checks pass.
   Still open: the 67 ms hitch when a hand lets go of the map (the full redraw), and slow tabs on phones (Humans 126 ms,
   Finds 87 ms) — both belong to Step 3.
   The original plan for this step, kept for the record:
   - Trace the seas outlines at build time (`build_seas.py` or a node step) and ship them per 5-Myr step, instead of
     `seaTrace` on the main thread; fetch them as needed.
   - Move the per-time geometry (plates carrying the coast, sea, ice) into a Web Worker; the map shows the last finished
     frame until the next is ready, as `drawQuick` does now for drags.
   - Stop asking for frames when nothing moves: the water, wakes and sparks at a low frame rate, paused a few seconds
     after the last touch (already planned in `PLAN.md` › polish).
   - **Done when** (`tools/perf/perf.js`, phone): scrub ≥ 45 fps with ≤ 5 % late frames, Play ≥ 50 fps, idle asks for
     0 frames after 3 s, and `tools/test.js` and the benchmark still pass.
2. **Content out of the patch layers.** One file per kind in `content/`, with schemas; `assemble.mjs` reads from there
   so the old page keeps working. A check proves the page’s data is identical before and after (every animal, field,
   source). `original.html`, `old.js` and `data_fix.js` go.
3. **The new app beside the old.** React + TypeScript + Vite, using `engine/` and `content/`. Port screen by screen
   against a parity list (every tab, view, scene, story, journey, the quiz, the pin, the sheet on phones), porting the
   matching checks from `tools/test.js` as each one lands. Real addresses for every view; old `#150mya/…` links still work.
4. **Switch over.** CI on GitHub Actions; preview links; the new app replaces the old at the same address
   (evancarrigan85.github.io/dino-explorer keeps working, or a new domain with a redirect). Offline and home screen,
   share cards, self-hosted fonts (the rest of `PLAN.md` › polish).
5. **Then, if the numbers still ask for it:** the map drawn with WebGL, one layer at a time (the terrain already is).

**Performance budgets** (checked in CI from Step 4, on the phone settings above): scrub ≥ 45 fps, ≤ 5 % late; Play ≥ 50
fps; idle 0 frames after 3 s; tab switch ≤ 60 ms; first paint ≤ 1 s; site scene ≤ 60 ms. Never loosen a budget to ship.

## While the rebuild runs

- **Content work goes on** in the data files (cards, events, sources, paintings): it moves to `content/` mechanically in
  Step 2. **No new screens on the old app** — they would have to be built twice.
- The Kem Kem painting (`tiles/scenes/kemkem.webp`, `paintings-data.js`, the caption and checks) is built and tested on
  Evan’s Mac but **held by Evan** (25 Nov): do not ship it until he says.
- The era painting guide and the hominin figures (both discussed 25 Nov) are content and design work: they can be
  planned now and built into the new app.

## Features for the new app (from comparing with the World History Encyclopedia app, 25 Nov)

Evan pointed at the World History Encyclopedia iPhone app (a non-profit; human-written, expert-reviewed). What to take:

1. **Trust you can see.** A “How we know what we show” page: every fact sourced, papers checked in Crossref, the
   benchmark, what is a guess. Later, one named reviewer (a palaeontologist or science teacher) — ask Evan.
2. **Ask the atlas.** A question box that answers **only** from the site’s own cards and verified papers, links the
   sources, and says “we don’t know” when the site doesn’t. Needs a small server to hold the API key (a Cloudflare Worker
   or similar), a spending cap, and child-safe settings. After Step 3.
3. **One search, Saved, offline, simpler phone navigation.** Search across everything (animals, sites, empires,
   stories, events); a Saved collection; offline (Step 4); on phones about five bottom tabs instead of seven.
4. **An iPhone app later.** Once the new app exists it can be wrapped (Capacitor) and tested in the iOS Simulator on
   Evan’s Mac. After Step 4 — ask Evan (Apple developer account, $99 a year).

**Not to copy:** their app tracks readers across other apps (location, identifiers). Before Us: **no tracking**, said
on the page. They declare no accessibility features; we should (reduced motion already, then screen readers and
contrast).

## Sources to add, with credit (licences checked 25 Nov)

Evan’s Mac reaches `paleobiodb.org`, `macrostrat.org` and `www.earthbyte.org` (the cloud sessions could not). Every
outside dataset or picture goes into one credits list (what, who, licence, link, date fetched), shown on a Credits page
and on each item that uses it, as the PhyloPic silhouettes are now. **Allowed licences: CC0, public domain, CC BY, and
CC BY-SA used unchanged.** No non-commercial (NC) licences: they would limit an app, donations or a grant later. The
build refuses a picture without an allowed licence.

| Source | What it adds | Licence (as checked) | When |
|---|---|---|---|
| Paleobiology Database | every recorded fossil of an animal as dots (Release 8 in `PLAN.md`); audit our hand-entered sites | CC BY 4.0 | after Step 2 |
| Cliopatria (Seshat) | real borders for 1,600+ states and empires, 3400 BCE–2024, instead of our hand sketches | CC BY (paper record) — **confirm the repo’s LICENSE first** | after Step 2 |
| Macrostrat | the rock under any pin, and its age (Geology tab) | CC BY 4.0 (its own API says so) | new app |
| Smithsonian 3D | real fossils to turn in 3D | CC0 for many — check each item | new app |
| Charles R. Knight and other old paleoart | “what we got wrong”: the old picture beside today’s (Finds) | public domain in the US if published before 1929 — check each file | after Step 2 |
| Museum open access (The Met, Art Institute of Chicago, Cleveland Museum of Art) | real objects for empires, beliefs and great works | CC0 programmes — confirm before use | after Step 2 |
| Wikimedia Commons paleoart (e.g. Nobu Tamura) | living animals where PhyloPic has none | varies per file (CC BY, CC BY-SA) — check each | new app |
| Pleiades | exact places of the ancient world | CC BY 3.0 | after Step 2 |
| Wikidata | names in other languages; cross-checks on dates | CC0 | new app |
| World History Encyclopedia, Smithsonian Human Origins | “Read more” links only | per page, mostly CC BY-NC-SA / copyright: **link, don’t copy** | any time |

Not confirmed: the licences of Cícero Moraes’s hominin face reconstructions on Commons — check each file before use.

## Decisions for Evan (ask before the step that needs them)

- **Hosting for previews** (Step 4): stay on GitHub Pages and add preview builds through Actions, or move to Cloudflare
  Pages (previews built in, free). Either keeps the current address working.
- **A domain of its own** (Step 4), e.g. a `.org` for Before Us: optional, about $10–15 a year.
- **React** is recommended (Step 3); Svelte is the lighter alternative. Ask only if Evan has a preference.
