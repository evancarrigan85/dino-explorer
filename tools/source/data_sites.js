// Life at the site: a picture of one fossil site at its own time, built from what was found there.
// Rules (docs/PLAN.md, Release 10 step 2 and 12.2): every animal drawn was found at the site (its paper says so);
// every animal has a size and is drawn to scale (Evan, 25 Nov 2026: “we can't have size unknown”): `len` is the length
// drawn, in metres; `sz` the size in words-to-be; `basis` says where an estimate comes from when the site's own papers
// do not give it — a paper (`ref`, verified), a museum, published estimates that vary, or a guess from living relatives,
// named; the page shows it beside the size. A herd only with a bonebed or trackways; plants
// only where fossil plants are known; the caption says what is guessed. Sources: refs_wanted.txt target z:<id>.
// Fields: id, name, where, at [lat, lon today], t (Ma), when, open (animal cards that open the scene), blurb,
//   setting, rock, plants, cast [{ name, sil (a key in SIL, silhouettes-data.js), emoji (used until the silhouette loads),
//   zone: air | bank | edge | sand | water, len (m, drawn), sz { k: about | upto | ormore | past | range, a, b (m),
//   m: wingspan | shell (else length) }, basis { k: paper | museum | popular | relatives, ref, url, text }, note,
//   look { text, refs }: how the animal is reconstructed today, for painting it (tools/paint.py animal; Evan, 25 Nov:
//   "Charles Knight style but today's interpretations") — what is not known, such as colour, is said so }],
//   paint { land, water, plants, light, not }: the painter’s brief for tools/paint.py (the landscape only, never animals),
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
      { name: 'Siroccopteryx', sil: 'siroccopteryx', emoji: '🪶', zone: 'air', len: 4, sz: { k: 'ormore', a: 4, m: 'wingspan' }, note: 'a big pterosaur, known from its snout' },
      { name: 'Alanqa', sil: 'alanqa', emoji: '🪶', zone: 'air', len: 4, sz: { k: 'about', a: 4, b: 6, m: 'wingspan' }, note: 'a large pterosaur',
        basis: { k: 'paper', ref: 'ibrahim2010', text: 'most of its jaws come from animals about 3–4 m across; one neck bone may be from one of about 6 m' } },
      { name: 'Carcharodontosaurus', sil: 'carcharodontosaurus', emoji: '🦖', zone: 'bank', len: 12.5, sz: { k: 'range', a: 12, b: 12.5 }, note: 'a giant meat-eater',
        look: { text: 'a giant two-legged meat-eater with a long, deep skull and blade-like serrated teeth, short arms with three fingers, powerful hind legs, and a long tail held level off the ground; scaly skin; its colours are not known, so muted earth tones',
          version: 'its skull and partial bones, with the rest of the body following its close relatives (carcharodontosaurids such as Giganotosaurus)' } },
      { name: 'Deltadromeus', sil: 'deltadromeus', emoji: '🦖', zone: 'bank', len: 8, sz: { k: 'about', a: 8 }, note: 'a large meat-eater',
        look: { text: 'a slender, long-legged meat-eater with long shins built for running, small arms and a long tail held level; known from one partial skeleton, and how it is related to other dinosaurs is argued over; scaly skin; its colours are not known, so muted earth tones',
          version: 'its one partial skeleton (limbs, hips and tail); the skull is not known, so the head is a guess from its likely relatives',
          alternatives: 'it has been placed among the coelurosaurs and, more often since, among the ceratosaurs; the reconstruction changes with the placement' },
        basis: { k: 'museum', url: 'https://www.nhm.ac.uk/discover/dino-directory/deltadromeus.html', text: 'the Natural History Museum’s estimate for its one partial skeleton; the bones are too few to be sure' } },
      { name: 'an abelisaurid', sil: 'abelisaurid', emoji: '🦖', zone: 'bank', len: 9, sz: { k: 'upto', a: 9 }, note: 'a mid- to large-sized meat-eater; its name is not known',
        basis: { k: 'paper', ref: 'chiarenza2016', text: 'from a thigh bone: as big as the largest abelisaurids, such as Carnotaurus' } },
      { name: 'Rebbachisaurus', sil: 'rebbachisaurus', emoji: '🦕', zone: 'bank', len: 14, sz: { k: 'range', a: 14, b: 20 }, note: 'a long-necked plant-eater — one of very few plant-eaters found here',
        basis: { k: 'popular', ref: 'wilson2015', text: 'published estimates of its length run from 14 to 20 m (drawn at 14 m); its bones show it weighed about 8–12 tonnes' } },
      { name: 'Spinosaurus', sil: 'spinosaurus', emoji: '🦖', zone: 'edge', len: 17, sz: { k: 'about', a: 17 }, note: 'at the water’s edge — how much it swam is argued over',
        look: { text: 'a long, low theropod with short hind legs, a long narrow crocodile-like snout with cone-shaped teeth, a tall sail of long spines along its back, and a deep, paddle-like tail with tall spines above and below; scaly skin; its colours are not known, so muted earth tones', refs: ['ibrahim2014', 'ibrahim2020'],
          version: 'the reconstruction of Ibrahim et al. (2014, 2020): short hind legs and a deep, paddle-like tail, an animal at home in the water',
          alternatives: 'others read it as a wader that hunted from the shallows rather than a swimmer (Hone & Holtz 2021; Sereno et al. 2022); the atlas shows it at the water’s edge, which both readings allow' } },
      { name: 'side-necked turtles', sil: 'sidenecked', emoji: '🐢', zone: 'sand', len: 0.45, sz: { k: 'range', a: 0.3, b: 0.6, m: 'shell' }, note: 'on a sandbank',
        basis: { k: 'relatives', text: 'a guess from related side-necked turtles of the time: the Kem Kem turtles are known mostly from skulls' } },
      { name: 'Elosuchus', sil: 'elosuchus', emoji: '🐊', zone: 'water', len: 7.7, sz: { k: 'upto', a: 7.7 }, note: 'a big, long-snouted, fish-eating relative of crocodiles',
        basis: { k: 'paper', ref: 'meunier2017', text: 'estimated from a skull about 1.1 m long' } },
      { name: 'Onchopristis', sil: 'onchopristis', emoji: '🦈', zone: 'water', len: 3, sz: { k: 'range', a: 2, b: 4 }, note: 'a large sawfish-like ray: its teeth are the commonest fossil here',
        basis: { k: 'paper', ref: 'villalobos2021', text: 'from the length of its saw, compared with living sawfish' } },
      { name: 'Axelrodichthys', sil: 'axelrodichthys', emoji: '🐟', zone: 'water', len: 4, sz: { k: 'past', a: 4 }, note: 'a giant coelacanth' },
      { name: 'Neoceratodus', sil: 'neoceratodus', emoji: '🐟', zone: 'water', len: 1.3, sz: { k: 'range', a: 1, b: 1.5 }, note: 'a lungfish',
        basis: { k: 'relatives', text: 'a guess from its living relative, the Australian lungfish; no fossil of it gives its length' } },
      { name: 'Obaichthys', sil: 'obaichthys', emoji: '🐟', zone: 'water', len: 1.5, sz: { k: 'range', a: 1, b: 2 }, note: 'a gar',
        basis: { k: 'relatives', text: 'a guess from living gars; no fossil of it gives its length' } },
    ],
    // the painter’s brief (tools/paint.py): the same paper’s setting, as a painter needs it; what is not known is left out
    paint: { land: 'a low, level far bank of pale sand and reddish sandstone; a wide, flat near shore of sand and small pebbles',
      water: 'a broad, shallow, slow river, brownish-green, braided around a pale sandbank island',
      plants: 'a few tall conifers related to monkey-puzzle trees (straight bare trunks, branches in tiers near the top) spaced along the far bank; low leafy shrubs and small plants at the water’s edge; a few ferns',
      light: 'a hot, hazy dry-season afternoon under a pale sky',
      not: 'grass or grassland, palm trees, cycads, broadleaf forest, flowers in bloom, cliffs, mountains, volcanoes' },
    // things to find in the painting of this place (app: the painting is how a site is seen, Evan, 25 Nov 2026: “the
    // whole scene as one painting should be the way we look at those sites … hotspots … for collecting everything”).
    // x, y, r: centre and radius as a share of the painting's width/height (app/public/painted/scene-kemkem.jpg,
    // candidate 4; a new painting means placing them again). An animal spot names cast members; a place spot takes its
    // words from this site's own fields (from) or says them (text), always from the papers above.
    spots: [
      { id: 'spinosaurus', x: 0.42, y: 0.63, r: 0.06, cast: ['Spinosaurus'] },
      { id: 'carcharodontosaurus', x: 0.705, y: 0.41, r: 0.04, cast: ['Carcharodontosaurus'] },
      { id: 'deltadromeus', x: 0.785, y: 0.435, r: 0.028, cast: ['Deltadromeus'] },
      { id: 'pterosaurs', x: 0.755, y: 0.095, r: 0.06, cast: ['Siroccopteryx', 'Alanqa'], title: 'Pterosaurs' },
      { id: 'fish', x: 0.585, y: 0.695, r: 0.035, cast: ['Onchopristis', 'Axelrodichthys', 'Neoceratodus', 'Obaichthys', 'Elosuchus'], title: 'In the water' },
      { id: 'trees', x: 0.49, y: 0.2, r: 0.04, title: 'Monkey-puzzle conifers', from: 'plants' },
      { id: 'sandstone', x: 0.37, y: 0.29, r: 0.03, title: 'The reddish sandstone', from: 'rock' },
      { id: 'river', x: 0.21, y: 0.32, r: 0.04, title: 'The river', from: 'setting' },
      { id: 'sandbank', x: 0.74, y: 0.62, r: 0.045, title: 'A sandbank', text: 'The rivers here ran in wide channels around big sandbanks, which moved with every flood.' },
      { id: 'logs', x: 0.535, y: 0.53, r: 0.022, title: 'Drift logs', text: 'Trunks carried and buried by the rivers: pieces of petrified wood, probably from conifers related to monkey-puzzle trees, are most of what is known of the plants here.' },
      { id: 'gravel', x: 0.08, y: 0.87, r: 0.04, title: 'Gravel bars', text: 'The rock here is river sandstone and pebble beds: gravel the rivers dropped where they slowed.' },
      { id: 'ripples', x: 0.31, y: 0.8, r: 0.04, title: 'Ripple marks', text: 'The sandstones here keep the marks of the current that laid them down: they show the water flowed north, toward a delta on the sea.' },
      { id: 'plants', x: 0.235, y: 0.552, r: 0.02, title: 'Plants by the water', text: 'Low leafy plants at the water’s edge: leaves of flowering plants, and of plants from an old pond, are found in the rock here.' },
    ],
    know: 'Most fossils here are single bones and teeth, rolled along by the rivers and mixed together; the commonest of all are the teeth of the sawfish Onchopristis. Whole skeletons are very rare. The sandstones show which way the water flowed: north, toward a delta on the sea.',
    debate: '“Stromer’s riddle”: why so many big meat-eaters and so few plant-eaters? Perhaps many of the hunters lived on the rivers’ giant fish; perhaps the rivers mixed together bones from different times and places. And how much did Spinosaurus swim — a diving hunter, or a wader at the water’s edge? The picture shows it at the edge, which both sides allow.',
  },
];
// The size in words, from the numbers, in metric or imperial units. The page writes `size` from it; the new app (app/)
// has the same function in app/src/size.ts and its checks hold the two to the same words.
function sizeText(c, units) {
  const z = c.sz; if (!z) return c.size || '';
  const imp = units === 'imperial', top = Math.max(z.a, z.b || 0);
  const unit = imp ? (top * 3.28084 < 3 ? 'in' : 'ft') : (top < 1 ? 'cm' : 'm');
  const num = m => {
    if (unit === 'in') return String(Math.round(m * 39.3701));
    if (unit === 'ft') { const ft = m * 3.28084; return String(ft < 10 ? Math.round(ft * 2) / 2 : Math.round(ft)); }
    if (unit === 'cm') return String(Math.round(m * 20) * 5);
    return String(m < 10 ? Math.round(m * 10) / 10 : Math.round(m * 2) / 2);
  };
  const u = ' ' + unit, a = num(z.a) + u;
  const t = z.k === 'range' ? num(z.a) + '–' + num(z.b) + u : z.k === 'upto' ? 'up to ' + a : z.k === 'ormore' ? a + ' or more'
    : z.k === 'past' ? 'may have grown past ' + a : 'about ' + a + (z.b ? ', perhaps up to ' + num(z.b) + u : '');
  return (z.m ? z.m + ' ' : '') + t;
}
for (const s of SITE_SCENES) for (const c of s.cast) c.size = sizeText(c, 'metric');
if (typeof module !== 'undefined') module.exports = { SITE_SCENES, sizeText };
