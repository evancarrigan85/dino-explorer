# More events, period by period

A backlog, written 23 Nov 2026 when Evan asked: “identify more event areas that we could expand upon for each
period possible.” It is Release 13 in `docs/PLAN.md`. Read `CLAUDE.md` first; its rules apply to every line here.

**Progress.** Batch 3 shipped 23 Nov 2026: the Cretaceous has eight more events (the South Atlantic opening, polar
dinosaurs at Dinosaur Cove, Patagotitan, Spinosaurus’s rivers, mosasaurs, Dinosaur Provincial Park, the Arctic nests,
grass in dinosaur dung), 15 in all. Batch 2 shipped 23 Nov 2026: 13 new sparks (Kalkarindji, Viluy, Karoo–Ferrar ×2, Paraná–Etendeka,
Popigai, Columbia River, Ries, Yellowstone, Mazama, Thera, Vesuvius, Tambora). Every spark, old and new, now belongs
to a timeline event that cites its papers. Ontong Java is a timeline event only: the plates carry continents,
not the Pacific floor, so the map cannot place it. Batch 1 shipped 23 Nov 2026: 24 sourced events. The Permian, Neoarchean, Mesoarchean,
Ectasian, Stenian, Ediacaran, Cambrian (first steps on land), Ordovician (Fezouata, the burst of new species,
the asteroid) and Silurian lines below marked as pins are on the site, except where a line says “?”. The table
below is the count from before batch 1. A check now keeps every period from the Ediacaran on at three events or
more, and every older period at one or more.

## How to read this

Each candidate has a **kind**: what it would become on the page.

| Kind | What it is | Where it lives | Cost |
|---|---|---|---|
| **pin** | an event on the timeline, with a sentence | `EVENTS` in `data_time.js` | small |
| **spark** | an eruption or impact glowing on the map, with its name | `SPARKS` in `data_you.js` | small |
| **crisis** | a smaller extinction: a short card, no full scene | a “Smaller crises” list in the Extinctions tab (new) | medium |
| **story** | a “Watch the Earth being made” story in the Geology tab | `data_stories.js` + `STORY_SCENES` | large |
| **site** | a fossil window for the “life at the site” scenes (Release 12.2) | `data_sites.js` (planned) | large |
| **ambient** | a story’s picture drawn whenever the clock is inside it | `AMBIENT` in `app.js` | medium |

Each candidate also has a **source status**:
- ✓ means the paper was found in Crossref on 23 Nov 2026 as a published journal article. Its suggested
  key is given, and it still goes through `refs_wanted.txt` → `verify_refs.py` like any other source.
- **pin** means the title search ranks something else first, so pin the DOI in the sixth column after
  looking it up.
- **?** means no paper has been found yet. Nothing ships until it has one.
- **in refs** means the paper is already verified on the site.

Three rules for building from this list:
- **No sparks before 1,800 Ma.** The map draws no land that far back, so an eruption or impact there can only
  be a pin.
- **Every spark is named on the map.** Its label and its sentence come from the paper.
- **Dates are approximate here.** Take the exact date from the paper when building, and say on the card when
  it is argued over.

## What each period has now (counted from the page, 23 Nov 2026)

