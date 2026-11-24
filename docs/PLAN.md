# Plan

Written 15 Nov 2026, at the end of the session that shipped the Finds tab and the family trees. It is meant to be picked up
cold: each release below says what to build, in what order, from which data, and how to know it is
done. Read `CLAUDE.md` first — its rules apply to every release here.

**How to use this file.** Work the releases in order unless Evan chooses otherwise. One release = one
commit that builds, passes `node tools/test.js`, has been looked at on desktop and phone, and is
pushed to `main`. When a release ships, move it to "Shipped" with the date and the numbers, and
correct anything below that turned out to be wrong. Where a step says **ask Evan**, stop and ask.

## Next up (updated 24 Nov 2026 — start here)

**Evan chose silhouettes (24 Nov: “go with silhouettes for now”).** The PhyloPic hosts are approved, the build
(`tools/build_silhouettes.py`) works, and the Kem Kem scene draws them. **Next: 12.1 steps 1 and 4**, the coverage
count for all 769 and then the cards and map pins. After that: 12.3, then more sites (12.2’s list). The plan as
written on 23 Nov follows.


Evan asked for “a visual step forward” and for a plan that survives the session resetting. It is
**Release 12** below. Work it in this order: **12.0 → 12.2 → 12.3 → 12.1**. Then comes **Release 13**, more
events period by period (the backlog is `docs/EVENTS.md`). Its first batch, the empty Permian and Neoarchean
and the sparks already on the list, is a good small session to slot in between the others. 12.1 (the animal art) waits on
Evan’s choice and setup, and nothing else does. If he has chosen by the time you read this, do 12.1 right after
12.0. Before starting, check what Evan has done since: run `get_environment` and look for an `api.pixellab.ai`
network secret and for `api.phylopic.org` among the allowed hosts.

## The audit of 24 Nov 2026: what makes it look amateur (Evan: “what am I overlooking, what exposes that I’m an amateur most?”)

Measured on an emulated iPhone 13 and Pixel 7 (4× slower CPU, 9 Mbps), with axe-core, and by eye. Ranked by how much a
first-time visitor on a phone would notice. Evan works only from his phone now, so the phone is the product.
1. **On a phone the tabs do nothing you can see.** The tab content sits about 7,900 px down a scrolling box under the
   map; tapping “Humans” leaves the screen unchanged (all seven tabs screenshot the same). The map, the heart of it, gets
   about a third of the screen under the header, timeline and period text. **Fix:** a phone layout with the map
   full-width and the tab content in a bottom sheet that slides up (three heights), like a maps app. At the very least a
   tab tap must bring its content into view.
2. **Emoji are the animals.** At 150 Ma the map is ~30 identical green dinosaur emoji, and emoji look different on every
   device. **Fix:** silhouettes as map pins and on cards (12.1 step 4); an SVG icon set for the buttons.
3. **Two voices, and two-thirds of the cards unsourced.** 506 of 745 animal cards have no verified source; 56 use
   exclamation-mark hype (“The ocean EXPLODES with life!”, “all appeared at once!”, “longer than a bus”), and there are
   typos (“strait-shelled”). These are the original page’s cards; everything added since is careful. **Fix:** a rewrite
   and sourcing pass, period by period, with the `debate`/`wrong` fields filled where the science moved.
4. **Sharing and identity.** A shared link shows no picture (`twitter:card` says large image, but there is no `og:image`),
   and the description repeats itself and still says “from Snowball Earth”. The icon is a dinosaur emoji from the old name.
   The address ends in `dino-explorer.html` behind a redirect. There is no home-screen icon and no offline use.
   Fonts come from Google, which sends every visitor’s address to Google. **Fix:** a share card, a real icon, a web-app
   manifest and service worker (installable, works offline in the car), `index.html` as the page itself, self-hosted fonts.
5. **It runs the phone hot.** With the map’s decorative motion on, an idle mid-range phone’s main thread is **100% busy**
   (0% with motion off). **Fix:** draw only when something changes; run the water and wakes at a low frame rate and pause
   them after a few seconds without a touch.
6. **Small targets.** 53 controls under 32 px on a phone (Apple asks for 44). Children’s fingers.
7. **Map crowding.** Pins cover the continent and ocean names (“LAURASIA”, “TETHYS SEA”). **Fix:** labels avoid pins, and
   at world zoom one pin per group with a count.
What is already beyond most professional sites, and should be kept as it is: Crossref-verified references, the
benchmark ratchet, 289 checks, and uncertainty said on the page. axe-core finds only two moderate issues (landmarks).

**Proposed order:** (a) silhouettes on pins and cards; (b) the phone layout; (c) a polish release for 4–6; (d) the card
rewrite, a period per session; (e) hero pictures (below); (f) real fossils in 3D. Plus a review gallery after every
release (`tools/eye`, below), published as a private page Evan can open on his phone.

