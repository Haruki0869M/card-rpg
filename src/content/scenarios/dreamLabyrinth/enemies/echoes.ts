// 夢の再来18体（通常12・エリート3・ボス3）。過去のシナリオの敵を、夢の形で蘇らせる（絵は使い回し）
import type { EnemyDef } from '../../../../types';
import { bogGhoul } from '../../corruptionKing/enemies/swamp';
import { forestWolf } from '../../corruptionKing/enemies/forest';
import { iceKnight, } from '../../frozenKingdom/enemies/lake';
import { frostWolf } from '../../frozenKingdom/enemies/foothills';
import { iceSwordsman } from '../../frozenKingdom/enemies/range';
import { whiteQueen } from '../../frozenKingdom/enemies/castle';
import { drownedSailor } from '../../cursedArchipelago/enemies/mist';
import { seaWitch, shark } from '../../cursedArchipelago/enemies/isles';
import { ghostAdmiral } from '../../cursedArchipelago/enemies/wreck';
import { mummy } from '../../sandDynasty/enemies/dunes';
import { sandScorpion } from '../../sandDynasty/enemies/ruins';
import { colossusStatue, sandPharaoh } from '../../sandDynasty/enemies/palace';
import { angelStatue, moonRabbit } from '../../starCastle/enemies/hill';
import { conveyorBot } from '../../clockworkEmpire/enemies/factory';
import { wrenchGolem } from '../../clockworkEmpire/enemies/valley';
import { dreamEcho } from './echo';

