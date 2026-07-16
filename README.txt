AFWI 1.1 EXECUTIVE EDITION - PHASE TWO COMPLETE
================================================

RUN
1. Keep AFWI.html and the assets folder together.
2. Open AFWI.html in an approved modern browser.
3. Select one of the five published campaigns and begin setup.

REQUIREMENTS TO PLAY
- No installation
- No administrator privileges
- No internet connection
- No external runtime dependencies

RELEASE SCOPE
- Five published campaigns with campaign-specific ATO counts and restrictions
- Published posture, mission, draft, deployment, initiative, intel, MAS, combat,
  missile-defense, mission-scoring, attrition, and victory mechanics
- 20 authoritative Squadron cards and 68 authoritative Enabler cards
- Hot-seat play for two commanders
- Aircraft generate at the owning airbase by default, with the US contingency
  option and explicit Enabler-card location exceptions
- Deployed Squadron cards use fog of war with AQ 1
- Full selected-token profile panel without changing physical token scale
- Executive command-glass UI with equal-size US and PRC play areas
- Prominent M-A-S availability/spent indicator
- Exact supplied token silhouettes and equipment-type labels; unsupported
  silhouettes use a correct type label instead of a misleading substitute
- Supplied photographic imagery for the landing page, airbases, US contingency
  location, standoff zones, and associated Squadron/Enabler side cards
- Deterministic automation for card effects; explicit commander prompts for
  reactions, choices, targets, and hidden-information handoffs

VALIDATION
- Run tests/phase1_static_validation.ps1 for local syntax, content, asset, and
  package-integrity checks (development validation requires Node.js).
- Run tests/phase1_playtest.cjs in a development environment with Playwright
  and Chrome for the full automated browser playtest suite.
- Run tests/phase2_visual_regression.cjs for executive-layout validation and
  reproducible 1680x1050 browser screenshots.
- See docs/Phase2_Executive_UI_Report.md for the Phase Two release record.

OUT OF PHASE-TWO SCOPE
- Quick Start is Phase Three.
- Networked multiplayer is Phase Four.
