// T7：既存の敵を変えずに、同じ地域の組み合わせを増やす。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { ashBat } from './volcano';

export const cinderHound: EnemyDef = {
  id: "cinderHound",
  name: "炭火の猟犬",
  icon: "◆",
  maxHp: 32,
  baseLevel: 7,
  size: 1,
  exp: 13,
  gold: 9,
  weak: ["ice"],
  resist: ["fire"],
  pattern: "sequence",
  actions: [
    {"id": "bite", "name": "炭火の牙", "effects": [{"kind": "damage", "amount": 10, "element": "fire"}]},
    {"id": "brace", "name": "炭の毛皮", "effects": [{"kind": "block", "amount": 6}]},
    {"id": "pounce", "name": "飛びかかり", "effects": [{"kind": "damage", "amount": 4, "hits": 2}]},
  ],
};

export const basaltCrawler: EnemyDef = {
  id: "basaltCrawler",
  name: "玄武岩の虫",
  icon: "◆",
  maxHp: 44,
  baseLevel: 7,
  size: 1.05,
  exp: 13,
  gold: 9,
  weak: ["thunder"],
  resist: ["fire", "poison"],
  pattern: "sequence",
  actions: [
    {"id": "horn", "name": "岩角の一撃", "effects": [{"kind": "damage", "amount": 10}]},
    {"id": "shell", "name": "玄武岩の殻", "effects": [{"kind": "block", "amount": 10}]},
    {"id": "sweep", "name": "岩脚の薙ぎ払い", "effects": [{"kind": "damage", "amount": 5, "to": "foes"}]},
  ],
};

export const ironAshBat: EnemyDef = makeVariant(ashBat, {"id": "ironAshBat", "name": "鋼翼の灰コウモリ", "aura": "iron", "abilities": [{"name": "鋼翼の備え", "effect": {"when": "battleStart", "do": [{"kind": "block", "amount": 3}]}}], "actions": [{"id": "flurry", "name": "乱れ噛み", "effects": [{"kind": "damage", "amount": 4, "hits": 3}]}, {"id": "screech", "name": "金切り声", "effects": [{"kind": "applyStatus", "status": "weak", "amount": 1, "to": "foes"}]}, {"id": "wings", "name": "鋼翼を閉じる", "effects": [{"kind": "block", "amount": 5}]}]});
