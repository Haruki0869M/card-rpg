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
  // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 癒し封じを1ターン目に予告する（2ターン目からは吹雪の締めつけ・毒の牙・癒し封じの順）
  firstActionId: "coil",
  actions: [
    {"id": "bite", "name": "毒の牙", "effects": [{"kind": "damage", "amount": 8}, {"kind": "applyStatus", "status": "poison", "amount": 2}]},
    // 「雪を巻く」を癒し封じに置き換えた。ID は古い保存のために残す。4つ目の地域なのでブロック10（BREAK されると行動ごと止まる）
    {"id": "coil", "name": "凍傷の牙", big: true, behavior: "healSeal", hint: "味方全員の回復が、2ターン半分になる。BREAK するか、先に回復を使う", "effects": [{"kind": "applyStatus", "status": "healSeal", "amount": 2, "to": "foes"}, {"kind": "block", "amount": 10}]},
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
  // 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 盾砕きを1ターン目に予告する（2ターン目からは二の太刀・霜刃の構え・盾砕きの順）
  firstActionId: "thrust",
  actions: [
    {"id": "combo", "name": "二の太刀", "effects": [{"kind": "damage", "amount": 5, "hits": 2}]},
    {"id": "stance", "name": "霜刃の構え", "effects": [{"kind": "block", "amount": 9}]},
    // 「氷刃の突き」を盾砕きに置き換えた（ブロックを0にしてから、同じ12のダメージ）。ID は古い保存のために残す
    {"id": "thrust", "name": "鎧通しの突き", big: true, behavior: "shatter", hint: "当たるとブロックを全部壊す。BREAK するか、ブロックに頼らずに受ける", "effects": [{"kind": "shieldBreak"}, {"kind": "damage", "amount": 12}]},
  ],
  // 最後の中ボス（2026-11-14 寄り道の値打ち 柱5）: 中ボスの部屋の戦闘だけの段階。HP50%か、相方が倒れると入る。数字は【提案】
  midbossPhases: [
    {
      belowHpPct: 50,
      onPartnerDown: true,
      name: '鞘を払った氷の剣士',
      pattern: 'sequence',
      openingActionId: 'isSheathe',
      rule: '溜め: 構えの次に大技（構えの間に弱点で BREAK すると大技も消える。守りを固めて受ける）',
      actions: [
        { id: 'isSheathe', name: '霜刃を納める', big: true, scripted: true, chargeTo: 'isGlacierCut', hint: '次の予告が「氷河断ち」になる。この間に雷か聖の弱点で BREAK すると、氷河断ちも消える', effects: [{ kind: 'block', amount: 9 }] },
        { id: 'isGlacierCut', name: '氷河断ち', big: true, scripted: true, hint: '大きな一撃。ブロックで受けるか、BREAK して威力を半分にする', effects: [{ kind: 'damage', amount: 22, element: 'ice' }] },
        { id: 'isTwinCut', name: '二段斬り', effects: [{ kind: 'damage', amount: 6, hits: 2 }] },
        { id: 'isColdEdge', name: '冷たい刃', effects: [{ kind: 'damage', amount: 11, element: 'ice' }] },
      ],
    },
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
    {"id": "sweep", "name": "白い爪の薙ぎ払い", big: true, "effects": [{"kind": "damage", "amount": 8, "to": "foes"}]},
    {"id": "bite", "name": "吹雪の牙", big: true, "effects": [{"kind": "damage", "amount": 16}]},
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
    {"id": "breath", "name": "凍土のブレス", big: true, "effects": [{"kind": "damage", "amount": 8, "element": "ice", "to": "foes"}]},
    {"id": "bite", "name": "幼竜の牙", big: true, "effects": [{"kind": "damage", "amount": 14}]},
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
    {"id": "hammer", "name": "巨人の重打", big: true, "effects": [{"kind": "damage", "amount": 22}]},
    {"id": "brace", "name": "鉱石の構え", "effects": [{"kind": "block", "amount": 20}]},
    {"id": "hail", "name": "砕ける氷岩", big: true, "effects": [{"kind": "damage", "amount": 8, "element": "ice", "to": "foes"}]},
  ],
  abilities: [{"name": "霜の厚皮", "effect": {"when": "battleStart", "do": [{"kind": "block", "amount": 8}]}}],
  phases: [
    // ボスの段階（2026-11-14）: 盾砕き（順番にも入る）。答え: 守りに頼らない・火・毒の弱点で押し切る
    { belowHpPct: 50, name: "怒れる霜の巨人", pattern: 'sequence', openingActionId: 'smashGuard', rule: '当たるとブロックを全部壊す一撃（火・毒で BREAK すると威力が半分。守りに頼らず受ける）', actions: [
      { id: 'smashGuard', name: '盾ごと砕く大槌', big: true, behavior: 'shatter', hint: '当たるとブロックを全部壊す。BREAK するか、ブロックに頼らずに受ける', effects: [{ kind: 'shieldBreak' }, { kind: 'damage', amount: 18 }] },
      {"id": "rage", "name": "怒りの大槌", big: true, "effects": [{"kind": "damage", "amount": 28}]},
      {"id": "guard", "name": "怒りの構え", "effects": [{"kind": "block", "amount": 24}]},
      {"id": "quake", "name": "鉱山を揺らす", big: true, "effects": [{"kind": "damage", "amount": 12, "to": "foes"}]},
    ] },
  ],
};

export const venomIceSlime: EnemyDef = makeVariant(iceSlime, {"id": "venomIceSlime", "name": "毒氷のスライム", "aura": "venom", "maxHp": 36, "baseLevel": 7, "exp": 13, "gold": 9, "weak": ["fire"], "resist": ["ice"], "actions": [{"id": "ram", "name": "毒氷の体当たり", "effects": [{"kind": "damage", "amount": 9}]}, {"id": "shell", "name": "毒氷の膜", "effects": [{"kind": "block", "amount": 8}]}, {"id": "spit", "name": "毒のしぶき", "effects": [{"kind": "applyStatus", "status": "poison", "amount": 2}]}], "abilities": [{"name": "毒の飛沫", "effect": {"when": "battleStart", "do": [{"kind": "applyStatus", "status": "poison", "amount": 1, "to": "foes"}]}}]});

// 敵の特殊な行動・第2弾（round2 §3・fix-plan §4）: 亜種のこの敵だけ「雷氷の矢」を手負い狙いに置き換えた（同じ雷11・HPが半分以下なら×1.5）。
// ID は古い保存のために残す。1ターン目に予告する（もとから順番の1番目）。元の極寒の弓兵は変えていない
export const stormIceArcher: EnemyDef = makeVariant(iceArcher, {"id": "stormIceArcher", "name": "雷氷の弓兵", "aura": "storm", "maxHp": 34, "baseLevel": 7, "exp": 13, "gold": 9, "weak": ["fire"], "resist": ["ice", "thunder"], firstActionId: "arrow", "actions": [{"id": "arrow", "name": "弱った者を射抜く", big: true, behavior: "hunt", hint: "HPの割合がいちばん低い味方を狙う。HPが半分以下だと×1.5", "effects": [{"kind": "damage", "amount": 11, "element": "thunder", "lowHpMul": 1.5}]}, {"id": "volley", "name": "散る雷矢", "effects": [{"kind": "damage", "amount": 5, "element": "thunder", "to": "foes"}]}, {"id": "brace", "name": "雷矢の構え", "effects": [{"kind": "block", "amount": 7}]}]});
