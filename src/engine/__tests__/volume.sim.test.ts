// ===== 遊びの長さ（ボリューム）の測定。数値は変えない =====
// 人のように「まっすぐ進む」bot（レベル上げをしない・次に入れるダンジョンへ直行・町は回復と船の依頼だけ）で、
// 全シナリオを最後まで遊ばせ、節目ごとの「だいたいの時間」と、転職できる段に届く時期を数える。
//
// 使い方（重いので heavy.mjs を通す）:
//   VOL=1 node C:/dev/card-rpg-tools/heavy.mjs npx vitest run src/engine/__tests__/volume.sim.test.ts
// 環境変数（どれも省略できる）:
//   VOL_SCEN=corruptionKing,frozenKingdom  シナリオ（既定: 全部）
//   VOL_PARTY=2,4                           人数（2 = 剣士・魔法使い、4 = ＋守護者・狩人）
//   VOL_SEEDS=4                             種の数（1001 から）
//   VOL_DIFF=normal                         難易度
//   VOL_STRAIGHT=0                          0 にすると、従来の bot（ダンジョンの前にレベル上げをする）で比べられる
//   VOL_OUT=screenshots/volume              書き出し先（.json = 生データ、.md = 表）
//
// 時間の見積もり: 操作1回あたりの秒数（下の SEC。カード6秒・移動5秒など）を全員分足した値。
// docs/tasks/play-feedback-plan.md（測り方）・冒険の長さの測定（pacing）と同じ式（ただし戦闘の操作の数え方を直した。unwrap を参照）。
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, it, vi } from 'vitest';
import type { GameCommand, GameState, Hero, PlayerId } from '../../types';

type Hook = (pre: GameState, cmd: GameCommand, post: GameState) => void;
const H: { hook?: Hook } = {};
vi.mock('../index', async (orig) => {
  const m = (await orig()) as typeof import('../index');
  return {
    ...m,
    applyGameCommand: (g: GameState, c: GameCommand) => {
      const r = m.applyGameCommand(g, c);
      H.hook?.(g, c, r.state);
      return r;
    },
  };
});

import { createGame } from '../index';
import { playToEnd } from '../bot';
import { DUNGEONS } from '../../data/dungeons';
import { BALANCE } from '../../data/balance';
import { SCENARIOS } from '../../data/scenarios';
import { expToNext } from '../game/hero';
import { heroPlace } from '../game/jobs';

/** 操作1回あたりの秒数（無い操作は4秒） */
export const SEC: Record<string, number> = { PLAY_CARD: 6, END_TURN: 2, ENEMY_STEP: 1.5, FINISH_BATTLE: 2, WORLD_ROLL_MOVE: 3, WORLD_MOVE: 5, WORLD_MOVE_AGREE: 2, WORLD_WAIT: 2, WORLD_INTERACT: 2, WORLD_INVITE: 3, WORLD_INVITE_ANSWER: 3, DUNGEON_STEP: 1.5, ENTER_ROOM: 2, EXPLORE_ROLL: 3, EXPLORE_END: 2, PICK_CARD: 8, CHOOSE_GROWTH: 8, FINISH_REWARD: 2, CLAIM_LOOT: 3, CHOOSE_EVENT: 10, FINISH_EVENT: 3, STORY_CONTINUE: 5, ENCOUNTER_CHOOSE: 3, ENCOUNTER_CONTINUE: 2, ENCOUNTER_JOIN: 2, OPEN_CHEST: 3, LEAVE_CHEST: 2 };

const RUN = !!process.env.VOL;
const OUT = process.env.VOL_OUT ?? 'screenshots/volume';
const SCEN = process.env.VOL_SCEN ? process.env.VOL_SCEN.split(',') : SCENARIOS.all.filter((s) => !s.wip).map((s) => s.id);
const SEEDS = Number(process.env.VOL_SEEDS ?? 4);
const DIFF = process.env.VOL_DIFF ?? 'normal';
const STRAIGHT = process.env.VOL_STRAIGHT !== '0';
const PARTIES: Record<string, string[]> = { '2': ['warrior', 'mage'], '4': ['warrior', 'mage', 'guardian', 'hunter'] };
const PS = (process.env.VOL_PARTY ?? '2,4').split(',');
/** 転職できる場所（基本→中位はどこでも、中位→最上位は町・祠・神殿） */
const ANY = ['map', 'town', 'shrine', 'temple', 'altar', 'rest', 'hub'];
const SACRED = ['town', 'shrine', 'temple'];
const jc = BALANCE.jobChange as { base: number; mid: number; special: number };
const LV = { mid: jc.base, top: jc.mid, special: jc.special };