| Period | Span (Ma) | Animals | Timeline events | Stories | Sparks | Gap |
|---|---|---|---|---|---|---|
| Hadean | 4567–4031 | 0 | 3 | Moon | – | |
| Eoarchean | 4031–3600 | 1 | 2 | – | – | |
| Paleoarchean | 3600–3200 | 3 | 2 | – | – | |
| Mesoarchean | 3200–2800 | 0 | 1 | – | – | thin |
| **Neoarchean** | 2800–2500 | 0 | **0** | – | – | **empty** |
| Siderian | 2500–2300 | 0 | 2 | – | – | |
| Rhyacian | 2300–2050 | 1 | 1 | – | – | thin |
| Orosirian | 2050–1800 | 1 | 2 | – | – | |
| Statherian | 1800–1600 | 2 | 2 | – | – | |
| Calymmian | 1600–1400 | 3 | 2 | – | – | |
| Ectasian | 1400–1200 | 0 | 1 | – | – | thin |
| Stenian | 1200–1000 | 2 | 1 | – | – | thin |
| Tonian | 1000–720 | 6 | 7 | – | – | |
| Cryogenian | 720–635 | 5 | 2 | – | – | thin for how big it is |
| Ediacaran | 635–539 | 16 | 2 | – | – | thin |
| Cambrian | 539–487 | 33 | 3 | – | – | thin |
| Ordovician | 487–443 | 23 | 2 | – | – | thin |
| **Silurian** | 443–420 | 25 | **1** | – | – | **thinnest of the animal periods** |
| Devonian | 420–359 | 46 | 4 | – | – | |
| Carboniferous | 359–299 | 35 | 4 | – | – | |
| **Permian** | 299–252 | 51 | **0** | – | Emeishan, Siberia | **empty** (its two sparks have no event) |
| Triassic | 252–201 | 58 | 4 | – | CAMP ×2, Manicouagan | |
| Jurassic | 201–143 | 84 | 5 | – | – | |
| **Cretaceous** | 143–66 | 155 | **4** | (Himalayas) | Deccan, Chicxulub | **4 events for 77 Myr and 155 animals** |
| Paleogene | 66–23 | 76 | 13 | (Himalayas) | N. Atlantic | good |
| Neogene | 23–2.58 | 77 | 16 | 3 | – | good |
| Quaternary | 2.58–0.0117 | 65 | 18 | 2 | Toba | good |
| Holocene | 0.0117–0 | 54 | 4 | (Great Lakes) | – | thin on the Earth itself |

Seven extinction events have full scenes. There are nine sparks; the oldest is the Emeishan eruptions at 260 Ma,
so the first 280 million years of the animal age have none. There are five stories: one in the Hadean, four in
the last 66 Myr, and nothing in the 4.4 billion years between.

## The ten best next moves

1. **Permian, from zero to six events.** Its two sparks (Emeishan, Siberia) already glow with no event
   behind them.
2. **Cretaceous**: the Ontong Java and Paraná eruptions, the South Atlantic opening, polar dinosaurs, the
   biggest sauropods, and grass in dinosaur dung.
3. **Snowball Earth as a story.** The map exists for the Cryogenian; ice spreads toward the equator, then
   the great thaw. It must be labelled a sketch.
4. **Ediacaran**: Mistaken Point, the Gaskiers ice, the first skeletons, the first burrows.
5. **Silurian**: Niagara’s reef rock, the first land animals, Scotland meeting England, the Lau crisis.
6. **Ordovician**: the great burst of new species, asteroid dust and an ice age, Fezouata, and the
   argued-over ring around the Earth.
7. **Ten more sparks**, Paleozoic to Holocene (list below).
8. **The thin Precambrian spans**: fossil raindrops, banded iron, natural nuclear reactors, the Sudbury
   impact, the Lake Superior rift.
9. **Holocene Earth events**: the Storegga tsunami, the end of the green Sahara, the last mammoths, the
   Thera and Tambora eruptions.
10. **“Smaller crises”** as their own list, so the record is not only the Big Five.

## Period by period

### Hadean (4567–4031 Ma)
- **pin** ~4100–3800 Ma, *A storm of asteroids?* The idea of a “Late Heavy Bombardment” and why many
  scientists now doubt it was one storm. Argued over. ✓ `boehnke2016` (Illusory Late Heavy Bombardments).
- **pin** *The faint young Sun.* The Sun shone about 30% dimmer, yet there was liquid water. Why is still
  argued. ✓ `feulner2012`.
- **pin** *Days only hours long.* The young Earth spun fast and the Moon has been slowing it since; it ties
  into the Moon story. Already cited: `dickey1994` (in refs) for the slowing today. The early day length still
  needs a paper (?).

