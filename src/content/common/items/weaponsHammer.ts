// 槌：既存の鋼を火力型、聖騎士・守護神を回復・かばうの特殊能力型として数える。
import type { ItemDef } from '../../../types';

export const weaponsHammer: ItemDef[] = [
  // レア
  {
    id: "emberHammer", name: "火種の槌", slot: "weapon", weaponType: "hammer", rarity: "rare", icon: "hammer",
    description: "物理攻撃でHPを削った完全成功時、対象に火傷1。毎ターン1回。", stats: {"str": 2, "int": 2}, tags: ["physical", "fire"],
    cards: [{"cardId": "wIronHammer", "count": 2}],
    ability: {"name": "火種", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "emberHammer"}], "do": [{"kind": "applyStatus", "status": "burn", "amount": 1}]}},
  },
  {
    id: "notchedHammer", name: "傷刻みの槌", slot: "weapon", weaponType: "hammer", rarity: "rare", icon: "hammer",
    description: "物理攻撃でHPを削った完全成功時、対象に脆弱1。毎ターン1回。", stats: {"str": 2, "per": 2}, tags: ["physical", "vulnerable"],
    cards: [{"cardId": "wIronHammer", "count": 2}],
    ability: {"name": "傷刻み", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "notchedHammer"}], "do": [{"kind": "applyStatus", "status": "vulnerable", "amount": 1}]}},
  },
  {
    id: "balancedHammer", name: "釣合いの槌", slot: "weapon", weaponType: "hammer", rarity: "rare", icon: "hammer",
    description: "2枠以上の物理カードの成功率+3%。", stats: {"str": 2, "dex": 2}, tags: ["physical", "multi"],
    cards: [{"cardId": "wIronHammer", "count": 2}],
    ability: {"name": "釣合いの柄", "effect": {"modifier": "cardChance", "bonus": 3, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "cardSlots", "min": 2}]}},
  },
  // エピック
  {
    id: "mountainHammer", name: "山砕きの槌", slot: "weapon", weaponType: "hammer", rarity: "epic", icon: "hammer",
    description: "HP75%以上なら、コスト2以上の物理ダメージが1.2倍。", stats: {"str": 8}, tags: ["physical", "heavy"],
    cards: [{"cardId": "wHolyHammer", "count": 2}],
    ability: {"name": "山砕き", "effect": {"modifier": "damageDealt", "multiplier": 1.2, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "selfHpAtLeast", "pct": 75}, {"kind": "cardCost", "min": 2}]}},
  },
  {
    id: "furnaceHammer", name: "炉火の槌", slot: "weapon", weaponType: "hammer", rarity: "epic", icon: "hammer",
    description: "物理攻撃でHPを削った完全成功時、ランダムな敵に火の追撃3。毎ターン1回。", stats: {"str": 4, "int": 4}, tags: ["physical", "fire"],
    cards: [{"cardId": "wHolyHammer", "count": 2}],
    ability: {"name": "炉火", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "furnaceHammer"}], "do": [{"kind": "damage", "element": "fire", "amount": 3, "to": "randomFoe"}]}},
  },
  {
    id: "sappingHammer", name: "力抜きの槌", slot: "weapon", weaponType: "hammer", rarity: "epic", icon: "hammer",
    description: "物理攻撃でHPを削った完全成功時、対象に脱力1。毎ターン1回。", stats: {"str": 4, "per": 4}, tags: ["physical", "weak"],
    cards: [{"cardId": "wHolyHammer", "count": 2}],
    ability: {"name": "力抜き", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "sappingHammer"}], "do": [{"kind": "applyStatus", "status": "weak", "amount": 1}]}},
  },
  // レジェンド
  {
    id: "titansOathHammer", name: "巨誓の大槌", slot: "weapon", weaponType: "hammer", rarity: "legend", icon: "hammer",
    description: "HP75%以上なら、コスト2以上の物理ダメージが1.25倍。", stats: {"str": 12}, tags: ["physical", "heavy"],
    cards: [{"cardId": "wEarthGuard", "count": 2}],
    ability: {"name": "巨人の誓い", "effect": {"modifier": "damageDealt", "multiplier": 1.25, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "selfHpAtLeast", "pct": 75}, {"kind": "cardCost", "min": 2}]}},
  },
  {
    id: "sunforgeHammer", name: "日輪の大槌", slot: "weapon", weaponType: "hammer", rarity: "legend", icon: "hammer",
    description: "物理攻撃でHPを削った完全成功時、ランダムな敵に聖の追撃4。毎ターン1回。", stats: {"str": 8, "int": 4}, tags: ["physical", "holy"],
    cards: [{"cardId": "wEarthGuard", "count": 2}],
    ability: {"name": "日輪", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "sunforgeHammer"}], "do": [{"kind": "damage", "element": "holy", "amount": 4, "to": "randomFoe"}]}},
  },
  {
    id: "numbingHammer", name: "痺れの大槌", slot: "weapon", weaponType: "hammer", rarity: "legend", icon: "hammer",
    description: "物理攻撃でHPを削った完全成功時、対象に麻痺1。1戦闘に2回。", stats: {"str": 10, "per": 2}, tags: ["physical", "paralysis"],
    cards: [{"cardId": "wEarthGuard", "count": 2}],
    ability: {"name": "痺れ打ち", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "perBattle", "key": "numbingHammer", "max": 2}], "do": [{"kind": "applyStatus", "status": "paralysis", "amount": 1}]}},
  },
];
