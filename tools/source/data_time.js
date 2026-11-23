// ============================================================
// THE TIME SCALE — what appears on the timeline as you zoom in
// ============================================================
// Period boundaries follow the International Chronostratigraphic Chart
// (ICS, December 2024 edition), rounded. Older books give slightly different
// numbers — for example 145 rather than 143 million years for the start of
// the Cretaceous — because the dates are refined as rocks are re-measured.
const PERIOD_BOUNDS = {
  cryogenian: [720, 635], ediacaran: [635, 539], cambrian: [539, 487], ordovician: [487, 443],
  silurian: [443, 420], devonian: [420, 359], carboniferous: [359, 299], permian: [299, 252],
  triassic: [252, 201], jurassic: [201, 143], cretaceous: [143, 66], paleogene: [66, 23],
  neogene: [23, 2.58], quaternary: [2.58, 0.0117], holocene: [0.0117, 0],
};

// Epochs (rank 1) and ages (rank 2): [name, start, end, rank]. Million years ago.
const DIVS = [
  // Cryogenian — no formal subdivisions; the two great glaciations stand in
  ['Sturtian glaciation', 717, 660, 1], ['Marinoan glaciation', 650, 635, 1],
  // Cambrian
  ['Terreneuvian', 539, 521, 1], ['Series 2', 521, 506.5, 1], ['Miaolingian', 506.5, 497, 1], ['Furongian', 497, 487, 1],
  ['Fortunian', 539, 529, 2], ['Stage 2', 529, 521, 2], ['Stage 3', 521, 514.5, 2], ['Stage 4', 514.5, 506.5, 2],
  ['Wuliuan', 506.5, 503, 2], ['Drumian', 503, 500.5, 2], ['Guzhangian', 500.5, 497, 2], ['Paibian', 497, 494, 2], ['Jiangshanian', 494, 491, 2], ['Stage 10', 491, 487, 2],
  // Ordovician
  ['Early Ordovician', 487, 471, 1], ['Middle Ordovician', 471, 458, 1], ['Late Ordovician', 458, 443, 1],
  ['Tremadocian', 487, 477, 2], ['Floian', 477, 471, 2], ['Dapingian', 471, 469.5, 2], ['Darriwilian', 469.5, 458, 2], ['Sandbian', 458, 453, 2], ['Katian', 453, 445, 2], ['Hirnantian', 445, 443, 2],
  // Silurian
  ['Llandovery', 443, 433, 1], ['Wenlock', 433, 427, 1], ['Ludlow', 427, 423, 1], ['Pridoli', 423, 420, 1],
  ['Rhuddanian', 443, 440.5, 2], ['Aeronian', 440.5, 438.5, 2], ['Telychian', 438.5, 433, 2], ['Sheinwoodian', 433, 430.5, 2], ['Homerian', 430.5, 427, 2], ['Gorstian', 427, 425, 2], ['Ludfordian', 425, 423, 2],
  // Devonian
  ['Early Devonian', 420, 393.5, 1], ['Middle Devonian', 393.5, 382.5, 1], ['Late Devonian', 382.5, 359, 1],
  ['Lochkovian', 420, 412.5, 2], ['Pragian', 412.5, 410.5, 2], ['Emsian', 410.5, 393.5, 2], ['Eifelian', 393.5, 388, 2], ['Givetian', 388, 382.5, 2], ['Frasnian', 382.5, 372, 2], ['Famennian', 372, 359, 2],
  // Carboniferous
  ['Mississippian', 359, 323.5, 1], ['Pennsylvanian', 323.5, 299, 1],
  ['Tournaisian', 359, 346.5, 2], ['Viséan', 346.5, 330.5, 2], ['Serpukhovian', 330.5, 323.5, 2], ['Bashkirian', 323.5, 315, 2], ['Moscovian', 315, 307, 2], ['Kasimovian', 307, 303.5, 2], ['Gzhelian', 303.5, 299, 2],
  // Permian
  ['Cisuralian', 299, 274.5, 1], ['Guadalupian', 274.5, 259.5, 1], ['Lopingian', 259.5, 252, 1],
  ['Asselian', 299, 293.5, 2], ['Sakmarian', 293.5, 290.5, 2], ['Artinskian', 290.5, 283.5, 2], ['Kungurian', 283.5, 274.5, 2], ['Roadian', 274.5, 269, 2], ['Wordian', 269, 264.5, 2], ['Capitanian', 264.5, 259.5, 2], ['Wuchiapingian', 259.5, 254, 2], ['Changhsingian', 254, 252, 2],
  // Triassic
  ['Early Triassic', 252, 247, 1], ['Middle Triassic', 247, 237, 1], ['Late Triassic', 237, 201, 1],
  ['Induan', 252, 250, 2], ['Olenekian', 250, 247, 2], ['Anisian', 247, 241.5, 2], ['Ladinian', 241.5, 237, 2], ['Carnian', 237, 227, 2], ['Norian', 227, 205.5, 2], ['Rhaetian', 205.5, 201, 2],
  // Jurassic
  ['Early Jurassic', 201, 174.7, 1], ['Middle Jurassic', 174.7, 161.5, 1], ['Late Jurassic', 161.5, 143, 1],
  ['Hettangian', 201, 199.5, 2], ['Sinemurian', 199.5, 193, 2], ['Pliensbachian', 193, 184, 2], ['Toarcian', 184, 174.7, 2], ['Aalenian', 174.7, 171, 2], ['Bajocian', 171, 168, 2], ['Bathonian', 168, 165.3, 2], ['Callovian', 165.3, 161.5, 2], ['Oxfordian', 161.5, 155, 2], ['Kimmeridgian', 155, 149, 2], ['Tithonian', 149, 143, 2],
  // Cretaceous
  ['Early Cretaceous', 143, 100.5, 1], ['Late Cretaceous', 100.5, 66, 1],
  ['Berriasian', 143, 137.5, 2], ['Valanginian', 137.5, 132.5, 2], ['Hauterivian', 132.5, 126, 2], ['Barremian', 126, 121.5, 2], ['Aptian', 121.5, 113, 2], ['Albian', 113, 100.5, 2],
  ['Cenomanian', 100.5, 94, 2], ['Turonian', 94, 89.5, 2], ['Coniacian', 89.5, 85.7, 2], ['Santonian', 85.7, 83.6, 2], ['Campanian', 83.6, 72.2, 2], ['Maastrichtian', 72.2, 66, 2],
  // Paleogene
  ['Paleocene', 66, 56, 1], ['Eocene', 56, 33.9, 1], ['Oligocene', 33.9, 23, 1],
  ['Danian', 66, 61.7, 2], ['Selandian', 61.7, 59.2, 2], ['Thanetian', 59.2, 56, 2], ['Ypresian', 56, 48, 2], ['Lutetian', 48, 41, 2], ['Bartonian', 41, 37.7, 2], ['Priabonian', 37.7, 33.9, 2], ['Rupelian', 33.9, 27.3, 2], ['Chattian', 27.3, 23, 2],
  // Neogene
  ['Miocene', 23, 5.33, 1], ['Pliocene', 5.33, 2.58, 1],
  ['Aquitanian', 23, 20.45, 2], ['Burdigalian', 20.45, 16, 2], ['Langhian', 16, 13.8, 2], ['Serravallian', 13.8, 11.6, 2], ['Tortonian', 11.6, 7.25, 2], ['Messinian', 7.25, 5.33, 2], ['Zanclean', 5.33, 3.6, 2], ['Piacenzian', 3.6, 2.58, 2],
  // Quaternary
  ['Pleistocene', 2.58, 0.0117, 1], ['Holocene', 0.0117, 0, 1],
  ['Gelasian', 2.58, 1.8, 2], ['Calabrian', 1.8, 0.774, 2], ['Chibanian', 0.774, 0.129, 2], ['Late Pleistocene', 0.129, 0.0117, 2],
  ['Greenlandian', 0.0117, 0.0082, 2], ['Northgrippian', 0.0082, 0.0042, 2], ['Meghalayan', 0.0042, 0, 2],
];

