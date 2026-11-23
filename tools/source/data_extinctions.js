// ============================================================
// EXTINCTIONS — the great dyings, each with a map scene
// ============================================================
// Keyed by the period whose insight already carries the name, date, toll and
// cause (data_periods.js) — this file adds what the Extinctions view needs.
//   t        the moment (million years ago)         from/to  the stretch of time the scene plays through
//   win      the timeline window to zoom to         lost     [older, younger]: animals whose last date falls here count as lost
//   pct      [low, high] % of species lost, best estimates (null where no world figure exists)
//   scene    which map animation to play (see SCENES in app.js)
//   steps    [when (0–1 through the scene), caption] — the same lines are listed on the card
//   at       [lat, lon] today of the place it started, where there is one
// Sources are attached in refs_wanted.txt with the target e:<id>.
const EXTINCTIONS = [
  { id: 'ordovician', icon: '🧊', short: 'The great freeze', t: 444, from: 446.4, to: 442.8, win: [452, 438], lost: [447, 442], pct: [85, 85], scene: 'ice', at: null,
    steps: [[0, 'Gondwana lies over the South Pole. Almost all life is in the sea.'],
      [0.14, 'Ice sheets grow across the polar land. So much water is locked up that the sea falls.'],
      [0.42, 'The warm, shallow seas where most animals live drain away or turn cold.'],
      [0.62, 'Then the ice melts. Water low in oxygen spreads across the sea floor — a second wave of death.'],
      [0.86, 'About 85% of sea species are gone.']],
    winners: 'The survivors were mostly small, widespread and unfussy. The same kinds of animals refilled the seas — the cast changed, the play did not.',
    recovery: 'A few million years. Life bounced back faster than after any other great dying.',
    know: 'Rocks scratched and dumped by glaciers lie in what is now the Sahara, which sat over the South Pole. The chemistry of shells from the time records the cold, and the fall in sea level.',
    debate: 'Whether cold and falling seas were enough on their own, or volcanic eruptions and oxygen-starved water did much of the killing.' },
  { id: 'devonian', icon: '🌊', short: 'The suffocating seas', t: 372, from: 374.5, to: 370.8, win: [380, 356], lost: [376, 357], pct: [70, 75], scene: 'anoxia', at: null,
    steps: [[0, 'For the first time, forests are spreading across the land.'],
      [0.28, 'Roots break rock into soil. Rain washes the nutrients into the sea.'],
      [0.5, 'Algae bloom, die and rot, using up the oxygen. Great stretches of sea turn stagnant.'],
      [0.72, 'Reef builders and armoured fishes die. About 70% of species are lost, in pulses over millions of years.'],
      [0.9, 'This is the leading idea, not a settled one: cooling and volcanoes may also have played a part.']],
    winners: 'Sharks and ray-finned fishes took over from the armoured fishes. On land, the four-legged animals that came through went on to become every amphibian, reptile, bird and mammal.',
    recovery: 'Slow. Big reefs did not return for tens of millions of years.',
    know: 'Bands of black, oxygen-starved mud run through the rocks of this age around the world, exactly where the fossils thin out.',
    debate: 'The cause is the least certain of the five. It was also drawn out — two main crises 13 million years apart — rather than one blow.' },
  { id: 'permian', icon: '🌋', short: 'The Great Dying', t: 251.9, from: 252.5, to: 251.5, win: [256, 248], lost: [253.5, 251], pct: [81, 95], scene: 'traps', at: [66, 96],
    steps: [[0, 'Siberia splits open. Lava floods an area nearly the size of Australia.'],
      [0.18, 'Carbon dioxide and other gases pour out and wrap the planet.'],
      [0.38, 'The world heats by about 10 °C. Forests die back.'],
      [0.56, 'The seas turn acid and lose their oxygen.'],
      [0.78, 'Between 8 and 9 in every 10 sea species are gone, and most land animals with backbones. It is the closest life has come to ending.']],
    winners: 'Lystrosaurus, a pig-sized burrower, came through and for a while was the most common land animal on Earth. So did the small cynodonts that led to mammals, and the reptiles that led to dinosaurs.',
    recovery: 'Five to ten million years before rich ecosystems returned.',
    know: 'The lavas of the Siberian Traps and the extinction layer in China have been dated with uranium–lead clocks to the same sliver of time, about 251.9 million years ago.',
    debate: 'How fast it happened — tens of thousands of years or less — and which did the most killing: heat, acid, or lack of oxygen.' },
  { id: 'triassic', icon: '🌋', short: 'The tearing of Pangaea', t: 201.4, from: 202, to: 200.9, win: [206, 197], lost: [203, 200.5], pct: [75, 76], scene: 'rift',
    at: [[45, -64], [40.6, -74.2], [34.5, -80], [14, -16], [9, -12], [5, -55], [-4, -45]],
    steps: [[0, 'Pangaea begins to tear down the middle — where the Atlantic Ocean is today.'],
      [0.2, 'Lava pours from cracks thousands of kilometres long, in pulses over about 600,000 years.'],
      [0.42, 'The gases warm the planet and turn the seas acid.'],
      [0.65, 'About three-quarters of species are lost — among them most of the big crocodile-line reptiles.'],
      [0.85, 'The dinosaurs come through. The world is now theirs.']],
    winners: 'Dinosaurs, pterosaurs, the ancestors of crocodiles, and the first mammals. With their big rivals gone, dinosaurs grew large and spread everywhere.',
    recovery: 'A few million years on land; reefs took longer.',
    know: 'The same lavas lie on both sides of the Atlantic — Morocco, the eastern United States, Brazil — and date to the extinction itself.',
    debate: 'Why dinosaurs came through when their crocodile-line rivals did not: luck, warm blood and feathers, or something else.' },
  { id: 'cretaceous', icon: '☄️', short: 'The asteroid', t: 66, from: 66.3, to: 65.95, win: [70, 62], lost: [67, 65.5], pct: [75, 75], scene: 'impact', at: [21.4, -89.5],
    steps: [[0, 'A rock about 10 km wide is falling towards the shallow sea that covers the Yucatán.'],
      [0.2, 'Impact. The blast is felt around the world; molten rock rains back down and sets forests alight.'],
      [0.38, 'Soot and dust block the Sun. For months, perhaps two years, almost nothing can grow.'],
      [0.6, 'Plants die, then the plant-eaters, then the hunters.'],
      [0.8, 'The sky clears on a different world. Three in four species are gone — every dinosaur except the birds.']],
    winners: 'Small animals that could shelter, and eat seeds, insects or rotting things: birds, mammals, crocodiles, turtles, frogs. Within ten million years mammals had become whales, bats and horses.',
    recovery: 'Forests regrew within thousands of years; full variety took several million.',
    know: 'A thin layer of clay rich in iridium — rare on Earth, common in asteroids — lies at this moment in rocks all over the world, with shocked quartz and beads of melted rock. The crater, 180 km across, is buried under Mexico.',
    debate: 'How big a part the eruptions in India played. They were a one-two punch with the asteroid: lava was already pouring out before the impact and kept going after it. One study suggested the impact’s shock made the eruptions stronger; two studies in 2019 dated the lava closely and disagreed — one found the largest pulse just before the impact, the other most of the lava just after.' },
  { id: 'quaternary', icon: '🦣', short: 'The loss of the giants', t: 0.012, from: 0.065, to: 0.009, win: [0.08, 0], lost: [0.06, 0.0085], pct: null, scene: 'people', at: null,
    steps: [[0, 'Our own species spreads out of Africa, reaching lands that have never known people.'],
      [0.13, 'People reach Australia. Its giant wombats, kangaroos and lizards disappear over the next ten thousand years.'],
      [0.55, 'The ice sheets melt and the climate lurches. People spread through the Americas.'],
      [0.8, 'Mammoths, sabre-toothed cats, giant sloths and many more vanish.'],
      [0.93, 'Hunting, a changing climate, or both together? Still argued — but the losses follow people around the world.']],
    winners: 'Africa and southern Asia kept most of their giants — elephants, rhinos, hippos — perhaps because those animals had lived beside humans for millions of years.',
    recovery: 'None yet. The big animals have not been replaced, and the landscapes they shaped have changed.',
    know: 'Thousands of dated bones show when each kind of animal was last alive in each place, set beside the dates of the first human camps and the record of climate in ice cores.',
    debate: 'The oldest argument in the field: overkill, climate, or both. The answer may differ from continent to continent. Arrival dates are still being pushed back as new sites are found.' },
  { id: 'holocene', icon: '🌍', short: 'Now', t: 0, from: 0.0008, to: 0, win: [0.02, 0], lost: [0.0008, 0], pct: null, scene: 'now', at: null,
    steps: [[0, 'The last 800 years. People now reach every island and every sea.'],
      [0.25, 'Each ring is an animal in this app, seen for the last time.'],
      [0.7, 'Species are now being lost far faster than the natural rate — through hunting, cleared land, and the animals we carry with us.'],
      [0.9, 'This one is not over. Unlike an asteroid, we can see what we are doing — and stop.']],
    winners: 'Whatever lives well beside people: rats, pigeons, crows, weeds. And whatever we choose to protect — several animals once down to a few dozen are back in their thousands.',
    recovery: 'That depends on what happens next.',
    know: 'Museum specimens, ships’ logs, bones in caves and the memories of living people record when each animal was last seen. Counts of living species show how many more are close to the edge.',
    debate: 'Whether to call it a mass extinction yet. Far fewer species have been lost so far than in the five great dyings — the alarm is about the speed, and where it leads if it continues.' },
];
// Where and roughly when people first reached each land (thousand years ago). Dates are approximate and argued over.
const PEOPLE_ARRIVE = [[31, 35, 60, 'Out of Africa'], [-22, 132, 50, 'Australia'], [47, 12, 45, 'Europe'], [62, 110, 35, 'Siberia'], [44, -105, 20, 'North America'], [-22, -58, 15, 'South America']];
// Smaller crises: losses that were real but smaller than the great dyings. Each is a timeline event (data_time.js)
// by its id, which carries its sentence, its date and its sources (n:<id>). Oldest first.
const SMALL_CRISES = ['endediacaran', 'kalkarindji', 'spice', 'ireviken', 'lau', 'hangenberg', 'coalforest', 'capitanian', 'carnian', 'toarcian', 'oae2', 'petm', 'grandecoupure'];
if (typeof module !== 'undefined') module.exports = { SMALL_CRISES, EXTINCTIONS, PEOPLE_ARRIVE };
