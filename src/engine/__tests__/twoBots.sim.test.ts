// ===== 釣り合いの物差し2本（計画書 第2版 §5-3）: 直行 bot と 工夫する bot を、同じ種・同じ人数・同じ難易度で比べる =====
// 時間がかかるので、普段のテストでは動かさない。数値は変えない（測るだけ）。
// 使い方（重いので heavy.mjs を通す）:
//   SIM=1 SIM_SEEDS=40 SIM_DIFF=normal node C:/dev/card-rpg-tools/heavy.mjs npx vitest run src/engine/__tests__/twoBots.sim.test.ts
// 環境変数（どれも省略できる）: SIM_SEEDS（種の数。1001 から。既定40）・SIM_DIFF（既定 normal）・SIM_PARTY（2人 / 3人 / 4人。既定は全部）・
//   SIM_SCENARIO（既定 corruptionKing）・SIM_OUT（既定 screenshots/balance-two-bots.md）・
//   SIM_CLEVER_OFF（工夫する bot から外す工夫。battle,job,detour,hone をカンマで。どの工夫が効いているかを確かめる用）
// パーティは balance.sim と同じ（1人のプレイヤーが全員を動かす。剣士・魔法使い ＋ 狩人 ＋ 守護者）
// 回4（難しさの測定）で足した環境変数:
//   SIM_VARIANT（a / b / c。このテストの中だけで BALANCE の値を差し替える。省略 = 今のまま）
//     a = 合計ダメージで BREAK の線: ボス・中ボス・災厄 30% / 強敵 25% / ふつう 20%
//     b = ボス・中ボス・災厄は合計ダメージでは BREAK しない（弱点か完全成功だけ）
//     c = a ＋ 沼より後の地域（世界マップの並びで、沼の地域より魔王城の側）の敵のHP +15%（SIM_LATE_HP=1.3 などで倍率を変えられる）
//   SIM_PARTYSET（phys = 2人を 剣士＋狩人 / magic = 2人を 魔法使い＋僧侶。省略 = 上のパーティ）
// 賢い bot（3段目。botSmart.ts）で足した環境変数:
//   SIM_BOTS（流す bot をカンマで。straight,clever,smart。既定は3本とも）
//   SIM_SMART_OFF（賢い bot から外す工夫。shop,cards,items,team,time をカンマで）
//   SIM_PARTYSET に ws = 2人を 剣士＋僧侶 / mx = 2人を 魔法使い＋召喚士（回復を持たない魔法の基本職）を足した
// つまみの測定（2026-11-13）で足した環境変数:
//   SIM_KNOBS（B1〜B4・H1〜H4・A1・A2・C1・C2・G1 をカンマで。下の KNOB_ALIAS の所に説明）・SIM_JSON（集計用の要約の書き出し先）・
//   SIM_PARTY をカンマで複数書けるようにした（例: 2人,4人）
// つまみの測定2（2026-11-13）で足した SIM_KNOBS: BA（ア）= B3 は大物だけ / BI（イ）= B3 ＋ 弱点を突けるカードが無い味方は完全成功で崩せる /
//   BE（エ）= B3 ＋ 枠3以上かフォーカス2以上の完全成功でも崩れる（BE4/3 のように 枠/フォーカス を書ける）。SIM_JSON に出会った敵（foes）を足した
// 部屋の連続の直し（2026-11-13）で SIM_JSON に足した数: クリアした冒険の戦闘の数・固定／ランダムダンジョンの中の戦闘の数・終わった時の平均レベル・転職の数
// 敵の特殊な行動の直し（2026-11-13）で足した数: 特殊な行動（7種類）が、予告された・実際に行われた・BREAK で止められた回数（種類ごと・1冒険の平均）。
//   テストの側で数える（エンジンの結果は変えない）。どの行動が特殊な行動かは、行動の効果の種類で見分ける（直す前と後で同じ見分け方）
// 部屋の並びの直し・2回目（2026-11-13）で足した環境変数: SIM_PARTYSET=heal4（4人を 剣士＋魔法使い＋狩人＋僧侶）・
//   SIM_LAYOUTS（手作りのダンジョンの並びを、JSON の物に差し替える。直す前の並びで測る用）
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { BattleEvent, EnemyActionDef, GameCommand, GameState, PlayerId } from '../../types';
import { getEnemyAction } from '../../data/enemies';

type Hook = (pre: GameState, cmd: GameCommand, post: GameState, events: BattleEvent[]) => void;
const H: { hook?: Hook } = {};
vi.mock('../index', async (orig) => {
  const m = (await orig()) as typeof import('../index');
  return {
    ...m,
    applyGameCommand: (g: GameState, c: GameCommand) => {
      const r = m.applyGameCommand(g, c);
      if (!r.error) H.hook?.(g, c, r.state, r.battleEvents ?? []);
      return r;
    },
  };
});

import { createGame, aliveScourges, isRandomDungeonTile } from '../index';
import { playToEnd } from '../bot';
import type { CleverPart } from '../botClever';
import type { SmartPart } from '../botSmart';
import { DUNGEONS } from '../../data/dungeons';
import { getDifficulty } from '../../data/rules';
import { BALANCE } from '../../data/balance';
import { getScenario } from '../../data/scenarios';

const SCENARIO = process.env.SIM_SCENARIO ?? 'corruptionKing';
const SEEDS = Number(process.env.SIM_SEEDS ?? 40);
const DIFF = process.env.SIM_DIFF ?? 'normal';
const OUT = process.env.SIM_OUT ?? 'screenshots/balance-two-bots.md';
const PARTYSET = process.env.SIM_PARTYSET ?? '';
const PARTIES: Record<string, string[]> =
  PARTYSET === 'phys' ? { '2人': ['warrior', 'hunter'] }
  : PARTYSET === 'magic' ? { '2人': ['mage', 'priest'] }
  : PARTYSET === 'ws' ? { '2人': ['warrior', 'priest'] }
  : PARTYSET === 'mx' ? { '2人': ['mage', 'summoner'] }
  // 部屋の並びの直し・2回目（2026-11-13）: 回復役入りの4人
  : PARTYSET === 'heal4' ? { '4人': ['warrior', 'mage', 'hunter', 'priest'] }
  : {
    '2人': ['warrior', 'mage'],
    '3人': ['warrior', 'mage', 'hunter'],
    '4人': ['warrior', 'mage', 'guardian', 'hunter'],
  };

