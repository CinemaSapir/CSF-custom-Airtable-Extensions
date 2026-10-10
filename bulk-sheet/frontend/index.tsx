/**
 * הזנה מרובה – אנשים ותפקידים · CSF DEMO Interface Extension (base appiN9MrP73g6R9hi ONLY)
 *
 * A light spreadsheet (Google Sheets / Excel look, RTL) for bulk entering / updating People,
 * their contact details, Roles and Assignments. Paste a block from Excel/Sheets, fix what the
 * status column flags, press שלח.
 *
 * Data code reused from ../people-roles-ext (same field ids, same phone normalising).
 * Never touches the Airtable User field or sensitive People fields. Never deletes records.
 */
import {Component, useCallback, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode} from 'react';
import {expandRecord, initializeBlock, useBase, useColorScheme, useCustomProperties, useRecords} from '@airtable/blocks/interface/ui';
import {FieldType, type Base, type Field, type Record as AirtableRecord, type Table} from '@airtable/blocks/interface/models';
import {
    COL,
    COL_LETTERS,
    LTR_COLS,
    NCOL,
    STATUS_LETTER,
    chunk,
    flipColumns,
    he,
    isBlockPaste,
    moveColumn,
    normName,
    parseTSV,
    planPaste,
    toTSV,
    validateRows,
    type Ctx,
    type ExAssignment,
    type ExPerson,
    type ExRole,
    type PartnerLookup,
    type RowCheck,
} from './logic';
import './style.css';
import {CONFIG_DISPLAY_NAME, CONFIG_SLUG, DEFAULTS, DOCS, type BSText, useCfg} from './cfg';
import {CONFIG_TABLE_NAME, ExtensionConfigProvider} from './useExtensionConfig';

const VERSION = '0.5.0';

// ---------------------------------------------------------------------------
// IDs (verified 2026-09-25 against DEMO appiN9MrP73g6R9hi, same as people-roles-ext)
// ---------------------------------------------------------------------------
const IDS = {
    people: 'tblDETcBuaBMTeUmH',
    roles: 'tblBvMpH47USsN760',
    assignments: 'tblWyA778vlIsatNk',
    p: {name: 'fldVySoRplNHsjeBW', phone: 'fldHetGMbF818K7k7', email: 'fldVL0rzcMUfkh1XB'},
    r: {name: 'fldtIE4Rhli3N7bBV', phone: 'fldJUUjdyvCWibjmn', email: 'fldD9lK0MD9nnufMx', partner: 'fldqDGFT0bMcWmksP'},
    a: {people: 'fldccqNTeBR5u882z', roles: 'fldzH4VKaVwYVMw4h', start: 'fldRFnOastqcICMoS', end: 'fldSC0O1m7PAFxQLi'},
} as const;

// v0.5.0: start rows / write batch / «+ עוד N שורות» = Extension_Config Number_1 / Number_2 (≤ 50) / Number_3 (cfg.ts: 20 / 50 / 10)
/** v0.5.0: sheet column names = Extension_Config Table_Heading_1–7 (defaults = logic.ts COL_LABELS) */
const COL_SLOTS: BSText[] = ['Table_Heading_1', 'Table_Heading_2', 'Table_Heading_3', 'Table_Heading_4', 'Table_Heading_5', 'Table_Heading_6', 'Table_Heading_7'];

// ---------------------------------------------------------------------------
// helpers (from people-roles-ext)
// ---------------------------------------------------------------------------
type LinkVal = {id: string; name: string};

