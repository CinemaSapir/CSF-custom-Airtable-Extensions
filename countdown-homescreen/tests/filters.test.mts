import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
    FILTER_OPS,
    PILLS,
    applyFilters,
    cellNames,
    configFiltersByTable,
    describeFilter,
    evaluateFilter,
    keepIds,
    parseOp,
    pickFilters,
    propKeys,
    propLabels,
    splitValues,
} from '../frontend/filters.ts';
import {computeCounts, type CountSlot, type CountsInput} from '../frontend/counts.ts';

const F = (op: Parameters<typeof evaluateFilter>[1]['op'], ...values: string[]) => ({op, values});

test('operators parse (English, spaces/underscores, empty → is, unknown → null)', () => {
    assert.equal(parseOp('is not'), 'is_not');
    assert.equal(parseOp('IS_NOT_EMPTY'), 'is_not_empty');
    assert.equal(parseOp('is checked'), 'is_checked');
    assert.equal(parseOp(''), 'is');
    assert.equal(parseOp(undefined, 'none'), 'none');
    assert.equal(parseOp('is before'), null);
    assert.deepEqual(FILTER_OPS.map(o => o.value), ['none', 'is', 'is_not', 'contains', 'is_empty', 'is_not_empty', 'is_checked', 'is_not_checked']);
});

test('multi-values split on |', () => {
    assert.deepEqual(splitValues(' משובץ | מתוכנן ||  '), ['משובץ', 'מתוכנן']);
    assert.deepEqual(splitValues(undefined), []);
});

test('is / is not / contains on text, numbers, case + spaces', () => {
    assert.equal(evaluateFilter('Gala', F('is', 'gala')), true);
    assert.equal(evaluateFilter('  Gala  Night ', F('is', 'gala night')), true);
    assert.equal(evaluateFilter('Gala', F('is', 'Opening', 'Gala')), true); // any of
    assert.equal(evaluateFilter('Gala', F('is_not', 'Opening', 'Gala')), false); // none of
    assert.equal(evaluateFilter('Short', F('is_not', 'Opening', 'Gala')), true);
    assert.equal(evaluateFilter(12, F('is', '12')), true);
    assert.equal(evaluateFilter('תחרות ישראלית', F('contains', 'ישראל')), true);
    assert.equal(evaluateFilter('תחרות בינלאומית', F('contains', 'ישראל', 'קצר')), false);
    assert.equal(evaluateFilter(null, F('is_not', 'x')), true); // empty is "not x"
    assert.equal(evaluateFilter(null, F('is', 'x')), false);
});

test('single select / multiple select / linked records / collaborators / lookups compare by NAME', () => {
    const sel = {id: 'sel1', name: 'משובץ', color: 'greenLight2'};
    assert.equal(evaluateFilter(sel, F('is', 'משובץ')), true);
    assert.equal(evaluateFilter(sel, F('is', 'sel1')), false); // not by id
    const multi = [{id: 'a', name: 'Drama'}, {id: 'b', name: 'Comedy'}];
    assert.equal(evaluateFilter(multi, F('is', 'comedy')), true);
    assert.equal(evaluateFilter(multi, F('is_not', 'Comedy')), false);
    const links = [{id: 'rec1', name: 'אולם 1'}, {id: 'rec2', name: 'סינמטק'}];
    assert.equal(evaluateFilter(links, F('is', 'סינמטק', 'אולם 9')), true);
    assert.equal(evaluateFilter(links, F('contains', 'אולם')), true);
    assert.equal(evaluateFilter([{id: 'usr1', email: 'd@x.il', name: 'Owner'}], F('is', 'owner')), true);
    assert.equal(evaluateFilter([{linkedRecordId: 'r', value: 'VIP'}], F('is', 'VIP')), true);
    assert.deepEqual(cellNames([{id: 'r', name: ''}], 'fallback'), ['fallback']);
});

test('is empty / is not empty', () => {
    for (const v of [null, undefined, '', '   ', []]) assert.equal(evaluateFilter(v, F('is_empty')), true, String(v));
    assert.equal(evaluateFilter([{id: 'r', name: 'x'}], F('is_empty')), false);
    assert.equal(evaluateFilter(0, F('is_not_empty')), true); // 0 is a value
    assert.equal(evaluateFilter(null, F('is_not_empty')), false);
});