**Better pictures of the animals, three tiers.** (1) Silhouettes everywhere: done for the scene, next for pins and cards.
(2) Hero pictures for the ~50 animals children look for first: painted by an image model **inside the scientist-drawn
PhyloPic outline** (the outline sets the anatomy, the model only paints), with a check that the painted shape matches the
outline, a by-eye check against the card (feathers, hands, posture), and a label saying it is AI-painted over whose outline.
Palaeontologists and palaeoartists object to AI pictures that invent anatomy (#PaleoAgainstAI), so disclosure and the
outline rule are not optional. Or commission a palaeoartist for the same 50. Evan already has a Gemini key (Groundwork);
it would go in as a network secret for this environment, never in chat. (3) The real thing: Smithsonian 3D scans are CC0
and download as glTF, which `<model-viewer>` shows in the page and in AR on a phone. Needs `3d.si.edu` approved.

**`tools/eye` (the review tool, not built yet).** One command that walks every tab at six times on phone and desktop,
screenshots each, measures load, idle CPU, tap targets, overlaps, console errors and axe, and writes a gallery. Claude
reads the gallery as a reviewer, and it is published as a private page for Evan. Plus the two human eyes no tool
replaces: Evan’s children using it for ten minutes, with notes on where they get stuck, and one palaeontologist or
museum educator reading 20 random cards.

## Where things stand

| | |
|---|---|
| Animals | 745 + 24 members of the human family; 194 dinosaurs; 47 proto-mammals (synapsids); 17 signs of life from before 720 Ma (microbes, seaweeds, the first possible signs of life), 6 of them older than any map of the land |
| Family trees | Four, linked to each other and to every animal card: the road to mammals, the dinosaur tree, from fish to four legs, the reptile tree |
| Tabs | Life · Humans · Insights · Finds · Quiz · Geology |
| Timeline | **4,567 million years ago → today**: the Hadean, the four Archean eras and every Proterozoic period, each with its insights and sources. Before 1,800 Ma no map of the land exists, so none is drawn and the map says so in words |
| Map | Plate motion **1,800 Ma → today** (Merdith et al. 2021 for the last billion years, Cao et al. 2024 before); **seas over the continents 540 → 3 Ma** (Kocsis & Scotese 2021, a map every 5 Myr); **ancient relief and sea depth** (Scotese & Wright 2018 PaleoDEMs, WebGL, blended between maps); Ice Age shorelines at 9 sea levels; ice sheets; today's mountains for the last 5 Ma; temperature readout and stripe (540 Ma → today); **the last 3.6 Ma from published records**: sea level (Lambeck 2014, Spratt & Lisiecki 2016, Berends 2021), ice sheets (PaleoMIST every 2,500 years to 80 ka, Batchelor et al. 2019 to 3.6 Ma), today’s rivers back to 3 Ma, and rivers traced across the dry sea floor |
| Finds | 59 discovery stories, 16 from before 1800 (every one from 1500 on with a source), and “What this atlas borrows” |
| References | 594, every one a published work confirmed in Crossref |
| Age of Mammals | Told epoch by epoch: Paleocene, Eocene, Oligocene, Miocene and Pliocene each have their own chapter (header, map title, Insights), with sources |
| What helped and threatened people | 11 helps and 10 threats in the Humans tab (“At this time”), from 7 Ma to the Black Death, each with its papers and what is argued over |
| History | 27 empires and kingdoms (25 sketched on the map) and 17 beliefs in six families, in the Humans tab; calendar years and a “Recorded history” zoom |
| Extinctions | Their own tab: seven events, a severity chart, and a map scene for each; then 13 smaller crises, each a sourced timeline event |
| Connection | “Your ancestor at this moment” bar under the map (26 steps, the birth of the Earth → today); four guided journeys |
| Living map | Wakes behind drifting land, light on the water, eruptions and impacts at 22 places (511 Ma → 1815 CE), each tied to a sourced event |
| Animal art | PhyloPic silhouettes (CC0 and CC BY, every artist credited): the Kem Kem scene’s 13 animals and a 12-animal pilot; the cards and pins still use emoji |
| Checks | 289 passing, plus the benchmark ratchet (`tools/bench`) |
| Page | about 2.2 MB, one file (plus tiles loaded on demand: close-up terrain and coast, and 1.2 MB of ancient elevation maps) |
| Name | **Before Us — a deep-time atlas of Earth, life and people** (title and header; repository and file names unchanged) |

**Source coverage** (entries that cite at least one verified paper):

| Area | Covered | Missing |
|---|---|---|
| Human species | 24 / 24 | — |
| Animals | 174 / 636 | dinosaurs 43/159, mammals 35/143, invertebrates 28/83, fish 9/47, synapsids 3/22, amphibians 3/19, reptiles 8/29, marine reptiles 4/20, pterosaurs 0/12, crocs 1/14, birds 12/26, plants 2/14, microbes 0/3 |
| Finds | 38 / 52 | xenophanes, cyclops, dragonbones, shenkuo, steno, maastricht, megatherium, cuvier, owen, hadrosaurus, bernissart, tyrrell, trex, tendaguru |
| Cultures | 22 / 33 | jomon, jericho, catalhoyuk, skara-brae, uruk, indus, egypt, thule, cahokia, great-zimbabwe, cities-today |
| Drowned sites | 8 / 14 | cosquer, tybrind, pavlopetri, heracleion, baiae, port-royal |
| Periods | 12 / 15 | cambrian, carboniferous, jurassic |
| Food webs | 8 / 15 | cryogenian, ordovician, silurian, devonian, carboniferous, permian, jurassic |

## Is the map as good as it can be? No — and this is the honest list

What it does well: the land really moves the way the published plate model says; Ice Age coasts,
land bridges and ice are drawn from real depth data and a real sea-level curve; nothing is drawn
that the data cannot support.

What is missing, most important first:

1. ~~Before the Ice Age, the coastlines are today's coasts carried back in time.~~ **Fixed 17 Nov
   2026** for 540 → 3 Ma: the sea over the continents and the ancient coasts are drawn from Kocsis &
   Scotese (2021). What remains: their coast is the sea at its *highest* in each 5-Myr stage, the dots
   are ~1° (about 100 km), they were made on another plate model (PALEOMAP), and nothing exists before
   540 Ma. All four are said in "How this map is made".
2. ~~No ancient mountains.~~ **Fixed 17 Nov 2026**: light and shadow from the PaleoDEMs, 540 → 3 Ma,
   and the depth of the shallow seas. Limits: 1° points, estimates of heights long worn away, WebGL
   and http needed (a saved copy shows the map without them).
3. **Land colour is a latitude sketch**, not reconstructed climate. Release 3 adds the rock evidence
   (coal, salt, glacial deposits) as a layer, which is both more honest and more interesting.
4. ~~Ice sheets are drawn shapes.~~ **Fixed 18 Nov 2026**: PaleoMIST 1.0 (every 2,500 years, 80 ka → today) and
   Batchelor et al. 2019 (12 moments to 3.6 Ma), each shown only while the sea level says the ice was that big.
   Limits: unmapped glacials (1.8–0.9 Ma) use the nearest outline, paler; Patagonia before 80 ka is a stand-in.
5. **Ice Age coasts are coarse** — a 37 km depth grid. Fine for the world view, blurry when zoomed in
   on Doggerland or Beringia. No rivers, no Ice Age lakes. Release 4.
6. **Markers are emoji and pile up** where many animals share a fossil site (Morrison, Hell Creek,
   Liaoning). Release 5 (clustering) and Release 6 (custom sprites).
7. **Shorelines near the old ice sheets are wrong in a known way**: the map lowers the sea evenly,
   but land under the ice was pushed down and has been rising since (Hudson Bay, Scandinavia). This
   cannot be fixed cheaply; it is stated in "How this map is made" as part of Release 4.

---

## Release 0 — Make it feel real (Evan, 16 Nov: "richer, more impactful, more natural")

What shipped that day: a tap on the map no longer moves the map or the time (it used to jump to the
animal's first fossil site); view changes glide; and for recorded history the land is coloured and
textured from a published climate-zone map. What is still to do, most valuable first:

1. **Landscape in deep time, from the rocks.** The land texture is research-based only for the last
   6,000 years. For everything older it is still the latitude sketch. Three sources, in order of how
   soon they can be used:
   - *Climate-indicator rocks* — **shipped 16 Nov** (`tools/build_rocks.py`, Boucot, Chen & Scotese
     2013, credited on the page; Evan said proceed). 6,305 patches from 8,521 dated sites, painted as
     soft washes and carried on the plates. Next: tune patch size against Evan's eye on a phone; add
     the atlas's other indicators (reefs, evaporite basins) only if they read clearly; and still
     confirm the atlas's reuse terms with SEPM before anything commercial.
   - *Ancient shorelines and mountains* (Release 2) — needs `www.earthbyte.org` or `zenodo.org`.
   - *Ice Age vegetation* (the mammoth steppe, shrunken rainforests): find a published, downloadable
     reconstruction of the world 21,000 years ago before promising this.
2. **Custom sprites** (Release 6) — the single biggest change to how it looks. Blocked on the
   PixelLab token.
3. **Animals that arrive and leave** — shipped 16 Nov: a short rise on arrival, a fading medallion on
   departure (skipped when the change is wholesale, e.g. a tab switch).
4. **Fewer, calmer pins** — partly shipped 16 Nov: a "+N" badge where animals did not fit (tap to zoom
   in), and place names hidden on a crowded map until you zoom; on a phone the history section starts
   with two of its four layers on.
5. **A front door** — shipped 16 Nov: six ways in (Your story first), on every fresh visit and from
   the globe in the header; a shared link skips it. Next: remember a returning reader's choice.
6. **Rivers and lakes** — shipped 16 Nov, for the last 12,000 years only (before that the ice sheets
   and other river courses make today's map wrong). Next: Ice Age lakes (Agassiz, Bonneville,
   Mega-Chad) from a published source, and **night lights** for the last century.
7. **Sound**, off by default. Ask Evan first.

## Release 0b — Animal coverage (Evan, 16 Nov: "lots of areas not having anything")

A count of animals by period and region found whole continents empty. 37 animals were added to fill
the worst gaps (India, Australia, Antarctica and Siberia in the dinosaur age; Africa and East Asia in
the Ice Age). Still thin, and next in line — re-run the count before choosing:

- **Carboniferous** outside North America and Europe (almost nothing: it was the ice-covered south).
- **Ordovician, Silurian and Devonian** in Asia, South America and Africa.
- **Permian** in China, India and Australia; **Triassic** in India, Australia and Siberia.
- **Cretaceous** Europe (11) against North America (63); **Jurassic** South America and Africa.
- **Paleogene and Neogene** in Australia, Africa and East Asia; **Quaternary** Africa and India.
- North America is over-represented everywhere, because most famous fossils are from there. Say so
  on the page rather than hide it: empty map is partly empty science.
Each new animal goes in `tools/source/data_gaps.js` with the paper that described it.

## Release 1 — Finish the sources (no blockers; start here)

**Goal.** Every card cites at least one verified paper, or says plainly that it rests on standard
references. This is what Evan asked for: research is foundational.

**Order.** (a) the 14 finds and the 3 periods / 7 food webs / 6 drowned sites / 11 cultures listed
above — small and visible; (b) the 116 dinosaurs without a source; (c) Ice Age and other famous
mammals; (d) everything else, group by group, worst coverage first (pterosaurs, microbes, crocs).

**How.** Add lines to `tools/source/refs_wanted.txt` (`key | surname | year | title | targets | DOI`),
about 40 at a time, then `python3 -I tools/verify_refs.py`. For each animal prefer, in order: the
paper that named it; a recent redescription or review; the paper behind the specific claim on the
card (size, diet, colour). One paper may carry several targets. For a `MISS`, read the "closest"
line: usually the title is slightly off. Correct it or pin the DOI. If it still cannot be matched,
leave the entry unsourced.

Pre-1900 naming papers often have no DOI (Leidy 1858, Owen 1842, Osborn 1905 in the AMNH Bulletin).
Do not hunt for them; cite a modern redescription instead. Books (Mayor's *The First Fossil Hunters*,
Rudwick on Cuvier) may be in Crossref as `book` — the checker accepts that type.

**While there:** every card's facts get re-read against the paper just attached. Where they disagree,
the paper wins and the card is corrected in `data_fix.js` / the relevant `data_*.js`.

**Done when.** Coverage table above is 100% for finds, periods, food webs, drowned, cultures and
dinosaurs; `--audit` exits 0; the "All sources" panel count matches. Expect roughly 250–350 more
references. Several sessions; ship after each batch.

**Claims in the Finds data to double-check against a source in this release** (written from general
knowledge; believed right, not yet tied to a paper): Tendaguru "more than 200 tonnes"; Walcott "more
than 65,000 specimens"; Bernissart "at least 38" and "more than 300 m"; Buckland's 12 m estimate;
Rising Star "about 18 cm" and "more than 1,500 pieces, at least 15 individuals"; Borealopelta "about
7,000 hours"; the Kamoyapithecus naming; Tina Negus's age and the teacher's reply; the Laetoli dung
story (1976) and trail length; Jefferson's hope for living mammoths; Sue's sale price; the Munich
bombing date; the Tiktaalik naming with the Nunavut elders. Fix or soften anything a source does
not support.

## Release 2 — Ancient shorelines and mountains

**Shipped (17 Nov 2026): the shorelines.** No host was needed after all: Kocsis & Scotese's
PaleoCoastlines (CC-BY 4.0), already turned back to present-day positions as ~1° pixels by
J. Salvador Arias, are in a public GitHub repository (`js-arias/gml-kocsis`) that `git clone` reaches.
`tools/build_seas.py` ties every pixel to one of our plate families; the page traces the outlines
itself, plate by plate. See `tools/README.md`. A check on every one of the 109 maps makes sure each
outline closes and no plate's outline reads as most of the globe (one did, before a fix: the whole
Atlantic turned to land at 65 Ma in a zoomed view).

**Found in the 18 Nov review, not yet fixed:**
- *Long-lived animals show their famous sites at every age they lived* — the Dorset and Seppenrade
  ammonites appear in the Devonian. Give sites of long-ranging groups their own ages (from the papers
  that describe each site) and show a marker only inside its site's age.
- *Coasts change in one step every 5 million years* (e.g. 250→245 Ma drains much of Pangaea's shelf at
  once). A short dissolve between neighbouring maps would soften it without drawing an in-between shape.
- *Up to a tenth of the land drawn at 400–280 Ma is today's outline with no sea map under it* (terranes
  the two plate models place differently). Consider fading such pieces.

**Next for the seas, in order:** name the great seaways on the map (Western Interior Seaway, the
Trans-Saharan seaway, the Turgai Strait, the Zechstein Sea), each with a verified source and dates
taken from the maps; a “Watch the Earth being made” story for the Western Interior Seaway; a share of
marine fossil sites that fall in water before vs after (report it); a cross-fade between neighbouring
maps instead of a jump.

**Shipped (17 Nov 2026): the mountains and the depths.** An earlier note here said the PaleoDEMs were
CC-BY-NC-ND; that came from a 2019 mirror's label and was wrong — the authors' own Zenodo record
(10.5281/zenodo.5460860, now reachable) is **CC BY 4.0**, and so is the licence file in the download.
`tools/build_dem.py` turns them back to today's positions and `engine.js` draws them with WebGL.
**Next for the terrain:** sharper close-ups from the 0.1° PaleoDEMs (207 MB on Zenodo; cut into tiles
by region and age like `tiles/relief`), a gentle tint for high ground, and ocean-floor depth beyond
the continents (needs seafloor ages — not on disk).

**Goal (original).** For 400 Ma → 2 Ma, draw where the sea actually covered the continents and where the
mountain belts stood, on top of the moving plates.

**Data.** Cao, Zahirovic, Flament, Williams, Golonka & Müller (2017), *Improving global
paleogeography since the late Paleozoic using paleobiology*, Biogeosciences 14, 5425 (verify the DOI
with the checker; believed `10.5194/bg-14-5425-2017`, CC-BY). It ships polygons for land, shallow
sea, mountains and ice at 24 time slices, built for the Matthews et al. 2016 plate model. The
supplement is hosted by EarthByte.

**Blocker.** `www.earthbyte.org` is not reachable from the cloud environment (tested 15 Nov 2026;
`zenodo.org` is not either). **Ask Evan** to approve the host (the session can propose it with the
environment tools), or to drop the zip into the repository. Alternative if Cao is unavailable:
Scotese & Wright (2018) PaleoDEM rasters on Zenodo (1° grid every 5 Myr, back to 540 Ma) — same
method below, starting from rasters instead of polygons.

**Method.** The polygons are in *ancient* coordinates for a *different* plate model, so they cannot
be drawn directly. Convert each one to present-day coordinates, then let our own plates carry it:

1. For each time slice, reverse-reconstruct the polygons to today with pygplates, using the
   Matthews 2016 rotations and static polygons. Those files are already cloned at
   `gplates-web-service/django/GWS/data/deprecated/MODELS/MATTHEWS2016` (see `tools/README.md` for
   the clone command).
2. Intersect with our plate pieces (the same cut `tools/build_plates.py` makes) so each fragment has
   a plate id, and simplify (tolerance about 0.15°).
3. Pack as `build_shelf.py` does into `tools/source/paleogeo-data.js`: slices → classes (shallow
   sea, mountain) → polygons. Budget 250 KB; coarsen until it fits.
4. `engine.js`: at time *t*, take the nearest slice (cross-fade between neighbours as the shelf
   levels do), rotate its polygons with the existing plate rotations, and draw shallow sea as a
   pale-blue wash over the land layer and mountains with the relief tint. Turn off the present-day
   relief layer wherever a slice exists.
5. Add a paragraph to "How this map is made" naming the source, the slice spacing, and that between
   slices the picture is blended.

**Done when.** At 90 Ma a seaway splits North America; at 150 Ma much of Europe is islands; at
300 Ma a mountain belt crosses Pangaea; markers for marine animals at those times sit in water more
often than before (add a check: share of marine fossil sites that fall on shallow sea or ocean,
before vs after — report it, do not hard-code a threshold on the first pass). Page stays under
1.5 MB. New checks for the layer's presence and for two or three named features.

**Risk.** The two plate models disagree by a few hundred km in places, so reverse-then-forward can
leave slivers. If it looks wrong, restrict the layer to polygons whose present-day position falls
inside or within 2° of our land pieces.

## Release 3 — Climate clues layer (data is already on disk; check the licence first)

**Goal.** A map toggle, "🌡 Climate clues", that shows the rocks geologists actually read climate
from: coal (wet), salt and gypsum (dry), glacial deposits (ice), bauxite and laterite (hot and wet).
It answers "how do we know it was warm?" on the map itself.

**Data.** `gplates-web-service/django/GWS/data/paleo/Boucot_paleolithology.csv` — 8,698 points with
today's lat/lon (`X`,`Y`), a code (`LithCode`), and an age range (`FROMAGE`,`TOAGE`). From Boucot,
Chen & Scotese (2013), *Phanerozoic Paleoclimate: An Atlas of Lithologic Indicators of Climate*.

