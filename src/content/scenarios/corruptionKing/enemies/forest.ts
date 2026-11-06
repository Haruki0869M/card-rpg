// 翠の森の敵
import type { EnemyDef } from '../../../../types';

export const forestWolf: EnemyDef = {
  id: 'forestWolf',
  weak: ['fire'],
  name: '森の狼',
  icon: '🐺',
  maxHp: 22,
  baseLevel: 3,
  size: 0.9,
  exp: 7,
  gold: 4,
  pattern: 'random',
  maxConsecutive: 2,
  actions: [
    { id: 'bite', name: '噛みつき', effects: [{ kind: 'damage', amount: 7 }] },
    { id: 'pounce', name: '飛びかかり', effects: [{ kind: 'damage', amount: 4, hits: 2 }] },
    {
      id: 'howl',
      name: '遠吠え',
      effects: [
        { kind: 'block', amount: 5 },
        { kind: 'damage', amount: 3 },
      ],
    },
  ],
};

export const toxicShroom: EnemyDef = {
  id: 'toxicShroom',
  weak: ['fire'],
  resist: ['poison'],
  name: '毒キノコ',
  icon: '🍄',
  maxHp: 18,
  baseLevel: 3,
  size: 0.8,
  exp: 6,
  gold: 3,
  pattern: 'sequence',
  actions: [
    { id: 'spore', name: '毒の胞子', effects: [{ kind: 'applyStatus', status: 'poison', amount: 3 }] },
    { id: 'headbutt', name: '頭突き', effects: [{ kind: 'damage', element: 'poison', amount: 6 }] },
    {
      id: 'burst',
      name: '胞子の破裂',
      effects: [
        { kind: 'damage', amount: 3, to: 'foes' },
        { kind: 'applyStatus', status: 'poison', amount: 2, to: 'foes' },
      ],
    },
  ],
};

export const treeWarden: EnemyDef = {
  id: 'treeWarden',
  weak: ['fire'],
  resist: ['poison'],
  name: '樹木の番人',
  icon: '🌳',
  maxHp: 70,
  baseLevel: 5,
  size: 1.2,
  exp: 25,
  gold: 25,
  pattern: 'sequence',
  actions: [
    {
      id: 'rootBind',
      name: '根の拘束',
      effects: [
        { kind: 'damage', amount: 6 },
        { kind: 'applyStatus', status: 'weak', amount: 2 },
      ],
    },
    { id: 'barkGuard', name: '樹皮の守り', effects: [{ kind: 'block', amount: 15 }] },
    { id: 'branchSweep', name: '大枝の薙ぎ払い', effects: [{ kind: 'damage', amount: 9, to: 'foes' }] },
  ],
};

export const treantKing: EnemyDef = {
  id: 'treantKing',
  weak: ['fire'],
  resist: ['poison'],
  name: '樹魔トレントキング',
  icon: '🌲',
  maxHp: 150,
  baseLevel: 6,
  size: 1.45,
  exp: 80,
  gold: 80,
  pattern: 'sequence',
  actions: [
    { id: 'earthRoots', name: '大地の根', effects: [{ kind: 'damage', amount: 7, to: 'foes' }] },
    {
      id: 'sapCurse',
      name: '樹液の呪い',
      effects: [
        { kind: 'damage', element: 'poison', amount: 6 },
        { kind: 'applyStatus', status: 'poison', amount: 4 },
      ],
    },
    {
      id: 'ancientBark',
      name: '古木の鎧',
      effects: [
        { kind: 'block', amount: 18 },
        { kind: 'damage', amount: 8 },
      ],
    },
  ],
  phases: [
    {
      belowHpPct: 50,
      name: '怒れる古樹',
      pattern: 'sequence',
      actions: [
        { id: 'rageStorm', name: '怒りの暴風', effects: [{ kind: 'damage', amount: 11, to: 'foes' }] },
        { id: 'stranglingVine', name: '絞め殺す蔓', effects: [{ kind: 'damage', amount: 20 }] },
        {
          id: 'rotSpores',
          name: '腐蝕の胞子',
          effects: [
            { kind: 'damage', element: 'poison', amount: 5, to: 'foes' },
            { kind: 'applyStatus', status: 'poison', amount: 3, to: 'foes' },
          ],
        },
      ],
    },
  ],
};
