# Art direction: how Before Us is drawn

Written 25 Nov 2026. Evan: “Why can't the environment be more richly drawn — use artist references and inspirations.”
This is the reference for every living scene (`app/`), painting (`tools/paint.py`) and future illustration. Read it with
`CLAUDE.md` (sources, uncertainty) and `docs/REBUILD.md` › Living scenes (seen from the sky only).

## The one rule

**Rich, but bound by evidence.** Richness comes from texture, light, weather and the small true things a place is made
of — never from inventing what the papers do not hold. Every element in a scene is either in the site’s brief (`paint`
in `data_sites.js`, a paraphrase of its papers), a general fact of the world (water ripples, sand dries paler, clouds
cast shadows), or named on screen as a guess.

## Knight's manner, today's science (Evan, 25 Nov)

Evan: “Charles Knight style but today's interpretations.” So the house manner for painted surfaces is **Charles R.
Knight's** — oil on canvas, confident brushwork, warm golden naturalistic light, soft haze, ochres, siennas, olive greens
and dusty blues, calm dignified realism — and the **content is today's science**: the land, water, plants and climate
from the site's papers, never the science of Knight's day. Knight died in 1953, so his name may go in a prompt
(`KNIGHT` in `tools/paint.py`; `ground --style knight`); a living artist's never.

- **The ground** of the Kem Kem is painted this way (Gemini 3 Pro Image, from the scene's own guide map; of two
  candidates one slipped into perspective with cliffs the brief rules out and was refused).
- **The Earth opening** may not be repainted by the image model: asked to keep every coast, it drew the continents of
  97 million years ago closer to today's (only 76–89 % of land and sea agreed with the map; all four refused by
  `choose-earth`). So `earth-brush` builds it instead: **shapes and colours from this atlas's own map**, softened by an
  oil-paint brush filter, with **only the brushwork** (light and shade) of the Knight-manner repaint, and only where that
  repaint agrees with the map about land and sea. Every coast and shallow sea is exactly as mapped; the page says how.
- **Animals, painted (Evan, 25 Nov: “proceed … a few dinosaurs and the scene in a few different approaches”).** Three
  dinosaurs with their own outlines — Spinosaurus, Carcharodontosaurus, Deltadromeus — each with a `look` brief in
  `data_sites.js` (today’s reconstruction, colours “not known”). Two approaches, both kept so they can be compared on
  screen (the scene’s “Outlines / Painted in outline / Painted freely” switch):
  - **in outline** (`animal --approach outline`): the scientists’ own silhouette is the shape guide; the painting is cut
    to that exact outline and refused below 80 % overlap (got 94, 93, 89 %). The shape is the scientists’.
  - **freely** (`--approach free`): from the brief alone; livelier, but the shape is the model’s guess (its Spinosaurus
    went down on all fours and grew a fish-like tail fin, both still argued over). The card says so.
  From the sky the painted animals are pale against the sand; the dark outlines read better at a distance.
- **The scene as one painting** (`scene`, from the 3D overview, `app/scripts/scene-guide.cjs`): of two, one turned the
  far bank into cliffs and moved and enlarged the animals (refused); the kept one follows the composition but drew the
  far-bank dinosaurs about twice too big and gave the pterosaurs Pteranodon crests. `choose-scene` will not keep a
  painting without `--differs`, and the page shows that account beside it (“Painting” button).

