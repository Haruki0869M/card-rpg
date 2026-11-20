// 機械仕掛けの帝国：煙突の街。小さな機械と人形。雷が主な弱点、機械は毒に耐性。
import type { EnemyDef } from '../../../../types';

export const gearBug: EnemyDef = {
  id: 'gearBug',
  name: '歯車の虫',
  icon: '⚙',
  maxHp: 20,
  baseLevel: 1,
  size: 0.8,
  exp: 4,
  gold: 2,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'gnaw', name: '歯車でかじる', effects: [{ kind: 'damage', amount: 5 }] },
    { id: 'curl', name: '殻に丸まる', effects: [{ kind: 'block', amount: 4 }] },
    { id: 'nibble', name: '細かくかじる', effects: [{ kind: 'damage', amount: 2, hits: 2 }] },
  ],
};

export const steamRat: EnemyDef = {
  id: 'steamRat',
  name: '蒸気ネズミ',
  icon: '⚙',
  maxHp: 20,
  baseLevel: 2,
  size: 0.8,
  exp: 5,
  gold: 3,
  weak: ['ice', 'thunder'],
  resist: ['fire'],
  pattern: 'sequence',
  actions: [
    { id: 'bite', name: '熱い前歯', effects: [{ kind: 'damage', amount: 5 }] },
    { id: 'vent', name: '蒸気を吹く', effects: [{ kind: 'damage', amount: 2 }, { kind: 'applyStatus', status: 'burn', amount: 1 }] },
    { id: 'dash', name: 'すばやい体当たり', effects: [{ kind: 'damage', amount: 3, hits: 2 }] },
  ],
  abilities: [{ name: 'すばしっこい', effect: { when: 'battleStart', do: [{ kind: 'damage', amount: 2, to: 'randomFoe' }] } }],
};

export const brokenAutomaton: EnemyDef = {
  id: 'brokenAutomaton',
  name: '壊れた人形',
  icon: '♟',
  maxHp: 24,
  baseLevel: 2,
  size: 1,
  exp: 5,
  gold: 3,
  weak: ['fire', 'thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'jerk', name: 'ぎくしゃく殴り', effects: [{ kind: 'damage', amount: 6 }] },
    { id: 'stall', name: '関節がきしむ', effects: [{ kind: 'block', amount: 5 }] },
    { id: 'flail', name: '腕を振り回す', effects: [{ kind: 'damage', amount: 3, to: 'foes' }] },
  ],
};
