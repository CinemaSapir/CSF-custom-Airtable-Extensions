/**
 * רשימות – סבב 2 (lists-ui-ext) — CSF DEMO Interface Extension (base appiN9MrP73g6R9hi ONLY)
 *
 * Home: my lists (owner = me OR shared with me OR public), compact list default, gallery one click away, cover strip, badges
 *       (⚡ דינמית / ✓), content tags derived from items, "+ רשימה חדשה" (Static or Dynamic, sharing, description). Who-sees = Interface share only.
 * v0.3.0: LEAN dynamic lists (one source table + 1–3 AND conditions, structured fields) – read-only live items.
 * v0.4.0: any table configured in List_Sources (Website Pages, Projects, …) via spare custom-property slots;
 *         Hebrew table picker + table pill. No code change to add a new table.
 * v0.4.1: trackGate (List_Sources-thin vs element not-enabled); home counts tied to live runSpec via listsSpecKey.
 * v0.5.0: static Add item picker supports 18 kinds (data-driven); compact Hebrew chips; List Item link per table.
 * v0.5.7: the owner markup – one kinds source for modal + add panel, delete list, inline description + sharing,
 *         items resolve their real table by linked-table id/name (PROD), «אחר» only with no link at all.
 * v0.6.0: Extension_Config wiring (row `lists-ui`, Variant = «גרסת עמוד» or the mode) — right pane → config row → code default;
 *         no-op while the table is absent (cfg.ts, useExtensionConfig.ts). Privacy deny-lists stay in code.
 * List page: all items bundled in one list (picture, name, source badge, notes, ✓ for checklists), drag to reorder
 *       (persists List Item › Sort Order), add item = choose table then item, remove = unlink (never deletes).
 * Fully Hebrew / RTL on the glass.
 */
import {useMemo, useState} from 'react';
import {initializeBlock, useBase, useCustomProperties, useGlobalConfig, useSearchParams, useSession} from '@airtable/blocks/interface/ui';
import {type Base, type Table} from '@airtable/blocks/interface/models';
import {
    type SourceEnv,
    type Tables,
    DYNAMIC_FIELDS,
    REQUIRED,
    SPARE_DEFAULTS,
    type Fields,
    SPARE_SLOTS,
    asTable,
    kindOfTable,
    resolveFields,
    tableOf,
    useModel,
} from './model';
import {MyListsCompact, RecordMode} from './Compact';
import {Home, NewListModal} from './Home';
import {ListPage} from './ListPage';
import {VersionFooter, useToast} from './ui';
import {CONFIG_DISPLAY_NAME, CONFIG_SLUG, DEFAULTS, DOCS, useCfg} from './cfg';
import {CONFIG_TABLE_NAME, ExtensionConfigProvider, findConfigTable, type TableSlot} from './useExtensionConfig';
import {StatusPanel} from './StatusPanel';
import {STATUS_TOGGLE_KEY, isStatusOn, statusToggleProperty, type StatusFilter, type StatusSource} from './statusCore';
import {VERSION} from './model';
import './style.css';

