# Config map — Hospitality «אירוח» (hospitality) — MAP ONLY

- **Source:** `C:\CSF\csf-hospitality\frontend\index.js` on DESKTOP-NB7SGA8. Read-only; a byte copy is at `/workspace/csf-hospitality-readonly/frontend/index.js` (MD5 `e256636c…7031`, same as the laptop file). This is a legacy base extension (`@airtable/blocks/ui`, React 16, `package.json` 1.0.0). It reads every table and field **by name** and never writes.
- **Status:** **not wired.** Our `useExtensionConfig` is built on the interface SDK (`@airtable/blocks/interface/*`), so wiring needs a port first (see the end of this file).
- **Screenshot:** `hospitality-config-map.png`. The real source is rendered in the box harness with a fake legacy UI kit (`harness/sdk-legacy-ui.tsx`, approximate Airtable look) and a fictional fixture. Panel 1 = lens «יום». Panel 2 = a row clicked, which keeps the day and person, then lens «נסיעות».
- **Proposed row:** `Extension = hospitality`, Variant empty. Precedence after a port: right pane → row → code default.

## Elements → proposed slots

| # | Element | Slot | Code default |
|---|---|---|---|
| 1 | Title | `Title` | אירוח |
| 2 | Subtitle | `Heading_1` | פילוח אחד על המסך. היום והאדם נשארים. |
| 3–8 | Lens buttons (shown as `{label}`; braces = code) | `Tab_Label_1–6` | יום · אנשים · שיבוץ · אוכל + שתיה · לינה · נסיעות |
| 3–8 | Lens tables | `Source_Table_1–6` (right pane first after a port) | Itinerary · People · Staffing · Vouchers · Lodging · Trips |
| 9 | Context label | `Content_Text_1` | הקשר: |
| 10 | Day chip (empty) | `Tab_Label_7` | כל הימים (filled = DATA, the picked day) |
| 11 | Person chip (empty) | `Tab_Label_8` | כל האנשים (filled = DATA, the picked name) |
| 12 | Clear button | `Button_Text_1` | נקה |
| 13 | Search placeholder | `Helper_Text_1` | [חיפוש] |
| 14 | Status chips | `Option_List_1` (`all \| הכל`, `planned \| מתוכנן`, `done \| בוצע`) | הכל · מתוכנן · בוצע |
| 15 | Count line | `Content_Text_2` | `{n} רשומות · {table}` |
| 16–17 | Card title / subtitle | DATA. Field lists per lens: see below (`Advanced_JSON` «lenses») | — |
| — | «More» line | `Content_Text_3` + `Number_1` | `עוד {n} — צמצם בחיפוש`, cap 80 |
| — | Empty state | `Empty_State_Text_1` | אין תוצאות לפילוח הזה |
| — | Missing table | `Error_Text_1` | `טבלה חסרה: {table}` |
| — | Nameless person | `Content_Text_4` | (בלי שם) |
| — | Done / not-done words | `Option_List_2` (`Vouchers \| ניתן \| מתוכנן`, `Staffing \| בוצע \| מתוכנן`, `Trips \| מתואם \| לא מתואם`) | as listed |

## Field references per lens (31 refs, today hard-coded by name)

| Lens | Title fields | Subtitle fields | Day field | Person link(s) | Done field |
|---|---|---|---|---|---|
| יום · Itinerary | Day · Guest · Pickup Address | Drop off Address · Roles (from Assignments) (from Guest) | Day | Guest | — |
| אנשים · People | Full Name | Phone_Personal · Email_Personal | — | (the record) | — |
| שיבוץ · Staffing | Type · People (from Assignments) · Status | Done · Slots_Events · Roles (from Assignments) | — | Guest/Person | Done |
| אוכל + שתיה · Vouchers | Voucher type · Meal · Person (else Voucher number) | Given · Date Given · Count | Date Given | Person | Given |
| לינה · Lodging | Hotel · Guest · Check-in date | Check-in date · Check-out date · Cost per Night | Check-in date | Guest | — |
| נסיעות · Trips | Mode · To or From · Guest (from Itinerary) | מתואם · Day (from Itinerary) · Pickup Time Morning | Day (from Itinerary) | — | מתואם |

**Doesn't fit v3 as plain slots:** 31 field refs > `Source_Field_1–20`, and they're grouped per lens. Proposal (no schema change): an `Advanced_JSON` key `"lenses"` = `[{"table","label","title":[Table.Field…],"subtitle":[…],"day","person":[…],"done"}]`, with `Tab_Label_N` / `Source_Table_N` as the simple overrides.

## Privacy note (keep in code after a port)

The «אנשים» lens shows **Phone_Personal · Email_Personal** in every card subtitle. The Lists extension hides those fields by rule (deny-lists). A port should decide in code, not in a config cell, whether hospitality keeps showing them.

## What a port to the interface SDK needs (prerequisite for wiring)

1. **New block.** An interface extension is a different block type from this base extension. Create a new Custom-extension element on the hospitality page («Build a new extension») and use a new folder (e.g. `C:\CSF\csf-hospitality-interface`). Keep `C:\CSF\csf-hospitality` and its `.airtableblocksrc.json` / `.block/remote.json` untouched.
2. **SDK swap:** `@airtable/blocks/ui` → `@airtable/blocks/interface/ui` + `/interface/models`, `initializeBlock({interface: () => <App/>})`, React 16 → 19, TypeScript + the eslint/tsconfig used by the other extensions.
3. **UI kit:** the interface SDK has no `Box` / `Button` / `Text` / `Input`. Replace them with plain HTML + CSS (`SHARED-UI-TOKENS.css`). That's about 15 call sites.
4. **Data access:** an interface extension sees only the tables and fields enabled on the element. Replace `base.getTableByName(...)` with custom-properties table pickers for the 6 lens tables (right pane first), plus `configTable`. Every field listed above must be enabled on the element. Keep the safe by-name `asText` fallbacks, and remove the `useRecords(base.tables[0])` hack (call hooks unconditionally on a picked table or null).
5. **Then wire:** `cfg.ts` + `useExtensionConfig.ts` with the slots above, an identity test against a render of the ported v1 (not against the legacy one, since the UI kit changes the DOM), and a labelled map.
6. **Estimate:** a port is about half a day, plus wiring and tests about 2 hours. Nothing has been started.