// 敵の特殊な行動・第2弾（docs/tasks/enemy-behaviors-round2-plan.md §3）: 元の敵の行動を置き換えたので、表に無い夢の再来は、
// 置き換える前の行動を土台にする（元の敵の変更が、勝手に伝わらないように）
/** 氷の剣士の置き換える前の行動（「氷刃の突き」を盾砕きに置き換えた） */
const ICE_SWORDSMAN_ORIGINAL: EnemyDef['actions'] = [
  { id: 'combo', name: '二の太刀', effects: [{ kind: 'damage', amount: 5, hits: 2 }] },
  { id: 'stance', name: '霜刃の構え', effects: [{ kind: 'block', amount: 9 }] },
  { id: 'thrust', name: '氷刃の突き', effects: [{ kind: 'damage', amount: 12 }] },
];
/** 氷の騎士の置き換える前の行動（「氷鎧の構え」をかばうに置き換えた） */
const ICE_KNIGHT_ORIGINAL: EnemyDef['actions'] = [
  { id: 'slash', name: '氷剣の一撃', effects: [{ kind: 'damage', amount: 14 }] },
  { id: 'guard', name: '氷鎧の構え', effects: [{ kind: 'block', amount: 16 }] },
  { id: 'crush', name: '砕氷斬', big: true, effects: [{ kind: 'damage', amount: 18 }] },
  { id: 'sweep', name: '横薙ぎ', big: true, effects: [{ kind: 'damage', amount: 7, to: 'foes' }] },
];
/** 月のウサギの置き換える前の行動（「月影の呪い」を浄化に置き換え、順番の最後へ移した） */
const MOON_RABBIT_ORIGINAL: EnemyDef['actions'] = [
  { id: 'mallet', name: '月の杵', effects: [{ kind: 'damage', amount: 10 }] },
  { id: 'hex', name: '月影の呪い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'block', amount: 4 }] },
  { id: 'hop', name: '跳ねる杵つき', effects: [{ kind: 'damage', amount: 5, hits: 2 }] },
];

// 表に載っている夢の再来（夢の機械兵・夢のスパナのゴーレム・夢の石像の巨兵）は、その再来だけの行動を書く（元の敵は変えない。ダメージ+1と属性は同じにかかる）
/** 夢の機械兵: 「部品の点検」を手数読み「動きを点検する」に置き換えた（fix-plan §7 の4）。ID は古い保存のために残す。4つ目の地域なのでブロック10 */
const ECHO_CONVEYOR_BOT_ACTIONS: EnemyDef['actions'] = [
  { id: 'press', name: '流れ作業の一撃', effects: [{ kind: 'damage', amount: 7 }] },
  { id: 'press2', name: '流れ作業の一撃', effects: [{ kind: 'damage', amount: 7 }] },
  { id: 'reset', name: '動きを点検する', big: true, behavior: 'punish', hint: 'このターンにカードを4枚以上使った味方に、枚数×2のダメージ', effects: [{ kind: 'punishPlays', amount: 2, min: 4 }, { kind: 'block', amount: 10 }] },
];
/**
 * 夢のスパナのゴーレム: 「ネジを締め直す」を仲間を呼ぶ（夢の機械兵）に置き換えた。ID は古い保存のために残す。
 * 呼べる時は優先・2ターン続けては呼ばない・1戦闘に2回まで。呼べない時は「スパナの一撃」。4つ目の地域なのでブロック10
 */
const ECHO_WRENCH_GOLEM_ACTIONS: EnemyDef['actions'] = [
  { id: 'swing', name: 'スパナの一撃', effects: [{ kind: 'damage', amount: 11 }] },
  { id: 'tighten', name: '夢の人形を組み直す', big: true, behavior: 'call', cutIn: { when: 'canSummon', rest: 1, noRepeat: true }, hint: '仲間を1体呼ぶ。その前に倒すか、BREAK する', effects: [{ kind: 'summonEnemy', enemy: 'echoConveyorBot', uses: 2, call: true, orElse: 'swing' }, { kind: 'block', amount: 10 }] },
  { id: 'bash', name: '振り下ろし', effects: [{ kind: 'damage', amount: 7 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
];
/** 夢の石像の巨兵: 「盾で押し潰す」（ブロック12＋8。再来は聖9）をかばうに置き換えた。ID は古い保存のために残す。6つ目の地域なのでブロック10。1体の時は「巨兵の拳」 */
const ECHO_COLOSSUS_ACTIONS: EnemyDef['actions'] = [
  { id: 'wall', name: '石の大盾', effects: [{ kind: 'block', amount: 24 }] },
  { id: 'fist', name: '巨兵の拳', big: true, effects: [{ kind: 'damage', amount: 17 }] },
  { id: 'stomp', name: '地響き', big: true, effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
  { id: 'shove', name: '巨兵が立ちはだかる', big: true, behavior: 'guard', fallbackIfAloneId: 'fist', hint: '次の味方の番の間、ほかの敵への単体攻撃を代わりに受ける。全体攻撃は通る', effects: [{ kind: 'guardAllies' }, { kind: 'block', amount: 10 }] },
];

// ----- 通常12体 -----
export const echoForestWolf: EnemyDef = dreamEcho(forestWolf, { id: 'echoForestWolf', name: '夢の森の狼', aura: 'shadow', element: 'dark' });
export const echoBogGhoul: EnemyDef = dreamEcho(bogGhoul, { id: 'echoBogGhoul', name: '夢の沼の亡者', aura: 'holy', element: 'holy' });
export const echoFrostWolf: EnemyDef = dreamEcho(frostWolf, { id: 'echoFrostWolf', name: '夢の雪狼', aura: 'shadow', element: 'dark' });
export const echoIceSwordsman: EnemyDef = dreamEcho(iceSwordsman, { id: 'echoIceSwordsman', name: '夢の氷の剣士', aura: 'storm', element: 'thunder', actions: ICE_SWORDSMAN_ORIGINAL });
// 夢の鮫（表の手負い狙い）: 元の人喰い鮫の「血の匂いを追う」（8 → 再来は毒9・HPが半分以下なら×1.5）をそのまま使い、1ターン目に予告する
export const echoShark: EnemyDef = dreamEcho(shark, { id: 'echoShark', name: '夢の鮫', aura: 'venom', element: 'poison', firstActionId: 'tear' });
export const echoDrownedSailor: EnemyDef = dreamEcho(drownedSailor, { id: 'echoDrownedSailor', name: '夢の溺れた水夫', aura: 'frost', element: 'ice' });
export const echoMummy: EnemyDef = dreamEcho(mummy, { id: 'echoMummy', name: '夢のミイラ', aura: 'ember', element: 'fire' });
export const echoSandScorpion: EnemyDef = dreamEcho(sandScorpion, { id: 'echoSandScorpion', name: '夢の砂蠍', aura: 'storm', element: 'thunder' });
export const echoAngelStatue: EnemyDef = dreamEcho(angelStatue, { id: 'echoAngelStatue', name: '夢の天使の像', aura: 'shadow', element: 'dark' });
export const echoMoonRabbit: EnemyDef = dreamEcho(moonRabbit, {
  id: 'echoMoonRabbit',
  name: '夢の月ウサギ',
  aura: 'iron',
  actions: MOON_RABBIT_ORIGINAL,
  abilities: [{ name: '夢の毛皮', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } }],
});
export const echoConveyorBot: EnemyDef = dreamEcho(conveyorBot, { id: 'echoConveyorBot', name: '夢の機械兵', aura: 'frost', element: 'ice', actions: ECHO_CONVEYOR_BOT_ACTIONS, firstActionId: 'reset' });
export const echoWrenchGolem: EnemyDef = dreamEcho(wrenchGolem, {
  id: 'echoWrenchGolem',
  name: '夢のスパナのゴーレム',
  aura: 'iron',
  actions: ECHO_WRENCH_GOLEM_ACTIONS,
  abilities: [
    { name: '夢の鋼', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } },
    { name: 'はね返すスパナ', effect: { when: 'hurt', do: [{ kind: 'retaliate', amount: 3, perTurn: 2 }] } },
  ],
});

// ----- エリート3体 -----
export const echoIceKnight: EnemyDef = dreamEcho(iceKnight, { id: 'echoIceKnight', name: '夢の氷の騎士', aura: 'shadow', element: 'dark', actions: ICE_KNIGHT_ORIGINAL });
export const echoSeaWitch: EnemyDef = dreamEcho(seaWitch, { id: 'echoSeaWitch', name: '夢の海の魔女', aura: 'ember', element: 'fire' });
export const echoColossusStatue: EnemyDef = dreamEcho(colossusStatue, { id: 'echoColossusStatue', name: '夢の石像の巨兵', aura: 'holy', element: 'holy', actions: ECHO_COLOSSUS_ACTIONS, firstActionId: 'shove' });

// ----- ボス3体（元のボスの段階をそのまま引き継ぎ、攻撃に夢の属性を足す。絵は元のボスの絵と変身の絵を使い回す） -----
export const echoWhiteQueen: EnemyDef = dreamEcho(whiteQueen, { id: 'echoWhiteQueen', name: '夢の白の女王', aura: 'shadow', element: 'dark' });
export const echoSandPharaoh: EnemyDef = dreamEcho(sandPharaoh, { id: 'echoSandPharaoh', name: '夢の砂塵の王', aura: 'venom', element: 'poison' });
export const echoGhostAdmiral: EnemyDef = dreamEcho(ghostAdmiral, { id: 'echoGhostAdmiral', name: '夢の亡霊提督', aura: 'storm', element: 'thunder' });
