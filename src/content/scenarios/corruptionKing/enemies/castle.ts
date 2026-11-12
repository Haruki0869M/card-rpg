// 魔王城の敵（シナリオ1の最終ダンジョン）
import type { EnemyDef } from '../../../../types';

export const darkKnight: EnemyDef = {
  id: 'darkKnight',
  weak: ['holy', 'thunder'],
  resist: ['dark'],
  name: '魔王軍の騎士',
  icon: '🛡',
  maxHp: 60,
  baseLevel: 9,
  size: 1.05,
  exp: 24,
  gold: 18,
  pattern: 'random',
  maxConsecutive: 2,
  actions: [
    { id: 'slash', name: '闇の剣', effects: [{ kind: 'damage', element: 'dark', amount: 15 }] },
    // 敵の特殊な行動 1回目（docs/tasks/enemy-behaviors-plan.md §7）: 守る行動「鉄壁」をかばうに置き換えた。ID は古い保存のために残す
    // 自分以外の敵がいない時は、かばう相手がいないので「闇の剣」に変える（予告もその攻撃になる）
    { id: 'guard', name: 'かばう', big: true, fallbackIfAloneId: 'slash', hint: '次の味方の番の間、ほかの敵への単体攻撃を代わりに受ける。全体攻撃は通る', effects: [{ kind: 'guardAllies' }] },
    { id: 'cleave', name: 'なぎ払い', effects: [{ kind: 'damage', amount: 9, to: 'foes' }] },
  ],
};

export const gatekeeper: EnemyDef = {
  id: 'gatekeeper',
  weak: ['thunder'],
  name: '門番ガルザ',
  icon: '👹',
  maxHp: 170,
  baseLevel: 10,
  size: 1.35,
  exp: 90,
  gold: 90,
  pattern: 'sequence',
  actions: [
    { id: 'roar', name: '威圧の咆哮', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 2, to: 'foes' }] },
    { id: 'crush', name: '大斧の一撃', big: true, effects: [{ kind: 'damage', amount: 24 }] },
    { id: 'whirl', name: '大旋風', big: true, effects: [{ kind: 'damage', element: 'thunder', amount: 11, to: 'foes' }] },
    { id: 'brace', name: '構え', effects: [{ kind: 'block', amount: 25 }] },
  ],
};

export const valgrim: EnemyDef = {
  id: 'valgrim',
  weak: ['holy'],
  resist: ['dark', 'poison'],
  name: '侵食の魔王ヴァルグリム',
  icon: '😈',
  maxHp: 400,
  baseLevel: 12,
  size: 1.6,
  exp: 300,
  gold: 300,
  pattern: 'sequence',
  actions: [
    { id: 'erosion', name: '侵食', big: true, effects: [{ kind: 'damage', element: 'dark', amount: 9, to: 'foes' }, { kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }] },
    { id: 'darkLance', name: '闇の槍', big: true, effects: [{ kind: 'damage', element: 'dark', amount: 24 }] },
    { id: 'abyssGuard', name: '深淵の守り', effects: [{ kind: 'block', amount: 25 }, { kind: 'damage', amount: 8 }] },
  ],
  phases: [
    {
      belowHpPct: 66,
      name: '真の姿のヴァルグリム',
      pattern: 'sequence',
      actions: [
        { id: 'corruptWave', name: '侵食の波動', big: true, effects: [{ kind: 'damage', element: 'dark', amount: 13, to: 'foes' }, { kind: 'applyStatus', status: 'poison', amount: 2, to: 'foes' }] },
        { id: 'devour', name: '喰らう', big: true, effects: [{ kind: 'damage', element: 'dark', amount: 28 }, { kind: 'heal', amount: 15, to: 'self' }] },
        { id: 'despair', name: '絶望', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 2, to: 'foes' }, { kind: 'block', amount: 20 }] },
      ],
    },
    {
      belowHpPct: 33,
      name: '最後の抵抗',
      pattern: 'sequence',
      actions: [
        { id: 'apocalypse', name: '終焉', big: true, effects: [{ kind: 'damage', element: 'dark', amount: 18, to: 'foes' }] },
        { id: 'shadowBarrier', name: '影の障壁', big: true, effects: [{ kind: 'block', amount: 30 }, { kind: 'damage', amount: 12, to: 'foes' }] },
        { id: 'annihilate', name: '消滅の一撃', big: true, effects: [{ kind: 'damage', element: 'dark', amount: 34 }] },
      ],
    },
  ],
};
