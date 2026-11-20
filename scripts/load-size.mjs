// 初回の読み込み量の確認: 新しい冒険を始める前後で、画像などが何MB読み込まれるか
// 使い方: URL=http://localhost:5192/ node scripts/load-size.mjs（ビルドした dist を配信して）
import { chromium, URL } from './lib.mjs';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 780 } });
const got = new Map();
const collect = async () => { for (const e of await p.evaluate(() => performance.getEntriesByType('resource').map((x) => [x.name, x.encodedBodySize || x.decodedBodySize || x.transferSize]))) got.set(e[0], e[1]); };
const sum = (re) => [...got].filter(([u]) => re.test(u)).reduce((s, [, n]) => s + n, 0);
const report = (t) => console.log(t.padEnd(14), `全部 ${(sum(/./) / 1e6).toFixed(2)}MB`, `画像 ${(sum(/\.(webp|png)$/) / 1e6).toFixed(2)}MB`, `(立ち絵 ${(sum(/hero\//) / 1e6).toFixed(2)} 顔のみ ${(sum(/-face/) / 1e6).toFixed(2)} お供 ${(sum(/pet\//) / 1e6).toFixed(2)} 敵 ${(sum(/enemy/) / 1e6).toFixed(2)} 背景 ${(sum(/bg/) / 1e6).toFixed(2)})`, `JS ${(sum(/\.js$/) / 1e6).toFixed(2)}`);
await p.goto(URL);
await p.evaluate(() => localStorage.clear());
await p.reload();
await p.waitForTimeout(1500); await collect(); report('タイトル 1.5秒');
await p.waitForTimeout(8000); await collect(); report('タイトル 10秒');
console.log('ファイル数', got.size);
await b.close();
