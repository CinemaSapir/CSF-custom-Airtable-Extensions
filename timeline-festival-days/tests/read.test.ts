import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildDays, fmt} from '../frontend/logic/core';
import {readItems, names, type RecView, type TableInput} from '../frontend/logic/read';
import {TABLE_SPECS} from '../frontend/logic/tables';

// fixture.json = SDK-shaped mirror of the DEMO seed (harness/make_fixture.py)
const fx = JSON.parse(readFileSync(new URL('../../harness/fixture.json', import.meta.url), 'utf8')) as {tables: Array<{name: string; fields: Array<{name: string}>; records: Array<{id: string; cells: {[k: string]: unknown}}>}>};
const view = (t: (typeof fx.tables)[number], r: (typeof fx.tables)[number]['records'][number]): RecView => {
    const f = (a?: string[]) => a?.find(n => t.fields.some(x => x.name === n));
    return {id: r.id, name: String(r.cells[t.fields[0].name] ?? ''), has: a => !!f(a), raw: a => (f(a) ? r.cells[f(a) as string] : undefined), str: a => names(f(a) ? r.cells[f(a) as string] : null).join(', ')};
};
const fd = fx.tables.find(t => t.name === 'Festival Days')!;
const dayDateById = Object.fromEntries(fd.records.map(r => [r.id, String(r.cells.Date)]));
const days = buildDays('2026-10-16', '2026-11-10', '2026-11-01', Object.fromEntries(fd.records.map(r => [String(r.cells.Date), String(r.cells.Name)])));
const input: TableInput[] = TABLE_SPECS.map(sp => {
    const t = fx.tables.find(x => x.name === sp.key)!;
    return {key: sp.key, recs: t.records.map(r => view(t, r))};
});
const MAP: {[k: string]: string} = {Todo: 'לביצוע', 'In progress': 'בתהליך', Done: 'בוצע ✓'};
const res = readItems(input, {days, dayDateById, lodge: {in: '15:00', out: '11:00'}, statusLabel: s => MAP[s] ?? s, excludeTypes: ['למחיקה', 'לא מוגדר'], excludeStatus: {Tasks: ['בוטלה']}});
const by = (id: string) => res.items.find(i => i.id === id)!;

test('DEMO seed: every table maps, junk hidden', () => {
    const tables = new Set(res.items.map(i => i.table));
    assert.equal(tables.size, 7); // v0.2.11: Tasks, Petty Cash, Requests, transactions, Notebook, Approvals removed
    for (const t of ['Tasks', 'Petty Cash', 'Requests', 'transactions', 'Notebook', 'Approvals']) assert.ok(!tables.has(t), t);
    assert.ok(!res.items.some(i => /^DEMO Slot/.test(i.name)));
    assert.ok(!res.items.some(i => i.id === 'recJunkType' || i.id === 'recJunkTask'));
    assert.ok(res.hidden >= 26);
});
test('slot times: UTC → Israel local (UTC+3 before 25.10, UTC+2 after)', () => {
    const press = by('recMYURxuGf8WyfCL'); // 21.10 08:00Z
    assert.equal(fmt(press.s!), '11:00');
    const opening = by('recAKv013DvkZrGy9'); // 1.11 17:00Z
    assert.equal(fmt(opening.s!), '19:00');
    assert.equal(Math.floor(opening.s! / 1440), 16);
});
test('borrowed time: Staffing spans its linked slots and inherits their halls', () => {
    const s = by('recZQZ4dIoddqAvII');
    assert.equal(s.inherited, true);
    assert.equal(fmt(s.s!), '18:00');
    assert.equal(fmt(s.e!), '19:55');
    assert.ok(s.hall.length >= 2);
    assert.deepEqual(s.people, ['נועה לוי']);
    assert.equal(s.st, 'לביצוע');
});
test('lodging: date-only check-in/out get the default 15:00 / 11:00, hotel names cleaned', () => {
    const l = by('recAtb1EyLlytZPMG');
    assert.equal(fmt(l.s!), '15:00');
    assert.equal(fmt(l.e!), '11:00');
    assert.equal(l.hotel, 'מלון 04');
    assert.equal(l.guest, 'יונתן מזרחי');
    assert.equal(l.defT, true);
});
test('date-only tables: Booking Resources date via the Festival Days link (v0.2.11: Tasks removed)', () => {
    const b = by('recfwNfLX6Uk634CQ');
    assert.equal(b.date, '2026-10-29');
    assert.equal(b.s, null);
    assert.equal(res.items.find(i => i.id === 'rec57LATHgBOX19Jy'), undefined);
});
test('slots inherit people from linked staffing / invitations', () => {
    const opening = by('recAKv013DvkZrGy9');
    assert.ok(opening.people.includes('נועה לוי'));
});
