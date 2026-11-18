#!/usr/bin/env python3
"""Paleomagnetic poles for the benchmark, from Torsvik et al. (2012), Earth-Science Reviews 114, 325–368
(the T2012 compilation, as shipped with the GPlates web service: data/paleo/T2012_VGPs.gpmlz).

Each pole records where the spin axis lay, seen from rocks of one age on one continent. Carried by the
page's own plates to that age, a pole should land near the geographic pole: the misfit is a test of the
plate reconstruction that owes nothing to the coast or elevation maps.

Usage:  python3 -I tools/bench/build_vgp.py <path to T2012_VGPs.gpmlz>   → tools/bench/vgp.json
"""
import sys, os, json, pygplates
out = []
for f in pygplates.FeatureCollection(sys.argv[1]):
    site = f.get_value(pygplates.PropertyName.gpml_average_sample_site_position)
    pole = f.get_value(pygplates.PropertyName.gpml_pole_position)
    age = f.get_value(pygplates.PropertyName.gpml_average_age); a95 = f.get_value(pygplates.PropertyName.gpml_pole_a95)
    if not (site and pole and age): continue
    s = site.get_geometry().to_lat_lon() if hasattr(site, 'get_geometry') else site.get_value().to_lat_lon()
    p = pole.get_geometry().to_lat_lon() if hasattr(pole, 'get_geometry') else pole.get_value().to_lat_lon()
    out.append({'name': f.get_name(), 'age': float(age.get_double()), 'a95': float(a95.get_double()) if a95 else None,
                'site': [round(s[0], 3), round(s[1], 3)], 'pole': [round(p[0], 3), round(p[1], 3)]})
out.sort(key=lambda r: r['age'])
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'vgp.json'), 'w'), separators=(',', ':'))
print(len(out), 'poles,', out[0]['age'], '–', out[-1]['age'], 'Ma')
