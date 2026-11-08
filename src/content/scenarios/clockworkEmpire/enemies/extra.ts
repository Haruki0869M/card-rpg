// 機械仕掛けの帝国：追加の敵（K3 D）。街・工場・炉の組み合わせを増やす
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { clockworkDog } from './valley';

export const smokeStackCrow: EnemyDef = {
  id: 'smokeStackCrow',
  name: '煙突の鴉',
  icon: '🐦',
  maxHp: 20,
  baseLevel: 2,
  size: 0.8,
  exp: 5,
  gold: 3,
  weak: ['ice'], // 煙突の熱で動く鴉。冷やすと弱る（組の相手 conveyorBot が雷に弱いので、雷以外の弱点にする）
  resist: ['fire'],
  pattern: 'sequence',
  actions: [
    { id: 'peck', name: '煤けたくちばし', effects: [{ kind: 'damage', amount: 6 }] },
    { id: 'ember', name: '火の粉を運ぶ', effects: [{ kind: 'damage', amount: 2 }, { kind: 'applyStatus', status: 'burn', amount: 1 }] },
    { id: 'smoke', name: '煙に隠れる', effects: [{ kind: 'block', amount: 4 }] },
  ],
};

export const pressGolem: EnemyDef = {
  id: 'pressGolem',
  name: 'プレス機の人形',
  icon: '⚙',
  maxHp: 38,
  baseLevel: 5,
  size: 1.15,
  exp: 10,
  gold: 6,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'raise', name: 'プレスを上げる', effects: [{ kind: 'block', amount: 8 }] },
    { id: 'press', name: '重いプレス', effects: [{ kind: 'damage', amount: 15 }] },
    { id: 'vent', name: '蒸気を抜く', effects: [{ kind: 'block', amount: 5 }, { kind: 'damage', amount: 4 }] },
  ],
};

export const ironClockworkDog: EnemyDef = makeVariant(clockworkDog, {
  id: 'ironClockworkDog',
  name: '鋼のゼンマイ犬',
  aura: 'iron',
  maxHp: 40,
  baseLevel: 7,
  exp: 13,
  gold: 9,
  actions: [
    { id: 'bite', name: '鋼の連続噛みつき', effects: [{ kind: 'damage', amount: 5, hits: 2 }] },
    { id: 'bite2', name: '鋼の激しい噛みつき', effects: [{ kind: 'damage', amount: 4, hits: 3 }] },
    { id: 'rewind', name: '鋼板を締める', effects: [{ kind: 'block', amount: 8 }] },
  ],
  abilities: [{ name: '鋼の装甲', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 8 }] } }],
});
