#!/usr/bin/env python3
"""Animal silhouettes from PhyloPic (phylopic.org), with their credits.

For each wanted animal: look its name up on PhyloPic, then — if it has no silhouette — each broader group in turn
(the list in WANT), and take a silhouette whose licence lets us use it without restriction beyond credit:
CC0 1.0, the Public Domain Mark, or CC BY 3.0/4.0. Share-alike and non-commercial licences are never used.
Where the silhouette is of a broader group, it is recorded as "a relative's outline", and the page says so.

Writes:
  tiles/sil/<key>.png                  the silhouette, black on transparent, at most 512 px wide
  tools/source/silhouettes-data.js     SIL = { key: { f, w, h, by, lic, licUrl, of, level, img } }
     by      the credit PhyloPic gives (the artist), shown wherever the silhouette is
     of      the taxon the silhouette shows; level: 'own' (the animal itself or its genus), 'member' (the wanted name is a
             group, like "side-necked turtles", and the outline is one named member of it) or 'relative'
     img     PhyloPic image id, for the link back

Usage: python3 -I tools/build_silhouettes.py          (all of WANT)
       python3 -I tools/build_silhouettes.py --only k1,k2   (just these keys; the others stay as they are)
       python3 -I tools/build_silhouettes.py --coverage  (count how many of the page's animals PhyloPic covers; no files)
Requires Pillow. Network: api.phylopic.org, images.phylopic.org. The User-Agent is generic on purpose.
"""
import sys, json, io, time, os, re, urllib.request, urllib.parse, urllib.error
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = 'https://api.phylopic.org'
UA = {'User-Agent': 'BeforeUs-silhouettes/1.0'}
OK_LIC = {
    'https://creativecommons.org/publicdomain/zero/1.0/': 'CC0 1.0',
    'https://creativecommons.org/publicdomain/mark/1.0/': 'Public Domain',
    'https://creativecommons.org/licenses/by/3.0/': 'CC BY 3.0',
    'https://creativecommons.org/licenses/by/4.0/': 'CC BY 4.0',
}
# key: [the animal's own name, then broader groups to fall back on]; an optional "img=<uuid>" picks one silhouette
WANT = {
    # the Kem Kem scene
    'spinosaurus': ['Spinosaurus', 'img=0dd7eaf6-1caf-4579-9f42-340fa9f34c48'],   # standing at the shore: the scene puts it at the water’s edge
    'carcharodontosaurus': ['Carcharodontosaurus', 'Carcharodontosauridae'],
    'deltadromeus': ['Deltadromeus', 'Noasauridae', 'Ceratosauria'],
    'abelisaurid': ['Abelisauridae'],
    'rebbachisaurus': ['Rebbachisaurus', 'Rebbachisauridae'],
    'siroccopteryx': ['Siroccopteryx', 'Pterodactyloidea', 'img=97ce8bbd-68a1-4185-a23e-59dcad7d7f15'],   # sized by wingspan, so a view from below with the wings spread;
                                                   # PhyloPic’s three ornithocheirids are all side or ground views, and Pteranodon’s crest would mislead
    'alanqa': ['Alanqa', 'Azhdarchidae', 'img=a70cf93c-0f86-487e-b9c8-c4f2b45ed0e0'],   # Phosphatodraco, an azhdarchid also from Morocco (the first pick was a skull only)
    'sidenecked': ['Pleurodira'],
    'elosuchus': ['Elosuchus', 'Pholidosauridae'],
    'onchopristis': ['Onchopristis', 'Sclerorhynchidae', 'Pristidae'],
    'axelrodichthys': ['Axelrodichthys', 'Mawsoniidae', 'Actinistia'],
    'neoceratodus': ['Neoceratodus', 'Ceratodontidae', 'Dipnoi'],
    'obaichthys': ['Obaichthys', 'Lepisosteidae'],
    # the pilot sheet (docs/PLAN.md, Release 6 / 12.1)
    'trex': ['Tyrannosaurus'],
    'triceratops': ['Triceratops'],
    'stegosaurus': ['Stegosaurus'],
    'brachiosaurus': ['Brachiosaurus', 'Giraffatitan', 'Brachiosauridae'],
    'velociraptor': ['Velociraptor', 'Dromaeosauridae'],
    'mammoth': ['Mammuthus primigenius', 'Mammuthus'],
    'smilodon': ['Smilodon'],
    'dunkleosteus': ['Dunkleosteus'],
    'anomalocaris': ['Anomalocaris', 'Anomalocarididae'],
    'dimetrodon': ['Dimetrodon', 'img=ee7f1c8c-c98d-4611-aa4e-c112e86782e6'],   # a side view (the first pick was head-on)
    'tiktaalik': ['Tiktaalik', 'Elpistostegalia', 'Tetrapodomorpha'],
}

