// T7：既存の敵を変えずに、同じ地域の組み合わせを増やす。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { bogGhoul } from './swamp';

export const reedStalker: EnemyDef = {
  id: "reedStalker",
  name: "葦陰の狩人",
  icon: "◆",
  maxHp: 28,
  baseLevel: 5,
  size: 1,
  exp: 10,
  gold: 6,
  weak: ["fire", "thunder"],
  resist: ["poison"],
  pattern: "sequence",
  actions: [
    {"id": "slash", "name": "葦の鎌", "effects": [{"kind": "damage", "amount": 8}]},
    {"id": "pair", "name": "二枚の刃", "effects": [{"kind": "damage", "amount": 4, "hits": 2}]},
    {"id": "cover", "name": "葦にまぎれる", "effects": [{"kind": "block", "amount": 7}]},
  ],
};

export const fenGuardian: EnemyDef = {
  id: "fenGuardian",
  name: "沼の石守",
  icon: "🛡",
  maxHp: 64,
  baseLevel: 6,
  size: 1.2,
  exp: 22,
  gold: 18,
  weak: ["thunder", "fire"],
  resist: ["poison"],
  pattern: "sequence",
  actions: [
    {"id": "slam", "name": "苔石の拳", big: true, "effects": [{"kind": "damage", "amount": 12}]},
    {"id": "guard", "name": "沈んだ石壁", "effects": [{"kind": "block", "amount": 12}]},
    {"id": "sweep", "name": "沼水の薙ぎ払い", big: true, "effects": [{"kind": "damage", "amount": 7, "to": "foes"}]},
  ],
  abilities: [{"name": "苔石の守り", "effect": {"when": "battleStart", "do": [{"kind": "block", "amount": 4}]}}],
};

export const shadowBogGhoul: EnemyDef = makeVariant(bogGhoul, {"id": "shadowBogGhoul", "name": "闇の沼の亡者", "aura": "shadow", "weak": ["holy"], "resist": ["dark", "poison"], "actions": [{"id": "claw", "name": "闇の爪", "effects": [{"kind": "damage", "amount": 8, "element": "dark"}]}, {"id": "grasp", "name": "亡者の手", "effects": [{"kind": "damage", "amount": 5}, {"kind": "applyStatus", "status": "weak", "amount": 1}]}, {"id": "guard", "name": "闇の帳", "effects": [{"kind": "block", "amount": 6}]}]});