// Events pinned to the timeline. More of them appear the further you zoom in.
// [time (Ma), level, icon, title, detail]   level 1 = always shown … 5 = only when zoomed right in
const EVENTS = [
  [717, 2, '🧊', 'Snowball Earth begins', 'The Sturtian glaciation: ice reaches the equator and stays for nearly 60 million years.'],
  [650, 3, '🧊', 'Second Snowball Earth', 'The Marinoan glaciation, about 650–635 million years ago.'],
  [635, 2, '🌡', 'The great thaw', 'CO₂ built up under the ice finally melts it; limestone “cap carbonates” mark the sudden hothouse.'],
  [575, 2, '🌿', 'First large life', 'Frond-like Ediacaran organisms spread across the deep sea floor.'],
  [539, 1, '💥', 'The Cambrian explosion', 'Within about 20 million years almost every major animal body plan appears.'],
  [518, 3, '🦐', 'Chengjiang', 'A Chinese fossil bed preserves soft-bodied animals — including the first fish.'],
  [508, 3, '🦐', 'Burgess Shale', 'The famous Canadian fossil bed is laid down in a mud-slide at the foot of a reef.'],
  [470, 2, '🌱', 'Plants reach land', 'Microscopic spores are the first trace of land plants.'],
  [445, 1, '☠️', 'End-Ordovician extinction', 'An ice age wipes out about 85% of marine species. First of the Big Five.'],
  [430, 3, '🌿', 'First upright plants', 'Cooksonia: a few centimetres tall, with tubes to carry water.'],
  [420, 4, '🔥', 'First wildfire', 'The oldest charcoal — proof of land plants and of oxygen-rich air.'],
  [385, 2, '🌳', 'First forests', 'Trees with wood and deep roots transform the land — and the air.'],
  [375, 3, '🐟', 'Fins become limbs', 'Tiktaalik: a fish with a neck, lungs and wrists.'],
  [372, 1, '☠️', 'Late Devonian extinction', 'About 70–75% of species lost as the oceans run short of oxygen. Second of the Big Five.'],
  [335, 2, '🌍', 'Pangaea assembles', 'The continents collide into one supercontinent, raising the Appalachians and the Urals.'],
  [318, 3, '🥚', 'Eggs with shells', 'The first amniotes lay eggs that survive on dry land.'],
  [305, 3, '🌴', 'Coal-forest collapse', 'The tropical rainforests break up as the climate dries.'],
  [300, 2, '🧊', 'Peak of the Paleozoic ice age', 'Ice sheets cover much of southern Gondwana.'],
  [252, 1, '☠️', 'The Great Dying', 'Siberian eruptions cause the worst extinction ever: around nine in ten ocean species lost. Third of the Big Five.'],
  [247, 4, '🌡', 'Lethal heat', 'Tropical seas reach about 40 °C in the aftermath; recovery takes millions of years.'],
  [233, 2, '🌧', 'The Carnian rains', 'One to two million years of wet climate — and dinosaurs spread straight afterwards.'],
  [225, 3, '🐁', 'First mammals', 'Tiny, shrew-like and probably nocturnal.'],
  [201, 1, '☠️', 'End-Triassic extinction', 'Eruptions as Pangaea splits kill about three-quarters of species — and leave the world to the dinosaurs. Fourth of the Big Five.'],
  [183, 4, '🌋', 'Toarcian crisis', 'Huge eruptions in southern Africa and Antarctica; oceans lose oxygen.'],
  [175, 2, '🌊', 'The Atlantic is born', 'Pangaea splits in two; a narrow sea opens between North America and Africa.'],
  [165, 4, '🐉', 'Giants of Sichuan', 'Dashanpu, China: one of the few windows on mid-Jurassic dinosaurs.'],
  [150, 2, '🐦', 'Birds take wing', 'Archaeopteryx, in the lagoons of Bavaria.'],
  [130, 2, '🌸', 'First flowers', 'Flowering plants appear — within 60 million years they dominate the land.'],
  [125, 3, '🪶', 'Feathered dinosaurs of Liaoning', 'Volcanic ash preserves feathers, colours and stomach contents.'],
  [100, 3, '🌊', 'North America splits in two', 'High seas flood the continent’s interior for 30 million years.'],
  [94, 3, '🔥', 'Peak hothouse', 'The warmest climate and highest seas of the age of dinosaurs.'],
  [66, 1, '☄️', 'The asteroid', 'A 10-km rock strikes Mexico. About 75% of species die, including every dinosaur but the birds. Fifth of the Big Five.'],
  [65.3, 4, '🐁', 'Mammals move in', 'Within a million years of the impact, mammals grow from rat-sized to pig-sized.'],
  [62, 4, '🐧', 'The first penguins', 'Waimanu, in New Zealand: already flightless, already a diver.'],
  [60, 3, '🐍', 'A rainforest with a giant snake', 'The oldest known tropical rainforest, at Cerrejón, Colombia — home of Titanoboa.'],
  [56, 2, '🔥', 'Sudden global warming', 'The Paleocene–Eocene Thermal Maximum: 5–8 °C of warming from a burst of carbon.'],
  [50, 3, '⛰', 'India meets Asia', 'The collision begins raising the Himalayas and Tibet.'],
  [53, 4, '🌴', 'Forests near the North Pole', 'The warmest stretch of the last 66 million years: alligator relatives on Ellesmere Island.'],
  [49, 4, '🌿', 'A fern covers the Arctic Ocean', 'The Azolla event: a floating water fern for about a million years.'],
  [47, 4, '🦇', 'Messel lake', 'A German volcanic lake preserves bats, early horses and primates in perfect detail.'],
  [41, 4, '🐋', 'Whales leave land for good', 'Basilosaurus: fully marine, with tiny leftover hind legs.'],
  [34, 2, '🧊', 'Antarctica freezes', 'The first permanent ice sheet in over 200 million years; the modern icehouse begins.'],
  [33.9, 3, '🔀', 'The Great Break', 'As Antarctica freezes, many of Europe’s mammals vanish and newcomers arrive from Asia.'],
  [32, 4, '🐒', 'Monkeys cross the Atlantic', 'African primates reach South America, probably on rafts of floating plants.'],
  [23, 4, '🦍', 'Apes appear', 'Tail-less primates spread through the forests of Africa.'],
  [19, 3, '🐘', 'Africa joins Eurasia', 'The old Tethys sea is cut in two; elephants walk out of Africa.'],
  [16, 4, '🌡', 'A last warm spell', 'The Miocene climate optimum, before the long cooling.'],
  [14, 3, '🧊', 'Antarctic ice expands', 'The East Antarctic ice sheet grows to near its present size.'],
  [13, 5, '👶', '“Alesi”', 'A baby ape’s skull from Kenya, buried by a volcano 13 million years ago.'],
  [7, 2, '🚶', 'The human line begins', 'DNA puts our split from the chimpanzee line at roughly 7–6 million years ago; Sahelanthropus dates from this time.'],
  [6.5, 3, '🌾', 'Grasslands spread', 'Tropical grasses take over and the savannas open up.'],
  [5.96, 3, '🧂', 'The Mediterranean dries up', 'Cut off from the Atlantic, the sea evaporates, leaving salt over a kilometre thick.'],
  [5.33, 4, '🌊', 'The Mediterranean refills', 'The Atlantic breaks through at Gibraltar in a colossal flood.'],
  [4.4, 3, '🌳', '“Ardi”', 'Ardipithecus ramidus: upright on the ground, still at home in the trees.'],
  [3.66, 4, '👣', 'Footprints at Laetoli', 'Human ancestors walk across wet volcanic ash in Tanzania.'],
  [3.4, 4, '🐪', 'Camels in the Arctic', 'Giant camels in a forest on Ellesmere Island, about 1,200 km from the North Pole.'],
  [3.3, 3, '🪨', 'First stone tools', 'Lomekwi, Kenya — older than our own genus.'],
  [3.2, 4, '🦴', '“Lucy”', 'Australopithecus afarensis at Hadar, Ethiopia.'],
  [3.0, 4, '🌡', 'A warmer world with today’s CO₂', 'The mid-Pliocene: 2–3 °C warmer, seas 10–20 m higher.'],
  [2.8, 3, '🌉', 'The Americas join', 'The Isthmus of Panama closes; animals cross in both directions. The oldest Homo fossil dates from the same time.'],
  [2.58, 2, '❄️', 'The Ice Age begins', 'Ice sheets start to grow and shrink across the northern continents.'],
  [1.8, 3, '🌍', 'Humans beyond Africa', 'Homo erectus at Dmanisi, Georgia.'],
  [1.76, 4, '🪓', 'The handaxe', 'A tool made to a design — in use for over a million years.'],
  [1.0, 3, '🔥', 'Fire under control', 'Ash and burnt bone deep inside Wonderwerk Cave, South Africa.'],
  [0.9, 4, '🧊', 'Longer, deeper ice ages', 'The cycle slows from every 41,000 years to about every 100,000.'],
  [0.43, 5, '🦴', 'The Pit of Bones', 'At least 28 early Neanderthals at Atapuerca, Spain — and the oldest human DNA.'],
  [0.315, 3, '🧠', 'Homo sapiens', 'The oldest known fossils of our species, at Jebel Irhoud, Morocco.'],
  [0.3, 5, '🎯', 'Hunting spears', 'Carved wooden spears among butchered horses at Schöningen, Germany.'],
  [0.125, 4, '🌊', 'The last warm period', 'Slightly warmer than today; seas 6–9 m higher; hippos in the Thames.'],
  [0.1, 4, '🎨', 'Paint and beads', 'A paint workshop and shell beads at Blombos Cave, South Africa.'],
  [0.074, 5, '🌋', 'Toba super-eruption', 'The largest eruption of the last two million years, in Sumatra.'],
  [0.06, 4, '⛵', 'Out of Africa, across the sea', 'Modern humans spread through Asia and reach Australia.'],
  [0.051, 5, '🖼', 'The oldest story in pictures', 'A cave painting of human figures and a wild pig in Sulawesi, Indonesia.'],
  [0.045, 5, '🧍', 'Modern humans in Europe', 'They meet — and mix with — the Neanderthals.'],
  [0.04, 4, '🕯', 'The last Neanderthals', 'Soon Homo sapiens is the only human species left.'],
  [0.036, 5, '🦁', 'Chauvet Cave', 'Lions, rhinos and mammoths painted on the walls of a French cave.'],
  [0.022, 4, '🧊', 'Peak of the last ice age', 'Ice 3 km thick over Canada; sea level 120 m lower; people already in North America.'],
  [0.0129, 5, '❄️', 'A sudden cold snap', 'The Younger Dryas: a 1,200-year return to near-glacial cold.'],
  [0.0117, 3, '🌾', 'The Holocene begins', 'The climate steadies; within a few centuries people in the Fertile Crescent are farming.'],
  [0.0082, 5, '🌊', 'Britain becomes an island', 'Rising seas drown Doggerland, the plain that joined it to Europe.'],
  [0.0045, 5, '🏛', 'The pyramids', 'Built while the last woolly mammoths were still alive on Wrangel Island.'],
  [0.00025, 5, '🏭', 'The Industrial Revolution', 'CO₂ begins to climb from 280 parts per million toward today’s 420-plus.'],
];
if (typeof module !== 'undefined') module.exports = { PERIOD_BOUNDS, DIVS, EVENTS };
