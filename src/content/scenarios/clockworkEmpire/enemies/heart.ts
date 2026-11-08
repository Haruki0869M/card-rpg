// 機械仕掛けの帝国：大機械の心臓部。銅の騎士・炉のゴーレム・大機械。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';

export const copperKnight: EnemyDef = {
  id: 'copperKnight',
  name: '銅の騎士',
  icon: '🛡',
  maxHp: 56,
  baseLevel: 9,
  size: 1.1,
  exp: 24,
  gold: 18,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'lower', name: '槍を構える', effects: [{ kind: 'block', amount: 12 }] },
    { id: 'charge', name: '槍の突撃', effects: [{ kind: 'damage', amount: 16 }] },
    { id: 'sweep', name: '槍の薙ぎ払い', effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
  ],
};

export const furnaceGolem: EnemyDef = {
  id: 'furnaceGolem',
  name: '炉のゴーレム',
  icon: '🔥',
  maxHp: 100,
  baseLevel: 9,
  size: 1.2,
  exp: 35,
  gold: 30,
  weak: ['ice'],
  resist: ['fire', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'blast', name: '炉の熱風', effects: [{ kind: 'damage', amount: 8, element: 'fire', to: 'foes' }] },
    { id: 'fist', name: '灼けた拳', effects: [{ kind: 'damage', amount: 17, element: 'fire' }] },
    { id: 'stoke', name: '火をくべる', effects: [{ kind: 'block', amount: 16 }, { kind: 'applyStatus', status: 'burn', amount: 1, to: 'foes' }] },
    { id: 'slag', name: '溶けた鉄', effects: [{ kind: 'damage', amount: 7, hits: 2 }] },
  ],
  abilities: [{ name: '赤く燃える炉心', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
};

export const greatMachine: EnemyDef = {
  id: 'greatMachine',
  name: '大機械',
  icon: '♛',
  maxHp: 400,
  baseLevel: 11,
  size: 1.6,
  exp: 300,
  gold: 300,
  weak: ['thunder'],
  resist: ['poison', 'fire'],
  pattern: 'sequence',
  actions: [
    { id: 'gears', name: '歯車の嵐', effects: [{ kind: 'damage', amount: 9, to: 'foes' }] },
    { id: 'parts', name: '部品にする', effects: [{ kind: 'damage', amount: 22 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
    { id: 'plate', name: '装甲板を閉じる', effects: [{ kind: 'block', amount: 22 }, { kind: 'damage', amount: 6 }] },
  ],
  abilities: [{ name: '帝国の鋼鉄', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
  phases: [
    { belowHpPct: 60, name: '人を繋ぐ大機械', pattern: 'sequence', actions: [
      { id: 'link', name: '繋ぐ', effects: [{ kind: 'applyStatus', status: 'paralysis', amount: 1, to: 'foes' }, { kind: 'damage', amount: 8, element: 'thunder', to: 'foes' }] },
      { id: 'press', name: '帝国の圧延', effects: [{ kind: 'damage', amount: 26 }] },
      { id: 'reroute', name: '動力を回す', effects: [{ kind: 'block', amount: 24 }, { kind: 'heal', amount: 10, to: 'self' }] },
      { id: 'steam', name: '白い蒸気の奔流', effects: [{ kind: 'damage', amount: 7, to: 'foes' }, { kind: 'applyStatus', status: 'burn', amount: 1, to: 'foes' }] },
    ] },
    { belowHpPct: 30, name: '全力稼働の大機械', pattern: 'sequence', actions: [
      { id: 'fullPower', name: '全力稼働', effects: [{ kind: 'damage', amount: 16, element: 'thunder', to: 'foes' }] },
      { id: 'crush', name: '鋼の歯車で砕く', effects: [{ kind: 'damage', amount: 32 }] },
      { id: 'overheat', name: '炉の暴走', effects: [{ kind: 'block', amount: 26 }, { kind: 'damage', amount: 8, element: 'fire', to: 'foes' }] },
    ] },
  ],
};

export const ironCopperKnight: EnemyDef = makeVariant(copperKnight, {
  id: 'ironCopperKnight',
  name: '鋼の銅騎士',
  aura: 'iron',
  abilities: [{ name: '鋼の重ね鎧', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 12 }] } }],
});
