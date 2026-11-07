import type { EnemyDef } from '../../../types';

// 護衛の野犬（突発イベント「珍獣商人」）。どのシナリオでも出る
export const guardDog: EnemyDef = {
  id: 'guardDog',
  name: '護衛の野犬',
  icon: '🐕',
  maxHp: 20,
  baseLevel: 2,
  size: 0.85,
  exp: 6,
  gold: 3,
  pattern: 'random',
  maxConsecutive: 2,
  actions: [
    { id: 'bite', name: '噛みつき', effects: [{ kind: 'damage', amount: 6 }] },
    { id: 'growl', name: 'うなり声', effects: [{ kind: 'block', amount: 4 }, { kind: 'applyStatus', status: 'weak', amount: 1, to: 'target' }] },
  ],
};
