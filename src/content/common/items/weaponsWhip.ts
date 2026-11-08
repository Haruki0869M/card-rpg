// 鞭：各レア度に火力・属性・状態異常・特殊を1本ずつ。火力型の倍率はお供との同行が条件。
import type { ItemDef } from '../../../types';

export const weaponsWhip: ItemDef[] = [
  // レア
  {
    id: "temperedWhip", name: "鋼芯の鞭", slot: "weapon", weaponType: "whip", rarity: "rare", icon: "whip",
    description: "しなやかな鋼の芯が、鞭の威力を高める。", stats: {"dex": 5}, tags: ["physical"],
    cards: [{"cardId": "wtWhipSweep", "count": 2}],
  },
  {
    id: "emberWhip", name: "火種の鞭", slot: "weapon", weaponType: "whip", rarity: "rare", icon: "whip",
    description: "物理攻撃でHPを削った完全成功時、対象に火傷1。毎ターン1回。", stats: {"dex": 2, "int": 2}, tags: ["physical", "fire"],
    cards: [{"cardId": "wtWhipSweep", "count": 2}],
    ability: {"name": "火種", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "emberWhip"}], "do": [{"kind": "applyStatus", "status": "burn", "amount": 1}]}},
  },
  {
    id: "serpentWhip", name: "蛇牙の鞭", slot: "weapon", weaponType: "whip", rarity: "rare", icon: "whip",
    description: "物理攻撃でHPを削った完全成功時、対象に毒2。毎ターン1回。", stats: {"dex": 2, "per": 2}, tags: ["physical", "poison"],
    cards: [{"cardId": "wtWhipSweep", "count": 2}],
    ability: {"name": "蛇牙", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "serpentWhip"}], "do": [{"kind": "applyStatus", "status": "poison", "amount": 2}]}},
  },
  {
    id: "guardWhip", name: "護りの鞭", slot: "weapon", weaponType: "whip", rarity: "rare", icon: "whip",
    description: "物理カードでHPを削ると、自分にブロック2。毎ターン1回。", stats: {"dex": 2, "vit": 2}, tags: ["physical", "block"],
    cards: [{"cardId": "wtWhipSweep", "count": 2}],
    ability: {"name": "護りの輪", "effect": {"when": "afterCard", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "guardWhip"}], "do": [{"kind": "block", "amount": 2, "to": "self"}]}},
  },
  // エピック
  {
    id: "companionWhip", name: "相棒の鞭", slot: "weapon", weaponType: "whip", rarity: "epic", icon: "whip",
    description: "お供がいてHPが半分以上なら、物理ダメージが1.2倍。", stats: {"dex": 8}, tags: ["physical"],
    cards: [{"cardId": "wtWhipTaming", "count": 2}],
    ability: {"name": "相棒との呼吸", "effect": {"modifier": "damageDealt", "multiplier": 1.2, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "hasPet"}, {"kind": "selfHpAtLeast", "pct": 50}]}},
  },
  {
    id: "blazingWhip", name: "炎舞の鞭", slot: "weapon", weaponType: "whip", rarity: "epic", icon: "whip",
    description: "HPが半分以上なら、無属性の物理攻撃が火属性になる。", stats: {"dex": 4, "int": 4}, tags: ["physical", "fire"],
    cards: [{"cardId": "wtWhipTaming", "count": 2}],
    ability: {"name": "炎舞", "effect": {"modifier": "convertElement", "into": "fire", "if": [{"kind": "selfHpAtLeast", "pct": 50}]}},
  },
  {
    id: "rendingWhip", name: "傷裂きの鞭", slot: "weapon", weaponType: "whip", rarity: "epic", icon: "whip",
    description: "物理攻撃でHPを削った完全成功時、対象に脆弱1。毎ターン1回。", stats: {"dex": 4, "per": 4}, tags: ["physical", "vulnerable"],
    cards: [{"cardId": "wtWhipTaming", "count": 2}],
    ability: {"name": "傷裂き", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "rendingWhip"}], "do": [{"kind": "applyStatus", "status": "vulnerable", "amount": 1}]}},
  },
  {
    id: "balancedWhip", name: "調律の鞭", slot: "weapon", weaponType: "whip", rarity: "epic", icon: "whip",
    description: "2枠以上の物理カードの成功率+5%。", stats: {"dex": 4, "agi": 4}, tags: ["physical", "multi"],
    cards: [{"cardId": "wtWhipTaming", "count": 2}],
    ability: {"name": "ぶれない柄", "effect": {"modifier": "cardChance", "bonus": 5, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "cardSlots", "min": 2}]}},
  },
  // レジェンド
  // 既存にレジェンド用カードがないため、エピック以下の武器種カードを共有する。
  {
    id: "beastbondWhip", name: "獣絆の鞭", slot: "weapon", weaponType: "whip", rarity: "legend", icon: "whip",
    description: "お供がいてHPが半分以上なら、物理ダメージが1.25倍。", stats: {"dex": 12}, tags: ["physical"],
    cards: [{"cardId": "wtWhipStorm", "count": 2}],
    ability: {"name": "獣との絆", "effect": {"modifier": "damageDealt", "multiplier": 1.25, "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "hasPet"}, {"kind": "selfHpAtLeast", "pct": 50}]}},
  },
  {
    id: "haloWhip", name: "光輪の鞭", slot: "weapon", weaponType: "whip", rarity: "legend", icon: "whip",
    description: "物理攻撃でHPを削った完全成功時、ランダムな敵に聖の追撃4。毎ターン1回。", stats: {"dex": 8, "int": 4}, tags: ["physical", "holy"],
    cards: [{"cardId": "wtWhipStorm", "count": 2}],
    ability: {"name": "光輪", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "haloWhip"}], "do": [{"kind": "damage", "element": "holy", "amount": 4, "to": "randomFoe"}]}},
  },
  {
    id: "sappingWhip", name: "力抜きの鞭", slot: "weapon", weaponType: "whip", rarity: "legend", icon: "whip",
    description: "物理攻撃でHPを削った完全成功時、対象に脱力2。毎ターン1回。", stats: {"dex": 10, "per": 2}, tags: ["physical", "weak"],
    cards: [{"cardId": "wtWhipStorm", "count": 2}],
    ability: {"name": "力抜き", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "sappingWhip"}], "do": [{"kind": "applyStatus", "status": "weak", "amount": 2}]}},
  },
  {
    id: "steadfastWhip", name: "不動の鞭", slot: "weapon", weaponType: "whip", rarity: "legend", icon: "whip",
    description: "物理攻撃でHPを削った完全成功時、ブロック4とフォーカス1を得る。毎ターン1回。", stats: {"dex": 10, "vit": 2}, tags: ["physical", "block", "focus"],
    cards: [{"cardId": "wtWhipStorm", "count": 2}],
    ability: {"name": "不動の輪", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "physical"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "steadfastWhip"}], "do": [{"kind": "block", "amount": 4, "to": "self"}, {"kind": "gainFocus", "amount": 1}]}},
  },
];
