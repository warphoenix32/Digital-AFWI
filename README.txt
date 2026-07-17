AFWI 1.2 EXECUTIVE EDITION - PHASE TWO CORRECTIONS COMPLETE
================================================

RUN
1. Keep AFWI.html and the assets folder together.
2. Open AFWI.html in an approved modern browser.
3. Acknowledge the five-ATO Standard Match briefing and begin setup.

REQUIREMENTS TO PLAY
- No installation
- No administrator privileges
- No internet connection
- No external runtime dependencies

RELEASE SCOPE
- Fixed five-ATO Standard Match using the complete available card pool
- Published posture, mission, draft, deployment, initiative, intel, MAS, combat,
  missile-defense, mission-scoring, attrition, and victory mechanics
- 20 authoritative Squadron cards and 68 authoritative Enabler cards
- Hot-seat play for two commanders
- Aircraft generate at the owning airbase by default, with the US contingency,
  owning-side standoff, and explicit Enabler-card location exceptions
- Deployed Squadron cards use fog of war with AQ 1
- Compact board-width selected-token HUD without changing physical token scale
- Airbase, contingency, and standoff containers wrap centered forces and scroll vertically when their visible area is exceeded
- Executive command-glass UI with equal-size US and PRC play areas
- Prominent M-A-S availability/spent indicator
- Exact supplied token silhouettes and equipment-type labels; unsupported
  silhouettes use a correct type label instead of a misleading substitute
- New locally generated, container-safe imagery for the landing page, theater,
  airbases, US contingency location, and standoff zones; supplied imagery remains
  available and is still used for associated Squadron/Enabler side cards
- Initiative winner always acts first; players do not select turn order
- Deterministic automation for card effects; explicit commander prompts for
  reactions, choices, targets, and hidden-information handoffs

VALIDATION
- Run tests/phase1_static_validation.ps1 for local syntax, content, asset, and
  package-integrity checks (development validation requires Node.js).
- Run tests/phase1_playtest.cjs in a development environment with Playwright
  and Chrome for the full automated browser playtest suite.
- Run tests/enabler_focus_playtest.cjs for the exhaustive 68-card Enabler
  registry and focused generated-force, reaction, cyber, intel, and Counter-UAS checks.
- Run tests/phase2_visual_regression.cjs for executive-layout validation and
  reproducible 1680x1050 browser screenshots.
- See docs/Phase2_Executive_UI_Report.md for the Phase Two release record.

OUT OF PHASE-TWO SCOPE
- Quick Start is Phase Three.
- Networked multiplayer is Phase Four.
