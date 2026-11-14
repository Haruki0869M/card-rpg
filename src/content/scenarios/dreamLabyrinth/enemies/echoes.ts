// 夢の再来18体（通常12・エリート3・ボス3）。過去のシナリオの敵を、夢の形で蘇らせる（絵は使い回し）
import type { EnemyDef, EnemyPhaseDef } from '../../../../types';
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
// ボスの段階（2026-11-14・docs/tasks/boss-phase-plan.md。オーナーの返事 4-A）: 夢の鍵のボス3体は、元のボスに無い決まりを持つ（写しにしない）。
// 段階の行動は元のボスの物（2026-11-14 に元のボスへ足した決まりの行動は外す）に、夢の決まりの開幕の一手を足す。
// 段階が2つあるので、2つ目の段階は同じ決まりをもう一度・強めて見せる【提案】（夢の砂塵の王は、弱点が表に戻る）
/** 元のボスの i 番目の段階の行動から、元のボスの決まりの行動（drop）を外した物 */
const basePhase = (base: EnemyDef, i: number, drop: string[]): EnemyPhaseDef => {
  const p = base.phases![i];
  return { belowHpPct: p.belowHpPct, name: p.name, pattern: p.pattern, actions: p.actions.filter((a) => !drop.includes(a.id)) };
};
const MAID_HINT = '子守歌の鳥を1体呼ぶ（倒しても報酬なし）。鳥は子守歌で女王を回復する。火の弱点で BREAK すると止まる。鳥を先に倒す';
export const echoWhiteQueen: EnemyDef = dreamEcho(whiteQueen, {
  id: 'echoWhiteQueen', name: '夢の白の女王', aura: 'shadow', element: 'dark',
  phases: [
    { ...basePhase(whiteQueen, 0, ['frostBreath', 'eternalFrost']), openingActionId: 'callMaid', rule: '夢の侍女（子守歌の鳥）を呼び、女王を回復させる（火で BREAK すると止まる。鳥を先に倒す）',
      actions: [{ id: 'callMaid', name: '夢の侍女を呼ぶ', big: true, behavior: 'call', hint: MAID_HINT, effects: [{ kind: 'summonEnemy', enemy: 'lullabyBird', uses: 2, orElse: 'tears' }, { kind: 'block', amount: 10 }] }, ...basePhase(whiteQueen, 0, ['frostBreath', 'eternalFrost']).actions] },
    { ...basePhase(whiteQueen, 1, ['shellShatter']), openingActionId: 'maidReturn', rule: '侍女をもう一度呼び戻す（火で BREAK すると止まる。鳥を先に倒す）',
      actions: [{ id: 'maidReturn', name: '侍女たちを呼び戻す', big: true, scripted: true, behavior: 'call', hint: MAID_HINT, effects: [{ kind: 'summonEnemy', enemy: 'lullabyBird', uses: 3, orElse: 'prayer' }, { kind: 'block', amount: 14 }] }, ...basePhase(whiteQueen, 1, ['shellShatter']).actions] },
  ],
});
export const echoSandPharaoh: EnemyDef = dreamEcho(sandPharaoh, {
  id: 'echoSandPharaoh', name: '夢の砂塵の王', aura: 'venom', element: 'poison',
  phases: [
    { ...basePhase(sandPharaoh, 0, ['royalEye']), openingActionId: 'dreamFlip', rule: '夢が裏返り、弱点と耐性が入れ替わる（弱点は毒・闇、火・聖は効きにくい。弱点の印に出る）', weak: ['poison', 'dark'], resist: ['fire', 'holy'],
      actions: [{ id: 'dreamFlip', name: '夢が裏返る', big: true, scripted: true, effects: [{ kind: 'damage', amount: 11, to: 'foes' }] }, ...basePhase(sandPharaoh, 0, ['royalEye']).actions] },
    { ...basePhase(sandPharaoh, 1, ['stormOmen', 'greatStorm']), openingActionId: 'dreamFlipBack', rule: '夢が表に戻り、弱点と耐性も元に戻る（弱点は火・聖。弱点の印に出る）', weak: ['fire', 'holy'], resist: ['poison', 'dark'],
      actions: [{ id: 'dreamFlipBack', name: '夢が表に戻る', big: true, scripted: true, effects: [{ kind: 'damage', amount: 14, to: 'foes' }] }, ...basePhase(sandPharaoh, 1, ['stormOmen', 'greatStorm']).actions] },
  ],
});
const SEAL_HINT = '味方全員の回復が、2ターン半分になる。BREAK するか、先に回復を使う';
export const echoGhostAdmiral: EnemyDef = dreamEcho(ghostAdmiral, {
  id: 'echoGhostAdmiral', name: '夢の亡霊提督', aura: 'storm', element: 'thunder',
  phases: [
    { ...basePhase(ghostAdmiral, 0, ['seekWeak']), openingActionId: 'dreamSeal', rule: '目覚めを拒む霧で、味方の回復を半分にする（聖で BREAK すると止まる。回復に頼らない）',
      actions: [{ id: 'dreamSeal', name: '目覚めを拒む霧', big: true, behavior: 'healSeal', hint: SEAL_HINT, effects: [{ kind: 'applyStatus', status: 'healSeal', amount: 2, to: 'foes' }, { kind: 'block', amount: 12 }] }, ...basePhase(ghostAdmiral, 0, ['seekWeak']).actions] },
    { ...basePhase(ghostAdmiral, 1, ['crownCall']), openingActionId: 'dreamSeal2', rule: '永い眠りの霧で、回復を半分にして呪う（聖で BREAK すると止まる。回復に頼らない）',
      actions: [{ id: 'dreamSeal2', name: '永い眠りの霧', big: true, scripted: true, behavior: 'healSeal', hint: SEAL_HINT, effects: [{ kind: 'applyStatus', status: 'healSeal', amount: 2, to: 'foes' }, { kind: 'applyStatus', status: 'curse', amount: 1, to: 'foes' }, { kind: 'block', amount: 14 }] }, ...basePhase(ghostAdmiral, 1, ['crownCall']).actions] },
  ],
});
