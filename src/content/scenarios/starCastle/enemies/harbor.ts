// 星降る天空城：雲の港。入門の敵。どちらも雷に弱い
import type { EnemyDef } from '../../../../types';

export const cloudSheep: EnemyDef = {
  id: 'cloudSheep',
  name: '雲羊',
  icon: '☁',
  maxHp: 23,
  baseLevel: 1,
  size: 0.85,
  exp: 4,
  gold: 2,
  weak: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'charge', name: 'ふわふわ突進', effects: [{ kind: 'damage', amount: 7 }] },
    { id: 'fluff', name: '綿雲にくるまる', effects: [{ kind: 'block', amount: 5 }] },
    { id: 'headbutt', name: '頭突き', effects: [{ kind: 'damage', amount: 4, hits: 2 }] },
  ],
};

export const skyGull: EnemyDef = {
  id: 'skyGull',
  name: '空カモメ',
  icon: '🕊',
  maxHp: 23,
  baseLevel: 2,
  size: 0.8,
  exp: 5,
  gold: 3,
  weak: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'peck', name: '二連ついばみ', effects: [{ kind: 'damage', amount: 4, hits: 2 }] },
    { id: 'soar', name: '風に乗る', effects: [{ kind: 'block', amount: 4 }] },
    { id: 'dive', name: '急降下', effects: [{ kind: 'damage', amount: 8 }] },
  ],
};
