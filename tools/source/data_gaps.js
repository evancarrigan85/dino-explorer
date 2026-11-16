// Filling the empty parts of the map.
// A count of fossil sites by period and region (Nov 2026) showed whole continents with nothing on them
// in some periods — India, Australia, Antarctica and Siberia above all. These animals were chosen to
// fill those gaps. Same row format as data_more.js; W(...) marks an animal as weird.
const R = (g, c, name, emoji, diet, size, habitat, lived, t, fact, sites, extra = {}) => Object.assign({ name, emoji, diet, size, habitat, lived, t, g, c, fact, sites }, extra);
const W = (...a) => Object.assign(R(...a), { weird: 1 });
const IN = 'Invertebrates › ', AT = IN + 'Arthropods › ', FI = 'Fishes › ', AM = 'Amphibians & early tetrapods › ', SY = 'Proto-mammals (synapsids) › ', RE = 'Reptiles › ',
  CR = 'Crocodile line › ', BI = 'Birds › ', MM = 'Mammals › ', D = 'Dinosaurs › ', TH = D + 'Theropods › ', SA = D + 'Sauropods & kin › ';
const P = {
  karoo: [-32.3, 22.5, 'Karoo Basin, South Africa'], hateg: [45.6, 22.9, 'Hațeg, Romania'], chubut: [-43.5, -69.0, 'Chubut, Argentina'], niger: [16.5, 8.0, 'Agadez, Niger'],
  kirkpatrick: [-84.33, 166.3, 'Mount Kirkpatrick, Antarctica'], seymour: [-64.24, -56.6, 'Seymour Island, Antarctica'], olduvai: [-2.99, 35.35, 'Olduvai Gorge, Tanzania'],
  zhoukoudian: [39.69, 115.92, 'Zhoukoudian, China'], lameta: [20.2, 79.1, 'Lameta beds, central India'],
};

