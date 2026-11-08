// 呪われた群島：追加の敵（K3 D）。港・珊瑚・沈没船・島々の組み合わせを増やす
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { pirateGrunt } from './harbor';

export const driftwoodSpirit: EnemyDef = {
  id: 'driftwoodSpirit',
  name: '流木の精霊',
  icon: '🪵',
  maxHp: 26,
  baseLevel: 3,
  size: 0.9,
  exp: 7,
  gold: 4,
  weak: ['fire'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'branch', name: '流木の枝', effects: [{ kind: 'damage', amount: 7 }] },
    { id: 'soak', name: '水を吸う', effects: [{ kind: 'block', amount: 6 }] },
    { id: 'splinter', name: 'ささくれ', effects: [{ kind: 'damage', amount: 3, hits: 2 }] },
  ],
};

export const lanternAngler: EnemyDef = {
  id: 'lanternAngler',
  name: '提灯鮟鱇',
  icon: '🐟',
  maxHp: 54,
  baseLevel: 9,
  size: 1.1,
  exp: 16,
  gold: 11,
  weak: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'lure', name: '妖しい灯り', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1 }, { kind: 'block', amount: 6 }] },
    { id: 'gulp', name: '大口の丸呑み', effects: [{ kind: 'damage', amount: 14 }] },
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
