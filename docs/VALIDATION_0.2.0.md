# Penguin 0.2.0 validation scope

Validated against official Hermes v0.23.0, commit `2bd378ed1b8d6bf2192cb26e0a55ff3091e6bd19`. Public catalog admission is still pending; local checks are not maintainer approval.

## Source correspondence

The original 0.1.1 main was `9a75eeb2aaaf1a57a98e89150983d84ff28c885c`. The integrated UI branch ends at `ac6ffdbda9511b45d4685144b2d3ed47b14b8b5e`. Its `desktop/plugin.js` SHA-256 is `ffd761f7f0ef766313105235e2289d6b6aee23e369e810f1b69b5143226ee67f`, matching the file installed in the isolated native Hermes reviewed on 2026-11-06.

Integration adds only artwork-cache recovery, a visible copy confirmation with explicit send-off navigation, and intact completion dates. The deterministic engine, schemas, tool entrypoint, state service and bundled timezone rules are byte-identical to 0.1.1. No new core behavior, audio, video system or external runtime service was added.

## Checks and limits

| Check | Result / scope |
|---|---|
| Python suite | 62 passed, 0 failed, 0 skipped through the official per-file runner; includes real Hermes state/profile/API tests and exact artwork response bytes |
| Artwork recovery | Regression reproduced on the original branch; fallback, replay recovery and successful shared cache pass after correction |
| Headless UI suite | Six checks pass using the production component, real Python API, test SDK adapter and synthetic clipboard |
| Official plugin validation | 16/16, no warnings, including security scan, capability probe, public Desktop surface and no core override |
| Original branch native macOS QA | Four clocks, all SALUTEs, Commander, copy/stamp/exit/Encore, invalid-zone recovery, keyboard slider, 532/392px content and reduced motion checked in actual Hermes |
| Final integration native replay | Pending; the three follow-up corrections have browser coverage, not a new native-app certification |
| Other platforms | Linux/Windows GUI, real touch device and screen-reader speech not tested |
| Conversational model routing | No model provider configured for native QA; automatic LLM tool selection not tested |

The headless completion suite checks the visible copy status, navigation to the entire send-off card, unbroken dates at 392px, static reduced-motion exit, manual-copy fallback without a false APPROVED state, and invalid-time recovery. Its clipboard is synthetic; it does not certify the operating system clipboard. Native copy succeeded in the earlier branch QA.

## Screenshot provenance

These are unmodified native-app JPEG captures from the reviewed UI branch above, using fictional Aurora Studio members. They were checked for private content before inclusion:

- `native-planner-0.2.jpg`: four-clock planner at 22:00 Taipei.
- `native-commander-0.2.jpg`: Commander dispatch and Mika's SALUTE at 21:00 Taipei.
- `native-arrival-0.2.jpg`: narrow illustrated arrival with reduced motion.

They demonstrate the integrated artwork and unchanged planner/dispatch layout. They do not depict the new inline copy confirmation or corrected completion-date layout. Earlier `native-*.png` images belong to the 0.1.x review and are not used in the 0.2.0 catalog gallery.

## Reproduction

Run the README's Python integration suite and `hermes plugins validate /path/to/exact-pinned-checkout --install-deps --json`. For browser checks, use a disposable loopback harness that renders the actual `desktop/plugin.js`, supplies the public SDK contract via a test adapter, and serves the actual Python routes at `/api/plugins/penguin/`. No harness is installed into Hermes or shipped as a runtime dependency.

`tests/desktop-recovery.js` is a Playwright CLI script. `tests/desktop-completion.mjs` uses Playwright in a separate development environment. `PLAYWRIGHT_MODULE` can select an existing local Playwright module; `PLAYWRIGHT_CHANNEL=chrome` uses installed Chrome. Neither test downloads software. A missing browser is a test-environment failure, not a passing test.

Runtime reads only bundled artwork/TZif files and its own profile-local state; clipboard writes follow explicit user clicks. The artwork grants in `assets/NOTICE.md` and `assets/kit/NOTICE.md` remain separate from MIT code. No calendar event or invitation is created.
