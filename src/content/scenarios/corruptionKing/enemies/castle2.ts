// T7：既存の敵を変えずに、同じ地域の組み合わせを増やす。
import type { EnemyDef } from '../../../../types';

export const chainWraith: EnemyDef = {
  id: "chainWraith",
  name: "鎖の亡霊",
  icon: "◆",
  maxHp: 42,
  baseLevel: 9,
  size: 1,
  exp: 24,
  gold: 18,
  weak: ["holy"],
  resist: ["dark", "poison"],
  pattern: "sequence",
  actions: [
    {"id": "chain", "name": "闇の鎖", "effects": [{"kind": "damage", "amount": 12, "element": "dark"}]},
    {"id": "curse", "name": "囚われた呪い", "effects": [{"kind": "applyStatus", "status": "curse", "amount": 2}]},
    {"id": "veil", "name": "鎖の幕", "effects": [{"kind": "block", "amount": 10}]},
  ],
};

export const siegeImp: EnemyDef = {
  id: "siegeImp",
  name: "砦の小悪魔",
  icon: "◆",
  maxHp: 40,
  baseLevel: 9,
  size: 0.9,
  exp: 23,
  gold: 17,
  weak: ["holy", "ice"],
  resist: ["fire"],
  pattern: "sequence",
  actions: [
    {"id": "stone", "name": "砦の投石", "effects": [{"kind": "damage", "amount": 12}]},
    {"id": "scatter", "name": "散る火の粉", "effects": [{"kind": "damage", "amount": 5, "to": "foes"}]},
    {"id": "guard", "name": "瓦礫の構え", "effects": [{"kind": "block", "amount": 8}]},
  ],
};

export const cursedHound: EnemyDef = {
  id: "cursedHound",
  name: "呪紋の魔犬",
  icon: "◆",
  maxHp: 44,
  baseLevel: 9,
  size: 1,
  exp: 24,
  gold: 18,
  weak: ["holy", "thunder"],
  resist: ["dark"],
  pattern: "sequence",
  actions: [
    {"id": "bite", "name": "呪紋の牙", "effects": [{"kind": "damage", "amount": 12}]},
    {"id": "flurry", "name": "二連の爪", "effects": [{"kind": "damage", "amount": 5, "hits": 2}]},
    {"id": "brace", "name": "呪紋の構え", "effects": [{"kind": "block", "amount": 10}]},
  ],
};
