# The living world, up close

Written 25 Nov 2026. Evan: “identify from each major era … what megafauna would you see from a top-down map view? What
movement would you see? How would you get indications that it’s a living, breathing world at that time? … Is it swampy?
Is it murky? Is it fiery? … each of the main stages should have a story to tell when you’re zooming in … something
happening.” And: when you zoom in close the view should tilt, so the animals read; the round pins go; the close-up must
look good.

This is the brief for the map’s close-up. Read it with `docs/ART.md` (how things are drawn, how pictures are checked)
and `CLAUDE.md` (sources, uncertainty, motion rules).

## How the close-up works

- **The view tilts as you zoom in.** Past the region view the camera tips from straight down to about 50°, like a
  city-builder: the ground goes on being the map (its coasts, seas and relief are the plate model’s, exactly), and the
  animals and plants stand up on it, seen from the side and a little above. That is how people recognise a Triceratops.
- **Animals are small jointed vector drawings**, one rig per kind of body (neck, head, jaw, legs, tail, frill, plates,
  trunk, wings, flippers), proportioned from the scientists’ outline of each animal. They walk, graze, drink, look up,
  call, rest, swim and fly, and a group behaves as a group: a lookout lifts its head, the herd bunches when a predator
  shows, young stay by their mothers. Colours are not known, and the page says so.
- **No round pins.** An animal on the map is the animal itself. Hover or tap names it; its card opens from there. Far out,
  where animals are too small to draw, a small labelled mark stands for a site.
- **Every stage has one story loop to find when you zoom in** (below): a short scene that repeats, of a kind the fossils
  show, at a site the atlas already has, with its sources. The page says what is known and what is a guess.
- **The air, water and ground move with the clock**, never at random, and keep still for readers who ask for less
  motion: wind through the plants, waves and currents, rain squalls, mist over swamps, ash and smoke, the glow of
  eruptions (named, as all glows on the map are).
- **What is a sketch says so.** Which plants grow where is a sketch by era and climate belt; which animals, where and
  when, is the fossil record; how they behave is from the evidence named in each loop, or labelled as a guess.

## Stage by stage

Each stage lists what you would see from the sky, what moves, the animals worth drawing (all have cards and fossil
sites in the atlas unless marked **new**), and the loop. **Evidence:** “card” means the atlas already says it, with its
sources; “to source” means it must be verified (`tools/verify_refs.py`) before it is shown.

### Before plants on land (1,800 – 470 Ma)
- **Feel:** a mineral world. Bare rock, red and grey; rivers spread in wide braided sheets with no roots to hold the banks;
  wind-rippled sand; dust storms. Shallow seas green-tinged at the edges, with stromatolite mounds and microbial mats.
- **Moves:** dust blowing off the land, rippled sand creeping, broad tides, rain sheets running off bare ground.
- **Snowball Earth (717–635 Ma):** ice to the equator, blizzards, cracks in the sea ice; the world goes white and still.
- **Life to draw:** nothing on land. In clear shallow water, stromatolite mounds and mats; from 575 Ma, fronds and discs on
  the sea floor (**Dickinsonia**, **Charnia**: card). Too small to see from the sky: drawn only at the closest zoom, as
  patterns in the shallows, and labelled.
- **Loop — the tide on a stromatolite shore:** water floods over the mounds and drains away; a dust storm crosses the
  bare land behind. *Evidence:* stromatolites (to source a site).

### Cambrian – Silurian (539 – 419 Ma)
- **Feel:** life explodes in shallow tropical seas; the land is still almost bare (low mossy carpets by water from about
  470 Ma). Reefs of archaeocyaths, then corals and sponges.
- **Life to draw:** in the sea, swimming hunters seen through clear water — **Amplectobelua**, **Anomalocaris** (card),
  later the giant straight-shelled nautiloid **Cameroceras** (9 m, card) and sea scorpions (**Pterygotus**,
  **Jaekelopterus**: card). Trilobites as moving dots on the sea floor at the closest zoom.
- **Moves:** waves over reefs, schools of small swimmers, a nautiloid jetting backwards.
- **Loop — a hunter over the reef:** an anomalocaridid sweeps over the reef; trilobites scatter. *Evidence:* card.

