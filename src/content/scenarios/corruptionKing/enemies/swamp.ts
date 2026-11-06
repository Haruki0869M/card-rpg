// 嘆きの沼の敵（シナリオ1）
import type { EnemyDef } from '../../../../types';

export const bogGhoul: EnemyDef = {
  id: 'bogGhoul',
  weak: ['holy', 'fire'],
  resist: ['poison', 'dark'],
  name: '沼の亡者',
  icon: '💀',
  maxHp: 30,
  baseLevel: 5,
  size: 0.95,
  exp: 10,
  gold: 6,
  pattern: 'random',
  maxConsecutive: 2,
  actions: [
    { id: 'claw', name: '腐った爪', effects: [{ kind: 'damage', element: 'poison', amount: 8 }] },
    {
      id: 'grasp',
      name: '亡者の手',
      effects: [
        { kind: 'damage', amount: 5 },
        { kind: 'applyStatus', status: 'weak', amount: 1 },
      ],
    },
  ],
};

export const mireSlime: EnemyDef = {
  id: 'mireSlime',
  weak: ['thunder'],
  resist: ['poison'],
  name: '沼の大ガマ',
  icon: '🟢',
  maxHp: 26,
  baseLevel: 5,
  size: 0.85,
  exp: 9,
  gold: 5,
  pattern: 'sequence',
  actions: [
    { id: 'harden', name: '泥の膜', effects: [{ kind: 'block', amount: 8 }, { kind: 'damage', amount: 4 }] },
    { id: 'splash', name: '毒泥の飛沫', effects: [{ kind: 'applyStatus', status: 'poison', amount: 3, to: 'foes' }] },
    { id: 'tackle', name: '体当たり', effects: [{ kind: 'damage', element: 'poison', amount: 5, hits: 2 }] },
  ],
};

export const bogWraith: EnemyDef = {
  id: 'bogWraith',
  weak: ['holy'],
  resist: ['ice', 'dark'],
  name: '沼の怨霊',
  icon: '👻',
  maxHp: 48,
  baseLevel: 6,
  size: 1.05,
  exp: 22,
  gold: 18,
  pattern: 'sequence',
  actions: [
    { id: 'wail', name: '嘆きの声', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }] },
    { id: 'touch', name: '凍える手', effects: [{ kind: 'damage', element: 'ice', amount: 12 }] },
    { id: 'haunt', name: '取り憑く', effects: [{ kind: 'damage', element: 'dark', amount: 6, to: 'foes' }] },
  ],
  abilities: [{ name: '怨念', effect: { when: 'turnStart', do: [{ kind: 'heal', amount: 3, to: 'self' }] } }],
};

export const mordea: EnemyDef = {
  id: 'mordea',
  weak: ['holy'],
  resist: ['dark', 'poison'],
  name: '屍術師モルデア',
  icon: '🧙',
  maxHp: 210,
  baseLevel: 8,
  size: 1.35,
  exp: 120,
  gold: 120,
  pattern: 'sequence',
  actions: [
    { id: 'deathBolt', name: '死の魔弾', effects: [{ kind: 'damage', element: 'dark', amount: 14 }] },
    {
      id: 'curse',
      name: '屍の呪い',
      effects: [
        { kind: 'applyStatus', status: 'weak', amount: 2, to: 'foes' },
        { kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' },
      ],
    },
    { id: 'boneShield', name: '骨の盾', effects: [{ kind: 'block', amount: 18 }, { kind: 'damage', amount: 8 }] },
  ],
  phases: [
    {
      belowHpPct: 50,
      name: '冥府の屍術師',
      pattern: 'sequence',
      actions: [
        { id: 'necromance', name: '死霊の宴', effects: [{ kind: 'heal', amount: 20, to: 'self' }, { kind: 'damage', element: 'dark', amount: 10, to: 'foes' }] },
        { id: 'soulRip', name: '魂裂き', effects: [{ kind: 'damage', element: 'dark', amount: 22 }] },
        { id: 'plague', name: '疫病の霧', effects: [{ kind: 'applyStatus', status: 'poison', amount: 4, to: 'foes' }, { kind: 'damage', amount: 5, to: 'foes' }] },
      ],
    },
  ],
};
