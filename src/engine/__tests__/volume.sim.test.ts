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
//   VOL_RATES=turn=0,dturn=0,relay=0,enter=0,clear=0   侵食度の量を差し替える（BALANCE の corruptionPerTurn・corruptionPerDungeonTurn・
//                                           corruptionPerRelayMove・corruptionOnDungeonEnter・corruptionOnKeyDungeonClear）。全部0にすると、
//                                           侵食度で終わらない時の「番の数・交代運転・入った回数」を数えられる（侵食度の設計用）
//
// 時間の見積もり: 操作1回あたりの秒数（下の SEC。カード6秒・移動5秒など）を全員分足した値。
// docs/archive/tasks/play-feedback-plan.md（測り方）・冒険の長さの測定（pacing）と同じ式（ただし戦闘の操作の数え方を直した。unwrap を参照）。
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
import { getDifficulty } from '../../data/rules';
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
const RATE_KEYS: Record<string, string> = { turn: 'corruptionPerTurn', dturn: 'corruptionPerDungeonTurn', relay: 'corruptionPerRelayMove', enter: 'corruptionOnDungeonEnter', clear: 'corruptionOnKeyDungeonClear' };
for (const kv of (process.env.VOL_RATES ?? '').split(',').filter(Boolean)) {
  const [k, v] = kv.split('=');
  (BALANCE as unknown as Record<string, number>)[RATE_KEYS[k] ?? k] = Number(v);
}

