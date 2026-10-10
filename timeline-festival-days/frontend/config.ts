/** Extension_Config code defaults — ONE row Extension = «timeline-festival-days», empty Variant (the owner 13:12 + 13:17; was «program-by-day» [timeline]). */
import type {ConfigDefaults, SlotDocs} from './useExtensionConfig';

export const CONFIG_SLUG = 'timeline-festival-days';
export const CONFIG_VARIANT = '';
/** v0.2.10 loose fallbacks so PROD doesn't break before its row is renamed: Extension = «timeline», then the old
 *  Extension = «program-by-day» + Variant = «timeline». */
export const FALLBACK_SLUG = 'timeline';
export const LEGACY_SLUG = 'program-by-day';
export const LEGACY_VARIANT = 'timeline';

import {looseKey} from './statusCore';
/** v0.2.10: same loose key as the shared status panel v4 / hook v3.4 (trim, invisible chars, separators, case). */
const lk = looseKey;
export type ConfigKey = {slug: string; variant: string; legacy: boolean};
/**
 * Which Extension_Config row the timeline reads (pure; rows = Extension / Variant cell text, null = table not readable).
 *  1. a row Extension ≈ «timeline-festival-days» exists → that key + the pane Variant (empty by default; the old pane value «timeline» = empty);
 *  2. else a row Extension ≈ «timeline» → that row (its own Extension text) + the pane Variant;
 *  3. else (no other pane Variant) a row Extension ≈ «program-by-day» + Variant ≈ «timeline» → that row;
 *  4. else «timeline-festival-days» (no row → code defaults).
 * Fallback rows' Extension / Variant text is used verbatim (the hook matches the trimmed cell exactly).
 */
export function pickConfigKey(rows: ReadonlyArray<{extension: string; variant: string}> | null, paneVariant: string): ConfigKey {
    const pv = lk(paneVariant) === lk(LEGACY_VARIANT) || lk(paneVariant) === 'default' ? '' : paneVariant.trim();
    const fresh = {slug: CONFIG_SLUG, variant: pv, legacy: false};
    if (!rows || rows.some(r => lk(r.extension) === lk(CONFIG_SLUG))) return fresh;
    const mid = rows.find(r => lk(r.extension) === lk(FALLBACK_SLUG));
    if (mid) return {slug: mid.extension.trim(), variant: pv, legacy: true};
    const old = !pv ? rows.find(r => lk(r.extension) === lk(LEGACY_SLUG) && lk(r.variant) === lk(LEGACY_VARIANT)) : undefined;
    return old ? {slug: old.extension.trim(), variant: old.variant.trim(), legacy: true} : fresh;
}

/** A-v7 COLORS (frozen design; supersedes the older palette in DESIGN §4.1 Option_List_6) */
export const TABLE_LIST = [
    'Slots_Events | משבצות | blueLight2 |',
    'Staffing | צוות | tealLight2 |',
    'Invitations | הזמנות | tealLight1 |',
    'Itinerary | מסלולים | purpleLight2 |',
    'Lodging | לינה | purpleLight2 |',
    'Booking Resources | ציוד | purpleLight1 |',
    'Tasks | משימות | greenLight1 |',
    'Social Posts | סושיאל | greenLight2 |',
    'Petty Cash | קופה קטנה | yellowLight2 |',
    'Requests | רכש | orangeLight2 |',
    'transactions | תשלומים | yellowLight1 |',
    'Notebook | פגישות | grayLight2 |',
    'Approvals | אישורים | orangeLight1 |',
].join('\n');