function getCustomProperties(base: Base) {
    return [
        {key: 'listsTable', label: 'טבלת רשימות', type: 'table' as const, defaultValue: tableOf(base, 'lists') ?? undefined},
        {key: 'itemsTable', label: 'טבלת פריטי רשימה', type: 'table' as const, defaultValue: tableOf(base, 'items') ?? undefined},
        {key: 'filmsTable', label: 'טבלת סרטים', type: 'table' as const, defaultValue: tableOf(base, 'films') ?? undefined},
        {key: 'slotsTable', label: 'טבלת משבצות', type: 'table' as const, defaultValue: tableOf(base, 'slots') ?? undefined},
        {key: 'peopleTable', label: 'טבלת אנשים', type: 'table' as const, defaultValue: tableOf(base, 'people') ?? undefined},
        {key: 'checklistsTable', label: 'טבלת צ׳קליסטים', type: 'table' as const, defaultValue: tableOf(base, 'checklists') ?? undefined},
        {
            key: 'sourcesTable',
            label: 'טבלת הגדרות מקורות (List_Sources)',
            type: 'table' as const,
            defaultValue: tableOf(base, 'sources') ?? undefined,
        },
        // v0.4.0: spare slots for ANY additional source table (Website Pages, Projects, Locations…).
        // Adding a new table = pick it in an empty slot + a List_Sources row – no code change.
        ...Array.from({length: SPARE_SLOTS}, (_, i) => ({
            key: `extraTable${i + 1}`,
            label: `טבלת מקור נוספת ${i + 1}`,
            type: 'table' as const,
            defaultValue:
                i < SPARE_DEFAULTS.length
                    ? (base.getTableByIdIfExists(SPARE_DEFAULTS[i].id) ?? base.getTableByNameIfExists(SPARE_DEFAULTS[i].name) ?? undefined)
                    : undefined,
        })),
        {
            key: 'mode',
            label: 'תצוגה',
            type: 'enum' as const,
            possibleValues: [
                {value: 'full', label: 'עמוד רשימות מלא'},
                {value: 'record', label: 'קומפקטי: באילו רשימות הרשומה (סרט / משבצת / אדם)'},
                {value: 'mine', label: 'קומפקטי: הרשימות שלי (לדף הבית של הצוות)'},
            ],
            defaultValue: 'full',
        },
        {key: 'recordTable', label: 'קומפקטי – טבלת הרשומה (סרטים / משבצות / אנשים)', type: 'table' as const, defaultValue: tableOf(base, 'films') ?? undefined},
        {key: 'recordId', label: 'קומפקטי – מזהה רשומה קבוע (לא חובה, rec…)', type: 'string' as const, defaultValue: ''},
        // v0.6.0: Extension_Config (optional). Absent → code defaults, nothing changes on screen.
        {key: 'configTable', label: 'טבלת הגדרות (Extension_Config) – לא חובה', type: 'table' as const, defaultValue: base.getTableByNameIfExists(CONFIG_TABLE_NAME) ?? undefined},
        {key: 'configSlug', label: 'מפתח הגדרות (Extension)', type: 'string' as const, defaultValue: CONFIG_SLUG},
        {key: 'configVariant', label: 'גרסת עמוד (Variant) – ריק = לפי התצוגה', type: 'string' as const, defaultValue: ''},
        // v0.6.1: shared «מצב חיבור» panel (default OFF; ON = always shown, published view too)
        statusToggleProperty(),
    ];
}

