# Config map — Bulk sheet «קופי פייסט - הזנה מרובה» (bulk-sheet) v0.5.0

<!-- pane Source_Table_1 = `peopleTable` -->
<!-- pane Source_Table_2 = `rolesTable` -->
<!-- pane Source_Table_3 = `assignmentsTable` -->

- **Source:** `/workspace/csf-bulk-sheet`. PROD source = `C:\CSF\csf-bulk-sheet` on DESKTOP-NB7SGA8, v0.4.3. The box frontend is MD5-identical to it (checked 2026-10-10), so it's committed as baseline `v0.4.3-base`. v0.5.0 is committed on the box and not released. (`csf-demo-v13/bulk-sheet-ext` is the older v0.2.4 DEMO copy and was not touched.)
- **Extension_Config row:** `Extension = bulk-sheet`; Variant = right-pane «גרסת עמוד» (`configVariant`), empty = default row
- **Screenshot:** `bulk-sheet-config-map.png` (harness render, fictional fixture; panel 1 = sheet with 5 pasted rows, panel 2 = «בטוח?» confirm dialog)
- **Precedence:** right pane → Extension_Config (Variant cell → default-row cell) → code default.
- **Table absent:** DOM byte-identical to v0.4.3 in 6 scenarios (`scripts/config-identity-test.mjs`: empty, filled + skip, clear dialog, submit dialog, +10 rows, missing tables).

## Right pane (custom properties)

| Key | Notes |
|---|---|
| `peopleTable`, `rolesTable`, `assignmentsTable` | existing; win over `Source_Table_1–3` |
| `configTable` | NEW, optional Extension_Config picker (defaults to the table named Extension_Config if it exists) |
| `configSlug` | NEW, default `bulk-sheet` |
| `configVariant` | NEW, empty = default row |

## Slots (43)

| Slot | Element (Slot_Map text) | Code default | Right pane first |
|---|---|---|---|
| `Title` | כותרת המסך (גם במסכי הגדרה חסרה) | קופי פייסט - הזנה מרובה | — |
| `Heading_1` | שורת משנה מתחת לכותרת | אנשים, תפקידים ופרטי קשר | — |
| `Table_Heading_1` | עמודה א: שם | שם | — |
| `Table_Heading_2` | עמודה ב: טלפון אישי | טלפון אישי | — |
| `Table_Heading_3` | עמודה ג: אימייל אישי | אימייל אישי | — |
| `Table_Heading_4` | עמודה ד: תפקיד | תפקיד | — |
| `Table_Heading_5` | עמודה ה: טלפון עבודה (Roles) | טלפון עבודה | — |
| `Table_Heading_6` | עמודה ו: אימייל עבודה (Roles) | אימייל עבודה | — |
| `Table_Heading_7` | עמודה ז: שותף עסקי | שותף עסקי | — |
| `Table_Heading_8` | עמודת הסטטוס (ח) | תיקון | — |
| `Table_Heading_9` | עמודת «לדלג» | לדלג | — |
| `Button_Text_1` | כפתור היפוך עמודות | ⇄ הפוך עמודות | — |
| `Button_Text_2` | כפתור ניקוי הטבלה | 🧹 נקה טבלה | — |
| `Button_Text_3` | הוספת שורות; {n} = Number_3 | + עוד {n} שורות | — |
| `Button_Text_4` | אישור שליחה בחלון «בטוח?» | כן, שלח | — |
| `Button_Text_5` | ביטול בחלונות האישור | ביטול | — |
| `Button_Text_6` | אישור ניקוי בחלון «לנקות הכל?» | נקה | — |
| `Helper_Text_1` | הסבר שורה 1; **טקסט** = מודגש | יש לכם רשימה באקסל? העתיקו והדביקו כאן. העמודות יצאו הפוכות? לחצו על **הפוך עמודות**. | — |
| `Helper_Text_2` | הסבר שורה 2 (גרירת עמודות) | עמודה במקום הלא נכון? גררו אותה מהאות שלה (א ב ג) למקום הנכון. | — |
| `Helper_Text_3` | טולטיפ «הפוך עמודות» | הופך את סדר הנתונים בכל השורות (הכותרות נשארות במקום) | — |
| `Helper_Text_4` | שורת המקלדת בתחתית | Tab / Enter / חצים לתנועה · סימון תאים + Ctrl+C / Ctrl+X / Ctrl+V · הדבקה מאקסל או Google Sheets · טלפונים לפי ספרות (+972 = 0) | — |
| `Helper_Text_5` | טולטיפ שורה מדולגת | השורה מסומנת ב־/ ולכן לא תועלה | — |
| `Content_Text_1` | כותרת חלון הניקוי | לנקות הכל? | — |
| `Content_Text_2` | כותרת חלון השליחה | בטוח? | — |
| `Content_Text_3` | כפתור השליחה בזמן שליחה | שולח… | — |
| `Content_Text_4` | סטטוס שורה שנשלחה | ✓ נשלח | — |
| `Content_Text_5` | סטטוס שורה מדולגת | מדלג על השם | — |
| `Empty_State_Text_1` | הודעה על טבלה ריקה | הדביקו כאן רשימה, אנחנו נסדר את השאר ✨ | — |
| `Error_Text_1` | טבלאות חסרות; {tables} = רשימה | הטבלאות הבאות לא זמינות לתוסף: {tables}. יש לבחור אותן בפאנל המאפיינים של האלמנט. | — |
| `Error_Text_2` | שדה ראשי לא מופעל; {field} = שם השדה (מודגש) | השדה **{field}** לא מופעל ברכיב — הפעילו אותו (קריאה בלבד מספיק) בפאנל הנתונים של הרכיב ורעננו. | — |
| `Error_Text_3` | פתיחת רשומה כבויה ברכיב | פתיחת רשומה כבויה ברכיב הזה — יש להפעיל "Click into record details" בהגדרות הרכיב | — |
| `Source_Table_1` | טבלת אנשים — רק אם הפאנל הימני ריק (ריק = People) | — | `peopleTable` |
| `Source_Table_2` | טבלת תפקידים — רק אם הפאנל ריק (ריק = Roles) | — | `rolesTable` |
| `Source_Table_3` | טבלת שיבוצים — רק אם הפאנל ריק (ריק = Assignments) | — | `assignmentsTable` |
| `Number_1` | כמה שורות ריקות בהתחלה / אחרי ניקוי | 20 | — |
| `Number_2` | גודל מנה לכתיבה (מקסימום 50 — מגבלת Airtable) | 50 | — |
| `Number_3` | כמה שורות מוסיף «+ עוד N שורות» | 10 | — |
| `Color_1` | צבע קונפטי 1 | #16a34a | — |
| `Color_2` | צבע קונפטי 2 | #dc2626 | — |
| `Color_3` | צבע קונפטי 3 | #2563eb | — |
| `Color_4` | צבע קונפטי 4 | #f59e0b | — |
| `Color_5` | צבע קונפטי 5 | #a855f7 | — |
| `Color_6` | צבע קונפטי 6 | #0ea5e9 | — |