export const TIMELINE_DEFAULTS: ConfigDefaults = {
    Title: 'טיימליין',
    Heading_2: 'הכנות',
    Heading_3: 'פסטיבל',
    Heading_4: 'פירוק',
    Table_Heading_1: 'שעה',
    Helper_Text_1: 'חיפוש…',
    Helper_Text_3: '↔ עוקב אחרי הסינון של ציר הזמן',
    Helper_Text_4: 'סגור · לחצו לפתיחה',
    Helper_Text_5: 'ריק ביום הזה · לחצו לפתיחה',
    Helper_Text_6: 'בשדות הלינה יש תאריך בלבד · שעות ברירת מחדל: צ׳ק-אין {in} · צ׳ק-אאוט {out}',
    Content_Text_1: 'חתך רוחב',
    Content_Text_2: 'כל היום',
    Content_Text_3: 'מתוך',
    Content_Text_4: '↔ כמו בציר הזמן',
    Content_Text_5: 'נקה הכל ✕',
    Content_Text_6: 'נקה סינון חלון ✕',
    Content_Text_7: 'סינון',
    Content_Text_8: 'תחומים',
    Content_Text_9: 'טבלאות בחתך:',
    Empty_State_Text_1: 'אין פריטים שתואמים לסינון',
    Empty_State_Text_2: 'אין אירועים בחתך',
    Empty_State_Text_3: 'אין פריטים בטבלאות שבחרתם לחתך',
    Button_Text_1: 'עכשיו',
    Button_Text_2: 'קפיצה ל…',
    Button_Text_3: 'קפוץ',
    Button_Text_4: 'ביטול',
    Tab_Label_1: 'תצוגה',
    Tab_Label_2: 'אפשרויות עמודה',
    Button_Text_5: 'צור',
    Button_Text_6: 'ביטול',
    Content_Text_10: 'רשומה חדשה',
    Content_Text_11: 'קשר למשבצת',
    Content_Text_12: 'להתחלה|הזז ימינה|הזז שמאלה|לסוף|סגור עמודה',
    Helper_Text_7: 'גררו לשינוי הסדר · חיצים: הזזה',
    Helper_Text_8: 'גררו לשינוי רוחב · לחיצה כפולה: איפוס · חיצים: ±20px',
    Toggle_1: true,
    Toggle_Label_1: 'כווץ עמודות ריקות',
    Toggle_2: true,
    Toggle_Label_2: 'כווץ שעות ריקות',
    Toggle_3: true,
    Toggle_Label_3: 'חתך רוחב',
    Toggle_4: true,
    Toggle_Label_4: '↔ כמו בציר הזמן',
    Dropdown_Label_3: 'רזולוציה',
    Dropdown_Default_3: '360',
    Option_List_3: ['60 | שעה', '180 | 3 שעות', '360 | 6 שעות', '720 | 12 שעות', '1440 | יממה'].join('\n'),
    Option_List_6: TABLE_LIST,
    Option_List_7: ['Todo | לביצוע', 'לא התחילה | לביצוע', 'In progress | בתהליך', 'בתהליך | בתהליך', 'Done | בוצע ✓', 'הושלמה | בוצע ✓'].join('\n'),
    Option_List_8: ['09:00 | בוקר', '13:00 | צהריים', '19:00 | ערב', '22:30 | לילה'].join('\n'),
    Filter_Label_1: 'מיקום',
    Filter_Label_2: 'אדם',
    Filter_Label_3: 'סרט',
    Filter_Label_4: 'סטטוס',
    Filter_6: 'Slots_Events.Start',
    Filter_Operator_6: 'is not empty',
    Filter_7: 'Slots_Events.Type',
    Filter_Operator_7: 'is not',
    Filter_Value_7: 'למחיקה|לא מוגדר / לא לשבץ|לא מוגדר|לא לשבץ',
    Filter_9: 'Tasks.Status',
    Filter_Operator_9: 'is not',
    Filter_Value_9: 'בוטלה|הועברה לאחר',
    Source_Table_1: 'People',
    Source_Table_2: 'Films',
    Source_Table_3: 'Festival Days',
    Color_1: 'grayLight2',
    Color_2: 'cyanLight2',
    Color_3: 'yellowLight2',
    Number_1: 0.2,
    Number_2: 6,
    Number_3: 30,
    Number_4: 7,
    Date_1: '2026-10-16T00:00:00+03:00',
    Date_2: '2026-11-10T00:00:00+02:00',
    Date_3: '2026-11-01T00:00:00+02:00',
    Table_Heading_2: '15:00',
    Table_Heading_3: '11:00',
};

