# lists-ui-ext – "רשימות – סבב 2" (CSF DEMO Interface Extension)

**Base:** DEMO `appiN9MrP73g6R9hi` only · **SDK:** `@airtable/blocks@interface-alpha` (build 0.0.0-experimental-8575f0e0d-20260428, same as the siblings) · **Status 2026-09-29 21:25 IDT:** **v0.4.1 released** to block `<block-id-redacted>` (interface `pbd7dMiJheesRTDoD` "TEMP רשימות – סבב 2", page `pagWPYEF4VGt2hWrG`). Typecheck and lint are green; logic test 39/39.

Template: config files copied (not modified) from `../lists-add-to-list-ext` (itself built on the `people-roles-ext` workflow).


## v0.6.0 (2026-10-10) — Extension_Config wiring (NOT released)

- Extension_Config is READ-ONLY here: the hook is the v3.1 copy (same as countdown v0.4.1), where Door 2 writes are opt-in (`writes: true`) and OFF. The extension never creates rows or fills Slot_Map, Code_Version or Last_Synced. The table is found from the right-pane «configTable», else by the name Extension_Config (exact, then loose).
- New `frontend/useExtensionConfig.ts` (shared v3 helper, 269-field table) + `frontend/cfg.ts` (slot defaults = the v0.5.18 texts, Slot_Map docs).
- Row `Extension = lists-ui`; Variant = right-pane «גרסת עמוד» (`configVariant`), else the mode (`full` → default row, `mine`, `record`).
- Precedence: right pane → Extension_Config row (variant cell → default-row cell) → code default. Source_Table_1–7 only fill a table the right pane leaves empty.
- 47 visible texts + Number_1 (compact row limit) read from slots — map: `/workspace/csf-extension-config/maps/lists-ui.md` + `lists-ui-config-map.png`.
- New right-pane fields: `configTable` (Extension_Config, optional), `configSlug` (default `lists-ui`), `configVariant`.
- Privacy deny-lists (SENSITIVE_TYPES / SENSITIVE_NAME / HARD_DENY / DENIED_COND_CHOICES) stay in code.
- No table → identical DOM to v0.5.18 in 10 scenarios (`scripts/config-identity-test.mjs`, `npm test`).

## What it does (all Hebrew, RTL on the glass)
**Home (הרשימות שלי)**
- "My lists" = Owner User is me **OR** SharedWith contains me **OR** Visibility = Public. The current user comes from `useSession().currentUser`. Lists with an empty Visibility count as private. With no signed-in user, only public lists show.
- Filter chips: הכל / שלי / משותפות איתי / ציבוריות (with counts). Search covers list names, descriptions and item names.
- **Gallery ⇄ list toggle** (segmented ▦ גלריה / ☰ רשימה). It is kept in the block's URL params (`view`) so it is deep-linkable.
- Each card shows:
  - a cover: a Letterboxd-style strip of up to 4 item pictures, or 1 full picture, or a gradient plus emoji;
  - type badge (☑ צ׳קליסט / ☰ רשימה רגילה);
  - visibility (🔒 פרטית / 🌍 ציבורית / 👥 שותפה איתי / 👥 משותפת עם N);
  - description (2 lines), a preview of the first 3 items, the owner, and a ✓ done/total count with a progress bar for checklists.
- Empty states: "עוד אין כאן רשימות" (no lists) and "לא נמצאו רשימות תואמות" (filter/search, with a clear button).
- **+ רשימה חדשה** modal fields:
  - name (required)
  - type (צ׳קליסט / רשימה רגילה cards)
  - contents tables (🎬 סרטים / 🗓️ משבצות / 👤 אנשים)
  - visibility (פרטית / ציבורית)
  - optional sharing with base collaborators
  - description
  It then writes Owner User = me and Status = Active, and opens the new list.

**List page**
- The hero shows cover, badges, Contents chips, name, description, owner and shared-with.
  - Owners and people it's shared with get a type switch (☑/☰).
  - Checklists get a progress bar ("סומנו X מתוך Y", 🎉 when everything is checked).
- **Checklist connection** (checklist lists only): chips for linked records in the existing **Checklists** table, via `Lists › Linked Checklist`.
  - Clicking a chip opens the record; ✕ unlinks it.
  - "+ חיבור" picks from the Checklists records.
  - Empty-table message: "אין עדיין צ׳קליסטים בבסיס לחיבור".
