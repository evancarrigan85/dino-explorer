# Audit: do the papers really inform what the atlas shows? (26 Nov 2026)

Evan: “From app code and from an informed ancient-history and deep-time expert: do the base papers and facts really
inform and properly link to the essence and presentation?” The answer, in short: **the papers are real and the right
ones, but they reach only part of what the atlas says, and the oldest card text had drifted from them.**

## What holds

- **Every paper is real and published.** `verify_refs.py --audit` re-fetched all 597 from Crossref: none is a preprint,
  none a broken DOI. (602 after today’s additions.)
- **Every paper is attached to the right thing.** All 261 links from papers to animal cards were checked: 196 papers name
  the animal, its group or its site in their titles; the other 65 were read one by one and all are right (famous papers
  whose titles do not name the animal — “A nesting dinosaur” is *Citipati*; the *Basilosaurus* stomach paper is about
  *Dorudon*).
- **The newer layers are fully sourced:** the human family (24/24), mass extinctions (7/7), Earth stories (7/7), helps
  and threats (21/21), every timeline event that carries an id (61/61), and the Kem Kem reconstruction brief (every
  documented and inferred decision).
- **The ancient-history text reads well:** beliefs in their followers’ own terms; dates and numbers of the great works
  match the standard accounts.

## What did not hold

1. **Coverage.** Only 239 of 721 animal cards (33%) cite a paper; the Ordovician–Carboniferous least (about 1 in 6).
   Also thin: timeline events without an id (100 of 161 unsourced), trade routes (3/11), great works (6/26), beliefs
   (10/17), drowned lands (8/14), ways of life (22/33). The page’s coverage count says so, but it is far from the
   museum standard.
2. **The oldest card text (the one-line `fact`) had drifted from the evidence** — written early, playful, unsourced.
   An expert read of the 20 most-opened cards found errors in about 15, some contradicting the card’s own paper:
   Brachiosaurus at 80 tonnes (its cited paper, Taylor 2009, estimates far less); Dunkleosteus “8–9 m” against its own
   2023 restudy (3.5–4 m) and “a bite stronger than T. rex” (it was not); Diplodocus carnegii given the 33 m of a bigger
   species; Velociraptor hunting in groups and disembowelling prey; Parasaurolophus migrating like caribou; Pteranodon’s
   crest as a rudder; “herding bone beds” for Triceratops; Sue’s “bite marks” stated as proof of fights; Archaeopteryx’s
   species stated as settled; mammoth “liquid blood”.
3. **Anachronisms:** eight habitats put animals in grassland, savanna or steppe before grasslands existed (a Permian
   *Moschops* in “dry grasslands”, a Jurassic *Stegosaurus* in “semi-arid grasslands”, a Triassic *Ingentia* on
   “savanna-like plains”).
4. **Papers attach to cards, not to sentences.** A card lists its papers at the bottom; a reader cannot see which claim
   each supports. The reconstruction briefs fix this for scenes (a paper per decision); cards do not have it yet.

## Fixed today

The 20 cards and the 8 habitats above, conservatively (removing or softening what the evidence does not support), with
five new verified papers behind the new claims: Wolff et al. 2009 (Sue’s holes as infection), Turner et al. 2007
(Velociraptor quill knobs), Fowler et al. 2011 (prey restraint), Bennett 1992 (Pteranodon crests), Anderson & Westneat
2007 (Dunkleosteus bite); Tschopp et al. 2015 now supports Diplodocus too. The map’s animals that copied the old herd
claims (Triceratops, Parasaurolophus) were corrected with them.

## What it takes to finish

- **The card rewrite, a period per session** (already in `PLAN.md`): every card’s claims read against the literature,
  the `fact` line rewritten in the newer style, a verified paper for each claim that needs one, sizes checked against
  the latest estimates. Start with the thinnest periods.
- **Claim-level sources for cards**, as the briefs do for scenes: each sentence of `know`/`fact` carries its paper key,
  and the card shows which paper supports which sentence.
- **Sources for the remaining timeline events, trade routes and great works.**
- Rerun this audit after each period: `python3 -I tools/verify_refs.py --audit`, the coverage and relevance counts above,
  and the anachronism scan (habitat words that name things that did not yet exist).