- **The painting is the main view** of a site (Evan, 25 Nov). So it must be as right as a painting can be: the kept
  Kem Kem painting was sent back once with plain corrections (`scene-fix`: far-bank dinosaurs half the size, no
  Pteranodon crests, Spinosaurus at the water's edge); of two corrected versions, one blew the pterosaurs up to giants and
  was refused. What still differs is listed on screen. Its 13 spots are placed by eye on a percentage grid.

## Who we learn from

We study these artists and traditions, credit them, and never copy a work. **We never name a living artist in an
image-model prompt** (no imitating someone’s style). Public-domain works may be shown, or used as reference pictures,
only with Evan’s go-ahead (they have to be downloaded).

| Who | When | What we take | How it shows up |
|---|---|---|---|
| Museum habitat dioramas — e.g. James Perry Wilson’s painted backgrounds at the American Museum of Natural History | 1930s–50s | A real 3D foreground blended into a painted world; the place is the subject | The scene is built this way: modelled land, water, plants and cut-outs, over painted ground and sky |
| Charles R. Knight | 1890s–1950s | Animals as living creatures in their landscape; natural, unheroic light | The calm documentary tone of every prompt; already in Finds › “What this atlas borrows”. Works published before 1929 are public domain in the US |
| Rudolph Zallinger, *The Age of Reptiles* (Yale Peabody Museum) | 1947 | One continuous landscape through time; plants drawn with a botanist’s care | One landscape per period (planned); plants only those the evidence names, each kind recognisable |
| Zdeněk Burian | 1930s–80s | Atmosphere: haze, distance, weather, muted earth colours | The hazy afternoon light, the fog of distance, cloud shadows |
| Douglas Henderson | 1980s–2010s | Landscape first: light and land, animals small within a big place | Seen from the sky, the place dominates; animals are to scale, not enlarged |
| Hand-painted relief maps and paleogeographic maps (e.g. Ron Blakey) | 20th–21st c. | A map that reads as a painting of the land | The Earth opening; the painted ground |
| Isometric NYC (Andy Coenen) and city-builder games (the “SimCity view” Evan named) | 2026 | Real data restyled by an image model; a living miniature seen from above | The ground is painted by the model **from our own guide map**; the tilt-shift “model in a museum case” finish |

Living palaeoartists whose work informs what we know looks right — credit as inspiration only, never imitated:
Mark Witton (pterosaurs and their ecology), Davide Bonadonna (Spinosaurus), Julius Csotonyi, Gabriel Ugueto.

## How a scene is drawn

1. **The Earth first.** The scene opens on this atlas’s own globe at the site’s time (plates, seas, relief from the
   papers in “How this map is made”), zooming to the site (`app/scripts/capture-earth.cjs`).
2. **The land’s shape** comes from the brief (`app/src/scene/land.ts`): illustrative curves, said so on screen.
3. **The ground is painted.** `#/guide/<site>` draws the land as a flat map; `tools/paint.py ground` asks the image model
   to repaint it as a natural-history illustration seen from straight above (gouache and watercolour, the 20th-century
   relief-map and diorama tradition, ripple marks, pebbles, damp edges, silt swirls; no trees, animals or text);
   `choose-ground` cuts the chosen painting into four swatches (bank top, sandstone face, river bed, near shore) that
   the scene tiles over its own zones — the land’s shape stays exactly the scene’s. Every candidate is looked at by eye.
4. **Small true things:** ripple marks on the low sand, gravel bars (the rock is sandstone and pebble beds), drift logs
   (the plants are known from petrified wood, i.e. trunks the rivers carried), damp sand at the water’s edge, light
   patterns on the shallow bed close up.
5. **Weather and light:** the brief’s light (here: a hot, hazy dry-season afternoon), thin high cloud whose shadows drift
   across land and water, haze with distance.
6. **Movement that claims nothing:** water flowing the way the rocks show, plants in the wind, cloud shadows; animals
   still, gliding or drifting only.
7. **The finish:** a warm film grade, a soft glow only where the sun catches the water, a vignette, and a gentle
   tilt-shift so the place reads like a model in a museum case.

## Palette (the Kem Kem; each scene takes its own from its brief)

Pale sand `#e8d9b5` · damp sand `#a68d63` · reddish sandstone `#b0603c` · brownish-green water `#8b8a5e` → `#4f5a3d` ·
monkey-puzzle foliage `#33472b` · haze `#e6d8b8` · silhouettes `#3a2410` (land), `#1c3a3c` (seen through water).

## Still to do

- Add the inspirations above to Finds › “What this atlas borrows” with sources (`i:<id>` targets, verified).
- Public-domain Knight paintings (pre-1929) as reference pictures for the painter: not needed so far (his manner is named in the prompt); ask Evan before downloading any.
- More of the brief’s plants as recognisable 3D kinds (ferns with fronds, leafy shrubs), and the pond at Oum Tkout.
