// 共通の敵（K3 B）: 野盗たち。どのシナリオの地域でも出せる。配置は K4 が全部入った後にまとめて行う
import type { EnemyDef } from '../../../types';
import { makeVariant } from '../../../data/enemyVariant';

export const banditThug: EnemyDef = {
  id: 'banditThug',
  name: '野盗のごろつき',
  icon: '🗡',
  maxHp: 30,
  baseLevel: 4,
  size: 0.95,
  exp: 8,
  gold: 6,
  weak: ['holy'],
  pattern: 'random',
  maxConsecutive: 2,
  actions: [
    { id: 'slash', name: '切りつけ', effects: [{ kind: 'damage', amount: 8 }] },
    { id: 'guard', name: '身構える', effects: [{ kind: 'block', amount: 7 }, { kind: 'damage', amount: 3 }] },
    { id: 'trip', name: '足払い', effects: [{ kind: 'damage', amount: 4 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
  ],
};

export const banditArcher: EnemyDef = {
  id: 'banditArcher',
  name: '野盗の弓手',
  icon: '🏹',
  maxHp: 24,
  baseLevel: 4,
  size: 0.9,
  exp: 8,
  gold: 6,
  weak: ['thunder'],
  pattern: 'sequence',
  actions: [
    { id: 'aim', name: '狙い撃ち', effects: [{ kind: 'damage', amount: 10 }] },
    { id: 'volley', name: '矢の雨', effects: [{ kind: 'damage', amount: 4, hits: 2 }] },
    { id: 'duck', name: '物陰に隠れる', effects: [{ kind: 'block', amount: 8 }] },
  ],
};

/** 影の野盗（亜種）: 闇属性の攻撃を使い、戦闘の始めに味方全員を弱らせる */
export const shadowBandit: EnemyDef = makeVariant(banditThug, {
  id: 'shadowBandit',
  name: '影の野盗',
  aura: 'shadow',
  maxHp: 32,
  weak: ['holy'],
  resist: ['dark'],
  actions: [
    { id: 'slash', name: '影の刃', effects: [{ kind: 'damage', amount: 8, element: 'dark' }] },
    { id: 'guard', name: '影に紛れる', effects: [{ kind: 'block', amount: 7 }, { kind: 'damage', amount: 3 }] },
    { id: 'trip', name: '影縫い', effects: [{ kind: 'damage', amount: 4, element: 'dark' }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
  ],
  abilities: [{ name: '闇の気配', effect: { when: 'battleStart', do: [{ kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }] } }],
});

export const banditChief: EnemyDef = {
  id: 'banditChief',
  name: '野盗の頭目',
  icon: '⚔',
  maxHp: 70,
  baseLevel: 6,
  size: 1.2,
  exp: 28,
  gold: 22,
  weak: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'cleave', name: '重い斬撃', effects: [{ kind: 'damage', amount: 14 }] },
    { id: 'rally', name: '手下を鼓舞する', effects: [{ kind: 'block', amount: 10 }, { kind: 'block', amount: 8, to: 'otherAllies' }] },
    { id: 'sweep', name: '薙ぎ払い', effects: [{ kind: 'damage', amount: 7, to: 'foes' }] },
    { id: 'taunt', name: 'あざ笑う', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1 }, { kind: 'damage', amount: 6 }] },
  ],
  abilities: [{ name: '頭目の貫禄', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
};