// 包んだ操作（VOTE・SCENE・BATTLE）は中身の種類で数える。
// 注意: 以前の測定（pacing の pace2）は BATTLE を開けておらず、戦闘の操作がすべて「1回4秒」になっていた。
// VOL_OLDTIME=1 で、その古い数え方に戻せる（前の数字と比べる時だけ使う）。
const OLDTIME = process.env.VOL_OLDTIME === '1';
const unwrap = (c: GameCommand): { type: string } => {
  if ((c.type === 'VOTE' || c.type === 'SCENE') && c.command) return unwrap(c.command);
  if (c.type === 'BATTLE' && !OLDTIME) return c.command;
  return c;
};
const need = (tier: number, level: number) => Math.round((BALANCE.expBase + BALANCE.expPerLevel * (level - 1)) * BALANCE.tierExpMul ** tier * (tier > 0 && level === 1 ? BALANCE.firstLevelExpMul : 1));
function totalXp(h: Hero) {
  let t = h.exp;
  for (let l = 1; l < h.level; l++) t += expToNext(l, h.classId);
  return t;
}
const minutes = (byType: Record<string, number>) => Object.entries(byType).reduce((n, [k, v]) => n + v * (SEC[k] ?? 4), 0) / 60;

/** 節目（その時の分・ラウンド・戦闘・侵食度・制覇した鍵のダンジョンの数） */
interface Mark { min: number; round: number; battle: number; corr: number; keys: number }
interface Run {
  seed: number;
  end: string;
  stuck: boolean;
  /** 1つ目・2つ目・3つ目…の鍵のダンジョンを制覇した時 */
  keyClear: Mark[];
  finaleEnter?: Mark;
  /** 最終ダンジョンに入った回数（負けて出され、入り直した分も数える） */
  finaleTries: number;
  /** 最後に最終ダンジョンへ入った時 */
  finaleLast?: Mark;
  final: Mark;
  /** 最後までの操作の回数（種類ごと） */
  byType: Record<string, number>;
  /** キャラごとの「転職していたら」の時期（中位・特殊の Lv・最上位の Lv・最上位に転職できる場所に着いた時） */
  jobs: { mid?: Mark; special?: Mark; topLv?: Mark; top?: Mark }[];
}

function runOne(scen: string, classes: string[], seed: number): Run {
  const g0 = createGame({ seed, scenarioId: scen, difficulty: DIFF as never, party: classes.map((c, i) => ({ classId: c, gender: 'male', name: c + i, playerId: `P${i + 1}` as PlayerId })) });
  const byType: Record<string, number> = {};
  const keyClear: Mark[] = [];
  let finaleEnter: Mark | undefined;
  let finaleLast: Mark | undefined;
  let finaleTries = 0;
  const inFinale = (g: GameState) => [g.dungeon, ...(g.expeditions ?? []).map((x) => x.dungeon)].some((e) => e && DUNGEONS.get(e.dungeonId).finale);
  let lastWinRound = 0;
  const prev: Record<string, number> = {};
  const V: Record<string, { tier: number; level: number; exp: number; ev: Run['jobs'][number] }> = {};
  for (const h of g0.heroes) { prev[h.id] = 0; V[h.id] = { tier: 0, level: 1, exp: 0, ev: {} }; }
  const mark = (g: GameState): Mark => ({ min: minutes(byType), round: g.world?.worldTurn ?? 0, battle: g.stats.battlesWon, corr: g.world?.corruption ?? 0, keys: keyClear.length });
  H.hook = (pre, cmd, post) => {
    const u = unwrap(cmd);
    byType[u.type] = (byType[u.type] ?? 0) + 1;
    if (post.stats.battlesWon > pre.stats.battlesWon) lastWinRound = post.world?.worldTurn ?? 0;
    for (const d of post.clearedDungeons) {
      const def = DUNGEONS.get(d);
      if (!pre.clearedDungeons.includes(d) && !def.random && !def.finale) keyClear.push(mark(post));
    }
    if (inFinale(post) && !inFinale(pre)) {
      finaleTries++;
      finaleLast = mark(post);
      finaleEnter ??= finaleLast;
    }
    // 仮想の転職（bot は転職しないので、経験値から「転職していたら」の段とレベルを計算する）
    for (const h of post.heroes) {
      const t = totalXp(h);
      const d = Math.max(0, t - prev[h.id]);
      prev[h.id] = t;
      const v = V[h.id];
      v.exp += d;
      while (v.level < BALANCE.maxLevel && v.exp >= need(v.tier, v.level)) { v.exp -= need(v.tier, v.level); v.level++; }
      const place = heroPlace(post, h);
      if (v.tier === 0 && v.level >= LV.mid && ANY.includes(place)) {
        v.ev.mid = mark(post); v.tier = 1; v.level = 1; v.exp = Math.min(v.exp, need(1, 1) - 1);
      }
      if (v.tier === 1) {
        if (v.level >= LV.special && !v.ev.special) v.ev.special = mark(post);
        if (v.level >= LV.top && !v.ev.topLv) v.ev.topLv = mark(post);
        if (v.level >= LV.top && SACRED.includes(place) && !v.ev.top) v.ev.top = mark(post);
      }
    }
  };
  const { game } = playToEnd(g0, 60000, { straight: STRAIGHT });
  H.hook = undefined;
  const final = mark(game);
  const end = game.mode === 'ending' ? 'clear' : (game.world?.corruption ?? 0) >= 100 ? 'corr100' : game.mode;
  // 侵食度100で終わり、その前の長い間1度も勝てていない = bot が詰まった（遊びの長さの数には入れない）
  const stuck = end === 'corr100' && final.round - lastWinRound > 25;
  return { seed, end, stuck, keyClear, finaleEnter, finaleTries, finaleLast, final, byType, jobs: Object.values(V).map((v) => v.ev) };
}

