AFWI 1.0 FINAL - PHASE ONE COMPLETE
===================================

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
- Deterministic automation for card effects; explicit commander prompts for
  reactions, choices, targets, and hidden-information handoffs

VALIDATION
- Run tests/phase1_static_validation.ps1 for local syntax, content, asset, and
  package-integrity checks (development validation requires Node.js).
- Run tests/phase1_playtest.cjs in a development environment with Playwright
  and Chrome for the full automated browser playtest suite.
- See tests/Phase1_Final_Regression.json and
  docs/Phase1_Finalization_Report.md for the verified release record.

OUT OF PHASE-ONE SCOPE
- Senior-leader UI polish is Phase Two.
- Quick Start is Phase Three.
- Networked multiplayer is Phase Four.
