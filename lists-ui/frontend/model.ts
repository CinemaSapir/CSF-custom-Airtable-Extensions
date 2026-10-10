/**
 * Data model for lists-ui-ext (DEMO appiN9MrP73g6R9hi). IDs verified 2026-09-29 via the Airtable connector.
 * Every lookup goes by id first, then by exact English field name (production ids differ).
 */
import {useEffect, useMemo, useRef, useState} from 'react';
import {type KeepState, emptyKeep, keepRecords, recordIsDeleted} from './keep';
import {useRecords} from '@airtable/blocks/interface/ui';
import {type Base, type Field, type Record as AirtableRecord, type Table} from '@airtable/blocks/interface/models';
import {type Kind, KINDS, KIND_ORDER, LEGACY_KINDS, SRC, kindByTable, kindByTableId, kindByLinkName, kindByLooseName, kindByTypeChoice, kindTableIn, kindUnavailableTip, isKind, tableHe} from './kinds';
// v0.5.12: the build version comes straight from package.json at build time (bundled), so the footer can't drift
import {version as PKG_VERSION} from '../package.json';
import {type Catalog, type DynResult, type DynSpec, type RawSource, type Source, MAX_FIELDS, buildCatalog, findSource, runSpec, trackPreview} from './dynlogic';
export {kindByTable};

export const IDS = {
    t: {
        lists: 'tbly1shgcTgaczbje',
        items: 'tblKdsYV5kwgx76E7',
        films: 'tbleQDxV820WtLJYf',
        slots: 'tblHbwkDkWEKmX9OT',
        people: 'tblDETcBuaBMTeUmH',
        checklists: 'tbl5nxXu7QB3vLqeW',
        // v0.4.0 config table for dynamic-list sources
        sources: 'tbllSrI6L3lXj0E8y',
    },
    l: {
        name: 'fldyacBe9ofvaMVsR',
        desc: 'fldYPcZibmbAUwZ48',
        owner: 'fldZx4aGH5kDImB9F',
        shared: 'fldcxl9JgDzwAdW2p',
        visibility: 'fldA9w74oRsJ5OX6c',
        contents: 'fld7hO2xMIbwoHIfM',
        listType: 'fldtwojtq3e3UnqPN',
        checklist: 'fldlv4oUzXSAPDbHE',
        status: 'fld6mZZQnhlZGPoyu',
        created: 'fldgW24LF2bq8GNsp',
        // v0.3.0 dynamic lists (Mode + Source table pre-existed empty and are reused; Cond* are new)
        mode: 'fld4MPMiB46amYP6N',
        sourceTable: 'fld7BHRTkygfkvki9',
        c1f: 'fldr32AuQUwtnXROf',
        c1o: 'fld06aKWYs0tPLZ2H',
        c1v: 'fld7jj9YQ9wpXt110',
        c2f: 'fldJqq23SSzVPGpkX',
        c2o: 'fldtfHy7Y9yYqk3vT',
        c2v: 'fld06djIc0nuqgJxh',
        c3f: 'fldse72Il6oJNUtBs',
        c3o: 'fldwJVKuKYTlBkIf8',
        c3v: 'fldjBL9PywjVnylSv',
        // v0.4.0: any configured table / field (text; the legacy selects above stay for old lists)
        sourceId: 'fldi1wRz4mJVzRtqd',
        c1id: 'fldPKrCPLKRHPKYKi',
        c2id: 'fldtvOyTzo644nbIa',
        c3id: 'fldQBx5qcjj514yCO',
    },
    /** List_Sources (v0.4.0) */
    src: {
        table: 'fldd5cLT2FT6JuUfB',
        he: 'fldy4iQj559vxU5f4',
        icon: 'fldjWtxUPW2gvtjOv',
        active: 'fldh1xl5W6X6P1I5H',
        sort: 'fldlbakpzIebYN1VY',
        title: 'fldSiulYaqTu19MWw',
        picture: 'fldoHwixOJeKv1ooK',
        fields: ['fldIDmWrjFWitt6jY', 'flddBqAfaAZt49RLb', 'flduAC8o5zgojpIAi', 'fldHyk3M6M2prEXV0', 'fldX6lH05twPEnebr', 'fld4hQkBtDCT8o968'],
        labels: ['fldYyLTp357yCRlWP', 'fldzrmNX6Subn0t25', 'fldbXe4TvTUsvNwsA', 'fldCuvGQ3VjcbGbvD', 'fldfWEGXVV28E3Pak', 'fldz3U710mXC1TwUW'],
    },
    i: {
        label: 'fldSO66paWwKaEuGZ',
        list: 'fldg8Saxci0zhm4NN',
        type: 'fldW4joz6k2d2ipqx',
        film: 'fldwlzLaMQW1ryscN',
        slot: 'fldmXZi2cXp5LFlLE',
        person: 'fldiBsiB716dSWmzZ',
        notes: 'fldRCylyeJvrhMp5g',
        checked: 'fldDTMOaOt0NSX4P9',
        sortOrder: 'fld9LCQ72sxvDsVFF',
        sort: 'fldkINrUOJxUF67mT',
        itemName: 'fldnpXhwpBf48hT3x',
        detail1: 'fldyiy5YGkbhVVHz8',
        filmPoster: 'fldCo0QvVgnfRENzA',
        slotPicture: 'fldDlv56gk43xqzTT',
        personPhoto: 'fldYSll3lIHSOIat0',
    },
    f: {name: 'fldnNNYgdTgXc1c7o', poster: 'fld0SoeYu0brBNEdT', director: 'fld3up6fHelJ030Ow', year: 'fldMGUj964ZtiYjVv'},
    s: {name: 'fldTfMQmhZuGYDcyU', pic: 'fld4dQ6y3WBYeEWWq', start: 'fldtmiazhhykZjx2J'},
    p: {name: 'fldVySoRplNHsjeBW', pic: 'fldXti4SNzyVMvUb2'},
    c: {name: 'fldfGjhE3RftULi8F', status: 'fld1GfJd2HlRI6CVQ'},
} as const;

export const TABLE_NAMES = {
    lists: 'Lists',
    items: 'List Item',
    films: 'Films',
    slots: 'Slots_Events',
    people: 'People',
    checklists: 'Checklists',
    sources: 'List_Sources',
} as const;
/** defaults for spare source-table slots (v0.5.0): auto-bind the static-add kinds so the owner enables fewer by hand */
export const SPARE_DEFAULTS: Array<{id: string; name: string}> = [
    {id: 'tblmUO8bQN6ryXv3H', name: 'Website Pages'},
    {id: 'tblPDmSZMBOUynGI2', name: 'Projects'},
    {id: 'tblp6Ty9VUthECylw', name: 'Petty Cash'},
    {id: 'tblMYGESPjEcUOmkU', name: 'Locations'},
    {id: 'tblBvMpH47USsN760', name: 'Roles'},
    {id: 'tblWyA778vlIsatNk', name: 'Assignments'},
    {id: 'tblFa6LqGjICAHqde', name: 'Staffing'},
    {id: 'tblX7qXkvyhDG3Nhe', name: 'Partners'},
    {id: 'tbl7FPJj84kX1jFur', name: 'Files and Links'},
    {id: 'tblsWAFOpNy2d2jQE', name: 'Resources'},
    {id: 'tblJY67dvAejS6OdA', name: 'Booking Resources'},
    {id: 'tblzTSaGnyR2ViPil', name: 'Social Posts'},
    {id: 'tbl3XlcDcNhvtVZgG', name: 'Campaigns'},
    {id: 'tblUiguCPJjXGSxmV', name: 'Target Audiences'},
    {id: 'tbl4EwftfEcFc64Jr', name: 'Graphic Design'},
    {id: 'tblbP1O0e4zgyJt3m', name: 'Media'},
];
export const SPARE_SLOTS = 16;
/** hard ceiling of extra (non film / slot / person) source tables whose records are loaded at once */
export const MAX_EXTRA_TABLES = 24; // v0.5.17: 21 non-legacy kinds + List_Sources extras
export type TableKey = keyof typeof TABLE_NAMES;

