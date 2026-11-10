// 灼熱の火山の敵（シナリオ1）
import type { EnemyDef } from '../../../../types';

export const fireSalamander: EnemyDef = {
  id: 'fireSalamander',
  weak: ['ice'],
  resist: ['fire'],
  name: '火トカゲ',
  icon: '🦎',
  maxHp: 34,
  baseLevel: 7,
  size: 0.95,
  exp: 13,
  gold: 9,
  pattern: 'random',
  maxConsecutive: 2,
  actions: [
    { id: 'fireBreath', name: '火炎の息', effects: [{ kind: 'damage', element: 'fire', amount: 5, to: 'foes' }, { kind: 'applyStatus', status: 'burn', amount: 1, to: 'foes' }] },
    { id: 'bite', name: '焼けた牙', effects: [{ kind: 'damage', element: 'fire', amount: 11 }] },
  ],
};

export const ashBat: EnemyDef = {
  id: 'ashBat',
  weak: ['thunder'],
  resist: ['fire'],
  name: '灰コウモリ',
  icon: '🦇',
  maxHp: 20,
  baseLevel: 7,
  size: 0.75,
  exp: 9,
  gold: 6,
  pattern: 'random',
  maxConsecutive: 2,
  actions: [
    { id: 'flurry', name: '乱れ噛み', effects: [{ kind: 'damage', amount: 4, hits: 3 }] },
    { id: 'screech', name: '金切り声', effects: [{ kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }] },
  ],
};

export const magmaGolem: EnemyDef = {
  id: 'magmaGolem',
  weak: ['ice'],
  resist: ['fire'],
  name: '溶岩ゴーレム',
  icon: '🗿',
  maxHp: 92,
  baseLevel: 8,
  size: 1.2,
  exp: 30,
  gold: 25,
  pattern: 'sequence',
  actions: [
    { id: 'slam', name: '溶岩の拳', big: true, effects: [{ kind: 'damage', element: 'fire', amount: 16 }] },
    { id: 'harden', name: '冷え固まる', effects: [{ kind: 'block', amount: 20 }] },
    { id: 'eruption', name: '小噴火', big: true, effects: [{ kind: 'damage', element: 'fire', amount: 8, to: 'foes' }, { kind: 'applyStatus', status: 'burn', amount: 1, to: 'foes' }] },
  ],
  abilities: [{ name: '溶岩の体', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 4 }] } }],
};

export const ignavarl: EnemyDef = {
  id: 'ignavarl',
  weak: ['ice'],
  resist: ['fire'],
  name: '炎竜イグナヴァル',
  icon: '🐉',
  maxHp: 270,
  baseLevel: 10,
  size: 1.5,
  exp: 160,
  gold: 160,
  pattern: 'sequence',
  actions: [
    { id: 'claw', name: '竜の爪', big: true, effects: [{ kind: 'damage', element: 'fire', amount: 18 }] },
    { id: 'wingbeat', name: '羽ばたき', big: true, effects: [{ kind: 'damage', amount: 7, hits: 2, to: 'foes' }] },
    { id: 'scales', name: '竜鱗', effects: [{ kind: 'block', amount: 22 }, { kind: 'damage', amount: 9 }] },
  ],
  phases: [
    {
      belowHpPct: 50,
      name: '怒れる炎竜',
      pattern: 'sequence',
      actions: [
        { id: 'inferno', name: '獄炎', big: true, effects: [{ kind: 'damage', element: 'fire', amount: 12, to: 'foes' }, { kind: 'applyStatus', status: 'burn', amount: 2, to: 'foes' }] },
        { id: 'fangs', name: '灼熱の牙', big: true, effects: [{ kind: 'damage', element: 'fire', amount: 26 }] },
        { id: 'roar', name: '竜の咆哮', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 2, to: 'foes' }, { kind: 'block', amount: 15 }] },
      ],
    },
  ],
};
