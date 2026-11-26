// ============================================================
// LIFE ON THE MAP — animals drawn moving on the map when it is zoomed in
// ============================================================
// Evan, 25 Nov 2026: "mosasaurus swimming in the shoreline, triceratops, like all these big megafauna, like it should be
// visible" when you zoom in, as in a city-builder. creatures.js draws each one from above as a body plan; the engine
// (WorldMap, `fauna` layer) walks them around their own fossil sites, at their own time, on land or in the sea as the
// map has it there. They are drawn far larger than life so they can be seen, and their colours are not known.
//
//   name   the animal card's exact name           plan   a body plan in creatures.js (CREATURES.PLANS)
//   m      length in metres, from the card (span: wingspan, for fliers)
//   where  'land' | 'sea' | 'air' | 'shore' (shore: at the water's edge, in or out of it)
//   n      how many are drawn together. More than one only where the card says why (`group`, shown when one is
//          tapped), and `as` names it on the map (a herd, a nesting colony); `guess: true` when the group is inferred
//          from living relatives, and the words say so.
//   variant  a variant the plan knows ('nose': a long nose horn and no brow horns)
const LIFE_ON_MAP = [
  // Cretaceous
  { name: 'Triceratops', plan: 'ceratopsian', m: 9, where: 'land', n: 3, as: 'a group', group: 'Bonebeds suggest they were social animals.' },
  { name: 'Centrosaurus', plan: 'ceratopsian', m: 5.8, where: 'land', n: 12, as: 'a herd', variant: 'nose', group: 'Near Hilda, Alberta, at least 14 bonebeds in one rock layer hold one enormous herd.' },
  { name: 'Tyrannosaurus rex', plan: 'theropod', m: 12.5, where: 'land', n: 1 },
  { name: 'Edmontosaurus', plan: 'hadrosaur', m: 12, where: 'land', n: 1 },
  { name: 'Parasaurolophus', plan: 'hadrosaur', m: 10, where: 'land', n: 4, as: 'a herd', group: 'Its card says herds travelled together; how big they were is not known.' },
  { name: 'Maiasaura', plan: 'hadrosaur', m: 9, where: 'land', n: 5, as: 'a nesting colony', group: 'At Egg Mountain, nests lie one adult body-length apart, like a seabird colony.' },
  { name: 'Ankylosaurus', plan: 'ankylosaur', m: 9, where: 'land', n: 1 },
  { name: 'Spinosaurus', plan: 'theropod', m: 14, where: 'shore', n: 1 },
  { name: 'Argentinosaurus', plan: 'sauropod', m: 32, where: 'land', n: 1 },
  { name: 'Mosasaurus', plan: 'mosasaur', m: 15, where: 'sea', n: 1 },
  { name: 'Elasmosaurus', plan: 'plesiosaur', m: 14, where: 'sea', n: 1 },
  { name: 'Pteranodon', plan: 'pterosaur', m: 2, span: 6, where: 'air', n: 1 },
  { name: 'Quetzalcoatlus', plan: 'pterosaur', m: 4, span: 10, where: 'air', n: 1 },
  { name: 'Deinosuchus', plan: 'croc', m: 10, where: 'shore', n: 1 },
  { name: 'Sarcosuchus', plan: 'croc', m: 9.2, where: 'shore', n: 1 },
  // Jurassic
  { name: 'Stegosaurus', plan: 'stegosaur', m: 9, where: 'land', n: 1 },
  { name: 'Allosaurus', plan: 'theropod', m: 9.5, where: 'land', n: 1 },
  { name: 'Diplodocus', plan: 'sauropod', m: 26, where: 'land', n: 1 },
  { name: 'Apatosaurus', plan: 'sauropod', m: 22, where: 'land', n: 1 },
  { name: 'Brontosaurus', plan: 'sauropod', m: 22, where: 'land', n: 1 },
  { name: 'Brachiosaurus', plan: 'sauropod', m: 26, where: 'land', n: 1 },
  // Triassic and older
  { name: 'Coelophysis', plan: 'theropod', m: 2.5, where: 'land', n: 8, as: 'a group', group: 'At Ghost Ranch, New Mexico, one quarry holds hundreds that died together.' },
  { name: 'Shonisaurus', plan: 'ichthyosaur', m: 15, where: 'sea', n: 1 },
  { name: 'Dimetrodon', plan: 'synapsid', m: 3.5, where: 'land', n: 1 },
  { name: 'Dunkleosteus', plan: 'shark', m: 6, where: 'sea', n: 1 },
  // The Age of Mammals
  { name: 'Megalodon', plan: 'shark', m: 16, where: 'sea', n: 1 },
  { name: 'Woolly Mammoth', plan: 'proboscidean', m: 5, where: 'land', n: 4, as: 'a family group', guess: true, group: 'Drawn as a family group, as elephants live today — a guess from their living relatives.' },
  { name: 'Columbian Mammoth', plan: 'proboscidean', m: 6, where: 'land', n: 3, as: 'a family group', guess: true, group: 'Drawn as a family group, as elephants live today — a guess from their living relatives.' },
  { name: 'American Mastodon', plan: 'proboscidean', m: 4.5, where: 'land', n: 1 },
];
if (typeof module !== 'undefined') module.exports = { LIFE_ON_MAP };
