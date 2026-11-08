// 砂塵の王朝：入口（砂の門）。砂漠の生き物は火に強く、氷に弱い。
import type { EnemyDef } from '../../../../types';

export const sandScarab: EnemyDef = {
  id: 'sandScarab',
  name: '砂甲虫',
  icon: '🪲',
  maxHp: 20,
  baseLevel: 1,
  size: 0.8,
  exp: 4,
  gold: 2,
  weak: ['thunder'],
  resist: ['fire'],
  pattern: 'sequence',
  actions: [
    { id: 'shell', name: '固い甲羅', effects: [{ kind: 'block', amount: 6 }] },
    { id: 'ram', name: '甲羅の体当たり', effects: [{ kind: 'damage', amount: 6 }] },
    { id: 'horn', name: '小さな角', effects: [{ kind: 'damage', amount: 3, hits: 2 }] },
  ],
};

export const desertViper: EnemyDef = {
  id: 'desertViper',
  name: '砂漠の毒蛇',
  icon: '🐍',
  maxHp: 22,
  baseLevel: 2,
  size: 0.85,
  exp: 5,
  gold: 3,
  weak: ['ice'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'bite', name: '毒の噛みつき', effects: [{ kind: 'damage', amount: 4 }, { kind: 'applyStatus', status: 'poison', amount: 2 }] },
    { id: 'coil', name: '砂にとぐろを巻く', effects: [{ kind: 'block', amount: 5 }] },
    { id: 'strike', name: '素早い一咬み', effects: [{ kind: 'damage', amount: 7 }] },
  ],
};
