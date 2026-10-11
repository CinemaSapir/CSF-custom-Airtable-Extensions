# csf-timeline-horizontal «טיימליין אופקי»
Block <block-id-redacted> («Timeline Horizontal of Days Table»), Extension_Config key `timeline-horizontal-days` (empty Variant),
GitHub folder `timeline-horizontal-days/`. Started from the vertical csf-timeline v0.2.12 (2d8d029; v0.2.11 features + shared hook v4.1);
the vertical's history is in tools/VERTICAL-RELEASE-NOTES.md. `tools/port.py <ref>` re-ports shared/generic files from the vertical repo.

## v0.1.0 — candidate (not released)
- Horizontal right-to-left timeline: time runs right → left on a sticky ruler (hour labels on their grid lines, half-hour sub-ticks),
  one ROW per table (sticky header on the right: ⠿ · name · count · funnel · ⋯ · ✕), lanes packed so names never overlap.
- Same features as the vertical v0.2.11, transposed: wheel = time (5-min snap), wheel over the headers scrolls rows; «כווץ שעות ריקות»
  folds empty stretches; cross-section band (name-only magnified lens, window above the rows with half-width 2-line pills, table pills,
  window funnel incl. «רק עכשיו» / «בלי מבוטלים»); drag-create (15-min snap, popover), move/resize with 6 s undo; ✕ shrinks a row to the
  chip row, quiet tables start closed; ⠿ row reorder, header-edge row height (double-click reset), per user; 👁 hide per record + «נקה»;
  lodging = merged bar per hotel with in-house counts and ↓ check-in / ↑ check-out marks; day separators with phase colours; DST-safe.