type Mode = 'full' | 'record' | 'mine';
function Lists(props: {T: Tables; S: SourceEnv; mode: Mode; recordTableId: string | null; recordId: string; status?: StatusInfo}) {
    const {T, S, mode, recordTableId, recordId} = props;
    const base = useBase();
    const session = useSession();
    const me = session.currentUser;
    const rawF = resolveFields(T, S.lookup);
    const fKey = Object.entries(rawF)
        .map(([key, f]) => {
            if (key === 'iLinks' && f && typeof f === 'object') {
                return Object.values(f as {[k: string]: {id?: string} | null})
                    .map((x) => x?.id ?? '-')
                    .join('.');
            }
            if (key === 'iOther' && Array.isArray(f)) return (f as Array<{field: {id: string}; tableId: string | null}>).map((o) => `${o.field.id}>${o.tableId ?? ''}`).join('.');
            return (f as {id?: string} | null)?.id ?? '-';
        })
        .join(',');
    // stable identity while the exposed schema is unchanged (keeps the model memo cheap)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const F = useMemo(() => rawF, [fKey, T.lists, T.items, T.films, T.slots, T.people, T.checklists, S.configTable]);
    const model = useModel(T, F, me?.id ?? null, S);
    const {searchParams, setSearchParamsAsync} = useSearchParams();
    // list view is the default (gallery is one click away); compact modes via custom-property `mode` only
    const view = searchParams.view === 'gallery' ? 'gallery' : 'list';
    const listId = searchParams.list ?? null;
    const [newOpen, setNewOpen] = useState(false);
    const {say, view: toastView} = useToast();
    const {t, n} = useCfg();

    const go = (patch: {[k: string]: string | null}) =>
        void setSearchParamsAsync((prev) => {
            const next: {[k: string]: string} = {...prev};
            for (const [k, v] of Object.entries(patch)) {
                if (v === null) delete next[k];
                else next[k] = v;
            }
            return next;
        });

    const gaps = REQUIRED.filter((r) => !F[r.key]);
    const current = listId ? (model.lists.find((l) => l.id === listId && l.relation !== null) ?? null) : null;

    return (
        <div className={`app${mode === 'full' ? '' : ' is-compact'}`} dir="rtl" lang="he">
            {gaps.length ? (
                <p className="msg err">{t('Error_Text_3', {fields: gaps.map((g) => g.he).join(' · ')})}</p>
            ) : null}
            {mode === 'record' ? (
                <RecordMode
                    model={model}
                    T={T}
                    F={F}
                    me={me}
                    kind={kindOfTable(T, recordTableId)}
                    fixedId={recordId.trim()}
                    pickedId={searchParams.rec ?? null}
                    setPicked={(id) => go({rec: id})}
                    say={say}
                />
            ) : mode === 'mine' ? (
                <MyListsCompact model={model} T={T} F={F} me={me} limit={n('Number_1')} say={say} />
            ) : listId ? (
                <ListPage list={current} model={model} T={T} F={F} back={() => go({list: null})} say={say} meId={me?.id ?? null} />
            ) : (
                <Home
                    model={model}
                    me={me}
                    view={view}
                    setView={(v) => go({view: v})}
                    open={(id) => go({list: id})}
                    onNew={() => setNewOpen(true)}
                    canCreate={T.lists.hasPermissionToCreateRecord()}
                    T={T}
                    F={F}
                    say={say}
                />
            )}
            {mode === 'full' ? <VersionFooter /> : null}
            {props.status ? <ListsStatus info={props.status} T={T} F={F} lists={model.lists} /> : null}
            {newOpen && me ? (
                <NewListModal
                    base={base}
                    T={T}
                    F={F}
                    model={model}
                    me={me}
                    onClose={() => setNewOpen(false)}
                    onCreated={(id, name) => {
                        setNewOpen(false);
                        say(`נוצרה ״${name}״ 🎉 עכשיו מוסיפים פריטים`);
                        go({list: id});
                    }}
                />
            ) : null}
            {toastView}
        </div>
    );
}

type CP = {[key: string]: unknown};
const modeOf = (cp: CP): Mode => (cp.mode === 'record' || cp.mode === 'mine' ? cp.mode : 'full');

function App() {
    const base = useBase();
    const {customPropertyValueByKey: cp} = useCustomProperties(getCustomProperties);
    const mode = modeOf(cp);
    const slug = (typeof cp.configSlug === 'string' && cp.configSlug.trim()) || CONFIG_SLUG;
    // Variant: right pane first, else the display mode (full → default row, mine / record → that variant row)
    const variant = (typeof cp.configVariant === 'string' && cp.configVariant.trim()) || (mode === 'full' ? '' : mode);
    return (
        <ExtensionConfigProvider base={base} configTable={asTable(cp.configTable) ?? undefined} slug={slug} variant={variant} version={VERSION} displayName={CONFIG_DISPLAY_NAME} defaults={DEFAULTS} docs={DOCS}>
            <Bound cp={cp} mode={mode} slug={slug} variant={variant} />
        </ExtensionConfigProvider>
    );
}

