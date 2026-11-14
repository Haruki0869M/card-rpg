// ===== 釣り合いの物差し2本（計画書 第2版 §5-3）: 直行 bot と 工夫する bot を、同じ種・同じ人数・同じ難易度で比べる =====
// 時間がかかるので、普段のテストでは動かさない。数値は変えない（測るだけ）。
// 使い方（重いので heavy.mjs を通す）:
//   SIM=1 SIM_SEEDS=40 SIM_DIFF=normal node C:/dev/card-rpg-tools/heavy.mjs npx vitest run src/engine/__tests__/twoBots.sim.test.ts
// 環境変数（どれも省略できる）: SIM_SEEDS（種の数。1001 から。既定40）・SIM_DIFF（既定 normal）・SIM_PARTY（2人 / 3人 / 4人。既定は全部）・
//   SIM_SCENARIO（既定 corruptionKing）・SIM_OUT（既定 screenshots/balance-two-bots.md）・
//   SIM_CLEVER_OFF（工夫する bot から外す工夫。battle,job,detour,hone をカンマで。どの工夫が効いているかを確かめる用）
// パーティは1人のプレイヤーが全員を動かす。2026-11-13 から標準は回復役（僧侶）入り（下の PARTIES。前の 剣士・魔法使い ＋ 狩人 ＋ 守護者 は SIM_PARTYSET=old）
// 回4（難しさの測定）で足した環境変数:
//   SIM_VARIANT（a / b / c。このテストの中だけで BALANCE の値を差し替える。省略 = 今のまま）
//     a = 合計ダメージで BREAK の線: ボス・中ボス・災厄 30% / 強敵 25% / ふつう 20%
//     b = ボス・中ボス・災厄は合計ダメージでは BREAK しない（弱点か完全成功だけ）
//     c = a ＋ 沼より後の地域（世界マップの並びで、沼の地域より魔王城の側）の敵のHP +15%（SIM_LATE_HP=1.3 などで倍率を変えられる）
//   SIM_PARTYSET（phys = 2人を 剣士＋狩人 / magic = 2人を 魔法使い＋僧侶。省略 = 上のパーティ）
// 賢い bot（3段目。botSmart.ts）で足した環境変数:
//   SIM_BOTS（流す bot をカンマで。straight,clever,smart。既定は3本とも）
//   SIM_SMART_OFF（賢い bot から外す工夫。shop,cards,items,team,time,weak をカンマで。weak = ボスの弱点に合わせる装飾品。2026-11-13）
//   SIM_PARTYSET に ws = 2人を 剣士＋僧侶 / mx = 2人を 魔法使い＋召喚士（回復を持たない魔法の基本職）を足した
// つまみの測定（2026-11-13）で足した環境変数:
//   SIM_KNOBS（B1〜B4・H1〜H4・A1・A2・C1・C2・G1 をカンマで。下の KNOB_ALIAS の所に説明）・SIM_JSON（集計用の要約の書き出し先）・
//   SIM_PARTY をカンマで複数書けるようにした（例: 2人,4人）
// つまみの測定2（2026-11-13）で足した SIM_KNOBS: BA（ア）= B3 は大物だけ / BI（イ）= B3 ＋ 弱点を突けるカードが無い味方は完全成功で崩せる /
//   BE（エ）= B3 ＋ 枠3以上かフォーカス2以上の完全成功でも崩れる（BE4/3 のように 枠/フォーカス を書ける）。SIM_JSON に出会った敵（foes）を足した
// 部屋の連続の直し（2026-11-13）で SIM_JSON に足した数: クリアした冒険の戦闘の数・固定／ランダムダンジョンの中の戦闘の数・終わった時の平均レベル・転職の数
// 回復役を入れて測る（2026-11-13 オーナーの決定）: 標準のパーティを 2人 = 剣士＋僧侶 / 3人 = 剣士＋魔道士＋僧侶 / 4人 = 剣士＋魔道士＋狩人＋僧侶 にした。
//   前の並び（回復役なし）は SIM_PARTYSET=old。2人の組の比べに hp = 狩人＋僧侶 / gp = 守護者＋僧侶 を足した
// 案Y を既定に入れた（2026-11-13）→ 同じ日に取りやめ、BREAK を読み合いにする形（docs/tasks/break-read-plan.md）にした:
//   何も書かない「今のまま」= 新しい既定（紫の札と大物は弱点で完全成功・大物のHP と後半の攻撃は ×1）。
//   SIM_KNOBS に Y0 を書くと、18回目の公開の形（どれでも、弱点・完全成功・合計ダメージのどれかで崩れる）に戻す。
//   B3 は全部の格に、BI・BE は BA と一緒でなければ全部の格に当てる（前の測定と同じ意味）
// 敵の特殊な行動の直し（2026-11-13）で足した数: 特殊な行動（7種類）が、予告された・実際に行われた・BREAK で止められた回数（種類ごと・1冒険の平均）。
//   テストの側で数える（エンジンの結果は変えない）。どの行動が特殊な行動かは、行動の効果の種類で見分ける（直す前と後で同じ見分け方）
// 部屋の並びの直し・2回目（2026-11-13）で足した環境変数: SIM_PARTYSET=heal4（4人を 剣士＋魔法使い＋狩人＋僧侶）・
//   SIM_LAYOUTS（手作りのダンジョンの並びを、JSON の物に差し替える。直す前の並びで測る用）
// 時間の厳しさの測定（2026-11-13・docs/review/2026-11-13-time-pressure.md）で足した SIM_KNOBS:
//   CW<倍率> = 世界マップのターン（だれもダンジョンの中にいない番）の侵食度だけ ×倍率 / CD<倍率> = ダンジョンの中の番の侵食度だけ ×倍率 /
//   CX<倍率> = C と同じ2つ ＋ ダンジョンに入る時・町が陥落した時・交代運転 も ×倍率（災厄の呪いの +0.5 は掛けない）。
//   RC<値> = ランダムダンジョンを制覇した時に下がる侵食度を、この値（%）にする。
//   SIM_JSON に、寄り道（ランダムダンジョンに入った・踏破・災厄を倒した・登った塔）・休んだ回数（休憩部屋・野営・宿）・買った数・技を磨いた数を足した
// ボスの段階（2026-11-14・docs/tasks/boss-phase-plan.md §4）で足した数（テストの側だけ。エンジンの結果は変えない）:
//   主のボス（ボスの部屋の戦闘で、段階を持つ敵がいる戦闘）の始まった数・終わった数・ラウンド・段階ごとのボスの行動の数・2段目／3段目まで行った数・
//   開幕の一手の予告とその BREAK・終わった時に倒れていた味方・ボス戦での全滅・ボス戦に入った時のHPの割合（SIM_JSON の boss にボスごとの数も書く）
// 寄り道の値打ち（2026-11-14・docs/tasks/detour-value-plan.md §4）で足した数（テストの側だけ）: 寄り道に使ったワールドターン・抜け道・ボス戦に掛かっていた加護・
//   見破りの戦闘と大技の BREAK・ボス戦の全滅・3択で選んだ秘宝・災厄と最後の中ボスの段階ごとの行動（表の 8 と SIM_JSON の dt）。回復役なしの2人は SIM_PARTYSET=phys・mx
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { BattleEvent, EnemyActionDef, GameCommand, GameState, PlayerId } from '../../types';
import { getEnemy, getEnemyAction } from '../../data/enemies';
import { getItem } from '../../data/items';

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

