/**
 * אנשים ותפקידים — CSF DEMO Interface Extension (base appiN9MrP73g6R9hi ONLY)
 *
 * One screen, no save button:
 *   person line (pick/create People) + one or more role lines (pick/create Roles)
 *   → when a line has both, an Assignments record is created automatically (Undo on the line).
 * Below: phone book of open Assignments + vacant Roles ("פנוי").
 *
 * Never touches the Airtable User field or sensitive People fields.
 */
import {Component, Fragment, useCallback, useEffect, useMemo, useRef, useState, type ErrorInfo, type ReactNode} from 'react';
import {
    expandRecord,
    initializeBlock,
    useBase,
    useColorScheme,
    useCustomProperties,
    useGlobalConfig,
    useRecords,
} from '@airtable/blocks/interface/ui';
import {
    FieldType,
    type Base,
    type Field,
    type Record as AirtableRecord,
    type Table,
} from '@airtable/blocks/interface/models';
import './style.css';
import {CONFIG_DISPLAY_NAME, CONFIG_SLUG, DEFAULTS, DOCS, type PRText, useCfg} from './cfg';
import {CONFIG_TABLE_NAME, ExtensionConfigProvider, findConfigTable} from './useExtensionConfig';
import {StatusPanel} from './StatusPanel';
import {MappingPanel} from './MappingPanel';
import {MAPPING_TOGGLE_KEY, STATUS_TOGGLE_KEY, isMappingOn, isStatusOn, mappingToggleProperty, statusToggleProperty, type StatusSource} from './statusCore';

const VERSION = '0.3.2';

// ---------------------------------------------------------------------------
// IDs (verified 2026-09-25 against DEMO appiN9MrP73g6R9hi with get_table_schema)
// ---------------------------------------------------------------------------
const IDS = {
    people: 'tblDETcBuaBMTeUmH',
    roles: 'tblBvMpH47USsN760',
    assignments: 'tblWyA778vlIsatNk',
    partners: 'tblX7qXkvyhDG3Nhe', // Partners (only for opening a partner record; fallback if the link field has no options)
    p: {
        name: 'fldVySoRplNHsjeBW', // Full Name (singleLineText, primary)
        phone: 'fldHetGMbF818K7k7', // Phone_Personal (phoneNumber)
        email: 'fldVL0rzcMUfkh1XB', // Email_Personal (email)
    },
    r: {
        name: 'fldtIE4Rhli3N7bBV', // Role (singleLineText, primary)
        phone: 'fldJUUjdyvCWibjmn', // Role Specific Phone (phoneNumber)
        email: 'fldD9lK0MD9nnufMx', // Role Specific Email (email)
        partner: 'fldqDGFT0bMcWmksP', // Partner (multipleRecordLinks → Partners)
        reportsTo: 'fldCoMcw6R6fSr877', // Reports To (multipleRecordLinks → Roles, single) — v0.1.3 vacant fallback, read-only
    },
    a: {
        people: 'fldccqNTeBR5u882z', // People (link)
        roles: 'fldzH4VKaVwYVMw4h', // Roles (link)
        start: 'fldRFnOastqcICMoS', // Start (date)
        end: 'fldSC0O1m7PAFxQLi', // End (date)
        /**
         * v0.2.3 (the owner, Oct 9: "only change THEIR partner, never everyone in the role"):
         * Assignments › "Partners 2" (multipleRecordLinks → Partners, inverse Partners › Team_Members) = this
         * person's partner in this role. Empty = the role's Partner is shown (inherited). The role block never
         * writes Roles › Partner. NOT "Partners" (fldQHRarnh7oZZSWQ, inverse Partners › Primary Contact).
         * On PROD the field is chosen in the element's properties panel (custom property assignmentPartnerField).
         */
        partner: 'fldA3GEzT8iqmU89g',
    },
} as const;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
type LinkVal = {id: string; name: string};

function asTable(v: unknown): Table | null {
    if (v && typeof v === 'object' && 'id' in v && 'fields' in v) {
        const id = (v as {id: unknown}).id;
        if (typeof id === 'string' && id.startsWith('tbl')) return v as Table;
    }
    return null;
}

/** Resolve a field exposed on the element; null (never a throw) if it is not enabled. */
function fieldOf(table: Table, id: string, names: string[]): Field | null {
    try {
        const byId = table.getFieldIfExists(id);
        if (byId) return byId;
        for (const n of names) {
            const byName = table.getFieldIfExists(n);
            if (byName) return byName;
        }
    } catch {
        /* fall through */
    }
    return null;
}

/**
 * The SDK itself reads `table.primaryField` whenever a loaded record of that table changes
 * (record_core.__triggerOnChangeForDirtyPaths). `primaryField` throws when the primary field is
 * not enabled on the element, which crashes the whole element asynchronously. So every table we
 * load with useRecords must have its primary field enabled. Returns true if it is available.
 */
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

/** digits only; leading 972 and leading 0 are treated as the same prefix */
function normPhone(s: string): string {
    let d = (s || '').replace(/\D/g, '');
    if (d.startsWith('972')) d = d.slice(3);
    while (d.startsWith('0')) d = d.slice(1);
    return d;
}

/** tel: href — keeps a leading + and the digits only */
function telHref(v: string): string {
    return `tel:${(v || '').replace(/[^\d+]/g, '')}`;
}
function mailHref(v: string): string {
    return `mailto:${(v || '').trim()}`;
}
function sameIds(a: LinkVal[], b: LinkVal[]): boolean {
    return a.length === b.length && a.every((x, i) => x.id === b[i].id);
}

/** Old seed placeholders ("DEMO Role 01" …) are not real vacancies; hidden from the vacant list (never deleted). */
function isPlaceholderRole(name: string): boolean {
    return /^demo role\b/i.test(name.trim());
}

/** Old seed placeholder people ("DEMO Person 01" …): hidden from the phone book (never deleted). */
function isPlaceholderPerson(name: string): boolean {
    return /^demo person\b/i.test(name.trim());
}

/**
 * Bumped by ניקוי. Inline editors remember the epoch they were mounted in and never write after a
 * clear, so pressing ניקוי discards typed-but-unsaved text instead of saving it on the way out.
 */
let formEpoch = 0;

function todayIso(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
}

function dateCell(rec: AirtableRecord, field: Field | null): string {
    if (!field) return '';
    const v = rec.getCellValue(field);
    return typeof v === 'string' ? v.slice(0, 10) : '';
}

function canEditField(table: Table, field: Field | null): boolean {
    if (!field || field.isComputed) return false;
    return table.hasPermissionToUpdateRecord(undefined, {[field.id]: undefined});
}

