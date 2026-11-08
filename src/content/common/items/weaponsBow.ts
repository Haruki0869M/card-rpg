// 弓：既存の鋼を火力型、疾風・天穿つをドロー・追撃の特殊能力型として数える。
import type { ItemDef } from '../../../types';

export const weaponsBow: ItemDef[] = [
  // レア
  {
    id: "emberBow", name: "火種の弓", slot: "weapon", weaponType: "bow", rarity: "rare", icon: "bow",
    description: "物理攻撃でHPを削った完全成功時、対象に火傷1。毎ターン1回。", stats: {"dex": 2, "int": 2}, tags: ["physical", "fire"],
    cards: [{"cardId": "wDoubleShot", "count": 2}],
    ability: {"name": "火種", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "emberBow"}], "do": [{"kind": "applyStatus", "status": "burn", "amount": 1}]}},
  },
  {
    id: "venomtipBow", name: "毒矢の弓", slot: "weapon", weaponType: "bow", rarity: "rare", icon: "bow",
    description: "物理攻撃でHPを削った完全成功時、対象に毒2。毎ターン1回。", stats: {"dex": 2, "per": 2}, tags: ["physical", "poison"],
    cards: [{"cardId": "wDoubleShot", "count": 2}],
    ability: {"name": "毒矢", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "venomtipBow"}], "do": [{"kind": "applyStatus", "status": "poison", "amount": 2}]}},
  },
  {
    id: "balancedBow", name: "均衡の弓", slot: "weapon", weaponType: "bow", rarity: "rare", icon: "bow",
    description: "2枠以上の物理カードの成功率+3%。", stats: {"dex": 2, "agi": 2}, tags: ["physical", "multi"],
    cards: [{"cardId": "wDoubleShot", "count": 2}],
    ability: {"name": "ぶれない弦", "effect": {"modifier": "cardChance", "bonus": 3, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "cardSlots", "min": 2}]}},
  },
  // エピック
  {
    id: "surestrikeBow", name: "剛弦の弓", slot: "weapon", weaponType: "bow", rarity: "epic", icon: "bow",
    description: "HP75%以上なら、物理ダメージが1.2倍。", stats: {"dex": 8}, tags: ["physical"],
    cards: [{"cardId": "wGaleArrow", "count": 2}],
    ability: {"name": "剛弦", "effect": {"modifier": "damageDealt", "multiplier": 1.2, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "selfHpAtLeast", "pct": 75}]}},
  },
  {
    id: "blazingBow", name: "炎舞の弓", slot: "weapon", weaponType: "bow", rarity: "epic", icon: "bow",
    description: "HPが半分以上なら、無属性の物理攻撃が火属性になる。", stats: {"dex": 4, "int": 4}, tags: ["physical", "fire"],
    cards: [{"cardId": "wGaleArrow", "count": 2}],
    ability: {"name": "炎舞", "effect": {"modifier": "convertElement", "into": "fire", "if": [{"kind": "selfHpAtLeast", "pct": 50}]}},
  },
  {
    id: "witheringBow", name: "力削ぎの弓", slot: "weapon", weaponType: "bow", rarity: "epic", icon: "bow",
    description: "物理攻撃でHPを削った完全成功時、対象に脱力1。毎ターン1回。", stats: {"dex": 4, "per": 4}, tags: ["physical", "weak"],
    cards: [{"cardId": "wGaleArrow", "count": 2}],
    ability: {"name": "力削ぎ", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "witheringBow"}], "do": [{"kind": "applyStatus", "status": "weak", "amount": 1}]}},
  },
  // レジェンド
  {
    id: "duelistsBow", name: "一騎の弓", slot: "weapon", weaponType: "bow", rarity: "legend", icon: "bow",
    description: "HP75%以上で敵が1体なら、物理ダメージが1.25倍。", stats: {"dex": 12}, tags: ["physical"],
    cards: [{"cardId": "wSkyPiercer", "count": 2}],
    ability: {"name": "一騎の射", "effect": {"modifier": "damageDealt", "multiplier": 1.25, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "selfHpAtLeast", "pct": 75}, {"kind": "foeCount", "max": 1}]}},
  },
  {
    id: "haloBow", name: "天光の弓", slot: "weapon", weaponType: "bow", rarity: "legend", icon: "bow",
    description: "物理攻撃でHPを削った完全成功時、ランダムな敵に聖の追撃4。毎ターン1回。", stats: {"dex": 8, "int": 4}, tags: ["physical", "holy"],
    cards: [{"cardId": "wSkyPiercer", "count": 2}],
    ability: {"name": "天光の矢", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "haloBow"}], "do": [{"kind": "damage", "element": "holy", "amount": 4, "to": "randomFoe"}]}},
  },
  {
    id: "wintersealBow", name: "冬封じの弓", slot: "weapon", weaponType: "bow", rarity: "legend", icon: "bow",
    description: "物理攻撃でHPを削った完全成功時、対象に凍結1。1戦闘に1回。", stats: {"dex": 10, "per": 2}, tags: ["physical", "freeze"],
    cards: [{"cardId": "wSkyPiercer", "count": 2}],
    ability: {"name": "冬封じの矢", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "perBattle", "key": "wintersealBow", "max": 1}], "do": [{"kind": "applyStatus", "status": "freeze", "amount": 1}]}},
  },
];