// ---- 部屋の並びの直し・2回目（2026-11-13）: SIM_LAYOUTS = 並びの JSON の場所（{ ダンジョンのID: layout }。scripts/room-layout-stats.mjs の
//   loadLayouts で作る）。このテストの中だけで手作りのダンジョンの並びを差し替える（直す前と後を、同じコードで比べる用）----
if (process.env.SIM_LAYOUTS) {
  const layouts = JSON.parse(readFileSync(process.env.SIM_LAYOUTS, 'utf8')) as Record<string, unknown>;
  for (const [id, layout] of Object.entries(layouts)) (DUNGEONS.get(id) as { layout?: unknown }).layout = layout;
}
// ---- 回4: 測る候補の差し替え（このテストの中だけ。本番のコードは環境変数を読まない）----
const VARIANT = process.env.SIM_VARIANT ?? '';
const MAP_REGIONS = getScenario(SCENARIO).map?.regions ?? [];
/** 沼より後の地域: 地図の regions は上（魔王城）から下（はじまりの平原）の順なので、沼より前に書いてある地域 */
/** (c) の HP の倍率（SIM_LATE_HP で変えられる。既定 1.15 = +15%） */
const LATE_HP = Number(process.env.SIM_LATE_HP ?? 1.15);
const LATE_REGIONS = MAP_REGIONS.slice(0, Math.max(0, MAP_REGIONS.findIndex((r) => r.id === 'swamp'))).map((r) => r.id);
{
  const B = BALANCE as unknown as { breakDamagePctByRank: Record<string, number>; enemyHpByRegion: Record<string, number> };
  if (VARIANT === 'a' || VARIANT === 'c') B.breakDamagePctByRank = { boss: 30, midboss: 30, elite: 25 };
  if (VARIANT === 'b') B.breakDamagePctByRank = { boss: Infinity, midboss: Infinity };
  if (VARIANT === 'c') B.enemyHpByRegion = Object.fromEntries(LATE_REGIONS.map((id) => [id, LATE_HP]));
}
// ---- つまみの測定（2026-11-13）: SIM_KNOBS にカンマで並べる（例: SIM_KNOBS=B1,H3）。このテストの中だけで BALANCE の値を差し替える ----
//   B1 = ボス・中ボス・災厄は完全成功だけでは崩れない / B2 = 全部の敵で完全成功だけでは崩れない /
//   B3 = 弱点の属性で、しかも完全成功の時だけ崩れる（弱点の無い敵は完全成功だけで崩れる。合計ダメージでは崩れない） /
//   B4 = 崩した時の効果を「威力半分＋脆弱1」（弱体は付けない・ブロックは0にしない）
//   H1・H2 = 3つ目の地域より後（シナリオ1なら 沼・火山・魔王城の荒野）の敵のHP ×1.25・×1.5（HL1.75 のように倍率も書ける）
//   H3・H4 = ボス・中ボス・災厄だけ HP ×1.5・×2（HB2.5 のように書ける）
//   A1・A2 = 3つ目の地域より後の敵の攻撃 ×1.25・×1.5（AL1.75 のように書ける）
//   C1・C2 = 侵食度の伸び（ワールドターンごと・ダンジョンの中のターンごと）×1.25・×1.5（C1.75 のように書ける）
//   G1 = 稼いだお金 ×0.5（G0.3 のように書ける）
const KNOB_ALIAS: Record<string, string> = { H1: 'HL1.25', H2: 'HL1.5', H3: 'HB1.5', H4: 'HB2', A1: 'AL1.25', A2: 'AL1.5', C1: 'C1.25', C2: 'C1.5', G1: 'G0.5' };
const KNOBS = (process.env.SIM_KNOBS ?? '').split(',').map((k) => k.trim()).filter(Boolean);
/** 3つ目の地域より後: 地図の regions は上（最後の地域）から下（始まりの地域）の順なので、下の2つ（始まりの地域と2つ目）を除いた物 */
const LATE3_REGIONS = MAP_REGIONS.slice(0, Math.max(0, MAP_REGIONS.length - 2)).map((r) => r.id);
const KNOB_TEXT: string[] = [];
{
  const B = BALANCE as unknown as Record<string, unknown>;
  const ranksAll = { boss: false, midboss: false, elite: false, normal: false };
  for (const raw of KNOBS) {
    const k = KNOB_ALIAS[raw] ?? raw;
    const num = (p: string) => {
      const x = Number(k.slice(p.length));
      if (!Number.isFinite(x) || x <= 0) throw new Error(`つまみの倍率が読めない: ${raw}`);
      return x;
    };
    if (k === 'B1') { B.breakPerfectByRank = { boss: false, midboss: false }; KNOB_TEXT.push('B1 ボス・中ボス・災厄は完全成功だけでは崩れない'); }
    else if (k === 'B2') { B.breakPerfectByRank = ranksAll; KNOB_TEXT.push('B2 全部の敵で完全成功だけでは崩れない'); }
    else if (k === 'B3') {
      B.breakNeedsWeakPerfect = true;
      KNOB_TEXT.push('B3 弱点の属性で、しかも完全成功の時だけ崩れる（弱点の無い敵は完全成功で崩れる・合計ダメージでは崩れない）');
    } else if (k === 'BA') {
      // つまみの測定2（ア）: B3 を大物（ボス・中ボス・災厄）だけに当てる。強敵・ふつうの敵は今の決まりのまま
      B.breakNeedsWeakPerfect = true;
      B.breakNeedsWeakPerfectRanks = ['boss', 'midboss'];
      KNOB_TEXT.push('BA（ア）B3 は大物だけ（強敵・ふつうの敵は今のまま）');
    } else if (k === 'BI') {
      // つまみの測定2（イ）: B3 ＋ 弱点を突けるカードを1枚も持たない味方は、完全成功で崩せる
      B.breakNeedsWeakPerfect = true;
      B.breakPerfectNoWeakCard = true;
      KNOB_TEXT.push('BI（イ）B3 ＋ 弱点を突けるカードが手札・山札・捨て札に無い味方は、完全成功で崩せる');
    } else if (k.startsWith('BE')) {
      // つまみの測定2（エ）: B3 ＋ 重い一撃の完全成功でも崩れる（BE = 枠3以上かフォーカス2以上。BE4/3 のように 枠/フォーカス を書ける）
      const [s, fo] = k === 'BE' ? [3, 2] : k.slice(2).split('/').map(Number);
      if (!(s > 0) || !(fo > 0)) throw new Error(`つまみの倍率が読めない: ${raw}`);
      B.breakNeedsWeakPerfect = true;
      B.breakPerfectHeavy = { slots: s, focus: fo };
      KNOB_TEXT.push(`${raw}（エ）B3 ＋ 枠${s}以上のカードか、フォーカス${fo}以上を使った攻撃の完全成功でも崩れる`);
    } else if (k === 'B4') { B.breakStatus = 'vulnerable'; B.breakClearsBlock = false; KNOB_TEXT.push('B4 崩した時の効果 = 威力半分＋脆弱1（弱体なし・ブロックは残る）'); }
    else if (k.startsWith('HL')) { B.enemyHpByRegion = Object.fromEntries(LATE3_REGIONS.map((id) => [id, num('HL')])); KNOB_TEXT.push(`${raw} ${LATE3_REGIONS.join('・')}の敵のHP ×${num('HL')}`); }
    else if (k.startsWith('HB')) { B.enemyHpByRank = { boss: num('HB'), midboss: num('HB') }; KNOB_TEXT.push(`${raw} ボス・中ボス・災厄のHP ×${num('HB')}`); }
    else if (k.startsWith('AL')) { B.enemyAttackByRegion = Object.fromEntries(LATE3_REGIONS.map((id) => [id, num('AL')])); KNOB_TEXT.push(`${raw} ${LATE3_REGIONS.join('・')}の敵の攻撃 ×${num('AL')}`); }
    else if (k.startsWith('C')) {
      B.corruptionPerTurn = (B.corruptionPerTurn as number) * num('C');
      B.corruptionPerDungeonTurn = (B.corruptionPerDungeonTurn as number) * num('C');
      KNOB_TEXT.push(`${raw} 侵食度の伸び ×${num('C')}（ターンごと ${B.corruptionPerTurn}・ダンジョンの中 ${B.corruptionPerDungeonTurn}）`);
    } else if (k.startsWith('G')) { B.goldGainMul = num('G'); KNOB_TEXT.push(`${raw} 稼いだお金 ×${num('G')}`); }
    else throw new Error(`知らないつまみ: ${raw}`);
  }
  // B3 の仲間（B3・BA・BI・BE）: 決まりを当てる格では、合計ダメージでは崩れない（前の B3 と同じ。BA は大物だけ）
  if (B.breakNeedsWeakPerfect) {
    const ranks = (B.breakNeedsWeakPerfectRanks as string[] | undefined) ?? ['boss', 'midboss', 'elite', 'normal'];
    B.breakDamagePctByRank = Object.fromEntries(ranks.map((r) => [r, Infinity]));
  }
}
const VARIANT_TEXT: Record<string, string> = {
  '': KNOB_TEXT.length ? `つまみ ${KNOB_TEXT.join(' / ')}` : '今のまま',
  a: '(a) 合計ダメージで BREAK の線: ボス・中ボス・災厄 30%・強敵 25%・ふつう 20%',
  b: '(b) ボス・中ボス・災厄は合計ダメージでは BREAK しない',
  c: `(c) (a) ＋ 沼より後の地域（${LATE_REGIONS.join('・')}）の敵のHP +${Math.round((LATE_HP - 1) * 100)}%`,
};
/** 計画書 §5-3 の目標（ふつう・提案）。工夫する bot のクリア率の目標は人数で変わる（3人は書いていないので 2人と4人の間で見る） */
const OFF = (process.env.SIM_CLEVER_OFF ?? '').split(',').filter(Boolean) as CleverPart[];
const SMART_OFF = (process.env.SIM_SMART_OFF ?? '').split(',').filter(Boolean) as SmartPart[];
type BotKind = 'straight' | 'clever' | 'smart';
const BOTS = (process.env.SIM_BOTS ?? 'straight,clever,smart').split(',').filter(Boolean) as BotKind[];
const TARGET: Record<string, string> = { '2人': '35〜50%', '3人': '（目標なし。2人と4人の間）', '4人': '30〜45%' };

