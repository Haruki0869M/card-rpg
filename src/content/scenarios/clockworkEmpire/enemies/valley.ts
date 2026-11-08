// 機械仕掛けの帝国：蒸気の谷（蒸気の発電所）。蒸気の精と硬い機械。火傷を使う敵が多い。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { oilSlime } from './factory';

export const steamSprite: EnemyDef = {
  id: 'steamSprite',
  name: '蒸気の精',
  icon: '♨',
  maxHp: 26,
  baseLevel: 5,
  size: 0.9,
  exp: 10,
  gold: 6,
  weak: ['ice'],
  resist: ['fire'],
  pattern: 'sequence',
  actions: [
    { id: 'scald', name: '熱い湯気', effects: [{ kind: 'damage', amount: 5 }, { kind: 'applyStatus', status: 'burn', amount: 1 }] },
    { id: 'mist', name: '白い霧', effects: [{ kind: 'block', amount: 7 }] },
    { id: 'jet', name: '蒸気の噴射', effects: [{ kind: 'damage', amount: 10, element: 'fire' }] },
  ],
};

export const boilerCrab: EnemyDef = {
  id: 'boilerCrab',
  name: 'ボイラーの蟹',
  icon: '🦀',
  maxHp: 32,
  baseLevel: 5,
  size: 1,
  exp: 10,
  gold: 6,
  weak: ['ice', 'thunder'],
  resist: ['fire', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'shell', name: '鉄の甲羅', effects: [{ kind: 'block', amount: 10 }] },
    { id: 'pinch', name: '熱いはさみ', effects: [{ kind: 'damage', amount: 9 }] },
    { id: 'double', name: '両のはさみ', effects: [{ kind: 'damage', amount: 4, hits: 2 }] },
  ],
  abilities: [{ name: '熱い甲羅', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 4 }] } }],
};

export const wrenchGolem: EnemyDef = {
  id: 'wrenchGolem',
  name: 'スパナのゴーレム',
  icon: '🔧',
  maxHp: 34,
  baseLevel: 5,
  size: 1.1,
  exp: 10,
  gold: 6,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'swing', name: 'スパナの一撃', effects: [{ kind: 'damage', amount: 11 }] },
    { id: 'tighten', name: 'ネジを締め直す', effects: [{ kind: 'block', amount: 8 }] },
    { id: 'bash', name: '振り下ろし', effects: [{ kind: 'damage', amount: 7 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] },
  ],
};

// ネジが切れると休む: 連続の噛みつき2回のあと、ネジを巻く（休む）
export const clockworkDog: EnemyDef = {
  id: 'clockworkDog',
  name: 'ゼンマイの犬',
  icon: '🐕',
  maxHp: 28,
  baseLevel: 5,
  size: 0.9,
  exp: 10,
  gold: 6,
  weak: ['thunder', 'fire'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'bite', name: '連続噛みつき', effects: [{ kind: 'damage', amount: 4, hits: 2 }] },
    { id: 'bite2', name: '激しい噛みつき', effects: [{ kind: 'damage', amount: 4, hits: 3 }] },
    { id: 'rewind', name: 'ネジ切れで休む', effects: [{ kind: 'block', amount: 4 }] },
  ],
};

export const steamTurretLord: EnemyDef = {
  id: 'steamTurretLord',
  name: '蒸気砲台長',
  icon: '🗼',
  maxHp: 60,
  baseLevel: 5,
  size: 1.2,
  exp: 25,
  gold: 20,
  weak: ['ice', 'thunder'],
  resist: ['fire', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'aim', name: '照準を合わせる', effects: [{ kind: 'block', amount: 10 }] },
    { id: 'barrage', name: '蒸気の一斉砲撃', effects: [{ kind: 'damage', amount: 7, to: 'foes' }] },
    { id: 'cannon', name: '大砲の直撃', effects: [{ kind: 'damage', amount: 13 }] },
    { id: 'scald', name: '熱い蒸気幕', effects: [{ kind: 'applyStatus', status: 'burn', amount: 1, to: 'foes' }, { kind: 'block', amount: 5 }] },
  ],
  abilities: [{ name: '砲台の装甲', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } }],
};

export const runawayBoiler: EnemyDef = {
  id: 'runawayBoiler',
  name: '暴走ボイラー',
  icon: '♨',
  maxHp: 210,
  baseLevel: 7,
  size: 1.5,
  exp: 110,
  gold: 110,
  weak: ['ice'],
  resist: ['fire', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'steam', name: '噴き出す蒸気', effects: [{ kind: 'damage', amount: 6, to: 'foes' }, { kind: 'applyStatus', status: 'burn', amount: 1, to: 'foes' }] },
    { id: 'valve', name: '安全弁が飛ぶ', effects: [{ kind: 'damage', amount: 15, element: 'fire' }] },
    { id: 'pressure', name: '圧力をためる', effects: [{ kind: 'block', amount: 18 }, { kind: 'damage', amount: 6 }] },
  ],
  abilities: [{ name: '鋼の釜', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } }],
  phases: [
    { belowHpPct: 50, name: '爆発寸前のボイラー', pattern: 'sequence', actions: [
      { id: 'burst', name: '爆発寸前の熱波', effects: [{ kind: 'damage', amount: 11, element: 'fire', to: 'foes' }] },
      { id: 'rivets', name: '飛び散る鋲', effects: [{ kind: 'damage', amount: 5, hits: 3 }] },
      { id: 'hiss', name: '悲鳴のような汽笛', effects: [{ kind: 'block', amount: 20 }, { kind: 'applyStatus', status: 'burn', amount: 2, to: 'foes' }] },
    ] },
  ],
};

export const emberOilSlime: EnemyDef = makeVariant(oilSlime, {
  id: 'emberOilSlime',
  name: '熾火の油スライム',
  aura: 'ember',
  maxHp: 30,
  baseLevel: 5,
  exp: 10,
  gold: 6,
  weak: ['ice'],
  resist: ['fire', 'poison'],
  actions: [
    { id: 'splash', name: '燃える油はね', effects: [{ kind: 'damage', amount: 5, element: 'fire' }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
    { id: 'slam', name: '熾火の体当たり', effects: [{ kind: 'damage', amount: 9, element: 'fire' }] },
    { id: 'pool', name: '燃える油だまり', effects: [{ kind: 'block', amount: 7 }] },
  ],
});