export function tableOf(base: Base, key: TableKey): Table | null {
    return base.getTableByIdIfExists(IDS.t[key]) ?? base.getTableByNameIfExists(TABLE_NAMES[key]);
}
export function fieldOf(t: Table | null, id: string, name: string): Field | null {
    if (!t) return null;
    return t.getFieldByIdIfExists(id) ?? t.getFieldByNameIfExists(name);
}
export function asTable(v: unknown): Table | null {
    return v && typeof v === 'object' && 'getFieldByIdIfExists' in (v as object) ? (v as Table) : null;
}

// ---------- source kinds (./kinds) ----------
export {type Kind, KINDS, LEGACY_KINDS, SRC, kindByTableId, isKind, tableHe};

/** v0.5.12: build version shown in the quiet footer («v0.5.12») */
export const VERSION: string = PKG_VERSION;

// ---------- cell helpers ----------
export const str = (r: AirtableRecord, f: Field | null) => (f ? r.getCellValueAsString(f) : '');
export type Link = {id: string; name?: string};
export const links = (r: AirtableRecord, f: Field | null): Link[] => (f ? ((r.getCellValue(f) as Link[] | null) ?? []) : []);
export type Collab = {id: string; name?: string; email?: string; profilePicUrl?: string};
export const selectName = (r: AirtableRecord, f: Field | null): string => {
    if (!f) return '';
    const v = r.getCellValue(f) as {name?: string} | null;
    return v?.name ?? '';
};
export const multiSelectNames = (r: AirtableRecord, f: Field | null): string[] => {
    if (!f) return [];
    const v = r.getCellValue(f) as Array<{name: string}> | null;
    return (v ?? []).map((x) => x.name);
};

type Thumb = {url: string};
type Attachment = {id: string; url: string; type?: string; thumbnails?: {small?: Thumb; large?: Thumb; full?: Thumb}};
function firstAttachment(v: unknown): Attachment | null {
    if (!v) return null;
    if (Array.isArray(v)) {
        for (const x of v) {
            const a = firstAttachment(x);
            if (a) return a;
        }
        return null;
    }
    if (typeof v === 'object') {
        const o = v as {[k: string]: unknown};
        if (typeof o.url === 'string' && typeof o.id === 'string') return o as unknown as Attachment;
        if ('value' in o) return firstAttachment(o.value); // lookup cell: {linkedRecordId, value}
    }
    return null;
}
/** first picture in an attachment or attachment-lookup cell, as a client-renderable url */
export function pictureOf(r: AirtableRecord | undefined, f: Field | null, size: 'small' | 'large' = 'large'): string | null {
    if (!r || !f) return null;
    const a = firstAttachment(r.getCellValue(f));
    if (!a) return null;
    if (a.type && !a.type.startsWith('image/')) return null;
    const url = a.thumbnails?.[size]?.url ?? a.thumbnails?.large?.url ?? a.url;
    try {
        return r.getAttachmentClientUrlFromCellValueUrl(a.id, url);
    } catch {
        return url;
    }
}

// ---------- resolved schema ----------
export type Tables = {
    lists: Table;
    items: Table;
    films: Table | null;
    slots: Table | null;
    people: Table | null;
    checklists: Table | null;
};
/** linked table id of a multipleRecordLinks field (null for any other field) */
export function linkedTableIdOf(f: Field | null | undefined): string | null {
    if (!f) return null;
    const type = String((f as unknown as {type?: string}).type ?? '');
    if (type !== 'multipleRecordLinks') return null;
    const o = (f as unknown as {options?: {linkedTableId?: string} | null}).options;
    return o?.linkedTableId ?? null;
}
const fieldsOf = (t: Table | null): Field[] => {
    if (!t) return [];
    try {
        return ((t as unknown as {fields?: Field[]}).fields ?? []).slice();
    } catch {
        return [];
    }
};
export type TableLookup = (ref: string) => Table | null;
/**
 * v0.5.7: the List Item link field for a kind. Order: DEMO id → English name / aliases → ANY link field whose
 * linked table is the kind's table (by id, then by table name). PROD ids differ and fields may be renamed, so the
 * linked-table match is what makes PROD rows resolve instead of falling to «אחר».
 */
function kindLinkField(I: Table, k: Kind, all: Field[], lookup?: TableLookup): Field | null {
    const def = SRC[k];
    const direct = fieldOf(I, def.linkFieldId, def.linkFieldName);
    if (direct && linkedTableIdOf(direct) !== null) return direct;
    if (direct && !all.length) return direct; // test stubs / old SDK without field types
    for (const a of def.linkAliases ?? []) {
        const f = I.getFieldByNameIfExists(a);
        if (f && (linkedTableIdOf(f) !== null || !all.length)) return f;
    }
    for (const f of all) {
        const tid = linkedTableIdOf(f);
        if (!tid) continue;
        if (tid === def.tableId) return f;
        const t = lookup?.(tid) ?? null;
        if (t && kindByTable(t) === k) return f;
    }
    // v0.5.17: a link field whose own NAME loosely spells the kind (PROD names, linked table not visible to the element)
    for (const f of all) if (linkedTableIdOf(f) && kindByLinkName(f.name) === k) return f;
    return direct;
}
export type OtherLink = {field: Field; tableId: string | null; table: Table | null; kind: Kind | null};
export function resolveFields(T: Tables, lookup?: TableLookup) {
    const L = T.lists;
    const I = T.items;
    const allI = fieldsOf(I);
    const iListF = fieldOf(I, IDS.i.list, 'Festival List');
    const iLinks = Object.fromEntries(KINDS.map((k) => [k, kindLinkField(I, k, allI, lookup)])) as {[k in Kind]: Field | null};
    const used = new Set<string>([iListF?.id ?? '', ...Object.values(iLinks).map((f) => f?.id ?? '')]);
    /** every OTHER link field on List Item (Task, Notebook, Requests…, or PROD-only names) → real table name, never «אחר» */
    const iOther: OtherLink[] = allI
        .filter((f) => !used.has(f.id) && linkedTableIdOf(f) && linkedTableIdOf(f) !== L.id)
        .map((f) => {
            const tableId = linkedTableIdOf(f);
            const table = tableId ? (lookup?.(tableId) ?? null) : null;
            return {field: f, tableId, table, kind: kindByTable(table) ?? kindByLinkName(f.name)};
        });
    return {
        lName: fieldOf(L, IDS.l.name, 'Name'),
        lDesc: fieldOf(L, IDS.l.desc, 'Description'),
        lOwner: fieldOf(L, IDS.l.owner, 'Owner User'),
        lShared: fieldOf(L, IDS.l.shared, 'SharedWith'),
        lVisibility: fieldOf(L, IDS.l.visibility, 'Visibility'),
        lContents: fieldOf(L, IDS.l.contents, 'Contents'),
        lType: fieldOf(L, IDS.l.listType, 'List Type'),
        lChecklist: fieldOf(L, IDS.l.checklist, 'Linked Checklist'),
        lStatus: fieldOf(L, IDS.l.status, 'Status'),
        lMode: fieldOf(L, IDS.l.mode, 'Mode'),
        lSource: fieldOf(L, IDS.l.sourceTable, 'Source table'),
        lC1f: fieldOf(L, IDS.l.c1f, 'Cond1 Field'),
        lC1o: fieldOf(L, IDS.l.c1o, 'Cond1 Operator'),
        lC1v: fieldOf(L, IDS.l.c1v, 'Cond1 Value'),
        lC2f: fieldOf(L, IDS.l.c2f, 'Cond2 Field'),
        lC2o: fieldOf(L, IDS.l.c2o, 'Cond2 Operator'),
        lC2v: fieldOf(L, IDS.l.c2v, 'Cond2 Value'),
        lC3f: fieldOf(L, IDS.l.c3f, 'Cond3 Field'),
        lC3o: fieldOf(L, IDS.l.c3o, 'Cond3 Operator'),
        lC3v: fieldOf(L, IDS.l.c3v, 'Cond3 Value'),
        lSourceId: fieldOf(L, IDS.l.sourceId, 'Source table ID'),
        lC1id: fieldOf(L, IDS.l.c1id, 'Cond1 Field ID'),
        lC2id: fieldOf(L, IDS.l.c2id, 'Cond2 Field ID'),
        lC3id: fieldOf(L, IDS.l.c3id, 'Cond3 Field ID'),
        iLabel: fieldOf(I, IDS.i.label, 'Label'),
        iList: iListF,
        iType: fieldOf(I, IDS.i.type, 'Type'),
        iFilm: fieldOf(I, IDS.i.film, 'Film'),
        iSlot: fieldOf(I, IDS.i.slot, 'Slot'),
        iPerson: fieldOf(I, IDS.i.person, 'Person'),
        /** v0.5.0: every static-add kind → List Item link field (id first, then English name) */
        iLinks,
        iOther,
        iNotes: fieldOf(I, IDS.i.notes, 'Notes'),
        iChecked: fieldOf(I, IDS.i.checked, 'Checked'),
        iSortOrder: fieldOf(I, IDS.i.sortOrder, 'Sort Order'),
        iSort: fieldOf(I, IDS.i.sort, 'Sort'),
        iItemName: fieldOf(I, IDS.i.itemName, 'ItemName'),
        iDetail1: fieldOf(I, IDS.i.detail1, 'Detail1'),
        iFilmPoster: fieldOf(I, IDS.i.filmPoster, 'FilmPoster'),
        iSlotPicture: fieldOf(I, IDS.i.slotPicture, 'SlotPicture'),
        iPersonPhoto: fieldOf(I, IDS.i.personPhoto, 'PersonPhoto'),
        fName: fieldOf(T.films, IDS.f.name, 'Film_name_HEB'),
        fPoster: fieldOf(T.films, IDS.f.poster, 'Poster'),
        fDirector: fieldOf(T.films, IDS.f.director, 'Director_HEB'),
        fYear: fieldOf(T.films, IDS.f.year, 'Year'),
        sName: fieldOf(T.slots, IDS.s.name, 'Slot'),
        sPic: fieldOf(T.slots, IDS.s.pic, 'Pics for website'),
        sStart: fieldOf(T.slots, IDS.s.start, 'Start'),
        pName: fieldOf(T.people, IDS.p.name, 'Full Name'),
        pPic: fieldOf(T.people, IDS.p.pic, 'Pic'),
        cName: fieldOf(T.checklists, IDS.c.name, 'Name'),
        cStatus: fieldOf(T.checklists, IDS.c.status, 'Status'),
    };
}
export type Fields = ReturnType<typeof resolveFields>;

