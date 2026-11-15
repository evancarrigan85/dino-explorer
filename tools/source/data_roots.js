// The road to mammals, and the missing dinosaur families.
// Synapsids (the mammal line) from their first fossils to the mammals that lived
// beside the dinosaurs, plus dinosaurs from families the app had none or few of.
// Same row format as data_more.js; W(...) marks an animal as weird.
const R = (g, c, name, emoji, diet, size, habitat, lived, t, fact, sites, extra = {}) => Object.assign({ name, emoji, diet, size, habitat, lived, t, g, c, fact, sites }, extra);
const W = (...a) => Object.assign(R(...a), { weird: 1 });
const SY = 'Proto-mammals (synapsids) › ', MF = 'Mammals › Mammal forerunners › ', MM = 'Mammals › ';
const D = 'Dinosaurs › ', TH = D + 'Theropods › ', ED = D + 'Early dinosaurs › ';
const P = {
  texas: [33.6, -99.3, 'Texas Red Beds, USA'], karoo: [-32.3, 22.5, 'Karoo Basin, South Africa'], ocher: [57.9, 54.7, 'Ocher, Perm region, Russia'],
  isheevo: [54.9, 48.3, 'Isheevo, Tatarstan, Russia'], lufeng: [25.1, 102.1, 'Lufeng, Yunnan, China'], tiaoji: [41.3, 119.2, 'Tiaojishan beds, north-east China'],
  liaoning: [41.6, 120.8, 'Liaoning, China'], kayenta: [36.1, -111.2, 'Kayenta Formation, Arizona'], mahajanga: [-15.9, 46.6, 'Mahajanga Basin, Madagascar'],
  nemegt: [43.5, 101.0, 'Nemegt Basin, Mongolia'], ukhaa: [43.5, 101.6, 'Ukhaa Tolgod, Mongolia'], chanares: [-30.0, -67.8, 'Chañares, Argentina'],
};