# Every animal card (Release 12.1 step 4). Cards whose name is not a scientific name get one here: a list of names
# to try. "=Name" means the card is about a whole group and the outline is one member of it; [] means draw nothing
# (microbe mats, trackways, a "possible" sponge: an outline would claim more than the fossils show).
NAMES = {
    'Isua cones (possible stromatolites)': [], 'Dresser hot-spring microbes': [], 'Strelley Pool stromatolites': [],
    'Moodies river mats': [], 'Torridon lake microbes': [], 'Possible sponge (Little Dal reefs)': [], 'Vase-shaped microfossils': [],
    'Earliest land plants (spores)': [], 'Zachełmie trackmaker': [],
    'Earliest Sponges': ['=Porifera'], 'Eurypterid (Sea Scorpion)': ['=Eurypterida'], 'Eurypterid (Peak Era)': ['=Eurypterida'],
    'Jawless Fish (Agnathan)': ['=Heterostraci', '=Osteostraci', '=Pteraspidomorphi'], 'Strophomena (Brachiopod)': ['Strophomena', 'Strophomenida', 'Brachiopoda'],
    'Didymograptus (Graptolite)': ['Didymograptus', 'Graptoloidea', 'Graptolithina'], 'Streptelasma (Rugose Coral)': ['Streptelasma', 'Rugosa'],
    'Mixopterus (Sea Scorpion)': ['Mixopterus', 'Eurypterida'], 'Early Jawed Fish (Acanthodian)': ['=Acanthodii', '=Acanthodes'],
    'Sea Lily (Crinoid)': ['=Crinoidea'], 'Pterygotus (Giant Eurypterid)': ['Pterygotus', 'Pterygotidae', 'Eurypterida'],
    'Archaeopteris Tree': ['Archaeopteris'], 'Lungfish (Dipnoi)': ['=Dipnoi'], 'Pulmonate Snail': ['=Pulmonata'],
    'Tullimonstrum (Tully monster)': ['Tullimonstrum'], 'Early Mammal (Morganucodon)': ['Morganucodon'],
    'Stenonychosaurus (Troodon)': ['Stenonychosaurus', 'Troodon', 'Troodontidae'], 'Gastornis (Giant Bird)': ['Gastornis'],
    'Paraceratherium (Indricotherium)': ['Paraceratherium'], 'Ambulocetus (Walking Whale)': ['Ambulocetus'],
    'Eusmilus (False Sabre-tooth)': ['Eusmilus', 'Nimravidae'], 'Eohippus (Dawn Horse)': ['Eohippus', 'Hyracotherium'],
    'Darwinius (“Ida”)': ['Darwinius', 'Adapiformes'], 'Boverisuchus (“hoofed crocodile”)': ['Boverisuchus', 'Planocraniidae'],
    'Ekembo (Proconsul)': ['Ekembo', 'Proconsul'], 'Phorusrhacos (Terror Bird)': ['Phorusrhacos', 'Phorusrhacidae'],
    'Nyanzapithecus (“Alesi”)': ['Nyanzapithecus', 'Proconsul'], 'Arctic camel (Paracamelus)': ['Paracamelus', 'Camelus'],
    'Chasmaporthetes (running hyena)': ['Chasmaporthetes', 'Hyaenidae'], 'Woolly Mammoth': ['Mammuthus primigenius'],
    'Saber-toothed Cat (Smilodon)': ['Smilodon'], 'Giant Ground Sloth': ['Megatherium'], 'Cave Lion': ['Panthera spelaea', 'Panthera leo'],
    'Giant Wombat (Diprotodon)': ['Diprotodon'], 'Woolly Rhinoceros': ['Coelodonta antiquitatis', 'Coelodonta'],
    'Arctodus (Short-Faced Bear)': ['Arctodus'], 'Megaloceros (Irish Elk)': ['Megaloceros giganteus', 'Megaloceros'],
    'American Mastodon': ['Mammut americanum', 'Mammut'], 'Dire Wolf (Aenocyon dirus)': ['Aenocyon dirus', 'Aenocyon', 'Canis dirus'],
    'Elasmotherium (Siberian Unicorn)': ['Elasmotherium'], 'Thylacoleo (Marsupial Lion)': ['Thylacoleo'],
    'Megalania (Giant Monitor)': ['Varanus priscus', 'Megalania', 'Varanus'], 'American Lion': ['Panthera atrox', 'Panthera leo'],
    'Cave Bear': ['Ursus spelaeus', 'Ursus'], 'Cave Hyena': ['Crocuta crocuta', 'Crocuta'], 'Columbian Mammoth': ['Mammuthus columbi', 'Mammuthus'],
    'Straight-tusked Elephant': ['Palaeoloxodon antiquus', 'Palaeoloxodon'], 'Giant Beaver': ['Castoroides'],
    'Sicilian Dwarf Elephant': ['Palaeoloxodon falconeri', 'Palaeoloxodon'], 'Cyprus Dwarf Hippo': ['Hippopotamus minor', 'Hippopotamus'],
    'Myotragus (“mouse goat”)': ['Myotragus'], 'Giant Echidna (Murrayglossus)': ['Murrayglossus', 'Zaglossus'],
    'Shasta Ground Sloth': ['Nothrotheriops'], 'Giant Gelada (Theropithecus oswaldi)': ['Theropithecus oswaldi', 'Theropithecus'],
    'Pygmy Giant Panda (Ailuropoda microta)': ['Ailuropoda microta', 'Ailuropoda'], 'Giant Hyena (Pachycrocuta)': ['Pachycrocuta', 'Hyaenidae'],
    'Blue Whale': ['Balaenoptera musculus'], 'Saltwater Crocodile': ['Crocodylus porosus'], 'Great White Shark': ['Carcharodon carcharias'],
    'Humans Today': ['Homo sapiens'], 'African Elephant': ['Loxodonta africana'], 'Dodo (Raphus cucullatus)': ['Raphus cucullatus'],
    'Passenger Pigeon (Ectopistes migratorius)': ['Ectopistes migratorius'], 'Thylacine (Tasmanian Tiger)': ['Thylacinus cynocephalus'],
    "Steller's Sea Cow (Hydrodamalis gigas)": ['Hydrodamalis gigas'], 'Giant Moa (Dinornis robustus)': ['Dinornis robustus', 'Dinornis'],
    "Haast's Eagle": ['Hieraaetus moorei', 'Harpagornis moorei'], 'Elephant Bird': ['Aepyornis maximus', 'Aepyornis'],
    'Koala Lemur (Megaladapis)': ['Megaladapis'], 'Great Auk': ['Pinguinus impennis'], 'Horseshoe Crab': ['Limulus polyphemus'],
    'Komodo Dragon': ['Varanus komodoensis'], 'Palaeopropithecus (sloth lemur)': ['Palaeopropithecus'],
    'Malagasy Hippo': ['Hippopotamus lemerlei', 'Hippopotamus'], 'Adzebill (Aptornis)': ['Aptornis'],
    'Baiji (Yangtze River Dolphin)': ['Lipotes vexillifer'], 'Caribbean Monk Seal': ['Neomonachus tropicalis', 'Neomonachus'],
    'Musk Ox': ['Ovibos moschatus'], 'Aye-aye': ['Daubentonia madagascariensis'], 'Naked Mole-rat': ['Heterocephalus glaber'],
}
# Corrections from checking every pick by eye (24 Nov 2026). "~Name" is the same animal under another scientific name
# (so the outline is its own); "!" means no relative's outline at all; "img=<uuid>" picks one drawing.
NAMES.update({
    'Ophiderpeton': ['Ophiderpeton', '!'],                         # legless: a relative with legs would mislead
    'Axolotl': ['~Ambystoma mexicanum'], 'Genyornis': ['Genyornis', 'Dromornis'],     # a thunder bird, not a moa
    'Saurolophus': ['Saurolophus', 'Edmontosaurus'], 'Shantungosaurus': ['Shantungosaurus', 'Edmontosaurus'],   # no crest of the other branch
    'Limusaurus': ['Limusaurus', 'Elaphrosaurus'], 'Spinosaurus': ['Spinosaurus', 'img=0dd7eaf6-1caf-4579-9f42-340fa9f34c48'],   # standing, as in the scene
    'Gemuendina': ['Gemuendina', '!'], 'Birkenia': ['Birkenia', '!'], 'Haikouichthys': ['Haikouichthys', '!'],
    'Conodonts': ['=Conodonta'], 'Promissum': ['Promissum', 'Conodonta'], 'Coelacanth': ['~Latimeria chalumnae', '~Latimeria'],
    'Gogonasus': ['Gogonasus', 'Eusthenopteron'], 'Hyneria': ['Hyneria', 'Eusthenopteron'], 'Tiktaalik': ['Tiktaalik', 'Panderichthys'],
    'Megalodon': ['~Otodus megalodon'], 'Meganeuropsis': ['Meganeuropsis', 'Meganeura', 'img=b7b2895c-f9c3-436a-8efa-d80b14fe0918'], 'Sebecus': ['Sebecus', '!'], 'Titanomyrma': ['Titanomyrma', 'Formicidae'],
    'Messel moths': ['=Lepidoptera'], 'Mazothairos': ['Mazothairos', 'Stenodictya'], 'Rhyniognatha': [],    # known from its jaws alone
    'Trilobite': ['=Trilobita'], 'Ammonites': ['=Ammonoidea'], 'Pulmonate Snail': ['=Helix', '=Stylommatophora'],   # "Pulmonata" is also an arachnid group
    'Archaeocyathids': [], 'Archaeocyaths': [], 'Earliest Sponges': [], 'Otavia': [],
    'Strophomena (Brachiopod)': ['Strophomena', '!'], 'Didymograptus (Graptolite)': ['Didymograptus', '!'],
    'Megantereon': ['Megantereon', 'Smilodon'], 'Deinogalerix': ['Deinogalerix', '!'], 'Arctic camel (Paracamelus)': ['Paracamelus', '!'],   # its humps are not known
    'Aurochs': ['~Bos primigenius'], 'Okapi': ['~Okapia johnstoni'], 'Bison latifrons': ['Bison latifrons', '~Bos latifrons'],
    'Platypus': ['~Ornithorhynchus anatinus'], 'Narwhal': ['~Monodon monoceros'], 'Quagga': ['Equus quagga', 'Equus'],
    'Chalicothere': ['=Chalicotherium'], 'Eurohippus': ['Eurohippus', 'Eohippus'],
    'Archaeoindris': ['Archaeoindris', '!'], 'Palaeopropithecus (sloth lemur)': ['Palaeopropithecus', '!'],
    'Glossopteris': ['Glossopteris', '!'], 'Cynodont': ['=Thrinaxodon'], 'Gorgonopsid': ['=Gorgonopsia'],
    'Dimetrodon': ['Dimetrodon', 'img=ee7f1c8c-c98d-4611-aa4e-c112e86782e6'],          # a side view
    'Quetzalcoatlus': ['Quetzalcoatlus', 'Azhdarchidae', 'img=a70cf93c-0f86-487e-b9c8-c4f2b45ed0e0'],
    'Hatzegopteryx': ['Hatzegopteryx', 'Azhdarchidae', 'img=a70cf93c-0f86-487e-b9c8-c4f2b45ed0e0'],
    'Tuatara': ['~Sphenodon punctatus'], 'Carbonemys': ['Carbonemys', 'Stupendemys'], 'Eunotosaurus': ['Eunotosaurus', '!'],
    'Proganochelys': ['Proganochelys', 'Meiolania'], 'Ichthyosaurs': ['=Ichthyosauria'], 'Mosasaurus': ['Mosasaurus', 'Tylosaurus'],
    'Plesiosaurs': ['=Elasmosaurus'],
})
# Drawings never used: a skull or skeleton diagram alone, a head-on view, a head and neck (they read badly as a picture).
BAD = {'3753fc6c-dc8b-45d3-aae8-df776abdc3e0', '80592c68-b4ff-4909-b1b4-a9831303232b', 'da8f7c54-89aa-4c97-87eb-e6ea778ebd6e',
       '772895b5-8d80-47fb-80db-ba7dae641b3c', '9dd4ab50-08fe-42bb-9af3-2787c9c75387', '9b13bff4-0bdc-4038-8375-d7444f640d5b',
       '20ea3adf-80f2-4f1d-98c6-3ed68a6247d3', '92f13824-1cb8-4c46-9781-69134beb10f2', '25b01b89-c1f6-4146-92f4-ea44d6a779f7',
       '294aa46e-d5a8-4c48-b3ba-f1f3f4fd0c1e', '7cebc9af-3379-4c7a-9276-d23c67b50984', '2c6120ca-510a-4f70-b9ce-891c6dc0d1ad'}
