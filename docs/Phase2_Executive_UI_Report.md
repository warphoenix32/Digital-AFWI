# AFWI Phase Two Executive UI Report

## Release

- Build: `1.4.0-reference-guide`
- Branch: `phase2-ui`
- Preserved baselines: annotated tags `phase1-final-1.0.1` and `phase2-executive-1.1.0`

## Delivered

- Replaced the presentation layer with the approved Executive / Command Glass design.
- Preserved the Phase One MAS/combat mechanics and fixed 72 x 66 token footprint while applying the approved match-rule corrections.
- Restored a prominent Move-Acquire-Shoot indicator with live available/spent states.
- Kept the US and PRC play areas equal in total width, height, and image opacity.
- Kept the US airbase centered between US standoff and the right-side contingency location.
- Replaced airbase, standoff, and US contingency imagery with one solid command-glass background color that remains visually continuous while populated boxes scroll.
- Added supplied background art to associated Squadron and Enabler cards while retaining the full title, equipment, and descriptive text.
- Added equipment-type labels to every visible token.
- Derived exact aircraft/ship cutouts from supplied token cards without modifying source files.
- Replaced the incorrect F-15 image previously used by the F-16 with an exact F-16 plan-view asset.
- Removed misleading substitute art for equipment without an exact supplied icon; the correct type label remains visible.
- Retained the landing and theater plates while removing image layers from airbase, contingency, and standoff boxes; every prior image asset remains preserved.
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
- Rebuilt the in-game Rules & Mechanics reference so every section reflects the mechanics enforced by the current engine, including the five-ATO sequence, persistent Missions, Posture exceptions, initiative, Intel, fog of war, deployment, domain targeting, hull damage, Winchester, persistent attrition, Enablers, and scoring.
- Rebuilt the Asset Glossary around the complete playable roster: fighters, bombers, attack and reconnaissance UAS, AEW, ADA, carrier aviation, naval surface combatants, electronic-warfare aircraft, Squadron cards, Airbases, operating locations, and Enablers.
- Bound reference build labels, authoritative card counts, Posture tables, and Mission tables to live game data to reduce future documentation drift.
- Added readable command-glass reference dialogs with sticky section navigation, responsive tables, keyboard focus containment, focus restoration, outside-click dismissal, and Escape-to-close behavior.

## Validation

- Gameplay browser playtests: 29 / 29 passed, including complete Rules and Asset Glossary content, live-data hydration, accessibility state, keyboard focus, and dismissal behavior.
- Phase Two browser visual checks: 33 / 33 passed, including desktop and compact reference readability, navigation, scrolling, and saturated-container scrolling across all five operating locations.
- Enabler-focused browser groups: 4 / 4 passed; all 68 authoritative Enabler cards were exercised with additional generated-force, reaction, cyber, intel, and Counter-UAS assertions.
- Verified equal play-area dimensions and transparency, location order, image loading, card descriptions, token type labels, F-16 identity, M-A-S state changes, and viewport overflow.
- Browser screenshots are stored in `artifacts/screenshots/` at 1680 x 1050.

## Source-image preservation

The Phase Two scripts create new derived assets under `assets/ui/`. They do not overwrite the supplied token images or imagery embedded in the AFWI presentation and documents. The visual-regression harness now uses a temporary output directory unless `AFWI_SCREENSHOT_OUTPUT` is explicitly set, preserving committed screenshots during routine validation.