const GAPS = {

cambrian: [
  R('invert', IN + 'Sponges', 'Archaeocyaths', '🏺', 'filter', 'Cups a few centimetres to 30 cm tall', 'Warm shallow seas', '~525–510 MYA', [525, 510], '“Ancient cups”: vase-shaped relatives of sponges that built the first reefs on Earth made by animals. They flourished for about fifteen million years, then vanished.', [[61.0, 127.0, 'Lena River, Siberia'], [-31.5, 138.6, 'Flinders Ranges, Australia'], [30.5, -8.5, 'Anti-Atlas, Morocco'], [-82.5, 160.0, 'Transantarctic Mountains, Antarctica']]),
],

ordovician: [
  R('invert', IN + 'Molluscs › Shelled cephalopods', 'Sinoceras', '🦑', 'pred', 'Shell up to about 1 m', 'Open sea', '~460–450 MYA', [460, 450], 'A squid relative in a long, straight, cone-shaped shell. Its fossils are so common in parts of China that the polished stone is sold as “pagoda stone”.', [[30.7, 111.3, 'Yichang, Hubei, China']]),
],

silurian: [
  R('fish', FI + 'Armoured fishes (placoderms)', 'Qilinyu', '🐟', 'pred', 'About 20 cm', 'Shallow sea', '~423 MYA', [424, 422], 'An armoured fish with bony plates along its jaw edges in the same places as the jaw bones of your own face — a clue to where our jaws came from.', [[25.5, 103.8, 'Qujing, Yunnan, China']]),
  R('fish', FI + 'Lobe-finned fishes', 'Megamastax', '🐟', 'pred', 'About 1 m', 'Shallow sea', '~423 MYA', [424, 422], '“Big mouth”: the largest backboned animal known from its time, with sharp teeth for grabbing and blunt ones for crushing armoured prey.', [[25.5, 103.8, 'Qujing, Yunnan, China']],
    { know: 'A fish this big needs a lot of oxygen, so its discovery in 2014 was taken as a sign that the air already held plenty of it.' }),
],

devonian: [
  R('amphib', AM + 'First four-legged animals', 'Tutusius', '🦎', 'pred', 'About 1 m', 'River mouth', '~360 MYA', [361, 359], 'One of the first four-legged animals found in Africa, named after Archbishop Desmond Tutu. Its home lay inside the Antarctic Circle of the time — so the move onto land was not just a tropical story.', [[-33.3, 26.5, 'Waterloo Farm, Makhanda, South Africa']],
    { know: 'It is known from a single shoulder bone, found in rock cut through for a road.' }),
],

permian: [
  R('synapsid', SY + 'Dinocephalians', 'Sinophoneus', '🦁', 'carn', 'Skull about 30 cm', 'Floodplains', '~265 MYA', [267, 263], 'A big-headed hunter from western China, a cousin of Anteosaurus in Africa and Titanophoneus in Russia — the same kinds of animals across Pangaea.', [[39.4, 97.9, 'Dashankou, Gansu, China']]),
  R('synapsid', SY + 'Dicynodonts', 'Endothiodon', '🐗', 'herb', 'About 1.5 m', 'Floodplains', '~260–254 MYA', [260, 254], 'A beaked plant-eater found in South Africa, India and Brazil. One animal on three continents is evidence that they were joined — as the map shows.', [P.karoo, [18.6, 79.6, 'Pranhita–Godavari valley, India'], [-25.5, -51.0, 'Paraná Basin, Brazil'], [-10.5, 35.0, 'Ruhuhu Basin, Tanzania']]),
],

triassic: [
  R('reptile', RE + 'Phytosaurs', 'Parasuchus', '🐊', 'pred', 'About 2 m', 'Rivers and lakes', '~231–222 MYA', [231, 222], 'It looks like a crocodile but is not one: the nostrils sit on a bump right in front of the eyes, not at the tip of the snout. The same shape evolved twice for the same river-ambush life.', [[19.2, 79.5, 'Maleri beds, central India']],
    { know: 'Two skeletons from India were found with the bones of small reptiles in their stomachs.' }),
  R('amphib', AM + 'Temnospondyls', 'Paracyclotosaurus', '🐸', 'pred', 'About 2.3 m', 'Rivers and swamps', '~235 MYA', [240, 230], 'A giant amphibian shaped like a flat-headed crocodile. It probably lay still in the shallows and opened its huge mouth so fast that fish were sucked in.', [[-33.9, 151.18, 'St Peters, Sydney, Australia']]),
],

jurassic: [
  R('dino', SA + 'Early sauropods', 'Vulcanodon', '🦕', 'herb', 'About 6.5 m', 'River plains', '~200–190 MYA', [200, 188], 'One of the first true sauropods: already on four pillar legs, but small. It was found between two lava flows by Lake Kariba, which help date it.', [[-16.6, 28.6, 'Lake Kariba, Zimbabwe']]),
  R('dino', SA + 'Early sauropods', 'Patagosaurus', '🦕', 'herb', 'About 15 m', 'Floodplains', '~170 MYA', [172, 166], 'A long-neck of Middle Jurassic Patagonia, known from many skeletons of young and old — so we can watch it grow up.', [P.chubut]),
  W('dino', SA + 'Dicraeosaurs', 'Brachytrachelopan', '🦕', 'herb', 'About 10 m', 'Floodplains', '~150 MYA', [152, 148], 'A sauropod with a short neck — shorter than its back. It probably grazed close to the ground, like a giant cow.', [[-43.5, -69.5, 'Cañadón Calcáreo, Chubut, Argentina']]),
  R('dino', SA + 'Dicraeosaurs', 'Dicraeosaurus', '🦕', 'herb', 'About 12–14 m', 'Coastal plains', '~155–150 MYA', [155, 150], 'A short-necked sauropod with tall, forked spines along its neck and back, found at Tendaguru beside Giraffatitan — two giants feeding at different heights.', [[-9.73, 39.23, 'Tendaguru, Tanzania']]),
  R('dino', TH + 'Ceratosaurs & abelisaurs', 'Elaphrosaurus', '🦖', 'carn', 'About 6 m', 'Coastal plains', '~155–150 MYA', [155, 150], '“Light lizard”: a long, slender theropod from Tendaguru, known from almost everything except its skull. Its tiny arms and long legs suggest a fast runner.', [[-9.73, 39.23, 'Tendaguru, Tanzania']]),
  R('dino', SA + 'Early sauropods', 'Barapasaurus', '🦕', 'herb', 'About 14 m', 'Riverside forest', '~185 MYA', [190, 175], '“Big-legged lizard”: one of the earliest giant long-necks, known from six animals that seem to have died together in a flood.', [[18.9, 79.7, 'Kota beds, Telangana, India']]),
  R('dino', SA + 'Early sauropods', 'Rhoetosaurus', '🦕', 'herb', 'About 15 m', 'Coal swamps', '~162 MYA', [167, 160], 'Australia’s first well-known long-neck, found by a stockman in 1924. Its foot bones show it walked on a padded heel, like an elephant.', [[-26.6, 148.8, 'Roma, Queensland, Australia']]),
  R('dino', TH + 'Ceratosaurs & abelisaurs', 'Eoabelisaurus', '🦖', 'carn', 'About 6.5 m', 'Lake shores', '~178 MYA', [180, 174], 'The earliest known member of the short-faced abelisaurs. Its arms were already shrinking — a hundred million years before Carnotaurus ended up with arms smaller than a T. rex’s.', [P.chubut]),
  R('dino', TH + 'Megalosaurs & spinosaurs', 'Piatnitzkysaurus', '🦖', 'carn', 'About 4.5–6 m', 'Lake shores', '~178 MYA', [180, 174], 'A medium-sized hunter of Jurassic Patagonia, one of the best-known meat-eaters from the southern continents at a time when most fossils come from the north.', [P.chubut]),
  R('dino', SA + 'Early sauropods', 'Spinophorosaurus', '🦕', 'herb', 'About 13 m', 'River plains', '~167 MYA', [170, 164], 'One of the most complete early sauropods, found in the Sahara. Children from a nearby village helped dig it out.', [P.niger],
    { debate: 'Two spiky bones found with it were first placed on the tail as weapons. They are now thought to be collar bones.' }),
  R('dino', TH + 'Megalosaurs & spinosaurs', 'Afrovenator', '🦖', 'carn', 'About 8 m', 'River plains', '~165 MYA', [167, 161], '“African hunter”: a light, long-armed predator known from one nearly complete skeleton — rare for an African meat-eating dinosaur.', [[17.9, 8.9, 'In Gall, Niger']]),
  R('dino', SA + 'Early long-necks', 'Glacialisaurus', '🦕', 'herb', 'About 6 m', 'Polar forest', '~190 MYA', [194, 188], '“Frozen lizard”: a long-neck dug from a mountain 4,000 m up and 650 km from the South Pole. Antarctica was forested then, though the winter nights lasted months.', [P.kirkpatrick]),
  R('dino', TH + 'Tyrannosaurs', 'Kileskus', '🦖', 'carn', 'About 5 m', 'River plains', '~167 MYA', [168, 166], 'One of the oldest known relatives of Tyrannosaurus, from Siberia — a modest hunter with a nose crest, 100 million years before its giant cousin.', [[55.5, 89.2, 'Sharypovo, Krasnoyarsk, Siberia']]),
],

cretaceous: [
  R('dino', D + 'Armoured dinosaurs › Nodosaurs', 'Polacanthus', '🛡️', 'herb', 'About 5 m', 'Floodplains', '~130–125 MYA', [130, 125], 'An armoured dinosaur from the Isle of Wight with spikes along its sides and a solid shield of bone fused over its hips.', [[50.65, -1.3, 'Isle of Wight, England']],
    { debate: 'Whether it belongs with the nodosaurs, the club-tails, or a small group of its own is still argued.' }),
  R('dino', D + 'Ornithopods › Iguanodonts', 'Mantellisaurus', '🦕', 'herb', 'About 7 m', 'Floodplains', '~126–124 MYA', [126, 124], 'A lighter cousin of Iguanodon, named after Gideon Mantell. Skeletons of both were found in the Bernissart coal mine.', [[50.65, -1.3, 'Isle of Wight, England'], [50.48, 3.65, 'Bernissart, Belgium']]),
  R('dino', D + 'Armoured dinosaurs › Nodosaurs', 'Europelta', '🛡️', 'herb', 'About 5 m', 'Coastal swamps', '~113 MYA', [114, 112], 'The oldest known nodosaur in Europe, found in a coal mine in Spain with two nearly complete skeletons.', [[40.85, -0.85, 'Ariño, Teruel, Spain']]),
  R('dino', D + 'Armoured dinosaurs › Nodosaurs', 'Struthiosaurus', '🛡️', 'herb', 'About 2–3 m', 'Island forest', '~80–66 MYA', [80, 66], 'The smallest armoured dinosaur known — about the size of a large dog. Like other animals on Europe’s islands, it had shrunk.', [[47.8, 16.1, 'Muthmannsdorf, Austria'], [P.hateg[0], P.hateg[1], 'Hațeg, Romania']]),
  R('dino', SA + 'Titanosaurs', 'Ampelosaurus', '🦕', 'herb', 'About 15 m', 'River plains', '~72–66 MYA', [72, 66], 'A titanosaur with bony plates and spikes set in its skin, found among the vineyards of southern France — its name means “vineyard lizard”.', [[42.95, 2.25, 'Campagne-sur-Aude, France']]),
  R('dino', D + 'Ornithopods › Iguanodonts', 'Zalmoxes', '🦕', 'herb', 'About 2.5 m', 'Island forest', '~70–66 MYA', [70, 66], 'A small plant-eater of the island of Hațeg, which lay in a sea where Romania is now. Its mainland relatives were bigger.', [P.hateg]),
  R('dino', SA + 'Titanosaurs', 'Isisaurus', '🦕', 'herb', 'About 18 m', 'River plains', '~70–66 MYA', [70, 66], 'An odd titanosaur with long front legs and a short, upright neck, a little like a giant hyena in outline. It lived in India while the Deccan volcanoes were erupting.', [P.lameta]),
  W('reptile', RE + 'Snakes', 'Sanajeh', '🐍', 'pred', 'About 3.5 m', 'Dinosaur nesting grounds', '~67 MYA', [68, 66], 'A snake caught in the act: its skeleton was found coiled around a crushed dinosaur egg, next to a hatchling sauropod half a metre long.', [[23.1, 73.4, 'Dholi Dungri, Gujarat, India']]),
  W('dino', TH + 'Raptors (dromaeosaurs)', 'Balaur', '🦖', 'pred', 'About 2 m', 'Island forest', '~70 MYA', [72, 66], 'A stocky island animal with two big sickle claws on each foot instead of one.', [P.hateg],
    { debate: 'Named as a raptor, it may really be a large flightless bird. Either way, living on an island had made it strange.' }),
  R('dino', SA + 'Titanosaurs', 'Magyarosaurus', '🦕', 'herb', 'About 6 m; 1 tonne', 'Island forest', '~70 MYA', [72, 66], 'A dwarf titanosaur — a tenth the weight of its mainland cousins. On an island with little food, small was better.', [P.hateg],
    { know: 'Slices of its bones under a microscope show the small skeletons are fully grown adults, not youngsters.' }),
  R('dino', TH + 'Allosaurs & kin', 'Neovenator', '🦖', 'carn', 'About 7.5 m', 'Floodplains', '~127 MYA', [130, 125], 'The top hunter of what is now the Isle of Wight. Channels in its snout bones carried nerves, giving it a sensitive face like a crocodile’s.', [[50.65, -1.3, 'Isle of Wight, England']]),
  W('dino', TH + 'Ostrich-mimics', 'Pelecanimimus', '🦤', 'omni', 'About 2–2.5 m', 'Lake shores', '~127 MYA', [129, 125], 'An early ostrich-mimic with about 220 tiny teeth — more than any other meat-eating dinosaur — and the print of a throat pouch like a pelican’s.', [[40.1, -1.9, 'Las Hoyas, Spain']]),
  R('dino', SA + 'Titanosaurs', 'Diamantinasaurus', '🦕', 'herb', 'About 16 m', 'River plains', '~95 MYA', [96, 93], 'A stocky titanosaur from outback Queensland, nicknamed “Matilda”. It was found beside the meat-eater Australovenator; both may have died stuck in the same billabong.', [[-22.4, 143.0, 'Winton, Queensland, Australia']]),
  W('amphib', AM + 'Temnospondyls', 'Koolasuchus', '🐸', 'pred', 'About 3–4 m', 'Polar rivers', '~125–118 MYA', [125, 118], 'The last of the giant amphibians, alive 50 million years after its kind had died out everywhere else. It hung on in rivers near the South Pole that were too cold for crocodiles.', [[-38.6, 145.6, 'Gippsland coast, Victoria, Australia']]),
  R('dino', SA + 'Titanosaur relatives', 'Sibirotitan', '🦕', 'herb', 'About 12 m', 'River plains', '~120 MYA', [125, 113], 'A long-neck from Siberia, one of the oldest of the titanosaur line known from Asia.', [[55.9, 87.95, 'Shestakovo, Kemerovo, Siberia']]),
],

paleogene: [
  R('bird', BI + 'Penguins', 'Anthropornis', '🐧', 'pred', 'About 1.7 m tall', 'Cool seas', '~45–33 MYA', [45, 33], 'A penguin as tall as a person, from an Antarctica that still had forests on its shores.', [P.seymour]),
  R('croc', CR + 'Land crocodiles', 'Sebecus', '🐊', 'carn', 'About 3 m', 'Forest', '~47–42 MYA', [52, 42], 'A crocodile relative that lived on land, with a tall narrow head and saw-edged teeth like a meat-eating dinosaur’s. With the dinosaurs gone, its kind became South America’s top land predators.', [[-45.5, -68.3, 'Chubut, Argentina']]),
  W('mammal', MM + 'Primates › Early monkeys & apes', 'Perupithecus', '🐒', 'omni', 'About the size of a squirrel', 'Rainforest', '~36 MYA', [37, 35], 'The oldest known South American monkey — and its teeth match African monkeys of the time. Its ancestors must have crossed the young Atlantic on a floating raft of fallen trees.', [[-9.5, -72.8, 'Santa Rosa, Peruvian Amazon']]),
  R('mammal', MM + 'Elephants & kin', 'Eritherium', '🐘', 'herb', 'About 5 kg', 'Coastal forest', '~60 MYA', [61, 59], 'The earliest known relative of elephants: no trunk, no tusks, and about the size of a rabbit.', [[32.9, -6.9, 'Ouled Abdoun, Morocco']]),
  R('mammal', MM + 'Early hoofed mammals', 'Cambaytherium', '🐖', 'herb', 'About 20–35 kg', 'Coastal forest', '~54.5 MYA', [55, 54], 'A pig-sized animal close to the ancestry of horses, rhinos and tapirs. It suggests that whole group first evolved on India while India was still an island drifting north.', [[21.4, 73.1, 'Vastan mine, Gujarat, India']]),
  W('reptile', RE + 'Snakes', 'Vasuki', '🐍', 'pred', 'Perhaps 11–15 m', 'Swamps', '~47 MYA', [48, 46.5], 'A snake that may have rivalled Titanoboa as the longest ever, named after the serpent king of Hindu tradition.', [[23.7, 68.8, 'Panandhro mine, Kutch, India']],
    { debate: 'Only part of the backbone was found, so its length is an estimate with a wide range.' }),
  R('mammal', MM + 'Primates › Early monkeys & apes', 'Eosimias', '🐒', 'omni', 'About 10 cm; would sit in your palm', 'Rainforest', '~45 MYA', [46, 40], '“Dawn monkey”: one of the earliest members of the group that includes monkeys, apes and us. It suggests our branch of the primates began in Asia.', [[31.4, 119.4, 'Shanghuang, Jiangsu, China']]),
],

neogene: [
  R('mammal', MM + 'Marsupials', 'Wakaleo', '🐆', 'carn', 'About the size of a dog', 'Rainforest', '~23–8 MYA', [23, 8], 'A marsupial lion of Australia’s Miocene forests, with slicing teeth and strong climbing arms — an earlier, smaller relative of Thylacoleo.', [[-19.0, 138.7, 'Riversleigh, Queensland, Australia'], [-22.9, 134.9, 'Alcoota, Northern Territory, Australia']]),
  R('mammal', MM + 'Primates › Apes', 'Lufengpithecus', '🦧', 'herb', 'About 50 kg', 'Swamp forest', '~9–6 MYA', [9, 6], 'An ape of southern China known from hundreds of teeth and several skulls, living while the first members of the human family were appearing in Africa.', [[25.1, 102.1, 'Lufeng, Yunnan, China']]),
  R('mammal', MM + 'Carnivores › Cats', 'Dinofelis', '🐆', 'carn', 'About 120 kg', 'Woodland', '~5–1.2 MYA', [5, 1.2], 'A jaguar-sized cat with teeth halfway between a lion’s and a sabre-tooth’s. Its bones lie in the same South African caves as our early relatives — who may well have been its prey.', [[-26.0, 27.73, 'Sterkfontein, South Africa'], [2.9, 36.05, 'Lothagam, Kenya']]),
  R('mammal', MM + 'Elephants & kin', 'Stegodon', '🐘', 'herb', 'Up to about 4 m at the shoulder', 'Forest', '~11 million–12,000 years ago', [11.6, 0.012], 'An elephant cousin whose long tusks grew so close together that its trunk had to hang to one side. Dwarf kinds lived on Indonesian islands, where the “hobbits” of Flores hunted them.', [[30.3, 77.5, 'Siwalik Hills, India'], [35.5, 104.6, 'Gansu, China'], [-7.4, 111.0, 'Java, Indonesia'], [-8.53, 120.46, 'Flores, Indonesia']]),
],

quaternary: [
  R('mammal', MM + 'Primates › Monkeys', 'Giant Gelada (Theropithecus oswaldi)', '🐒', 'herb', 'Males up to about 60 kg', 'Grassland', '~2–0.4 MYA', [2.0, 0.4], 'A grass-eating monkey as big as a large dog. At Olorgesailie in Kenya, stone tools lie among the bones of dozens of them — early humans ate them.', [[-1.58, 36.45, 'Olorgesailie, Kenya'], [4.0, 36.3, 'Koobi Fora, Kenya']]),
  R('mammal', MM + 'Elephants & kin', 'Palaeoloxodon namadicus', '🐘', 'herb', 'Perhaps 5 m tall at the shoulder', 'River plains', '~800,000–20,000 years ago', [0.8, 0.02], 'A straight-tusked elephant of India’s Narmada valley that may have been the largest land mammal ever — larger even than Paraceratherium.', [[22.8, 77.7, 'Narmada valley, Madhya Pradesh, India']],
    { debate: 'The record size is worked out from a few incomplete bones, so it is a careful estimate, not a measurement.' }),
  R('mammal', MM + 'Carnivores › Bears', 'Pygmy Giant Panda (Ailuropoda microta)', '🐼', 'herb', 'About 1 m long', 'Bamboo forest', '~2.4–2 MYA', [2.5, 2.0], 'The earliest known giant panda, half the size of today’s. Its teeth show it was already a bamboo specialist two million years ago.', [[24.6, 109.2, 'Liucheng, Guangxi, China']]),
  R('mammal', MM + 'Even-toed hoofed mammals', 'Pelorovis', '🐃', 'herb', 'About 3 m long; 1,200 kg', 'Savanna', '~2.5–0.8 MYA', [2.5, 0.8], 'A giant relative of the African buffalo, with curving horns each about a metre long. Early humans at Olduvai butchered them.', [P.olduvai]),
  R('mammal', MM + 'Carnivores › Hyenas', 'Giant Hyena (Pachycrocuta)', '🐺', 'carn', 'About 110 kg or more', 'Open country and caves', '~3–0.4 MYA', [3, 0.4], 'The largest hyena that ever lived, built to drag off carcasses and crack the biggest bones. At Zhoukoudian it shared — and fought over — the caves with Peking Man.', [P.zhoukoudian, [37.7, -2.4, 'Venta Micena, Spain']]),
],

};
if (typeof module !== 'undefined') module.exports = { GAPS };
