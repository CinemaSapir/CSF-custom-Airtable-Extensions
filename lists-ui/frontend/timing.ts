/**
 * v0.5.15 – pure timing / keyboard helpers (no React, no SDK) so they are unit-tested:
 * toast lifetimes + pause, which toast may replace which, the search debounce, and Esc detection.
 */

/** undo toasts («ביטול») live 6 s; plain ones 2.8 s (unchanged) */
export const TOAST_MS = {undo: 6000, plain: 2800} as const;
/** after a hover / focus pause the toast gets at least this much time back, so it never vanishes the instant the pointer leaves */
export const TOAST_RESUME_MIN_MS = 1500;

export type ToastLike = {action?: unknown; err?: boolean};
export const toastMs = (t: ToastLike): number => (t.action ? TOAST_MS.undo : TOAST_MS.plain);

/** time left after running `elapsed` ms of `left` – floored at the resume minimum (used when a pause starts) */
export const toastLeftAfter = (left: number, elapsed: number): number => Math.max(TOAST_RESUME_MIN_MS, left - Math.max(0, elapsed));

/**
 * A live undo toast is never cut short by a plain info toast: the plain one waits (queued) until the undo toast closes.
 * Errors and other undo toasts replace it (the newest undo is the one that matters).
 */
export function acceptToast(current: ToastLike | null, incoming: ToastLike): 'replace' | 'queue' {
    if (current?.action && !incoming.action && !incoming.err) return 'queue';
    return 'replace';
}

/** search: the input value is local and immediate; only the filtering waits for a short pause in typing */
export const SEARCH_DEBOUNCE_MS = 150;

type Timers = {set: (fn: () => void, ms: number) => unknown; clear: (h: unknown) => void};
const realTimers: Timers = {set: (fn, ms) => setTimeout(fn, ms), clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>)};
/** trailing debounce: only the last value of a burst is delivered; flush delivers it now, cancel drops it */
export function debounce<T>(fn: (v: T) => void, ms: number, timers: Timers = realTimers) {
    let h: unknown = null;
    let last: {v: T} | null = null;
    const fire = () => {
        h = null;
        const x = last;
        last = null;
        if (x) fn(x.v);
    };
    return {
        call(v: T) {
            last = {v};
            if (h !== null) timers.clear(h);
            h = timers.set(fire, ms);
        },
        flush() {
            if (h !== null) timers.clear(h);
            fire();
        },
        cancel() {
            if (h !== null) timers.clear(h);
            h = null;
            last = null;
        },
    };
}

/** Esc across browsers / key layouts ('Escape', legacy 'Esc', keyCode 27) */
export const isEscapeKey = (e: {key?: string; keyCode?: number; which?: number}): boolean => e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27 || e.which === 27;
