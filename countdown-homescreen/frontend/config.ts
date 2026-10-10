// Countdown Homescreen — code defaults keyed by Extension_Config slot names (row `countdown-homescreen`, Variant empty).
// v0.4.0 reads ONLY Filter_N / Filter_Operator_N / Filter_Value_N from Extension_Config, as a fallback to the right pane,
// and only if that table exists (it doesn't on PROD yet → no-op). When it does, the helper
// merges the row over these defaults: an empty cell inherits the value below. No imports here (unit-tested in tests/).

export const CONFIG_EXTENSION = 'countdown-homescreen';

export const CONFIG_DEFAULTS = {
    Title: 'יאללה היידה!',

    // Pill labels (row 2: people) and (row 1: programme), then clock units.
    Content_Text_1: 'כרטיסים שנמכרו',
    Content_Text_2: 'הזמנות שנשלחו',
    Content_Text_3: 'סרטים',
    Content_Text_4: 'אירועים',
    Content_Text_5: 'מסגרות תוכן',
    Content_Text_6: 'ימים',
    Content_Text_7: 'שעות',
    Content_Text_8: 'דקות',

    Source_Table_1: 'Tickets',
    Source_Table_2: 'Invitations',
    Source_Table_3: 'Slots_Events',
    Source_Table_4: 'Films',
    Source_Table_5: 'Projects',

    Source_Field_3: 'Slots_Events.Status',
    Source_Field_4: 'Slots_Events.Start',
    Source_Field_5: 'Slots_Events.End',
    /** Film ↔ slot link. Either side works: Films.Slots_Events or Slots_Events.Films. */
    Source_Field_6: 'Films.Slots_Events',
    /** Reserved (mockup v4 map): slot type. Not used for counting in v0.3.0. */
    Source_Field_7: 'Slots_Events.Type',
    /** Project ↔ slot link. Either side works: Slots_Events.Project or Projects.Events. */
    Source_Field_8: 'Slots_Events.Project',

    /** Status that counts as scheduled (one value per line). */
    Option_List_1: 'משובץ',

    /** Fallback target when no משובץ slot is found: 24.10.2026 20:00 Israel time. */
    Date_1: '2026-10-24T17:00:00.000Z',
    /** Cutoff: first festival day (Israel date). משובץ slots starting earlier are ignored by the timer. */
    Date_2: '2026-10-31',

    /** Accent: hover border / hover label (the owner 23:35: wave palette, not crimson). */
    Color_1: '#6aabb8',
    /** Page background (cream, v0.1.0). */
    Color_2: '#faf7f2',
    /** Wave palette (title + clock shimmer), v0.1.0 order. v0.4.0: no card top bar (the owner 23:48). */
    Color_3: '#c9847a',
    Color_4: '#c9b36a',
    Color_5: '#7eb58a',
    Color_6: '#6aabb8',
    Color_7: '#8a94c4',
} as const;

export type ConfigSlot = keyof typeof CONFIG_DEFAULTS;

/** "Table.Field" → field part ("Slots_Events.Status" → "Status"). */
export function fieldPart(ref: string): string {
    const i = ref.indexOf('.');
    return i >= 0 ? ref.slice(i + 1) : ref;
}

export const WAVE_COLORS = [
    CONFIG_DEFAULTS.Color_3,
    CONFIG_DEFAULTS.Color_4,
    CONFIG_DEFAULTS.Color_5,
    CONFIG_DEFAULTS.Color_6,
    CONFIG_DEFAULTS.Color_7,
] as const;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
/** Only #hex reaches the CSS (a bad Color_N cell can't break the stylesheet); otherwise the code default. */
export function safeHex(v: string | null | undefined, dflt: string): string {
    const t = (v ?? '').trim();
    return HEX.test(t) ? t : dflt;
}