# A relative's outline when the animal has none of its own: by the card's group (the last step of its path).
GROUPS = {
    # [] = no relative's outline: the group's members look too different for one shape to stand for them
    'Early tetrapods': ['Acanthostega', 'Ichthyostega'], 'First four-legged animals': ['Acanthostega', 'Ichthyostega'],
    'Lepospondyls': ['Diplocaulus', 'Lepospondyli'], 'Reptile-like tetrapods': ['Seymouria', 'Diadectes'], 'Salamanders': ['Caudata', 'Urodela'],
    'Temnospondyls': ['Eryops', 'Temnospondyli'],
    'Adzebills': ['Aptornis'], 'Auks': ['Alcidae'], 'Bony-toothed birds': ['Pelagornis', 'Pelagornithidae'], 'Eagles & hawks': ['Accipitridae'],
    'Earliest birds': ['Archaeopteryx', 'Avialae'], 'Fowl & waterfowl': ['Anatidae', 'Galloanserae'], 'Giant flightless birds': ['Dinornithiformes', 'Aepyornis'],
    'Modern birds': ['Neornithes'], 'Penguins': ['Spheniscidae'], 'Pigeons': ['Columbidae'], 'Teratorns': ['Argentavis', 'Teratornithidae'],
    'Terror birds': ['Phorusrhacidae'], 'Thunder birds': ['Dromornis', 'Dromornithidae'], 'Toothed seabirds': ['Hesperornis', 'Ichthyornis'],
    'Aetosaurs': ['Desmatosuchus', 'Aetosauria'], 'Alligator family': ['Alligatoridae'], 'Dyrosaurs': ['Dyrosauridae'],
    'Giant crocodile relatives': ['Deinosuchus', 'Sarcosuchus'], 'Land crocodiles': ['Notosuchia'], 'Rauisuchians': ['Postosuchus', 'Rauisuchidae'],
    'Sea crocodiles': ['Metriorhynchidae', 'Thalattosuchia'], 'Shuvosaurids': ['Effigia', 'Shuvosauridae'], 'True crocodiles': ['Crocodylus', 'Crocodylidae'],
    'Club-tailed ankylosaurs': ['Ankylosaurus', 'Euoplocephalus'], 'Early ankylosaurs': ['Ankylosauria'], 'Early armoured dinosaurs': ['Scelidosaurus', 'Scutellosaurus'],
    'Nodosaurs': ['Europelta'], 'Southern ankylosaurs': ['Ankylosauria'], 'Stegosaurs': ['Stegosauria'],
    'Earliest dinosaurs': ['Herrerasaurus', 'Eoraptor'], 'Early bird-hipped dinosaurs': ['Lesothosaurus', 'Heterodontosauridae'],
    'Dome-heads (pachycephalosaurs)': ['Pachycephalosauria'], 'Early horned dinosaurs': ['Protoceratops', 'Psittacosaurus'],
    'Horned dinosaurs (ceratopsids)': ['Ceratopsidae'], 'Duck-bills (hadrosaurs)': ['Hadrosauridae'], 'Iguanodonts': ['Iguanodon', 'Iguanodontia'],
    'Small ornithopods': ['Hypsilophodon', 'Ornithopoda'], 'Brachiosaurs': ['Brachiosauridae'], 'Camarasaurs': ['Camarasaurus'],
    'Dicraeosaurs': ['Dicraeosauridae'], 'Diplodocids': ['Diplodocidae'], 'Early long-necks': ['Plateosaurus', 'Sauropodomorpha'],
    'Early sauropods': ['Shunosaurus', 'Sauropoda'], 'Mamenchisaurs': ['Mamenchisaurus', 'Mamenchisauridae'], 'Rebbachisaurs': ['Rebbachisauridae'],
    'Titanosaur relatives': ['Titanosauriformes'], 'Titanosaurs': ['Titanosauria'], 'Turiasaurs': ['Turiasaurus', 'Turiasauria'],
    'Allosaurs & kin': ['Allosauroidea', 'Allosaurus'], 'Alvarezsaurs': ['Alvarezsauridae'], 'Ceratosaurs & abelisaurs': ['Abelisauridae', 'Ceratosauria'],
    'Early theropods': ['Coelophysis', 'Coelophysoidea'], 'Megalosaurs & spinosaurs': ['Megalosauridae', 'Megalosauroidea'], 'Megaraptors': ['Megaraptora'],
    'Near-birds': ['Anchiornis', 'Paraves'], 'Ostrich-mimics': ['Ornithomimidae', 'Ornithomimosauria'], 'Oviraptorosaurs': ['Oviraptorosauria'],
    'Raptors (dromaeosaurs)': ['Dromaeosauridae'], 'Small feathered hunters': ['Sinosauropteryx', 'Compsognathidae'], 'Therizinosaurs': ['Therizinosauria'],
    'Troodontids': ['Troodontidae'], 'Tyrannosaurs': ['Tyrannosauridae', 'Tyrannosauroidea'],
    'Armoured fishes (placoderms)': ['Arthrodira', 'Placodermi'], 'Early chordates': ['Pikaia'], 'Jawless fishes': ['Heterostraci', 'Osteostraci'],
    'Lobe-finned fishes': ['Eusthenopteron'], 'Fish with limbs': ['Tiktaalik', 'Elpistostegalia'], 'Ray-finned fishes': ['Actinopterygii'],
    'Sharks & kin': ['Elasmobranchii', 'Chondrichthyes'], 'Spiny sharks': ['Acanthodii'],
    'Early arthropods': [], 'Early chelicerates': ['Sanctacaris'], 'Five-eyed arthropods': ['Opabinia'],
    'Great-appendage arthropods': ['Leanchoilia', 'Megacheira'], 'Horseshoe crabs': ['Xiphosura'], 'Insects': [],
    'Millipede relatives': ['Arthropleura', 'Diplopoda'], 'Opabiniids': ['Opabinia'], 'Radiodonts': ['Radiodonta'], 'Scorpions': ['Scorpiones'],
    'Sea scorpions': ['Eurypterida'], 'Sea spiders': ['Pycnogonida'], 'Spider relatives': ['Arachnida'], 'Trilobite relatives': ['Artiopoda'],
    'Trilobites': ['Trilobita'], 'Brachiopods': ['Brachiopoda'], 'Echinoderms': [], 'Early bilaterians': [], 'First shells': [], 'Fronds': [],
    'Quilted mats': [], 'Spiral discs': [], 'Three-armed discs': [], 'Tubes': [], 'Graptolites': ['Graptoloidea'], 'Jellyfish & corals': [],
    'Lobopodians': ['Lobopodia'], 'Ammonites': ['Ammonoidea'], 'Early mollusc relatives': [], 'Shelled cephalopods': [], 'Snails': ['Gastropoda'],
    'Mystery animals': [], 'Puzzling early life': [], 'Sponges': ['Porifera'], 'Worms': [],
    'Anteater-like mammals': [], 'Bats': ['Chiroptera'], 'Bear-dogs': ['Amphicyon', 'Amphicyonidae'], 'Bears': ['Ursidae'], 'Cats': ['Felidae'],
    'Dogs': ['Canidae'], 'False sabre-tooths': ['Nimravidae'], 'Hyenas': ['Hyaenidae'], 'Raccoons & kin': ['Procyonidae'], 'Seals': ['Phocidae', 'Pinnipedia'],
    'Desmostylians': ['Desmostylus', 'Desmostylia'], 'Early carnivores (mesonychids)': ['Mesonychidae'], 'Early hoofed mammals': ['Phenacodus'],
    'Early insect-eaters': [], 'Early mammals': ['Morganucodon'], 'Early meat-eaters (creodonts)': ['Hyaenodonta', 'Oxyaenidae'],
    'Elephants & kin': [], 'Embrithopods': ['Arsinoitherium'], 'Even-toed hoofed mammals': [], 'Gondwanatheres': ['Vintana', 'Gondwanatheria'],
    'Hedgehogs & kin': ['Erinaceidae'], 'Hippos': ['Hippopotamidae'], 'Hyraxes': ['Hyracoidea'], 'Docodonts': ['Castorocauda', 'Docodonta'],
    'Earliest mammal relatives': [], 'Gliders (haramiyidans)': ['Haramiyida'], 'Morganucodonts': ['Morganucodon'], 'Marsupial relatives': [],
    'Marsupials': [], 'Monotremes': ['Monotremata'], 'Multituberculates': ['Multituberculata'], 'Brontotheres': ['Brontotheriidae'],
    'Chalicotheres': ['Chalicotheriidae'], 'Horses': ['Equidae'], 'Rhinos': ['Rhinocerotidae'], 'Pantodonts': ['Coryphodon', 'Pantodonta'],
    'Apes': [], 'Earliest primates': ['Purgatorius', 'Plesiadapiformes'], 'Early lemur relatives': ['Notharctus', 'Adapiformes'],
    'Early monkeys & apes': ['Aegyptopithecus'], 'Lemurs': ['Lemuridae'], 'Monkeys': ['Cercopithecidae'], 'Primate relatives': ['Purgatorius'],
    'Rodents': [], 'Sea cows': ['Sirenia'], 'Sloths & armadillos': [], 'South American hoofed mammals': [], 'Whales': [],
    'Amoebae': [], 'Fungi': [], 'Mat-building bacteria': [], 'Possible animal embryos': [], 'Single cells with walls': [], 'Single-celled plankton': [],
    'Algae': [], 'Club-moss trees': ['Lepidodendron'], 'First land plants': [], 'First trees': [], 'Giant fungus (or something stranger)': [],
    'Giant horsetails': ['Calamites'], 'Seed ferns': [],
    'Anomodonts': ['Anomodontia'], 'Biarmosuchians': ['Biarmosuchia'], 'Caseids': ['Cotylorhynchus', 'Caseidae'], 'Cynodonts': ['Cynodontia'],
    'Cynognathus & kin': ['Cynognathus'], 'Early cynodonts': ['Thrinaxodon', 'Procynosuchus'], 'Near-mammals': ['Brasilodon', 'Probainognathia'],
    'Tritylodonts': ['Tritylodontidae'], 'Dicynodonts': ['Dicynodontia'], 'Dinocephalians': ['Dinocephalia'], 'Earliest therapsids': [],
    'Early synapsids': ['Ophiacodon'], 'Gorgonopsians': ['Gorgonopsia'], 'Sail-backed hunters (sphenacodonts)': ['Dimetrodon', 'Sphenacodontidae'],
    'Sail-backed plant-eaters (edaphosaurs)': ['Edaphosaurus'], 'Therocephalians': ['Therocephalia'], 'Varanopids': ['Varanopidae'],
    'Early long-tailed pterosaurs': ['Rhamphorhynchus', 'Dimorphodon'], 'Filter-feeding pterosaurs': ['Pterodaustro', 'Ctenochasmatidae'],
    'Giant azhdarchids': ['Azhdarchidae'], 'Pteranodonts': ['Pteranodon'], 'Short-tailed pterosaurs': ['Pterodactylus'], 'Toothless crested pterosaurs': ['Tapejaridae'],
    'Bird-line archosaurs': ['Lagerpeton'], 'Choristoderes': ['Champsosaurus', 'Choristodera'], 'Dinosaur cousins': ['Silesaurus', 'Silesauridae'],
    'Early archosaurs': ['Proterosuchus'], 'Early diapsids': ['Petrolacosaurus'], 'Early reptiles': [],
    'Gliding reptiles': ['Coelurosauravus', 'Weigeltisauridae'], 'Lizards': ['Lacertilia'], 'Long-necked archosaur relatives': ['Tanystropheus'],
    'Mesosaurs': ['Mesosaurus'], 'Pareiasaurs': ['Scutosaurus', 'Pareiasauridae'], 'Phytosaurs': ['Phytosauria'], 'Rhynchocephalians': ['Sphenodon', 'Rhynchocephalia'],
    'Rhynchosaurs': ['Hyperodapedon', 'Rhynchosauria'], 'Snakes': ['Serpentes'], 'Turtles': ['Testudines'],
    'Early sea reptiles': [], 'Hupehsuchians': ['Hupehsuchus'], 'Ichthyosaurs': ['Ichthyosauria'], 'Mosasaurs': ['Mosasauridae'],
    'Nothosaurs': ['Nothosaurus'], 'Placodonts': ['Placodontia'], 'Plesiosaurs': ['Plesiosauroidea'], 'Pliosaurs': ['Pliosauridae'],
}
LIC_CODE = {'CC0 1.0': 0, 'Public Domain': 1, 'CC BY 3.0': 2, 'CC BY 4.0': 3}

