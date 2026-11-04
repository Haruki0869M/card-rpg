// アート一覧のスクリーンショット: node scripts/shot-art.mjs [出力先]
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const { chromium } = require('playwright');
const out = process.argv[2] ?? 'screenshots/art.png';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 760, height: 2900 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto((process.env.URL ?? 'http://localhost:5173/card-rpg/') + '#art');
await p.waitForTimeout(800);
await p.screenshot({ path: out, fullPage: true });
await b.close();
if (errs.length) console.log(errs);
console.log('saved', out);