function Bound(props: {cp: CP; mode: Mode; slug: string; variant: string}) {
    const {cp, mode} = props;
    const base = useBase();
    const {t, cfg} = useCfg();
    const globalConfig = useGlobalConfig();
    const rawPane = (k: string) => {
        try {
            const v = globalConfig.get(k);
            return typeof v === 'string' ? v : null;
        } catch {
            return null;
        }
    };
    // v0.6.1 «מצב חיבור»: where each table came from (pane only when the owner really picked it; the default is by id / name)
    const tvia: StatusSource[] = [];
    const pick = (label: string, key: string, slot: TableSlot, kind: Parameters<typeof tableOf>[1]): Table | null => {
        const pane = asTable(cp[key]);
        const c = pane ? null : fromCfg(slot);
        const t2 = pane ?? c ?? tableOf(base, kind);
        tvia.push({
            label,
            table: t2?.name ?? null,
            via: pane ? (rawPane(key) === pane.id ? 'חלונית' : 'מזהה / שם (ברירת מחדל)') : c ? `Extension_Config ${slot}` : t2 ? 'מזהה / שם (ברירת מחדל)' : 'לא נמצאה / לא מופעלת',
            ok: !!t2 || (kind !== 'lists' && kind !== 'items'),
            note: t2 ? null : kind === 'lists' || kind === 'items' ? 'חובה' : 'רשות',
        });
        return t2;
    };
    // right pane → Extension_Config Source_Table_N (only when that cell is filled) → id / English name (v0.5.18 behaviour)
    const fromCfg = (slot: TableSlot): Table | null => (cfg && cfg.raw(slot) ? cfg.table(slot) : null);
    // same precedence as v0.6.0: right pane → Extension_Config Source_Table_N (only when filled) → id / English name
    const lists = pick('רשימות (Lists)', 'listsTable', 'Source_Table_1', 'lists');
    const items = pick('פריטי רשימה (List Item)', 'itemsTable', 'Source_Table_2', 'items');
    const films = pick('סרטים', 'filmsTable', 'Source_Table_3', 'films');
    const slots = pick('משבצות', 'slotsTable', 'Source_Table_4', 'slots');
    const people = pick('אנשים', 'peopleTable', 'Source_Table_5', 'people');
    const checklists = pick('צ׳קליסטים', 'checklistsTable', 'Source_Table_6', 'checklists');
    const configTable = pick('הגדרות מקורות (List_Sources)', 'sourcesTable', 'Source_Table_7', 'sources');
    const statusOn = isStatusOn(cp[STATUS_TOGGLE_KEY]);
    const cfgTable = asTable(cp.configTable) ?? findConfigTable(base);
    const status: StatusInfo | undefined = statusOn
        ? {
              slug: props.slug,
              variant: props.variant,
              cfgTable,
              cfgVia: cfgTable && rawPane('configTable') === cfgTable.id ? 'pane' : cfgTable ? 'name' : 'none',
              status: String(cfg?.status ?? 'no-provider'),
              record: cfg?.record ?? null,
              variantRecord: cfg?.variantRecord ?? null,
              tables: tvia,
          }
        : undefined;
    if (!lists || !items) {
        return (
            <div className="app" dir="rtl" lang="he">
                <h1>{t('Title')}</h1>
                <p className="msg err">{t('Error_Text_2')}</p>
                {status ? <ListsStatus info={status} T={null} F={null} lists={null} /> : null}
            </div>
        );
    }
    const T: Tables = {lists, items, films, slots, people, checklists};
    // every table the element can reach: custom properties (incl. spare slots) + whatever base.tables exposes
    const bound = new Map<string, Table>();
    for (const t of [T.lists, T.items, T.films, T.slots, T.people, T.checklists, configTable]) if (t) bound.set(t.id, t);
    for (let i = 1; i <= SPARE_SLOTS; i++) {
        const t = asTable(cp[`extraTable${i}`]);
        if (t) bound.set(t.id, t);
    }
    for (const t of base.tables) bound.set(t.id, t);
    const lookup = (ref: string) => {
        const r = ref.trim();
        if (!r) return null;
        return bound.get(r) ?? base.getTableByIdIfExists(r) ?? base.getTableByNameIfExists(r);
    };
    const S: SourceEnv = {configTable, lookup, all: () => [...bound.values()]};
    const recordTable = asTable(cp.recordTable) ?? T.films;
    const recordId = typeof cp.recordId === 'string' ? cp.recordId : '';
    return <Lists T={T} S={S} mode={mode} recordTableId={recordTable?.id ?? null} recordId={recordId} status={status} />;
}

