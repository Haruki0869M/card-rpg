import type { EnemyDef } from '../../types';

export const goblinScout: EnemyDef = {
  id: 'goblinScout',
  name: 'ゴブリン斥候',
  icon: '👺',
  maxHp: 26,
  baseLevel: 2,
  size: 0.9,
  exp: 6,
  gold: 4,
  pattern: 'random',
  maxConsecutive: 2,
  actions: [
    { id: 'flurry', name: '乱れ突き', effects: [{ kind: 'attack', amount: 4, hits: 2, target: 'single' }] },
    { id: 'aimedShot', name: '狙い撃ち', effects: [{ kind: 'attack', amount: 9, hits: 1, target: 'single' }] },
  ],
};