**First:** find the redistribution terms for this dataset. It is distributed inside a GPL repository,
but the atlas is a SEPM publication. If the terms are unclear, **ask Evan** before embedding it.

**How.** `tools/build_clues.py`: map the codes to four or five kid-readable classes, thin to one
point per 4° cell per class per 10 Myr bin (target under 3,000 points, about 40 KB packed), write
`clues-data.js`. Engine: a `clues` layer of small coloured dots attached with `WorldMap.attach(lat,
lon, age)` and shown when the timeline is inside the point's age range. App: a toggle button beside
the globe button, a legend, and one paragraph in Insights ("How do we know?") that points to it.

**Done when.** At 300 Ma coal dots line the equator and glacial dots cover southern Gondwana; at
250 Ma salt dots sit in the middle of Pangaea. Checks for both.

## Release 4 — The recent world in detail (Evan asked for this twice)

1. **Finer Ice Age coasts where people lived.** Regional shelf tiles at about 2 km for Doggerland,
   Beringia, Sundaland–Sahul, the Persian Gulf, the Adriatic and the Black Sea, drawn in place of the
   global level when the map is zoomed past a threshold. Source: ETOPO 2022 or GEBCO. Check which
   host is reachable (`www.ngdc.noaa.gov`, `download.gebco.net`); if neither, **ask Evan**.
   Extend `tools/build_shelf.py` with a `--region` mode.
2. ~~Published ice-sheet edges.~~ **Shipped 18 Nov 2026** (PaleoMIST 1.0 and Batchelor et al. 2019; see Shipped).
   Dalton et al. 2020 (North America, finer steps) is still better for the deglaciation if its files can be reached.
3. **Ice Age lakes.** Rivers are done (today’s back to 3 Ma; traced across the dry sea floor, 18 Nov 2026).
   Still to do: Lake Agassiz (an outline traced from Teller et al. 2005 is in github.com/evangowan/glacial_lakes,
   LGPL — check the licence), Lake Bonneville and Lahontan, Mega-Chad, the Black Sea lake, Lake Carpentaria —
   as polygons with a date range, each with a verified source; the ice-dammed lakes of Siberia (Mangerud et al. 2004).
4. **More drowned and early sites**, sourced as they are added: Yonaguni is *not* one (natural
   rock — say so if Evan asks); candidates with real literature include the Sunda and Sahul shelf
   finds, the North Sea's Brown Bank, Hoyo Negro (Mexico), Lake Huron's caribou drives (already in),
   Florida sinkholes, and the Black Sea settlements debate.
5. **State the rebound limitation** in "How this map is made" (item 7 in the list above).

## Release 5 — Map polish (no blockers; good small session)

- **Cluster markers** that overlap at the current zoom into one bubble with a count; tap to zoom in.
  The fan-out lines stay for groups of up to about six.
- **Keep big labels clear of markers** (the "LAURASIA" label is hidden at 150 Ma): nudge or fade a
  label when markers cover it.
- **Ocean names by time**: check that "Pacific Ocean" does not appear before the Pacific plate
  existed (about 190 Ma); use Panthalassa before that. Review every row of `OCEANS`/`LABELS`.
- **Make the temperature stripe readable**: it is 4 px tall. Try 6 px with a small legend, or a
  thermometer beside the map title on wide screens.
- **Plate boundaries toggle** only if it can be done from the model's topologies in under 150 KB.

## Release 6 — Custom sprites with PixelLab (blocked on the API token)

**23 Nov 2026: superseded by Release 12.1.** PixelLab makes pixel art only (16–768 px), which suits the game
better than the atlas. The art decision is now in 12.1; the method notes below still hold if pixel art is chosen.

**Blocker.** The token has not been saved: the secure form was declined or could not be shown, twice.
Evan adds it himself in the cloud environment's settings (environment menu in the session title bar →
Edit → Network secrets) for host `api.pixellab.ai`, as a bearer token. Never ask for it in chat.

**Method — reuse what Groundwork learned** (`px/pixellab.py` in the Groundwork repository):

- Endpoint `https://api.pixellab.ai/mcp`, tool `create_map_object`: one credit per image (about
  2,000 per cycle). `create_1_direction_object` costs 20–40; do not use it.
- **Generate at 192 px and scale down**; small canvases smear detail.
- Put every decision in one batch; a small tweak is lost in the generator's variance.
- One style suffix on every prompt so the set looks like a set: side view, facing right, single
  animal, transparent background, clean pixel art, readable silhouette.

**Pilot (12 credits, then stop and show Evan):** Tyrannosaurus rex, Triceratops, Stegosaurus,
Brachiosaurus, Velociraptor (feathered), Spinosaurus, Woolly Mammoth, Smilodon, Dunkleosteus,
Anomalocaris, Dimetrodon, Tiktaalik. Prompts must follow the card's own facts (feathers, posture,
proportions) — a sprite is a claim about the animal. Write `tools/sprites.py` (batch file in,
PNGs out to `tools/sprites/`, a contact sheet on light and dark), commit the PNGs, and embed them
as one packed sheet used by the cards and the map markers, with emoji as the fallback.

**Do not** generate all 616 before Evan has seen the pilot sheet and chosen a style.

## Release 7 — Finds, second pass

- **"Named in" chart.** Add `named: <year>` to every dinosaur (from the naming paper attached in
  Release 1) and draw dinosaurs named per decade. The point for kids: most were named in their
  parents' lifetime.
- **Quiz questions from finds** (`quiz.js`): who found it, what did they get wrong, which came first.
- **More finds**, each sourced: Hooke 1665; Gesner 1565; Ötzi 1991; Java Man 1891; La Brea; the
  Karoo; Messel; Dinosaur Provincial Park and the Sternbergs; Ghost Ranch; Dorothy Garrod at Mount
  Carmel; the Leakeys at Koobi Fora; Patagotitan 2014; Yutyrannus 2012; the Dakota "mummy".
- **Who found it — on the cards.** A one-line "Found by" on animal cards that have a find.

## Release 7b — Family trees, second pass

The tree view (`data_trees.js`, `treeHTML()` in `app.js`) hangs every animal on the branch with the
longest matching lineage path, so a new tree is mostly data.

- **More trees**, each with two or three verified sources and a "where the experts disagree" note:
  fish to four legs (lobe-fins → Tiktaalik → early tetrapods → amphibians and amniotes); the ruling
  reptiles (crocodile line, pterosaurs, dinosaurs — one tree that shows pterosaurs are *not*
  dinosaurs); sea reptiles (ichthyosaurs, plesiosaurs, mosasaurs — three separate returns to the
  sea); whales from hoofed mammals; elephants; horses; arthropods. The human family already has its
  chart in the Humans tab; link the two both ways.
- **Split the mammals properly.** The Mammals branch currently lists its 28 groups as a flat fan of
  twigs. Give it real structure: egg-layers, pouched mammals, placentals and the four great
  placental branches, with the extinct groups placed (and marked uncertain where they are).
- **Check every "＋ new feature" line against a source** (Release 1 standard). They were written from
  general knowledge and reviewed for plausibility, not yet each tied to a paper. The same goes for
  the 44 animals added with the trees: 25 of them cite the paper that named or described them; the
  sizes, dates and one-line facts of the rest need the Release 1 treatment.
- **A time-scaled drawing.** The outline view works on a phone; on a wide screen a real branching
  diagram with time left to right would show *when* each split happened. Split dates must come from
  a published dated tree, not be estimated here.
- **Link from the cards**: a "🌳 See it on the family tree" button on every animal that has one.

## Release 7c — The other families (asked for by Evan; designed, not built)

Evan asked for the synapsid treatment — a tree, plus the missing members — for the other families.
The design was worked out on 15–16 Nov and nothing has been built yet. Build it as data in
`data_trees.js` plus a new `data_branches.js` for the animals.

- **Two of the three new trees shipped 16 Nov** (*From fish to four legs* and *The reptile tree*, built
  from animals already in the app, with `link` branches between trees and a “Family tree” button on
  every card). Still to do: *Jointed legs* (arthropods), and the ~30 animals for thin families below.
- **Originally planned:** *From fish to four legs* (early chordates → jawless fishes → jaws → bony fishes
  → lobe-fins → fish with limbs → four-legged animals → the egg laid on land, ending in two link
  branches that open the mammal tree and the reptile tree). *The reptile tree* (early reptiles;
  lizards, snakes and the mosasaurs that belong with them; turtles; the sea reptiles, with their
  uncertain place stated; then the ruling reptiles splitting into the crocodile line and the bird
  line — pterosaur cousins, pterosaurs, dinosaur cousins, dinosaurs). *Jointed legs* (lobopodians →
  Opabinia → radiodonts → true arthropods: trilobites, the pincer-mouths, the jaw-biters).
- **Give the Mammals branch real structure** in place of the flat fan of 28 twigs: egg-layers; the
  extinct side branches; pouched mammals; placentals in their four great groups (Africa's mammals,
  the sloth-and-armadillo group, primates-and-rodents, and the northern group that holds bats,
  carnivores, hoofed mammals and whales), with an honest "placement uncertain" branch.
- **A `link` field on a branch** that opens another tree, and a "🌳 See it on the family tree" button
  on every animal card.
- **About 30 animals for thin families**, each with the paper that described it: pterosaurs
  (Anurognathus, Dsungaripterus, Tapejara, Anhanguera, Ctenochasma, Cryodrakon from Alberta,
  Caelestiventus, Kunpengopterus) and their cousins (Lagerpeton, Scleromochlus); the crocodile line
  (Protosuchus, Terrestrisuchus, Carnufex, Dakosaurus, Pakasuchus, a phytosaur); sea and other
  reptiles (Cartorhynchus, Stenopterygius, Dinocephalosaurus, Albertonectes from Alberta,
  Polycotylus, Platecarpus, Odontochelys, Najash); amphibians and early tetrapods (Elpistostege from
  Quebec, Diadectes, Gerobatrachus, Triadobatrachus, Metoposaurus, Koolasuchus, Beelzebufo).

## Release 0c — Make the map feel alive (Evan, 17 Nov: "make the map feel like nothing else, like it's alive")

Shipped so far: wakes behind drifting land, light on the water, eruptions and impacts, animals that
rise and fade, flick momentum, fly-to, stories and extinction scenes. In order of impact, next:

1. **Life that moves.** Herds and migrations drawn as soft moving trails where the evidence supports
   them: mammoths and people across Beringia, wildebeest-like grazers on the Ice Age steppe, whales
   along today's routes. Each path needs a source; draw only what a paper says moved.
2. **Seasons and daylight.** A slow day/night terminator on the globe and a yearly pulse of sea ice and
   snow at the poles in the last few thousand years — the planet breathing. Pure astronomy, no claims.
3. **Ice Age cycles that breathe.** Animate ice sheets growing and shrinking with the sea-level curve
   already in the page, instead of stepping.
4. **Ocean currents.** Flowing particles along today's great currents (Gulf Stream, Kuroshio, the
   Antarctic Circumpolar) for recent times, from a published current climatology; earlier only where
   a reconstruction exists.
5. **Weather of deep time.** Gentle cloud bands in the tropics and storm tracks, shifting with the
   reconstructed temperature — labelled as an illustration.
6. **Sound, off by default** — wind, surf, an eruption's rumble. Ask Evan first.
7. **WebGL map** for smooth 3D zoom and lit relief (see the render discussion of 17 Nov) — the biggest
   single step, several sessions.

## Release 7d — Finding your way around (navigation)

The content has outgrown six tabs and a list. In order of value:

1. **Search everything.** One box that finds animals, humans, cultures, drowned sites, finds,
   periods, places and family-tree branches, and goes there. Today's box only searches animals.
2. **A front door.** A first screen (and a Home button) with four or five ways in: *Your story*,
   *Pick a time*, *Pick an animal*, *How do we know?*, *Where was my town?* — instead of landing in
   the Jurassic with a list.