test('is checked / is not checked (checkbox, lookup of checkbox, text)', () => {
    assert.equal(evaluateFilter(true, F('is_checked')), true);
    assert.equal(evaluateFilter(null, F('is_checked')), false);
    assert.equal(evaluateFilter(null, F('is_not_checked')), true);
    assert.equal(evaluateFilter([false, true], F('is_checked')), true);
    assert.equal(evaluateFilter('כן', F('is_checked')), true);
    assert.equal(evaluateFilter('no', F('is_checked')), false);
});

test('a value-less is/contains never hides everything', () => {
    assert.equal(evaluateFilter('x', F('is')), true);
    assert.equal(evaluateFilter('x', F('contains')), true);
    assert.equal(evaluateFilter('x', F('none')), true);
});

test('precedence: right pane first', () => {
    const conf = [{n: 1, field: 'Type', op: 'is', value: 'הקרנה'}];
    const r = pickFilters({field: {id: 'fldA', name: 'Status'}, fieldName: '', op: 'is', value: 'משובץ|מתוכנן'}, conf);
    assert.equal(r.hint, null);
    assert.equal(r.filters.length, 1);
    assert.deepEqual(r.filters[0], {fieldName: 'Status', fieldId: 'fldA', op: 'is', values: ['משובץ', 'מתוכנן'], source: 'pane'});
    assert.match(describeFilter(r.filters[0]), /Status .*משובץ \| מתוכנן \(חלונית\)/);
});

test('precedence: pane "none"/unset → config fallback → no filter', () => {
    const conf = [{n: 2, field: 'Type', op: '', value: 'הקרנה'}];
    const viaConf = pickFilters({field: null, fieldName: '', op: 'none', value: ''}, conf);
    assert.deepEqual(viaConf.filters, [{fieldName: 'Type', op: 'is', values: ['הקרנה'], source: 'config'}]);
    assert.deepEqual(pickFilters(null, conf).filters.length, 1);
    const nothing = pickFilters({field: null, fieldName: '', op: undefined, value: ''}, []);
    assert.deepEqual(nothing, {filters: [], hint: null});
});

test('misconfigured pane filter: ignored with a hint, does NOT fall back silently', () => {
    const conf = [{n: 1, field: 'Type', op: 'is', value: 'x'}];
    assert.match(pickFilters({field: null, fieldName: '', op: 'is', value: 'x'}, conf).hint!, /לא נבחר שדה/);
    assert.match(pickFilters({field: {id: 'f', name: 'S'}, fieldName: '', op: 'is', value: ' | '}, conf).hint!, /חסר ערך/);
    assert.equal(pickFilters({field: {id: 'f', name: 'S'}, fieldName: '', op: 'is', value: ''}, conf).filters.length, 0);
    assert.equal(pickFilters({field: null, fieldName: 'Status', op: 'is_empty', value: ''}, conf).filters[0].fieldName, 'Status'); // typed name
    assert.match(pickFilters({field: {id: 'f', name: 'S'}, fieldName: '', op: 'weird', value: 'x'}, []).hint!, /לא מוכר/);
});

test('config row: Filter_N "Table.Field" (| = several tables) split per table; bad rows → hint', () => {
    const row: Record<string, string> = {
        Filter_1: 'Films.Program | Slots_Events.Type',
        Filter_Operator_1: 'is not',
        Filter_Value_1: 'ארכיון',
        Filter_2: 'Status', // no table → skipped
        Filter_3: 'Tickets.Paid',
        Filter_Operator_3: 'is checked',
        Filter_4: 'Invitations.Kind',
        Filter_Operator_4: 'is',
    };
    const m = configFiltersByTable(s => row[s] ?? '');
    assert.deepEqual([...m.keys()].sort(), ['films', 'invitations', 'slots_events', 'tickets']);
    assert.deepEqual(m.get('films'), [{n: 1, field: 'Program', op: 'is not', value: 'ארכיון'}]);
    assert.equal(pickFilters(null, m.get('tickets')!).filters[0].op, 'is_checked');
    const bad = pickFilters(null, m.get('invitations')!);
    assert.equal(bad.filters.length, 0);
    assert.match(bad.hint!, /Filter_4/);
    assert.equal(configFiltersByTable(() => '').size, 0); // no Extension_Config row → no-op
});

