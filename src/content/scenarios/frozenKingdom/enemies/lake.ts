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
    // 敵の特殊な行動・第2弾（docs/tasks/enemy-behaviors-round2-plan.md §3・fix-plan §4）: 「氷の膜」を浄化に置き換えた。ID は古い保存のために残す。
    // 自分に悪い状態異常がある時は割り込む（割り込んだら次の2ターンは割り込まない）。順番の最後にも残す。3つ目の地域なので1種類につき6回復
    { id: 'shell', name: '凍り直す', big: true, behavior: 'purify', cutIn: { when: 'afflicted', rest: 2 }, brief: '消してブロックに', hint: '状態異常を全部消し、1種類につきブロック8（回復はしない）。種類を絞るか、ブロックごと崩す', effects: [{ kind: 'purify', amount: 8, gain: 'block' }] },
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
  // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: ほかの敵がいる時は、1ターン目に必ず「主君の盾」（1体だけの時は氷剣の一撃）
  firstActionId: "guard",
  actions: [
    {"id": "slash", "name": "氷剣の一撃", "effects": [{"kind": "damage", "amount": 14}]},
    // 「氷鎧の構え」をかばうに置き換えた。ID は古い保存のために残す。3つ目の地域なのでブロック8（BREAK されると行動ごと止まる）
    { id: 'guard', name: '主君の盾', big: true, behavior: 'guard', fallbackIfAloneId: 'slash', brief: '傷ついた仲間だけかばう', hint: '次の味方の番の間、HPの割合がいちばん低い仲間を狙った単体攻撃だけを代わりに受ける。元気な方を先に削るか、全体攻撃で', effects: [{ kind: 'guardAllies', cover: 'weakest' }, { kind: 'block', amount: 8 }] },
    {"id": "crush", "name": "砕氷斬", big: true, "effects": [{"kind": "damage", "amount": 18}]},
    {"id": "sweep", "name": "横薙ぎ", big: true, "effects": [{"kind": "damage", "amount": 7, "to": "foes"}]},
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
    {"id": "light", "name": "凍った祝福", big: true, "effects": [{"kind": "damage", "amount": 14, "element": "holy"}]},
    {"id": "ice", "name": "凍結の聖句", "effects": [{"kind": "damage", "amount": 10, "element": "ice"}]},
    {"id": "ward", "name": "聖堂の守り", "effects": [{"kind": "block", "amount": 18}, {"kind": "damage", "amount": 6}]},
  ],
  abilities: [{"name": "凍った法衣", "effect": {"when": "battleStart", "do": [{"kind": "block", "amount": 6}]}}],
  phases: [
    // ボスの段階（2026-11-14）: 浄化。開幕の一手と、状態異常が付いた時の割り込み。答え: 火・闇で BREAK・状態異常に頼らない
    { belowHpPct: 50, name: "冬への祈り", pattern: 'sequence', openingActionId: 'cleanse', rule: '状態異常を払い、払った数だけ回復する（火・闇で BREAK すると止まる。状態異常に頼らず殴る）', actions: [
      { id: 'cleanse', name: '凍える浄め', big: true, behavior: 'purify', cutIn: { when: 'afflicted', rest: 2 }, hint: '状態異常を全部消して回復する（1種類につき8）。その前に起爆するか、火・闇の弱点で BREAK する。状態異常に頼らず殴れば効かない', effects: [{ kind: 'purify', amount: 8 }, { kind: 'block', amount: 12 }] },
      {"id": "hymn", "name": "冷えた賛歌", big: true, "effects": [{"kind": "damage", "amount": 10, "element": "holy", "to": "foes"}]},
      {"id": "prayer", "name": "祈りの凍結", "effects": [{"kind": "applyStatus", "status": "freeze", "amount": 1}, {"kind": "block", "amount": 12}]},
      {"id": "judgment", "name": "沈んだ裁き", big: true, "effects": [{"kind": "damage", "amount": 22, "element": "holy"}]},
      {"id": "bell", "name": "霜の鐘", big: true, "effects": [{"kind": "damage", "amount": 7, "element": "ice", "to": "foes"}]},
    ] },
  ],
};

// 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 亜種のこの敵だけ「呪いの盾」を仲間を呼ぶ（凍った兵士）に置き換えた。ID は古い保存のために残す。
// 呼べる時は優先・2ターン続けては呼ばない・1戦闘に2回まで。呼べない時は「呪いの刃」。3つ目の地域なのでブロック8。元の凍った兵士は変えていない
export const cursedFrozenSoldier: EnemyDef = makeVariant(frozenSoldier, {"id": "cursedFrozenSoldier", "name": "呪われた凍った兵士", "aura": "shadow", "maxHp": 32, "baseLevel": 5, "exp": 10, "gold": 6, "weak": ["holy"], "resist": ["dark"], "actions": [{"id": "slash", "name": "呪いの刃", "effects": [{"kind": "damage", "amount": 9, "element": "dark"}]}, { id: 'shield', name: '凍った角笛', big: true, scripted: true, behavior: 'call', cutIn: { when: 'alone', rest: 1, noRepeat: true }, brief: '1体になると呼ぶ', hint: 'ほかの敵が倒れて1体だけになると、角笛で凍った兵士を呼ぶ（2回まで）。兵士を先に倒すか、最後に残さない', effects: [{ kind: 'summonEnemy', enemy: 'frozenSoldier', uses: 2, call: true, orElse: 'slash' }, { kind: 'block', amount: 8 }] }, {"id": "push", "name": "闇の盾押し", "effects": [{"kind": "damage", "amount": 5, "element": "dark"}, {"kind": "applyStatus", "status": "curse", "amount": 1}]}]});

export const shadowSnowWitch: EnemyDef = makeVariant(snowWitch, {"id": "shadowSnowWitch", "name": "闇の雪の魔女", "aura": "shadow", "weak": ["holy"], "resist": ["dark"], "actions": [{"id": "shard", "name": "闇の刃", big: true, "effects": [{"kind": "damage", "amount": 8, "element": "dark"}]}, {"id": "hex", "name": "暗い子守歌", "effects": [{"kind": "applyStatus", "status": "weak", "amount": 1}]}, {"id": "curse", "name": "闇の呪い", "effects": [{"kind": "applyStatus", "status": "curse", "amount": 2}]}, {"id": "veil", "name": "闇の帳", "effects": [{"kind": "block", "amount": 8}]}]});
