// 楽器：各レア度に火力・属性・状態異常・特殊を1本ずつ。既存の攻撃・回復カードを共有する。
import type { ItemDef } from '../../../types';

export const weaponsInstrument: ItemDef[] = [
  // レア
  // レアの攻撃カードがないため弦打ち（コモン）を使い、癒しの曲で支援を残す。
  {
    id: "resonantLute", name: "響きのリュート", slot: "weapon", weaponType: "instrument", rarity: "rare", icon: "instrument",
    description: "澄んだ響きで、調べの力を高める。", stats: {"luk": 5}, tags: ["magic", "support"],
    cards: [{"cardId": "wtInstStrum", "count": 1}, {"cardId": "wtInstHymn", "count": 1}],
  },
  {
    id: "dawnLute", name: "朝光のリュート", slot: "weapon", weaponType: "instrument", rarity: "rare", icon: "instrument",
    description: "魔法でHPを削った完全成功時、ランダムな敵に聖の追撃2。毎ターン1回。", stats: {"luk": 2, "int": 2}, tags: ["magic", "holy"],
    cards: [{"cardId": "wtInstStrum", "count": 1}, {"cardId": "wtInstHymn", "count": 1}],
    ability: {"name": "朝光の調べ", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "dawnLute"}], "do": [{"kind": "damage", "element": "holy", "amount": 2, "to": "randomFoe"}]}},
  },
  {
    id: "sappingLute", name: "力抜きのリュート", slot: "weapon", weaponType: "instrument", rarity: "rare", icon: "instrument",
    description: "魔法でHPを削った完全成功時、対象に脱力1。毎ターン1回。", stats: {"luk": 2, "per": 2}, tags: ["magic", "weak"],
    cards: [{"cardId": "wtInstStrum", "count": 1}, {"cardId": "wtInstHymn", "count": 1}],
    ability: {"name": "力抜きの調べ", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "sappingLute"}], "do": [{"kind": "applyStatus", "status": "weak", "amount": 1}]}},
  },
  {
    id: "steadfastLute", name: "堅心のリュート", slot: "weapon", weaponType: "instrument", rarity: "rare", icon: "instrument",
    description: "コスト1以上のカードの完全成功で、自分にブロック2。毎ターン1回。", stats: {"luk": 2, "vit": 2}, tags: ["support", "block"],
    cards: [{"cardId": "wtInstStrum", "count": 1}, {"cardId": "wtInstHymn", "count": 1}],
    ability: {"name": "堅心の調べ", "effect": {"when": "perfect", "if": [{"kind": "cardCost", "min": 1}, {"kind": "oncePerTurn", "key": "steadfastLute"}], "do": [{"kind": "block", "amount": 2, "to": "self"}]}},
  },
  // エピック
  {
    id: "grandLute", name: "大響のリュート", slot: "weapon", weaponType: "instrument", rarity: "epic", icon: "instrument",
    description: "HP75%以上なら、コスト2以上の魔法ダメージが1.2倍。", stats: {"luk": 8}, tags: ["magic", "heavy"],
    cards: [{"cardId": "wtInstFinale", "count": 1}, {"cardId": "wtInstHymn", "count": 1}],
    ability: {"name": "大響の調べ", "effect": {"modifier": "damageDealt", "multiplier": 1.2, "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "selfHpAtLeast", "pct": 75}, {"kind": "cardCost", "min": 2}]}},
  },
  {
    id: "radiantLute", name: "光輪のリュート", slot: "weapon", weaponType: "instrument", rarity: "epic", icon: "instrument",
    description: "魔法でHPを削った完全成功時、ランダムな敵に聖の追撃3。毎ターン1回。", stats: {"luk": 4, "int": 4}, tags: ["magic", "holy"],
    cards: [{"cardId": "wtInstFinale", "count": 1}, {"cardId": "wtInstHymn", "count": 1}],
    ability: {"name": "光輪の調べ", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "radiantLute"}], "do": [{"kind": "damage", "element": "holy", "amount": 3, "to": "randomFoe"}]}},
  },
  {
    id: "witheringLute", name: "枯葉のリュート", slot: "weapon", weaponType: "instrument", rarity: "epic", icon: "instrument",
    description: "魔法でHPを削った完全成功時、対象に脱力2。毎ターン1回。", stats: {"luk": 4, "per": 4}, tags: ["magic", "weak"],
    cards: [{"cardId": "wtInstFinale", "count": 1}, {"cardId": "wtInstHymn", "count": 1}],
    ability: {"name": "枯葉の調べ", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "witheringLute"}], "do": [{"kind": "applyStatus", "status": "weak", "amount": 2}]}},
  },
  {
    id: "wellspringLute", name: "湧泉のリュート", slot: "weapon", weaponType: "instrument", rarity: "epic", icon: "instrument",
    description: "コスト1以上のカードの完全成功で、マナ1を得る。毎ターン1回。", stats: {"luk": 4, "vit": 4}, tags: ["support", "mana"],
    cards: [{"cardId": "wtInstFinale", "count": 1}, {"cardId": "wtInstHymn", "count": 1}],
    ability: {"name": "湧泉の調べ", "effect": {"when": "perfect", "if": [{"kind": "cardCost", "min": 1}, {"kind": "oncePerTurn", "key": "wellspringLute"}], "do": [{"kind": "gainMana", "amount": 1}]}},
  },
  // レジェンド
  // 既存にレジェンド用カードがないため、エピック以下の武器種カードを共有する。
  {
    id: "solitaryLute", name: "独奏のリュート", slot: "weapon", weaponType: "instrument", rarity: "legend", icon: "instrument",
    description: "HPが半分以上で敵が1体なら、魔法ダメージが1.25倍。", stats: {"luk": 12}, tags: ["magic"],
    cards: [{"cardId": "wtInstFinale", "count": 1}, {"cardId": "wtInstHymn", "count": 1}],
    ability: {"name": "独奏", "effect": {"modifier": "damageDealt", "multiplier": 1.25, "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "selfHpAtLeast", "pct": 50}, {"kind": "foeCount", "max": 1}]}},
  },
  {
    id: "heavenlightLute", name: "天光のリュート", slot: "weapon", weaponType: "instrument", rarity: "legend", icon: "instrument",
    description: "魔法でHPを削った完全成功時、ランダムな敵に聖の追撃4。毎ターン1回。", stats: {"luk": 8, "int": 4}, tags: ["magic", "holy"],
    cards: [{"cardId": "wtInstFinale", "count": 1}, {"cardId": "wtInstHymn", "count": 1}],
    ability: {"name": "天光の調べ", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "heavenlightLute"}], "do": [{"kind": "damage", "element": "holy", "amount": 4, "to": "randomFoe"}]}},
  },
  {
    id: "plagueLute", name: "疫毒のリュート", slot: "weapon", weaponType: "instrument", rarity: "legend", icon: "instrument",
    description: "魔法でHPを削った完全成功時、対象に毒4。毎ターン1回。", stats: {"luk": 10, "per": 2}, tags: ["magic", "poison"],
    cards: [{"cardId": "wtInstFinale", "count": 1}, {"cardId": "wtInstHymn", "count": 1}],
    ability: {"name": "疫毒の調べ", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "plagueLute"}], "do": [{"kind": "applyStatus", "status": "poison", "amount": 4}]}},
  },
  {
    id: "fellowshipLute", name: "絆のリュート", slot: "weapon", weaponType: "instrument", rarity: "legend", icon: "instrument",
    description: "自分以外の味方への支援が成立すると、味方全員にブロック2、自分にフォーカス1。毎ターン1回。", stats: {"luk": 8, "per": 4}, tags: ["support", "block", "focus"],
    cards: [{"cardId": "wtInstFinale", "count": 1}, {"cardId": "wtInstHymn", "count": 1}],
    ability: {"name": "助け合いの調べ", "effect": {"when": "afterCard", "if": [{"kind": "supportedOthers"}, {"kind": "oncePerTurn", "key": "fellowshipLute"}], "do": [{"kind": "block", "amount": 2, "to": "allies"}, {"kind": "gainFocus", "amount": 1}]}},
  },
];
