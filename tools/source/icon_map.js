// Emoji → drawn icons. The page swaps every emoji it can find here for a line icon (Lucide, ISC licence; four drawn
// for this atlas in the same style: volcano, meteor, mushroom, rock) or, for animals, for the silhouette of a real
// animal from the cards (EMOJI_SIL, so a fish chip shows a fish that lived). An emoji not listed here stays as it is:
// extend the table, rebuild (node tools/build_icons.mjs <lucide-static>/icon-nodes.json), and it changes everywhere.
// Beliefs and peoples are left alone on purpose until each symbol can be chosen with the same care as the text.
const EMOJI_ICON = {
  // the page itself
  '🌍': 'earth', '🌎': 'earth', '🌏': 'earth', '🌐': 'globe', '🗺': 'map', '🗺️': 'map', '📍': 'map-pin', '🧭': 'compass',
  '▶': 'play', '▶️': 'play', '🔈': 'volume-2', '🔊': 'volume-2', '🎨': 'palette', '🔎': 'search', '🔍': 'search',
  '📚': 'book-open', '📜': 'scroll', '❓': 'circle-question-mark', '❔': 'circle-question-mark', '🧬': 'dna', '🔬': 'microscope',
  '👩‍🔬': 'microscope', '🧑‍🔬': 'microscope', '🏠': 'house', '📏': 'ruler', '🕰': 'hourglass', '🕰️': 'hourglass', '⏳': 'hourglass',
  '✒️': 'pen-line', '🎲': 'dices', '📊': 'chart-gantt', '🤪': 'sparkles', '✨': 'sparkles', '💡': 'lightbulb',
  '🎯': 'target', '⛏️': 'pickaxe', '⛏': 'pickaxe', '⚠️': 'triangle-exclamation-point', '🎬': 'clapperboard', '🧩': 'puzzle',
  '🛡️': 'shield', '🛡': 'shield', '✕': 'x', '⟲': 'rotate-ccw', '🏞': 'mountain-snow', '🏞️': 'mountain-snow',
  // the human story (the people themselves are lettered roundels, not icons)
  '🧍': 'person-standing', '🚶': 'footprints', '👣': 'footprints', '🦴': 'bone', '☠️': 'skull', '💀': 'skull',
  '🏛️': 'landmark', '🏛': 'landmark', '🏺': 'amphora', '🧱': 'brick-wall', '⛵': 'sailboat', '🌉': 'bridge',
  '🍖': 'beef', '🥩': 'beef', '🌾': 'wheat', '🔥': 'flame',
  // the Earth
  '🌋': 'volcano', '☄️': 'meteor', '☄': 'meteor', '💥': 'meteor', '🪨': 'rock', '⛰': 'mountain', '⛰️': 'mountain',
  '🌊': 'waves-horizontal', '🌡': 'thermometer', '🌡️': 'thermometer', '💨': 'wind', '🧊': 'snowflake', '❄️': 'snowflake',
  '☀️': 'sun', '🌞': 'sun', '💧': 'droplet', '⚡': 'zap', '🫧': 'bubbles', '🌧': 'cloud-rain', '🌧️': 'cloud-rain',
  // living things that are not animals, and small animals Lucide draws well
  '🌿': 'leaf', '🌱': 'sprout', '🌳': 'trees', '🌲': 'tree-pine', '🌴': 'tree-palm', '🌸': 'flower-2', '🍄': 'mushroom',
  '🦠': 'microscope', '🐚': 'shell', '🦐': 'shrimp', '🐌': 'snail', '🐛': 'worm', '🪲': 'bug', '🐜': 'bug',
  '🐾': 'paw-print', '🐦': 'bird', '🪶': 'feather', '🐀': 'rat', '🐁': 'rat', '🐹': 'rat', '🐿': 'squirrel', '🐿️': 'squirrel',
};
// animal emoji → the card whose silhouette stands for it (only cards with the animal's own outline)
const EMOJI_SIL = {
  '🦕': 'Diplodocus', '🦖': 'Tyrannosaurus rex', '🐟': 'Coelacanth', '🦈': 'Great White Shark', '🐋': 'Blue Whale',
  '🐬': 'Baiji (Yangtze River Dolphin)', '🦎': 'Komodo Dragon', '🐊': 'Saltwater Crocodile', '🐢': 'Archelon',
  '🐍': 'Titanoboa', '🐘': 'African Elephant', '🦣': 'Woolly Mammoth', '🦏': 'Woolly Rhinoceros', '🦛': 'Malagasy Hippo',
  '🦁': 'Cave Lion', '🐆': 'Saber-toothed Cat (Smilodon)', '🐅': 'Saber-toothed Cat (Smilodon)', '🐺': 'Dire Wolf (Aenocyon dirus)', '🐻': 'Cave Bear',
  '🦌': 'Megaloceros (Irish Elk)', '🐪': 'Aepycamelus', '🦒': 'Samotherium', '🐴': 'Merychippus', '🐎': 'Merychippus',
  '🐂': 'Aurochs', '🐗': 'Daeodon', '🐖': 'Daeodon', '🦥': 'Shasta Ground Sloth', '🦍': 'Gigantopithecus',
  '🐒': 'Aegyptopithecus', '🦫': 'Castorocauda', '🦭': 'Caribbean Monk Seal', '🦇': 'Onychonycteris',
  '🐧': 'Kumimanu', '🦤': 'Dodo (Raphus cucullatus)', '🦅': 'Argentavis', '🦆': 'Vegavis', '🦂': 'Mixopterus (Sea Scorpion)',
  '🐸': 'Paracyclotosaurus', '🦑': 'Endoceras',
};
if (typeof module !== 'undefined') module.exports = { EMOJI_ICON, EMOJI_SIL };