### Eoarchean (4031–3600 Ma)
- **pin** ~3770 Ma (perhaps older), *Life at a sea-floor vent?* Tubes and threads in Quebec’s Nuvvuagittuq
  rocks, argued over. ✓ `dodd2017`.

### Paleoarchean (3600–3200 Ma)
- **pin** ~3260 Ma, *An impact far bigger than the dinosaur killer.* The S2 impact (its traces are in South
  Africa) stirred up the oceans, and the microbes bounced back. Take the details from the paper. ✓ `drabon2024`.
- **pin** ~3500–3100 Ma, *The first lasting continents.* The oldest cores of today’s continents (the Kaapvaal
  and the Pilbara) become stable. ?

### Mesoarchean (3200–2800 Ma)
- **pin** ~2900 Ma, *The oldest ice age.* Glacial rocks in South Africa (Pongola). ✓ `young1998`.
- **pin** ~2900–2700 Ma, *The gold of the Witwatersrand.* Rivers wash gold into sands that will give a large
  share of all the gold ever mined (get the figure from the paper). ?

### Neoarchean (2800–2500 Ma) — has nothing yet
- **pin** ~2700 Ma, *Fossil raindrops.* Raindrop pits in ancient ash show the air was no more than twice as
  thick as today’s. ✓ `som2012`. A wonderful kid fact.
- **pin** ~2700 Ma, *The continents grow fast.* A great pulse of new continental crust. ?
- **pin** ~2600–2500 Ma, *Great microbial reefs* (the Campbellrand in South Africa). ?
- **pin** ~2500 Ma, *Iron rusts out of the sea.* Banded iron formations: the iron ore mined today in
  Western Australia. ?

### Siderian (2500–2300 Ma)
- **pin** ~2450–2220 Ma, *The Huronian ice ages.* Glacial rocks along the north shore of Lake Huron (Ontario),
  perhaps a snowball. ? (Check what the Siderian card already cites.)

### Rhyacian (2300–2050 Ma)
- **pin** ~2220–2060 Ma, *Too much oxygen?* The Lomagundi event: a long carbon spike, perhaps more oxygen than
  the world could keep. ✓ `karhu1996`.
- **pin** ~2050 Ma, *The Bushveld.* The largest body of cooled magma known; most of the world’s platinum. ?

### Orosirian (2050–1800 Ma)
- **pin** ~2000 Ma, *Nuclear reactors made by nature* at Oklo in Gabon: uranium ore that ran like a reactor
  for thousands of years. ? A journal paper is needed; the title search found only a 2006 book chapter.
- **pin** ~1850 Ma, *The Sudbury impact* (Ontario): the second-largest known crater; nickel mines today. ?
- **pin** ~1900–1800 Ma, *The Trans-Hudson mountains* weld the core of North America together, as Nuna
  forms. ?

### Statherian (1800–1600 Ma)
- **pin**: the oldest clear cells with a nucleus (see what the Qingshania card already cites before adding).

### Calymmian (1600–1400 Ma)
- **pin** ~1450–1300 Ma, *Nuna breaks up.* (The map shows it; give it an event.) Check `zhao2002` (in refs).
- **pin** ~1480 Ma, *“Strings of beads”* (Horodyskia, Glacier National Park): perhaps among the oldest
  life big enough to see. Argued over. ? A journal paper is needed.

### Ectasian (1400–1200 Ma)
- **pin + spark** ~1270 Ma, *The Mackenzie dykes.* Cracks filled with magma fan out 2,000+ km across
  northern Canada from one hot spot. ✓ `lecheminant1989`. The map reaches back to 1,800 Ma, so this can also
  be a spark if the plate data carries the spot (check `WorldMap.attach`).

### Stenian (1200–1000 Ma)
- **pin/spark** ~1100 Ma, *The Lake Superior rift.* North America almost splits in two; lava floods, and
  the copper of Lake Superior. ? (The map exists, so it can be a spark.)
- **pin** ~1090–980 Ma, *The Grenville mountains.* A range as high as the Himalayas, worn down to the
  Adirondacks and Labrador. ?