3. **More journeys**, since they are cheap to write and are the easiest way in: the Ice Age world;
   the first people in the Americas; from dinosaur to bird; the return to the sea (whales); the
   Cambrian explosion. Add journey sources under `j:<id>` and show them on the last stop.
4. **Deep links for everything**: finds, tree branches, journeys and stops in the address bar, so a
   page can be shared at an exact place.
5. **"Related" on every card**: its family-tree branch, its find, what it ate and what ate it (from
   the food webs), and who else lived then — so every card leads somewhere.
6. **Two reading levels**: a short card for a six-year-old, the full one for everyone else.

## Release 7e — The living map, second pass

Shipped so far: wakes, light on the water, eruptions and impacts. Next, in order:

- **Extinction scenes, second pass.** Seven scenes shipped (`SCENES` in `app.js`). To add: the
  end-Guadalupian crisis (about 260 Ma, Emeishan Traps) and the Carnian rains (233 Ma) as smaller
  events; a scene for the Late Devonian's second crisis; palaeogeography under the scenes once
  Release 2 lands (the seaway matters for the asteroid's tsunami); and check each scene's timings
  and colours with Evan and the kids — they were tuned from still frames.
- **Ice that breathes**: animate the ice-sheet edge as the Ice Age cycles pass, rather than stepping.
- **A terminator line and soft daylight on the globe view**, turning slowly while idle.
- **Markers that arrive**: a short rise-and-settle when an animal first appears as time moves, and a
  fade when it goes extinct — so scrubbing through an extinction visibly empties the map.
- **Sound, off by default**: one low tone for eruptions and impacts, wind over ice. Ask Evan first.
- **Ancient shorelines (Release 2)** remain the biggest visual gain; the motion will look far better
  on real palaeogeography.

## Release 7f — History, second pass (empires, kingdoms and beliefs)

Shipped: `data_history.js`, shown in the Humans tab once the timeline is inside the last 5,500 years.
Next, in order:

1. **Better borders.** Seven empires now shift (Rome, Persia, Han, the Caliphates, the Mongols, the
   Ottomans, the Inca: two to five hand sketches each, switched by date). The other eighteen still show
   one sketch of greatest reach for their whole life — Russia, Qing, the Mughals and Maurya most need
   stages next, and the Mongols need the four khanates after 1294. The open
   `historical-basemaps` dataset on GitHub (reachable from here) has world borders at about fifty
   dates, which would let empires grow and shrink truthfully. It is GPL-3.0, so embedding it puts
   that licence on the page — **ask Evan** before using it. Until then, do not animate the sketches'
   size: that would claim borders nobody has data for here.
2. **Fill the gaps.** Missing and worth adding, each with a source: Sumer's city-states, the Hittites,
   Kush and Nubia, Carthage, Alexander's empire and its successors, the Parthians and Sasanians,
   Byzantium, the Vikings, Ghana and Songhai, Great Zimbabwe (a culture card exists), Benin, Ethiopia
   after Aksum, the Khmer (a culture card exists), Japan, Korea, Vietnam, the Olmec, Teotihuacan,
   Tiwanaku and Wari, the Mississippian towns, the Comanche and Lakota, Hawai‘i and Tonga, the
   Portuguese, Dutch and French empires, the Soviet Union, and the countries of today.
3. **Beliefs.** Add Mesopotamian religion, Manichaeism, Tengrism (the sky-god of the steppe), Yoruba
   religion and its Atlantic descendants, the Dreaming of Aboriginal Australia (with care, and from
   published Aboriginal-authored sources), Mormonism, and "no religion" as a modern position. Give
   Christianity and Islam their main branches. Tie each belief's "today" figure to the one book
   already cited, or to a newer published count.
4. **Read every card with Evan before his kids do.** The belief texts were written to be fair and
   plain, in each tradition's own terms; a family will have its own view of what is right for its
   children, and this is exactly the content where that matters. Change whatever he asks.
5. **Sources.** 24 of 27 empires cite something (not yet: the Greek city-states, Srivijaya, the
   Aztecs) and 10 of 17 beliefs (not yet: the gods of Egypt, Greece and Rome, the Maya and Aztecs and
   the Norse; Confucianism, Daoism, Shinto); the stories and "what it left
   us" lines are from general knowledge. Give each the Release 1 treatment (history sources are
   mostly books — the checker accepts books and chapters registered in Crossref).
6. **Spheres of influence beyond borders.** Evan asked for "shifting boundaries of influence". Borders
   are done for seven empires; still to do is influence that was never a border: where each belief
   was the main one at a few dates (sketched and dated like the empires, and handled with the same
   care as the belief cards), the reach of languages and scripts (Greek, Latin, Arabic, Chinese
   characters, Sanskrit), and trading spheres such as the Swahili coast and the Hanseatic towns.
7. **More routes and works.** Routes: the Amber Road, the Tea Horse Road, the Hanseatic League, Roman
   grain ships, Polynesian voyaging (a culture card exists), the Columbian Exchange as an animation of
   crops and animals crossing. Works: Göbekli Tepe (a culture card exists), Mohenjo-daro's drains,
   Angkor's waterworks, Great Zimbabwe, the moai, the printing press, vaccination, the Green
   Revolution, the Human Genome Project. Sea routes are drawn as straight hops between ports and some
   cut corners over land — give them more waypoints.
8. **A history journey** ("Six thousand years in ten stops"), and writing systems and inventions as a layer.
9. **Sources.** 3 of 11 routes and 6 of 26 works cite a paper; the rest are from general knowledge.

## The name

Changed on 16 Nov 2026 to **Before Us — a deep-time atlas of Earth, life and people**, in the page
title and header. Evan liked the deep-time angle and said yes to a distinct name carrying it in the
tagline; if he meant something else it is one line in `body.html` and two in `assemble.mjs`.
Not done: a trademark check on the name, and renaming the repository or `dino-explorer.html` — that
changes the live address, so **ask Evan** first.

## Release 10 — Kin through time, and life at the site (Evan, 19 Nov: “if you pick an elephant we should see a view option for all those types of animals through time … when we zoom you see the creatures there, herds, individuals, environment features … Spinosaurus chilling in the swamps”)

1. ~~Kin through time~~ **Shipped 23 Nov 2026.** Was: (buildable now). On every animal card, a button: “All elephants and their kin
   through time”. It opens the range chart filtered to the card’s family branch (`c.path`), every member
   a bar on one time axis, and puts every member’s fossil sites on the map at once, each pin marked
   with its age. Tapping a bar goes to that animal and its time. Works for any branch with 3+ members.
2. **Life at the site** (needs new data, and rules first). Zoomed in on a fossil site at its own time,
   the map shows the animals found there in their setting. Rules, so it stays a museum and not a game:
   - The setting comes from the rock: each site gets `rock` (river sandstone, lake shale, reef
     limestone, beach sand, volcanic ash) and `setting` (river channel, swamp, lake, coast, dunes, forest),
     each with a source. Plants only where fossil plants or pollen are known there.
   - **A herd is drawn only where the evidence shows one** — a bonebed of one species, parallel
     trackways, a nesting colony (Maiasaura, Centrosaurus, Ashfall’s Teleoceras). Otherwise one animal.
     New field `social: [kind, evidence, ref]`.
   - Who ate whom at the site from direct evidence first (stomach contents, bite marks, coprolites),
     then from size and teeth — the second kind labelled as inferred. This also feeds the food webs.
   - Sizes are drawn to scale against each other; every animal has a label; the scene is captioned
     “a picture built from the finds at this site” and says what is guessed.
   - First sites: the Kem Kem (Spinosaurus in the river channels, with sawfish, coelacanths and
     crocodile relatives — Ibrahim et al. 2014, 2020), Hell Creek, the Morrison, Messel, Ashfall, La Brea.
3. Pictures for the scenes come with Release 6 (custom sprites) — until then, the map’s own icons.

## Release 11 — Back to the birth of the Earth (Evan, 23 Nov: “go back to the proto-Earth, before the Moon collided”; “Earth like a geoid, the real shape, as an option”)

The honest map runs out in steps; each step is said on the page.
1. ~~1000 → 720 Ma~~ **Shipped 23 Nov 2026.** Was: (Rodinia breaking up). Merdith et al. 2021 already covers it — the site stops at 720 Ma
   only because `MAXT = 720` in `tools/build_plates.py`. Model on Zenodo 4485738 (CC BY 4.0). Rebuild the plates,
   seas (PaleoDEMs stop at 540 Ma, so before that land only), labels, timeline (Tonian), and the benchmark.
2. ~~1800 → 1000 Ma~~ **Shipped 23 Nov 2026.** Was: (Nuna/Columbia). Cao et al. 2024, “Earth’s tectonic and plate boundary evolution over
   1.8 billion years”, full-plate model on Zenodo 13628813 (CC BY 4.0). Check it joins Merdith at 1000 Ma;
   say on the page that these maps are far less certain.
3. ~~4567 → 1800 Ma: no map exists of where the land was.~~ **Shipped 23 Nov 2026, except the impact scene (3b).**
   Was: Draw no continents; show what the evidence says
   instead, each with a verified source: the Solar System’s first solids (4.567 Ga), the Moon-forming impact
   (~4.5 Ga, a model — versions argued over), the oldest crystals (Jack Hills zircons, 4.4 Ga), the oldest
   rocks (Acasta, ~4.0 Ga), the oldest stromatolites (~3.5 Ga), the Great Oxidation Event (~2.4 Ga), the
   Huronian ice ages. A scene for the impact, like the extinction scenes, labelled as a model.
3b. ~~The Moon-forming impact as a scene.~~ **Shipped 23 Nov 2026** (“How the Moon was made”, Geology tab). Was: A Geology-tab story (`data_stories.js`, `STORY_SCENES`) from
   4,567 to ~4,400 Ma: dust and rock gathering, a Mars-sized body (Theia) striking, a ring of debris, the Moon
   forming close and drifting outward, the surface cooling to oceans. Every frame captioned, and the card says
   which parts are a model and argued over (giant-impact versions: Canup & Asphaug 2001; ages: Barboni et al.
   2017 and later work). It draws over the map's empty sphere; it must not show anything the card does not say.
4. ~~The real shape (today only).~~ **Shipped 23 Nov 2026** (EGM2008 rather than EGM96: it has a published paper; bumps 10,000× rather than 8,000×). Was: Flattening is 21 km at the poles (0.3%) and the geoid’s bumps are ±100 m —
   invisible unless exaggerated. A globe toggle, “today’s gravity shape, exaggerated about 8,000×”, from EGM96
   or EGM2008 (Zenodo 14537811, CC BY 4.0). Not drawn for the past: no gravity model of ancient Earth exists.

## Release 12 — A visual step forward (planned 23 Nov 2026; Evan: “what else to visually take a step forward”, “set up a plan for when our session resets”)

Research done in the planning session is written into each step, so none of it needs repeating.

### 12.0 — The gravity shape at real size — **shipped 24 Nov 2026** (see Shipped)
- In the Geology card “The real shape of the Earth”, a slider from 1× to 20,000× (default 10,000×), so a reader can
  shrink the bumps to real size and watch the lumpy globe become a perfect ball. `GEO_X` in `engine.js` becomes a
  setting (`WorldMap.setGeoidScale(x)`); `GEO_FIT` follows it; the legend reads “bumps N× taller”.
- Add the comparison Evan liked, to the card’s “Too small to see”. On a 30 cm classroom globe: the equator bulge is
  about 1 mm, Everest about 0.2 mm, the deepest trench about 0.26 mm, the gravity bumps about 0.0025 mm (thinner
  than a hair). These are sums from the card’s own numbers (radius 6,371 km), and the text should say so.
- Checks: at 1× `_limb()` ratio < 1.001; at 20,000× > 1.2; the legend follows the slider; phone screenshot.

