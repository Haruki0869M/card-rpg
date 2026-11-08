// 斧：レア以上で火力・属性・状態異常・特殊を各1本。
import type { ItemDef } from '../../../types';

export const weaponsAxe: ItemDef[] = [
  // レア
  {
    id: 'ironwoodAxe', name: '鉄割りの斧', slot: 'weapon', weaponType: 'axe', rarity: 'rare', icon: 'axe',
    description: '重い刃で力強い一撃を放つ。', stats: { str: 5 }, tags: ['physical', 'heavy'],
    cards: [{ cardId: 'wtAxeWhirl', count: 2 }],
  },
  {
    id: 'emberAxe', name: '火打ちの斧', slot: 'weapon', weaponType: 'axe', rarity: 'rare', icon: 'axe',
    description: '完全成功でランダムな敵1体に火属性の追撃2。1ターンに1回。', stats: { str: 2, int: 2 }, tags: ['physical', 'fire'],
    cards: [{ cardId: 'wtAxeWhirl', count: 2 }],
    ability: { name: '火花', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'emberAxe' }], do: [{ kind: 'damage', amount: 2, element: 'fire', to: 'randomFoe' }] } },
  },
  {
    id: 'notchedAxe', name: '傷刻みの斧', slot: 'weapon', weaponType: 'axe', rarity: 'rare', icon: 'axe',
    description: '完全成功で脆弱1を与える。1ターンに1回。', stats: { str: 2, per: 2 }, tags: ['physical', 'vulnerable'],
    cards: [{ cardId: 'wtAxeWhirl', count: 2 }],
    ability: { name: '傷刻み', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'notchedAxe' }], do: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1 }] } },
  },
  {
    id: 'bulwarkAxe', name: '堅守の斧', slot: 'weapon', weaponType: 'axe', rarity: 'rare', icon: 'axe',
    description: '物理カードでダメージを与えるとブロック2。1ターンに1回。', stats: { str: 2, vit: 2 }, tags: ['physical', 'block'],
    cards: [{ cardId: 'wtAxeWhirl', count: 2 }],
    ability: { name: '踏ん張り', effect: { when: 'afterCard', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'bulwarkAxe' }], do: [{ kind: 'block', amount: 2, to: 'self' }] } },
  },
  // エピック
  {
    id: 'giantAxe', name: '巨人の斧', slot: 'weapon', weaponType: 'axe', rarity: 'epic', icon: 'axe',
    description: 'コスト2以上の物理カードのダメージが1.2倍。', stats: { str: 8 }, tags: ['physical', 'heavy'],
    cards: [{ cardId: 'wtAxeBloodlust', count: 2 }],
    ability: { name: '重い一撃', effect: { modifier: 'damageDealt', multiplier: 1.2, if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'cardCost', min: 2 }] } },
  },
  {
    id: 'furnaceAxe', name: '炉火の斧', slot: 'weapon', weaponType: 'axe', rarity: 'epic', icon: 'axe',
    description: '完全成功でランダムな敵1体に火属性の追撃3。1ターンに1回。', stats: { str: 4, int: 4 }, tags: ['physical', 'fire'],
    cards: [{ cardId: 'wtAxeBloodlust', count: 2 }],
    ability: { name: '炉の息吹', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'furnaceAxe' }], do: [{ kind: 'damage', amount: 3, element: 'fire', to: 'randomFoe' }] } },
  },
  {
    id: 'rendingAxe', name: '裂傷の斧', slot: 'weapon', weaponType: 'axe', rarity: 'epic', icon: 'axe',
    description: '完全成功で脆弱2を与える。1ターンに1回。', stats: { str: 4, per: 4 }, tags: ['physical', 'vulnerable'],
    cards: [{ cardId: 'wtAxeBloodlust', count: 2 }],
    ability: { name: '深い傷', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'rendingAxe' }], do: [{ kind: 'applyStatus', status: 'vulnerable', amount: 2 }] } },
  },
  {
    id: 'breachingAxe', name: '破城の斧', slot: 'weapon', weaponType: 'axe', rarity: 'epic', icon: 'axe',
    description: 'HPが半分以下なら、コスト2以上の物理カードがブロックを無視。', stats: { str: 4, vit: 4 }, tags: ['physical', 'heavy'],
    cards: [{ cardId: 'wtAxeBloodlust', count: 2 }],
    ability: { name: '窮地の突破', effect: { modifier: 'ignoreBlock', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'cardCost', min: 2 }, { kind: 'selfHpAtMost', pct: 50 }] } },
  },
  // レジェンド。専用のレジェンド武器カードがないため、既存の処刑斬を共有する。
  {
    id: 'laststandAxe', name: '背水の大斧', slot: 'weapon', weaponType: 'axe', rarity: 'legend', icon: 'axe',
    description: 'HPが半分以下なら、コスト2以上の物理ダメージが1.25倍。', stats: { str: 12 }, tags: ['physical', 'heavy'],
    cards: [{ cardId: 'wtAxeExecute', count: 2 }],
    ability: { name: '背水の一撃', effect: { modifier: 'damageDealt', multiplier: 1.25, if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'cardCost', min: 2 }, { kind: 'selfHpAtMost', pct: 50 }] } },
  },
  {
    id: 'volcanoAxe', name: '火山の大斧', slot: 'weapon', weaponType: 'axe', rarity: 'legend', icon: 'axe',
    description: '完全成功でランダムな敵1体に火属性の追撃4。1ターンに1回。', stats: { str: 8, int: 4 }, tags: ['physical', 'fire'],
    cards: [{ cardId: 'wtAxeExecute', count: 2 }],
    ability: { name: '噴火', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'volcanoAxe' }], do: [{ kind: 'damage', amount: 4, element: 'fire', to: 'randomFoe' }] } },
  },
  {
    id: 'ruinAxe', name: '崩壊の大斧', slot: 'weapon', weaponType: 'axe', rarity: 'legend', icon: 'axe',
    description: '完全成功で脆弱2と脱力1を与える。1ターンに1回。', stats: { str: 10, per: 2 }, tags: ['physical', 'vulnerable', 'weak'],
    cards: [{ cardId: 'wtAxeExecute', count: 2 }],
    ability: { name: '戦意砕き', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'ruinAxe' }], do: [{ kind: 'applyStatus', status: 'vulnerable', amount: 2 }, { kind: 'applyStatus', status: 'weak', amount: 1 }] } },
  },
  {
    id: 'lifedrinkerAxe', name: '命喰らいの斧', slot: 'weapon', weaponType: 'axe', rarity: 'legend', icon: 'axe',
    description: '物理カードでHPに与えたダメージの15%を回復。1ターンに1回。', stats: { str: 10, vit: 2 }, tags: ['physical', 'heal'],
    cards: [{ cardId: 'wtAxeExecute', count: 2 }],
    ability: { name: '命喰らい', effect: { when: 'afterCard', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'lifedrinkerAxe' }], do: [{ kind: 'healPctOfDealt', pct: 15 }] } },
  },
];
