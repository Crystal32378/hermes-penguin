# Penguin brand guidelines

Penguin is an Antarctic control room with a cool, hand-drawn commander and an electric-blue instrument panel. Keep the original character of its typography. Consistency means giving each kind of information a repeatable role, not turning every label into plain body text.

## Typography roles

Use local system font stacks only. Do not copy Hermes marketing-site font files or ship commercial/trial fonts. Hermes is a reference for hierarchy and clarity, not a source of reusable font licenses.

| Role | Examples | Family / weight | Size and tracking |
| --- | --- | --- | --- |
| Brand wordmark | PENGUIN | Original drawn 5×7 dot-matrix glyphs | Preserve the blue frame, warm-white dots and exact spelling; do not substitute a plain font |
| Main statement | The world runs on different hours. | `system-ui, sans-serif`, 800 | Original responsive 28–39px treatment; 1.07 line height; −1.5px tracking on wide screens |
| Section / person names | Your four places; Mika | Same system sans family | 20px section heading; 14px person names; normal readable spacing |
| Controls and explanation | Find shared time; Reference date; explanatory copy | Same system sans family | Base 14px/1.5; supporting copy keeps its established 11–13px roles; no global uppercase or tracking reset |
| Control-room telemetry | ANTARCTIC TIMEKEEPER | `ui-monospace, monospace`, regular | Original 10px uppercase and 1.7px tracking; preserve the technical character |
| Availability badge | FULL MEETING FITS | Same monospace family, 700 | Original compact 9px clock-card badge with .5px tracking; retain blue/amber meaning and readable padding |
| Replay control | Replay arrival | Same monospace family, regular | Original 10px treatment; do not replace with ordinary body-button typography |
| Timezone identifiers | Europe/London; America/New_York | Same monospace family, regular | Original 10px; retain IANA spelling, punctuation and neutral tracking; allow long identifiers to wrap |
| Clock numerals | Selected 21:00 and four local clocks | Same monospace family, 700, tabular numerals | **Identical family, weight and −2px tracking.** Selected time 32px; cards 38px. Small screens 28px / 31px. Size may follow hierarchy; glyph design must match |
| Timeline marks | 00, 06, 12, 18, 24 | Same monospace family | Original compact technical scale; never confuse local-clock bars with exact elapsed-time calculations |

The numeric contract is explicit in `desktop/plugin.js` through `--p-mono`. Test computed font family, weight and letter spacing on the selected-time input and the first card; all three must match. The status line, badge, replay control and zone labels must continue to resolve to a monospace family. Font metrics can vary by operating system; no proprietary font binary is bundled.

## Color, artwork and layout

- Keep electric blue, dark navy, warm paper white and blue-white dots. Amber means the full meeting is outside a member's work window; it is not a decoration.
- Preserve the original Penguin illustration and PENGUIN wordmark. New artwork must retain their line and halftone character and have its own source/permission record.
- Four people appear across the desktop, two columns on narrow screens. Dates, offsets, meeting end times and availability must remain readable.
- Do not place decorative overlays over clock values, controls or error messages. The timetable has priority over cinematic effects.

## Motion and voice

- Arrival is short, skippable and replayable. Do not force a ten-second movie before every use.
- Copying a proposal successfully may show the commander with a short blue-white dot-matrix aurora. Keep it in the page, dismissible, and stop animation for reduced-motion preferences.
- Use “proposal copied” / “proposal ready”. Penguin currently does **not** book calendar events, invite people or verify calendar conflicts.
- The send-off line is: “Dismissed. See you next time in the Antarctic control room.”
- “Your time is under my command.” is a subtitle/tagline. Narration describing the mission is voice-over, not a claim of synchronized character dialogue.
- The plugin does not autoplay audio. Separate narrated demonstration media must be labeled as such; AI music and narration are not included in the plugin's MIT license.

## Review gate

Preserve the four specifically approved text styles above before changing a global font rule. Review desktop and phone screenshots, the selected/card numeral match, long IANA names, disabled/error states and reduced motion. Changes to visual personality need a new comparison against Crystal's accepted reference, not an assumption that more uniform is better.

## Roles reused by 0.2.0 elements

- Commander dispatch label `COMMANDER`: control-room status (monospace, uppercase, 1.7px); the line itself is regular sans.
- `SALUTE` and `Encore`: the same technical button as `Replay arrival`.
- `APPROVED` on the stamp: availability-badge type (monospace 700, 0.5px).
- Background, dispatch frame, medal and stamp are one control-room illustration set (`assets/kit/`); no new typefaces.
