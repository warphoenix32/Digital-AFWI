# AFWI Phase Two Executive UI Report

## Release

- Build: `1.1.0-phase2-executive`
- Branch: `phase2-ui`
- Preserved baseline: annotated tag `phase1-final-1.0.1`

## Delivered

- Replaced the presentation layer with the approved Executive / Command Glass design.
- Preserved all Phase One gameplay mechanics and the fixed 72 x 66 token footprint.
- Restored a prominent Move-Acquire-Shoot indicator with live available/spent states.
- Kept the US and PRC play areas equal in total width, height, and image opacity.
- Kept the US airbase centered between US standoff and the right-side contingency location.
- Added lightly transparent, supplied photographic backgrounds to airbases, standoff locations, and the US contingency location.
- Added supplied background art to associated Squadron and Enabler cards while retaining the full title, equipment, and descriptive text.
- Added equipment-type labels to every visible token.
- Derived exact aircraft/ship cutouts from supplied token cards without modifying source files.
- Replaced the incorrect F-15 image previously used by the F-16 with an exact F-16 plan-view asset.
- Removed misleading substitute art for equipment without an exact supplied icon; the correct type label remains visible.

## Validation

- Gameplay browser playtests: 23 / 23 passed.
- Phase Two browser visual checks: 18 / 18 passed.
- Verified equal play-area dimensions and transparency, location order, image loading, card descriptions, token type labels, F-16 identity, M-A-S state changes, and viewport overflow.
- Browser screenshots are stored in `artifacts/screenshots/` at 1680 x 1050.

## Source-image preservation

The Phase Two scripts create new derived assets under `assets/ui/`. They do not overwrite the supplied token images or imagery embedded in the AFWI presentation and documents.
