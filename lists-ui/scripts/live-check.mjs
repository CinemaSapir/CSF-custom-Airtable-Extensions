// Runs the REAL frontend/dynlogic.ts runSpec + summaryHe on a DEMO snapshot of the seeded dynamic lists.
import {execFileSync} from 'node:child_process';
import {mkdtempSync, writeFileSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const here = dirname(fileURLToPath(import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'lue-live-'));
const entry = join(tmp, 'entry.ts'), out = join(tmp, 'dyn.mjs');
writeFileSync(entry, `export * from '${join(here, '../frontend')}/dynlogic';\n`);
const esbuild = '/home/box/.local/lib/node_modules/@airtable/blocks-cli/node_modules/esbuild/bin/esbuild';
execFileSync(esbuild, [entry, '--bundle', '--format=esm', '--platform=node', `--outfile=${out}`,
    `--alias:react=${join(here, 'stubs/react.mjs')}`, `--alias:@airtable/blocks/interface/ui=${join(here, 'stubs/blocks-ui.mjs')}`,
    `--alias:@airtable/blocks/interface/models=${join(here, 'stubs/empty.mjs')}`, '--log-level=error']);
const D = await import(pathToFileURL(out).href);
const S = JSON.parse(readFileSync(join(here, 'live-snapshot-2026-09-29.json'), 'utf8'));
const sel = (n) => (n ? {id: 'sel', name: n} : null);
const FILM = {n: 'fldnNNYgdTgXc1c7o', acc: 'fldO8jqYjg52cLe61', tr: 'fldfofhma9esYgIm7'};
const SLOT = {n: 'fldTfMQmhZuGYDcyU', type: 'fldxTZHOwfcvbWCIi', start: 'fldtmiazhhykZjx2J'};
const mk = (row, map) => {
    const cells = {};
    for (const [k, fid] of Object.entries(map)) cells[fid] = k === 'n' || k === 'start' ? row[k] ?? null : sel(row[k]);
    return {id: row.id, name: row.n ?? '', getCellValue: (f) => cells[f.id ?? f] ?? null};
};
const tbl = (map) => { const ids = new Set(Object.values(map)); return {getFieldByIdIfExists: (id) => (ids.has(id) ? {id} : null), getFieldByNameIfExists: () => null}; };
const films = S.films.map((r) => mk(r, FILM)), slots = S.slots.map((r) => mk(r, SLOT));
let ok = 0;
for (const L of S.lists) {
    const table = L.table === 'Films' ? 'film' : 'slot';
    const spec = {table, tableChoice: L.table, conds: L.conds.map(([key, op, value]) => ({key, op, value}))};
    const res = D.runSpec(spec, tbl(table === 'film' ? FILM : SLOT), table === 'film' ? films : slots);
    assert.equal(res.missing.length + res.incomplete.length, 0, `${L.name}: missing/incomplete`);
    assert.equal(res.records.length, L.expect, `${L.name}: count`);
    console.log(`${L.id} ${L.name} → ${res.records.length} (of ${table === 'film' ? films.length : slots.length})\n  מציג: ${D.summaryHe(spec)}\n  ${res.records.map((r) => r.name).join(' | ')}`);
    ok++;
}
console.log(`${ok}/3 seeded dynamic lists match expected live counts`);
