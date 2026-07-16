# AFWI 1.0 Final - Phase One Finalization Report

## Outcome

Phase One gameplay implementation is complete. `AFWI.html` is the final
offline, browser-based, hot-seat build for the gameplay phase. The build
identifies itself as `1.0.0-final-phase1`.

## Rules authority

The implementation was reconciled against the supplied AFWI rulebook, Player
Guide v1.6, overview presentation, authoritative card registry, prior
implementation reports, and the complete baseline code and asset set.

## Completed mechanics

- Added all five published campaigns with correct one-, two-, and five-ATO
  lengths and campaign-specific force, mission, posture, initiative, and
  scoring rules.
- Enforced posture draft limits and exceptions, including Standoff bombers,
  ADA squadrons, PLAAF Enablers, Joint Operations flying-force limits,
  nonconsecutive posture selection, and Meeting Engagement fixed forces.
- Restored published deployment behavior for fighters, UAS, bombers, AEW,
  ADA, naval units, airbases, standoff areas, and the US contingency location.
- Corrected acquisition thresholds, Cyber Advantage, attack capability,
  weapon range, explosive damage, missile-defense Disadvantage, naval salvos,
  static ADA ammunition, UAS Winchester, and natural-4 conservation.
- Corrected mission-category scoring and removed generic token-value scoring
  that double-counted physical-game victory points.
- Implemented World Watches and Reserves campaign scoring and initiative.
- Preserved Squadron HP and aircraft attrition between ATOs while clearing
  transient hands, tokens, generated forces, reactions, and ATO buffs.
- Implemented deterministic effects for the authoritative Enabler set,
  including recovery, reconnaissance, cyber, EW, generated units, base
  strikes, missile defense, counter-UAS, naval attacks, and reaction cards.
- Added operational English labels for corrupted embedded PRC titles, fixed
  PRC medium/long-range ADA profiles, corrected the KJ-2000 classification,
  and repaired incomplete Special Mission Aircraft text.
- Fixed Counter-UAS loss handling, validator boolean logic, missionless render
  robustness, transient-state cleanup, and campaign end-state presentation.

## Playtest evidence

The automated browser suite executes 20 named regression scenarios and passes
all 20. Coverage includes:

- Boot, content validation, five campaign selection, and setup navigation.
- Campaign and posture legality.
- Unit deployment for every major class.
- Acquisition, Cyber Advantage, hit/damage rolls, missile defense, and
  Winchester behavior, including hit-cancellation and submarine reactions.
- Counter-UAS, mission scoring, World Watches, Reserves, and ATO persistence.
- Commander selection for reconnaissance, token removal, recovery, and forced
  discard effects.
- Every one of the 68 authoritative Enabler cards against valid seeded state.
- A complete Meeting Engagement through the real hot-seat UI and action loop.
- A complete five-ATO Prolonged Combat state progression to final victory.

The suite completed with no browser page errors, console errors, or recorded
engine validation errors. JavaScript syntax, JSON parsing, local asset
resolution, offline dependency checks, package hashes, and a 1680x1050 visual
inspection also passed.

## Scope boundary

Phase Two UI polish, Phase Three Quick Start, and Phase Four networking were
not implemented in this phase.
