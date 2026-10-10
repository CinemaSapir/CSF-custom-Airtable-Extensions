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