/**
 * OPTIONAL: without these every list is Static, exactly as in v0.2.0 – never a setup-breaking banner.
 * v0.4.0: writing needs the text "… ID" fields (any configured table / field). The legacy selects
 * (Source table, CondN Field) are only needed to READ lists created by v0.3.0, and are written when a matching choice exists.
 */
export const DYNAMIC_FIELDS: Array<{key: keyof Fields; en: string}> = [
    {key: 'lMode', en: 'Mode'},
    {key: 'lSourceId', en: 'Source table ID'},
    {key: 'lC1id', en: 'Cond1 Field ID'},
    {key: 'lC1o', en: 'Cond1 Operator'},
    {key: 'lC1v', en: 'Cond1 Value'},
    {key: 'lC2id', en: 'Cond2 Field ID'},
    {key: 'lC2o', en: 'Cond2 Operator'},
    {key: 'lC2v', en: 'Cond2 Value'},
    {key: 'lC3id', en: 'Cond3 Field ID'},
    {key: 'lC3o', en: 'Cond3 Operator'},
    {key: 'lC3v', en: 'Cond3 Value'},
];
export const LEGACY_DYNAMIC_FIELDS: Array<{key: keyof Fields; en: string}> = [
    {key: 'lSource', en: 'Source table'},
    {key: 'lC1f', en: 'Cond1 Field'},
    {key: 'lC2f', en: 'Cond2 Field'},
    {key: 'lC3f', en: 'Cond3 Field'},
];
export const condSlots = (F: Fields) => [
    {id: F.lC1id, f: F.lC1f, o: F.lC1o, v: F.lC1v},
    {id: F.lC2id, f: F.lC2f, o: F.lC2o, v: F.lC2v},
    {id: F.lC3id, f: F.lC3f, o: F.lC3o, v: F.lC3v},
];
export const dynamicReady = (F: Fields) => DYNAMIC_FIELDS.every((d) => Boolean(F[d.key]));

/** Hebrew labels for the setup-gap message (English name kept for the tooltip) */
export const REQUIRED: Array<{key: keyof Fields; he: string; en: string}> = [
    {key: 'lName', he: 'שם הרשימה', en: 'Lists › Name'},
    {key: 'lOwner', he: 'בעלים', en: 'Lists › Owner User'},
    {key: 'lVisibility', he: 'נראות', en: 'Lists › Visibility'},
    {key: 'lShared', he: 'משותפת עם', en: 'Lists › SharedWith'},
    {key: 'lType', he: 'סוג הרשימה', en: 'Lists › List Type'},
    {key: 'iList', he: 'שיוך פריט לרשימה', en: 'List Item › Festival List'},
    {key: 'iNotes', he: 'הערות', en: 'List Item › Notes'},
    {key: 'iChecked', he: 'סימון ✓', en: 'List Item › Checked'},
    {key: 'iSortOrder', he: 'סדר פריטים', en: 'List Item › Sort Order'},
];
/** link fields are soft: AddItem hides kinds whose table+link are not both available */
export function linkField(F: Fields, kind: Kind): Field | null {
    return F.iLinks?.[kind] ?? (kind === 'film' ? F.iFilm : kind === 'slot' ? F.iSlot : kind === 'person' ? F.iPerson : null);
}
const fieldType = (f: Field | null) => String((f as unknown as {type?: string} | null)?.type ?? '');
const choicesOf = (f: Field | null): string[] => {
    const o = (f as unknown as {options?: {choices?: Array<{name: string}>} | null; config?: {options?: {choices?: Array<{name: string}>} | null}} | null) ?? null;
    return (o?.options?.choices ?? o?.config?.options?.choices ?? []).map((c) => c.name);
};
/**
 * v0.5.11: the List Item › Type cell for a new item of `kind` = the source table's name, so the row keeps its table name
 * even when the link field is hidden from the element. Select: the exact choice («Location»), else an existing choice with
 * a loose spelling of it («Locations», «לוקיישנים»). Text: the English name. null = no Type field / no fitting choice
 * (an extension cannot add select choices).
 */
export function typeCellFor(F: Pick<Fields, 'iType'>, kind: Kind): {name: string} | string | null {
    const f = F.iType;
    if (!f) return null;
    const t = fieldType(f);
    if (t === 'singleLineText' || t === 'multilineText') return SRC[kind].typeChoice;
    if (t && t !== 'singleSelect') return null;
    const choices = choicesOf(f);
    const exact = choices.find((c) => c === SRC[kind].typeChoice);
    if (exact) return {name: exact};
    const loose = choices.find((c) => kindByTypeChoice(c) === kind);
    return loose ? {name: loose} : null;
}
/** v0.5.11: tooltip for a row whose table can't be found – names the List Item fields to turn on in the interface editor */
export function unknownTip(fields: string[] = []): string {
    if (!fields.length) return 'לא ידוע מאיזו טבלה הפריט. מלאו בפריט את השדה «Type» (או קשרו אותו לרשומה בטבלה שלו).';
    const shown = fields.slice(0, 4).map((f) => `«${f}»`).join(' / ');
    return `לא ידוע מאיזו טבלה הפריט. כדי שיופיע שם הטבלה, הפעילו בעורך הממשק (האלמנט › Fields › List Item) את ${shown}${fields.length > 4 ? ' …' : ''}.`;
}
/** v0.5.11: which List Item fields to turn on so «?» rows get their table name (Type first, then hidden link fields –
 * kinds whose TABLE the element can see come first, then the usual kinds) */
export function missingTableFields(F: Fields, visibleKinds: Set<Kind>): string[] {
    // the links most often left hidden first (Location, Project, Task, Website Page), the core film/slot/person links last
    const usual: Kind[] = ['location', 'project', 'task', 'websitePage', 'film', 'slot', 'person'];
    const order = [...usual, ...KINDS.filter((k) => !usual.includes(k))];
    const hidden = order.filter((k) => !linkField(F, k));
    const first = hidden.filter((k) => visibleKinds.has(k));
    const rest = hidden.filter((k) => !visibleKinds.has(k) && usual.includes(k));
    return [...(F.iType ? [] : ['Type']), ...[...first, ...rest].map((k) => SRC[k].linkFieldName)];
}

