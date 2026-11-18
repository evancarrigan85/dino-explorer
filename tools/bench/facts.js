// Known things the map must get right — each tied to a verified source (keys in tools/source/refs.json)
// and, where it is about a fossil, to the animal's own sites in the page's data (so nothing is retyped).
//
// kinds:
//   sea   — what the sea maps show at a place at time t: one of 'sea', 'reached' (land the sea covered at its
//           highest), 'land', 'none'. `at` [lat, lon] today, or `animal` (all of its sites; `site` narrows them).
//   lat   — the latitude a place had at time t, carried on its plate: within [min, max].
//   dist  — kilometres between two places at time t, each carried on its own plate: within [min, max].
//   moved — how much closer two places came between `from` and `to` (km): at least `min`.
// A fact that fails is not deleted: it is a target. The ratchet (tools/bench/baseline.json) only forbids
// a fact that passed from failing again.
module.exports = [
  // ── great events ──
  { id: 'chicxulub-shallow-sea', what: 'The asteroid fell into a shallow sea over the Yucatán', kind: 'sea', at: [21.3, -89.5], t: 66.05, expect: ['sea', 'reached'], refs: ['hildebrand1991'] },
  { id: 'deccan-on-land', what: 'The Deccan lavas poured out over dry land in western India', kind: 'sea', at: [19.0, 74.0], t: 66, expect: ['land', 'reached'], refs: ['schulte2010'] },
  { id: 'siberian-traps-on-land', what: 'The Siberian Traps erupted on land', kind: 'sea', at: [66.0, 100.0], t: 252, expect: ['land', 'reached'], refs: ['burgess2014'] },
  { id: 'camp-neighbours', what: 'At the end of the Triassic, Morocco and Nova Scotia lay side by side either side of the new rift (the Central Atlantic lavas are found in both)', kind: 'dist', a: [31.6, -8.0], b: [45.0, -63.5], t: 201, max: 1500, refs: ['blackburn2013'] },
  { id: 'pangaea-no-atlantic', what: 'In Pangaea there was no Atlantic between Africa and North America', kind: 'dist', a: [31.6, -8.0], b: [45.0, -63.5], t: 250, max: 1500, refs: ['merdith2021'] },
  { id: 'south-atlantic-closed', what: 'Before the South Atlantic opened, Brazil’s bulge fitted into the Gulf of Guinea', kind: 'dist', a: [-8.05, -34.9], b: [4.05, 9.7], t: 140, max: 1200, refs: ['merdith2021'] },
  { id: 'south-atlantic-open', what: 'By 50 million years ago a wide South Atlantic separated Brazil and Africa', kind: 'dist', a: [-8.05, -34.9], b: [4.05, 9.7], t: 50, min: 3000, refs: ['merdith2021'] },
  { id: 'india-south-of-equator', what: '80 million years ago India lay south of the equator', kind: 'lat', at: [21.1, 79.1], t: 80, max: 0, refs: ['patriat1984', 'molnar1975'] },
  { id: 'india-far-from-asia', what: '80 million years ago India was thousands of kilometres from Asia', kind: 'dist', a: [21.1, 79.1], b: [29.65, 91.1], t: 80, min: 4000, refs: ['patriat1984'] },
  { id: 'india-races-north', what: 'Between 80 and 40 million years ago India closed thousands of kilometres on Asia', kind: 'moved', a: [21.1, 79.1], b: [29.65, 91.1], from: 80, to: 40, min: 2000, refs: ['patriat1984', 'vanhinsbergen2012'] },
  { id: 'ordovician-sahara-at-pole', what: 'In the Late Ordovician ice age, North Africa lay near the South Pole under ice', kind: 'lat', at: [25.5, 8.5], t: 445, max: -45, refs: ['finnegan2011', 'torsvik2012'] },
  { id: 'laurentia-tropics', what: 'In the Ordovician, North America straddled the equator', kind: 'lat', at: [39.1, -84.5], t: 450, min: -30, max: 30, refs: ['torsvik2012'] },
  { id: 'antarctica-polar', what: 'By the Late Cretaceous, Antarctica sat over the South Pole', kind: 'lat', at: [-80, 30], t: 90, max: -60, refs: ['torsvik2012'] },
  { id: 'tiktaalik-tropics', what: 'Tiktaalik’s Arctic site lay in the warm low latitudes when it lived', kind: 'lat', animal: 'Tiktaalik', t: 375, min: -30, max: 30, refs: ['daeschler2006'] },
  // ── fossil sites in the right kind of place ──
  { id: 'burgess-in-sea', what: 'The Burgess Shale animals lived on the sea floor', kind: 'sea', at: [51.43, -116.5], t: 508, expect: ['sea', 'reached'], refs: ['smith2015h'] },
  { id: 'gogo-reef', what: 'The Gogo fishes lived on a reef', kind: 'sea', animal: 'Materpiscis', t: 380, expect: ['sea', 'reached'], refs: ['long2008'] },
  { id: 'isotelus-sea', what: 'The giant trilobite Isotelus rex lived in the sea over Manitoba', kind: 'sea', animal: 'Isotelus', t: 455, expect: ['sea', 'reached'], refs: ['rudkin2003'] },
  { id: 'dunkleosteus-sea', what: 'Dunkleosteus swam in the sea over Ohio', kind: 'sea', animal: 'Dunkleosteus', t: 365, expect: ['sea', 'reached'], refs: ['engelman2023'] },
  { id: 'elasmosaurus-seaway', what: 'Elasmosaurus swam in the Western Interior Seaway', kind: 'sea', animal: 'Elasmosaurus', t: 80, expect: ['sea', 'reached'], refs: ['davidson2002'] },
  { id: 'borealopelta-at-sea', what: 'Borealopelta, an armoured dinosaur, was found in rocks laid down in the sea', kind: 'sea', animal: 'Borealopelta', t: 112, expect: ['sea', 'reached'], refs: ['brown2017'] },
  { id: 'hell-creek-land', what: 'Tyrannosaurus lived on the coastal plain of Hell Creek', kind: 'sea', animal: 'Tyrannosaurus rex', t: 66.5, expect: ['land', 'reached'], refs: ['depalma2013'] },
  { id: 'liaoning-land', what: 'Sinosauropteryx lived by lakes in Liaoning', kind: 'sea', animal: 'Sinosauropteryx', t: 125, expect: ['land', 'reached'], refs: ['chen1998'] },
  { id: 'messel-land', what: 'Darwinius lived in forest around the Messel lake', kind: 'sea', animal: 'Darwinius (“Ida”)', t: 47, expect: ['land', 'reached'], refs: ['franzen2009'] },
  { id: 'kem-kem-land', what: 'Spinosaurus hunted in the rivers of the Kem Kem', kind: 'sea', animal: 'Spinosaurus', t: 97, expect: ['land', 'reached'], refs: ['ibrahim2020'] },
  { id: 'tendaguru-land', what: 'Giraffatitan lived at Tendaguru', kind: 'sea', animal: 'Giraffatitan', t: 150, expect: ['land', 'reached'], refs: ['taylor2009'] },
  { id: 'maiasaura-land', what: 'Maiasaura nested on land in Montana', kind: 'sea', animal: 'Maiasaura', t: 77, expect: ['land', 'reached'], refs: ['horner1979'] },
];
