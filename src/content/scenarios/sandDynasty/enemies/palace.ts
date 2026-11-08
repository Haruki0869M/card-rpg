// 砂塵の王朝：王宮前の荒野と砂塵の王宮。最後の王は、民を救うために永遠の命を求めた。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { jackalWarrior } from './ruins';

export const colossusStatue: EnemyDef = {
  id: 'colossusStatue',
  name: '石像の巨兵',
  icon: '🛡',
  maxHp: 100,
  baseLevel: 9,
  size: 1.2,
  exp: 35,
  gold: 30,
  weak: ['thunder'],
  resist: ['poison', 'fire'],
  pattern: 'sequence',
  actions: [
    { id: 'wall', name: '石の大盾', effects: [{ kind: 'block', amount: 24 }] },
    { id: 'fist', name: '巨兵の拳', effects: [{ kind: 'damage', amount: 17 }] },
    { id: 'stomp', name: '地響き', effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
    { id: 'shove', name: '盾で押し潰す', effects: [{ kind: 'block', amount: 12 }, { kind: 'damage', amount: 8 }] },
  ],
  abilities: [{ name: '砂岩の守り', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 12 }] } }],
};

export const sandPharaoh: EnemyDef = {
  id: 'sandPharaoh',
  name: '砂塵の王',
  icon: '♛',
  maxHp: 400,
  baseLevel: 11,
  size: 1.6,
  exp: 300,
  gold: 300,
  weak: ['fire', 'holy'],
  resist: ['poison', 'dark'],
  pattern: 'sequence',
  actions: [
    { id: 'decree', name: '王の勅命', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1 }, { kind: 'block', amount: 10 }] },
    { id: 'crook', name: '牧者の王杖', effects: [{ kind: 'damage', amount: 22 }] },
    { id: 'eternity', name: '永遠の守り', effects: [{ kind: 'block', amount: 22 }, { kind: 'damage', amount: 6 }] },
  ],
  abilities: [{ name: '千年の包帯', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
  phases: [
    { belowHpPct: 60, name: '民のために永遠を求めた王', pattern: 'sequence', actions: [
      { id: 'famine', name: '飢えた民の記憶', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2, to: 'foes' }, { kind: 'damage', amount: 6, to: 'foes' }] },
      { id: 'vow', name: '果たせなかった誓い', effects: [{ kind: 'damage', amount: 24, element: 'dark' }] },
      { id: 'tomb', name: '王墓の壁', effects: [{ kind: 'block', amount: 24 }] },
      { id: 'sand', name: 'こぼれ落ちる砂', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }, { kind: 'damage', amount: 6 }] },
    ] },
    { belowHpPct: 30, name: '砂嵐に呑まれた王', pattern: 'sequence', actions: [
      { id: 'storm', name: '王国を呑む砂嵐', effects: [{ kind: 'damage', amount: 16, to: 'foes' }] },
      { id: 'last', name: '最後の王命', effects: [{ kind: 'damage', amount: 30, element: 'dark' }] },
      { id: 'dune', name: '民なき王国', effects: [{ kind: 'block', amount: 26 }, { kind: 'damage', amount: 8, to: 'foes' }] },
    ] },
  ],
};

export const venomJackalWarrior: EnemyDef = makeVariant(jackalWarrior, {
  id: 'venomJackalWarrior', name: '毒槍のジャッカル', aura: 'venom', maxHp: 44, baseLevel: 9, exp: 24, gold: 18,
  weak: ['thunder'], resist: ['fire', 'poison'],
  actions: [
    { id: 'thrust', name: '毒槍の連突き', effects: [{ kind: 'damage', amount: 4, hits: 3 }, { kind: 'applyStatus', status: 'poison', amount: 2 }] },
    { id: 'guard', name: '槍の構え', effects: [{ kind: 'block', amount: 10 }] },
    { id: 'lunge', name: '毒槍の踏み込み', effects: [{ kind: 'damage', amount: 13, element: 'poison' }] },
  ],
});
