// 砂塵の王朝：廃墟（煉瓦の廃墟）と蠍の墓所のボス。毒は蠍・蛇が主役。
import type { EnemyDef } from '../../../../types';

export const jackalWarrior: EnemyDef = {
  id: 'jackalWarrior',
  name: 'ジャッカルの戦士',
  icon: '🐺',
  maxHp: 26,
  baseLevel: 3,
  size: 1,
  exp: 7,
  gold: 4,
  weak: ['thunder'],
  resist: ['fire'],
  pattern: 'sequence',
  actions: [
    { id: 'thrust', name: '槍の連突き', effects: [{ kind: 'damage', amount: 3, hits: 3 }] },
    { id: 'guard', name: '槍の構え', effects: [{ kind: 'block', amount: 6 }] },
    { id: 'lunge', name: '踏み込み突き', effects: [{ kind: 'damage', amount: 8 }] },
  ],
};

export const tombRobber: EnemyDef = {
  id: 'tombRobber',
  name: '盗掘者の亡霊',
  icon: '👻',
  maxHp: 22,
  baseLevel: 3,
  size: 1,
  exp: 7,
  gold: 6,
  weak: ['holy'],
  resist: ['dark'],
  pattern: 'sequence',
  actions: [
    // 連撃でブロックを削り、奪った分を自分の守りにする（「盗む」）
    { id: 'pilfer', name: '懐を探る短剣', effects: [{ kind: 'damage', amount: 3, hits: 3 }, { kind: 'block', amount: 4 }] },
    { id: 'vanish', name: '闇に紛れる', effects: [{ kind: 'block', amount: 6 }] },
    { id: 'stab', name: '背後からの一刺し', effects: [{ kind: 'damage', amount: 8 }] },
  ],
};

export const sandScorpion: EnemyDef = {
  id: 'sandScorpion',
  name: '砂蠍',
  icon: '🦂',
  maxHp: 26,
  baseLevel: 3,
  size: 0.95,
  exp: 7,
  gold: 4,
  weak: ['ice'],
  resist: ['poison', 'fire'],
  pattern: 'sequence',
  actions: [
    { id: 'tail', name: '毒の尾', effects: [{ kind: 'damage', amount: 4 }, { kind: 'applyStatus', status: 'poison', amount: 2 }] },
    { id: 'pincer', name: 'はさみ', effects: [{ kind: 'damage', amount: 7 }] },
    { id: 'shell', name: '砂に潜る', effects: [{ kind: 'block', amount: 6 }] },
  ],
};

export const sandScorpionKing: EnemyDef = {
  id: 'sandScorpionKing',
  name: '砂蠍王',
  icon: '♛',
  maxHp: 150,
  baseLevel: 5,
  size: 1.4,
  exp: 80,
  gold: 80,
  weak: ['ice'],
  resist: ['poison', 'fire'],
  pattern: 'sequence',
  actions: [
    { id: 'tail', name: '王の毒針', effects: [{ kind: 'damage', amount: 8 }, { kind: 'applyStatus', status: 'poison', amount: 3 }] },
    { id: 'claws', name: '大きなはさみ', big: true, effects: [{ kind: 'damage', amount: 7, hits: 2 }] },
    { id: 'armor', name: '墓所の甲殻', effects: [{ kind: 'block', amount: 16 }] },
  ],
  abilities: [{ name: '王の甲殻', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } }],
  phases: [
    // ボスの段階（2026-11-14）: 甲殻が割れて弱点が増える（助かる段階）。答え: 増えた弱点（雷）で押す
    { belowHpPct: 50, name: '毒を撒く蠍王', pattern: 'sequence', openingActionId: 'shellCrack', rule: '甲殻が割れて、雷も弱点になる（助かる段階。増えた弱点で押す）', addWeak: ['thunder'], actions: [
      { id: 'shellCrack', name: '割れた甲殻で暴れる', big: true, scripted: true, effects: [{ kind: 'damage', amount: 6, hits: 2 }] },
      { id: 'miasma', name: '墓所に満ちる毒', big: true, effects: [{ kind: 'applyStatus', status: 'poison', amount: 3, to: 'foes' }, { kind: 'damage', amount: 4, to: 'foes' }] },
      { id: 'crush', name: 'はさみで締め潰す', big: true, effects: [{ kind: 'damage', amount: 18 }] },
      { id: 'armor', name: '割れた甲殻', effects: [{ kind: 'block', amount: 18 }] },
    ] },
  ],
};
