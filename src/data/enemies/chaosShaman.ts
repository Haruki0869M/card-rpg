import type { EnemyDef } from '../../types';

export const chaosShaman: EnemyDef = {
  id: 'chaosShaman',
  name: 'カオスシャーマン',
  icon: '🧙',
  maxHp: 36,
  baseLevel: 3,
  exp: 9,
  gold: 6,
  pattern: 'random',
  firstActionId: 'curse',
  maxConsecutive: 1,
  actions: [
    { id: 'chaosWave', name: '混沌の波', effects: [{ kind: 'attack', amount: 6, hits: 1, target: 'all' }] },
    { id: 'curse', name: '呪い', effects: [{ kind: 'debuff', status: 'weak', amount: 2, target: 'single' }] },
    {
      id: 'ward',
      name: '守護の印',
      effects: [{ kind: 'block', amount: 10, target: 'otherEnemies' }],
      fallbackIfAloneId: 'chaosWave',
    },
  ],
};
