// 杖：既存の魔導士・星詠みを火力型、雷霆を追撃の特殊能力型として数える。
import type { ItemDef } from '../../../types';

export const weaponsStaff: ItemDef[] = [
  // レア
  {
    id: "dawnStaff", name: "朝光の杖", slot: "weapon", weaponType: "staff", rarity: "rare", icon: "staff",
    description: "魔法でHPを削った完全成功時、ランダムな敵に聖の追撃2。毎ターン1回。", stats: {"int": 2, "per": 2}, tags: ["magic", "holy"],
    cards: [{"cardId": "wManaTorrent", "count": 2}],
    ability: {"name": "朝光", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "dawnStaff"}], "do": [{"kind": "damage", "element": "holy", "amount": 2, "to": "randomFoe"}]}},
  },
  {
    id: "venomwoodStaff", name: "毒木の杖", slot: "weapon", weaponType: "staff", rarity: "rare", icon: "staff",
    description: "魔法でHPを削った完全成功時、対象に毒2。毎ターン1回。", stats: {"int": 2, "dex": 2}, tags: ["magic", "poison"],
    cards: [{"cardId": "wManaTorrent", "count": 2}],
    ability: {"name": "毒木", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "venomwoodStaff"}], "do": [{"kind": "applyStatus", "status": "poison", "amount": 2}]}},
  },
  {
    id: "balancedStaff", name: "調律の杖", slot: "weapon", weaponType: "staff", rarity: "rare", icon: "staff",
    description: "2枠以上の魔法カードの成功率+3%。", stats: {"int": 2, "luk": 2}, tags: ["magic", "multi"],
    cards: [{"cardId": "wManaTorrent", "count": 2}],
    ability: {"name": "魔力調律", "effect": {"modifier": "cardChance", "bonus": 3, "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "cardSlots", "min": 2}]}},
  },
  // エピック
  {
    id: "solitaryStaff", name: "孤高の杖", slot: "weapon", weaponType: "staff", rarity: "epic", icon: "staff",
    description: "敵が1体なら、コスト2以上の魔法ダメージが1.2倍。", stats: {"int": 8}, tags: ["magic", "heavy"],
    cards: [{"cardId": "wLightning", "count": 2}],
    ability: {"name": "孤高", "effect": {"modifier": "damageDealt", "multiplier": 1.2, "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "foeCount", "max": 1}, {"kind": "cardCost", "min": 2}]}},
  },
  {
    id: "hearthStaff", name: "炉心の杖", slot: "weapon", weaponType: "staff", rarity: "epic", icon: "staff",
    description: "魔法でHPを削った完全成功時、ランダムな敵に火の追撃3。毎ターン1回。", stats: {"int": 4, "per": 4}, tags: ["magic", "fire"],
    cards: [{"cardId": "wLightning", "count": 2}],
    ability: {"name": "炉心", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "hearthStaff"}], "do": [{"kind": "damage", "element": "fire", "amount": 3, "to": "randomFoe"}]}},
  },
  {
    id: "witheringStaff", name: "枯枝の杖", slot: "weapon", weaponType: "staff", rarity: "epic", icon: "staff",
    description: "魔法でHPを削った完全成功時、対象に脱力1。毎ターン1回。", stats: {"int": 4, "dex": 4}, tags: ["magic", "weak"],
    cards: [{"cardId": "wLightning", "count": 2}],
    ability: {"name": "枯枝", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "witheringStaff"}], "do": [{"kind": "applyStatus", "status": "weak", "amount": 1}]}},
  },
  // レジェンド
  {
    id: "haloStaff", name: "天光の杖", slot: "weapon", weaponType: "staff", rarity: "legend", icon: "staff",
    description: "魔法でHPを削った完全成功時、ランダムな敵に聖の追撃4。毎ターン1回。", stats: {"int": 8, "per": 4}, tags: ["magic", "holy"],
    cards: [{"cardId": "wStarfall", "count": 2}],
    ability: {"name": "天光", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "haloStaff"}], "do": [{"kind": "damage", "element": "holy", "amount": 4, "to": "randomFoe"}]}},
  },
  {
    id: "wintersealStaff", name: "冬封じの杖", slot: "weapon", weaponType: "staff", rarity: "legend", icon: "staff",
    description: "魔法でHPを削った完全成功時、対象に凍結1。1戦闘に1回。", stats: {"int": 10, "dex": 2}, tags: ["magic", "freeze"],
    cards: [{"cardId": "wStarfall", "count": 2}],
    ability: {"name": "冬封じ", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "perBattle", "key": "wintersealStaff", "max": 1}], "do": [{"kind": "applyStatus", "status": "freeze", "amount": 1}]}},
  },
  {
    id: "circulationStaff", name: "巡流の杖", slot: "weapon", weaponType: "staff", rarity: "legend", icon: "staff",
    description: "魔法でHPを削った完全成功時、マナ1とブロック2を得る。毎ターン1回。", stats: {"int": 10, "vit": 2}, tags: ["magic", "mana", "block"],
    cards: [{"cardId": "wStarfall", "count": 2}],
    ability: {"name": "巡流", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "circulationStaff"}], "do": [{"kind": "gainMana", "amount": 1}, {"kind": "block", "amount": 2, "to": "self"}]}},
  },
];