import { createGame, aliveScourges, isRandomDungeonTile, omenOfType, reachableRooms } from '../index';
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
  // 回復役入りの測定（2026-11-13 オーナーの決定「難しさは必ず回復役を入れて測る」）で足した2人の組
  : PARTYSET === 'hp' ? { '2人': ['hunter', 'priest'] }
  : PARTYSET === 'gp' ? { '2人': ['guardian', 'priest'] }
  // 部屋の並びの直し・2回目（2026-11-13）: 回復役入りの4人
  : PARTYSET === 'heal4' ? { '4人': ['warrior', 'mage', 'hunter', 'priest'] }
  // 前の標準のパーティ（回復役なし。参考として比べる用）
  : PARTYSET === 'old' ? {
    '2人': ['warrior', 'mage'],
    '3人': ['warrior', 'mage', 'hunter'],
    '4人': ['warrior', 'mage', 'guardian', 'hunter'],
  }
  // 標準のパーティ（2026-11-13 から回復役 = 僧侶入り。【提案】の並び）
  : {
    '2人': ['warrior', 'priest'],
    '3人': ['warrior', 'mage', 'priest'],
    '4人': ['warrior', 'mage', 'hunter', 'priest'],
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
  // 案Y を既定に入れた（2026-11-13）: Y0 = 案Y を入れる前の既定に戻す（並びのどこに書いても、ほかのつまみより先に当てる）。
  //   Y0 を書かない時の「今のまま」は、新しい既定（= 前の測定の SIM_KNOBS=BA,H4,A2 と同じ）
  //   2026-11-13（案Y の取りやめ・docs/tasks/break-read-plan.md）: Y0 = 18回目の公開の形（紫の札も大物も、弱点・完全成功・合計ダメージのどれかで崩れる）。
  //   新しい既定は「紫の札と大物は弱点で完全成功」だけで、大物のHP・後半の攻撃は元のまま（×1）なので、Y0 で戻すのは BREAK の決まりだけ
  if (KNOBS.includes('Y0')) {
    B.breakNeedsWeakPerfect = false;
    B.breakNeedsWeakPerfectRanks = undefined;
    B.breakDamagePctByRank = {};
    B.breakBehaviorNeedsWeakPerfect = false;
    B.breakDamagePctBehavior = undefined;
    B.enemyHpByRank = {};
    B.enemyAttackByRegion = {};
    KNOB_TEXT.push('Y0 18回目の公開の形（紫の札も大物も、弱点・完全成功・合計ダメージのどれかで崩れる）');
  }
  for (const raw of KNOBS) {
    if (raw === 'Y0') continue;
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
      // 新しい既定は大物だけ（BA と同じ）なので、B3 は全部の格に広げる
      B.breakNeedsWeakPerfectRanks = undefined;
      KNOB_TEXT.push('B3 弱点の属性で、しかも完全成功の時だけ崩れる（弱点の無い敵は完全成功で崩れる・合計ダメージでは崩れない）');
    } else if (k === 'BA') {
      // つまみの測定2（ア）: B3 を大物（ボス・中ボス・災厄）だけに当てる。強敵・ふつうの敵は今の決まりのまま
      B.breakNeedsWeakPerfect = true;
      B.breakNeedsWeakPerfectRanks = ['boss', 'midboss'];
      KNOB_TEXT.push('BA（ア）B3 は大物だけ（強敵・ふつうの敵は今のまま）');
    } else if (k === 'BI') {
      // つまみの測定2（イ）: B3 ＋ 弱点を突けるカードを1枚も持たない味方は、完全成功で崩せる
      B.breakNeedsWeakPerfect = true;
      // 前の測定と同じ意味にする: BA と一緒でなければ全部の格（新しい既定は大物だけなので戻す）
      if (!KNOBS.includes('BA')) B.breakNeedsWeakPerfectRanks = undefined;
      B.breakPerfectNoWeakCard = true;
      KNOB_TEXT.push('BI（イ）B3 ＋ 弱点を突けるカードが手札・山札・捨て札に無い味方は、完全成功で崩せる');
    } else if (k.startsWith('BE')) {
      // つまみの測定2（エ）: B3 ＋ 重い一撃の完全成功でも崩れる（BE = 枠3以上かフォーカス2以上。BE4/3 のように 枠/フォーカス を書ける）
      const [s, fo] = k === 'BE' ? [3, 2] : k.slice(2).split('/').map(Number);
      if (!(s > 0) || !(fo > 0)) throw new Error(`つまみの倍率が読めない: ${raw}`);
      B.breakNeedsWeakPerfect = true;
      if (!KNOBS.includes('BA')) B.breakNeedsWeakPerfectRanks = undefined;
      B.breakPerfectHeavy = { slots: s, focus: fo };
      KNOB_TEXT.push(`${raw}（エ）B3 ＋ 枠${s}以上のカードか、フォーカス${fo}以上を使った攻撃の完全成功でも崩れる`);
    } else if (k === 'B4') { B.breakStatus = 'vulnerable'; B.breakClearsBlock = false; KNOB_TEXT.push('B4 崩した時の効果 = 威力半分＋脆弱1（弱体なし・ブロックは残る）'); }
    else if (k.startsWith('HL')) { B.enemyHpByRegion = Object.fromEntries(LATE3_REGIONS.map((id) => [id, num('HL')])); KNOB_TEXT.push(`${raw} ${LATE3_REGIONS.join('・')}の敵のHP ×${num('HL')}`); }
    else if (k.startsWith('HB')) { B.enemyHpByRank = { boss: num('HB'), midboss: num('HB') }; KNOB_TEXT.push(`${raw} ボス・中ボス・災厄のHP ×${num('HB')}`); }
    else if (k.startsWith('AL')) { B.enemyAttackByRegion = Object.fromEntries(LATE3_REGIONS.map((id) => [id, num('AL')])); KNOB_TEXT.push(`${raw} ${LATE3_REGIONS.join('・')}の敵の攻撃 ×${num('AL')}`); }
    else if (k.startsWith('CW')) {
      B.corruptionPerTurn = (B.corruptionPerTurn as number) * num('CW');
      KNOB_TEXT.push(`${raw} 世界マップのターンの侵食度だけ ×${num('CW')}（${B.corruptionPerTurn}・ダンジョンの中は ${B.corruptionPerDungeonTurn} のまま）`);
    } else if (k.startsWith('CD')) {
      B.corruptionPerDungeonTurn = (B.corruptionPerDungeonTurn as number) * num('CD');
      KNOB_TEXT.push(`${raw} ダンジョンの中のターンの侵食度だけ ×${num('CD')}（${B.corruptionPerDungeonTurn}・世界マップは ${B.corruptionPerTurn} のまま）`);
    } else if (k.startsWith('CX')) {
      for (const key of ['corruptionPerTurn', 'corruptionPerDungeonTurn', 'corruptionOnDungeonEnter', 'corruptionOnTownFall', 'corruptionPerRelayMove']) B[key] = (B[key] as number) * num('CX');
      KNOB_TEXT.push(`${raw} 侵食度の上がる所を全部 ×${num('CX')}（ターン ${B.corruptionPerTurn}・ダンジョンの中 ${B.corruptionPerDungeonTurn}・入る時 ${B.corruptionOnDungeonEnter}・陥落 ${B.corruptionOnTownFall}・交代運転 ${B.corruptionPerRelayMove}）`);
    } else if (k.startsWith('RC')) {
      // 時間の厳しさの測定: ランダムダンジョンを制覇した時に下がる侵食度を、この値にする（寄り道の得になるかを見る用）
      B.corruptionOnRandomDungeonClear = num('RC');
      KNOB_TEXT.push(`${raw} ランダムダンジョンを制覇した時に下がる侵食度 ${num('RC')}%`);
    } else if (k.startsWith('C')) {
      B.corruptionPerTurn = (B.corruptionPerTurn as number) * num('C');
      B.corruptionPerDungeonTurn = (B.corruptionPerDungeonTurn as number) * num('C');
      KNOB_TEXT.push(`${raw} 侵食度の伸び ×${num('C')}（ターンごと ${B.corruptionPerTurn}・ダンジョンの中 ${B.corruptionPerDungeonTurn}）`);
    } else if (k.startsWith('G')) { B.goldGainMul = num('G'); KNOB_TEXT.push(`${raw} 稼いだお金 ×${num('G')}`); }
    // 強敵の計画（2026-11-13）: EH<倍率> = 強敵の本体のHP（enemyHpByRank.elite）/ EF0 = 強敵の本気を出さない / EE0 = 強敵の装備のエピック率を深さで変えない（10%） /
    //   MAIN = EH1・EF0・EE0 をまとめて（7a20e43 と同じ戦闘・ご褒美。扉の選び方は SIM_SMART_OFF=elite、並びは SIM_LAYOUTS で前に戻す）
    else if (k === 'MAIN' || k === 'EF0' || k === 'EE0' || k.startsWith('EH')) {
      if (k === 'MAIN' || k.startsWith('EH')) B.enemyHpByRank = { ...(B.enemyHpByRank as object), elite: k === 'MAIN' ? 1 : num('EH') };
      if (k === 'MAIN' || k === 'EF0') B.eliteFrenzy = { ...(B.eliteFrenzy as object), hpBelow: 0 };
      if (k === 'MAIN' || k === 'EE0') B.eliteEpicChanceByDepth = [10, 10, 10, 10];
      KNOB_TEXT.push(k === 'MAIN' ? 'MAIN 強敵の本体のHP ×1・本気なし・エピック率10%（7a20e43 と同じ）' : k === 'EF0' ? 'EF0 本気なし' : k === 'EE0' ? 'EE0 エピック率10%' : `${raw} 強敵の本体のHP ×${num('EH')}`);
    }
    else throw new Error(`知らないつまみ: ${raw}`);
  }
  // B3 の仲間（B3・BA・BI・BE）: 決まりを当てる格では、合計ダメージでは崩れない（前の B3 と同じ。BA は大物だけ）
  // （つまみを書かない時は、既定の値のまま = 大物の線は ∞。SIM_VARIANT の a/b/c は、その既定の上に重ねる）
  if (B.breakNeedsWeakPerfect && KNOBS.length) {
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
  /**
   * BREAK を読み合いにする（2026-11-13）: BREAK した予告の種類ごとの数（purple = 紫の札（behavior 付きの行動）/ big = ボス・中ボス・災厄の戦闘の赤い大技 /
   * red = それ以外の赤い大技）。前の状態で、その敵が予告していた行動で見分ける
   */
  breakKind: Record<'purple' | 'big' | 'red', number>;
  /** 買った「属性の付与」の装飾品の数（買う操作の前と後で、全員の持ち物と装備の数を比べた）・終わった時に付けていた人数 */
  convBought: number;
  convWorn: number;
  /** 時間の厳しさの測定: 休憩部屋で休んだ（技を磨くも含む）・野営・宿に泊まった（1人1回）・登った塔の数 */
  restRoom: number;
  camp: number;
  inn: number;
  towers: number;
  /**
   * 強敵の計画（2026-11-13）: 扉を選んだ回数のうち、強敵と別の物を選べた回数・そこで強敵を選んだ回数・強敵の扉しか無かった回数 /
   * 強敵の戦闘（強敵の本体がいる戦闘 = 強敵の部屋と封魔の宝箱の番人）の始まった数・終わった数・ラウンドの合計・終わった時に倒れていた味方の数・負けた数 /
   * 本気の予告の数・そのうち BREAK した数 / 強敵の部屋で手に入れた装備の数・そのうちエピック
   */
  eliteOffered: number;
  eliteChosen: number;
  eliteOnly: number;
  eliteFights: number;
  eliteFinished: number;
  eliteRounds: number;
  eliteDowned: number;
  eliteLost: number;
  frenzy: number;
  frenzyBroke: number;
  eliteGear: number;
  eliteEpic: number;
  /** ボスの段階（2026-11-14）: 主のボスの戦闘の数え（下の BossCount） */
  boss: BossCount;
  /** 寄り道の値打ち（2026-11-14）: 下の DetourCount */
  dt: DetourCount;
}