- **All items in ONE list**, not grouped. Each row has:
  - drag handle ⋮⋮;
  - ✓ checkbox (checklists only);
  - one picture: the Films Poster, Slots "Pics for website" or People Pic, falling back to the List Item lookups FilmPoster/SlotPicture/PersonPhoto, then an emoji;
  - item name (opens the source record);
  - a coloured source badge (סרט / משבצת / אדם);
  - a sub-line (director · year / slot start in Asia/Jerusalem / roles);
  - inline Notes (saved on blur; Ctrl+Enter saves, Esc cancels; "נשמר ✓");
  - ✕ remove.
- **Drag and drop to reorder**, using HTML5 DnD on the handle, plus ↑/↓ keys on a focused handle.
  - The order is optimistic. It is persisted to **List Item › Sort Order** as 10, 20, 30…, and only the rows whose value changed are written, in batches of up to 50.
- **Add item = choose table, then item.**
  - The three tables show as big buttons, with the list's Contents tables first ("מתאים לתוכן הרשימה").
  - Then a searchable picture grid. Items already in the list show "✓ ברשימה".
  - Adding creates a List Item with: Festival List = this list, Film/Slot/Person link, Type, Label, Sort Order = last + 10, and Checked = false.
- **Remove = unlink only.** Festival List is rewritten without this list, and a toast offers "ביטול" (re-link). **The extension never deletes records.**
- Public lists I don't own or share are **read-only**, with the banner "רשימה ציבורית של … – צפייה בלבד".
- Technical error text goes to `console.warn` only; the glass shows Hebrew messages.

## Round 3 (v0.2.0)
Three display modes of the same block, chosen with the custom property **תצוגה** (`mode`):

| `mode` | Label | What it shows |
|---|---|---|
| `full` (default) | עמוד רשימות מלא | Home + list page, as in v0.1.0 |
| `record` | קומפקטי: באילו רשימות הרשומה | Which lists the current Film / Slot / Person is in, plus **+ הוסף לרשימה** |
| `mine` | קומפקטי: הרשימות שלי | A compact "📋 הרשימות שלי" block for Staff Home |

**Record mode** (`recordTable` = Films / Slots_Events / People, default Films; optional `recordId`)
- It picks the current record in this order:
  1. the fixed `recordId` setting;
  2. the page provides exactly one record of `recordTable` (auto-detect on a record page; **not yet verified in the browser**);
  3. an in-element picker, stored in the URL param `rec`, with a "החלפה" button.
- Each list containing the record shows a compact cover, name, type and visibility badges, and the item's notes.
  - Checklists get a ✓ toggle.
  - ✕ unlinks the item from the list (never deletes).
  - Clicking the name opens the list record.
- **+ הוסף לרשימה** opens a popover of the lists I can edit (mine plus lists shared with me, not hidden).
  - Clicking a list toggles the record in or out of it: add creates a List Item, remove unlinks.
  - "+ רשימה חדשה" quickly creates a list (Regular, Private, Contents = this table, Active) and adds the record to it.

**My-lists mode**
- Chips: הכל / שלי / משותפות איתי / ציבוריות (with counts).
- Rows show cover, badges, a preview of items and checklist progress.
- Each row expands inline to show its items; checklist items can be ticked there.
- Shows 6 rows, then "הצגת כל N".

**Critic round-2 fixes**
- The ציבוריות chip now counts every public list, including my own.
- Lists with **Status = Archived are hidden** from home, with a footer toggle "הצגת רשימות מוסתרות (N)" and a "מוסתרת" badge.
  - Owners get "🙈 הסתרה מדף הבית" / "↩ החזרה לדף הבית" on the list page. This is a Status change, never a delete.
- The ✕ remove button now sits next to its item title.
- The app is full width, fixing the empty left strip.

**Paused in v0.2.0 (superseded by v0.3.0 below):** Static/Dynamic lists and the Hebrew filter builder. Still paused: Omni-editable filter text and drag-reorder of lists on home.

