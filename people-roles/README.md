# אנשים ותפקידים — CSF DEMO Interface Extension

**Base:** CSF DEMO v1.3 260924 · `appiN9MrP73g6R9hi` **ONLY** (never prod).
**Status (2026-09-25 14:16 IDT):** v0.1.3 released (Critic fixes, see changelog). Earlier status (12:46 IDT): typecheck + lint green · **released** (`block release`, CLI 3.0.3) to Interface extension `<block-id-redacted>` (Builder Hub, `baseId: "NONE"` = v2 interface block) · **not yet bound** to an interface page. Log: `../evidence/people-roles-ext-2026-09-25/08-block-release.log`.
Aligned to the official template `Airtable/interface-extensions-hello-world-typescript` (same `interface-alpha` SDK tag → `0.0.0-experimental-8575f0e0d-20260428`).
**Forked from:** `../lists-unified-add/` (same SDK: `@airtable/blocks@interface-alpha`, React 19). The original was not modified.

## Purpose
the owner's sketch, one screen, no save button:

```
(ניקוי)
בחר שם / צור שם חדש   (עריכת שם)            טלפון   אימייל
בחר תפקיד / צור תפקיד חדש (עריכת שם התפקיד)  טלפון   אימייל   גוף שותף   [✓ שובץ (Undo)]
(הוסף עוד תפקיד לשם הזה)
──────── ספר טלפונים (search · rows · "פנוי" rows) ────────
```

- **Person line:** type-ahead over People (`Full Name`, also matches phone digits). No exact match → `צור: X` creates the People record. After a pick the name is a locked chip; `(עריכת שם)` unlocks it and Enter/blur renames the record. `✕` un-picks, `↗` opens the record. Personal phone and email are edited inline (save on blur/Enter, small ✓).
- **Role line(s):** same thing over Roles (`Role`), with `(עריכת שם התפקיד)`. Role phone, role email and **גוף שותף** (Roles → Partners link: chips with ✕ plus a picker) are edited inline.
- `(הוסף עוד תפקיד לשם הזה)` adds another role line for the same person. You can start from the person or from the role.
- **Auto-assign:** when a line has both a person and a role, an Assignments record is created (People link + Roles link + `Start` = today, if Start is a writable date field). The line then shows `✓ שובץ` and an Undo button labelled `בטל`.
  - If an open Assignment for that exact pair already exists (End empty or End ≥ today), nothing is created and the line shows `כבר משובץ ✓`.
- **Duplicate-phone warning:** while you type a phone, the value is normalised (digits only; a leading `972` and a leading `0` count as the same prefix, so `052-555-0101` = `0525550101` = `+972 52 555 0101`). If it matches another People row you see `⚠ הטלפון כבר קיים אצל: <name>` and a button to pick that person instead.
  - The button uses mouse-down, so the phone you typed is **not** saved.
  - If the current person was created in this session, that new People record (and any Assignments this session created for it) is deleted, then the existing person is picked.
- **Phone book (below the form):** one row per open Assignment (both links filled, End empty or ≥ today; future Start is tagged `מתוכנן`). Rows for placeholder people/roles (`DEMO Person…` / `DEMO Role…`) are hidden (v0.1.4). Columns (v0.1.3, role-first): שם · תפקיד · טלפון תפקיד · אימייל תפקיד · טלפון אישי · אימייל אישי · גוף שותף.
  - Roles with no open, person-linked Assignment are listed after them as `פנוי` rows. Roles whose name starts with `DEMO Role` (old seed placeholders) are **filtered out of the vacant list in code** (not deleted).
  - Each vacant row shows `לפנייה: …` across the two personal-contact cells: (1) the `Reports To` role's current holder, with that role's phone/email first, else the holder's personal phone/email (walks up to 4 levels); (2) else the vacant role's own role phone/email (`תיבת התפקיד`); (3) else its Partner; (4) else a grey "אין איש קשר" hint.
  - Chips `הכל (N)` / `פנויים (M)` filter the list.
  - One search box filters across all columns (text match, plus digit match on phones).
  - Clicking a row loads that person and **all** of their open roles into the form (marked `כבר משובץ ✓`). Clicking a vacant row loads the role only.
- **Never used:** the Airtable `User` collaborator field, and the sensitive People fields (Home address, car, School year, Curriculum, Notes, Access, Access to Interfaces).

