// 星降る天空城：天空城の前庭と天空城。天の騎士は闇に弱い
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { thornFairy } from './garden';
import { angelStatue } from './hill';

export const skyKnight: EnemyDef = {
  id: 'skyKnight',
  name: '空の騎士',
  icon: '🛡',
  maxHp: 53,
  baseLevel: 9,
  size: 1.05,
  exp: 16,
  gold: 12,
  weak: ['dark'],
  resist: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'lance', name: '槍の突撃', effects: [{ kind: 'damage', amount: 16 }] },
    { id: 'guard', name: '天の構え', effects: [{ kind: 'block', amount: 10 }, { kind: 'damage', amount: 5 }] },
    { id: 'sweep', name: '槍の薙ぎ払い', effects: [{ kind: 'damage', amount: 7, to: 'foes' }] },
  ],
};

export const skyPaladin: EnemyDef = {
  id: 'skyPaladin',
  name: '空の聖騎士',
  icon: '🛡',
  maxHp: 115,
  baseLevel: 9,
  size: 1.25,
  exp: 35,
  gold: 30,
  weak: ['dark'],
  resist: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'smite', name: '聖なる剣', effects: [{ kind: 'damage', amount: 19, element: 'holy' }] },
    { id: 'aegis', name: '星の盾', effects: [{ kind: 'block', amount: 18 }] },
    { id: 'judgment', name: '天の裁き', effects: [{ kind: 'damage', amount: 10, element: 'holy', to: 'foes' }] },
    { id: 'oath', name: '聖騎士の誓い', effects: [{ kind: 'block', amount: 8, to: 'allies' }, { kind: 'damage', amount: 8 }] },
  ],
  abilities: [{ name: '光輪の加護', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 10 }] } }],
};

export const starSeerQueen: EnemyDef = {
  id: 'starSeerQueen',
  name: '星読みの女王',
  icon: '♛',
  maxHp: 400,
  baseLevel: 11,
  size: 1.6,
  exp: 300,
  gold: 300,
  weak: ['dark'],
  resist: ['holy'],
  pattern: 'sequence',
  actions: [
    { id: 'foresight', name: '予知', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }, { kind: 'block', amount: 10 }] },
    { id: 'orb', name: '星の宝珠', effects: [{ kind: 'damage', amount: 26, element: 'holy' }] },
    { id: 'chart', name: '星図の結界', effects: [{ kind: 'block', amount: 22 }, { kind: 'damage', amount: 8 }] },
  ],
  abilities: [{ name: '見えている未来', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
  phases: [
    {
      belowHpPct: 60,
      name: '予知の涙を流す女王',
      pattern: 'sequence',
      actions: [
        { id: 'tears', name: '星の涙', effects: [{ kind: 'damage', amount: 13, element: 'holy', to: 'foes' }] },
        { id: 'fate', name: '定められた結末', effects: [{ kind: 'applyStatus', status: 'curse', amount: 2, to: 'foes' }, { kind: 'damage', amount: 10 }] },
        { id: 'wall', name: '見通す壁', effects: [{ kind: 'block', amount: 24 }] },
        { id: 'pierce', name: '先回りの一閃', effects: [{ kind: 'damage', amount: 24 }] },
      ],
    },
    {
      belowHpPct: 30,
      name: '流星群を呼ぶ女王',
      pattern: 'sequence',
      actions: [
        { id: 'meteors', name: '流星群', effects: [{ kind: 'damage', amount: 19, element: 'holy', to: 'foes' }] },
        { id: 'last', name: '最後の予言', effects: [{ kind: 'damage', amount: 36 }] },
        { id: 'sky', name: '星の天蓋', effects: [{ kind: 'block', amount: 26 }, { kind: 'damage', amount: 10, to: 'foes' }] },
      ],
    },
  ],
};

export const venomThornFairy: EnemyDef = makeVariant(thornFairy, {
  id: 'venomThornFairy',
  name: '毒茨の妖精',
  aura: 'venom',
  maxHp: 41,
  baseLevel: 9,
  exp: 16,
  gold: 12,
  actions: [
    { id: 'needle', name: '毒茨の針', effects: [{ kind: 'damage', amount: 8 }, { kind: 'applyStatus', status: 'poison', amount: 3 }] },
    { id: 'tangle', name: '毒のからまり', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1 }, { kind: 'block', amount: 6 }] },
    { id: 'prick', name: '毒の棘', effects: [{ kind: 'damage', amount: 5, hits: 2 }, { kind: 'applyStatus', status: 'poison', amount: 1 }] },
  ],
  abilities: [{ name: '毒の花粉', effect: { when: 'battleStart', do: [{ kind: 'applyStatus', status: 'poison', amount: 1, to: 'foes' }] } }],
});

export const holyAngelStatue: EnemyDef = makeVariant(angelStatue, {
  id: 'holyAngelStatue',
  name: '輝く天使の像',
  aura: 'holy',
  maxHp: 52,
  baseLevel: 9,
  exp: 16,
  gold: 12,
  actions: [
    { id: 'sword', name: '光の剣', effects: [{ kind: 'damage', amount: 13, element: 'holy' }] },
    { id: 'pray', name: '輝く祈り', effects: [{ kind: 'block', amount: 10 }] },
    { id: 'gaze', name: '裁きの光', effects: [{ kind: 'damage', amount: 6, element: 'holy' }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
  ],
});