/**
 * 寄り道の値打ち（2026-11-14・docs/tasks/detour-value-plan.md §4）の数え（テストの側だけ。エンジンの結果は変えない）。
 * turns = 寄り道に使ったワールドターン（bot が寄り道へ向かった番 ＋ ランダムダンジョンの中にいた番。重ねない）/ shortcut = 抜け道を通った回数 /
 * bossFights・boons = 鍵と最後のダンジョンのボスの部屋の戦闘の数と、そこに掛かっていた加護の数の合計 / insightFights = 見破ったボスの戦闘 / insightBreaks = その戦闘で大物の大技を BREAK した数 /
 * bossWiped = ボスの部屋の戦闘（鍵と最後）の全滅 / relics = 3択で選んだ秘宝（ID → 数）/
 * scourgeActs・midActs = 災厄・最後の中ボスの、段階ごとの行動（0 = 最初・1 = 段階）/ partnerPhase = 相方が倒れて段階に入った数 / scourgeFled = 逃げた災厄
 * （新しい仕組みの印は、前のコードには無いので、形を緩く読む）
 */
interface DetourCount {
  turns: number; shortcut: number; bossFights: number; boons: number; insightFights: number; insightBreaks: number; bossWiped: number;
  relics: Record<string, number>; scourgeActs: number[]; midActs: number[]; partnerPhase: number; scourgeFled: number;
}
const emptyDetour = (): DetourCount => ({ turns: 0, shortcut: 0, bossFights: 0, boons: 0, insightFights: 0, insightBreaks: 0, bossWiped: 0, relics: {}, scourgeActs: [0, 0], midActs: [0, 0], partnerPhase: 0, scourgeFled: 0 });
/** 戦闘の加護・見破り（新しいコードだけにある） */
const boonOf = (b: NonNullable<GameState['battle']>) => (b as { boon?: { ids: string[] } }).boon;
const insightOf = (b: NonNullable<GameState['battle']>) => !!(b as { insight?: boolean }).insight;
/** 災厄の戦闘か（敵に災厄の本体がいる）・最後のダンジョンの中ボスの戦闘か（中ボスの印があり、災厄ではない） */
const isScourgeFight = (b: NonNullable<GameState['battle']>) => b.enemies.some((x) => x.defId.startsWith('scourge'));
const isMidFight = (b: NonNullable<GameState['battle']>) => !!b.midboss && !isScourgeFight(b);

