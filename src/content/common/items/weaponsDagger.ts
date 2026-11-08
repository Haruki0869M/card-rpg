// 短剣：各レア度に火力・属性・状態異常・特殊を1本ずつ。
import type { ItemDef } from '../../../types';

export const weaponsDagger: ItemDef[] = [
  // レア
  {
    id: "temperedDagger", name: "鍛鋼の短剣", slot: "weapon", weaponType: "dagger", rarity: "rare", icon: "dagger",
    description: "鋭い刃で、素早い斬撃の威力を高める。", stats: {"dex": 5}, tags: ["physical"],
    cards: [{"cardId": "wtDaggerVenom", "count": 2}],
  },
  {
    id: "emberDagger", name: "火種の短剣", slot: "weapon", weaponType: "dagger", rarity: "rare", icon: "dagger",
    description: "物理攻撃でHPを削った完全成功時、対象に火傷1。毎ターン1回。", stats: {"dex": 2, "int": 2}, tags: ["physical", "fire"],
    cards: [{"cardId": "wtDaggerVenom", "count": 2}],
    ability: {"name": "火種", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "emberDagger"}], "do": [{"kind": "applyStatus", "status": "burn", "amount": 1}]}},
  },
  {
    id: "notchedDagger", name: "傷刻みの短剣", slot: "weapon", weaponType: "dagger", rarity: "rare", icon: "dagger",
    description: "物理攻撃でHPを削った完全成功時、対象に脆弱1。毎ターン1回。", stats: {"dex": 2, "per": 2}, tags: ["physical", "vulnerable"],
    cards: [{"cardId": "wtDaggerVenom", "count": 2}],
    ability: {"name": "傷刻み", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "notchedDagger"}], "do": [{"kind": "applyStatus", "status": "vulnerable", "amount": 1}]}},
  },
  {
    id: "guardDagger", name: "受け流しの短剣", slot: "weapon", weaponType: "dagger", rarity: "rare", icon: "dagger",
    description: "物理カードでHPを削ると、自分にブロック2。毎ターン1回。", stats: {"dex": 2, "agi": 2}, tags: ["physical", "block"],
    cards: [{"cardId": "wtDaggerVenom", "count": 2}],
    ability: {"name": "受け流し", "effect": {"when": "afterCard", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "guardDagger"}], "do": [{"kind": "block", "amount": 2, "to": "self"}]}},
  },
  // エピック
  {
    id: "surestrikeDagger", name: "鋭牙の短剣", slot: "weapon", weaponType: "dagger", rarity: "epic", icon: "dagger",
    description: "HP75%以上なら、2枠以上の物理カードのダメージが1.2倍。", stats: {"dex": 8}, tags: ["physical", "multi"],
    cards: [{"cardId": "wtDaggerAssassinate", "count": 2}],
    ability: {"name": "鋭牙", "effect": {"modifier": "damageDealt", "multiplier": 1.2, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "selfHpAtLeast", "pct": 75}, {"kind": "cardSlots", "min": 2}]}},
  },
  {
    id: "blazingDagger", name: "炎舞の短剣", slot: "weapon", weaponType: "dagger", rarity: "epic", icon: "dagger",
    description: "HPが半分以上なら、無属性の物理攻撃が火属性になる。", stats: {"dex": 4, "int": 4}, tags: ["physical", "fire"],
    cards: [{"cardId": "wtDaggerAssassinate", "count": 2}],
    ability: {"name": "炎舞", "effect": {"modifier": "convertElement", "into": "fire", "if": [{"kind": "selfHpAtLeast", "pct": 50}]}},
  },
  {
    id: "sappingDagger", name: "力抜きの短剣", slot: "weapon", weaponType: "dagger", rarity: "epic", icon: "dagger",
    description: "物理攻撃でHPを削った完全成功時、対象に脱力1。毎ターン1回。", stats: {"dex": 4, "per": 4}, tags: ["physical", "weak"],
    cards: [{"cardId": "wtDaggerAssassinate", "count": 2}],
    ability: {"name": "力抜き", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "sappingDagger"}], "do": [{"kind": "applyStatus", "status": "weak", "amount": 1}]}},
  },
  {
    id: "calmDagger", name: "静心の短剣", slot: "weapon", weaponType: "dagger", rarity: "epic", icon: "dagger",
    description: "物理攻撃でHPを削った完全成功時、フォーカス1を得る。毎ターン1回。", stats: {"dex": 4, "agi": 4}, tags: ["physical", "focus"],
    cards: [{"cardId": "wtDaggerAssassinate", "count": 2}],
    ability: {"name": "静心", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "calmDagger"}], "do": [{"kind": "gainFocus", "amount": 1}]}},
  },
  // レジェンド
  // 既存にレジェンド用カードがないため、エピックの武器種カードを共有する。
  {
    id: "duelistsDagger", name: "一騎の短剣", slot: "weapon", weaponType: "dagger", rarity: "legend", icon: "dagger",
    description: "敵が1体でHPが半分以上なら、物理ダメージが1.25倍。", stats: {"dex": 12}, tags: ["physical"],
    cards: [{"cardId": "wtDaggerMirage", "count": 2}],
    ability: {"name": "一騎の刃", "effect": {"modifier": "damageDealt", "multiplier": 1.25, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "foeCount", "max": 1}, {"kind": "selfHpAtLeast", "pct": 50}]}},
  },
  {
    id: "haloDagger", name: "光輪の短剣", slot: "weapon", weaponType: "dagger", rarity: "legend", icon: "dagger",
    description: "物理攻撃でHPを削った完全成功時、ランダムな敵に聖の追撃4。毎ターン1回。", stats: {"dex": 8, "int": 4}, tags: ["physical", "holy"],
    cards: [{"cardId": "wtDaggerMirage", "count": 2}],
    ability: {"name": "光輪", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "haloDagger"}], "do": [{"kind": "damage", "element": "holy", "amount": 4, "to": "randomFoe"}]}},
  },
  {
    id: "plagueDagger", name: "疫毒の短剣", slot: "weapon", weaponType: "dagger", rarity: "legend", icon: "dagger",
    description: "物理攻撃でHPを削った完全成功時、対象に毒4。毎ターン1回。", stats: {"dex": 10, "per": 2}, tags: ["physical", "poison"],
    cards: [{"cardId": "wtDaggerMirage", "count": 2}],
    ability: {"name": "疫毒", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "plagueDagger"}], "do": [{"kind": "applyStatus", "status": "poison", "amount": 4}]}},
  },
  {
    id: "lifespringDagger", name: "命泉の短剣", slot: "weapon", weaponType: "dagger", rarity: "legend", icon: "dagger",
    description: "物理カードでHPに与えたダメージの15%を回復。毎ターン1回。", stats: {"dex": 10, "vit": 2}, tags: ["physical", "heal"],
    cards: [{"cardId": "wtDaggerMirage", "count": 2}],
    ability: {"name": "命泉", "effect": {"when": "afterCard", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "lifespringDagger"}], "do": [{"kind": "healPctOfDealt", "pct": 15}]}},
  },
];
