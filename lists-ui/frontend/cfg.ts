/**
 * v0.6.0 — Extension_Config wiring for lists-ui (row Extension = `lists-ui`; Variant = right-pane «גרסת עמוד», else the
 * display mode: '' for full, `mine`, `record`). Map + screenshot: /workspace/csf-extension-config/maps/lists-ui.md.
 *
 * Precedence (the owner, 2026-10-09): RIGHT PANE (custom properties) → Extension_Config row (variant cell → default-row cell) →
 * the code default below. Texts have no right-pane field, so for them it is row → default.
 * While Extension_Config doesn't exist / isn't enabled on the element every value below is used as-is → the page renders
 * exactly like v0.5.18 (asserted by scripts/config-identity-test.mjs).
 *
 * Kept in code ON PURPOSE (never a config cell): the privacy deny-lists in dynlogic.ts — SENSITIVE_TYPES, SENSITIVE_NAME,
 * HARD_DENY, DENIED_COND_CHOICES — an editable cell must never be able to unhide phones / emails / IDs.
 */
import {type ConfigDefaults, type ExtensionConfig, type NumberSlot, type SlotDocs, type TextSlot, useExtensionConfigOptional} from './useExtensionConfig';

export const CONFIG_SLUG = 'lists-ui';
export const CONFIG_DISPLAY_NAME = 'רשימות (Lists UI)';

export const DEFAULTS = {
    Title: 'רשימות',
    // Home H1 per filter chip
    Heading_1: 'כל הרשימות',
    Heading_2: 'הרשימות שלי',
    Heading_3: 'משותפות איתי',
    Heading_4: 'ציבוריות',
    // compact «mine» block title
    Heading_5: '📋 הרשימות שלי',
    // filter chips (Home + compact)
    Tab_Label_1: 'הכל',
    Tab_Label_2: 'שלי',
    Tab_Label_3: 'משותפות איתי',
    Tab_Label_4: 'ציבוריות',
    Tab_Label_5: '▦ גלריה',
    Tab_Label_6: '☰ רשימה',
    Button_Text_1: '+ רשימה חדשה',
    Button_Text_2: '+ יצירת הרשימה הראשונה',
    Button_Text_3: '+ הוספת פריט',
    Button_Text_4: '+ הוסף לרשימה',
    Button_Text_5: '→ כל הרשימות',
    Button_Text_6: 'מחק רשימה',
    Button_Text_7: 'הסתר',
    Button_Text_8: 'הצג רשימה',
    Button_Text_9: 'יצירת רשימה',
    Button_Text_10: 'ניקוי סינון',
    // Helper_Text_1 left free: VisBadge / PRIVATE_NOTE is not rendered anywhere in v0.5.18 (dead component, not wired)
    Helper_Text_2:
        'הרשימה מציגה מעקב תפעולי בלבד (תפקיד / סטטוס / רמת גישה). פרטי קשר ומזהים אישיים אינם מוצגים כאן — ואין לשתף את קישור הממשק מעבר לנדרש.',
    Helper_Text_3: 'חיפוש רשימה…',
    Helper_Text_4: 'הוסיפו הערה…',
    Helper_Text_5: 'הוסיפו תיאור…',
    Helper_Text_6: 'ציבוריות בלבד',
    Content_Text_1: 'רשימות מוסתרות ({n})',
    Content_Text_2: 'מוסתרת',
    Content_Text_3: 'רשימה חדשה ✨',
    Content_Text_6: '⚡ דינמית',
    Content_Text_7: '✓ עם סימונים',
    Content_Text_8: 'הרשימה עדיין ריקה',
    Content_Text_9: 'אין כרגע פריטים תואמים',
    Content_Text_10: 'ניקוי החיפוש',
    Empty_State_Text_1: 'עוד אין כאן רשימות',
    Empty_State_Text_2: 'רשימה אחת קטנה וכבר יש סדר: סרטים לצפייה, משבצות לבדיקה, אנשים לתאם.',
    Empty_State_Text_3: 'אין רשימות בקטגוריה הזו כרגע.',
    Empty_State_Text_4: 'כל הרשימות כאן מוסתרות.',
    Empty_State_Text_5: '✨ אין כאן רשימות עדיין.',
    Error_Text_1: 'אין לך הרשאה ליצור רשימה כאן. בדקו שיתוף הממשק (Can edit records / הוספת רשומות) והרשאות טבלת Lists.',
    Error_Text_2: 'טבלת הרשימות או טבלת פריטי הרשימה לא זמינות לתוסף. יש לבחור אותן בפאנל המאפיינים של האלמנט.',
    Error_Text_3: 'חסרים שדות בהגדרות האלמנט: {fields}. יש להפעיל אותם בפאנל השדות של האלמנט.',
    Error_Text_4: 'יש לבחור בהגדרות האלמנט את טבלת הרשומה: סרטים, משבצות או אנשים.',
    Error_Text_5: 'אין לך הרשאה לשנות את הרשימה הזו.',
    // compact «mine»: rows before «הצגת כל N הרשימות»
    Number_1: 6,
} satisfies ConfigDefaults;

