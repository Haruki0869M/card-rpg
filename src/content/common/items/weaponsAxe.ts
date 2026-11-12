// 斧（捨て身）。区切りB（2026-11-11）で6本に絞った。1本ごとに、ほかに無い役割を持つ。
import type { ItemDef } from '../../../types';

export const weaponsAxe: ItemDef[] = [
  // レア
  {
    id: "ironwoodAxe", name: "鉄割りの斧", slot: "weapon", weaponType: "axe", rarity: "rare", icon: "axe",
    description: "HPが半分以下の間、物理カードの成功率+10%。", stats: {"str":5}, tags: ["physical","heavy"],
    cards: [{"cardId":"axAdversity","count":2}],
    ability: {"name":"捨て身","description":"HPが半分以下の間、物理カードの成功率+10%。","effect":{"modifier":"cardChance","bonus":10,"if":[{"kind":"cardCategory","category":"physical"},{"kind":"selfHpAtMost","pct":50}]}},
  },
  {
    id: "notchedAxe", name: "傷刻みの斧", slot: "weapon", weaponType: "axe", rarity: "rare", icon: "axe",
    description: "敵を倒した時、HPを4回復。1ターンに1回。", stats: {"str":2,"per":2}, tags: ["physical","heal"],
    cards: [{"cardId":"wtAxeWhirl","count":2}],
    ability: {"name":"返り血","description":"敵を倒した時、HPを4回復。1ターンに1回。","effect":{"when":"kill","if":[{"kind":"oncePerTurn","key":"notchedAxe"}],"do":[{"kind":"heal","amount":4,"to":"self"}]}},
  },
  // エピック
  {
    id: 'breachingAxe', name: '破城の斧', slot: 'weapon', weaponType: 'axe', rarity: 'epic', icon: 'axe',
    description: 'コスト2以上の物理カードがブロックを無視。', stats: { str: 4, vit: 4 }, tags: ['physical', 'heavy'],
    cards: [{"cardId":"axBlockBreaker","count":2}],
    ability: { name: '城門破り', effect: { modifier: 'ignoreBlock', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'cardCost', min: 2 }] } },
  },
  // レジェンド。専用のレジェンド武器カードがないため、既存の処刑斬を共有する。
  {
    id: 'laststandAxe', name: '背水の大斧', slot: 'weapon', weaponType: 'axe', rarity: 'legend', icon: 'axe',
    description: 'HPが半分以下なら、物理カードのダメージが1.25倍。', stats: { str: 12 }, tags: ['physical', 'heavy'],
    cards: [{ cardId: 'cmAllOrNothing', count: 2 }],
    ability: { name: '背水の一撃', effect: { modifier: 'damageDealt', multiplier: 1.25, if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'selfHpAtMost', pct: 50 }] } },
  },
  {
    id: 'lifedrinkerAxe', name: '命喰らいの斧', slot: 'weapon', weaponType: 'axe', rarity: 'legend', icon: 'axe',
    description: '物理カードでHPに与えたダメージの15%を回復。1ターンに1回。', stats: { str: 10, vit: 2 }, tags: ['physical', 'heal'],
    cards: [{ cardId: 'cmAllOrNothing', count: 2 }],
    ability: { name: '命喰らい', effect: { when: 'afterCard', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'lifedrinkerAxe' }], do: [{ kind: 'healPctOfDealt', pct: 15 }] } },
  },
];
