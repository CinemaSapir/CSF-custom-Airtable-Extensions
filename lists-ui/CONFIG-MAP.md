# Config map — Lists UI «רשימות» (lists-ui) v0.6.0

<!-- pane Source_Table_1 = `listsTable` -->
<!-- pane Source_Table_2 = `itemsTable` -->
<!-- pane Source_Table_3 = `filmsTable` -->
<!-- pane Source_Table_4 = `slotsTable` -->
<!-- pane Source_Table_5 = `peopleTable` -->
<!-- pane Source_Table_6 = `checklistsTable` -->
<!-- pane Source_Table_7 = `sourcesTable` -->

- **Source:** `/workspace/csf-demo-v13/lists-ui-ext` (v0.5.18 on PROD/DEMO `<block-id-redacted>` → v0.6.0 committed on the box, not released)
- **Extension_Config row:** `Extension = lists-ui`; Variant = right-pane «גרסת עמוד» (`configVariant`), otherwise the display mode: empty for full, `mine`, `record`
- **Screenshot:** `lists-ui-config-map.png` (harness render, DEMO-like fixture; panels: Home, List page, compact «mine»)
- **Precedence:** right pane → Extension_Config (Variant cell → default-row cell) → code default.
- **Table absent:** DOM byte-identical to v0.5.18 in 10 scenarios (`scripts/config-identity-test.mjs`).

## Right pane (custom properties)

| Key | Notes |
|---|---|
| `listsTable`, `itemsTable`, `filmsTable`, `slotsTable`, `peopleTable`, `checklistsTable`, `sourcesTable` | existing; win over `Source_Table_1–7` |
| `mode`, `recordId` | existing (full / mine / record) |
| `configTable` | NEW, optional: the Extension_Config picker (defaults to the table named Extension_Config if it exists) |
| `configSlug` | NEW, default `lists-ui` |
| `configVariant` | NEW, empty = use the mode (`mine` / `record`) or the default row |

## Slots (53)

