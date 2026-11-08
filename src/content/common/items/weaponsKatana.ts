// 刀：レア以上で火力・属性・状態異常・特殊を各1本。
import type { ItemDef } from '../../../types';

export const weaponsKatana: ItemDef[] = [
  // レア
  {
    id: 'forgedKatana', name: '鍛鉄の刀', slot: 'weapon', weaponType: 'katana', rarity: 'rare', icon: 'katana',
    description: 'よく鍛えた刃で、斬撃の威力を高める。', stats: { per: 5 }, tags: ['physical'],
    cards: [{ cardId: 'wtKatanaMoon', count: 2 }],
  },
  {
    id: 'dawnKatana', name: '暁の刀', slot: 'weapon', weaponType: 'katana', rarity: 'rare', icon: 'katana',
    description: '完全成功でランダムな敵1体に聖属性の追撃2。1ターンに1回。', stats: { per: 2, int: 2 }, tags: ['physical', 'holy'],
    cards: [{ cardId: 'wtKatanaMoon', count: 2 }],
    ability: { name: '暁光', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'dawnKatana' }], do: [{ kind: 'damage', amount: 2, element: 'holy', to: 'randomFoe' }] } },
  },
  {
    id: 'adderKatana', name: '蛇紋の刀', slot: 'weapon', weaponType: 'katana', rarity: 'rare', icon: 'katana',
    description: '完全成功で毒2を与える。1ターンに1回。', stats: { per: 2, dex: 2 }, tags: ['physical', 'poison'],
    cards: [{ cardId: 'wtKatanaMoon', count: 2 }],
    ability: { name: '蛇の牙', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'adderKatana' }], do: [{ kind: 'applyStatus', status: 'poison', amount: 2 }] } },
  },
  {
    id: 'guardKatana', name: '受け流しの刀', slot: 'weapon', weaponType: 'katana', rarity: 'rare', icon: 'katana',
    description: '物理カードでダメージを与えるとブロック2。1ターンに1回。', stats: { per: 2, agi: 2 }, tags: ['physical', 'block'],
    cards: [{ cardId: 'wtKatanaMoon', count: 2 }],
    ability: { name: '残心', effect: { when: 'afterCard', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'guardKatana' }], do: [{ kind: 'block', amount: 2, to: 'self' }] } },
  },
  // エピック
  {
    id: 'crowdcleaverKatana', name: '陣割りの刀', slot: 'weapon', weaponType: 'katana', rarity: 'epic', icon: 'katana',
    description: '敵が2体以上なら、物理ダメージが1.2倍。', stats: { per: 8 }, tags: ['physical', 'aoe'],
    cards: [{ cardId: 'wtKatanaSplit', count: 2 }],
    ability: { name: '陣割り', effect: { modifier: 'damageDealt', multiplier: 1.2, if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'foeCount', min: 2 }] } },
  },
  {
    id: 'sunriseKatana', name: '日輪の刀', slot: 'weapon', weaponType: 'katana', rarity: 'epic', icon: 'katana',
    description: 'HPが半分以上なら、無属性の物理攻撃が聖属性になる。', stats: { per: 4, int: 4 }, tags: ['physical', 'holy'],
    cards: [{ cardId: 'wtKatanaSplit', count: 2 }],
    ability: { name: '日輪', effect: { modifier: 'convertElement', into: 'holy', if: [{ kind: 'selfHpAtLeast', pct: 50 }] } },
  },
  {
    id: 'witherKatana', name: '枯葉の刀', slot: 'weapon', weaponType: 'katana', rarity: 'epic', icon: 'katana',
    description: '完全成功で脱力1を与える。1ターンに1回。', stats: { per: 4, dex: 4 }, tags: ['physical', 'weak'],
    cards: [{ cardId: 'wtKatanaSplit', count: 2 }],
    ability: { name: '力抜き', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'witherKatana' }], do: [{ kind: 'applyStatus', status: 'weak', amount: 1 }] } },
  },
  {
    id: 'clearwaterKatana', name: '明鏡の刀', slot: 'weapon', weaponType: 'katana', rarity: 'epic', icon: 'katana',
    description: '2枠以上の物理カードの成功率+5%。', stats: { per: 4, agi: 4 }, tags: ['physical', 'multi'],
    cards: [{ cardId: 'wtKatanaSplit', count: 2 }],
    ability: { name: '明鏡止水', effect: { modifier: 'cardChance', bonus: 5, if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'cardSlots', min: 2 }] } },
  },
  // レジェンド。専用のレジェンド武器カードがないため、既存の花吹雪を共有する。
  {
    id: 'peerlessKatana', name: '天下無双', slot: 'weapon', weaponType: 'katana', rarity: 'legend', icon: 'katana',
    description: 'HP75%以上なら、2枠以上の物理カードのダメージが1.25倍。', stats: { per: 12 }, tags: ['physical', 'multi'],
    cards: [{ cardId: 'wtKatanaPetals', count: 2 }],
    ability: { name: '無双の構え', effect: { modifier: 'damageDealt', multiplier: 1.25, if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'cardSlots', min: 2 }, { kind: 'selfHpAtLeast', pct: 75 }] } },
  },
  {
    id: 'heavenlightKatana', name: '天照の刀', slot: 'weapon', weaponType: 'katana', rarity: 'legend', icon: 'katana',
    description: '完全成功でランダムな敵1体に聖属性の追撃4。1ターンに1回。', stats: { per: 8, int: 4 }, tags: ['physical', 'holy'],
    cards: [{ cardId: 'wtKatanaPetals', count: 2 }],
    ability: { name: '天の光', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'heavenlightKatana' }], do: [{ kind: 'damage', amount: 4, element: 'holy', to: 'randomFoe' }] } },
  },
  {
    id: 'silencingKatana', name: '封魔の刀', slot: 'weapon', weaponType: 'katana', rarity: 'legend', icon: 'katana',
    description: '完全成功で脱力2を与える。1ターンに1回。', stats: { per: 10, dex: 2 }, tags: ['physical', 'weak'],
    cards: [{ cardId: 'wtKatanaPetals', count: 2 }],
    ability: { name: '封じの太刀', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'silencingKatana' }], do: [{ kind: 'applyStatus', status: 'weak', amount: 2 }] } },
  },
  {
    id: 'flowingKatana', name: '流水の刀', slot: 'weapon', weaponType: 'katana', rarity: 'legend', icon: 'katana',
    description: '物理攻撃の完全成功で1枚引き、フォーカス1。1ターンに1回。', stats: { per: 10, agi: 2 }, tags: ['physical', 'draw', 'focus'],
    cards: [{ cardId: 'wtKatanaPetals', count: 2 }],
    ability: { name: '流水の呼吸', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'flowingKatana' }], do: [{ kind: 'draw', amount: 1 }, { kind: 'gainFocus', amount: 1 }] } },
  },
];
