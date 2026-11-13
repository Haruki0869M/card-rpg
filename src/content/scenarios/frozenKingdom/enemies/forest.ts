// 凍てつく王国：forest。凍結を重ねすぎないよう、行動は順番に繰り返す。
import type { EnemyDef } from '../../../../types';
import { makeVariant } from '../../../../data/enemyVariant';
import { frostWolf } from './foothills';

export const iceBat: EnemyDef = {
  id: "iceBat",
  name: "氷の蝙蝠",
  icon: "❄",
  maxHp: 20,
  baseLevel: 3,
  size: 0.8,
  exp: 7,
  gold: 4,
  weak: ["fire", "thunder"],
  resist: ["ice"],
  pattern: "sequence",
  actions: [
    {"id": "twinBite", "name": "二連の噛みつき", "effects": [{"kind": "damage", "amount": 3, "hits": 2}]},
    {"id": "screech", "name": "冷たい金切り声", "effects": [{"kind": "applyStatus", "status": "weak", "amount": 1}]},
    {"id": "dive", "name": "急降下", "effects": [{"kind": "damage", "amount": 7}]},
  ],
};

export const frozenSoldier: EnemyDef = {
  id: "frozenSoldier",
  name: "凍った兵士",
  icon: "❄",
  maxHp: 26,
  baseLevel: 3,
  size: 1,
  exp: 7,
  gold: 4,
  weak: ["fire", "holy"],
  resist: ["ice", "dark"],
  pattern: "sequence",
  actions: [
    {"id": "slash", "name": "凍った刃", "effects": [{"kind": "damage", "amount": 7}]},
    {"id": "shield", "name": "盾を構える", "effects": [{"kind": "block", "amount": 7}]},
    {"id": "push", "name": "盾押し", "effects": [{"kind": "damage", "amount": 4}, {"kind": "applyStatus", "status": "weak", "amount": 1}]},
  ],
};

export const snowOwl: EnemyDef = {
  id: "snowOwl",
  name: "白梟",
  icon: "❄",
  maxHp: 22,
  baseLevel: 3,
  size: 0.85,
  exp: 7,
  gold: 4,
  weak: ["thunder"],
  resist: ["ice"],
  pattern: "sequence",
  actions: [
    {"id": "talons", "name": "白い鉤爪", "effects": [{"kind": "damage", "amount": 4, "hits": 2}]},
    {"id": "wings", "name": "翼で退く", "effects": [{"kind": "block", "amount": 4}]},
    {"id": "swoop", "name": "梢からの急襲", "effects": [{"kind": "damage", "amount": 7}]},
  ],
  abilities: [{"name": "先駆けの羽ばたき", "effect": {"when": "battleStart", "do": [{"kind": "damage", "amount": 3, "to": "randomFoe"}]}}],
};

export const icicleBug: EnemyDef = {
  id: "icicleBug",
  name: "氷柱の虫",
  icon: "❄",
  maxHp: 24,
  baseLevel: 3,
  size: 0.85,
  exp: 7,
  gold: 4,
  weak: ["fire"],
  resist: ["ice", "poison"],
  pattern: "sequence",
  actions: [
    {"id": "spike", "name": "氷柱の角", "effects": [{"kind": "damage", "amount": 7}]},
    {"id": "shell", "name": "結晶の殻", "effects": [{"kind": "block", "amount": 6}]},
    {"id": "legs", "name": "脚の連打", "effects": [{"kind": "damage", "amount": 3, "hits": 2}]},
  ],
};

export const snowWitch: EnemyDef = {
  id: "snowWitch",
  name: "雪の魔女",
  icon: "🛡",
  maxHp: 48,
  baseLevel: 5,
  size: 1.2,
  exp: 25,
  gold: 20,
  weak: ["fire", "dark"],
  resist: ["ice"],
  pattern: "sequence",
  actions: [
    {"id": "shard", "name": "霜の刃", big: true, "effects": [{"kind": "damage", "amount": 8}]},
    {"id": "hex", "name": "眠りの霜", "effects": [{"kind": "applyStatus", "status": "freeze", "amount": 1}]},
    {"id": "curse", "name": "冬の呪い", "effects": [{"kind": "applyStatus", "status": "curse", "amount": 2}]},
    {"id": "veil", "name": "雪の帳", "effects": [{"kind": "block", "amount": 8}]},
  ],
  abilities: [{"name": "雪の帳の備え", "effect": {"when": "battleStart", "do": [{"kind": "block", "amount": 4}]}}],
};

export const crystalLord: EnemyDef = {
  id: "crystalLord",
  name: "氷晶の主",
  icon: "♛",
  maxHp: 150,
  baseLevel: 5,
  size: 1.4,
  exp: 80,
  gold: 80,
  weak: ["fire", "thunder"],
  resist: ["ice"],
  pattern: "sequence",
  actions: [
    {"id": "pillars", "name": "氷柱の雨", big: true, "effects": [{"kind": "damage", "amount": 7, "element": "ice", "to": "foes"}]},
    {"id": "guard", "name": "氷晶の殻", "effects": [{"kind": "block", "amount": 16}]},
    {"id": "pierce", "name": "結晶の槍", big: true, "effects": [{"kind": "damage", "amount": 14}]},
  ],
  abilities: [{"name": "氷晶の外殻", "effect": {"when": "battleStart", "do": [{"kind": "block", "amount": 6}]}}],
  phases: [
    // ボスの段階（2026-11-14）: 呼ぶ。開幕の一手で氷柱の虫を呼ぶ（順番でもう1回）。答え: 火・雷で BREAK・先に倒す
    { belowHpPct: 50, name: "増殖する氷晶", pattern: 'sequence', openingActionId: 'shardCall', rule: '氷柱の虫を呼ぶ（2回まで。火・雷で BREAK すると止まる。先に倒すか、全体攻撃で）', actions: [
      { id: 'shardCall', name: '氷晶から虫を孵す', big: true, behavior: 'call', hint: '氷柱の虫を1体呼ぶ（2回まで。倒しても報酬なし）。火・雷の弱点で BREAK すると止まる。呼ばれた虫は先に倒すか、全体攻撃で', effects: [{ kind: 'summonEnemy', enemy: 'icicleBug', uses: 2, orElse: 'lance' }, { kind: 'block', amount: 8 }] },
      {"id": "bloom", "name": "増え続ける氷晶", "effects": [{"kind": "block", "amount": 22}]},
      {"id": "storm", "name": "氷柱の嵐", big: true, "effects": [{"kind": "damage", "amount": 10, "element": "ice", "to": "foes"}]},
      {"id": "lance", "name": "裂ける氷晶", big: true, "effects": [{"kind": "damage", "amount": 20}]},
    ] },
  ],
};

export const emberFrostWolf: EnemyDef = makeVariant(frostWolf, {"id": "emberFrostWolf", "name": "熾火の雪狼", "aura": "ember", "maxHp": 24, "baseLevel": 3, "exp": 7, "gold": 4, "weak": ["ice"], "resist": ["fire"], "actions": [{"id": "bite", "name": "熾火の噛みつき", "effects": [{"kind": "damage", "amount": 7, "element": "fire"}]}, {"id": "howl", "name": "火花の遠吠え", "effects": [{"kind": "block", "amount": 5}]}, {"id": "pounce", "name": "熾火の跳躍", "effects": [{"kind": "damage", "amount": 4, "hits": 2}]}]});
