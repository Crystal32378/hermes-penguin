# Penguin 0.2.0 review notes — Commander delight

Branch `opus/commander-delight`. The deterministic time engine, its four tools and profile-local storage are unchanged from 0.1.1; this release only touches the optional Desktop page, one read-only art route and documentation.

## Changes

- **Arrival:** the Antarctic control room now uses a full illustrated background (blue-white dot-matrix control deck with aurora), loaded through a fixed plugin route. The previous CSS mountains remain as a fallback when artwork cannot load.
- **Commander dispatch:** under the summary, the commander comments on the current state inside an illustrated dispatch frame — commending the humans who cannot move their time zones, refusing overtime when someone falls outside work hours, and refusing to time-travel on a repeated DST hour. Narrow layouts fall back to a plain bar.
- **SALUTE:** each clock card has a small technical-style `SALUTE` button. Each press pins a medal and cycles one of four commendations built from that person's actual zone and local time.
- **Approved stamp:** a successful copy stamps the send-off with an illustrated APPROVED seal.
- **Exit:** the send-off ends with a short, non-blocking scene: the commander, flippers clasped behind his back, waddles to the edge of the ice, says “I’ll be back.” and dives. An `Encore` button replays it. Reduced-motion users see the commander standing with the line, no movement. The proposal text, close button and copy state are unaffected.
- **Fixes:** invalid times show `NO VALID TIME` instead of a perpetual `CHECKING…`; a failed preview request now applies the same connection-epoch guard as a successful one; long IANA names wrap after a slash rather than mid-word.
- **Typography:** type roles are declared once as tokens (status line, badge, technical button, IANA zone, numerals) and the new elements reuse them. The arrival sub-line and console label now share the status-line tracking (1.7px). The four protected roles and the numeral specification are unchanged.

## Validation

- 57 core/service tests pass (Python 3.10 Linux VM and 3.13); the real-Hermes integration tests were not re-run for this branch.
- Independent tz check: 3,000 random conversions across ten zones matched the host system tzdata (2026e) exactly; DST gaps/folds in New York and London, illegal inputs and long IANA names behaved as specified.
- Exercised in the unmodified official Hermes v0.23.0 Electron development build with an isolated home and a freshly restarted gateway: new background, dispatch frame and text placement, SALUTE medal, copy → stamp → exit → Encore, invalid time, rapid successive inputs and slider drags.
- Not re-run on this branch: 390px layout, reduced motion, clipboard-failure path, official `plugins validate`.

## Scope

No new tools, dependencies, credentials, network requests, calendar writes or audio. Artwork in `assets/kit/` is excluded from the MIT license; see `assets/kit/NOTICE.md`. Penguin still only prepares and copies a meeting proposal.