def get(path, **q):
    u = API + path + ('?' + urllib.parse.urlencode(q) if q else '')
    for tries in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60) as r: return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404: return {}                  # PhyloPic says "no match" this way
            if tries == 4: raise
            time.sleep(2 + 3 * tries)
        except Exception as e:
            if tries == 4: raise
            time.sleep(2 + 3 * tries)

BUILD = None
def build():
    global BUILD
    if BUILD is None:
        req = urllib.request.Request(API + '/', headers=UA)
        with urllib.request.urlopen(req, timeout=60) as r: BUILD = json.load(r)['build']
    return BUILD

def node_for(name):
    d = get('/nodes', build=build(), filter_name=name.lower(), embed_items='true', page=0)
    for it in d.get('_embedded', {}).get('items', []):
        names = [re.sub(r'<[^>]+>', '', ''.join(p.get('text', '') for p in n)) if isinstance(n, list) else str(n) for n in it.get('names', [])]
        title = it['_links']['self'].get('title', '')
        lead = lambda x: x.lower() == name.lower() or x.lower().startswith(name.lower() + ' ')   # "Brachiosaurus Riggs 1903"
        if lead(title) or any(lead(n) for n in names): return it['uuid'], title
    return None, None

def images_for(uuid):
    d = get('/images', build=build(), filter_clade=uuid, filter_license_nc='false', filter_license_sa='false', embed_items='true', page=0)
    return d.get('_embedded', {}).get('items', [])