// ---------- view models ----------
export type Item = {
    rec: AirtableRecord;
    id: string;
    kind: Kind | null;
    source: AirtableRecord | undefined;
    sourceId: string | null;
    name: string;
    sub: string;
    notes: string;
    checked: boolean;
    order: number;
    pic: string | null;
    listIds: string[];
    /** v0.4.0: icon + Hebrew name of the source table for live items of any configured table */
    src?: {icon: string; he: string} | null;
    /** v0.4.0: 1–3 tracking field values for dynamic rows */
    track?: Array<{he: string; value: string}>;
    /** v0.5.11: no table could be found (no readable link, no Type, no list table, no unique name match) → amber «?», never «אחר» */
    unknown?: boolean;
    /** v0.5.11: how the table was found – 'link' | 'type' | 'list' | 'name' (tests / debugging) */
    via?: 'link' | 'type' | 'list' | 'name';
};
export type Relation = 'mine' | 'shared' | 'public';
export type ListVM = {
    rec: AirtableRecord;
    id: string;
    name: string;
    desc: string;
    isChecklist: boolean;
    isPublic: boolean;
    owner: Collab | null;
    shared: Collab[];
    /** content tags DERIVED from the items (the Contents field is left in place, unused) */
    contents: Kind[];
    items: Item[];
    relation: Relation | null;
    canEdit: boolean;
    checklists: Link[];
    created: number;
    /** Status = Archived → hidden from home (nothing is deleted; "הצגת רשימות מוסתרות" shows them) */
    archived: boolean;
    /** v0.5.13: the raw Status choice name ('' when empty) – «ביטול» after hiding puts exactly this back */
    status: string;
    /** v0.3.0: Mode = Dynamic → items are computed live from the Source table (read-only) */
    isDynamic: boolean;
    spec: DynSpec | null;
    dyn: DynResult | null;
    /** v0.4.0: the configured source table of a dynamic list (icon + Hebrew name for the table pill) */
    source: Source | null;
    /** v0.5.7: the List Item records linked to this list (static items; for dynamic lists only leftovers) – what «מחק רשימה» removes */
    ownItems: Item[];
    /** v0.5.7: the list's table / type for the header image (icon + Hebrew table name) */
    table: {kind: Kind | null; icon: string; he: string} | null;
};

const slotTime = new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
});

const NONE: AirtableRecord[] = [];

/** structured dynamic spec from a Lists record (null when Mode isn't Dynamic or the Mode field isn't exposed).
 *  v0.4.0 text "… ID" cells win; the v0.3.0 selects are the fallback for older lists. */
export function readSpec(r: AirtableRecord, F: Fields): DynSpec | null {
    if (!F.lMode || selectName(r, F.lMode) !== 'Dynamic') return null;
    return {
        sourceRef: str(r, F.lSourceId).trim() || selectName(r, F.lSource),
        conds: condSlots(F).map((c) => ({key: str(r, c.id).trim() || selectName(r, c.f), op: selectName(r, c.o), value: str(r, c.v)})),
    };
}
/**
 * Fingerprint of every list's Mode / Source / Cond cells (v0.4.1).
 * Included in useModel's lists rebuild deps so Cond edits invalidate home card counts
 * even when useRecords keeps the same array identity. Home + list page both use list.items.length
 * from the same runSpec path — never a stale Contents count.
 */
export function listsSpecKey(listRecs: AirtableRecord[], F: Fields): string {
    return listRecs
        .map((r) => {
            const spec = readSpec(r, F);
            if (!spec) return r.id + ':S';
            const conds = spec.conds.map((c) => c.key + '|' + c.op + '|' + c.value).join(';');
            return r.id + ':D:' + spec.sourceRef + '>' + conds;
        })
        .join('\n');
}

// ---------- List_Sources config (v0.4.0) ----------
export function resolveConfigFields(t: Table | null) {
    const S = IDS.src;
    return {
        table: fieldOf(t, S.table, 'Table'),
        he: fieldOf(t, S.he, 'Hebrew label'),
        icon: fieldOf(t, S.icon, 'Icon'),
        active: fieldOf(t, S.active, 'Active'),
        sort: fieldOf(t, S.sort, 'Sort'),
        title: fieldOf(t, S.title, 'Title field'),
        picture: fieldOf(t, S.picture, 'Picture field'),
        fields: S.fields.map((id, i) => fieldOf(t, id, `Field ${i + 1}`)),
        labels: S.labels.map((id, i) => fieldOf(t, id, `Field ${i + 1} label`)),
    };
}
export type ConfigFields = ReturnType<typeof resolveConfigFields>;
/** null when the config table (or its Table column) isn't exposed to the element → fallback map */
export function readConfigRows(recs: AirtableRecord[], CF: ConfigFields): RawSource[] | null {
    if (!CF.table) return null;
    return recs.map((r) => ({
        rowId: r.id,
        table: str(r, CF.table),
        he: str(r, CF.he),
        icon: str(r, CF.icon),
        // Active not exposed → rows count as active (the picker still needs the table itself)
        active: CF.active ? Boolean(r.getCellValue(CF.active)) : true,
        sort: CF.sort ? ((r.getCellValue(CF.sort) as number | null) ?? null) : null,
        title: str(r, CF.title),
        picture: str(r, CF.picture),
        fields: Array.from({length: MAX_FIELDS}, (_, i) => ({ref: str(r, CF.fields[i]), he: str(r, CF.labels[i])})),
    }));
}
/** how the element reaches tables: base lookup (whatever the element can see) + every table bound in a custom property */
export type SourceEnv = {configTable: Table | null; lookup: (ref: string) => Table | null; /** v0.5.17: every table the element can see (loose name match) */ all?: () => Table[]};

/** "🎬 סרטים · 3" tags, in a stable order, derived from what is really in the list */
export function contentTags(items: Array<{kind: Kind | null}>): Array<{kind: Kind; n: number}> {
    return KINDS.map((kind) => ({kind, n: items.filter((i) => i.kind === kind).length})).filter((t) => t.n > 0);
}

const kindOfT = (t: Table): Kind | null => kindByTable(t);

/** v0.5.7: icon + Hebrew table name for a kind – the List_Sources label wins when that table is configured */
export function kindLabel(kind: Kind, catalog?: Catalog | null, table?: Table | null): {icon: string; he: string} {
    const s = catalog?.sources.find((x) => x.table && ((table && x.table.id === table.id) || x.kind === kind));
    return {icon: s?.icon && s.icon !== '📄' ? s.icon : SRC[kind].emoji, he: s?.he || SRC[kind].plural};
}

/**
 * v0.5.16: `useRecords(Lists)` that keeps the old rows rendered while the host re-syncs the query after a write
 * (see keep.ts – the root cause of the hide / «ביטול» scroll jump). Real deletes still leave at once.
 * Diagnostics (console-free): `window.__listsUiDiag` logs every time the live array got shorter and how many rows were kept.
 */
export function useKeptRecords(live: AirtableRecord[]): AirtableRecord[] {
    const st = useRef<KeepState<AirtableRecord>>(emptyKeep<AirtableRecord>());
    const [, bump] = useState(0);
    const before = st.current.lastIn;
    const r = keepRecords(live, st.current, Date.now(), recordIsDeleted);
    st.current = r.st;
    if (before && live.length < before.length && typeof window !== 'undefined') {
        const w = window as unknown as {__listsUiDiag?: Array<{t: string; live: number; was: number; kept: number}>};
        (w.__listsUiDiag ??= []).push({t: new Date().toISOString(), live: live.length, was: before.length, kept: r.out.length - live.length});
    }
    const next = r.nextExpiry;
    useEffect(() => {
        if (next === null) return;
        const t = setTimeout(() => bump((n) => n + 1), Math.max(0, next - Date.now()) + 20);
        return () => clearTimeout(t);
    }, [next]);
    return r.out as AirtableRecord[];
}

