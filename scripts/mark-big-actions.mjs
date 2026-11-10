// 強敵・中ボス・ボスの「大技」（BREAK できる予告）の印 big: true を、敵のデータに付ける道具（抜本的な見直し §3-2）。
// 1回動かして付けた後は、データを手で直してよい（この道具は、印が無い所に足すだけ。外した印は付け直さないよう --check で差だけ見られる）。
// 決まり（提案）:
//   対象の敵 = 固定・ランダムのダンジョンの「強敵・中ボス・ボス」の組に出る敵と、隠しボス（common/enemies/hiddenBosses.ts）。
//              そのダンジョンのふつうの戦闘にも出る敵（取り巻き）は外す。組が取り巻きだけの時は、組の先頭の敵を入れる
//   大技     = (a) 味方全員へのダメージ（全体攻撃）、(b) その段階の行動の中で、1人へのダメージ（量×回数）が一番大きい行動
// 使い方: node scripts/mark-big-actions.mjs          … 付ける
//         node scripts/mark-big-actions.mjs --check  … 付けずに、足りない印だけ出す
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const server = await createServer({ root: ROOT, logLevel: 'silent', appType: 'custom', server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true } });
let wanted;
try {
  const { ENEMIES } = await server.ssrLoadModule('/src/data/enemies/index.ts');
  const { DUNGEONS } = await server.ssrLoadModule('/src/data/dungeons/index.ts');
  const hidden = await server.ssrLoadModule('/src/content/common/enemies/hiddenBosses.ts');
  const ids = new Set(Object.values(hidden).filter((x) => x && typeof x === 'object' && 'actions' in x).map((x) => x.id));
  for (const d of DUNGEONS.all) {
    for (const g of d.pools.elite ?? []) for (const id of g) ids.add(id);
    for (const id of d.pools.boss ?? []) ids.add(id);
    for (const id of d.pools.midboss ?? []) ids.add(id);
  }
  // 中ボス・ボスの組の取り巻き（そのダンジョンのふつうの戦闘にも出る敵）は外す: 強敵の組だけに出る敵・ボス本人だけを対象にする
  const common = new Set(DUNGEONS.all.flatMap((d) => d.pools.battle.flat()));
  wanted = [];
  // ただし、強敵・中ボス・ボスの組が「ふつうの戦闘にも出る敵」だけで出来ている時は、その組の先頭の敵（かしら）を対象に入れる
  // （どの強敵の戦闘にも、崩せる大技が1つはあるように）
  const groups = DUNGEONS.all.flatMap((d) => [...(d.pools.elite ?? []), d.pools.boss ?? [], d.pools.midboss ?? []]).filter((g) => g.length);
  const leaders = new Set(groups.filter((g) => g.every((id) => common.has(id))).map((g) => g[0]));
  for (const id of [...ids].sort()) {
    if (common.has(id) && !leaders.has(id)) continue;
    const def = ENEMIES.get(id);
    const sets = [def.actions, ...(def.phases ?? []).map((p) => p.actions)];
    for (const actions of sets) {
      const single = (a) => a.effects.filter((e) => e.kind === 'damage' && (e.to ?? 'target') === 'target').reduce((n, e) => n + e.amount * (e.hits ?? 1), 0);
      const top = Math.max(0, ...actions.map(single));
      for (const a of actions) {
        const all = a.effects.some((e) => e.kind === 'damage' && e.to === 'foes');
        if (all || (top > 0 && single(a) === top)) wanted.push({ enemy: id, action: a.id, has: !!a.big });
      }
    }
  }
} finally {
  await server.close();
}

const files = [];
const walk = (dir) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (/[\\/]enemies[\\/][^\\/]+\.ts$/.test(p)) files.push(p); } };
walk(join(ROOT, 'src/content'));
const missing = wanted.filter((w) => !w.has);
let done = 0;
const failed = [];
for (const file of files) {
  let src = readFileSync(file, 'utf8');
  let changed = false;
  for (const w of missing) {
    // その敵のデータの範囲（id: '敵' から、次の export const まで）
    const at = src.search(new RegExp(`\\bid: ['"]${w.enemy}['"],`));
    if (at < 0) continue;
    const end = src.indexOf('\nexport const ', at);
    const block = src.slice(at, end < 0 ? undefined : end);
    const re = new RegExp(`(\\{\\s*"?id"?: ['"]${w.action}['"],\\s*"?name"?: (?:'[^'\\n]*'|"[^"\\n]*"|\`[^\`\\n]*\`),)`);
    if (!re.test(block)) { failed.push(`${w.enemy}.${w.action}`); continue; }
    if (!CHECK) { src = src.slice(0, at) + block.replace(re, '$1 big: true,') + (end < 0 ? '' : src.slice(end)); changed = true; }
    w.file = file;
    done++;
  }
  if (changed) writeFileSync(file, src);
}
const lost = missing.filter((w) => !w.file).map((w) => `${w.enemy}.${w.action}`);
console.log(`大技の印: 決まりに当てはまる行動 ${wanted.length}（もう付いている ${wanted.length - missing.length}）・${CHECK ? '足りない' : '付けた'} ${done}`);
if (CHECK && missing.length) console.log(missing.map((w) => `${w.enemy}.${w.action}`).join('\n'));
if (lost.length) { console.error(`データの中に見つからなかった行動: ${[...new Set([...lost, ...failed])].join(', ')}`); process.exit(1); }
