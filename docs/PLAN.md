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
| Animals | 673 + 24 members of the human family; 183 dinosaurs; 46 proto-mammals (synapsids) |
| Family trees | The road to mammals (synapsids → mammals) and the dinosaur family tree, under Life → 🌳 Family trees |
| Tabs | Life · Humans · Insights · Finds · Quiz · Geology |
| Map | Plate motion 720 Ma → today; Ice Age shorelines at 9 sea levels; ice sheets; today's mountains for the last 5 Ma; temperature readout and stripe (540 Ma → today) |
| Finds | 52 discovery stories, 12 from before 1800 |
| References | 355, every one a published work confirmed in Crossref |
| History | 27 empires and kingdoms (25 sketched on the map) and 17 beliefs in six families, in the Humans tab; calendar years and a “Recorded history” zoom |
| Extinctions | Their own tab: seven events, a severity chart, and a map scene for each |
| Connection | “Your ancestor at this moment” bar under the map (24 steps, 720 Ma → today); four guided journeys |
| Living map | Wakes behind drifting land, light on the water, eruptions and impacts at nine events |
| Checks | 132 passing |
| Page | about 1.28 MB, one file |
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

## Release 0 — Make it feel real (Evan, 16 Nov: "richer, more impactful, more natural")

What shipped that day: a tap on the map no longer moves the map or the time (it used to jump to the
animal's first fossil site); view changes glide; and for recorded history the land is coloured and
textured from a published climate-zone map. What is still to do, most valuable first:

1. **Landscape in deep time, from the rocks.** The land texture is research-based only for the last
   6,000 years. For everything older it is still the latitude sketch. Three sources, in order of how
   soon they can be used:
   - *Climate-indicator rocks* (coal = wet, salt = dry, glacial rubble = ice, bauxite = hot and wet):
     8,698 dated points are already on disk in the GPlates web-service clone (Release 3). Paint the
     land near each from its rock type, attached to the plates, and leave the rest plain. **Ask Evan**
     about the dataset's terms first.
   - *Ancient shorelines and mountains* (Release 2) — needs `www.earthbyte.org` or `zenodo.org`.
   - *Ice Age vegetation* (the mammoth steppe, shrunken rainforests): find a published, downloadable
     reconstruction of the world 21,000 years ago before promising this.
2. **Custom sprites** (Release 6) — the single biggest change to how it looks. Blocked on the
   PixelLab token.
3. **Animals that arrive and leave.** A short rise when an animal first appears as time moves and a
   fade when it dies out, as the extinction scenes already do.
4. **Fewer, calmer pins.** Cluster markers that overlap; show labels only for what is selected or
   hovered; let the history layers default to two at a time on a phone.
5. **A front door** (Release 7d) with "Your story" as the first thing offered.
6. **Rivers and lakes** for the last 5 million years from Natural Earth; **night lights** for the
   last century.
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

## Release 7c — The other families (asked for by Evan; designed, not built)

Evan asked for the synapsid treatment — a tree, plus the missing members — for the other families.
The design was worked out on 15–16 Nov and nothing has been built yet. Build it as data in
`data_trees.js` plus a new `data_branches.js` for the animals.

- **Three new trees.** *From fish to four legs* (early chordates → jawless fishes → jaws → bony fishes
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
