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
/** 人喰い鮫の置き換える前の行動（「食いちぎる」を手負い狙いに置き換えた） */
const SHARK_ORIGINAL: EnemyDef['actions'] = [
  { id: 'circle', name: '獲物のまわりを泳ぐ', effects: [{ kind: 'block', amount: 6 }] },
  { id: 'chomp', name: '大顎の一撃', effects: [{ kind: 'damage', amount: 20 }] },
  { id: 'tear', name: '食いちぎる', effects: [{ kind: 'damage', amount: 8 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
];

// ----- 通常12体 -----
export const echoForestWolf: EnemyDef = dreamEcho(forestWolf, { id: 'echoForestWolf', name: '夢の森の狼', aura: 'shadow', element: 'dark' });
export const echoBogGhoul: EnemyDef = dreamEcho(bogGhoul, { id: 'echoBogGhoul', name: '夢の沼の亡者', aura: 'holy', element: 'holy' });
export const echoFrostWolf: EnemyDef = dreamEcho(frostWolf, { id: 'echoFrostWolf', name: '夢の雪狼', aura: 'shadow', element: 'dark' });
export const echoIceSwordsman: EnemyDef = dreamEcho(iceSwordsman, { id: 'echoIceSwordsman', name: '夢の氷の剣士', aura: 'storm', element: 'thunder', actions: ICE_SWORDSMAN_ORIGINAL });
export const echoShark: EnemyDef = dreamEcho(shark, { id: 'echoShark', name: '夢の鮫', aura: 'venom', element: 'poison', actions: SHARK_ORIGINAL });
export const echoDrownedSailor: EnemyDef = dreamEcho(drownedSailor, { id: 'echoDrownedSailor', name: '夢の溺れた水夫', aura: 'frost', element: 'ice' });
export const echoMummy: EnemyDef = dreamEcho(mummy, { id: 'echoMummy', name: '夢のミイラ', aura: 'ember', element: 'fire' });
export const echoSandScorpion: EnemyDef = dreamEcho(sandScorpion, { id: 'echoSandScorpion', name: '夢の砂蠍', aura: 'storm', element: 'thunder' });
export const echoAngelStatue: EnemyDef = dreamEcho(angelStatue, { id: 'echoAngelStatue', name: '夢の天使の像', aura: 'shadow', element: 'dark' });
export const echoMoonRabbit: EnemyDef = dreamEcho(moonRabbit, {
  id: 'echoMoonRabbit',
  name: '夢の月ウサギ',
  aura: 'iron',
  abilities: [{ name: '夢の毛皮', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } }],
});
export const echoConveyorBot: EnemyDef = dreamEcho(conveyorBot, { id: 'echoConveyorBot', name: '夢の機械兵', aura: 'frost', element: 'ice' });
export const echoWrenchGolem: EnemyDef = dreamEcho(wrenchGolem, {
  id: 'echoWrenchGolem',
  name: '夢のスパナのゴーレム',
  aura: 'iron',
  abilities: [
    { name: '夢の鋼', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } },
    { name: 'はね返すスパナ', effect: { when: 'hurt', do: [{ kind: 'retaliate', amount: 3, perTurn: 2 }] } },
  ],
});

// ----- エリート3体 -----
export const echoIceKnight: EnemyDef = dreamEcho(iceKnight, { id: 'echoIceKnight', name: '夢の氷の騎士', aura: 'shadow', element: 'dark', actions: ICE_KNIGHT_ORIGINAL });
export const echoSeaWitch: EnemyDef = dreamEcho(seaWitch, { id: 'echoSeaWitch', name: '夢の海の魔女', aura: 'ember', element: 'fire' });
export const echoColossusStatue: EnemyDef = dreamEcho(colossusStatue, { id: 'echoColossusStatue', name: '夢の石像の巨兵', aura: 'holy', element: 'holy' });

// ----- ボス3体（元のボスの段階をそのまま引き継ぎ、攻撃に夢の属性を足す。絵は元のボスの絵と変身の絵を使い回す） -----
export const echoWhiteQueen: EnemyDef = dreamEcho(whiteQueen, { id: 'echoWhiteQueen', name: '夢の白の女王', aura: 'shadow', element: 'dark' });
export const echoSandPharaoh: EnemyDef = dreamEcho(sandPharaoh, { id: 'echoSandPharaoh', name: '夢の砂塵の王', aura: 'venom', element: 'poison' });
export const echoGhostAdmiral: EnemyDef = dreamEcho(ghostAdmiral, { id: 'echoGhostAdmiral', name: '夢の亡霊提督', aura: 'storm', element: 'thunder' });
