// Bundles tests/*.test.ts (they import frontend/logic with extensionless paths) and runs them with node:test.
import {build} from 'esbuild';
import {readdirSync, mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const files = readdirSync('tests').filter(f => f.endsWith('.test.ts'));
mkdirSync('tests/.out', {recursive: true});
for (const f of files)
    await build({entryPoints: [`tests/${f}`], bundle: true, platform: 'node', format: 'esm', outfile: `tests/.out/${f.replace(/\.ts$/, '.mjs')}`, logLevel: 'warning'});
const r = spawnSync(process.execPath, ['--test', ...files.map(f => `tests/.out/${f.replace(/\.ts$/, '.mjs')}`)], {stdio: 'inherit', env: {...process.env, TZ: 'UTC'}});
process.exit(r.status ?? 1);
