// Period-level edits, the new Ediacaran period, the "Deep Time" insight
// panels, museum-label notes for well-known creatures already on the site,
// famous fossil sites, and the map's labels.

// ── corrections to existing period records ──────────────────────────
const PERIOD_EDITS = {
  cryogenian: { era: 'Neoproterozoic Era' },
  cambrian: { start: 539 },
  permian: {
    event: '⚠️ THE GREAT DYING: around nine in ten ocean species and seven in ten land vertebrates wiped out — the worst extinction in Earth\'s history, driven by colossal volcanic eruptions in Siberia.',
    funFact: 'The Permian ends with the worst extinction in Earth\'s entire history. Volcanoes in Siberia flood an area the size of a continent with lava, pumping out greenhouse gases that overheat the planet and strip the oceans of oxygen. Around nine in ten ocean species vanish.' },
  jurassic: { funFact: 'Some of the longest animals EVER to walk on land lived in the Jurassic! Supersaurus reached about 33–35 meters — longer than a blue whale, though far lighter. (The heaviest land animals of all, the titanosaurs, came later, in the Cretaceous.)' },
  cretaceous: { event: '⚠️ K–Pg EXTINCTION: An asteroid slams into Earth! Dinosaurs die — but birds survive and thrive. Mammals inherit the world.' },
  quaternary: { name: 'Quaternary', title: 'Ice Age', end: 0.0117,
    funFact: 'Woolly mammoths were still alive on a remote Arctic island when the ancient Egyptians were building the Great Pyramid. The last ones died only about 4,000 years ago — and why they finally vanished is still debated.' },
  holocene: { name: 'Holocene', title: 'Human Age', start: 0.0117,
    funFact: 'If all of Earth\'s history were one 24-hour day, our species appears about six seconds before midnight. Dinosaurs went extinct at 11:39 PM. The entire Industrial Revolution fits into the last five-thousandths of a second.' },
};

const EDIACARAN = {
  id: 'ediacaran', name: 'Ediacaran', era: 'Neoproterozoic Era',
  start: 635, end: 539, color: '#8f7ad8', textColor: '#b7a6f5',
  desc: 'The ice melts — and the first large, complex living things appear. Soft-bodied fronds, discs and quilted mats carpet the sea floor: a strange garden with no eyes, no jaws and no legs.',
  funFact: 'Ediacaran creatures were so unlike anything alive today that scientists argued for decades about whether they were animals, giant single cells, lichens — or a failed experiment in life that left no descendants at all.',
  event: null, continentKey: 'cambrian', creatures: [],
};

