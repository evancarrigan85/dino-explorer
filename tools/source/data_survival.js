// What helped people, and what threatened them, at each moment of the human story — shown in the
// Humans tab under “At this time” for whatever is true where the timeline stands.
//
// Each entry:
//   id      also the source target: its papers are listed under v:<id> in refs_wanted.txt
//   kind    'help' or 'threat'
//   t       [from, to] in millions of years ago (to 0 = still true today), or
//   y       [from, to] in calendar years (negative = BCE), for recorded history
//   icon, name, text   what it was, in plain words, and how we know
//   where   the place the evidence comes from
//   debate  (optional) what is still argued over — shown on the page
// Nothing here is said that its sources do not support. A help starts with the oldest evidence for it,
// which is not the same as when it began: the page says so.
// ==== what helped people, and what threatened them ====
const SURVIVAL = [
  // ── what helped ──
  { id: 'stone', kind: 'help', t: [3.3, 0], icon: '🪨', name: 'A sharp edge', where: 'Lomekwi 3, West Turkana, Kenya',
    text: 'Knock one stone hard against another and a flake breaks off with an edge sharper than any tooth. The oldest stone tools yet found, at Lomekwi in Kenya, are 3.3 million years old — older than any fossil of our own kind, Homo. An edge cuts what hands and teeth cannot.' },
  { id: 'fire', kind: 'help', t: [1.0, 0], icon: '🔥', name: 'Fire', where: 'Wonderwerk Cave, South Africa',
    text: 'Fire gives warmth, light after dark and cooked food. The oldest sure sign of fire tended by our relatives is about a million years old: burnt bone and the ash of plants, still lying where they burned, deep inside Wonderwerk Cave.',
    debate: 'When people learned to start a fire, rather than keep one going, is not known.' },
  { id: 'spears', kind: 'help', t: [0.3, 0], icon: '🎯', name: 'Spears and teamwork', where: 'Schöningen, Germany',
    text: 'At Schöningen in Germany, carved wooden spears about 300,000 years old lay among the bones of wild horses that had been butchered. They are shaped like javelins. Hunting horses with spears takes a plan and a team.',
    debate: 'The first report put the spears at 400,000 years; dating the site again brought that down to about 300,000.' },
  { id: 'bedding', kind: 'help', t: [0.2, 0], icon: '🛏', name: 'A clean bed', where: 'Border Cave, South Africa',
    text: 'About 200,000 years ago people at Border Cave slept on bundles of grass laid over a layer of ash. The ash may have kept crawling insects out of bed.' },
  { id: 'clothes', kind: 'help', t: [0.17, 0], icon: '🧥', name: 'Clothes', where: 'Read from the DNA of lice',
    text: 'Clothes rot away, but lice leave a trail. Body lice live only in clothing, and their DNA shows they split from head lice at least 83,000 and perhaps 170,000 years ago — so people wore clothes by then. Clothes let people live where it is cold.',
    debate: 'The dates come from a DNA clock and are wide; no clothing that old has been found.' },
  { id: 'shore', kind: 'help', t: [0.164, 0], icon: '🦪', name: 'Food from the shore', where: 'Pinnacle Point, South Africa',
    text: 'At Pinnacle Point, 164,000 years ago, people were gathering shellfish from the rocks — among the oldest known meals from the sea. The shore went on feeding people while a cold, dry time made the land poor.' },
  { id: 'fishing', kind: 'help', t: [0.035, 0], icon: '🎣', name: 'Boats and hooks', where: 'Sakitari Cave, Okinawa, Japan',
    text: 'By 35,000 years ago people had crossed the sea to small islands off Asia and lived there from the sea. In Sakitari Cave on Okinawa they left fish hooks carved from shell about 23,000 years old, among the oldest known.' },
  { id: 'bridge', kind: 'help', t: [0.03, 0.011], icon: '🌉', name: 'Land where the sea is now', where: 'Beringia, between Siberia and Alaska',
    text: 'With so much water locked up in ice, the sea was far lower than today, and dry land joined Siberia to Alaska. People lived on that land for thousands of years, then spread into the Americas.',
    debate: 'How long people waited in Beringia, and by which route they went south, are still argued over.' },
  { id: 'grain', kind: 'help', t: [0.023, 0], icon: '🌱', name: 'Tending wild grain', where: 'Ohalo II, Sea of Galilee, Israel',
    text: 'By the Sea of Galilee, 23,000 years ago, people gathered wild wheat and barley, and the weeds that grow in tilled fields grew with them. It was a first small try at farming, more than 10,000 years before farming took hold.' },
  { id: 'dogs', kind: 'help', t: [0.012, 0], icon: '🐕', name: 'Dogs', where: 'Ein Mallaha, Israel',
    text: 'About 12,000 years ago at Ein Mallaha, an old person was buried with a hand resting on a puppy. Dogs were the first animals people tamed.',
    debate: 'Dogs may have been tamed much earlier; older fossils and the DNA of dogs and wolves are still argued over.' },
  { id: 'rice', kind: 'help', t: [0.009, 0], icon: '🍚', name: 'Farming', where: 'Lower Yangtze, China',
    text: 'Over thousands of years, people by the Lower Yangtze turned wild rice into a crop whose grains stay on the plant until harvest. Farming — begun there and in a few other places on its own — gave food that could be stored for the hard months.' },
  // ── what threatened ──
  { id: 'hunted', kind: 'threat', t: [7, 0], icon: '🐆', name: 'Being hunted', where: 'Taung and Swartkrans, South Africa',
    text: 'Our small, slow relatives were prey. The skull of the Taung child, more than two million years old, carries the marks of an eagle’s talons and beak. A young skull from Swartkrans has two holes that fit the lower fangs of a leopard.' },
  { id: 'swings', kind: 'threat', t: [3, 0.0117], icon: '🌦', name: 'Weather that would not settle', where: 'East Africa',
    text: 'Over thousands of years East Africa kept swinging between wet and dry: lakes filled and vanished, forest gave way to grass and came back. Food and water kept moving.',
    debate: 'One idea is that these swings are why our ancestors became so adaptable. How much they shaped us is argued over.' },
  { id: 'toba', kind: 'threat', t: [0.075, 0.072], icon: '🌋', name: 'The Toba super-eruption', where: 'Sumatra; its ash is in Lake Malawi',
    text: 'About 74,000 years ago the Toba volcano in Sumatra had one of the largest eruptions of the last two million years. Its ash fell as far away as India and Lake Malawi in Africa.',
    debate: 'It was once thought to have caused a “volcanic winter” that nearly wiped out our species. Mud from Lake Malawi shows no such winter there, and many scientists now doubt it.' },
  { id: 'giants', kind: 'threat', t: [0.05, 0.01], icon: '🦣', name: 'Losing the big game', where: 'Every continent people reached',
    text: 'Mammoths, giant sloths and many other big animals died out after people reached their lands. They had been food; with them gone, people had to find food elsewhere.',
    debate: 'How much was hunting and how much a changing climate is argued over. A study of every continent found people mattered most.' },
  { id: 'cold', kind: 'threat', t: [0.029, 0.021], icon: '🥶', name: 'The coldest part of the Ice Age', where: 'The northern lands',
    text: 'Between about 29,000 and 21,000 years ago the ice sheets were at their biggest, covering much of North America and northern Europe, and the seas were at their lowest.' },
  { id: 'rising', kind: 'threat', t: [0.0165, 0.007], icon: '🌊', name: 'The sea comes in', where: 'Doggerland, now under the North Sea',
    text: 'As the ice melted the sea rose by more than 100 m and swallowed coasts where people lived. Doggerland, the land joining Britain to Europe, shrank to islands; about 8,200 years ago a great wave from an undersea landslide off Norway swept over what was left.' },
  { id: 'crowds', kind: 'threat', t: [0.009, 0], icon: '🦠', name: 'Living close together', where: 'Skeletons from early farming villages',
    text: 'Farming fed more people, but skeletons from early farming villages show more tooth decay, more signs of poor food in childhood and more infections than those of hunters and gatherers. Crowded villages let sickness spread.' },
  { id: 'salt', kind: 'threat', y: [-2400, -1700], icon: '🧂', name: 'Salty fields', where: 'Southern Mesopotamia (Iraq)',
    text: 'Watering fields in a hot, dry land leaves salt behind. In southern Mesopotamia farmers switched from wheat to barley, which minds salt less, and still the harvests fell.' },
  { id: 'drought', kind: 'threat', y: [-2200, -1900], icon: '☀️', name: 'The great drought', where: 'Tell Leilan, Syria',
    text: 'About 2200 BCE the rains failed across northern Mesopotamia for some three hundred years. Tell Leilan, a large city, was left empty, and the Akkadian empire fell apart.',
    debate: 'How much the drought, rather than war and politics, brought the empire down is argued over.' },
  { id: 'plague', kind: 'threat', y: [1346, 1353], icon: '⚰️', name: 'The Black Death', where: 'East Smithfield burial ground, London',
    text: 'In the years after 1346 a plague killed between a third and a half of the people of Europe. DNA from the teeth of victims buried in London shows the germ was Yersinia pestis.' },
];
if (typeof module !== 'undefined') module.exports = { SURVIVAL };
