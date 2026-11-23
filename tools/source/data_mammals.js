// The Age of Mammals, chapter by chapter: one card for each epoch of the Paleogene and Neogene, so the
// header, the map's title and the Insights tab change as the timeline moves through them. (The Quaternary
// and the Holocene have their own period cards.) Each chapter's sources are under p:<id> in refs_wanted.txt.
// Fields: id, name, start, end (millions of years ago), title, mapTitle, desc, and the Insights block:
// big, signs [icon, when, what], know (how we know), today (why it matters now).
// ==== the Age of Mammals, chapter by chapter ====
const CHAPTERS = [
  { id: 'paleocene', name: 'Paleocene', start: 66, end: 56, title: 'The World Starts Over', mapTitle: 'The Paleocene World',
    desc: 'The dinosaurs are gone, apart from the birds. Within about a million years the forests grow back and mammals grow from rat-sized to pig-sized. Rainforest with a 13-metre snake covers what is now Colombia, and the first penguins dive off New Zealand.',
    big: 'The recovery: mammals and birds spread into a world the asteroid emptied.',
    signs: [
      ['🌿', 'Recovery', 'At Corral Bluffs in Colorado, fossil leaves, pollen and skulls show the forest coming back and mammals getting bigger, step by step, within about a million years of the impact.'],
      ['🐍', 'About 60 MYA', 'The oldest known tropical rainforest, at Cerrejón in Colombia, home of Titanoboa, a snake about 13 m long.'],
      ['🐧', 'About 61 MYA', 'The first penguins: already flightless, already diving with flipper-like wings.'],
      ['🐦', 'About 62 MYA', 'Bird families we know today appear fast: a relative of the African mousebirds lived in New Mexico.'],
      ['🌡', 'Climate', 'Warm, and getting warmer. There is no ice at either pole.'],
    ],
    know: 'Rocks laid down just after the impact are rare, because most have worn away. Corral Bluffs is an exception: hard lumps in the rock hold mammal skulls from every few hundred thousand years after the impact, beside fossil leaves and pollen from the same layers.',
    today: 'A mass extinction clears the stage, but recovery is slow on a human timescale: even at Corral Bluffs it took hundreds of thousands of years for the forests and the mammals to come back.' },
  { id: 'eocene', name: 'Eocene', start: 56, end: 33.9, title: 'The Hothouse', mapTitle: 'The Eocene World',
    desc: 'The warmest stretch since the dinosaurs. Forests reach the poles, with alligator relatives on islands near the North Pole. The first horses, primates and bats spread, and whales walk back into the sea.',
    big: 'A world without ice: a sudden burst of warming at the start, the warmest stretch of the last 66 million years, then a slow slide towards cold.',
    signs: [
      ['🔥', '56 MYA', 'A burst of carbon warms the world by 5–8 °C in under 20,000 years. The first horses, primates and even-toed hoofed mammals turn up in North America and Europe at this moment.'],
      ['🌴', 'About 53–49 MYA', 'The warmest stretch: forests on Ellesmere Island in the Canadian Arctic, with alligator relatives, tortoises and tapir relatives.'],
      ['🌿', 'About 49 MYA', 'For about a million years a floating water fern, Azolla, covers the Arctic Ocean, which has a layer of fresh water on top.'],
      ['🐋', 'About 50–40 MYA', 'Whales go from wading mammals with legs to animals that never leave the sea.'],
      ['⛰', 'About 50 MYA', 'India runs into Asia, and the Himalayas begin to rise.'],
    ],
    know: 'Deep-sea mud records the climate of the whole Age of Mammals. The shells of tiny sea creatures keep the oxygen of the water they grew in, and that oxygen changes with temperature and ice. Cores drilled from the sea floor now give an unbroken record of the last 66 million years, dated by the regular wobbles of Earth’s orbit.',
    today: 'The burst of warming 56 million years ago is the nearest natural match to what people are doing now — but today carbon is going into the air about ten times faster than it did then.' },
  { id: 'oligocene', name: 'Oligocene', start: 33.9, end: 23, title: 'The Big Chill', mapTitle: 'The Oligocene World',
    desc: 'Ice covers Antarctica for the first time in over 200 million years, and the world turns cooler and drier. In Europe many old mammals vanish and newcomers arrive from Asia. Monkeys cross the Atlantic, and Paraceratherium, the biggest land mammal ever, browses the trees of Asia.',
    big: 'The icehouse begins: a cooler, drier world, open woodland, and the first giants of the new age.',
    signs: [
      ['🧊', '33.9 MYA', 'Antarctica freezes over in two quick steps about 300,000 years apart, as carbon dioxide in the air falls.'],
      ['🔀', '33.9 MYA', 'The “Great Break”: in Europe many mammals die out and others arrive from Asia.'],
      ['🌊', 'Southern Ocean', 'A gap opens between South America and Antarctica, the Drake Passage. When it opened — 41 or nearer 30 million years ago — and how much it mattered for the ice are still argued over.'],
      ['🐒', 'About 32 MYA', 'Monkeys from Africa reach South America — across the young Atlantic, probably on rafts of floating plants.'],
    ],
    know: 'As ice grew on Antarctica it locked up the lighter kind of oxygen from seawater. The sudden jump in the oxygen of deep-sea shells 33.9 million years ago shows when the ice came, and how quickly.',
    today: 'Antarctica’s ice sheet has been there ever since, growing and shrinking. How much warming it can take before large parts of it melt is one of the big questions in climate science today.' },
  { id: 'miocene', name: 'Miocene', start: 23, end: 5.33, title: 'Grasslands and Apes', mapTitle: 'The Miocene World',
    desc: 'Africa joins Eurasia, and elephants walk out of Africa. Apes live across Africa, Europe and Asia. A last warm spell gives way to cooling, grasslands spread, and at the very end the Mediterranean dries to salt.',
    big: 'The modern world takes shape: new mountains, new land bridges, and grasslands that will feed great herds of grazers.',
    signs: [
      ['🐘', 'About 19 MYA', 'Africa and Arabia meet Eurasia, cutting the old Tethys sea in two. Elephants, apes and many others cross both ways.'],
      ['🌡', '17–15 MYA', 'The Miocene Climatic Optimum: carbon dioxide in the air higher than today’s, and the world much warmer.'],
      ['🌾', '8–6 MYA', 'Grasses that thrive in heat and drought spread across the tropics, and grazing animals switch to eating them.'],
      ['🦍', 'Apes', 'Apes live from Kenya to Germany and China — Ekembo, Danuvius and many more.'],
      ['🧂', '5.97–5.33 MYA', 'The Mediterranean is cut off from the Atlantic and dries to salt.'],
    ],
    know: 'Grasses of hot, dry places make sugar in a different way, and it leaves a mark on the carbon in the teeth of animals that eat them. Fossil teeth from four continents switch to that mark between 8 and 6 million years ago.',
    today: 'The Miocene warm spell had carbon dioxide levels like those the world may reach this century, so scientists study it as a guide to a warmer future.' },
  { id: 'pliocene', name: 'Pliocene', start: 5.33, end: 2.58, title: 'The Ape That Stood Up', mapTitle: 'The Pliocene World',
    desc: 'The Atlantic floods back into the dry Mediterranean. Our relatives walk upright in East Africa. The world is warmer than today, with camels and forests in the High Arctic, until the Americas join and the northern ice begins.',
    big: 'A little warmer than today, with about today’s carbon dioxide in the air — the last time the world looked like where we are heading.',
    signs: [
      ['🌊', '5.33 MYA', 'The Atlantic breaks back into the dry Mediterranean at Gibraltar.'],
      ['👣', '3.66 MYA', 'Footprints at Laetoli: our relatives walk upright across wet volcanic ash.'],
      ['🐪', 'About 3.4 MYA', 'Giant camels live on Ellesmere Island, in a forest about 1,200 km from the North Pole.'],
      ['🌡', 'About 3 MYA', 'A warm spell, 2–3 °C warmer than today, with higher seas.'],
      ['🌉', 'About 2.8 MYA', 'The Isthmus of Panama joins the Americas; animals cross both ways in the Great American Interchange.'],
    ],
    know: 'Leaves, wood, beetles and pollen from the Arctic and across the north show where forests grew. Maps built from them are used to test the computer models that forecast our own climate.',
    today: 'Carbon dioxide in the warm Pliocene was about where it is today, and the world it made was warmer, with higher seas. The difference is time: today’s ice and oceans have not caught up with today’s air yet.' },
];
if (typeof module !== 'undefined') module.exports = { CHAPTERS };
