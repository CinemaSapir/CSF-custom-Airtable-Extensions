/**
 * v0.5.0 — Extension_Config wiring for the bulk sheet «קופי פייסט - הזנה מרובה» (row Extension = `bulk-sheet`,
 * Variant = right-pane «גרסת עמוד»). Map + screenshot: /workspace/csf-extension-config/maps/bulk-sheet.md.
 * Precedence (the owner, 2026-10-09): RIGHT PANE → Extension_Config row (variant → default row) → code default below.
 *   Tables: peopleTable / rolesTable / assignmentsTable pickers → Source_Table_1–3 → DEMO ids.
 * While Extension_Config is absent every value below is used as-is → identical to v0.4.3 (scripts/config-identity-test.mjs).
 * Kept in code ON PURPOSE: the write rules (never touches the People User field or sensitive People fields, never deletes),
 * phone normalising, duplicate / validation logic and its messages (logic.ts), Hebrew count grammar (he.*).
 */
import {createElement, Fragment, type ReactNode} from 'react';
import {type ConfigDefaults, type ExtensionConfig, type NumberSlot, type SlotDocs, type TextSlot, useExtensionConfigOptional} from './useExtensionConfig';

export const CONFIG_SLUG = 'bulk-sheet';
export const CONFIG_DISPLAY_NAME = 'קופי פייסט – הזנה מרובה (אנשים ותפקידים)';

export const DEFAULTS = {
    Title: 'קופי פייסט - הזנה מרובה',
    Heading_1: 'אנשים, תפקידים ופרטי קשר',
    // sheet column names (row 2 of the header + cell aria-labels) = logic.ts COL_LABELS
    Table_Heading_1: 'שם',
    Table_Heading_2: 'טלפון אישי',
    Table_Heading_3: 'אימייל אישי',
    Table_Heading_4: 'תפקיד',
    Table_Heading_5: 'טלפון עבודה',
    Table_Heading_6: 'אימייל עבודה',
    Table_Heading_7: 'שותף עסקי',
    Table_Heading_8: 'תיקון',
    Table_Heading_9: 'לדלג',
    // **…** = bold
    Helper_Text_1: 'יש לכם רשימה באקסל? העתיקו והדביקו כאן. העמודות יצאו הפוכות? לחצו על **הפוך עמודות**.',
    Helper_Text_2: 'עמודה במקום הלא נכון? גררו אותה מהאות שלה (א ב ג) למקום הנכון.',
    Helper_Text_3: 'הופך את סדר הנתונים בכל השורות (הכותרות נשארות במקום)',
    Helper_Text_4: 'Tab / Enter / חצים לתנועה · סימון תאים + Ctrl+C / Ctrl+X / Ctrl+V · הדבקה מאקסל או Google Sheets · טלפונים לפי ספרות (+972 = 0)',
    Helper_Text_5: 'השורה מסומנת ב־/ ולכן לא תועלה',
    Button_Text_1: '⇄ הפוך עמודות',
    Button_Text_2: '🧹 נקה טבלה',
    Button_Text_3: '+ עוד {n} שורות',
    Button_Text_4: 'כן, שלח',
    Button_Text_5: 'ביטול',
    Button_Text_6: 'נקה',
    Content_Text_1: 'לנקות הכל?',
    Content_Text_2: 'בטוח?',
    Content_Text_3: 'שולח…',
    Content_Text_4: '✓ נשלח',
    Content_Text_5: 'מדלג על השם',
    Empty_State_Text_1: 'הדביקו כאן רשימה, אנחנו נסדר את השאר ✨',
    Error_Text_1: 'הטבלאות הבאות לא זמינות לתוסף: {tables}. יש לבחור אותן בפאנל המאפיינים של האלמנט.',
    Error_Text_2: 'השדה **{field}** לא מופעל ברכיב — הפעילו אותו (קריאה בלבד מספיק) בפאנל הנתונים של הרכיב ורעננו.',
    Error_Text_3: 'פתיחת רשומה כבויה ברכיב הזה — יש להפעיל "Click into record details" בהגדרות הרכיב',
    Number_1: 20,
    Number_2: 50,
    Number_3: 10,
    Color_1: '#16a34a',
    Color_2: '#dc2626',
    Color_3: '#2563eb',
    Color_4: '#f59e0b',
    Color_5: '#a855f7',
    Color_6: '#0ea5e9',
} satisfies ConfigDefaults;

