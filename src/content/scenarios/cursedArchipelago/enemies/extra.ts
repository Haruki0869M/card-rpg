// 呪われた群島：追加の敵（K3 D）。港・珊瑚・沈没船・島々の組み合わせを増やす
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { pirateGrunt } from './harbor';

export const driftwoodSpirit: EnemyDef = {
  id: 'driftwoodSpirit',
  name: '流木の精霊',
  icon: '🪵',
  maxHp: 24,
  baseLevel: 3,
  size: 0.9,
  exp: 7,
  gold: 4,
  weak: ['fire'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'branch', name: '流木の枝', effects: [{ kind: 'damage', amount: 6 }] },
    { id: 'soak', name: '水を吸う', effects: [{ kind: 'block', amount: 6 }] },
    { id: 'splinter', name: 'ささくれ', effects: [{ kind: 'damage', amount: 3, hits: 2 }] },
  ],
};

export const lanternAngler: EnemyDef = {
  id: 'lanternAngler',
  name: '提灯鮟鱇',
  icon: '🐟',
  maxHp: 48,
  baseLevel: 9,
  size: 1.1,
  exp: 16,
  gold: 11,
  weak: ['thunder'],
  pattern: 'sequence',
  // 敵の特殊な行動・第2弾（docs/tasks/enemy-behaviors-round2-plan.md §3・fix-plan §4）: 盾砕きを1ターン目に予告する（2ターン目からは並んだ牙・妖しい灯り・盾砕きの順）
  firstActionId: 'gulp',
  actions: [
    { id: 'lure', name: '妖しい灯り', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
    // 「大口の丸呑み」を盾砕きに置き換えた（ブロックを0にしてから、同じ12のダメージ）。ID は古い保存のために残す
    { id: 'gulp', name: '丸呑み', big: true, behavior: 'shatter', brief: '壊した盾を飲み込む', hint: 'ブロックを全部壊して自分のブロックにしてから、12。ブロックを張りすぎないか、BREAK する', effects: [{ kind: 'shieldBreak', absorb: true }, { kind: 'damage', amount: 12 }] },
    { id: 'fangs', name: '並んだ牙', effects: [{ kind: 'damage', amount: 5, hits: 2 }] },
  ],
};

export const cursedPirateGrunt: EnemyDef = makeVariant(pirateGrunt, {
  id: 'cursedPirateGrunt',
  name: '呪われた海賊の下っ端',
  aura: 'shadow',
  maxHp: 38,
  baseLevel: 7,
  exp: 13,
  gold: 9,
  weak: ['holy'],
  resist: ['dark'],
  actions: [
    { id: 'saber', name: '呪いのサーベル', effects: [{ kind: 'damage', amount: 11, element: 'dark' }] },
    { id: 'knives', name: '黒い投げナイフ', effects: [{ kind: 'damage', amount: 4, hits: 2, element: 'dark' }] },
    { id: 'duck', name: '樽の陰の呪い', effects: [{ kind: 'block', amount: 6 }, { kind: 'applyStatus', status: 'curse', amount: 1 }] },
  ],
});
