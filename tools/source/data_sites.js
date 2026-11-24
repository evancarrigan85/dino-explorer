// Life at the site: a picture of one fossil site at its own time, built from what was found there.
// Rules (docs/PLAN.md, Release 10 step 2 and 12.2): every animal drawn was found at the site (its paper says so);
// an animal with a known size is drawn to scale (len, metres, from the paper or from the animal's card on this
// site); one without is drawn small and marked “size not known”; a herd only with a bonebed or trackways; plants
// only where fossil plants are known; the caption says what is guessed. Sources: refs_wanted.txt target z:<id>.
// Fields: id, name, where, at [lat, lon today], t (Ma), when, open (animal cards that open the scene), blurb,
//   setting, rock, plants, cast [{ name, sil (a key in SIL, silhouettes-data.js), emoji (used until the silhouette loads),
//   zone: air | bank | edge | sand | water, len (m) or null, size, note }],
//   know, debate.
// ==== life at the site ====
const SITE_SCENES = [
  { id: 'kemkem', name: 'The Kem Kem rivers', where: 'south-east Morocco', at: [30.9, -4.0], t: 97, when: 'about 100–95 million years ago',
    open: ['Spinosaurus', 'Carcharodontosaurus'],
    blurb: 'No place on Earth today has so many big meat-eaters. Here at least four large hunting dinosaurs lived beside rivers full of big fish.',
    setting: 'The head of a vast river system flowing north to a delta on the Tethys Sea: wide channels with big sandbanks, fresh and slightly salty water, and a hot climate with harsh seasons and dry spells.',
    rock: 'River sandstones and pebble beds of the Gara Sbaa and Douira formations, and the mud of an old pond at Oum Tkout.',
    plants: 'Pieces of petrified wood, probably from conifers related to monkey-puzzle trees, and leaves of flowering plants and other plants from the pond.',
    cast: [
      { name: 'Siroccopteryx', sil: 'siroccopteryx', emoji: '🪶', zone: 'air', len: 4, size: 'wingspan 4 m or more', note: 'a big pterosaur, known from its snout' },
      { name: 'Alanqa', sil: 'alanqa', emoji: '🪶', zone: 'air', len: null, size: 'size not known', note: 'a large pterosaur' },
      { name: 'Carcharodontosaurus', sil: 'carcharodontosaurus', emoji: '🦖', zone: 'bank', len: 12.5, size: '12–12.5 m', note: 'a giant meat-eater' },
      { name: 'Deltadromeus', sil: 'deltadromeus', emoji: '🦖', zone: 'bank', len: null, size: 'size not known', note: 'a large meat-eater' },
      { name: 'an abelisaurid', sil: 'abelisaurid', emoji: '🦖', zone: 'bank', len: null, size: 'size not known', note: 'a mid- to large-sized meat-eater; its name is not known' },
      { name: 'Rebbachisaurus', sil: 'rebbachisaurus', emoji: '🦕', zone: 'bank', len: null, size: 'size not known', note: 'a long-necked plant-eater — one of very few plant-eaters found here' },
      { name: 'Spinosaurus', sil: 'spinosaurus', emoji: '🦖', zone: 'edge', len: 17, size: 'about 17 m', note: 'at the water’s edge — how much it swam is argued over' },
      { name: 'side-necked turtles', sil: 'sidenecked', emoji: '🐢', zone: 'sand', len: null, size: 'size not known', note: 'on a sandbank' },
      { name: 'Elosuchus', sil: 'elosuchus', emoji: '🐊', zone: 'water', len: null, size: 'size not known', note: 'a big, long-snouted, fish-eating relative of crocodiles' },
      { name: 'Onchopristis', sil: 'onchopristis', emoji: '🦈', zone: 'water', len: null, size: 'size not known', note: 'a large sawfish-like ray: its teeth are the commonest fossil here' },
      { name: 'Axelrodichthys', sil: 'axelrodichthys', emoji: '🐟', zone: 'water', len: 4, size: 'may have grown past 4 m', note: 'a giant coelacanth' },
      { name: 'Neoceratodus', sil: 'neoceratodus', emoji: '🐟', zone: 'water', len: null, size: 'size not known', note: 'a lungfish' },
      { name: 'Obaichthys', sil: 'obaichthys', emoji: '🐟', zone: 'water', len: null, size: 'size not known', note: 'a gar' },
    ],
    know: 'Most fossils here are single bones and teeth, rolled along by the rivers and mixed together; the commonest of all are the teeth of the sawfish Onchopristis. Whole skeletons are very rare. The sandstones show which way the water flowed: north, toward a delta on the sea.',
    debate: '“Stromer’s riddle”: why so many big meat-eaters and so few plant-eaters? Perhaps many of the hunters lived on the rivers’ giant fish; perhaps the rivers mixed together bones from different times and places. And how much did Spinosaurus swim — a diving hunter, or a wader at the water’s edge? The picture shows it at the edge, which both sides allow.',
  },
];
if (typeof module !== 'undefined') module.exports = { SITE_SCENES };
