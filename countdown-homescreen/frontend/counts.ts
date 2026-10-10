// Pure counting logic for the five Countdown pills (no Airtable / React imports; unit-tested in tests/).
// The reader in index.tsx turns records into these plain shapes; a missing table/field arrives as null → «—».

import type {Phase} from './festivalTarget';

export type CountMode = 'before' | 'during';

export type CountSlot = {
    id: string;
    startMs: number | null;
    /** Status is משובץ (loose match, computed by the reader). */
    scheduled: boolean;
    /** Status is בוטל (loose match). */
    cancelled: boolean;
    /** Linked film ids read from the slot side (Slots_Events.Films); [] if that field is absent. */
    filmIds: readonly string[];
    /** Linked project ids read from the slot side (Slots_Events.Project); [] if absent. */
    projectIds: readonly string[];
};

/** A Film or Project with the slot ids read from its own side (Films.Slots_Events / Projects.Events); [] if absent. */
export type LinkedRec = {id: string; slotIds: readonly string[]};

export type CountsInput = {
    /** null = Slots_Events table or its Status field missing. */
    slots: readonly CountSlot[] | null;
    /** v0.4.0: slots left after the אירועים pill's fixed filter (undefined = same as slots). Films/projects use ALL slots. */
    eventSlots?: readonly CountSlot[] | null;
    /** false = Start field missing (needed only in 'during'). */
    hasStart: boolean;
    /** null = Films table missing. */
    films: readonly LinkedRec[] | null;
    /** true if a film↔slot link field exists on either side. */
    filmsLinked: boolean;
    projects: readonly LinkedRec[] | null;
    projectsLinked: boolean;
    /** Record counts; null = table missing. */
    invitations: number | null;
    tickets: number | null;
};

export type Counts = {
    films: number | null;
    events: number | null;
    projects: number | null;
    invitations: number | null;
    tickets: number | null;
};

// Aliases (exact first, then loose) — first entry = the slot default in config.ts.
export const FILMS_TABLE_ALIASES = ['Films', 'Film', 'סרטים'];
export const PROJECTS_TABLE_ALIASES = ['Projects', 'Project', 'פרויקטים', 'מסגרות תוכן'];
export const INVITATIONS_TABLE_ALIASES = ['Invitations', 'Invites', 'הזמנות'];
export const TICKETS_TABLE_ALIASES = ['Tickets', 'Ticket', 'כרטיסים'];
/** Link fields on Slots_Events. */
export const SLOT_FILM_LINK_ALIASES = ['Films', 'Film', 'סרטים', 'סרט'];
export const SLOT_PROJECT_LINK_ALIASES = ['Project', 'Projects', 'פרויקט', 'פרויקטים', 'מסגרת תוכן', 'מסגרות תוכן'];
/** Link fields on Films / Projects pointing to the slots. */
export const FILM_SLOT_LINK_ALIASES = ['Slots_Events', 'Slots Events', 'Slots', 'Events', 'משבצות', 'אירועים'];
export const PROJECT_SLOT_LINK_ALIASES = ['Events', 'Slots_Events', 'Slots Events', 'Slots', 'משבצות', 'אירועים'];

/** Before / fallback → 'before'; live or ended → 'during' (ended: nothing left to come → 0s). */
export function countModeForPhase(phase: Phase): CountMode {
    return phase === 'live' || phase === 'ended' ? 'during' : 'before';
}

/** Is this slot "still open" for the pill in this mode? */
function isOpen(s: CountSlot, mode: CountMode, nowMs: number): boolean {
    if (mode === 'before') return !s.scheduled && !s.cancelled;
    return s.scheduled && s.startMs !== null && s.startMs > nowMs;
}

/** Linked cell value (array of {id,name} or ids) → ids. */
export function linkIds(v: unknown): string[] {
    if (!Array.isArray(v)) return [];
    const out: string[] = [];
    for (const x of v) {
        if (typeof x === 'string') out.push(x);
        else if (x && typeof x === 'object' && typeof (x as {id?: unknown}).id === 'string') out.push((x as {id: string}).id);
    }
    return out;
}

/** Slot ids of each parent, union of both link directions. */
function slotsByParent(
    parents: readonly LinkedRec[],
    slots: readonly CountSlot[],
    slotSide: (s: CountSlot) => readonly string[],
): Map<string, Set<string>> {
    const m = new Map<string, Set<string>>();
    for (const p of parents) m.set(p.id, new Set(p.slotIds));
    for (const s of slots) for (const pid of slotSide(s)) m.get(pid)?.add(s.id);
    return m;
}

/** אירועים — before: slots not yet משובץ (excluding בוטל); during: משובץ slots that haven't started. */
export function countEvents(slots: readonly CountSlot[] | null, hasStart: boolean, mode: CountMode, nowMs: number): number | null {
    if (!slots) return null;
    if (mode === 'during' && !hasStart) return null;
    return slots.filter(s => isOpen(s, mode, nowMs)).length;
}

/** סרטים — before: films with no משובץ slot yet; during: films with a משובץ slot still to come. */
export function countFilms(
    slots: readonly CountSlot[] | null,
    films: readonly LinkedRec[] | null,
    linked: boolean,
    hasStart: boolean,
    mode: CountMode,
    nowMs: number,
): number | null {
    if (!slots || !films || !linked) return null;
    if (mode === 'during' && !hasStart) return null;
    const byId = new Map(slots.map(s => [s.id, s]));
    const map = slotsByParent(films, slots, s => s.filmIds);
    let n = 0;
    for (const f of films) {
        const mine = [...(map.get(f.id) ?? [])].map(id => byId.get(id)).filter((s): s is CountSlot => !!s);
        if (mode === 'before') {
            if (!mine.some(s => s.scheduled)) n++;
        } else if (mine.some(s => isOpen(s, 'during', nowMs))) n++;
    }
    return n;
}

/** מסגרות תוכן (ASSUMPTION = Projects) — projects with a slot not yet משובץ (before) / a משובץ slot still to come (during). */
export function countProjects(
    slots: readonly CountSlot[] | null,
    projects: readonly LinkedRec[] | null,
    linked: boolean,
    hasStart: boolean,
    mode: CountMode,
    nowMs: number,
): number | null {
    if (!slots || !projects || !linked) return null;
    if (mode === 'during' && !hasStart) return null;
    const byId = new Map(slots.map(s => [s.id, s]));
    const map = slotsByParent(projects, slots, s => s.projectIds);
    let n = 0;
    for (const p of projects) {
        const mine = [...(map.get(p.id) ?? [])].map(id => byId.get(id)).filter((s): s is CountSlot => !!s);
        if (mine.some(s => isOpen(s, mode, nowMs))) n++;
    }
    return n;
}

export function computeCounts(input: CountsInput, phase: Phase, nowMs: number): Counts {
    const mode = countModeForPhase(phase);
    const safe = (f: () => number | null) => {
        try {
            return f();
        } catch {
            return null;
        }
    };
    return {
        films: safe(() => countFilms(input.slots, input.films, input.filmsLinked, input.hasStart, mode, nowMs)),
        events: safe(() => countEvents(input.eventSlots !== undefined ? input.eventSlots : input.slots, input.hasStart, mode, nowMs)),
        projects: safe(() => countProjects(input.slots, input.projects, input.projectsLinked, input.hasStart, mode, nowMs)),
        invitations: input.invitations,
        tickets: input.tickets,
    };
}

/** 1830 → "1,830"; null → «—». */
export function formatCount(n: number | null | undefined): string {
    return typeof n === 'number' && isFinite(n) ? n.toLocaleString('en-US') : '—';
}
