import type { EnemyDef } from '../../../types';

// 黄金のコソ泥（突発イベント）: 硬くて素早い。3ターン以内に倒さないと4ターン目の初めに逃げる
export const goldenThief: EnemyDef = {
  id: 'goldenThief',
  name: '黄金のコソ泥',
  icon: '💰',
  maxHp: 34,
  baseLevel: 2,
  size: 0.85,
  exp: 14,
  gold: 90,
  pattern: 'random',
  maxConsecutive: 2,
  abilities: [{ name: '逃げ足', description: '戦闘の4ターン目の初めに逃げ出す（倒したことにならない）', effect: { when: 'turnStart', if: [{ kind: 'turnAtLeast', turn: 4 }], do: [{ kind: 'flee' }] } }],
  actions: [
    { id: 'hide', name: '金袋で守る', effects: [{ kind: 'block', amount: 8 }] },
    { id: 'jab', name: 'ちょっかい', effects: [{ kind: 'damage', amount: 4 }] },
  ],
};