export function useModel(T: Tables, F: Fields, meId: string | null, S?: SourceEnv | null) {
    const env: SourceEnv = S ?? {
        configTable: null,
        lookup: (ref) => {
            const r = ref.trim();
            const byId = [T.films, T.slots, T.people, T.checklists].find((t) => t && (t.id === r || t.name === r));
            return byId ?? null;
        },
    };
    const Sx = env;
    // v0.5.16: old rows stay rendered while the host re-syncs Lists after a hide / show / «ביטול» write
    const listRecs = useKeptRecords(useRecords(T.lists));
    const itemRecs = useRecords(T.items);
    // hooks cannot be conditional: an unbound optional table falls back to Lists and is ignored
    const filmRecs = useRecords(T.films ?? T.lists);
    const slotRecs = useRecords(T.slots ?? T.lists);
    const peopleRecs = useRecords(T.people ?? T.lists);
    const checklistRecs = useRecords(T.checklists ?? T.lists);

    const films = T.films ? filmRecs : NONE;
    const slots = T.slots ? slotRecs : NONE;
    const people = T.people ? peopleRecs : NONE;
    const checklists = T.checklists ? checklistRecs : NONE;

    // v0.4.0: dynamic-list sources from List_Sources (fallback = in-code map when that table is missing / empty)
    const cfgRecsRaw = useRecords(Sx.configTable ?? T.lists);
    const cfgRecs = Sx.configTable ? cfgRecsRaw : NONE;
    const cfgTableId = Sx.configTable?.id ?? null;
    const catalog: Catalog = useMemo(
        () => buildCatalog(cfgTableId ? readConfigRows(cfgRecs, resolveConfigFields(Sx.configTable)) : null, Sx.lookup, kindOfT),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [cfgRecs, cfgTableId, Sx.lookup, T.films, T.slots, T.people, T.checklists],
    );
    /**
     * v0.5.7: kind → the REAL table in this base. The List Item link field's linked table wins (that is what PROD rows
     * actually point at), then the DEMO id, then the table name / aliases.
     */
    const {extraTables, kindTables} = useMemo(() => {
        const kt = new Map<Kind, Table>();
        for (const k of KINDS) {
            const legacy = k === 'film' ? T.films : k === 'slot' ? T.slots : k === 'person' ? T.people : null;
            const viaLink = linkedTableIdOf(linkField(F, k));
            const t =
                legacy ??
                (viaLink ? Sx.lookup(viaLink) : null) ??
                Sx.lookup(SRC[k].tableId) ??
                Sx.lookup(SRC[k].tableName) ??
                (SRC[k].tableAliases ?? []).map((a) => Sx.lookup(a)).find(Boolean) ??
                kindTableIn(k, Sx.all?.() ?? []) ??
                null;
            if (t) kt.set(k, t);
        }
        const out: Table[] = [];
        const push = (tbl: Table | null | undefined) => {
            if (tbl && !out.some((t) => t.id === tbl.id) && tbl.id !== T.films?.id && tbl.id !== T.slots?.id && tbl.id !== T.people?.id) out.push(tbl);
        };
        // v0.5.0: load every non-legacy static-add kind whose table is bound to the element
        for (const k of KINDS) {
            if ((LEGACY_KINDS as string[]).includes(k)) continue;
            push(kt.get(k));
        }
        for (const s of catalog.sources) if (s.active && s.table && !s.kind) push(s.table);
        return {extraTables: out.slice(0, MAX_EXTRA_TABLES), kindTables: kt};
    }, [catalog, Sx, F, T.films, T.slots, T.people]);
    // hooks can't be called in a loop: MAX_EXTRA_TABLES fixed slots, unused ones fall back to Lists and are ignored
    const x0 = useRecords(extraTables[0] ?? T.lists);
    const x1 = useRecords(extraTables[1] ?? T.lists);
    const x2 = useRecords(extraTables[2] ?? T.lists);
    const x3 = useRecords(extraTables[3] ?? T.lists);
    const x4 = useRecords(extraTables[4] ?? T.lists);
    const x5 = useRecords(extraTables[5] ?? T.lists);
    const x6 = useRecords(extraTables[6] ?? T.lists);
    const x7 = useRecords(extraTables[7] ?? T.lists);
    const x8 = useRecords(extraTables[8] ?? T.lists);
    const x9 = useRecords(extraTables[9] ?? T.lists);
    const x10 = useRecords(extraTables[10] ?? T.lists);
    const x11 = useRecords(extraTables[11] ?? T.lists);
    const x12 = useRecords(extraTables[12] ?? T.lists);
    const x13 = useRecords(extraTables[13] ?? T.lists);
    const x14 = useRecords(extraTables[14] ?? T.lists);
    const x15 = useRecords(extraTables[15] ?? T.lists);
    const x16 = useRecords(extraTables[16] ?? T.lists);
    const x17 = useRecords(extraTables[17] ?? T.lists);
    const x18 = useRecords(extraTables[18] ?? T.lists);
    const x19 = useRecords(extraTables[19] ?? T.lists);
    const x20 = useRecords(extraTables[20] ?? T.lists);
    const x21 = useRecords(extraTables[21] ?? T.lists);
    const x22 = useRecords(extraTables[22] ?? T.lists);
    const x23 = useRecords(extraTables[23] ?? T.lists);
    const extraRecs = useMemo(() => {
        const m = new Map<string, AirtableRecord[]>();
        [x0, x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15, x16, x17, x18, x19, x20, x21, x22, x23].forEach((recs, i) => {
            const tbl = extraTables[i];
            if (tbl) m.set(tbl.id, recs);
        });
        return m;
    }, [extraTables, x0, x1, x2, x3, x4, x5, x6, x7, x8, x9, x10, x11, x12, x13, x14, x15, x16, x17, x18, x19, x20, x21, x22, x23]);

    // Read Mode/Source/Cond every render so Cond cell edits change this string even if listRecs identity is stable.
    const specKey = listsSpecKey(listRecs, F);

    return useMemo(() => {
        const byId = (arr: AirtableRecord[]) => new Map(arr.map((r) => [r.id, r]));
        const filmMap = byId(films);
        const slotMap = byId(slots);
        const personMap = byId(people);
        const recsOfKind = (kind: Kind): AirtableRecord[] => {
            if (kind === 'film') return films;
            if (kind === 'slot') return slots;
            if (kind === 'person') return people;
            const t = kindTables.get(kind);
            return (t && extraRecs.get(t.id)) || [];
        };
        const mapCache = new Map<Kind, Map<string, AirtableRecord>>();
        const recMapFor = (kind: Kind): Map<string, AirtableRecord> => {
            if (kind === 'film') return filmMap;
            if (kind === 'slot') return slotMap;
            if (kind === 'person') return personMap;
            let m = mapCache.get(kind);
            if (!m) {
                m = byId(recsOfKind(kind));
                mapCache.set(kind, m);
            }
            return m;
        };
        const labelOf = (k: Kind) => kindLabel(k, catalog, kindTables.get(k) ?? null);
        const nameCache = new Map<Kind, Map<string, AirtableRecord[]>>();
        const nameIndexFor = (kind: Kind): Map<string, AirtableRecord[]> => {
            let m = nameCache.get(kind);
            if (!m) {
                m = new Map();
                for (const rec of recsOfKind(kind)) {
                    const n = normLabel(sourceView(kind, rec, F).name || rec.name);
                    if (!n) continue;
                    const arr = m.get(n) ?? [];
                    arr.push(rec);
                    m.set(n, arr);
                }
                nameCache.set(kind, m);
            }
            return m;
        };
        /** v0.5.11: label → records in every visible table (kind tables + configured non-kind sources); one table only, else null */
        let allNames: Map<string, Array<{kind: Kind | null; label: {icon: string; he: string}; tableId: string; rec: AirtableRecord}>> | null = null;
        const nameMatchAll = (label: string): {kind: Kind | null; label: {icon: string; he: string}; recs: AirtableRecord[]} | null => {
            if (!label) return null;
            if (!allNames) {
                const m = new Map<string, Array<{kind: Kind | null; label: {icon: string; he: string}; tableId: string; rec: AirtableRecord}>>();
                const add = (n: string, e: {kind: Kind | null; label: {icon: string; he: string}; tableId: string; rec: AirtableRecord}) => {
                    if (!n) return;
                    const arr = m.get(n) ?? [];
                    arr.push(e);
                    m.set(n, arr);
                };
                const seen = new Set<string>();
                for (const k of KINDS) {
                    const recs = recsOfKind(k);
                    if (!recs.length) continue;
                    const tableId = k === 'film' ? (T.films?.id ?? 'films') : k === 'slot' ? (T.slots?.id ?? 'slots') : k === 'person' ? (T.people?.id ?? 'people') : (kindTables.get(k)?.id ?? k);
                    seen.add(tableId);
                    const lab = labelOf(k);
                    for (const rec of recs) add(normLabel(sourceView(k, rec, F).name || rec.name), {kind: k, label: lab, tableId, rec});
                }
                for (const s of catalog.sources) {
                    if (!s.table || s.kind || seen.has(s.table.id)) continue;
                    seen.add(s.table.id);
                    for (const rec of extraRecs.get(s.table.id) ?? []) add(normLabel(liveView(s, rec, F).name), {kind: null, label: {icon: s.icon, he: s.he}, tableId: s.table.id, rec});
                }
                allNames = m;
            }
            const hits = allNames.get(label) ?? [];
            if (!hits.length || new Set(hits.map((h) => h.tableId)).size !== 1) return null;
            return {kind: hits[0].kind, label: hits[0].label, recs: hits.map((h) => h.rec)};
        };
        /** generic label for a linked table that has no kind: List_Sources label → Hebrew table map → table / field name */
        const genericLabel = (o: OtherLink): {icon: string; he: string} => {
            const s = o.table ? catalog.sources.find((x) => x.table?.id === o.table!.id) : null;
            if (s) return {icon: s.icon, he: s.he};
            const h = tableHe(o.table?.name ?? o.field.name);
            return h ?? {icon: '📄', he: o.table?.name ?? o.field.name};
        };
        /** the list's own table (static: Lists › Source table ID; dynamic: its source) */
        const listTableOf = (r: AirtableRecord): {kind: Kind | null; icon: string; he: string} | null => {
            const ref = str(r, F.lSourceId).trim() || selectName(r, F.lSource);
            if (!ref) return null;
            const t = Sx.lookup(ref);
            const k = kindByTable(t) ?? kindByLinkName(ref) ?? kindByLooseName(t?.name ?? ref);
            if (k) return {kind: k, ...labelOf(k)};
            const s = findSource(catalog, ref);
            if (s) return {kind: s.kind, icon: s.icon, he: s.he};
            const h = tableHe(t?.name ?? ref);
            return h ? {kind: null, ...h} : t ? {kind: null, icon: '📄', he: t.name} : null;
        };

        const toItem = (r: AirtableRecord, listTable: {kind: Kind | null; icon: string; he: string} | null): Item => {
            let kind: Kind | null = null;
            let linked: {id: string; name?: string} | undefined;
            let src: {icon: string; he: string} | null = null;
            // 1) the kind link fields (DEMO id → name → linked-table match)
            for (const k of KINDS) {
                const L = links(r, linkField(F, k))[0];
                if (L) {
                    kind = k;
                    linked = L;
                    break;
                }
            }
            // 2) any other link field on List Item → its real table (kind when the table name matches)
            if (!linked) {
                for (const o of F.iOther ?? []) {
                    const L = links(r, o.field)[0];
                    if (!L) continue;
                    linked = L;
                    kind = o.kind;
                    if (!kind) src = genericLabel(o);
                    break;
                }
            }
            let via: Item['via'] = linked ? 'link' : undefined;
            // 3) no readable link: List Item › Type (loose spellings), then the list's own table
            if (!kind && !src) {
                const byType = kindByTypeChoice(str(r, F.iType));
                if (byType) {
                    kind = byType;
                    via = 'type';
                } else if (listTable) {
                    if (listTable.kind) kind = listTable.kind;
                    else src = {icon: listTable.icon, he: listTable.he};
                    via = 'list';
                }
            }
            // 4) v0.5.11: still nothing → the item's name, matched against EVERY table the page can see; used only when it
            //    points at exactly one table (and opens the record when it is exactly one record)
            let nameHit: AirtableRecord | undefined;
            if (!kind && !src) {
                const hits = nameMatchAll(normLabel(str(r, F.iLabel) || str(r, F.iItemName) || r.name));
                if (hits) {
                    kind = hits.kind;
                    if (!kind) src = hits.label;
                    if (hits.recs.length === 1) nameHit = hits.recs[0];
                    via = 'name';
                }
            }
            if (kind) src = labelOf(kind);
            let sourceId = linked?.id ?? nameHit?.id ?? null;
            let source = kind && sourceId ? recMapFor(kind).get(sourceId) : nameHit;
            // v0.5.8: kind known but its link isn't readable (field not enabled on the element) → the ONE source record
            // whose display name equals the item's label. Ambiguous names are never guessed.
            if (kind && !source && !sourceId) {
                const label = normLabel(str(r, F.iLabel) || str(r, F.iItemName) || r.name);
                const hits = label ? (nameIndexFor(kind).get(label) ?? []) : [];
                if (hits.length === 1) {
                    source = hits[0];
                    sourceId = hits[0].id;
                }
            }
            let pic: string | null = null;
            let sub = '';
            if (kind === 'film') {
                pic = pictureOf(source, F.fPoster) ?? pictureOf(r, F.iFilmPoster);
                if (source) sub = joinParts([str(source, F.fDirector), str(source, F.fYear)]);
            } else if (kind === 'slot') {
                pic = pictureOf(source, F.sPic) ?? pictureOf(r, F.iSlotPicture);
                const start = source && F.sStart ? (source.getCellValue(F.sStart) as string | null) : null;
                sub = start ? slotTime.format(new Date(start)) : str(r, F.iDetail1);
            } else if (kind === 'person') {
                pic = pictureOf(source, F.pPic) ?? pictureOf(r, F.iPersonPhoto);
                sub = str(r, F.iDetail1);
            } else if (kind && source) {
                const v = sourceView(kind, source, F);
                pic = v.pic;
                sub = v.sub;
            }
            const name = cleanPart(linked?.name) || (kind && source ? sourceView(kind, source, F).name : '') || cleanPart(str(r, F.iItemName)) || cleanPart(str(r, F.iLabel)) || cleanPart(r.name) || 'פריט ללא שם';
            const so = F.iSortOrder ? (r.getCellValue(F.iSortOrder) as number | null) : null;
            const s = F.iSort ? (r.getCellValue(F.iSort) as number | null) : null;
            return {
                rec: r,
                id: r.id,
                kind,
                source,
                sourceId,
                name,
                sub,
                notes: str(r, F.iNotes),
                checked: F.iChecked ? Boolean(r.getCellValue(F.iChecked)) : false,
                order: so ?? 1_000_000 + (s ?? 0) * 10 + r.createdTime.getTime() / 1e13,
                pic,
                listIds: links(r, F.iList).map((l) => l.id),
                src,
                via,
                unknown: !kind && !src,
            };
        };

        const listTables = new Map<string, {kind: Kind | null; icon: string; he: string} | null>(listRecs.map((r) => [r.id, listTableOf(r)]));
        const itemsByList = new Map<string, Item[]>();
        for (const r of itemRecs) {
            const lids = links(r, F.iList).map((l) => l.id);
            // the list's table only matters as a last resort, and only when the item sits in exactly one list
            const it = toItem(r, lids.length === 1 ? (listTables.get(lids[0]) ?? null) : null);
            for (const lid of it.listIds) {
                const arr = itemsByList.get(lid) ?? [];
                arr.push(it);
                itemsByList.set(lid, arr);
            }
        }
        for (const arr of itemsByList.values()) arr.sort((a, b) => a.order - b.order);

        const sourceRecords = Object.fromEntries(KINDS.map((k) => [k, recsOfKind(k)])) as {[k in Kind]: AirtableRecord[]};
        /** records of any catalog source (null = not loaded: over MAX_EXTRA_TABLES) */
        const recordsOf = (s: Source | null): AirtableRecord[] | null => {
            if (!s?.table) return null;
            if (s.kind) return sourceRecords[s.kind];
            return extraRecs.get(s.table.id) ?? null;
        };
        /** a live (read-only) item for a record matched by a dynamic list */
        const liveItem = (s: Source, r: AirtableRecord, idx: number): Item => {
            const v = liveView(s, r, F);
            const track = trackPreview(s, r, 3);
            const sub = v.sub || joinParts(track.map((t) => (cleanPart(t.value) ? `${t.he}: ${t.value}` : '')));
            return {rec: r, id: r.id, kind: s.kind, source: r, sourceId: r.id, name: v.name, sub, notes: '', checked: false, order: idx, pic: v.pic, listIds: [], src: {icon: s.icon, he: s.he}, track};
        };
        const startOf = (r: AirtableRecord) => (F.sStart ? ((r.getCellValue(F.sStart) as string | null) ?? '9999') : '9999');

        const lists: ListVM[] = listRecs.map((r) => {
            const owner = F.lOwner ? ((r.getCellValue(F.lOwner) as Collab | null) ?? null) : null;
            const shared = F.lShared ? ((r.getCellValue(F.lShared) as Collab[] | null) ?? []) : [];
            const isPublic = selectName(r, F.lVisibility) === 'Public';
            const relation: Relation | null =
                meId && owner?.id === meId ? 'mine' : meId && shared.some((c) => c.id === meId) ? 'shared' : isPublic ? 'public' : null;
            const spec = readSpec(r, F);
            let items: Item[];
            let dyn: DynResult | null = null;
            let source: Source | null = null;
            const ownItems = itemsByList.get(r.id) ?? [];
            if (spec) {
                source = findSource(catalog, spec.sourceRef);
                dyn = runSpec(spec, source, recordsOf(source));
                const s = source;
                const recs = [...dyn.records];
                if (s?.kind === 'slot') recs.sort((a, b) => startOf(a).localeCompare(startOf(b)));
                items = s ? recs.map((x, i) => liveItem(s, x, i)) : [];
                if (s && s.kind !== 'slot') items.sort((a, b) => a.name.localeCompare(b.name, 'he'));
            } else {
                items = ownItems;
            }
            const contents = spec ? (source?.kind ? [source.kind] : []) : contentTags(items).map((t) => t.kind);
            // header image: dynamic source → the list's stored table → the one kind its items share
            const table = spec
                ? source
                    ? {kind: source.kind, icon: source.icon, he: source.he}
                    : null
                : (listTables.get(r.id) ?? (contents.length === 1 ? {kind: contents[0], ...labelOf(contents[0])} : null));
            return {
                rec: r,
                id: r.id,
                name: str(r, F.lName) || 'רשימה ללא שם',
                desc: str(r, F.lDesc),
                isChecklist: !spec && selectName(r, F.lType) === 'Checklist',
                isPublic,
                owner,
                shared,
                contents,
                items,
                ownItems,
                table,
                relation,
                canEdit: relation === 'mine' || relation === 'shared',
                checklists: links(r, F.lChecklist),
                created: r.createdTime.getTime(),
                archived: selectName(r, F.lStatus) === 'Archived',
                status: selectName(r, F.lStatus),
                isDynamic: Boolean(spec),
                spec,
                dyn,
                source,
            };
        });

        const boundKinds = new Set<Kind>();
        if (T.films) boundKinds.add('film');
        if (T.slots) boundKinds.add('slot');
        if (T.people) boundKinds.add('person');
        for (const k of KINDS) {
            const t = kindTables.get(k);
            if (t && extraRecs.has(t.id)) boundKinds.add(k);
        }
        /** v0.5.11: the List Item fields to turn on so «?» rows get their table name (shown in the badge tooltip + list notice) */
        const unknownFields = missingTableFields(F, boundKinds);
        return {lists, sourceRecords, checklists, catalog, recordsOf, boundKinds, kindTables, labelOf, unknownFields};
        // specKey is intentional: Cond/Mode/Source cell edits must rebuild even if listRecs identity is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- specKey fingerprints list cell values beyond array identity
    }, [listRecs, itemRecs, films, slots, people, checklists, F, meId, catalog, extraRecs, extraTables, kindTables, specKey, T.films, T.slots, T.people]);
}
export type Model = ReturnType<typeof useModel>;
/**
 * v0.5.8: ONE list of kinds for the new-list picker AND the «+ הוספת פריט» panel.
 * A kind is listed when its TABLE is available to the element (kinds.ts + base). `canAdd` = the List Item link field is
 * also available, i.e. items of that kind can be added. Dynamic capability never filters this list (the dynamic card says why).
 * v0.5.7 required the link field here, so a table whose List Item link isn't enabled on the element (DEMO: Location,
 * Project, Website Page) vanished from the picker while the add panel still drew it as a disabled chip.
 */
