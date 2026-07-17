AFWI 1.4.0 EXECUTIVE EDITION - COMPLETE REFERENCE GUIDE
=======================================================

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
- Every authoritative card is visible and selectable through the draft UI when
  legal; selected cards can be individually returned to the pool for swaps
- Hot-seat play for two commanders
- Aircraft generate at the owning airbase by default, with the US contingency,
  owning-side standoff, and explicit Enabler-card location exceptions
- Deployed Squadron cards use fog of war with AQ 1
- Compact board-width selected-token HUD without changing physical token scale
- Airbase, contingency, and standoff containers wrap centered forces and scroll vertically when their visible area is exceeded
- Executive command-glass UI with equal-size US and PRC play areas
- Prominent M-A-S availability/spent indicator
- Explicit Air-to-Air and Air-to-Surface target-domain enforcement, including
  surface-only naval combatants and air-target carrier aircraft
- Three-hit hull durability for naval surface combatants; explicit instant-
  destroy Enabler effects retain their published override
- Prominent Winchester badges in the token, status line, and selected-unit HUD,
  with larger Segoe UI Variable/Segoe UI HUD typography
- Exact supplied token silhouettes and equipment-type labels; unsupported
  silhouettes use a correct type label instead of a misleading substitute
- New locally generated imagery remains active on the landing page and theater.
  Airbase, contingency, and standoff boxes use one solid command-glass color
  that remains continuous when wrapped content is scrolled; existing image
  assets remain preserved and associated Squadron/Enabler side-card art remains active
- Initiative winner always acts first; players do not select turn order
- Deterministic automation for card effects; explicit commander prompts for
  reactions, choices, targets, and hidden-information handoffs
- Complete in-game Rules & Mechanics reference reconciled to the live engine,
  including match flow, posture effects, missions, fog of war, deployment,
  combat domains, damage, Winchester, persistent attrition, and scoring
- Complete Asset Glossary covering every fielded asset family, Squadron cards,
  Airbases, operating locations, HUD abbreviations, and Enabler employment
- Reference dialogs populate build, force-pool, posture, and mission data from
  the live game model and provide sticky navigation, readable tables,
  responsive scrolling, focus containment, and Escape-to-close behavior

VALIDATION
- Run tests/phase1_static_validation.ps1 for local syntax, content, asset, and
  package-integrity checks (development validation requires Node.js).
- Run tests/phase1_playtest.cjs in a development environment with Playwright
  and Chrome for the full 29-scenario automated browser playtest suite.
- Run tests/enabler_focus_playtest.cjs for the exhaustive 68-card Enabler
  registry and focused generated-force, reaction, cyber, intel, and Counter-UAS checks.
- Run tests/phase2_visual_regression.cjs for read-only executive-layout
  validation at 1680x1050. Set AFWI_SCREENSHOT_OUTPUT only when new review
  artifacts are intentionally requested; committed images are not overwritten.
- See docs/Phase2_Executive_UI_Report.md for the Phase Two release record.

OUT OF PHASE-TWO SCOPE
- Quick Start is Phase Three.
- Networked multiplayer is Phase Four.