const ROOTS = {

permian: [
  R('synapsid', SY + 'Varanopids', 'Varanops', '🦎', 'carn', 'About 1.2 m', 'Dry plains', '~279–272 MYA', [279, 272], 'A slim, fast hunter shaped like a monitor lizard, with curved teeth for slicing.', [P.texas, [34.8, -98.4, 'Oklahoma, USA']],
    { debate: 'Varanopids have long been counted as early mammal relatives. A 2020 study argued they were really early reptiles; the question is open.' }),
  R('synapsid', SY + 'Caseids', 'Casea', '🦎', 'herb', 'About 1.2 m', 'Dry plains', '~275 MYA', [279, 272], 'A small-headed, barrel-bodied plant-eater. The big belly held the long gut needed to break down tough leaves — a new way of life for land animals.', [P.texas]),
  R('synapsid', SY + 'Sail-backed hunters (sphenacodonts)', 'Sphenacodon', '🦎', 'carn', 'About 3 m', 'River plains', '~299–280 MYA', [299, 280], 'A close cousin of Dimetrodon with a low ridge along its back instead of a tall sail. Same killer teeth, no sail — a clue that the sail was not needed for hunting.', [[36.2, -106.5, 'Arroyo de Agua, New Mexico']]),
  W('synapsid', SY + 'Sail-backed hunters (sphenacodonts)', 'Secodontosaurus', '🦊', 'carn', 'About 2.7 m', 'Riversides', '~285–272 MYA', [285, 272], 'A sail-back with a long, narrow snout like a fox’s — perhaps for snatching fish, or pulling small animals out of burrows.', [P.texas]),
  R('synapsid', SY + 'Earliest therapsids', 'Tetraceratops', '🦎', 'carn', 'Skull 9 cm; body under 1 m', 'Dry plains', '~279 MYA', [280, 278], 'Known from one small skull with bony bumps on its face. It may be the oldest known therapsid — the group that leads to mammals.', [P.texas],
    { debate: 'Whether it is a true therapsid or a late sail-back relative has been argued since the 1990s. There is only the one skull.' }),
  R('synapsid', SY + 'Earliest therapsids', 'Raranimus', '🦎', 'carn', 'Known from part of a snout', 'Floodplains', '~270 MYA', [272, 266], 'A piece of snout from China with two pairs of canine teeth. It is the most primitive therapsid known, and it hints that therapsids began in the northern lands.', [[39.4, 97.9, 'Dashankou, Gansu, China']]),
  R('synapsid', SY + 'Biarmosuchians', 'Biarmosuchus', '🐕', 'carn', 'About 1.5–2 m', 'Floodplains', '~267 MYA', [268, 265], 'An early therapsid hunter, long-legged and lightly built, with big canine teeth. Its legs were held more upright than a sail-back’s — a step towards the way mammals walk.', [P.ocher]),
  R('synapsid', SY + 'Dinocephalians', 'Titanophoneus', '🦁', 'carn', 'About 3 m', 'Floodplains', '~265 MYA', [267, 262], 'Its name means “titanic murderer”. A heavy-skulled hunter with long front teeth for gripping and big canines for killing.', [P.isheevo]),
  R('synapsid', SY + 'Dicynodonts', 'Eodicynodon', '🐗', 'herb', 'About 30–45 cm', 'Floodplains', '~266 MYA', [267, 263], 'The earliest dicynodont: a small plant-eater that already had the group’s trademark — a turtle-like beak and two tusks.', [P.karoo]),
  R('synapsid', SY + 'Dicynodonts', 'Dicynodon', '🐗', 'herb', 'About 1.2 m', 'Floodplains', '~255–252 MYA', [256, 252], '“Two dog teeth”: a beak, two tusks and no other teeth. Dicynodonts were the most common plant-eaters on Earth at the end of the Permian.', [P.karoo, [-10.5, 35.0, 'Ruhuhu Basin, Tanzania']]),
  R('synapsid', SY + 'Gorgonopsians', 'Gorgonops', '🐅', 'carn', 'About 1.2–2 m', 'Floodplains', '~260–254 MYA', [260, 254], 'The animal the gorgonopsians are named after — “Gorgon face”. Sabre teeth, a jaw that opened extremely wide, and long legs for running down prey.', [P.karoo]),
  R('synapsid', SY + 'Gorgonopsians', 'Lycaenops', '🐺', 'carn', 'About 1 m', 'Floodplains', '~260–254 MYA', [260, 254], '“Wolf face”: a wolf-sized sabre-tooth with long, slim legs held closer under the body than a reptile’s.', [P.karoo]),
  R('synapsid', SY + 'Gorgonopsians', 'Rubidgea', '🐅', 'carn', 'About 3 m; skull 45 cm', 'Floodplains', '~257–253 MYA', [257, 253], 'The biggest African gorgonopsian, with huge sabre teeth and a skull as long as a lion’s whole head and neck. The top predator of its world — wiped out in the Great Dying.', [P.karoo]),
  R('synapsid', SY + 'Cynodonts › Early cynodonts', 'Procynosuchus', '🦦', 'pred', 'About 60 cm', 'Riversides', '~259–252 MYA', [259, 252], 'One of the first cynodonts, the “dog teeth” — the branch that leads to mammals. It already had the start of a bony roof to its mouth, which lets an animal breathe while it chews.', [P.karoo, [-13.0, 32.5, 'Luangwa Valley, Zambia'], [51.2, 9.0, 'Korbach, Germany']],
    { debate: 'Its flexible back and paddle-like tail bones made some scientists think it swam like an otter; others doubt it.' }),
],

triassic: [
  R('synapsid', SY + 'Cynodonts › Early cynodonts', 'Galesaurus', '🦦', 'pred', 'About 75 cm', 'Floodplains', '~251–249 MYA', [252, 249], 'A cynodont of the hard years after the Great Dying. Adults have been found curled up with youngsters — signs of parents caring for their young 250 million years ago.', [P.karoo]),
  R('synapsid', SY + 'Therocephalians', 'Bauria', '🦡', 'herb', 'About 1 m', 'Floodplains', '~248–245 MYA', [248, 244], 'A therocephalian that evolved broad, grinding cheek teeth and a bony palate just as the cynodonts did — the same mammal-like answers, reached separately.', [P.karoo]),
  R('synapsid', SY + 'Cynodonts › Cynognathus & kin', 'Diademodon', '🐖', 'omni', 'Up to 2 m', 'Floodplains', '~247–242 MYA', [247, 242], 'A pig-sized cynodont with wide cheek teeth that met tooth-to-tooth for grinding plants — proper chewing, a mammal habit.', [P.karoo]),
  R('synapsid', SY + 'Cynodonts › Cynognathus & kin', 'Trirachodon', '🦫', 'herb', 'About 50 cm', 'Floodplains', '~248–245 MYA', [248, 244], 'A burrower. Tunnel systems in South Africa hold up to twenty skeletons together: the oldest known colony of land animals living in a shared burrow.', [P.karoo]),
  R('synapsid', SY + 'Cynodonts › Cynognathus & kin', 'Massetognathus', '🐀', 'herb', 'About 50 cm', 'Floodplains', '~236–234 MYA', [237, 233], 'A plant-eater the size of a small dog, and one of the most common animals in its world — the rabbits of the Triassic.', [P.chanares]),
  R('synapsid', SY + 'Cynodonts › Cynognathus & kin', 'Exaeretodon', '🐖', 'herb', 'Up to 1.8 m', 'Floodplains', '~231–225 MYA', [233, 225], 'A big plant-eating cynodont that lived beside the very first dinosaurs — and at first far outnumbered them.', [[-30.1, -67.9, 'Ischigualasto, Argentina'], [-29.7, -53.8, 'Santa Maria, Brazil']]),
  W('synapsid', SY + 'Dicynodonts', 'Lisowicia', '🐘', 'herb', 'About 4.5 m; as heavy as an elephant', 'Floodplains', '~210–205 MYA', [211, 205], 'The last and largest dicynodont: an elephant-sized mammal cousin living among early dinosaurs. Unlike its sprawling relatives it stood on upright legs, like a rhino.', [[50.68, 18.63, 'Lisowice, Poland']],
    { know: 'Found in a clay pit in Poland in 2006 and named in 2019. Its size showed that dinosaurs were not the only animals becoming giants in the Late Triassic.' }),
  R('synapsid', SY + 'Cynodonts › Near-mammals', 'Brasilodon', '🐁', 'pred', 'About 12 cm', 'Floodplains', '~225 MYA', [227, 223], 'A mouse-sized insect-eater, very close to the start of mammals. Its jaws show it grew just two sets of teeth — baby teeth, then adult teeth — as we do.', [[-29.6, -53.4, 'Faxinal do Soturno, Brazil']],
    { debate: 'A 2022 study argued that two sets of teeth mean it fed its young on milk, pushing mammal-style life back to 225 million years ago. Not everyone agrees the teeth prove that.' }),
],

jurassic: [
  R('synapsid', SY + 'Cynodonts › Tritylodonts', 'Oligokyphus', '🐿️', 'herb', 'About 50 cm', 'Woodland', '~200–183 MYA', [201, 183], 'A weasel-shaped plant-eater with gnawing front teeth and a gap behind them, like a rodent. Tritylodonts were the last of the proto-mammals.', [[51.2, -2.6, 'Mendip Hills, England'], P.kayenta, P.lufeng]),
  W('synapsid', SY + 'Cynodonts › Tritylodonts', 'Kayentatherium', '🦫', 'herb', 'About 1 m', 'Riversides', '~190–185 MYA', [192, 184], 'A beaver-sized proto-mammal found with at least 38 babies — far more than any mammal has in one litter. Mammals later traded big litters for bigger brains.', [P.kayenta],
    { know: 'The babies were spotted years after the block was collected, when a preparator noticed tiny teeth; CT scans then revealed the whole clutch.' }),
  R('mammal', MF + 'Earliest mammal relatives', 'Sinoconodon', '🐀', 'pred', 'About 20–30 cm', 'Floodplains', '~195 MYA', [197, 190], 'It had the new, mammal-style jaw joint — but still grew all its life and replaced its teeth many times, like a reptile. Mammal features arrived one at a time.', [P.lufeng]),
  R('mammal', MF + 'Morganucodonts', 'Megazostrodon', '🐁', 'pred', 'About 10–12 cm', 'Woodland', '~200 MYA', [201, 195], 'A shrew-sized insect-eater that probably came out at night, when the dinosaurs were less active. Small, furry and warm: the mammal plan for the next 130 million years.', [[-30.2, 28.0, 'Quthing, Lesotho']]),
  W('mammal', MF + 'Earliest mammal relatives', 'Hadrocodium', '🐁', 'pred', 'Skull 12 mm; about 2 g', 'Woodland', '~195 MYA', [197, 190], 'As light as a paperclip, with a big brain for its size. Its ear bones may already have been separate from the jaw — the last step to a mammal’s ear. One of the smallest mammal relatives ever found.', [P.lufeng]),
  R('mammal', MF + 'Docodonts', 'Docofossor', '🐹', 'pred', 'About 9 cm', 'Underground', '~160 MYA', [161, 158], 'A Jurassic “mole” with shovel-like hands and short fingers for digging, strikingly like a living golden mole — evolved 160 million years ago.', [P.tiaoji]),
  W('mammal', MF + 'Gliders (haramiyidans)', 'Maiopatagium', '🦇', 'herb', 'About 23 cm', 'Forest canopy', '~160 MYA', [161, 158], 'A glider with skin stretched between its arms and legs, preserved as a dark outline in the rock. Mammal relatives took to the air long before bats.', [P.tiaoji]),
  W('mammal', MM + 'Early mammals', 'Volaticotherium', '🐿️', 'pred', 'About 12–14 cm', 'Forest canopy', '~164 MYA', [165, 163], 'A furry glider with a skin membrane, like a flying squirrel — but not related to any living glider.', [[41.3, 119.2, 'Daohugou, Inner Mongolia, China']]),
  R('mammal', MM + 'Early mammals', 'Fruitafossor', '🐜', 'pred', 'About 15 cm', 'Floodplains', '~150 MYA', [152, 148], 'A digger with strong arms and peg-like teeth without enamel, like an armadillo’s — built for eating termites and ants in the time of Stegosaurus.', [[39.15, -108.75, 'Fruita, Colorado']]),
  R('dino', ED + 'Early bird-hipped dinosaurs', 'Lesothosaurus', '🦕', 'herb', 'About 1–2 m', 'Dry floodplains', '~200–190 MYA', [201, 190], 'A small, fast, two-legged plant-eater from the very start of the bird-hipped dinosaurs — the group that later produced Stegosaurus and Triceratops.', [[-29.6, 27.6, 'Lesotho']]),
],

cretaceous: [
  R('mammal', MM + 'Early mammals', 'Eomaia', '🐁', 'pred', 'About 10 cm', 'Forest', '~125 MYA', [126, 124], '“Dawn mother”: a climbing, shrew-sized animal preserved with its fur. It is one of the earliest known relatives of placental mammals — the group that includes us.', [P.liaoning]),
  R('mammal', MM + 'Monotremes', 'Steropodon', '🦆', 'pred', 'About 40–50 cm', 'Polar rivers', '~100 MYA', [103, 97], 'An early relative of the platypus, known from a jaw that turned to opal. It lived in Australia when Australia lay close to the South Pole.', [[-29.43, 147.98, 'Lightning Ridge, Australia']]),
  W('mammal', MM + 'Gondwanatheres', 'Adalatherium', '🦡', 'herb', 'About 60 cm; 3 kg', 'Island floodplains', '~70–66 MYA', [70, 66], '“Crazy beast”: a badger-sized mammal from Madagascar with more holes in its snout than any known mammal, and back teeth unlike anything else. Islands breed oddities.', [P.mahajanga]),
  R('mammal', MM + 'Gondwanatheres', 'Vintana', '🦫', 'herb', 'Skull 12 cm; about 9 kg', 'Island floodplains', '~70–66 MYA', [70, 66], 'A groundhog-like plant-eater with huge eyes and a keen sense of smell — a giant among the mammals of the dinosaur age.', [P.mahajanga]),
  W('dino', TH + 'Alvarezsaurs', 'Mononykus', '🐔', 'pred', 'About 1 m', 'Desert', '~70 MYA', [72, 68], 'A feathered runner with tiny, powerful arms, each ending in one big claw — probably for ripping open termite nests.', [P.nemegt]),
  W('dino', TH + 'Alvarezsaurs', 'Shuvuuia', '🦉', 'pred', 'About 60 cm', 'Desert', '~75 MYA', [76, 72], 'A night hunter. Its eye bones and inner ear match those of a barn owl: it hunted in the dark by sight and sound, then dug out its prey with single-clawed arms.', [P.ukhaa]),
  R('dino', TH + 'Oviraptorosaurs', 'Caudipteryx', '🦚', 'omni', 'About 1 m', 'Lake shores', '~125 MYA', [126, 122], 'A peacock-sized dinosaur with a fan of feathers on its tail and feathered arms too short to fly. It swallowed stones to grind its food, as chickens do.', [P.liaoning]),
  W('dino', TH + 'Oviraptorosaurs', 'Gigantoraptor', '🦤', 'omni', 'About 8 m; 1.4 tonnes', 'Floodplains', '~96 MYA', [98, 94], 'A beaked, bird-like dinosaur the size of a tyrannosaur. Most of its relatives were the size of a turkey or an emu.', [[43.7, 112.0, 'Erenhot, Inner Mongolia, China']]),
  R('dino', TH + 'Therizinosaurs', 'Falcarius', '🦥', 'omni', 'About 4 m', 'Floodplains', '~139–135 MYA', [139, 134], 'An early therizinosaur caught in the middle of a change: a meat-eater’s body with the leaf-shaped teeth of a plant-eater.', [[38.7, -110.2, 'Crystal Geyser Quarry, Utah']]),
  R('dino', TH + 'Megaraptors', 'Megaraptor', '🦖', 'carn', 'About 8 m', 'Floodplains', '~90–86 MYA', [91, 86], 'A long-armed hunter with a 35 cm claw on its hand. The claw was first thought to belong on the foot, like a giant Velociraptor’s — hence the name.', [[-38.9, -69.2, 'Neuquén, Argentina']],
    { debate: 'Where megaraptors sit on the dinosaur tree is unsettled: relatives of Allosaurus, or of the tyrannosaurs.' }),
  R('dino', TH + 'Raptors (dromaeosaurs)', 'Austroraptor', '🦖', 'pred', 'About 5–6 m', 'Riversides', '~72–70 MYA', [72, 69], 'One of the biggest raptors, from Patagonia, with short arms and a long, low snout full of cone-shaped teeth — more like a fish-catcher than a Velociraptor.', [[-39.6, -66.6, 'Río Negro, Argentina']]),
  R('dino', TH + 'Troodontids', 'Sinovenator', '🪶', 'pred', 'About 1 m', 'Forest', '~125 MYA', [126, 122], 'A chicken-sized early troodontid with features of raptors and of the first birds mixed together — what you would expect near the point where those branches split.', [P.liaoning]),
],

};
if (typeof module !== 'undefined') module.exports = { ROOTS };
