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
  // 敵の特殊な行動の直し（docs/tasks/enemy-behaviors-fix-plan.md §3）: ほかの敵がいる時は、1ターン目に必ず「かばう」（1体だけの時は闇の剣に変わる）
  firstActionId: 'guard',
  actions: [
    { id: 'slash', name: '闇の剣', effects: [{ kind: 'damage', element: 'dark', amount: 15 }] },
    // 敵の特殊な行動 1回目（docs/tasks/enemy-behaviors-plan.md §7）: 守る行動「鉄壁」をかばうに置き換えた。ID は古い保存のために残す
    // 自分以外の敵がいない時は、かばう相手がいないので「闇の剣」に変える（予告もその攻撃になる）
    // 直し（§3）: ブロック10を足した（BREAK されると、行動ごと止まり、ブロックも付かない）
    { id: 'guard', name: 'かばう', big: true, behavior: 'guard', fallbackIfAloneId: 'slash', hint: '次の味方の番の間、ほかの敵への単体攻撃を代わりに受ける。全体攻撃は通る', effects: [{ kind: 'guardAllies' }, { kind: 'block', amount: 10 }] },
    { id: 'cleave', name: 'なぎ払い', effects: [{ kind: 'damage', amount: 9, to: 'foes' }] },
  ],
  // 最後の中ボス（2026-11-14 寄り道の値打ち 柱5）: 中ボスの部屋の戦闘だけの段階。HP50%か、相方が倒れると入る。数字は【提案】
  midbossPhases: [
    {
      belowHpPct: 50,
      onPartnerDown: true,
      name: '主を失った魔王軍の騎士',
      pattern: 'sequence',
      openingActionId: 'dkShieldRend',
      rule: '盾砕き: 当たるとブロックを全部壊す一撃（守りに頼らずに受ける。弱点で BREAK すると威力が半分）',
      actions: [
        { id: 'dkShieldRend', name: '闇の盾砕き', big: true, scripted: true, behavior: 'shatter', hint: '当たるとブロックを全部壊す。聖か雷の弱点で BREAK するか、ブロックに頼らずに受ける', effects: [{ kind: 'shieldBreak' }, { kind: 'damage', amount: 16, element: 'dark' }] },
        { id: 'dkVengeance', name: '仇討ちの剣', effects: [{ kind: 'damage', element: 'dark', amount: 15 }] },
        { id: 'dkSweep', name: '闇のなぎ払い', effects: [{ kind: 'damage', amount: 9, to: 'foes' }] },
      ],
    },
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
  // 最後の中ボス（2026-11-14 寄り道の値打ち 柱5）: 中ボスの部屋の戦闘だけの段階。HP50%か、相方が倒れると入る。数字は【提案】
  midbossPhases: [
    {
      belowHpPct: 50,
      onPartnerDown: true,
      name: '怒れる門番ガルザ',
      pattern: 'sequence',
      openingActionId: 'gzGateCrush',
      rule: '盾砕き: 当たるとブロックを全部壊す一撃（守りに頼らずに受ける。弱点で BREAK すると威力が半分）',
      actions: [
        { id: 'gzGateCrush', name: '門砕きの大斧', big: true, scripted: true, behavior: 'shatter', hint: '当たるとブロックを全部壊す。雷の弱点で BREAK するか、ブロックに頼らずに受ける', effects: [{ kind: 'shieldBreak' }, { kind: 'damage', amount: 22 }] },
        { id: 'gzStorm', name: '雷鳴の大旋風', big: true, hint: '味方全員に雷のダメージ。ブロックで受けるか、雷で BREAK する', effects: [{ kind: 'damage', element: 'thunder', amount: 11, to: 'foes' }] },
        { id: 'gzGlare', name: '門番の睨み', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }, { kind: 'damage', amount: 8 }] },
      ],
    },
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
      // ボスの段階（2026-11-14）: 魔王軍の騎士を呼ぶ（騎士は1ターン目にかばう。1回だけ）。答え: 聖で BREAK・騎士を先に倒す・全体攻撃
      openingActionId: 'callKnight',
      rule: '魔王軍の騎士を呼び、かばわせる（聖で BREAK すると止まる。騎士を先に倒すか、全体攻撃で）',
      actions: [
        { id: 'callKnight', name: '魔王軍招集', big: true, scripted: true, behavior: 'call', hint: '魔王軍の騎士を1体呼ぶ（騎士は最初の番にヴァルグリムをかばう）。聖の弱点で BREAK すると止まる。騎士を先に倒すか、全体攻撃で両方を削る', effects: [{ kind: 'summonEnemy', enemy: 'darkKnight', uses: 1, orElse: 'devour' }, { kind: 'block', amount: 12 }] },
        { id: 'corruptWave', name: '侵食の波動', big: true, effects: [{ kind: 'damage', element: 'dark', amount: 13, to: 'foes' }, { kind: 'applyStatus', status: 'poison', amount: 2, to: 'foes' }] },
        { id: 'devour', name: '喰らう', big: true, effects: [{ kind: 'damage', element: 'dark', amount: 28 }, { kind: 'heal', amount: 15, to: 'self' }] },
        { id: 'despair', name: '絶望', effects: [{ kind: 'applyStatus', status: 'vulnerable', amount: 2, to: 'foes' }, { kind: 'block', amount: 20 }] },
      ],
    },
    {
      belowHpPct: 33,
      name: '最後の抵抗',
      pattern: 'sequence',
      // ボスの段階（2026-11-14）: 手数読み＋消滅の一撃の溜め（1回だけ。消滅の一撃は順番にも残る）。答え: 手数を絞る・消滅の一撃を聖で BREAK・守り
      openingActionId: 'doomWatch',
      rule: 'カードを使いすぎた味方に反撃し、次の予告で「消滅の一撃」（手数を絞り、消滅の一撃は聖で BREAK）',
      actions: [
        { id: 'doomWatch', name: '終焉の眼', big: true, scripted: true, behavior: 'punish', chargeTo: 'annihilate', hint: 'このターンにカードを4枚以上使った味方に、枚数×3のダメージ。次の予告は「消滅の一撃」になる。手数を絞って受け、消滅の一撃は聖の弱点で BREAK する', effects: [{ kind: 'punishPlays', amount: 3, min: 4 }] },
        { id: 'apocalypse', name: '終焉', big: true, effects: [{ kind: 'damage', element: 'dark', amount: 18, to: 'foes' }] },
        { id: 'shadowBarrier', name: '影の障壁', big: true, effects: [{ kind: 'block', amount: 30 }, { kind: 'damage', amount: 12, to: 'foes' }] },
        { id: 'annihilate', name: '消滅の一撃', big: true, effects: [{ kind: 'damage', element: 'dark', amount: 34 }] },
      ],
    },
  ],
};
