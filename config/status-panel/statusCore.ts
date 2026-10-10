// CSF shared «מצב חיבור» status panel — pure core (no Airtable / React imports; unit-tested).
// Same file, same hash, in every extension: countdown-homescreen, timeline, lists-ui, people-roles, bulk-sheet.
// v1 (2026-10-10): right-pane boolean toggle «show מצב חיבור · Extension_Config» (default OFF). ON → panel always shown
// (published view too, not only edit mode). Read-only: the panel never writes anything.
// v2 (2026-10-10): + mapping panel. Right-pane boolean «show mapping · Extension_Config.Mapping_Image» (default OFF) → the
// matched row's Mapping_Image attachments (Variant row → default row) + GitHub_URL. Also reported in «מצב חיבור».

export const STATUS_PANEL_VERSION = 'status-panel v2';
export const STATUS_TOGGLE_KEY = 'showStatusPanel';
export const STATUS_TOGGLE_LABEL = 'show מצב חיבור · Extension_Config';

/** The right-pane property, identical in every extension. Default OFF. */
export function statusToggleProperty() {
    return {key: STATUS_TOGGLE_KEY, label: STATUS_TOGGLE_LABEL, type: 'boolean' as const, defaultValue: false};
}
/** Only a real `true` turns it on (undefined / missing / "false" = OFF). */
export function isStatusOn(v: unknown): boolean {
    return v === true;
}

/** Loose key: NFC, no bidi / zero-width marks, no nikud, lower case, no spaces / _ / - / . */
export function looseKey(s: unknown): string {
    return String(s ?? '')
        .normalize('NFC')
        .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u061C\u00A0]/g, '')
        .replace(/[\u0591-\u05C7]/g, '')
        .toLowerCase()
        .replace(/[\s_\-.\u05BE\u2010-\u2015]+/g, '');
}
const DEFAULT_VARIANT_WORDS = ['', 'default', 'ברירת מחדל', 'ברירתמחדל', '-', '—'].map(looseKey);
/** "", "default", «ברירת מחדל», "-" → "" (= the default row). */
export function variantKey(v: unknown): string {
    const k = looseKey(v);
    return DEFAULT_VARIANT_WORDS.includes(k) ? '' : k;
}

export type ConfigRow = {id: string; extension: string; variant: string};
export type RowSummary = {
    count: number;
    /** distinct Extension cell values in the table (for "row not matched" help) */
    extensionValues: string[];
    /** rows whose Extension loosely equals the slug, any Variant */
    sameExtension: ConfigRow[];
    /** loose Extension + loose Variant match (first) */
    match: ConfigRow | null;
};
export function rowSummary(rows: readonly ConfigRow[] | null, slug: string, variant: string): RowSummary | null {
    if (!rows) return null;
    const s = looseKey(slug);
    const v = variantKey(variant);
    const same = rows.filter(r => looseKey(r.extension) === s);
    return {
        count: rows.length,
        extensionValues: [...new Set(rows.map(r => r.extension.trim()).filter(Boolean))],
        sameExtension: same,
        match: same.find(r => variantKey(r.variant) === v) ?? null,
    };
}

/** Config fields the extension reads that are not visible to the element. */
export function missingFields(used: readonly string[] | undefined, visible: readonly string[]): string[] {
    if (!used) return [];
    const vis = new Set(visible.map(looseKey));
    return used.filter(n => !vis.has(looseKey(n)));
}

/** Filter_1..10 / Filter_Operator_… collapsed: "Filter_1–10, Color_3–7". */
export function compactNames(names: readonly string[]): string {
    const groups = new Map<string, number[]>();
    const rest: string[] = [];
    for (const n of names) {
        const m = /^(.*)_(\d+)$/.exec(n);
        if (m) {
            if (!groups.has(m[1])) groups.set(m[1], []);
            groups.get(m[1])!.push(Number(m[2]));
        } else rest.push(n);
    }
    const g = [...groups].map(([k, ns]) => {
        if (ns.length === 1) return `${k}_${ns[0]}`;
        const lo = Math.min(...ns);
        const hi = Math.max(...ns);
        return `${k}_${lo}–${hi}${ns.length < hi - lo + 1 ? '*' : ''}`;
    });
    return [...rest, ...g].join(', ');
}

/** One data source the extension resolved (table, optionally a field). ok=false → red. */
export type StatusSource = {
    label: string;
    table: string | null;
    field?: string | null;
    /** where it came from: «חלונית», «Extension_Config», «ברירת מחדל», «לפי שם» … */
    via: string;
    ok: boolean;
    note?: string | null;
};
/** One active / configured filter (or per-pill aggregation). */
export type StatusFilter = {
    label: string;
    table: string | null;
    field: string | null;
    via: string;
    op: string;
    values: readonly string[];
    matched: number | null;
    total: number | null;
    /** extra column, e.g. «סכום Tickets Given» */
    extra?: string | null;
    bad?: boolean;
};

export type StatusModel = {
    configFound: boolean;
    rowMatched: boolean;
    sources: readonly StatusSource[];
    filters?: readonly StatusFilter[];
    missing: readonly string[];
    error?: string | null;
};
/** ✓ only when the config row is matched, every source resolved and no filter is broken. */
export function overallOk(m: StatusModel): boolean {
    return (
        m.configFound &&
        m.rowMatched &&
        !m.error &&
        m.sources.every(s => s.ok) &&
        (m.filters ?? []).every(f => !f.bad && !f.via.includes('✗'))
    );
}