test('filtering happens BEFORE the phase-aware counts', () => {
    const S = (id: string, status: 'm' | 'p', start = '2026-11-02T18:00:00Z'): CountSlot => ({
        id, startMs: Date.parse(start), scheduled: status === 'm', cancelled: false, filmIds: [], projectIds: [],
    });
    const slots = [S('s1', 'p'), S('s2', 'p'), S('s3', 'm')];
    const input: CountsInput = {
        slots, eventSlots: keepIds(slots, new Set(['s1'])), hasStart: true,
        films: keepIds([{id: 'f1', slotIds: ['s3']}, {id: 'f2', slotIds: []}], new Set(['f2'])), filmsLinked: true,
        projects: null, projectsLinked: false, invitations: 3, tickets: null,
    };
    const c = computeCounts(input, 'before', Date.parse('2026-10-10T00:00:00Z'));
    assert.equal(c.events, 1); // s1 only (s2 filtered out)
    assert.equal(c.films, 1); // f2 (no משובץ); f1 filtered out
    const noFilter = computeCounts({...input, eventSlots: undefined}, 'before', 0);
    assert.equal(noFilter.events, 2);
    assert.equal(keepIds(null, new Set()), null);
});

test('right-pane keys and Hebrew labels', () => {
    assert.deepEqual(PILLS.map(p => p.key), ['films', 'events', 'projects', 'invitations', 'tickets', 'sold']);
    assert.deepEqual(propKeys('films'), {
        table: 'films_table', field: 'films_filterField', fieldName: 'films_filterFieldName', op: 'films_filterOp', value: 'films_filterValue',
        agg: 'films_agg', sumField: 'films_sumField', sumFieldName: 'films_sumFieldName',
    });
    assert.equal(propLabels('סרטים', 'films').field, 'סרטים · שדה סינון');
    assert.equal(propLabels('אירועים', 'events').table, 'אירועים · טבלה (גם מקור הטיימר)');
});

test('missing field: filter ignored + hint, others still apply; throwing reads never crash', () => {
    const recs = [{id: 'r1', v: {Status: 'משובץ', Type: 'הקרנה'}}, {id: 'r2', v: {Status: 'מתוכנן', Type: 'הקרנה'}}, {id: 'r3', v: {Status: 'משובץ', Type: 'סדנה'}}];
    type R = (typeof recs)[number];
    const fields = new Set(['Status', 'Type', 'Boom']);
    const find = (s: {fieldName: string}) => (fields.has(s.fieldName) ? s.fieldName : null);
    const read = (r: R, f: string) => {
        if (f === 'Boom') throw new Error('not enabled');
        return {raw: (r.v as Record<string, string>)[f]};
    };
    const spec = (fieldName: string, op: 'is' | 'is_not', ...values: string[]) => ({fieldName, op, values, source: 'pane' as const});
    const one = applyFilters(recs, [spec('Status', 'is', 'משובץ')], find, read, 'Slots_Events');
    assert.deepEqual([...one.pass!], ['r1', 'r3']);
    assert.deepEqual(one.hints, []);
    const missing = applyFilters(recs, [spec('Hall', 'is', 'x')], find, read, 'Slots_Events');
    assert.equal(missing.pass, null); // = unfiltered count
    assert.match(missing.hints[0], /«Hall» לא נמצא .*Slots_Events/);
    const mixed = applyFilters(recs, [spec('Hall', 'is', 'x'), spec('Type', 'is_not', 'סדנה')], find, read, 'T');
    assert.deepEqual([...mixed.pass!], ['r1', 'r2']);
    assert.equal(mixed.hints.length, 1);
    const and = applyFilters(recs, [spec('Status', 'is', 'משובץ'), spec('Type', 'is', 'הקרנה')], find, read, 'T');
    assert.deepEqual([...and.pass!], ['r1']);
    const boom = applyFilters(recs, [spec('Boom', 'is', 'x')], find, read, 'T');
    assert.equal(boom.pass!.size, 3);
    const findThrows = applyFilters(recs, [spec('Status', 'is', 'x')], () => { throw new Error('x'); }, read, 'T');
    assert.equal(findThrows.pass, null);
    assert.equal(applyFilters(null, [spec('Status', 'is', 'x')], find, read, 'T').pass, null); // loading
});