### Tonian (1000–720 Ma) — fine as it is.

### Cryogenian (720–635 Ma)
- **spark** ~719 Ma, *The Franklin eruptions* (Arctic Canada), just as the first snowball begins. ✓
  `macdonald2010` (Calibrating the Cryogenian).
- **story** *Snowball Earth.* Ice creeps toward the equator, the long freeze, then the great thaw and
  the rock layers it left. Label it a sketch: how frozen the oceans were is argued over (“snowball” or
  “slushball”). Sources: `hoffman1998` (in refs); Hoffman et al. 2017, Science Advances, “Snowball Earth
  climate dynamics and Cryogenian geology-geobiology” (**pin** its DOI).
- **ambient** Ice on the map while the clock is inside each glaciation (717–660, 650–635), drawn as the
  story draws it.

### Ediacaran (635–539 Ma)
- **pin** ~580 Ma, *The Gaskiers ice age*, short and sharp, just before large life appears. ✓ `pu2016`.
- **pin / site** ~571–565 Ma, *Mistaken Point* (Newfoundland): sea-floor communities buried by volcanic
  ash, where large life first appears. Matthews et al. 2021, GSA Bulletin (**pin**; the title search finds its
  supplement first).
- **pin** ~550 Ma, *The first skeletons* (Cloudina, tiny shelly tubes). ?
- **pin** ~539 Ma, *The first burrows*: the start of the Cambrian is defined by a burrow at Fortune Head,
  Newfoundland. ? (`cohen2013` covers the boundary itself.)
- **crisis** ~539 Ma, *The end of the Ediacaran creatures.* ?

### Cambrian (539–487 Ma)
- **pin / site** ~518 Ma, *Sirius Passet* (Greenland). ?
- **spark** ~511 Ma, *Kalkarindji* (Australia): lava floods at the first big extinction of animals. ✓
  `jourdan2014`.
- **crisis** ~511 Ma, *The first animal extinction* (with the spark above). ✓ `jourdan2014`.
- **pin** ~500 Ma, *The first steps on land*: arthropod trackways in ancient sand dunes, Ontario. ✓
  `macnaughton2002`.
- **crisis** ~497 Ma, *The SPICE event* (a carbon spike and a trilobite crisis). ?

### Ordovician (487–443 Ma)
- **pin** ~485–460 Ma, *The great burst of new species*: the number of sea animal families triples. ?
- **pin / site** ~478 Ma, *Fezouata* (Morocco): Burgess-Shale-like animals, younger. ✓ `vanroy2010`.
- **pin** ~466 Ma, *An asteroid breaks up*: its dust and fossil meteorites, and perhaps an ice age. ✓
  `schmitz2019`.
- **pin** ~466 Ma, *Did the Earth have a ring?* A new, argued-over idea; label it clearly. ✓ `tomkins2024`.
- **pin** ~455 Ma, *The first coral reefs* (corals with bryozoans). ?

### Silurian (443–420 Ma) — the thinnest
- **pin** ~430–425 Ma, *Niagara’s rock*: the hard rock that Niagara Falls pours over formed in a warm,
  shallow Silurian sea. ? (It links to the Great Lakes story.)
- **pin / site** ~430 Ma, *The Herefordshire fossils* (England): tiny animals preserved in 3D in volcanic ash. ?
- **pin** ~425 Ma, *The first land animals*: millipede-like creatures breathing air. ?
- **pin** ~425 Ma, *Scotland meets England*: the Iapetus Ocean closes (the Caledonian mountains). ?
- **crisis** ~431 Ma and ~424 Ma, *Ireviken and Lau*: two short extinctions with big carbon swings. ?
- **pin** ~420 Ma, *Sea scorpions at their biggest*: the eurypterids. ? (Check the animal cards first.)

### Devonian (420–359 Ma)
- **pin / site** ~407 Ma, *The Rhynie chert* (Scotland): the first whole land ecosystem, preserved by hot
  springs. ?