type StatusInfo = {
    slug: string;
    variant: string;
    cfgTable: Table | null;
    cfgVia: 'pane' | 'name' | 'none';
    status: string;
    record: {id: string} | null;
    variantRecord: {id: string} | null;
    tables: StatusSource[];
};
const FIELD_TABLE: {[prefix: string]: keyof Tables} = {l: 'lists', i: 'items', f: 'films', s: 'slots', p: 'people', c: 'checklists'};
/** v0.6.1 «מצב חיבור» (shared status-panel v1): config table, row, visible fields, tables + every field the screen reads. */
function ListsStatus(props: {info: StatusInfo; T: Tables | null; F: Fields | null; lists: ReadonlyArray<{relation: unknown; isDynamic: boolean; archived: boolean}> | null}) {
    const {info, T, F} = props;
    const base = useBase();
    const sources: StatusSource[] = [...info.tables];
    if (T && F) {
        const req = new Map(REQUIRED.map((r) => [r.key as string, r.he]));
        const dyn = new Set(DYNAMIC_FIELDS.map((d) => d.key as string));
        for (const [key, f] of Object.entries(F)) {
            if (key === 'iLinks' || key === 'iOther') continue;
            const t = T[FIELD_TABLE[key[0]] ?? 'lists'];
            if (!t) continue;
            const fld = f as {name?: string} | null;
            const required = req.has(key);
            sources.push({
                label: req.get(key) ?? key,
                table: t.name,
                field: fld?.name ?? null,
                via: fld ? 'לפי מזהה / שם' : required ? 'לא מופעל ✗' : 'לא מופעל',
                ok: !!fld || !required,
                note: fld ? null : required ? 'חובה — יש להפעיל לאלמנט' : dyn.has(key) ? 'רשות (רשימות דינמיות)' : 'רשות',
            });
        }
        for (const [kind, f] of Object.entries(F.iLinks)) if (f) sources.push({label: `קישור פריט ← ${kind}`, table: T.items.name, field: f.name, via: 'לפי שם / טבלה מקושרת', ok: true});
    }
    const filters: StatusFilter[] = [];
    if (props.lists) {
        const all = props.lists;
        const visible = all.filter((l) => l.relation !== null);
        filters.push({label: 'רשימות גלויות למשתמש (שלי / משותפות / ציבוריות)', table: T?.lists.name ?? null, field: F?.lVisibility ? 'Visibility · Owner User · SharedWith' : null, via: 'קוד (הרשאות)', op: 'נראות', values: [], matched: visible.length, total: all.length});
        filters.push({label: 'מתוכן: מוסתרות (Status = Archived)', table: T?.lists.name ?? null, field: F?.lStatus ? 'Status' : null, via: 'קוד', op: 'שווה ל (is)', values: ['Archived'], matched: visible.filter((l) => l.archived).length, total: visible.length});
        filters.push({label: 'מתוכן: דינמיות (Mode = Dynamic, תנאים Cond1–3)', table: T?.lists.name ?? null, field: F?.lMode ? 'Mode' : null, via: 'רשומת הרשימה', op: 'שווה ל (is)', values: ['Dynamic'], matched: visible.filter((l) => l.isDynamic).length, total: visible.length});
    }
    return (
        <StatusPanel
            base={base}
            on
            configTable={info.cfgTable}
            configVia={info.cfgVia}
            slug={info.slug}
            variant={info.variant}
            status={info.status}
            record={info.record}
            variantRecord={info.variantRecord}
            fieldsUsed={['Extension', 'Variant', ...Object.keys(DEFAULTS)]}
            sources={sources}
            filters={filters}
            filtersTitle="סינון רשימות (מה שמוצג במסך הבית)"
            notes={info.status === 'ok' || info.status === 'duplicate' ? [] : ['אין שורת הגדרות פעילה → ברירות מחדל בקוד (המסך לא משתנה)']}
            version={VERSION}
        />
    );
}

initializeBlock({interface: () => <App />});