| Slot | Element (Slot_Map text) | Code default | Right pane first |
|---|---|---|---|
| `Title` | כותרת מסך השגיאה כשאין טבלת רשימות | רשימות | — |
| `Heading_1` | כותרת דף הבית בצ׳יפ «הכל» | כל הרשימות | — |
| `Heading_2` | כותרת דף הבית בצ׳יפ «שלי» | הרשימות שלי | — |
| `Heading_3` | כותרת דף הבית בצ׳יפ «משותפות איתי» | משותפות איתי | — |
| `Heading_4` | כותרת דף הבית בצ׳יפ «ציבוריות» | ציבוריות | — |
| `Heading_5` | כותרת הבלוק הקומפקטי «הרשימות שלי» (mode=mine) | 📋 הרשימות שלי | — |
| `Tab_Label_1` | צ׳יפ סינון 1 (כל הרשימות) | הכל | — |
| `Tab_Label_2` | צ׳יפ סינון 2 (שלי) | שלי | — |
| `Tab_Label_3` | צ׳יפ סינון 3 (משותפות איתי) | משותפות איתי | — |
| `Tab_Label_4` | צ׳יפ סינון 4 (ציבוריות) | ציבוריות | — |
| `Tab_Label_5` | כפתור תצוגת גלריה | ▦ גלריה | — |
| `Tab_Label_6` | כפתור תצוגת רשימה | ☰ רשימה | — |
| `Button_Text_1` | כפתור יצירת רשימה בסרגל | + רשימה חדשה | — |
| `Button_Text_2` | כפתור יצירת רשימה כשאין רשימות | + יצירת הרשימה הראשונה | — |
| `Button_Text_3` | כפתור הוספת פריט בדף רשימה | + הוספת פריט | — |
| `Button_Text_4` | כפתור הוספה לרשימה (mode=record) | + הוסף לרשימה | — |
| `Button_Text_5` | קישור חזרה לכל הרשימות | → כל הרשימות | — |
| `Button_Text_6` | כפתור מחיקת רשימה | מחק רשימה | — |
| `Button_Text_7` | גלולת הסתרת רשימה בשורה | הסתר | — |
| `Button_Text_8` | גלולת החזרת רשימה מוסתרת | הצג רשימה | — |
| `Button_Text_9` | כפתור שליחה בחלון «רשימה חדשה» | יצירת רשימה | — |
| `Button_Text_10` | כפתור ניקוי סינון (כשהצ׳יפ ריק) | ניקוי סינון | — |
| `Helper_Text_2` | שורת פרטיות תפעולית | הרשימה מציגה מעקב תפעולי בלבד (תפקיד / סטטוס / רמת גישה). פרטי קשר ומזהים אישיים אינם מוצגים כאן — ואין לשתף את קישור הממשק מעבר לנדרש. | — |
| `Helper_Text_3` | placeholder חיפוש בדף הבית | חיפוש רשימה… | — |
| `Helper_Text_4` | placeholder הערה לפריט | הוסיפו הערה… | — |
| `Helper_Text_5` | placeholder תיאור רשימה | הוסיפו תיאור… | — |
| `Helper_Text_6` | שורה מתחת לכותרת כשאין משתמש מחובר | ציבוריות בלבד | — |
| `Content_Text_1` | כותרת אזור הרשימות המוסתרות; {n} = מספר | רשימות מוסתרות ({n}) | — |
| `Content_Text_2` | תגית «מוסתרת» | מוסתרת | — |
| `Content_Text_3` | כותרת חלון «רשימה חדשה» | רשימה חדשה ✨ | — |
| `Content_Text_6` | תגית רשימה דינמית | ⚡ דינמית | — |
| `Content_Text_7` | תגית צ׳קליסט | ✓ עם סימונים | — |
| `Content_Text_8` | תצוגה מקדימה של רשימה ריקה | הרשימה עדיין ריקה | — |
| `Content_Text_9` | תצוגה מקדימה של רשימה דינמית בלי התאמות | אין כרגע פריטים תואמים | — |
| `Content_Text_10` | כפתור ניקוי חיפוש (אין תוצאות) | ניקוי החיפוש | — |
| `Empty_State_Text_1` | כותרת כשאין רשימות בכלל | עוד אין כאן רשימות | — |
| `Empty_State_Text_2` | פסקת עידוד כשאין רשימות | רשימה אחת קטנה וכבר יש סדר: סרטים לצפייה, משבצות לבדיקה, אנשים לתאם. | — |
| `Empty_State_Text_3` | צ׳יפ בלי רשימות | אין רשימות בקטגוריה הזו כרגע. | — |
| `Empty_State_Text_4` | צ׳יפ שכל הרשימות בו מוסתרות | כל הרשימות כאן מוסתרות. | — |
| `Empty_State_Text_5` | הבלוק הקומפקטי בלי רשימות | ✨ אין כאן רשימות עדיין. | — |
| `Error_Text_1` | אין הרשאת יצירה (מוצג מתחת לכפתור) | אין לך הרשאה ליצור רשימה כאן. בדקו שיתוף הממשק (Can edit records / הוספת רשומות) והרשאות טבלת Lists. | — |
| `Error_Text_2` | אין טבלת רשימות / פריטים | טבלת הרשימות או טבלת פריטי הרשימה לא זמינות לתוסף. יש לבחור אותן בפאנל המאפיינים של האלמנט. | — |
| `Error_Text_3` | שדות חסרים באלמנט; {fields} = רשימת השדות | חסרים שדות בהגדרות האלמנט: {fields}. יש להפעיל אותם בפאנל השדות של האלמנט. | — |
| `Error_Text_4` | mode=record בלי טבלת רשומה | יש לבחור בהגדרות האלמנט את טבלת הרשומה: סרטים, משבצות או אנשים. | — |
| `Error_Text_5` | הודעה כשאין הרשאה לשנות את הרשימה | אין לך הרשאה לשנות את הרשימה הזו. | — |
| `Source_Table_1` | טבלת הרשימות — רק אם הפאנל הימני ריק (ריק = Lists) | — | `listsTable` |
| `Source_Table_2` | טבלת פריטי רשימה — רק אם הפאנל ריק (ריק = List Item) | — | `itemsTable` |
| `Source_Table_3` | טבלת סרטים — רק אם הפאנל ריק (ריק = Films) | — | `filmsTable` |
| `Source_Table_4` | טבלת משבצות — רק אם הפאנל ריק (ריק = Slots_Events) | — | `slotsTable` |
| `Source_Table_5` | טבלת אנשים — רק אם הפאנל ריק (ריק = People) | — | `peopleTable` |
| `Source_Table_6` | טבלת צ׳קליסטים — רק אם הפאנל ריק (ריק = Checklists) | — | `checklistsTable` |
| `Source_Table_7` | טבלת List_Sources — רק אם הפאנל ריק (ריק = List_Sources) | — | `sourcesTable` |
| `Number_1` | כמה רשימות מוצגות בבלוק הקומפקטי לפני «הצגת כל…» | 6 | — |

## Data (not slots)

List names, descriptions, items, posters, owners = record data (Lists / List Item / Films / Slots_Events / People / Checklists / List_Sources).

## Kept in code on purpose

- Privacy deny-lists in `dynlogic.ts`: `SENSITIVE_TYPES`, `SENSITIVE_NAME`, `HARD_DENY`, `DENIED_COND_CHOICES` — no cell can unhide phones, emails or IDs.
- Kind labels (`kinds.ts TABLE_HE`), counts («N פריטים», «⚡ N משבצות», «הצגת כל N הרשימות»), confirm dialogs, dynamic-condition operators, toasts.
- `VisBadge` / `PRIVATE_NOTE` (`Helper_Text_1`, `Content_Text_4–5` left free): dead component in v0.5.18, never rendered.

## Didn't fit / gaps

- None blocking. The 13 newer list kinds (Itinerary, Trips, Suppliers, …) take their Hebrew names from `kinds.ts`; making those editable would need an `Option_List` mapping (`Option_List_1` = «tableName = label» lines), possible in v3 but not wired.
