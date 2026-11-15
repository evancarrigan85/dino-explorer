# Plan

Written 15 Nov 2026, at the end of the session that shipped the Finds tab and the family trees. It is meant to be picked up
cold: each release below says what to build, in what order, from which data, and how to know it is
done. Read `CLAUDE.md` first — its rules apply to every release here.

**How to use this file.** Work the releases in order unless Evan chooses otherwise. One release = one
commit that builds, passes `node tools/test.js`, has been looked at on desktop and phone, and is
pushed to `main`. When a release ships, move it to "Shipped" with the date and the numbers, and
correct anything below that turned out to be wrong. Where a step says **ask Evan**, stop and ask.

## Where things stand

| | |
|---|---|
| Animals | 636 + 24 members of the human family; 168 dinosaurs; 46 proto-mammals (synapsids) |
| Family trees | The road to mammals (synapsids → mammals) and the dinosaur family tree, under Life → 🌳 Family trees |
| Tabs | Life · Humans · Insights · Finds · Quiz · Geology |
| Map | Plate motion 720 Ma → today; Ice Age shorelines at 9 sea levels; ice sheets; today's mountains for the last 5 Ma; temperature readout and stripe (540 Ma → today) |
| Finds | 52 discovery stories, 12 from before 1800 |
| References | 302, every one a journal article confirmed in Crossref |
| Checks | 78 passing |
| Page | about 1.08 MB, one file |

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

1. **Before the Ice Age, the coastlines are today's coasts carried back in time.** The real ancient
   shorelines are not shown: no seaway down the middle of Cretaceous North America, no shallow sea
   over Jurassic Europe, no flooded Sahara. This is the single biggest gap between the map and the
   science, and Release 2 fixes it.
2. **No ancient mountains.** The Appalachians were once Himalaya-sized; the map shows flat land.
   Also Release 2 (the same dataset has mountain belts).
3. **Land colour is a latitude sketch**, not reconstructed climate. Release 3 adds the rock evidence
   (coal, salt, glacial deposits) as a layer, which is both more honest and more interesting.
4. **Ice sheets are drawn shapes**, not the published reconstructions of their edges. Release 4.
5. **Ice Age coasts are coarse** — a 37 km depth grid. Fine for the world view, blurry when zoomed in
   on Doggerland or Beringia. No rivers, no Ice Age lakes. Release 4.
6. **Markers are emoji and pile up** where many animals share a fossil site (Morrison, Hell Creek,
   Liaoning). Release 5 (clustering) and Release 6 (custom sprites).
7. **Shorelines near the old ice sheets are wrong in a known way**: the map lowers the sea evenly,
   but land under the ice was pushed down and has been rising since (Hudson Bay, Scandinavia). This
   cannot be fixed cheaply; it is stated in "How this map is made" as part of Release 4.

---

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

## Release 2 — Ancient shorelines and mountains (needs one host approved)

**Goal.** For 400 Ma → 2 Ma, draw where the sea actually covered the continents and where the
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
2. **Published ice-sheet edges.** Replace the drawn sheets with reconstructions at a few moments
   (for example 20, 15, 12, 10, 8 thousand years ago): Dalton et al. 2020 for North America and
   Hughes et al. 2016 (DATED-1) for Eurasia. Verify both in Crossref and find where the shapefiles
   are hosted before promising this.
3. **Ice Age lakes and rivers.** Lake Agassiz, Lake Bonneville, Mega-Chad, the Channel River, the
   Black Sea lake, as simple polygons with a date range, each with a verified source; today's major
   rivers from Natural Earth (public domain, on GitHub) for the last 5 Ma only.
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

## Shipped

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
