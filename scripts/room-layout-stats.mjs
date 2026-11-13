// 手作りのダンジョン28か所の並びを数えて、決まり（docs/review/2026-11-13-room-variety2.md）に合うかを見る道具。
// 使い方: node scripts/room-layout-stats.mjs [コミット...]   （コミットを付けない時は、今の作業ツリー。"WORK" も今の作業ツリー）
//   例: node scripts/room-layout-stats.mjs bf628d5 9fd825c WORK
// ゲームのコードは動かさず、src/content/scenarios/*/dungeons/*.ts の layout を文字のまま読む（読むだけ）。
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DIR = 'src/content/scenarios';
const COMBAT = new Set(['battle', 'elite', 'midboss', 'boss']);
const BASE = 'bf628d5';

function filesAt(rev) {
  const list = [];
  for (const s of readdirSync(`${ROOT}/${DIR}`)) {
    let names = [];
    try { names = readdirSync(`${ROOT}/${DIR}/${s}/dungeons`); } catch { continue; }
    for (const n of names) if (n.endsWith('.ts') && n !== 'pools.ts') list.push({ scenario: s, path: `${DIR}/${s}/dungeons/${n}` });
  }
  return list.map((f) => ({ ...f, text: rev === 'WORK' ? readFileSync(`${ROOT}/${f.path}`, 'utf8') : execSync(`git show ${rev}:${f.path}`, { cwd: ROOT, encoding: 'utf8' }) }));
}

/** 文字の中の、[ から対応する ] までを返す */
function bracket(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']' && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error('bracket');
}

