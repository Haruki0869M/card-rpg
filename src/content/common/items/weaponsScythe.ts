// 鎌：各レア度に火力・属性・状態異常・特殊を1本ずつ。物理・魔法の両方に能力が働く。
import type { ItemDef } from '../../../types';

export const weaponsScythe: ItemDef[] = [
  // レア
  {
    id: "temperedScythe", name: "鍛鋼の大鎌", slot: "weapon", weaponType: "scythe", rarity: "rare", icon: "scythe",
    description: "鋭い刃と呪文の刻印で、打撃と魔法を強める。", stats: {"str": 3, "int": 2}, tags: ["physical", "magic"],
    cards: [{"cardId": "wtScytheHarvest", "count": 2}],
  },
  {
    id: "duskScythe", name: "夕闇の大鎌", slot: "weapon", weaponType: "scythe", rarity: "rare", icon: "scythe",
    description: "HPを削った完全成功時、ランダムな敵に闇の追撃2。毎ターン1回。", stats: {"str": 2, "int": 2}, tags: ["dark"],
    cards: [{"cardId": "wtScytheHarvest", "count": 2}],
    ability: {"name": "夕闇", "effect": {"when": "perfect", "if": [{"kind": "cardHasDamage"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "duskScythe"}], "do": [{"kind": "damage", "element": "dark", "amount": 2, "to": "randomFoe"}]}},
  },
  {
    id: "venomfangScythe", name: "毒牙の大鎌", slot: "weapon", weaponType: "scythe", rarity: "rare", icon: "scythe",
    description: "HPを削った完全成功時、対象に毒2。毎ターン1回。", stats: {"str": 2, "dex": 2}, tags: ["poison"],
    cards: [{"cardId": "wtScytheHarvest", "count": 2}],
    ability: {"name": "毒牙", "effect": {"when": "perfect", "if": [{"kind": "cardHasDamage"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "venomfangScythe"}], "do": [{"kind": "applyStatus", "status": "poison", "amount": 2}]}},
  },
  {
    id: "cursewovenScythe", name: "呪編みの大鎌", slot: "weapon", weaponType: "scythe", rarity: "rare", icon: "scythe",
    description: "カードでHPを削ると、敵全員の呪いの合計だけブロック（最大2）。毎ターン1回。", stats: {"str": 2, "vit": 2}, tags: ["curse", "block"],
    cards: [{"cardId": "wtScytheHarvest", "count": 2}],
    ability: {"name": "呪編み", "effect": {"when": "afterCard", "if": [{"kind": "cardHasDamage"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "cursewovenScythe"}], "do": [{"kind": "blockFromStatus", "status": "curse", "of": "foes", "max": 2}]}},
  },
  // エピック
  {
    id: "twinpowerScythe", name: "双力の大鎌", slot: "weapon", weaponType: "scythe", rarity: "epic", icon: "scythe",
    description: "HP75%以上なら、ダメージを与えるカードの威力が1.2倍。", stats: {"str": 4, "int": 4}, tags: ["physical", "magic"],
    cards: [{"cardId": "wtScytheEmbrace", "count": 2}],
    ability: {"name": "双力", "effect": {"modifier": "damageDealt", "multiplier": 1.2, "if": [{"kind": "cardHasDamage"}, {"kind": "selfHpAtLeast", "pct": 75}]}},
  },
  {
    id: "nightfallScythe", name: "宵闇の大鎌", slot: "weapon", weaponType: "scythe", rarity: "epic", icon: "scythe",
    description: "HPを削った完全成功時、ランダムな敵に闇の追撃3。毎ターン1回。", stats: {"str": 4, "int": 4}, tags: ["dark"],
    cards: [{"cardId": "wtScytheEmbrace", "count": 2}],
    ability: {"name": "宵闇", "effect": {"when": "perfect", "if": [{"kind": "cardHasDamage"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "nightfallScythe"}], "do": [{"kind": "damage", "element": "dark", "amount": 3, "to": "randomFoe"}]}},
  },
  {
    id: "mireScythe", name: "毒沼の大鎌", slot: "weapon", weaponType: "scythe", rarity: "epic", icon: "scythe",
    description: "HPを削った完全成功時、対象に毒3。毎ターン1回。", stats: {"str": 4, "dex": 4}, tags: ["poison"],
    cards: [{"cardId": "wtScytheEmbrace", "count": 2}],
    ability: {"name": "毒沼", "effect": {"when": "perfect", "if": [{"kind": "cardHasDamage"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "mireScythe"}], "do": [{"kind": "applyStatus", "status": "poison", "amount": 3}]}},
  },
  {
    id: "soulwellScythe", name: "魂泉の大鎌", slot: "weapon", weaponType: "scythe", rarity: "epic", icon: "scythe",
    description: "HPを削った完全成功時、マナ1を得る。毎ターン1回。", stats: {"str": 4, "int": 4}, tags: ["mana"],
    cards: [{"cardId": "wtScytheEmbrace", "count": 2}],
    ability: {"name": "魂泉", "effect": {"when": "perfect", "if": [{"kind": "cardHasDamage"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "soulwellScythe"}], "do": [{"kind": "gainMana", "amount": 1}]}},
  },
  // レジェンド
  // 既存にレジェンド用カードがないため、エピックの武器種カードを共有する。
  {
    id: "solitaryReaper", name: "孤月の大鎌", slot: "weapon", weaponType: "scythe", rarity: "legend", icon: "scythe",
    description: "敵が1体なら、ダメージを与えるカードの威力が1.25倍。", stats: {"str": 6, "int": 6}, tags: ["physical", "magic"],
    cards: [{"cardId": "wtScytheCondemn", "count": 2}],
    ability: {"name": "孤月", "effect": {"modifier": "damageDealt", "multiplier": 1.25, "if": [{"kind": "cardHasDamage"}, {"kind": "foeCount", "max": 1}]}},
  },
  {
    id: "abyssalScythe", name: "深闇の大鎌", slot: "weapon", weaponType: "scythe", rarity: "legend", icon: "scythe",
    description: "HPを削った完全成功時、ランダムな敵に闇の追撃4。毎ターン1回。", stats: {"str": 6, "int": 6}, tags: ["dark"],
    cards: [{"cardId": "wtScytheCondemn", "count": 2}],
    ability: {"name": "深闇", "effect": {"when": "perfect", "if": [{"kind": "cardHasDamage"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "abyssalScythe"}], "do": [{"kind": "damage", "element": "dark", "amount": 4, "to": "randomFoe"}]}},
  },
  {
    id: "riftscythe", name: "裂け目の大鎌", slot: "weapon", weaponType: "scythe", rarity: "legend", icon: "scythe",
    description: "HPを削った完全成功時、対象に脆弱2。毎ターン1回。", stats: {"str": 10, "per": 2}, tags: ["vulnerable"],
    cards: [{"cardId": "wtScytheCondemn", "count": 2}],
    ability: {"name": "裂け目", "effect": {"when": "perfect", "if": [{"kind": "cardHasDamage"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "riftscythe"}], "do": [{"kind": "applyStatus", "status": "vulnerable", "amount": 2}]}},
  },
  {
    id: "fatefulScythe", name: "運命の大鎌", slot: "weapon", weaponType: "scythe", rarity: "legend", icon: "scythe",
    description: "3枠以上のダメージを与えるカードの成功率+5%。", stats: {"str": 8, "int": 4}, tags: ["multi"],
    cards: [{"cardId": "wtScytheCondemn", "count": 2}],
    ability: {"name": "運命の柄", "effect": {"modifier": "cardChance", "bonus": 5, "if": [{"kind": "cardHasDamage"}, {"kind": "cardSlots", "min": 3}]}},
  },
];