export const DOCS: SlotDocs = {
    Title: 'כותרת מסך השגיאה כשאין טבלת רשימות',
    Heading_1: 'כותרת דף הבית בצ׳יפ «הכל»',
    Heading_2: 'כותרת דף הבית בצ׳יפ «שלי»',
    Heading_3: 'כותרת דף הבית בצ׳יפ «משותפות איתי»',
    Heading_4: 'כותרת דף הבית בצ׳יפ «ציבוריות»',
    Heading_5: 'כותרת הבלוק הקומפקטי «הרשימות שלי» (mode=mine)',
    Tab_Label_1: 'צ׳יפ סינון 1 (כל הרשימות)',
    Tab_Label_2: 'צ׳יפ סינון 2 (שלי)',
    Tab_Label_3: 'צ׳יפ סינון 3 (משותפות איתי)',
    Tab_Label_4: 'צ׳יפ סינון 4 (ציבוריות)',
    Tab_Label_5: 'כפתור תצוגת גלריה',
    Tab_Label_6: 'כפתור תצוגת רשימה',
    Button_Text_1: 'כפתור יצירת רשימה בסרגל',
    Button_Text_2: 'כפתור יצירת רשימה כשאין רשימות',
    Button_Text_3: 'כפתור הוספת פריט בדף רשימה',
    Button_Text_4: 'כפתור הוספה לרשימה (mode=record)',
    Button_Text_5: 'קישור חזרה לכל הרשימות',
    Button_Text_6: 'כפתור מחיקת רשימה',
    Button_Text_7: 'גלולת הסתרת רשימה בשורה',
    Button_Text_8: 'גלולת החזרת רשימה מוסתרת',
    Button_Text_9: 'כפתור שליחה בחלון «רשימה חדשה»',
    Button_Text_10: 'כפתור ניקוי סינון (כשהצ׳יפ ריק)',
    Helper_Text_2: 'שורת פרטיות תפעולית',
    Helper_Text_3: 'placeholder חיפוש בדף הבית',
    Helper_Text_4: 'placeholder הערה לפריט',
    Helper_Text_5: 'placeholder תיאור רשימה',
    Helper_Text_6: 'שורה מתחת לכותרת כשאין משתמש מחובר',
    Content_Text_1: 'כותרת אזור הרשימות המוסתרות; {n} = מספר',
    Content_Text_2: 'תגית «מוסתרת»',
    Content_Text_3: 'כותרת חלון «רשימה חדשה»',
    Content_Text_6: 'תגית רשימה דינמית',
    Content_Text_7: 'תגית צ׳קליסט',
    Content_Text_8: 'תצוגה מקדימה של רשימה ריקה',
    Content_Text_9: 'תצוגה מקדימה של רשימה דינמית בלי התאמות',
    Content_Text_10: 'כפתור ניקוי חיפוש (אין תוצאות)',
    Empty_State_Text_1: 'כותרת כשאין רשימות בכלל',
    Empty_State_Text_2: 'פסקת עידוד כשאין רשימות',
    Empty_State_Text_3: 'צ׳יפ בלי רשימות',
    Empty_State_Text_4: 'צ׳יפ שכל הרשימות בו מוסתרות',
    Empty_State_Text_5: 'הבלוק הקומפקטי בלי רשימות',
    Error_Text_1: 'אין הרשאת יצירה (מוצג מתחת לכפתור)',
    Error_Text_2: 'אין טבלת רשימות / פריטים',
    Error_Text_3: 'שדות חסרים באלמנט; {fields} = רשימת השדות',
    Error_Text_4: 'mode=record בלי טבלת רשומה',
    Error_Text_5: 'הודעה כשאין הרשאה לשנות את הרשימה',
    Number_1: 'כמה רשימות מוצגות בבלוק הקומפקטי לפני «הצגת כל…»',
    Source_Table_1: 'טבלת הרשימות — רק אם הפאנל הימני ריק (ריק = Lists)',
    Source_Table_2: 'טבלת פריטי רשימה — רק אם הפאנל ריק (ריק = List Item)',
    Source_Table_3: 'טבלת סרטים — רק אם הפאנל ריק (ריק = Films)',
    Source_Table_4: 'טבלת משבצות — רק אם הפאנל ריק (ריק = Slots_Events)',
    Source_Table_5: 'טבלת אנשים — רק אם הפאנל ריק (ריק = People)',
    Source_Table_6: 'טבלת צ׳קליסטים — רק אם הפאנל ריק (ריק = Checklists)',
    Source_Table_7: 'טבלת List_Sources — רק אם הפאנל ריק (ריק = List_Sources)',
};

export type ListsSlot = keyof typeof DEFAULTS;
export type ListsText = Extract<ListsSlot, TextSlot>;
const fill = (s: string, vars?: {[k: string]: string | number}) => (vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s);

/** Config accessor for components. Works outside the provider too (→ code defaults), so tests / old harnesses keep working. */
export function useCfg() {
    const cfg: ExtensionConfig | null = useExtensionConfigOptional();
    const t = (slot: ListsText, vars?: {[k: string]: string | number}) => {
        const v = cfg ? cfg.text(slot) : '';
        return fill(v || String(DEFAULTS[slot] ?? ''), vars);
    };
    const n = (slot: Extract<ListsSlot, NumberSlot>) => {
        const v = cfg ? cfg.number(slot) : null;
        return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : (DEFAULTS[slot] as number);
    };
    return {t, n, cfg};
}
export type Tx = ReturnType<typeof useCfg>['t'];