export type KindChoice = {k: Kind; canAdd: boolean; /** v0.5.17: the table exists here (else the choice is listed but disabled) */ hasTable: boolean; why: 'table' | 'link' | null; tip: string | null};
/**
 * v0.5.17 (the owner): EVERY kind is listed – kinds whose table is in this base first (KIND_ORDER, then KINDS order),
 * then the ones whose table isn't (DEMO: Itinerary / Trips / Suppliers), disabled with a tooltip naming the table.
 * Tables are found by name at runtime, so the same build lights them up on PROD.
 */
export function kindChoices(F: Fields, model: {boundKinds: Set<Kind>}): KindChoice[] {
    const order = [...KIND_ORDER, ...KINDS.filter((k) => !KIND_ORDER.includes(k))];
    const mk = (k: Kind): KindChoice => {
        const hasTable = model.boundKinds.has(k);
        const why = !hasTable ? 'table' : linkField(F, k) ? null : 'link';
        return {k, canAdd: why === null, hasTable, why, tip: kindUnavailableTip(k, why)};
    };
    const all = order.map(mk);
    return [...all.filter((c) => c.hasTable), ...all.filter((c) => !c.hasTable)];
}
/** what the new-list «מה יהיה ברשימה?» dropdown lists */
export const newListKinds = (F: Fields, model: {boundKinds: Set<Kind>}): Kind[] => kindChoices(F, model).map((c) => c.k);
/** what the «+ הוספת פריט» panel draws as chips (disabled when !canAdd) */
export const addPanelKinds = (F: Fields, model: {boundKinds: Set<Kind>}): Kind[] => kindChoices(F, model).map((c) => c.k);
/** kinds that can really be added (chip enabled) */
export function addableKinds(F: Fields, model: {boundKinds: Set<Kind>}): Kind[] {
    return kindChoices(F, model).filter((c) => c.canAdd).map((c) => c.k);
}
/** v0.5.10: one display part, trimmed, with separators left dangling at either end dropped («אלמה  ·  » → «אלמה») */
export const cleanPart = (x: string | null | undefined) => (x ?? '').replace(/^[\s·•,|]+|[\s·•,|]+$/g, '').trim();
/** v0.5.10: join only the non-empty parts – never a stray « ·» when the secondary text is empty */
export const joinParts = (parts: Array<string | null | undefined>, sep = ' · ') => parts.map(cleanPart).filter(Boolean).join(sep);
/** v0.5.10: add-panel result line – cleaned, de-duplicated parts (display name, primary name) */
export const uniqueLine = (parts: Array<string | null | undefined>, sep = ', ') => joinParts(parts.map(cleanPart).filter((p, i, all) => p && all.indexOf(p) === i), sep);
/** v0.5.18 (Critic minor a): the fallback name the add panel shows for a record with no usable name */
export const NO_NAME_HE = 'רשומה ללא שם';
/** v0.5.18: a display name that says nothing – empty / whitespace, only dashes · dots · separators («-», «--», «…», «- .»), or our own fallbacks */
export function isBlankName(x: string | null | undefined): boolean {
    const s = (x ?? '').replace(/\s+/g, ' ').trim();
    if (!s) return true;
    if (/^[\s\-\u2010-\u2015\u2212.\u2026·•_,|]+$/.test(s)) return true;
    return s === NO_NAME_HE || s === 'פריט ללא שם';
}
/**
 * v0.5.18: add-panel result order. One predictable rule:
 *  1. named records that match the search come first (input order kept);
 *  2. nameless records (isBlankName) are hidden – unless the search matches their own text («-», «ללא שם»),
 *     or a picked type has NO named match at all (then that type's nameless records show, so it is never a dead end);
 *  3. whatever nameless records do show always come last.
 * `hiddenBlank` = nameless records that matched the type/search but were held back (for the «הוסתרו N…» hint).
 */