// ── Deep Time insight panels ────────────────────────────────────────
// big   one-sentence museum headline
// signs "vital signs" of the planet: [icon, label, text]
// know  how do we know?      today  why it matters now
// ext   mass extinction, where one ends the period
const INSIGHTS = {
  cryogenian: {
    big: 'Earth froze almost solid — twice — and life came through it.',
    signs: [
      ['🧊', 'Climate', 'Two “Snowball Earth” ice ages: the Sturtian (about 717–660 MYA) and the Marinoan (about 650–635 MYA). Glaciers reached sea level at the equator.'],
      ['💨', 'Air', 'Very little oxygen. Carbon dioxide from volcanoes built up for millions of years under the ice — until the greenhouse grew strong enough to melt it.'],
      ['☀️', 'Day length', 'About 21.9 hours. A year had roughly 400 days.'],
      ['🦠', 'Life', 'Microbes, algae and probably the first sponges, surviving in open cracks, meltwater pools and around volcanic vents.'],
    ],
    know: 'Rocks dropped by melting icebergs lie in sea-floor mud whose magnetic grains show it formed near the equator. Directly on top sit “cap carbonates” — limestone laid down fast as the ice vanished into a hothouse.',
    today: 'Snowball Earth is the clearest case of a climate feedback running away: ice reflects sunlight, which cools the planet, which makes more ice. It also shows that a greenhouse atmosphere can end even a frozen world.',
  },
  ediacaran: {
    big: 'Life gets large — soft, strange, and unlike anything alive today.',
    signs: [
      ['🌡', 'Climate', 'Warming after Snowball Earth, with one brief ice age (the Gaskiers, about 580 MYA).'],
      ['💨', 'Air & sea', 'Oxygen reaches the deep ocean for the first time — possibly what allowed big bodies to evolve.'],
      ['🌍', 'Continents', 'The southern continents are colliding to assemble Gondwana.'],
      ['🧫', 'Life', 'Fronds, discs and quilted mats up to 2 m long. By the end: the first burrows, the first shells — and the first holes drilled in them by predators.'],
    ],
    know: 'Ediacaran organisms had no bones or shells; they survive as impressions pressed into sand and volcanic ash at Mistaken Point (Canada), the Ediacara Hills (Australia) and the White Sea (Russia). In 2018, fossil cholesterol recovered from one of them, Dickinsonia, showed it was an animal.',
    today: 'Named in 2004, the Ediacaran was the first new geological period to be declared in 120 years. Its fossils record life\'s first experiment with being big.',
  },
  cambrian: {
    big: 'In a geological blink, nearly every major animal body plan appears.',
    signs: [
      ['🌡', 'Climate', 'A warm greenhouse world with no ice at the poles.'],
      ['💨', 'CO₂', 'Many times today\'s level — rough estimates run to 10–20 times.'],
      ['🌊', 'Sea level', 'High and rising. Warm, shallow seas spread across the continents.'],
      ['🏜', 'Land', 'Bare rock and crusts of microbes. No plants, no animals on land.'],
      ['☀️', 'Day length', 'About 21 hours.'],
    ],
    know: 'Two exceptional fossil beds — the Burgess Shale in Canada and Chengjiang in China — were buried so fast in fine mud that eyes, guts, gills and legs survive, not just shells. Charles Walcott, Secretary of the Smithsonian, found the Burgess Shale in 1909 and collected about 65,000 specimens, still held in Washington.',
    today: 'Your own body plan — a head end, paired eyes, a nerve cord along the back — goes back to small Cambrian swimmers like Pikaia.',
  },
  ordovician: {
    big: 'Life in the sea triples in variety — then an ice age brings the first of the “Big Five” mass extinctions.',
    signs: [
      ['🌡', 'Climate', 'A hot greenhouse that cools into a short, severe ice age at the very end (about 445–443 MYA).'],
      ['🌊', 'Sea level', 'Among the highest of the last 540 million years — then a fall of 50–100 m as the ice grew.'],
      ['🌱', 'Land', 'The first plants: moss-like and tiny, known only from their spores, about 470 MYA.'],
      ['🌍', 'Continents', 'Gondwana drifts across the South Pole.'],
    ],
    know: 'Bedrock in today\'s Sahara is scratched and polished by glaciers of this age: North Africa was then at the South Pole. And microscopic spores in 470-million-year-old rock are the first sign of plants on land, long before any plant body is preserved.',
    today: 'It is proof that cooling can kill as thoroughly as warming. What matters is how fast the climate changes.',
    ext: { name: 'End-Ordovician mass extinction', when: 'About 445–443 MYA, in two pulses', toll: 'About 85% of marine species',
      cause: 'A short, intense ice age. Sea level fell, shallow seas drained and the water chilled; a second wave of extinction followed as the ice melted and oxygen-poor water spread.' },
  },
  silurian: {
    big: 'Life recovers — and takes its first firm steps onto land.',
    signs: [
      ['🌡', 'Climate', 'Warm and stable once the ice melts; the seas rise again.'],
      ['🌱', 'Land', 'The first upright plants with water-carrying tubes, a few centimetres tall. The first land animals: millipedes and relatives of spiders.'],
      ['🪸', 'Sea', 'Vast reefs of corals and sponges. The first fish with jaws.'],
      ['🔥', 'Air', 'Oxygen is climbing: the oldest charcoal — the first wildfire — dates to about 420 MYA.'],
      ['⛰', 'Continents', 'Laurentia, Baltica and Avalonia collide, raising the mountains of Scotland and Scandinavia.'],
    ],
    know: 'Fossil Cooksonia stems from Wales and Ireland preserve the earliest water-conducting cells. Charcoal proves fire — and fire needs both land plants to burn and air that is at least about 16% oxygen.',
    today: 'Every forest, field and garden descends from these finger-high pioneers. Plants on land also began making the first soils and pulling CO₂ out of the air.',
  },
  devonian: {
    big: 'The Age of Fishes — and of the first forests, the first seeds and the first four-legged animals.',
    signs: [
      ['🌡', 'Climate', 'Warm, cooling toward the end.'],
      ['💨', 'CO₂', 'Falls steeply as the first forests and deep soils lock carbon away.'],
      ['🌳', 'Land', 'From ankle-high plants to trees 30 m tall in about 50 million years.'],
      ['☀️', 'Day length', 'About 22 hours — roughly 400 days in a year.'],
      ['🪸', 'Sea', 'Some of the largest reefs in Earth history; one still stands as limestone ranges in Western Australia.'],
    ],
    know: 'Devonian corals laid down one growth line a day. Counting them in 1963, John Wells found about 400 lines per year — so each day was about 22 hours long. Earth\'s spin has been slowing ever since, braked by the Moon\'s tides.',
    today: 'The bones of your arm — one bone, two bones, lots of little bones, then fingers — were laid out in Devonian fishes such as Tiktaalik.',
    ext: { name: 'Late Devonian mass extinction', when: 'About 372 MYA, with a second crisis about 359 MYA', toll: 'About 70–75% of species; reef builders and armoured fishes were hit hardest',
      cause: 'Still debated. Leading ideas: oceans starved of oxygen — possibly fed by nutrients washing off newly forested land — together with climate cooling and volcanism.' },
  },
  carboniferous: {
    big: 'Coal forests bury so much carbon that the air fills with oxygen and the planet slides into an ice age.',
    signs: [
      ['💨', 'Oxygen', 'Up to about 30–35% of the air (21% today) — the highest ever. Giant insects follow.'],
      ['🌫', 'CO₂', 'Falls to levels close to today\'s.'],
      ['🌡', 'Climate', 'Tropical coal swamps at the equator; great ice sheets over the southern continents.'],
      ['🌊', 'Sea level', 'Rises and falls by tens of metres as the ice sheets grow and melt.'],
      ['⛰', 'Continents', 'Laurussia and Gondwana collide to begin building Pangaea, raising the Appalachians.'],
    ],
    know: 'Coal seams are those forests, compressed. Repeating stacks of coal, shale and limestone record the sea rising and falling in step with the ice — in the same orbital rhythm that paced our own Ice Age.',
    today: 'Much of the coal that powered the Industrial Revolution formed in these swamps. Burning it returns to the air, in a few centuries, carbon that took millions of years to bury.',
  },
  permian: {
    big: 'One supercontinent, one world ocean — and the worst extinction of all time.',
    signs: [
      ['🌍', 'Continents', 'Pangaea stretches almost from pole to pole.'],
      ['🌡', 'Climate', 'An ice age at the start; hot, dry interior deserts by the end.'],
      ['🦎', 'Life', 'Synapsids — the line that leads to mammals — rule the land.'],
      ['🌊', 'Sea', 'A single ocean, Panthalassa, with the Tethys Sea cutting into Pangaea\'s eastern side.'],
    ],
    know: 'A layer of volcanic ash at Meishan, China, dates the extinction to within tens of thousands of years — and it lines up with the eruption of the Siberian Traps. Earlier in the Permian, identical fossils (the reptile Mesosaurus, the plant Glossopteris) on continents now oceans apart were key evidence for continental drift.',
    today: 'It is the best-studied example of what a rapid release of greenhouse gas does to the sea: warming, acidification and loss of oxygen — the same three changes now being measured in today\'s oceans.',
    ext: { name: 'End-Permian mass extinction — “the Great Dying”', when: 'About 251.9 MYA, over roughly 60,000 years or less', toll: 'Roughly 80–95% of marine species and about 70% of land vertebrates; the only known mass extinction of insects',
      cause: 'Eruption of the Siberian Traps, one of the largest volcanic events known. CO₂ and other gases drove around 10 °C of warming, acidified the oceans and drained them of oxygen.' },
  },
  triassic: {
    big: 'Life restarts from near zero — and dinosaurs, mammals, turtles, crocodile-relatives and pterosaurs all appear.',
    signs: [
      ['🌡', 'Climate', 'Hot and dry with no polar ice. In the first few million years, tropical seas reached about 40 °C — too hot for most life.'],
      ['🌧', 'The Carnian rains', 'About 234–232 MYA it rained, on and off, for one to two million years. Dinosaurs diversified straight afterwards.'],
      ['🌲', 'Recovery', 'Forests took so long to return that no coal formed anywhere on Earth for millions of years.'],
      ['🌍', 'Continents', 'Pangaea is whole — and begins to tear apart at the very end.'],
    ],
    know: 'The oldest well-dated dinosaurs come from Argentina and southern Brazil, where layers of volcanic ash give precise ages of about 233–231 million years. They were small, two-legged and rare: a minor part of a world run by other reptiles.',
    today: 'The bird line and the crocodile line split here. Birds and crocodiles are still each other\'s closest living relatives.',
    ext: { name: 'End-Triassic mass extinction', when: 'About 201 MYA', toll: 'About three-quarters of species, including most of the big crocodile-line reptiles',
      cause: 'Vast eruptions (the Central Atlantic Magmatic Province) as Pangaea split open where the Atlantic is today, releasing CO₂ that warmed the planet and acidified the oceans. The same lavas form the Palisades cliffs across the river from New York City.' },
  },
  jurassic: {
    big: 'Pangaea breaks in two, the Atlantic is born, and dinosaurs become giants.',
    signs: [
      ['🌡', 'Climate', 'Warm and humid, with little or no polar ice.'],
      ['🌲', 'Land', 'Forests of conifers, cycads, ginkgoes and ferns. No flowers. No grass.'],
      ['🌊', 'Sea level', 'High — shallow seas flood much of Europe.'],
      ['🌍', 'Continents', 'Laurasia in the north and Gondwana in the south separate; the central Atlantic opens from about 175 MYA.'],
    ],
    know: 'The Morrison Formation of the western USA — river and floodplain muds about 156–147 million years old — has yielded Allosaurus, Stegosaurus, Diplodocus and many more from the same layers, which is how we know they lived side by side.',
    today: 'Plankton-rich mud from Jurassic seas became much of the world\'s oil, including the fields of the North Sea and Saudi Arabia.',
  },
  cretaceous: {
    big: 'A hothouse world of flowering plants, giant dinosaurs and high seas — ended in a day by an asteroid.',
    signs: [
      ['🌡', 'Climate', 'One of the warmest times of the last 500 million years, peaking about 90 MYA. Forests and dinosaurs lived near both poles.'],
      ['🌊', 'Sea level', 'Perhaps 100–250 m higher than today. A seaway split North America in two.'],
      ['💨', 'CO₂', 'Around 1,000 parts per million or more (today: about 425).'],
      ['🌸', 'Life', 'Flowering plants appear about 130 MYA and take over. Bees, ants, snakes and modern bird groups arrive.'],
      ['🌍', 'Continents', 'South America and Africa part; India breaks away and races north.'],
    ],
    know: 'A thin layer of clay found all over the world is rich in iridium — rare in Earth\'s crust, common in asteroids (Luis and Walter Alvarez, 1980). The same layer holds shocked quartz and beads of melted rock. The buried crater, 180 km across, was identified at Chicxulub, Mexico, in 1991.',
    today: 'Birds are living dinosaurs — about 11,000 species of them. And the asteroid shows that the dominant animals of an age can vanish quickly, opening the way for others: in this case mammals, and eventually us.',
    ext: { name: 'End-Cretaceous (K–Pg) mass extinction', when: '66 MYA', toll: 'About 75% of species, including every dinosaur except the birds',
      cause: 'An asteroid about 10 km wide struck the Yucatán. Soot and dust blocked the Sun and stopped photosynthesis for months to years. Enormous eruptions in India (the Deccan Traps) were already under way and may have added to the stress.' },
  },
  paleogene: {
    big: 'Mammals and birds inherit the Earth, and the climate swings from extreme hothouse to the first Antarctic ice.',
    signs: [
      ['🔥', '56 MYA', 'A sudden release of carbon warmed the planet by 5–8 °C in under 20,000 years. The heat lasted about 200,000 years.'],
      ['🌴', '50 MYA', 'Palm trees and alligator relatives live in the Arctic. CO₂ is above 1,000 parts per million.'],
      ['🧊', '34 MYA', 'CO₂ has fallen; Antarctica freezes over for the first time in over 200 million years.'],
      ['🌊', 'Sea level', 'Tens of metres higher than today until the ice sheets form.'],
      ['⛰', 'Continents', 'India collides with Asia (about 50 MYA) and the Himalayas begin to rise.'],
    ],
    know: 'The shells of microscopic sea creatures record ocean temperature in their chemistry. Cores drilled from the sea floor give an unbroken temperature record for the whole of the last 66 million years.',
    today: 'The warming 56 million years ago is the closest natural parallel to our own — but carbon is entering the air today about ten times faster than it did then.',
  },
  neogene: {
    big: 'Grasslands spread, apes flourish — and one line of apes stands up.',
    signs: [
      ['🌡', 'Climate', 'A long cooling. Antarctic ice expands about 14 MYA; ice forms in the Arctic by about 3 MYA.'],
      ['🌾', 'Land', 'Tropical grasses spread 8–6 MYA, creating the savannas.'],
      ['🧂', 'A dried-up sea', 'About 5.97–5.33 MYA the Mediterranean was cut off from the Atlantic and nearly evaporated, leaving salt over a kilometre thick.'],
      ['🌉', 'A new bridge', 'The Isthmus of Panama joins the Americas by about 3 MYA; animals walk both ways.'],
      ['🧬', 'Our branch', 'DNA puts the split between the human line and the chimpanzee line at roughly 7–6 MYA.'],
    ],
    know: 'Tooth enamel records what an animal ate. The carbon in fossil teeth from Pakistan to Kenya shifts between 8 and 6 million years ago, tracking grazing animals as they switched from forest leaves to tropical grass.',
    today: 'About 3 million years ago CO₂ was close to today\'s level, the world was 2–3 °C warmer and the seas were perhaps 10–20 m higher. It is studied as a preview of where today\'s atmosphere leads once oceans and ice sheets catch up.',
  },
  quaternary: {
    big: 'The Ice Age: glaciers advance and retreat dozens of times while the human family spreads across the world.',
    signs: [
      ['🧊', 'Climate', 'About 50 cold–warm cycles: every 41,000 years at first, then roughly every 100,000 years.'],
      ['❄️', '21,000 years ago', 'The last peak of the ice. The world averaged about 6 °C colder; ice up to 3 km thick covered Canada and Scandinavia.'],
      ['🌊', 'Sea level', 'About 120 m lower at glacial peaks. Land bridges joined Siberia to Alaska, Britain to Europe, and New Guinea to Australia.'],
      ['💨', 'CO₂', 'Swings between about 180 parts per million (cold) and 280 (warm).'],
    ],
    know: 'Ice drilled from Antarctica holds bubbles of ancient air: a direct sample of the atmosphere going back 800,000 years. Cores recovered in 2025 reach back more than a million.',
    today: 'Earth\'s orbit sets the rhythm of the ice ages; CO₂ amplifies it. Today\'s CO₂ — above 420 parts per million — is higher than at any point in the ice-core record.',
    ext: { name: 'The loss of the giants', when: 'Mostly 50,000–10,000 years ago', toll: 'Most large mammals outside Africa: about 70% of the big-mammal groups of North America, over 80% in South America and nearly 90% in Australia',
      cause: 'Debated: hunting by modern humans as they spread, rapid climate change at the end of the last ice age, or both together. The losses follow the arrival of people — Australia first, the Americas later, islands like Madagascar and New Zealand last.' },
  },
  holocene: {
    big: 'A rare stretch of stable climate — and one species changes the planet.',
    signs: [
      ['🌡', 'Climate', 'Unusually steady for about 11,700 years — the calm in which farming and cities arose.'],
      ['🌊', 'Sea level', 'Rose about 120 m as the ice melted, drowning the land bridges; roughly stable for the last 7,000 years.'],
      ['👥', 'People', 'From a few million at the dawn of farming to more than 8 billion.'],
      ['💨', 'CO₂', '280 parts per million before industry. More than 420 now.'],
    ],
    know: 'Written records, tree rings, corals, lake mud and ice cores overlap, so many events of the last few thousand years can be dated to the exact year.',
    today: 'Geologists proposed naming a new epoch, the Anthropocene, for the human era. In 2024 the international body that decides voted the formal proposal down — but the word, and the question behind it, have stuck.',
    ext: { name: 'A sixth mass extinction?', when: 'Now', toll: 'Not yet on the scale of the Big Five — but species are being lost at an estimated tens to hundreds of times the natural rate',
      cause: 'Habitat loss, over-hunting and over-fishing, invasive species, pollution and climate change. The dodo (last seen 1662), the passenger pigeon (1914) and the thylacine (1936) are on this map.' },
  },
};