// ---- v0.4.2: real interface-SDK cell shapes (getCellValue raw + getCellValueAsString text) ----
const realCells = {
    singleLineText: {raw: 'הקרנת פתיחה – אולם 1', text: 'הקרנת פתיחה – אולם 1'},
    singleSelect: {raw: {id: 'selAbC123', name: 'משובץ', color: 'greenLight2'}, text: 'משובץ'},
    multipleSelects: {raw: [{id: 'sel1', name: 'תחרות ישראלית', color: 'blueLight2'}, {id: 'sel2', name: 'Shorts', color: 'red'}], text: 'תחרות ישראלית, Shorts'},
    multipleRecordLinks: {raw: [{id: 'recAAA', name: 'סינמטק ת״א'}, {id: 'recBBB', name: 'Hall 2'}], text: 'סינמטק ת״א, Hall 2'},
    lookupNewFormat: {raw: [{linkedRecordId: 'recA', value: 'VIP'}, {linkedRecordId: 'recB', value: {id: 'selX', name: 'אורח'}}], text: 'VIP, אורח'},
    collaborator: {raw: {id: 'usr1', email: 'user@example.test', name: 'Demo Us'}, text: 'Demo Us'},
    formulaNumber: {raw: 3, text: '3'},
    aiText: {raw: {state: 'generated', value: 'סרט תיעודי', isStale: false}, text: 'סרט תיעודי'},
    button: {raw: {label: 'פתח', url: 'https://x'}, text: 'פתח'},
};
const ev = (c: {raw: unknown; text: string}, op: Parameters<typeof evaluateFilter>[1]['op'], v: string) =>
    evaluateFilter(c.raw, {op, values: splitValues(v)}, c.text);

test('real types: is', () => {
    assert.equal(ev(realCells.singleLineText, 'is', 'הקרנת פתיחה – אולם 1'), true);
    assert.equal(ev(realCells.singleSelect, 'is', 'משובץ'), true);
    assert.equal(ev(realCells.singleSelect, 'is', ' משובץ '), true);
    assert.equal(ev(realCells.singleSelect, 'is', 'מתוכנן|משובץ'), true);
    assert.equal(ev(realCells.multipleSelects, 'is', 'shorts'), true);
    assert.equal(ev(realCells.multipleRecordLinks, 'is', 'סינמטק ת״א'), true);
    assert.equal(ev(realCells.multipleRecordLinks, 'is', 'hall 2'), true);
    assert.equal(ev(realCells.lookupNewFormat, 'is', 'אורח'), true);
    assert.equal(ev(realCells.collaborator, 'is', 'demo us'), true);
    assert.equal(ev(realCells.formulaNumber, 'is', '3'), true);
    assert.equal(ev(realCells.aiText, 'is', 'סרט תיעודי'), true);
    assert.equal(ev(realCells.button, 'is', 'פתח'), true); // via getCellValueAsString
    assert.equal(ev(realCells.singleSelect, 'is', 'מתוכנן'), false);
});

test('real types: contains', () => {
    assert.equal(ev(realCells.singleLineText, 'contains', 'פתיחה'), true);
    assert.equal(ev(realCells.singleSelect, 'contains', 'שובץ'), true);
    assert.equal(ev(realCells.multipleSelects, 'contains', 'ישראל'), true);
    assert.equal(ev(realCells.multipleRecordLinks, 'contains', 'סינמטק'), true);
    assert.equal(ev(realCells.multipleRecordLinks, 'contains', 'HALL'), true);
    assert.equal(ev(realCells.lookupNewFormat, 'contains', 'vi'), true);
    assert.equal(ev(realCells.multipleRecordLinks, 'contains', 'ירושלים'), false);
    assert.equal(evaluateFilter(null, {op: 'contains', values: ['x']}, ''), false);
});

test('Hebrew / pasted-label operators map (config cells, typed text)', () => {
    assert.equal(parseOp('מכיל'), 'contains');
    assert.equal(parseOp('הוא'), 'is');
    assert.equal(parseOp('שווה ל'), 'is');
    assert.equal(parseOp('שונה מ'), 'is_not');
    assert.equal(parseOp('לא ריק'), 'is_not_empty');
    assert.equal(parseOp('שווה ל (is)'), 'is');
    assert.equal(parseOp('מכיל (contains)'), 'contains');
    assert.equal(parseOp('Contains'), 'contains');
});

test('field picked in the pane but NOT enabled on the element → precise hint, not "no field"', () => {
    const r = pickFilters({field: null, fieldName: '', op: 'is', value: 'משובץ', pickedButHiddenId: 'fldXYZ'}, []);
    assert.equal(r.filters.length, 0);
    assert.match(r.hint!, /fldXYZ.*לא מאופשר באלמנט/);
    assert.match(pickFilters({field: null, fieldName: '', op: 'is', value: 'x', pickedButHiddenId: null}, []).hint!, /לא נבחר שדה/);
});