/** 敵の特殊な行動（7種類）。効果の種類で見分ける */
const SPECIALS = { punish: '手数読み', guard: 'かばう', healSeal: '癒し封じ', call: '増援', hunt: '手負い狙い', shatter: '盾砕き', purify: '浄化' } as const;
type SpecialKind = keyof typeof SPECIALS;
function specialOf(a: EnemyActionDef): SpecialKind | undefined {
  for (const e of a.effects) {
    if (e.kind === 'punishPlays') return 'punish';
    if (e.kind === 'guardAllies') return 'guard';
    if (e.kind === 'purify') return 'purify';
    if (e.kind === 'summonEnemy' && e.call) return 'call';
    if (e.kind === 'shieldBreak') return 'shatter';
    if (e.kind === 'applyStatus' && e.status === 'healSeal') return 'healSeal';
    if (e.kind === 'damage' && e.lowHpMul) return 'hunt';
  }
  return undefined;
}
type SpecialCount = Record<SpecialKind, { said: number; done: number; broke: number }>;
const emptySpecials = (): SpecialCount => Object.fromEntries(Object.keys(SPECIALS).map((k) => [k, { said: 0, done: 0, broke: 0 }])) as SpecialCount;

const WHERE = ['鍵1の前', '鍵1の中', '鍵2の前', '鍵2の中', '鍵3の前', '鍵3の中', '最後の前', '最後の中'] as const;

