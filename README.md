# CSF custom Airtable extensions

Source code for the Cinema South Festival (CSF) custom Airtable extensions, one folder per extension, plus the shared `Extension_Config` design and the config maps.

| Folder | Extension | Version | What it does |
|---|---|---|---|
| `countdown-homescreen/` | Countdown homescreen | v0.4.5 | Home-screen countdown to the festival with live record-count pills (per-pill filters) and a «מצב חיבור» connection-status panel. |
| `timeline/` | Timeline | v0.2.8 | Multi-table festival timeline: columns per table, drag-create / move / resize with undo, cross-section window + band (time snaps to 5 min) (names only, vertical when crowded), identical per-column header controls (⠿ · filter · ⇤ · ⋯ · ✕). |
| `lists-ui/` | Lists UI («רשימות») | v0.6.1 | Interface extension for working lists: home, list page, compact and dynamic list views, sharing. |
| `people-roles/` | People & Roles («אנשים ותפקידים») | v0.3.1 | Phone book plus people/role/assignment editing with duplicate-phone warnings and undo. |
| `bulk-sheet/` | Bulk sheet («קופי פייסט - הזנה מרובה») | v0.5.1 | Spreadsheet-style copy-paste bulk entry into a table, in batches. |
| `hospitality/` | Hospitality glass | v1.0.0 (package) | Read-only hospitality view: one lens at a time (day / person), no writes. Not wired to Extension_Config yet. |
| `docs/program-by-day/` | «פרוגרמה - לפי יום» (Omni page) | – | Not a custom extension: the Omni prompt and config map that wire the Omni-built page to Extension_Config. |
| `config/status-panel/` | Shared «מצב חיבור» status panel | v1 | `StatusPanel.tsx` + `statusCore.ts` (+ test): the connection-status panel shared by countdown, timeline, lists-ui, people-roles and bulk-sheet — shows whether Extension_Config and its row were found, and per element which table/field/filter resolved and how many records match. Toggled from the right pane. |
| `config/` | Extension_Config | design v3 | Table design, Omni prompts (create + populate), the shared `useExtensionConfig.ts` hook, `SHARED-UI-TOKENS.css`, populate CSVs. |
| `maps/` | Config maps | 2026-10-10 | `<slug>-config-map.png` per extension + `GALLERY-2026-10-10.png/.pdf`. Each extension folder also has its own `config-map.png`. Maps were refreshed on 2026-10-10 for the status-panel releases; `GALLERY-2026-10-10` predates them. |

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
