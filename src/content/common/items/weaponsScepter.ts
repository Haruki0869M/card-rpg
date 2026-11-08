// 錫杖：各レア度に火力・属性・状態異常・特殊を1本ずつ。攻撃と支援の既存カードを共有する。
import type { ItemDef } from '../../../types';

export const weaponsScepter: ItemDef[] = [
  // レア
  {
    id: "scholarsScepter", name: "賢学の錫杖", slot: "weapon", weaponType: "scepter", rarity: "rare", icon: "scepter",
    description: "磨いた知識で、聖なる魔法の威力を高める。", stats: {"int": 5}, tags: ["magic", "holy"],
    cards: [{"cardId": "wtScepterHalo", "count": 1}, {"cardId": "wtScepterBlessing", "count": 1}],
  },
  {
    id: "dawnScepter", name: "朝光の錫杖", slot: "weapon", weaponType: "scepter", rarity: "rare", icon: "scepter",
    description: "魔法でHPを削った完全成功時、ランダムな敵に聖の追撃2。毎ターン1回。", stats: {"int": 2, "per": 2}, tags: ["magic", "holy"],
    cards: [{"cardId": "wtScepterHalo", "count": 1}, {"cardId": "wtScepterBlessing", "count": 1}],
    ability: {"name": "朝光", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "dawnScepter"}], "do": [{"kind": "damage", "element": "holy", "amount": 2, "to": "randomFoe"}]}},
  },
  {
    id: "sappingScepter", name: "力抜きの錫杖", slot: "weapon", weaponType: "scepter", rarity: "rare", icon: "scepter",
    description: "魔法でHPを削った完全成功時、対象に脱力1。毎ターン1回。", stats: {"int": 2, "dex": 2}, tags: ["magic", "weak"],
    cards: [{"cardId": "wtScepterHalo", "count": 1}, {"cardId": "wtScepterBlessing", "count": 1}],
    ability: {"name": "力抜き", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "sappingScepter"}], "do": [{"kind": "applyStatus", "status": "weak", "amount": 1}]}},
  },
  {
    id: "steadfastScepter", name: "堅心の錫杖", slot: "weapon", weaponType: "scepter", rarity: "rare", icon: "scepter",
    description: "コスト1以上のカードの完全成功で、自分にブロック2。毎ターン1回。", stats: {"int": 2, "vit": 2}, tags: ["support", "block"],
    cards: [{"cardId": "wtScepterHalo", "count": 1}, {"cardId": "wtScepterBlessing", "count": 1}],
    ability: {"name": "堅心", "effect": {"when": "perfect", "if": [{"kind": "cardCost", "min": 1}, {"kind": "oncePerTurn", "key": "steadfastScepter"}], "do": [{"kind": "block", "amount": 2, "to": "self"}]}},
  },
  // エピック
  {
    id: "highsunScepter", name: "高日の錫杖", slot: "weapon", weaponType: "scepter", rarity: "epic", icon: "scepter",
    description: "HP75%以上なら、コスト2以上の魔法ダメージが1.2倍。", stats: {"int": 8}, tags: ["magic", "heavy"],
    cards: [{"cardId": "wtScepterJudgment", "count": 1}, {"cardId": "wtScepterMiracle", "count": 1}],
    ability: {"name": "高日の祈り", "effect": {"modifier": "damageDealt", "multiplier": 1.2, "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "selfHpAtLeast", "pct": 75}, {"kind": "cardCost", "min": 2}]}},
  },
  {
    id: "radiantScepter", name: "光輪の錫杖", slot: "weapon", weaponType: "scepter", rarity: "epic", icon: "scepter",
    description: "魔法でHPを削った完全成功時、ランダムな敵に聖の追撃3。毎ターン1回。", stats: {"int": 4, "per": 4}, tags: ["magic", "holy"],
    cards: [{"cardId": "wtScepterJudgment", "count": 1}, {"cardId": "wtScepterMiracle", "count": 1}],
    ability: {"name": "光輪", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "radiantScepter"}], "do": [{"kind": "damage", "element": "holy", "amount": 3, "to": "randomFoe"}]}},
  },
  {
    id: "witheringScepter", name: "枯枝の錫杖", slot: "weapon", weaponType: "scepter", rarity: "epic", icon: "scepter",
    description: "魔法でHPを削った完全成功時、対象に脱力2。毎ターン1回。", stats: {"int": 4, "dex": 4}, tags: ["magic", "weak"],
    cards: [{"cardId": "wtScepterJudgment", "count": 1}, {"cardId": "wtScepterMiracle", "count": 1}],
    ability: {"name": "枯枝", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "witheringScepter"}], "do": [{"kind": "applyStatus", "status": "weak", "amount": 2}]}},
  },
  {
    id: "wellspringScepter", name: "湧泉の錫杖", slot: "weapon", weaponType: "scepter", rarity: "epic", icon: "scepter",
    description: "コスト1以上のカードの完全成功で、マナ1を得る。毎ターン1回。", stats: {"int": 4, "vit": 4}, tags: ["support", "mana"],
    cards: [{"cardId": "wtScepterJudgment", "count": 1}, {"cardId": "wtScepterMiracle", "count": 1}],
    ability: {"name": "湧泉", "effect": {"when": "perfect", "if": [{"kind": "cardCost", "min": 1}, {"kind": "oncePerTurn", "key": "wellspringScepter"}], "do": [{"kind": "gainMana", "amount": 1}]}},
  },
  // レジェンド
  // 既存にレジェンド用カードがないため、エピックの武器種カードを共有する。
  {
    id: "judgesScepter", name: "裁きの錫杖", slot: "weapon", weaponType: "scepter", rarity: "legend", icon: "scepter",
    description: "HP75%以上で敵が1体なら、魔法ダメージが1.25倍。", stats: {"int": 12}, tags: ["magic"],
    cards: [{"cardId": "wtScepterJudgment", "count": 1}, {"cardId": "wtScepterMiracle", "count": 1}],
    ability: {"name": "裁きの祈り", "effect": {"modifier": "damageDealt", "multiplier": 1.25, "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "selfHpAtLeast", "pct": 75}, {"kind": "foeCount", "max": 1}]}},
  },
  {
    id: "heavenlightScepter", name: "天光の錫杖", slot: "weapon", weaponType: "scepter", rarity: "legend", icon: "scepter",
    description: "魔法でHPを削った完全成功時、ランダムな敵に聖の追撃4。毎ターン1回。", stats: {"int": 8, "per": 4}, tags: ["magic", "holy"],
    cards: [{"cardId": "wtScepterJudgment", "count": 1}, {"cardId": "wtScepterMiracle", "count": 1}],
    ability: {"name": "天光", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "heavenlightScepter"}], "do": [{"kind": "damage", "element": "holy", "amount": 4, "to": "randomFoe"}]}},
  },
  {
    id: "wintersealScepter", name: "冬封じの錫杖", slot: "weapon", weaponType: "scepter", rarity: "legend", icon: "scepter",
    description: "魔法でHPを削った完全成功時、対象に凍結1。1戦闘に1回。", stats: {"int": 10, "dex": 2}, tags: ["magic", "freeze"],
    cards: [{"cardId": "wtScepterJudgment", "count": 1}, {"cardId": "wtScepterMiracle", "count": 1}],
    ability: {"name": "冬封じ", "effect": {"when": "perfect", "if": [{"kind": "cardCategory", "category": "magic"}, {"kind": "dealtDamage"}, {"kind": "perBattle", "key": "wintersealScepter", "max": 1}], "do": [{"kind": "applyStatus", "status": "freeze", "amount": 1}]}},
  },
  {
    id: "fellowshipScepter", name: "絆の錫杖", slot: "weapon", weaponType: "scepter", rarity: "legend", icon: "scepter",
    description: "自分以外の味方への支援が成立すると、自分にマナ1とフォーカス1。毎ターン1回。", stats: {"int": 8, "per": 4}, tags: ["support", "heal", "mana", "focus"],
    cards: [{"cardId": "wtScepterJudgment", "count": 1}, {"cardId": "wtScepterMiracle", "count": 1}],
    ability: {"name": "助け合いの祈り", "effect": {"when": "afterCard", "if": [{"kind": "supportedOthers"}, {"kind": "oncePerTurn", "key": "fellowshipScepter"}], "do": [{"kind": "gainMana", "amount": 1}, {"kind": "gainFocus", "amount": 1}]}},
  },
];
