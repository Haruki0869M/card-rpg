// 星降る天空城：風の回廊（風車の塔）。時計仕掛けは雷に弱く毒が効かない
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';

export const windSprite: EnemyDef = {
  id: 'windSprite',
  name: '風の精',
  icon: '🌀',
  maxHp: 25,
  baseLevel: 3,
  size: 0.8,
  exp: 7,
  gold: 4,
  weak: ['dark'],
  resist: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'gust', name: 'かまいたち', effects: [{ kind: 'damage', amount: 7 }] },
    { id: 'tear', name: '裂く風', effects: [{ kind: 'damage', amount: 4 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
    { id: 'whirl', name: 'つむじ風', effects: [{ kind: 'block', amount: 5 }, { kind: 'damage', amount: 4 }] },
  ],
};

export const clockworkSoldier: EnemyDef = {
  id: 'clockworkSoldier',
  name: '時計仕掛けの兵',
  icon: '⚙',
  maxHp: 30,
  baseLevel: 3,
  size: 1,
  exp: 7,
  gold: 4,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'tick', name: 'チクタク突き', effects: [{ kind: 'damage', amount: 8 }] },
    { id: 'tack', name: 'ゼンマイを巻く', effects: [{ kind: 'block', amount: 7 }] },
    { id: 'toll', name: '正時の一撃', effects: [{ kind: 'damage', amount: 11 }] },
  ],
};

export const starJelly: EnemyDef = {
  id: 'starJelly',
  name: '星くらげ',
  icon: '✦',
  maxHp: 25,
  baseLevel: 3,
  size: 0.85,
  exp: 7,
  gold: 4,
  weak: ['dark'],
  pattern: 'sequence',
  actions: [
    { id: 'sting', name: 'しびれる触手', effects: [{ kind: 'damage', amount: 5 }, { kind: 'applyStatus', status: 'paralysis', amount: 1 }] },
    { id: 'drift', name: 'ただよう', effects: [{ kind: 'block', amount: 5 }] },
    { id: 'spark', name: '星の火花', effects: [{ kind: 'damage', amount: 8, element: 'thunder' }] },
  ],
};

export const gearBeetle: EnemyDef = {
  id: 'gearBeetle',
  name: '歯車の甲虫',
  icon: '⚙',
  maxHp: 34,
  baseLevel: 3,
  size: 0.9,
  exp: 7,
  gold: 4,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'shell', name: '歯車の殻', effects: [{ kind: 'block', amount: 9 }] },
    { id: 'horn', name: '角の突き上げ', effects: [{ kind: 'damage', amount: 8 }] },
    { id: 'grind', name: '歯車のきしみ', effects: [{ kind: 'damage', amount: 5 }, { kind: 'block', amount: 4 }] },
  ],
  abilities: [{ name: '硬い殻', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 4 }] } }],
};

export const windGuardianHawk: EnemyDef = {
  id: 'windGuardianHawk',
  name: '風の守りの鷹',
  icon: '🦅',
  maxHp: 57,
  baseLevel: 5,
  size: 1.2,
  exp: 25,
  gold: 22,
  weak: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'talons', name: '三連の鉤爪', effects: [{ kind: 'damage', amount: 5, hits: 3 }] },
    { id: 'gale', name: '翼の突風', effects: [{ kind: 'damage', amount: 6, to: 'foes' }] },
    { id: 'dive', name: '天からの急降下', effects: [{ kind: 'damage', amount: 16 }] },
    { id: 'rise', name: '上昇気流', effects: [{ kind: 'block', amount: 10 }] },
  ],
  abilities: [{ name: '先制の羽ばたき', effect: { when: 'battleStart', do: [{ kind: 'damage', amount: 4, to: 'randomFoe' }] } }],
};

export const windKeeper: EnemyDef = {
  id: 'windKeeper',
  name: '風の番人',
  icon: '♛',
  maxHp: 150,
  baseLevel: 5,
  size: 1.4,
  exp: 80,
  gold: 80,
  weak: ['dark'],
  resist: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'gale', name: '大風', effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
    { id: 'halberd', name: '風車の矛', effects: [{ kind: 'damage', amount: 17 }] },
    { id: 'wall', name: '風の壁', effects: [{ kind: 'block', amount: 14 }, { kind: 'damage', amount: 5 }] },
  ],
  abilities: [{ name: '塔の風', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } }],
  phases: [
    {
      belowHpPct: 50,
      name: '竜巻をまとう番人',
      pattern: 'sequence',
      actions: [
        { id: 'tornado', name: '竜巻', effects: [{ kind: 'block', amount: 16 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }] },
        { id: 'storm', name: '暴風の矛', effects: [{ kind: 'damage', amount: 22 }] },
        { id: 'gale', name: '吹き荒れる風', effects: [{ kind: 'damage', amount: 11, to: 'foes' }] },
      ],
    },
  ],
};

export const stormWindSprite: EnemyDef = makeVariant(windSprite, {
  id: 'stormWindSprite',
  name: '嵐の風の精',
  aura: 'storm',
  actions: [
    { id: 'gust', name: '雷のかまいたち', effects: [{ kind: 'damage', amount: 7, element: 'thunder' }] },
    { id: 'tear', name: '裂く雷風', effects: [{ kind: 'damage', amount: 4, element: 'thunder' }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
    { id: 'whirl', name: '雷雲のつむじ風', effects: [{ kind: 'block', amount: 5 }, { kind: 'damage', amount: 4, element: 'thunder' }] },
  ],
});