def is_group(q):
    return q[:1].isupper() and ' ' not in q.strip() and q.endswith(('idae', 'inae', 'oidea', 'ia', 'ra', 'iformes', 'ida', 'ina', 'ta', 'sa', 'da', 'ea', 'morpha'))

def pick(key, queries):
    want_img = next((q[4:] for q in queries if q.startswith('img=')), None)
    queries = [q for q in queries if not q.startswith('img=')]
    for i, q in enumerate(queries):
        uuid, title = node_for(q)
        if not uuid: continue
        ims = [im for im in images_for(uuid) if im['_links']['license']['href'] in OK_LIC]
        if i == 0 and q[:1].isupper() and ' ' not in q.strip() and not is_group(q):   # a genus: the picture must be of it
            ims = [im for im in ims if im['_links']['specificNode']['title'].split(' ')[0].lower() == q.lower()]
        if want_img:
            pinned = [im for im in ims if im['uuid'] == want_img]
            if not pinned and i < len(queries) - 1: continue      # the pinned picture sits under a broader group further down
            ims = pinned or ims
        if not ims: continue
        # the animal itself first, then public domain before credit-only, then the newest
        ims.sort(key=lambda im: (im['_links']['specificNode']['title'].lower() != q.lower() and not im['_links']['specificNode']['title'].lower().startswith(q.lower() + ' '),
                                 im['_links']['license']['href'] not in ('https://creativecommons.org/publicdomain/zero/1.0/', 'https://creativecommons.org/publicdomain/mark/1.0/'),
                                 im.get('created', '')), reverse=False)
        im = ims[0]
        genus = queries[0].split(' ')[0].lower()
        own = i == 0 or im['_links']['specificNode']['title'].split(' ')[0].lower() == genus
        return im, title, ('member' if i == 0 and is_group(q) else 'own' if own else 'relative')
    return None, None, None

