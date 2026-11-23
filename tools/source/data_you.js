// ============================================================
// YOU — the thread from the reader back through deep time
// ============================================================
// YOU_LINE: what the reader's own ancestors were at each moment. Each entry
// names a stand-in — an animal (or human) in the app that is a close cousin
// of the real ancestor. The real ancestors are almost never found, and could
// not be recognised if they were; the page says so wherever this is shown.
//   from/to  million years ago      at    a good moment to visit
//   what     short description      like  an animal card's exact name, or hom: a hominin id
const YOU_LINE = [
  { from: 4567, to: 1800, at: 3200, what: 'the first microbes — or nothing yet', like: null,
    text: 'For the first few hundred million years there may have been no life at all. Then your ancestors are microbes: single cells without a nucleus, too small to see. Every living thing today, you included, comes from them.' },
  { from: 1800, to: 720, at: 1200, what: 'a single cell with a nucleus', like: null,
    text: 'Your ancestor is one cell floating in the sea — a cell with a nucleus, like the cells in your body, but living alone. For more than a billion years nothing much bigger exists. The first fungi, found in rocks about a billion years old, are close cousins: fungi are nearer relatives of animals than plants are. There are no animals yet.' },
  { from: 720, to: 600, at: 650, what: 'specks of life in the sea', like: null,
    text: 'Your ancestors are microscopic sea creatures — single cells, or little clusters of them — living under and around the ice of a frozen planet. No eyes, no mouth, no brain. But the line from them to you is unbroken.' },
  { from: 600, to: 535, at: 555, what: 'a tiny sea worm', like: 'Ikaria',
    text: 'A worm the size of a grain of rice, with a front end, a back end, a mouth and a gut. It does not look like much, but this is the body plan you still live in: head first, food in one end.' },
  { from: 535, to: 485, at: 518, what: 'a tiny swimmer with a rod along its back', like: 'Haikouichthys',
    text: 'A little swimmer with a stiff rod down its back, muscles in zig-zag blocks, gills, and the beginnings of a skull and eyes. Your backbone starts here.' },
  { from: 485, to: 430, at: 460, what: 'a jawless fish', like: 'Arandaspis',
    text: 'A fish with no jaws and no paired fins, sucking food from the sea floor behind an armoured head. Your ancestors stay jawless for tens of millions of years.' },
  { from: 430, to: 415, at: 423, what: 'one of the first fish with jaws', like: 'Entelognathus',
    text: 'Jaws — made over from the bars that held up the gills. Now your ancestors can bite. The same jaw bones, much changed, are in your face today.' },
  { from: 415, to: 385, at: 395, what: 'a lobe-finned fish', like: 'Eusthenopteron',
    text: 'A fish with fleshy fins, each built around a single stout bone at the base — then two bones, then many. Feel your own arm: one bone, two bones, lots of little ones. That pattern starts here, in a fin.' },
  { from: 385, to: 365, at: 375, what: 'a fish with wrists', like: 'Tiktaalik',
    text: 'A flat-headed fish that can prop itself up in the shallows, with a neck, lungs, and wrist-like bones in its fins. Your ancestors are at the water’s edge.' },
  { from: 365, to: 335, at: 348, what: 'one of the first four-legged animals', like: 'Pederpes',
    text: 'Four legs, with fingers and toes. Your ancestors can walk on land now, though they still go back to the water to lay their eggs, as frogs do.' },
  { from: 335, to: 312, at: 330, what: 'a small, lizard-shaped animal of the coal forests', like: 'Westlothiana',
    text: 'A small insect-hunter among giant ferns and tree-sized club mosses. Somewhere about now your ancestors evolve an egg that can be laid on dry land — and can leave the water for good.' },
  { from: 312, to: 275, at: 305, what: 'an early proto-mammal', like: 'Archaeothyris',
    text: 'Your line has just parted from the line that leads to reptiles, dinosaurs and birds. It looks like a lizard, but it is not one: it has the single opening behind the eye that you still have. From here on, no dinosaur is your ancestor.' },
  { from: 275, to: 255, at: 266, what: 'a therapsid — a proto-mammal standing taller', like: 'Biarmosuchus',
    text: 'Longer legs held more upright, teeth of different shapes, and probably a warmer, busier body. Your ancestors are the top animals on land — tens of millions of years before the first dinosaur.' },
  { from: 255, to: 225, at: 250, what: 'a small burrowing cynodont', like: 'Thrinaxodon',
    text: 'The worst extinction in Earth’s history has just happened, and your ancestors are among the few that came through — small, burrowing, perhaps already furry. If they had not, there would be no mammals, and no you.' },
  { from: 225, to: 165, at: 205, what: 'a shrew-sized mammal forerunner', like: 'Early Mammal (Morganucodon)',
    text: 'Tiny, furry, warm-blooded and out at night, while dinosaurs take over the day. The old jaw bones are shrinking into ear bones, which is why you can hear high sounds. Mothers very likely feed their young on milk.' },
  { from: 165, to: 66, at: 125, what: 'a small furry mammal in the dinosaurs’ shadow', like: 'Eomaia',
    text: 'For a hundred million years your ancestors stay small — climbing, burrowing, eating insects, raising their young while giants walk overhead. It is the longest chapter of your family’s story.' },
  { from: 66, to: 56, at: 65, what: 'a squirrel-like primate relative', like: 'Purgatorius',
    text: 'The asteroid has ended the age of dinosaurs. Your ancestors are in the trees, eating fruit and insects, with gripping hands and feet. The world has room for mammals now.' },
  { from: 56, to: 34, at: 55, what: 'a tiny early primate', like: 'Archicebus',
    text: 'A primate that would fit in your palm, with forward-facing eyes, nails instead of claws, and hands made for holding on. You see the world in depth because of animals like this.' },
  { from: 34, to: 23, at: 30, what: 'an early monkey-like primate', like: 'Aegyptopithecus',
    text: 'A cat-sized tree-dweller in the forests of what is now the Egyptian desert, near the point where the line to apes and humans parts from the line to monkeys.' },
  { from: 23, to: 7, at: 18, what: 'an ape', like: 'Ekembo (Proconsul)',
    text: 'An ape: no tail, a bigger brain, a long childhood. Your ancestors live in the forests of Africa, and the tailbone at the base of your spine is what is left of the tail they lost.' },
  { from: 7, to: 4.2, at: 4.4, what: 'an early upright walker', hom: 'ramidus',
    text: 'Your line has parted from the line that leads to chimpanzees. Your ancestors still climb, with a grasping big toe — but on the ground they are starting to walk on two legs.' },
  { from: 4.2, to: 2.8, at: 3.2, what: 'a small upright walker, like Lucy', hom: 'afarensis',
    text: 'About as tall as a six-year-old, walking upright on feet much like yours, with a brain still the size of a chimpanzee’s. Walking came long before thinking big.' },
  { from: 2.8, to: 1.9, at: 2.0, what: 'an early human toolmaker', hom: 'habilis',
    text: 'Your ancestors are making stone tools and eating more meat, and their brains are beginning to grow.' },
  { from: 1.9, to: 0.7, at: 1.5, what: 'a tall, long-legged human', hom: 'erectus',
    text: 'A body like yours from the neck down: tall, long-legged, built for walking far and running long. Your ancestors learn to use fire and walk out of Africa across Asia.' },
  { from: 0.7, to: 0.3, at: 0.5, what: 'a big-brained human, not yet us', hom: 'heidelbergensis',
    text: 'Big brains, wooden spears, shared hunts, shelters and hearths. One branch of this family will become the Neanderthals. Another, in Africa, is becoming us.' },
  { from: 0.3, to: 0, at: 0.02, what: 'people like you', hom: 'sapiens',
    text: 'People like you — who paint, sing, tell stories and bury their dead. From here on, every one of your ancestors would be at home in your family, if you only knew their names.' },
];
// Great eruptions and impacts, shown on the map while the timeline is inside their window.
// Each is drawn with its name, so a lava glow is never mistaken for an asteroid strike.
//   [lat, lon (today), from, to (million years ago), kind, size, name, what happened]
const SPARKS = [
  [66.0, 96.0, 252.6, 251.2, 'volcano', 46, 'Siberian Traps', 'Lava floods across Siberia for hundreds of thousands of years. Its gases drove the Great Dying — the worst extinction in Earth’s history.'],
  [26.5, 102.0, 260.6, 259.2, 'volcano', 26, 'Emeishan Traps', 'Lava floods across what is now south-west China, during a smaller extinction about 260 million years ago.'],
  [32.0, -8.0, 201.9, 200.9, 'volcano', 30, 'Central Atlantic eruptions', 'Lava pours from the crack where Pangaea is tearing apart — where the Atlantic Ocean is today. Its gases drove the end-Triassic extinction.'],
  [40.6, -74.2, 201.9, 200.9, 'volcano', 26, 'Central Atlantic eruptions', 'Lava pours from the crack where Pangaea is tearing apart — where the Atlantic Ocean is today. Its gases drove the end-Triassic extinction.'],
  [51.4, -68.7, 214.4, 213.7, 'impact', 20, 'Manicouagan impact', 'An asteroid strikes what is now Quebec. Its crater is now a ring-shaped lake, about 70 km across, that you can see from space.'],
  [19.0, 74.0, 66.5, 65.5, 'volcano', 30, 'Deccan Traps', 'Volcanic eruptions in India — not the asteroid, which struck Mexico, and not the Siberian Traps, which came 186 million years earlier. Lava had been pouring out for hundreds of thousands of years before the impact and kept going after it: a one-two punch, with the eruptions already stressing life when the asteroid hit. Whether the biggest pulse came just before or just after the impact is still argued over.'],
  [21.4, -89.5, 66.04, 65.7, 'impact', 30, 'Chicxulub impact', 'The asteroid that ended the age of dinosaurs: about 10 km wide, striking a shallow sea where Mexico’s Yucatán Peninsula is today.'],
  [68.0, -28.0, 56.4, 55.5, 'volcano', 28, 'North Atlantic eruptions', 'Lava pours out as Greenland pulls away from Europe. Its carbon may have helped cause a sudden warming 56 million years ago.'],
  [2.6, 98.8, 0.0745, 0.0735, 'volcano', 22, 'Toba super-eruption', 'A super-eruption in Sumatra about 74,000 years ago, one of the largest of the last two million years. Its ash fell as far away as India.'],
];
// Journeys: guided trips through time. "you", "extinctions" and "finds" are built from the data
// above and elsewhere; this one is written out.
const DRIFT_STOPS = [
  { t: 1800, head: 'Nuna', text: '1.8 billion years ago most of the land is gathering into an older supercontinent, Nuna, around what is now North America. Where each piece sat is far less certain than it is later on.' },
  { t: 1000, head: 'Rodinia', text: 'A billion years ago much of the land is gathering into a supercontinent, Rodinia, around what is now North America. Nothing lives on the land yet.' },
  { t: 700, head: 'A frozen world', text: 'The land lies scattered near the equator — the broken pieces of an older supercontinent — and ice reaches almost everywhere. This is Snowball Earth.' },
  { t: 500, head: 'Gondwana', text: 'The southern lands — today’s Africa, South America, Antarctica, Australia and India — are joined in one giant continent, Gondwana. The northern pieces drift alone, as islands in a warm sea.' },
  { t: 300, head: 'Pangaea comes together', text: 'Continents collide, pushing up mountains as high as the Himalayas where the worn-down Appalachians stand today. Nearly all the land on Earth is now one supercontinent: Pangaea.' },
  { t: 201.4, head: 'Pangaea begins to tear', text: 'Cracks open between North America and Africa, and lava floods out. The crack will become the Atlantic Ocean.' },
  { t: 150, head: 'Two halves', text: 'Laurasia in the north, Gondwana in the south, and the warm Tethys Sea between them. The young Atlantic is a narrow seaway.' },
  { t: 100, head: 'The southern lands scatter', text: 'South America has pulled away from Africa, and the South Atlantic is open. India has broken away from Antarctica and Australia and is heading north.' },
  { t: 50, head: 'India meets Asia', text: 'After racing north at up to 15 cm a year — fast, for a continent — India begins to collide with Asia. The crumpling crust will rise into the Himalayas, which are still growing.' },
  { t: 3, head: 'A bridge between the Americas', text: 'By about three million years ago the Isthmus of Panama joins North and South America. Animals walk across in both directions, and ocean currents are forced into new paths.' },
  { t: 0, head: 'Still moving', text: 'The plates have not stopped. The Atlantic widens by a few centimetres every year — about as fast as your fingernails grow.' },
];
if (typeof module !== 'undefined') module.exports = { YOU_LINE, SPARKS, DRIFT_STOPS };