/** 型の並び（src/content/common/dungeonLayouts.ts の keyLayout1 など。無い版では空） */
function templatesAt(rev) {
  const path = 'src/content/common/dungeonLayouts.ts';
  let text = '';
  try { text = rev === 'WORK' ? readFileSync(`${ROOT}/${path}`, 'utf8') : execSync(`git show ${rev}:${path}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return {}; }
  const out = {};
  for (const m of text.matchAll(/export const (\w+) = \(e: LayoutEvents\): Layout => \[/g)) out[m[1]] = new Function('e', `return ${bracket(text, m.index + m[0].length - 1).replace(/!/g, '')}`);
  return out;
}

export function loadLayouts(rev = 'WORK') {
  const out = [];
  const tpl = templatesAt(rev);
  const call = (fn, arg) => tpl[fn](new Function(`return ${arg}`)());
  for (const f of filesAt(rev)) {
    // 名前の付いた並び（const xxxLayout: Layout = [...] か、型の呼び出し）
    const named = new Map();
    for (const m of f.text.matchAll(/const (\w+): Layout = \[/g)) named.set(m[1], new Function(`return ${bracket(f.text, m.index + m[0].length - 1)}`)());
    for (const m of f.text.matchAll(/const (\w+): Layout = (\w+)\((\{[^}]*\})\);/g)) named.set(m[1], call(m[2], m[3]));
    for (const chunk of f.text.split(/: DungeonDef = \{/).slice(1)) {
      const id = /id: '(\w+)'/.exec(chunk)?.[1];
      const li = chunk.indexOf('layout: [');
      const ref = /layout: (\w+),/.exec(chunk)?.[1];
      const inlineCall = /layout: (\w+)\((\{[^}]*\})\),/.exec(chunk);
      if (!id || (li < 0 && !named.has(ref) && !inlineCall)) continue;
      const layout = li >= 0 ? new Function(`return ${bracket(chunk, li + 'layout: '.length)}`)() : inlineCall ? call(inlineCall[1], inlineCall[2]) : named.get(ref);
      out.push({ id, scenario: f.scenario, layout });
    }
  }
  // 段: 鍵は行の数（8・9・10）、最後は中ボスあり
  for (const d of out) {
    d.finale = d.layout.some((row) => row.some((r) => r.type === 'midboss'));
    d.stage = d.finale ? 3 : d.layout.length - 8;
  }
  return out;
}

export function allPaths(L) {
  const out = [];
  const walk = (r, c, path) => {
    const next = [...path, { r, c, type: L[r][c].type }];
    if (!L[r][c].next.length) out.push(next);
    else for (const n of L[r][c].next) walk(r + 1, n, next);
  };
  L[0].forEach((_, c) => walk(0, c, []));
  return out;
}

/** ボスの前の休憩の行（最後の3行のうち、休憩1つだけの行） */
export const restRowOf = (L) => {
  for (let r = L.length - 2; r >= L.length - 3; r--) if (L[r].length === 1 && L[r][0].type === 'rest') return r;
  return -1;
};

export function stats(d) {
  const L = d.layout;
  const counts = {};
  for (const room of L.flat()) counts[room.type] = (counts[room.type] ?? 0) + 1;
  const paths = allPaths(L);
  const rest = restRowOf(L);
  const per = paths.map((p) => {
    const types = p.map((x) => x.type);
    let run = 0;
    let maxRun = 0;
    for (const t of types) { run = COMBAT.has(t) ? 0 : run + 1; maxRun = Math.max(maxRun, run); }
    return {
      battle: types.filter((t) => t === 'battle').length,
      combat: types.filter((t) => COMBAT.has(t)).length,
      elite: types.filter((t) => t === 'elite').length,
      deep: p.filter((x) => x.r >= 4 && x.r < rest && COMBAT.has(x.type)).length,
      maxRun,
    };
  });
  const range = (k) => [Math.min(...per.map((x) => x[k])), Math.max(...per.map((x) => x[k]))];
  let choices = 0;
  let sameChoices = 0;
  let sameEdges = 0;
  let eliteOrOther = 0;
  L.forEach((row, r) => row.forEach((room) => {
    for (const n of room.next) if (L[r + 1][n].type === room.type) sameEdges++;
    if (room.next.length >= 2) {
      choices++;
      const ts = room.next.map((n) => L[r + 1][n].type);
      if (new Set(ts).size === 1) sameChoices++;
      if (ts.includes('elite') && ts.some((t) => t !== 'elite')) eliteOrOther++;
    }
  }));
  const rowDups = L.flatMap((row, r) => (row.length > 1 && new Set(row.map((x) => x.type)).size < row.length ? [r] : []));
  // 一本道の行（部屋が1つ）の連続。最後の「休憩 →（物語）→ ボス」は数えない
  let single = 0;
  let maxSingle = 0;
  for (let r = 0; r < rest; r++) { single = L[r].length === 1 ? single + 1 : 0; maxSingle = Math.max(maxSingle, single); }
  const eliteRows = L.flatMap((row, r) => (row.some((x) => x.type === 'elite') ? [r] : []));
  const eliteAvoidable = eliteRows.every((r) => L[r].some((x) => x.type !== 'elite'));
  return {
    counts, paths: paths.length, battle: range('battle'), combat: range('combat'), elite: range('elite'), deep: range('deep'), maxRun: range('maxRun'),
    choices, sameChoices, sameEdges, eliteOrOther, rowDups, maxSingle, eliteAvoidable, rest,
    events: L.flat().filter((x) => x.type === 'event').map((x) => x.eventId),
    chests: L.flatMap((row, r) => row.filter((x) => x.type === 'chest').map((x) => `${r}:${x.chest.rarity}${x.chest.locked ? '鍵' : ''}`)),
  };
}

/** 決まり 1〜5・7・8 に反している所（base は直す前のその場所の並び） */
export function violations(d, base) {
  const L = d.layout;
  const s = stats(d);
  const v = [];
  const rowsWant = d.finale ? 13 : [8, 9, 10][d.stage];
  if (L.length !== rowsWant) v.push(`行の数 ${L.length}`);
  if (!(L[0].length === 1 && L[0][0].type === 'battle')) v.push('1行目が battle 1つでない');
  if (L[L.length - 1].length !== 1 || L[L.length - 1][0].type !== 'boss') v.push('最後がボスでない');
  if (d.finale && !(L[6].length === 1 && L[6][0].type === 'midboss' && L[7].length === 1 && L[7][0].type === 'rest')) v.push('中ボス・休憩の行');
  if (base && restRowOf(base.layout) !== s.rest) v.push(`ボスの前の休憩の行が違う ${restRowOf(base.layout)}→${s.rest}`);
  if (base) for (let r = s.rest; r < L.length; r++) if (JSON.stringify(L[r].map((x) => [x.type, x.eventId])) !== JSON.stringify(base.layout[r].map((x) => [x.type, x.eventId]))) v.push(`最後の行 ${r} が直す前と違う`);
  L.forEach((row, r) => {
    if (row.length < 1 || row.length > 3) v.push(`${r}行: 部屋の数 ${row.length}`);
    row.forEach((room, c) => {
      if (r + 1 < L.length && !room.next.length) v.push(`${r}:${c} 行き先なし`);
      for (const n of room.next) if (!(n >= 0 && n < (L[r + 1]?.length ?? 0))) v.push(`${r}:${c} 行き先 ${n} が無い`);
      if (new Set(room.next).size !== room.next.length) v.push(`${r}:${c} 行き先が重なる`);
      if (r > 0 && !L[r - 1].some((p) => p.next.includes(c))) v.push(`${r}:${c} に入れない`);
    });
  });
  if (s.sameEdges) v.push(`同じ type が続く辺 ${s.sameEdges}`);
  if (s.rowDups.length) v.push(`同じ行に同じ type: ${s.rowDups.join(',')}`);
  if (s.maxRun[1] >= 3) v.push(`戦わない部屋が ${s.maxRun[1]} 続く`);
  const deepWant = d.finale ? 3 : 2;
  if (s.deep[0] < deepWant) v.push(`5行目〜休憩の前の戦う部屋 最小 ${s.deep[0]}（${deepWant}以上）`);
  // 2026-11-13（点検19の問題 A1・オーナーの OK）: 1つ目の鍵の型（シナリオ2〜7の8行の鍵のダンジョン）だけ 2回以上
  const bWant = d.finale ? 4 : d.stage === 0 && d.scenario !== 'corruptionKing' ? 2 : 3;
  if (s.battle[0] < bWant) v.push(`battle 最小 ${s.battle[0]}（${bWant}以上）`);
  if (!s.eliteAvoidable) v.push('避けられない elite の行');
  if (!s.eliteOrOther) v.push('elite を選べる所が無い');
  if (s.maxSingle >= 3) v.push(`一本道の行が ${s.maxSingle} 続く`);
  if (base) {
    const b = stats(base);
    if (s.choices < b.choices) v.push(`選ぶ所 ${b.choices}→${s.choices}`);
    const baseEvents = new Set(b.events);
    for (const e of s.events) if (!baseEvents.has(e)) v.push(`直す前に無いイベント ${e}`);
    if (new Set(s.events).size !== s.events.length) v.push('同じイベントが2回');
  }
  return v;
}

const TYPES = ['battle', 'elite', 'chest', 'event', 'rest'];
function summary(rev) {
  const ds = loadLayouts(rev);
  const total = Object.fromEntries(TYPES.map((t) => [t, 0]));
  let choices = 0;
  let same = 0;
  let eo = 0;
  for (const d of ds) {
    const s = stats(d);
    for (const t of TYPES) total[t] += s.counts[t] ?? 0;
    choices += s.choices;
    same += s.sameChoices;
    eo += s.eliteOrOther;
  }
  return { ds, total, choices, same, eo };
}

const NAME = { battle: '戦', elite: '強', chest: '宝', event: 'イ', rest: '休', boss: 'ボス', midboss: '中ボス' };
/** 並びの図（行ごとに「部屋→次の行の何番目」） */
export function diagram(L) {
  return L.map((row, r) => `${String(r + 1).padStart(2)}行: ${row.map((x, c) => `${c}.${NAME[x.type]}${x.chest ? `(${{ common: 'コモン', rare: 'レア', epic: 'エピック', legend: 'レジェンド' }[x.chest.rarity]}${x.chest.locked ? '・鍵' : ''})` : ''}${x.eventId ? `(${x.eventId})` : ''}${x.next.length ? `→${x.next.join('')}` : ''}`).join('  ')}`).join('\n');
}

/** 文書用の表（--md 直す前 1回目 今回） */
function markdown([b, f, n]) {
  const rows = [b, f, n].map((rev) => summary(rev));
  const lines = [];
  lines.push('| | 直す前（bf628d5） | 1回目（9fd825c） | 今回 |', '|---|---|---|---|');
  for (const t of TYPES) lines.push(`| ${t} | ${rows.map((x) => x.total[t]).join(' | ')} |`);
  lines.push(`| 選ぶ所 | ${rows.map((x) => x.choices).join(' | ')} |`);
  lines.push(`| うち「どちらも同じ type」 | ${rows.map((x) => x.same).join(' | ')} |`);
  lines.push(`| うち「強敵か、別の物か」 | ${rows.map((x) => x.eo).join(' | ')} |`);
  lines.push('');
  lines.push('| ダンジョン | 型 | battle（道ごと） 前→1回目→今回 | 戦う部屋（道ごと） | 5行目〜休憩の前の戦う部屋 | 選ぶ所（同じ type） | 部屋の数 battle/elite/chest/event/rest 前→今回 |', '|---|---|---|---|---|---|---|');
  const by = rows.map((x) => new Map(x.ds.map((d) => [d.id, stats(d)])));
  for (const d of rows[2].ds) {
    const s = by.map((m) => m.get(d.id));
    const r = (k) => s.map((x) => x[k].join('〜')).join(' → ');
    const cnt = (x) => TYPES.map((t) => x.counts[t] ?? 0).join('/');
    const kind = d.scenario === 'corruptionKing' ? '（1本ずつ）' : d.finale ? '最後' : `鍵${d.stage + 1}`;
    lines.push(`| ${d.id} | ${kind} | ${r('battle')} | ${r('combat')} | ${r('deep')} | ${s.map((x) => `${x.choices}(${x.sameChoices})`).join(' → ')} | ${cnt(s[0])} → ${cnt(s[2])} |`);
  }
  return lines.join('\n');
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  if (process.argv[2] === '--md') {
    console.log(markdown(process.argv.slice(3)));
    process.exit(0);
  }
  if (process.argv[2] === '--diagram') {
    const ds = loadLayouts(process.argv[3]);
    for (const id of process.argv.slice(4)) console.log(`#### ${id}\n\`\`\`\n${diagram(ds.find((d) => d.id === id).layout)}\n\`\`\``);
    process.exit(0);
  }
  const revs = process.argv.slice(2).length ? process.argv.slice(2) : ['WORK'];
  const base = new Map(loadLayouts(BASE).map((d) => [d.id, d]));
  for (const rev of revs) {
    const { ds, total, choices, same, eo } = summary(rev);
    console.log(`\n===== ${rev} =====`);
    console.log(`合計 ${TYPES.map((t) => `${t} ${total[t]}`).join(' / ')} / 選ぶ所 ${choices}（どちらも同じ type ${same}・elite か別の物 ${eo}）`);
    let bad = 0;
    for (const d of ds) {
      const s = stats(d);
      const v = violations(d, base.get(d.id));
      bad += v.length;
      console.log(
        `${d.id.padEnd(16)} 段${d.stage} ${TYPES.map((t) => `${t[0]}${s.counts[t] ?? 0}`).join(' ')} 道${s.paths} battle${s.battle.join('-')} 戦う${s.combat.join('-')} 奥${s.deep.join('-')} elite${s.elite.join('-')} 選${s.choices}(同${s.sameChoices}) ${v.length ? `NG: ${v.join(' / ')}` : 'OK'}`,
      );
    }
    console.log(`NG ${bad}件`);
  }
}
