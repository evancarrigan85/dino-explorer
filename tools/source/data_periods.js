// Famous fossil sites (the Insights tab's pins) and the map's labels, oceans and Ice Age notes.
// The periods themselves — names, dates, descriptions, insights, extinction notes — are in content/periods.json.

// ── famous fossil sites (shown on the map with the Insights tab) ────
// [name, lat, lon, [periods], note]
const SITES = [
  ['Mistaken Point', 46.63, -53.17, ['ediacaran'], 'Newfoundland, Canada. Whole Ediacaran sea-floor communities buried by volcanic ash. World Heritage Site.'],
  ['Ediacara Hills', -30.8, 138.1, ['ediacaran'], 'South Australia. Where the period\'s strange fossils were first recognised, in 1946.'],
  ['Burgess Shale', 51.44, -116.47, ['cambrian'], 'British Columbia, Canada. Soft-bodied Cambrian animals in exquisite detail, found by Charles Walcott of the Smithsonian in 1909.'],
  ['Chengjiang', 24.67, 102.98, ['cambrian'], 'Yunnan, China. About 10 million years older than the Burgess Shale — including the earliest known fish.'],
  ['Sirius Passet', 82.79, -42.2, ['cambrian'], 'North Greenland. One of the oldest Cambrian soft-bodied faunas, 800 km from the North Pole.'],
  ['Fezouata', 30.5, -5.9, ['ordovician'], 'Morocco. Shows that the odd animals of the Cambrian lived on into the Ordovician.'],
  ['Soom Shale', -32.2, 19.0, ['ordovician'], 'South Africa. Animals preserved in mud laid down beside the end-Ordovician ice sheet.'],
  ['Wenlock Edge', 52.5, -2.75, ['silurian'], 'Shropshire, England. A fossil tropical reef you can walk along.'],
  ['Rhynie Chert', 57.33, -2.84, ['devonian'], 'Scotland. An entire early land ecosystem — plants, fungi, mites — petrified cell by cell in a hot spring.'],
  ['Miguasha', 48.1, -66.37, ['devonian'], 'Québec, Canada. The fishes that were on their way to becoming four-legged animals.'],
  ['Gogo Formation', -18.3, 125.6, ['devonian'], 'Western Australia. Reef fishes preserved in three dimensions — including the oldest known mother with an unborn young.'],
  ['Joggins Cliffs', 45.7, -64.45, ['carboniferous'], 'Nova Scotia, Canada. Upright fossil trees with the earliest reptiles preserved inside their hollow stumps.'],
  ['Mazon Creek', 41.3, -88.3, ['carboniferous'], 'Illinois, USA. Coal-swamp life in ironstone nodules — including the mysterious “Tully monster”.'],
  ['Karoo Basin', -32.3, 22.5, ['permian', 'triassic'], 'South Africa. An almost unbroken record of land animals across the Great Dying.'],
  ['Meishan', 31.08, 119.7, ['permian'], 'China. The rock section that officially marks the end of the Permian.'],
  ['Ischigualasto', -30.1, -67.9, ['triassic'], 'Argentina. The “Valley of the Moon”: the earliest dinosaurs, precisely dated.'],
  ['Petrified Forest', 35.0, -109.8, ['triassic'], 'Arizona, USA. A Triassic forest turned to stone, with early dinosaurs and giant amphibians.'],
  ['Ghost Ranch', 36.33, -106.47, ['triassic'], 'New Mexico, USA. Hundreds of Coelophysis skeletons in one quarry.'],
  ['Jurassic Coast', 50.72, -2.94, ['jurassic'], 'Dorset, England. Where Mary Anning found the first ichthyosaurs and plesiosaurs from 1811.'],
  ['Solnhofen', 48.9, 11.0, ['jurassic'], 'Bavaria, Germany. Lagoon limestone so fine it preserved the feathers of Archaeopteryx.'],
  ['Morrison Formation', 40.44, -109.3, ['jurassic'], 'Western USA. The classic land of Jurassic giants; a wall of 1,500 bones is on show at Dinosaur National Monument.'],
  ['Tendaguru', -9.7, 39.2, ['jurassic'], 'Tanzania. Africa\'s great Jurassic dinosaur beds.'],
  ['Dashanpu', 29.4, 104.8, ['jurassic'], 'Zigong, China. A Middle Jurassic bonebed, a time poorly known elsewhere.'],
  ['Liaoning', 41.6, 120.8, ['cretaceous'], 'China. Feathered dinosaurs, early birds and mammals buried by volcanic ash — fossils that rewrote what dinosaurs looked like.'],
  ['Dinosaur Provincial Park', 50.76, -111.5, ['cretaceous'], 'Alberta, Canada. More than 50 dinosaur species from one stretch of badlands.'],
  ['Flaming Cliffs', 44.14, 103.72, ['cretaceous'], 'Mongolia. Where the first dinosaur nests were recognised, in 1923.'],
  ['Hell Creek', 47.6, -106.9, ['cretaceous'], 'Montana, USA. The last two million years of the dinosaurs — T. rex and Triceratops.'],
  ['Chicxulub crater', 21.4, -89.5, ['cretaceous'], 'Yucatán, Mexico. The buried scar of the asteroid, 180 km across.'],
  ['Kem Kem beds', 30.9, -4.0, ['cretaceous'], 'Morocco. A river system with more giant predators than any ecosystem alive today.'],
  ['Neuquén Basin', -38.95, -68.06, ['cretaceous'], 'Patagonia, Argentina. Home of the largest land animals ever found.'],
  ['Messel Pit', 49.92, 8.76, ['paleogene'], 'Germany. A volcanic lake that preserved fur, feathers, stomach contents and even the colours of beetles, 47 million years ago.'],
  ['Green River', 41.8, -110.7, ['paleogene'], 'Wyoming, USA. Lake beds with millions of perfect fish, plus early bats and horses.'],
  ['Wadi Al-Hitan', 29.27, 30.04, ['paleogene'], 'Egypt. “Valley of the Whales”: hundreds of early whales — with legs — in the desert.'],
  ['Fayum', 29.6, 30.6, ['paleogene'], 'Egypt. Early monkeys, apes and elephants from a vanished forest delta.'],
  ['Rusinga Island', -0.42, 34.17, ['neogene'], 'Kenya. Early apes buried by volcanic ash.'],
  ['Ashfall Fossil Beds', 42.42, -98.15, ['neogene'], 'Nebraska, USA. Rhinos, horses and camels that died around a waterhole after a volcanic ashfall 12 million years ago.'],
  ['Laetoli', -3.22, 35.19, ['neogene'], 'Tanzania. Footprints of upright-walking human ancestors, 3.66 million years old.'],
  ['Hadar', 11.1, 40.58, ['neogene'], 'Ethiopia. Where “Lucy” was found in 1974.'],
  ['Olduvai Gorge', -2.99, 35.35, ['quaternary'], 'Tanzania. Two million years of human ancestors and their tools, layer by layer.'],
  ['Atapuerca', 42.35, -3.52, ['quaternary'], 'Spain. A million years of human occupation in one small range of hills.'],
  ['Zhoukoudian', 39.69, 115.92, ['quaternary'], 'China. The cave home of “Peking Man”.'],
  ['La Brea Tar Pits', 34.06, -118.36, ['quaternary'], 'Los Angeles, USA. Over three million Ice Age fossils trapped in natural asphalt.'],
  ['Naracoorte Caves', -37.03, 140.8, ['quaternary'], 'South Australia. Half a million years of Australia\'s lost giant marsupials.'],
  ['Rising Star Cave', -25.92, 27.78, ['quaternary'], 'South Africa. Over 1,500 bones of Homo naledi.'],
  ['Denisova Cave', 51.4, 84.68, ['quaternary'], 'Siberia. Three kinds of human — Denisovans, Neanderthals and us — used the same cave.'],
];