export function rankPicks<T extends {k: string; line: string; hay: string}>(rows: T[], query: string, limit = 60): {rows: T[]; hiddenBlank: number} {
    const n = query.trim().toLowerCase();
    const hit = (o: T) => !n || o.hay.toLowerCase().includes(n);
    const named = rows.filter((o) => !isBlankName(o.line) && hit(o));
    const kindsWithNamed = new Set(named.map((o) => o.k));
    const ownText = (o: T) => Boolean(n) && `${o.line} ${NO_NAME_HE}`.toLowerCase().includes(n);
    const blank = rows.filter((o) => isBlankName(o.line));
    const blankShown = blank.filter((o) => ownText(o) || (hit(o) && !kindsWithNamed.has(o.k)));
    const hiddenBlank = blank.filter((o) => hit(o) && !blankShown.includes(o)).length;
    return {rows: [...named, ...blankShown].slice(0, limit), hiddenBlank};
}
/** normalised display name (source-record matching by name) */
export const normLabel = (x: string | null | undefined) => cleanPart(x).replace(/\s+/g, ' ').toLowerCase();

/** display name + picture for a source record in the add-item picker */
export function sourceView(kind: Kind, r: AirtableRecord, F: Fields, size: 'small' | 'large' = 'small'): {name: string; sub: string; pic: string | null} {
    if (kind === 'film') {
        return {name: cleanPart(str(r, F.fName)) || cleanPart(r.name), sub: joinParts([str(r, F.fDirector), str(r, F.fYear)]), pic: pictureOf(r, F.fPoster, size)};
    }
    if (kind === 'slot') {
        const start = F.sStart ? (r.getCellValue(F.sStart) as string | null) : null;
        return {name: str(r, F.sName) || r.name, sub: start ? slotTime.format(new Date(start)) : '', pic: pictureOf(r, F.sPic, size)};
    }
    if (kind === 'person') {
        return {name: str(r, F.pName) || r.name, sub: '', pic: pictureOf(r, F.pPic, size)};
    }
    // v0.5.0 generic: primary field string + optional attachment pic from KindDef
    const def = SRC[kind];
    const parent = (r as unknown as {parentTable?: Table}).parentTable;
    const primary = parent ? fieldOf(parent, def.primaryFieldId, def.primaryFieldName) : null;
    const picF =
        def.picFieldId || def.picFieldName
            ? parent
                ? fieldOf(parent, def.picFieldId ?? '', def.picFieldName ?? '')
                : null
            : null;
    return {name: cleanPart(primary ? str(r, primary) : '') || cleanPart(r.name) || NO_NAME_HE, sub: '', pic: pictureOf(r, picF, size)};
}

