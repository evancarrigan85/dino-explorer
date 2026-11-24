// ============================================================
// WHO IS RELATED TO WHOM — type and lineage for every entry
// ============================================================
// Each entry gets a lineage path, broad to narrow, in plain words. The first
// step of a dinosaur's path is its "dinosaur type". Paths drive the filter
// chips and the "family tree" sort. G_FIX corrects a few animal types.
const D = 'Dinosaurs › ';
const TH = D + 'Theropods › ', SA = D + 'Sauropods & kin › ', AR = D + 'Armoured dinosaurs › ', OR = D + 'Ornithopods › ', MA = D + 'Horned & dome-headed › ', ED = D + 'Early dinosaurs › ';
const LINEAGE = {
  // ── microbes, early life, plants ──
  'Acritarch': 'Microbes › Single-celled plankton', 'Stromatolite': 'Microbes › Mat-building bacteria', 'Doushantuo embryos': 'Microbes › Possible animal embryos',
  'Vendotaenia': 'Plants › Algae', 'Cooksonia': 'Plants › First land plants', 'Aglaophyton': 'Plants › First land plants',
  'Archaeopteris Tree': 'Plants › First trees', 'Lepidodendron': 'Plants › Club-moss trees', 'Sigillaria': 'Plants › Club-moss trees', 'Glossopteris': 'Plants › Seed ferns',
  // ── invertebrates ──
  'Earliest Sponges': 'Invertebrates › Sponges',
  'Charnia': 'Invertebrates › Ediacaran life › Fronds', 'Fractofusus': 'Invertebrates › Ediacaran life › Fronds', 'Dickinsonia': 'Invertebrates › Ediacaran life › Quilted mats',
  'Tribrachidium': 'Invertebrates › Ediacaran life › Three-armed discs', 'Spriggina': 'Invertebrates › Ediacaran life › Early bilaterians', 'Kimberella': 'Invertebrates › Ediacaran life › Early bilaterians',
  'Haootia': 'Invertebrates › Jellyfish & corals', 'Cloudina': 'Invertebrates › Ediacaran life › First shells',
  'Anomalocaris': 'Invertebrates › Arthropods › Radiodonts', 'Opabinia': 'Invertebrates › Arthropods › Opabiniids', 'Trilobite': 'Invertebrates › Arthropods › Trilobites',
  'Marrella': 'Invertebrates › Arthropods › Early arthropods', 'Naraoia': 'Invertebrates › Arthropods › Trilobite relatives', 'Sanctacaris': 'Invertebrates › Arthropods › Early chelicerates',
  'Hallucigenia': 'Invertebrates › Lobopodians', 'Aysheaia': 'Invertebrates › Lobopodians', 'Wiwaxia': 'Invertebrates › Molluscs › Early mollusc relatives', 'Ottoia': 'Invertebrates › Worms',
  'Orthoceras': 'Invertebrates › Molluscs › Shelled cephalopods', 'Cameroceras': 'Invertebrates › Molluscs › Shelled cephalopods', 'Pulmonate Snail': 'Invertebrates › Molluscs › Snails',
  'Eurypterid (Sea Scorpion)': 'Invertebrates › Arthropods › Sea scorpions', 'Eurypterid (Peak Era)': 'Invertebrates › Arthropods › Sea scorpions', 'Mixopterus (Sea Scorpion)': 'Invertebrates › Arthropods › Sea scorpions', 'Pterygotus (Giant Eurypterid)': 'Invertebrates › Arthropods › Sea scorpions',
  'Brontoscorpio': 'Invertebrates › Arthropods › Scorpions', 'Arthropleura': 'Invertebrates › Arthropods › Millipede relatives', 'Meganeura': 'Invertebrates › Arthropods › Insects',
  'Strophomena (Brachiopod)': 'Invertebrates › Brachiopods', 'Didymograptus (Graptolite)': 'Invertebrates › Graptolites', 'Streptelasma (Rugose Coral)': 'Invertebrates › Jellyfish & corals', 'Sea Lily (Crinoid)': 'Invertebrates › Echinoderms',
  // ── fishes ──
  'Pikaia': 'Fishes › Early chordates', 'Conodonts': 'Fishes › Jawless fishes', 'Jawless Fish (Agnathan)': 'Fishes › Jawless fishes', 'Arandaspis': 'Fishes › Jawless fishes', 'Thelodus': 'Fishes › Jawless fishes', 'Cephalaspis': 'Fishes › Jawless fishes', 'Pteraspis': 'Fishes › Jawless fishes',
  'Early Jawed Fish (Acanthodian)': 'Fishes › Spiny sharks', 'Climatius': 'Fishes › Spiny sharks',
  'Dunkleosteus': 'Fishes › Armoured fishes (placoderms)', 'Bothriolepis': 'Fishes › Armoured fishes (placoderms)',
  'Stethacanthus': 'Fishes › Sharks & kin', 'Cladoselache': 'Fishes › Sharks & kin', 'Helicoprion': 'Fishes › Sharks & kin', 'Megalodon': 'Fishes › Sharks & kin', 'Great White Shark': 'Fishes › Sharks & kin',
  'Eusthenopteron': 'Fishes › Lobe-finned fishes', 'Lungfish (Dipnoi)': 'Fishes › Lobe-finned fishes', 'Rhizodus': 'Fishes › Lobe-finned fishes', 'Tiktaalik': 'Fishes › Lobe-finned fishes › Fish with limbs',
  'Leedsichthys': 'Fishes › Ray-finned fishes',
  // ── amphibians & early four-legged animals ──
  'Acanthostega': 'Amphibians & early tetrapods › First four-legged animals', 'Eryops': 'Amphibians & early tetrapods › Temnospondyls', 'Edops': 'Amphibians & early tetrapods › Temnospondyls', 'Prionosuchus': 'Amphibians & early tetrapods › Temnospondyls',
  'Westlothiana': 'Amphibians & early tetrapods › Reptile-like tetrapods',
  // ── proto-mammals ──
  'Dimetrodon': 'Proto-mammals (synapsids) › Sail-backed hunters (sphenacodonts)', 'Edaphosaurus': 'Proto-mammals (synapsids) › Sail-backed plant-eaters (edaphosaurs)',
  'Moschops': 'Proto-mammals (synapsids) › Dinocephalians', 'Estemmenosuchus': 'Proto-mammals (synapsids) › Dinocephalians', 'Gorgonopsid': 'Proto-mammals (synapsids) › Gorgonopsians',
  'Lystrosaurus': 'Proto-mammals (synapsids) › Dicynodonts', 'Cynodont': 'Proto-mammals (synapsids) › Cynodonts',
  // ── reptiles ──
  'Hylonomus': 'Reptiles › Early reptiles', 'Petrolacosaurus': 'Reptiles › Early reptiles', 'Mesosaurus': 'Reptiles › Mesosaurs', 'Scutosaurus': 'Reptiles › Pareiasaurs',
  'Coelurosauravus': 'Reptiles › Gliding reptiles', 'Tanystropheus': 'Reptiles › Long-necked archosaur relatives',
  'Proganochelys': 'Reptiles › Turtles', 'Archelon': 'Reptiles › Turtles', 'Titanoboa': 'Reptiles › Snakes', 'Megalania (Giant Monitor)': 'Reptiles › Lizards',
  'Postosuchus': 'Crocodile line › Rauisuchians', 'Sarcosuchus': 'Crocodile line › Giant crocodile relatives', 'Deinosuchus': 'Crocodile line › Alligator family', 'Saltwater Crocodile': 'Crocodile line › True crocodiles',
  // ── sea reptiles ──
  'Ichthyosaurs': 'Sea reptiles › Ichthyosaurs', 'Shonisaurus': 'Sea reptiles › Ichthyosaurs', 'Nothosaurus': 'Sea reptiles › Nothosaurs',
  'Plesiosaurs': 'Sea reptiles › Plesiosaurs', 'Elasmosaurus': 'Sea reptiles › Plesiosaurs', 'Liopleurodon': 'Sea reptiles › Pliosaurs', 'Mosasaurus': 'Sea reptiles › Mosasaurs',
  // ── pterosaurs ──
  'Eudimorphodon': 'Pterosaurs › Early long-tailed pterosaurs', 'Dimorphodon': 'Pterosaurs › Early long-tailed pterosaurs', 'Rhamphorhynchus': 'Pterosaurs › Early long-tailed pterosaurs',
  'Pterodactylus': 'Pterosaurs › Short-tailed pterosaurs', 'Pteranodon': 'Pterosaurs › Pteranodonts', 'Quetzalcoatlus': 'Pterosaurs › Giant azhdarchids', 'Hatzegopteryx': 'Pterosaurs › Giant azhdarchids',
  // ── dinosaurs ──
  'Nyasasaurus': ED + 'Earliest dinosaurs', 'Eoraptor': ED + 'Earliest dinosaurs', 'Herrerasaurus': ED + 'Earliest dinosaurs', 'Staurikosaurus': ED + 'Earliest dinosaurs',
  'Heterodontosaurus': ED + 'Early bird-hipped dinosaurs', 'Kulindadromeus': ED + 'Early bird-hipped dinosaurs',
  'Coelophysis': TH + 'Early theropods', 'Liliensternus': TH + 'Early theropods', 'Dilophosaurus': TH + 'Early theropods', 'Cryolophosaurus': TH + 'Early theropods',
  'Ceratosaurus': TH + 'Ceratosaurs & abelisaurs', 'Carnotaurus': TH + 'Ceratosaurs & abelisaurs', 'Majungasaurus': TH + 'Ceratosaurs & abelisaurs', 'Rajasaurus': TH + 'Ceratosaurs & abelisaurs',
  'Megalosaurus': TH + 'Megalosaurs & spinosaurs', 'Torvosaurus': TH + 'Megalosaurs & spinosaurs', 'Baryonyx': TH + 'Megalosaurs & spinosaurs', 'Suchomimus': TH + 'Megalosaurs & spinosaurs', 'Spinosaurus': TH + 'Megalosaurs & spinosaurs',
  'Allosaurus': TH + 'Allosaurs & kin', 'Yangchuanosaurus': TH + 'Allosaurs & kin', 'Acrocanthosaurus': TH + 'Allosaurs & kin', 'Carcharodontosaurus': TH + 'Allosaurs & kin', 'Giganotosaurus': TH + 'Allosaurs & kin', 'Australovenator': TH + 'Megaraptors',
  'Guanlong': TH + 'Tyrannosaurs', 'Yutyrannus': TH + 'Tyrannosaurs', 'Gorgosaurus': TH + 'Tyrannosaurs', 'Albertosaurus': TH + 'Tyrannosaurs', 'Tarbosaurus': TH + 'Tyrannosaurs', 'Tyrannosaurus rex': TH + 'Tyrannosaurs',
  'Compsognathus': TH + 'Small feathered hunters', 'Sinosauropteryx': TH + 'Small feathered hunters', 'Ornitholestes': TH + 'Small feathered hunters',
  'Gallimimus': TH + 'Ostrich-mimics', 'Deinocheirus': TH + 'Ostrich-mimics', 'Therizinosaurus': TH + 'Therizinosaurs', 'Oviraptor': TH + 'Oviraptorosaurs',
  'Utahraptor': TH + 'Raptors (dromaeosaurs)', 'Deinonychus': TH + 'Raptors (dromaeosaurs)', 'Velociraptor': TH + 'Raptors (dromaeosaurs)', 'Microraptor': TH + 'Raptors (dromaeosaurs)',
  'Mei long': TH + 'Troodontids', 'Stenonychosaurus (Troodon)': TH + 'Troodontids', 'Anchiornis': TH + 'Near-birds', 'Yi qi': TH + 'Near-birds',
  'Plateosaurus': SA + 'Early long-necks', 'Riojasaurus': SA + 'Early long-necks', 'Thecodontosaurus': SA + 'Early long-necks', 'Ingentia': SA + 'Early long-necks', 'Massospondylus': SA + 'Early long-necks', 'Mussaurus': SA + 'Early long-necks',
  'Shunosaurus': SA + 'Early sauropods', 'Mamenchisaurus': SA + 'Mamenchisaurs',
  'Diplodocus': SA + 'Diplodocids', 'Apatosaurus': SA + 'Diplodocids', 'Brontosaurus': SA + 'Diplodocids', 'Supersaurus': SA + 'Diplodocids', 'Amargasaurus': SA + 'Dicraeosaurs', 'Nigersaurus': SA + 'Rebbachisaurs',
  'Camarasaurus': SA + 'Camarasaurs', 'Brachiosaurus': SA + 'Brachiosaurs', 'Giraffatitan': SA + 'Brachiosaurs', 'Europasaurus': SA + 'Brachiosaurs', 'Sauroposeidon': SA + 'Titanosaur relatives',
  'Patagotitan': SA + 'Titanosaurs', 'Argentinosaurus': SA + 'Titanosaurs', 'Dreadnoughtus': SA + 'Titanosaurs', 'Saltasaurus': SA + 'Titanosaurs', 'Alamosaurus': SA + 'Titanosaurs',
  'Scelidosaurus': AR + 'Early armoured dinosaurs', 'Huayangosaurus': AR + 'Stegosaurs', 'Kentrosaurus': AR + 'Stegosaurs', 'Stegosaurus': AR + 'Stegosaurs',
  'Borealopelta': AR + 'Nodosaurs', 'Antarctopelta': AR + 'Southern ankylosaurs', 'Zuul': AR + 'Club-tailed ankylosaurs', 'Ankylosaurus': AR + 'Club-tailed ankylosaurs',
  'Leaellynasaura': OR + 'Small ornithopods', 'Iguanodon': OR + 'Iguanodonts', 'Ouranosaurus': OR + 'Iguanodonts', 'Muttaburrasaurus': OR + 'Iguanodonts',
  'Maiasaura': OR + 'Duck-bills (hadrosaurs)', 'Corythosaurus': OR + 'Duck-bills (hadrosaurs)', 'Parasaurolophus': OR + 'Duck-bills (hadrosaurs)', 'Edmontosaurus': OR + 'Duck-bills (hadrosaurs)',
  'Psittacosaurus': MA + 'Early horned dinosaurs', 'Archaeoceratops': MA + 'Early horned dinosaurs', 'Protoceratops': MA + 'Early horned dinosaurs',
  'Centrosaurus': MA + 'Horned dinosaurs (ceratopsids)', 'Styracosaurus': MA + 'Horned dinosaurs (ceratopsids)', 'Kosmoceratops': MA + 'Horned dinosaurs (ceratopsids)', 'Pachyrhinosaurus': MA + 'Horned dinosaurs (ceratopsids)', 'Triceratops': MA + 'Horned dinosaurs (ceratopsids)',
  'Pachycephalosaurus': MA + 'Dome-heads (pachycephalosaurs)',
  // ── birds ──
  'Archaeopteryx': 'Birds › Earliest birds', 'Confuciusornis': 'Birds › Earliest birds', 'Hesperornis': 'Birds › Toothed seabirds', 'Asteriornis': 'Birds › Fowl & waterfowl',
  'Gastornis (Giant Bird)': 'Birds › Giant flightless birds', 'Phorusrhacos (Terror Bird)': 'Birds › Terror birds', 'Giant Moa (Dinornis robustus)': 'Birds › Giant flightless birds',
  'Dodo (Raphus cucullatus)': 'Birds › Pigeons', 'Passenger Pigeon (Ectopistes migratorius)': 'Birds › Pigeons',
  // ── mammals ──
  'Early Mammal (Morganucodon)': 'Mammals › Mammal forerunners › Morganucodonts', 'Repenomamus': 'Mammals › Early mammals',
  'Pakicetus': 'Mammals › Whales', 'Ambulocetus (Walking Whale)': 'Mammals › Whales', 'Basilosaurus': 'Mammals › Whales', 'Livyatan': 'Mammals › Whales', 'Blue Whale': 'Mammals › Whales',
  'Andrewsarchus': 'Mammals › Even-toed hoofed mammals', 'Sivatherium': 'Mammals › Even-toed hoofed mammals', 'Megaloceros (Irish Elk)': 'Mammals › Even-toed hoofed mammals',
  'Eohippus (Dawn Horse)': 'Mammals › Odd-toed hoofed mammals › Horses', 'Hipparion': 'Mammals › Odd-toed hoofed mammals › Horses',
  'Paraceratherium (Indricotherium)': 'Mammals › Odd-toed hoofed mammals › Rhinos', 'Woolly Rhinoceros': 'Mammals › Odd-toed hoofed mammals › Rhinos', 'Elasmotherium (Siberian Unicorn)': 'Mammals › Odd-toed hoofed mammals › Rhinos',
  'Embolotherium': 'Mammals › Odd-toed hoofed mammals › Brontotheres', 'Chalicothere': 'Mammals › Odd-toed hoofed mammals › Chalicotheres',
  'Uintatherium': 'Mammals › Early hoofed mammals', 'Phenacodus': 'Mammals › Early hoofed mammals', 'Macrauchenia': 'Mammals › South American hoofed mammals',
  'Deinotherium': 'Mammals › Elephants & kin', 'Platybelodon': 'Mammals › Elephants & kin', 'American Mastodon': 'Mammals › Elephants & kin', 'Woolly Mammoth': 'Mammals › Elephants & kin', 'African Elephant': 'Mammals › Elephants & kin',
  'Hyaenodon': 'Mammals › Early meat-eaters (creodonts)', 'Eusmilus (False Sabre-tooth)': 'Mammals › Carnivores › False sabre-tooths',
  'Saber-toothed Cat (Smilodon)': 'Mammals › Carnivores › Cats', 'Cave Lion': 'Mammals › Carnivores › Cats', 'Arctodus (Short-Faced Bear)': 'Mammals › Carnivores › Bears', 'Dire Wolf (Aenocyon dirus)': 'Mammals › Carnivores › Dogs',
  'Giant Ground Sloth': 'Mammals › Sloths & armadillos', 'Glyptodon': 'Mammals › Sloths & armadillos',
  'Giant Wombat (Diprotodon)': 'Mammals › Marsupials', 'Thylacoleo (Marsupial Lion)': 'Mammals › Marsupials', 'Thylacine (Tasmanian Tiger)': 'Mammals › Marsupials', 'Thylacosmilus': 'Mammals › Marsupial relatives',
  "Steller's Sea Cow (Hydrodamalis gigas)": 'Mammals › Sea cows',
  'Aegyptopithecus': 'Mammals › Primates › Early monkeys & apes', 'Ekembo (Proconsul)': 'Mammals › Primates › Apes', 'Sivapithecus': 'Mammals › Primates › Apes', 'Danuvius': 'Mammals › Primates › Apes', 'Gigantopithecus': 'Mammals › Primates › Apes',
  'Humans Today': 'Human family › Humans (Homo)',
};
// animal types that the migration table got too broad
const G_FIX = { 'Postosuchus': 'croc', 'Sarcosuchus': 'croc', 'Deinosuchus': 'croc', 'Saltwater Crocodile': 'croc', 'Westlothiana': 'amphib', 'Charnia': 'invert', 'Vendotaenia': 'plant' };
// hominins get their lineage from their group
const HOMININ_LINEAGE = { early: 'Human family › Earliest hominins', austral: 'Human family › Australopiths', paran: 'Human family › Robust australopiths (Paranthropus)', homo: 'Human family › Humans (Homo)' };
if (typeof module !== 'undefined') module.exports = { LINEAGE, G_FIX, HOMININ_LINEAGE };
