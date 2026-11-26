# Art direction: how Before Us is drawn

Written 25 Nov 2026. Evan: “Why can't the environment be more richly drawn — use artist references and inspirations.”
This is the reference for every living scene (`app/`), painting (`tools/paint.py`) and future illustration. Read it with
`CLAUDE.md` (sources, uncertainty) and `docs/REBUILD.md` › Living scenes (seen from the sky only).

## Before Us, and its style: Deep-Time History Painting (Evan, 25 Nov)

**The atlas is the reconstruction; the painting is how a reader experiences it.** Paint the ancient world as a place
where something was happening, with the emotional force of a great history painting — then let the reader open the
image like a field notebook and see how we know what they are looking at.

- **Lineage.** Henry De la Beche’s *Duria Antiquior* (1830), drawn from Mary Anning’s finds: the first picture of a whole
  fossil world, a sea full of creatures interacting rather than specimens in a row — borrow the ambition, not the 1830
  anatomy. John Martin’s *The Destruction of Pompeii and Herculaneum* (1822): the landscape is what is happening to
  everyone in the picture; Martin also painted *The Country of the Iguanodon* (1837). From the Renaissance history
  painters: arrange bodies, gestures and light so the eye knows where to land first and what to find next. (All long
  dead: their names may go in a prompt; a living artist’s never.)
- **Borrow their power to direct attention and make a landscape feel consequential; never their certainty about what
  happened.** If the evidence supports a changing coastline but not a flood, find the drama in the coastline. If the
  research leaves two different landscapes plausible, show the reader the other one rather than hiding the choice.
- **Every scene needs a story, but not every story needs a disaster.** A shoreline going quiet, an animal stepping onto
  an exposed mudflat, two shores slowly pulling apart can carry a chapter.
- **Three working labels** for everything in a picture: **documented** (a fossil or rock at this site shows it),
  **inferred** (several lines of evidence support it: the habitat, a body rebuilt from relatives), **imagined** (the
  light, the angle, the instant one animal turns toward another). All three belong in one painting; the atlas never
  quietly promotes the third into the first.
- **Two views of every site.** *The Scene*: the painting alone, nothing competing with it. *The Evidence*: tap anything
  to see what was found, what researchers infer and what the artist supplied, with the sources — and *Where was this?
  What lived here? How do we know?* A fossil or a rock layer can take the reader from the picture to the evidence, and a
  fragment of rock can take them forward into the world it came from.

### The research builds the world before the artist enters it

Every scene starts as a **reconstruction brief** (`content/briefs/<site>.json`), written before any painting is made.
It turns papers, specimens, maps and expert input into decisions the artist can use, in five layers:

| Layer | What it establishes |
|---|---|
| Place and time | where the evidence is found today, where that land was then, the age range, which plate model |
| Landscape and climate | what can be supported about coasts, water, terrain, plants and climate — and what is plausible but not recoverable |
| Life | what is documented at the site, what is inferred from nearby or comparable deposits, what is too uncertain to show — and whether the evidence supports showing them **together**, not just in the same broad interval |
| The moment | what the picture is about: a change in the land, a relationship, ordinary life; if the encounter is invented, it says so |
| History of discovery | who found it, who interpreted it, what later work changed — kept apart from the story set in deep time |

**Sources attach to decisions, not just to the page.** A bibliography says what was read; a decision record says why
the shoreline is there, why that animal is included, why one reconstruction was chosen over another. Each decision has
its words for the reader, its status (documented / inferred / imagined), its reason, its verified papers, the
alternatives, and how it is painted. The build refuses a documented or inferred decision without a Crossref-verified
paper. `node tools/briefs.mjs --ref <paper>` lists every scene and decision that rests on a paper, so when a new paper
moves a deposit’s age or reinterprets a fossil, it shows which scenes need review — and “current as of” on a brief means
its decisions were checked on that date. The painter’s prompt and the art reviewer’s checklist are built from the brief.

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

## Every picture is checked before a reader sees it (Evan, 25 Nov)

Evan: every scene, every animal, every plant and place “goes through and verifies based on the scientific papers and
evidence … which version of the understanding … but then it still has to evoke that emotional response.” The system is
`tools/review_art.py`, with its registry in `tools/paint/art.json`:

1. **Rules, at the moment a picture is chosen** (`tools/paint.py`): what could not yet exist at that time is named in every
   prompt (`era_rules`: no land plants before 470 Ma, no trees before 390, no palms before 100, no grass before 66…, with
   what *did* grow instead, because a bare “no palms” still got palms); nothing written anywhere (`NO_TEXT`: the painter
   signs its murals unless told not to); animals cut to the scientists’ outline (80 % overlap or refused); the Earth’s
   coasts copied from the map, never painted.
2. **The evidence review.** A different model from the painter (Gemini 3.1 Pro) reads each picture against a checklist
   built from the data: what the evidence says *must* be there (the brief, the event’s own words, each animal’s
   reconstruction), what *must not* (era rules, the brief’s “do not paint”), and **which version of the science** it
   follows — e.g. Spinosaurus as Ibrahim et al. 2014 and 2020 (short legs, paddle tail), with the other readings named
   (a wading heron-like hunter, Hone & Holtz 2021; Sereno et al. 2022). Each item comes back shown / consistent /
   contradicted / can’t tell, with a reason, plus any other mistake it sees. A contradicted “must not”, two contradicted
   “musts”, or one with other errors, **fails**. The reviewer is told what each picture is *for* (a plant sheet is cut-outs;
   the Earth’s coasts are checked by machine) so it judges the right things.
3. **The feeling.** The same review scores what the picture should raise in a ten-year-old and the adult beside them —
   wonder, life, light, clarity, story — out of 5, and says how to raise them *without breaking the evidence*. It is shown,
   never used to pass a picture that the evidence fails.
4. **Repair.** A failed picture is painted again with the reviewer’s objections in the prompt (“do NOT repeat these
   mistakes”), each try reviewed the same way, and the best that does not fail is kept, with the reviewer’s plain words on
   where it still differs (`review_art.py repair`). One that still fails stays out.
5. **The curator signs off** (`approve` / `reject`). Until then the page says the picture awaits sign-off.

The app shows only pictures that passed (`app/scripts/export-content.mjs` leaves out the rest and says which), and every
one carries **“How this picture was checked”**: the science it follows, each checklist item with its verdict, what else
was noticed, the feeling scores, and whether the curator has signed it off. The review is itself a model and can be
wrong — the first Earth review called the atlas’s own Cretaceous map “hallucinated” — so it never overrides the data;
it catches what the painter gets wrong (palms in the Permian, two-fingered hands on a carcharodontosaur, the old map’s
pins painted into eyes on the globe), and the curator has the last word.

## Palette (the Kem Kem; each scene takes its own from its brief)

Pale sand `#e8d9b5` · damp sand `#a68d63` · reddish sandstone `#b0603c` · brownish-green water `#8b8a5e` → `#4f5a3d` ·
monkey-puzzle foliage `#33472b` · haze `#e6d8b8` · silhouettes `#3a2410` (land), `#1c3a3c` (seen through water).

## Still to do

- Add the inspirations above to Finds › “What this atlas borrows” with sources (`i:<id>` targets, verified).
- Public-domain Knight paintings (pre-1929) as reference pictures for the painter: not needed so far (his manner is named in the prompt); ask Evan before downloading any.
- More of the brief’s plants as recognisable 3D kinds (ferns with fronds, leafy shrubs), and the pond at Oum Tkout.