function errText(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

/** Enter pressed while an IME/composition is still open must not commit (value is not final yet). */
function isComposingKey(e: React.KeyboardEvent): boolean {
    const ne = e.nativeEvent as KeyboardEvent & {isComposing?: boolean};
    return !!ne.isComposing || ne.keyCode === 229;
}

/**
 * A blur that happens because the extension iframe lost focus (user switched window, Airtable
 * re-rendered / tore down the element) is not an intentional "done editing" – never write on it.
 */
function isRealBlur(): boolean {
    return typeof document === 'undefined' || document.hasFocus();
}

// ---------------------------------------------------------------------------
// diagnostics: crash capture (async SDK crashes bypass React error boundaries)
// ---------------------------------------------------------------------------
const CRASH_KEY = 'csf-people-roles-ext:lastCrash';
type CrashInfo = {at: string; message: string; stack: string};

function saveCrash(message: string, stack: string) {
    try {
        const info: CrashInfo = {at: new Date().toISOString(), message: message.slice(0, 500), stack: stack.slice(0, 1500)};
        window.localStorage.setItem(CRASH_KEY, JSON.stringify(info));
    } catch {
        /* storage unavailable in this frame – nothing else to do */
    }
}

function readCrash(): CrashInfo | null {
    try {
        const raw = window.localStorage.getItem(CRASH_KEY);
        return raw ? (JSON.parse(raw) as CrashInfo) : null;
    } catch {
        return null;
    }
}

function clearCrash() {
    try {
        window.localStorage.removeItem(CRASH_KEY);
    } catch {
        /* ignore */
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('error', (ev) => {
        const err = ev.error as unknown;
        saveCrash(ev.message || errText(err), err instanceof Error ? err.stack ?? '' : '');
    });
    window.addEventListener('unhandledrejection', (ev) => {
        const err = ev.reason as unknown;
        saveCrash(`unhandledrejection: ${errText(err)}`, err instanceof Error ? err.stack ?? '' : '');
    });
}

class ErrorBoundary extends Component<{children: ReactNode}, {error: Error | null; nonce: number}> {
    override state = {error: null as Error | null, nonce: 0};
    static getDerivedStateFromError(error: Error) {
        return {error};
    }
    override componentDidCatch(error: Error, info: ErrorInfo) {
        saveCrash(`render: ${error.message}`, `${error.stack ?? ''}\n${info.componentStack ?? ''}`);
    }
    override render() {
        const {error, nonce} = this.state;
        if (error) {
            return (
                <div className="app" dir="rtl">
                    <button
                        type="button"
                        className="crash"
                        onClick={() => this.setState({error: null, nonce: nonce + 1})}
                    >
                        משהו השתבש — לחצו לרענון
                    </button>
                    <pre className="crash-detail" dir="ltr">
                        {error.message}
                        {error.stack ? `\n${error.stack.split('\n').slice(0, 6).join('\n')}` : ''}
                    </pre>
                </div>
            );
        }
        return <div key={nonce}>{this.props.children}</div>;
    }
}

// ---------------------------------------------------------------------------
// custom properties (Interface Designer properties panel) — tables only
// ---------------------------------------------------------------------------
function getCustomProperties(base: Base) {
    return [
        {
            key: 'peopleTable',
            label: 'טבלת אנשים (People)',
            type: 'table' as const,
            defaultValue: base.getTableByIdIfExists(IDS.people) ?? undefined,
        },
        {
            key: 'rolesTable',
            label: 'טבלת תפקידים (Roles)',
            type: 'table' as const,
            defaultValue: base.getTableByIdIfExists(IDS.roles) ?? undefined,
        },
        {
            key: 'assignmentsTable',
            label: 'טבלת שיבוצים (Assignments)',
            type: 'table' as const,
            defaultValue: base.getTableByIdIfExists(IDS.assignments) ?? undefined,
        },
        ...assignmentPartnerProperty(base),
        // v0.3.0: Extension_Config (optional). Absent → code defaults, nothing changes on screen.
        {key: 'configTable', label: 'טבלת הגדרות (Extension_Config) – לא חובה', type: 'table' as const, defaultValue: base.getTableByNameIfExists(CONFIG_TABLE_NAME) ?? undefined},
        {key: 'configSlug', label: 'מפתח הגדרות (Extension)', type: 'string' as const, defaultValue: CONFIG_SLUG},
        {key: 'configVariant', label: 'גרסת עמוד (Variant) – ריק = ברירת מחדל', type: 'string' as const, defaultValue: ''},
        // v0.3.1: shared «מצב חיבור» panel (default OFF; ON = always shown, published view too)
        statusToggleProperty(),
        // v0.3.2: shared mapping panel — Extension_Config.Mapping_Image + GitHub_URL (default OFF)
        mappingToggleProperty(),
    ];
}

/**
 * v0.2.3: which Assignments link field holds a person's own partner (per person, never the role's shared one).
 * DEMO default: "Partners 2" (↔ Partners › Team_Members). On PROD the owner picks it here; unset = read-only partner.
 */
function assignmentPartnerProperty(base: Base) {
    try {
        const t = base.getTableByIdIfExists(IDS.assignments) ?? base.getTableByNameIfExists('Assignments');
        if (!t) return [];
        return [
            {
                key: 'assignmentPartnerField',
                label: 'גוף שותף לכל אדם (שדה קישור ב-Assignments → Partners)',
                type: 'field' as const,
                table: t,
                shouldFieldBeAllowed: (f: {config: {type: string}}) => f.config.type === FieldType.MULTIPLE_RECORD_LINKS,
                defaultValue: t.getFieldIfExists(IDS.a.partner) ?? undefined,
            },
        ];
    } catch {
        return [];
    }
}

function fieldIdOf(v: unknown): string | null {
    if (v && typeof v === 'object' && 'id' in v) {
        const id = (v as {id: unknown}).id;
        if (typeof id === 'string' && id.startsWith('fld')) return id;
    }
    return null;
}

// ---------------------------------------------------------------------------
// small UI pieces
// ---------------------------------------------------------------------------
type Option = {id: string; name: string; sub?: string; digits?: string; note?: string; noteKind?: 'taken' | 'free' | 'muted'};

function Typeahead(props: {
    items: Option[];
    placeholder: string;
    ariaLabel: string;
    onPick: (id: string) => void;
    onCreate: ((name: string) => void) | null;
    disabled?: boolean;
    /** v0.1.6 item 9: the typed text also filters the phone book */
    onQuery?: (q: string) => void;
    /** V2 S5: text pushed in from the phone book's "הוסף את X כשם חדש" */
    seed?: {text: string; n: number} | null;
    onSeedUsed?: () => void;
    /** V2 S6: Alt+N focuses this box */
    inputRef?: React.RefObject<HTMLInputElement | null>;
    /** v0.2.3: why "צור" is not possible (no create permission) — shown instead of failing silently */
    createBlocked?: string | null;
    /** v0.2.3: noun for the blocked note ("תפקיד" / "שם") */
    noun?: string;
}) {
    const {items, placeholder, ariaLabel, onPick, onCreate, disabled, onQuery, seed, onSeedUsed, inputRef, createBlocked, noun} = props;
    const [q, setQ] = useState('');
    const [tried, setTried] = useState(false);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const ownRef = useRef<HTMLInputElement>(null);
    const ref = inputRef ?? ownRef;
    useEffect(() => {
        if (!seed?.text) return;
        setQ(seed.text);
        onQuery?.(seed.text);
        setOpen(true);
        setActive(0);
        ref.current?.focus();
        onSeedUsed?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seed?.n]);

    const needle = q.trim().toLowerCase();
    const qDigits = normPhone(q);
    const matches = useMemo(() => {
        if (!needle) return [] as Option[];
        const out: Option[] = [];
        for (const it of items) {
            const byName = it.name.toLowerCase().includes(needle);
            const byPhone = qDigits.length >= 3 && !!it.digits && it.digits.includes(qDigits);
            if (byName || byPhone) out.push(it);
            if (out.length >= 8) break;
        }
        return out;
    }, [items, needle, qDigits]);
    const exact = needle ? items.some((it) => it.name.trim().toLowerCase() === needle) : true;
    const showCreate = !!onCreate && !!needle && !exact;
    const showBlocked = !onCreate && !!createBlocked && !!needle && !exact;
    const total = matches.length + (showCreate ? 1 : 0);

    const choose = (idx: number) => {
        if (idx < matches.length) {
            onPick(matches[idx].id);
        } else if (showCreate && onCreate) {
            onCreate(q.trim());
        }
        setQ('');
        onQuery?.('');
        setOpen(false);
        setActive(0);
    };

    return (
        <div className="ta" dir="rtl">
            <input
                ref={ref}
                className="input"
                dir="rtl"
                value={q}
                placeholder={placeholder}
                aria-label={ariaLabel}
                disabled={disabled}
                onChange={(e) => {
                    setQ(e.target.value);
                    onQuery?.(e.target.value);
                    setOpen(true);
                    setActive(0);
                    setTried(false);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => {
                    setOpen(false);
                    if (showBlocked) setTried(true);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setActive((a) => Math.min(a + 1, Math.max(total - 1, 0)));
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setActive((a) => Math.max(a - 1, 0));
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        if (total > 0 && !(showBlocked && active >= matches.length)) choose(Math.min(active, total - 1));
                        else if (showBlocked) setTried(true);
                    } else if (e.key === 'Escape') {
                        setOpen(false);
                    }
                }}
            />
            {open && (total > 0 || showBlocked) ? (
                <div className="ta-list" role="listbox" dir="rtl">
                    {matches.map((m, i) => (
                        <div
                            key={m.id}
                            role="option"
                            aria-selected={i === active}
                            className={`ta-opt${i === active ? ' on' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                choose(i);
                            }}
                        >
                            <span className="ta-name">{m.name}</span>
                            {m.note ? <span className={`ta-note ${m.noteKind ?? 'muted'}`}>{m.note}</span> : null}
                            {m.sub ? <bdi dir="ltr" className="ta-sub phone">{m.sub}</bdi> : null}
                        </div>
                    ))}
                    {showCreate ? (
                        <div
                            role="option"
                            aria-selected={active === matches.length}
                            className={`ta-opt create${active === matches.length ? ' on' : ''}`}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                choose(matches.length);
                            }}
                        >
                            <span className="ta-name">צור: {q.trim()}</span>
                        </div>
                    ) : null}
                    {showBlocked ? (
                        <div role="option" aria-disabled="true" aria-selected={false} className="ta-opt create blocked" onMouseDown={(e) => e.preventDefault()}>
                            <span className="ta-name">לא ניתן ליצור ״{q.trim()}״ — {createBlocked}</span>
                        </div>
                    ) : null}
                </div>
            ) : null}
            {showBlocked && (tried || matches.length === 0) ? (
                <span className="err blocked-note" role="alert">
                    ⚠ לא נשמר: {noun ? `${noun} חדש לא נוצר. ` : ''}
                    {createBlocked}
                </span>
            ) : null}
        </div>
    );
}

function useFlash(): [boolean, () => void] {
    const [on, setOn] = useState(false);
    const timer = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(timer.current), []);
    const flash = useCallback(() => {
        setOn(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setOn(false), 2000);
    }, []);
    return [on, flash];
}

/**
 * Locked name chip; the edit button unlocks it and saving renames the record.
 * Save is single-flight: the input stays mounted (read-only) until the write resolves, so an
 * unmount-blur or a second Enter can never start a second, racing write of the primary field.
 */
function NameChip(props: {
    name: string;
    editLabel: string;
    canEdit: boolean;
    onSave: (name: string) => Promise<void>;
    onUnpick: () => void;
    onExpand: (() => void) | null;
    isNew: boolean;
}) {
    const {name, editLabel, canEdit, onSave, onUnpick, onExpand, isNew} = props;
    const {t} = useCfg();
    const [mode, setMode] = useState<'view' | 'edit' | 'saving'>('view');
    const [draft, setDraft] = useState(name);
    const [err, setErr] = useState('');
    const [ok, flash] = useFlash();
    const inputRef = useRef<HTMLInputElement>(null);
    const saving = useRef(false);
    const epoch = useRef(formEpoch);

    const commit = async () => {
        if (saving.current || epoch.current !== formEpoch) return;
        // read the DOM value: it is always the final text the user sees
        const v = (inputRef.current?.value ?? draft).trim();
        if (!v || v === name) {
            setMode('view');
            return;
        }
        saving.current = true;
        setMode('saving');
        try {
            await onSave(v);
            setErr('');
            setMode('view');
            flash();
        } catch (e) {
            setErr(errText(e));
            setMode('edit');
        } finally {
            saving.current = false;
        }
    };

    if (mode !== 'view') {
        return (
            <div className="chip-row" dir="rtl">
                <input
                    ref={inputRef}
                    className="input"
                    dir="rtl"
                    autoFocus
                    value={draft}
                    readOnly={mode === 'saving'}
                    aria-label={editLabel}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => {
                        if (mode === 'edit' && isRealBlur()) void commit();
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            if (isComposingKey(e)) return;
                            e.preventDefault();
                            void commit();
                        } else if (e.key === 'Escape' && mode === 'edit') {
                            setDraft(name);
                            setErr('');
                            setMode('view');
                        }
                    }}
                />
                {mode === 'edit' ? (
                    <>
                        <button type="button" className="btn save-btn" onMouseDown={(e) => e.preventDefault()} onClick={() => void commit()}>
                            שמור
                        </button>
                        <button
                            type="button"
                            className="btn cancel-btn"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                setDraft(name);
                                setErr('');
                                setMode('view');
                            }}
                        >
                            ביטול
                        </button>
                    </>
                ) : null}
                {mode === 'saving' ? <span className="hint">שומר…</span> : null}
                {err ? <span className="err" title={err}>⚠ {err}</span> : null}
            </div>
        );
    }
    return (
        <div className="chip-row" dir="rtl">
            <span className="chip" title="נעול — לחצו על עריכה כדי לשנות">
                {name || '(ללא שם)'}
                {isNew ? <span className="tag">חדש</span> : null}
            </span>
            {ok ? <span className="save-st ok">נשמר</span> : null}
            <button
                type="button"
                className="btn secondary edit-btn"
                disabled={!canEdit}
                onClick={() => {
                    setDraft(name);
                    setErr('');
                    setMode('edit');
                }}
            >
                {editLabel}
            </button>
            {onExpand ? (
                <button type="button" className="btn secondary" title="פתח את הרשומה המלאה" onClick={onExpand}>
                    {t('Button_Text_8')}
                </button>
            ) : null}
            <button type="button" className="btn secondary" title="בחירת שם/תפקיד אחר (לא מוחק כלום)" onClick={onUnpick}>
                {t('Button_Text_9')}
            </button>
            {err ? <span className="err" title={err}>⚠ {err}</span> : null}
        </div>
    );
}

/** Another record that already uses this phone number / email (v0.1.6 duplicate check). */
type Dup = {kind: 'person' | 'role'; id: string; name: string};

function dupWho(d: Dup): string {
    return d.kind === 'person' ? d.name || 'שם ללא שם' : `תפקיד ${d.name || 'ללא שם'}`;
}
function dupText(d: Dup, field: 'tel' | 'email'): string {
    return field === 'tel'
        ? `מספר הטלפון הזה מקושר למישהו אחר: ${dupWho(d)}`
        : `כתובת האימייל הזו מקושרת למישהו אחר: ${dupWho(d)}`;
}
function normEmail(s: string): string {
    return (s || '').replace(/\s+/g, '').toLowerCase();
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

/**
 * Inline-editable phone/email cell (v0.1.6 rewrite).
 * - Saves on blur (any blur, including the extension frame losing focus) and on Enter.
 * - Typing is allowed before a name/role is chosen (allowPending); the text is saved into the record as soon as
 *   one is picked or created (only if that record's cell is empty, otherwise it stays as an unsaved draft).
 * - Visible status under the box: "לא נשמר עדיין" → "שומר…" → "✓ נשמר", or a red error.
 * - Phone/email already on another People/Roles record: gentle red box + "…מקושר למישהו אחר: <who>". It WARNS and
 *   still saves (never a silent block). Explicit "שמור" / "ביטול" buttons appear while the value is unsaved.
 */
/** V2 S6: next enabled input in the form (Enter = save + move on) */
function focusNext(el: HTMLElement) {
    const root = el.closest('.gform') ?? document.body;
    const list = [...root.querySelectorAll<HTMLInputElement>('input:not([disabled])')];
    const i = list.indexOf(el as HTMLInputElement);
    if (i >= 0 && i + 1 < list.length) list[i + 1].focus();
}

type Change = {id: number; table: Table; recordId: string; fieldId: string; label: string; who: string; before: string; after: string; at: number; undone?: boolean};
let changeSeq = 1;
// v0.3.0: the 10-minute undo window of «שינויים אחרונים» = Extension_Config Duration_1 (cfg.ts, default 600 s)
function ago(at: number): string {
    const s = Math.round((Date.now() - at) / 1000);
    if (s < 60) return 'עכשיו';
    const m = Math.floor(s / 60);
    return m === 1 ? 'לפני דקה' : `לפני ${m} דק׳`;
}

function InlineField(props: {
    table: Table;
    record: AirtableRecord | null;
    field: Field | null;
    label: string;
    kind: 'tel' | 'email';
    /** tooltip only (v0.1.4: contact boxes never show placeholder text) */
    emptyHint: string;
    allowPending?: boolean;
    pendingHint?: string;
    findDup?: (v: string) => Dup | null;
    onPickDup?: ((d: Dup) => void) | null;
    /** V2 S2/S3: every successful save is logged (undo toast + "שינויים אחרונים") */
    onSaved?: (recordId: string, before: string, after: string) => void;
}) {
    const {table, record, field, label, kind, emptyHint, allowPending, pendingHint, findDup, onPickDup, onSaved} = props;
    const stored = text(record, field);
    const recId = record?.id ?? '';
    const [draft, setDraft] = useState(stored);
    const [state, setState] = useState<SaveState>('idle');
    const [err, setErr] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const focused = useRef(false);
    const saving = useRef(false);
    const epoch = useRef(formEpoch);
    const prevRec = useRef(recId);
    const draftRef = useRef(draft);
    draftRef.current = draft;

    const fieldOk = !!field && !field.isComputed;
    const editable = fieldOk && canEditField(table, field) && (!!record || !!allowPending);

    // v0.1.6: Airtable re-formats phone numbers ("050-000-0802" → "(050) 000-0802"); compare phones by digits
    const same = (a: string, b: string) => (kind === 'tel' ? normPhone(a) === normPhone(b) && a.trim() !== '' === (b.trim() !== '') : a.trim() === b.trim());
    const write = async (raw: string) => {
        if (!record || !field || saving.current || record.isDeleted || epoch.current !== formEpoch) return;
        const v = raw.trim();
        if (same(v, stored)) {
            setState((s) => (s === 'saved' ? 'saved' : 'idle'));
            return;
        }
        const id = record.id;
        const fields = {[field.id]: v === '' ? null : v};
        saving.current = true;
        try {
            const chk = table.checkPermissionsForUpdateRecord(id, fields);
            if (!chk.hasPermission) {
                setErr(`אין הרשאה לשמור: ${chk.reasonDisplayString}`);
                setState('error');
                return;
            }
            setState('saving');
            const before = stored;
            await table.updateRecordAsync(id, fields);
            setErr('');
            setState('saved');
            onSaved?.(id, before, v);
        } catch (e) {
            setErr(`השמירה נכשלה: ${errText(e)}`);
            setState('error');
        } finally {
            saving.current = false;
        }
    };

    // record switched (picked / created / un-picked)
    useEffect(() => {
        const prev = prevRec.current;
        prevRec.current = recId;
        if (prev === recId) return;
        const typed = draftRef.current.trim();
        if (!prev && recId && typed && typed !== stored) {
            if (!stored) void write(typed); // typed before the name/role existed → save it now
            else setState('dirty'); // the record already has a value: keep the typed text, unsaved
            return;
        }
        setDraft(stored);
        setState('idle');
        setErr('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recId]);

    // external change of the stored value (or our own save coming back) while not editing
    useEffect(() => {
        // after our own save the stored (re-formatted) value replaces the draft even while focused
        if (state === 'saved' || (!focused.current && state === 'idle')) setDraft(stored);
    }, [stored, state]);

    const commit = () => {
        const v = (inputRef.current?.value ?? draftRef.current).trim();
        if (!record) {
            setState(v ? 'dirty' : 'idle');
            return;
        }
        void write(v);
    };
    const cancel = () => {
        setDraft(stored);
        setState('idle');
        setErr('');
    };

    const dup = findDup && draft.trim() ? findDup(draft) : null;
    const unsaved = !same(draft, stored);

    return (
        <div className="fld" dir="rtl">
            <span className="fld-label">{label}</span>
            <input
                ref={inputRef}
                className={`input ltr-input ${kind === 'tel' ? 'phone-input' : 'email-input'}${dup ? ' dup-input' : ''}`}
                dir="ltr"
                type={kind}
                value={draft}
                title={!fieldOk ? 'השדה לא זמין באלמנט' : !record && !allowPending ? emptyHint : undefined}
                disabled={!editable}
                aria-label={label}
                onFocus={() => {
                    focused.current = true;
                }}
                onChange={(e) => {
                    setDraft(e.target.value);
                    setState(same(e.target.value, stored) ? 'idle' : 'dirty');
                    setErr('');
                }}
                onBlur={() => {
                    focused.current = false;
                    commit();
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isComposingKey(e)) {
                        e.preventDefault();
                        commit();
                        focusNext(e.currentTarget); // V2 S6: keyboard-first, Enter saves and moves on
                    } else if (e.key === 'Escape') {
                        cancel();
                    }
                }}
            />
            {unsaved && record && editable && state !== 'saving' ? (
                <div className="save-row">
                    <button type="button" className="btn save-btn" onMouseDown={(e) => e.preventDefault()} onClick={commit}>
                        שמור
                    </button>
                    <button type="button" className="btn cancel-btn" onMouseDown={(e) => e.preventDefault()} onClick={cancel}>
                        ביטול
                    </button>
                </div>
            ) : null}
            {dup ? (
                <div className="dup-warn" role="alert">
                    <span>{dupText(dup, kind)}</span>
                    {dup.kind === 'person' && onPickDup ? (
                        <button
                            type="button"
                            className="btn tiny-btn"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => onPickDup(dup)}
                        >
                            בחר את {dup.name} במקום
                        </button>
                    ) : null}
                </div>
            ) : null}
            {state === 'saving' ? <span className="save-st">שומר…</span> : null}
            {state === 'saved' && !unsaved ? <span className="save-st ok">✓ נשמר</span> : null}
            {state === 'dirty' && unsaved ? (
                <span className="save-st pending">{record ? 'לא נשמר עדיין · Enter לשמירה' : pendingHint ?? 'יישמר אחרי בחירה'}</span>
            ) : null}
            {state === 'error' && err ? <span className="err">⚠ {err}</span> : null}
        </div>
    );
}

/**
 * Partner editor for ONE person in ONE role (v0.2.3, the owner Oct 9: "only change their partner").
 * - record/field = the Assignments row and its own partner link (default "Partners 2"). Never Roles › Partner.
 * - Empty own value → the role's Partner is shown, marked "מהתפקיד" (inherited, read-only chips).
 *   Picking a partner while inherited REPLACES it for this person only; "חזרה לגוף השותף של התפקיד" clears the override.
 * - readOnlyHint set → pills only, plus the hint (no field on the element / no assignment yet / no permission).
 * Options come from record.fetchForeignRecordsAsync, so the Partners table need not be exposed.
 */
function PartnerCell(props: {
    table: Table;
    record: AirtableRecord | null;
    field: Field | null;
    onOpen: ((id: string) => void) | null;
    inherited?: LinkVal[];
    readOnlyHint?: string | null;
    scopeHint?: string;
}) {
    const {table, record, field, onOpen, readOnlyHint, scopeHint} = props;
    const {t} = useCfg();
    const inherited = props.inherited ?? [];
    const own = links(record, field);
    const isInherited = own.length === 0 && inherited.length > 0;
    const current = own.length ? own : inherited;
    const permOk = !!record && canEditField(table, field);
    const editable = !readOnlyHint && permOk;
    const roHint = readOnlyHint ?? (record && field && !permOk ? 'לקריאה בלבד — אין הרשאה לערוך את השדה ברכיב' : null);
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [opts, setOpts] = useState<LinkVal[]>([]);
    const [err, setErr] = useState('');
    const [hint, setHint] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!open || !record || !field || !editable) return;
        let cancelled = false;
        const t = window.setTimeout(() => {
            record
                .fetchForeignRecordsAsync(field, q.trim())
                .then((res) => {
                    if (!cancelled) setOpts(res.records.map((r) => ({id: r.id, name: r.name})));
                })
                .catch((e: unknown) => {
                    if (!cancelled) setErr(`טעינת גופים שותפים נכשלה: ${errText(e)}`);
                });
        }, 200);
        return () => {
            cancelled = true;
            window.clearTimeout(t);
        };
    }, [open, q, record, field, editable]);

    const write = async (next: LinkVal[]) => {
        if (!record || !field || record.isDeleted || !editable) return;
        if (sameIds(next, own)) return;
        const id = record.id;
        const fields = {[field.id]: next.map((x) => ({id: x.id}))};
        try {
            const chk = table.checkPermissionsForUpdateRecord(id, fields);
            if (!chk.hasPermission) {
                setErr(`אין הרשאה לעדכן גוף שותף: ${chk.reasonDisplayString}`);
                return;
            }
            setSaved(false);
            await table.updateRecordAsync(id, fields);
            setErr('');
            setHint('');
            setSaved(true);
        } catch (e) {
            setErr(`עדכון גוף שותף נכשל: ${errText(e)}`);
        }
    };

    const needle = q.trim().toLowerCase();
    const available = opts
        .filter((o) => !own.some((c) => c.id === o.id))
        .filter((o) => !needle || o.name.toLowerCase().includes(needle))
        .slice(0, 8);

    const pick = (o: LinkVal) => {
        setQ('');
        setOpen(false);
        setActive(0);
        // inherited → replace for this person only; own → add another
        void write(own.length ? [...own, o] : [o]);
    };

    return (
        <div className="fld" dir="rtl">
            <span className="fld-label">{t('Content_Text_7')}</span>
            {current.length ? (
                <div className="partner">
                    {current.map((c) => (
                        <span key={c.id} className={`pill-group${isInherited ? ' inherited' : ''}`}>
                            {onOpen ? (
                                <button type="button" className="pill-link partner" title="פתח את רשומת הגוף השותף" onClick={() => onOpen(c.id)}>
                                    {c.name || c.id}
                                </button>
                            ) : (
                                <span className="pill-link partner static">{c.name || c.id}</span>
                            )}
                            {editable && !isInherited ? (
                                <button
                                    type="button"
                                    className="pill-x"
                                    title="הסר את הגוף השותף מהאדם הזה בלבד (לא מוחק את הגוף השותף, לא משנה את התפקיד)"
                                    aria-label={`הסר ${c.name || ''} מהאדם הזה`}
                                    onClick={() => void write(own.filter((x) => x.id !== c.id))}
                                >
                                    ✕
                                </button>
                            ) : null}
                        </span>
                    ))}
                    {isInherited ? <span className="tag" title="אין לאדם הזה גוף שותף משלו — מוצג הגוף השותף של התפקיד">מהתפקיד</span> : null}
                </div>
            ) : null}
            {editable && record && field ? (
                <div className="ta">
                    <input
                        className="input"
                        dir="rtl"
                        value={q}
                        placeholder={isInherited ? t('Helper_Text_4') : ''}
                        aria-label="גוף שותף לאדם הזה"
                        onChange={(e) => {
                            setQ(e.target.value);
                            setOpen(true);
                            setActive(0);
                            setHint('');
                            setSaved(false);
                        }}
                        onFocus={() => setOpen(true)}
                        onBlur={() => {
                            setOpen(false);
                            if (!needle) return;
                            const exact = opts.find(
                                (o) => o.name.trim().toLowerCase() === needle && !own.some((c) => c.id === o.id),
                            );
                            if (exact) pick(exact);
                            else setHint('לא נשמר — בחרו גוף שותף מהרשימה');
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setOpen(true);
                                setActive((a) => Math.min(a + 1, Math.max(available.length - 1, 0)));
                            } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setActive((a) => Math.max(a - 1, 0));
                            } else if (e.key === 'Enter') {
                                if (isComposingKey(e)) return;
                                e.preventDefault();
                                const o = available[Math.min(active, available.length - 1)];
                                if (o) pick(o);
                                else if (needle) setHint('לא נמצא גוף שותף בשם הזה');
                            } else if (e.key === 'Escape') {
                                setOpen(false);
                                setQ('');
                                setHint('');
                            }
                        }}
                    />
                    {open && available.length > 0 ? (
                        <div className="ta-list" role="listbox">
                            {available.map((o, i) => (
                                <div
                                    key={o.id}
                                    role="option"
                                    aria-selected={i === active}
                                    className={`ta-opt${i === active ? ' on' : ''}`}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        pick(o);
                                    }}
                                >
                                    <span className="ta-name">{o.name}</span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : null}
            {editable && own.length && inherited.length && !sameIds(own, inherited) ? (
                <button
                    type="button"
                    className="pill-link subtle"
                    title="מוחק את הגוף השותף האישי של האדם הזה; יוצג שוב הגוף השותף של התפקיד"
                    onClick={() => void write([])}
                >
                    {t('Button_Text_1')}
                </button>
            ) : null}
            {editable && scopeHint ? <span className="hint scope-hint">{scopeHint}</span> : null}
            {!editable && roHint ? <span className="hint ro-hint">{roHint}</span> : null}
            {saved && !q ? <span className="save-st ok">✓ נשמר</span> : null}
            {hint ? <span className="save-st pending">{hint}</span> : null}
            {err ? <span className="err">⚠ {err}</span> : null}
        </div>
    );
}

// ---------------------------------------------------------------------------
// main screen
// ---------------------------------------------------------------------------
type AssignState =
    | {kind: 'idle'}
    | {kind: 'busy'}
    | {kind: 'created'; id: string}
    | {kind: 'exists'; id: string}
    | {kind: 'taken'; who: string}
    | {kind: 'undone'}
    | {kind: 'error'; msg: string};

type Line = {key: number; roleId: string | null; roleIsNew: boolean; st: AssignState};

type BookRow = {
    key: string;
    personId: string | null;
    roleId: string;
    assignmentId: string | null;
    name: string;
    pPhone: string;
    pEmail: string;
    role: string;
    rPhone: string;
    rEmail: string;
    partner: string;
    partners: LinkVal[];
    /** v0.2.3: true = this person's own partner (Assignments), false = inherited from the role */
    partnerOwn: boolean;
    vacant: boolean;
    scheduled: boolean;
    /** vacant rows only: who to contact instead ("לפנייה: …") */
    fallback: Fallback | null;
};

type Fallback = {who: string; via: string; contact: string; missing: boolean};

let lineSeq = 1;
const newLine = (): Line => ({key: lineSeq++, roleId: null, roleIsNew: false, st: {kind: 'idle'}});

function PeopleRoles(props: {pt: Table; rt: Table; at: Table; aPartnerFieldId: string | null}) {
    const {pt, rt, at, aPartnerFieldId} = props;
    const base = useBase();
    const {t, dur} = useCfg();
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
        rReports: fieldOf(rt, IDS.r.reportsTo, ['Reports To']),
        aPeople: fieldOf(at, IDS.a.people, ['People']),
        aRoles: fieldOf(at, IDS.a.roles, ['Roles']),
        aStart: fieldOf(at, IDS.a.start, ['Start']),
        aEnd: fieldOf(at, IDS.a.end, ['End']),
        aPartner: null as Field | null,
    };
    // v0.2.3: the person's own partner (Assignments link → Partners). Element property first, then the DEMO id.
    // Only a writable-looking link to the same table as Roles › Partner counts; anything else = read-only partner.
    {
        const f = fieldOf(at, aPartnerFieldId ?? IDS.a.partner, []);
        const roleLinked = (F.rPartner?.options as {linkedTableId?: string} | null | undefined)?.linkedTableId ?? null;
        const linked = (f?.options as {linkedTableId?: string} | null | undefined)?.linkedTableId ?? null;
        const ok =
            !!f &&
            f.type === FieldType.MULTIPLE_RECORD_LINKS &&
            f.id !== F.aPeople?.id &&
            f.id !== F.aRoles?.id &&
            (!roleLinked || linked === roleLinked);
        F.aPartner = ok ? f : null;
    }

    const [personId, setPersonId] = useState<string | null>(null);
    const [personIsNew, setPersonIsNew] = useState(false);
    const [lines, setLines] = useState<Line[]>(() => [newLine()]);
    const [msg, setMsg] = useState<{kind: 'ok' | 'err' | 'info'; text: string} | null>(null);
    const [formNonce, setFormNonce] = useState(0);
    const [nameQ, setNameQ] = useState(''); // item 9: typed name filters the phone book
    const [roleQ, setRoleQ] = useState(''); // item 9: typed role filters the phone book
    const inflight = useRef(new Set<string>());
    const linesRef = useRef(lines);
    linesRef.current = lines;
    // v0.2.3 race fix: the person id is read from a ref at write time (never a stale closure)
    const personIdRef = useRef(personId);
    personIdRef.current = personId;
    const loadPersonRef = useRef<(id: string) => void>(() => {});
    const formTop = useRef<HTMLDivElement>(null);
    // V2 S2/S3: session change log + undo toast
    const [changes, setChanges] = useState<Change[]>([]);
    const [toast, setToast] = useState<Change | null>(null);
    const toastTimer = useRef<number | undefined>(undefined);
    // V2 S5/S6
    const [nameSeed, setNameSeed] = useState<{text: string; n: number} | null>(null);
    const nameInputRef = useRef<HTMLInputElement | null>(null);
    const [clearNonce, setClearNonce] = useState(0); // v0.2.1: bumped only by ניקוי → the phone book resets chips/sort too
    const [taNonce, setTaNonce] = useState(0); // v0.2.1: remounts only the type-ahead boxes (clears typed search text)

    const peopleById = useMemo(() => new Map(peopleRecs.map((r) => [r.id, r])), [peopleRecs]);
    const rolesById = useMemo(() => new Map(roleRecs.map((r) => [r.id, r])), [roleRecs]);
    const personRec = personId ? peopleById.get(personId) ?? null : null;
    const today = todayIso();

    // V2 S1 (Spotify "where is it already?"): who holds what, shown inside both pickers
    const holdings = useMemo(() => {
        const rolesOf = new Map<string, string[]>();
        const holderOf = new Map<string, string[]>();
        for (const a of assignRecs) {
            const end = dateCell(a, F.aEnd);
            if (end && end < today) continue;
            const ps = links(a, F.aPeople);
            const rs = links(a, F.aRoles);
            if (!ps.length || !rs.length) continue;
            for (const p of ps) for (const r of rs) {
                rolesOf.set(p.id, [...(rolesOf.get(p.id) ?? []), r.name]);
                holderOf.set(r.id, [...(holderOf.get(r.id) ?? []), p.name]);
            }
        }
        return {rolesOf, holderOf};
    }, [assignRecs, F.aEnd, F.aPeople, F.aRoles, today]);

    const peopleOptions: Option[] = useMemo(
        () =>
            peopleRecs
                .map((r) => {
                    const phone = text(r, F.pPhone);
                    const held = holdings.rolesOf.get(r.id) ?? [];
                    return {id: r.id, name: text(r, F.pName), sub: phone, digits: normPhone(phone),
                        note: held.length ? `משובץ: ${held.join(', ')}` : 'ללא תפקיד', noteKind: 'muted' as const};
                })
                .filter((o) => o.name)
                .sort((a, b) => a.name.localeCompare(b.name, 'he')),
        [peopleRecs, F.pName, F.pPhone, holdings],
    );
    const roleOptions: Option[] = useMemo(
        () =>
            roleRecs
                .map((r) => {
                    const h = holdings.holderOf.get(r.id) ?? [];
                    return {id: r.id, name: text(r, F.rName), note: h.length ? `תפוס: ${h.join(', ')}` : 'פנוי',
                        noteKind: (h.length ? 'taken' : 'free') as 'taken' | 'free'};
                })
                .filter((o) => o.name)
                .sort((a, b) => a.name.localeCompare(b.name, 'he')),
        [roleRecs, F.rName, holdings],
    );

    const isOpenAssignment = useCallback(
        (a: AirtableRecord) => {
            const end = dateCell(a, F.aEnd);
            return !end || end >= today;
        },
        [F.aEnd, today],
    );

    const findOpen = useCallback(
        (pId: string, rId: string): AirtableRecord | undefined =>
            assignRecs.find(
                (a) =>
                    isOpenAssignment(a) &&
                    links(a, F.aPeople).some((x) => x.id === pId) &&
                    links(a, F.aRoles).some((x) => x.id === rId),
            ),
        [assignRecs, isOpenAssignment, F.aPeople, F.aRoles],
    );

    const patchLine = useCallback((key: number, patch: Partial<Line>) => {
        linesRef.current = linesRef.current.map((l) => (l.key === key ? {...l, ...patch} : l));
        setLines((ls) => ls.map((l) => (l.key === key ? {...l, ...patch} : l)));
    }, []);

    const ensureAssignment = useCallback(
        async (key: number, pId: string, rId: string) => {
            if (!F.aPeople || !F.aRoles) return;
            const pair = `${pId}|${rId}`;
            if (inflight.current.has(pair)) return;
            let existingId: string | null = null;
            try {
                existingId = findOpen(pId, rId)?.id ?? null;
            } catch (e) {
                patchLine(key, {st: {kind: 'error', msg: `בדיקת שיבוץ קיים נכשלה: ${errText(e)}`}});
                return;
            }
            if (existingId) {
                patchLine(key, {st: {kind: 'exists', id: existingId}});
                return;
            }
            // item 8: one role = at most ONE open assignment (open = End empty or End >= today)
            const holder = assignRecs.find(
                (a) =>
                    isOpenAssignment(a) &&
                    links(a, F.aRoles).some((x) => x.id === rId) &&
                    !links(a, F.aPeople).some((x) => x.id === pId) &&
                    links(a, F.aPeople).length > 0,
            );
            if (holder) {
                patchLine(key, {st: {kind: 'taken', who: links(holder, F.aPeople)[0]?.name || 'מישהו אחר'}});
                return;
            }
            inflight.current.add(pair);
            try {
                const fields: {[k: string]: unknown} = {
                    [F.aPeople.id]: [{id: pId}],
                    [F.aRoles.id]: [{id: rId}],
                };
                if (F.aStart && F.aStart.type === FieldType.DATE && !F.aStart.isComputed) {
                    const withStart = {...fields, [F.aStart.id]: todayIso()};
                    if (at.hasPermissionToCreateRecord(withStart)) fields[F.aStart.id] = todayIso();
                }
                const chk = at.checkPermissionsForCreateRecord(fields);
                if (!chk.hasPermission) {
                    patchLine(key, {st: {kind: 'error', msg: `אין הרשאה לשבץ: ${chk.reasonDisplayString}`}});
                    return;
                }
                patchLine(key, {st: {kind: 'busy'}});
                const id = await at.createRecordAsync(fields);
                patchLine(key, {st: {kind: 'created', id}});
            } catch (e) {
                patchLine(key, {st: {kind: 'error', msg: `השיבוץ נכשל: ${errText(e)}`}});
            } finally {
                inflight.current.delete(pair);
            }
        },
        [at, F.aPeople, F.aRoles, F.aStart, findOpen, patchLine, assignRecs, isOpenAssignment],
    );

    const pickPerson = useCallback(
        (id: string, isNew: boolean) => {
            personIdRef.current = id;
            setPersonId(id);
            setPersonIsNew(isNew);
            for (const l of linesRef.current) {
                if (l.roleId) void ensureAssignment(l.key, id, l.roleId);
                else patchLine(l.key, {st: {kind: 'idle'}});
            }
        },
        [ensureAssignment, patchLine],
    );

    const pickRole = useCallback(
        (key: number, roleId: string, isNew: boolean) => {
            patchLine(key, {roleId, roleIsNew: isNew, st: {kind: 'idle'}});
            const pId = personIdRef.current; // v0.2.3: not the closure's personId (stale while a new name is still saving)
            if (pId) void ensureAssignment(key, pId, roleId);
        },
        [patchLine, ensureAssignment],
    );

    /**
     * v0.2.3 safety net for the timing gap: any line that has a person AND a role but is still "idle"
     * (e.g. the role finished saving before the new name did) is assigned as soon as both exist.
     */
    useEffect(() => {
        if (!personId) return;
        for (const l of lines) {
            if (l.roleId && l.st.kind === 'idle') void ensureAssignment(l.key, personId, l.roleId);
        }
    }, [personId, lines, ensureAssignment]);

    const createPerson = useCallback(
        async (name: string) => {
            if (!F.pName) return;
            try {
                const fields = {[F.pName.id]: name};
                const chk = pt.checkPermissionsForCreateRecord(fields);
                if (!chk.hasPermission) {
                    setMsg({kind: 'err', text: `לא ניתן ליצור שם: ${chk.reasonDisplayString}`});
                    return;
                }
                const id = await pt.createRecordAsync(fields);
                pickPerson(id, true);
                setMsg({kind: 'ok', text: `נוצר: ${name}. עכשיו טלפון ואימייל.`});
            } catch (e) {
                setMsg({kind: 'err', text: `יצירת השם נכשלה: ${errText(e)}`});
            }
        },
        [pt, F.pName, pickPerson],
    );

    const createRole = useCallback(
        async (key: number, name: string) => {
            if (!F.rName) return;
            try {
                const fields = {[F.rName.id]: name};
                const chk = rt.checkPermissionsForCreateRecord(fields);
                if (!chk.hasPermission) {
                    patchLine(key, {st: {kind: 'error', msg: `לא ניתן ליצור תפקיד: ${chk.reasonDisplayString}`}});
                    return;
                }
                const id = await rt.createRecordAsync(fields);
                pickRole(key, id, true);
                setMsg({kind: 'ok', text: `נוצר תפקיד: ${name}`});
            } catch (e) {
                patchLine(key, {st: {kind: 'error', msg: `יצירת התפקיד נכשלה: ${errText(e)}`}});
            }
        },
        [rt, F.rName, pickRole, patchLine],
    );

    // latest records by id, read at write time (never a Record captured in an earlier render)
    const latest = useRef({people: peopleById, roles: rolesById});
    latest.current = {people: peopleById, roles: rolesById};

    const rename = useCallback(async (table: Table, kind: 'people' | 'roles', recordId: string, field: Field | null, name: string) => {
        if (!field) throw new Error('שדה השם לא זמין');
        const rec = latest.current[kind].get(recordId);
        if (!rec || rec.isDeleted) throw new Error('הרשומה לא זמינה יותר — רעננו ובחרו שוב');
        const fields = {[field.id]: name};
        const chk = table.checkPermissionsForUpdateRecord(recordId, fields);
        if (!chk.hasPermission) throw new Error(`אין הרשאה לשנות שם: ${chk.reasonDisplayString}`);
        try {
            await table.updateRecordAsync(recordId, fields);
        } catch (e) {
            throw new Error(`שינוי השם נכשל: ${errText(e)}`);
        }
    }, []);

    const undo = useCallback(
        async (line: Line) => {
            if (line.st.kind !== 'created') return;
            const id = line.st.id;
            try {
                const chk = at.checkPermissionsForDeleteRecord(id);
                if (!chk.hasPermission) {
                    patchLine(line.key, {st: {kind: 'error', msg: `אין הרשאה לבטל: ${chk.reasonDisplayString}`}});
                    return;
                }
                patchLine(line.key, {st: {kind: 'busy'}});
                await at.deleteRecordAsync(id);
                patchLine(line.key, {st: {kind: 'undone'}});
            } catch (e) {
                patchLine(line.key, {st: {kind: 'error', msg: `הביטול נכשל: ${errText(e)}`}});
            }
        },
        [at, patchLine],
    );

    /** "This is the same person" → switch to the existing record; a People record created here seconds ago is removed. */
    const switchToExisting = useCallback(
        async (existingId: string) => {
            const discardId = personIsNew ? personId : null;
            try {
            if (discardId) {
                for (const l of linesRef.current) {
                    if (l.st.kind === 'created' && at.hasPermissionToDeleteRecord(l.st.id)) {
                        try {
                            await at.deleteRecordAsync(l.st.id);
                        } catch {
                            /* keep going; shown in the phone book if it survived */
                        }
                    }
                }
                if (pt.hasPermissionToDeleteRecord(discardId)) {
                    try {
                        await pt.deleteRecordAsync(discardId);
                    } catch (e) {
                        setMsg({kind: 'err', text: `הרשומה החדשה לא נמחקה: ${errText(e)}`});
                    }
                }
            }
            setFormNonce((n) => n + 1); // fresh phone/email boxes for the existing person (typed duplicate discarded)
            loadPersonRef.current(existingId); // v0.2.3: same as a search pick — their roles load as stacked blocks
            setMsg({kind: 'info', text: 'עברנו לאדם הקיים.'});
            } catch (e) {
                setMsg({kind: 'err', text: `המעבר לאדם הקיים נכשל: ${errText(e)}`});
            }
        },
        [at, pt, personId, personIsNew],
    );

    /** ניקוי: one press → empty form. Remounts every input (typed type-ahead text included) and discards unsaved edits. */
    const clearAll = () => {
        formEpoch += 1;
        setFormNonce((n) => n + 1);
        setClearNonce((n) => n + 1);
        setPersonId(null);
        setPersonIsNew(false);
        setLines([newLine()]);
        setMsg(null);
        setNameQ('');
        setRoleQ('');
        setNameSeed(null);
    };
    /** v0.2.1: the phone book's "נקה סינון" clears the typed text in the top boxes; with nothing picked it is a full ניקוי */
    const clearTyped = () => {
        if (!personId && !linesRef.current.some((l) => l.roleId)) {
            clearAll();
            return;
        }
        setTaNonce((n) => n + 1);
        setNameQ('');
        setRoleQ('');
        setNameSeed(null);
    };

    // V2 S2/S3: log each contact save; the toast offers בטל for 10s, the strip for 10 minutes
    const logChange = (table: Table, field: Field | null, label: string, who: string) => (recordId: string, before: string, after: string) => {
        if (!field) return;
        const c: Change = {id: changeSeq++, table, recordId, fieldId: field.id, label, who, before, after, at: Date.now()};
        setChanges((cs) => [c, ...cs].slice(0, 8));
        setToast(c);
        window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(() => setToast(null), 10000);
    };
    const undoChange = async (c: Change) => {
        try {
            const fields = {[c.fieldId]: c.before === '' ? null : c.before};
            const chk = c.table.checkPermissionsForUpdateRecord(c.recordId, fields);
            if (!chk.hasPermission) {
                setMsg({kind: 'err', text: `אין הרשאה לבטל: ${chk.reasonDisplayString}`});
                return;
            }
            await c.table.updateRecordAsync(c.recordId, fields);
            setChanges((cs) => cs.map((x) => (x.id === c.id ? {...x, undone: true} : x)));
            setToast((t) => (t && t.id === c.id ? null : t));
        } catch (e) {
            setMsg({kind: 'err', text: `הביטול נכשל: ${errText(e)}`});
        }
    };

    // V2 S6: "/" = search (v0.2.1: the name box, or the first empty role box when a person is loaded), Alt+N = new name
    const hot = useRef({hasPerson: false, clear: () => {}});
    hot.current = {hasPerson: !!personId, clear: clearAll};
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
            if (e.key === '/' && !typing) {
                e.preventDefault();
                const target =
                    nameInputRef.current ??
                    formTop.current?.querySelector<HTMLInputElement>('input[aria-label="בחר תפקיד / צור תפקיד חדש"]') ??
                    null;
                target?.focus();
            } else if (e.altKey && e.code === 'KeyN') {
                e.preventDefault();
                if (hot.current.hasPerson) hot.current.clear();
                window.setTimeout(() => nameInputRef.current?.focus(), 60);
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);
    const addNameFromBook = (q: string) => {
        if (personId) clearAll();
        setNameSeed({text: q, n: Date.now()});
        formTop.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
    };

    // v0.1.6 duplicate index: People personal phone/email + Roles role phone/email, normalised
    const contactIndex = useMemo(() => {
        const out: {k: 'tel' | 'email'; d: string; dup: Dup}[] = [];
        const add = (k: 'tel' | 'email', raw: string, dup: Dup) => {
            const d = k === 'tel' ? normPhone(raw) : normEmail(raw);
            if (k === 'tel' ? d.length >= 7 : d.includes('@')) out.push({k, d, dup});
        };
        for (const r of peopleRecs) {
            const dup: Dup = {kind: 'person', id: r.id, name: text(r, F.pName)};
            if (F.pPhone) add('tel', text(r, F.pPhone), dup);
            if (F.pEmail) add('email', text(r, F.pEmail), dup);
        }
        for (const r of roleRecs) {
            const dup: Dup = {kind: 'role', id: r.id, name: text(r, F.rName)};
            if (F.rPhone) add('tel', text(r, F.rPhone), dup);
            if (F.rEmail) add('email', text(r, F.rEmail), dup);
        }
        return out;
    }, [peopleRecs, roleRecs, F.pPhone, F.pEmail, F.pName, F.rPhone, F.rEmail, F.rName]);

    /** First OTHER record (people first, then roles) with the same normalised phone/email; null if none. */
    const findDup = useCallback(
        (v: string, k: 'tel' | 'email', exceptPerson: string | null, exceptRole: string | null): Dup | null => {
            const d = k === 'tel' ? normPhone(v) : normEmail(v);
            if (k === 'tel' ? d.length < 7 : !d.includes('@')) return null;
            const hit = contactIndex.find(
                (x) =>
                    x.k === k &&
                    x.d === d &&
                    !(x.dup.kind === 'person' && x.dup.id === exceptPerson) &&
                    !(x.dup.kind === 'role' && x.dup.id === exceptRole),
            );
            return hit ? hit.dup : null;
        },
        [contactIndex],
    );

    // v0.1.6: record detail from the phone book / form (name → People, role → Roles, partner → Partners)
    const canExpandP = pt.hasPermissionToExpandRecords();
    const canExpandR = rt.hasPermissionToExpandRecords();
    const openPerson = (id: string) => {
        const r = peopleById.get(id);
        if (r) expandRecord(r);
    };
    const openRole = (id: string) => {
        const r = rolesById.get(id);
        if (r) expandRecord(r);
    };
    const partnerTableId =
        (F.rPartner?.options as {linkedTableId?: string} | null | undefined)?.linkedTableId ?? IDS.partners;
    const openPartner = (id: string) => {
        try {
            const tbl = base.getTableByIdIfExists(partnerTableId);
            if (tbl && !tbl.hasPermissionToExpandRecords()) {
                setMsg({kind: 'err', text: 'אין הרשאה לפתוח רשומת גוף שותף'});
                return;
            }
            // The Partners table is not loaded with useRecords (its fields are not on the element), so there is no
            // Record object. expandRecord only needs the record id and its table (parentTable.id + parentBase).
            const parentTable = tbl ?? {id: partnerTableId, parentBase: base};
            expandRecord({id, parentTable} as unknown as AirtableRecord);
        } catch (e) {
            setMsg({kind: 'err', text: `פתיחת הגוף השותף נכשלה: ${errText(e)}`});
        }
    };

    // phone book rows
    const bookRows = useMemo(() => {
        const rows: BookRow[] = [];
        const filled = new Set<string>();
        /** current holder of each role (a started assignment wins over a scheduled one) */
        const holders = new Map<string, {name: string; phone: string; email: string; scheduled: boolean}>();
        const roleCells = (rId: string) => {
            const rr = rolesById.get(rId);
            return {
                role: rr ? text(rr, F.rName) : '',
                rPhone: text(rr, F.rPhone),
                rEmail: text(rr, F.rEmail),
                partner: links(rr, F.rPartner)
                    .map((x) => x.name)
                    .join(', '),
                partners: links(rr, F.rPartner),
            };
        };
        for (const a of assignRecs) {
            if (!isOpenAssignment(a)) continue;
            const ps = links(a, F.aPeople);
            const rs = links(a, F.aRoles);
            if (!ps.length || !rs.length) continue;
            const start = dateCell(a, F.aStart);
            const scheduled = !!start && start > today;
            for (const p of ps) {
                const pr = peopleById.get(p.id);
                const name = pr ? text(pr, F.pName) : p.name;
                if (isPlaceholderPerson(name)) continue; // old "DEMO Person 0X" rows: hidden, never deleted
                const pPhone = text(pr, F.pPhone);
                const pEmail = text(pr, F.pEmail);
                for (const r of rs) {
                    const rr = rolesById.get(r.id);
                    if (isPlaceholderRole(rr ? text(rr, F.rName) : r.name)) continue; // old "DEMO Role 0X" rows
                    filled.add(r.id);
                    const h = holders.get(r.id);
                    if (!h || (h.scheduled && !scheduled)) holders.set(r.id, {name, phone: pPhone, email: pEmail, scheduled});
                    const own = links(a, F.aPartner); // v0.2.3: per-person partner wins over the role's
                    const cells = roleCells(r.id);
                    rows.push({
                        key: `${a.id}-${p.id}-${r.id}`,
                        personId: p.id,
                        roleId: r.id,
                        assignmentId: a.id,
                        name,
                        pPhone,
                        pEmail,
                        ...cells,
                        ...(own.length ? {partners: own, partner: own.map((x) => x.name).join(', ')} : {}),
                        partnerOwn: own.length > 0,
                        vacant: false,
                        scheduled,
                        fallback: null,
                    });
                }
            }
        }
        rows.sort((x, y) => x.name.localeCompare(y.name, 'he') || x.role.localeCompare(y.role, 'he'));

        /**
         * Vacant role → someone to call. Order:
         *  1. Reports To chain (up to 4 levels): the parent role's holder, with the parent ROLE phone/email first
         *     (role-first rule), else the holder's personal phone/email.
         *  2. The vacant role's own role phone / role email.
         *  3. Its Partner.
         */
        const fallbackFor = (rId: string): Fallback => {
            const rr = rolesById.get(rId);
            if (F.rReports && rr) {
                const seen = new Set<string>([rId]);
                let cur: AirtableRecord | undefined = rr;
                for (let depth = 0; cur && depth < 4; depth++) {
                    const parent: LinkVal | undefined = links(cur, F.rReports)[0];
                    if (!parent || seen.has(parent.id)) break;
                    seen.add(parent.id);
                    const pr = rolesById.get(parent.id);
                    const pName = pr ? text(pr, F.rName) : parent.name;
                    const h = holders.get(parent.id);
                    const contact = text(pr, F.rPhone) || text(pr, F.rEmail) || h?.phone || h?.email || '';
                    if (h || contact) {
                        return {who: h ? h.name : pName, via: h ? pName : 'תפקיד אחראי', contact, missing: false};
                    }
                    cur = pr;
                }
            }
            const own = text(rr, F.rPhone) || text(rr, F.rEmail);
            if (own) return {who: 'תיבת התפקיד', via: '', contact: own, missing: false};
            const partner = links(rr, F.rPartner)
                .map((x) => x.name)
                .join(', ');
            if (partner) return {who: partner, via: 'גוף שותף', contact: '', missing: false};
            return {
                who: F.rReports ? 'אין איש קשר — הגדירו Reports To לתפקיד' : 'אין איש קשר (Reports To לא מופעל ברכיב)',
                via: '',
                contact: '',
                missing: true,
            };
        };

        const vacant: BookRow[] = [];
        for (const r of roleRecs) {
            if (filled.has(r.id)) continue;
            const cells = roleCells(r.id);
            if (isPlaceholderRole(cells.role)) continue; // old "DEMO Role 0X" seed rows: filtered, never deleted
            vacant.push({
                key: `vac-${r.id}`,
                personId: null,
                roleId: r.id,
                assignmentId: null,
                name: 'פנוי',
                pPhone: '',
                pEmail: '',
                ...cells,
                partnerOwn: false,
                vacant: true,
                scheduled: false,
                fallback: fallbackFor(r.id),
            });
        }
        vacant.sort((x, y) => x.role.localeCompare(y.role, 'he'));
        return rows.concat(vacant);
    }, [assignRecs, roleRecs, peopleById, rolesById, isOpenAssignment, today, F.aPeople, F.aRoles, F.aStart, F.pName, F.pPhone, F.pEmail, F.rName, F.rPhone, F.rEmail, F.rPartner, F.rReports, F.aPartner]);

    const loadRow = (row: BookRow) => {
        setFormNonce((n) => n + 1); // fresh editors for the loaded person/roles (no carry-over of typed drafts)
        setNameQ(''); // the type-ahead boxes remount empty, so their search text goes too
        setRoleQ('');
        setPersonId(row.personId);
        setPersonIsNew(false);
        const same = row.personId ? bookRows.filter((r) => r.personId === row.personId) : [row];
        const ordered = [row, ...same.filter((r) => r.key !== row.key)];
        setLines(
            ordered.map((r) => {
                const l = newLine();
                l.roleId = r.roleId;
                if (r.assignmentId) l.st = {kind: 'exists', id: r.assignmentId};
                return l;
            }),
        );
        setMsg({kind: 'info', text: row.vacant ? 'תפקיד פנוי נטען — בחרו שם כדי לשבץ.' : 'נטען לטופס.'});
        formTop.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
    };

    /**
     * v0.2.3: a name picked in the search box loads like a phone-book row click: personal phone/email once on
     * the person line, then one stacked role block per open assignment (role, role phone/email, partner).
     * Role lines filled BEFORE the name was picked stay on top and are assigned as before.
     * Editors are not remounted, so a phone/email typed before the pick is still saved into an empty cell.
     */
    const loadPerson = (id: string) => {
        const kept = linesRef.current.filter((l) => l.roleId);
        const keptRoles = new Set(kept.map((l) => l.roleId));
        const loaded = bookRows
            .filter((r) => r.personId === id && !r.vacant && !keptRoles.has(r.roleId))
            .map((r) => {
                const l = newLine();
                l.roleId = r.roleId;
                if (r.assignmentId) l.st = {kind: 'exists', id: r.assignmentId};
                return l;
            });
        const next = kept.length + loaded.length ? [...kept, ...loaded] : [newLine()];
        linesRef.current = next;
        setLines(next);
        setNameQ('');
        setRoleQ('');
        pickPerson(id, false);
        const n = bookRows.filter((r) => r.personId === id && !r.vacant).length;
        setMsg({
            kind: 'info',
            text: n === 0 ? 'לשם הזה עדיין אין תפקיד — בחרו או צרו תפקיד.' : n === 1 ? 'נטען לטופס: תפקיד אחד.' : `נטען לטופס: ${n} תפקידים.`,
        });
    };
    loadPersonRef.current = loadPerson;

    const missing = [
        !F.pName && 'Full Name (People)',
        !F.rName && 'Role (Roles)',
        !F.aPeople && 'People (Assignments)',
        !F.aRoles && 'Roles (Assignments)',
    ].filter(Boolean) as string[];
    if (missing.length) return <SetupMessage missing={missing} />;

    // v0.2.3: never fail silently — every missing create permission is named on screen
    const personCreateChk = pt.checkPermissionsForCreateRecord(F.pName ? {[F.pName.id]: undefined} : undefined);
    const roleCreateChk = rt.checkPermissionsForCreateRecord(F.rName ? {[F.rName.id]: undefined} : undefined);
    const assignCreateChk = at.checkPermissionsForCreateRecord(
        F.aPeople && F.aRoles ? {[F.aPeople.id]: undefined, [F.aRoles.id]: undefined} : undefined,
    );
    const canCreatePerson = personCreateChk.hasPermission;
    const canCreateRole = roleCreateChk.hasPermission;
    const reasonOf = (c: {hasPermission: boolean; reasonDisplayString?: string}) =>
        c.hasPermission ? '' : c.reasonDisplayString || 'הרכיב לא מאפשר יצירת רשומות בטבלה הזו';
    const permIssues = [
        !canCreateRole && `אין הרשאה ליצור תפקיד חדש (טבלת ${rt.name}): ${reasonOf(roleCreateChk)}`,
        !assignCreateChk.hasPermission && `אין הרשאה לשבץ — ליצור רשומת שיבוץ (טבלת ${at.name}): ${reasonOf(assignCreateChk)}`,
        !canCreatePerson && `אין הרשאה ליצור שם חדש (טבלת ${pt.name}): ${reasonOf(personCreateChk)}`,
    ].filter(Boolean) as string[];
    const assignById = new Map(assignRecs.map((a) => [a.id, a]));
    const partnerRO = !F.aPartner
        ? 'לקריאה בלבד — גוף שותף לכל אדם עוד לא מוגדר ברכיב (שדה שיבוץ → Partners). שינוי כאן לא ישנה את התפקיד.'
        : null;

    return (
        <div className="app" dir="rtl">
            <div className="form" ref={formTop} dir="rtl">
                <div className="top-row">
                    <h1>{t('Title')}</h1>
                    <span className="kbd-hints">
                        <span className="kbd-hint" title="קיצור מקלדת: חיפוש"><kbd>/</kbd> חיפוש</span>
                        <span className="kbd-hint" title="קיצור מקלדת: שם חדש"><kbd>Alt</kbd>+<kbd>N</kbd> שם חדש</span>
                    </span>
                </div>
                <p className="explain">{t('Helper_Text_1')}</p>
                {permIssues.length ? (
                    <div className="perm-warn" role="alert">
                        {permIssues.map((t) => (
                            <span key={t}>⚠ {t}</span>
                        ))}
                        <span className="hint">{t('Error_Text_2')}</span>
                    </div>
                ) : null}

                {/* v0.1.6: one grid for both lines → name/role, phones, emails line up; partner alone at the end */}
                <div className="gform">
                <div className="gline person-line" dir="rtl">
                    <div className="cell name-cell">
                        <span className="fld-label">{t('Content_Text_1')}</span>
                        {personRec ? (
                            <NameChip
                                name={text(personRec, F.pName)}
                                editLabel={t('Content_Text_12')}
                                canEdit={canEditField(pt, F.pName)}
                                isNew={personIsNew}
                                onSave={(n) => rename(pt, 'people', personRec.id, F.pName, n)}
                                onUnpick={() => {
                                    personIdRef.current = null;
                                    setPersonId(null);
                                    setPersonIsNew(false);
                                    // v0.2.3: role blocks that were only LOADED for this person (existing assignments) leave with them,
                                    // so the next name is never auto-assigned someone else's roles; lines the user filled stay.
                                    const keep = linesRef.current.filter((l) => l.st.kind !== 'exists').map((l) => ({...l, st: {kind: 'idle'} as AssignState}));
                                    const next = keep.length ? keep : [newLine()];
                                    linesRef.current = next;
                                    setLines(next);
                                }}
                                onExpand={canExpandP ? () => expandRecord(personRec) : null}
                            />
                        ) : (
                            <Typeahead
                                key={`pta-${formNonce}-${taNonce}`}
                                items={peopleOptions}
                                placeholder={t('Helper_Text_2')}
                                ariaLabel="בחר שם / צור שם חדש"
                                onPick={(id) => loadPerson(id)}
                                onCreate={canCreatePerson ? (n) => void createPerson(n) : null}
                                createBlocked={canCreatePerson ? null : `אין הרשאה: ${reasonOf(personCreateChk)}`}
                                noun="שם"
                                onQuery={setNameQ}
                                seed={nameSeed}
                                onSeedUsed={() => setNameSeed(null)}
                                inputRef={nameInputRef}
                            />
                        )}
                    </div>
                    <div className="cell">
                        <InlineField
                            key={`pp-${formNonce}`}
                            table={pt}
                            record={personRec}
                            field={F.pPhone}
                            label={t('Content_Text_3')}
                            kind="tel"
                            emptyHint="בחר/צור שם קודם"
                            allowPending
                            pendingHint="יישמר כשתבחרו או תיצרו שם"
                            findDup={(v) => findDup(v, 'tel', personId, null)}
                            onPickDup={(d) => void switchToExisting(d.id)}
                            onSaved={logChange(pt, F.pPhone, t('Content_Text_3'), text(personRec, F.pName))}
                        />
                    </div>
                    <div className="cell">
                        <InlineField
                            key={`pe-${formNonce}`}
                            table={pt}
                            record={personRec}
                            field={F.pEmail}
                            label={t('Content_Text_4')}
                            kind="email"
                            emptyHint="בחר/צור שם קודם"
                            allowPending
                            pendingHint="יישמר כשתבחרו או תיצרו שם"
                            findDup={(v) => findDup(v, 'email', personId, null)}
                            onSaved={logChange(pt, F.pEmail, t('Content_Text_4'), text(personRec, F.pName))}
                        />
                    </div>
                    {/* item 10: ניקוי sits above the partner field, aligned left */}
                    <div className="cell clear-cell">
                        <button
                            type="button"
                            className="btn primary-green"
                            title="מנקה את הטופס. לא מוחק כלום; טקסט שעוד לא נשמר מתבטל."
                            onMouseDown={(e) => e.preventDefault() /* keep focus: no blur-save of half-typed text */}
                            onClick={clearAll}
                        >
                            {t('Button_Text_2')}
                        </button>
                    </div>
                </div>

                {/* role lines + the add-role button as their child */}
                <div className="roles-block">
                {lines.map((line) => {
                    const roleRec = line.roleId ? rolesById.get(line.roleId) ?? null : null;
                    const aId = line.st.kind === 'exists' || line.st.kind === 'created' ? line.st.id : null;
                    const aRec = aId ? assignById.get(aId) ?? null : null;
                    const personName = personRec ? text(personRec, F.pName) : '';
                    const lineRO = partnerRO ?? (!roleRec
                        ? null
                        : !aRec
                          ? 'גוף שותף נקבע לכל אדם אחרי השיבוץ. כאן מוצג הגוף השותף של התפקיד (לקריאה בלבד).'
                          : null);
                    return (
                        <div className="gline role-line" key={`${formNonce}-${line.key}`} dir="rtl">
                            <div className="cell name-cell">
                                <span className="fld-label">{t('Content_Text_2')}</span>
                                {roleRec ? (
                                    <NameChip
                                        name={text(roleRec, F.rName)}
                                        editLabel={t('Content_Text_13')}
                                        canEdit={canEditField(rt, F.rName)}
                                        isNew={line.roleIsNew}
                                        onSave={(n) => rename(rt, 'roles', roleRec.id, F.rName, n)}
                                        onUnpick={() => patchLine(line.key, {roleId: null, roleIsNew: false, st: {kind: 'idle'}})}
                                        onExpand={canExpandR ? () => expandRecord(roleRec) : null}
                                    />
                                ) : (
                                    <Typeahead
                                        key={`rta-${formNonce}-${taNonce}-${line.key}`}
                                        items={roleOptions}
                                        placeholder={t('Helper_Text_3')}
                                        ariaLabel="בחר תפקיד / צור תפקיד חדש"
                                        onPick={(id) => pickRole(line.key, id, false)}
                                        onCreate={canCreateRole ? (n) => void createRole(line.key, n) : null}
                                        createBlocked={canCreateRole ? null : `אין הרשאה: ${reasonOf(roleCreateChk)}`}
                                        noun="תפקיד"
                                        onQuery={setRoleQ}
                                    />
                                )}
                            </div>
                            <div className="cell">
                                <InlineField
                                    key={`rp-${formNonce}-${line.key}`}
                                    table={rt}
                                    record={roleRec}
                                    field={F.rPhone}
                                    label={t('Content_Text_5')}
                                    kind="tel"
                                    emptyHint="בחר/צור תפקיד קודם"
                                    allowPending
                                    pendingHint="יישמר כשתבחרו או תיצרו תפקיד"
                                    findDup={(v) => findDup(v, 'tel', null, line.roleId)}
                                    onSaved={logChange(rt, F.rPhone, t('Content_Text_5'), text(roleRec, F.rName))}
                                />
                            </div>
                            <div className="cell">
                                <InlineField
                                    key={`re-${formNonce}-${line.key}`}
                                    table={rt}
                                    record={roleRec}
                                    field={F.rEmail}
                                    label={t('Content_Text_6')}
                                    kind="email"
                                    emptyHint="בחר/צור תפקיד קודם"
                                    allowPending
                                    pendingHint="יישמר כשתבחרו או תיצרו תפקיד"
                                    findDup={(v) => findDup(v, 'email', null, line.roleId)}
                                    onSaved={logChange(rt, F.rEmail, t('Content_Text_6'), text(roleRec, F.rName))}
                                />
                            </div>
                            <div className="cell partner-cell">
                                {/* v0.2.3: per-person partner (Assignments), never Roles › Partner */}
                                <PartnerCell
                                    key={`apa-${line.roleId ?? ''}-${aId ?? ''}`}
                                    table={at}
                                    record={aRec}
                                    field={F.aPartner}
                                    inherited={links(roleRec, F.rPartner)}
                                    onOpen={openPartner}
                                    readOnlyHint={lineRO}
                                    scopeHint={personName ? t('Helper_Text_6', {name: personName}) : undefined}
                                />
                            </div>
                            <div className="line-status">
                                <AssignStatus
                                    line={line}
                                    hasPerson={!!personId}
                                    onUndo={() => void undo(line)}
                                    onRetry={() => {
                                        if (personId && line.roleId) void ensureAssignment(line.key, personId, line.roleId);
                                    }}
                                />
                                {lines.length > 1 ? (
                                    <button
                                        type="button"
                                        className="btn tiny-btn"
                                        title="מסיר את השורה מהטופס בלבד (לא מוחק שיבוץ)"
                                        onClick={() => {
                                            setLines((ls) => ls.filter((l) => l.key !== line.key));
                                            if (!line.roleId) setRoleQ('');
                                        }}
                                    >
                                        {t('Button_Text_7')}
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    );
                })}

                <div className="add-role-row">
                    <button type="button" className="btn dark" onClick={() => setLines((ls) => [...ls, newLine()])}>
                        {t('Button_Text_3')}
                    </button>
                </div>
                </div>
                </div>
                {msg ? <p className={`msg ${msg.kind}`}>{msg.text}</p> : null}
            </div>

            {changes.length ? (
                <details className="changes" open dir="rtl">
                    <summary>
                        {t('Heading_2')} <span className="count">{changes.length}</span>
                    </summary>
                    <ul>
                        {changes.map((c) => (
                            <li key={c.id} className={c.undone ? 'undone' : ''}>
                                <b>{c.who}</b> · {c.label}:{' '}
                                {c.before ? <del><bdi dir="ltr">{c.before}</bdi></del> : <span className="hint">ריק</span>}
                                {' ← '}
                                {c.after ? <bdi dir="ltr" className="after">{c.after}</bdi> : <span className="hint">ריק</span>}
                                <span className="hint"> · {ago(c.at)}</span>
                                {c.undone ? (
                                    <span className="hint"> · בוטל</span>
                                ) : Date.now() - c.at < dur('Duration_1') * 1000 ? (
                                    <button type="button" className="btn tiny-btn" onClick={() => void undoChange(c)}>
                                        בטל
                                    </button>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </details>
            ) : null}
            {toast ? (
                <div className="toast" role="status" dir="rtl">
                    <span>
                        {toast.label} של {toast.who} עודכן
                    </span>
                    <button type="button" className="btn tiny-btn" onClick={() => void undoChange(toast)}>
                        בטל
                    </button>
                </div>
            ) : null}

            <PhoneBook
                rows={bookRows}
                onPick={loadRow}
                onOpenPerson={canExpandP ? openPerson : null}
                onOpenRole={canExpandR ? openRole : null}
                onOpenPartner={openPartner}
                formName={nameQ}
                formRole={roleQ}
                pickedPersonId={personId}
                pickedPersonName={personRec ? text(personRec, F.pName) : ''}
                pickedRoleIds={lines.map((l) => l.roleId).filter((id): id is string => !!id)}
                onClearQuery={clearTyped}
                resetKey={clearNonce}
                onAddName={canCreatePerson ? addNameFromBook : null}
            />
            <footer className="foot" dir="rtl">
                {t('Heading_3')} · <bdi dir="ltr">v{VERSION}</bdi>
            </footer>
        </div>
    );
}

// v0.3.0: the «ביטול שיבוץ» tooltip = Extension_Config Helper_Text_5 (cfg.ts)

function AssignStatus(props: {line: Line; hasPerson: boolean; onUndo: () => void; onRetry: () => void}) {
    const {line, hasPerson, onUndo, onRetry} = props;
    const {t} = useCfg();
    const undoTip = t('Helper_Text_5');
    const st = line.st;
    if (!line.roleId || !hasPerson) {
        return <span className="hint">{line.roleId ? 'בחרו שם כדי לשבץ' : hasPerson ? 'בחרו תפקיד כדי לשבץ' : ''}</span>;
    }
    switch (st.kind) {
        case 'busy':
            return <span className="hint">משבץ…</span>;
        case 'created':
            return (
                <span className="assign-st">
                    <span className="status ok-box">{t('Content_Text_11')}</span>
                    <button type="button" className="btn undo-btn" title={undoTip} aria-label={`ביטול שיבוץ. ${undoTip}`} onClick={onUndo}>
                        {t('Button_Text_5')}
                    </button>
                </span>
            );
        case 'exists':
            return <span className="status ok-box">{t('Content_Text_14')}</span>;
        case 'taken':
            return (
                <span className="dup-warn" role="alert">
                    התפקיד הזה כבר משובץ ל־{st.who} (תפקיד אחד = שיבוץ פתוח אחד). לא נוצר שיבוץ.
                </span>
            );
        case 'undone':
            return (
                <span className="assign-st">
                    <span className="status">השיבוץ בוטל · השם והתפקיד נשארו</span>
                    <button type="button" className="btn small" onClick={onRetry}>
                        שבץ שוב
                    </button>
                </span>
            );
        case 'error':
            return (
                <span className="status err" title={st.msg}>
                    ⚠ {st.msg}
                    <button type="button" className="btn small" onClick={onRetry}>
                        נסה שוב
                    </button>
                </span>
            );
        default:
            // v0.2.3: idle with both a person and a role = not assigned yet → never a silent "…"
            return (
                <span className="assign-st">
                    <span className="hint">עדיין לא שובץ</span>
                    <button type="button" className="btn small" onClick={onRetry}>
                        {t('Button_Text_4')}
                    </button>
                </span>
            );
    }
}

/**
 * v0.2.3: phone = tap-to-call pill (tel:). One isolated LTR run that never wraps (v0.1.5 rule kept).
 * Clicks never bubble to the phone-book row (which would load the row into the form).
 */
function PhoneText(props: {value: string}) {
    return props.value ? (
        <a
            className="pill-link tel"
            href={telHref(props.value)}
            target="_blank"
            rel="noopener noreferrer"
            title={`חיוג: ${props.value}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
        >
            <bdi dir="ltr" className="phone">{props.value}</bdi>
        </a>
    ) : null;
}

/** v0.2.3: email = tap-to-email pill (mailto:); ellipsis when space is short, full address in the tooltip. */
function EmailText(props: {value: string}) {
    return props.value ? (
        <a
            className="pill-link mail"
            href={mailHref(props.value)}
            target="_blank"
            rel="noopener noreferrer"
            title={`שליחת אימייל: ${props.value}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
        >
            <bdi dir="ltr" className="email">{props.value}</bdi>
        </a>
    ) : null;
}

/** a "לפנייה" contact is either a phone or an email */
function ContactPill(props: {value: string}) {
    return props.value.includes('@') ? <EmailText value={props.value} /> : <PhoneText value={props.value} />;
}

/** v0.2.3: partner names as pills (open the Partner record) */
function PartnerPills(props: {partners: LinkVal[]; onOpen: ((id: string) => void) | null; inherited?: boolean}) {
    const {partners, onOpen, inherited} = props;
    return (
        <span className="pill-wrap">
            {partners.map((p) =>
                onOpen ? (
                    <button
                        key={p.id}
                        type="button"
                        className="pill-link partner"
                        title={inherited === false ? 'גוף שותף אישי (לאדם הזה) — פתח את הרשומה' : 'פתח את רשומת הגוף השותף'}
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpen(p.id);
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        {p.name || p.id}
                    </button>
                ) : (
                    <span key={p.id} className="pill-link partner static">
                        {p.name || p.id}
                    </span>
                ),
            )}
        </span>
    );
}

function fallbackText(f: Fallback | null): string {
    if (!f) return '';
    return ['לפנייה:', f.who, f.via, f.contact].filter(Boolean).join(' ');
}

/** v0.1.6 column order (the owner): שם, תפקיד, טלפון אישי, אימייל אישי, טלפון תפקיד, אימייל תפקיד, גוף שותף */
type ColKey = 'name' | 'role' | 'pPhone' | 'pEmail' | 'rPhone' | 'rEmail' | 'partner';
/** v0.3.0: column labels = Extension_Config Table_Heading_1–7 (defaults = the v0.2.3 labels) */
const COLS: {key: ColKey; label: PRText; cls: string}[] = [
    {key: 'name', label: 'Table_Heading_1', cls: 'name-col'},
    {key: 'role', label: 'Table_Heading_2', cls: 'role-col'},
    {key: 'pPhone', label: 'Table_Heading_3', cls: 'phone-col'},
    {key: 'pEmail', label: 'Table_Heading_4', cls: 'email-col'},
    {key: 'rPhone', label: 'Table_Heading_5', cls: 'phone-col'},
    {key: 'rEmail', label: 'Table_Heading_6', cls: 'email-col'},
    {key: 'partner', label: 'Table_Heading_7', cls: 'partner-col'},
];
type SortState = {key: ColKey; dir: 'asc' | 'desc'} | null;
type Scope = 'all' | 'filled' | 'vacant';
const NO_PARTNER = '__none__';

function sortValue(r: BookRow, key: ColKey): string {
    switch (key) {
        case 'name':
            return r.vacant ? '' : r.name;
        case 'pPhone':
            return normPhone(r.pPhone);
        case 'rPhone':
            return normPhone(r.rPhone);
        default:
            return r[key];
    }
}

const collator = new Intl.Collator('he', {numeric: true, sensitivity: 'base'});

function PhoneBook(props: {
    rows: BookRow[];
    onPick: (row: BookRow) => void;
    onOpenPerson: ((id: string) => void) | null;
    onOpenRole: ((id: string) => void) | null;
    onOpenPartner: ((id: string) => void) | null;
    /** v0.2.1: the form's name / role boxes ARE the phone-book search (no separate search box) */
    formName?: string;
    formRole?: string;
    /** v0.2.1: a picked (locked) person shows only their rows; picked roles (no person) show only those roles */
    pickedPersonId?: string | null;
    pickedPersonName?: string;
    pickedRoleIds?: string[];
    /** v0.2.1: clears the typed text in the top boxes (S5 "נקה סינון" + "נקה סינון ומיון") */
    onClearQuery?: () => void;
    /** v0.2.1: ניקוי also resets chips / partner filter / sort */
    resetKey?: number;
    /** V2 S5 */
    onAddName?: ((q: string) => void) | null;
}) {
    const {rows, onPick, onOpenPerson, onOpenRole, onOpenPartner, onAddName, onClearQuery} = props;
    const {t} = useCfg();
    const [card, setCard] = useState<string | null>(null); // V2 S4: row key whose contact card is open
    const nameText = (props.formName ?? '').trim();
    const roleText = (props.formRole ?? '').trim().toLowerCase();
    const pickedPersonId = props.pickedPersonId ?? null;
    const pickedRoleKey = (props.pickedRoleIds ?? []).join(',');
    // typed role text wins over a picked person (so you can see who already holds that role); typed name + typed role = AND
    const byPerson = !nameText && !!pickedPersonId && !roleText;
    const byRoles = !nameText && !pickedPersonId && !roleText && !!pickedRoleKey;
    const [scope, setScope] = useState<Scope>('all');
    const [partnerFilter, setPartnerFilter] = useState('');
    const [sort, setSort] = useState<SortState>(null);

    const partnerOptions = useMemo(() => {
        const m = new Map<string, string>();
        for (const r of rows) for (const p of r.partners) if (!m.has(p.id)) m.set(p.id, p.name || p.id);
        return [...m.entries()].sort((a, b) => collator.compare(a[1], b[1]));
    }, [rows]);

    // ניקוי → back to "הכל", no partner filter, no sort
    useEffect(() => {
        if (props.resetKey === undefined) return;
        setScope('all');
        setPartnerFilter('');
        setSort(null);
        setCard(null);
    }, [props.resetKey]);

    const shown = useMemo(() => {
        const tokens = nameText.toLowerCase().split(/\s+/).filter(Boolean);
        const roleSet = new Set(pickedRoleKey ? pickedRoleKey.split(',') : []);
        let out = rows.filter((r) => (scope === 'all' ? true : scope === 'vacant' ? r.vacant : !r.vacant));
        if (partnerFilter === NO_PARTNER) out = out.filter((r) => r.partners.length === 0);
        else if (partnerFilter) out = out.filter((r) => r.partners.some((p) => p.id === partnerFilter));
        if (byPerson) out = out.filter((r) => r.personId === pickedPersonId);
        if (byRoles) out = out.filter((r) => roleSet.has(r.roleId));
        if (roleText) out = out.filter((r) => r.role.toLowerCase().includes(roleText));
        if (tokens.length) {
            out = out.filter((r) => {
                // name box: every word must match the name, an email, or (3+ digits) a phone, like the old search
                if (r.vacant) return false;
                const hay = [r.name, r.pEmail, r.rEmail].join(' ').toLowerCase();
                const phones = [r.pPhone, r.rPhone].map(normPhone);
                return tokens.every((t) => {
                    if (hay.includes(t)) return true;
                    const d = normPhone(t);
                    return d.length >= 3 && /^[\d\-+() ]+$/.test(t) && phones.some((ph) => ph.includes(d));
                });
            });
        }
        if (sort) {
            const k = sort.key;
            const mul = sort.dir === 'asc' ? 1 : -1;
            out = [...out].sort((a, b) => {
                const va = sortValue(a, k);
                const vb = sortValue(b, k);
                if (!va && !vb) return collator.compare(a.role, b.role);
                if (!va) return 1; // empty cells always last
                if (!vb) return -1;
                return mul * collator.compare(va, vb) || collator.compare(a.role, b.role);
            });
        }
        return out;
    }, [rows, nameText, roleText, byPerson, byRoles, pickedPersonId, pickedRoleKey, scope, partnerFilter, sort]);

    const filledCount = rows.filter((r) => !r.vacant).length;
    const vacantCount = rows.length - filledCount;
    const typedQuery = !!nameText || !!roleText;
    const filtered = typedQuery || byPerson || byRoles || scope !== 'all' || !!partnerFilter;
    const filterBits = [
        nameText ? `שם/טלפון ״${nameText}״` : byPerson ? `השם שנבחר: ${props.pickedPersonName ?? ''}` : '',
        roleText ? `תפקיד ״${(props.formRole ?? '').trim()}״` : byRoles ? 'התפקיד שנבחר' : '',
    ].filter(Boolean);

    const toggleSort = (key: ColKey) =>
        setSort((s) => (!s || s.key !== key ? {key, dir: 'asc'} : s.dir === 'asc' ? {key, dir: 'desc'} : null));

    const stop = (e: React.SyntheticEvent) => e.stopPropagation();
    const clearFilters = () => {
        if (typedQuery) onClearQuery?.();
        setScope('all');
        setPartnerFilter('');
        setSort(null);
    };
    const typed = nameText || (props.formRole ?? '').trim();
    const typedIsName = !!nameText && !/^[\d\-+() ]+$/.test(nameText) && !nameText.includes('@');

    return (
        <section className="book" dir="rtl">
            <div className="top-row">
                <h2>{t('Heading_1')}</h2>
                <span className="hint">
                    {filledCount} שיבוצים · {vacantCount} תפקידים פנויים
                </span>
            </div>
            <div className="row filters" role="group" aria-label="סינון ספר הטלפונים">
                <button type="button" className={`btn chip-btn${scope === 'all' ? ' on' : ''}`} aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
                    {t('Tab_Label_1')} <span className="count">{rows.length}</span>
                </button>
                <button type="button" className={`btn chip-btn${scope === 'filled' ? ' on' : ''}`} aria-pressed={scope === 'filled'} onClick={() => setScope('filled')}>
                    {t('Tab_Label_2')} <span className="count">{filledCount}</span>
                </button>
                <button type="button" className={`btn chip-btn vacant${scope === 'vacant' ? ' on' : ''}`} aria-pressed={scope === 'vacant'} onClick={() => setScope('vacant')}>
                    {t('Tab_Label_3')} <span className="count">{vacantCount}</span>
                </button>
                <label className="partner-filter">
                    <span className="fld-label">{t('Content_Text_7')}</span>
                    <select className="input select" value={partnerFilter} aria-label="סינון לפי גוף שותף" onChange={(e) => setPartnerFilter(e.target.value)}>
                        <option value="">הכל</option>
                        <option value={NO_PARTNER}>{t('Content_Text_9')}</option>
                        {partnerOptions.map(([id, name]) => (
                            <option key={id} value={id}>
                                {name}
                            </option>
                        ))}
                    </select>
                </label>
                {(filtered && !byPerson && !byRoles) || sort ? (
                    <button
                        type="button"
                        className="btn secondary"
                        onClick={clearFilters}
                    >
                        {t('Button_Text_6')}
                    </button>
                ) : null}
            </div>
            <div className="hint shown-count">
                מוצגות {shown.length} מתוך {rows.length} שורות
                {filterBits.length ? ` · מסונן לפי ${filterBits.join(' + ')}` : ''}
                {sort ? ` · ממוין לפי ${t(COLS.find((c) => c.key === sort.key)?.label ?? 'Table_Heading_1')} ${sort.dir === 'asc' ? 'בסדר עולה' : 'בסדר יורד'}` : ''}
            </div>
            <div className="table-wrap">
                <table dir="rtl">
                    <thead>
                        <tr>
                            {COLS.map((c) => {
                                const on = sort?.key === c.key;
                                return (
                                    <th
                                        key={c.key}
                                        className={`${c.cls} sortable${on ? ' sorted' : ''}`}
                                        aria-sort={on ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                                    >
                                        <button type="button" className="th-btn" title="לחצו למיון (עולה / יורד / ללא)" onClick={() => toggleSort(c.key)}>
                                            {t(c.label)}
                                            <span className={`sort-arrow${on ? ' on' : ''}`} aria-hidden="true">
                                                {on ? (sort?.dir === 'asc' ? '▲' : '▼') : '↕'}
                                            </span>
                                        </button>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {shown.length === 0 ? (
                            <tr>
                                <td colSpan={7}>
                                    {/* V2 S5 (Vercel Geist): quote the query, one primary action, one secondary */}
                                    <div className="empty-state" role="status">
                                        <p>
                                            {typed ? (
                                                <>
                                                    לא נמצא <b>״{typed}״</b> בספר הטלפונים
                                                </>
                                            ) : byPerson ? (
                                                t('Empty_State_Text_3')
                                            ) : scope === 'vacant' && !filtered ? (
                                                t('Empty_State_Text_2')
                                            ) : (
                                                t('Empty_State_Text_1')
                                            )}
                                        </p>
                                        <div className="row">
                                            {filtered && !byPerson && !byRoles ? (
                                                <button type="button" className="btn primary-blue" onClick={clearFilters}>
                                                    נקה סינון
                                                </button>
                                            ) : null}
                                            {typedIsName && onAddName ? (
                                                <button type="button" className="pill-link add" onClick={() => onAddName(typed)}>
                                                    הוסף את ״{typed}״ כשם חדש
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            shown.map((r) => (
                                <Fragment key={r.key}>
                                <tr
                                    className={`${r.vacant ? 'vacant' : ''}${card === r.key ? ' card-open' : ''}`}
                                    tabIndex={0}
                                    title="לחצו על השורה כדי לטעון לטופס · על שם / תפקיד / גוף שותף כדי לפתוח את הרשומה · F2 או הרחב לכרטיס מלא"
                                    onClick={() => onPick(r)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target === e.currentTarget) onPick(r);
                                        else if (e.key === 'F2') {
                                            e.preventDefault();
                                            setCard((c) => (c === r.key ? null : r.key));
                                        } else if (e.key === 'Escape') setCard(null);
                                    }}
                                >
                                    <td className="name-col">
                                        {r.vacant ? (
                                            <span className="pill vacant">{t('Content_Text_8')}</span>
                                        ) : r.personId && onOpenPerson ? (
                                            <button type="button" className="pill-link name" title="פתח את רשומת האדם" onClick={(e) => { stop(e); onOpenPerson(r.personId as string); }} onKeyDown={stop}>
                                                {r.name}
                                            </button>
                                        ) : (
                                            r.name
                                        )}
                                        {r.scheduled ? <span className="tag">{t('Content_Text_10')}</span> : null}
                                        <button
                                            type="button"
                                            className="expand-btn"
                                            aria-expanded={card === r.key}
                                            title="כרטיס מלא (F2)"
                                            onClick={(e) => {
                                                stop(e);
                                                setCard((c) => (c === r.key ? null : r.key));
                                            }}
                                            onKeyDown={stop}
                                        >
                                            {card === r.key ? t('Tab_Label_5') : t('Tab_Label_4')}
                                        </button>
                                    </td>
                                    <td className="role-col">
                                        {onOpenRole ? (
                                            <button type="button" className="pill-link role" title="פתח את רשומת התפקיד" onClick={(e) => { stop(e); onOpenRole(r.roleId); }} onKeyDown={stop}>
                                                {r.role}
                                            </button>
                                        ) : (
                                            r.role
                                        )}
                                    </td>
                                    {r.vacant ? (
                                        <td colSpan={2} className={`fallback${r.fallback?.missing ? ' missing' : ''}`}>
                                            {r.fallback?.missing ? (
                                                r.fallback.who
                                            ) : r.fallback ? (
                                                <>
                                                    לפנייה: <b>{r.fallback.who}</b>
                                                    {r.fallback.via ? <span className="via"> · {r.fallback.via}</span> : null}
                                                    {r.fallback.contact ? (
                                                        <>
                                                            {' · '}
                                                            <ContactPill value={r.fallback.contact} />
                                                        </>
                                                    ) : null}
                                                </>
                                            ) : null}
                                        </td>
                                    ) : (
                                        <>
                                            <td className="phone-col">
                                                <PhoneText value={r.pPhone} />
                                            </td>
                                            <td className="email-col">
                                                <EmailText value={r.pEmail} />
                                            </td>
                                        </>
                                    )}
                                    <td className="phone-col">
                                        <PhoneText value={r.rPhone} />
                                    </td>
                                    <td className="email-col">
                                        <EmailText value={r.rEmail} />
                                    </td>
                                    <td className="partner-col">
                                        <PartnerPills partners={r.partners} onOpen={onOpenPartner} inherited={!r.partnerOwn} />
                                    </td>
                                </tr>
                                {card === r.key ? (
                                    <tr className="card-row">
                                        <td colSpan={7}>
                                            <ContactCard
                                                r={r}
                                                onOpenPartner={onOpenPartner}
                                                onLoad={() => onPick(r)}
                                                onOpen={
                                                    r.personId && onOpenPerson
                                                        ? () => onOpenPerson(r.personId as string)
                                                        : onOpenRole
                                                          ? () => onOpenRole(r.roleId)
                                                          : null
                                                }
                                                onClose={() => setCard(null)}
                                            />
                                        </td>
                                    </tr>
                                ) : null}
                                </Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

/** V2 S4 (Elastic UI cell expand): nothing clipped stays hidden — full name, role, all contacts, partner */
function ContactCard(props: {r: BookRow; onLoad: () => void; onOpen: (() => void) | null; onClose: () => void; onOpenPartner: ((id: string) => void) | null}) {
    const {r, onLoad, onOpen, onClose, onOpenPartner} = props;
    const {t} = useCfg();
    const pill = (label: string, node: ReactNode, has: boolean) => (
        <div className="cc-item">
            <span className="cc-label">{label}</span>
            {has ? <span className="cc-val">{node}</span> : <span className="hint">—</span>}
        </div>
    );
    const item = (label: string, value: string, kind: 'text' | 'tel' | 'mail' = 'text') =>
        pill(label, kind === 'tel' ? <PhoneText value={value} /> : kind === 'mail' ? <EmailText value={value} /> : value, !!value);
    return (
        <div className="contact-card" dir="rtl" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
            <div className="cc-grid">
                {item(t('Table_Heading_1'), r.vacant ? t('Content_Text_8') : r.name)}
                {item(t('Table_Heading_2'), r.role)}
                {r.vacant ? item('לפנייה', fallbackText(r.fallback).replace(/^לפנייה:\s*/, '')) : item(t('Table_Heading_3'), r.pPhone, 'tel')}
                {r.vacant ? null : item(t('Table_Heading_4'), r.pEmail, 'mail')}
                {item(t('Table_Heading_5'), r.rPhone, 'tel')}
                {item(t('Table_Heading_6'), r.rEmail, 'mail')}
                {pill(r.partnerOwn ? `${t('Table_Heading_7')} (אישי)` : t('Table_Heading_7'), <PartnerPills partners={r.partners} onOpen={onOpenPartner} inherited={!r.partnerOwn} />, r.partners.length > 0)}
            </div>
            <div className="row">
                <button type="button" className="btn" onClick={onLoad}>{t('Button_Text_10')}</button>
                {onOpen ? <button type="button" className="btn" onClick={onOpen}>{t('Button_Text_8')}</button> : null}
                <button type="button" className="btn" onClick={onClose}>{t('Tab_Label_5')}</button>
            </div>
        </div>
    );
}

function SetupMessage(props: {missing: string[]; primary?: boolean}) {
    const {t} = useCfg();
    return (
        <div className="app" dir="rtl">
            <h1>{t('Heading_3')}</h1>
            <div className="setup" dir="rtl">
                {props.missing.map((m) => (
                    <p key={m} className="msg err">
                        השדה <b dir="ltr">{m}</b> לא מופעל ברכיב
                    </p>
                ))}
                <p className="hint">
                    {props.primary
                        ? 'Airtable דורש שהשדה הראשי של כל טבלה שהתוסף קורא יהיה מופעל (אפשר לקריאה בלבד). הפעילו אותו בפאנל הנתונים של הרכיב ורעננו.'
                        : 'הפעילו את השדה בפאנל הנתונים של הרכיב ורעננו.'}
                </p>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// root: resolve tables (custom properties first, then known ids)
// ---------------------------------------------------------------------------
function App() {
    const base = useBase();
    const {customPropertyValueByKey: cp} = useCustomProperties(getCustomProperties);
    const slug = (typeof cp.configSlug === 'string' && cp.configSlug.trim()) || CONFIG_SLUG;
    const variant = typeof cp.configVariant === 'string' ? cp.configVariant.trim() : '';
    return (
        <ExtensionConfigProvider base={base} configTable={asTable(cp.configTable) ?? undefined} slug={slug} variant={variant} version={VERSION} displayName={CONFIG_DISPLAY_NAME} defaults={DEFAULTS} docs={DOCS}>
            <Root cp={cp} status={
                    <>
                        <Status cp={cp} slug={slug} variant={variant} />
                        <Mapping cp={cp} slug={slug} />
                    </>
                } />
        </ExtensionConfigProvider>
    );
}

/** v0.3.0: right pane → Extension_Config (Source_Table_1–3 / Source_Field_1, only when that cell is filled) → DEMO ids */
function Root(props: {cp: {[key: string]: unknown}; status?: ReactNode}) {
    const customPropertyValueByKey = props.cp;
    const base = useBase();
    const {colorScheme} = useColorScheme();
    const {t, cfg} = useCfg();
    const fromCfg = (slot: 'Source_Table_1' | 'Source_Table_2' | 'Source_Table_3'): Table | null => (cfg && cfg.raw(slot) ? cfg.table(slot) : null);
    const pt = asTable(customPropertyValueByKey.peopleTable) ?? fromCfg('Source_Table_1') ?? base.getTableByIdIfExists(IDS.people);
    const rt = asTable(customPropertyValueByKey.rolesTable) ?? fromCfg('Source_Table_2') ?? base.getTableByIdIfExists(IDS.roles);
    const at = asTable(customPropertyValueByKey.assignmentsTable) ?? fromCfg('Source_Table_3') ?? base.getTableByIdIfExists(IDS.assignments);
    const cfgPartner = cfg && cfg.raw('Source_Field_1') ? cfg.ref('Source_Field_1') : null;
    const aPartnerFieldId =
        fieldIdOf(customPropertyValueByKey.assignmentPartnerField) ?? (cfgPartner?.field && cfgPartner.table?.id === at?.id ? cfgPartner.field.id : null);

    const missing = [!pt && 'People', !rt && 'Roles', !at && 'Assignments'].filter(Boolean) as string[];
    const missingPrimary = [pt, rt, at]
        .filter((t): t is Table => !!t && !hasPrimaryField(t))
        .map((t) => `${PRIMARY_FIELD_LABEL[t.id] ?? 'השדה הראשי'} (${t.name})`);
    const [lastCrash, setLastCrash] = useState<CrashInfo | null>(() => readCrash());
    return (
        <div className={`root ${colorScheme}`} dir="rtl">
            {lastCrash ? (
                <div className="crash-banner" dir="rtl">
                    <span>קריסה קודמת ({new Date(lastCrash.at).toLocaleString('he-IL')}):</span>
                    <code dir="ltr">{lastCrash.message}</code>
                    <button
                        type="button"
                        className="btn small"
                        onClick={() => {
                            clearCrash();
                            setLastCrash(null);
                        }}
                    >
                        סגור
                    </button>
                </div>
            ) : null}
            {pt && rt && at && missingPrimary.length ? (
                <SetupMessage missing={missingPrimary} primary />
            ) : pt && rt && at ? (
                <ErrorBoundary>
                    <PeopleRoles pt={pt} rt={rt} at={at} aPartnerFieldId={aPartnerFieldId} />
                </ErrorBoundary>
            ) : (
                <div className="app" dir="rtl">
                    <h1>{t('Heading_3')}</h1>
                    <p className="msg err">{t('Error_Text_1', {tables: missing.join(' · ')})}</p>
                </div>
            )}
            {props.status}
        </div>
    );
}


/** v0.3.1 «מצב חיבור» (shared status-panel v1): config table, row, visible fields, table + field resolution. Read-only. */
function Status(props: {cp: {[key: string]: unknown}; slug: string; variant: string}) {
    const {cp, slug, variant} = props;
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const {cfg} = useCfg();
    const on = isStatusOn(cp[STATUS_TOGGLE_KEY]);
    if (!on) return null;
    const raw = (k: string) => {
        try {
            const v = globalConfig.get(k);
            return typeof v === 'string' ? v : null;
        } catch {
            return null;
        }
    };
    const cfgTable = asTable(cp.configTable) ?? findConfigTable(base);
    const cfgVia = cfgTable && raw('configTable') === cfgTable.id ? 'pane' : cfgTable ? 'name' : 'none';
    const cfgOk = cfg?.status === 'ok' || cfg?.status === 'duplicate';
    const sources: StatusSource[] = [];
    const tableRow = (label: string, key: string, slot: 'Source_Table_1' | 'Source_Table_2' | 'Source_Table_3', id: string): Table | null => {
        const pane = asTable(cp[key]);
        let t: Table | null = null;
        let via = '—';
        if (pane) {
            t = pane;
            via = raw(key) === pane.id ? 'חלונית' : 'מזהה DEMO (ברירת מחדל)';
        } else if (cfg && cfg.raw(slot)) {
            t = cfg.table(slot);
            via = `Extension_Config ${slot}`;
        }
        if (!t) {
            t = base.getTableByIdIfExists(id);
            if (t) via = 'מזהה DEMO (ברירת מחדל)';
        }
        sources.push({label, table: t?.name ?? `${label} ✗`, via: t ? via : 'לא נמצאה / לא מופעלת', ok: !!t});
        return t;
    };
    const pt = tableRow('אנשים (People)', 'peopleTable', 'Source_Table_1', IDS.people);
    const rt = tableRow('תפקידים (Roles)', 'rolesTable', 'Source_Table_2', IDS.roles);
    const at = tableRow('שיבוצים (Assignments)', 'assignmentsTable', 'Source_Table_3', IDS.assignments);
    const fieldRow = (t: Table | null, label: string, id: string, name: string, required = true, viaOverride?: string) => {
        if (!t) return;
        let via = required ? 'לא מופעל ✗' : 'לא מופעל';
        let f: Field | null = null;
        try {
            f = id ? t.getFieldIfExists(id) : null;
            if (f) via = viaOverride ?? 'לפי מזהה';
            else if (name) {
                f = t.getFieldIfExists(name);
                if (f) via = 'לפי שם';
            }
        } catch {
            f = null;
        }
        sources.push({label, table: t.name, field: f?.name ?? (name || id || null), via, ok: !!f || !required, note: f ? null : required ? 'יש להפעיל את השדה לאלמנט' : 'רשות'});
    };
    fieldRow(pt, 'שם', IDS.p.name, 'Full Name');
    fieldRow(pt, 'טלפון אישי', IDS.p.phone, 'Phone_Personal');
    fieldRow(pt, 'אימייל אישי', IDS.p.email, 'Email_Personal');
    fieldRow(rt, 'תפקיד', IDS.r.name, 'Role');
    fieldRow(rt, 'טלפון תפקיד', IDS.r.phone, 'Role Specific Phone');
    fieldRow(rt, 'אימייל תפקיד', IDS.r.email, 'Role Specific Email');
    fieldRow(rt, 'שותף (תפקיד)', IDS.r.partner, 'Partner', false);
    fieldRow(rt, 'כפוף ל', IDS.r.reportsTo, 'Reports To', false);
    fieldRow(at, 'שיבוץ ← אנשים', IDS.a.people, 'People');
    fieldRow(at, 'שיבוץ ← תפקידים', IDS.a.roles, 'Roles');
    fieldRow(at, 'התחלה', IDS.a.start, 'Start');
    fieldRow(at, 'סיום', IDS.a.end, 'End');
    // per-person partner: right pane → Extension_Config Source_Field_1 → DEMO id
    const panePartner = fieldIdOf(cp.assignmentPartnerField);
    const cfgPartner = cfg && cfg.raw('Source_Field_1') ? cfg.ref('Source_Field_1') : null;
    const partnerId = panePartner ?? (cfgPartner?.field && cfgPartner.table?.id === at?.id ? cfgPartner.field.id : null) ?? IDS.a.partner;
    fieldRow(at, 'שותף לכל אדם', partnerId, '', false, panePartner ? (raw('assignmentPartnerField') === panePartner ? 'חלונית' : 'מזהה DEMO (ברירת מחדל)') : cfgPartner?.field ? 'Extension_Config Source_Field_1' : 'מזהה DEMO');
    return (
        <div dir="rtl" style={{padding: '0 12px 12px'}}>
            <StatusPanel
                base={base}
                on={on}
                configTable={cfgTable}
                configVia={cfgVia}
                slug={slug}
                variant={variant}
                status={String(cfg?.status ?? 'no-provider')}
                record={cfg?.record ?? null}
                variantRecord={cfg?.variantRecord ?? null}
                fieldsUsed={['Extension', 'Variant', ...Object.keys(DEFAULTS)]}
                sources={sources}
                notes={[...(cfgOk ? [] : ['אין שורת הגדרות פעילה → ברירות מחדל בקוד (המסך לא משתנה)']), 'אין סינונים קבועים בתוסף הזה (חיפוש בלבד)']}
                version={VERSION}
            />
        </div>
    );
}

/** v0.3.2: shared mapping panel (status-panel v2) — the matched row's Mapping_Image (Variant row → default row) + GitHub_URL. Read-only. */
function Mapping(props: {cp: {[key: string]: unknown}; slug: string}) {
    const base = useBase();
    const {cfg} = useCfg();
    if (!isMappingOn(props.cp[MAPPING_TOGGLE_KEY])) return null;
    return (
        <div dir="rtl" style={{padding: '0 12px 12px'}}>
            <MappingPanel on configTable={asTable(props.cp.configTable) ?? findConfigTable(base)} record={cfg?.record ?? null} variantRecord={cfg?.variantRecord ?? null} slug={props.slug} />
        </div>
    );
}

initializeBlock({interface: () => <App />});