// VOL_SET=depthBonus.rowsPerStep=2,breakPower=0.5  BALANCE の値を差し替える（点でつないだ道。値は数か JSON。合わせ込みの試し用）
for (const kv of (process.env.VOL_SET ?? '').split(';').filter(Boolean)) {
  const at = kv.indexOf('=');
  const path = kv.slice(0, at).split('.');
  let o = BALANCE as unknown as Record<string, unknown>;
  for (const k of path.slice(0, -1)) o = o[k] as Record<string, unknown>;
  o[path[path.length - 1]] = JSON.parse(kv.slice(at + 1));
}
// VOL_DIFF_SET=enemyHp=1.7;enemyAttack=1.7  測る難易度のデータの値を差し替える（合わせ込みの試し用）
for (const kv of (process.env.VOL_DIFF_SET ?? '').split(';').filter(Boolean)) {
  const [k, v] = kv.split('=');
  (getDifficulty(DIFF) as unknown as Record<string, number>)[k] = Number(v);
}

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
  /** 侵食度の元の回数: 世界マップの番・全員ダンジョンの中の番・交代運転・ダンジョンに入った・鍵のダンジョンの制覇 */
  counts: { turnsMap: number; turnsDungeon: number; relays: number; enters: number; clears: number };
  /** 最後までの操作の回数（種類ごと） */
  byType: Record<string, number>;
  /** 戦闘の量（抜本的な見直し §6）: 始まった戦闘の数・終わった戦闘のラウンドの合計・ダンジョンごとに入った回数 */
  fights: { started: number; finished: number; rounds: number };
  entered: Record<string, number>;
  /** ダンジョンに初めて入った時の、生きているキャラの平均レベル（敵の強さの合わせ込み用） */
  enterLv: Record<string, number>;
  /** ダンジョンごとの戦闘の負け（全滅）の数 */
  lostIn: Record<string, number>;
  /** ダンジョンを制覇した時、それが何回目に入った時だったか（1 = 最初の挑戦で制覇） */
  clearTry: Record<string, number>;
  /** どこで終わったか（鍵1の前／鍵1の中／…／最後の中／クリア） */
  where: string;
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
  const counts = { turnsMap: 0, turnsDungeon: 0, relays: 0, enters: 0, clears: 0 };
  const fights = { started: 0, finished: 0, rounds: 0 };
  const entered: Record<string, number> = {};
  const enterLv: Record<string, number> = {};
  const lostIn: Record<string, number> = {};
  const clearTry: Record<string, number> = {};
  // 今の戦闘（世界マップの場面と、ダンジョンの場面ごと）
  const battlesOf = (g: GameState) => [g.battle, ...(g.expeditions ?? []).map((x) => x.battle)].filter((b): b is NonNullable<GameState['battle']> => !!b);
  const dungeonsOf = (g: GameState) => [g.dungeon, ...(g.expeditions ?? []).map((x) => x.dungeon)].filter((d): d is NonNullable<GameState['dungeon']> => !!d);
  const inside = (g: GameState) => (g.expeditions ?? []).flatMap((x) => x.heroes);
  const mark = (g: GameState): Mark => ({ min: minutes(byType), round: g.world?.worldTurn ?? 0, battle: g.stats.battlesWon, corr: g.world?.corruption ?? 0, keys: keyClear.length });
  H.hook = (pre, cmd, post) => {
    const u = unwrap(cmd);
    byType[u.type] = (byType[u.type] ?? 0) + 1;
    if (post.stats.battlesWon > pre.stats.battlesWon) lastWinRound = post.world?.worldTurn ?? 0;
    // 戦闘の数とラウンド: 戦闘が増えたら「始まった」、減ったら「終わった」（終わった戦闘のターンの数を足す。勝ち・負け・逃げを全部数える）
    const b0 = battlesOf(pre);
    const b1 = battlesOf(post);
    if (b1.length > b0.length) fights.started += b1.length - b0.length;
    if (b1.length < b0.length) {
      fights.finished += b0.length - b1.length;
      // 終わった戦闘 = 前にあって今は無い物。1回の操作で終わるのは1つなので、ターンの合計の差で数える
      fights.rounds += b0.reduce((n, b) => n + b.turn, 0) - b1.reduce((n, b) => n + b.turn, 0);
    }
    const d0 = dungeonsOf(pre).length;
    const ds = dungeonsOf(post);
    if (ds.length > d0) for (const d of ds.slice(d0)) {
      entered[d.dungeonId] = (entered[d.dungeonId] ?? 0) + 1;
      const living = post.heroes.filter((h) => !h.retired && h.hp > 0);
      enterLv[d.dungeonId] ??= living.reduce((n, h) => n + h.level, 0) / Math.max(1, living.length);
    }
    // 負けた戦闘（どのダンジョンの中か）
    if (u.type === 'FINISH_BATTLE') for (const b of b0) if (b.phase === 'defeat') {
      const d = dungeonsOf(pre)[0]?.dungeonId ?? 'world';
      lostIn[d] = (lostIn[d] ?? 0) + 1;
    }
    if (pre.world && post.world) {
      if (post.world.worldTurn > pre.world.worldTurn) {
        const living = post.heroes.filter((h) => !h.retired && h.hp > 0);
        const ins = inside(pre);
        if (living.some((h) => ins.includes(h.id))) counts.turnsDungeon++;
        else counts.turnsMap++;
      }
      if ((post.world.relayCharged?.length ?? 0) > (pre.world.relayCharged?.length ?? 0)) counts.relays++;
      if ((post.expeditions?.length ?? 0) > (pre.expeditions?.length ?? 0)) counts.enters++;
    }
    for (const d of post.clearedDungeons) {
      const def = DUNGEONS.get(d);
      if (!pre.clearedDungeons.includes(d)) clearTry[d] = entered[d] ?? 1;
      if (!pre.clearedDungeons.includes(d) && !def.random && !def.finale) { keyClear.push(mark(post)); counts.clears++; }
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
  // どこで終わったか: 次に目指していたダンジョン（鍵の順・最後）に、1回でも入っていれば「中」、入っていなければ「前」
  const keyed = DUNGEONS.forScenario(scen).filter((d) => d.rewardKey && !d.random).sort((a, b) => a.baseLevel - b.baseLevel);
  const finale = DUNGEONS.forScenario(scen).find((d) => d.finale)!;
  const nextAt = keyed.findIndex((d) => !game.clearedDungeons.includes(d.id));
  const target = nextAt < 0 ? finale : keyed[nextAt];
  const where = end === 'clear' ? 'クリア' : `${nextAt < 0 ? '最後' : `鍵${nextAt + 1}`}の${entered[target.id] ? '中' : '前'}`;
  return { seed, end, stuck, keyClear, finaleEnter, finaleTries, finaleLast, final, counts, byType, fights, entered, enterLv, lostIn, clearTry, where, jobs: Object.values(V).map((v) => v.ev) };
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
  // 戦闘の量と、どこで終わったか（抜本的な見直し §6。クリアしなかった冒険も入れる）
  const WHERE = ['鍵1の前', '鍵1の中', '鍵2の前', '鍵2の中', '鍵3の前', '鍵3の中', '最後の前', '最後の中', 'クリア'];
  L.push('', '### 戦闘の量と、どこで終わったか（全部の冒険。戦闘の数 = 始まった戦闘。ラウンド = 終わった戦闘のターンの合計。平均は1冒険あたり）', '');
  L.push(`| シナリオ | 人数 | 戦闘の数 | ラウンドの合計 | 1戦あたりの平均ラウンド | クリアした冒険の戦闘の数 | 鍵1の制覇 | 鍵2の制覇 | 鍵3の制覇 | ${WHERE.join(' | ')} |`);
  L.push(`|---|---|---|---|---|---|---|---|---|${WHERE.map(() => '---|').join('')}`);
  const fightRow = (name: string, p: string, rs: Run[]) => {
    const withF = rs.filter((r) => r.fights);
    const rounds = withF.reduce((n, r) => n + r.fights.rounds, 0);
    const done = withF.reduce((n, r) => n + r.fights.finished, 0);
    const cl = withF.filter((r) => r.end === 'clear');
    const keyRate = (i: number) => `${rs.filter((r) => r.keyClear.length > i).length}/${rs.length}`;
    L.push(`| ${name} | ${p} | ${f(avg(withF.map((r) => r.fights.started)), 1)} | ${f(avg(withF.map((r) => r.fights.rounds)), 1)} | ${f(done ? rounds / done : NaN, 2)} | ${f(avg(cl.map((r) => r.fights.started)), 1)} | ${keyRate(0)} | ${keyRate(1)} | ${keyRate(2)} | ${WHERE.map((w) => rs.filter((r) => r.where === w).length || '').join(' | ')} |`);
  };
  for (const [scen, byP] of Object.entries(all)) for (const [p, rs] of Object.entries(byP)) fightRow(scen, p, rs);
  for (const p of PS) fightRow('**全体**', p, Object.values(all).flatMap((x) => x[p] ?? []));
  L.push('', '### 侵食度の元の回数（クリアした冒険の平均。侵食度の設計用）', '');
  L.push('| 人数 | 世界マップの番 | ダンジョンの中の番 | 交代運転 | ダンジョンに入る | 鍵の制覇 | 最後の侵食度 |');
  L.push('|---|---|---|---|---|---|---|');
  for (const p of PS) {
    const cl = Object.values(all).flatMap((x) => x[p] ?? []).filter((r) => r.end === 'clear' && r.counts);
    const c = (k: keyof Run['counts']) => f(avg(cl.map((r) => r.counts[k])), 1);
    L.push(`| ${p} | ${c('turnsMap')} | ${c('turnsDungeon')} | ${c('relays')} | ${c('enters')} | ${c('clears')} | ${f(avg(cl.map((r) => r.final.corr)), 1)}% |`);
  }
  // 時間の内訳（どの操作に時間がかかっているか。人の速さと比べる時の手がかり）
  L.push('', '### 時間の内訳（クリアした冒険の平均・分）', '');
  const GROUPS: Record<string, string[]> = {
    戦闘のカード: ['PLAY_CARD'],
    戦闘のそのほか: ['END_TURN', 'ENEMY_STEP', 'FINISH_BATTLE', 'ENCOUNTER_CHOOSE', 'ENCOUNTER_CONTINUE', 'ENCOUNTER_JOIN'],
    報酬・成長: ['PICK_CARD', 'CHOOSE_GROWTH', 'FINISH_REWARD', 'CLAIM_LOOT'],
    世界マップの移動: ['WORLD_ROLL_MOVE', 'WORLD_MOVE', 'WORLD_MOVE_AGREE', 'WORLD_WAIT', 'WORLD_INVITE', 'WORLD_INVITE_ANSWER', 'WORLD_INTERACT'],
    ダンジョンの歩き: ['DUNGEON_STEP', 'ENTER_ROOM', 'DUNGEON_SCOUT'],
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
