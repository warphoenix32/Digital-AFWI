# AFWI 1.0 Candidate — Phase 5 Build Report

## Scope completed
- Integrated the authoritative registry from `AFWI_CARD_DATA_and_GIMP_Mapping_V2.xlsx`.
- Authoritative cards available: 88 (10 US squadrons, 10 PRC squadrons, 34 US enablers, 34 PRC enablers).
- Replaced the three-mission prototype set with all five authoritative missions per side.
- Replaced repeating per-band backgrounds with one continuous theater image beneath all five band overlays.
- Preserved the AFWI-only zero-dependency doctrine and local relative assets.
- Added automatic resolution for deterministic reconnaissance, cyber, counter-UAS, base-strike, and roll-modifier effects.
- Added hot-seat manual adjudication prompts for reaction and multi-choice cards whose exact timing requires human decisions.
- Added authoritative mission scoring for Attrition, Interdiction, Economy of Force, N-K Dominance, Three Dominances, and Counter-Intervention.

## Important limitation
Reaction/cancellation cards and generated-unit cards are fully present and draftable, but some remain human-adjudicated using their exact card text. Automating them completely requires a formal interrupt/response stack and multi-step target-selection workflow. That is a future design decision rather than something invented in this build.

## Baselines
- Architectural baseline: v3.40.0
- Behavioral oracle: v3.36.2
- Phase 4 source: RC1 Phase 4 Final
