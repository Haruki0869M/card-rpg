// T7：既存の敵を変えずに、同じ地域の組み合わせを増やす。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { forestWolf } from './forest';

export const thornBoar: EnemyDef = {
  id: "thornBoar",
  name: "茨の猪",
  icon: "◆",
  maxHp: 24,
  baseLevel: 3,
  size: 1,
  exp: 7,
  gold: 4,
  weak: ["fire"],
  resist: [],
  pattern: "sequence",
  actions: [
    {"id": "charge", "name": "茨の突進", "effects": [{"kind": "damage", "amount": 7}]},
    {"id": "brace", "name": "茨を逆立てる", "effects": [{"kind": "block", "amount": 5}]},
    {"id": "tusk", "name": "牙の一突き", "effects": [{"kind": "damage", "amount": 5}, {"kind": "applyStatus", "status": "vulnerable", "amount": 1}]},
  ],
};

export const mossCarapace: EnemyDef = {
  id: "mossCarapace",
  name: "苔殻の虫",
  icon: "◆",
  maxHp: 18,
  baseLevel: 3,
  size: 0.8,
  exp: 6,
  gold: 3,
  weak: ["fire", "thunder"],
  resist: ["poison"],
  pattern: "sequence",
  actions: [
    {"id": "bite", "name": "苔殻の牙", "effects": [{"kind": "damage", "amount": 6}]},
    {"id": "shell", "name": "苔の殻", "effects": [{"kind": "block", "amount": 6}]},
    {"id": "scratch", "name": "脚のひっかき", "effects": [{"kind": "damage", "amount": 3, "hits": 2}]},
  ],
};

export const rootImp: EnemyDef = {
  id: "rootImp",
  name: "根隠れの小鬼",
  icon: "◆",
  maxHp: 20,
  baseLevel: 3,
  size: 0.85,
  exp: 6,
  gold: 3,
  weak: ["holy"],
  resist: [],
  pattern: "sequence",
  actions: [
    {"id": "claw", "name": "根の爪", "effects": [{"kind": "damage", "amount": 6}]},
    {"id": "hide", "name": "根陰に隠れる", "effects": [{"kind": "block", "amount": 5}]},
    {"id": "dust", "name": "土けむり", "effects": [{"kind": "damage", "amount": 4}, {"kind": "applyStatus", "status": "weak", "amount": 1}]},
  ],
};

export const emberForestWolf: EnemyDef = makeVariant(forestWolf, {"id": "emberForestWolf", "name": "炎の森の狼", "aura": "ember", "maxHp": 24, "weak": ["ice"], "resist": ["fire"], "actions": [{"id": "bite", "name": "炎の噛みつき", "effects": [{"kind": "damage", "amount": 7, "element": "fire"}]}, {"id": "pounce", "name": "飛びかかり", "effects": [{"kind": "damage", "amount": 4, "hits": 2}]}, {"id": "howl", "name": "火花の遠吠え", "effects": [{"kind": "block", "amount": 5}, {"kind": "damage", "amount": 3}]}]});
