# Config map — Omni page «פרוגרמה - לפי יום» (program-by-day, Variant `by-location`) — MAP ONLY

- **Page:** DEMO `appiN9MrP73g6R9hi` · page `pagPs4kng0DiKgxrl` · custom element `<block-id-redacted>`, built by Omni (Airtable AI), so the code isn't ours.
- **How it gets wired:** the owner pastes `program-by-day-OMNI-PROMPT.txt` into Omni on that page. It reads the row and never writes to Extension_Config.
- **Screenshot:** `program-by-day-config-map.png`, an annotated layout diagram on the **real** DEMO screenshots from `/workspace/evidence-program-hide-empty-2026-10-09/` (09.10 16:17). Panel 1 = viewer, panel 2 = editor right pane (custom properties).
- **Rows:** `Extension = program-by-day`. The default row is shared with the future `timeline` variant (design §4.1). The `by-location` row is the live page.
- **Precedence (the owner):** right pane (the page's custom properties) → `by-location` cell → default-row cell → Omni's current code default.
- **Table absent / not enabled:** the page behaves as today, with **one intended change**: «הסתר מיקומים ריקים» (Toggle_1) starts **ON**, as the owner asked.

## Elements → slots

| # | Element (live label) | Slot | Code default (today) | Proposed `by-location` row value |
|---|---|---|---|---|
| — | Page name «פרוגרמה - לפי יום», page buttons «משבצת חדשה» / «לוקיישן חדש», page filter bar | Airtable page (Interface Designer), **not the extension**, no slot | — | — |
| 1 | Toggle «הסתר מיקומים ריקים» | `Toggle_1` + `Toggle_Label_1` | **ON (new)** · label «הסתר מיקומים ריקים» | ☑ · «כווץ עמודות ריקות» |
| 2 | Toggle «כווץ משבצות ריק» | `Toggle_2` + `Toggle_Label_2` | ON · «כווץ משבצות ריק» | ☑ · «כווץ שעות ריקות» |
| 3 | Dropdown «צבע לפי» | `Dropdown_1` / `Dropdown_Label_1` / `Dropdown_Default_1` + `Option_List_1` | סוג ארוע | label «צבע לפי»; list `Slots_Events.Type \| סוג משבצת`, `Slots_Events.Project \| פרויקט`, …; default `Slots_Events.Type` |
| 4 | Dropdown «ערכת צבעים» | `Dropdown_2…` + `Option_List_2` | ברירת מחדל | as today |
| 5 | Dropdown «סקאלת זמן» | `Dropdown_3…` + `Option_List_3` | 30 דקות | label «רזולוציה»; `15 \| 15 דקות`, `30 \| 30 דקות`, `60 \| שעה`; default `30` |
| 6 | Dropdown «גודל טקסט» | `Dropdown_4…` + `Option_List_4` | רגיל | `קטן`, `רגיל`, `גדול`; default רגיל |
| 7 | Dropdown «תצוגה שנייה» | `Dropdown_5…` + `Option_List_5` | פרויקט | פרויקט / מיקום / אזור |
| 8 | Dropdown «יום» | `Dropdown_6` (= `Festival Days`) + `Dropdown_Default_6` | first day (Sun 01.11) | source `Festival Days` |
| 9 | Axis header «שעה» | `Table_Heading_1` | שעה | — |
| 10 | Legend (Type → colour) | `Option_List_9` override, `Heading_5` title | Airtable select colours, no title | empty |
| 11 | Columns = Locations | right pane `Locations` → `Source_Table_4`; `Location` → `Source_Field_4` | Locations / Slots_Events.Location | — |
| 12 | Hidden filters | `Filter_6` (Start not empty), `Filter_7` (Type is not למחיקה \| לא מוגדר / לא לשבץ) | none | optional, the owner decides |
| — | Search / empty state (if the page has them) | `Helper_Text_1` / `Empty_State_Text_1` | as in Omni code | — |

## Shared with the future `timeline` variant (shown under «Not on this screen» in the PNG; this page doesn't have them today)

`Helper_Text_1` search · `Empty_State_Text_1` «אין פריטים שתואמים לסינון» · `Heading_1` day banner `יום {n} · {weekday} {date}` · `Heading_2–4` הכנות / פסטיבל / פירוק וסיכום · `Filter_1` מיקום = Slots_Events.Location · `Filter_4` סטטוס = Slots_Events.Status (labels `Option_List_7`) · `Color_1–3` festival / prep / wrap-up · `Date_1–2` programme range. The Omni prompt asks Omni to use only the search and empty-state slots, and only if the page already has them.

## Right pane (custom properties) → fallback slots

| Pane property (live value) | Slot (used only when the pane is empty) |
|---|---|
| Events (Slots_Events) | `Source_Table_1` |
| Tasks (Tasks) | `Source_Table_2` |
| Projects (Projects) | `Source_Table_3` |
| Locations (Locations) | `Source_Table_4` |
| Area (Areas) | `Source_Table_5` |
| Start / End | `Source_Field_1` / `Source_Field_2` |
| Project · Location · פערים (Checklist_content) · Day field (**None**) · Event type (Type) | `Source_Field_3` · `_4` · `_5` · `_6` (= `Slots_Events.Festival Days`, fixes the None) · `_7` |
| NEW: configTable / configSlug / configVariant | added by the Omni prompt (defaults: table named Extension_Config, `program-by-day`, `by-location`) |

## Didn't fit / notes

- **Toggle inheritance:** a checkbox has no «empty» state, so a variant row can't say «inherit». The Omni prompt uses this rule: a row's `Toggle_N` counts only when that row's `Toggle_Label_N` is filled. Our hook uses the row's `Slot_Map` instead, which Omni doesn't write. Both work in v3. A v4 «ON/OFF/(inherit)» single-select would make it explicit, but it isn't needed.
- **Day field is None** on the live element, so «יום» works only through Omni's own fallback. Setting `Source_Field_6` or the pane fixes it.
- Omni's in-page labels («סוג ארוע» spelling, «סקאלת זמן») stay as they are until the row says otherwise.
