# AFWI Phase Two Executive UI Report

## Release

- Build: `1.3.0-combat-roster`
- Branch: `phase2-ui`
- Preserved baselines: annotated tags `phase1-final-1.0.1` and `phase2-executive-1.1.0`

## Delivered

- Replaced the presentation layer with the approved Executive / Command Glass design.
- Preserved the Phase One MAS/combat mechanics and fixed 72 x 66 token footprint while applying the approved match-rule corrections.
- Restored a prominent Move-Acquire-Shoot indicator with live available/spent states.
- Kept the US and PRC play areas equal in total width, height, and image opacity.
- Kept the US airbase centered between US standoff and the right-side contingency location.
- Added lightly transparent, container-safe generated backgrounds to airbases, standoff locations, and the US contingency location.
- Added supplied background art to associated Squadron and Enabler cards while retaining the full title, equipment, and descriptive text.
- Added equipment-type labels to every visible token.
- Derived exact aircraft/ship cutouts from supplied token cards without modifying source files.
- Replaced the incorrect F-15 image previously used by the F-16 with an exact F-16 plan-view asset.
- Removed misleading substitute art for equipment without an exact supplied icon; the correct type label remains visible.
- Replaced the landing, theater, airbase, contingency, and standoff plates with new container-safe imagery while preserving every prior image asset.
- Removed the former Campaign selector and special rule branches. The Standard Match is a free draft from the full pool over five ATO cycles.
- Enforced initiative winner acts first without a turn-order prompt.
- Added operational standoff deployment and movement for eligible bomber and AEW forces.
- Centered and wrapped deployed forces in location containers.
- Added vertical overflow scrolling to every airbase, contingency, and standoff container.
- Moved and condensed the selected-token HUD into the board-width column to provide taller command sidebars.
- Rethemed setup screens to match the command-glass game board and strengthened button hover/focus visibility.
- Made every legal authoritative card explicitly selectable in the draft UI, added individual roster-card returns, and clearly marked quota-blocked cards instead of silently rejecting clicks.
- Enforced Air-to-Air and Air-to-Surface target domains across aircraft, SAM, carrier-aircraft, airbase, Squadron-card, and naval-surface targets.
- Added persistent three-hit hull durability to naval surface combatants while preserving published instant-destroy Enabler overrides.
- Strengthened Winchester presentation on tokens, the command status line, and the selected-unit HUD; enlarged and simplified HUD typography.

## Validation

- Gameplay browser playtests: 28 / 28 passed.
- Phase Two browser visual checks: 22 / 22 passed, including saturated-container scrolling across all five operating locations.
- Enabler-focused browser groups: 4 / 4 passed; all 68 authoritative Enabler cards were exercised with additional generated-force, reaction, cyber, intel, and Counter-UAS assertions.
- Verified equal play-area dimensions and transparency, location order, image loading, card descriptions, token type labels, F-16 identity, M-A-S state changes, and viewport overflow.
- Browser screenshots are stored in `artifacts/screenshots/` at 1680 x 1050.

## Source-image preservation

The Phase Two scripts create new derived assets under `assets/ui/`. They do not overwrite the supplied token images or imagery embedded in the AFWI presentation and documents. The visual-regression harness now uses a temporary output directory unless `AFWI_SCREENSHOT_OUTPUT` is explicitly set, preserving committed screenshots during routine validation.