## Field map (verified with get_table_schema, 2026-09-25)
| Table | Field | Id | Type | Used for |
|---|---|---|---|---|
| People `tblDETcBuaBMTeUmH` | Full Name (primary) | `fldVySoRplNHsjeBW` | singleLineText | search / create / rename |
| People | Phone_Personal | `fldHetGMbF818K7k7` | phoneNumber | inline edit, duplicate check, phone book |
| People | Email_Personal | `fldVL0rzcMUfkh1XB` | email | inline edit, phone book |
| Roles `tblBvMpH47USsN760` | Role (primary) | `fldtIE4Rhli3N7bBV` | singleLineText | search / create / rename |
| Roles | Role Specific Phone | `fldJUUjdyvCWibjmn` | phoneNumber | inline edit, phone book |
| Roles | Role Specific Email | `fldD9lK0MD9nnufMx` | email | inline edit, phone book |
| Roles | Partner (גוף שותף) | `fldqDGFT0bMcWmksP` | multipleRecordLinks → Partners `tblX7qXkvyhDG3Nhe` (inverse `fldZJSUNGPaFRhpIL`) | picker + phone book |
| Assignments `tblWyA778vlIsatNk` | People | `fldccqNTeBR5u882z` | multipleRecordLinks → People | create / dedupe |
| Assignments | Roles | `fldzH4VKaVwYVMw4h` | multipleRecordLinks → Roles | create / dedupe |
| Assignments | Start | `fldRFnOastqcICMoS` | date (D/M/YYYY) | set to today on create; "מתוכנן" tag |
| Assignments | End | `fldSC0O1m7PAFxQLi` | date | open = empty or ≥ today |
| Assignments | Name and Role (primary) | `fldfIOnGakriR6lTS` | formula | not needed by the code |
| Assignments | Notes | `fldlA2wQ8d63YuhaB` | multilineText | not used by the code (seed marker only) |
| Roles | Reports To | `fldCoMcw6R6fSr877` | multipleRecordLinks → Roles (single; inverse `Manages` `fldDBbNJvICsrl8fa`) | **v0.1.3, optional, read-only:** vacant-row fallback contact |
| Partners | Name (primary) | `fldF0hwX4w0ljZ5pi` | singleLineText | shown via the link's `name` |
| Assignments | Partners 2 | `fldA3GEzT8iqmU89g` | multipleRecordLinks → Partners (inverse `Partners › Team_Members` `fldJLyKXsGHrNikRC`) | **v0.2.3:** the person's own partner in that role (edit); empty = role's Partner shown. Element property `assignmentPartnerField`. |

The code looks fields up by id first, then by name. If a field is not exposed, that cell is disabled with the text "השדה לא זמין באלמנט". If a required field is missing (the two primary fields or the two Assignment links), the extension shows the list of missing fields.

## Element fields and permissions needed at bind (Interface Designer) — exact list
Tables come from the element's **custom properties** (`peopleTable`, `rolesTable`, `assignmentsTable`). Each defaults to the ids above.

The code references **exactly these 11 fields**:

| Table | Fields (all by id) | Permissions |
|---|---|---|
| **People** | Full Name `fldVySoRplNHsjeBW` *(primary)*, Phone_Personal `fldHetGMbF818K7k7`, Email_Personal `fldVL0rzcMUfkh1XB` | Edit + Add/delete records |
| **Roles** | Role `fldtIE4Rhli3N7bBV` *(primary)*, Role Specific Phone `fldJUUjdyvCWibjmn`, Role Specific Email `fldD9lK0MD9nnufMx`, Partner `fldqDGFT0bMcWmksP` | Edit + Add records. The Partner link must be editable; creating Partners is not needed. |
| **Assignments** | People `fldccqNTeBR5u882z`, Roles `fldzH4VKaVwYVMw4h`, Start `fldRFnOastqcICMoS`, End `fldSC0O1m7PAFxQLi` | Edit + Add/delete records (auto-assign + Undo) |

**Plus (v0.1.3, optional): Roles › Reports To `fldCoMcw6R6fSr877`, read-only.** Needed for the vacant-row "לפנייה" fallback to show the team lead. If it is not enabled, vacant rows fall back to the role's own phone/email or Partner, and a role with neither shows "אין איש קשר (Reports To לא מופעל ברכיב)".

