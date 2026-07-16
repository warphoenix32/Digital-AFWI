# AFWI RC1 — Phase 4 Finalization Report

## Baselines

- Development baseline: AFWI v3.40.0 architectural build.
- Behavioral regression oracle: AFWI v3.36.2.
- Release branch: AFWI RC1 Phase 4 Final.

## Final approved changes

### Turn and deployment behavior

- Deploying a Squadron no longer automatically ends the player's turn.
- Squadron deployment removes the Move, Acquire, and Shoot actions for the remainder of that turn.
- Legal Enabler cards may still be played after deployment.
- The player ends or passes the turn manually.
- Aircraft normally begin at their owning Airbase or, when legally selected, the US Contingency Location.
- UAS and naval units retain their explicit class deployment rules.
- Bombers and AEW aircraft no longer deploy directly into Standoff; they must move there after taking off unless a later card effect explicitly overrides normal basing.

### Board and unit presentation

- Board imagery is applied to all five operational bands.
- Squadron cards retain side colors but do not display aircraft artwork.
- Aircraft token imagery remains enabled.
- Token dimensions and stat strips were adjusted to prevent bottom text/image wrapping.
- PRC and US operational-zone rows use equal fixed heights.
- PRC Standoff, PRC Airbase, US Standoff, US Airbase, and US Contingency use the same operational-box height.
- All operational boxes use the same background-overlay transparency rule.
- US Airbase remains in the center of the lower row; US Contingency remains on the right.
- Unapproved horizontal additions were not included: no Phase Flow indicator, status panel, discard piles, or duplicate hand panels.
- CSS animation and transition effects are disabled.

### Project constraints

- Zero Dependency Doctrine applies to AFWI only.
- All runtime assets are local and referenced through relative paths.
- No CDN, remote font, external script, installer, administrator permission, or cloud service is required.
- Hot-seat play remains the only implemented mode. LAN host/join remains roadmap-only.
- No AI or computer-opponent implementation work was performed.

## Verification performed

- JavaScript syntax validation with Node.js: PASS.
- Static dependency and asset-resolution checks: PASS.
- Browser execution through Chromium/Playwright: PASS with no page errors.
- Squadron deployment creates its board card and aircraft tokens: PASS.
- Squadron deployment keeps the active player and consumes MAS actions only: PASS.
- Enabler play remains legal after Squadron deployment: PASS.
- Bomber initial basing at Airbase: PASS.
- Squadron aircraft artwork removed: PASS.
- Operational-zone height equality: PASS.
- Token stat-strip overflow check: PASS.

## Remaining acceptance activity

RC1 engineering work is complete. A full four-ATO human hot-seat user-acceptance playtest on the intended DoD browser configuration is still required before field release. That activity is operational certification, not an outstanding Phase 4 code change.