export const DOCS: SlotDocs = {
    Title: 'כותרת המסך (גם במסכי הגדרה חסרה)',
    Heading_1: 'שורת משנה מתחת לכותרת',
    Table_Heading_1: 'עמודה א: שם',
    Table_Heading_2: 'עמודה ב: טלפון אישי',
    Table_Heading_3: 'עמודה ג: אימייל אישי',
    Table_Heading_4: 'עמודה ד: תפקיד',
    Table_Heading_5: 'עמודה ה: טלפון עבודה (Roles)',
    Table_Heading_6: 'עמודה ו: אימייל עבודה (Roles)',
    Table_Heading_7: 'עמודה ז: שותף עסקי',
    Table_Heading_8: 'עמודת הסטטוס (ח)',
    Table_Heading_9: 'עמודת «לדלג»',
    Helper_Text_1: 'הסבר שורה 1; **טקסט** = מודגש',
    Helper_Text_2: 'הסבר שורה 2 (גרירת עמודות)',
    Helper_Text_3: 'טולטיפ «הפוך עמודות»',
    Helper_Text_4: 'שורת המקלדת בתחתית',
    Helper_Text_5: 'טולטיפ שורה מדולגת',
    Button_Text_1: 'כפתור היפוך עמודות',
    Button_Text_2: 'כפתור ניקוי הטבלה',
    Button_Text_3: 'הוספת שורות; {n} = Number_3',
    Button_Text_4: 'אישור שליחה בחלון «בטוח?»',
    Button_Text_5: 'ביטול בחלונות האישור',
    Button_Text_6: 'אישור ניקוי בחלון «לנקות הכל?»',
    Content_Text_1: 'כותרת חלון הניקוי',
    Content_Text_2: 'כותרת חלון השליחה',
    Content_Text_3: 'כפתור השליחה בזמן שליחה',
    Content_Text_4: 'סטטוס שורה שנשלחה',
    Content_Text_5: 'סטטוס שורה מדולגת',
    Empty_State_Text_1: 'הודעה על טבלה ריקה',
    Error_Text_1: 'טבלאות חסרות; {tables} = רשימה',
    Error_Text_2: 'שדה ראשי לא מופעל; {field} = שם השדה (מודגש)',
    Error_Text_3: 'פתיחת רשומה כבויה ברכיב',
    Number_1: 'כמה שורות ריקות בהתחלה / אחרי ניקוי',
    Number_2: 'גודל מנה לכתיבה (מקסימום 50 — מגבלת Airtable)',
    Number_3: 'כמה שורות מוסיף «+ עוד N שורות»',
    Color_1: 'צבע קונפטי 1',
    Color_2: 'צבע קונפטי 2',
    Color_3: 'צבע קונפטי 3',
    Color_4: 'צבע קונפטי 4',
    Color_5: 'צבע קונפטי 5',
    Color_6: 'צבע קונפטי 6',
    Source_Table_1: 'טבלת אנשים — רק אם הפאנל הימני ריק (ריק = People)',
    Source_Table_2: 'טבלת תפקידים — רק אם הפאנל ריק (ריק = Roles)',
    Source_Table_3: 'טבלת שיבוצים — רק אם הפאנל ריק (ריק = Assignments)',
};

export type BSSlot = keyof typeof DEFAULTS;
export type BSText = Extract<BSSlot, TextSlot>;
const fill = (s: string, vars?: {[k: string]: string | number}) => (vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s);
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Config accessor; outside the provider → code defaults. */
export function useCfg() {
    const cfg: ExtensionConfig | null = useExtensionConfigOptional();
    const t = (slot: BSText, vars?: {[k: string]: string | number}) => fill((cfg ? cfg.text(slot) : '') || String(DEFAULTS[slot] ?? ''), vars);
    const n = (slot: Extract<BSSlot, NumberSlot>, max = Infinity) => {
        const v = cfg ? cfg.number(slot) : null;
        return typeof v === 'number' && Number.isFinite(v) && v >= 1 ? Math.min(Math.round(v), max) : DEFAULTS[slot];
    };
    /** a text with **bold** parts → React nodes (bold props e.g. {dir: 'ltr'}) */
    const rich = (slot: BSText, vars?: {[k: string]: string | number}, boldProps?: {[k: string]: string}): ReactNode =>
        createElement(
            Fragment,
            null,
            ...t(slot, vars)
                .split(/\*\*(.+?)\*\*/)
                .map((part, i) => (i % 2 ? createElement('b', {key: i, ...boldProps}, part) : part)),
        );
    const colors = (): string[] => {
        const all = (['Color_1', 'Color_2', 'Color_3', 'Color_4', 'Color_5', 'Color_6'] as const).map((s) => t(s).trim());
        const ok = all.filter((c) => HEX.test(c));
        return ok.length ? ok : all;
    };
    return {t, n, rich, colors, cfg};
}
