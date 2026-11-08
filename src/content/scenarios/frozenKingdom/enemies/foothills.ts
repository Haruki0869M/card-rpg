// 凍てつく王国：foothills。凍結を重ねすぎないよう、行動は順番に繰り返す。
import type { EnemyDef } from '../../../../types';

export const snowHare: EnemyDef = {
  id: "snowHare",
  name: "雪ウサギ",
  icon: "❄",
  maxHp: 20,
  baseLevel: 1,
  size: 0.8,
  exp: 4,
  gold: 2,
  weak: ["fire"],
  resist: ["ice"],
  pattern: "sequence",
  actions: [
    {"id": "kick", "name": "雪蹴り", "effects": [{"kind": "damage", "amount": 5}]},
    {"id": "burrow", "name": "雪穴に潜る", "effects": [{"kind": "block", "amount": 4}]},
    {"id": "leap", "name": "跳び蹴り", "effects": [{"kind": "damage", "amount": 3, "hits": 2}]},
  ],
};

export const frostWolf: EnemyDef = {
  id: "frostWolf",
  name: "雪狼",
  icon: "❄",
  maxHp: 22,
  baseLevel: 2,
  size: 0.95,
  exp: 5,
  gold: 3,
  weak: ["fire"],
  resist: ["ice"],
  pattern: "sequence",
  actions: [
    {"id": "bite", "name": "噛みつき", "effects": [{"kind": "damage", "amount": 6}]},
    {"id": "howl", "name": "雪原の遠吠え", "effects": [{"kind": "block", "amount": 5}]},
    {"id": "pounce", "name": "雪上の跳躍", "effects": [{"kind": "damage", "amount": 4, "hits": 2}]},
  ],
};

export const frostSprite: EnemyDef = {
  id: "frostSprite",
  name: "霜の精",
  icon: "❄",
  maxHp: 20,
  baseLevel: 2,
  size: 0.8,
  exp: 5,
  gold: 3,
  weak: ["fire"],
  resist: ["ice"],
  pattern: "sequence",
  actions: [
    {"id": "flake", "name": "霜のつぶて", "effects": [{"kind": "damage", "amount": 5}]},
    {"id": "chill", "name": "足止めの霜", "effects": [{"kind": "applyStatus", "status": "freeze", "amount": 1}]},
    {"id": "veil", "name": "霜の薄衣", "effects": [{"kind": "block", "amount": 4}]},
  ],
};