## v0.5.2 – create / visibility permission honesty (DEMO, not released)
- Root cause for the owner "not authorized" on create / private·public / SharedWith: SDK `checkPermissionsForCreateRecord` deny (Interface share edit/create and/or field write). Glass previously hid the reason in `console.warn` only.
- Create path: progressive omit of Visibility + SharedWith (CISO display-only labels) when those fields alone block create; clearer Hebrew deny pointing at Interface share **Can edit records**.
- Home: gate `+ רשימה חדשה` / create modal on `hasPermissionToCreateRecord`; hide Visibility/SharedWith controls when not writable.
- List page (owner): Private/Public toggle via `setListVisibility` (still display-only; ACL = Interface share).
- **Do not release** until the owner confirms Interface share + a try on DEMO. Preserve `.block/remote.json`.

## v0.4.1 – Critic L2 (DEMO)
- Create-dropdown warning: if List_Sources has ≥3 tracking refs but fewer than 3 resolve on the element → Hebrew “שדות המעקב לא מופעלים באלמנט” (פאנל שדות / Data), not «חסרים שדות מעקב». Thin List_Sources (<3 filled) keeps the fill wording.
- Home card counts always use `list.items.length` from the same live `runSpec` path as the list page; `listsSpecKey` fingerprints Mode/Source/Cond so Cond edits invalidate the lists rebuild.

## v0.4.0 – List_Sources + CISO (DEMO)
- Config table `List_Sources` (`tbllSrI6L3lXj0E8y`): Table, Hebrew label, Icon, Active, Sort, Title/Picture, Field 1–6 + labels, Notes. Runtime catalog; in-code FALLBACK only if missing/empty.
- New Lists text fields: Source table ID, Cond1–3 Field ID (legacy selects kept).
- Hebrew table dropdown + table pills; tracking preview (1–3 fields) on dynamic rows.
- CISO: People allow-list only; hard-DENY finance/notebook/credential sources; privacy line on home/hero; Public/Private display-only (ACL = Interface share).
- Spare custom properties: `טבלת מקור נוספת 1–6` + List_Sources table. Max 8 extra tables loaded.
- "Do you have a car?" scrubbed from Cond picker in code (select choices still in base until Creator deletes them).

## v0.3.0 – LEAN Dynamic lists (the owner + UX Critic verdict)
Each list is **either** Static (✋ ידנית, items added by hand) **or** Dynamic (⚡ דינמית, live). There is no "both".

**Dynamic storage** (structured; no free text; no Omni editing), all on Lists `tbly1shgcTgaczbje`:
| Field | ID | Notes |
|---|---|---|
| Mode | `fld4MPMiB46amYP6N` | pre-existing, reused. Static/Dynamic, empty = Static |
| Source table | `fld7BHRTkygfkvki9` | pre-existing, reused. Only Films / Slots_Events / People are supported |
| Cond1 Field / Operator / Value | `fldr32AuQUwtnXROf` / `fld06aKWYs0tPLZ2H` / `fld7jj9YQ9wpXt110` | new |
| Cond2 Field / Operator / Value | `fldJqq23SSzVPGpkX` / `fldtfHy7Y9yYqk3vT` / `fld06djIc0nuqgJxh` | new |
| Cond3 Field / Operator / Value | `fldse72Il6oJNUtBs` / `fldwJVKuKYTlBkIf8` / `fldjBL9PywjVnylSv` | new |

- Condition *Field* is a single select holding the curated English field name. The Hebrew labels live in `frontend/dynlogic.ts` (`CURATED`).
- Operators: is, is not, contains, does not contain, is empty, is not empty, is on, is before, is after, greater than, less than, is checked, is not checked.
- Conditions are joined with AND (1–3). Dates compare on the **Asia/Jerusalem** calendar day.
- `FilterSpec`, `Contents` and `Linked Checklist` stay in the base but the UI no longer uses them.

**Curated fields (Hebrew labels):**
- **Films:** סטטוס קבלה לפסטיבל (Accepted to CSF), מסלול / תוכנית (Contest_Program), ז׳אנר (Genre_Hebrew), שלב טריילר (Trailer Stage), הגעת עותק הקרנה (DCP arrived), שנת הפקה (Year)
- **Slots_Events:** סוג אירוע (Type), סטטוס משבצת (Status), מועד התחלה (Start), אולם / מיקום (Location), פרויקט (Project)
- **People:** הרשאת גישה (Access), תפקיד מועדף (Preferred role), תפקידים (Roles), מועמד/ת להתנדבות (Applicant), יש רכב (Do you have a car?)

