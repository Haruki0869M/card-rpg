// 槍：各レア度に火力・属性・状態異常・特殊を1本ずつ。
import type { ItemDef } from '../../../types';

export const weaponsSpear: ItemDef[] = [
  // レア
  {
    id: "temperedSpear", name: "鍛鋼の槍", slot: "weapon", weaponType: "spear", rarity: "rare", icon: "spear",
    description: "よく鍛えた穂先が、突きの威力を高める。", stats: {"str": 5}, tags: ["physical"],
    cards: [{"cardId": "wtSpearHook", "count": 2}],
  },
  {
    id: "dawnSpear", name: "朝光の槍", slot: "weapon", weaponType: "spear", rarity: "rare", icon: "spear",
    description: "物理攻撃でHPを削った完全成功時、ランダムな敵に聖の追撃2。毎ターン1回。", stats: {"str": 2, "int": 2}, tags: ["physical", "holy"],
    cards: [{"cardId": "wtSpearHook", "count": 2}],
    ability: {"name": "朝光", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "dawnSpear"}], "do": [{"kind": "damage", "element": "holy", "amount": 2, "to": "randomFoe"}]}},
  },
  {
    id: "venomtipSpear", name: "毒穂の槍", slot: "weapon", weaponType: "spear", rarity: "rare", icon: "spear",
    description: "物理攻撃でHPを削った完全成功時、対象に毒2。毎ターン1回。", stats: {"str": 2, "dex": 2}, tags: ["physical", "poison"],
    cards: [{"cardId": "wtSpearHook", "count": 2}],
    ability: {"name": "毒穂", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "venomtipSpear"}], "do": [{"kind": "applyStatus", "status": "poison", "amount": 2}]}},
  },
  {
    id: "balancedSpear", name: "均衡の槍", slot: "weapon", weaponType: "spear", rarity: "rare", icon: "spear",
    description: "2枠以上の物理カードの成功率+3%。", stats: {"str": 2, "dex": 2}, tags: ["physical", "multi"],
    cards: [{"cardId": "wtSpearHook", "count": 2}],
    ability: {"name": "ぶれない柄", "effect": {"modifier": "cardChance", "bonus": 3, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "cardSlots", "min": 2}]}},
  },
  // エピック
  {
    id: "duelistsSpear", name: "一騎の槍", slot: "weapon", weaponType: "spear", rarity: "epic", icon: "spear",
    description: "敵が1体でHPが半分以上なら、物理ダメージが1.2倍。", stats: {"str": 8}, tags: ["physical"],
    cards: [{"cardId": "wtSpearPierce", "count": 2}],
    ability: {"name": "一騎", "effect": {"modifier": "damageDealt", "multiplier": 1.2, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "foeCount", "max": 1}, {"kind": "selfHpAtLeast", "pct": 50}]}},
  },
  {
    id: "sunriseSpear", name: "日輪の槍", slot: "weapon", weaponType: "spear", rarity: "epic", icon: "spear",
    description: "HPが半分以上なら、無属性の物理攻撃が聖属性になる。", stats: {"str": 4, "int": 4}, tags: ["physical", "holy"],
    cards: [{"cardId": "wtSpearPierce", "count": 2}],
    ability: {"name": "日輪の穂先", "effect": {"modifier": "convertElement", "into": "holy", "if": [{"kind": "selfHpAtLeast", "pct": 50}]}},
  },
  {
    id: "witheringSpear", name: "枯葉の槍", slot: "weapon", weaponType: "spear", rarity: "epic", icon: "spear",
    description: "物理攻撃でHPを削った完全成功時、対象に脱力1。毎ターン1回。", stats: {"str": 4, "per": 4}, tags: ["physical", "weak"],
    cards: [{"cardId": "wtSpearPierce", "count": 2}],
    ability: {"name": "力削ぎ", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "witheringSpear"}], "do": [{"kind": "applyStatus", "status": "weak", "amount": 1}]}},
  },
  {
    id: "calmSpear", name: "静心の槍", slot: "weapon", weaponType: "spear", rarity: "epic", icon: "spear",
    description: "物理攻撃でHPを削った完全成功時、フォーカス1を得る。毎ターン1回。", stats: {"str": 4, "agi": 4}, tags: ["physical", "focus"],
    cards: [{"cardId": "wtSpearPierce", "count": 2}],
    ability: {"name": "静心", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "calmSpear"}], "do": [{"kind": "gainFocus", "amount": 1}]}},
  },
  // レジェンド
  // 既存にレジェンド用カードがないため、エピックの武器種カードを共有する。
  {
    id: "dragonlordSpear", name: "竜王の槍", slot: "weapon", weaponType: "spear", rarity: "legend", icon: "spear",
    description: "HP75%以上なら、コスト2以上の物理ダメージが1.25倍。", stats: {"str": 12}, tags: ["physical", "heavy"],
    cards: [{"cardId": "wtSpearDragon", "count": 2}],
    ability: {"name": "竜王の構え", "effect": {"modifier": "damageDealt", "multiplier": 1.25, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "selfHpAtLeast", "pct": 75}, {"kind": "cardCost", "min": 2}]}},
  },
  {
    id: "blazingSpear", name: "炎天の槍", slot: "weapon", weaponType: "spear", rarity: "legend", icon: "spear",
    description: "物理攻撃でHPを削った完全成功時、ランダムな敵に火の追撃4。毎ターン1回。", stats: {"str": 8, "int": 4}, tags: ["physical", "fire"],
    cards: [{"cardId": "wtSpearDragon", "count": 2}],
    ability: {"name": "炎天", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "blazingSpear"}], "do": [{"kind": "damage", "element": "fire", "amount": 4, "to": "randomFoe"}]}},
  },
  {
    id: "plagueSpear", name: "疫毒の槍", slot: "weapon", weaponType: "spear", rarity: "legend", icon: "spear",
    description: "物理攻撃でHPを削った完全成功時、対象に毒4。毎ターン1回。", stats: {"str": 10, "dex": 2}, tags: ["physical", "poison"],
    cards: [{"cardId": "wtSpearDragon", "count": 2}],
    ability: {"name": "疫毒", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "plagueSpear"}], "do": [{"kind": "applyStatus", "status": "poison", "amount": 4}]}},
  },
  {
    id: "sentinelSpear", name: "不動の槍", slot: "weapon", weaponType: "spear", rarity: "legend", icon: "spear",
    description: "物理攻撃でHPを削った完全成功時、ブロック4とフォーカス1を得る。毎ターン1回。", stats: {"str": 10, "vit": 2}, tags: ["physical", "block", "focus"],
    cards: [{"cardId": "wtSpearDragon", "count": 2}],
    ability: {"name": "不動", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "sentinelSpear"}], "do": [{"kind": "block", "amount": 4, "to": "self"}, {"kind": "gainFocus", "amount": 1}]}},
  },
];