interface Run {
  clear: boolean;
  corr100: boolean;
  where: string;
  /** 始まった戦闘の数・終わった戦闘のラウンド（ターン）の合計と数 */
  fights: number;
  rounds: number;
  finished: number;
  /** 工夫が使われた数: BREAK・ランダムダンジョンに入った・踏破した・災厄を倒した・転職・技を磨いた */
  breaks: number;
  randomIn: number;
  randomDone: number;
  scourgeKills: number;
  jobChanges: number;
  hones: number;
  errors: number;
  /** 回4: ボス・中ボス・災厄との戦闘（終わった数・ラウンドの合計）・BREAK の理由ごとの数・ボス・中ボス・災厄の戦闘での BREAK・クリアした時のワールドターンと侵食度・全滅 */
  bigFinished: number;
  bigRounds: number;
  breakWhy: Record<'weak' | 'perfect' | 'damage', number>;
  bigBreaks: number;
  worldTurn: number;
  corruption: number;
  wiped: boolean;
  endMode: string;
  /** 地域（とダンジョン）ごとの、始まった戦闘の数（どこに HP の倍率が掛かったかの確かめ） */
  where2: Record<string, number>;
  /** 賢い bot の工夫が使われた数: 買った（町・行商人）・売った・付け替えた・使った消耗品（戦闘の中・外）・削ったカード（町・イベント）・取らなかったカード報酬・断られた操作 */
  bought: number;
  sold: number;
  equips: number;
  itemsBattle: number;
  itemsField: number;
  removed: number;
  skipped: number;
  refused: number;
  /** つまみの測定: 終わった時の1人あたりの所持金 */
  goldEnd: number;
  /** 部屋の連続の直し（2026-11-13）: 固定のダンジョンの中・ランダムダンジョンの中で始まった戦闘の数・終わった時のパーティの平均レベル */
  fixedDungeonFights: number;
  randomDungeonFights: number;
  levelEnd: number;
  /** 敵の特殊な行動の直し: 種類ごとの、予告された・実際に行われた・BREAK で止められた（崩された）回数 */
  sp: SpecialCount;
  /** つまみの測定2: 戦闘の始めにいた敵（敵の種類 → 出た戦闘の数）。シナリオ1で本当に出会う敵を洗い出す用 */
  foes: Record<string, number>;
}

/** ボスの部屋・中ボスの部屋・災厄（災厄の戦闘は中ボスの印を持つ）の戦闘か */
const isBig = (b: NonNullable<GameState['battle']>) => !!b.boss || !!b.midboss;