// ── museum-label notes for creatures already on the site ────────────
const CREATURE_INSIGHTS = {
  'Tyrannosaurus rex': {
    fact: 'The skull of “Sue” (FMNH PR 2081, Field Museum, Chicago) shows healed bite marks from another T. rex — direct fossil evidence they fought each other. Her thigh bone is 1.33 meters long.',
    know: 'Growth rings in the bones, like tree rings, show a teenage growth spurt of about 2 kg a day; few T. rex lived past 30. Fossil dung packed with crushed bone confirms the bone-shattering bite — the strongest of any land animal known.',
    debate: 'Was the smaller “Nanotyrannus” a separate species or a teenage T. rex? A nearly full-grown skeleton described in 2025 points to a separate species — an argument that has run for over 30 years.' },
  'Triceratops': { know: 'One Triceratops skull has a brow horn bitten off and a frill gouged by T. rex teeth — and the bone had healed. It fought a tyrannosaur and lived.' },
  'Velociraptor': { know: 'A forearm bone found in Mongolia has a row of small bumps — quill knobs, where large feathers were anchored, just as in a modern turkey. The real Velociraptor was turkey-sized, too: about 15 kg.' },
  'Spinosaurus': {
    know: 'A skeleton from Morocco described in 2020 has a tall, flexible, paddle-like tail — unlike any other dinosaur\'s. Its bones are dense and solid, like a penguin\'s or a hippo\'s, which helps an animal stay submerged.',
    debate: 'A swimmer that chased fish underwater, or a wader that snatched them from the shallows like a giant heron? Specialists read the same bones both ways.' },
  'Archaeopteryx': { know: 'The first skeleton was found in 1861, two years after Darwin predicted that links between major groups must have existed. It has a bird\'s feathers and wishbone with a reptile\'s teeth, clawed fingers and long bony tail.' },
  'Tiktaalik': { know: 'It was predicted before it was found. Neil Shubin\'s team reasoned that a fish-to-land animal should lie in river rocks about 375 million years old, found such rocks exposed in Arctic Canada, and searched for four summers. The name is Inuktitut for a large freshwater fish.' },
  'Stegosaurus': { know: 'An Allosaurus tail bone has a hole punched through it that fits a Stegosaurus tail spike exactly — and the wound had begun to heal. The spikes were weapons, and they worked.' },
  'Mosasaurus': { know: 'A giant skull dug from a chalk mine at Maastricht in the 1770s helped Georges Cuvier convince the world that species can go extinct — an idea many then thought impossible. Mosasaurs were lizards, related to monitors and snakes, and gave birth to live young at sea.' },
  'Dunkleosteus': { know: 'It had no teeth: the “fangs” are self-sharpening blades of jaw bone. Only its armoured head fossilises, so its length is an estimate — and a 2023 restudy cut it from the 9 m of older books to about 3.5–4 m: shorter, but built like a giant tuna.' },
  'Megalodon': { know: 'Shark skeletons are cartilage, which rarely fossilises, so megalodon is known almost entirely from teeth up to 18 cm long and a few backbones. Every size you have seen quoted is an estimate scaled from those.',
    debate: 'How long, and what shape? Estimates run from 15 to over 20 m, and a 2025 study argued for a longer, slimmer body than the giant great white of the films.' },
  'Pakicetus': { know: 'It looks like a long-legged wolf — but its ear bone has a thickened shape found in only one other group of animals: whales. Its ankle bones link whales to the hoofed mammals; their closest living relatives are hippos.' },
  'Basilosaurus': { know: 'This 18-m whale still had hind legs — about 35 cm long, with knees, ankles and toes, far too small to walk on. They are leftovers of an ancestry on land.' },
  'Lystrosaurus': { know: 'The same pig-sized animal is found in South Africa, India and Antarctica — lands now separated by thousands of kilometres of ocean it could not have swum. After the Great Dying it made up as much as nine-tenths of all land vertebrates in some places.' },
  'Dimetrodon': { know: 'Not a dinosaur. It has one opening in the skull behind each eye, the mark of the synapsids — the branch that leads to mammals. Dimetrodon is more closely related to you than to T. rex, and it died out 40 million years before the first dinosaur.' },
  'Iguanodon': { know: 'The second dinosaur ever named (1825). Its thumb spike was first reconstructed as a horn on its nose — until 1878, when coal miners in Belgium broke into a pocket holding more than thirty complete skeletons, 322 m underground.' },
  'Megalosaurus': { know: 'The first dinosaur ever to be named, by William Buckland in 1824 — eighteen years before the word “dinosaur” existed. A piece of one had been illustrated as early as 1677, and taken for the thigh bone of a giant human.' },
  'Trilobite': { know: 'Trilobites moulted as they grew, so most trilobite fossils are cast-off shells, not bodies. Their eye lenses were made of the mineral calcite — the oldest eyes that can still be studied as optics.' },
  'Hallucigenia': { know: 'Even after it was turned the right way up, nobody knew which end was the head. In 2015 an electron microscope found it: a pair of simple eyes and a ring of teeth — on what had been thought to be the tail.' },
  'Arthropleura': { know: 'The largest arthropod that ever lived — a millipede relative up to 2.6 m long. For over 150 years no head had been found; in 2024, CT scans of juveniles from France finally showed one, with stalked eyes.' },
  'Helicoprion': { know: 'For a century nobody knew where its spiral of teeth went — on the snout, the tail, the back fin? CT scans in 2013 found jaw cartilage around a whorl: it sat inside the lower jaw like a circular saw. It was a relative of ratfish, not a true shark.' },
  'Glossopteris': { know: 'When the bodies of Captain Scott\'s party were found in Antarctica in 1912, beside them lay 16 kg of rock they had refused to abandon. It contained Glossopteris leaves — proof that Antarctica was once warm, forested and joined to other continents.' },
  'Mesosaurus': { know: 'A small freshwater reptile found only in southern Africa and eastern South America. Alfred Wegener used it in 1915 as evidence that the two continents had once been joined: it could not have crossed an ocean.' },
  'Quetzalcoatlus': { know: 'With a 10–11 m wingspan it was among the largest flying animals ever. Its bones show it walked on all fours with wings folded, stalking prey like a stork, and probably launched itself with a leap from its powerful arms.' },
  'Coelophysis': { know: 'At Ghost Ranch, New Mexico, a single quarry opened in 1947 holds the skeletons of hundreds of Coelophysis that died together. A Coelophysis skull was carried to the Mir space station in 1998.' },
  'Woolly Mammoth': { know: 'Carcasses frozen in the Siberian permafrost still have hair, skin, stomach contents and even liquid blood. Their DNA has been read in full — the oldest, from a mammoth tooth, is over a million years old.' },
  'Saber-toothed Cat (Smilodon)': { know: 'The tar pits at La Brea have yielded more than 2,000 individual Smilodon. Many had survived crippling injuries long enough for the bone to heal — which suggests, though it does not prove, that they lived in groups.' },
  'Dodo (Raphus cucullatus)': { know: 'No complete stuffed dodo survives — only a head and a foot at Oxford. DNA from that head showed the dodo was a giant flightless pigeon; its closest living relative is the Nicobar pigeon of Southeast Asia.' },
  'Brachiosaurus': { know: 'The towering skeleton in Berlin, long shown in books as Brachiosaurus, is now classed as a different animal, Giraffatitan. The true North American Brachiosaurus is known from much less complete remains.' },
  'Diplodocus': { know: 'The steel magnate Andrew Carnegie paid for the dig and then gave plaster copies of “Dippy” to museums in London, Berlin, Paris and other capitals — which is why it became the most-seen dinosaur skeleton in the world.' },
};

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
  ['Laurentia', 50, -95, 720, 430, 13], ['Baltica', 58, 32, 720, 430, 12], ['Siberia', 63, 105, 720, 260, 12],
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
];
// Existing geology cards: where to pin them on the map (present-day lat/lon), or null for none.
const GEO_FIX = { camp: [32, -7], tethys_sea: null, iapetus_ocean: null, rheic_ocean: null, panthalassa: null, snowball_earth: null };

if (typeof module !== 'undefined') module.exports = { PERIOD_EDITS, EDIACARAN, INSIGHTS, CREATURE_INSIGHTS, SITES, LABELS, OCEANS, SUPEROCEAN, ICE_AGE_NOTES, GEO_FIX };
