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
import {initializeBlock, useBase, useCustomProperties, useSearchParams, useSession} from '@airtable/blocks/interface/ui';
import {type Base, type Table} from '@airtable/blocks/interface/models';
import {
    type SourceEnv,
    type Tables,
    REQUIRED,
    SPARE_DEFAULTS,
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
import {CONFIG_TABLE_NAME, ExtensionConfigProvider, type TableSlot} from './useExtensionConfig';
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
    ];
}

type Mode = 'full' | 'record' | 'mine';
function Lists(props: {T: Tables; S: SourceEnv; mode: Mode; recordTableId: string | null; recordId: string}) {
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
            <Bound cp={cp} mode={mode} />
        </ExtensionConfigProvider>
    );
}

function Bound(props: {cp: CP; mode: Mode}) {
    const {cp, mode} = props;
    const base = useBase();
    const {t, cfg} = useCfg();
    // right pane → Extension_Config Source_Table_N (only when that cell is filled) → id / English name (v0.5.18 behaviour)
    const fromCfg = (slot: TableSlot): Table | null => (cfg && cfg.raw(slot) ? cfg.table(slot) : null);
    const lists = asTable(cp.listsTable) ?? fromCfg('Source_Table_1') ?? tableOf(base, 'lists');
    const items = asTable(cp.itemsTable) ?? fromCfg('Source_Table_2') ?? tableOf(base, 'items');
    if (!lists || !items) {
        return (
            <div className="app" dir="rtl" lang="he">
                <h1>{t('Title')}</h1>
                <p className="msg err">{t('Error_Text_2')}</p>
            </div>
        );
    }
    const T: Tables = {
        lists,
        items,
        films: asTable(cp.filmsTable) ?? fromCfg('Source_Table_3') ?? tableOf(base, 'films'),
        slots: asTable(cp.slotsTable) ?? fromCfg('Source_Table_4') ?? tableOf(base, 'slots'),
        people: asTable(cp.peopleTable) ?? fromCfg('Source_Table_5') ?? tableOf(base, 'people'),
        checklists: asTable(cp.checklistsTable) ?? fromCfg('Source_Table_6') ?? tableOf(base, 'checklists'),
    };
    const configTable = asTable(cp.sourcesTable) ?? fromCfg('Source_Table_7') ?? tableOf(base, 'sources');
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
    return <Lists T={T} S={S} mode={mode} recordTableId={recordTable?.id ?? null} recordId={recordId} />;
}

initializeBlock({interface: () => <App />});
