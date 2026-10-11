# CSF custom Airtable extensions

Source code for the Cinema South Festival (CSF) custom Airtable extensions, one folder per extension, plus the shared `Extension_Config` design and the config maps.

| Folder | Extension | Version | What it does |
|---|---|---|---|
| `countdown-homescreen/` | Countdown homescreen | v0.4.13 | Home-screen countdown to the start of the first משובץ slot on festival Day 0 = 31.10 (found by day number, «יום 0» in the name or notes, or Date_2; configurable day number and status filter; the status panel shows every step and flags a needed field hidden on the element) with live record-count pills (per-pill filters + count/sum aggregation), a «מצב חיבור» connection-status panel, a mapping panel and inline config editing. |
| `timeline-festival-days/` | Timeline («טיימליין ימים») | v0.2.13 | Multi-table festival timeline (7 tables: Slots_Events, Staffing, Invitations, Itinerary, Lodging, Booking Resources, Social Posts; header ✕ shrinks a column to a strip, window funnel, 👁 hide a record per user): columns per table, drag-create / move / resize with undo, cross-section window + band (time snaps to 5 min) (names only, vertical when crowded), identical per-column header controls (⠿ · filter · ⇤ · ⋯ · ✕).. Config row: `Extension = timeline-festival-days`, empty Variant (old keys `timeline` and `program-by-day` + `timeline` still read as fallbacks). No-days (Date_1 → Date_2 reversed / > 400 days) → friendly empty state + status panel; error boundary with Hebrew details. |
| `timeline-horizontal-days/` | Horizontal timeline («טיימליין אופקי») | v0.1.2 | Right-to-left horizontal festival timeline: one row per table (sticky header ⠿ · name · count · funnel · ⋯ · ✕), time runs right → left on a sticky ruler; the same features as the vertical timeline v0.2.11 transposed (wheel = time with 5-min snap, «כווץ שעות ריקות», cross-section band + window, drag-create / move / resize with undo, ✕ shrinks a row to the chip row, quiet tables closed, row reorder + row height per user, 👁 hide per record, merged lodging bars with in-house counts), status / mapping / inline-edit panels. Config row: `Extension = timeline-horizontal-days`, empty Variant (loose aliases; never another extension's row). No-days (Date_1 → Date_2 reversed / > 400 days) → friendly empty state + status panel; error boundary with Hebrew details. v0.1.2: the cross-section window scrolls inside, ✕ / 👁 shrink to tabs at its left, smaller cards, 12 h default, empty tables + hours collapsed by default, the vertical's colours and day titles, rows shrink to a few px (text clipped / hidden, never scaled), per-table filter list (הוא / אינו / מכיל / לא מכיל / ריק / לא ריק) from the right pane or `Filter_N` lines `Table.Field <op> v1|v2`. |
| `lists-ui/` | Lists UI («רשימות») | v0.6.5 | Interface extension for working lists: home, list page, compact and dynamic list views, sharing. |
| `people-roles/` | People & Roles («אנשים ותפקידים») | v0.3.5 | Phone book plus people/role/assignment editing with duplicate-phone warnings and undo. |
| `bulk-sheet/` | Bulk sheet («קופי פייסט - הזנה מרובה») | v0.5.5 | Spreadsheet-style copy-paste bulk entry into a table, in batches. |
| `hospitality/` | Hospitality glass | v1.0.0 (package) | Read-only hospitality view: one lens at a time (day / person), no writes. Not wired to Extension_Config yet. |
| `config/status-panel/` | Shared «מצב חיבור» status panel + mapping panel + inline config editor | v5 (scored row matching: aliases, token/contains, primary / Display_Name / GitHub_URL fallback when Extension is hidden, any Variant when no empty one; the panel always lists the seen rows with their score) | `StatusPanel.tsx` + `MappingPanel.tsx` + `ConfigEdit.tsx` + `statusCore.ts` (+ test), byte-identical in all five extensions. Right-pane toggles (all default OFF): «show מצב חיבור · Extension_Config», «show mapping · Extension_Config.Attachment_Mapping_Image», «עריכה ישירה · Extension_Config» (writes only the matched config row's cell, permission-checked, 6 s undo). v4: very loose Extension / Variant matching; when no row matches, the panel lists the Extension and Variant values it sees and whether those fields are visible. |
| `config/` | Extension_Config | design v3 (hook v4.1) | Table design, Omni prompts (create v4 + populate v4 per extension), the DEMO CSV, and the shared `useExtensionConfig.ts` hook (v3.4: read-only `Attachment_Mapping_Image` (fallback `Mapping_Image`) / `GitHub_URL` extras outside the 269-slot order; loose Extension / Variant matching). |
| `maps/` | Config maps | 2026-10-10 | `<slug>-config-map.png` per extension (incl. `timeline-horizontal-days-config-map.png`) + `GALLERY-2026-10-10.png/.pdf`. Each extension folder also has its own `config-map.png`. Maps were refreshed on 2026-10-10 for the status-panel and mapping-panel releases; `GALLERY-2026-10-10` predates them. |

Block ids, base credentials and Airtable CLI state (`.block/`, `.airtableblocksrc.json`) are deliberately **not** in this repo.

## How configuration works

Every wired extension resolves each setting in this order:

1. **Right pane** — the extension's custom properties on the interface page.
2. **`Extension_Config` table** — the row whose `Extension` matches the extension's slug (a `Variant` row first, then the default row). Empty cells fall through.
3. **Code default** — the value built into the extension.

If the `Extension_Config` table is missing, the extension behaves exactly as it did before config existed. The hook is read-only by default (writes are opt-in and off). The config maps in `maps/` show which on-screen element is driven by which `Extension_Config` cell.

## Releases

Releases are not run from GitHub. They are built and released from the festival laptop with the Airtable blocks CLI (`block release`). This repo is the source of record and history; there is no CI release pipeline.

## Local development

```
cd <extension-folder>
npm install
npx block run      # needs your own .block/remote.json + .airtableblocksrc.json (not in the repo)
```
