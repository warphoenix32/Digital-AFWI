# AFWI 1.0 Final - Phase One Finalization Report

> Historical baseline: the selectable campaign system documented below was superseded and removed in build `1.2.0-executive-corrections`. The current game uses the fixed five-ATO Standard Match and complete available card pool.

## Outcome

Phase One gameplay implementation is complete. `AFWI.html` is the final
offline, browser-based, hot-seat build for the gameplay phase. The build
identifies itself as `1.0.1-final-phase1`.

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
- Applied the clarified generation rule: Squadron aircraft begin on their
  owning airbase, the US commander may select the contingency location when
  available, and explicit Enabler-card location exceptions remain in force.
- Added persistent Fog of War for deployed Squadron cards with AQ 1 and
  reveal-on-acquisition behavior.
- Reordered the US board row to Standoff, Airbase, and Contingency, and added
  a full selected-token information panel while preserving the 72x66 token size.
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

The automated browser suite executes 23 named regression scenarios and passes
all 23. Coverage includes:

- Boot, content validation, five campaign selection, and setup navigation.
- Campaign and posture legality.
- Unit deployment for every major class, owning-airbase defaults, the US
  contingency choice, and Enabler-specific generation exceptions.
- Squadron-card Fog of War and AQ 1 reveal behavior, US-row ordering, and the
  selected-token profile panel with unchanged token dimensions.
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