// ── map labels ─────────────────────────────────────────────────────
// Continents ride their plates: [text, lat, lon (today), from, to, size]
const LABELS = [
  ['Nuna (Columbia)', 52, -100, 1800, 1350, 16], ['Rodinia', 47, -100, 1050, 760, 16], ['Laurentia', 50, -95, 720, 430, 13], ['Baltica', 58, 32, 720, 430, 12], ['Siberia', 63, 105, 720, 260, 12],
  ['Gondwana', 4, 22, 600, 335, 15], ['Avalonia', 52.2, -1.5, 490, 430, 10],
  ['North China', 38, 112, 539, 260, 10], ['South China', 27, 109, 539, 260, 10], ['Kazakhstania', 48, 70, 500, 320, 10],
  ['Laurussia', 50, -75, 430, 335, 14],
  ['Pangaea', 24, -8, 335, 175, 17],
  ['Laurasia', 50, -55, 175, 110, 14], ['Gondwana', -4, 22, 175, 130, 14],
  ['North America', 44, -100, 110, 100, 13], ['Laramidia', 46, -113, 100, 68, 10], ['Appalachia', 37, -82, 100, 68, 10], ['North America', 44, -100, 68, 0, 13],
  ['South America', -12, -57, 130, 0, 13], ['Africa', 8, 22, 130, 0, 14], ['Eurasia', 52, 60, 110, 60, 13],
  ['Europe', 49, 16, 60, 0, 11], ['Asia', 46, 95, 60, 0, 14],
  ['India', 21, 79, 130, 0, 11], ['Australia', -25, 134, 110, 0, 12], ['Antarctica', -79, 80, 130, 0, 12],
  ['Madagascar', -19, 47, 88, 0, 9], ['Greenland', 73, -41, 60, 0, 9], ['Arabia', 23, 45, 25, 0, 9],
];
// Oceans sit between the plates that define them: [text, [lat,lon] a, [lat,lon] b, from, to, minSeparation°, k]
const OCEANS = [
  ['Iapetus Ocean', [48, -66], [62, 10], 600, 430, 12, 0.5],
  ['Rheic Ocean', [51, -2], [32, -6], 480, 335, 12, 0.5],
  ['Paleo-Tethys', [23, 45], [42, 85], 420, 255, 16, 0.5],
  ['Tethys Sea', [21, 79], [48, 68], 250, 55, 16, 0.5],
  ['Atlantic Ocean', [38, -76], [25, -14], 170, 0, 16, 0.5],
  ['South Atlantic', [-12, -38], [-12, 13], 120, 0, 14, 0.5],
  ['Indian Ocean', [-19, 47], [-25, 114], 110, 0, 20, 0.5],
  ['Southern Ocean', [-37, 140], [-67, 140], 45, 0, 12, 0.5],
];
// The world ocean is labelled wherever open water is widest at that moment.
const SUPEROCEAN = [['Panthalassa', 720, 175], ['Pacific Ocean', 175, 0]];
// Ice Age annotations (present-day positions)
const ICE_AGE_NOTES = [
  ['Beringia', 65.5, -169, 'land bridge'], ['Doggerland', 54.5, 3, 'land bridge'], ['Sundaland', 2, 107, 'dry land'], ['Sahul', -9.5, 135.5, 'land bridge'],
  // rivers on the dry sea floor, named where the papers name them (drawn by build_shelf_rivers.py): only when the sea was low enough
  ['Channel River', 49.9, -3.2, 'a river on the dry sea floor', { drop: 70, zoom: 2.2 }], ['Ur-Schatt', 26.9, 52.3, 'a river down the dry Gulf', { drop: 60, zoom: 2.2 }],
  ['North Sunda River', 4.2, 108.6, 'a river across Sundaland', { drop: 60, zoom: 2.2 }],
];

if (typeof module !== 'undefined') module.exports = { SITES, LABELS, OCEANS, SUPEROCEAN, ICE_AGE_NOTES };
