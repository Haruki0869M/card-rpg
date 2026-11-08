// 共通の敵（K3 B）: 野の獣と虫。どのシナリオの地域でも出せる。配置は K4 が全部入った後にまとめて行う
import type { EnemyDef } from '../../../types';
import { makeVariant } from '../../../data/enemyVariant';

export const wildBoar: EnemyDef = {
  id: 'wildBoar',
  name: '荒れ猪',
  icon: '🐗',
  maxHp: 34,
  baseLevel: 4,
  size: 1,
  exp: 8,
  gold: 5,
  weak: ['fire'],
  pattern: 'random',
  maxConsecutive: 2,
  actions: [
    { id: 'charge', name: '突進', effects: [{ kind: 'damage', amount: 11 }] },
    { id: 'gore', name: '牙の連突き', effects: [{ kind: 'damage', amount: 5, hits: 2 }] },
    { id: 'snort', name: '鼻を鳴らす', effects: [{ kind: 'block', amount: 6 }] },
  ],
};

export const giantSpider: EnemyDef = {
  id: 'giantSpider',
  name: '大蜘蛛',
  icon: '🕷',
  maxHp: 26,
  baseLevel: 4,
  size: 0.95,
  exp: 8,
  gold: 5,
  weak: ['fire'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'fang', name: '毒牙', effects: [{ kind: 'damage', amount: 6 }, { kind: 'applyStatus', status: 'poison', amount: 2 }] },
    { id: 'web', name: '糸を吐く', effects: [{ kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }, { kind: 'block', amount: 4 }] },
    { id: 'pounce', name: '飛びかかり', effects: [{ kind: 'damage', amount: 9 }] },
  ],
};

export const caveBat: EnemyDef = {
  id: 'caveBat',
  name: '洞窟蝙蝠',
  icon: '🦇',
  maxHp: 18,
  baseLevel: 3,
  size: 0.75,
  exp: 5,
  gold: 3,
  weak: ['thunder'],
  pattern: 'random',
  maxConsecutive: 2,
  actions: [
    { id: 'flutter', name: '羽ばたきの連撃', effects: [{ kind: 'damage', amount: 3, hits: 3 }] },
    { id: 'screech', name: '超音波', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
    { id: 'swoop', name: '急降下', effects: [{ kind: 'damage', amount: 7 }] },
  ],
};

export const stoneTortoise: EnemyDef = {
  id: 'stoneTortoise',
  name: '岩亀',
  icon: '🐢',
  maxHp: 46,
  baseLevel: 4,
  size: 1.1,
  exp: 9,
  gold: 6,
  weak: ['thunder'],
  resist: ['fire', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'shell', name: '甲羅にこもる', effects: [{ kind: 'block', amount: 16 }] },
    { id: 'bite', name: '岩の噛みつき', effects: [{ kind: 'damage', amount: 9 }] },
    { id: 'stomp', name: '地響き', effects: [{ kind: 'damage', amount: 5, to: 'foes' }] },
  ],
};

/** 炎の荒れ猪（亜種）: 炎属性の攻撃で火傷を負わせる。氷に弱い */
export const emberBoar: EnemyDef = makeVariant(wildBoar, {
  id: 'emberBoar',
  name: '炎の荒れ猪',
  aura: 'ember',
  maxHp: 36,
  weak: ['ice'],
  resist: ['fire'],
  actions: [
    { id: 'charge', name: '燃える突進', effects: [{ kind: 'damage', amount: 11, element: 'fire' }] },
    { id: 'gore', name: '熱い牙の連突き', effects: [{ kind: 'damage', amount: 5, hits: 2, element: 'fire' }] },
    { id: 'snort', name: '火の粉を吹く', effects: [{ kind: 'block', amount: 6 }, { kind: 'applyStatus', status: 'burn', amount: 1 }] },
  ],
});

/** 雷の大蜘蛛（亜種）: 雷属性の毒牙で痺れさせる */
export const stormSpider: EnemyDef = makeVariant(giantSpider, {
  id: 'stormSpider',
  name: '雷の大蜘蛛',
  aura: 'storm',
  weak: ['fire'],
  resist: ['thunder'],
  actions: [
    { id: 'fang', name: '雷牙', effects: [{ kind: 'damage', amount: 6, element: 'thunder' }] },
    { id: 'web', name: '雷の糸', effects: [{ kind: 'applyStatus', status: 'paralysis', amount: 1 }, { kind: 'block', amount: 4 }] },
    { id: 'pounce', name: '飛びかかり', effects: [{ kind: 'damage', amount: 9 }] },
  ],
});

export const greatBear: EnemyDef = {
  id: 'greatBear',
  name: '大熊',
  icon: '🐻',
  maxHp: 86,
  baseLevel: 6,
  size: 1.3,
  exp: 28,
  gold: 20,
  weak: ['fire'],
  pattern: 'sequence',
  actions: [
    { id: 'swipe', name: '爪の一撃', effects: [{ kind: 'damage', amount: 16 }] },
    { id: 'roar', name: '地を揺らす咆哮', effects: [{ kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }, { kind: 'damage', amount: 4, to: 'foes' }] },
    { id: 'hide', name: '分厚い毛皮', effects: [{ kind: 'block', amount: 18 }, { kind: 'damage', amount: 5 }] },
  ],
  abilities: [{ name: '森の主', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
};
