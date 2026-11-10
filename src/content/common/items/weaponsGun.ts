// 銃：各レア度に火力・属性・状態異常・特殊を1本ずつ。武器カードに合う器用さ・知覚を配分する。
import type { ItemDef } from '../../../types';

export const weaponsGun: ItemDef[] = [
  // レア
  {
    id: "rifledGun", name: "精密銃", slot: "weapon", weaponType: "gun", rarity: "rare", icon: "gun",
    description: "よく調整した銃身で、射撃の威力を高める。", stats: {"dex": 5}, tags: ["physical"],
    cards: [{"cardId": "wtGunArmorPiercing", "count": 2}],
  },
  {
    id: "emberGun", name: "火種銃", slot: "weapon", weaponType: "gun", rarity: "rare", icon: "gun",
    description: "物理攻撃でHPを削った完全成功時、対象に火傷1。毎ターン1回。", stats: {"dex": 2, "int": 2}, tags: ["physical", "fire"],
    cards: [{"cardId": "wtGunArmorPiercing", "count": 2}],
    ability: {"name": "火種弾", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "emberGun"}], "do": [{"kind": "applyStatus", "status": "burn", "amount": 1}]}},
  },
  {
    id: "venomGun", name: "毒弾銃", slot: "weapon", weaponType: "gun", rarity: "rare", icon: "gun",
    description: "物理攻撃でHPを削った完全成功時、対象に毒2。毎ターン1回。", stats: {"dex": 2, "per": 2}, tags: ["physical", "poison"],
    cards: [{"cardId": "wtGunArmorPiercing", "count": 2}],
    ability: {"name": "毒弾", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "venomGun"}], "do": [{"kind": "applyStatus", "status": "poison", "amount": 2}]}},
  },
  {
    id: "balancedGun", name: "安定銃", slot: "weapon", weaponType: "gun", rarity: "rare", icon: "gun",
    description: "2枠以上の物理カードの成功率+3%。", stats: {"dex": 2, "agi": 2}, tags: ["physical", "multi"],
    cards: [{"cardId": "wtGunArmorPiercing", "count": 2}],
    ability: {"name": "安定した照準", "effect": {"modifier": "cardChance", "bonus": 3, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "cardSlots", "min": 2}]}},
  },
  // エピック
  {
    id: "marksmanGun", name: "狙撃銃", slot: "weapon", weaponType: "gun", rarity: "epic", icon: "gun",
    description: "HP75%以上なら、コスト2以上の物理ダメージが1.2倍。", stats: {"per": 8}, tags: ["physical", "heavy"],
    cards: [{"cardId": "wtGunHeadshot", "count": 2}],
    ability: {"name": "狙撃手の呼吸", "effect": {"modifier": "damageDealt", "multiplier": 1.2, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "selfHpAtLeast", "pct": 75}, {"kind": "cardCost", "min": 2}]}},
  },
  {
    id: "blazingGun", name: "炎弾銃", slot: "weapon", weaponType: "gun", rarity: "epic", icon: "gun",
    description: "HPが半分以上なら、無属性の物理攻撃が火属性になる。", stats: {"per": 4, "int": 4}, tags: ["physical", "fire"],
    cards: [{"cardId": "wtGunHeadshot", "count": 2}],
    ability: {"name": "炎弾", "effect": {"modifier": "convertElement", "into": "fire", "if": [{"kind": "selfHpAtLeast", "pct": 50}]}},
  },
  {
    id: "rendingGun", name: "裂傷銃", slot: "weapon", weaponType: "gun", rarity: "epic", icon: "gun",
    description: "物理攻撃でHPを削った完全成功時、対象に脆弱1。毎ターン1回。", stats: {"per": 4, "dex": 4}, tags: ["physical", "vulnerable"],
    cards: [{"cardId": "wtGunHeadshot", "count": 2}],
    ability: {"name": "裂傷弾", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "rendingGun"}], "do": [{"kind": "applyStatus", "status": "vulnerable", "amount": 1}]}},
  },
  {
    id: "breachingGun", name: "突破銃", slot: "weapon", weaponType: "gun", rarity: "epic", icon: "gun",
    description: "コスト2以上の物理カードがブロックを無視。", stats: {"per": 4, "vit": 4}, tags: ["physical", "heavy"],
    cards: [{"cardId": "wtGunHeadshot", "count": 2}],
    ability: {"name": "突破弾", "effect": {"modifier": "ignoreBlock", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "cardCost", "min": 2}]}},
  },
  // レジェンド
  // 既存にレジェンド用カードがないため、エピック以下の武器種カードを共有する。
  {
    id: "duelistsGun", name: "一騎銃", slot: "weapon", weaponType: "gun", rarity: "legend", icon: "gun",
    description: "HP75%以上で敵が1体なら、物理ダメージが1.25倍。", stats: {"dex": 12}, tags: ["physical"],
    cards: [{"cardId": "wtGunFanFire", "count": 2}],
    ability: {"name": "一騎の照準", "effect": {"modifier": "damageDealt", "multiplier": 1.25, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "selfHpAtLeast", "pct": 75}, {"kind": "foeCount", "max": 1}]}},
  },
  {
    id: "haloGun", name: "光輪銃", slot: "weapon", weaponType: "gun", rarity: "legend", icon: "gun",
    description: "物理攻撃でHPを削った完全成功時、ランダムな敵に聖の追撃4。毎ターン1回。", stats: {"dex": 8, "int": 4}, tags: ["physical", "holy"],
    cards: [{"cardId": "wtGunFanFire", "count": 2}],
    ability: {"name": "光輪弾", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "haloGun"}], "do": [{"kind": "damage", "element": "holy", "amount": 4, "to": "randomFoe"}]}},
  },
  {
    id: "plagueGun", name: "疫毒銃", slot: "weapon", weaponType: "gun", rarity: "legend", icon: "gun",
    description: "物理攻撃でHPを削った完全成功時、対象に毒4。毎ターン1回。", stats: {"dex": 10, "per": 2}, tags: ["physical", "poison"],
    cards: [{"cardId": "wtGunFanFire", "count": 2}],
    ability: {"name": "疫毒弾", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "plagueGun"}], "do": [{"kind": "applyStatus", "status": "poison", "amount": 4}]}},
  },
  {
    id: "lifespringGun", name: "命泉銃", slot: "weapon", weaponType: "gun", rarity: "legend", icon: "gun",
    description: "物理カードでHPに与えたダメージの15%を回復。毎ターン1回。", stats: {"dex": 10, "vit": 2}, tags: ["physical", "heal"],
    cards: [{"cardId": "wtGunFanFire", "count": 2}],
    ability: {"name": "命泉", "effect": {"when": "afterCard", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "lifespringGun"}], "do": [{"kind": "healPctOfDealt", "pct": 15}]}},
  },
];
