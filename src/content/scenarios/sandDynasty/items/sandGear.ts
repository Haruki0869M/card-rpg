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
    description: '魔法の完全成功でランダムな敵1体に雷属性の追撃4。1ターンに1回。', stats: { int: 8, per: 2 }, tags: ['magic', 'thunder'],
    cards: [{ cardId: 'wLightning', count: 2 }],
    ability: { name: '王家の雷', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'magic' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'pharaohStaff' }], do: [{ kind: 'damage', amount: 4, element: 'thunder', to: 'randomFoe' }] } },
  },
  {
    id: 'scorpionSting', name: '蠍の針', slot: 'weapon', weaponType: 'dagger', rarity: 'rare', icon: 'dagger', scenario: 'sandDynasty',
    description: '蠍の尾の針で作った短剣。素早い者に馴染む。', stats: { dex: 4, agi: 3 }, tags: ['physical', 'poison'],
    cards: [{ cardId: 'wtDaggerVenom', count: 2 }],
  },
  {
    id: 'desertBow', name: '砂漠の弓', slot: 'weapon', weaponType: 'bow', rarity: 'rare', icon: 'bow', scenario: 'sandDynasty',
    description: '乾いた風の中でも、まっすぐ飛ぶ弓。', stats: { dex: 5, per: 3 }, tags: ['physical'],
    cards: [{ cardId: 'wDoubleShot', count: 2 }],
  },
  {
    id: 'sunScepter', name: '太陽の錫杖', slot: 'weapon', weaponType: 'scepter', rarity: 'legend', icon: 'scepter', scenario: 'sandDynasty',
    description: '毎ターンの始めに、味方全員がブロック4を得る。砂漠の太陽の加護。', stats: { int: 8, vit: 4 }, tags: ['holy', 'block'],
    cards: [{ cardId: 'wtScepterJudgment', count: 2 }],
    ability: { name: '太陽の加護', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 4, to: 'allies' }] } },
  },
  // ----- 鎧 -----
  { id: 'desertCloak', name: '砂漠の外套', slot: 'armor', rarity: 'rare', icon: 'robe', scenario: 'sandDynasty', description: '火属性のダメージを半分に和らげる。戦闘の始めにブロックを得る。', maxHp: 8, startBlock: 3, tags: ['fire'], ability: { name: '熱除け', effect: { modifier: 'elementGuard', element: 'fire', mode: 'half' } } },
  { id: 'royalBreastplate', name: '王家の胸当て', slot: 'armor', rarity: 'epic', icon: 'armor', scenario: 'sandDynasty', description: 'ダメージを受けるたびに、ブロック3を得る。', maxHp: 12, tags: ['block'], ability: { name: '黄金の守り', effect: { when: 'hurt', do: [{ kind: 'block', amount: 3 }] } } },
  { id: 'mummyWrappings', name: '千年の包帯', slot: 'armor', rarity: 'legend', icon: 'robe', scenario: 'sandDynasty', description: '毎ターンの始めに、自分がブロック4を得る。野営でよく休める。', maxHp: 20, explore: { campHeal: 0.5 }, tags: ['block'], ability: { name: '永遠の守り', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 4 }] } } },
  // ----- 装飾品 -----
  { id: 'canteen', name: '古い水筒', slot: 'accessory', rarity: 'rare', icon: 'charm', scenario: 'sandDynasty', description: '冷たい水がいつまでも尽きない。野営でよく休める。フォーカス最大+1。', focusMax: 1, explore: { campHeal: 0.25 } },
  { id: 'sacredScarab', name: '聖なる甲虫', slot: 'accessory', rarity: 'rare', icon: 'amulet', scenario: 'sandDynasty', description: '運と器用さが上がる。', stats: { luk: 5, dex: 4 } },
  { id: 'sunRing', name: '太陽の指輪', slot: 'accessory', rarity: 'epic', icon: 'ring', scenario: 'sandDynasty', description: '属性の無い物理攻撃に、火の力が宿る。', tags: ['fire'], stats: { str: 4 }, ability: { name: '火の付与', effect: { modifier: 'convertElement', into: 'fire' } } },
  { id: 'moonAmulet', name: '月の首飾り', slot: 'accessory', rarity: 'epic', icon: 'amulet', scenario: 'sandDynasty', description: '戦闘の始めに、味方全員の悪い状態異常が治る。', stats: { vit: 4 }, ability: { name: '月の癒やし', effect: { when: 'battleStart', do: [{ kind: 'cleanse', to: 'allies' }] } } },
  { id: 'kingSignet', name: '王の印章指輪', slot: 'accessory', rarity: 'legend', icon: 'crest', scenario: 'sandDynasty', description: '敵を倒すたびに、固いブロックを得る。王の威光。', tags: ['block'], stats: { str: 6, vit: 6 }, ability: { name: '王の威光', effect: { when: 'kill', do: [{ kind: 'block', amount: 8 }] } } },
];
