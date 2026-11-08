// 呪われた群島：港の島（Lv1〜3）。海の生き物は雷に弱い。凍結は使わない（凍てつく王国と差をつける）
import type { EnemyDef } from '../../../../types';

export const seaCrab: EnemyDef = {
  id: 'seaCrab',
  name: '大蟹',
  icon: '🦀',
  maxHp: 22,
  baseLevel: 1,
  size: 0.9,
  exp: 4,
  gold: 2,
  weak: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'pinch', name: 'はさみの二連撃', effects: [{ kind: 'damage', amount: 3, hits: 2 }] },
    { id: 'shell', name: '甲羅にこもる', effects: [{ kind: 'block', amount: 6 }] },
    { id: 'crush', name: '挟みつぶし', effects: [{ kind: 'damage', amount: 7 }] },
  ],
};

export const jellyfish: EnemyDef = {
  id: 'jellyfish',
  name: 'クラゲ',
  icon: '🪼',
  maxHp: 18,
  baseLevel: 2,
  size: 0.8,
  exp: 5,
  gold: 3,
  weak: ['thunder', 'fire'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'sting', name: '毒の触手', effects: [{ kind: 'damage', amount: 3 }, { kind: 'applyStatus', status: 'poison', amount: 2 }] },
    { id: 'drift', name: 'ただよう', effects: [{ kind: 'block', amount: 4 }] },
    { id: 'lash', name: '触手の鞭', effects: [{ kind: 'damage', amount: 7 }] },
  ],
};

export const pirateGrunt: EnemyDef = {
  id: 'pirateGrunt',
  name: '海賊の下っ端',
  icon: '🏴',
  maxHp: 26,
  baseLevel: 3,
  size: 1,
  exp: 7,
  gold: 5,
  pattern: 'sequence',
  actions: [
    { id: 'saber', name: 'サーベルの斬りつけ', effects: [{ kind: 'damage', amount: 8 }] },
    { id: 'knives', name: '投げナイフ', effects: [{ kind: 'damage', amount: 3, hits: 2 }] },
    { id: 'duck', name: '樽の陰に隠れる', effects: [{ kind: 'block', amount: 5 }] },
  ],
};
