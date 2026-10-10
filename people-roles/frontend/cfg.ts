/**
 * v0.3.0 — Extension_Config wiring for the phone book (row Extension = `people-roles`, Variant = right-pane «גרסת עמוד»).
 * Map + screenshot: /workspace/csf-extension-config/maps/people-roles.md.
 * Precedence (the owner, 2026-10-09): RIGHT PANE → Extension_Config row (variant → default row) → code default below.
 *   Tables: peopleTable / rolesTable / assignmentsTable pickers → Source_Table_1–3 → DEMO ids.
 *   Per-person partner link: assignmentPartnerField picker → Source_Field_1 (Table.Field) → none (read-only partner).
 * While Extension_Config is absent every value below is used as-is → identical to v0.2.3 (scripts/config-identity-test.mjs).
 */
import {type ConfigDefaults, type DurationSlot, type ExtensionConfig, type SlotDocs, type TextSlot, useExtensionConfigOptional} from './useExtensionConfig';

export const CONFIG_SLUG = 'people-roles';
export const CONFIG_DISPLAY_NAME = 'ספר טלפונים – אנשים ותפקידים';

export const DEFAULTS = {
    Title: 'חיפוש/הוספת/עריכת שם ותפקיד',
    Heading_1: 'ספר טלפונים',
    Heading_2: 'שינויים אחרונים',
    Heading_3: 'אנשים ותפקידים',
    // phone-book columns + contact card labels
    Table_Heading_1: 'שם',
    Table_Heading_2: 'תפקיד',
    Table_Heading_3: 'טלפון אישי',
    Table_Heading_4: 'אימייל אישי',
    Table_Heading_5: 'טלפון תפקיד',
    Table_Heading_6: 'אימייל תפקיד',
    Table_Heading_7: 'גוף שותף',
    // form field labels (top)
    Content_Text_1: 'שם',
    Content_Text_2: 'תפקיד',
    Content_Text_3: 'טלפון אישי',
    Content_Text_4: 'אימייל אישי',
    Content_Text_5: 'טלפון תפקיד',
    Content_Text_6: 'אימייל תפקיד',
    Content_Text_7: 'גוף שותף',
    Content_Text_8: 'פנוי',
    Content_Text_9: 'ללא גוף שותף',
    Content_Text_10: 'מתוכנן',
    Content_Text_11: '✓ שובץ לתפקיד',
    Content_Text_12: 'עריכת שם',
    Content_Text_13: 'עריכת שם התפקיד',
    Content_Text_14: '✓ כבר משובץ לתפקיד',
    Helper_Text_1: 'הקלידו שם (או טלפון) ו/או תפקיד כדי לחפש בספר הטלפונים למטה. לא מצאתם? בחרו ״צור״ ברשימה כדי להוסיף חדש.',
    Helper_Text_2: 'בחר שם / צור שם חדש',
    Helper_Text_3: 'בחר תפקיד / צור תפקיד חדש',
    Helper_Text_4: 'החלפה לאדם הזה בלבד…',
    Helper_Text_5: 'מבטל רק את הקישור בין השם לתפקיד. האדם והתפקיד עצמם לא נמחקים.',
    Helper_Text_6: 'חל רק על {name} בתפקיד הזה — לא על התפקיד ולא על אחרים.',
    Tab_Label_1: 'הכל',
    Tab_Label_2: 'שיבוצים',
    Tab_Label_3: 'פנויים',
    // row expand toggle + card close
    Tab_Label_4: 'הרחב',
    Tab_Label_5: 'סגור',
    Button_Text_1: 'חזרה לגוף השותף של התפקיד',
    Button_Text_2: 'ניקוי',
    Button_Text_3: 'הוסף עוד תפקיד לשם הזה',
    Button_Text_4: 'שבץ',
    Button_Text_5: 'ביטול שיבוץ',
    Button_Text_6: 'נקה סינון ומיון',
    Button_Text_7: 'הסר שורה',
    Button_Text_8: 'פתח רשומה',
    Button_Text_9: 'החלף',
    Button_Text_10: 'טען לטופס',
    Empty_State_Text_1: 'אין שורות לסינון הזה',
    Empty_State_Text_2: 'אין תפקידים פנויים',
    Empty_State_Text_3: 'לשם הזה עדיין אין תפקיד — בחרו או צרו תפקיד למעלה',
    Error_Text_1: 'הטבלאות הבאות לא זמינות לתוסף: {tables}. יש לבחור אותן בפאנל המאפיינים של האלמנט.',
    Error_Text_2: 'יש להפעיל ״יצירת רשומות״ לטבלה בפאנל הנתונים של הרכיב (עורך הממשק).',
    // «שינויים אחרונים» undo window (seconds; h:mm in the table = 0:10)
    Duration_1: 600,
} satisfies ConfigDefaults;

