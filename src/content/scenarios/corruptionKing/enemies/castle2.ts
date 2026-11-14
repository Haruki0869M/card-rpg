// T7：既存の敵を変えずに、同じ地域の組み合わせを増やす。
// T7-fix：同じ地域の黒騎士（HP60）より弱すぎたので、HP・攻撃・ブロックを約15%上げた。
import type { EnemyDef } from '../../../../types';

export const chainWraith: EnemyDef = {
  id: "chainWraith",
  name: "鎖の亡霊",
  icon: "◆",
  maxHp: 48,
  baseLevel: 9,
  size: 1,
  exp: 27,
  gold: 18,
  weak: ["holy"],
  resist: ["dark", "poison"],
  pattern: "sequence",
  actions: [
    {"id": "chain", "name": "闇の鎖", "effects": [{"kind": "damage", "amount": 14, "element": "dark"}]},
    {"id": "curse", "name": "囚われた呪い", "effects": [{"kind": "applyStatus", "status": "curse", "amount": 2}]},
    {"id": "veil", "name": "鎖の幕", "effects": [{"kind": "block", "amount": 12}]},
  ],
};

export const siegeImp: EnemyDef = {
  id: "siegeImp",
  name: "砦の小悪魔",
  icon: "◆",
  maxHp: 46,
  baseLevel: 9,
  size: 0.9,
  exp: 26,
  gold: 17,
  weak: ["holy", "ice"],
  resist: ["fire"],
  pattern: "sequence",
  actions: [
    {"id": "stone", "name": "砦の投石", "effects": [{"kind": "damage", "amount": 14}]},
    {"id": "scatter", "name": "散る火の粉", "effects": [{"kind": "damage", "amount": 6, "to": "foes"}]},
    // 敵の特殊な行動 1回目（docs/tasks/enemy-behaviors-plan.md §7）: 守る行動「瓦礫の構え」を仲間を呼ぶ（灰コウモリ）に置き換えた。呼べない時は「砦の投石」。ID は古い保存のために残す
    // 直し（docs/tasks/enemy-behaviors-fix-plan.md §3）: 呼べる時（生きている敵が上限より少ない・回数が残っている）は、順番を飛ばして優先する。
    // 2ターン続けては呼ばない（rest 1 ＋ noRepeat）。ブロック8を足した（BREAK されると、行動ごと止まり、ブロックも付かない）
    {"id": "guard", "name": "仲間を呼ぶ", big: true, behavior: "call", cutIn: {when: "canSummon", rest: 1, noRepeat: true}, hint: "仲間を1体呼ぶ。その前に倒すか、BREAK する", "effects": [{"kind": "summonEnemy", "enemy": "ashBat", "uses": 2, "call": true, "orElse": "stone"}, {"kind": "block", "amount": 8}]},
  ],
};

export const cursedHound: EnemyDef = {
  id: "cursedHound",
  name: "呪紋の魔犬",
  icon: "◆",
  maxHp: 50,
  baseLevel: 9,
  size: 1,
  exp: 27,
  gold: 18,
  weak: ["holy", "thunder"],
  resist: ["dark"],
  pattern: "sequence",
  // 敵の特殊な行動の直し（docs/tasks/enemy-behaviors-fix-plan.md §3）: 癒し封じを1ターン目に予告する（2ターン目からは呪紋の牙・二連の爪・癒し封じの順）
  firstActionId: "brace",
  actions: [
    {"id": "bite", "name": "呪紋の牙", "effects": [{"kind": "damage", "amount": 14}]},
    {"id": "flurry", "name": "二連の爪", "effects": [{"kind": "damage", "amount": 6, "hits": 2}]},
    // 敵の特殊な行動 1回目（docs/tasks/enemy-behaviors-plan.md §7）: 守る行動「呪紋の構え」を癒し封じの呪いに置き換えた。ID は古い保存のために残す
    // 直し（§3）: ブロック8を足した（BREAK されると、行動ごと止まり、ブロックも付かない）
    {"id": "brace", "name": "癒し封じの呪い", big: true, behavior: "healSeal", hint: "味方全員の回復が、2ターン半分になる。BREAK するか、先に回復を使う", "effects": [{"kind": "applyStatus", "status": "healSeal", "amount": 2, "to": "foes"}, {"kind": "block", "amount": 8}]},
  ],
};