**UI:**
- **Dynamic list page:** read-only live items, the count line "⚡ N … תואמים כרגע", a Hebrew summary ("מציג: …"), and an owner-only condition editor (dropdowns).
- **Create modal:** choose ✋ ידנית or ⚡ דינמית.
- **Home cards:** ⚡ דינמית badge, live count, and covers from the matching items.
- **Compact modes:** "mine" shows the ⚡ count; record mode shows "⚡ תואם לרשימה דינמית" (read-only).

**Critic items:**
- The Contents picker was removed. Content tags are now derived from the items.
- The Checklists link UI is hidden.
- The ☑/☰ segmented control is now one switch, "הצגת סימוני ✓" (it still writes List Type).
- Home defaults to the **list** view (`?view=gallery` for gallery).
- Private lists show an honest note: private is a display filter, not security.

**Preview tabs** (full mode only): 🗂 עמוד הרשימות / 🔎 תצוגת רשומה / 📋 הרשימות שלי – קומפקטי. They let you test the record and mine modes inside the existing full-page element, with no second element needed. The state lives in the URL search params `pv=record|mine` and `pk=film|slot|person`.

**Seeded on DEMO** (live counts on 2026-09-29):
- `recej2WfRfmQTiBMc` סרטים שהתקבלו לפסטיבל → 6
- `recl1kStoFp2aeCIE` הקרנות 1.11 – ערב ראשון → 3
- `recSFF56tynlLzokQ` טריילרים בעבודה → 3

## Element setup (browser, Interface Designer)
Custom properties (Hebrew labels) default to these tables by id, then by exact name:

| Property | Table |
|---|---|
| טבלת רשימות | Lists |
| טבלת פריטי רשימה | List Item |
| טבלת סרטים | Films |
| טבלת משבצות | Slots_Events |
| טבלת אנשים | People |
| טבלת צ׳קליסטים | Checklists |