export const TIMELINE_DOCS: SlotDocs = {
    Title: 'כותרת בשורה העליונה',
    Heading_2: 'שם שלב: הכנות (ימים ≤ 0)',
    Heading_3: 'שם שלב: פסטיבל (ימים 1…Number_4)',
    Heading_4: 'שם שלב: פירוק',
    Table_Heading_1: 'כותרת ציר הזמן',
    Table_Heading_2: 'שעת צ׳ק-אין ברירת מחדל ללינה (השדה בתאריך בלבד), HH:MM',
    Table_Heading_3: 'שעת צ׳ק-אאוט ברירת מחדל ללינה, HH:MM',
    Helper_Text_1: 'placeholder של החיפוש',
    Helper_Text_3: 'לא בשימוש מ-v0.2.4',
    Helper_Text_4: 'טולטיפ פס עמודה סגורה',
    Helper_Text_5: 'טולטיפ פס עמודה ריקה',
    Helper_Text_6: 'הערת כותרת לינה ({in} {out} = השעות)',
    Content_Text_1: 'תווית החתך (בלי שעות)',
    Content_Text_2: 'תווית שורת «כל היום»',
    Content_Text_3: 'מילת «X מתוך Y»',
    Content_Text_4: 'לא בשימוש מ-v0.2.4 (החלון תמיד עוקב אחרי ציר הזמן)',
    Content_Text_5: 'ניקוי כל הסינון (חיפוש + סינוני כל העמודות)',
    Content_Text_6: 'לא בשימוש מ-v0.2.4 (במקום: «הכל» ליד הכפתורים)',
    Content_Text_7: 'לא בשימוש מ-v0.2.5 (אין יותר פילטרים בשורה העליונה)',
    Content_Text_8: 'תפריט בחירת הטבלאות',
    Content_Text_9: 'תווית קטנה לפני כפתורי הטבלאות בחתך (v0.2.4; הבחירה נשמרת לכל משתמש)',
    Empty_State_Text_1: 'אין פריטים לפי הסינון',
    Empty_State_Text_2: 'אין אירועים בחתך',
    Empty_State_Text_3: 'החלון ריק כי כיביתם טבלאות בחתך',
    Button_Text_1: 'כפתור «עכשיו» (שעון ישראל; מחוץ לתוכנית → יום ראשון/אחרון)',
    Button_Text_2: 'כפתור הקפיצה ליד תאריך + שעה (v0.2.2: «…» בסוף מוסר)',
    Button_Text_3: 'לא בשימוש מ-v0.2.2 (אין חלון קפיצה)',
    Button_Text_4: 'לא בשימוש מ-v0.2.2 (אין חלון קפיצה)',
    Tab_Label_1: 'שם תפריט התצוגה (מכיל את מתגי 1–2)',
    Tab_Label_2: 'טולטיפ כפתור ⋯ של עמודה',
    Button_Text_5: 'כפתור «צור» בחלון היצירה (גרירה על שטח ריק)',
    Button_Text_6: 'קישור «ביטול» בהודעת הביטול (6 שניות, נעצרת בריחוף)',
    Content_Text_10: 'כותרת חלון היצירה',
    Content_Text_11: 'תווית בחירת משבצת (טבלאות שזמנן מהמשבצת)',
    Content_Text_12: 'תפריט עמודה: להתחלה|ימינה|שמאלה|לסוף|סגור (מופרד ב-|)',
    Helper_Text_7: 'טולטיפ ידית ⠿ לגרירת עמודה',
    Helper_Text_8: 'טולטיפ קצה כותרת לשינוי רוחב עמודה (נשמר לכל משתמש)',
    Toggle_1: 'ברירת מחדל: כווץ עמודות ריקות לכל יום',
    Toggle_2: 'ברירת מחדל: כווץ שעות ריקות (נשאר 7% עם סימן שבירה) · v0.2.6: ON',
    Toggle_3: 'ברירת מחדל: חתך רוחב מוצג',
    Toggle_4: 'לא בשימוש מ-v0.2.4 (החלון תמיד עוקב אחרי ציר הזמן, מינוס הטבלאות שכיביתם בחתך)',
    Dropdown_3: 'ריק = Option_List_3',
    Dropdown_Label_3: 'תווית «רזולוציה» — זמן שרואים במסך אחד',
    Dropdown_Default_3: 'דקות במסך כברירת מחדל',
    Option_List_3: 'צעדי רזולוציה: דקות | תווית',
    Option_List_6: 'הטבלאות (עמודות): טבלה | תווית | צבע | (אייקון ריק = בלי אייקון). צבע = שם צבע של Airtable למילוי הכרטיס (למשל tealLight2); הפס, המסגרת והנקודה נגזרים אוטומטית ל-<גוון>Dark1. #hex ישן עדיין עובד',
    Option_List_7: 'מפת סטטוסים: ערך | תווית',
    Option_List_8: 'לא בשימוש מ-v0.2.2 (שדה שעה במקום שעות מהירות)',
    Filter_Label_1: 'v0.2.5: שם הלשונית «מיקום» בתפריט הסינון (משפך) של כל עמודה (הקוד מחשב לכל טבלה, כולל דרך המשבצת המקושרת)',
    Filter_Label_2: 'v0.2.5: לשונית «אדם» בתפריט הסינון של כל עמודה',
    Filter_Label_3: 'v0.2.5: לשונית «סרט» בתפריט הסינון של כל עמודה',
    Filter_Label_4: 'v0.2.5: לשונית «סטטוס» בתפריט הסינון של כל עמודה (תוויות מ-Option_List_7)',
    Filter_6: 'קבוע: משבצת בלי Start מוסתרת',
    Filter_7: 'קבוע: סוגי משבצת מוסתרים (Filter_Value_7)',
    Filter_9: 'קבוע: סטטוסי משימה מוסתרים (Filter_Value_9)',
    Filter_1: 'v0.2.5 ברירת המחדל של משפך העמודה (גיבוי לחלונית הימנית): Table.Field · Filter_Operator_N = is any of / is none of · Filter_Value_N = ערכים מופרדים ב-|',
    Filter_2: 'כמו Filter_1 (טבלה אחרת)',
    Filter_3: 'כמו Filter_1 (טבלה אחרת)',
    Filter_4: 'כמו Filter_1 (טבלה אחרת)',
    Filter_5: 'כמו Filter_1 (טבלה אחרת)',
    Filter_8: 'כמו Filter_1 (טבלה אחרת)',
    Filter_10: 'כמו Filter_1 (טבלה אחרת)',
    Source_Table_1: 'טבלת אנשים',
    Source_Table_2: 'טבלת סרטים',
    Source_Table_3: 'טבלת ימי הפסטיבל (שמות ימים)',
    Color_1: 'צבע פס היום – יום פסטיבל (שם צבע Airtable, למשל grayLight2, או #hex)',
    Color_2: 'צבע פס היום – הכנות (למשל cyanLight2)',
    Color_3: 'צבע פס היום – פירוק (למשל yellowLight2)',
    Number_1: 'רוחב החתך (חלק מהמסך)',
    Number_2: 'מקסימום כרטיסים בחלון',
    Number_3: 'רוחב פס עמודה סגורה (px)',
    Number_4: 'מספר ימי פסטיבל',
    Date_1: 'יום ראשון בציר (יום −15)',
    Date_2: 'יום אחרון בציר (יום +10)',
    Date_3: 'יום 1 של הפסטיבל',
};
