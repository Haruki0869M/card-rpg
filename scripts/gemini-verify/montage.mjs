// スクショを並べた1枚の絵を作る（確かめる用）: node montage.mjs <出力.png> <画像...>
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { chromium } from '../lib.mjs';
const [out, ...files] = process.argv.slice(2);
const cols = Number(process.env.COLS ?? 4);
const w = Number(process.env.W ?? 240);
const html = `<html><body style="margin:0;background:#222;color:#fff;font:12px sans-serif;display:grid;grid-template-columns:repeat(${cols},${w}px);gap:4px;padding:4px">${files.map((f) => `<div><img style="width:${w}px" src="data:image/png;base64,${readFileSync(f).toString('base64')}"><div>${basename(f)}</div></div>`).join('')}</body></html>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: cols * (w + 4) + 4, height: 400 } });
await p.setContent(html);
await p.screenshot({ path: out, fullPage: true });
await b.close();