### Devonian (419 – 359 Ma)
- **Feel:** the first forests. **Archaeopteris** trees (card) along rivers; low ferny plants; **Prototaxites** spires
  (card) on the plains. Rivers wind through green for the first time.
- **Life to draw:** **Dunkleosteus** (8 m, card) in the seas; lobe-finned fish in rivers (**Hyneria**, **Holoptychius**:
  card); **Tiktaalik** (card) in the shallows.
- **Loop — at the water’s edge:** Tiktaalik props itself up in a shallow channel; a Hyneria cruises past.
  *Evidence:* card.

### Carboniferous (359 – 299 Ma)
- **Feel:** swampy and murky. Endless coal swamps: dark water, **Lepidodendron** and **Sigillaria** trees (card) in dense
  ranks, **Calamites** horsetails at the edges (card), mist, fallen trunks. Oxygen was high and wildfires were common
  (charcoal in coal: to source).
- **Life to draw:** **Arthropleura** (2.5 m millipede, card) on the forest floor; **Meganeura** (card) as glinting
  dragonflies over the water; **Eryops** (card) in the pools.
- **Moves:** mist drifting, rain, ripples in black water, a wildfire smoking at the forest edge (named).
- **Loop — the swamp:** Arthropleura crosses a fallen trunk; dragonflies hover; mist rolls in. *Evidence:* card.

### Permian (299 – 252 Ma)
- **Feel:** one supercontinent; a hot, dry interior of red beds and dunes; green only along rivers and in the south
  (**Glossopteris** forests, card). Ends fiery: the Siberian Traps (on the map already, named).
- **Life to draw:** sail-backed **Dimetrodon** (card); big plant-eaters **Moschops**, **Cotylorhynchus**,
  **Estemmenosuchus** (card); the sabre-toothed **Inostrancevia** (card).
- **Moves:** heat shimmer, dust devils over dry plains, rivers shrinking in the dry season.
- **Loop — the river in the dry season:** Moschops gather at the last of the water; an Inostrancevia waits in the shade.
  *Evidence:* card for the animals; the gathering at water is a guess and says so.

### Triassic (252 – 201 Ma)
- **Feel:** hot Pangaea with monsoon rains; conifers and seed ferns, ferns and horsetails by water, no grass, no flowers.
- **Life to draw:** **Coelophysis** (card: hundreds died together at Ghost Ranch — a group); **Plateosaurus** (card);
  **Lystrosaurus** (card); in the sea the giant ichthyosaurs **Shonisaurus** and **Cymbospondylus** (card).
- **Moves:** monsoon storms sweeping in, rivers rising.
- **Loop — Ghost Ranch:** a group of Coelophysis trots along a river bank in the dry season. *Evidence:* card.

### Jurassic (201 – 145 Ma)
- **Feel:** warm and green near water, seasonally dry inland (the Morrison floodplains); conifers, cycads, ginkgos,
  ferns, still no grass.
- **Life to draw:** the giant sauropods — **Diplodocus**, **Apatosaurus**, **Brachiosaurus**, **Supersaurus** (card);
  **Stegosaurus** and **Allosaurus** (card); over lagoons the pterosaur **Rhamphorhynchus** and **Archaeopteryx** (check
  cards); in the sea plesiosaurs and ichthyosaurs.
- **Moves:** sauropod herds walking in line, raising dust; necks swinging; a river crossing.
- **Loop — the sauropod crossing:** a line of sauropods wades a river, young in the middle; an Allosaurus watches from
  the trees. *Evidence:* sauropod trackways that show groups walking together (to source).

### Cretaceous (145 – 66 Ma)
- **Feel:** flowering plants arrive (after about 100 Ma), high seas flood the continents (the Western Interior Seaway);
  river deltas, coastal plains, the Gobi’s dunes, the Kem Kem rivers. Ends fiery: the Deccan Traps and the asteroid
  (both already on the map, named).
