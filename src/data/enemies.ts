import type { EnemyDef } from '../types';

export const ENEMIES: Record<string, EnemyDef> = {
  goblinBrute: {
    id: 'goblinBrute',
    name: 'ゴブリン重装兵',
    icon: '👹',
    maxHp: 52,
    pattern: 'sequence',
    actions: [
      { id: 'slam', name: '叩きつけ', effects: [{ kind: 'attack', amount: 10, hits: 1, target: 'single' }] },
      {
        id: 'brace',
        name: '構える',
        effects: [
          { kind: 'block', amount: 12, target: 'self' },
          { kind: 'attack', amount: 5, hits: 1, target: 'single' },
        ],
      },
      { id: 'bigSwing', name: '大振り', effects: [{ kind: 'attack', amount: 16, hits: 1, target: 'single' }] },
    ],
  },
  chaosShaman: {
    id: 'chaosShaman',
    name: 'カオスシャーマン',
    icon: '🧙',
    maxHp: 36,
    pattern: 'random',
    firstActionId: 'curse',
    maxConsecutive: 1,
    actions: [
      { id: 'chaosWave', name: '混沌の波', effects: [{ kind: 'attack', amount: 6, hits: 1, target: 'all' }] },
      { id: 'curse', name: '呪い', effects: [{ kind: 'debuff', status: 'weak', amount: 2, target: 'single' }] },
      {
        id: 'ward',
        name: '守護の印',
        effects: [{ kind: 'block', amount: 10, target: 'otherEnemies' }],
        fallbackIfAloneId: 'chaosWave',
      },
    ],
  },
  goblinScout: {
    id: 'goblinScout',
    name: 'ゴブリン斥候',
    icon: '👺',
    maxHp: 26,
    pattern: 'random',
    maxConsecutive: 2,
    actions: [
      { id: 'flurry', name: '乱れ突き', effects: [{ kind: 'attack', amount: 4, hits: 2, target: 'single' }] },
      { id: 'aimedShot', name: '狙い撃ち', effects: [{ kind: 'attack', amount: 9, hits: 1, target: 'single' }] },
    ],
  },
};

/** 戦闘に登場する敵（左から順） */
export const ENCOUNTER: string[] = ['goblinBrute', 'chaosShaman', 'goblinScout'];

export function getEnemy(id: string): EnemyDef {
  const e = ENEMIES[id];
  if (!e) throw new Error(`Unknown enemy: ${id}`);
  return e;
}

export function getEnemyAction(defId: string, actionId: string) {
  const a = getEnemy(defId).actions.find((x) => x.id === actionId);
  if (!a) throw new Error(`Unknown action: ${defId}.${actionId}`);
  return a;
}