function asTable(v: unknown): Table | null {
    if (v && typeof v === 'object' && 'id' in v && 'fields' in v) {
        const id = (v as {id: unknown}).id;
        if (typeof id === 'string' && id.startsWith('tbl')) return v as Table;
    }
    return null;
}
function fieldOf(table: Table, id: string, names: string[]): Field | null {
    try {
        const byId = table.getFieldIfExists(id);
        if (byId) return byId;
        for (const n of names) {
            const byName = table.getFieldIfExists(n);
            if (byName) return byName;
        }
    } catch {
        /* not enabled */
    }
    return null;
}
function hasPrimaryField(table: Table): boolean {
    try {
        return !!table.primaryField;
    } catch {
        return false;
    }
}
const PRIMARY_FIELD_LABEL: {[tableId: string]: string} = {
    [IDS.people]: 'Full Name',
    [IDS.roles]: 'Role',
    [IDS.assignments]: 'Name and Role',
};
function text(rec: AirtableRecord | null | undefined, field: Field | null): string {
    if (!rec || !field) return '';
    return (rec.getCellValueAsString(field) || '').trim();
}
function links(rec: AirtableRecord | null | undefined, field: Field | null): LinkVal[] {
    if (!rec || !field) return [];
    const v = rec.getCellValue(field);
    if (!Array.isArray(v)) return [];
    return v
        .filter((x): x is LinkVal => !!x && typeof x === 'object' && typeof (x as LinkVal).id === 'string')
        .map((x) => ({id: x.id, name: typeof x.name === 'string' ? x.name : ''}));
}
function todayIso(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function dateCell(rec: AirtableRecord, field: Field | null): string {
    if (!field) return '';
    const v = rec.getCellValue(field);
    return typeof v === 'string' ? v.slice(0, 10) : '';
}
function writable(f: Field | null): Field | null {
    return f && !f.isComputed ? f : null;
}
function errText(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

class ErrorBoundary extends Component<{children: ReactNode}, {error: Error | null; nonce: number}> {
    override state = {error: null as Error | null, nonce: 0};
    static getDerivedStateFromError(error: Error) {
        return {error};
    }
    override componentDidCatch(error: Error, info: ErrorInfo) {
        console.error(error, info.componentStack);
    }
    override render() {
        const {error, nonce} = this.state;
        if (error) {
            return (
                <div className="app" dir="rtl">
                    <button type="button" className="btn" onClick={() => this.setState({error: null, nonce: nonce + 1})}>
                        משהו השתבש — לחצו לרענון
                    </button>
                    <pre className="crash-detail" dir="ltr">
                        {error.message}
                    </pre>
                </div>
            );
        }
        return <div key={nonce}>{this.props.children}</div>;
    }
}

function getCustomProperties(base: Base) {
    return [
        {key: 'peopleTable', label: 'טבלת אנשים (People)', type: 'table' as const, defaultValue: base.getTableByIdIfExists(IDS.people) ?? undefined},
        {key: 'rolesTable', label: 'טבלת תפקידים (Roles)', type: 'table' as const, defaultValue: base.getTableByIdIfExists(IDS.roles) ?? undefined},
        {
            key: 'assignmentsTable',
            label: 'טבלת שיבוצים (Assignments)',
            type: 'table' as const,
            defaultValue: base.getTableByIdIfExists(IDS.assignments) ?? undefined,
        },
        // v0.5.0: Extension_Config (optional). Absent → code defaults, nothing changes on screen.
        {key: 'configTable', label: 'טבלת הגדרות (Extension_Config) – לא חובה', type: 'table' as const, defaultValue: base.getTableByNameIfExists(CONFIG_TABLE_NAME) ?? undefined},
        {key: 'configSlug', label: 'מפתח הגדרות (Extension)', type: 'string' as const, defaultValue: CONFIG_SLUG},
        {key: 'configVariant', label: 'גרסת עמוד (Variant) – ריק = ברירת מחדל', type: 'string' as const, defaultValue: ''},
    ];
}

// ---------------------------------------------------------------------------
// sheet model
// ---------------------------------------------------------------------------
type Result = {kind: 'sent'} | {kind: 'failed'; msg: string; short?: string};
type Row = {id: number; v: string[]; skip?: boolean; fading?: boolean; result?: Result};
let rowSeq = 1;
const blankRow = (): Row => ({id: rowSeq++, v: Array(NCOL).fill('')});
const blankRows = (n: number): Row[] => Array.from({length: n}, blankRow);
const isBlank = (r: Row) => r.v.every((c) => !c.trim());

type Banner = {
    created: number;
    updated: number;
    rolesNew: number;
    rolesUpd: number;
    assigned: number;
    failed: number;
    /** new people created without a role (not in the phone book) */
    noRole: {id: string; name: string}[];
};
type Confirm = {kind: 'clear'} | {kind: 'submit'; summary: string[]};
type CellPos = {r: number; c: number};
type Sel = {a: CellPos; b: CellPos};
function normSel(s: Sel): {r0: number; c0: number; r1: number; c1: number} {
    return {
        r0: Math.min(s.a.r, s.b.r),
        c0: Math.min(s.a.c, s.b.c),
        r1: Math.max(s.a.r, s.b.r),
        c1: Math.max(s.a.c, s.b.c),
    };
}
function cellInSel(s: Sel | null, r: number, c: number): boolean {
    if (!s) return false;
    const n = normSel(s);
    return r >= n.r0 && r <= n.r1 && c >= n.c0 && c <= n.c1;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function BulkSheet(props: {pt: Table; rt: Table; at: Table}) {
    const {pt, rt, at} = props;
    const {t, n, rich} = useCfg();
    const START_ROWS = n('Number_1', 500);
    const BATCH = n('Number_2', 50);
    const peopleRecs = useRecords(pt);
    const roleRecs = useRecords(rt);
    const assignRecs = useRecords(at);

    const F = {
        pName: fieldOf(pt, IDS.p.name, ['Full Name']),
        pPhone: fieldOf(pt, IDS.p.phone, ['Phone_Personal']),
        pEmail: fieldOf(pt, IDS.p.email, ['Email_Personal']),
        rName: fieldOf(rt, IDS.r.name, ['Role']),
        rPhone: fieldOf(rt, IDS.r.phone, ['Role Specific Phone']),
        rEmail: fieldOf(rt, IDS.r.email, ['Role Specific Email']),
        rPartner: fieldOf(rt, IDS.r.partner, ['Partner']),
        aPeople: fieldOf(at, IDS.a.people, ['People']),
        aRoles: fieldOf(at, IDS.a.roles, ['Roles']),
        aStart: fieldOf(at, IDS.a.start, ['Start']),
        aEnd: fieldOf(at, IDS.a.end, ['End']),
    };

    const [rows, setRows] = useState<Row[]>(() => blankRows(START_ROWS));
    const [confirm, setConfirm] = useState<Confirm | null>(null);
    const [banner, setBanner] = useState<Banner | null>(null);
    const [confetti, setConfetti] = useState(0);
    const [busy, setBusy] = useState(false);
    const [topErr, setTopErr] = useState('');
    const [pasteNote, setPasteNote] = useState('');
    const cellRefs = useRef(new Map<string, HTMLInputElement>());
    const letterRefs = useRef<(HTMLTableCellElement | null)[]>([]);
    const [drag, setDrag] = useState<{from: number; over: number} | null>(null);
    const [sel, setSel] = useState<Sel | null>(null);
    const selecting = useRef(false);
    const selRef = useRef<Sel | null>(null);
    const rowsRef = useRef(rows);
    selRef.current = sel;
    rowsRef.current = rows;

    // ---------------- existing data snapshot
    const today = todayIso();
    const people: ExPerson[] = useMemo(
        () => peopleRecs.map((r) => ({id: r.id, name: text(r, F.pName), phone: text(r, F.pPhone), email: text(r, F.pEmail)})),
        [peopleRecs, F.pName, F.pPhone, F.pEmail],
    );
    const roles: ExRole[] = useMemo(
        () =>
            roleRecs.map((r) => ({
                id: r.id,
                name: text(r, F.rName),
                phone: text(r, F.rPhone),
                email: text(r, F.rEmail),
                partnerIds: links(r, F.rPartner).map((x) => x.id),
            })),
        [roleRecs, F.rName, F.rPhone, F.rEmail, F.rPartner],
    );
    const assignments: ExAssignment[] = useMemo(
        () =>
            assignRecs.map((a) => {
                const end = dateCell(a, F.aEnd);
                return {
                    id: a.id,
                    personIds: links(a, F.aPeople).map((x) => x.id),
                    roleIds: links(a, F.aRoles).map((x) => x.id),
                    open: !end || end >= today,
                };
            }),
        [assignRecs, F.aPeople, F.aRoles, F.aEnd, today],
    );

    // ---------------- partner lookup (Partners table not exposed: record.fetchForeignRecordsAsync on any Role)
    const anchorRole = roleRecs.find((r) => !r.isDeleted) ?? null;
    const partnerField = writable(F.rPartner);
    const [partnerCache, setPartnerCache] = useState<Map<string, LinkVal[]>>(() => new Map());
    const lookupBusy = useRef(false);
    const partnerNames = useMemo(() => {
        const s = new Map<string, string>();
        for (const r of rows) {
            const n = r.v[COL.partner].trim();
            if (n && r.v[COL.role].trim()) s.set(normName(n), n);
        }
        return s;
    }, [rows]);

    useEffect(() => {
        if (!anchorRole || !partnerField || lookupBusy.current) return;
        const todo: [string, string][] = [];
        if (!partnerCache.has('')) todo.push(['', '']);
        const all = partnerCache.get('') ?? [];
        for (const [k, raw] of partnerNames) {
            if (partnerCache.has(k)) continue;
            if (partnerCache.has('') && all.some((p) => normName(p.name) === k)) continue;
            todo.push([k, raw]);
        }
        if (!todo.length) return;
        lookupBusy.current = true;
        let cancelled = false;
        (async () => {
            const found = new Map<string, LinkVal[]>();
            // strictly sequential: a newer fetchForeignRecordsAsync call cancels the pending one
            for (const [k, raw] of todo.slice(0, 12)) {
                try {
                    const res = await anchorRole.fetchForeignRecordsAsync(partnerField, raw);
                    found.set(k, res.records.map((r) => ({id: r.id, name: r.name})));
                } catch {
                    found.set(k, []);
                }
            }
            lookupBusy.current = false;
            if (!cancelled) {
                setPartnerCache((m) => {
                    const n = new Map(m);
                    for (const [k, v] of found) n.set(k, v);
                    return n;
                });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [anchorRole, partnerField, partnerNames, partnerCache]);

    const partnerLookup: PartnerLookup = useCallback(
        (name: string) => {
            const k = normName(name);
            if (!partnerCache.has('')) return {status: 'pending'};
            const pool = new Map<string, LinkVal>();
            for (const p of [...(partnerCache.get('') ?? []), ...(partnerCache.get(k) ?? [])]) {
                if (normName(p.name) === k) pool.set(p.id, p);
            }
            if (pool.size === 1) {
                const p = Array.from(pool.values())[0];
                return {status: 'found', id: p.id, name: p.name};
            }
            if (pool.size > 1) return {status: 'multi'};
            return partnerCache.has(k) ? {status: 'missing'} : {status: 'pending'};
        },
        [partnerCache],
    );

    // ---------------- validation
    const ctx: Ctx = useMemo(
        () => ({
            people,
            roles,
            assignments,
            partner: partnerLookup,
            has: {
                pPhone: !!writable(F.pPhone),
                pEmail: !!writable(F.pEmail),
                rPhone: !!writable(F.rPhone),
                rEmail: !!writable(F.rEmail),
                partner: !!partnerField && !!anchorRole,
                assign: !!writable(F.aPeople) && !!writable(F.aRoles),
            },
        }),
        [people, roles, assignments, partnerLookup, F.pPhone, F.pEmail, F.rPhone, F.rEmail, partnerField, anchorRole, F.aPeople, F.aRoles],
    );
    const checks: RowCheck[] = useMemo(() => validateRows(rows.map((r) => r.v), ctx), [rows, ctx]);

    const filled = rows.filter((r) => !isBlank(r) && r.result?.kind !== 'sent').length;
    const readyIdx = checks.map((c, i) => (c.plan && !rows[i].skip && !rows[i].result ? i : -1)).filter((i) => i >= 0);
    const reviewCount = checks.filter(
        (c, i) => !rows[i].skip && (c.state === 'warn' || c.state === 'dup' || c.state === 'error' || c.state === 'pending' || rows[i].result?.kind === 'failed') && !isBlank(rows[i]),
    ).length;
    const allEmpty = rows.every(isBlank);

    // ---------------- editing
    const setCell = (r: number, c: number, val: string) => {
        setRows((rs) => rs.map((row, i) => (i === r ? {...row, v: row.v.map((x, j) => (j === c ? val : x)), result: row.result?.kind === 'failed' ? undefined : row.result} : row)));
    };

    const focusCell = (r: number, c: number) => {
        const el = cellRefs.current.get(`${r}:${c}`);
        if (el) {
            el.focus();
            el.select();
        }
    };

    const move = (r: number, c: number, dr: number, dc: number) => {
        let nr = r + dr;
        let nc = c + dc;
        if (nc >= NCOL) {
            nc = 0;
            nr += 1;
        } else if (nc < 0) {
            nc = NCOL - 1;
            nr -= 1;
        }
        if (nr < 0) return;
        if (nr >= rows.length) {
            setRows((rs) => [...rs, ...blankRows(5)]);
            window.setTimeout(() => focusCell(nr, nc), 0);
            return;
        }
        focusCell(nr, Math.max(0, Math.min(NCOL - 1, nc)));
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
        const el = e.currentTarget;
        const ne = e.nativeEvent as KeyboardEvent & {isComposing?: boolean};
        if (ne.isComposing || ne.keyCode === 229) return;
        const len = el.value.length;
        const s = el.selectionStart ?? 0;
        const en = el.selectionEnd ?? 0;
        const allSelected = len === 0 || (s === 0 && en === len);
        const ltr = LTR_COLS.has(c);
        if (e.key === 'Tab') {
            e.preventDefault();
            move(r, c, 0, e.shiftKey ? -1 : 1); // RTL: Tab goes to the next column on the left
        } else if (e.key === 'Enter') {
            e.preventDefault();
            move(r, c, e.shiftKey ? -1 : 1, 0);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            move(r, c, 1, 0);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            move(r, c, -1, 0);
        } else if (e.key === 'ArrowLeft') {
            // visually left = next column. Leave the cell when the caret can't go further left.
            const atLeftEdge = allSelected || (ltr ? s === 0 && en === 0 : s === len && en === len);
            if (atLeftEdge) {
                e.preventDefault();
                move(r, c, 0, 1);
            }
        } else if (e.key === 'ArrowRight') {
            const atRightEdge = allSelected || (ltr ? s === len && en === len : s === 0 && en === 0);
            if (atRightEdge) {
                e.preventDefault();
                move(r, c, 0, -1);
            }
        } else if (e.key === 'Escape') {
            el.blur();
            setSel(null);
            // v0.5.0 note: pre-existing since v0.4.3 — this branch can't run (plain Arrow keys are caught above, shift or not).
            // Left as-is so v0.5.0 behaves exactly like v0.4.3; fixing Shift+Arrow selection is a separate change.
            // eslint-disable-next-line no-dupe-else-if
        } else if (e.shiftKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            e.preventDefault();
            const dr = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
            let dc = 0;
            if (e.key === 'ArrowLeft') dc = 1; // RTL: visual left = next col
            if (e.key === 'ArrowRight') dc = -1;
            const nr = Math.max(0, Math.min(rows.length - 1, r + dr));
            const nc = Math.max(0, Math.min(NCOL - 1, c + dc));
            setSel((prev) => ({a: prev?.a ?? {r, c}, b: {r: nr, c: nc}}));
            focusCell(nr, nc);
        }
    };

    const applyBlockAt = (startR: number, startC: number, raw: string) => {
        const plan = planPaste(parseTSV(raw), startC);
        setPasteNote(plan.note === 'header-mapped' ? 'שורת כותרת זוהתה · העמודות סודרו לפי הכותרת' : plan.note === 'header-skipped' ? 'שורת כותרת זוהתה ודולגה' : '');
        const block = plan.rows;
        if (!block.length) return;
        setRows((rs) => {
            const next = rs.map((x) => ({...x, v: [...x.v]}));
            while (next.length < startR + block.length) next.push(blankRow());
            block.forEach(({cells}, i) => {
                const row = next[startR + i];
                cells.forEach((val, col) => {
                    if (val !== undefined) row.v[col] = val;
                });
                if (row.result?.kind === 'failed') row.result = undefined;
            });
            if (next.length < startR + block.length + 3) next.push(...blankRows(3));
            return next;
        });
        setBanner(null);
        let maxCol = startC;
        for (const {cells} of block) {
            cells.forEach((val, col) => {
                if (val !== undefined) maxCol = Math.max(maxCol, col);
            });
        }
        setSel({a: {r: startR, c: startC}, b: {r: startR + block.length - 1, c: Math.min(NCOL - 1, maxCol)}});
    };

    const fillSelection = (val: string, range: Sel) => {
        const n = normSel(range);
        setRows((rs) =>
            rs.map((row, ri) => {
                if (ri < n.r0 || ri > n.r1) return row;
                const v = row.v.map((x, ci) => (ci >= n.c0 && ci <= n.c1 ? val : x));
                return {...row, v, result: row.result?.kind === 'failed' ? undefined : row.result};
            }),
        );
        setBanner(null);
    };

    const onPaste = (e: React.ClipboardEvent<HTMLInputElement>, r: number, c: number) => {
        const raw = e.clipboardData.getData('text/plain');
        if (!raw) return;
        const cur = selRef.current;
        const multi = cur ? (() => { const n = normSel(cur); return n.r0 !== n.r1 || n.c0 !== n.c1; })() : false;
        if (!isBlockPaste(raw)) {
            // single value: fill the whole selection when more than one cell is marked
            if (multi && cur) {
                e.preventDefault();
                fillSelection(raw.replace(/\r?\n$/, ''), cur);
            }
            return; // otherwise native paste into the focused cell
        }
        e.preventDefault();
        const startR = cur ? normSel(cur).r0 : r;
        const startC = cur ? normSel(cur).c0 : c;
        applyBlockAt(startR, startC, raw);
    };

    const copySelection = async (cut: boolean) => {
        const cur = selRef.current;
        if (!cur) return false;
        const n = normSel(cur);
        const rs = rowsRef.current;
        const block: string[][] = [];
        for (let ri = n.r0; ri <= n.r1; ri++) {
            block.push(rs[ri]?.v.slice(n.c0, n.c1 + 1) ?? Array(n.c1 - n.c0 + 1).fill(''));
        }
        const tsv = toTSV(block);
        try {
            await navigator.clipboard.writeText(tsv);
        } catch {
            // fallback for older WebViews: execCommand
            const ta = document.createElement('textarea');
            ta.value = tsv;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
            } finally {
                document.body.removeChild(ta);
            }
        }
        if (cut) {
            setRows((rowsNow) =>
                rowsNow.map((row, ri) => {
                    if (ri < n.r0 || ri > n.r1) return row;
                    const v = row.v.map((x, ci) => (ci >= n.c0 && ci <= n.c1 ? '' : x));
                    return {...row, v, result: row.result?.kind === 'failed' ? undefined : row.result};
                }),
            );
            setBanner(null);
        }
        return true;
    };

    const beginSelect = (r: number, c: number, extend: boolean) => {
        if (busy) return;
        setSel((prev) => {
            if (extend && prev) return {a: prev.a, b: {r, c}};
            return {a: {r, c}, b: {r, c}};
        });
        selecting.current = true;
    };
    const extendSelect = (r: number, c: number) => {
        if (!selecting.current) return;
        setSel((prev) => (prev ? {a: prev.a, b: {r, c}} : {a: {r, c}, b: {r, c}}));
    };
    const endSelect = () => {
        selecting.current = false;
    };

    // sheet-wide clipboard + select-all (Ctrl/Cmd+A/C/X)
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (busy || confirm) return;
            const mod = e.ctrlKey || e.metaKey;
            if (!mod) return;
            const key = e.key.toLowerCase();
            const target = e.target as HTMLElement | null;
            const inCell = !!target && target.tagName === 'INPUT' && target.classList.contains('cell');

            if (key === 'a' && inCell) {
                e.preventDefault();
                setSel({a: {r: 0, c: 0}, b: {r: rowsRef.current.length - 1, c: NCOL - 1}});
                return;
            }
            if (key !== 'c' && key !== 'x') return;
            const cur = selRef.current;
            if (!cur) return;
            const n = normSel(cur);
            const multi = n.r0 !== n.r1 || n.c0 !== n.c1;
            // single cell with a partial text highlight → let the browser copy that text
            if (!multi && inCell) {
                const el = target as HTMLInputElement;
                if (el.selectionStart !== el.selectionEnd) return;
            }
            e.preventDefault();
            void copySelection(key === 'x');
        };
        const onUp = () => endSelect();
        window.addEventListener('keydown', onKey);
        window.addEventListener('pointerup', onUp);
        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('pointerup', onUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busy, confirm]);

    // ---------------- column tools: data moves, headers stay put
    const applyColumns = (fn: (vals: string[][]) => string[][]) => {
        setRows((rs) => {
            const moved = fn(rs.map((r) => r.v));
            return rs.map((r, i) => ({...r, v: moved[i], result: r.result?.kind === 'failed' ? undefined : r.result}));
        });
        setBanner(null);
    };
    const flip = () => applyColumns(flipColumns);

    const colAtX = (x: number): number | null => {
        const ths = letterRefs.current;
        for (let c = 0; c < ths.length; c++) {
            const el = ths[c];
            if (!el) continue;
            const r = el.getBoundingClientRect();
            if (x >= r.left && x <= r.right) return c;
        }
        return null;
    };
    const startDrag = (e: React.PointerEvent<HTMLTableCellElement>, from: number) => {
        if (e.button !== 0 || busy) return;
        e.preventDefault();
        let over = from;
        setDrag({from, over});
        document.body.classList.add('col-dragging');
        const onMove = (ev: PointerEvent) => {
            const c = colAtX(ev.clientX);
            if (c !== null && c !== over) {
                over = c;
                setDrag({from, over});
            }
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            document.body.classList.remove('col-dragging');
            setDrag(null);
            if (over !== from) applyColumns((vals) => moveColumn(vals, from, over));
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };
    /** drop indicator: the moved column lands after the target (visually left in RTL) when moving forward */
    const dropCls = (c: number) => {
        if (!drag) return '';
        if (c === drag.from) return ' dragging';
        if (c !== drag.over) return '';
        return drag.over > drag.from ? ' drop-left' : ' drop-right';
    };

    // ---------------- clear
    const doClear = () => {
        setRows(blankRows(START_ROWS));
        setBanner(null);
        setTopErr('');
        setPasteNote('');
        setConfirm(null);
        window.setTimeout(() => focusCell(0, 0), 0);
    };
    const askClear = () => {
        if (allEmpty) doClear();
        else setConfirm({kind: 'clear'});
    };

    // ---------------- submit
    const askSubmit = () => {
        if (!readyIdx.length || busy) return;
        const newP = new Set<string>();
        const updP = new Set<string>();
        const newR = new Set<string>();
        const updR = new Set<string>();
        let assign = 0;
        for (const i of readyIdx) {
            const p = checks[i].plan!;
            if (p.personKey && !p.personId) newP.add(p.personKey);
            if (p.personId && Object.keys(p.personFields).length) updP.add(p.personId);
            if (p.roleKey && !p.roleId) newR.add(p.roleKey);
            if (p.roleId && Object.keys(p.roleFields).length) updR.add(p.roleId);
            if (p.assign) assign++;
        }
        const noRole = readyIdx.filter((i) => checks[i].noRole).length;
        const summary = [
            readyIdx.length === 1 ? 'שורה אחת תישלח' : `${readyIdx.length} שורות יישלחו`,
            `אנשים: ${he.newM(newP.size)} · ${he.updM(updP.size)}`,
            `תפקידים: ${he.newM(newR.size)} · ${he.updM(updR.size)}`,
            `שיבוצים חדשים: ${assign}`,
        ];
        if (noRole) summary.push(noRole === 1 ? 'אדם אחד בלי תפקיד (לא יופיע בספר הטלפונים)' : `${noRole} אנשים בלי תפקיד (לא יופיעו בספר הטלפונים)`);
        if (reviewCount) summary.push(he.reviewLeft(reviewCount));
        setConfirm({kind: 'submit', summary});
    };

    const doSubmit = async () => {
        setConfirm(null);
        setTopErr('');
        if (!F.pName || !F.rName) return;
        setBusy(true);
        const snapshot = readyIdx.map((i) => ({rowId: rows[i].id, plan: checks[i].plan!, noRole: checks[i].noRole}));
        const failed = new Map<number, {msg: string; short?: string}>();
        const fail = (rowIds: number[], msg: string, short?: string) => rowIds.forEach((id) => failed.has(id) || failed.set(id, {msg, short}));
        const out: Banner = {created: 0, updated: 0, rolesNew: 0, rolesUpd: 0, assigned: 0, failed: 0, noRole: []};

        // ---- group
        type Grp = {rowIds: number[]; fields: {[k: string]: unknown}};
        const pNew = new Map<string, Grp>();
        const pUpd = new Map<string, Grp>();
        const rNew = new Map<string, Grp>();
        const rUpd = new Map<string, Grp>();
        const put = (m: Map<string, Grp>, k: string, rowId: number, fields: {[k: string]: unknown}) => {
            const g = m.get(k) ?? {rowIds: [], fields: {}};
            g.rowIds.push(rowId);
            Object.assign(g.fields, fields);
            m.set(k, g);
        };
        const partnerIdsOf = new Map(roles.map((r) => [r.id, r.partnerIds]));
        for (const {rowId, plan} of snapshot) {
            if (plan.personKey) {
                const f: {[k: string]: unknown} = {};
                if (plan.personFields.phone && F.pPhone) f[F.pPhone.id] = plan.personFields.phone;
                if (plan.personFields.email && F.pEmail) f[F.pEmail.id] = plan.personFields.email;
                if (!plan.personId) put(pNew, plan.personKey, rowId, {[F.pName.id]: plan.personName, ...f});
                else if (Object.keys(f).length) put(pUpd, plan.personId, rowId, f);
            }
            if (plan.roleKey) {
                const f: {[k: string]: unknown} = {};
                if (plan.roleFields.phone && F.rPhone) f[F.rPhone.id] = plan.roleFields.phone;
                if (plan.roleFields.email && F.rEmail) f[F.rEmail.id] = plan.roleFields.email;
                if (plan.roleFields.partnerId && F.rPartner) {
                    const existing = plan.roleId ? partnerIdsOf.get(plan.roleId) ?? [] : [];
                    const prev = (rUpd.get(plan.roleId ?? '')?.fields[F.rPartner.id] as {id: string}[] | undefined)?.map((x) => x.id) ?? existing;
                    const ids = Array.from(new Set([...prev, plan.roleFields.partnerId]));
                    f[F.rPartner.id] = ids.map((id) => ({id}));
                }
                if (!plan.roleId) put(rNew, plan.roleKey, rowId, {[F.rName.id]: plan.roleName, ...f});
                else if (Object.keys(f).length) put(rUpd, plan.roleId, rowId, f);
            }
        }

        const keyToId = new Map<string, string>();
        const createAll = async (table: Table, m: Map<string, Grp>, what: string) => {
            const entries = Array.from(m.entries());
            for (const part of chunk(entries, BATCH)) {
                const defs = part.map(([, g]) => ({fields: g.fields}));
                const rowIds = part.flatMap(([, g]) => g.rowIds);
                try {
                    const chk = table.checkPermissionsForCreateRecords(defs);
                    if (!chk.hasPermission) {
                        fail(rowIds, `אין הרשאה ליצור ${what}: ${chk.reasonDisplayString}`);
                        continue;
                    }
                    const ids = await table.createRecordsAsync(defs);
                    part.forEach(([k], i) => keyToId.set(k, ids[i]));
                } catch (e) {
                    fail(rowIds, `יצירת ${what} נכשלה: ${errText(e)}`);
                }
            }
            return entries.filter(([k]) => keyToId.has(k)).length;
        };
        const updateAll = async (table: Table, m: Map<string, Grp>, what: string) => {
            const entries = Array.from(m.entries());
            let ok = 0;
            for (const part of chunk(entries, BATCH)) {
                const upd = part.map(([id, g]) => ({id, fields: g.fields}));
                const rowIds = part.flatMap(([, g]) => g.rowIds);
                try {
                    const chk = table.checkPermissionsForUpdateRecords(upd);
                    if (!chk.hasPermission) {
                        fail(rowIds, `אין הרשאה לעדכן ${what}: ${chk.reasonDisplayString}`, '✗ לא ניתן לעדכן');
                        continue;
                    }
                    await table.updateRecordsAsync(upd);
                    ok += part.length;
                } catch (e) {
                    fail(rowIds, `עדכון ${what} נכשל: ${errText(e)}`, '✗ לא ניתן לעדכן');
                }
            }
            return ok;
        };

        try {
            out.created = await createAll(pt, pNew, 'אנשים');
            out.updated = await updateAll(pt, pUpd, 'אנשים');
            out.rolesNew = await createAll(rt, rNew, 'תפקידים');
            out.rolesUpd = await updateAll(rt, rUpd, 'תפקידים');

            // ---- assignments (person + role, not already linked)
            const aPeople = writable(F.aPeople);
            const aRoles = writable(F.aRoles);
            if (aPeople && aRoles) {
                const pairs = new Map<string, {pId: string; rId: string; rowIds: number[]}>();
                for (const {rowId, plan} of snapshot) {
                    if (!plan.assign || !plan.personKey || !plan.roleKey || failed.has(rowId)) continue;
                    const pId = plan.personId ?? keyToId.get(plan.personKey);
                    const rId = plan.roleId ?? keyToId.get(plan.roleKey);
                    if (!pId || !rId) {
                        fail([rowId], 'השיבוץ לא נוצר: האדם או התפקיד לא נשמרו');
                        continue;
                    }
                    const k = `${pId}|${rId}`;
                    const g = pairs.get(k) ?? {pId, rId, rowIds: []};
                    g.rowIds.push(rowId);
                    pairs.set(k, g);
                }
                const start = F.aStart && F.aStart.type === FieldType.DATE && !F.aStart.isComputed ? F.aStart : null;
                for (const part of chunk(Array.from(pairs.values()), BATCH)) {
                    const defs = part.map((g) => {
                        const fields: {[k: string]: unknown} = {[aPeople.id]: [{id: g.pId}], [aRoles.id]: [{id: g.rId}]};
                        if (start) fields[start.id] = todayIso();
                        return {fields};
                    });
                    const rowIds = part.flatMap((g) => g.rowIds);
                    try {
                        const chk = at.checkPermissionsForCreateRecords(defs);
                        if (!chk.hasPermission) {
                            fail(rowIds, `אין הרשאה לשבץ: ${chk.reasonDisplayString}`);
                            continue;
                        }
                        await at.createRecordsAsync(defs);
                        out.assigned += part.length;
                    } catch (e) {
                        fail(rowIds, `השיבוץ נכשל: ${errText(e)}`);
                    }
                }
            }
        } catch (e) {
            setTopErr(`השליחה נעצרה: ${errText(e)}`);
        }

        out.failed = failed.size;
        // new people that got no role anywhere in this submit
        const withRole = new Set(snapshot.filter((s) => s.plan.personKey && s.plan.roleKey && !failed.has(s.rowId)).map((s) => s.plan.personKey));
        const seen = new Set<string>();
        for (const s of snapshot) {
            const k = s.plan.personKey;
            if (!s.noRole || !k || withRole.has(k) || seen.has(k) || failed.has(s.rowId)) continue;
            const id = keyToId.get(k);
            if (id) {
                seen.add(k);
                out.noRole.push({id, name: s.plan.personName});
            }
        }
        const sentIds = new Set(snapshot.map((s) => s.rowId).filter((id) => !failed.has(id)));
        setRows((rs) =>
            rs.map((r) =>
                sentIds.has(r.id)
                    ? {...r, result: {kind: 'sent'}, fading: false}
                    : failed.has(r.id)
                      ? {...r, result: {kind: 'failed', msg: failed.get(r.id)!.msg, short: failed.get(r.id)!.short}}
                      : r,
            ),
        );
        setBanner(out);
        if (out.created + out.updated + out.rolesNew + out.rolesUpd + out.assigned > 0) setConfetti((n) => n + 1);
        setBusy(false);
        // green flash → fade out → remove (failed / unsent rows stay)
        window.setTimeout(() => {
            setRows((rs) => rs.map((r) => (sentIds.has(r.id) ? {...r, fading: true} : r)));
        }, 500);
        window.setTimeout(() => {
            setRows((rs) => {
                const kept = rs.filter((r) => !sentIds.has(r.id));
                const blanks = kept.filter(isBlank).length;
                const need = Math.max(0, START_ROWS - kept.length);
                return need > 0 || blanks === 0 ? [...kept, ...blankRows(Math.max(need, 1))] : kept;
            });
            setSel(null);
        }, 1400);
    };

    const openPerson = (id: string) => {
        const rec = peopleRecs.find((r) => r.id === id);
        if (!rec) return;
        if (pt.hasPermissionToExpandRecords()) expandRecord(rec);
        else setTopErr(t('Error_Text_3'));
    };

    // ---------------- render
    const statusCell = (i: number) => {
        const row = rows[i];
        const chk = checks[i];
        if (row.result?.kind === 'sent') return {cls: 'st-sent', label: t('Content_Text_4'), tip: ''};
        if (row.skip) return {cls: 'st-same', label: t('Content_Text_5'), tip: t('Helper_Text_5')};
        if (row.result?.kind === 'failed') return {cls: 'st-error', label: row.result.short ?? `✗ ${row.result.msg}`, tip: row.result.msg};
        const cls = chk.noRole
            ? 'st-norole'
            : {empty: '', new: 'st-ok', update: 'st-upd', same: 'st-same', dup: 'st-error', warn: 'st-warn', error: 'st-error', pending: 'st-same'}[chk.state];
        return {cls, label: chk.label, tip: chk.detail};
    };

    return (
        <div className="app" dir="rtl">
            <header className="top">
                <div className="titles">
                    <h1>{t('Title')}</h1>
                    <div className="sub">{t('Heading_1')}</div>
                    <div className="explain">
                        {rich('Helper_Text_1')}
                        <br />
                        {t('Helper_Text_2')}
                    </div>
                </div>
                <div className="counter" aria-live="polite">
                    {he.rows(filled)} · {he.ready(readyIdx.length)} · {he.review(reviewCount)}
                </div>
                <div className="actions">
                    <button type="button" className="btn flip" disabled={busy || allEmpty} onClick={flip} title={t('Helper_Text_3')}>
                        {t('Button_Text_1')}
                    </button>
                    <button type="button" className="btn send" disabled={!readyIdx.length || busy} onClick={askSubmit}>
                        {busy ? t('Content_Text_3') : he.send(readyIdx.length)}
                    </button>
                    <button type="button" className="btn clear" disabled={busy} onClick={askClear}>
                        {t('Button_Text_2')}
                    </button>
                </div>
            </header>

            {banner ? (
                <div className={`banner${banner.failed ? ' partial' : ''}`} role="status">
                    <span className="big">
                        🎉 {he.added(banner.created)}
                        {banner.updated ? `, ${he.updated(banner.updated)}` : ''}
                    </span>
                    <span className="small">
                        {[
                            banner.rolesNew ? he.rolesNew(banner.rolesNew) : '',
                            banner.rolesUpd ? he.rolesUpd(banner.rolesUpd) : '',
                            banner.assigned ? he.assigned(banner.assigned) : '',
                            banner.failed ? he.failed(banner.failed) : '',
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </span>
                    {banner.noRole.length ? (
                        <span className="norole-line">
                            {he.noRole(banner.noRole.length)}{' '}
                            {banner.noRole.map((p, i) => (
                                <span key={p.id}>
                                    {i ? '، ' : ''}
                                    <button type="button" className="link" title="פתח את רשומת האדם" onClick={() => openPerson(p.id)}>
                                        {p.name}
                                    </button>
                                </span>
                            ))}
                        </span>
                    ) : null}
                    <button type="button" className="x" onClick={() => setBanner(null)} aria-label="סגור">
                        ✕
                    </button>
                </div>
            ) : null}
            {confetti ? <Confetti key={confetti} /> : null}
            {topErr ? <div className="top-err">⚠ {topErr}</div> : null}
            {pasteNote ? (
                <div className="paste-note" role="status">
                    ℹ️ {pasteNote}
                    <button type="button" className="x" onClick={() => setPasteNote('')} aria-label="סגור">
                        ✕
                    </button>
                </div>
            ) : null}

            <div className="sheet-wrap">
                {allEmpty ? <div className="empty-hint">{t('Empty_State_Text_1')}</div> : null}
                <table className="sheet">
                    <colgroup>
                        <col className="col-rownum" />
                        <col className="col-skip" />
                        {COL_LETTERS.map((l, c) => (
                            <col key={l} className={`col-c${c}`} />
                        ))}
                        <col className="col-status" />
                    </colgroup>
                    <thead>
                        <tr className="letters">
                            <th
                                className="corner select-all"
                                title="בחר הכל (Ctrl+A)"
                                onClick={() => !busy && setSel({a: {r: 0, c: 0}, b: {r: rows.length - 1, c: NCOL - 1}})}
                            >
                                ⌞
                            </th>
                            <th className="skip-h" title="סמנו / כדי לדלג על השורה">{t('Table_Heading_9')}</th>
                            {COL_LETTERS.map((l, c) => (
                                <th
                                    key={l}
                                    ref={(el) => {
                                        letterRefs.current[c] = el;
                                    }}
                                    className={`letter${dropCls(c)}`}
                                    title="גררו כדי להזיז את הנתונים של העמודה"
                                    onPointerDown={(e) => startDrag(e, c)}
                                >
                                    <span className="grip">⠿</span>
                                    {l}
                                </th>
                            ))}
                            <th className="status-letter">{STATUS_LETTER}</th>
                        </tr>
                        <tr className="names">
                            <th className="corner" />
                            <th className="skip-h" title="סמנו / כדי שהשורה לא תועלה">{t('Table_Heading_9')}</th>
                            {COL_SLOTS.map((l, c) => (
                                <th key={l} className={`c${c}${dropCls(c)}`}>
                                    {t(l)}
                                </th>
                            ))}
                            <th className="status-h">{t('Table_Heading_8')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => {
                            const chk = checks[i];
                            const st = statusCell(i);
                            const sent = row.result?.kind === 'sent';
                            const rowCls = [
                                sent ? 'sent' : '',
                                row.fading ? 'fading' : '',
                                row.skip ? 'row-skip' : '',
                                row.result?.kind === 'failed' ? 'row-bad' : '',
                                !sent && (chk.state === 'dup' || chk.state === 'error') ? 'row-bad' : '',
                                !sent && chk.state === 'warn' ? 'row-warn' : '',
                            ]
                                .filter(Boolean)
                                .join(' ');
                            return (
                                <tr key={row.id} className={rowCls}>
                                    <td className="rownum">{i + 1}</td>
                                    <td className="skip">
                                        <input
                                            type="checkbox"
                                            className="skip-box"
                                            checked={!!row.skip}
                                            disabled={busy || sent}
                                            aria-label={`דלג על שורה ${i + 1}`}
                                            title="סמנו כדי לא להעלות את השורה"
                                            onChange={(e) => setRows((rs) => rs.map((x, n) => (n === i ? {...x, skip: e.target.checked} : x)))}
                                        />
                                    </td>
                                    {row.v.map((val, c) => {
                                        const tip = sent ? '' : chk.cellTips[c];
                                        const strong = !sent && chk.dupCols.includes(c);
                                        const marked = cellInSel(sel, i, c);
                                        return (
                                            <td
                                                key={c}
                                                className={`c${c}${tip ? ' bad' : ''}${strong ? ' bad-strong' : ''}${marked ? ' sel' : ''}${dropCls(c)}`}
                                                title={tip ? (val ? `${tip}\n${val}` : tip) : val || undefined}
                                                onPointerDown={(e) => {
                                                    if (e.button !== 0 || sent || busy) return;
                                                    beginSelect(i, c, e.shiftKey);
                                                }}
                                                onPointerEnter={() => {
                                                    if (sent || busy) return;
                                                    extendSelect(i, c);
                                                }}
                                            >
                                                <input
                                                    ref={(el) => {
                                                        const k = `${i}:${c}`;
                                                        if (el) cellRefs.current.set(k, el);
                                                        else cellRefs.current.delete(k);
                                                    }}
                                                    className="cell"
                                                    dir={LTR_COLS.has(c) ? 'ltr' : 'rtl'}
                                                    value={val}
                                                    disabled={busy || sent}
                                                    aria-label={`${t(COL_SLOTS[c])} שורה ${i + 1}`}
                                                    spellCheck={false}
                                                    autoComplete="off"
                                                    onChange={(e) => setCell(i, c, e.target.value)}
                                                    onKeyDown={(e) => onKeyDown(e, i, c)}
                                                    onPaste={(e) => onPaste(e, i, c)}
                                                    onFocus={() => {
                                                        if (!selecting.current) setSel({a: {r: i, c}, b: {r: i, c}});
                                                    }}
                                                />
                                            </td>
                                        );
                                    })}
                                    <td className={`status ${st.cls}`} title={st.tip || undefined}>
                                        <div className="st-text">{st.label}</div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="foot">
                <button type="button" className="link" onClick={() => setRows((rs) => [...rs, ...blankRows(n('Number_3', 500))])}>
                    {t('Button_Text_3', {n: n('Number_3', 500)})}
                </button>
                <span className="legend">
                    {t('Helper_Text_4')}
                </span>
            </div>

            {confirm ? (
                <div className="modal-back" onMouseDown={() => setConfirm(null)}>
                    <div className="modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
                        {confirm.kind === 'clear' ? (
                            <>
                                <div className="modal-title">{t('Content_Text_1')}</div>
                                <div className="modal-actions">
                                    <button type="button" className="btn clear" autoFocus onClick={doClear}>
                                        {t('Button_Text_6')}
                                    </button>
                                    <button type="button" className="btn ghost" onClick={() => setConfirm(null)}>
                                        {t('Button_Text_5')}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="modal-title">{t('Content_Text_2')}</div>
                                <ul className="modal-list">
                                    {confirm.summary.map((s) => (
                                        <li key={s}>{s}</li>
                                    ))}
                                </ul>
                                <div className="modal-actions">
                                    <button type="button" className="btn send" autoFocus onClick={() => void doSubmit()}>
                                        {t('Button_Text_4')}
                                    </button>
                                    <button type="button" className="btn ghost" onClick={() => setConfirm(null)}>
                                        {t('Button_Text_5')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

// v0.5.0: confetti colours = Extension_Config Color_1–6 (cfg.ts; invalid hex cells are skipped)
function Confetti() {
    const colorKey = useCfg().colors().join(',');
    const [on, setOn] = useState(true);
    useEffect(() => {
        const t = window.setTimeout(() => setOn(false), 1800);
        return () => window.clearTimeout(t);
    }, []);
    const bits = useMemo(() => {
        const CONFETTI_COLORS = colorKey.split(',');
        return Array.from({length: 28}, (_, i) => ({
                left: `${(i * 37) % 100}%`,
                delay: `${(i % 7) * 0.06}s`,
                color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                rot: `${(i * 53) % 360}deg`,
            }));
    }, [colorKey]);
    if (!on) return null;
    return (
        <div className="confetti" aria-hidden="true">
            {bits.map((b, i) => (
                <span key={i} style={{left: b.left, animationDelay: b.delay, background: b.color, transform: `rotate(${b.rot})`}} />
            ))}
        </div>
    );
}

function App() {
    const base = useBase();
    const {customPropertyValueByKey: cp} = useCustomProperties(getCustomProperties);
    const slug = (typeof cp.configSlug === 'string' && cp.configSlug.trim()) || CONFIG_SLUG;
    const variant = typeof cp.configVariant === 'string' ? cp.configVariant.trim() : '';
    return (
        <ExtensionConfigProvider base={base} configTable={asTable(cp.configTable) ?? undefined} slug={slug} variant={variant} version={VERSION} displayName={CONFIG_DISPLAY_NAME} defaults={DEFAULTS} docs={DOCS}>
            <Root cp={cp} />
        </ExtensionConfigProvider>
    );
}

/** v0.5.0: right pane → Extension_Config Source_Table_1–3 (only when that cell is filled) → DEMO ids */
function Root(props: {cp: {[key: string]: unknown}}) {
    const customPropertyValueByKey = props.cp;
    const base = useBase();
    const {colorScheme} = useColorScheme();
    const {t, rich, cfg} = useCfg();
    const fromCfg = (slot: 'Source_Table_1' | 'Source_Table_2' | 'Source_Table_3'): Table | null => (cfg && cfg.raw(slot) ? cfg.table(slot) : null);
    const pt = asTable(customPropertyValueByKey.peopleTable) ?? fromCfg('Source_Table_1') ?? base.getTableByIdIfExists(IDS.people);
    const rt = asTable(customPropertyValueByKey.rolesTable) ?? fromCfg('Source_Table_2') ?? base.getTableByIdIfExists(IDS.roles);
    const at = asTable(customPropertyValueByKey.assignmentsTable) ?? fromCfg('Source_Table_3') ?? base.getTableByIdIfExists(IDS.assignments);
    const missing = [!pt && 'People', !rt && 'Roles', !at && 'Assignments'].filter(Boolean) as string[];
    const missingPrimary = [pt, rt, at]
        .filter((t): t is Table => !!t && !hasPrimaryField(t))
        .map((t) => `${PRIMARY_FIELD_LABEL[t.id] ?? 'השדה הראשי'} (${t.name})`);
    return (
        <div className={`root ${colorScheme}`} dir="rtl">
            {pt && rt && at && missingPrimary.length ? (
                <div className="app" dir="rtl">
                    <h1>{t('Title')}</h1>
                    {missingPrimary.map((m) => (
                        <p key={m} className="top-err">
                            {rich('Error_Text_2', {field: m}, {dir: 'ltr'})}
                        </p>
                    ))}
                </div>
            ) : pt && rt && at ? (
                <ErrorBoundary>
                    <BulkSheet pt={pt} rt={rt} at={at} />
                </ErrorBoundary>
            ) : (
                <div className="app" dir="rtl">
                    <h1>{t('Title')}</h1>
                    <p className="top-err">{t('Error_Text_1', {tables: missing.join(' · ')})}</p>
                </div>
            )}
        </div>
    );
}

initializeBlock({interface: () => <App />});
