// 重い確認（vitest 全体・vite build・Playwright の確認スクリプト）を、パソコン全体で同時に MAX 本までに抑える順番待ち。
// 使い方: node C:/dev/card-rpg-tools/heavy.mjs <コマンド...>
//   例: node C:/dev/card-rpg-tools/heavy.mjs npx vitest run
//       node C:/dev/card-rpg-tools/heavy.mjs node scripts/adventure.mjs
// 空き枠が出るまで待ってから、今のフォルダでコマンドを動かし、終わったら枠を返す。終了コードはそのまま返す。
// 30分より古い枠（落ちたセッションの残り）は自動で捨てる。動いている間は5分ごとに枠の時刻を書き直すので、30分を超える仕事の枠は捨てられない。
import { mkdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const MAX = Number(process.env.HEAVY_MAX ?? 2);
const DIR = 'C:/dev/card-rpg-tools/locks';
const STALE_MS = 30 * 60 * 1000;
const args = process.argv.slice(2);
if (!args.length) { console.error('usage: node heavy.mjs <command...>'); process.exit(2); }
mkdirSync(DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let slot = null;
let waited = 0;
while (!slot) {
  for (let i = 0; i < MAX; i++) {
    const p = `${DIR}/slot${i}`;
    try {
      if (Date.now() - statSync(p).mtimeMs > STALE_MS) rmSync(p, { recursive: true, force: true });
    } catch { /* なし */ }
    try {
      mkdirSync(p);
      writeFileSync(`${p}/owner.txt`, `${process.cwd()}\n${args.join(' ')}\n${new Date().toISOString()}\n`);
      slot = p; break;
    } catch { /* 使用中 */ }
  }
  if (!slot) {
    if (waited % 60 === 0) console.error(`[heavy] 空き待ち（同時${MAX}本まで）… ${waited}秒`);
    await sleep(5000); waited += 5;
  }
}
const release = () => { try { rmSync(slot, { recursive: true, force: true }); } catch { /* */ } };
process.on('SIGINT', () => { release(); process.exit(130); });
process.on('SIGTERM', () => { release(); process.exit(143); });
// vitest の全体は、何もしないとCPUの数だけ並べて動かしメモリを食う。指定が無ければ2並列に抑える（結果は同じ）。
const q = (a) => (/^[\w@%+=:,./\\-]+$/.test(a) ? a : `"${a.replace(/"/g, '\\"')}"`);
let cmd = args.map(q).join(' ');
if (/\bvitest\b/.test(cmd) && !/--(maxWorkers|max-workers|pool)/.test(cmd)) cmd += ' --maxWorkers=2';
const child = spawn(cmd, { stdio: 'inherit', shell: true, env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS ?? '--max-old-space-size=2048' } });
const beat = setInterval(() => { try { const t = new Date(); utimesSync(slot, t, t); } catch { /* */ } }, 5 * 60 * 1000);
child.on('exit', (code) => { clearInterval(beat); release(); process.exit(code ?? 1); });
