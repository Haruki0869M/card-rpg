// 翠の森の敵
import type { EnemyDef } from '../../types';

export const forestWolf: EnemyDef = {
  id: 'forestWolf',
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
    { id: 'bite', name: '噛みつき', effects: [{ kind: 'attack', amount: 7, hits: 1, target: 'single' }] },
    { id: 'pounce', name: '飛びかかり', effects: [{ kind: 'attack', amount: 4, hits: 2, target: 'single' }] },
    {
      id: 'howl',
      name: '遠吠え',
      effects: [
        { kind: 'block', amount: 5, target: 'self' },
        { kind: 'attack', amount: 3, hits: 1, target: 'single' },
      ],
    },
  ],
};

export const toxicShroom: EnemyDef = {
  id: 'toxicShroom',
  name: '毒キノコ',
  icon: '🍄',
  maxHp: 18,
  baseLevel: 3,
  size: 0.8,
  exp: 6,
  gold: 3,
  pattern: 'sequence',
  actions: [
    { id: 'spore', name: '毒の胞子', effects: [{ kind: 'debuff', status: 'poison', amount: 3, target: 'single' }] },
    { id: 'headbutt', name: '頭突き', effects: [{ kind: 'attack', amount: 6, hits: 1, target: 'single' }] },
    {
      id: 'burst',
      name: '胞子の破裂',
      effects: [
        { kind: 'attack', amount: 3, hits: 1, target: 'all' },
        { kind: 'debuff', status: 'poison', amount: 2, target: 'all' },
      ],
    },
  ],
};

export const treeWarden: EnemyDef = {
  id: 'treeWarden',
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
        { kind: 'attack', amount: 6, hits: 1, target: 'single' },
        { kind: 'debuff', status: 'weak', amount: 2, target: 'single' },
      ],
    },
    { id: 'barkGuard', name: '樹皮の守り', effects: [{ kind: 'block', amount: 15, target: 'self' }] },
    { id: 'branchSweep', name: '大枝の薙ぎ払い', effects: [{ kind: 'attack', amount: 9, hits: 1, target: 'all' }] },
  ],
};

export const treantKing: EnemyDef = {
  id: 'treantKing',
  name: '樹魔トレントキング',
  icon: '🌲',
  maxHp: 150,
  baseLevel: 6,
  size: 1.45,
  exp: 80,
  gold: 80,
  pattern: 'sequence',
  actions: [
    { id: 'earthRoots', name: '大地の根', effects: [{ kind: 'attack', amount: 7, hits: 1, target: 'all' }] },
    {
      id: 'sapCurse',
      name: '樹液の呪い',
      effects: [
        { kind: 'attack', amount: 6, hits: 1, target: 'single' },
        { kind: 'debuff', status: 'poison', amount: 4, target: 'single' },
      ],
    },
    {
      id: 'ancientBark',
      name: '古木の鎧',
      effects: [
        { kind: 'block', amount: 18, target: 'self' },
        { kind: 'attack', amount: 8, hits: 1, target: 'single' },
      ],
    },
  ],
  phases: [
    {
      belowHpPct: 50,
      name: '怒れる古樹',
      pattern: 'sequence',
      actions: [
        { id: 'rageStorm', name: '怒りの暴風', effects: [{ kind: 'attack', amount: 11, hits: 1, target: 'all' }] },
        { id: 'stranglingVine', name: '絞め殺す蔓', effects: [{ kind: 'attack', amount: 20, hits: 1, target: 'single' }] },
        {
          id: 'rotSpores',
          name: '腐蝕の胞子',
          effects: [
            { kind: 'attack', amount: 5, hits: 1, target: 'all' },
            { kind: 'debuff', status: 'poison', amount: 3, target: 'all' },
          ],
        },
      ],
    },
  ],
};
