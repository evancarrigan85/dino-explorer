# Working in this repo

This project is a single-file HTML app: `dino-explorer.html`. All markup, styles,
and scripts live in that one file. There is no build step and no package manager.

## Plan before you edit

For anything beyond a typo, a color tweak, or a one-line bug fix:

1. **Ask clarifying questions one at a time** when intent is ambiguous. Don't
   batch five questions into one message, and don't guess.
2. **Write a short plan first** — what you'll change, where, and why. File path
   and approximate line range for each edit. No placeholders ("TBD", "similar to
   above", "TODO later"). If you can't write the plan concretely, you don't
   understand the task yet.
3. **Wait for approval** before editing. One-file color/copy fixes are the
   exception — just do them.
4. **Then execute the plan.** If you discover mid-edit that the plan was wrong,
   stop and revise it rather than improvising.

Keep plans proportional to the task. A two-file change gets a five-line plan,
not a spec document.

## Debugging

When a fix doesn't work, don't pile on more tweaks. After the second failed
attempt, stop and question the assumption — you're probably treating a symptom.
Reproduce, isolate, form one hypothesis, make the smallest change that tests
it, verify.

## Style

- Don't add comments that restate what the code does.
- Don't add features, refactors, or abstractions beyond what was asked.
- Don't leave half-finished work or dead code behind.
- Preserve the existing visual/interaction design unless asked to change it.

## Verifying changes

Open `dino-explorer.html` in a browser and exercise the feature you touched
before reporting done. Type checks and linters don't exist here; the browser is
the only source of truth.
