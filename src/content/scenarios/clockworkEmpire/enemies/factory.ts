// 機械仕掛けの帝国：歯車の工場。規則的に動く機械兵と砲台。火・氷が弱点の敵も混ぜる。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { gearBug } from './town';

export const conveyorBot: EnemyDef = {
  id: 'conveyorBot',
  name: 'ベルトコンベアの機械兵',
  icon: '🤖',
  maxHp: 26,
  baseLevel: 3,
  size: 1,
  exp: 7,
  gold: 4,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'press', name: '流れ作業の一撃', effects: [{ kind: 'damage', amount: 7 }] },
    { id: 'press2', name: '流れ作業の一撃', effects: [{ kind: 'damage', amount: 7 }] },
    { id: 'reset', name: '部品の点検', effects: [{ kind: 'block', amount: 7 }] },
  ],
};

// 「ブロックを貫く」部品はまだ無いので、脆弱を付けてから重い一撃を打つ形にした
export const riveter: EnemyDef = {
  id: 'riveter',
  name: '鋲打ち機',
  icon: '🔩',
  maxHp: 24,
  baseLevel: 3,
  size: 1,
  exp: 7,
  gold: 4,
  weak: ['thunder', 'ice'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'aim', name: '鋲を込める', effects: [{ kind: 'block', amount: 5 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
    { id: 'rivet', name: '鋲打ち', effects: [{ kind: 'damage', amount: 10 }] },
    { id: 'tap', name: '試し打ち', effects: [{ kind: 'damage', amount: 4 }] },
  ],
};

export const oilSlime: EnemyDef = {
  id: 'oilSlime',
  name: '油スライム',
  icon: '💧',
  maxHp: 26,
  baseLevel: 3,
  size: 0.9,
  exp: 7,
  gold: 4,
  weak: ['fire'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'splash', name: '油はね', effects: [{ kind: 'damage', amount: 4 }, { kind: 'applyStatus', status: 'vulnerable', amount: 1 }] },
    { id: 'slam', name: 'ぬめる体当たり', effects: [{ kind: 'damage', amount: 7 }] },
    { id: 'pool', name: '油だまり', effects: [{ kind: 'block', amount: 6 }] },
  ],
};

export const sparkTurret: EnemyDef = {
  id: 'sparkTurret',
  name: '火花の砲台',
  icon: '🗼',
  maxHp: 24,
  baseLevel: 3,
  size: 1,
  exp: 7,
  gold: 4,
  weak: ['ice'],
  resist: ['thunder', 'poison'],
  pattern: 'sequence',
  actions: [
    { id: 'charge', name: '砲身に火花をためる', effects: [{ kind: 'block', amount: 6 }] },
    { id: 'shot', name: '火花の砲撃', effects: [{ kind: 'damage', amount: 9, element: 'thunder' }] },
    { id: 'scatter', name: '散る火花', effects: [{ kind: 'damage', amount: 3, to: 'foes' }] },
  ],
};

export const foremanBot: EnemyDef = {
  id: 'foremanBot',
  name: '現場監督ロボ',
  icon: '📢',
  maxHp: 55,
  baseLevel: 5,
  size: 1.2,
  exp: 25,
  gold: 20,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'order', name: '作業の号令', effects: [{ kind: 'block', amount: 6, to: 'allies' }] },
    { id: 'hammer', name: '監督の鉄槌', big: true, effects: [{ kind: 'damage', amount: 10 }] },
    { id: 'hurry', name: '急がせる', big: true, effects: [{ kind: 'damage', amount: 4, to: 'foes' }] },
    { id: 'inspect', name: '厳しい点検', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1 }, { kind: 'damage', amount: 5 }] },
  ],
  abilities: [{ name: '始業の笛', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 4, to: 'allies' }] } }],
};

export const foremanGolem: EnemyDef = {
  id: 'foremanGolem',
  name: '工場長ゴーレム',
  icon: '♜',
  maxHp: 150,
  baseLevel: 5,
  size: 1.4,
  exp: 80,
  gold: 80,
  weak: ['thunder'],
  resist: ['poison'],
  pattern: 'sequence',
  actions: [
    { id: 'command', name: '工場長の命令', effects: [{ kind: 'block', amount: 10, to: 'allies' }, { kind: 'damage', amount: 4 }] },
    { id: 'smash', name: '鉄拳の殴打', big: true, effects: [{ kind: 'damage', amount: 14 }] },
    { id: 'press', name: 'プレス機の圧', big: true, effects: [{ kind: 'damage', amount: 6, to: 'foes' }] },
  ],
  abilities: [{ name: '分厚い装甲', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 6 }] } }],
  phases: [
    { belowHpPct: 50, name: '暴走する工場長', pattern: 'sequence', actions: [
      { id: 'overdrive', name: '暴走の連打', big: true, effects: [{ kind: 'damage', amount: 5, hits: 3 }] },
      { id: 'quota', name: 'ノルマの嵐', big: true, effects: [{ kind: 'damage', amount: 8, to: 'foes' }] },
      { id: 'vent', name: '過熱の排気', effects: [{ kind: 'block', amount: 14 }, { kind: 'applyStatus', status: 'burn', amount: 1, to: 'foes' }] },
    ] },
  ],
};

export const voltGearBug: EnemyDef = makeVariant(gearBug, {
  id: 'voltGearBug',
  name: '電気歯車の虫',
  aura: 'storm',
  maxHp: 22,
  baseLevel: 3,
  exp: 7,
  gold: 4,
  weak: ['ice'],
  resist: ['thunder', 'poison'],
  actions: [
    { id: 'gnaw', name: '電気でかじる', effects: [{ kind: 'damage', amount: 6, element: 'thunder' }] },
    { id: 'curl', name: '殻に丸まる', effects: [{ kind: 'block', amount: 5 }] },
    { id: 'nibble', name: '火花のかじり', effects: [{ kind: 'damage', amount: 3, hits: 2, element: 'thunder' }] },
  ],
});

export const stormForemanBot: EnemyDef = makeVariant(foremanBot, {
  id: 'stormForemanBot',
  name: '雷の現場監督',
  aura: 'storm',
  weak: ['ice'],
  resist: ['thunder', 'poison'],
  actions: [
    { id: 'order', name: '雷の号令', effects: [{ kind: 'block', amount: 6, to: 'allies' }] },
    { id: 'hammer', name: '帯電した鉄槌', big: true, effects: [{ kind: 'damage', amount: 10, element: 'thunder' }] },
    { id: 'hurry', name: '放電で急がせる', big: true, effects: [{ kind: 'damage', amount: 4, to: 'foes', element: 'thunder' }] },
    { id: 'inspect', name: '厳しい点検', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1 }, { kind: 'damage', amount: 5 }] },
  ],
});
