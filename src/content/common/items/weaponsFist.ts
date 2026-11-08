// 拳：レア以上の各段階に火力・属性・状態異常・特殊を1本ずつ。
import type { ItemDef } from '../../../types';

export const weaponsFist: ItemDef[] = [
  // レア
  {
    id: "ironPalmWraps", name: "鉄掌の手甲", slot: "weapon", weaponType: "fist", rarity: "rare", icon: "fist",
    description: "鍛えた手甲が、体力を生かした打撃を強める。", stats: {"vit": 5}, tags: ["physical"],
    cards: [{"cardId": "wtFistPalm", "count": 2}],
  },
  {
    id: "emberWraps", name: "火花の手甲", slot: "weapon", weaponType: "fist", rarity: "rare", icon: "fist",
    description: "物理攻撃でHPを削った完全成功時、ランダムな敵に火の追撃2。毎ターン1回。", stats: {"vit": 2, "int": 2}, tags: ["physical", "fire"],
    cards: [{"cardId": "wtFistPalm", "count": 2}],
    ability: {"name": "火花", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "emberWraps"}], "do": [{"kind": "damage", "element": "fire", "amount": 2, "to": "randomFoe"}]}},
  },
  {
    id: "serpentWraps", name: "蛇牙の手甲", slot: "weapon", weaponType: "fist", rarity: "rare", icon: "fist",
    description: "物理攻撃でHPを削った完全成功時、対象に毒2。毎ターン1回。", stats: {"vit": 2, "dex": 2}, tags: ["physical", "poison"],
    cards: [{"cardId": "wtFistPalm", "count": 2}],
    ability: {"name": "蛇牙", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "serpentWraps"}], "do": [{"kind": "applyStatus", "status": "poison", "amount": 2}]}},
  },
  {
    id: "steadyWraps", name: "堅実の手甲", slot: "weapon", weaponType: "fist", rarity: "rare", icon: "fist",
    description: "物理カードでHPを削ると、自分にブロック2。毎ターン1回。", stats: {"vit": 2, "agi": 2}, tags: ["physical", "block"],
    cards: [{"cardId": "wtFistPalm", "count": 2}],
    ability: {"name": "足固め", "effect": {"when": "afterCard", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "steadyWraps"}], "do": [{"kind": "block", "amount": 2, "to": "self"}]}},
  },
  // エピック
  {
    id: "galeWraps", name: "疾走の手甲", slot: "weapon", weaponType: "fist", rarity: "epic", icon: "fist",
    description: "HP75%以上なら、2枠以上の物理カードのダメージが1.2倍。", stats: {"agi": 8}, tags: ["physical", "multi"],
    cards: [{"cardId": "wtFistThousand", "count": 2}],
    ability: {"name": "疾走", "effect": {"modifier": "damageDealt", "multiplier": 1.2, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "selfHpAtLeast", "pct": 75}, {"kind": "cardSlots", "min": 2}]}},
  },
  {
    id: "blazingWraps", name: "炎舞の手甲", slot: "weapon", weaponType: "fist", rarity: "epic", icon: "fist",
    description: "HPが半分以上なら、無属性の物理攻撃が火属性になる。", stats: {"agi": 4, "int": 4}, tags: ["physical", "fire"],
    cards: [{"cardId": "wtFistThousand", "count": 2}],
    ability: {"name": "炎舞", "effect": {"modifier": "convertElement", "into": "fire", "if": [{"kind": "selfHpAtLeast", "pct": 50}]}},
  },
  {
    id: "sunderingWraps", name: "崩拳の手甲", slot: "weapon", weaponType: "fist", rarity: "epic", icon: "fist",
    description: "物理攻撃でHPを削った完全成功時、対象に脆弱1。毎ターン1回。", stats: {"agi": 4, "per": 4}, tags: ["physical", "vulnerable"],
    cards: [{"cardId": "wtFistThousand", "count": 2}],
    ability: {"name": "崩拳", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "sunderingWraps"}], "do": [{"kind": "applyStatus", "status": "vulnerable", "amount": 1}]}},
  },
  {
    id: "stillwaterWraps", name: "静水の手甲", slot: "weapon", weaponType: "fist", rarity: "epic", icon: "fist",
    description: "2枠以上の物理カードの成功率+5%。", stats: {"agi": 4, "vit": 4}, tags: ["physical", "multi"],
    cards: [{"cardId": "wtFistThousand", "count": 2}],
    ability: {"name": "静水", "effect": {"modifier": "cardChance", "bonus": 5, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "cardSlots", "min": 2}]}},
  },
  // レジェンド
  // 既存にレジェンド用カードがないため、エピックの武器種カードを共有する。
  {
    id: "mountainWraps", name: "山砕きの手甲", slot: "weapon", weaponType: "fist", rarity: "legend", icon: "fist",
    description: "HP75%以上なら、コスト2以上の物理ダメージが1.25倍。", stats: {"vit": 12}, tags: ["physical", "heavy"],
    cards: [{"cardId": "wtFistKiBlast", "count": 2}],
    ability: {"name": "山砕き", "effect": {"modifier": "damageDealt", "multiplier": 1.25, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "selfHpAtLeast", "pct": 75}, {"kind": "cardCost", "min": 2}]}},
  },
  {
    id: "radiantWraps", name: "光輪の手甲", slot: "weapon", weaponType: "fist", rarity: "legend", icon: "fist",
    description: "物理攻撃でHPを削った完全成功時、ランダムな敵に聖の追撃4。毎ターン1回。", stats: {"vit": 8, "int": 4}, tags: ["physical", "holy"],
    cards: [{"cardId": "wtFistKiBlast", "count": 2}],
    ability: {"name": "光輪", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "radiantWraps"}], "do": [{"kind": "damage", "element": "holy", "amount": 4, "to": "randomFoe"}]}},
  },
  {
    id: "wintersealWraps", name: "氷封の手甲", slot: "weapon", weaponType: "fist", rarity: "legend", icon: "fist",
    description: "物理攻撃でHPを削った完全成功時、対象に凍結1。1戦闘に1回。", stats: {"vit": 10, "per": 2}, tags: ["physical", "freeze"],
    cards: [{"cardId": "wtFistKiBlast", "count": 2}],
    ability: {"name": "氷封", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "perBattle", "key": "wintersealWraps", "max": 1}], "do": [{"kind": "applyStatus", "status": "freeze", "amount": 1}]}},
  },
  {
    id: "lifespringWraps", name: "命泉の手甲", slot: "weapon", weaponType: "fist", rarity: "legend", icon: "fist",
    description: "物理カードでHPに与えたダメージの15%を回復。毎ターン1回。", stats: {"vit": 10, "agi": 2}, tags: ["physical", "heal"],
    cards: [{"cardId": "wtFistKiBlast", "count": 2}],
    ability: {"name": "命泉", "effect": {"when": "afterCard", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "lifespringWraps"}], "do": [{"kind": "healPctOfDealt", "pct": 15}]}},
  },
];
