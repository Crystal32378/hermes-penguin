# Penguin 0.1.1 review notes

This revision improves the optional Desktop planner while retaining the deterministic time engine, four tools and profile-local team storage from 0.1.0. Catalog admission is still under review; a public source update is not a catalog approval.

## Changes

- Moving the shared timeline requests a preview immediately. The previous clocks remain readable with an updating state, copying is disabled until the current result arrives, and stale responses cannot overwrite a newer selection.
- Successful proposal copying displays the commander, the four local times and a dismissible blue-white dot-matrix aurora. Changing the selection clears the completion. The panel explicitly says that no calendar event was created; clipboard failure offers manual copying instead of a false success.
- Selected-time and clock-card numerals share the same local monospace family, weight, tabular-number setting and tracking. The existing status line, availability badges, replay control and IANA labels retain their original styling. [Brand guidelines](BRAND_GUIDELINES.md) document these roles, with a [Traditional Chinese version](BRAND_GUIDELINES.zh-TW.md).
- Updated screenshots show the actual official Hermes Desktop connected to an isolated gateway with fictional team settings.

## Validation

The implementation was exercised in the unmodified official Hermes v0.23.0 macOS Electron development build with its real gateway. Eight native checks passed: typography, four-city conversion, eight successive slider updates, proposal completion, clearing completion on a new selection and whole-meeting availability, invalid-time handling, reduced motion, and a two-column layout at a 390px viewport.

The existing 62 Python tests passed, with one upstream Starlette deprecation warning. They cover DST gaps/folds, half-hour transitions, skipped dates, overnight work windows, complete meeting durations, invalid zones, reproducibility and real Hermes persistence/profile isolation. Official `hermes plugins validate --install-deps --json` passed all 16 checks with no warnings. JavaScript syntax and whitespace checks passed.

For an independent review, repeat the README's tests and official validation against the exact commit pinned in the catalog PR. Exercise the slider rapidly, copy a proposal, change the time, enter an invalid time, and test reduced motion and narrow layouts. Preserve the existing brand roles when making frontend refinements.

## Scope and distribution

There are no new tools, dependencies, credentials, external runtime requests, calendar writes or telemetry. The plugin uses the public Hermes SDK and its own profile-local state. No inference provider is needed for the Desktop planner. Model-driven conversational tool selection and Linux/Windows GUI behavior remain untested.

The arrival and send-off are silent UI animations. Separately produced narration, music and generated demonstration video are not distributed in this repository. Only fictional people and schedules are used in examples and screenshots. Code and documentation are MIT; the existing illustration and timezone-data notices remain in force.

Penguin prepares a meeting proposal. It does not reserve a meeting, inspect calendar conflicts or send invitations.