## Data (not slots)

Cell values typed or pasted by the user. Existing People / Roles / Assignments are read to classify each row (new / update / same / duplicate). Partner names are looked up through `Roles.Partner`.

## Kept in code on purpose

- Write rules: it never touches the People User field or sensitive People fields, and never deletes. Phone normalising (+972 = 0).
- Validation and duplicate logic, with all its row-status texts (logic.ts `validateRows`). The column names inside those messages still come from code `COL_LABELS`, so if `Table_Heading_N` is renamed the status tooltips keep the old name.
- Hebrew count grammar (`he.*`: counter, «שלח N שורות», result banner, confirm summary), column letters א–ח, tooltips, the crash screen.

## Didn't fit / gaps

- **Validation messages:** about 30 strings in logic.ts. Moving them would need a «messages» group (or `Advanced_JSON` keys). That's possible with `Advanced_JSON` in v3, but not wired.
- **Pre-existing in v0.4.3 (not changed):** the Shift+Arrow range-select branch can never run (ESLint `no-dupe-else-if`; plain Arrow keys are caught first). In v0.5.0 the lint error is silenced with a note so behaviour stays identical. Fixing it is a separate change.

## Status + mapping panels (shared `config/status-panel`, status-panel v2) — v0.5.2

| Right pane (boolean, default OFF) | Shows |
|---|---|
| `showStatusPanel` «show מצב חיבור · Extension_Config» | «מצב חיבור»: config table found, row matched (Extension/Variant), fields visible to the element, per-source table/field resolution (+ filters where relevant), and whether `Mapping_Image` / `GitHub_URL` are enabled and filled. |
| `showMappingPanel` «show mapping · Extension_Config.Mapping_Image» | The matched row's `Mapping_Image` attachments (Variant row → default row) as large thumbnails; click = full size in a lightbox, «פתיחה בלשונית חדשה» = full URL; file name; link to `GitHub_URL` when filled. Clear Hebrew hint when the field isn't enabled on the element or is empty. |

`Mapping_Image` (attachment) and `GitHub_URL` (URL) are human-maintained, read-only reference fields. They are **not** part of the 269-slot `FIELD_ORDER` (hook v3.2 lists them as `EXTRA_FIELDS` / `KNOWN_FIELDS`), and the code never writes them. To use them, enable both fields of `Extension_Config` on the element.
