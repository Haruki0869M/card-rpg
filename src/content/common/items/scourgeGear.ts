// 災厄の中ボスの専用の装備（段階7b・overhaul-plan-v2 §3-2。中身は、その後でオーナーが OK した docs/tasks/lineup-final-gear.md の「新しい（災厄）」）。
// 出どころは、その災厄を倒した時だけ（必ず落とす。source: 'scourge'。町の店・宝箱・ドロップ・行商人・闇商人には出ない）。
// 冒険をまたいで持ち越さない（今の装備と同じ）。能力の数字は一覧のまま。一覧に数字の無い所は【提案】。
// 一覧の5個のうち「紅蓮魔人の炉心核」は、5種類目の災厄（業火の魔人）の物。段階7c で足した（オーナーの決定 2026-11-13）
import type { ItemDef } from '../../../types';

const SC = 'scourge' as const;

export const scourgeItems: ItemDef[] = [
  {
    id: 'greedCrown', name: '強欲王の黄金冠', slot: 'accessory', rarity: 'legend', icon: 'charm', source: SC,
    description: '戦闘中にお金を得るたび、得た額と同じダメージを敵全員に（1回20まで）・自分にブロック3。1ターンに2回まで。',
    stats: { luk: 10 }, maxHp: 10, tags: ['gold', 'aoe', 'block'],
    ability: {
      name: '黄金の雨',
      description: '戦闘中にお金を得るたび、得た額と同じダメージを敵全員に（1回20まで）・自分にブロック3。1ターンに2回まで。',
      effect: { when: 'goldGain', if: [{ kind: 'perTurn', key: 'greedCrown', max: 2 }], do: [{ kind: 'dealtDamage', cap: 20, to: 'foes' }, { kind: 'block', amount: 3, to: 'self' }] },
    },
  },
  {
    id: 'soulReaperScythe', name: '魂喰らいの冥獄鎌', slot: 'weapon', weaponType: 'scythe', rarity: 'legend', icon: 'scythe', source: SC,
    description: '敵を倒すたび・敵に呪いを与えるたび（呪いは1ターンに2回まで）、屍兵を1体呼ぶ（最大3体。死霊術師の屍兵と合わせて数える）。3体いる時は、代わりに屍兵が全員1回ずつ攻撃する。',
    stats: { str: 8, int: 8 }, tags: ['curse', 'summon', 'dark'],
    cards: [{ cardId: 'axExecutioner', count: 2 }],
    ability: {
      name: '冥獄の門',
      description: '敵を倒すたび・敵に呪いを与えるたび（呪いは1ターンに2回まで）、屍兵を1体呼ぶ（最大3体。死霊術師の屍兵と合わせて数える）。3体いる時は、代わりに屍兵が全員1回ずつ攻撃する。',
      effect: { when: 'kill', do: [{ kind: 'summon', id: 'skeletonSoldier', name: '屍兵', icon: '💀', damage: 3, turns: 99, stackLimit: 3, overflow: true }] },
      also: [{ when: 'inflict', if: [{ kind: 'statusIs', status: 'curse' }, { kind: 'perTurn', key: 'soulReaper', max: 2 }], do: [{ kind: 'summon', id: 'skeletonSoldier', name: '屍兵', icon: '💀', damage: 3, turns: 99, stackLimit: 3, overflow: true }] }],
    },
  },
  {
    id: 'permafrostGown', name: '永久凍土の女皇衣', slot: 'armor', rarity: 'legend', icon: 'robe', source: SC,
    // 弱体は、敵の番の途中で付くので、その番の終わりに1減る。次の敵の行動まで残るように2付ける（味方の番には「弱体1」に見える）。
    // 上限【提案】: 弱体は1ターンに3回・凍結の判定は1ターンに1回（×N回の攻撃や、敵が多い時に重なりすぎないように）
    description: '攻撃してきた敵に弱体（次の行動まで）、さらに50%で凍結1（ボス・中ボスには凍結の代わりに弱体）。弱体は1ターン3回・凍結は1ターン1回まで。氷属性のダメージを受けない。',
    maxHp: 22, startBlock: 8, tags: ['ice', 'block', 'weak'],
    ability: {
      name: '凍土の抱擁',
      description: '攻撃してきた敵に弱体（次の行動まで）、さらに50%で凍結1（ボス・中ボスには凍結の代わりに弱体）。弱体は1ターン3回・凍結は1ターン1回まで。氷属性のダメージを受けない。',
      effect: { when: 'hurt', if: [{ kind: 'perTurn', key: 'gownWeak', max: 3 }], do: [{ kind: 'applyStatus', status: 'weak', amount: 2, to: 'attacker' }] },
      also: [
        { when: 'hurt', if: [{ kind: 'chance', pct: 50 }, { kind: 'perTurn', key: 'gownFreeze', max: 1 }], do: [{ kind: 'applyStatus', status: 'freeze', amount: 1, bossStatus: 'weak', bossLike: true, to: 'attacker' }] },
        { when: 'blocked', if: [{ kind: 'perTurn', key: 'gownWeak', max: 3 }], do: [{ kind: 'applyStatus', status: 'weak', amount: 2, to: 'attacker' }] },
        { when: 'blocked', if: [{ kind: 'chance', pct: 50 }, { kind: 'perTurn', key: 'gownFreeze', max: 1 }], do: [{ kind: 'applyStatus', status: 'freeze', amount: 1, bossStatus: 'weak', bossLike: true, to: 'attacker' }] },
        { modifier: 'elementGuard', element: 'ice', mode: 'immune' },
      ],
    },
  },
  {
    id: 'nightmarePelt', name: '悪夢の毛皮', slot: 'armor', rarity: 'legend', icon: 'robe', source: SC,
    description: '自分に悪い状態異常が付くたび、同じ物を同じ数だけ敵全員にも付ける（凍結は、ボス・中ボスには弱体）。1ターンに2回まで。',
    maxHp: 18, tags: ['curse', 'poison', 'burn', 'heresy'],
    ability: {
      name: '悪夢返し',
      description: '自分に悪い状態異常が付くたび、同じ物を同じ数だけ敵全員にも付ける（凍結は、ボス・中ボスには弱体）。1ターンに2回まで。',
      effect: { when: 'statusTaken', if: [{ kind: 'perTurn', key: 'nightmarePelt', max: 2 }], do: [{ kind: 'mirrorStatus' }] },
    },
  },
  {
    // 段階7c: 5種類目「業火の魔人」の装備。能力値（力+8・知力+8）は docs/tasks/lineup-phase3-gear.md §2-1 の表のまま。
    // マナ+1・1枚引くは自分の番の始めに1回だけ（カードや能力では増えない）。自分の火傷で倒れる事はある（今の火傷の決まりのまま）
    id: 'infernoCore', name: '紅蓮魔人の炉心核', slot: 'accessory', rarity: 'legend', icon: 'amulet', source: SC,
    description: '毎ターンの始めに、マナ+1・カードを1枚引く。代わりに、自分と敵全員に「火傷」1。',
    stats: { str: 8, int: 8 }, tags: ['mana', 'draw', 'burn'],
    ability: {
      name: '暴走炉心',
      description: '毎ターンの始めに、マナ+1・カードを1枚引く。代わりに、自分と敵全員に「火傷」1。',
      effect: { when: 'turnStart', do: [{ kind: 'gainMana', amount: 1 }, { kind: 'draw', amount: 1 }, { kind: 'applyStatus', status: 'burn', amount: 1, to: 'self' }, { kind: 'applyStatus', status: 'burn', amount: 1, to: 'foes' }] },
    },
  },
  // ---- 秘薬（オーナーの決定 1-A: その冒険の中だけ。選んだキャラの能力値を1つ +5）----
  {
    id: 'scourgeElixir', name: '災厄討ちの秘薬', slot: 'consumable', rarity: 'legend', icon: 'ether', source: SC, noShop: true,
    description: '災厄を倒した者だけが手にする秘薬。選んだキャラの能力値を1つ、この冒険の間+5する。',
    use: [{ kind: 'fieldOnly', what: 'elixir', amount: 5 }],
  },
];
