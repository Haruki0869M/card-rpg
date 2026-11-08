// PNG/JPG を幅390の JPEG にする: node tojpg.mjs 出力フォルダ ファイル...
import { chromium } from '../lib.mjs';
import { readFileSync } from 'node:fs';
const [out, ...files] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5 });
for (const f of files) {
  const src = `data:image/${f.endsWith('png') ? 'png' : 'jpeg'};base64,${readFileSync(f).toString('base64')}`;
  await p.setContent(`<style>body{margin:0}img{width:390px;display:block}</style><img src="${src}">`);
  await p.waitForTimeout(50);
  const name = f.split(/[\/]/).pop().replace(/\.(png|jpg)$/, '.jpg');
  await p.locator('img').screenshot({ path: `${out}/${name}`, type: 'jpeg', quality: 68 });
}
await b.close();
