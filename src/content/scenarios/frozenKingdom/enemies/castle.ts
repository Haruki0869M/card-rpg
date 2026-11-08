// 凍てつく王国：castle。凍結を重ねすぎないよう、行動は順番に繰り返す。
import type { EnemyDef } from '../../../../types';

export const frostGuardian: EnemyDef = {
  id: "frostGuardian",
  name: "霜の守護者",
  icon: "🛡",
  maxHp: 90,
  baseLevel: 9,
  size: 1.2,
  exp: 35,
  gold: 30,
  weak: ["dark", "thunder"],
  resist: ["ice", "holy"],
  pattern: "sequence",
  actions: [
    {"id": "guard", "name": "城門の氷壁", "effects": [{"kind": "block", "amount": 22}]},
    {"id": "slam", "name": "守護の拳", "effects": [{"kind": "damage", "amount": 16}]},
    {"id": "sweep", "name": "城門の薙ぎ払い", "effects": [{"kind": "damage", "amount": 8, "to": "foes"}]},
    {"id": "brace", "name": "氷壁の再生", "effects": [{"kind": "block", "amount": 14}, {"kind": "damage", "amount": 6}]},
  ],
  abilities: [{"name": "城門の守り", "effect": {"when": "battleStart", "do": [{"kind": "block", "amount": 10}]}}],
};

export const whiteQueen: EnemyDef = {
  id: "whiteQueen",
  name: "白の女王",
  icon: "♛",
  maxHp: 400,
  baseLevel: 11,
  size: 1.6,
  exp: 300,
  gold: 300,
  weak: ["fire"],
  resist: ["ice", "holy"],
  pattern: "sequence",
  actions: [
    {"id": "lullaby", "name": "姫の子守歌", "effects": [{"kind": "applyStatus", "status": "weak", "amount": 1}, {"kind": "block", "amount": 8}]},
    {"id": "promise", "name": "凍った約束", "effects": [{"kind": "damage", "amount": 22, "element": "ice"}]},
    {"id": "throne", "name": "氷の玉座", "effects": [{"kind": "block", "amount": 22}, {"kind": "damage", "amount": 6}]},
  ],
  abilities: [{"name": "百年の氷衣", "effect": {"when": "battleStart", "do": [{"kind": "block", "amount": 8}]}}],
  phases: [
    { belowHpPct: 60, name: "帰らぬ春を待つ姫", pattern: 'sequence', actions: [
      {"id": "spring", "name": "帰らぬ春", "effects": [{"kind": "damage", "amount": 11, "element": "ice", "to": "foes"}]},
      {"id": "tears", "name": "王女の涙", "effects": [{"kind": "damage", "amount": 20, "element": "holy"}]},
      {"id": "wall", "name": "拒絶の氷壁", "effects": [{"kind": "block", "amount": 24}]},
      {"id": "memory", "name": "思い出の霜", "effects": [{"kind": "applyStatus", "status": "freeze", "amount": 1}, {"kind": "damage", "amount": 6}]},
    ] },
    { belowHpPct: 30, name: "永遠の冬に呑まれた女王", pattern: 'sequence', actions: [
      {"id": "winter", "name": "永遠の冬", "effects": [{"kind": "damage", "amount": 16, "element": "ice", "to": "foes"}]},
      {"id": "prayer", "name": "砕けた祈り", "effects": [{"kind": "damage", "amount": 30, "element": "holy"}]},
      {"id": "solitude", "name": "百年の孤独", "effects": [{"kind": "block", "amount": 26}, {"kind": "damage", "amount": 8, "to": "foes"}]},
    ] },
  ],
};
