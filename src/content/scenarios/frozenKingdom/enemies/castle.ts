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
    {"id": "slam", "name": "守護の拳", big: true, "effects": [{"kind": "damage", "amount": 16}]},
    {"id": "sweep", "name": "城門の薙ぎ払い", big: true, "effects": [{"kind": "damage", "amount": 8, "to": "foes"}]},
    {"id": "brace", "name": "氷壁の再生", "effects": [{"kind": "block", "amount": 14}, {"kind": "damage", "amount": 6}]},
  ],
  abilities: [{"name": "城門の守り", "effect": {"when": "battleStart", "do": [{"kind": "block", "amount": 10}]}}],
  // 最後の中ボス（2026-11-14 寄り道の値打ち 柱5）: 中ボスの部屋の戦闘だけの段階。HP50%か、相方が倒れると入る。数字は【提案】
  midbossPhases: [
    {
      belowHpPct: 50,
      onPartnerDown: true,
      name: '怒れる霜の守護者',
      pattern: 'sequence',
      openingActionId: 'fgRaiseWall',
      rule: '溜め: 構えの次に大技（構えの間に弱点で BREAK すると大技も消える。守りを固めて受ける）',
      actions: [
        { id: 'fgRaiseWall', name: '氷壁を掲げる', big: true, scripted: true, chargeTo: 'fgGlacierFall', hint: '次の予告が「氷河落とし」になる。この間に闇か雷の弱点で BREAK すると、氷河落としも消える', effects: [{ kind: 'block', amount: 18 }] },
        { id: 'fgGlacierFall', name: '氷河落とし', big: true, scripted: true, hint: '味方全員に大きな氷のダメージ。ブロックで受けるか、BREAK して威力を半分にする', effects: [{ kind: 'damage', amount: 13, element: 'ice', to: 'foes' }] },
        { id: 'fgFrostFist', name: '凍る拳', effects: [{ kind: 'damage', amount: 16, element: 'ice' }] },
        { id: 'fgRebuild', name: '氷壁の組み直し', effects: [{ kind: 'block', amount: 14 }, { kind: 'damage', amount: 6 }] },
      ],
    },
  ],
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
    {"id": "promise", "name": "凍った約束", big: true, "effects": [{"kind": "damage", "amount": 22, "element": "ice"}]},
    {"id": "throne", "name": "氷の玉座", "effects": [{"kind": "block", "amount": 22}, {"kind": "damage", "amount": 6}]},
  ],
  abilities: [{"name": "百年の氷衣", "effect": {"when": "battleStart", "do": [{"kind": "block", "amount": 8}]}}],
  phases: [
    // ボスの段階（2026-11-14）: 溜め（凍結の前触れ。順番でもくり返す）。答え: 溜めを火で BREAK・守り
    { belowHpPct: 60, name: "帰らぬ春を待つ姫", pattern: 'sequence', openingActionId: 'frostBreath', rule: '冷気を溜め、次の予告で全体攻撃と凍結（溜めを火で BREAK すると、凍結も消える）', actions: [
      { id: 'frostBreath', name: '春を拒む冷気を溜める', big: true, chargeTo: 'eternalFrost', hint: '次の予告が「永久凍結」（味方全員に氷10・狙った1人に凍結1）になる。火の弱点で BREAK すると溜めが止まり、永久凍結も消える', effects: [{ kind: 'block', amount: 14 }] },
      { id: 'eternalFrost', name: '永久凍結', big: true, scripted: true, effects: [{ kind: 'damage', amount: 10, element: 'ice', to: 'foes' }, { kind: 'applyStatus', status: 'freeze', amount: 1 }] },
      {"id": "spring", "name": "帰らぬ春", big: true, "effects": [{"kind": "damage", "amount": 11, "element": "ice", "to": "foes"}]},
      {"id": "tears", "name": "王女の涙", big: true, "effects": [{"kind": "damage", "amount": 20, "element": "holy"}]},
      {"id": "wall", "name": "拒絶の氷壁", "effects": [{"kind": "block", "amount": 24}]},
      {"id": "memory", "name": "思い出の霜", "effects": [{"kind": "applyStatus", "status": "freeze", "amount": 1}, {"kind": "damage", "amount": 6}]},
    ] },
    // ボスの段階（2026-11-14）: 弱点が増える（氷の殻が割れる。聖の耐性も消える）。答え: 増えた弱点（雷）と聖で押し切る
    { belowHpPct: 30, name: "永遠の冬に呑まれた女王", pattern: 'sequence', openingActionId: 'shellShatter', rule: '氷の殻が割れて、雷も弱点になり、聖の耐性が消える（増えた弱点で押し切る）', addWeak: ['thunder'], resist: ['ice'], actions: [
      { id: 'shellShatter', name: '割れた氷の殻が飛び散る', big: true, scripted: true, effects: [{ kind: 'damage', amount: 12, element: 'ice', to: 'foes' }] },
      {"id": "winter", "name": "永遠の冬", big: true, "effects": [{"kind": "damage", "amount": 16, "element": "ice", "to": "foes"}]},
      {"id": "prayer", "name": "砕けた祈り", big: true, "effects": [{"kind": "damage", "amount": 30, "element": "holy"}]},
      {"id": "solitude", "name": "百年の孤独", big: true, "effects": [{"kind": "block", "amount": 26}, {"kind": "damage", "amount": 8, "to": "foes"}]},
    ] },
  ],
};
