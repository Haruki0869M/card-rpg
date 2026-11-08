// 凍てつく王国：range。凍結を重ねすぎないよう、行動は順番に繰り返す。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { iceSlime, iceArcher } from './lake';

export const yeti: EnemyDef = {
  id: "yeti",
  name: "雪男",
  icon: "❄",
  maxHp: 52,
  baseLevel: 7,
  size: 1.1,
  exp: 13,
  gold: 9,
  weak: ["fire"],
  resist: ["ice"],
  pattern: "sequence",
  actions: [
    {"id": "fist", "name": "雪男の拳", "effects": [{"kind": "damage", "amount": 12}]},
    {"id": "fur", "name": "厚い毛皮", "effects": [{"kind": "block", "amount": 10}]},
    {"id": "sweep", "name": "大きな腕", "effects": [{"kind": "damage", "amount": 6, "to": "foes"}]},
  ],
};

export const blizzardSnake: EnemyDef = {
  id: "blizzardSnake",
  name: "吹雪の蛇",
  icon: "❄",
  maxHp: 34,
  baseLevel: 7,
  size: 1,
  exp: 13,
  gold: 9,
  weak: ["fire"],
  resist: ["ice", "poison"],
  pattern: "sequence",
  actions: [
    {"id": "bite", "name": "毒の牙", "effects": [{"kind": "damage", "amount": 8}, {"kind": "applyStatus", "status": "poison", "amount": 2}]},
    {"id": "coil", "name": "雪を巻く", "effects": [{"kind": "block", "amount": 7}]},
    {"id": "chill", "name": "吹雪の締めつけ", "effects": [{"kind": "applyStatus", "status": "freeze", "amount": 1}]},
  ],
};

export const iceSwordsman: EnemyDef = {
  id: "iceSwordsman",
  name: "氷の剣士",
  icon: "❄",
  maxHp: 40,
  baseLevel: 7,
  size: 1,
  exp: 13,
  gold: 9,
  weak: ["thunder", "holy"],
  resist: ["ice"],
  pattern: "sequence",
  actions: [
    {"id": "combo", "name": "二の太刀", "effects": [{"kind": "damage", "amount": 5, "hits": 2}]},
    {"id": "stance", "name": "霜刃の構え", "effects": [{"kind": "block", "amount": 9}]},
    {"id": "thrust", "name": "氷刃の突き", "effects": [{"kind": "damage", "amount": 12}]},
  ],
};

export const blizzardBeast: EnemyDef = {
  id: "blizzardBeast",
  name: "吹雪の獣",
  icon: "🛡",
  maxHp: 80,
  baseLevel: 8,
  size: 1.2,
  exp: 30,
  gold: 25,
  weak: ["fire", "poison"],
  resist: ["ice"],
  pattern: "sequence",
  actions: [
    {"id": "sweep", "name": "白い爪の薙ぎ払い", "effects": [{"kind": "damage", "amount": 8, "to": "foes"}]},
    {"id": "bite", "name": "吹雪の牙", "effects": [{"kind": "damage", "amount": 16}]},
    {"id": "roar", "name": "雪嵐の咆哮", "effects": [{"kind": "applyStatus", "status": "weak", "amount": 1, "to": "foes"}]},
    {"id": "fur", "name": "吹雪をまとう", "effects": [{"kind": "block", "amount": 14}]},
  ],
  abilities: [{"name": "吹雪の毛皮", "effect": {"when": "battleStart", "do": [{"kind": "block", "amount": 5}]}}],
};

export const frostDrakeling: EnemyDef = {
  id: "frostDrakeling",
  name: "凍土の竜の幼体",
  icon: "🛡",
  maxHp: 95,
  baseLevel: 9,
  size: 1.2,
  exp: 35,
  gold: 30,
  weak: ["fire", "poison"],
  resist: ["ice"],
  pattern: "sequence",
  actions: [
    {"id": "breath", "name": "凍土のブレス", "effects": [{"kind": "damage", "amount": 8, "element": "ice", "to": "foes"}]},
    {"id": "bite", "name": "幼竜の牙", "effects": [{"kind": "damage", "amount": 14}]},
    {"id": "scales", "name": "氷鱗の守り", "effects": [{"kind": "block", "amount": 16}]},
    {"id": "tail", "name": "尾の二連打", "effects": [{"kind": "damage", "amount": 6, "hits": 2}]},
  ],
  abilities: [{"name": "若い氷鱗", "effect": {"when": "battleStart", "do": [{"kind": "block", "amount": 5}]}}],
};

export const frostGiant: EnemyDef = {
  id: "frostGiant",
  name: "霜の巨人",
  icon: "♛",
  maxHp: 270,
  baseLevel: 9,
  size: 1.6,
  exp: 160,
  gold: 160,
  weak: ["fire", "poison"],
  resist: ["ice"],
  pattern: "sequence",
  actions: [
    {"id": "hammer", "name": "巨人の重打", "effects": [{"kind": "damage", "amount": 22}]},
    {"id": "brace", "name": "鉱石の構え", "effects": [{"kind": "block", "amount": 20}]},
    {"id": "hail", "name": "砕ける氷岩", "effects": [{"kind": "damage", "amount": 8, "element": "ice", "to": "foes"}]},
  ],
  abilities: [{"name": "霜の厚皮", "effect": {"when": "battleStart", "do": [{"kind": "block", "amount": 8}]}}],
  phases: [
    { belowHpPct: 50, name: "怒れる霜の巨人", pattern: 'sequence', actions: [
      {"id": "rage", "name": "怒りの大槌", "effects": [{"kind": "damage", "amount": 28}]},
      {"id": "guard", "name": "怒りの構え", "effects": [{"kind": "block", "amount": 24}]},
      {"id": "quake", "name": "鉱山を揺らす", "effects": [{"kind": "damage", "amount": 12, "to": "foes"}]},
    ] },
  ],
};

export const venomIceSlime: EnemyDef = makeVariant(iceSlime, {"id": "venomIceSlime", "name": "毒氷のスライム", "aura": "venom", "maxHp": 36, "baseLevel": 7, "exp": 13, "gold": 9, "weak": ["fire"], "resist": ["ice"], "actions": [{"id": "ram", "name": "毒氷の体当たり", "effects": [{"kind": "damage", "amount": 9}]}, {"id": "shell", "name": "毒氷の膜", "effects": [{"kind": "block", "amount": 8}]}, {"id": "spit", "name": "毒のしぶき", "effects": [{"kind": "applyStatus", "status": "poison", "amount": 2}]}], "abilities": [{"name": "毒の飛沫", "effect": {"when": "battleStart", "do": [{"kind": "applyStatus", "status": "poison", "amount": 1, "to": "foes"}]}}]});

export const stormIceArcher: EnemyDef = makeVariant(iceArcher, {"id": "stormIceArcher", "name": "雷氷の弓兵", "aura": "storm", "maxHp": 34, "baseLevel": 7, "exp": 13, "gold": 9, "weak": ["fire"], "resist": ["ice", "thunder"], "actions": [{"id": "arrow", "name": "雷氷の矢", "effects": [{"kind": "damage", "amount": 11, "element": "thunder"}]}, {"id": "volley", "name": "散る雷矢", "effects": [{"kind": "damage", "amount": 5, "element": "thunder", "to": "foes"}]}, {"id": "brace", "name": "雷矢の構え", "effects": [{"kind": "block", "amount": 7}]}]});
