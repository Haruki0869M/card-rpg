// 嘆きの沼の敵（シナリオ1）
import type { EnemyDef } from '../../../../types';

export const bogGhoul: EnemyDef = {
  id: 'bogGhoul',
  weak: ['holy', 'fire'],
  resist: ['poison', 'dark'],
  name: '沼の亡者',
  icon: '💀',
  maxHp: 30,
  baseLevel: 5,
  size: 0.95,
  exp: 10,
  gold: 6,
  pattern: 'random',
  maxConsecutive: 2,
  actions: [
    { id: 'claw', name: '腐った爪', effects: [{ kind: 'damage', element: 'poison', amount: 8 }] },
    {
      id: 'grasp',
      name: '亡者の手',
      effects: [
        { kind: 'damage', amount: 5 },
        { kind: 'applyStatus', status: 'weak', amount: 1 },
      ],
    },
  ],
};

export const mireSlime: EnemyDef = {
  id: 'mireSlime',
  weak: ['thunder'],
  resist: ['poison'],
  name: '沼の大ガマ',
  icon: '🟢',
  maxHp: 26,
  baseLevel: 5,
  size: 0.85,
  exp: 9,
  gold: 5,
  pattern: 'sequence',
  actions: [
    { id: 'splash', name: '毒泥の飛沫', effects: [{ kind: 'applyStatus', status: 'poison', amount: 3, to: 'foes' }] },
    { id: 'tackle', name: '体当たり', effects: [{ kind: 'damage', element: 'poison', amount: 5, hits: 2 }] },
    // 敵の特殊な行動 1回目（docs/tasks/enemy-behaviors-plan.md §7）: 守る行動「泥の膜」を浄化（脱皮）に置き換えた。ID は古い保存のために残す
    // 1ターン目は状態異常がまだ付いていない事が多く空振りになるので、順番の最後に回した
    // 直し（docs/tasks/enemy-behaviors-fix-plan.md §3）: 自分に悪い状態異常がある時は、順番を飛ばして割り込む（割り込んだら次の2ターンは割り込まない）。順番の3番目にも残す
    { id: 'harden', name: '浄化の脱皮', big: true, behavior: 'purify', cutIn: { when: 'afflicted', rest: 2 }, hint: '状態異常を全部消して回復する。その前に起爆するか、BREAK する', effects: [{ kind: 'purify', amount: 6 }] },
  ],
};

export const bogWraith: EnemyDef = {
  id: 'bogWraith',
  weak: ['holy'],
  resist: ['ice', 'dark'],
  name: '沼の怨霊',
  icon: '👻',
  maxHp: 48,
  baseLevel: 6,
  size: 1.05,
  exp: 22,
  gold: 18,
  pattern: 'sequence',
  actions: [
    { id: 'wail', name: '嘆きの声', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }] },
    { id: 'touch', name: '凍える手', big: true, effects: [{ kind: 'damage', element: 'ice', amount: 12 }] },
    { id: 'haunt', name: '取り憑く', big: true, effects: [{ kind: 'damage', element: 'dark', amount: 6, to: 'foes' }] },
  ],
  abilities: [{ name: '怨念', effect: { when: 'turnStart', do: [{ kind: 'heal', amount: 3, to: 'self' }] } }],
};

export const mordea: EnemyDef = {
  id: 'mordea',
  weak: ['holy'],
  resist: ['dark', 'poison'],
  name: '屍術師モルデア',
  icon: '🧙',
  maxHp: 210,
  baseLevel: 8,
  size: 1.35,
  exp: 120,
  gold: 120,
  pattern: 'sequence',
  actions: [
    { id: 'deathBolt', name: '死の魔弾', big: true, effects: [{ kind: 'damage', element: 'dark', amount: 14 }] },
    {
      id: 'curse',
      name: '屍の呪い',
      effects: [
        { kind: 'applyStatus', status: 'weak', amount: 2, to: 'foes' },
        { kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' },
      ],
    },
    { id: 'boneShield', name: '骨の盾', effects: [{ kind: 'block', amount: 18 }, { kind: 'damage', amount: 8 }] },
  ],
  phases: [
    {
      belowHpPct: 50,
      name: '冥府の屍術師',
      pattern: 'sequence',
      // ボスの段階（2026-11-14）: 癒し封じ＋自分の回復（順番にも入る）。答え: 聖で BREAK・回復に頼らない組には効きが小さい
      openingActionId: 'deathSeal',
      rule: '味方の回復を半分にする封印を撒き、自分は回復する（聖で BREAK すると止まる）',
      actions: [
        { id: 'deathSeal', name: '冥府の封印', big: true, behavior: 'healSeal', hint: '味方全員の回復が2ターン半分になり、モルデアはHPを15回復する。聖の弱点で BREAK すると止まる。回復に頼らない組には効きが小さい', effects: [{ kind: 'applyStatus', status: 'healSeal', amount: 2, to: 'foes' }, { kind: 'heal', amount: 15, to: 'self' }] },
        { id: 'necromance', name: '死霊の宴', big: true, effects: [{ kind: 'heal', amount: 20, to: 'self' }, { kind: 'damage', element: 'dark', amount: 10, to: 'foes' }] },
        { id: 'soulRip', name: '魂裂き', big: true, effects: [{ kind: 'damage', element: 'dark', amount: 22 }] },
        { id: 'plague', name: '疫病の霧', big: true, effects: [{ kind: 'applyStatus', status: 'poison', amount: 4, to: 'foes' }, { kind: 'damage', amount: 5, to: 'foes' }] },
      ],
    },
  ],
};
