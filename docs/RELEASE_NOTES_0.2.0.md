# Penguin 0.2.0 review notes — Commander delight

Integrates `opus/commander-delight` through `ac6ffdbda9511b45d4685144b2d3ed47b14b8b5e`, preserving its original commits. The deterministic time engine, its four tools and profile-local storage are unchanged from 0.1.1; this release only touches the optional Desktop page, one read-only art route and documentation.

## Changes

- **Arrival:** the Antarctic control room now uses a full illustrated background (blue-white dot-matrix control deck with aurora), loaded through a fixed plugin route. The previous CSS mountains remain as a fallback when artwork cannot load.
- **Commander dispatch:** under the summary, the commander comments on the current state inside an illustrated dispatch frame — commending the humans who cannot move their time zones, refusing overtime when someone falls outside work hours, and refusing to time-travel on a repeated DST hour. Narrow layouts fall back to a plain bar.
- **SALUTE:** each clock card has a small technical-style `SALUTE` button. Each press pins a medal and cycles one of four commendations built from that person's actual zone and local time.
- **Approved stamp:** a successful copy stamps the send-off with an illustrated APPROVED seal.
- **Exit:** the send-off ends with a short, non-blocking scene: the commander, flippers clasped behind his back, waddles to the edge of the ice, says “I’ll be back.” and dives. An `Encore` button replays it. Reduced-motion users see the commander standing with the line, no movement. The proposal text, close button and copy state are unaffected.
- **Fixes:** invalid times show `NO VALID TIME` instead of a perpetual `CHECKING…`; a failed preview request now applies the same connection-epoch guard as a successful one; long IANA names wrap after a slash rather than mid-word.
- **Typography:** type roles are declared once as tokens (status line, badge, technical button, IANA zone, numerals) and the new elements reuse them. The arrival sub-line and console label now share the status-line tracking (1.7px). The four protected roles and the numeral specification are unchanged.

## Integration follow-ups

- Failed or incomplete art-kit requests no longer poison the shared cache. Reopening arrival retries after the backend recovers; successful loads remain shared. Existing fallback artwork stays usable while unavailable.
- Successful copying immediately displays a proposal-only confirmation beside the Copy control. View send-off navigates to the existing completion card on request, without an unsolicited focus or scroll jump.
- Completion dates have their own unbroken line, including the narrow two-column layout.

## Validation

- 62 Python tests pass using the official Hermes per-file runner, including all five real-Hermes integration tests and new exact-byte assertions for the four-file art API.
- The artwork outage regression fails on the reviewed UI branch and passes after the fix. It checks fallback, retry and successful shared caching.
- Six headless browser checks pass against the production component with the real Python backend and a test SDK adapter: four clocks/all SALUTEs, visible completion/navigation, 392px dates, reduced motion, clipboard failure, and invalid-time recovery.
- Official `plugins validate --install-deps --json`: all 16 checks pass, no warnings. No new runtime dependencies or capability declarations.
- Native macOS QA of the reviewed UI branch covers the Commander, all SALUTEs, copy/stamp/exit/Encore, reduced motion, invalid-zone recovery and narrow windows. The final three integration corrections have browser regression coverage; their final native replay and refreshed screenshots remain pending. See [exact scope and screenshot provenance](VALIDATION_0.2.0.md).

## Scope

No new tools, dependencies, credentials, network requests, calendar writes or audio. Artwork in `assets/kit/` is excluded from the MIT license; see `assets/kit/NOTICE.md`. Penguin still only prepares and copies a meeting proposal.