/**
 * ボスの段階（2026-11-14）: 主のボス（ボスの部屋の戦闘で、段階を持つ敵がいる）の戦闘の数え。
 * acts[k] = 段階 k（0 = 最初）でボスが行動した（予告を実行した・休んだ・止められた）回数の合計 / reached[k] = 段階 k まで行った戦闘の数 /
 * maxPhases[n] = 段階を n 個持つボスの戦闘の数 / opening = 開幕の一手の予告の数（予告の印 intent.opening）・openingBroke = その予告を BREAK した数 /
 * entryHp = 戦闘に入った時の、味方のHPの割合の合計
 */
interface BossTally { finished: number; rounds: number; wiped: number; acts: number[]; reached: number[] }
interface BossCount {
  started: number; finished: number; rounds: number; won: number; wiped: number; downed: number;
  acts: number[]; reached: number[]; maxPhases: number[];
  opening: number; openingBroke: number; entryHp: number;
  byBoss: Record<string, BossTally>;
}
const emptyBoss = (): BossCount => ({ started: 0, finished: 0, rounds: 0, won: 0, wiped: 0, downed: 0, acts: [0, 0, 0], reached: [0, 0, 0], maxPhases: [0, 0, 0], opening: 0, openingBroke: 0, entryHp: 0, byBoss: {} });
const emptyTally = (): BossTally => ({ finished: 0, rounds: 0, wiped: 0, acts: [0, 0, 0], reached: [0, 0, 0] });
/** その戦闘の、段階を持つボス（主のボス）。無ければ undefined */
const phasedBossOf = (b: NonNullable<GameState['battle']>) => (b.boss && !b.midboss ? b.enemies.find((x) => !x.summoned && !!getEnemy(x.defId).phases?.length) : undefined);
/** 予告の開幕の一手の印（ボスの段階の直しの前のコードには無いので、形を緩く読む） */
const openingOf = (intent: unknown) => (intent as { opening?: number } | undefined)?.opening;