function runOne(classes: string[], seed: number, bot: BotKind): Run {
  const g0 = createGame({ seed, scenarioId: SCENARIO, difficulty: DIFF as never, party: classes.map((c, i) => ({ classId: c, gender: 'male', name: c + i, playerId: 'P1' as PlayerId })) });
  const battlesOf = (g: GameState) => [g.battle, ...(g.expeditions ?? []).map((x) => x.battle)].filter((b): b is NonNullable<GameState['battle']> => !!b);
  const scenesOf = (g: GameState) => [{ battle: g.battle, battleInfo: g.battleInfo, dungeon: g.dungeon, party: g.party }, ...(g.expeditions ?? []).map((x) => ({ battle: x.battle, battleInfo: x.battleInfo, dungeon: x.dungeon, party: x.heroes }))];
  const dungeonsOf = (g: GameState) => [g.dungeon, ...(g.expeditions ?? []).map((x) => x.dungeon)].filter((d): d is NonNullable<GameState['dungeon']> => !!d);
  const r: Run = { clear: false, corr100: false, where: '', fights: 0, rounds: 0, finished: 0, breaks: 0, randomIn: 0, randomDone: 0, scourgeKills: 0, jobChanges: 0, hones: 0, errors: 0,
    bigFinished: 0, bigRounds: 0, breakWhy: { weak: 0, perfect: 0, damage: 0 }, bigBreaks: 0, worldTurn: 0, corruption: 0, wiped: false, endMode: '', where2: {},
    bought: 0, sold: 0, equips: 0, itemsBattle: 0, itemsField: 0, removed: 0, skipped: 0, refused: 0, goldEnd: 0,
    fixedDungeonFights: 0, randomDungeonFights: 0, levelEnd: 0, sp: emptySpecials(), foes: {} };
  const entered = new Set<string>();
  /** 予告を数えた印（戦闘の種:敵:ターン。同じ予告を2回数えない） */
  const said = new Set<string>();
  H.hook = (pre, cmd, post, events) => {
    const b0 = battlesOf(pre);
    const b1 = battlesOf(post);
    if (b1.length > b0.length) r.fights += b1.length - b0.length;
    if (b1.length < b0.length) {
      r.finished += b0.length - b1.length;
      r.rounds += b0.reduce((n, b) => n + b.turn, 0) - b1.reduce((n, b) => n + b.turn, 0);
    }
    // 回4: 終わった戦闘を、戦闘ごとの種（seed）で見分けて、ボス・中ボス・災厄の戦闘のラウンドを数える
    const left = new Set(b1.map((b) => b.seed));
    for (const b of b0) if (!left.has(b.seed) && isBig(b)) { r.bigFinished++; r.bigRounds += b.turn; }
    // 回4: 始まった戦闘の場所（エンジンの地域の倍率と同じ決め方: 戦闘のマスか、場面の先頭のキャラのマス）
    const had = new Set(b0.map((b) => b.seed));
    const w = post.world;
    for (const sc of scenesOf(post)) {
      if (!sc.battle || had.has(sc.battle.seed) || !w) continue;
      had.add(sc.battle.seed);
      const lead = post.heroes.find((h) => h.hp > 0 && !h.retired && (!sc.party || sc.party.includes(h.id)))?.id;
      const tile = sc.battleInfo?.tile ?? (lead !== undefined ? w.pos[lead] : undefined);
      const reg = tile !== undefined && w.tiles[tile] ? MAP_REGIONS[w.tiles[tile].r]?.id ?? '?' : '?';
      const key = `${reg}${sc.dungeon ? `/${sc.dungeon.dungeonId}` : ''}`;
      r.where2[key] = (r.where2[key] ?? 0) + 1;
      for (const id of new Set(sc.battle.enemies.map((x) => x.defId))) r.foes[id] = (r.foes[id] ?? 0) + 1;
      if (sc.dungeon) {
        if (DUNGEONS.get(sc.dungeon.dungeonId).random) r.randomDungeonFights++;
        else r.fixedDungeonFights++;
      }
    }
    // 回4: BREAK の理由ごと。どの戦闘の BREAK かは、BREAK した敵の uid を持つ戦闘（前か後の状態）で見る。
    // 戦闘が2つ同時にあって、どちらにも同じ uid の敵がいる時は、ボスの印のある方を数えない（少なめに数える）
    const cands = [...b0, ...b1];
    for (const e of events) {
      if (e.type !== 'break') continue;
      r.breakWhy[e.why]++;
      const hit = cands.filter((b) => b.enemies.some((x) => x.uid === e.enemyUid));
      if (hit.length && hit.every((b) => isBig(b))) r.bigBreaks++;
    }
    r.breaks += events.filter((e) => e.type === 'break').length;
    // 特殊な行動: 予告（後の状態に出ている予告）・実行（前の状態の予告と同じ名前で行動した）・BREAK（前の状態で特殊な行動を予告していた敵が崩された）
    for (const b of b1) for (const en of b.enemies) {
      if (en.dead || !en.intent) continue;
      const k = specialOf(getEnemyAction(en.defId, en.intent.actionId));
      const key = `${b.seed}:${en.uid}:${b.turn}`;
      if (!k || said.has(key)) continue;
      said.add(key);
      r.sp[k].said++;
    }
    const preEnemies = b0.flatMap((b) => b.enemies.map((x) => ({ x, b })));
    for (const e of events) {
      if (e.type !== 'enemyAct' && e.type !== 'break') continue;
      const hit = preEnemies.find(({ x }) => x.uid === e.enemyUid && !!x.intent && (e.type === 'break' ? !x.broken : getEnemyAction(x.defId, x.intent.actionId).name === e.actionName));
      const k = hit?.x.intent && specialOf(getEnemyAction(hit.x.defId, hit.x.intent.actionId));
      if (!k || !hit) continue;
      // 増援: 呼べずに代わりの攻撃をした時（直す前は、同じ名前のまま代わりの攻撃をしていた）は、行ったに数えない
      if (k === 'call' && e.type === 'enemyAct' && (b1.find((b) => b.seed === hit.b.seed)?.enemies.length ?? 0) <= hit.b.enemies.length) continue;
      r.sp[k][e.type === 'break' ? 'broke' : 'done']++;
    }
    const d0 = dungeonsOf(pre).length;
    for (const d of dungeonsOf(post).slice(d0)) {
      entered.add(d.dungeonId);
      if (DUNGEONS.get(d.dungeonId).random) r.randomIn++;
    }
    const inner = cmd.type === 'SCENE' || cmd.type === 'VOTE' ? cmd.command : cmd;
    if (inner?.type === 'CHANGE_JOB') r.jobChanges++;
    if (inner?.type === 'REST' && inner.kind === 'upgrade') r.hones++;
    // 賢い bot の工夫（成功した操作だけ数える）
    if (inner?.type === 'TOWN_BUY' || (inner?.type === 'PEDDLER_BUY' && inner.index !== undefined)) r.bought++;
    if (inner?.type === 'TOWN_SELL') r.sold++;
    if (inner?.type === 'EQUIP') r.equips++;
    if (inner?.type === 'USE_POUCH_ITEM') {
      if (pre.mode === 'battle' || (cmd.type === 'SCENE' && pre.expeditions?.find((x) => x.id === cmd.scene)?.mode === 'battle')) r.itemsBattle++;
      else r.itemsField++;
    }
    if (inner?.type === 'TOWN_REMOVE_CARD') r.removed++;
    if (inner?.type === 'CARD_TASK' && inner.cardUid && post.heroes.find((h) => h.id === inner.heroId)!.deck.length < pre.heroes.find((h) => h.id === inner.heroId)!.deck.length) r.removed++;
    if (inner?.type === 'PICK_CARD' && inner.offerIndex === null) r.skipped++;
  };
  const opts = bot === 'straight' ? { straight: true } : bot === 'clever' ? { clever: true, cleverOff: OFF } : { smart: true, cleverOff: OFF, smartOff: SMART_OFF };
  const { game, log } = playToEnd(g0, 60000, opts);
  H.hook = undefined;
  r.refused = log.refused ?? 0;
  r.errors = log.errors.length;
  r.clear = game.mode === 'ending';
  r.corr100 = !r.clear && (game.world?.corruption ?? 0) >= 100;
  r.wiped = !r.clear && !r.corr100 && game.mode === 'gameover';
  r.endMode = game.mode;
  r.worldTurn = game.world?.worldTurn ?? 0;
  r.corruption = game.world?.corruption ?? 0;
  r.goldEnd = game.heroes.reduce((n, h) => n + h.gold, 0) / Math.max(1, game.heroes.length);
  r.levelEnd = game.heroes.reduce((n, h) => n + h.level, 0) / Math.max(1, game.heroes.length);
  const w = game.world;
  if (w) {
    r.randomDone = w.tiles.filter((t) => isRandomDungeonTile(t.f) && t.f!.used).length;
    r.scourgeKills = (w.scourgesMet?.length ?? 0) - aliveScourges(w).length;
  }
  // どこで終わったか（volume.sim と同じ数え方）: 次に目指していたダンジョン（鍵の順・最後）に、1回でも入っていれば「中」
  const keyed = DUNGEONS.forScenario(SCENARIO).filter((d) => d.rewardKey && !d.random).sort((a, b) => a.baseLevel - b.baseLevel);
  const finale = DUNGEONS.forScenario(SCENARIO).find((d) => d.finale)!;
  const nextAt = keyed.findIndex((d) => !game.clearedDungeons.includes(d.id));
  const target = nextAt < 0 ? finale : keyed[nextAt];
  r.where = r.clear ? 'クリア' : `${nextAt < 0 ? '最後' : `鍵${nextAt + 1}`}の${entered.has(target.id) ? '中' : '前'}`;
  return r;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const f = (x: number, d = 0) => (Number.isNaN(x) ? '-' : x.toFixed(d));
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : NaN);

