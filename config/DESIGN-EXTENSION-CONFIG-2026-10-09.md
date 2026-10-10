# Extension_Config — shared config table for ALL CSF custom extensions (design v3, 2026-10-09)

Status: DESIGN ONLY. Nothing created in Airtable. Schema change → this doc is also the Ontology spec; the owner (or Ontology) pastes `OMNI-PROMPT-EXTENSION-CONFIG.txt` into Omni on PROD. **v3 replaces the v2 prompt — do not paste v2.**
v3 = UX Critic's config-fit review of the timeline (`CRITIC-CONFIG-FIT-TIMELINE-2026-10-09.md`): schema gaps fixed (toggle labels, filter/dropdown/option-list room, `@me`, multi-field filters, Advanced_JSON filter map, optional icon); UI-level points mapped in §4 (timeline = two Variant rows).
v2 = the owner's feedback ("a config table for MANY extensions to come, and maybe previous ones too"): his stencil + two doors + Toggle default / Dropdown_N / Filter_N with label / `Table.Field`.
Backups: v2 → `OMNI-PROMPT-EXTENSION-CONFIG-v2.txt`, `DESIGN-…-v2.md.bak`, `useExtensionConfig-v2.ts.bak`, `gen_prompt-v2.py`, `test-useExtensionConfig-v2.cjs`. v1 → `*-v1*`.
Files: `gen_prompt.py` (single source → prompt; asserts the field order equals the hook's `FIELD_ORDER`), `test-useExtensionConfig.cjs` (count/order, Table.Field parser, Option_List incl. blank icon, tokens, Advanced_JSON schema, @me matching).
Helper: `useExtensionConfig.ts` v3 — `tsc --strict` clean against BOTH SDKs (0.0.0-experimental-8575f0e0d-20260428 countdown/phone book, 0.0.0-experimental-3c2a2d775-20260807 Lists), eslint clean (countdown config), unit checks pass (269 fields).

## 0. What changed in v3 (218 → 269 fields)

| Change | Fields | Why (Critic §) |
|---|---|---|
| **Toggle_Label_1–10** (single line), right after Toggle_1–10 | +10 | Toggle_N held only the default; no label slot. Rule now matches dropdowns/filters: label empty = not shown, Toggle_N is a fixed setting. Frees Content_Text_11–15 (Critic's fallback rule would have used all of them). |
| **Filter_6–10** (×4: field, operator, value, label) | +20 | Timeline needs 4 shown + «רק שלי» + 4 hidden fixed filters = 9 > 5. **Decision: grow to 10 instead of pushing overflow to JSON** — a hidden filter is exactly what the owner should be able to read and edit in a cell; JSON is fragile for non-coders. JSON `filters` stays only as overflow beyond 10. |
| **Me_Field** (single line, `Table.Field`) | +1 | «רק שלי» needs a "current user" → person mapping, per row (e.g. `People.User`). Using Source_Field_1 would clash with each extension's own meaning. |
| **Dropdown_6–10** (×3: source, label, default) | +15 | The live «פרוגרמה - לפי יום» page already has 6 dropdowns (צבע לפי, ערכת צבעים, סקאלת זמן, גודל טקסט, תצוגה שנייה, יום). |
| **Option_List_6–10** | +5 | Dropdown_N pairs with Option_List_N, so lists 1–5 were half-taken; the timeline also needs a 13-table list, a status map and quick jump times. |
| Option_List: **colour and icon parts optional; blank = render nothing** (no placeholder dot/emoji); trailing `\|` ok; several values may share a label (status map) | 0 | the owner: no icons on the timeline. Hook: `parseOptionList`, `optionLabel`. |
| Filter_N: **several fields joined by `\|`** (one per table) | 0 | Facets cross 13 tables. A record is tested against its own table's part; tables not named are kept (`unmatched: keep`) unless `filterMap` says `hide`. The hook never follows links — add a lookup field in the table and name it. |
| Filter_Value_N: **tokens** `@me`, `@today`, `@now`, `@Date_N` with optional `±Nd/±Nh/±Nm` | 0 | «רק שלי» and the programme-range hidden filter (`@Date_1-1d`). An unresolvable date token switches that filter off (never "match nothing"). |
| Advanced_JSON: **documented keys `filters` and `filterMap`** | 0 | Overflow beyond Filter_10 and per-filter extra fields / unmatched rule. Bad keys are ignored and reported in Sync_Note. |
| Hook: `filters()` returns `refs`, `refFor(table)`, `unmatched`, `me`, expanded `values`, `from`; new `toggleSpec(n)`, `meRef()`, exports `splitRefs`, `expandToken`, `isMeToken`, `parseAdvancedJson`, `meRecordIds`, `optionLabel` | — | |

Not changed on purpose: Source_Table stays 10 (a table list goes in an Option_List, which also carries label + colour); no "Toggle↔Filter gating" field (a toggle that switches a hidden filter is wired in the extension and written in Slot_Map — see timeline Toggle_5/Filter_5); per-user UI state (closed columns, toggle flips) is not config.

## 1. Survey — every kind of setting the extensions need

| Extension | How it's configured today | Hard-coded things a config row could own |
|---|---|---|
| Lists (lists-ui-ext v0.5.18) | right pane: 7 table pickers + 16 `extraTableN` + `mode` enum (full/record/mine) + `recordTable` + `recordId`; `List_Sources` table (Field 1..6 + labels, Active, Sort) | tab labels הכל/שלי/משותפות איתי/ציבוריות; «+ רשימה חדשה» & other buttons; empty states («אין פריטים.», «אין כרגע פריטים תואמים.»); denied-messages (CREATE/DELETE_DENIED_HE); PRIVATE_NOTE / PRIVACY_LINE; TABLE_HE (table → Hebrew name + icon); 6 cover gradients; filter operator words (OP_HE); compact limit 6; MAX_FIELDS 6; toast/undo timings; SENSITIVE/HARD_DENY lists |
| Phone book (people-roles-ext v0.2.3) | People/Roles/Assignments pickers + `assignmentPartnerField` field picker | 7 column headers (שם/תפקיד/טלפון אישי/אימייל אישי/טלפון תפקיד/אימייל תפקיד/גוף שותף); UNDO_TIP; placeholders («בחר שם / צור שם חדש», «החלפה לאדם הזה בלבד…»); button «חזרה לגוף השותף של התפקיד»; 10-min undo window; phone display format (Critic nit) |
| Bulk sheet (csf-bulk-sheet) | People/Roles/Assignments pickers | 7 COL_LABELS; dup-phone/dup-email tips; START_ROWS 20, BATCH 50; English field fallbacks (Full Name, Phone_Personal, …); confetti colours |
| Countdown (csf-countdown v0.2.0, unreleased) | none | Title; phase lines (עד תחילת / עד סוף / הסתיים); unit labels; tile labels; Tickets/Invitations/Slots_Events; Start/End/Status aliases; status משובץ; first day 31.10; fallback date; error lines; colours; Critic: «X מתוך Y» totals, seconds in last 60 min |
| Hospitality (C:\CSF\csf-hospitality, laptop, read-only; legacy `@airtable/blocks/ui`, by-name, read-only) | none | Title «אירוח» + subtitle; 6 lenses = label + table (יום/Itinerary, אנשים/People, שיבוץ/Staffing, אוכל + שתיה/Vouchers, לינה/Lodging, נסיעות/Trips); per-lens done field (Vouchers.Given, Staffing.Done, Trips.מתואם), day field, person field, title/subtitle field lists; status chips הכל/מתוכנן/בוצע; context chips «כל הימים»/«כל האנשים»/«נקה»; placeholder «[חיפוש]»; empty «אין תוצאות לפילוח הזה»; error «טבלה חסרה:»; row cap 80 |
| Omni page «פרוגרמה - לפי יום» (DEMO, Omni-built) | custom props: tables Events=Slots_Events, Tasks, Projects, Locations, Areas; fields Start, End, Area, Project, Location, פערים=Checklist_content, Day field, Event type=Type | in-page toggles «הסתר מיקומים ריקים» (the owner wants default ON), «כווץ משבצות ריק»; dropdowns צבע לפי (סוג ארוע), ערכת צבעים, סקאלת זמן (30 דקות), גודל טקסט (רגיל), תצוגה שנייה (פרויקט), יום (Sun 01.11); legend event type → colour (~18) |

Kinds of setting found → slot group that holds them:
1. Visible text: titles, headings, column headers, tab/chip labels, buttons, placeholders, tooltips, empty states, errors → **Texts + Interface texts**.
2. Table bindings → **Source_Table**; field bindings → **Source_Field** (`Table.Field`).
3. Fixed filters / in-page filters with a label, sorting → **Filter_N group, Sort_N**.
4. In-page dropdowns (choices from a table, a field, or a fixed list) and fixed modes (Lists `mode`, phone format) → **Dropdown_N group + Option_List**.
5. Value → label/colour/icon maps (event-type legend, TABLE_HE, statuses like משובץ) → **Option_List** (`ערך | תווית | צבע | אייקון`).
6. Theme colours, icons → **Color, Icon**. Logos/links → **Attachment, URL**.
7. Dates, numbers, limits, targets («מתוך Y»), durations (time scale, undo window) → **Date, Number, Goal, Duration**.
8. Toggle defaults → **Toggle** (checked = starts ON).
9. One extension on several pages/modes → **Variant** row.
10. Anything structured/rare (hospitality per-lens title-field lists) → **Advanced_JSON**.
Kept in code on purpose: security deny-lists (Lists SENSITIVE/HARD_DENY/DENIED_COND_CHOICES) — an editable cell must not be able to unhide phones/emails.


## 2. Table `Extension_Config` — 269 fields in 12 groups

| # | Group | Fields | Count | Type |
|---|---|---|---|---|
| 1 | Identity & control | Extension (primary), Variant, Display_Name, Block_ID, Use_Defaults_Only, Owner | 6 | text ×4, checkbox, collaborator |
| 2 | Texts — the owner's stencil | Title; Heading_1–5; Table_Heading_1–10; Helper_Text_1–10; Content_Text_1–15 | 41 | single line / long text |
| 3 | Interface texts | Tab_Label_1–10; Button_Text_1–10; Empty_State_Text_1–5; Error_Text_1–5 | 30 | single line / long text |
| 4 | Sources | Source_Table_1–10; Source_Field_1–20 | 30 | single line (`Table.Field`) |
| 5 | Filters & sort | ×10: Filter_N, Filter_Operator_N, Filter_Value_N, Filter_Label_N; ×2: Sort_N, Sort_Direction_N; Me_Field | 45 | text + single selects |
| 6 | Dropdowns & option lists | ×10: Dropdown_N, Dropdown_Label_N, Dropdown_Default_N; Option_List_1–10 | 40 | single line / long text |
| 7 | Look | Color_1–10 (hex); Icon_1–10 (emoji/text) | 20 | single line |
| 8 | Links & media | URL_1–5; Attachment_1–3 | 8 | URL / attachment |
| 9 | Values | Date_1–5; Number_1–10; Goal_1–5; Toggle_1–10; Toggle_Label_1–10; Duration_1–3 | 43 | date+time IL / number / integer / checkbox / single line / duration h:mm |
| 10 | Advanced | Advanced_JSON | 1 | long text |
| 11 | Code-owned | Slot_Map, Code_Version, Last_Synced, Sync_Note | 4 | long/single/date |
| 12 | Free | Notes | 1 | long text |
| | **Total** | | **269** | (Airtable limit 500) |

Ideas evaluated (v2, still valid):
- **Variant — added.** Lookup = Extension + Variant. Empty Variant = default row. Read order per cell: variant cell → default-row cell → code default.
- **Environment (PROD/DEMO) — rejected.** Each base has its own Extension_Config.
- **Active — rejected; Use_Defaults_Only kept** (blank must mean "use the row").
- **Source_Table 10 (not 20)**; Source_Field 20. **Field_Label_N — dropped.** **Link fields — not added** (name-based, portable).

Conventions (in the descriptions and in the helper):
- **`Table.Field` everywhere**: `Slots_Events.Status`. Field alone = in the slot's own table (Source_Field_N → Source_Table_N; filters/sorts/dropdowns → Source_Table_1). Ids accepted. Loose match; dotted names work.
- **Multi-field** (Filter_N only): `Slots_Events.Location | Staffing.Location (from Slot)` — one part per table.
- **Toggle_N** = default state (checked = starts ON); **Toggle_Label_N** = its label; label empty = not shown, fixed. User flips are remembered (`initialToggle`).
- **Labels everywhere**: Filter_Label_N / Dropdown_Label_N / Toggle_Label_N empty = hidden fixed setting.
- **Value tokens** in Filter_Value_N: `@me`, `@today` (00:00 Israel), `@now`, `@Date_N`, each with optional `±Nd|h|m`. Several values with `|`: is/contains = any; is not/does not contain = none.
- **`@me`**: on a collaborator field → the signed-in user directly; on a link/text field → the person records whose **Me_Field** is the signed-in user (collaborator id or email). Component: `useRecords(cfg.meRef().table)` → `meRecordIds(records, cfg.meRef().field, session.currentUser)`.
- **Option_List line** `ערך | תווית | צבע | אייקון` — only the value is required; blank label = value; **blank colour/icon = render nothing**; `#` = comment. List N is Dropdown_N's choices when Dropdown_N's source is empty; otherwise free.
- **Advanced_JSON** documented keys (others are per extension, listed in Slot_Map):
```json
{
  "filters":   [{"field": "Tasks.Status", "operator": "is not", "value": "בוטלה|הועברה לאחר", "label": ""}],
  "filterMap": {"1": {"fields": ["Staffing.Location (from Slot)"], "unmatched": "hide"}}
}
```
  `filters` = extra filters after Filter_10 (n = 11…, same rules). `filterMap."N"` = more fields for Filter_N + `unmatched` (`keep` default / `hide`). Broken JSON or bad keys → ignored, reported in Sync_Note.
- Duration stored in seconds. Dates: Israel time for display; code uses the instant.

## 3. The two doors

**Door 1 — table → extension (read, live).** `<ExtensionConfigProvider slug variant …>` reads the default row (Extension = slug, Variant empty) and, if a `configVariant` custom property is set, the variant row. Each cell: variant → default row → code default. Toggles: once a slot is listed in that row's Slot_Map the checkbox is the truth, else the code default. Missing/unenabled tables/fields resolve to null and the extension shows «—», never crashes.

**Door 2 — extension → table (write, when Code_Version changes or the row is missing; needs create+edit).**
1. Default row missing → create it with every code default. Variant row missing → create it with identity only (empty cells inherit), and tick the toggles currently in effect (a checkbox can't be "empty").
2. Existing row → write a default **only if the cell is empty AND the slot is new in this version** (not in the old Slot_Map). A cell the owner emptied on purpose stays empty.
3. **Never overwrite a non-empty cell.**
4. Rewrite only code-owned fields: Slot_Map, Code_Version, Last_Synced, Sync_Note (lists unenabled fields and broken Advanced_JSON); Block_ID only if empty. Never writes Owner, Notes, Attachments, Use_Defaults_Only.
5. One attempt per row per version per page load; viewers silently skip.

**Limits (tell the owner):** the element must have Extension_Config + all fields enabled (one-time, `configTable` picker), and create+edit for Door 2. Door 2 can add values and rows, **never fields** (an 11th dropdown/filter = a new Omni prompt). Source tables must also be enabled on the element. Two people opening a brand-new extension at the same instant may create two rows → hook reports `duplicate`, uses the first; delete the extra by hand with the owner's OK.
SDK note: older interface SDK (countdown, phone book) crashes on `useRecords(null)`, so the helper is a Provider that only calls `useRecords` with a real table.

## 4. How each existing extension would map

| Extension (slug / variants) | Texts | Sources & refs | Filters / dropdowns / options | Values & look |
|---|---|---|---|---|
| Countdown `countdown-homescreen` | Title «יאללה היידה!»; Heading_1–3 phase lines; Content_Text_1–5 tile labels, 6–8 units, 9 «הפסטיבל חי»; Error_Text_1–2; Empty_State_Text_1 «—» | Source_Table_1 Tickets, 2 Invitations, 3 Slots_Events; Source_Field_3–5 Slots_Events.Status/Start/End | Option_List_1 «משובץ» | Date_1 fallback 24.10 20:00, Date_2 first day 31.10; Goal_1–5 «מתוך Y»; Duration_1 60 min seconds window; Toggle_1 seconds in last hour; Color_1 crimson #dc043b (brand), Color_2 bg #f5f5f7 (shared tokens, see `SHARED-UI-TOKENS.css`); Toggle_Label_1 empty = no in-page seconds switch |
| Lists `lists-ui` + Variants `mine`, `record` | Title «רשימות»; Tab_Label_1–4 הכל/שלי/משותפות איתי/ציבוריות; Button_Text («+ רשימה חדשה», add/delete); Empty_State_Text_1–3; Error_Text_1–3 (create/delete denied, missing fields); Helper_Text_1–2 PRIVATE_NOTE/PRIVACY_LINE | right-pane pickers + List_Sources stay (they grant access) | Dropdown_1 (no label) default `full`/`mine`/`record` = mode per Variant; Option_List_1 table → Hebrew + icon (TABLE_HE); Option_List_2 gradients | Number_1 compact limit 6, Number_2 max fields 6; Duration_1–2 toast/undo |
| Phone book `people-roles` | Table_Heading_1–7 columns; Helper_Text_1 undo tip, 2–3 placeholders; Button_Text_1 «חזרה לגוף השותף של התפקיד»; Error_Text_1–2 | Source_Field_1 Assignments.Partners 2 (per-person partner; picker stays) | Dropdown_1 (no label) phone format — Critic nit | Duration_1 undo 10 min |
| Bulk sheet `bulk-sheet` | Table_Heading_1–7 columns; Helper_Text_1–2 dup tips; Content_Text status labels | Source_Field_1–7 People.Full Name, People.Phone_Personal, Roles.Role, … | — | Number_1 start rows 20, Number_2 batch 50; Option_List_1 confetti colours |
| Hospitality `hospitality` | Title «אירוח»; Helper_Text_1 subtitle, 2 «[חיפוש]»; Tab_Label_1–6 lenses; Button_Text_1–4 הכל/מתוכנן/בוצע/נקה; Content_Text («כל הימים», «כל האנשים», «הקשר:», ניתן/בוצע/מתואם…); Empty_State_Text_1; Error_Text_1 | Source_Table_1–6 Itinerary, People, Staffing, Vouchers, Lodging, Trips; Source_Field_1–6 done fields (Vouchers.Given, Staffing.Done, Trips.מתואם), 7–12 day fields, 13–18 person fields | — | Number_1 row cap 80; Advanced_JSON per-lens title/subtitle field lists. Needs port from legacy `@airtable/blocks/ui` to the interface SDK first |
| Omni «פרוגרמה - לפי יום» `program-by-day`, Variants **`by-location`** (live pagPs4kng0DiKgxrl, columns = Locations) and **`timeline`** (A-v4, columns = tables) | see §4.1 | see §4.1 | see §4.1 | see §4.1. Omni code isn't ours → needs an Omni prompt to read the row |

### 4.1 Timeline page — two Variant rows (from Critic's review; UI-level, no schema needed beyond §0)

One concept, one name (written into the Slot_Map docs): **«כווץ עמודות ריקות»** (replaces הסתר מיקומים ריקים / כווץ טבלאות ריקות ביום), **«כווץ שעות ריקות»** (replaces כווץ משבצות ריק / כווץ זמן ריק), **«רזולוציה»** (replaces סקאלת זמן), **«מיקום»** (replaces Location / מיקום/אולם / מיקומים), **«אדם»** (replaces אדם/צוות — clashes with the צוות table), **«סוג משבצת»** (replaces סוג ארוע; spelling «אירוע» wherever it remains).

Default row (Variant empty) holds what both share; each variant row fills only what differs (empty = inherit).

| Slot | Default row (shared) | `by-location` (live) | `timeline` (A-v4) |
|---|---|---|---|
| Title | — | «פרוגרמה – לפי יום» | «טיימליין» (the owner decides) |
| Heading_1 | day banner pattern `יום {n} · {weekday} {date}` (tokens listed in Slot_Map) | | |
| Heading_2–4 | הכנות / פסטיבל / פירוק וסיכום | | |
| Heading_5 | legend title «מקרא» | | |
| Table_Heading_1 | «שעה» (axis) | | |
| Helper_Text_1 | «חיפוש…» | | |
| Helper_Text_2–5 | — | | 2 res note «כמה זמן רואים במסך אחד…»; 3 «↔ עוקב אחרי הסינון של ציר הזמן…»; 4 «סגור · N פריטים היום · לחצו לפתיחה»; 5 «ריק ביום הזה · לחצו לפתיחה» |
| Content_Text_1–6 | — | | «חתך רוחב», «כל היום», «X מתוך Y», «↔ כמו בציר הזמן», «נקה הכל ✕», «נקה סינון חלון ✕» |
| Empty_State_Text_1–3 | «אין פריטים שתואמים לסינון» | | 2 «אין אירועים מתוזמנים בחתך הזה», 3 «אין פריטים בחלון לפי הסינון שלו» |
| Button_Text_1–4 | — | | «עכשיו», «קפיצה ל…», «קפוץ», «ביטול» |
| Tab_Label_1 | — | | «תצוגה» (menu holding Toggle_2–4) |
| **Toggle_1 / Toggle_Label_1** | ☑ «כווץ עמודות ריקות» (column = location / table) | inherits ☑ — **live page is OFF today → its Omni prompt must read this** | inherits ☑ |
| **Toggle_2 / Toggle_Label_2** | «כווץ שעות ריקות» | ☑ (suggested) | ☐ (suggested — Res controls zoom). **the owner decides.** |
| Toggle_3 / Label_3 | — | | ☑ «חתך רוחב (חלון למעלה)» |
| Toggle_4 / Label_4 | — | | ☑ «↔ כמו בציר הזמן» (window follows timeline filters) |
| Toggle_5 / Label_5 | — | | ☐ «רק שלי» — switches Filter_5 on/off (written in Slot_Map). Window «רק שלי» needs no slot (unlinking copies the timeline state). |
| Dropdown_1 «צבע לפי» | — | source empty → Option_List_1 (`Slots_Events.Type \| סוג משבצת`, `Slots_Events.Project \| פרויקט` …), default `Slots_Events.Type` | not used (colours by table, from Option_List_6) |
| Dropdown_2 «ערכת צבעים» | — | Option_List_2 schemes, default «ברירת מחדל» | not used (theme = Color_1–3) |
| **Dropdown_3 «רזולוציה»** | — | Option_List_3 `15 \| 15 דקות`, `30 \| 30 דקות`, `60 \| שעה`; default `30` (= row scale) | Option_List_3 `60 \| שעה`, `180 \| 3 שעות`, `360 \| 6 שעות`, `720 \| 12 שעות`, `1440 \| יממה`; default `360` (= time per screen). Duration_1 retired. |
| Dropdown_4 «גודל טקסט» | — | Option_List_4 `קטן`, `רגיל`, `גדול`; default רגיל | not used |
| Dropdown_5 «תצוגה שנייה» | — | Option_List_5 (פרויקט / מיקום / אזור); default פרויקט | not used (card sub-line fixed) |
| Dropdown_6 «יום» | — | source `Festival Days` (records); default = first festival day; format «יום א׳ 1.11» | not used — «קפיצה ל…» picker instead (Button_Text_2–4, Date_1–2, Option_List_8) |
| Option_List_6 | — | | 13 tables, `table \| label \| colour \|` (icon blank): `Slots_Events \| משבצות \| #dc043b \|`, `Staffing \| צוות \| #9e1a44 \|`, `Invitations \| הזמנות \| #c4587b \|`, `Itinerary \| מסלולים \| #8a4a74 \|`, `Lodging \| לינה \| #6c5a86 \|`, `Booking Resources \| ציוד \| #5c6b7e \|`, `Tasks \| משימות \| #3e5872 \|`, `Social Posts \| סושיאל \| #cf7790 \|`, `Petty Cash \| קופה קטנה \| #b67a4c \|`, `Requests \| רכש \| #8b6e5b \|`, `transactions \| תשלומים \| #9a6738 \|`, `Notebook \| פגישות \| #7c7381 \|`, `Approvals \| אישורים \| #a9563f \|` (the «טבלאות» picker = multi-select of this list) |
| Option_List_7 | status map, one Hebrew label per value: `Todo \| לביצוע`, `לא התחילה \| לביצוע`, `In progress \| בתהליך`, `בתהליך \| בתהליך`, `Done \| בוצע`, `הושלמה \| בוצע` | | |
| Option_List_8 | — | | quick jump times `09:00 \| בוקר`, `13:00 \| צהריים`, `19:00 \| ערב`, `22:30 \| לילה` |
| Option_List_9 | — | optional legend override `Type value \| label \| colour \|` (empty = Airtable select colours) | |
| Filter_1 «מיקום» | — | `Slots_Events.Location` | `Slots_Events.Location \| <Table>.<location lookup> …` one part per table (**field names to verify**); unmatched via `filterMap` if the owner wants non-located tables hidden |
| Filter_2 «אדם» | — | | person field per table joined with `\|` (to verify) |
| Filter_3 «סרט» | — | | `Slots_Events.Films \| …` (to verify) |
| Filter_4 «סטטוס» | — | `Slots_Events.Status` | `Slots_Events.Status \| Tasks.Status \| …`; labels via Option_List_7 |
| Filter_5 (label empty) | — | | `<person links>` · is · `@me` — applied only while Toggle_5 «רק שלי» is ON |
| Filter_6 (hidden) | `Slots_Events.Start` · is not empty (24 of the 48 live slots have no Start) | | |
| Filter_7 (hidden) | `Slots_Events.Type` · is not · `למחיקה\|לא מוגדר / לא לשבץ` | | |
| Filter_8 (hidden) | `Slots_Events.Start` · is after · `@Date_1-1d` (programme range; first prep day 16.10) | | |
| Filter_9 (hidden) | `Tasks.Status` · is not · `בוטלה\|הועברה לאחר` | | |
| Filter_10 | free | | |
| (no filter) | cancelled slots stay **visible, struck through** — Slot_Map says so | | |
| Me_Field | `People.User` (or the People email field — to verify) | | |
| Source_Table_1–5 | — | Slots_Events, Tasks, Projects, Locations, Areas | People, Films, Festival Days (the 13 timeline tables come from Option_List_6) |
| Source_Field | — | Slots_Events.Start/End/Area/Project/Location/Checklist_content/Type; **Day = `Slots_Events.Festival Days`** (the live element's Day field is None — fix or drop) | |
| Color_1–3 | #dc043b festival · #7d1f3f prep · #4f5466 wrap-up | | |
| Icon_1–10 | — | | empty (no icons) |
| Number_1–3 | — | | 0.2 cross-section band (fraction of screen), 6 max window cards, 30 strip width (px) |
| Date_1–2 | programme range: first day / last day (also «עכשיו» fallback outside the programme) | | |
| Advanced_JSON | — | | optional `{"closedByDefault": []}` (tables that start retracted); column ✕ itself is per-user state, no slot |

Elements to enable on the timeline element: the 13 tables + People, Films, Festival Days + Extension_Config (live element has 15 enabled; missing: Staffing, Invitations, Itinerary, Lodging, Booking Resources, Social Posts, transactions, Approvals, People, Films, Festival Days, Extension_Config).

Shared look with the countdown: tokens in `SHARED-UI-TOKENS.css` (font stack, crimson family, card radius, pill, switch — copied from A-v4). Critic also suggests `font-variant-numeric: tabular-nums` on the A-v4 clock/times.

## 5. Rollout plan (proposed, none done)
1. the owner/Ontology pastes the **v3** Omni prompt on PROD → table + countdown row. Check Omni's reply says 269 fields and 1 record.
2. Countdown next version: add the helper + `configTable`/`configSlug`/`configVariant` custom properties; replace hard-codes; the owner enables Extension_Config (all fields, create+edit) on the element.
3. Phone book, bulk sheet, Lists move their hard-coded Hebrew one by one (right-pane pickers stay). Hospitality after an SDK port.
4. Omni pages: one Omni prompt per page to read its row — start with `program-by-day` / `by-location` (Toggle_1 «כווץ עמודות ריקות» default ON). Rows for `by-location`/`timeline` are added then, not in the seed.

## 6. Omni prompt (same text as OMNI-PROMPT-EXTENSION-CONFIG.txt, generated by gen_prompt.py)

```
Create ONE new table in this base. Do not change, rename, delete or add anything in any other table, field, view, automation or interface.

Table name: Extension_Config
Table description: הגדרות משותפות לכל התוספים המותאמים (Custom extensions) — קיימים ועתידיים. שורה אחת לכל תוסף (Variant ריק = ברירת מחדל) + שורות Variant לעמוד/מצב מסוים. תא ריק = יורש משורת ברירת המחדל / מברירת המחדל שבקוד. שינוי תא מתעדכן במסך מיד. הקוד ממלא רק תאים ריקים של משבצות חדשות ולעולם לא דורס ערך קיים. הפניה לשדה תמיד בכתיב Table.Field.

Rules:
- Field names exactly as written below: English letters, digits and underscores only. No Hebrew, no spaces, no emoji in field names.
- Every Hebrew text below goes into the field DESCRIPTION, not the name.
- In every description, replace N with the field's own number.
- "X_1 to X_10 (10 fields)" means create X_1, X_2, … X_10, all with the same type and description pattern.
- Checkbox fields must be real Airtable Checkbox fields (a checkbox you can tick). Do NOT make them text, "true/false", Yes/No single select, or formulas.
- Long text fields: plain long text, rich text formatting OFF.
- Single select fields: exactly the options listed, nothing more.
- Do not add any extra fields, link fields, lookups, rollups or formulas. Do not add a "Created" or "Status" field.
- Create the fields in exactly the order below, group by group. Total: exactly 269 fields.

Fields (name | type | description):

Group 1 — Identity and control (6 fields):
- Extension | Single line text (PRIMARY field — rename the primary field to this) | מפתח קבוע באנגלית לכל תוסף/מסך, למשל countdown-homescreen. הקוד מחפש את השורה לפי Extension + Variant — לא לשנות אחרי שנקבע
- Variant | Single line text | ריק = שורת ברירת המחדל של התוסף. ערך (למשל mine, timeline, by-location) = גרסה לעמוד/מצב מסוים: תא מלא כאן גובר, תא ריק יורש משורת ברירת המחדל
- Display_Name | Single line text | שם התוסף/המסך בעברית ובאיזה עמוד הוא משמש — לתצוגה בלבד
- Block_ID | Single line text | מזהה התוסף ב-Airtable (blk…). הקוד ממלא אוטומטית אם ריק
- Use_Defaults_Only | Checkbox (real checkbox, green check icon) | מתג חירום. מסומן בשורת ברירת המחדל = כל התוסף חוזר לברירות המחדל שבקוד. מסומן בשורת Variant = השורה הזו נעקפת ומשתמשים בשורת ברירת המחדל
- Owner | User (collaborator), single user, notifications OFF | האחראי/ת על ההגדרות של התוסף. הקוד לא נוגע בשדה

Group 2 — Texts — the owner's stencil (41 fields):
- Title | Single line text | כותרת ראשית של המסך
- Heading_1 to Heading_5 (5 fields) | Single line text | כותרת משנה N — המשמעות בכל תוסף מפורטת ב-Slot_Map
- Table_Heading_1 to Table_Heading_10 (10 fields) | Single line text | כותרת עמודה/טבלה N — ראו Slot_Map
- Helper_Text_1 to Helper_Text_10 (10 fields) | Long text (plain, rich text OFF) | טקסט עזרה N (הסבר קטן, טולטיפ, placeholder) — ראו Slot_Map
- Content_Text_1 to Content_Text_15 (15 fields) | Long text (plain, rich text OFF) | טקסט תוכן N (תוויות, הודעות, פסקאות) — ראו Slot_Map

Group 3 — Interface texts (30 fields):
- Tab_Label_1 to Tab_Label_10 (10 fields) | Single line text | תווית לשונית / כפתור בחירה N — ראו Slot_Map
- Button_Text_1 to Button_Text_10 (10 fields) | Single line text | טקסט כפתור N — ראו Slot_Map
- Empty_State_Text_1 to Empty_State_Text_5 (5 fields) | Long text (plain, rich text OFF) | הודעה כשאין מה להציג N — ראו Slot_Map
- Error_Text_1 to Error_Text_5 (5 fields) | Long text (plain, rich text OFF) | הודעת שגיאה N — ראו Slot_Map

Group 4 — Sources (30 fields):
- Source_Table_1 to Source_Table_10 (10 fields) | Single line text | טבלת מקור N: שם טבלה מדויק באנגלית (או tbl…). הטבלה חייבת להיות מאופשרת גם בחלונית הימנית של האלמנט
- Source_Field_1 to Source_Field_20 (20 fields) | Single line text | שדה מקור N. כתיב אחיד: Table.Field (שם טבלה, נקודה, שם שדה — למשל Slots_Events.Status). מותר גם מזהים tbl…/fld…. שם שדה בלי טבלה = שדה בתוך Source_Table_N (או Source_Table_1 מעל 10). השדה חייב להיות מאופשר באלמנט

Group 5 — Filters and sort (45 fields):
- Repeat for N = 1 to 10, in this order per N (40 fields): Filter_N, Filter_Operator_N, Filter_Value_N, Filter_Label_N
    - Filter_N | Single line text | שדה לסינון N. כתיב אחיד: Table.Field (שם טבלה, נקודה, שם שדה — למשל Slots_Events.Status). מותר גם מזהים tbl…/fld…. שדה בלי טבלה = בתוך Source_Table_1. מסנן שחוצה טבלאות: כמה שדות מופרדים ב-«|», שדה אחד לכל טבלה (למשל Slots_Events.Location | Staffing.Location). רשומה נבדקת לפי השדה של הטבלה שלה; טבלה שלא מופיעה — הרשומות שלה נשארות (אפשר לשנות ב-filterMap שב-Advanced_JSON). הקוד לא עובר דרך קישורים — לשדה מטבלה מקושרת מוסיפים שדה lookup
    - Filter_Operator_N | Single select with exactly these options: is, is not, contains, does not contain, is empty, is not empty, is before, is after, greater than, less than, is checked, is not checked | אופרטור לסינון N (ריק = is)
    - Filter_Value_N | Single line text | ערך לסינון N. כמה ערכים — מפרידים בקו אנכי «|»: is / contains = אחד מהם, is not / does not contain = אף אחד מהם. אסימונים: @me = המשתמש המחובר (ראו Me_Field), @today, @now, @Date_N (התאריך משדה Date_N), אפשר עם הזזה: @Date_1-1d, @now+2h. כשיש Filter_Label_N זה ערך ההתחלה של המסנן במסך
    - Filter_Label_N | Single line text | תווית המסנן N במסך. ריק = מסנן קבוע ומוסתר (תמיד פועל)
- Repeat for N = 1 to 2, in this order per N (4 fields): Sort_N, Sort_Direction_N
    - Sort_N | Single line text | שדה למיון N. כתיב אחיד: Table.Field (שם טבלה, נקודה, שם שדה — למשל Slots_Events.Status). מותר גם מזהים tbl…/fld…
    - Sort_Direction_N | Single select with exactly these options: asc, desc | כיוון מיון N (ריק = asc)
- Me_Field | Single line text | איך מזהים את «אני» עבור @me: Table.Field של שדה משתמש (collaborator) או אימייל בטבלת האנשים, למשל People.User. מסנן @me על שדה משתמש משווה ישירות; על קישור לטבלה הזו — לרשומות שהשדה שלהן הוא המשתמש המחובר

Group 6 — Dropdowns and option lists (40 fields):
- Repeat for N = 1 to 10, in this order per N (30 fields): Dropdown_N, Dropdown_Label_N, Dropdown_Default_N
    - Dropdown_N | Single line text | מקור הבחירות של תפריט נפתח N: שם טבלה = הרשומות שלה; Table.Field = האפשרויות/הערכים של השדה; ריק = השורות של Option_List_N
    - Dropdown_Label_N | Single line text | תווית התפריט הנפתח N במסך. ריק = לא מוצג, ו-Dropdown_Default_N הוא הגדרה קבועה
    - Dropdown_Default_N | Single line text | הבחירה ההתחלתית בתפריט N (שם רשומה / אפשרות). המשתמש יכול לשנות והבחירה שלו נשמרת
- Option_List_1 to Option_List_10 (10 fields) | Long text (plain, rich text OFF) | רשימת אפשרויות N: שורה לכל אפשרות, עד 4 חלקים מופרדים בקו אנכי «|»: ערך | תווית | צבע | אייקון. רק הערך חובה; תווית ריקה = הערך; צבע/אייקון ריקים = לא מוצג כלום (למשל «Staffing | צוות | #9e1a44 |» או «Todo | לביצוע»). כמה ערכים יכולים לקבל אותה תווית (מיפוי סטטוסים). שורה שמתחילה ב-# = הערה. רשימה N היא גם מקור התפריט הנפתח N כש-Dropdown_N ריק; כשהתפריט N לא בשימוש היא חופשית (רשימת טבלאות, מקרא, מיפוי סטטוסים)

Group 7 — Look (20 fields):
- Color_1 to Color_10 (10 fields) | Single line text | צבע N בקוד hex, למשל #2563eb — ראו Slot_Map
- Icon_1 to Icon_10 (10 fields) | Single line text | אייקון N: אימוג׳י או טקסט קצר — ראו Slot_Map

Group 8 — Links and media (8 fields):
- URL_1 to URL_5 (5 fields) | URL | קישור N — ראו Slot_Map
- Attachment_1 to Attachment_3 (3 fields) | Attachment | קובץ/תמונה N (לוגו, רקע). הקוד לא כותב לשדה הזה

Group 9 — Values (43 fields):
- Date_1 to Date_5 (5 fields) | Date with time — 24-hour format, time zone Asia/Jerusalem, 'Use the same time zone for all collaborators' ON | תאריך ושעה N (למשל מועד יעד) — שעון ישראל
- Number_1 to Number_10 (10 fields) | Number, decimal, 2 decimal places, negatives allowed | מספר N (סף, מגבלה, כמות, גודל) — ראו Slot_Map
- Goal_1 to Goal_5 (5 fields) | Number, integer (0 decimal places) | יעד N — ה-Y ב«X מתוך Y» של אריח/מד התקדמות N. ריק = בלי «מתוך»
- Toggle_1 to Toggle_10 (10 fields) | Checkbox (real checkbox, green check icon) | ברירת המחדל של מתג N במסך: מסומן = מתחיל דלוק, ריק = מתחיל כבוי. המשתמש יכול להחליף, והבחירה שלו נשמרת
- Toggle_Label_1 to Toggle_Label_10 (10 fields) | Single line text | תווית מתג N במסך (ליד Toggle_N). ריק = המתג לא מוצג, ו-Toggle_N הוא הגדרה קבועה
- Duration_1 to Duration_3 (3 fields) | Duration, format h:mm | משך N (למשל קנה מידה של 30 דקות, חלון ביטול) — ראו Slot_Map

Group 10 — Advanced (1 field):
- Advanced_JSON | Long text (plain, rich text OFF) | מוצא חירום למבנה מורכב. JSON תקין בלבד; JSON שבור = הקוד מתעלם ומדווח ב-Sync_Note. מפתחות קבועים: "filters" = מסננים נוספים אחרי Filter_10, רשימה של {"field","operator","value","label"} באותם כללים; "filterMap" = {"N": {"fields": [שדות Table.Field נוספים ל-Filter_N], "unmatched": "keep" או "hide"}}. שאר המפתחות לפי התוסף — ראו Slot_Map

Group 11 — Code-owned (4 fields):
- Slot_Map | Long text (plain, rich text OFF) | נכתב אוטומטית ע״י הקוד: מה כל משבצת אומרת בתוסף הזה + ברירת המחדל שלה. לא לערוך ידנית
- Code_Version | Single line text | גרסת הקוד האחרונה שסנכרנה את השורה (נכתב ע״י הקוד)
- Last_Synced | Date with time — 24-hour format, time zone Asia/Jerusalem | מועד הסנכרון האחרון של הקוד (נכתב ע״י הקוד)
- Sync_Note | Single line text | הודעת סנכרון מהקוד: ✓ או רשימת שדות שלא מאופשרים באלמנט (נכתב ע״י הקוד)

Group 12 — Free (1 field):
- Notes | Long text (plain, rich text OFF) | הערות חופשיות לעורכים

Then create exactly ONE record:
- Extension: countdown-homescreen
- Variant: (leave empty — this is the default row)
- Display_Name: ספירה לאחור – מסך בית
- Block_ID: <block-id-redacted>
- Use_Defaults_Only: unchecked
- Title: יאללה היידה!
- Content_Text_1: כרטיסים שנמכרו
- Content_Text_2: הזמנות שנשלחו
- Source_Table_1: Tickets
- Source_Table_2: Invitations
- Source_Table_3: Slots_Events
- Source_Field_3: Slots_Events.Status
- Option_List_1: משובץ
- Date_1 (fallback only, used if no משובץ slots are found): 24 October 2026, 20:00 Israel time (Asia/Jerusalem). In UTC that is 2026-10-24T17:00:00.000Z — check the cell shows 24/10/2026 20:00.
- Leave every other field of this record EMPTY (including all Toggle_Label, Goal, Filter and Me_Field cells) and every other checkbox unticked, including Toggle_1–10. The extension fills Slot_Map, Code_Version, Last_Synced, Sync_Note and its own defaults itself.

When done, reply with: the table name, the number of fields created (should be exactly 269), the number of records (should be 1), and a list of any field you could not create exactly as specified (name + what you did instead). Touch nothing else in the base and do not "fix" anything else.
```