/** display for a live item of ANY configured source: built-in kinds keep their v0.3.0 look; others use Title / Picture field */
export function liveView(s: Source, r: AirtableRecord, F: Fields): {name: string; sub: string; pic: string | null} {
    if (s.kind) return sourceView(s.kind, r, F, 'large');
    const name = cleanPart(s.titleField ? r.getCellValueAsString(s.titleField) : '') || cleanPart(r.name) || 'רשומה ללא שם';
    return {name, sub: '', pic: pictureOf(r, s.picField, 'large')};
}

export const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
export function hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

// ---------- reorder (pure, unit-tested in scripts/logic-test.mjs) ----------
/** new id order after dropping `dragId` before/after `overId` */
export function dropOrder(ids: string[], dragId: string, overId: string, after: boolean): string[] {
    if (dragId === overId || !ids.includes(dragId) || !ids.includes(overId)) return ids;
    const out = ids.filter((id) => id !== dragId);
    let at = out.indexOf(overId);
    if (after) at += 1;
    out.splice(at, 0, dragId);
    return out;
}
/** move one step (keyboard ↑/↓) */
export function stepOrder(ids: string[], from: number, to: number): string[] {
    if (from === to || to < 0 || to >= ids.length) return ids;
    const out = [...ids];
    const [x] = out.splice(from, 1);
    out.splice(to, 0, x);
    return out;
}
/** Sort Order writes for a new id order: 10, 20, 30… only where the stored value differs */
export function orderUpdates(ids: string[], current: (id: string) => number | null): Array<{id: string; value: number}> {
    return ids.map((id, i) => ({id, value: (i + 1) * 10})).filter((u) => current(u.id) !== u.value);
}

// ---------- home filters (pure, unit-tested) ----------
export type HomeFilter = 'all' | Relation;
/** visible = the "my lists" rule, minus archived unless asked. "public" = every public list, mine included. */
export function homeLists(lists: ListVM[], filter: HomeFilter, showArchived: boolean): ListVM[] {
    return lists.filter((l) => l.relation !== null && (showArchived || !l.archived) && (filter === 'all' || (filter === 'public' ? l.isPublic : l.relation === filter)));
}
export function homeCounts(lists: ListVM[], showArchived: boolean): {[k in HomeFilter]: number} & {archived: number} {
    const vis = lists.filter((l) => l.relation !== null);
    const live = vis.filter((l) => showArchived || !l.archived);
    return {
        all: live.length,
        mine: live.filter((l) => l.relation === 'mine').length,
        shared: live.filter((l) => l.relation === 'shared').length,
        public: live.filter((l) => l.isPublic).length,
        archived: vis.filter((l) => l.archived).length,
    };
}

// ---------- v0.5.13 home: «רשימות מוסתרות (N)» section + one loose search box (pure, unit-tested) ----------
/** hidden lists (Status = Archived, the field behind «הסתרה מדף הבית») that pass the same filter chip as the main section */
export function hiddenLists(lists: ListVM[], filter: HomeFilter): ListVM[] {
    return lists.filter((l) => l.relation !== null && l.archived && (filter === 'all' || (filter === 'public' ? l.isPublic : l.relation === filter)));
}
/** loose text: lower case, NBSP/tabs/repeated spaces → one space, trimmed */
export const normSearch = (s: string | null | undefined): string => (s ?? '').replace(/[\s\u00a0\u200f\u200e]+/g, ' ').trim().toLowerCase();
/** substring anywhere in the list name (v0.5.3 behaviour kept: also the description and the item names); '' matches all */
export function listMatches(l: Pick<ListVM, 'name' | 'desc' | 'items'>, query: string): boolean {
    const q = normSearch(query);
    if (!q) return true;
    return [l.name, l.desc, ...l.items.map((i) => i.name)].some((t) => normSearch(t).includes(q));
}
/**
 * v0.5.14: Home order = created time (newest first), then record id. Created time never changes on hide/show, and the id
 * breaks ties – v0.5.13 had two DEMO lists created in the same second, so the tie fell back to "shown before hidden"
 * and «הצג רשימה» jumped a row to the top. Now the order is total and independent of Status.
 */
export const homeOrder = (a: Pick<ListVM, 'created' | 'id'>, b: Pick<ListVM, 'created' | 'id'>): number => b.created - a.created || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * v0.5.13 Home. Search empty → two sections: the filter chip's lists (hidden excluded) + «רשימות מוסתרות (N)».
 * Searching → ONE merged result list (hidden matches included, ghosted in the UI), newest first, so a row
 * un-ghosts in place when «הצג רשימה» unhides it.
 */
export function homeSearch(lists: ListVM[], filter: HomeFilter, query: string): {searching: boolean; shown: ListVM[]; hidden: ListVM[]; results: ListVM[]} {
    const byNew = homeOrder;
    const shown = homeLists(lists, filter, false).sort(byNew);
    const hidden = hiddenLists(lists, filter).sort(byNew);
    if (!normSearch(query)) return {searching: false, shown, hidden, results: []};
    const results = [...shown, ...hidden].filter((l) => listMatches(l, query)).sort(byNew);
    return {searching: true, shown, hidden, results};
}
/** «נמצאו N רשימות» – one quiet count while searching */
export const resultCountHe = (n: number): string => (n === 0 ? 'לא נמצאו רשימות' : n === 1 ? 'נמצאה רשימה אחת' : `נמצאו ${n} רשימות`);

// ---------- record mode: which lists hold this Film / Slot / Person ----------
export function kindOfTable(T: Tables, tableId: string | null | undefined): Kind | null {
    if (!tableId) return null;
    return kindByTableId(tableId) ?? (T.films?.id === tableId ? 'film' : T.slots?.id === tableId ? 'slot' : T.people?.id === tableId ? 'person' : null);
}
/** visible lists (my-lists rule, archived included so nothing silently disappears) that contain the record, with its items there */
export function listsContaining(lists: ListVM[], kind: Kind, recordId: string): Array<{list: ListVM; items: Item[]}> {
    return lists
        .filter((l) => l.relation !== null)
        .map((l) => ({list: l, items: l.items.filter((i) => i.kind === kind && i.sourceId === recordId)}))
        .filter((x) => x.items.length > 0);
}
