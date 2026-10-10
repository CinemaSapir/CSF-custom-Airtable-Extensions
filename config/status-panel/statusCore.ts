// CSF shared «מצב חיבור» status panel — pure core (no Airtable / React imports; unit-tested).
// Same file, same hash, in every extension: countdown-homescreen, timeline, lists-ui, people-roles, bulk-sheet.
// v1 (2026-10-10): right-pane boolean toggle «show מצב חיבור · Extension_Config» (default OFF). ON → panel always shown
// (published view too, not only edit mode). Read-only: the panel never writes anything.
// v2 (2026-10-10): + mapping panel. Right-pane boolean «show mapping · Extension_Config.Mapping_Image» (default OFF) → the
// matched row's Mapping_Image attachments (Variant row → default row) + GitHub_URL. Also reported in «מצב חיבור».
// v3 (2026-10-10 12:57): the field is Attachment_Mapping_Image (loose fallback: the old name Mapping_Image); toggle label
// «show mapping · Extension_Config.Attachment_Mapping_Image». + «עריכה ישירה · Extension_Config» (ConfigEdit.tsx): click-to-edit
// text slots and Option_List editors that write ONLY the matched Extension_Config row's cell (Variant row, else default row).
// v4 (2026-10-10 13:22): even looser Extension / Variant keys (trim; every Unicode format / bidi / zero-width char, soft
// hyphen, ALM; any whitespace incl. NBSP; any dash, _ and . ignored; NFKC; case) → «countdown homescreen» =
// «Countdown-Homescreen» = «countdown_homescreen». No row matched → the panel lists the Extension and Variant values it
// actually sees (≤ 10 each, invisible chars made visible) and whether the Extension / Variant fields are visible.

export const STATUS_PANEL_VERSION = 'status-panel v4';
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

/** Loose key: NFKC, trimmed; no format / bidi / zero-width chars (\p{Cf}), no nikud / combining marks, lower case,
 *  no whitespace (incl. NBSP), dashes of any kind, _ or . — «countdown homescreen» = «Countdown-Homescreen» = «countdown_homescreen». */
export function looseKey(s: unknown): string {
    return String(s ?? '')
        .normalize('NFKC')
        .replace(/\p{Cf}|\u034F|\u180E|\u115F|\u1160|\u3164|\uFFA0/gu, '')
        .replace(/[\u0591-\u05C7]|\p{Mn}/gu, '')
        .trim()
        .toLowerCase()
        .replace(/[\s\p{Z}\p{Pd}_.\u05BE\u2010-\u2015\u2212]+/gu, '');
}
/** Field by exact name, then loose name (e.g. «Extension », «extension»). */
export function looseField<T extends {name: string}>(fields: readonly T[], name: string): T | null {
    return fields.find(f => f.name === name) ?? fields.find(f => looseKey(f.name) === looseKey(name)) ?? null;
}
/** Shows what is really in a cell: invisible / format chars → ⟨U+200F⟩, leading/trailing spaces → ␠. */
export function visibleChars(s: string): string {
    const chars = [...s];
    let lead = 0;
    while (lead < chars.length && (chars[lead] === ' ' || chars[lead] === '\t')) lead++;
    let end = chars.length;
    while (end > lead && (chars[end - 1] === ' ' || chars[end - 1] === '\t')) end--;
    const code = (ch: string) => `⟨U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}⟩`;
    const mid = chars.slice(lead, end).map(ch => (/\p{Cf}|\u00A0|\u034F|\u180E/u.test(ch) ? code(ch) : ch));
    return '␠'.repeat(lead) + mid.join('') + '␠'.repeat(chars.length - end);
}
export const SEEN_VALUES_MAX = 10;
const DEFAULT_VARIANT_WORDS = ['', 'default', 'ברירת מחדל', 'ברירתמחדל', '-', '—'].map(looseKey);
/** "", "default", «ברירת מחדל», "-" → "" (= the default row). */
export function variantKey(v: unknown): string {
    const k = looseKey(v);
    return DEFAULT_VARIANT_WORDS.includes(k) ? '' : k;
}