### 12.1 — Real animal art instead of emoji — **Evan chose silhouettes, 24 Nov; the Kem Kem scene and the pilot shipped** (see Shipped)
**Where it stands (24 Nov).** `tools/build_silhouettes.py` asks PhyloPic for each animal in its `WANT` list, then for
each broader group in turn, keeps only CC0, public domain and CC BY 3.0/4.0, and writes `tiles/sil/<key>.png` and
`SIL` (`silhouettes-data.js`: file, size, artist, licence, the taxon shown, `level` own | member | relative, image
id). `--only k1,k2` rebuilds just those keys. An `img=<uuid>` entry in `WANT` pins one picture when the first pick
is wrong. The build refuses a cast entry whose silhouette or file is missing. Lessons:
- **Check every pick by eye.** First picks included a skull only (Alanqa), a head-on Dimetrodon, a swimming
  Spinosaurus (the scene shows it at the edge), and a burbot for Tiktaalik (a name match on the wrong genus: the
  genus check now stops that).
- **The view must match the measure.** A pterosaur sized by its wingspan is drawn from below with its wings spread,
  so the drawn width is the wingspan. PhyloPic’s three ornithocheirids are side views, so Siroccopteryx uses
  *Pterodactylus* from below. Pteranodon’s crest would have claimed a head Siroccopteryx did not have.
- **Say whose outline it is.** For a group (“side-necked turtles”, “an abelisaurid”) the outline is one named member,
  and for a missing genus it is a relative. The page names the animal the outline shows.
- PhyloPic’s API answers “no match” with a 404, and lists only the first page of images per group, which was enough so far.

What was found (23 Nov):
- **PixelLab** (`api.pixellab.ai`, reachable; REST v2 with a Bearer token, or its hosted MCP server at
  `/mcp`) makes **pixel art only**, 16–768 px. Its prices are in “generations”: a basic image is about 1
  (roughly $0.008 in credits) and the better models 5–25. A first image for all 769 animals would be roughly
  800–5,000 generations. The token is **still not saved**: `get_environment` lists no network secrets.
  Pixel art suits the planned game (Release 9). On the atlas it would clash with the parchment-and-ink look,
  unless the whole map moved to a pixel style.
- **PhyloPic** silhouettes are ink-black outlines drawn by scientists and artists from specimens, and they fit
  the atlas and field-book backdrops. Licences are mixed: use only CC0 and CC BY, with each artist credited on
  the card, and never BY-SA or NC. **Not reachable**: `api.phylopic.org` and `images.phylopic.org` must be
  approved, and no copy exists on Zenodo or GitHub (searched 23 Nov).

**The recommendation to put to Evan:** silhouettes for the atlas (map pins, cards, site scenes) and pixel art
for the game. The alternatives are pixel art everywhere, or keeping the emoji. **What he must do himself:** for
silhouettes, approve the two PhyloPic hosts in the environment’s network settings; for pixel art, add the
PixelLab API token as a network secret for `api.pixellab.ai` (never pasted in chat).

Then (steps 2 and the scene are done; 1 and 4 are next):
1. **Coverage first (silhouettes).** `python3 -I tools/build_silhouettes.py --coverage names.json` counts it (dump the
   names from the page’s `ALL`). For all 745 animals and 24 humans, find a CC0 or CC BY silhouette at
   species, then genus, then family level. A family-level outline is labelled “a relative’s outline”. Report
   the counts before drawing anything.
2. **Pilot sheet, then stop for Evan.** Use the 12 pilot animals of Release 6, on light and dark backdrops,
   at map-pin and card sizes.
3. **Rules.** A picture is a claim, so it follows the card: feathers, posture, proportions. Where the shape is
   argued over (Spinosaurus), use the cautious version, and the card’s `debate` says why. Keep emoji as the
   fallback. Credit every artist and licence in the card’s sources. Build to a packed sheet in the page, or to
   `tiles/` if it is large, with a check that every picture has a licence on the allowed list.
4. **Cards and map pins.** Show the silhouette on each card (with its credit line under the sources) and as the map
   pin at a size that stays readable at 24 px. Keep the emoji where no silhouette exists, and count those on the page.
   For humans, check each outline against the card (posture, tools); none is drawn yet.

### 12.2 — Life at the site: the Kem Kem first — **the Kem Kem shipped 24 Nov 2026** (see Shipped); next sites below
- **Data.** A new `data_sites.js`, one record per site: `id`, `name`, `at` [lat, lon], `t` (Ma), `rock`,
  `setting`, `plants` (only where fossil plants or pollen are known), and `animals`. Each animal has `name`
  (must match the page’s animal list or the site’s source list), `role` (in the water / at the edge / on the
  bank / in the air), `size_m`, `social` [kind, evidence, ref] (a herd only with a bonebed or trackways), and
  `ate` [what, evidence: direct | inferred, ref]. Sources go under a new target prefix, `z:<site id>`, added
  to `okTarget` in `assemble.mjs` and to the prefix list in `CLAUDE.md`.
- **Sources for the Kem Kem, all checked in Crossref on 23 Nov** (add them to `refs_wanted.txt` and verify):
  - Already verified: `ibrahim2014` (semiaquatic adaptations), `ibrahim2020` (the tail).
  - The fauna list and the setting: Ibrahim et al. 2020, ZooKeys, “Geology and paleontology of the Upper
    Cretaceous Kem Kem Group of eastern Morocco”.
  - The puzzle of too many big predators: Läng et al. 2013, Palaeogeography, Palaeoclimatology,
    Palaeoecology, “Unbalanced food web in a Late Cretaceous dinosaur assemblage”.
  - The debate: Hone & Holtz 2021, Palaeontologia Electronica, “Evaluating the ecology of Spinosaurus:
    shoreline generalist or aquatic pursuit specialist?”; Fabbri et al. 2022, Nature, “Subaqueous foraging
    among carnivorous dinosaurs”; and Sereno et al. 2022, eLife, “Spinosaurus is not an aquatic dinosaur”.
    For Sereno, **pin the DOI in the sixth column**: a title search finds the peer-review notes first. The
    article itself is type journal-article in Crossref (checked).
- **The scene** is a window over the map, like the Moon story. It opens from “See life here” on the site’s
  card, or from the site’s pin when zoomed in, and the clock goes to the site’s time.
  - The picture is a river channel: water, sandbanks, the bank. Every animal sits in its `role`, drawn to
    scale against the others, and has a label. Take every name from the ZooKeys list.
  - Spinosaurus is shown wading at the water’s edge. All four papers allow that much; how much it swam is
    the debate, and the card says so.
  - Caption: “a picture built from the finds at this site · poses and plants are guesses where not stated”.
  - “Still debated” covers how aquatic Spinosaurus was, and why there are so many big predators (one idea is
    bones from different times and places mixed together; Läng et al.).
  - ~~Until 12.1 lands it uses the map’s own icons~~ It draws PhyloPic silhouettes since 24 Nov: lengths to scale, the
    unknown ones paler.
- **The benchmark.** `kem-kem-land` is one of the three facts still missing. While building the scene, look at
  the coast there and see whether the river can be placed on land honestly.
- **Checks.** The scene opens at the site’s time. Every animal drawn is in the site’s sourced list. Sizes keep
  the cards’ ratios (within 10%). Every label and the caption are present. It runs on a phone.
- **Next sites, in order:** Hell Creek, Messel, La Brea, Ashfall (a herd is allowed: a bonebed of one
  species), the Morrison.

### 12.3 — Ancient landscapes: climate zones on the land (data found; test it before drawing it)
- **The candidate.** Pohl, Wong Hearing, Franc, Sepulchre & Scotese 2022, Data in Brief, “Dataset of
  Phanerozoic continental climate and Köppen–Geiger climate classes” (in Crossref). The data are Zenodo
  record 6620748, CC BY 4.0: one NetCDF or CSV per 20 Myr from 540 to 0 Ma, about 8 MB each.
  - It is a climate model (FOAM) run on the Scotese & Wright 2018 maps, the same maps the seas and terrain
    layers use.
  - The grid is 128 × 128 (2.8° of longitude by 1.4° of latitude). Arrays are stored **[lon, lat]**, and
    longitude runs 0–360.
  - Variables: `koppen`, plus monthly precipitation, soil temperature, evaporation and runoff.
  - **Class codes**, decoded from the figures PDF legend and checked against today’s slice (Sahara = BW,
    Amazon and Congo = Af, Greenland = EF): 1 ET, 2 EF, 3 Dw, 4 Ds, 5 Df, 6 Cw, 7 Cs, 8 Cf, 9 BW, 10 BS,
    11 Aw, 12 Am, 13 Af.
- **The caution found.** Today’s slice puts Paris and Siberia in tundra (ET) and central Australia in Cf.
  The model’s simple ocean carries no heat (so no Gulf Stream) and its orbit is simplified, so its
  high-latitude land is too cold. So:
  1. **Score it before drawing it.** Carry the model’s cells and the dated climate rocks (Boucot et al., already
     in the map) onto the same plates. Then score agreement slice by slice: salt and gypsum in dry (B), coal
     in humid (A, C, Df), bauxite and laterite in A or C, glacial deposits in E or D. Report the per-slice
     scores to Evan. If agreement is poor, stop there and say so.
  2. **If it passes, draw it.** Show only the five main groups (tropical wet, dry, temperate, cold, polar) as
     soft washes on the land, carried on our plates the way `build_seas.py` carries the seas, and blended
     between slices.
     - In “How this map is made” it is called a climate model’s sketch, with its score.
     - The rocks stay on top, as the evidence.
     - Record the score in the benchmark as a tracked number, not a ratchet: it measures the model, not us.
- **Rejected for now.** The PANALESIS atlas (Zenodo 19134591) is under review and is built on a different
  plate model. Guo 2026 (vegetation since plants reached land) does not include its model output.

## Release 13 — More events, period by period (backlog in `docs/EVENTS.md`; Evan, 23 Nov: “identify more event areas that we could expand upon for each period possible”)

`docs/EVENTS.md` counts what each period has, and lists candidates by period. Each candidate has a kind (a
timeline pin, a spark on the map, a smaller crisis, a story, a fossil site, or an ambient picture), and a source
status: 29 papers were found in Crossref on 23 Nov; the rest are marked “?”. Suggested batches, one release each:
1. ~~Empty and thin periods.~~ **Shipped 23 Nov 2026** (24 sourced events; see Shipped). Was: Pins for the
   Permian (none yet; its two sparks have no events) and the Neoarchean (none), then the Silurian,
   Mesoarchean, Ectasian and Stenian, with a check on the minimum per period.
2. ~~Sparks.~~ **Shipped 23 Nov 2026** (13 new; see Shipped). Was: About ten, Paleozoic to Holocene, every one
   named on the map, with a check that every spark has a timeline event and a source.
3. ~~The Cretaceous~~ **Shipped 23 Nov 2026** (eight new events; see Shipped). Was: seven or more pins for its 77 Myr.
4. ~~“Smaller crises” in the Extinctions tab.~~ **Shipped 23 Nov 2026** (13; see Shipped).
5. ~~Snowball Earth as a story~~ **Shipped 23 Nov 2026**, and ~~the Missoula floods~~ **shipped the same day** (see Shipped).
6. **What is left** is the lines in `docs/EVENTS.md` still marked “?” (no paper found yet), plus the fossil sites,
   which belong to Release 12.2.

## Data hosts worth approving
`api.phylopic.org` and `images.phylopic.org` were approved on 24 Nov. Still closed: `paleobiodb.org` and `macrostrat.org` (fossil collections with their environments and rocks — the basis for
Release 10’s site scenes and Release 8), `nowdatabase.org` (Cenozoic mammal localities with tooth crown
height: an independent test of where grassland was, for the benchmark). Evan approves hosts in the
environment’s network settings.

## Release 8 — Real fossil occurrences (needs one host approved)

Show every recorded fossil of a selected animal or group as dots, from the Paleobiology Database
(`paleobiodb.org`, CC-BY; not reachable today — **ask Evan**). Fetch at build time, thin, pack, and
cite PBDB plus the date of download. Use it also to audit our hand-entered fossil sites.

