// 使い方: node montage.mjs out.png 列数 幅 file1 file2 ...
import { chromium } from '../../lib.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const [out, cols, w, ...files] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: cols * w, height: 400 } });
const imgs = files.map((f) => `<figure><img src="data:image/${f.endsWith('png') ? 'png' : 'jpeg'};base64,${readFileSync(f).toString('base64')}"><figcaption>${f.split(/[\/]/).pop()}</figcaption></figure>`).join('');
await p.setContent(`<style>body{margin:0;display:grid;grid-template-columns:repeat(${cols},${w}px);background:#000;color:#fff;font:11px sans-serif}figure{margin:0}img{width:${w}px;display:block}</style>${imgs}`);
await p.waitForTimeout(300);
await p.screenshot({ path: out, fullPage: true }); await b.close();