- **pin / site** ~380 Ma, *Gogo* (Australia): fish preserved in 3D, and the oldest known live birth in an
  animal with a backbone. ✓ `long2008`. This is also the benchmark’s missing `gogo-reef` fact.
- **pin / site** ~380 Ma, *Miguasha* (Quebec): Elpistostege, the fish with the bones of a hand. ✓
  `cloutier2020`.
- **spark** ~380 Ma, *The Siljan impact* (Sweden). ?
- **spark** ~377–364 Ma, *The Viluy eruptions* (Siberia), tied to the Late Devonian extinction. ✓ `ricci2013`.
- **pin** ~365 Ma, *The first seeds*. ?
- **crisis** 359 Ma, *The Hangenberg event* (check whether the Devonian card already covers it). ?

### Carboniferous (359–299 Ma)
- **pin** 360–345 Ma, *Romer’s Gap*: a missing chapter in the story of four-legged animals, now being filled. ?
- **pin / site** ~315 Ma, *Joggins* (Nova Scotia): the oldest reptiles, found inside fossil tree stumps. ?
- **pin / site** ~309 Ma, *Mazon Creek* (Illinois): the Tully monster. ✓ `mccoy2016`. It is argued over:
  later papers disagree that it is a vertebrate, so add them to `debate`.
- **pin** ~300 Ma, *Giant insects*: dragonfly relatives with a 70 cm wingspan, and the oxygen question. ?

### Permian (299–252 Ma) — has nothing yet
- **pin** ~299–290 Ma, *The ice leaves Gondwana*: the end of the Late Paleozoic Ice Age. ?
- **pin** ~290–280 Ma, *Mesosaurus and Glossopteris*: the same fossils on continents now oceans apart,
  the clue that the continents moved. ? Link to the Finds tab’s drift story if there is one.
- **pin** ~270–260 Ma, *The age of the therapsids* (Karoo): mammal ancestors rule the land. ?
- **pin + crisis** ~260 Ma, *The Capitanian crisis* and the Emeishan eruptions (the spark exists). ✓
  `wignall2009`.
- **pin** ~258–252 Ma, *The Zechstein Sea dries to salt* (northern Europe). ?
- **pin** ~255 Ma, *The first gliding reptiles*. ?
- **pin** 252 Ma, *The Siberian Traps begin* (the spark exists; the event card is in the Triassic, so check
  how the boundary falls).

### Triassic (252–201 Ma)
- **pin** ~252–247 Ma, *One animal’s world*: Lystrosaurus everywhere after the Great Dying. ?
- **pin / site** ~231 Ma, *Ischigualasto* (Argentina): among the first dinosaurs. ?
- **pin** ~228–215 Ma, *The first pterosaurs*. ?
- **pin** ~220 Ma, *A turtle with half a shell* (Odontochelys). ?
- **pin** 214 Ma, *The Manicouagan impact* (Quebec): the spark exists with no event. ?

### Jurassic (201–143 Ma)
- **spark + pin** ~183 Ma, *The Karoo–Ferrar eruptions*, behind the Toarcian crisis (the event exists, with
  no spark). ✓ `svensen2007`.
- **pin / site** ~165–160 Ma, *The Yanliao fossils* (China): feathered dinosaurs whose colours are known. ?
- **pin / site** ~150 Ma, *The Morrison* (the geology feature exists; give it an event). ?

### Cretaceous (143–66 Ma) — the biggest gap for its size
- **spark** ~134 Ma, *The Paraná–Etendeka eruptions* (Brazil and Namibia, split apart by the Atlantic since). ?
- **pin** ~130–100 Ma, *The South Atlantic opens*: Africa and South America part. ? (Plates: `merdith2021`.)
- **spark + crisis** ~122 Ma, *Ontong Java*: the largest outpouring of lava known, on the sea floor, and the
  sea runs short of oxygen. ✓ `tarduno1991`.