export type ConfigRow = {id: string; extension: string; variant: string};
export type RowSummary = {
    count: number;
    /** distinct Extension cell values in the table (for "row not matched" help; all — the panel shows ≤ SEEN_VALUES_MAX) */
    extensionValues: string[];
    /** distinct Variant cell values in the table ('' = empty) */
    variantValues: string[];
    /** rows whose Extension loosely equals the slug, any Variant */
    sameExtension: ConfigRow[];
    /** loose Extension + loose Variant match (first) */
    match: ConfigRow | null;
};
export function rowSummary(rows: readonly ConfigRow[] | null, slug: string, variant: string): RowSummary | null {
    if (!rows) return null;
    const s = looseKey(slug);
    const v = variantKey(variant);
    // (looseKey trims and drops every invisible char, so «countdown-homescreen\u200F » still matches)
    const same = rows.filter(r => looseKey(r.extension) === s);
    return {
        count: rows.length,
        extensionValues: [...new Set(rows.map(r => r.extension).filter(v => v.trim()))],
        variantValues: [...new Set(rows.map(r => r.variant))],
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
// v2/v3: mapping attachments (Extension_Config.Attachment_Mapping_Image + GitHub_URL) — read-only, human-maintained fields,
// deliberately NOT part of the 269-slot FIELD_ORDER.
// ---------------------------------------------------------------------------
export const MAPPING_TOGGLE_KEY = 'showMappingPanel';
export const MAPPING_TOGGLE_LABEL = 'show mapping · Extension_Config.Attachment_Mapping_Image';
/** v3: the field name on PROD / DEMO. Read first; MAPPING_FIELD_LEGACY is the loose fallback (tables not renamed yet). */
export const MAPPING_FIELD = 'Attachment_Mapping_Image';
export const MAPPING_FIELD_LEGACY = 'Mapping_Image';
export const GITHUB_FIELD = 'GitHub_URL';

/** Field resolution order: exact Attachment_Mapping_Image → loose → exact Mapping_Image → loose. null = none visible. */
export function pickMappingFieldName(names: readonly string[]): string | null {
    for (const want of [MAPPING_FIELD, MAPPING_FIELD_LEGACY]) {
        const hit = names.find(n => n === want) ?? names.find(n => looseKey(n) === looseKey(want));
        if (hit) return hit;
    }
    return null;
}
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
                ? 'השדה Attachment_Mapping_Image לא מופעל לאלמנט — יש להפעיל אותו ברשימת השדות של Extension_Config באלמנט'
                : state === 'empty'
                  ? 'השדה Attachment_Mapping_Image ריק בשורה (וגם בשורת ברירת המחדל) — יש לצרף אליו את קובץ המיפוי'
                  : `${files.length} ${files.length === 1 ? 'קובץ' : 'קבצים'} מ${from === 'variant' ? 'שורת ה-Variant' : 'שורת ברירת המחדל'}`;
    return {state, files, from, github, githubFrom, githubState: !i.githubField ? 'no-field' : github ? 'ok' : 'empty', hint};
}
export const GITHUB_HINT = {
    'no-field': 'השדה GitHub_URL לא מופעל לאלמנט',
    empty: 'GitHub_URL ריק',
    ok: '',
} as const;

// ---------------------------------------------------------------------------
// v3: «עריכה ישירה · Extension_Config» — inline editing of text slots + Option_List editors (ConfigEdit.tsx).
// Writes ONLY one cell of the matched Extension_Config row: the Variant row when it exists, else the default row.
// ---------------------------------------------------------------------------
export const EDIT_TOGGLE_KEY = 'inlineEditConfig';
export const EDIT_TOGGLE_LABEL = 'עריכה ישירה · Extension_Config';
export function editToggleProperty() {
    return {key: EDIT_TOGGLE_KEY, label: EDIT_TOGGLE_LABEL, type: 'boolean' as const, defaultValue: false};
}
export const isEditOn = (v: unknown): boolean => v === true;

const TEXT_SLOT_RE =
    /^(Title|Heading_\d+|Table_Heading_\d+|Content_Text_\d+|Helper_Text_\d+|Button_Text_\d+|Tab_Label_\d+|Toggle_Label_\d+|Filter_Label_\d+|Dropdown_Label_\d+|Empty_State_Text_\d+|Error_Text_\d+)$/;
/** Text slots that may be edited inline (labels / texts only — never colours, icons, URLs, filters, refs, numbers). */
export const isEditableTextSlot = (slot: string): boolean => TEXT_SLOT_RE.test(slot);
export const isOptionListSlot = (slot: string): boolean => /^Option_List_\d+$/.test(slot);

/** The ONE row a save may write: Variant row if it exists, else the default row; null → no row (ask before creating). */
export function writeTarget<R extends {id: string}>(variantRow: R | null | undefined, defaultRow: R | null | undefined): {row: R | null; which: 'variant' | 'default' | 'none'} {
    if (variantRow) return {row: variantRow, which: 'variant'};
    if (defaultRow) return {row: defaultRow, which: 'default'};
    return {row: null, which: 'none'};
}
/** Field types a text save may write (anything else is refused with a reason). */
export const WRITABLE_TEXT_TYPES = ['singleLineText', 'multilineText', 'richText'] as const;
export const isWritableTextType = (t: string): boolean => (WRITABLE_TEXT_TYPES as readonly string[]).includes(t);

/** Cell value to write: '' / whitespace-only → null (= the cell is cleared and the next layer is used). */
export function cellToWrite(v: string): string | null {
    const s = v.replace(/\r\n?/g, '\n');
    return s.trim() === '' ? null : s;
}

/** Option_List text ⇄ lines (one option per line; empty lines dropped). */
export const splitLines = (v: string): string[] =>
    v
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);
export const joinLines = (lines: readonly string[]): string => lines.map(l => l.trim()).filter(Boolean).join('\n');
export type ListOp = {op: 'add'; text: string} | {op: 'rename'; i: number; text: string} | {op: 'remove'; i: number} | {op: 'move'; i: number; to: number};
export function applyListOp(lines: readonly string[], o: ListOp): string[] {
    const out = [...lines];
    if (o.op === 'add') {
        if (o.text.trim()) out.push(o.text.trim());
    } else if (o.i < 0 || o.i >= out.length) return out;
    else if (o.op === 'rename') out[o.i] = o.text;
    else if (o.op === 'remove') out.splice(o.i, 1);
    else if (o.op === 'move') {
        const to = Math.max(0, Math.min(out.length - 1, o.to));
        const [x] = out.splice(o.i, 1);
        out.splice(to, 0, x);
    }
    return out;
}

/** On-screen text → slot, for the inline layer: only unique, non-templated values of ≥2 chars (ambiguous values are left out). */
export function inlineCandidates(values: ReadonlyArray<readonly [slot: string, value: string]>): Map<string, string> {
    const seen = new Map<string, string | null>();
    for (const [slot, raw] of values) {
        if (!isEditableTextSlot(slot)) continue;
        const v = (raw ?? '').trim();
        if (v.length < 2 || /[{}]|\*\*|\n/.test(v)) continue;
        seen.set(v, seen.has(v) && seen.get(v) !== slot ? null : slot);
    }
    const out = new Map<string, string>();
    for (const [v, slot] of seen) if (slot) out.set(v, slot);
    return out;
}
export const EDIT_UNDO_MS = 6000;
