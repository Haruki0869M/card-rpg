// 装飾品1：火力・属性・状態異常。倍率は条件付き、追加の状態異常は毎ターン1回。
import type { ItemDef } from '../../../types';

export const accessoriesFire: ItemDef[] = [
  {"id": "ironMightRing", "name": "剛力の指輪", "slot": "accessory", "rarity": "common", "icon": "ring", "description": "攻撃を支える能力値を合計10高める。", "stats": {"str": 10}, "tags": ["physical"]},
  {"id": "clearMindRing", "name": "明知の指輪", "slot": "accessory", "rarity": "common", "icon": "ring", "description": "攻撃を支える能力値を合計10高める。", "stats": {"int": 10}, "tags": ["magic"]},
  {"id": "steadyHandRing", "name": "精巧の指輪", "slot": "accessory", "rarity": "common", "icon": "ring", "description": "攻撃を支える能力値を合計10高める。", "stats": {"dex": 10}, "tags": ["physical"]},
  {"id": "keenEyeRing", "name": "鋭眼の指輪", "slot": "accessory", "rarity": "common", "icon": "ring", "description": "攻撃を支える能力値を合計10高める。", "stats": {"per": 10}, "tags": ["magic"]},
  {"id": "scorchSignet", "name": "火傷の印章", "slot": "accessory", "rarity": "rare", "icon": "ring", "description": "HPを削った完全成功時、対象に火傷1。毎ターン1回。", "tags": ["burn"], "ability": {"name": "追い討ちの印", "effect": {"when": "perfect", "if": [{"kind": "cardHasDamage"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "scorchSignet"}], "do": [{"kind": "applyStatus", "status": "burn", "amount": 1}]}}},
  {"id": "venomSignet", "name": "毒の印章", "slot": "accessory", "rarity": "rare", "icon": "ring", "description": "HPを削った完全成功時、対象に毒2。毎ターン1回。", "tags": ["poison"], "ability": {"name": "追い討ちの印", "effect": {"when": "perfect", "if": [{"kind": "cardHasDamage"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "venomSignet"}], "do": [{"kind": "applyStatus", "status": "poison", "amount": 2}]}}},
  {"id": "breachSignet", "name": "脆弱の印章", "slot": "accessory", "rarity": "rare", "icon": "ring", "description": "HPを削った完全成功時、対象に脆弱1。毎ターン1回。", "tags": ["vulnerable"], "ability": {"name": "追い討ちの印", "effect": {"when": "perfect", "if": [{"kind": "cardHasDamage"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "breachSignet"}], "do": [{"kind": "applyStatus", "status": "vulnerable", "amount": 1}]}}},
  {"id": "curseSignet", "name": "呪いの印章", "slot": "accessory", "rarity": "epic", "icon": "ring", "description": "HPを削った完全成功時、対象に呪い2。毎ターン1回。", "tags": ["curse"], "ability": {"name": "追い討ちの印", "effect": {"when": "perfect", "if": [{"kind": "cardHasDamage"}, {"kind": "dealtDamage"}, {"kind": "oncePerTurn", "key": "curseSignet"}], "do": [{"kind": "applyStatus", "status": "curse", "amount": 2}]}}},
  {"id": "desperatePierceRing", "name": "窮地の貫通環", "slot": "accessory", "rarity": "legend", "icon": "ring", "description": "HPが半分以下なら、3枠以上の攻撃カードがブロックを無視。", "tags": ["multi"], "ability": {"name": "窮地の貫通", "effect": {"modifier": "ignoreBlock", "if": [{"kind": "cardHasDamage"}, {"kind": "cardSlots", "min": 3}, {"kind": "selfHpAtMost", "pct": 50}]}}},
];