## Release 9 — The game (not started; needs Evan's go-ahead)

An original side-scrolling evolution game in five acts, each ending in a mass extinction, where the
survivors are not the strongest but the best fitted to what comes next. First a one-page design
document (`docs/GAME.md`), then a Devonian demo: one level, one playable fish, three body upgrades,
the Late Devonian extinction as the ending. It reuses the page's animal data and, once Release 6
exists, its sprites. It must not copy any existing game's name, characters, levels or art.

## Later, unordered

- Kid mode: larger type, shorter cards, read-aloud with the browser's speech synthesis.
- Split the page when it passes about 2 MB: load plate, shelf and palaeogeography data as separate
  files. Until then one file is a feature (it works offline and from a download).
- A printable "passport" of animals met and periods visited — only if it stays free of streaks and
  rewards.
- Translations.

## Climbing the benchmark (`tools/bench`) — the standing to-do list

The baseline (18 Nov 2026): poles 88.3% · ice 90.0% · salt 93.3% · tropics 70.5% · seaLife 84.6% ·
landLife 93.6% · facts 23/26. Next moves, best first:
1. **tropics (70%)** — which bauxites, laterites and kaolins land above 40°? Separate real greenhouse
   cases (Paleocene–Eocene high-latitude laterites are known) from plate or dating errors; add a fact
   for each understood case.
2. **The three missing facts** — Gogo reef, Isotelus at Churchill, the Kem Kem rivers: all lost to the
   1° coast. Try the 0.1° PaleoDEMs near fossil sites before anything else.
3. **poles (88%)** — list the worst-fitting poles by plate and age; the Merdith model's reference frame
   changes near 250 and 410 Ma (see the jumps in the geometry review).
4. **More facts.** Every story, extinction scene and journey stop makes claims about where things were:
   turn each into a fact with its sources. Aim for 60+.

## Shipped

- **24 Nov 2026 — Silhouettes from PhyloPic: the Kem Kem scene and the pilot (Release 12.1, first part).** Evan chose
  silhouettes. `tools/build_silhouettes.py` fetches them with their credits (CC0, public domain or CC BY only) into
  `tiles/sil` (24 pictures, 272 KB) and `SIL`. The Kem Kem scene now draws every animal as a silhouette in the
  atlas’s ink, with the swimmers under the water. The four with a known length are drawn to scale (Spinosaurus to
  Carcharodontosaurus is 17 : 12.5, and a pterosaur’s width is its wingspan). The rest are paler and marked “size
  not known”. A “Silhouettes” credit line names every artist and licence, with links. Where the outline is a
  relative’s (5) or one member of a group (2), the cast list names it. The pilot covers 11 more animals (T. rex to
  Tiktaalik), ready for the cards. One new check (289).

- **24 Nov 2026 — Life at the Kem Kem rivers (Release 12.2, the first site).** The Spinosaurus and Carcharodontosaurus
  cards open a scene over the map: the rivers of south-east Morocco about 100–95 million years ago.
  - **Who is in it:** 13 animals, every one from Ibrahim et al. 2020. Four big meat-eating dinosaurs and
    Rebbachisaurus are on the bank; Spinosaurus stands at the water’s edge; turtles sit on a sandbank. In the
    water are Elosuchus, the sawfish-like Onchopristis, the giant coelacanth Axelrodichthys, a lungfish and a
    gar; two pterosaurs fly overhead. The conifers come from the petrified wood.
  - **Sizes:** a strip of bars shows the known lengths to scale beside a grown-up person. Animals with no known
    length get no bar and say “size not known”; the pictures themselves are not to scale, and the caption says so.
  - **Phones:** numbers stand in for the names, matching the numbered list below the picture.
  - **Below the picture:** the place, the rock, the plants, who was found, how we know, and what is argued over
    (“Stromer’s riddle”, and how much Spinosaurus swam, with both sides cited).
  - **The source:** the paper’s full text came from its Zenodo copy (record 19068755, CC BY 4.0). PubMed
    Central blocked automated reading with a CAPTCHA, which was not worked around.
  5 new references (594). 288 checks.

- **24 Nov 2026 — The gravity shape at real size (Release 12.0).** The “real shape” card has a slider from real size to
  20,000×, on a log scale so that 1×, 10×, 100× and so on each get room.
  - At 1× the globe is a round ball; the legend and the card say how much taller the bumps are drawn.
  - “Too small to see” now measures on a 30 cm classroom globe: the bulge at the equator about 1 mm, the biggest
    gravity bumps about 0.0025 mm. Both are sums from the card’s own numbers.
  - Fixed on the way: the globe’s colours dropped out near the edge at large stretches (the inverse projection
    is now kept on the disc), and the paper behind the globe kept an old outline when only the stretch changed.
  283 checks.

- **23 Nov 2026 — No ice-age water on Nuna and Rodinia.** Evan saw Hudson Bay and the Great Lakes on the 1.7-billion-year-old
  continent. Before 540 Ma the land is today’s outline on its plates, so it carried today’s lakes and bays with it.
  - Where no seas map is in charge (before 540 Ma, and 3–2.6 Ma), today’s lakes are no longer cut out of the land:
    nearly all were made by the ice ages of the last 2.6 Myr.
  - Hudson Bay and the Baltic, basins the ice sheets pressed down and the sea then flooded, are filled in, each
    riding the plate under its shore.
  - The Black Sea and the Caspian stay until 540 Ma, where the seas maps take over.
  - The dotted “today’s coast” line and the seas maps (540–3 Ma) are untouched. “How this map is made” says so,
    and a check pins it. 282 checks.

- **23 Nov 2026 — The Missoula floods (Release 13, batch 6).** A seventh story: “The floods that carved the Scablands”,
  20,000 → 14,000 years ago.
  - The ice dam in Idaho holds back Glacial Lake Missoula, which fills, lifts the dam and breaks it.
  - The water crosses eastern Washington and runs down the Columbia gorge to the Pacific; it happens dozens
    of times, until the ice melts back about 15,000 years ago.
  - J Harlen Bretz, who said so in 1923 and was scoffed at, is proved right.
  - The lake, the dam and the routes are labelled sketches; the ice sheet is the map’s own reconstruction.
    The timeline has a sourced event for it.
  5 new references (589). 281 checks.

- **23 Nov 2026 — Snowball Earth (Release 13, batch 5).** A sixth story in “Watch the Earth being made”: “When the Earth
  froze over”, 722 → 632 Ma.
  - It follows the Franklin eruptions in Arctic Canada, then ice spreading from the poles, nearly 60 million
    years frozen, the carbon dioxide build-up, the second freeze, the great thaw with its cap carbonates, and
    life coming through.
  - The ice is drawn on the map whenever the clock is inside a freeze, whether or not the story plays
    (`AMBIENT`, `snowIce()`). It is labelled a sketch, with a strip near the equator marked “open water here?
    (argued over)”.
  - The Franklin eruptions are a new event and spark. “How this map is made” explains the ice.
  5 new references (584). 280 checks.

- **23 Nov 2026 — Smaller crises (Release 13, batch 4).** Under the great dyings, the Extinctions tab now lists 13 smaller
  crises, oldest first: the end of the Ediacaran creatures, Kalkarindji, SPICE, Ireviken, Lau, Hangenberg, the
  coal-forest collapse, the Capitanian, the Carnian rains, the Toarcian, the seas running short of oxygen 94 Ma,
  the 56-million-year warming and the Great Break.
  - Each is a timeline event with its papers; a tap goes to its time and shows them.
  - The Carnian and 56-Ma events now say what was lost, as their papers do.
  - The build refuses a crisis that is not a timeline event.
  8 new references (579). 277 checks.

- **23 Nov 2026 — The Cretaceous gets its events (Release 13, batch 3).** The Cretaceous had four timeline events for
  77 million years; with the eruptions of batch 2 and these eight it has 15. Each cites its papers:
  - the South Atlantic opening;
  - dinosaurs inside the Antarctic Circle at Dinosaur Cove;
  - Patagotitan, about 70 tonnes;
  - Spinosaurus’s rivers in the Kem Kem, and the puzzle of their many big predators;
  - mosasaurs ruling the seas;
  - Dinosaur Provincial Park;
  - baby dinosaurs nesting in the Arctic;
  - grass in dinosaur dung.
  A check keeps the Cretaceous at a dozen events or more. 8 new references (571). 275 checks.

- **23 Nov 2026 — More eruptions and impacts on the map (Release 13, batch 2).** The map’s sparks go from nine to 22.
  - New: Kalkarindji (511 Ma, the first big animal extinction), Viluy (the Late Devonian), Karoo–Ferrar (the
    Toarcian, in Africa and Antarctica), Paraná–Etendeka (before the South Atlantic opened), Popigai, the
    Columbia River, Ries, Yellowstone’s Huckleberry Ridge, Mount Mazama, Thera, Vesuvius and Tambora.
  - Every spark, old and new, now belongs to a timeline event with its papers, and tapping a spark shows
    them; the build refuses a spark without one.
  - Ontong Java is a timeline event only: the plates carry continents, not the Pacific floor, so its glow
    would have landed south of India. It was taken off the map and a check keeps it off.
  - Toba’s event no longer calls it “the largest” eruption of the last two million years; it is “one of
    the largest”, as its map label already said.
  16 new references (563). 274 checks.

- **23 Nov 2026 — More events: the empty and thin periods (Release 13, batch 1).** 24 new timeline events,
  each citing its papers. Timeline events can now carry sources (`n:<id>`), shown as links in the event’s popup,
  and the build refuses an event id with no verified source.
  - The Permian goes from none to six: the southern ice melting back, Mesosaurus (the drift clue),
    the dinocephalians, the Capitanian crisis with the Emeishan eruptions, the first gliding reptiles, and the
    start of the Siberian Traps.
  - The Neoarchean goes from none to three: fossil raindrops, a burst of continent-making, banded iron.
  - The Mesoarchean gains the oldest ice age and the Witwatersrand gold.
  - The Ectasian gains the Mackenzie dykes; the Stenian, the Lake Superior rift and the Grenville mountains.
  - The Ediacaran gains the Gaskiers ice age and Mistaken Point; the Cambrian, the first steps on land
    (Ontario).
  - The Ordovician gains Fezouata, the great burst of new species and the asteroid break-up.
  - The Silurian gains the Herefordshire fossils, the first land animals (Kerrera), Scotland meeting England
    and the Lau crisis.
  - A check keeps every period from the Ediacaran on at three events or more, and every older one at one or
    more.
  24 new references (547). 270 checks.

- **23 Nov 2026 — The real shape of the Earth.** On the globe, for today, the Geology tab’s new card turns on the Earth’s
  gravity shape (the geoid): the level the sea would settle at if it could flow under the land, 107 m below the smooth
  shape south of Sri Lanka and 86 m above it over New Guinea, with every bump drawn 10,000 times taller. From EGM2008
  (Pavlis et al. 2012; Zenodo copy, CC BY 4.0), averaged to 2° and smoothed. The globe itself takes the shape — land,
  labels and taps follow it — coloured blue for lower and orange for higher, with light and shadow on the bumps, a
  legend, and the deepest low and highest high named. The bulge at the equator is left out and the card says why; in
  the past the globe is round again and says the shape is for today only. 4 new references (523). 267 checks.

- **23 Nov 2026 — How the Moon was made.** A fifth story in “Watch the Earth being made” (Geology tab), played
  from 4,567 to 4,390 million years ago with the timeline zoomed to the Hadean: rocks and small planets falling
  into the molten young Earth, Theia striking a glancing blow, a glowing ring of rock and vapour, the Moon
  clumping from it and drifting outward, and the Earth cooling to oceans. It is drawn as a window into space
  inside the map’s frame, captioned “a picture of the computer models · not to scale”, and every glow is named.
  The card says how we know (Apollo rocks’ oxygen and zinc, the small iron core, lunar laser ranging) and what
  is argued over (four versions of the impact; an age from 4.51 to 4.35 billion years). 11 new references (519).
  258 checks.