def own_queries(name):
    if name in NAMES: return NAMES[name]
    if re.fullmatch(r'[A-Z][a-z]+( [a-z]+)?', name): return [name] + ([name.split()[0]] if ' ' in name else [])
    return []

def pick_animal(name, path, rel_override=None):
    """The best licensed silhouette for one card: its own (species or genus), one member of the group the card is
    about, or a relative's (by the card's group). Returns (image, level) or (None, None)."""
    own = own_queries(name)
    if own == []: return None, None
    want_img = next((q[4:] for q in own if q.startswith('img=')), None)
    own = [q for q in own if not q.startswith('img=')]
    genus = next((q.split()[0].lower() for q in own if q[0] not in '=~!'), None)
    tries = [(q[1:], 'member') if q[0] == '=' else (q[1:], 'own') if q[0] == '~' else (q, None) for q in own if q != '!']
    if '!' not in own: tries += [(q, 'relative') for q in (rel_override or GROUPS.get(path[-1], []))]
    for n, (q, kind) in enumerate(tries):
        uuid, _ = node_for(q)
        if not uuid: continue
        ims = [im for im in images_for(uuid) if im['_links']['license']['href'] in OK_LIC and im['uuid'] not in BAD]
        if kind is None and not is_group(q):   # a genus or species: the drawing must be of that genus (PhyloPic's Tiktaalik holds a burbot)
            ims = [im for im in ims if im['_links']['specificNode']['title'].split(' ')[0].lower() == q.split()[0].lower()]
        if want_img:
            pinned = [im for im in ims if im['uuid'] == want_img]
            if not pinned and n < len(tries) - 1: continue
            ims = pinned or ims
        if not ims: continue
        ql = q.lower()
        ims.sort(key=lambda im: (not (im['_links']['specificNode']['title'].lower() == ql or im['_links']['specificNode']['title'].lower().startswith(ql + ' ')),
                                 im['_links']['license']['href'] not in ('https://creativecommons.org/publicdomain/zero/1.0/', 'https://creativecommons.org/publicdomain/mark/1.0/'),
                                 im.get('created', '')))
        im = ims[0]
        g = im['_links']['specificNode']['title'].split(' ')[0].lower()
        level = 'own' if kind == 'own' or (genus and g == genus) else (kind or 'relative')
        return im, level
    return None, None

