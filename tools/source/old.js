// loads the data blocks out of the ORIGINAL page (as committed) for migration
const fs = require('fs');
const h = fs.readFileSync(__dirname + '/original.html', 'utf8');
const s = h.indexOf('const SLIDER_BP'), e = h.indexOf('const SVG_MAPS');
module.exports = new Function(h.slice(s, e) + '\nreturn {PERIODS,GEO_FEATURES,CREATURE_RANGES};')();
