// 共通の敵（K3 B）: 亡者・亡霊・小鬼。どのシナリオの地域でも出せる。配置は K4 が全部入った後にまとめて行う
import type { EnemyDef } from '../../../types';

export const shambler: EnemyDef = {
  id: 'shambler',
  name: '彷徨う死体',
  icon: '🧟',
  maxHp: 40,
  baseLevel: 4,
  size: 1,
  exp: 9,
  gold: 5,
  weak: ['fire', 'holy'],
  resist: ['poison', 'dark'],
  pattern: 'sequence',
  actions: [
    { id: 'claw', name: 'ひっかき', effects: [{ kind: 'damage', amount: 7 }] },
    { id: 'grab', name: 'つかみかかる', effects: [{ kind: 'damage', amount: 5 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
    { id: 'slam', name: '腐った腕の一撃', effects: [{ kind: 'damage', amount: 12 }] },
  ],
};

export const wanderingGhost: EnemyDef = {
  id: 'wanderingGhost',
  name: '迷える亡霊',
  icon: '👻',
  maxHp: 22,
  baseLevel: 4,
  size: 0.9,
  exp: 8,
  gold: 5,
  weak: ['holy'],
  resist: ['dark', 'poison'],
  pattern: 'random',
  maxConsecutive: 1,
  actions: [
    { id: 'wail', name: 'すすり泣き', effects: [{ kind: 'applyStatus', status: 'curse', amount: 1 }] },
    { id: 'touch', name: '冷たい手', effects: [{ kind: 'damage', amount: 6, element: 'dark' }] },
    { id: 'fade', name: '姿を薄れさせる', effects: [{ kind: 'block', amount: 9 }] },
  ],
};

export const imp: EnemyDef = {
  id: 'imp',
  name: '小鬼',
  icon: '👿',
  maxHp: 20,
  baseLevel: 3,
  size: 0.8,
  exp: 6,
  gold: 4,
  weak: ['ice', 'holy'],
  resist: ['fire'],
  pattern: 'random',
  maxConsecutive: 2,
  actions: [
    { id: 'spark', name: '火の粉', effects: [{ kind: 'damage', amount: 5, element: 'fire' }] },
    { id: 'prank', name: 'いたずら', effects: [{ kind: 'damage', amount: 3 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
    { id: 'flame', name: '小さな火球', effects: [{ kind: 'damage', amount: 7, element: 'fire' }] },
  ],
};

export const hauntedKnight: EnemyDef = {
  id: 'hauntedKnight',
  name: '呪われた亡霊騎士',
  icon: '🛡',
  maxHp: 80,
  baseLevel: 6,
  size: 1.25,
  exp: 30,
  gold: 22,
  weak: ['holy', 'thunder'],
  resist: ['dark', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'blade', name: '呪いの剣', effects: [{ kind: 'damage', amount: 15, element: 'dark' }] },
    { id: 'curse', name: '忘れられた誓い', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2 }, { kind: 'damage', amount: 4 }] },
    { id: 'guard', name: '錆びた大盾', effects: [{ kind: 'block', amount: 16 }] },
    { id: 'sweep', name: '亡霊の薙ぎ払い', effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
  ],
  abilities: [{ name: '騎士の誇り', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
};
