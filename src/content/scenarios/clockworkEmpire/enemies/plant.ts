// 機械仕掛けの帝国：動力炉（時計塔）。炉の熱と重い機械。氷・雷が弱点の敵を混ぜる。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { boilerCrab } from './valley';

export const pistonFist: EnemyDef = {
  id: 'pistonFist',
  name: 'ピストン拳',
  icon: '👊',
  maxHp: 44,
  baseLevel: 7,
  size: 1,
  exp: 13,
  gold: 9,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'piston', name: 'ピストンの突き', effects: [{ kind: 'damage', amount: 12 }] },
    { id: 'shock', name: '床を打つ衝撃', effects: [{ kind: 'damage', amount: 6, to: 'foes' }] },
    { id: 'retract', name: '腕を引き戻す', effects: [{ kind: 'block', amount: 10 }] },
  ],
};

export const furnaceImp: EnemyDef = {
  id: 'furnaceImp',
  name: '炉の小鬼',
  icon: '🔥',
  maxHp: 36,
  baseLevel: 7,
  size: 0.9,
  exp: 13,
  gold: 9,
  weak: ['ice'],
  resist: ['fire'],
  pattern: 'sequence',
  actions: [
    { id: 'coal', name: '石炭投げ', effects: [{ kind: 'damage', amount: 11, element: 'fire' }] },
    { id: 'stoke', name: '炉をあおる', effects: [{ kind: 'applyStatus', status: 'burn', amount: 2 }, { kind: 'block', amount: 5 }] },
    { id: 'sparks', name: '火の粉の雨', effects: [{ kind: 'damage', amount: 5, to: 'foes' }] },
  ],
};

export const ironButler: EnemyDef = {
  id: 'ironButler',
  name: '鉄の執事',
  icon: '🎩',
  maxHp: 80,
  baseLevel: 8,
  size: 1.2,
  exp: 30,
  gold: 25,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'bow', name: 'うやうやしい一礼', effects: [{ kind: 'block', amount: 18 }] },
    { id: 'tray', name: '銀盆の打撃', effects: [{ kind: 'damage', amount: 15 }] },
    { id: 'serve', name: 'お茶を浴びせる', effects: [{ kind: 'damage', amount: 6, to: 'foes' }, { kind: 'applyStatus', status: 'burn', amount: 1 }] },
    { id: 'guard', name: '主人を守る構え', effects: [{ kind: 'block', amount: 10, to: 'allies' }, { kind: 'damage', amount: 6 }] },
  ],
  abilities: [{ name: '磨き上げた鋼の体', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 10 }] } }],
};

export const chainSaw: EnemyDef = {
  id: 'chainSaw',
  name: '回転ノコギリ',
  icon: '🪚',
  maxHp: 75,
  baseLevel: 8,
  size: 1.2,
  exp: 30,
  gold: 25,
  weak: ['thunder', 'ice'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'rev', name: '刃を回す', effects: [{ kind: 'block', amount: 8 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
    { id: 'saw', name: '連続の切りつけ', effects: [{ kind: 'damage', amount: 5, hits: 3 }] },
    { id: 'sweep', name: '回転の薙ぎ払い', effects: [{ kind: 'damage', amount: 7, to: 'foes' }] },
    { id: 'grind', name: '削り取る', effects: [{ kind: 'damage', amount: 14 }] },
  ],
  abilities: [{ name: '止まらない刃', effect: { when: 'battleStart', do: [{ kind: 'damage', amount: 4, to: 'randomFoe' }] } }],
};

export const clockworkSage: EnemyDef = {
  id: 'clockworkSage',
  name: '時計仕掛けの賢者',
  icon: '🕰',
  maxHp: 270,
  baseLevel: 9,
  size: 1.5,
  exp: 160,
  gold: 160,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'rewind', name: '逆回し', effects: [{ kind: 'heal', amount: 12, to: 'self' }, { kind: 'block', amount: 12 }] },
    { id: 'hands', name: '長針の一閃', effects: [{ kind: 'damage', amount: 20 }] },
    { id: 'stop', name: '止まる秒針', effects: [{ kind: 'applyStatus', status: 'paralysis', amount: 1, to: 'foes' }, { kind: 'damage', amount: 6, to: 'foes' }] },
  ],
  abilities: [{ name: '真鍮の外装', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
  phases: [
    { belowHpPct: 50, name: '針の早まった賢者', pattern: 'sequence', actions: [
      { id: 'accel', name: '加速', effects: [{ kind: 'damage', amount: 7, hits: 3 }] },
      { id: 'toll', name: '終わりの鐘', effects: [{ kind: 'damage', amount: 12, element: 'thunder', to: 'foes' }] },
      { id: 'rewind2', name: '最後の逆回し', effects: [{ kind: 'heal', amount: 10, to: 'self' }, { kind: 'block', amount: 20 }] },
    ] },
  ],
};

export const venomBoilerCrab: EnemyDef = makeVariant(boilerCrab, {
  id: 'venomBoilerCrab',
  name: '毒液の蟹',
  aura: 'venom',
  maxHp: 44,
  baseLevel: 7,
  exp: 13,
  gold: 9,
  weak: ['ice', 'thunder'],
  resist: ['fire'],
  actions: [
    { id: 'shell', name: '鉄の甲羅', effects: [{ kind: 'block', amount: 12 }] },
    { id: 'pinch', name: '毒液のはさみ', effects: [{ kind: 'damage', amount: 8, element: 'poison' }, { kind: 'applyStatus', status: 'poison', amount: 2 }] },
    { id: 'double', name: '両のはさみ', effects: [{ kind: 'damage', amount: 6, hits: 2 }] },
  ],
});
