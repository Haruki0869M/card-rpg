// 砂塵の王朝の固有装備（武器5・鎧3・装飾品5）。このシナリオの宝箱とショップにだけ出る（scenario）
// 方針: 毒（蠍）と火・雷への備え、暑さ寒さをしのぐ。武器の専用カードは、同じ武器種・同じレア度の既存武器と同じ物を使う
import type { ItemDef } from '../../../../types';

export const sandGear: ItemDef[] = [
  // ----- 武器 -----
  {
    id: 'sandstormBlade', name: '砂嵐の曲刀', slot: 'weapon', weaponType: 'sword', rarity: 'epic', icon: 'sword', scenario: 'sandDynasty',
    description: '完全成功で、対象に毒2。1ターンに1回。蠍の毒を刃に宿す。', stats: { str: 6, dex: 4 }, tags: ['physical', 'poison'],
    cards: [{ cardId: 'wMithrilSlash', count: 2 }],
    ability: { name: '蠍の毒', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'sandstormBlade' }], do: [{ kind: 'applyStatus', status: 'poison', amount: 2 }] } },
  },
  {
    id: 'pharaohStaff', name: '王家の杖', slot: 'weapon', weaponType: 'staff', rarity: 'epic', icon: 'staff', scenario: 'sandDynasty',
    description: '魔法で敵の弱点を突くと、ダメージがさらに1.25倍になる。弱点の無い敵には何も起きない。', stats: { int: 8, per: 2 }, tags: ['magic'],
    cards: [{ cardId: 'wLightning', count: 2 }],
    ability: { name: '王の裁き', effect: { modifier: 'weaknessDamage', multiplier: 1.25, if: [{ kind: 'cardCategory', category: 'magic' }] } },
  },
  {
    id: 'scorpionSting', name: '蠍の針', slot: 'weapon', weaponType: 'dagger', rarity: 'rare', icon: 'dagger', scenario: 'sandDynasty',
    description: '蠍の尾の針で作った短剣。素早い者に馴染む。', stats: { dex: 4, agi: 3 }, tags: ['physical', 'poison'],
    cards: [{ cardId: 'wtDaggerVenom', count: 2 }],
  },
  {
    id: 'desertBow', name: '砂漠の弓', slot: 'weapon', weaponType: 'bow', rarity: 'rare', icon: 'bow', scenario: 'sandDynasty',
    description: '乾いた風の中でも、まっすぐ飛ぶ弓。火の矢を放つ技が付く。', stats: { dex: 4, per: 4 }, tags: ['physical', 'fire'],
    cards: [{ cardId: 'wtBowFire', count: 2 }],
  },
  {
    id: 'sunScepter', name: '太陽の錫杖', slot: 'weapon', weaponType: 'scepter', rarity: 'legend', icon: 'scepter', scenario: 'sandDynasty',
    description: '回復のカードを使うと、自分に「聖光」が1つたまる（1ターンに1回・最大5）。ためた光で、次の聖属性の攻撃が強くなる。', stats: { int: 8, vit: 4 }, tags: ['holy', 'heal'],
    cards: [{ cardId: 'wtScepterJudgment', count: 2 }],
    ability: { name: '日輪の祈り', description: '回復のカードを使った後（1ターンに1回）：自分に「聖光」1（最大5。次の聖属性の攻撃が1つにつき+15%。撃つと消える）', effect: { when: 'afterCard', if: [{ kind: 'cardHasHeal' }, { kind: 'oncePerTurn', key: 'sunScepter' }], do: [{ kind: 'applyStatus', status: 'holyLight', amount: 1, to: 'self' }] } },
  },
  // ----- 鎧 -----
  { id: 'desertCloak', name: '砂漠の外套', slot: 'armor', rarity: 'rare', icon: 'robe', scenario: 'sandDynasty', description: '火属性のダメージを半分に和らげる。軽くて、戦闘の始めのブロックが多め。', maxHp: 6, startBlock: 4, tags: ['fire'], ability: { name: '砂よけ', effect: { modifier: 'elementGuard', element: 'fire', mode: 'half' } } },
  { id: 'royalBreastplate', name: '王家の胸当て', slot: 'armor', rarity: 'epic', icon: 'armor', scenario: 'sandDynasty', description: '戦闘の始めに、敵全員に弱体1と脆弱1を与える。王の威厳に、敵がひるむ。', maxHp: 12, tags: ['weak', 'vulnerable'], ability: { name: '王の威厳', effect: { when: 'battleStart', do: [{ kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }, { kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }] } } },
  { id: 'mummyWrappings', name: '千年の包帯', slot: 'armor', rarity: 'legend', icon: 'robe', scenario: 'sandDynasty', description: '毎ターンの始めに、自分がブロック4を得る。野営でよく休める。', maxHp: 20, explore: { campHeal: 0.5 }, tags: ['block'], ability: { name: '永遠の守り', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 4 }] } } },
  // ----- 装飾品 -----
  { id: 'canteen', name: '古い水筒', slot: 'accessory', rarity: 'rare', icon: 'charm', scenario: 'sandDynasty', description: '冷たい水がいつまでも尽きない。野営でよく休める。フォーカス最大+1。', focusMax: 1, explore: { campHeal: 0.25 } },
  { id: 'sacredScarab', name: '聖なる甲虫', slot: 'accessory', rarity: 'rare', icon: 'amulet', scenario: 'sandDynasty', description: '体力と運が上がる。', stats: { vit: 5, luk: 4 } },
  { id: 'sunRing', name: '太陽の指輪', slot: 'accessory', rarity: 'epic', icon: 'ring', scenario: 'sandDynasty', description: '属性の無い物理攻撃に、火の力が宿る。', tags: ['fire'], stats: { str: 4 }, ability: { name: '火の付与', effect: { modifier: 'convertElement', into: 'fire' } } },
  { id: 'moonAmulet', name: '月の首飾り', slot: 'accessory', rarity: 'epic', icon: 'amulet', scenario: 'sandDynasty', description: '3ターンごとの始めに、マナ+1を得て、HPが3回復する。', tags: ['mana', 'heal'], stats: { vit: 4 }, ability: { name: '月の満ち欠け', description: '3ターンごとの開始時（3・6・9ターン目…）：マナ+1、HPを3回復', effect: { when: 'turnStart', if: [{ kind: 'everyN', n: 3, key: 'moonAmulet' }], do: [{ kind: 'gainMana', amount: 1 }, { kind: 'heal', amount: 3, to: 'self' }] } } },
  { id: 'kingSignet', name: '王の印章指輪', slot: 'accessory', rarity: 'legend', icon: 'crest', scenario: 'sandDynasty', description: '敵を倒すたびに、固いブロックを得る。王の威光。', tags: ['block'], stats: { str: 6, vit: 6 }, ability: { name: '王の威光', effect: { when: 'kill', do: [{ kind: 'block', amount: 8 }] } } },
];
