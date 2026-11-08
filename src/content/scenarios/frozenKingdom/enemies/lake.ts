// 凍てつく王国：lake。凍結を重ねすぎないよう、行動は順番に繰り返す。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { frozenSoldier, snowWitch } from './forest';

export const iceSlime: EnemyDef = {
  id: "iceSlime",
  name: "氷結のスライム",
  icon: "❄",
  maxHp: 28,
  baseLevel: 5,
  size: 0.9,
  exp: 10,
  gold: 6,
  weak: ["fire"],
  resist: ["ice", "poison"],
  pattern: "sequence",
  actions: [
    {"id": "ram", "name": "氷塊の体当たり", "effects": [{"kind": "damage", "amount": 8}]},
    {"id": "chill", "name": "まとわりつく霜", "effects": [{"kind": "applyStatus", "status": "freeze", "amount": 1}]},
    {"id": "shell", "name": "氷の膜", "effects": [{"kind": "block", "amount": 8}]},
  ],
};

export const frozenGhoul: EnemyDef = {
  id: "frozenGhoul",
  name: "凍える亡者",
  icon: "❄",
  maxHp: 30,
  baseLevel: 5,
  size: 1,
  exp: 10,
  gold: 6,
  weak: ["fire", "holy"],
  resist: ["ice", "dark"],
  pattern: "sequence",
  actions: [
    {"id": "claw", "name": "凍えた爪", "effects": [{"kind": "damage", "amount": 8}]},
    {"id": "curse", "name": "凍土の呪い", "effects": [{"kind": "applyStatus", "status": "curse", "amount": 2}]},
    {"id": "grasp", "name": "亡者の手", "effects": [{"kind": "damage", "amount": 5}, {"kind": "applyStatus", "status": "weak", "amount": 1}]},
  ],
};

export const iceArcher: EnemyDef = {
  id: "iceArcher",
  name: "極寒の弓兵",
  icon: "❄",
  maxHp: 28,
  baseLevel: 5,
  size: 1,
  exp: 10,
  gold: 6,
  weak: ["thunder"],
  resist: ["ice"],
  pattern: "sequence",
  actions: [
    {"id": "arrow", "name": "凍った矢", "effects": [{"kind": "damage", "amount": 9}]},
    {"id": "volley", "name": "散る矢", "effects": [{"kind": "damage", "amount": 4, "to": "foes"}]},
    {"id": "brace", "name": "射撃の構え", "effects": [{"kind": "block", "amount": 6}]},
  ],
};

export const frostMage: EnemyDef = {
  id: "frostMage",
  name: "霜の魔法使い",
  icon: "❄",
  maxHp: 26,
  baseLevel: 5,
  size: 1,
  exp: 10,
  gold: 6,
  weak: ["fire", "dark"],
  resist: ["ice"],
  pattern: "sequence",
  actions: [
    {"id": "lance", "name": "霜の槍", "effects": [{"kind": "damage", "amount": 12, "element": "ice"}]},
    {"id": "ward", "name": "霜の結界", "effects": [{"kind": "block", "amount": 7}]},
    {"id": "bind", "name": "凍る足元", "effects": [{"kind": "applyStatus", "status": "freeze", "amount": 1}]},
  ],
};

export const iceKnight: EnemyDef = {
  id: "iceKnight",
  name: "氷の騎士",
  icon: "🛡",
  maxHp: 70,
  baseLevel: 8,
  size: 1.2,
  exp: 30,
  gold: 25,
  weak: ["thunder", "holy"],
  resist: ["ice"],
  pattern: "sequence",
  actions: [
    {"id": "slash", "name": "氷剣の一撃", "effects": [{"kind": "damage", "amount": 14}]},
    {"id": "guard", "name": "氷鎧の構え", "effects": [{"kind": "block", "amount": 16}]},
    {"id": "crush", "name": "砕氷斬", "effects": [{"kind": "damage", "amount": 18}]},
    {"id": "sweep", "name": "横薙ぎ", "effects": [{"kind": "damage", "amount": 7, "to": "foes"}]},
  ],
  abilities: [{"name": "厚い氷鎧", "effect": {"when": "battleStart", "do": [{"kind": "block", "amount": 6}]}}],
};

export const frozenBishop: EnemyDef = {
  id: "frozenBishop",
  name: "凍れる司教",
  icon: "♛",
  maxHp: 210,
  baseLevel: 7,
  size: 1.5,
  exp: 110,
  gold: 110,
  weak: ["fire", "dark"],
  resist: ["ice", "holy"],
  pattern: "sequence",
  actions: [
    {"id": "light", "name": "凍った祝福", "effects": [{"kind": "damage", "amount": 14, "element": "holy"}]},
    {"id": "ice", "name": "凍結の聖句", "effects": [{"kind": "damage", "amount": 10, "element": "ice"}]},
    {"id": "ward", "name": "聖堂の守り", "effects": [{"kind": "block", "amount": 18}, {"kind": "damage", "amount": 6}]},
  ],
  abilities: [{"name": "凍った法衣", "effect": {"when": "battleStart", "do": [{"kind": "block", "amount": 6}]}}],
  phases: [
    { belowHpPct: 50, name: "冬への祈り", pattern: 'sequence', actions: [
      {"id": "hymn", "name": "冷えた賛歌", "effects": [{"kind": "damage", "amount": 10, "element": "holy", "to": "foes"}]},
      {"id": "prayer", "name": "祈りの凍結", "effects": [{"kind": "applyStatus", "status": "freeze", "amount": 1}, {"kind": "block", "amount": 12}]},
      {"id": "judgment", "name": "沈んだ裁き", "effects": [{"kind": "damage", "amount": 22, "element": "holy"}]},
      {"id": "bell", "name": "霜の鐘", "effects": [{"kind": "damage", "amount": 7, "element": "ice", "to": "foes"}]},
    ] },
  ],
};

export const cursedFrozenSoldier: EnemyDef = makeVariant(frozenSoldier, {"id": "cursedFrozenSoldier", "name": "呪われた凍った兵士", "aura": "shadow", "maxHp": 32, "baseLevel": 5, "exp": 10, "gold": 6, "weak": ["holy"], "resist": ["dark"], "actions": [{"id": "slash", "name": "呪いの刃", "effects": [{"kind": "damage", "amount": 9, "element": "dark"}]}, {"id": "shield", "name": "呪いの盾", "effects": [{"kind": "block", "amount": 8}]}, {"id": "push", "name": "闇の盾押し", "effects": [{"kind": "damage", "amount": 5, "element": "dark"}, {"kind": "applyStatus", "status": "curse", "amount": 1}]}]});

export const shadowSnowWitch: EnemyDef = makeVariant(snowWitch, {"id": "shadowSnowWitch", "name": "闇の雪の魔女", "aura": "shadow", "weak": ["holy"], "resist": ["dark"], "actions": [{"id": "shard", "name": "闇の刃", "effects": [{"kind": "damage", "amount": 8, "element": "dark"}]}, {"id": "hex", "name": "暗い子守歌", "effects": [{"kind": "applyStatus", "status": "weak", "amount": 1}]}, {"id": "curse", "name": "闇の呪い", "effects": [{"kind": "applyStatus", "status": "curse", "amount": 2}]}, {"id": "veil", "name": "闇の帳", "effects": [{"kind": "block", "amount": 8}]}]});
