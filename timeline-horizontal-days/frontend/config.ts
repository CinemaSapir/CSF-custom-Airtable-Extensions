/** Extension_Config code defaults — ONE row Extension = «timeline-horizontal-days», empty Variant (the owner 17:21: own block <block-id-redacted>). */
import type {ConfigDefaults, SlotDocs} from './useExtensionConfig';

export const CONFIG_SLUG = 'timeline-horizontal-days';
export const CONFIG_VARIANT = '';
/** flexible aliases (matched loosely: case, spaces / - / _, invisible marks, nikud). A row typed any of these is used as-is.
 *  Never the vertical timeline's rows («timeline-festival-days», «timeline», program-by-day) — those belong to <block-id-redacted>. */
export const CONFIG_ALIASES = ['timeline-horizontal-days', 'timeline horizontal days', 'timeline-horizontal', 'horizontal-timeline', 'timeline-h', 'h-timeline', 'htimeline', 'timeline horizontal of days', 'horizontal days', 'טיימליין אופקי', 'ציר זמן אופקי'];

import {githubFolder, looseKey, pickConfigRows, type MatchRow} from './statusCore';
const ALIAS = new Set(CONFIG_ALIASES.map(looseKey));
export const isAlias = (s: unknown) => !!looseKey(s) && ALIAS.has(looseKey(s));
/** the text that names this row (Extension; when empty / hidden: primary, Display_Name, GitHub_URL folder — like the shared hook v4) */
export function rowName(r: Pick<MatchRow, 'extension' | 'primary' | 'displayName' | 'github'>): string {
    if (r.extension.trim()) return r.extension;
    return [r.primary, r.displayName, githubFolder(r.github)].find(isAlias) ?? '';
}
export const isMine = (r: Pick<MatchRow, 'extension' | 'primary' | 'displayName' | 'github'>) => isAlias(rowName(r));
export type ConfigKey = {slug: string; variant: string; legacy: boolean; /** a row that is NOT ours would win the shared scoring → read code defaults only */ blocked?: boolean};
export type KeyRow = {extension: string; variant: string; id?: string; primary?: string; displayName?: string; github?: string};
const full = (r: KeyRow, n: number): MatchRow => ({id: r.id ?? `r${n}`, extension: r.extension ?? '', variant: r.variant ?? '', primary: r.primary ?? '', displayName: r.displayName ?? '', github: r.github ?? ''});
/**
 * Which Extension_Config row the horizontal timeline reads (pure; rows = the config table's identity cells, null = not readable).
 *  1. a row named ≈ «timeline-horizontal-days» → that key + the pane Variant (empty by default);
 *  2. else a row named by one of the aliases → that row's own text, verbatim (the shared hook then scores it 100) + the pane Variant;
 *  3. else «timeline-horizontal-days» (no row → code defaults).
 * Guard: the shared hook v4 scores rows loosely («timeline» is «part of» timeline-horizontal-days → 45 ≥ 40). If the row it would
 * pick is not one of ours, `blocked` → the element reads no config row at all (code defaults) and never writes into another
 * extension's row (vertical timeline, countdown…).
 */
export function pickConfigKey(rows: ReadonlyArray<KeyRow> | null, paneVariant: string): ConfigKey {
    const pv = ['default', 'timeline'].includes(looseKey(paneVariant)) || isAlias(paneVariant) ? '' : paneVariant.trim(); // «timeline» = the vertical's old pane value
    if (!rows) return {slug: CONFIG_SLUG, variant: pv, legacy: false};
    const fr = rows.map(full);
    const exact = fr.find(r => looseKey(rowName(r)) === looseKey(CONFIG_SLUG));
    const al = exact ?? fr.find(isMine);
    const slug = al ? (exact ? CONFIG_SLUG : rowName(al).trim()) : CONFIG_SLUG;
    const pick = pickConfigRows(fr, slug, pv);
    const winners = [pick.best, pick.variantBest].filter((x): x is NonNullable<typeof x> => !!x);
    const blocked = winners.some(w => !isMine(w));
    return {slug, variant: pv, legacy: !!al && !exact, ...(blocked ? {blocked} : {})};
}

/** A-v7 COLORS (frozen design; supersedes the older palette in DESIGN §4.1 Option_List_6) */
export const TABLE_LIST = [
    'Slots_Events | משבצות | blueLight2 |',
    'Staffing | צוות | tealLight2 |',
    'Invitations | הזמנות | tealLight1 |',
    'Itinerary | מסלולים | purpleLight2 |',
    'Lodging | לינה | purpleLight2 |',
    'Booking Resources | ציוד | purpleLight1 |',
    'Social Posts | סושיאל | greenLight2 |',
].join('\n');

