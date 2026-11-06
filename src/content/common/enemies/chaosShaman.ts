import type { EnemyDef } from '../../../types';

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
    { id: 'chaosWave', name: '混沌の波', effects: [{ kind: 'damage', amount: 6, to: 'foes' }] },
    { id: 'curse', name: '呪い', effects: [{ kind: 'applyStatus', status: 'weak', amount: 2 }] },
    {
      id: 'ward',
      name: '守護の印',
      effects: [{ kind: 'block', amount: 10, to: 'otherAllies' }],
      fallbackIfAloneId: 'chaosWave',
    },
  ],
};