**Plus one SDK requirement: Assignments › Name and Role `fldfIOnGakriR6lTS`, the primary field. Enable it; read-only is enough.**
- The extension never reads this field.
- The interface-alpha SDK reads `table.primaryField` internally whenever a loaded record changes (`record_core.__triggerOnChangeForDirtyPaths`).
- If the primary field is not enabled, that SDK call throws `No field with ID fldfIOnGakriR6lTS in table 'Assignments'`, and the whole element crashes. This happens when you rename a person or role that has Assignments, because Airtable pushes the new link names to those Assignment rows.
- From v0.1.2, if a loaded table's primary field is missing, the extension shows a setup message ("השדה Name and Role (Assignments) לא מופעל ברכיב") instead of crashing.
- People and Roles already satisfy this rule, because their primary fields (Full Name, Role) are in the list above.

**Do NOT enable** the People fields `User`, `Home address`, `Do you have a car?`, `School year`, `Curriculum`, `Notes`, `Access`, `Access to Interfaces`, or the old `People.Roles` / `Roles.Person` links. The Partners table does not need to be exposed; the picker uses `record.fetchForeignRecordsAsync`.

**Missing fields:**
- If a required field is missing (Full Name, Role, Assignments People, Assignments Roles), the extension shows "השדה X לא מופעל ברכיב".
- If an optional field is missing (phones, emails, Partner, Start, End), that cell is disabled and shows "השדה לא זמין באלמנט".

## How Undo works
- Undo exists **only** for an Assignment that this screen created in this session. The line keeps its record id and state `created`.
- Undo calls `assignmentsTable.deleteRecordAsync(id)` (after `checkPermissionsForDeleteRecord`). The line then shows `השיבוץ בוטל` and a `(שבץ שוב)` button to create it again.
- `כבר משובץ ✓` rows (pre-existing Assignments) have **no** Undo, because the screen never deletes an Assignment it did not create.
- Un-picking the person or role (✕), `(ניקוי)`, or removing a line does **not** delete anything. Press Undo first if you picked the wrong pair.
- `(ניקוי)` (v0.1.3) returns to an empty form in one press: every input is remounted, including typed-but-unpicked text in the person and role type-ahead boxes and the Partner search. Half-typed phone/email/name edits are **discarded**, not saved: the button keeps focus on mouse-down so no blur-save fires, and editors mounted before the clear refuse to write. The phone-book search box is outside the form and is left as it is.

## Build
```
npm install
npx tsc --noEmit     # green 2026-09-25
npm run lint         # green 2026-09-25
block release --comment "<note>"   # v2 (baseId NONE) blocks require a developer comment
# .airtableblocksrc.json (API key) lives in this folder, git-ignored — never print it
```
In this fork, `typescript-eslint`, `globals` and `@eslint/js` were added to devDependencies. `eslint.config.mjs` imports them, but the original project never declared them, so lint could not run there.

