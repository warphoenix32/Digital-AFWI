# AFWI RC1 Phase 4 Implementation Report

## Build basis
- Source: AFWI v3.40.0 Phase 3 architecture build
- Authoritative design references: AFWI rulebook, player guide, overview, card/token workbooks
- Distribution doctrine: AFWI-only zero-dependency, offline browser package

## Implemented
- Five authoritative posture options per side.
- Posture selection at each ATO; non-Standard postures cannot repeat consecutively.
- Initiative ties reroll; initiative winner chooses first player.
- Squadron activation is a turn-ending alternative to MAS actions.
- US Contingency Location with austerity generation; ACE bypasses the generation roll.
- UAS may deploy to any range band.
- AEW and bombers may deploy to first band or Standoff.
- Naval units track finite salvos for offense and missile defense.
- Static ADA does not go Winchester.
- Destroying a Squadron Card destroys associated grounded tokens and makes airborne tokens Rogue.
- Exploding rolls retain separate damage values.
- Approved source-package imagery added for board, logos, and current digital unit types.

## Packaging
The package is fully local. Extract the complete folder and open AFWI.html. Image files must remain in their relative assets directories. No external network calls, libraries, CDN resources, installer, or administrative access are used.

## Known limitations
- Hot-seat only; network mode remains roadmap-only and was not modified.
- No AI or computer-opponent functionality was introduced.
- The current digital card library remains smaller than the authoritative physical card registry.
- Full human four-ATO acceptance testing on the target DoD browser configuration remains required.
- Contingency/deployment choices use native browser dialogs for compatibility and should receive usability review during acceptance testing.