Fields the element must expose (enable them in the element's field panel). If a required one is missing, the app shows the Hebrew banner "חסרים שדות בהגדרות האלמנט…".
- **Lists:** Name, Description, Owner User, SharedWith, Visibility, Contents, List Type, Linked Checklist, Status, Created
- **List Item:** Label, Festival List, Type, Film, Slot, Person, Notes, Checked, Sort Order, Sort, ItemName, Detail1, FilmPoster, SlotPicture, PersonPhoto
- **Films:** Film_name_HEB, Poster, Director_HEB, Year
- **Slots_Events:** Slot, Pics for website, Start
- **People:** Full Name, Pic
- **Checklists:** Name, Status

**Optional (v0.5.17 kinds, matched by NAME, loose: case, spaces/_, singular/plural, Hebrew).** A kind is listed in the new-list picker and the «+ הוספת פריט» panel always. It is enabled when its table is in the base and visible to the element, and its chip is enabled when the List Item link field is also on. Otherwise it is disabled, and the tooltip names the missing table or field.

| Kind (Hebrew) | Table name (aliases) | List Item link field (aliases) | On DEMO |
|---|---|---|---|
| 🎨 עיצוב גרפי | Graphic Design (Graphic Designs, GraphicDesign, Design) | Graphic Design (Graphic Designs) | ✓ |
| 🧭 מסלולים | Itinerary (Itineraries, Itinerary Items) | Itinerary (Itineraries) | no table |
| 🚐 נסיעות | Trips (Trip, Travel, Travels) | Trip (Trips) | no table |
| 🏭 ספקים | Suppliers (Supplier, Vendors, Vendor) | Supplier (Suppliers, Vendor) | no table |
| 📌 שיבוצים | Assignments (Assignment) | Assignment (Assignments) | ✓ |
| 👥 ציוות | Staffing (Staffings) | Staffing (Staffings) | ✓ |
| 🔗 קבצים וקישורים | Files and Links (Files & Links, Files, Links) | Files and Links (Files & Links, File) | ✓ |
| 🎞️ מדיה | Media (Medias, Media Assets) | Media (Medias) | ✓ (no «Media» Type choice) |
| 🧰 משאבים | Resources (Resource) | Resources (Resource) | ✓ |
| 🗓️ הזמנות משאבים | Booking Resources (Booking Resource, Resource Bookings) | Booking Resource (Booking Resources, Booking) | ✓ |
| 📱 פוסטים | Social Posts (Social Post, Posts, Social Media Posts) | Social Post (Social Posts, Post) | ✓ |
| 📣 קמפיינים | Campaigns (Campaign) | Campaign (Campaigns) | ✓ |
| 💵 קופה קטנה | Petty Cash (PettyCash, Petty Cash Requests) | Petty Cash (Petty_Cash, Petty Cash Request) | ✓ |

A link field is also found when its linked table matches one of these names, whatever the field itself is called.

**Optional (v0.3.0 dynamic lists).** Without these fields, everything stays Static and nothing breaks. The ⚡ option in the create modal lists whatever is missing.
- **Lists:** Mode, Source table, Cond1 Field, Cond1 Operator, Cond1 Value, Cond2 Field, Cond2 Operator, Cond2 Value, Cond3 Field, Cond3 Operator, Cond3 Value
- **Films:** Accepted to CSF, Contest_Program, Genre_Hebrew, Trailer Stage, DCP arrived
- **Slots_Events:** Type, Status, Location, Project
- **People:** Access, Preferred role, Roles, Applicant, Do you have a car?
- Contents is no longer required.

User actions: **Edit records inline ON** and **Add records ON**. The code never deletes, but Airtable's add/delete switch is a single toggle. **Click into record details ON**, used by `expandRecord`.

## Build / release
```
npx tsc --noEmit                 # green
npm run lint                     # green
node scripts/logic-test.mjs      # 85/85: runs the real frontend/model.ts against a DEMO snapshot (scripts/fixture.mjs)
# RELEASE: .block/remote.json = {"blockId":"<block-id-redacted>","baseId":"NONE"} (untracked)
node scripts/live-check.mjs      # 3/3 seeded dynamic lists vs DEMO snapshot
npx block release --comment "lists-ui-ext v0.3.0 ..."   # v2 blocks need --comment
# .airtableblocksrc.json (PAT) is copied from ../lists-add-to-list-ext, git-ignored; never print or commit it
```
Do **not** point `.block/remote.json` at `<block-id-redacted>` (lists-add-to-list), `<block-id-redacted>` (people-roles), `<block-id-redacted>` (bulk-sheet) or `<block-id-redacted>` (gold0). That would overwrite those extensions.

## Files
- `frontend/model.ts`: IDs, field resolution, view models (`useModel`), picture resolution, and the pure reorder helpers `dropOrder` / `stepOrder` / `orderUpdates`
- `frontend/Home.tsx`: home, gallery/list, filters, and the new-list modal
- `frontend/ListPage.tsx`: list page, DnD, notes, checks, add item, unlink, and the checklist link
- `frontend/Compact.tsx`: record mode (`RecordMode`) and my-lists mode (`MyListsCompact`)
- `frontend/actions.ts`: permission-checked writes (create/unlink item, check, quick list, archive); no deletes
- `frontend/kinds.ts`: Kind / KINDS / SRC
- `frontend/dynlogic.ts`: pure dynamic-list logic (curated map, operators, Jerusalem-day dates, runSpec, Hebrew summary)
- `frontend/Dynamic.tsx`: condition editor + dynamic list page
- `frontend/ui.tsx`: toast, cover strip, badges, avatar, progress
- `frontend/style.css`
- `scripts/live-check.mjs` + `live-snapshot-2026-09-29.json`: seeded dynamic lists vs a DEMO snapshot
- `scripts/logic-test.mjs` + `fixture.mjs` + `stubs/`: logic test (esbuild from the global blocks-cli; React and the SDK hooks are stubbed)

## Known limits
- Desktop-first. Mobile gets a stacked layout at ≤760px, but HTML5 drag-and-drop doesn't work on touch; use ↑/↓ on the handle, or reorder on desktop.
- "Sharing" is display logic. Anyone with base access can still read all lists in the grid.
- Record data can contain English: collaborator names ("Demo User"), old list names ("listssss", "תיק DEMO …"), slot names ("DEMO Slot 07"). The UI chrome is 100% Hebrew.
- Dynamic lists: no OR logic and no relative dates ("this week"). Link and multi "contains" is an exact item-name match. "is not" also matches empty cells (add "is not empty" to exclude them).
- The DEMO **Checklists table is empty**, and creating records in it via the API returned 403. So the checklist picker currently shows its empty state.
