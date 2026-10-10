# Config map — Phone book «אנשים ותפקידים» (people-roles) v0.3.0

<!-- pane Source_Table_1 = `peopleTable` -->
<!-- pane Source_Table_2 = `rolesTable` -->
<!-- pane Source_Table_3 = `assignmentsTable` -->
<!-- pane Source_Field_1 = `assignmentPartnerField` -->

- **Source:** `/workspace/csf-demo-v13/people-roles-ext` (v0.2.3 on DEMO `<block-id-redacted>` → v0.3.0 committed on the box, not released)
- **Extension_Config row:** `Extension = people-roles`; Variant = right-pane «גרסת עמוד» (`configVariant`), empty = default row
- **Screenshot:** `people-roles-config-map.png` (harness render, fictional fixture; panel 1 = form + phone book + open row card, panel 2 = a row loaded into the form)
- **Precedence:** right pane → Extension_Config (Variant cell → default-row cell) → code default. Texts have no right-pane field, so for them it's row → code.
- **Table absent:** every value = the code default below → DOM byte-identical to v0.2.3 in 5 scenarios (`scripts/config-identity-test.mjs`).

## Right pane (custom properties)

| Key | Label | Default | Notes |
|---|---|---|---|
| `peopleTable` / `rolesTable` / `assignmentsTable` | existing | DEMO table ids | win over `Source_Table_1–3` |
| `assignmentPartnerField` | existing | `Assignments.Partners 2` | wins over `Source_Field_1` (Table.Field, must be on the Assignments table) |
| `configTable` | טבלת הגדרות (Extension_Config) – לא חובה | the table named `Extension_Config` if it exists | NEW — the picker that grants the element access |
| `configSlug` | מפתח הגדרות (Extension) | `people-roles` | NEW |
| `configVariant` | גרסת עמוד (Variant) – ריק = ברירת מחדל | empty | NEW |

## Slots (56)

| Slot | Element (Slot_Map text) | Code default | Right pane first |
|---|---|---|---|
| `Title` | כותרת הטופס העליון | חיפוש/הוספת/עריכת שם ותפקיד | — |
| `Heading_1` | כותרת ספר הטלפונים | ספר טלפונים | — |
| `Heading_2` | כותרת רצועת «שינויים אחרונים» | שינויים אחרונים | — |
| `Heading_3` | שם התוסף (מסך הגדרה חסרה + שורת הגרסה בתחתית) | אנשים ותפקידים | — |
| `Table_Heading_1` | עמודה 1 + תווית בכרטיס: שם | שם | — |
| `Table_Heading_2` | עמודה 2: תפקיד | תפקיד | — |
| `Table_Heading_3` | עמודה 3: טלפון אישי | טלפון אישי | — |
| `Table_Heading_4` | עמודה 4: אימייל אישי | אימייל אישי | — |
| `Table_Heading_5` | עמודה 5: טלפון תפקיד | טלפון תפקיד | — |
| `Table_Heading_6` | עמודה 6: אימייל תפקיד | אימייל תפקיד | — |
| `Table_Heading_7` | עמודה 7: גוף שותף | גוף שותף | — |
| `Tab_Label_1` | צ׳יפ סינון: הכל | הכל | — |
| `Tab_Label_2` | צ׳יפ סינון: שיבוצים | שיבוצים | — |
| `Tab_Label_3` | צ׳יפ סינון: פנויים | פנויים | — |
| `Tab_Label_4` | מתג פתיחת כרטיס בשורה | הרחב | — |
| `Tab_Label_5` | סגירת הכרטיס (בשורה ובכרטיס) | סגור | — |
| `Button_Text_1` | כפתור החזרה לגוף השותף של התפקיד | חזרה לגוף השותף של התפקיד | — |
| `Button_Text_2` | כפתור ניקוי הטופס | ניקוי | — |
| `Button_Text_3` | כפתור שורת תפקיד נוספת | הוסף עוד תפקיד לשם הזה | — |
| `Button_Text_4` | כפתור שיבוץ | שבץ | — |
| `Button_Text_5` | כפתור ביטול שיבוץ | ביטול שיבוץ | — |
| `Button_Text_6` | כפתור ניקוי סינון ומיון | נקה סינון ומיון | — |
| `Button_Text_7` | כפתור הסרת שורת תפקיד (לא מוחק) | הסר שורה | — |
| `Button_Text_8` | כפתור פתיחת רשומה | פתח רשומה | — |
| `Button_Text_9` | כפתור החלפת שם/תפקיד שנבחר | החלף | — |
| `Button_Text_10` | כפתור טעינה לטופס (כרטיס) | טען לטופס | — |
| `Helper_Text_1` | שורת ההסבר מתחת לכותרת | הקלידו שם (או טלפון) ו/או תפקיד כדי לחפש בספר הטלפונים למטה. לא מצאתם? בחרו ״צור״ ברשימה כדי להוסיף חדש. | — |
| `Helper_Text_2` | placeholder בשדה השם | בחר שם / צור שם חדש | — |
| `Helper_Text_3` | placeholder בשדה התפקיד | בחר תפקיד / צור תפקיד חדש | — |
| `Helper_Text_4` | placeholder בגוף שותף (מהתפקיד) | החלפה לאדם הזה בלבד… | — |
| `Helper_Text_5` | טולטיפ «ביטול שיבוץ» | מבטל רק את הקישור בין השם לתפקיד. האדם והתפקיד עצמם לא נמחקים. | — |
| `Helper_Text_6` | הסבר מתחת לגוף שותף אישי; {name} = שם האדם | חל רק על {name} בתפקיד הזה — לא על התפקיד ולא על אחרים. | — |
| `Content_Text_1` | תווית שדה בטופס: שם | שם | — |
| `Content_Text_2` | תווית שדה בטופס: תפקיד | תפקיד | — |
| `Content_Text_3` | תווית שדה בטופס: טלפון אישי (גם בהודעת «עודכן») | טלפון אישי | — |
| `Content_Text_4` | תווית שדה בטופס: אימייל אישי | אימייל אישי | — |
| `Content_Text_5` | תווית שדה בטופס: טלפון תפקיד | טלפון תפקיד | — |
| `Content_Text_6` | תווית שדה בטופס: אימייל תפקיד | אימייל תפקיד | — |
| `Content_Text_7` | תווית שדה בטופס + מסנן: גוף שותף | גוף שותף | — |
| `Content_Text_8` | גלולה לתפקיד בלי שם | פנוי | — |
| `Content_Text_9` | אפשרות במסנן הגוף השותף | ללא גוף שותף | — |
| `Content_Text_10` | תגית שיבוץ עתידי | מתוכנן | — |
| `Content_Text_11` | סטטוס אחרי שיבוץ | ✓ שובץ לתפקיד | — |
| `Content_Text_12` | כפתור עריכת שם האדם | עריכת שם | — |
| `Content_Text_13` | כפתור עריכת שם התפקיד | עריכת שם התפקיד | — |
| `Content_Text_14` | סטטוס כשהשיבוץ כבר קיים | ✓ כבר משובץ לתפקיד | — |
| `Empty_State_Text_1` | אין שורות לסינון | אין שורות לסינון הזה | — |
| `Empty_State_Text_2` | אין תפקידים פנויים | אין תפקידים פנויים | — |
| `Empty_State_Text_3` | לשם שנבחר אין תפקיד | לשם הזה עדיין אין תפקיד — בחרו או צרו תפקיד למעלה | — |
| `Error_Text_1` | טבלאות חסרות; {tables} = רשימה | הטבלאות הבאות לא זמינות לתוסף: {tables}. יש לבחור אותן בפאנל המאפיינים של האלמנט. | — |
| `Error_Text_2` | אין הרשאת יצירה | יש להפעיל ״יצירת רשומות״ לטבלה בפאנל הנתונים של הרכיב (עורך הממשק). | — |
| `Source_Table_1` | טבלת אנשים — רק אם הפאנל הימני ריק (ריק = People) | — | `peopleTable` |
| `Source_Table_2` | טבלת תפקידים — רק אם הפאנל ריק (ריק = Roles) | — | `rolesTable` |
| `Source_Table_3` | טבלת שיבוצים — רק אם הפאנל ריק (ריק = Assignments) | — | `assignmentsTable` |
| `Source_Field_1` | שדה הגוף השותף האישי (Assignments.<link → Partners>) — רק אם הפאנל ריק | — | `assignmentPartnerField` |
| `Duration_1` | כמה זמן אפשר «בטל» ברצועת השינויים (h:mm) | 600 s (0:10) | — |