## Known limits
- Desktop only. Interface Extensions are not documented as working in the Airtable mobile app.
- "Open" means End empty or End ≥ today (local date). There is no Edition field yet, so an open-ended row from last year still counts as filled (gap P0 #1 in the spec).
- Search (v0.2.1): the phone book has no search box of its own; use the form's name / role boxes.
- Duplicate check (v0.1.6) covers phones and emails of People AND Roles visible to the element; it warns, never blocks.
- The type-ahead offers `צור: X` only when no **exact** name match exists. Near-duplicates ("דנה אברהם" / "דנה אברהמי") are caught by the phone warning, not by name.
- The Partner picker appends a link. The ✕ on a chip removes it. It never creates Partners.
- Writes are rate-limited by the SDK (15/s). This screen writes one record per user action.
- `@airtable/blocks@interface-alpha` is a pre-release SDK (installed build `0.0.0-experimental-8575f0e0d-20260428`). The APIs used were checked against its `.d.ts` files, not guessed.

## DEMO seed (2026-09-25, marked "DEMO seed 2026-09-25" in Notes)
- People (8): נועה לוי, עומר פרץ, שירה ביטון, יונתן מזרחי, מיכל אוחיון, רון אזולאי, דנה אברהם (052-555-0101), דנה אברהמי (0525550101 — deliberate duplicate-phone pair).
- Roles (8): מנהל/ת הפקה, מנהל/ת אולם — סינמטק שדרות, רכז/ת אירוח, רכז/ת מתנדבים, אחראי/ת הקרנות, דובר/ת הפסטיבל, רכז/ת תחבורה והסעות (vacant), מפיק/ה טכני/ת (vacant). Five are linked to existing DEMO Partners 01/02/03.
- Assignments (6, Start 2026-09-01, active): נועה לוי ×2 (מנהל/ת הפקה + רכז/ת מתנדבים), עומר, שירה, יונתן, מיכל.

## DEMO seed v0.1.3 (2026-09-25 14:15 IDT)
- Role phone/email were already set on all 8 seeded roles (08-6611001…008, `*@demo.csf.test`). Added to active role צלם/ת הפסטיבל: 08-6611009 · photo@demo.csf.test (Notes marker).
- New vacant roles (Notes "DEMO seed 2026-09-25 …"): רכז/ת סדרנים `recosXxMe28vKBFvd` (Reports To → מנה/ת הפקה; no own contact), and רכז/ת קופות והרשמה `recdBp4igle2uPxc1` (08-6611010 · boxoffice@demo.csf.test · Partner DEMO Partners 01; no Reports To).

## Changelog
- **v0.3.0 (2026-10-10, committed on the box only — NOT released): Extension_Config wiring (the owner, Oct 9 23:54 «mapping + config table feature for all previous extensions»).**
  - Extension_Config is READ-ONLY here: the hook is the v3.1 copy (same as countdown v0.4.1), where Door 2 writes are opt-in (`writes: true`) and OFF. The extension never creates rows or fills Slot_Map, Code_Version or Last_Synced. The table is found from the right-pane «configTable», else by the name Extension_Config (exact, then loose).
  - Reads the shared `Extension_Config` table (design v3, 269 fields) row `Extension = people-roles` (+ optional Variant). 56 slots: Title, Heading_1–3, Table_Heading_1–7 (columns + card labels), Tab_Label_1–5, Button_Text_1–10, Helper_Text_1–6, Content_Text_1–14, Empty_State_Text_1–3, Error_Text_1–2, Duration_1 (undo window), Source_Table_1–3, Source_Field_1. Map: `/workspace/csf-extension-config/maps/people-roles.md` + `people-roles-config-map.png`.
  - Precedence: right pane → Extension_Config (Variant cell → default row) → code default (`frontend/cfg.ts`).
  - New optional right-pane fields: `configTable` (grants access to Extension_Config), `configSlug` (default `people-roles`), `configVariant`.
  - Table absent → identical to v0.2.3: `node scripts/config-identity-test.mjs` (DOM byte-identical in 5 harness scenarios + positive row/variant/right-pane checks, 20 checks).
  - Write rules (never write Roles › Partner, personal-partner field guard) stay in code.
- **v0.2.3 (2026-10-09, DEMO block only; PROD waits for the owner's OK): edit-asks plan + the owner's partner rule.**
  - **Partner is per person, never per role** (the owner, Oct 9: "only change their partner, do not do this universally"). The role block's גוף שותף edits the person's **Assignments** row: DEMO field `Partners 2` `fldA3GEzT8iqmU89g` (multipleRecordLinks → Partners, inverse `Partners › Team_Members`). Empty = the role's Partner is shown, marked "מהתפקיד" (dashed pill, read-only). Picking a partner while inherited replaces it **for that person only**; "חזרה לגוף השותף של התפקיד" clears the override. The block never writes `Roles › Partner`. The phone book shows the person's own partner when set, else the role's. On PROD the field is chosen in the element's properties panel (custom property `assignmentPartnerField`, "גוף שותף לכל אדם"). If it is unset, not enabled, not a link to the Partners table, or there is no assignment yet, the partner is read-only with a hint.
  - **Role add never fails silently.** Missing create permissions are named in a red box under the title (Roles / Assignments / People, with Airtable's reason). With no Roles create permission the role box shows "לא ניתן ליצור ״X״ — אין הרשאה: …" in the list and "⚠ לא נשמר: תפקיד חדש לא נוצר. …" under the box. Assignments without permission keep "⚠ אין הרשאה לשבץ: …" + "נסה שוב".
  - **Timing gap fixed.** The person id is read from a ref at write time; an effect assigns any line that has both a person and a role but is still idle (a role saved before the new name finished). An idle line shows "עדיין לא שובץ" + **שבץ** instead of "…".
  - **Search pick loads the person** like a phone-book row click: personal phone/email once on the person line, then one stacked role block per open assignment (role, role phone, role email, partner per the rule above). Role lines filled before the pick stay on top and are assigned. "החלף" on the name drops the loaded blocks (no carry-over of someone else's roles). The duplicate-phone "בחר את X במקום" loads the same way.
  - **Pills, not URL text.** Name, role and partner links in the phone book, the form's partner chips, the contact card and "הוסף את ״X״ כשם חדש" are pill buttons (same shape as the Lists UI `.row-pill`). Phones are `tel:` pills and emails are `mailto:` pills (book, "לפנייה", contact card). All buttons are pill-shaped. `kbd` uses Segoe UI (laptop's Oct 4 one-line fix).
  - Footer shows the version. Typecheck + lint green (the one stale eslint-disable removed).
- **v0.2.1 (2026-09-27 ~09:55 IDT, released to the DEMO block; git tag `v0.2.1`): the owner's request, the top boxes are the search.** The separate phone-book search box is removed. The form's name box filters the book live (name, email, or 3+ phone digits; every word must match); the role box filters by role name; both typed = AND. A picked (locked) person shows only their rows; picked role(s) with no person show only those roles; typed role text wins over a picked person (so you can see who holds a role). ניקוי also resets the chips, partner filter and sort. S5's "נקה סינון" (and "נקה סינון ומיון") clears the typed text in the top boxes. "/" now focuses the name box (or the first empty role box when a person is loaded). A small grey explainer sits under the title. The book shows "מסונן לפי …". Item 5 re-proven 8/8 + MCP. Evidence: `../evidence/people-roles-v021-2026-09-27/`.
- **v0.2.0 = V2 (2026-09-26, released; git tag `v0.2.0-V2`; the ext page runs this now): V1 + six UX steals.** S1 picker notes (משובץ/תפוס/פנוי) · S2 10-second undo toast ("בטל" writes the old value back) · S3 "שינויים אחרונים" strip (last 8 edits, undo within 10 min) · S4 "הרחב" contact card as an expansion row (F2/Esc) · S5 empty state quoting the query + "נקה סינון" + "הוסף את ״q״ כשם חדש" · S6 "/" = search, Alt+N = name, Enter saves and moves to the next box. Item 5 re-proven 8/8 (4 contact fields × add/edit, shown in the phone book with no reload, plus MCP read-back). Evidence: `../evidence/omni-ready-people-roles-2026-09-26/*-ext-V2.*`. Roll back to V1: restore `/tmp/index.v016-V1.tsx` (= tag `v0.1.6-V1`) and `block release`.
- **v0.1.6 = V1 (2026-09-26 ~12:15 IDT, released; git tag `v0.1.6-V1`): the owner's acceptance items 1–12.** Logs: `../evidence/people-roles-ext-2026-09-25/15-block-release-v016-final.log`, then `../evidence/omni-ready-people-roles-2026-09-26/01…04-release-*.log`. Evidence: `../evidence/omni-ready-people-roles-2026-09-26/`.
  - Phone book: click a column header to sort (▲/▼, click again to flip). There's a search box, הכל/שיבוצים/פנויים chips, a גוף שותף filter, "מוצגות N מתוך M שורות", and "נקה סינון ומיון".
  - Column order: שם · תפקיד · טלפון אישי · אימייל אישי · טלפון תפקיד · אימייל תפקיד · גוף שותף.
  - Name, role and partner cells are links that call `expandRecord`. This needs Click into record details plus record detail pages for People/Roles/Partners.
  - Uniform 4-column form grid: name|role, phone|phone, email|email, and ניקוי directly above גוף שותף (left in RTL). It wraps to 2 columns below 900px and 1 column below 480px, with no sideways scroll.
  - All 4 contact fields save on add and on edit via Enter, blur or the "שמור" button. The state goes "לא נשמר עדיין" → "✓ נשמר". Phones are compared by digits: Airtable re-formats "050-000-0802" as "(050) 000-0802", and without this the box stayed "unsaved". The phone book updates live.
  - "שמור"/"ביטול" buttons appear under any unsaved box and on name edit. The old ✓/✕/↗ controls are now "נשמר" / "החלף" / "פתח רשומה" / "הסר שורה". Undo reads "ביטול שיבוץ".
  - Duplicate phone or email (normPhone: +972 = 0) linked to another person or role shows a gentle red box: "מספר הטלפון הזה מקושר למישהו אחר: X" / "כתובת האימייל הזו מקושרת למישהו אחר: X" (a role shows as "תפקיד X"). It warns and still saves. A person-phone duplicate also offers "בחר את X במקום".
  - One open assignment per role. Picking a role that is open for someone else creates nothing and shows "התפקיד הזה כבר משובץ ל־X (תפקיד אחד = שיבוץ פתוח אחד). לא נוצר שיבוץ."
  - Text typed in the form's name/role boxes also filters the phone book.
  - Item 12 (the page's own Filter/Sort): not possible. The page Filter popover has "Add condition" disabled for a custom element, and the SDK gets no page filter state.
- **v0.1.5 (2026-09-25 17:46 IDT, released): phone/email bidi fix.** Log: `../evidence/people-roles-ext-2026-09-25/13-block-release-v015.log`.
  - Every phone renders as one isolated LTR run (`<bdi dir="ltr">`, `unicode-bidi: isolate`, `white-space: nowrap`), right-aligned in the RTL table. This covers the phone-book phone cells, the "לפנייה" phone and the type-ahead phone hint. No more "08-" / "6611005" split or "(058) 998-" / "8776".
  - Phone columns have `min-width: 140px`.
  - Email cells don't wrap either. A long address is cut with an ellipsis (max width 240px), and the full address shows in the tooltip.
  - The phone and email inputs are `dir="ltr"`, right-aligned.
- **v0.1.4 (2026-09-25 17:40 IDT, released): the owner styling + Critic L2.** Log: `../evidence/people-roles-ext-2026-09-25/12-block-release-v014.log`.
  - Top card title is now "הוספת/עריכת אנשים ותפקידים". The ספר טלפונים title is unchanged. Setup and error screens keep the short name.
  - Contact boxes have no placeholder text: person and role טלפון/אימייל, and the גוף שותף search. The old hints ("בחר/צור שם קודם", "השדה לא זמין באלמנט") moved to tooltips. Disabled boxes get a muted background and border. The two type-ahead boxes keep "בחר שם / צור שם חדש" and "בחר תפקיד / צור תפקיד חדש".
  - No parentheses on any button: ניקוי, עריכת שם, עריכת שם התפקיד, הוסף עוד תפקיד לשם הזה, בטל, שבץ שוב, נסה שוב. The הכל and פנויים chips now show their count as a small badge.
  - ניקוי is a filled green button (#16a34a, white text; hover #15803d).
  - הוסף עוד תפקיד לשם הזה is dark gray (#374151, white text). It now sits about 6px under the last role line, inset 24px from the right, inside the role block rather than in its own section.
  - The עריכת שם buttons are neutral outline secondary buttons, 36px tall.
  - The phone book also hides assignment rows whose person starts with "DEMO Person" or whose role starts with "DEMO Role", using the same code filter as the vacant list. Nothing is deleted. On current DEMO data it shows הכל 12 = 10 שיבוצים + 2 פנויים.
- **v0.1.3 (2026-09-25 14:15 IDT, released): Critic fixes.** Log: `../evidence/people-roles-ext-2026-09-25/11-block-release-v013.log`.
  - Phone book is role-first: role phone and role email come right after the role name, before personal contact.
  - Vacant rows show a `לפנייה:` fallback contact (Reports To holder → role mailbox → Partner). Old `DEMO Role…` placeholders are filtered out of the vacant list (no deletes).
  - `(ניקוי)` clears everything, typed type-ahead text included, and discards unsaved edits (no blur-save on clear).
  - L2: `הכל` / `פנויים` chip filter. `(עריכת שם)` links have a bigger click target (36px min height, underlined). Search also matches the fallback text and its phone.
  - New optional element field: Roles › Reports To (read-only).
- **v0.1.2 (2026-09-25, released):** no unexposed fields.
  - Root cause of the rename crash: the SDK reads the primary field of Assignments internally, and it was not enabled. See the section above.
  - Added a setup gate for missing primary fields.
  - Fields are resolved with `getFieldIfExists`, which never throws.
  - Required fields that are missing get a Hebrew message.
  - Every async write, including its permission check, is inside try/catch and shows an inline Hebrew error on its own line or cell.
- **v0.1.1 (2026-09-25 13:43 IDT, released):** rename fix.
  - Name edits are now single-flight. The input stays mounted, read-only with "שומר…", until the write resolves.
  - The saved text is read from the input itself.
  - Enter is ignored while IME composition is still open.
  - A blur caused by the frame losing focus never writes.
  - Writes use record ids, looked up fresh at write time, instead of Record objects captured in an earlier render.
  - Added a React error boundary: "משהו השתבש — לחצו לרענון" plus the error text in small print.
  - Added global `error` / `unhandledrejection` capture, saved to localStorage and shown after reload as "קריסה קודמת". This matters because the SDK deliberately crashes the element asynchronously when a write it already applied locally is rejected, so a boundary cannot catch it.
  - Undo label is now `בטל`. Phone-book table text is 16px with roomier rows.
- **v0.1.0 (2026-09-25 12:46 IDT, released):** first build.