- Config: `timeline-horizontal-days` + loose aliases (timeline-horizontal, horizontal-timeline, timeline horizontal days, טיימליין אופקי …);
  a row of another extension (the vertical's `timeline` / `timeline-festival-days`) is never used or edited (guard → code defaults).
- Right pane: «מצב חיבור» status panel, mapping panel (Attachment_Mapping_Image), «עריכה ישירה · Extension_Config» — shared files
  byte-identical to /workspace/csf-extension-config/status-panel and the vertical v0.2.12 hook.
- Extension_Config: DEMO row recShA2y5Hpy7Djn9 (71 cells from the code defaults), CSV line in config/ and in the shared DEMO CSV.
- Tests: 121 unit + 47 headless-Chrome e2e (harness/cdp-h010.mjs). Evidence: evidence/h-*.png, config-map-h010.png.

## v0.1.1 — port of vertical v0.2.13 (the owner 04:54 URGENT crash fix)
- Same root cause as the vertical v0.2.12 PROD crash: JumpControl read `dayOf(days, cur).date` with days = [] — buildDays gives no days
  when Date_1 → Date_2 is reversed or longer than 400 days (Festival Days only names days; a slot outside the range is clamped).
- No days → «לא נמצאו ימי פסטיבל — בדקו שטבלת Festival Days ושדה Date מופעלים באלמנט» + reason + «מצב חיבור» forced open.
- dayOf → NO_DAY instead of undefined; hRowStates / day separators / partsOf / planFields guarded.
- Error boundaries (top level + around the Loader) → «הטיימליין נתקל בשגיאה ולא הוצג», «הצג פרטים», «נסו שוב», status panel.
- Tests: tests/v0213.test.ts (ported) + harness/cdp-h011.mjs (11 real-browser checks). tools/port.py keeps the horizontal version and lock name.

## v0.1.2 — the owner 2026-10-11 05:20 (items 1–9) + 05:22 (item 10)
1. Cross-section window: the wheel over it scrolls ITS cards (overflow auto, overscroll contained); the timeline / page never moves.
   Every card is rendered (cap 400); Number_2 = how many cards are visible before scrolling.
2. Window ✕ on a table pill (⇤ removed, like the vertical header ✕) and 👁 on a card → narrow vertical tabs at the window's LEFT edge
   (table colour + count / record name); clicking a tab restores it.
3. All tables ON by default; ✕ on a row still shrinks it into the chip row at the TOP (unchanged).
4. Window cards ≥30% smaller: height 40→28px, name 12.5→9px, tag 9→7px, padding −33%, 8 per row (was 6).
5. Default span 12 hours (Dropdown_Default_3 = 720; code fallback 720).
6. Collapse empty tables (Toggle_1) and empty hours (Toggle_2) ON by default. Saved per-user view from v0.1.0/v0.1.1 (span, tables,
   closed rows, collapse toggles, window shrink) is dropped ONCE (persist v2) so the new defaults show; order, row heights, 👁, funnels kept.
7. Colours / chrome = the vertical's exact tokens: bars 1px hairline + 4px start border, hatch 4/8px, lodging 14.9% fill + 2px border
   (5px start), in-house pill 11.5px/800, lens = table tint + redLight1 inset, day separator hairlines.
8. Row height shrinks down to 4px per lane (no minimum row height once shrunk); text keeps its size and is clipped; below 16px the
   text is hidden and only the coloured bars stay (name on hover); thin rows hide the second header line.
9. Day titles: the ruler pill showed only the phase word («הכנות» / «פירוק» / «יום N»); it now shows the vertical's exact dayBar title
   («הכנות · עוד 2 ימים», «הכנות · ערב הפסטיבל», «יום 1 · פסטיבל · פתיחה» … · weekday · date) and sticks to the visible edge of its day.
10. Per-table filter LIST (logic/hfilter.ts): ops הוא / אינו / מכיל / לא מכיל / ריק / לא ריק (English + symbols understood).
    Right pane per table: field + op (6) + values + «שדות נוספים» (one line per field: «Field <op> v1|v2»). Fallback: every
    Extension_Config Filter_N line «Table.Field <op> v1|v2» (several lines per cell, loose table / field names, Filter_Operator_N /
    Filter_Value_N for a single bare line). A bare «Table.Field» = dropdown only. No list → status / type / location-like fields.
    Conditions = the funnel default (timeline AND window; window filters add on top). «מצב חיבור» lists every filter field
    (source, op, values, matched/total) and flags a field that is missing or hidden from the element (✗).
Tests: 138 unit (tests/v012.test.ts new), cdp-h010 47/47, cdp-h012 14/14 (before = v0.1.1 worktree: 10 failing as expected).
Evidence: evidence/v012/before-*.png / after-*.png, evidence/config-map-h012.png.

## v0.1.3 — the owner 2026-10-11 06:57 (feedback on v0.1.2)
1. Window cards stay 28px high, but the name is back to 12.5px (v0.1.1 size): wraps to 2 lines, clamped with «…», never shrinks.
2. Cross-section title «חתך רוחב» + its switch wear the cross-section colour (redDark1 = band label / lens edge).
3. Day titles in calm ink: the banner title is grayDark1 (the clock keeps the accent); ruler day pills are ink on white.
4. Day titles = the Festival Days record names, verbatim. Root cause: the shared core `dayBar` (also used by the vertical) built
   the title from the day NUMBER relative to Date_3 («הכנות · עוד 3 ימים», «הכנות · ערב הפסטיבל», «יום 2 · פסטיבל», «פירוק · יום 1»)
   and only kept the text after « · » of the record name. Now `hDayTitle` (logic/hcore.ts) shows the record's primary field as-is,
   matched by its Date field as an Israel calendar date (`fdDate`: a dateTime Date used to be sliced as UTC → the day before for
   00:00–02:59 Israel). No record / Date or Name hidden → the plain date («שבת 31.10.26»), and «מצב חיבור» shows
   Festival Days · Date / · שם with ✓ or ✗ + «N / M ימים קיבלו שם רשומה» + a sample. Heading_2–4 (phase words) are no longer shown.
Tests: 144 unit (tests/v013.test.ts: DEMO Festival Days 26 records → titles == names), cdp-h013 11/11 (v0.1.2: 9 fail),
cdp-h012 0 failing, cdp-h010 47/47. Evidence: evidence/v013/{before,after}-*.png, evidence/config-map-h013.png.

## v0.1.4 — UX Critic REVISE (8 points, open since v0.1.0; all 8 still failed on v0.1.3) + Cushion label pattern (2026-10-11 08:01)
1. Sticky labels: a bar starting off-screen keeps its name pinned at the visible RIGHT edge; near the LEFT edge the name slides
   into free lane room so its end stays on screen (hcore placeLabel, packBars rb/ra). A name that still has no room fades out at its
   end (mask gradient) — never a hard cut or a spill; hover shows it in full and dims only the neighbour it covers.
2. Duplicate titles in the cross-section strip: a label crossing the strip sits above the lens; the lens keeps only its highlight.
3. Outside labels colliding — root cause: the shared vertical stylesheet's hour-label rule «.hlab {transform: translateY(-50%)}»
   also matched the horizontal name labels (same class), so every name sat half a lane ABOVE its bar, over the lane above.
   Reset in hstyles; lanes already reserve each label's width. (A label on its bar's left end still resizes.)
4. One time tag: the now tag hides when the cross-section clock tag is within 50px (the red now line stays).
5. 24-hour time: the jump control's native time input (OS locale → «01:00 PM») is a 24h text field (930 → 09:30, Enter = go).
6. Window: cards are flex items sized to their names and fill each line (no empty columns); words break only at spaces; the
   v0.1.3 12.5px names and 28px cards stay.
7. Hall / hotel labels: aligned to their group's separator line (a dashed line in the header too), 2 lines instead of «…»,
   full header width below the header's two lines.
8. Create-drag ghost over existing records: red edge + «⚠ חופף ל-…» naming the clash (all names in the tooltip).
Tests: 153 unit (tests/v014.test.ts new), cdp-h014 14/14 (v0.1.3: 10 failing), cdp-h010 47/47, cdp-h012 / cdp-h013 0 failing.
Renders: evidence/h-v014-main.png, h-v014-dense.png, h-v014-drag.png; per point evidence/v014/{before,after}-*.png.