export const DOCS: SlotDocs = {
    Title: 'כותרת הטופס העליון',
    Heading_1: 'כותרת ספר הטלפונים',
    Heading_2: 'כותרת רצועת «שינויים אחרונים»',
    Heading_3: 'שם התוסף (מסך הגדרה חסרה + שורת הגרסה בתחתית)',
    Table_Heading_1: 'עמודה 1 + תווית בכרטיס: שם',
    Table_Heading_2: 'עמודה 2: תפקיד',
    Table_Heading_3: 'עמודה 3: טלפון אישי',
    Table_Heading_4: 'עמודה 4: אימייל אישי',
    Table_Heading_5: 'עמודה 5: טלפון תפקיד',
    Table_Heading_6: 'עמודה 6: אימייל תפקיד',
    Table_Heading_7: 'עמודה 7: גוף שותף',
    Content_Text_1: 'תווית שדה בטופס: שם',
    Content_Text_2: 'תווית שדה בטופס: תפקיד',
    Content_Text_3: 'תווית שדה בטופס: טלפון אישי (גם בהודעת «עודכן»)',
    Content_Text_4: 'תווית שדה בטופס: אימייל אישי',
    Content_Text_5: 'תווית שדה בטופס: טלפון תפקיד',
    Content_Text_6: 'תווית שדה בטופס: אימייל תפקיד',
    Content_Text_7: 'תווית שדה בטופס + מסנן: גוף שותף',
    Content_Text_8: 'גלולה לתפקיד בלי שם',
    Content_Text_9: 'אפשרות במסנן הגוף השותף',
    Content_Text_10: 'תגית שיבוץ עתידי',
    Content_Text_11: 'סטטוס אחרי שיבוץ',
    Content_Text_12: 'כפתור עריכת שם האדם',
    Content_Text_13: 'כפתור עריכת שם התפקיד',
    Content_Text_14: 'סטטוס כשהשיבוץ כבר קיים',
    Helper_Text_1: 'שורת ההסבר מתחת לכותרת',
    Helper_Text_2: 'placeholder בשדה השם',
    Helper_Text_3: 'placeholder בשדה התפקיד',
    Helper_Text_4: 'placeholder בגוף שותף (מהתפקיד)',
    Helper_Text_5: 'טולטיפ «ביטול שיבוץ»',
    Helper_Text_6: 'הסבר מתחת לגוף שותף אישי; {name} = שם האדם',
    Tab_Label_1: 'צ׳יפ סינון: הכל',
    Tab_Label_2: 'צ׳יפ סינון: שיבוצים',
    Tab_Label_3: 'צ׳יפ סינון: פנויים',
    Tab_Label_4: 'מתג פתיחת כרטיס בשורה',
    Tab_Label_5: 'סגירת הכרטיס (בשורה ובכרטיס)',
    Button_Text_1: 'כפתור החזרה לגוף השותף של התפקיד',
    Button_Text_2: 'כפתור ניקוי הטופס',
    Button_Text_3: 'כפתור שורת תפקיד נוספת',
    Button_Text_4: 'כפתור שיבוץ',
    Button_Text_5: 'כפתור ביטול שיבוץ',
    Button_Text_6: 'כפתור ניקוי סינון ומיון',
    Button_Text_7: 'כפתור הסרת שורת תפקיד (לא מוחק)',
    Button_Text_8: 'כפתור פתיחת רשומה',
    Button_Text_9: 'כפתור החלפת שם/תפקיד שנבחר',
    Button_Text_10: 'כפתור טעינה לטופס (כרטיס)',
    Empty_State_Text_1: 'אין שורות לסינון',
    Empty_State_Text_2: 'אין תפקידים פנויים',
    Empty_State_Text_3: 'לשם שנבחר אין תפקיד',
    Error_Text_1: 'טבלאות חסרות; {tables} = רשימה',
    Error_Text_2: 'אין הרשאת יצירה',
    Duration_1: 'כמה זמן אפשר «בטל» ברצועת השינויים (h:mm)',
    Source_Table_1: 'טבלת אנשים — רק אם הפאנל הימני ריק (ריק = People)',
    Source_Table_2: 'טבלת תפקידים — רק אם הפאנל ריק (ריק = Roles)',
    Source_Table_3: 'טבלת שיבוצים — רק אם הפאנל ריק (ריק = Assignments)',
    Source_Field_1: 'שדה הגוף השותף האישי (Assignments.<link → Partners>) — רק אם הפאנל ריק',
};

export type PRSlot = keyof typeof DEFAULTS;
export type PRText = Extract<PRSlot, TextSlot>;
const fill = (s: string, vars?: {[k: string]: string | number}) => (vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s);

/** Config accessor; outside the provider → code defaults. */
export function useCfg() {
    const cfg: ExtensionConfig | null = useExtensionConfigOptional();
    const t = (slot: PRText, vars?: {[k: string]: string | number}) => fill((cfg ? cfg.text(slot) : '') || String(DEFAULTS[slot] ?? ''), vars);
    const dur = (slot: Extract<PRSlot, DurationSlot>) => {
        const v = cfg ? cfg.duration(slot) : null;
        return typeof v === 'number' && v > 0 ? v : DEFAULTS[slot];
    };
    return {t, dur, cfg};
}