- **23 Nov 2026 — Back to the birth of the Earth.** The timeline now starts 4,567 million years ago, when the
  first solids formed around the young Sun. Eight new spans — the Hadean, the Eoarchean, Paleoarchean,
  Mesoarchean and Neoarchean eras, and the Siderian, Rhyacian and Orosirian periods — each with insights and
  sources (the Moon-forming impact, the Jack Hills crystals and early water, the oldest rocks, the Great
  Oxidation Event and the Huronian ice). Before 1,800 Ma no map of the land is drawn: the map says “Nobody
  knows where the land was” (or, before 4.43 Ga, “No map exists this far back”, on a glowing sea), wrapped to
  fit on a phone. Life with no plate to ride is listed without pins: Isua (argued over), Dresser, Strelley
  Pool, Moodies, the Francevillian fossils (argued over) and Gunflint. A span with no named fossil says why
  (`lifeNote`). The reader’s own line starts at the birth of the Earth. 19 new references (508). Benchmark
  unchanged. 256 checks.

- **23 Nov 2026 — Back to 1.8 billion years: Nuna and the boring billion.** The map now starts 1,800 million
  years ago. Before 1,000 Ma the plates follow Cao et al. (2024), who carried Merdith et al. (2021) back to
  1.8 Ga; the last billion years stay exactly Merdith (the benchmark caught Cao’s small changes there, so
  they were not taken), and over 1,050–1,000 Ma the map eases from one to the other without a jump. The
  benchmark also caught a builder bug that would have drawn the older model’s blocks frozen in place for
  600 million years; fixed (a block counts only while it exists) and pinned by a check. Four new periods —
  Statherian (“The World of Nuna”), Calymmian, Ectasian, Stenian — each with insights, a food web and sources;
  life: Qingshania (1.63 Ga), the Gaoyuzhuang seaweeds (1.56 Ga, the oldest life big enough to see),
  Rafatazmia (marked as argued over), Tappania, Bangiomorpha (the oldest known sex, perhaps) and the
  Torridon lake microbes (the first known life away from the sea). The Ectasian has no named fossil and its
  card says why. 11 new references (489). Benchmark unchanged. 250 checks.

- **23 Nov 2026 — Back to a billion years: the Tonian and Rodinia.** The map and timeline now start at
  1,000 million years ago instead of 720: the plate model (Merdith et al. 2021) always reached that far,
  the site had stopped at the Cryogenian by choice. Plates rebuilt (220 families), and the seas and terrain
  layers rebuilt on them. A Tonian period card (“The World of Rodinia”) with sourced insights — Rodinia
  gathering around North America and breaking up, bare land, 19-hour days — and its life: the oldest
  fungus (Ourasphaira), the oldest green seaweed (Proterocladus), a possible 890-million-year-old sponge
  (marked as argued over), and amoebae in vase-shaped shells; a food web; six timeline events; a first
  stop for the reader’s own line and the drift journey; a Rodinia label. The map follows the model, where
  many blocks are still apart a billion years ago, and the card says which pieces belonged is argued over.
  Plants and seaweeds no longer say “Plant-eater”: they make their own food from sunlight. 6 new
  references (478). Benchmark unchanged. 245 checks.

- **23 Nov 2026 — Dragging the map, fixed.** Evan: “when I try to drag the map it’s super glitchy.” Measured:
  a full deep-time frame took 250–300 ms (most of it copying the WebGL terrain and a soft coastal glow), the
  globe redrew in full on every movement (about 4 frames a second), the flat map at full size froze while
  spun and then jumped, and the fading wakes forced full redraws even mid-drag. Now: while a hand is on the
  map the frames are light (about 4× quicker), decorations wait, and a spin of the flat map slides each row
  of latitude by exactly its own amount so the picture follows the hand; full quality returns 160 ms after
  it lets go. 241 checks.

- **23 Nov 2026 — Kin through time.** Evan: “if you pick an elephant we should see a view option for all
  those types of animals through time.” Every card now has “All 15 elephants & kin through time →” (or
  its own family: the deepest branch of its lineage with three or more animals). It opens the family on one
  time axis, oldest first, with the ones alive at this moment lit; on the map every relative’s fossil site
  appears at once, each with its age, faded when not alive now. Tapping one takes the map to its time and
  the view stays. 109 families qualify. 239 checks.

- **23 Nov 2026 — The Age of Mammals, chapter by chapter.** Evan: “the age of mammals, 65 million years
  to now, needs way more detail.” Two period cards covered 64 million years. Now the Paleocene (“The
  World Starts Over”), Eocene (“The Hothouse”), Oligocene (“The Big Chill”), Miocene (“Grasslands and
  Apes”) and Pliocene (“The Ape That Stood Up”) each have a chapter: the header, the map’s title and
  the Insights tab change at each epoch, every chapter with its own signs, how we know, why it matters,
  and sources (`data_mammals.js`). 16 new animals, each placed and sourced — the oldest primate-relative
  skeleton, the first penguins, a Balrog-named crocodile relative, Messel’s coloured moths, an 8 m
  toothed whale from Antarctica, the monkeys that rafted across the Atlantic, the oldest ape, Alesi,
  a buffalo-sized rodent, camels and a sweet-toothed bear in the Pliocene Arctic, the only hyena that
  reached the Americas (Paleocene 16 → 20, Oligocene 24 → 30). 9 more timeline events. The map now shows
  the Mediterranean dried to salt whenever the clock is inside the salinity crisis, not only while its
  story plays. 34 new references (472). 235 checks.

- **18 Nov 2026 — The last 3 million years, from the evidence.** Evan: “the rivers shouldn’t just
  disappear — we need more fact-based detail from 3 million years to now.” Three things were sketches
  and are now published data. **Sea level**: the dated shorelines for the last 30,000 years (Lambeck
  2014), the Spratt & Lisiecki (2016) stack of seven deep-sea records to 800,000 years (it replaced a
  hand-simplified curve), and Berends et al. (2021) to 3.6 Ma (it replaced a made-up 41,000-year wave).
  **Ice sheets**: the old map drew the full last-glacial ice for 2.6 million years without a break and
  removed it at 12,500 years ago; now PaleoMIST 1.0 (Gowan et al. 2021) every 2,500 years to 80 ka and
  Batchelor et al. (2019) for 12 moments to 3.6 Ma, each shown only while the sea level says the ice was
  that big — so the warm spells (the Eemian, MIS 11) have only Greenland’s ice. **Rivers**: today’s rivers
  are drawn back to 3 Ma, hidden under the ice; and when the sea was low they run on across the dry sea
  floor, traced downhill over today’s sea floor with the ice as a wall (`tools/build_shelf_rivers.py`):
  the Channel River (the Rhine joins it only when ice fills the northern North Sea, and only after the
  Strait of Dover was cut, ~450 ka), the Ur-Schatt down the Gulf, the rivers of Sundaland. The page says
  they are traced routes, not mapped channels. Nine new references (438). 229 checks.
  Next: Ice Age lakes (Release 4, item 3); Dalton et al. 2020 for the deglaciation of North America.

- **18 Nov 2026 — What helped people, and what threatened them.** Evan: “what would be a resource for
  humans at any given time and what would be a threat”. The Humans tab has a new panel, “At this time”,
  that follows the clock: two columns, what helped (a sharp edge from 3.3 Ma, fire, spears, a clean bed,
  clothes, food from the shore, boats and hooks, land bridges, tending wild grain, dogs, farming) and what
  threatened (being hunted, weather that would not settle, Toba, losing the big game, the coldest part of
  the Ice Age, the rising sea, living close together, salty fields, the 4.2 ka drought, the Black Death).
  Each opens to say how we know, where the evidence is, what is argued over (Toba cites both the
  volcanic-winter idea and the Lake Malawi core that found no winter), and its papers. Each starts at
  its oldest evidence, and the page says most began earlier. Data in `data_survival.js`, source target
  `v:`; nine new references (430). Next: pins on the map for where each one's evidence was found;
  helps and threats for the recorded-history era beyond Mesopotamia (the Little Ice Age, the Columbian
  exchange — both need sources first). 223 checks.

- **18 Nov 2026 — Sounds of the time.** Evan: “what about sounds of the time?” A 🔈 Sound button (off by
  default) plays a soundscape synthesized in the browser — never a recording — of only what there is
  evidence for: wind and waves always (the wind harder in a colder world; only wind in a Snowball
  Earth); insect song from 165 Ma, a ~6.4 kHz pure note in 16 ms pulses as rebuilt for the katydid
  Archaboilus musicus (Gu et al. 2012); bird calls from 67 Ma, after the oldest fossil syrinx, in
  Vegavis (Clarke et al. 2016). The page says birds and insects may have sung earlier, and that the
  calls are generic. Noise comes from a fixed seed. Next: frogs and crickets need sources before they
  sing; fire crackle from the first good evidence of fire; a quieter, filtered sea for inland places.
  215 checks.

- **18 Nov 2026 — Backdrops, and the water comes alive.** Evan: “options for a space backdrop or a more
  tactical workshop backdrop and a planetarium backdrop … a field book that's come alive … sparkle over
  water — weather or some effective and charming implementation?” A 🎨 button cycles five backdrops —
  Atlas, Field book (squared page, margin rule and an engraver's lined sea, after Lhwyd and Gessner),
  Workshop (a cutting mat under a lamp), Planetarium and Space (stars, a galaxy band, an atmosphere glow;
  the oceans deepen as seen from far off) — remembered on the device. While someone explores, glints
  flash on the water and clouds drift with today's wind belts (west in the tropics, east beyond); all
  of it is decoration, said so on the page, and stops for reduced motion. Map buttons are a little
  smaller on phones to fit the sixth. 211 checks.

- **18 Nov 2026 — Before modern science, expanded; what this atlas borrows.** Evan: “love the before
  modern science stuff, expand on that” and “inspiration and homage … when the very first fossils were
  being diagrammed … a field book that's come alive”. Seven new finds: fossil sea urchins kept as fairy
  loaves and thunderstones from the Old Stone Age to the Anglo-Saxons (McNamara 2007; Oakley 1965),
  Gessner's 1565 book of fossil pictures, the Quedlinburg unicorn (Leibniz's Protogaea; who drew it is
  argued over), Lhwyd's 1699 field guide (Roos 2018), William Smith's 1815 map, De la Beche's Duria
  antiquior painted to help Mary Anning (Sharpe 2022), and the Crystal Palace dinosaurs (Hales 2017).
  Steno's card now tells how his famous shark's head was borrowed from Mercati (Yamada 2024). Every find
  from 1500 to 1800 now has a source (21 new verified sources, 420). A new “What this atlas borrows”
  section in the Finds tab names nine inspirations and what each gave this page.

- **18 Nov 2026 — The benchmark.** Evan: “anchor your review on known discoveries, locations, events,
  features … to bootstrap and hill-climb … build systems to ensure this keeps getting better.”
  `tools/bench` scores the map against evidence it was not built from — 367 paleomagnetic poles
  (Torsvik et al. 2012), 3,390 climate rocks (Boucot et al. 2013, method of Cao et al. 2019), every
  fossil site's environment, and 26 named facts with sources — and the test suite refuses any change
  that makes a score worse or breaks a fact that held. The page shows the scores in “How this map is
  made”. `tools/review_geometry.js` walks the timeline for jumps, gaps, labels and terrain fit.