- **pin** ~106 Ma, *Polar dinosaurs* (Dinosaur Cove, Australia, then inside the Antarctic Circle). ?
- **pin / site** ~100–95 Ma, *The Kem Kem* (Release 12.2).
- **pin** ~95 Ma, *The biggest land animals*: Argentinosaurus and kin. ?
- **pin** ~90–66 Ma, *Mosasaurs rule the seas*. ?
- **pin** ~76 Ma, *Dinosaur Provincial Park* (Alberta; the geology feature exists, give it an event). ?
- **pin** ~67 Ma, *Grass in dinosaur dung*: grass grew earlier than anyone thought. ✓ `prasad2005`.

### Paleogene (66–23 Ma) — good. Additions:
- **spark** ~35.7 Ma, *The Popigai and Chesapeake Bay impacts*, both within about 1 Myr. ?

### Neogene (23–2.58 Ma) — good. Additions:
- **spark** 16.7–15.9 Ma, *The Columbia River eruptions*, timed with the last warm spell. ✓ `kasbohm2018`.
- **spark** 14.8 Ma, *The Ries impact* (Germany; the town of Nördlingen sits in the crater). ?
- **pin / site** ~12 Ma, *Ashfall* (Nebraska): rhinos buried by volcanic ash, a herd the evidence allows. ?

### Quaternary (2.58–0.0117 Ma) — good. Additions:
- **spark** 2.08 Ma and 0.64 Ma, *Yellowstone’s super-eruptions*. ?
- **pin** ~42–41 ka, *The magnetic field flips for a while* (Laschamp), and an argued-over crisis. Cooper et
  al. 2021, Science, “A global environmental crisis 42,000 years ago” (**pin**; the title search finds a comment
  first). Show the comment’s side too.
- **pin** ~23–21 ka, *Footprints at White Sands*: people in the Americas earlier than thought. Argued over.
  Bennett et al. 2021, Science (**pin**; the title search finds a review service first).
- **story** ~18–15 ka, *The Missoula floods*: an ice dam breaks again and again and carves the Channeled
  Scablands. It works the same way as the Great Lakes story. ✓ `bretz1923`, a lovely history-of-science
  angle (Bretz was ridiculed, then proved right); a modern paper is needed too (?).

### Holocene (11.7 ka – today) — thin on the Earth itself
- **pin** ~8.2 ka, *The Lake Agassiz flood and the cold snap* (in the Great Lakes story; give it an event).
  Already cited: `barber1999` (in refs).
- **pin** ~8.15 ka, *The Storegga tsunami*: a giant undersea slide off Norway floods the coasts around the
  North Sea. ?
- **spark** ~7.7 ka, *Mount Mazama erupts*, leaving Crater Lake. ?
- **pin** ~5.5 ka, *The green Sahara dries*. ✓ `demenocal2000`.
- **pin** ~4 ka, *The last mammoths*, on Wrangel Island, still alive when the pyramids were built. ✓
  `vartanyan1993`.
- **spark** ~1600 BCE, *Thera* (Santorini; the date is argued over). ?
- **spark** 79 CE, *Vesuvius* buries Pompeii. ?
- **spark** 1815, *Tambora*, and the year without a summer. ✓ `oppenheimer2003`.

## Cross-cutting ideas
- **“Smaller crises” list** in the Extinctions tab: end-Ediacaran, Cambrian 511, SPICE, Ireviken/Lau,
  Hangenberg, the coal-forest collapse (the event exists), Capitanian, Toarcian (the event exists), Ontong Java,
  OAE2 (the “Peak hothouse” event exists), PETM (the event exists). One short card each, with its dates, its
  cause as argued, and its sources. Mark on the severity chart as smaller dots.
- **A regional journey**: Canada alone has Acasta (the oldest rock), Nuvvuagittuq, Sudbury, the Mackenzie
  dykes, the Lake Superior rift, Mistaken Point, the Burgess Shale, Miguasha, Joggins, Manicouagan, Dinosaur
  Park and the Great Lakes. A “Through time in one country” journey (`JOURNEYS` in `app.js`) would link them.
- **Sparks first**: they are cheap, they make the living map richer in eras where it is quiet, and each one
  already has its paper on this list.