- **Life to draw:** **Triceratops**, **Centrosaurus** (card: a herd drowned at Hilda), **Edmontosaurus**,
  **Parasaurolophus**, **Maiasaura** (card: a nesting colony), **Ankylosaurus**, **Tyrannosaurus rex**; the titanosaurs
  (**Argentinosaurus**, **Patagotitan**: card); **Spinosaurus** in the Kem Kem rivers; in the seaway **Mosasaurus**,
  **Elasmosaurus**, **Pteranodon** over the water; **Quetzalcoatlus** stalking the plains on foot.
- **Moves:** herds moving to water, pterosaurs gliding and diving, mosasaurs surfacing, storms off the seaway.
- **Loops:** *Hell Creek* — Edmontosaurus come down to drink, Triceratops graze, a T. rex appears at the forest edge, the
  herd lifts its heads and moves off (card: T. rex and Triceratops wounds that healed). *Hilda* — the Centrosaurus herd.
  *Egg Mountain* — Maiasaura on their nests, one body-length apart (card). *The seaway* — a mosasaur surfaces, Pteranodon
  wheel overhead.

### Paleogene (66 – 23 Ma)
- **Feel:** a hot greenhouse; forests to the poles (the PETM, 56 Ma, is already an event); swamps and volcanic lakes.
- **Life to draw:** **Titanoboa** (card) in the Cerrejón swamp; **Basilosaurus** and **Dorudon** (card) in the Tethys;
  **Paraceratherium** (card) browsing tall trees; **Uintatherium**, **Embolotherium** (card).
- **Moves:** steamy mist, heavy rain, a still volcanic lake (Messel, card) with gas bubbling.
- **Loop — the Valley of Whales:** Basilosaurus hunts Dorudon in a shallow bay. *Evidence:* card.

### Neogene: Miocene – Pliocene (23 – 2.6 Ma)
- **Feel:** grasslands spread; the world cools and dries; the Mediterranean dries out (already a story).
- **Life to draw:** **Teleoceras** rhinos (card), **Megalodon** and **Livyatan** (card) at sea, **Deinotherium** and
  **Stegodon** (card), **Argentavis** soaring (card); our relatives (**Laetoli**, card).
- **Moves:** wind waves through grass, grass fires, volcanic ash falling.
- **Loops:** *Ashfall, Nebraska* — rhinos at a waterhole, calves beside their mothers, ash drifting down (card).
  *Laetoli* — three people walk across fresh volcanic ash, leaving footprints (card).

### Pleistocene: the Ice Age (2.6 Ma – 11,700 years ago)
- **Feel:** cold, dry and windy; the mammoth steppe; ice sheets and sea level already on the map.
- **Life to draw:** **Woolly Mammoth**, **Woolly Rhinoceros**, **Elasmotherium** (card), **Giant Ground Sloth**,
  **Columbian Mammoth**, **Smilodon** (card); people.
- **Moves:** snow squalls, wind over grass, rivers of meltwater, smoke from cave mouths.
- **Loops:** *A Neanderthal rock shelter* — smoke from hearths at the cave mouth, people coming and going, a mammoth
  family crossing the valley below (card: Neanderthal life “organised around several hearths”). *La Brea* — a sabre-tooth
  caught at the tar (card). *Border Cave*, *Blombos*, *Wonderwerk* — smoke and fire where the card says fire was kept.
  **Smoke rises only from caves whose card names hearths or fire.**

### Holocene (the last 11,700 years)
- **Feel:** today’s climate; villages, fields, then cities — the history layer already draws empires.
- **Loops:** smoke from villages at Natufian and early farming sites (card), boats along coasts.

## What to build, in order

1. **The rig** — one jointed vector rig per body plan, with walk, graze, drink, look up, call, rest, swim, fly, and
   group behaviour; proportions per animal from its outline; looked at by Evan before anything else (prototype:
   `docs/proto/living-world.html`).
2. **The tilted close-up** — in the new app’s globe (three.js), when it zooms past the region view: the plate-model
   ground tilted, PaleoDEM relief lit, era ground and plants standing up, animals at their sites. The old map keeps its
   flat view and loses the round pins at close zoom.
3. **The loops**, one per stage, each with its card and sources, then more animals per stage.
4. **Weather and water per stage** — mist, monsoon squalls, ash, snow, waves — and the cave smoke.