describe.skipIf(!process.env.SIM)(`物差し2本（直行 bot と工夫する bot・${SCENARIO}・${DIFF}・${SEEDS}種）`, () => {
  it('2本の bot を同じ種で流して、表にする', () => {
    const t0 = Date.now();
    const all: Record<string, Partial<Record<BotKind, Run[]>>> = {};
    const write = () => {
      const L: string[] = [];
      const name = { straight: '直行 bot', clever: '工夫する bot', smart: '賢い bot' } as const;
      L.push(`# 物差し（計画書 第2版 §5-3。直行 bot・工夫する bot・賢い bot）`, '');
      L.push(`シナリオ ${SCENARIO}・難易度 ${getDifficulty(DIFF as never).name}・種 ${SEEDS}個（1001〜）・${((Date.now() - t0) / 1000).toFixed(0)}秒。同じ種・同じ人数・同じ難易度で bot（${BOTS.map((k) => name[k]).join('・')}）を流した。${OFF.length ? `**工夫する bot から外した工夫: ${OFF.join('・')}**` : ''}${SMART_OFF.length ? `**賢い bot から外した工夫: ${SMART_OFF.join('・')}**` : ''}`, '');
      L.push('## 1. bot の比べ', '');
      L.push(`| 人数 | bot | クリア率 | 負けた場所（${WHERE.join('・')}） | 侵食度100%で終わった割合（負けのうち） | クリアした冒険の戦闘の数 | 1戦あたりのラウンド | 全部の冒険の戦闘の数 |`);
      L.push('|---|---|---|---|---|---|---|---|');
      for (const [p, by] of Object.entries(all)) {
        for (const k of BOTS) {
          const rs = by[k];
          if (!rs) continue;
          const lost = rs.filter((r) => !r.clear);
          const cl = rs.filter((r) => r.clear);
          const where = WHERE.map((w) => rs.filter((r) => r.where === w).length).join('・');
          const finished = rs.reduce((n, r) => n + r.finished, 0);
          L.push(`| ${p} | ${name[k]} | **${f(pct(cl.length, rs.length))}%**（${cl.length}/${rs.length}） | ${where} | ${f(pct(lost.filter((r) => r.corr100).length, lost.length))}%（${lost.filter((r) => r.corr100).length}/${lost.length}） | ${f(avg(cl.map((r) => r.fights)), 1)} | ${f(finished ? rs.reduce((n, r) => n + r.rounds, 0) / finished : NaN, 2)} | ${f(avg(rs.map((r) => r.fights)), 1)} |`);
        }
        if (by.straight && by.clever) {
          const d = pct(by.clever.filter((r) => r.clear).length, by.clever.length) - pct(by.straight.filter((r) => r.clear).length, by.straight.length);
          L.push(`| ${p} | **差（工夫 − 直行）** | **${d >= 0 ? '+' : ''}${f(d)}ポイント** | | | | | |`);
        }
        if (by.clever && by.smart) {
          const d = pct(by.smart.filter((r) => r.clear).length, by.smart.length) - pct(by.clever.filter((r) => r.clear).length, by.clever.length);
          L.push(`| ${p} | **差（賢い − 工夫）** | **${d >= 0 ? '+' : ''}${f(d)}ポイント** | | | | | |`);
        }
      }
      L.push('', '## 2. 計画書の目標（ふつう・提案）との比べ', '');
      L.push('| 人数 | 直行 bot のクリア（目標 10%以下） | 工夫する bot のクリア（目標） | 差（目標 25ポイント以上） | 時間切れの割合（目標: 負けの4分の1以下 = 25%以下。工夫する bot） | 戦闘の数（目標 25〜32戦。工夫する bot のクリアした冒険） | 1戦あたりのラウンド（目標 4〜6。工夫する bot） |');
      L.push('|---|---|---|---|---|---|---|');
      for (const [p, by] of Object.entries(all)) {
        const s = by.straight ?? [];
        const c = by.clever ?? [];
        if (!s.length || !c.length) continue;
        const sc = pct(s.filter((r) => r.clear).length, s.length);
        const cc = pct(c.filter((r) => r.clear).length, c.length);
        const lost = c.filter((r) => !r.clear);
        const fin = c.reduce((n, r) => n + r.finished, 0);
        L.push(`| ${p} | ${f(sc)}% | ${f(cc)}%（${TARGET[p]}） | ${cc - sc >= 0 ? '+' : ''}${f(cc - sc)} | ${f(pct(lost.filter((r) => r.corr100).length, lost.length))}% | ${f(avg(c.filter((r) => r.clear).map((r) => r.fights)), 1)} | ${f(fin ? c.reduce((n, r) => n + r.rounds, 0) / fin : NaN, 2)} |`);
      }
      L.push('', '## 3. 工夫が使われた数（1冒険あたりの平均。工夫する bot が本当に工夫をしているかの確かめ）', '');
      L.push('| 人数 | bot | BREAK | ランダムダンジョンに入った | ランダムダンジョンを踏破 | 災厄を倒した | 転職 | 休憩で技を磨いた | bot の操作の失敗 |');
      L.push('|---|---|---|---|---|---|---|---|---|');
      for (const [p, by] of Object.entries(all)) {
        for (const k of BOTS) {
          const rs = by[k];
          if (!rs) continue;
          const a = (key: keyof Run) => f(avg(rs.map((r) => Number(r[key]))), 2);
          L.push(`| ${p} | ${name[k]} | ${a('breaks')} | ${a('randomIn')} | ${a('randomDone')} | ${a('scourgeKills')} | ${a('jobChanges')} | ${a('hones')} | ${rs.reduce((n, r) => n + r.errors, 0)} |`);
        }
      }
      // 賢い bot の工夫が使われた数
      L.push('', '## 3b. 賢い bot の工夫が使われた数（1冒険あたりの平均。成功した操作だけ）', '');
      L.push('| 人数 | bot | 買った（町・行商人） | 売った | 装備を付けた | 消耗品（戦闘の中） | 消耗品（戦闘の外） | 削ったカード（町・イベント） | 取らなかったカード報酬 | 断られた操作（失敗に数えない） |');
      L.push('|---|---|---|---|---|---|---|---|---|---|');
      for (const [p, by] of Object.entries(all)) {
        for (const k of BOTS) {
          const rs = by[k];
          if (!rs) continue;
          const a = (key: keyof Run) => f(avg(rs.map((r) => Number(r[key]))), 2);
          L.push(`| ${p} | ${name[k]} | ${a('bought')} | ${a('sold')} | ${a('equips')} | ${a('itemsBattle')} | ${a('itemsField')} | ${a('removed')} | ${a('skipped')} | ${a('refused')} |`);
        }
      }
      // 回4: 難しさの測定で足した数（エンジンの結果は変えず、テストの側で数えた物）
      L.push('', `## 4. 難しさの数（回4）: ${VARIANT_TEXT[VARIANT] ?? VARIANT}${PARTYSET ? `・パーティ ${PARTYSET}（${Object.values(PARTIES).map((c) => c.join('＋')).join(' / ')}）` : ''}`, '');
      L.push('| 人数 | bot | クリア率 | 負け: 全滅 / 侵食度100% / ほか | 全部の冒険の戦闘の数 | 1戦の平均ラウンド | ボス・中ボス・災厄の戦闘の数（1冒険）| その平均ラウンド | 1冒険の BREAK（弱点・完全成功・合計ダメージ） | ボス・中ボス・災厄の戦闘での BREAK（1冒険） | クリアした時のワールドターン | クリアした時の侵食度 |');
      L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
      for (const [p, by] of Object.entries(all)) {
        for (const k of BOTS) {
          const rs = by[k];
          if (!rs?.length) continue;
          const cl = rs.filter((r) => r.clear);
          const lost = rs.filter((r) => !r.clear);
          const fin = rs.reduce((n, r) => n + r.finished, 0);
          const bigFin = rs.reduce((n, r) => n + r.bigFinished, 0);
          const a = (fn: (r: Run) => number, xs = rs) => avg(xs.map(fn));
          L.push(`| ${p} | ${name[k]} | **${f(pct(cl.length, rs.length))}%**（${cl.length}/${rs.length}） | ${lost.filter((r) => r.wiped).length} / ${lost.filter((r) => r.corr100).length} / ${lost.filter((r) => !r.wiped && !r.corr100).length} | ${f(a((r) => r.fights), 1)} | ${f(fin ? rs.reduce((n, r) => n + r.rounds, 0) / fin : NaN, 2)} | ${f(a((r) => r.bigFinished), 1)} | ${f(bigFin ? rs.reduce((n, r) => n + r.bigRounds, 0) / bigFin : NaN, 2)} | ${f(a((r) => r.breaks), 1)}（${f(a((r) => r.breakWhy.weak), 1)}・${f(a((r) => r.breakWhy.perfect), 1)}・${f(a((r) => r.breakWhy.damage), 1)}） | ${f(a((r) => r.bigBreaks), 1)} | ${f(a((r) => r.worldTurn, cl), 1)} | ${f(a((r) => r.corruption, cl), 1)} |`);
        }
      }
      // 敵の特殊な行動の直し: 特殊な行動の回数（1冒険の平均。予告 / 実行 / BREAK で止めた）
      L.push('', '## 5. 敵の特殊な行動の回数（1冒険の平均。予告された / 実際に行われた / 予告の後に BREAK された）', '');
      L.push(`| 人数 | bot | ${Object.values(SPECIALS).join(' | ')} | 合計 |`);
      L.push(`|---|---|${Object.keys(SPECIALS).map(() => '---|').join('')}---|`);
      for (const [p, by] of Object.entries(all)) {
        for (const k of BOTS) {
          const rs = by[k];
          if (!rs?.length) continue;
          const cell = (fn: (c: SpecialCount[SpecialKind]) => number, kinds: SpecialKind[]) => avg(rs.map((r) => kinds.reduce((n, s) => n + fn(r.sp[s]), 0)));
          const tri = (kinds: SpecialKind[]) => `${f(cell((c) => c.said, kinds), 2)} / ${f(cell((c) => c.done, kinds), 2)} / ${f(cell((c) => c.broke, kinds), 2)}`;
          const kinds = Object.keys(SPECIALS) as SpecialKind[];
          L.push(`| ${p} | ${name[k]} | ${kinds.map((s) => tri([s])).join(' | ')} | ${tri(kinds)} |`);
        }
      }
      const others = Object.values(all).flatMap((by) => BOTS.flatMap((k) => by[k] ?? [])).filter((r) => !r.clear && !r.wiped && !r.corr100).map((r) => r.endMode);
      if (others.length) L.push('', `負けの「ほか」の終わり方（game.mode）: ${[...new Set(others)].map((m) => `${m || '(空)'} ${others.filter((x) => x === m).length}`).join('・')}`);
      const where2: Record<string, number> = {};
      for (const by of Object.values(all)) for (const rs of Object.values(by)) for (const r of rs ?? []) for (const [key, n] of Object.entries(r.where2)) where2[key] = (where2[key] ?? 0) + n;
      L.push('', `始まった戦闘の場所（地域/ダンジョン: 数。全部の冒険の合計）。HP の倍率が掛かる地域: ${Object.keys(BALANCE.enemyHpByRegion).join('・') || 'なし'}`, '');
      L.push(Object.entries(where2).sort((x, y) => y[1] - x[1]).map(([key, n]) => `${key}: ${n}`).join('・'));
      mkdirSync(dirname(OUT), { recursive: true });
      writeFileSync(OUT, L.join('\n') + '\n');
      // つまみの測定: 集計用の要約（SIM_JSON に書く。人数・bot ごと）
      if (process.env.SIM_JSON) {
        const foes: Record<string, number> = {};
        for (const by of Object.values(all)) for (const rs of Object.values(by)) for (const r of rs ?? []) for (const [id, n] of Object.entries(r.foes)) foes[id] = (foes[id] ?? 0) + n;
        const sum: Record<string, unknown> = { knobs: KNOBS, variant: VARIANT, partyset: PARTYSET, seeds: SEEDS, rows: [] as unknown[], foes };
        for (const [p, by] of Object.entries(all)) {
          for (const k of BOTS) {
            const rs = by[k];
            if (!rs?.length) continue;
            const cl = rs.filter((r) => r.clear);
            const fin = rs.reduce((n, r) => n + r.finished, 0);
            const bigFin = rs.reduce((n, r) => n + r.bigFinished, 0);
            const a = (fn: (r: Run) => number, xs = rs) => avg(xs.map(fn));
            (sum.rows as unknown[]).push({
              party: p, bot: k, n: rs.length, clear: cl.length,
              wiped: rs.filter((r) => r.wiped).length, corr100: rs.filter((r) => r.corr100).length, other: rs.filter((r) => !r.clear && !r.wiped && !r.corr100).length,
              where: Object.fromEntries(WHERE.map((w) => [w, rs.filter((r) => r.where === w).length])),
              wipedWhere: Object.fromEntries(WHERE.map((w) => [w, rs.filter((r) => r.wiped && r.where === w).length])),
              fights: a((r) => r.fights), rounds: fin ? rs.reduce((n, r) => n + r.rounds, 0) / fin : null,
              bigFights: a((r) => r.bigFinished), bigRounds: bigFin ? rs.reduce((n, r) => n + r.bigRounds, 0) / bigFin : null,
              breaks: a((r) => r.breaks), weak: a((r) => r.breakWhy.weak), perfect: a((r) => r.breakWhy.perfect), damage: a((r) => r.breakWhy.damage), bigBreaks: a((r) => r.bigBreaks),
              clearCorr: cl.length ? a((r) => r.corruption, cl) : null, clearTurn: cl.length ? a((r) => r.worldTurn, cl) : null,
              goldEnd: a((r) => r.goldEnd), goldEndClear: cl.length ? a((r) => r.goldEnd, cl) : null, errors: rs.reduce((n, r) => n + r.errors, 0),
              fightsClear: cl.length ? a((r) => r.fights, cl) : null, fixedDungeonFights: a((r) => r.fixedDungeonFights), randomDungeonFights: a((r) => r.randomDungeonFights),
              fixedDungeonFightsClear: cl.length ? a((r) => r.fixedDungeonFights, cl) : null,
              levelEndClear: cl.length ? a((r) => r.levelEnd, cl) : null, levelEnd: a((r) => r.levelEnd), jobChanges: a((r) => r.jobChanges),
              specials: Object.fromEntries((Object.keys(SPECIALS) as SpecialKind[]).map((s) => [s, { said: a((r) => r.sp[s].said), done: a((r) => r.sp[s].done), broke: a((r) => r.sp[s].broke) }])),
            });
          }
        }
        mkdirSync(dirname(process.env.SIM_JSON), { recursive: true });
        writeFileSync(process.env.SIM_JSON, JSON.stringify(sum, null, 1));
      }
    };
    for (const [p, classes] of Object.entries(PARTIES)) {
      // SIM_PARTY はカンマで複数書ける（例: 2人,4人）
      if (process.env.SIM_PARTY && !process.env.SIM_PARTY.split(',').includes(p)) continue;
      all[p] = {};
      for (const bot of BOTS) {
        const rs: Run[] = (all[p][bot] = []);
        for (let s = 1; s <= SEEDS; s++) rs.push(runOne(classes, 1000 + s, bot));
        // 途中でも結果が残るように、1組ごとに書き出す
        write();
      }
    }
    // bot の操作がゲームに断られていない事（断られると、測った数字が bot の不具合の数字になる）
    for (const by of Object.values(all)) for (const rs of Object.values(by)) expect((rs ?? []).reduce((n, r) => n + r.errors, 0)).toBe(0);
  }, 86_400_000);
});
