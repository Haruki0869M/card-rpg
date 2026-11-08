// 剣の追加分。既存の鋼・ミスリルを火力型、炎の大剣を属性型として数える。
import type { ItemDef } from '../../../types';

export const weaponsSword: ItemDef[] = [
  // レア：属性・状態異常・特殊
  {
    id: 'smolderSword', name: '熾火の剣', slot: 'weapon', weaponType: 'sword', rarity: 'rare', icon: 'sword',
    description: '完全成功で火傷1を与える。1ターンに1回。', stats: { str: 2, int: 2 }, tags: ['physical', 'fire'],
    cards: [{ cardId: 'wSteelCombo', count: 2 }],
    ability: { name: '残り火', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'smolderSword' }], do: [{ kind: 'applyStatus', status: 'burn', amount: 1 }] } },
  },
  {
    id: 'venomSword', name: '毒塗りの剣', slot: 'weapon', weaponType: 'sword', rarity: 'rare', icon: 'sword',
    description: '完全成功で毒2を与える。1ターンに1回。', stats: { str: 2, dex: 2 }, tags: ['physical', 'poison'],
    cards: [{ cardId: 'wSteelCombo', count: 2 }],
    ability: { name: '毒の刃', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'venomSword' }], do: [{ kind: 'applyStatus', status: 'poison', amount: 2 }] } },
  },
  {
    id: 'balancedSword', name: '均衡の剣', slot: 'weapon', weaponType: 'sword', rarity: 'rare', icon: 'sword',
    description: '2枠以上の物理カードの成功率+3%。', stats: { str: 2, dex: 2 }, tags: ['physical', 'multi'],
    cards: [{ cardId: 'wSteelCombo', count: 2 }],
    ability: { name: '手になじむ柄', effect: { modifier: 'cardChance', bonus: 3, if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'cardSlots', min: 2 }] } },
  },
  // エピック：属性・状態異常・特殊
  {
    id: 'sunsteelSword', name: '陽炎の剣', slot: 'weapon', weaponType: 'sword', rarity: 'epic', icon: 'sword',
    description: 'HPが半分以上なら、無属性の物理攻撃が火属性になる。', stats: { str: 4, int: 4 }, tags: ['physical', 'fire'],
    cards: [{ cardId: 'wMithrilSlash', count: 2 }],
    ability: { name: '陽炎の刃', effect: { modifier: 'convertElement', into: 'fire', if: [{ kind: 'selfHpAtLeast', pct: 50 }] } },
  },
  {
    id: 'blightSword', name: '疫毒の剣', slot: 'weapon', weaponType: 'sword', rarity: 'epic', icon: 'sword',
    description: '完全成功で毒3を与える。1ターンに1回。', stats: { str: 4, dex: 4 }, tags: ['physical', 'poison'],
    cards: [{ cardId: 'wMithrilSlash', count: 2 }],
    ability: { name: '深い毒', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'blightSword' }], do: [{ kind: 'applyStatus', status: 'poison', amount: 3 }] } },
  },
  {
    id: 'mistSword', name: '霞の剣', slot: 'weapon', weaponType: 'sword', rarity: 'epic', icon: 'sword',
    description: '物理攻撃の完全成功でフォーカス1。1ターンに1回。', stats: { str: 4, agi: 4 }, tags: ['physical', 'focus'],
    cards: [{ cardId: 'wMithrilSlash', count: 2 }],
    ability: { name: '霞の呼吸', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'mistSword' }], do: [{ kind: 'gainFocus', amount: 1 }] } },
  },
  // レジェンド：火力・状態異常・特殊
  {
    id: 'oathkeeperSword', name: '誓約の剣', slot: 'weapon', weaponType: 'sword', rarity: 'legend', icon: 'sword',
    description: 'HP75%以上で敵が1体なら、物理ダメージが1.25倍。', stats: { str: 12 }, tags: ['physical'],
    cards: [{ cardId: 'wFlameSlash', count: 2 }],
    ability: { name: '一騎の誓い', effect: { modifier: 'damageDealt', multiplier: 1.25, if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'foeCount', max: 1 }, { kind: 'selfHpAtLeast', pct: 75 }] } },
  },
  {
    id: 'winterkingSword', name: '冬王の剣', slot: 'weapon', weaponType: 'sword', rarity: 'legend', icon: 'sword',
    description: '物理攻撃の完全成功で凍結1。1戦闘に1回。', stats: { str: 10, per: 2 }, tags: ['physical', 'freeze'],
    cards: [{ cardId: 'wFlameSlash', count: 2 }],
    ability: { name: '冬王の封印', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'perBattle', key: 'winterkingSword', max: 1 }], do: [{ kind: 'applyStatus', status: 'freeze', amount: 1 }] } },
  },
  {
    id: 'lifeboundSword', name: '命紡ぎの剣', slot: 'weapon', weaponType: 'sword', rarity: 'legend', icon: 'sword',
    description: '物理カードでHPに与えたダメージの20%を回復。1ターンに1回。', stats: { str: 10, vit: 2 }, tags: ['physical', 'heal'],
    cards: [{ cardId: 'wFlameSlash', count: 2 }],
    ability: { name: '命の糸', effect: { when: 'afterCard', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'lifeboundSword' }], do: [{ kind: 'healPctOfDealt', pct: 20 }] } },
  },
];
