// ============================================================
// STORIES — the Earth being made, played out on the map
// ============================================================
// Each story runs the timeline through a stretch of time while a scene draws over the map, with
// captions. Like the extinction scenes, a story illustrates the order of events its card describes;
// shapes on it (ice edges, old lakes) are labelled sketches. Sources: refs_wanted.txt target s:<id>.
//   ka      [k (0..1 through the story), thousand years ago] — how the clock runs through the story
//   view    [lat, lon, zoom] to look at
//   margin  the southern edge of the ice sheet as a rough sketch: { lons, edges: [[ka, lats per lon]] },
//           after the dated ice-margin maps of Dalton et al. (2020)
const STORIES = [
  { id: 'greatlakes', icon: '🧊', title: 'How the Great Lakes were made', short: 'The Great Lakes',
    blurb: 'An ice sheet three kilometres thick scrapes out five basins — then melts, and fills them.',
    ka: [[0, 26], [0.12, 22], [0.3, 18], [0.45, 14.5], [0.55, 12.5], [0.66, 11], [0.78, 8.2], [0.9, 5], [1, 4]],
    view: [49, -87, 3.4],
    steps: [[0, '26,000 years ago. Ice up to 3 km thick covers Canada and the northern United States.'],
      [0.12, 'The ice is moving. Rocks frozen into its base scrape like sandpaper, deepening old river valleys and soft rock into huge basins.'],
      [0.3, 'About 18,000 years ago the climate warms, and the ice edge starts to melt back north.'],
      [0.45, 'Meltwater pools in the scooped-out basins in front of the ice — lakes bigger than today’s, spilling south down the Mississippi.'],
      [0.55, 'About 12,500 years ago water starts pouring over a ridge of hard rock: Niagara Falls begins. It has cut a gorge 11 km long since.'],
      [0.66, 'To the north-west, Lake Agassiz grows along the ice edge — at its largest, bigger than all of today’s Great Lakes together.'],
      [0.78, 'About 8,200 years ago the ice holding it back gives way, and Lake Agassiz drains into Hudson Bay very quickly. The North Atlantic cools for a century or two.'],
      [0.9, 'The Great Lakes settle into roughly today’s shape. Freed of the ice’s weight, the land is still rising — around Hudson Bay by about a centimetre a year.']],
    know: 'Scratches cut into bedrock by stones in the ice show which way it flowed. Old beaches stand high and dry above today’s shores, and wood and shells buried in lake mud and moraines give the dates. The ice sheet’s retreat has been mapped from thousands of such dates.',
    debate: 'How much of each basin the ice carved itself, and how much it simply deepened older river valleys. And exactly how fast Lake Agassiz drained, and how much the flood changed the climate.',
    margin: { lons: [-150, -125, -110, -100, -95, -90, -87, -84, -80, -75, -70, -65, -55],
      edges: [[26, [69, 48, 47, 45, 42.5, 39.5, 38.8, 39.2, 40.5, 41, 41.2, 42, 44]],
        [18, [69, 49, 48, 46, 43.5, 41, 40.5, 40.5, 41.3, 41.8, 42.5, 43.5, 45.5]],
        [16, [70, 50, 49, 47.5, 45, 42.8, 42, 41.8, 42.5, 43.2, 44, 45, 47]],
        [14, [70, 52, 50, 49.5, 47.5, 45.3, 44, 44, 44.5, 45, 46, 46.5, 48]],
        [13, [71, 55, 53, 50.5, 49, 47, 46, 46, 46, 46.3, 47, 47.5, 49]],
        [11.5, [72, 58, 55, 52, 50.5, 49, 48.6, 48.3, 47.8, 47.5, 48, 48.5, 50]],
        [10, [73, 61, 57, 54, 52, 50.5, 50, 49.5, 49, 48.8, 49.5, 50, 52]],
        [8.5, [74, 64, 60, 58, 56, 54, 53.5, 53, 52.5, 52.5, 53, 54, 56]],
        [7.5, [78, 70, 66, 64, 62, 61, 60.5, 60.5, 60, 59.5, 59, 58, 60]],
        [6, [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80]]] },
    hudson: [[51, -95], [56, -95.5], [60, -95], [64, -90], [64.5, -82], [63, -76.5], [60, -77], [56, -76.5], [51.5, -78.5], [51, -82]],
    agassiz: { from: 13.4, to: 8.2, poly: [[55.2, -101.5], [55.8, -95], [54.5, -90], [52.5, -86.5], [49.6, -88.5], [47.2, -96.5], [48.6, -99.8], [51.5, -101]] },
    niagara: [43.08, -79.07],
  },
];
if (typeof module !== 'undefined') module.exports = { STORIES };