/** 「属性の付与」の装飾品か */
const isConverter = (itemId: string) => { const e = getItem(itemId).ability?.effect; return !!e && 'modifier' in e && e.modifier === 'convertElement'; };
/** 全員の持ち物と装備にある「属性の付与」の装飾品の数 */
const convCount = (g: GameState) => g.heroes.reduce((n, h) => n + h.stash.filter((i) => isConverter(i.itemId)).length + Object.values(h.equipment).filter((i) => i && isConverter(i.itemId)).length, 0);

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
    fixedDungeonFights: 0, randomDungeonFights: 0, levelEnd: 0, sp: emptySpecials(), foes: {}, breakKind: { purple: 0, big: 0, red: 0 }, convBought: 0, convWorn: 0,
    restRoom: 0, camp: 0, inn: 0, towers: 0,
    eliteOffered: 0, eliteChosen: 0, eliteOnly: 0, eliteFights: 0, eliteFinished: 0, eliteRounds: 0, eliteDowned: 0, eliteLost: 0, frenzy: 0, frenzyBroke: 0, eliteGear: 0, eliteEpic: 0, boss: emptyBoss(), dt: emptyDetour() };
  /** ボスの段階: 戦闘の種 → その戦闘で行った一番深い段階・開幕の一手を数えた印 */
  const bossSeen = new Map<number, number>();
  const openingSaid = new Set<string>();
  const frenzySaid = new Set<string>();
  const entered = new Set<string>();
  /** 予告を数えた印（戦闘の種:敵:ターン。同じ予告を2回数えない） */
  const said = new Set<string>();
  /** 寄り道の値打ち: ランダムダンジョンの中にいたワールドターン */
  const rdTurns = new Set<number>();
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
      // 予告の種類（前の状態の、その敵の予告で見る）
      const foe = b0.flatMap((b) => b.enemies.map((x) => ({ x, b }))).find(({ x }) => x.uid === e.enemyUid && !!x.intent);
      if (foe) r.breakKind[getEnemyAction(foe.x.defId, foe.x.intent!.actionId).behavior ? 'purple' : isBig(foe.b) ? 'big' : 'red']++;
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
    // 強敵の計画（2026-11-13）: 強敵の戦闘（強敵の本体がいる戦闘）・本気・強敵の扉・強敵の装備（テストの側で数える。エンジンの結果は変えない）
    const isEliteFight = (b: NonNullable<GameState['battle']>) => !!b.elite && !b.boss && !b.midboss && b.enemies.some((x) => x.eliteBody);
    {
      const had0 = new Set(b0.map((b) => b.seed));
      for (const b of b1) if (!had0.has(b.seed) && isEliteFight(b)) r.eliteFights++;
      for (const b of b0) {
        if (left.has(b.seed) || !isEliteFight(b)) continue;
        r.eliteFinished++;
        r.eliteRounds += b.turn;
        r.eliteDowned += b.allies.filter((a) => a.dead).length;
        if (b.phase === 'defeat') r.eliteLost++;
        // 勝った時の装備（強敵の部屋だけ。封魔の宝箱の番人は装備を落とさない）: 後の状態の、その場面の報酬
        if (b.phase !== 'victory') continue;
        const ex = pre.expeditions?.find((x) => x.battle?.seed === b.seed);
        const reward = ex ? post.expeditions?.find((x) => x.id === ex.id)?.reward : pre.battle?.seed === b.seed ? post.reward : undefined;
        const items = [...(reward?.loot ?? []).flatMap((l) => (l.kind === 'item' ? [l.item] : [])), ...(reward?.claim ? [reward.claim.item] : [])].filter((i) => getItem(i.itemId).slot !== 'consumable');
        r.eliteGear += items.length;
        r.eliteEpic += items.filter((i) => getItem(i.itemId).rarity === 'epic').length;
      }
      for (const b of b1) for (const en of b.enemies) {
        if (en.dead || !en.intent?.frenzy) continue;
        const key = `${b.seed}:${en.uid}`;
        if (frenzySaid.has(key)) continue;
        frenzySaid.add(key);
        r.frenzy++;
      }
      for (const e of events) {
        if (e.type !== 'break') continue;
        if (preEnemies.some(({ x }) => x.uid === e.enemyUid && !x.broken && !!x.intent?.frenzy)) r.frenzyBroke++;
      }
      const innerCmd = cmd.type === 'SCENE' || cmd.type === 'VOTE' ? cmd.command : cmd;
      if (innerCmd?.type === 'ENTER_ROOM') {
        const run = cmd.type === 'SCENE' ? pre.expeditions?.find((x) => x.id === cmd.scene)?.dungeon : pre.dungeon;
        const doors = run ? reachableRooms(run) : [];
        const elite = (t: string) => omenOfType(t) === 'elite';
        const chosen = doors.find((d) => d.id === innerCmd.roomId);
        if (doors.some((d) => elite(d.type)) && doors.some((d) => !elite(d.type))) {
          r.eliteOffered++;
          if (chosen && elite(chosen.type)) r.eliteChosen++;
        } else if (doors.length && doors.every((d) => elite(d.type))) r.eliteOnly++;
      }
    }
    // ボスの段階（2026-11-14）: 主のボスの戦闘の数え（テストの側だけ）
    {
      const bc = r.boss;
      const had0 = new Set(b0.map((b) => b.seed));
      for (const b of b1) {
        const boss = phasedBossOf(b);
        if (!boss) continue;
        if (!had0.has(b.seed)) {
          bc.started++;
          bc.entryHp += b.allies.reduce((n, a) => n + Math.max(0, a.hp), 0) / Math.max(1, b.allies.reduce((n, a) => n + a.maxHp, 0));
        }
        bossSeen.set(b.seed, Math.max(bossSeen.get(b.seed) ?? 0, boss.phase));
        // 開幕の一手の予告（1つの予告を1回だけ数える）
        if (!boss.dead && openingOf(boss.intent)) {
          const key = `${b.seed}:${boss.uid}:${b.turn}:${boss.intent!.actionId}`;
          if (!openingSaid.has(key)) { openingSaid.add(key); bc.opening++; }
        }
      }
      // 段階ごとのボスの行動: 前の状態のボスが予告を持っていて、このコマンドで、そのボスの行動（enemyAct）が出た
      for (const b of b0) {
        const boss = phasedBossOf(b);
        if (!boss) continue;
        const by = (bc.byBoss[boss.defId] ??= emptyTally());
        for (const e of events) {
          if (e.type === 'enemyAct' && e.enemyUid === boss.uid && boss.intent) { bc.acts[Math.min(2, boss.phase)]++; by.acts[Math.min(2, boss.phase)]++; }
          if (e.type === 'break' && e.enemyUid === boss.uid && !boss.broken && openingOf(boss.intent)) bc.openingBroke++;
        }
        if (left.has(b.seed)) continue;
        const maxPhase = Math.min(2, Math.max(bossSeen.get(b.seed) ?? 0, boss.phase));
        bc.finished++;
        bc.rounds += b.turn;
        bc.downed += b.allies.filter((a) => a.dead).length;
        if (b.phase === 'victory') bc.won++;
        if (b.phase === 'defeat') bc.wiped++;
        for (let k = 0; k <= maxPhase; k++) { bc.reached[k]++; by.reached[k]++; }
        bc.maxPhases[Math.min(2, getEnemy(boss.defId).phases?.length ?? 0)]++;
        by.finished++;
        by.rounds += b.turn;
        if (b.phase === 'defeat') by.wiped++;
        bossSeen.delete(b.seed);
      }
    }
    // 寄り道の値打ち（2026-11-14）: テストの側だけで数える
    {
      const dt = r.dt;
      if (post.world && dungeonsOf(post).some((d) => DUNGEONS.get(d.dungeonId).random)) rdTurns.add(post.world.worldTurn);
      const had0 = new Set(b0.map((b) => b.seed));
      const keyBoss = (b: NonNullable<GameState['battle']>, g: GameState) => {
        if (!b.boss || b.midboss) return false;
        const sc = scenesOf(g).find((x) => x.battle?.seed === b.seed);
        return !!sc?.dungeon && !DUNGEONS.get(sc.dungeon.dungeonId).random;
      };
      for (const b of b1) {
        if (had0.has(b.seed) || !keyBoss(b, post)) continue;
        dt.bossFights++;
        dt.boons += boonOf(b)?.ids.length ?? 0;
        if (insightOf(b)) dt.insightFights++;
      }
      for (const b of b0) {
        if (!left.has(b.seed) && keyBoss(b, pre) && b.phase === 'defeat') dt.bossWiped++;
        if (insightOf(b)) for (const e of events) if (e.type === 'break' && b.enemies.some((x) => x.uid === e.enemyUid && !x.summoned && !x.broken && !!x.intent && !!getEnemyAction(x.defId, x.intent.actionId).big)) dt.insightBreaks++;
        // 災厄・最後の中ボスの段階ごとの行動・相方が倒れて段階に入った数・逃げた災厄
        const scourge = isScourgeFight(b);
        const mid = isMidFight(b);
        if (!scourge && !mid) continue;
        for (const e of events) {
          if (e.type !== 'enemyAct') continue;
          const en = b.enemies.find((x) => x.uid === e.enemyUid && !x.summoned && !!x.intent);
          if (en) (scourge ? dt.scourgeActs : dt.midActs)[Math.min(1, en.phase)]++;
        }
        const after = b1.find((x) => x.seed === b.seed);
        if (mid && after) for (const en of after.enemies) {
          const before = b.enemies.find((x) => x.uid === en.uid);
          const partnerFell = after.enemies.some((x) => x.uid !== en.uid && !x.summoned && x.dead && !b.enemies.find((y) => y.uid === x.uid)?.dead);
          if (before && !en.dead && en.phase > before.phase && partnerFell && en.hp * 2 > en.maxHp) dt.partnerPhase++;
        }
        if (scourge && !left.has(b.seed) && b.enemies.some((x) => x.defId.startsWith('scourge') && !!(x as { fled?: boolean }).fled)) dt.scourgeFled++;
      }
      const ic = cmd.type === 'SCENE' || cmd.type === 'VOTE' ? cmd.command : cmd;
      if (ic?.type === 'RETURN_TO_HUB' && (ic as { kind?: string }).kind === 'shortcut') dt.shortcut++;
      if ((ic?.type as string) === 'PICK_RELIC') {
        const chest = cmd.type === 'SCENE' ? pre.expeditions?.find((x) => x.id === cmd.scene)?.chest : pre.chest;
        const pick = (chest as { relics?: { itemId: string }[] } | undefined)?.relics?.[(ic as { optionIndex?: number }).optionIndex ?? -1];
        if (pick) dt.relics[pick.itemId] = (dt.relics[pick.itemId] ?? 0) + 1;
      }
    }
    const d0 = dungeonsOf(pre).length;
    for (const d of dungeonsOf(post).slice(d0)) {
      entered.add(d.dungeonId);
      if (DUNGEONS.get(d.dungeonId).random) r.randomIn++;
    }
    const inner = cmd.type === 'SCENE' || cmd.type === 'VOTE' ? cmd.command : cmd;
    if (inner?.type === 'CHANGE_JOB') r.jobChanges++;
    if (inner?.type === 'REST' && inner.kind === 'upgrade') r.hones++;
    if (inner?.type === 'REST') r.restRoom++;
    if (inner?.type === 'WORLD_CAMP') r.camp++;
    if (inner?.type === 'TOWN_INN') r.inn++;
    // 賢い bot の工夫（成功した操作だけ数える）
    if (inner?.type === 'TOWN_BUY' || (inner?.type === 'PEDDLER_BUY' && inner.index !== undefined)) {
      r.bought++;
      r.convBought += Math.max(0, convCount(post) - convCount(pre));
    }
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
  r.dt.turns = new Set([...rdTurns, ...(log.detourTurns ?? [])]).size;
  r.errors = log.errors.length;
  r.clear = game.mode === 'ending';
  r.corr100 = !r.clear && (game.world?.corruption ?? 0) >= 100;
  r.wiped = !r.clear && !r.corr100 && game.mode === 'gameover';
  r.endMode = game.mode;
  r.worldTurn = game.world?.worldTurn ?? 0;
  r.corruption = game.world?.corruption ?? 0;
  r.goldEnd = game.heroes.reduce((n, h) => n + h.gold, 0) / Math.max(1, game.heroes.length);
  r.levelEnd = game.heroes.reduce((n, h) => n + h.level, 0) / Math.max(1, game.heroes.length);
  r.convWorn = game.heroes.filter((h) => h.equipment.accessory && isConverter(h.equipment.accessory.itemId)).length;
  const w = game.world;
  if (w) {
    r.randomDone = w.tiles.filter((t) => isRandomDungeonTile(t.f) && t.f!.used).length;
    r.scourgeKills = (w.scourgesMet?.length ?? 0) - aliveScourges(w).length;
    r.towers = w.tiles.filter((t) => t.f?.kind === 'tower' && t.f.used).length;
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
      // 強敵の計画（2026-11-13）: 強敵の数（全部の冒険の合計。強敵の戦闘 = 強敵の本体がいる戦闘 = 強敵の部屋と封魔の宝箱の番人）
      L.push('', '## 6. 強敵（全部の冒険の合計）', '');
      L.push('| 人数 | bot | 強敵か別の物かを選べた扉 → 強敵を選んだ | 強敵しか無い扉 | 強敵の戦闘（始まった / 終わった） | 1戦のラウンド | 終わった時に倒れていた味方（1戦あたり） | 強敵に負けた | 本気（予告 / BREAK） | 強敵の部屋の装備（エピック / 全部） |');
      L.push('|---|---|---|---|---|---|---|---|---|---|');
      for (const [p, by] of Object.entries(all)) {
        for (const k of BOTS) {
          const rs = by[k];
          if (!rs?.length) continue;
          const s = (fn: (r: Run) => number) => rs.reduce((n, r) => n + fn(r), 0);
          const fin = s((r) => r.eliteFinished);
          L.push(`| ${p} | ${name[k]} | ${s((r) => r.eliteOffered)} → ${s((r) => r.eliteChosen)}（${f(pct(s((r) => r.eliteChosen), s((r) => r.eliteOffered)))}%） | ${s((r) => r.eliteOnly)} | ${s((r) => r.eliteFights)} / ${fin} | ${f(fin ? s((r) => r.eliteRounds) / fin : NaN, 2)} | ${s((r) => r.eliteDowned)}（${f(fin ? s((r) => r.eliteDowned) / fin : NaN, 2)}） | ${s((r) => r.eliteLost)} | ${s((r) => r.frenzy)} / ${s((r) => r.frenzyBroke)} | ${s((r) => r.eliteEpic)} / ${s((r) => r.eliteGear)} |`);
        }
      }
      // ボスの段階（2026-11-14）: 主のボスの戦闘（全部の冒険の合計）
      L.push('', '## 7. 主のボス（ボスの部屋の戦闘で、段階を持つ敵。全部の冒険の合計）', '');
      L.push('| 人数 | bot | ボス戦（始まった / 終わった） | 勝った / 全滅 | 1戦のラウンド | 段階ごとのボスの行動（1戦あたり。1段目 / 2段目 / 3段目） | 2段目まで / 3段目まで行った割合（3段目は段階2つのボスのうち） | 開幕の一手（予告 / BREAK） | 終わった時に倒れていた味方（1戦あたり） | 入った時のHPの割合 |');
      L.push('|---|---|---|---|---|---|---|---|---|---|');
      for (const [p, by] of Object.entries(all)) {
        for (const k of BOTS) {
          const rs = by[k];
          if (!rs?.length) continue;
          const s = (fn: (c: BossCount) => number) => rs.reduce((n, r) => n + fn(r.boss), 0);
          const fin = s((c) => c.finished);
          const per = (x: number) => f(fin ? x / fin : NaN, 2);
          L.push(`| ${p} | ${name[k]} | ${s((c) => c.started)} / ${fin} | ${s((c) => c.won)} / ${s((c) => c.wiped)} | ${per(s((c) => c.rounds))} | ${per(s((c) => c.acts[0]))} / ${per(s((c) => c.acts[1]))} / ${per(s((c) => c.acts[2]))} | ${f(pct(s((c) => c.reached[1]), fin))}% / ${f(pct(s((c) => c.reached[2]), s((c) => c.maxPhases[2])))}% | ${s((c) => c.opening)} / ${s((c) => c.openingBroke)} | ${per(s((c) => c.downed))} | ${f(pct(s((c) => c.entryHp), s((c) => c.started)))}% |`);
        }
      }
      // 寄り道の値打ち（2026-11-14）
      L.push('', '## 8. 寄り道の値打ち（1冒険の平均。ボス戦・加護・見破り・段階は全部の冒険の合計）', '');
      L.push('| 人数 | bot | 寄り道のワールドターン | ランダムダンジョン（入った / 踏破）・災厄を倒した | 抜け道 | 鍵と最後のボス戦（数 / 全滅） | 加護（ボス戦に掛かっていた数の合計） | 見破り（戦闘 / 大技の BREAK） | 3択で選んだ秘宝 | 災厄の行動（最初 / 段階）・逃げた | 最後の中ボスの行動（最初 / 段階）・相方が倒れて段階 |');
      L.push('|---|---|---|---|---|---|---|---|---|---|---|');
      for (const [p, by] of Object.entries(all)) {
        for (const k of BOTS) {
          const rs = by[k];
          if (!rs?.length) continue;
          const s = (fn: (d: DetourCount) => number) => rs.reduce((n, r) => n + fn(r.dt), 0);
          const a = (fn: (r: Run) => number) => avg(rs.map(fn));
          const relics: Record<string, number> = {};
          for (const r of rs) for (const [id, n] of Object.entries(r.dt.relics)) relics[id] = (relics[id] ?? 0) + n;
          L.push(`| ${p} | ${name[k]} | ${f(a((r) => r.dt.turns), 1)} | ${f(a((r) => r.randomIn), 2)} / ${f(a((r) => r.randomDone), 2)}・${f(a((r) => r.scourgeKills), 2)} | ${f(a((r) => r.dt.shortcut), 2)} | ${s((d) => d.bossFights)} / ${s((d) => d.bossWiped)} | ${s((d) => d.boons)} | ${s((d) => d.insightFights)} / ${s((d) => d.insightBreaks)} | ${Object.entries(relics).sort((x, y) => y[1] - x[1]).map(([id, n]) => `${getItem(id).name}${n}`).join('・') || '-'} | ${s((d) => d.scourgeActs[0])} / ${s((d) => d.scourgeActs[1])}・${s((d) => d.scourgeFled)} | ${s((d) => d.midActs[0])} / ${s((d) => d.midActs[1])}・${s((d) => d.partnerPhase)} |`);
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
              breakPurple: a((r) => r.breakKind.purple), breakBig: a((r) => r.breakKind.big), breakRed: a((r) => r.breakKind.red),
              convBought: a((r) => r.convBought), convWorn: a((r) => r.convWorn),
              bigFightsClear: cl.length ? a((r) => r.bigFinished, cl) : null,
              randomIn: a((r) => r.randomIn), randomDone: a((r) => r.randomDone), scourgeKills: a((r) => r.scourgeKills), towers: a((r) => r.towers),
              restRoom: a((r) => r.restRoom), camp: a((r) => r.camp), inn: a((r) => r.inn), bought: a((r) => r.bought), hones: a((r) => r.hones),
              randomInClear: cl.length ? a((r) => r.randomIn, cl) : null, scourgeKillsClear: cl.length ? a((r) => r.scourgeKills, cl) : null,
              wipedRow: rs.filter((r) => r.wiped).map((r) => r.where), corrRow: rs.filter((r) => r.corr100).map((r) => r.where),
              // 強敵の計画（2026-11-13）: 合計（全部の冒険の和）
              elite: (() => {
                const s = (fn: (r: Run) => number) => rs.reduce((n, r) => n + fn(r), 0);
                return { offered: s((r) => r.eliteOffered), chosen: s((r) => r.eliteChosen), only: s((r) => r.eliteOnly), fights: s((r) => r.eliteFights), finished: s((r) => r.eliteFinished), rounds: s((r) => r.eliteRounds), downed: s((r) => r.eliteDowned), lost: s((r) => r.eliteLost), frenzy: s((r) => r.frenzy), frenzyBroke: s((r) => r.frenzyBroke), gear: s((r) => r.eliteGear), epic: s((r) => r.eliteEpic) };
              })(),
              // ボスの段階（2026-11-14）: 主のボスの数え（全部の冒険の合計・ボスごと）
              boss: (() => {
                const t = emptyBoss();
                for (const r of rs) {
                  const c = r.boss;
                  for (const key of ['started', 'finished', 'rounds', 'won', 'wiped', 'downed', 'opening', 'openingBroke', 'entryHp'] as const) t[key] += c[key];
                  for (let i = 0; i < 3; i++) { t.acts[i] += c.acts[i]; t.reached[i] += c.reached[i]; t.maxPhases[i] += c.maxPhases[i]; }
                  for (const [id, x] of Object.entries(c.byBoss)) {
                    const y = (t.byBoss[id] ??= emptyTally());
                    y.finished += x.finished; y.rounds += x.rounds; y.wiped += x.wiped;
                    for (let i = 0; i < 3; i++) { y.acts[i] += x.acts[i]; y.reached[i] += x.reached[i]; }
                  }
                }
                return t;
              })(),
              // 寄り道の値打ち（2026-11-14）: 合計
              dt: (() => {
                const t = emptyDetour();
                for (const r of rs) {
                  for (const key of ['turns', 'shortcut', 'bossFights', 'boons', 'insightFights', 'insightBreaks', 'bossWiped', 'partnerPhase', 'scourgeFled'] as const) t[key] += r.dt[key];
                  for (let i = 0; i < 2; i++) { t.scourgeActs[i] += r.dt.scourgeActs[i]; t.midActs[i] += r.dt.midActs[i]; }
                  for (const [id, n] of Object.entries(r.dt.relics)) t.relics[id] = (t.relics[id] ?? 0) + n;
                }
                return t;
              })(),
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
