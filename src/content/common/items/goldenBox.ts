// ランダムダンジョンの専用の装備（段階7a・overhaul-plan-v2 §4-3 と、それを1つにまとめた docs/tasks/lineup-final-gear.md の「新しい（黄金箱）」）。
// 出どころは、ランダムダンジョンの最奥の黄金箱（60%で1つ余分に）と、無法者の隠れ処の闇商人だけ（source: 'randomDungeon'。町の店・ふつうの宝箱・ドロップ・行商人には出ない）。
// 冒険をまたいで持ち越さない（今の装備と同じ）。能力の数字は一覧のまま。能力値（stats）は、同じ武器種・同じ格の今の武器と同じ。無い物は【提案】。
// 一覧の14個のうち、今のデータと役割が重なる2個（イージスの鏡盾 = 拳聖《後の先》／残響の指輪 = 大魔導士《詠唱短縮》）は作っていない（報告に理由と案）
import type { ItemDef } from '../../../types';

const RD = 'randomDungeon' as const;

export const goldenBoxItems: ItemDef[] = [
  // ---- 武器（3） ----
  {
    id: 'thunderChaseKatana', name: '追撃の雷鳴刀', slot: 'weapon', weaponType: 'katana', rarity: 'epic', icon: 'katana', source: RD,
    description: '味方（自分も）のカードで連携が起きるたび、その敵に3の雷属性の追撃。1人の時は、そのターン2枚目からの物理カードのたびに追撃。1ターンに3回まで。',
    stats: { per: 8 }, tags: ['physical', 'combo'],
    cards: [{ cardId: 'axParry', count: 2 }],
    ability: {
      name: '雷鳴の追撃',
      description: '味方（自分も）のカードで連携が起きるたび、その敵に3の雷属性の追撃。1人の時は、そのターン2枚目からの物理カードのたびに追撃。1ターンに3回まで。',
      effect: { when: 'allyCombo', if: [{ kind: 'allyCountAtLeast', min: 2 }, { kind: 'perTurn', key: 'thunderChase', max: 3 }], do: [{ kind: 'damage', amount: 3, element: 'thunder' }] },
      also: [{ when: 'afterCard', if: [{ kind: 'allyCount', max: 1 }, { kind: 'cardCategory', category: 'physical' }, { kind: 'playedThisTurn', atLeast: 1 }, { kind: 'perTurn', key: 'thunderChase', max: 3 }], do: [{ kind: 'damage', amount: 3, element: 'thunder' }] }],
    },
  },
  {
    id: 'gatlingGun', name: '連装ガトリング銃', slot: 'weapon', weaponType: 'gun', rarity: 'legend', icon: 'gun', source: RD,
    description: '「×N回」の攻撃カードの回数が、いつも+1。',
    stats: { dex: 12 }, tags: ['physical', 'multi'],
    cards: [{ cardId: 'axQuickDraw', count: 2 }],
    ability: { name: '連装', description: '「×N回」の攻撃カードの回数が、いつも+1。', effect: { modifier: 'extraHits', add: 1 } },
  },
  {
    id: 'gospelScepter', name: '福音の大錫杖', slot: 'weapon', weaponType: 'scepter', rarity: 'epic', icon: 'scepter', source: RD,
    description: '回復がHPからあふれたら、あふれた量と同じ聖属性のダメージをランダムな敵1体に（ボス・中ボスへは1回30まで）。',
    // 錫杖のエピックは今まで無かったので、能力値は【提案】（レア 知力+2・感知+2 と レジェンド 知力+8・体力+4 の間）
    stats: { int: 6, vit: 2 }, tags: ['heal', 'holy', 'support'],
    cards: [{ cardId: 'axOverflowBlessing', count: 2 }],
    ability: { name: '溢れる福音', description: '回復がHPからあふれたら、あふれた量と同じ聖属性のダメージをランダムな敵1体に（ボス・中ボスへは1回30まで）。', effect: { when: 'overheal', do: [{ kind: 'dealtDamage', element: 'holy', bossCap: 30 }] } },
  },
  // ---- 鎧（2） ----
  {
    id: 'madKingMail', name: '狂王の血鎧', slot: 'armor', rarity: 'legend', icon: 'armor', source: RD,
    description: 'HPが減るたび、次の攻撃カード1枚のダメージ+20%（最大+100%。使うと0に戻る）。',
    maxHp: 30, tags: ['physical', 'heavy'],
    ability: { name: '狂王の怒り', effect: { modifier: 'rageStack', pct: 20, max: 100 } },
  },
  {
    id: 'executionerCloak', name: '処刑人の黒外套', slot: 'armor', rarity: 'epic', icon: 'robe', source: RD,
    description: '自分の攻撃で敵を BREAK させたら、マナ+2・フォーカス+1・カードを2枚引く。1ターンに1回。',
    // 能力値は【提案】（一覧に数字が無い。エピックの鎧の最大HPの幅の中）
    maxHp: 12, stats: { agi: 4 }, tags: ['mana', 'draw', 'focus'],
    ability: { name: '処刑の合図', effect: { when: 'broke', if: [{ kind: 'oncePerTurn', key: 'executionerCloak' }], do: [{ kind: 'gainMana', amount: 2 }, { kind: 'gainFocus', amount: 1 }, { kind: 'draw', amount: 2 }] } },
  },
  // ---- 装飾品（7） ----
  {
    id: 'twinSoulBell', name: '双子の魂の鈴', slot: 'accessory', rarity: 'legend', icon: 'charm', source: RD,
    description: 'お供の自動の行動が2回になる（カード・道具で動かした時は1回。お供の行動は1ターンに4回まで）。',
    // 能力値は【提案】
    stats: { per: 6 }, tags: ['pet'],
    ability: { name: '双子の魂', effect: { modifier: 'petTwice' } },
  },
  {
    id: 'endlessHourglass', name: '無限回廊の砂時計', slot: 'accessory', rarity: 'legend', icon: 'amulet', source: RD,
    description: 'コスト0のカードを3回使うたび、マナ+1・カードを1枚引く。1ターンに2回まで。',
    // 能力値は【提案】
    stats: { agi: 6 }, tags: ['free', 'mana', 'draw'],
    ability: { name: '無限回廊', effect: { when: 'afterCard', if: [{ kind: 'cardCost', max: 0 }, { kind: 'everyN', n: 3, key: 'endlessHourglass' }, { kind: 'perTurn', key: 'endlessHourglass', max: 2 }], do: [{ kind: 'gainMana', amount: 1 }, { kind: 'draw', amount: 1 }] } },
  },
  {
    id: 'cheatersDice', name: 'いかさま師の黄金賽', slot: 'accessory', rarity: 'epic', icon: 'charm', source: RD,
    description: 'カードの成功が0だったら、完全成功に変わり、フォーカス+1。1ターンに1回。',
    stats: { luk: 10 }, tags: ['focus'],
    ability: { name: 'いかさま', effect: { modifier: 'rigDice' } },
  },
  {
    id: 'overchargeCore', name: '過充填の魔導炉', slot: 'accessory', rarity: 'epic', icon: 'amulet', source: RD,
    description: '使わずに残ったマナを、次のターンに最大2まで持ち越す。',
    // 能力値は【提案】
    stats: { int: 4 }, tags: ['mana', 'heavy'],
    ability: { name: '過充填', effect: { modifier: 'carryMana', max: 2 } },
  },
  {
    id: 'resonanceRing', name: '共鳴する絆の指輪', slot: 'accessory', rarity: 'epic', icon: 'ring', source: RD, teamOnly: true,
    description: 'カードで自分が得たブロックの50%を、HPの割合が一番低いほかの味方にも（仲間がいる冒険でだけ出る）。',
    // 能力値は【提案】
    stats: { vit: 4 }, tags: ['block', 'support'],
    ability: { name: '共鳴', effect: { modifier: 'shareBlock', pct: 50 } },
  },
  {
    id: 'alchemistBelt', name: '錬金術師のベルト', slot: 'accessory', rarity: 'epic', icon: 'charm', source: RD, pouchBonus: 2,
    description: '道具袋に持てる数+2。戦闘中に消耗品を使うと、味方全員のHPを4回復・ブロック4。',
    // 能力値は【提案】
    stats: { dex: 4 }, tags: ['heal', 'block', 'support'],
    ability: { name: '錬金の滴', effect: { when: 'itemUse', do: [{ kind: 'heal', amount: 4, to: 'allies' }, { kind: 'block', amount: 4, to: 'allies' }] } },
  },
  {
    id: 'stormEarring', name: '氷嵐の耳飾り', slot: 'accessory', rarity: 'epic', icon: 'amulet', source: RD,
    description: 'カードで敵の弱点を突いたら、そのカードのマナを返す。1ターンに1回。',
    // 能力値は【提案】
    stats: { int: 4 }, tags: ['weak', 'mana', 'magic'],
    ability: { name: '氷嵐の巡り', effect: { when: 'afterCard', if: [{ kind: 'weakHit' }, { kind: 'cardCost', min: 1 }, { kind: 'oncePerTurn', key: 'stormEarring' }], do: [{ kind: 'refundCost' }] } },
  },
];
