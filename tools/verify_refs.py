#!/usr/bin/env python3
"""Check every reference against Crossref (the DOI registry) before it can
appear on the site.

Reads tools/source/refs_wanted.txt, searches Crossref for each paper, and
accepts it only if the title, year (±1) and first author's surname all match
a registered record. Accepted papers are written, with their DOI and the
official title and journal, to tools/source/refs.json. Anything that does
not match is printed and left off the site — never guessed.

Usage: python3 -I tools/verify_refs.py [--only key1,key2]
       python3 -I tools/verify_refs.py --audit     # re-fetch every stored DOI; fail if any is a preprint or abstract
"""
import sys, json, time, re, unicodedata, difflib, urllib.request, urllib.parse, urllib.error, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC, OUT = os.path.join(HERE, 'source', 'refs_wanted.txt'), os.path.join(HERE, 'source', 'refs.json')
UA = 'dino-explorer-reference-check/1.0'

PEER = {'journal-article', 'book-chapter', 'book', 'monograph', 'reference-entry'}   # what counts as published

def norm(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()

SMALL = {'a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'von'}
def clean_title(t):
    """Registry titles as people should read them: markup out (leaving a space where an italic
    name was glued to its neighbours), whitespace collapsed, old article numbers and shouting removed."""
    t = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', t or '')).strip()
    t = re.sub(r'\s+([,.;:?!])', r'\1', t)
    t = re.sub(r'^[IVXLCDM]+\.\s+', '', t)
    if t.isupper():
        w = t.lower().split(' ')
        t = ' '.join(x if (i and x in SMALL) else x[:1].upper() + x[1:] for i, x in enumerate(w))
    return t

def year_of(it):
    for k in ('published-print', 'published-online', 'issued', 'published'):
        p = it.get(k, {}).get('date-parts')
        if p and p[0] and p[0][0]:
            return p[0][0]
    return None

def by_doi(doi):
    url = 'https://api.crossref.org/works/' + urllib.parse.quote(doi)
    for attempt in range(5):
        try:
            return [json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30))['message']]
        except urllib.error.HTTPError as e:
            if e.code == 404: return []
            time.sleep(5 + attempt * 10)
        except Exception:
            time.sleep(5 + attempt * 10)
    return []

def search(q, rows=8, year=None):
    params = {'query.bibliographic': q, 'rows': rows, 'select': 'DOI,title,container-title,publisher,issued,published-print,published-online,author,type'}
    if year: params['filter'] = f'from-pub-date:{year - 1},until-pub-date:{year + 1}'
    url = 'https://api.crossref.org/works?' + urllib.parse.urlencode(params)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            return json.load(urllib.request.urlopen(req, timeout=30))['message']['items']
        except Exception as e:
            time.sleep(5 + attempt * 10)
    return []

wanted = []
for line in open(SRC, encoding='utf8'):
    if not line.strip() or line.startswith('#'):
        continue
    parts = [x.strip() for x in line.split('|')]
    key, au, yr, title, targets = parts[:5]
    if any(x['key'] == key for x in wanted): sys.exit(f'duplicate key in refs_wanted.txt: {key} — merge the targets onto one line')
    wanted.append({'key': key, 'author': au, 'year': int(yr), 'title': title, 'doi': parts[5] if len(parts) > 5 else '', 'targets': [t.strip() for t in targets.split(',') if t.strip()], 'first': parts[6] if len(parts) > 6 else ''})
if '--audit' in sys.argv:
    done = json.load(open(OUT, encoding='utf8')); bad = 0
    for k, r in done.items():
        got = by_doi(r['doi']); ty = got[0].get('type') if got else 'NOT FOUND'
        r['type'] = ty
        if got: r['title'] = clean_title((got[0].get('title') or [''])[0]) or r['title']
        if ty not in PEER: bad += 1; print(f'  NOT PUBLISHED {k}: {ty} {r["doi"]}')
        time.sleep(0.35)
    json.dump(done, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
    print(f'{len(done)} checked, {bad} are not published papers', file=sys.stderr); sys.exit(1 if bad else 0)
only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
done = json.load(open(OUT, encoding='utf8')) if os.path.exists(OUT) else {}
ok = fail = 0
for w in wanted:
    if only and w['key'] not in only:
        continue
    if not only and w['key'] in done and done[w['key']].get('title_expected') == w['title']:
        done[w['key']]['targets'] = w['targets']; done[w['key']]['first'] = w['first']; ok += 1; continue
    best, why = None, 'no results'
    # first a plain search; if that misses, the title alone within the right years
    cands = by_doi(w['doi']) if w['doi'] else search(f"{w['author']} {w['year']} {w['title']}") + search(w['title'], 15, w['year'])
    for it in cands:
        t = (it.get('title') or [''])[0]
        t = re.sub(r'^[IVXLCDM]+\.\s+', '', t)   # old journals number their articles: "VIII. Notice on the Iguanodon…"
        sim = difflib.SequenceMatcher(None, norm(t), norm(w['title'])).ratio()
        nt, nw = norm(t), norm(w['title'])
        if len(nt) >= 25 and (nw.startswith(nt) or nt.startswith(nw)): sim = max(sim, 0.9)   # registry titles are sometimes cut at a colon
        y = year_of(it)
        fam = [norm(a.get('family', '')) for a in it.get('author', [])]
        au_ok = bool(fam) and (norm(w['author']).split()[-1] in ' '.join(fam[:2]) or (fam[0] and fam[0] in norm(w['author'])))
        if it.get('type') not in PEER:      # a preprint or a conference abstract can carry the same title as the paper
            if not best: why = f'only a {it.get("type")} matched: {it.get("DOI")}'
            continue
        if sim >= 0.85 and y and abs(y - w['year']) <= 1 and au_ok:
            if not best or sim > best[0]:
                best = (sim, it)
        elif not best:
            why = f'closest: "{t[:90]}" ({y}, {", ".join(fam[:2])}) sim={sim:.2f}'
    if best:
        it = best[1]; ok += 1
        # (a book has no journal, so its publisher is shown in that place)
        auth = [a.get('family', '') for a in it.get('author', []) if a.get('family')]
        done[w['key']] = {'doi': it['DOI'].lower(), 'title': clean_title((it.get('title') or [''])[0]),
                          'journal': (it.get('container-title') or [''])[0] or it.get('publisher', ''), 'year': year_of(it),
                          'authors': auth[:3] + (['et al.'] if len(auth) > 3 else []), 'type': it.get('type'), 'targets': w['targets'], 'first': w['first'], 'title_expected': w['title']}
        print(f"  ok   {w['key']}: {it['DOI']}")
    else:
        fail += 1
        done.pop(w['key'], None)
        print(f"  MISS {w['key']} — {why}")
    time.sleep(1.0)
json.dump(done, open(OUT, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
print(f'{ok} verified, {fail} not verified', file=sys.stderr)