// ----- 表にする -----
const avg = (xs: (number | undefined)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN; };
const med = (xs: (number | undefined)[]) => { const v = xs.filter((x): x is number => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor((v.length - 1) / 2)] : NaN; };
const f = (x: number, d = 0) => (Number.isNaN(x) ? '-' : x.toFixed(d));

export function table(all: Record<string, Record<string, Run[]>>): string {
  const L: string[] = [];
  L.push('### 節目までの時間（分。クリアした冒険の平均。かっこ内はその時の侵食度）', '');
  L.push('| シナリオ | 人数 | クリア率 | 鍵1つ目 | 鍵2つ目 | 鍵3つ目 | 最終ダンジョンに入る | 入った回数 | 最後に入った時 | クリア | ラウンド | 戦闘 | クリア時の侵食度 | 負け方 |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const [scen, byP] of Object.entries(all)) for (const [p, rs] of Object.entries(byP)) {
    const ok = rs.filter((r) => !r.stuck);
    const cl = ok.filter((r) => r.end === 'clear');
    const k = (i: number) => `${f(avg(cl.map((r) => r.keyClear[i]?.min)))}（${f(avg(cl.map((r) => r.keyClear[i]?.corr)))}%）`;
    const lose: Record<string, number> = {};
    for (const r of rs) if (r.end !== 'clear') lose[r.stuck ? '詰まり' : r.end === 'corr100' ? '侵食' : r.end] = (lose[r.stuck ? '詰まり' : r.end === 'corr100' ? '侵食' : r.end] ?? 0) + 1;
    L.push(`| ${scen} | ${p} | ${cl.length}/${ok.length}${ok.length < rs.length ? `（詰${rs.length - ok.length}）` : ''} | ${k(0)} | ${k(1)} | ${k(2)} | ${f(avg(cl.map((r) => r.finaleEnter?.min)))} | ${f(avg(cl.map((r) => r.finaleTries)), 1)} | ${f(avg(cl.map((r) => r.finaleLast?.min)))} | **${f(avg(cl.map((r) => r.final.min)))}** | ${f(avg(cl.map((r) => r.final.round)))} | ${f(avg(cl.map((r) => r.final.battle)))} | ${f(avg(cl.map((r) => r.final.corr)))}% | ${Object.entries(lose).map(([a, b]) => a + b).join('・') || '-'} |`);
  }
  L.push('', '### 転職できる段に届く時期（全キャラの中央値。「戦目」= 何戦目に勝った時か、「鍵」= その時に制覇していた鍵のダンジョンの数）', '');
  L.push(`| シナリオ | 人数 | 中位（基本 Lv${LV.mid}） | 特殊（中位 Lv${LV.special}） | 最上位の Lv（中位 Lv${LV.top}） | 最上位に転職できる場所に着く | 最上位に届いた人の割合 |`);
  L.push('|---|---|---|---|---|---|---|');
  const cell = (ms: (Mark | undefined)[]) => `${f(med(ms.map((m) => m?.battle)))}戦目・${f(med(ms.map((m) => m?.min)))}分・鍵${f(med(ms.map((m) => m?.keys)))}`;
  for (const [scen, byP] of Object.entries(all)) for (const [p, rs] of Object.entries(byP)) {
    const ev = rs.filter((r) => !r.stuck).flatMap((r) => r.jobs);
    L.push(`| ${scen} | ${p} | ${cell(ev.map((e) => e.mid))} | ${cell(ev.map((e) => e.special))} | ${cell(ev.map((e) => e.topLv))} | ${cell(ev.map((e) => e.top))} | ${ev.filter((e) => e.topLv).length}/${ev.length} |`);
  }
  // 全体（人数ごと）
  L.push('', '### 全体（人数ごと・クリアした冒険の平均）', '');
  L.push('| 人数 | クリア率 | 鍵1つ目 | 鍵2つ目 | 鍵3つ目 | 最終ダンジョンに入る | クリア | 戦闘 | 侵食度 | 中位 | 最上位の Lv |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const p of PS) {
    const rs = Object.values(all).flatMap((x) => x[p] ?? []).filter((r) => !r.stuck);
    const cl = rs.filter((r) => r.end === 'clear');
    const ev = rs.flatMap((r) => r.jobs);
    L.push(`| ${p} | ${cl.length}/${rs.length} | ${f(avg(cl.map((r) => r.keyClear[0]?.min)))} | ${f(avg(cl.map((r) => r.keyClear[1]?.min)))} | ${f(avg(cl.map((r) => r.keyClear[2]?.min)))} | ${f(avg(cl.map((r) => r.finaleEnter?.min)))} | **${f(avg(cl.map((r) => r.final.min)))}** | ${f(avg(cl.map((r) => r.final.battle)))} | ${f(avg(cl.map((r) => r.final.corr)))}% | ${cell(ev.map((e) => e.mid))} | ${cell(ev.map((e) => e.topLv))} |`);
  }
  // 時間の内訳（どの操作に時間がかかっているか。人の速さと比べる時の手がかり）
  L.push('', '### 時間の内訳（クリアした冒険の平均・分）', '');
  const GROUPS: Record<string, string[]> = {
    戦闘のカード: ['PLAY_CARD'],
    戦闘のそのほか: ['END_TURN', 'ENEMY_STEP', 'FINISH_BATTLE', 'ENCOUNTER_CHOOSE', 'ENCOUNTER_CONTINUE', 'ENCOUNTER_JOIN'],
    報酬・成長: ['PICK_CARD', 'CHOOSE_GROWTH', 'FINISH_REWARD', 'CLAIM_LOOT'],
    世界マップの移動: ['WORLD_ROLL_MOVE', 'WORLD_MOVE', 'WORLD_MOVE_AGREE', 'WORLD_WAIT', 'WORLD_INVITE', 'WORLD_INVITE_ANSWER', 'WORLD_INTERACT'],
    ダンジョンの歩き: ['DUNGEON_STEP', 'ENTER_ROOM', 'EXPLORE_ROLL', 'EXPLORE_ROLLER', 'EXPLORE_END'],
    イベント・話: ['CHOOSE_EVENT', 'FINISH_EVENT', 'STORY_CONTINUE'],
  };
  const known = new Set(Object.values(GROUPS).flat());
  L.push(`| 人数 | ${Object.keys(GROUPS).join(' | ')} | そのほか |`);
  L.push(`|---|${Object.keys(GROUPS).map(() => '---|').join('')}---|`);
  for (const p of PS) {
    const cl = Object.values(all).flatMap((x) => x[p] ?? []).filter((r) => r.end === 'clear' && r.byType);
    const part = (keys: string[] | null) => avg(cl.map((r) => Object.entries(r.byType).filter(([k]) => (keys ? keys.includes(k) : !known.has(k))).reduce((n, [k, v]) => n + v * (SEC[k] ?? 4), 0) / 60));
    L.push(`| ${p} | ${Object.values(GROUPS).map((k) => f(part(k))).join(' | ')} | ${f(part(null))} |`);
  }
  return L.join('\n');
}

describe.skipIf(!RUN)(`遊びの長さの測定（${STRAIGHT ? 'まっすぐ' : '従来の bot'}・${DIFF}・${SEEDS}種）`, () => {
  it('測定', () => {
    mkdirSync(dirname(OUT), { recursive: true });
    const all: Record<string, Record<string, Run[]>> = {};
    const t0 = Date.now();
    for (const scen of SCEN) {
      all[scen] = {};
      for (const p of PS) {
        const rs: Run[] = [];
        for (let s = 1; s <= SEEDS; s++) rs.push(runOne(scen, PARTIES[p], 1000 + s));
        all[scen][p] = rs;
        // 途中でも結果が残るように、1組ごとに書き出す
        writeFileSync(`${OUT}.json`, JSON.stringify({ straight: STRAIGHT, diff: DIFF, seeds: SEEDS, lv: LV, all }));
        writeFileSync(`${OUT}.md`, `${STRAIGHT ? 'まっすぐ進む bot' : '従来の bot'}・${DIFF}・種${SEEDS}個（1001〜）・${((Date.now() - t0) / 1000).toFixed(0)}秒\n\n${table(all)}\n`);
      }
    }
  }, 86_400_000);
});