def fetch_png(im, size=512):
    files = sorted(im['_links']['rasterFiles'], key=lambda r: int(r['sizes'].split('x')[0]))
    best = next((r for r in files if int(r['sizes'].split('x')[0]) >= 400), files[-1])
    with urllib.request.urlopen(urllib.request.Request(best['href'], headers=UA), timeout=120) as r: raw = r.read()
    img = Image.open(io.BytesIO(raw)).convert('RGBA')
    sc = min(1, size / img.width, size / img.height)
    if sc < 1: img = img.resize((max(1, round(img.width * sc)), max(1, round(img.height * sc))), Image.LANCZOS)
    a = img.getchannel('A')
    out = Image.merge('LA', (Image.new('L', img.size, 0), a))      # black, with the silhouette's own edges
    buf = io.BytesIO(); out.save(buf, 'PNG', optimize=True); return buf.getvalue(), out.size

def main():
    if '--animals' in sys.argv:          # pick for every card; writes the picks (no pictures) to the file named after it
        src, out = sys.argv[sys.argv.index('--animals') + 1], sys.argv[sys.argv.index('--animals') + 2]
        cards = json.load(open(src))
        picks = json.load(open(out)) if os.path.exists(out) and '--resume' in sys.argv else {}
        for i, a in enumerate(cards):
            if a['n'] in picks: continue
            im, level = pick_animal(a['n'], a['path'])
            picks[a['n']] = None if not im else {'img': im['uuid'], 'level': level, 'of': im['_links']['specificNode']['title'],
                'by': im.get('attribution') or im['_links'].get('contributor', {}).get('title', ''), 'lic': OK_LIC[im['_links']['license']['href']],
                'raster': im['_links']['rasterFiles']}
            if i % 25 == 0:
                json.dump(picks, open(out, 'w'), ensure_ascii=False); print(i, len(cards), file=sys.stderr)
        json.dump(picks, open(out, 'w'), ensure_ascii=False)
        lv = {}
        for v in picks.values(): lv[v['level'] if v else 'none'] = lv.get(v['level'] if v else 'none', 0) + 1
        print(json.dumps(lv)); return
    if '--fetch' in sys.argv:            # download each distinct picture once (320 px) and write SILA / SILI.
        # The picks file is the record (tools/silhouette-picks.json): PhyloPic does not always list a group's drawings in
        # the same order, so a fresh --animals run can drift; rebuild from the reviewed file, and re-pick only what you fix.
        picks = json.load(open(sys.argv[sys.argv.index('--fetch') + 1]))
        os.makedirs(os.path.join(ROOT, 'tiles', 'sil', 'p'), exist_ok=True)
        imgs, anim = {}, {}
        for name, v in sorted(picks.items()):
            if not v: continue
            k = v['img'][:8]
            if k not in imgs:
                fn = os.path.join(ROOT, 'tiles', 'sil', 'p', k + '.png')
                if not os.path.exists(fn):
                    png, _ = fetch_png({'_links': {'rasterFiles': v['raster']}}, 320); open(fn, 'wb').write(png); time.sleep(0.1)
                w, h = Image.open(fn).size
                imgs[k] = [w, h, v['by'], LIC_CODE[v['lic']], v['of'], v['img']]
            anim[name] = [k, {'own': 0, 'member': 1, 'relative': 2}[v['level']]]
        old = open(os.path.join(ROOT, 'tools', 'source', 'silhouettes-data.js')).read()
        head = old[:old.index('\nconst SILI')] if '\nconst SILI' in old else old.rstrip('\n')
        js = (head + '\n// Every animal card: SILA[name] = [picture, level 0 own | 1 one member of the group | 2 a relative];\n'
              '// SILI[picture] = [w, h, artist, licence 0 CC0 | 1 public domain | 2 CC BY 3.0 | 3 CC BY 4.0, taxon shown, PhyloPic image id].\n'
              '// The pictures are tiles/sil/p/<picture>.png.\n'
              'const SILI = ' + json.dumps(imgs, ensure_ascii=False, separators=(',', ':')) + ';\n'
              'const SILA = ' + json.dumps(anim, ensure_ascii=False, separators=(',', ':')) + ';\n')
        open(os.path.join(ROOT, 'tools', 'source', 'silhouettes-data.js'), 'w').write(js)
        print(len(anim), 'cards,', len(imgs), 'pictures'); return
    if '--coverage' in sys.argv:
        names = json.load(open(sys.argv[sys.argv.index('--coverage') + 1]))
        own = rel = none = 0; misses = []
        for n in names:
            genus = n.split(' (')[0].split()[0]
            uuid, _ = node_for(n.split(' (')[0])
            if not uuid: uuid, _ = node_for(genus)
            ok = bool(uuid) and any(im['_links']['license']['href'] in OK_LIC for im in images_for(uuid))
            if ok: own += 1
            else: none += 1; misses.append(n)
            time.sleep(0.15)
        print(json.dumps({'checked': len(names), 'own or genus': own, 'none yet': none, 'misses': misses}, indent=1)); return
    os.makedirs(os.path.join(ROOT, 'tiles', 'sil'), exist_ok=True)
    out, keys = {}, list(WANT)
    if '--only' in sys.argv:
        keys = sys.argv[sys.argv.index('--only') + 1].split(',')
        old = open(os.path.join(ROOT, 'tools', 'source', 'silhouettes-data.js')).read()
        out = json.loads(old[old.index('const SIL = ') + 12:old.rindex(';')])
    for key in keys:
        q = WANT[key]
        im, title, level = pick(key, q)
        if not im: print('no silhouette for', key, file=sys.stderr); continue
        png, (w, h) = fetch_png(im)
        open(os.path.join(ROOT, 'tiles', 'sil', key + '.png'), 'wb').write(png)
        L = im['_links']
        out[key] = {'f': 'tiles/sil/' + key + '.png', 'w': w, 'h': h, 'by': im.get('attribution') or L.get('contributor', {}).get('title', ''),
                    'lic': OK_LIC[L['license']['href']], 'licUrl': L['license']['href'], 'of': L['specificNode']['title'], 'level': level, 'img': im['uuid']}
        print(f"{key:16s} {level:8s} {out[key]['of']:32s} {out[key]['lic']:10s} {out[key]['by']}  ({len(png) // 1024} KB)", file=sys.stderr)
        time.sleep(0.3)
    js = ('/* Animal silhouettes from PhyloPic (phylopic.org) — GENERATED by tools/build_silhouettes.py. Each is CC0, public domain '
          'or CC BY, and its credit is shown wherever it is used. The pictures themselves are in tiles/sil/. */\n'
          'const SIL = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
    open(os.path.join(ROOT, 'tools', 'source', 'silhouettes-data.js'), 'w').write(js)

if __name__ == '__main__':
    main()
