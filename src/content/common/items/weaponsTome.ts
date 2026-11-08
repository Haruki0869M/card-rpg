// 魔導書：レア以上の各段階に火力・属性・状態異常・特殊を1本ずつ。
import type { ItemDef } from '../../../types';

export const weaponsTome: ItemDef[] = [
  // レア
  {
    id: "scholarsTome", name: "賢学の魔導書", slot: "weapon", weaponType: "tome", rarity: "rare", icon: "tome",
    description: "磨いた知識で、魔法の威力を高める。", stats: {"int": 5}, tags: ["magic"],
    cards: [{"cardId": "wtTomeVenom", "count": 2}],
  },
  {
    id: "dawnTome", name: "黎明の魔導書", slot: "weapon", weaponType: "tome", rarity: "rare", icon: "tome",
    description: "魔法でHPを削った完全成功時、ランダムな敵に聖の追撃2。毎ターン1回。", stats: {"int": 2, "per": 2}, tags: ["magic", "holy"],
    cards: [{"cardId": "wtTomeVenom", "count": 2}],
    ability: {"name": "黎明の頁", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "dawnTome"}], "do": [{"kind": "damage", "element": "holy", "amount": 2, "to": "randomFoe"}]}},
  },
  {
    id: "sappingTome", name: "衰弱の魔導書", slot: "weapon", weaponType: "tome", rarity: "rare", icon: "tome",
    description: "魔法でHPを削った完全成功時、対象に脱力1。毎ターン1回。", stats: {"int": 2, "dex": 2}, tags: ["magic", "weak"],
    cards: [{"cardId": "wtTomeVenom", "count": 2}],
    ability: {"name": "衰弱の頁", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "sappingTome"}], "do": [{"kind": "applyStatus", "status": "weak", "amount": 1}]}},
  },
  {
    id: "orderedTome", name: "整然の魔導書", slot: "weapon", weaponType: "tome", rarity: "rare", icon: "tome",
    description: "2枠以上の魔法カードの成功率+3%。", stats: {"int": 2, "luk": 2}, tags: ["magic", "multi"],
    cards: [{"cardId": "wtTomeVenom", "count": 2}],
    ability: {"name": "整然の頁", "effect": {"modifier": "cardChance", "bonus": 3, "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "cardSlots", "min": 2}]}},
  },
  // エピック
  {
    id: "deepthoughtTome", name: "深思の魔導書", slot: "weapon", weaponType: "tome", rarity: "epic", icon: "tome",
    description: "HP75%以上なら、コスト2以上の魔法ダメージが1.2倍。", stats: {"int": 8}, tags: ["magic", "heavy"],
    cards: [{"cardId": "wtTomeForbidden", "count": 2}],
    ability: {"name": "深い思索", "effect": {"modifier": "damageDealt", "multiplier": 1.2, "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "selfHpAtLeast", "pct": 75}, {"kind": "cardCost", "min": 2}]}},
  },
  {
    id: "cinderTome", name: "熾火の魔導書", slot: "weapon", weaponType: "tome", rarity: "epic", icon: "tome",
    description: "魔法でHPを削った完全成功時、ランダムな敵に火の追撃3。毎ターン1回。", stats: {"int": 4, "per": 4}, tags: ["magic", "fire"],
    cards: [{"cardId": "wtTomeForbidden", "count": 2}],
    ability: {"name": "熾火の頁", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "cinderTome"}], "do": [{"kind": "damage", "element": "fire", "amount": 3, "to": "randomFoe"}]}},
  },
  {
    id: "miasmaTome", name: "瘴気の魔導書", slot: "weapon", weaponType: "tome", rarity: "epic", icon: "tome",
    description: "魔法でHPを削った完全成功時、対象に毒3。毎ターン1回。", stats: {"int": 4, "dex": 4}, tags: ["magic", "poison"],
    cards: [{"cardId": "wtTomeForbidden", "count": 2}],
    ability: {"name": "瘴気の頁", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "miasmaTome"}], "do": [{"kind": "applyStatus", "status": "poison", "amount": 3}]}},
  },
  {
    id: "wellspringTome", name: "湧泉の魔導書", slot: "weapon", weaponType: "tome", rarity: "epic", icon: "tome",
    description: "魔法でHPを削った完全成功時、マナ1を得る。毎ターン1回。", stats: {"int": 4, "vit": 4}, tags: ["magic", "mana"],
    cards: [{"cardId": "wtTomeForbidden", "count": 2}],
    ability: {"name": "湧泉の頁", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "wellspringTome"}], "do": [{"kind": "gainMana", "amount": 1}]}},
  },
  // レジェンド
  // 既存にレジェンド用カードがないため、エピックの武器種カードを共有する。
  {
    id: "loneSageTome", name: "独賢の魔導書", slot: "weapon", weaponType: "tome", rarity: "legend", icon: "tome",
    description: "HPが半分以上で敵が1体なら、魔法ダメージが1.25倍。", stats: {"int": 12}, tags: ["magic"],
    cards: [{"cardId": "wtTomeElements", "count": 2}],
    ability: {"name": "独賢の知恵", "effect": {"modifier": "damageDealt", "multiplier": 1.25, "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "selfHpAtLeast", "pct": 50}, {"kind": "foeCount", "max": 1}]}},
  },
  {
    id: "auroraTome", name: "極光の魔導書", slot: "weapon", weaponType: "tome", rarity: "legend", icon: "tome",
    description: "魔法でHPを削った完全成功時、ランダムな敵に聖の追撃4。毎ターン1回。", stats: {"int": 8, "per": 4}, tags: ["magic", "holy"],
    cards: [{"cardId": "wtTomeElements", "count": 2}],
    ability: {"name": "極光の頁", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "auroraTome"}], "do": [{"kind": "damage", "element": "holy", "amount": 4, "to": "randomFoe"}]}},
  },
  {
    id: "malisonTome", name: "禍言の魔導書", slot: "weapon", weaponType: "tome", rarity: "legend", icon: "tome",
    description: "魔法でHPを削った完全成功時、対象に呪い2。毎ターン1回。", stats: {"int": 10, "dex": 2}, tags: ["magic", "curse"],
    cards: [{"cardId": "wtTomeElements", "count": 2}],
    ability: {"name": "禍言の頁", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "malisonTome"}], "do": [{"kind": "applyStatus", "status": "curse", "amount": 2}]}},
  },
  {
    id: "cursewardTome", name: "呪壁の魔導書", slot: "weapon", weaponType: "tome", rarity: "legend", icon: "tome",
    description: "魔法でHPを削ると、敵全員の呪いの合計だけブロック（最大6）。毎ターン1回。", stats: {"int": 10, "vit": 2}, tags: ["magic", "curse", "block"],
    cards: [{"cardId": "wtTomeElements", "count": 2}],
    ability: {"name": "呪いの壁", "effect": {"when": "afterCard", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "cursewardTome"}], "do": [{"kind": "blockFromStatus", "status": "curse", "of": "foes", "max": 6}]}},
  },
];
