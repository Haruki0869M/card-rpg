// 基本ジョブの追加カード（各ジョブの専用カードを8枚にそろえる。設計 v2 §1-1）
import type { CardDef } from '../../../types';

const d = (amount: number) => ({ kind: 'damage', amount }) as const;
const b = (amount: number) => ({ kind: 'block', amount }) as const;
const st = (status: string, amount: number) => ({ kind: 'applyStatus', status, amount }) as const;

export const BASE_JOB_CARDS_2: CardDef[] = [
  // 武闘家
  {
    id: 'counterPalm',
    name: '返し手',
    category: 'physical',
    stat: 'agi',
    cost: 1,
    slots: 2,
    baseChance: 75,
    target: 'enemy',
    tags: ['combo'],
    tiers: [
      { minSuccesses: 0, effects: [b(3)] },
      { minSuccesses: 1, effects: [d(3), b(4)] },
      { minSuccesses: 2, effects: [d(5), b(5)] },
    ],
  },
  // 召喚士
  {
    id: 'summonSprite',
    name: '小精霊招来',
    category: 'magic',
    cost: 1,
    slots: 2,
    baseChance: 75,
    target: 'self',
    rarity: 'rare',
    tiers: [
      { minSuccesses: 0, effects: [{ kind: 'summon', id: 'sprite', name: '小精霊', icon: '✨', damage: 2, turns: 2 }] },
      { minSuccesses: 1, effects: [{ kind: 'summon', id: 'sprite', name: '小精霊', icon: '✨', damage: 3, turns: 2 }] },
      { minSuccesses: 2, effects: [{ kind: 'summon', id: 'sprite', name: '小精霊', icon: '✨', damage: 4, turns: 3 }] },
    ],
  },
  {
    id: 'manaWell',
    name: '魔力の泉',
    category: 'skill',
    stat: 'int',
    cost: 0,
    slots: 1,
    baseChance: 75,
    target: 'self',
    tiers: [
      { minSuccesses: 0, effects: [b(2)] },
      { minSuccesses: 1, effects: [b(2), { kind: 'gainMana', amount: 1 }] },
    ],
  },
  // 僧侶
  {
    id: 'shieldOfFaith',
    name: '信仰の盾',
    category: 'skill',
    stat: 'per',
    cost: 1,
    slots: 2,
    baseChance: 80,
    target: 'ally',
    tiers: [
      { minSuccesses: 0, effects: [b(4)] },
      { minSuccesses: 1, effects: [b(5), { kind: 'block', amount: 3, to: 'target' }] },
      { minSuccesses: 2, effects: [b(6), { kind: 'block', amount: 5, to: 'target' }] },
    ],
  },
  {
    id: 'renew',
    name: '癒しの雫',
    category: 'magic',
    stat: 'per',
    cost: 1,
    slots: 2,
    baseChance: 75,
    target: 'ally',
    rarity: 'rare',
    tiers: [
      { minSuccesses: 0, effects: [st('regen', 1)] },
      { minSuccesses: 1, effects: [{ kind: 'applyStatus', status: 'regen', amount: 2, to: 'target' }] },
      { minSuccesses: 2, effects: [{ kind: 'applyStatus', status: 'regen', amount: 3, to: 'allies' }] },
    ],
  },
  // 盗賊
  {
    id: 'dirtyTrick',
    name: '目潰し',
    category: 'skill',
    stat: 'dex',
    cost: 1,
    slots: 2,
    baseChance: 80,
    target: 'enemy',
    tiers: [
      { minSuccesses: 0, effects: [st('weak', 1)] },
      { minSuccesses: 1, effects: [st('weak', 1), st('vulnerable', 1)] },
      { minSuccesses: 2, effects: [d(3), st('weak', 2), st('vulnerable', 1)] },
    ],
  },
  {
    id: 'quickFingers',
    name: '早業の手',
    category: 'skill',
    stat: 'dex',
    cost: 0,
    slots: 1,
    baseChance: 75,
    target: 'self',
    rarity: 'rare',
    tiers: [
      { minSuccesses: 0, effects: [b(2)] },
      { minSuccesses: 1, effects: [{ kind: 'draw', amount: 2 }] },
    ],
  },
];