export const yn = (b: boolean) => (b ? '✓' : '✗');

// ---------------------------------------------------------------------------
// v2: mapping attachments (Extension_Config.Mapping_Image + GitHub_URL) — read-only, human-maintained fields,
// deliberately NOT part of the 269-slot FIELD_ORDER.
// ---------------------------------------------------------------------------
export const MAPPING_TOGGLE_KEY = 'showMappingPanel';
export const MAPPING_TOGGLE_LABEL = 'show mapping · Extension_Config.Mapping_Image';
export const MAPPING_FIELD = 'Mapping_Image';
export const GITHUB_FIELD = 'GitHub_URL';

/** The right-pane property, identical in every extension (same style as the status toggle). Default OFF. */
export function mappingToggleProperty() {
    return {key: MAPPING_TOGGLE_KEY, label: MAPPING_TOGGLE_LABEL, type: 'boolean' as const, defaultValue: false};
}
export const isMappingOn = (v: unknown): boolean => v === true;

/** Only http(s) links are ever rendered as href / src. */
export function safeHttpUrl(v: unknown): string | null {
    const s = String(v ?? '').trim();
    if (!s) return null;
    try {
        const u = new URL(s);
        return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
    } catch {
        return null;
    }
}

export type MappingFile = {id: string; filename: string; url: string; thumb: string | null; isImage: boolean; type: string};
type RawThumb = {url?: unknown} | undefined;
type RawAttachment = {id?: unknown; url?: unknown; filename?: unknown; type?: unknown; thumbnails?: {small?: RawThumb; large?: RawThumb; full?: RawThumb}};
/** Attachment cell value → files. thumb = thumbnails.large (else full, else the image itself); non-images get no thumb. */
export function attachmentsOf(v: unknown): MappingFile[] {
    if (!Array.isArray(v)) return [];
    const out: MappingFile[] = [];
    for (const a of v as RawAttachment[]) {
        if (!a || typeof a !== 'object') continue;
        const url = safeHttpUrl(a.url);
        if (!url) continue;
        const type = String(a.type ?? '');
        const filename = String(a.filename ?? '') || url.split('/').pop() || 'file';
        const isImage = type ? type.startsWith('image/') : /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(filename);
        const thumb = safeHttpUrl(a.thumbnails?.large?.url) ?? safeHttpUrl(a.thumbnails?.full?.url) ?? (isImage ? url : null);
        out.push({id: String(a.id ?? url), filename, url, thumb, isImage, type});
    }
    return out;
}

/** What one config row holds (null row = that row does not exist). */
export type MappingCells = {files: MappingFile[]; github: string | null};
export type MappingState = 'no-table' | 'no-row' | 'no-field' | 'empty' | 'ok';
export type MappingResult = {
    state: MappingState;
    files: MappingFile[];
    /** which row the files came from */
    from: 'variant' | 'default' | null;
    github: string | null;
    githubFrom: 'variant' | 'default' | null;
    githubState: 'no-field' | 'empty' | 'ok';
    /** Hebrew, shown in the mapping panel and in «מצב חיבור» */
    hint: string;
};
/** Variant row first, then the default row — per field (files and GitHub_URL fall back independently). */
export function pickMapping(i: {
    tableFound: boolean;
    imageField: boolean;
    githubField: boolean;
    slug: string;
    variantRow: MappingCells | null;
    defaultRow: MappingCells | null;
}): MappingResult {
    const v = i.variantRow;
    const d = i.defaultRow;
    const from = v && v.files.length ? 'variant' : d && d.files.length ? 'default' : null;
    const files = from === 'variant' ? v!.files : from === 'default' ? d!.files : [];
    const githubFrom = v && v.github ? 'variant' : d && d.github ? 'default' : null;
    const github = githubFrom === 'variant' ? v!.github : githubFrom === 'default' ? d!.github : null;
    const state: MappingState = !i.tableFound ? 'no-table' : !v && !d ? 'no-row' : !i.imageField ? 'no-field' : files.length ? 'ok' : 'empty';
    const hint =
        state === 'no-table'
            ? 'טבלת Extension_Config לא נמצאה באלמנט — אין קבצי מיפוי להצגה'
            : state === 'no-row'
              ? `אין שורה ל-«${i.slug}» בטבלת Extension_Config — אין קבצי מיפוי להצגה`
              : state === 'no-field'
                ? 'השדה Mapping_Image לא מופעל לאלמנט — יש להפעיל אותו ברשימת השדות של Extension_Config באלמנט'
                : state === 'empty'
                  ? 'השדה Mapping_Image ריק בשורה (וגם בשורת ברירת המחדל) — יש לצרף אליו את קובץ המיפוי'
                  : `${files.length} ${files.length === 1 ? 'קובץ' : 'קבצים'} מ${from === 'variant' ? 'שורת ה-Variant' : 'שורת ברירת המחדל'}`;
    return {state, files, from, github, githubFrom, githubState: !i.githubField ? 'no-field' : github ? 'ok' : 'empty', hint};
}
export const GITHUB_HINT = {
    'no-field': 'השדה GitHub_URL לא מופעל לאלמנט',
    empty: 'GitHub_URL ריק',
    ok: '',
} as const;