- **18 Nov 2026 — A review of the geometry through the whole timeline, and what it fixed.** Evan:
  “review geometry through the timeline, in depth”. Measured, not just looked at:
  *Plate motion* — every family's rotation against the Merdith model in pygplates at 525 ages: median
  0.19° (≈20 km), within the keyframe tolerance; the worst (2.9°) only where the model itself jumps
  instantly (≈100, 115, 250 and 410 Ma — joins between its parts), which the map slides over a million
  years (now said on the page). *Land* — every half-million years 720→0, flat and globe: no streaks or
  inverted shapes; thin gaps like today's straits, except seams between Rodinia's blocks (under Snowball
  ice). *Terrain* — the WebGL layer sits on the traced coasts to within a pixel in eight views, desktop
  and phone. *Seas* — the big finding: the ready-made pixel version behaved like the elevation maps'
  coast while the page credited Kocsis & Scotese's sea-at-its-highest coast, and pygplates had silently
  read nothing from eight of their coast maps. Rebuilt from the published sources: coast from the
  PaleoDEMs, plus **blue-striped land the sea reached at its highest** from the original PaleoCoastlines.
  Sea creatures' fossils in the sea or stripes: 58% → 84%; dinosaurs' on land or stripes: 93%. Fixed too:
  muddy half-faded land at 545→540 and 5→3 Ma; the ocean's tone jumping at 540 Ma; Kazakhstania's name
  on open ocean and the Tethys, Iapetus and Rheic names on land. The Geology chart now shows the sea at
  its highest as a dashed line. 201 checks.

- **17 Nov 2026 — Ancient mountains and sea depths.** Evan sent a reconstruction of the Gulf of
  Mexico 160 million years ago drawn from the PALEOMAP PaleoDEMs and said “look at that”. It also
  showed the licence was CC BY 4.0, not the no-derivatives label the session had read from a mirror
  — Zenodo confirmed it. The map now has light and shadow on the land and paler-to-deeper blue in the
  shallow seas from Scotese & Wright's 109 elevation maps (540 Ma → 3 Ma), carried on our plates and
  drawn with WebGL, blending smoothly between maps. Data beside the page in `tiles/dem` (1.2 MB,
  loaded two maps at a time). One new verified source (Scotese 2021 atlas, 397). 198 checks, including
  terrain served over http in the suite.

- **17 Nov 2026 — Seas over the continents, 540 million years ago to the Ice Age.** Evan: “no
  indication of the shallow seas, even way back in the Ordovician”. The map now draws, from Kocsis &
  Scotese (2021), where the sea lay over the continents: pale blue over the drowned continents, darker
  deep ocean, and land only where the coast then stood — the Ordovician seas over North America, the
  Western Interior Seaway, Jurassic Europe as islands, the Trans-Saharan seaway. A dotted line shows
  today's coast on its plate (after 410 Ma). The title box says how much of the continents was under
  the sea (“43% · today 30%”); the Geology tab charts it from 540 Ma, taps to travel, and explains
  that the sea's height in metres is argued over (Haq 2014 vs Miller et al. 2005; Haq & Schutter 2008
  for the Paleozoic). The pin card now says whether your town was under the sea. Six new verified
  sources (396). 191 checks, including all 109 maps traced and checked.

- **17 Nov 2026 — A slimmer title box on phones.** Evan: the banner "covers the map too much". On a
  phone the title box is now one slim line (date, sea level when it matters, temperature) — the
  period's name is already in the panel above the map — and a tap opens the full card for six
  seconds. The bottom note reads just "How this map is made" on phones. Desktop unchanged. 174 checks.

- **17 Nov 2026 — Three more Earth stories; a camera that flies.** Geology tab: the Himalayas (India's
  track north from 80 Ma, the Deccan eruptions, the collision, the mountains rising), the Mediterranean
  drying to salt and the Zanclean flood refilling it, and Hawaii's islands born over the hot spot and
  carried north-west (today's islands hidden while the story builds its own). 11 verified sources.
  The map now coasts after a flick and flies (pulls back and swoops in) on long jumps when zoomed in.
  172 checks.

- **17 Nov 2026 — How the Great Lakes were made.** Evan: the glaciers scraping them out "should be an
  event". A new “Watch the Earth being made” section in the Geology tab plays it on the map over 26
  seconds: the ice sheet at its height, scraping; the edge melting back north (a dated sketch after
  Dalton et al. 2020); meltwater lakes at the ice front; Niagara Falls beginning; Lake Agassiz and its
  flood into Hudson Bay 8,200 years ago; the land still rising. Four verified sources. 165 checks.
  **Next stories, same machinery:** the Himalayas rising as India hits Asia; the Mediterranean
  drying out and refilling (the Zanclean flood); Hawaii's islands on the conveyor belt; the
  Grand Canyon; the Channeled Scablands floods; the Sahara turning green and back.

- **17 Nov 2026 — The Great Lakes.** Evan: "the Great Lakes aren't doing great". `build_rivers.py`
  treated Natural Earth's rank 0 (most important) as "no rank" and dropped every top-ranked lake and
  river — all five Great Lakes, Victoria, Baikal, Great Bear — leaving only the centrelines that run
  through them as a tangle of blue lines. Fixed; centrelines through lakes dropped; a fine shoreline at
  close zoom; a check now tests points in each Great Lake, Victoria and Baikal. 124 lakes. 161 checks.

- **17 Nov 2026 — A missing band of Siberia.** Evan saw a thin strip floating over the top of the
  map (108.7 Ma, zoomed in). Cause: Natural Earth's Eurasia outline crosses the date line at Chukotka,
  which made it an invalid flat polygon, and cleaning it dropped a band of land from Scandinavia to
  eastern Siberia between about 65° and 69°N — drawn as sea in every era for the last 410 million
  years, leaving the Arctic coast as a loose strip. `tools/build_plates.py` now joins outlines across
  the date line before cutting them, and gives any leftover land to the plate polygon that contains it
  on the sphere; plate data rebuilt. A check now tests inland points across the band. 160 checks.

- **17 Nov 2026 — Close-up detail; the Nile and the Indus.** Evan: zooming in showed "just flat
  texture". Today's terrain now appears as light and shadow at three levels of detail
  (`tools/build_hillshade.py`, `tiles/relief/`); zoomed in on the last ~7,000 years the coastline
  switches to Natural Earth 1:10m (`tools/build_coast.py`, `tiles/coast/`); the coarse climate-zone
  colours fade as you come close; dragging the zoomed flat map runs at full frame rate. The first-cities
  layer gains the Nile (its lost Canopic and Pelusiac branches, Memphis, Bubastis, Tanis, Naukratis,
  Alexandria, the flood fields) and the Indus (Mohenjo-daro, Harappa, Dholavira, Lothal, Rakhigarhi,
  Kalibangan, and the dried-up Ghaggar–Hakra). 5 new verified sources. 159 checks.
  **Next:** a finer terrain source (the 4 km image is the limit here — SRTM or GEBCO at ~500 m would
  need a host approved); rebuild the plate coastlines from 1:10m so deep-time coasts are crisp too;
  the old head of the Gulf as a dated sketch.

- **17 Nov 2026 — Rivers as they were.** Evan, looking for Ur: today's rivers were stored to only
  11 km and showed where the rivers run now. Rivers are now stored to about 1 km; Sumer gets its own
  layer — eight excavated cities, the Euphrates as it ran past them (a dated sketch), and the watered
  fields between the rivers (a sketch), with five verified sources. The flat map zooms to city scale
  (36×, was 10×), and the globe button switches back to the flat map again (it could not before).
  **Next in this line:** the same for the Nile delta's old branches and the Indus and the vanished
  Ghaggar–Hakra; the old head of the Gulf as a dated sketch once a source gives coordinates.

- **16 Nov 2026 — Two more family trees.** From fish to four legs, and the reptile tree (pterosaurs,
  ichthyosaurs and mosasaurs each on their own branch, not with the dinosaurs). Trees link to one
  another; every animal card has a button to its branch. 148 checks.
- **16 Nov 2026 — A front door, rivers and lakes, 16 more animals.** Fresh visits open on six ways in;
  rivers and lakes appear after the Ice Age (Natural Earth, `tools/build_rivers.py`); Europe's
  Cretaceous islands, the Jurassic of Africa and South America, Silurian China, Miocene Australia and
  Ice Age India and Africa get animals. 144 checks.
- **16 Nov 2026 — The land read from its rocks; named eruptions; animals that come and go.** Deep-time
  land now carries colour and grain from 8,521 dated climate rocks (coal, salt, bauxite, glacial
  rubble). Every great eruption and impact is labelled on the map and explains itself on a tap —
  Evan saw the Deccan Traps glow over India and took it for the asteroid. At a period boundary the
  header now names the younger period, as the epoch rows already did. Markers rise in and fade out;
  crowded spots show "+N". 138 checks.
- **16 Nov 2026 — A calmer, truer map; 37 animals for the empty regions.** Tapping the map no longer
  moves it or changes the time; moves glide. For recorded history the land is drawn from a published
  climate-zone map (rainforest, savanna, steppe, desert, temperate, Mediterranean, boreal, tundra,
  ice), each with its own grain (`tools/build_landcover.py`). 37 animals chosen by a count of empty
  regions, 17 with the paper that described them. 132 checks.
- **16 Nov 2026 — Shifting borders, trade routes, great works; the new name.** Seven empires change
  shape by date; 11 trade routes drawn on the map for the years they ran (Incense Route, Silk Roads,
  monsoon sea routes, trans-Sahara, Viking river roads, Inca Road, Cape Route, Manila galleons, the
  Atlantic slave trade, the fur-trade canoe routes, the Grand Trunk Road); 26 great works from
  Stonehenge to the Large Hadron Collider; switches for each map layer; site renamed Before Us.
  10 new verified references. 126 checks.
- **16 Nov 2026 — Empires, kingdoms and beliefs.** In the Humans tab, for the last 5,500 years:
  27 empires and kingdoms (Egypt and Akkad to the British Empire, with the Maya, Mali, the Inca, the
  Aztecs and the Haudenosaunee), 25 of them sketched on the map at their greatest reach; 17 beliefs in
  six families (the first beliefs and shamanism, the old gods, Zoroastrianism, the Abrahamic
  religions, the Indian religions, East Asia), each with where it began and dated routes showing how
  far it had travelled. Calendar years on the clock and ticks, a "Recorded history" zoom, and a map
  cleared of animals for that span. 11 new verified references. 114 checks.
- **16 Nov 2026 — Extinctions view.** A seventh tab: the five great dyings, the loss of the Ice Age
  giants, and now. Each has a card (toll, cause, recovery, who was lost and who came through — counted
  from the app's own animals — how we know, what is argued) and a "Watch it happen" scene on the map:
  ice growing and seas draining; coasts blooming and seas going stagnant; lava, gas and acid seas;
  the rift; the asteroid, the shock wave, fire and darkness; people arriving land by land; last
  sightings. Animals in the app go out on the map as the scene passes their last date. 103 checks.
- **16 Nov 2026 — Sources pass, your ancestors, journeys, the living map.** Every reference re-fetched
  and confirmed published; titles and author names cleaned; seven cards that named a study without
  citing it now cite it (one gap left: Palorchestes — find the skull study or reword the card). A bar
  under the map names the reader's own ancestor at every moment; four guided journeys; wakes, water
  light, and nine eruptions and impacts on the map. 92 checks.
- **15 Nov 2026 — Family trees and the road to mammals.** Two trees (synapsids → mammals; dinosaurs →
  birds) with the feature each branch added and where experts disagree; 44 new animals (28 mammal
  ancestors and early mammals, plus dinosaurs from families that had none or few — alvarezsaurs,
  more oviraptorosaurs, therizinosaurs, troodontids, megaraptors); sail-backs split into their two
  real families; 33 new verified references. 78 checks.
- **15 Nov 2026 — Finds, mountains, temperature, stricter references.** 52 finds; relief for the
  last 5 Ma; temperature readout and stripe; checker rejects preprints and abstracts, refuses
  duplicate keys, has `--audit`; two references that pointed at preprint versions corrected. 71 checks.
- **15 Nov 2026 — Peer-reviewed sources.** 241 references wired into cards, profiles, Insights and
  map notes.
- Earlier: detailed Ice Age coastlines and drowned worlds; Ice Age sea levels; range chart; quiz;
  "Where was my town?"; food webs; cultures; 600+ animals; zoomable timeline; the moving map.