## Data (not slots)

Names, roles, phones, emails, partners = record data from People / Roles / Assignments / Partners (field ids in `IDS`, resolved by id then by name).

## Kept in code on purpose

- Write rules: the role block never writes `Roles › Partner`; only a writable link to the same table as `Roles › Partner` counts as the personal partner; the People/Roles/Assignments link fields can't be the partner field.
- Validation, toasts and status messages («נטען לטופס.», «משבץ…», duplicate warnings, «… עודכן»), tooltips, sort labels («בסדר עולה/יורד»), summary line («N שיבוצים · N תפקידים פנויים», «מוצגות N מתוך M שורות»), keyboard hints, «לפנייה: …» composition, «(ללא שם)», «חדש» tag, «נשמר».

## Didn't fit / gaps

- All 10 `Button_Text` are used; a phone book with more actions would need `Button_Text_11+` (not needed today).
- ~25 status / toast strings stay in code: v3 has no «message» group and `Content_Text_15` is the only free content slot left.

## Status + mapping panels (shared `config/status-panel`, status-panel v2) — v0.3.2

| Right pane (boolean, default OFF) | Shows |
|---|---|
| `showStatusPanel` «show מצב חיבור · Extension_Config» | «מצב חיבור»: config table found, row matched (Extension/Variant), fields visible to the element, per-source table/field resolution (+ filters where relevant), and whether `Mapping_Image` / `GitHub_URL` are enabled and filled. |
| `showMappingPanel` «show mapping · Extension_Config.Mapping_Image» | The matched row's `Mapping_Image` attachments (Variant row → default row) as large thumbnails; click = full size in a lightbox, «פתיחה בלשונית חדשה» = full URL; file name; link to `GitHub_URL` when filled. Clear Hebrew hint when the field isn't enabled on the element or is empty. |

`Mapping_Image` (attachment) and `GitHub_URL` (URL) are human-maintained, read-only reference fields. They are **not** part of the 269-slot `FIELD_ORDER` (hook v3.2 lists them as `EXTRA_FIELDS` / `KNOWN_FIELDS`), and the code never writes them. To use them, enable both fields of `Extension_Config` on the element.
