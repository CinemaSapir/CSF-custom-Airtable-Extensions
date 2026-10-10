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