export const TIMELINE_DEFAULTS: ConfigDefaults = {
    Title: 'טיימליין אופקי',
    Heading_2: 'הכנות',
    Heading_3: 'פסטיבל',
    Heading_4: 'פירוק',
    Table_Heading_1: 'טבלה',
    Helper_Text_1: 'חיפוש…',
    Helper_Text_3: '↔ עוקב אחרי הסינון של ציר הזמן',
    Helper_Text_4: 'סגרתם את השורה · לחצו לפתיחה',
    Helper_Text_5: 'אין פריטים ביום הזה · לחצו לפתיחה',
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
    Tab_Label_2: 'אפשרויות שורה',
    Button_Text_5: 'צור',
    Button_Text_6: 'ביטול',
    Content_Text_10: 'רשומה חדשה',
    Content_Text_11: 'קשר למשבצת',
    Content_Text_12: 'לראש|הזז למעלה|הזז למטה|לתחתית|סגור שורה',
    Content_Text_13: 'בלינה',
    Content_Text_14: 'טבלאות סגורות',
    Helper_Text_7: 'גררו למעלה/למטה לשינוי סדר השורות · חיצים: הזזה',
    Helper_Text_8: 'גררו לשינוי גובה השורה · לחיצה כפולה: איפוס · חיצים: ±4px',
    Toggle_1: true,
    Toggle_Label_1: 'סגור טבלאות שקטות',
    Toggle_2: true,
    Toggle_Label_2: 'כווץ שעות ריקות',
    Toggle_3: true,
    Toggle_Label_3: 'חתך רוחב',
    Toggle_4: true,
    Toggle_Label_4: '↔ כמו בציר הזמן',
    Dropdown_Label_3: 'רזולוציה',
    Dropdown_Default_3: '720', // v0.1.2 (the owner 05:20 #5): 12 hours on screen by default
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
    Source_Table_1: 'People',
    Source_Table_2: 'Films',
    Source_Table_3: 'Festival Days',
    Color_1: 'grayLight2',
    Color_2: 'cyanLight2',
    Color_3: 'yellowLight2',
    Number_1: 0.2,
    Number_2: 12,
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
    Table_Heading_1: 'כותרת עמודת שמות השורות (מעל הטבלאות)',
    Table_Heading_2: 'שעת צ׳ק-אין ברירת מחדל ללינה (השדה בתאריך בלבד), HH:MM',
    Table_Heading_3: 'שעת צ׳ק-אאוט ברירת מחדל ללינה, HH:MM',
    Helper_Text_1: 'placeholder של החיפוש',
    Helper_Text_3: 'לא בשימוש מ-v0.2.4',
    Helper_Text_4: 'טולטיפ שבב של שורה שנסגרה ידנית',
    Helper_Text_5: 'טולטיפ שבב של טבלה שקטה (אין פריטים ביום)',
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
    Tab_Label_2: 'טולטיפ כפתור ⋯ של שורה',
    Button_Text_5: 'כפתור «צור» בחלון היצירה (גרירה על שטח ריק)',
    Button_Text_6: 'קישור «ביטול» בהודעת הביטול (6 שניות, נעצרת בריחוף)',
    Content_Text_10: 'כותרת חלון היצירה',
    Content_Text_11: 'תווית בחירת משבצת (טבלאות שזמנן מהמשבצת)',
    Content_Text_12: 'תפריט שורה ⋯: לראש|למעלה|למטה|לתחתית|סגור (מופרד ב-|)',
    Content_Text_13: 'תווית ספירת הלינה («N בלינה»)',
    Content_Text_14: 'כותרת שורת הטבלאות הסגורות',
    Helper_Text_7: 'טולטיפ ידית ⠿ לגרירת שורה',
    Helper_Text_8: 'טולטיפ הקצה התחתון של כותרת שורה לשינוי גובה (נשמר לכל משתמש)',
    Toggle_1: 'ברירת מחדל: טבלה בלי פריטים ביום המוצג נסגרת לשורת השבבים',
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
    Filter_1: 'v0.1.2 סינונים לפי טבלה (גיבוי לחלונית הימנית): שורה לכל שדה «Table.Field <תנאי> ערך|ערך», למשל «Slots_Events.Status = משובץ». תנאים: הוא / אינו / מכיל / לא מכיל / ריק / לא ריק (או is / is not / contains / is empty / is not empty, = != ~). «Table.Field» לבד = רק תפריט במשפך. שורה אחת בלי תנאי → Filter_Operator_N + Filter_Value_N. שמות טבלה/שדה גמישים',
    Filter_2: 'כמו Filter_1 (כל טבלה, כמה שורות)',
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
    Number_3: 'לא בשימוש באופקי (שמור)',
    Number_4: 'מספר ימי פסטיבל',
    Date_1: 'יום ראשון בציר (יום −15)',
    Date_2: 'יום אחרון בציר (יום +10)',
    Date_3: 'יום 1 של הפסטיבל',
};
