import type { EnemyDef } from '../../../types';

export const goblinBrute: EnemyDef = {
  id: 'goblinBrute',
  name: '獣人の重装兵',
  icon: '👹',
  maxHp: 52,
  baseLevel: 4,
  size: 1.15,
  exp: 14,
  gold: 10,
  pattern: 'sequence',
  actions: [
    { id: 'slam', name: '叩きつけ', effects: [{ kind: 'damage', amount: 10 }] },
    {
      id: 'brace',
      name: '構える',
      effects: [
        { kind: 'block', amount: 12 },
        { kind: 'damage', amount: 5 },
      ],
    },
    { id: 'bigSwing', name: '大振り', effects: [{ kind: 'damage', amount: 16 }] },
  ],
};
