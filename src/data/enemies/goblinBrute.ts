import type { EnemyDef } from '../../types';

export const goblinBrute: EnemyDef = {
  id: 'goblinBrute',
  name: 'ゴブリン重装兵',
  icon: '👹',
  maxHp: 52,
  baseLevel: 4,
  size: 1.15,
  pattern: 'sequence',
  actions: [
    { id: 'slam', name: '叩きつけ', effects: [{ kind: 'attack', amount: 10, hits: 1, target: 'single' }] },
    {
      id: 'brace',
      name: '構える',
      effects: [
        { kind: 'block', amount: 12, target: 'self' },
        { kind: 'attack', amount: 5, hits: 1, target: 'single' },
      ],
    },
    { id: 'bigSwing', name: '大振り', effects: [{ kind: 'attack', amount: 16, hits: 1, target: 'single' }] },
  ],
};
