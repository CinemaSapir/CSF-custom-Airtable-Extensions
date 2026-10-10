# Bulk sheet «קופי פייסט - הזנה מרובה» — changelog (box copy)

## v0.5.4 — 2026-10-10
- Shared status-panel v4: when no Extension_Config row matches, the «מצב חיבור» panel lists the Extension / Variant values it actually sees (up to 10, invisible characters shown) and whether the Extension and Variant fields are visible to the element.
- Hook v3.4: Extension / Variant matched very loosely (trim, invisible + bidi characters stripped, case, spaces / dashes / underscores ignored).

## v0.5.3 — 2026-10-10
- Mapping field renamed to Attachment_Mapping_Image (old Mapping_Image still read as a loose fallback); toggle «show mapping · Extension_Config.Attachment_Mapping_Image». Hook v3.3.
- Right-pane «עריכה ישירה · Extension_Config» (default OFF): shared ConfigEditor — click-to-edit on-screen texts, a list of every text slot and an Option_List editor. Writes only one cell of the matched Extension_Config row (Variant row, else default row; no row → confirm), checkPermissionsForUpdateRecord first, 6 s undo.

## v0.5.2 — 2026-10-10
- Right-pane «show mapping · Extension_Config.Mapping_Image» (default OFF): shared MappingPanel (status-panel v2) shows the matched row's Mapping_Image attachments (Variant row → default row; large thumbnails, click = lightbox, full URL, file name) + GitHub_URL link. Hook v3.2: Mapping_Image / GitHub_URL are read-only extras outside the 269 FIELD_ORDER. «מצב חיבור» reports both fields (Hebrew hint when not enabled / empty).

## v0.5.1 — 2026-10-10
- Shared «מצב חיבור» status panel (status-panel v1, same files as countdown-homescreen v0.4.5): right-pane boolean «show מצב חיבור · Extension_Config», default OFF; ON = always shown (published view too). Shows config table, matched row (Extension/Variant), fields visible to the element + slots read but not enabled, People/Roles/Assignments table resolution and the 11 written fields (by id → by name). Read-only.

- **v0.5.0 (2026-10-10, committed on the box only — NOT released): Extension_Config wiring.**
  - Extension_Config is READ-ONLY here: the hook is the v3.1 copy (same as countdown v0.4.1), where Door 2 writes are opt-in (`writes: true`) and OFF. The extension never creates rows or fills Slot_Map, Code_Version or Last_Synced. The table is found from the right-pane «configTable», else by the name Extension_Config (exact, then loose).
  - `frontend/cfg.ts` + shared `useExtensionConfig.ts` (design v3, 269 fields). Row `Extension = bulk-sheet` (+ optional Variant). 43 slots: Title, Heading_1, Table_Heading_1–9, Helper_Text_1–5, Button_Text_1–6, Content_Text_1–5, Empty_State_Text_1, Error_Text_1–3, Number_1–3 (start rows 20 / batch 50 ≤ 50 / +10 rows), Color_1–6 (confetti), Source_Table_1–3. Map: `/workspace/csf-extension-config/maps/bulk-sheet.md` + `bulk-sheet-config-map.png`.
  - Precedence: right pane → Extension_Config (Variant cell → default row) → code default.
  - New optional right-pane fields: `configTable`, `configSlug` (default `bulk-sheet`), `configVariant`.
  - Table absent → identical to v0.4.3: `npm run test:config` (6 DOM-identity scenarios + positive row/variant/right-pane checks, 22 checks).
  - Lint now passes: the pre-existing v0.4.3 `no-dupe-else-if` (dead Shift+Arrow branch) is silenced with a note, behaviour unchanged.
- **v0.4.3 (PROD, released earlier from C:\CSF\csf-bulk-sheet):** baseline tag `v0.4.3-base`.
