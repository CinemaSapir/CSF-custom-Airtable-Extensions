/**
 * v0.5.16 – the ROOT CAUSE of the hide / «ביטול» scroll jump.
 *
 * Home renders straight from `useRecords(Lists)`. In the interface SDK that array is the host-mirrored per-query
 * `recordOrder` (`dynamicQueriesByKey[key].recordOrder ?? []`, filtered by the record store). After a Status write the
 * host re-syncs the query; until the matching push lands the array can be short – even empty. Home then rendered fewer
 * rows (or «עוד אין כאן רשימות»), the iframe page became shorter than the viewport, the browser clamped scrollTop to 0,
 * and when the rows came back nothing scrolled back. The v0.5.14 hold only covered 1.2 s windows; the host push is later.
 *
 * Fix: keep the old rows rendered during the re-sync. A record that drops out of the array but is NOT deleted (the
 * record model is still alive) stays in for a short grace period; a real delete (isDeleted) leaves at once.
 */
export const KEEP_GONE_MS = 4000;

export type KeepState<R> = {
    /** what we returned last time (live + kept) */
    prev: readonly R[];
    /** records missing from the live array, with the time they went missing */
    gone: ReadonlyMap<string, {rec: R; at: number}>;
    /** memo: same live array + same kept set → same output array (keeps the model memo cheap) */
    lastIn: readonly R[] | null;
    lastOut: readonly R[];
};

export const emptyKeep = <R>(): KeepState<R> => ({prev: [], gone: new Map(), lastIn: null, lastOut: []});

export function keepRecords<R extends {id: string}>(
    live: readonly R[],
    st: KeepState<R>,
    now: number,
    isDeleted: (r: R) => boolean,
    graceMs = KEEP_GONE_MS,
): {out: readonly R[]; st: KeepState<R>; nextExpiry: number | null} {
    const liveIds = new Set(live.map((r) => r.id));
    const gone = new Map<string, {rec: R; at: number}>();
    for (const [id, g] of st.gone) if (!liveIds.has(id)) gone.set(id, g);
    for (const r of st.prev) if (!liveIds.has(r.id) && !gone.has(r.id)) gone.set(r.id, {rec: r, at: now});
    for (const [id, g] of [...gone]) {
        let dead = true;
        try {
            dead = isDeleted(g.rec);
        } catch {
            dead = true;
        }
        if (dead || now - g.at >= graceMs) gone.delete(id);
    }
    const sameKept = gone.size === st.gone.size && [...gone.keys()].every((id) => st.gone.has(id));
    const last = st.lastIn;
    const sameLive = last !== null && (live === last || (live.length === last.length && live.every((x, i) => x === last[i])));
    const out: readonly R[] = gone.size === 0 ? live : sameLive && sameKept ? st.lastOut : [...live, ...[...gone.values()].map((g) => g.rec)];
    let nextExpiry: number | null = null;
    for (const g of gone.values()) nextExpiry = nextExpiry === null ? g.at + graceMs : Math.min(nextExpiry, g.at + graceMs);
    return {out, st: {prev: out, gone, lastIn: live, lastOut: out}, nextExpiry};
}

/** SDK records: a deleted record's model reports isDeleted; anything unreadable counts as deleted (never keep junk) */
export const recordIsDeleted = (r: unknown): boolean => {
    const v = (r as {isDeleted?: unknown} | null)?.isDeleted;
    return v === undefined ? false : Boolean(v);
};
