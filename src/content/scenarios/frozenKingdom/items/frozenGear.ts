// 凍てつく王国の固有装備（武器5・鎧3・装飾品5）。このシナリオの宝箱とショップにだけ出る（scenario）
// 方針: 氷の攻撃に強く、凍結や寒さに備えられる。武器の専用カードは、同じ武器種・同じレア度の既存武器と同じ物を使う
import type { ItemDef } from '../../../../types';

export const frozenGear: ItemDef[] = [
  // ----- 武器 -----
  {
    id: 'frostbreakerAxe', name: '霜砕きの斧', slot: 'weapon', weaponType: 'axe', rarity: 'epic', icon: 'axe', scenario: 'frozenKingdom',
    description: '完全成功でランダムな敵1体に氷片の追撃4。1ターンに1回。', stats: { str: 8, vit: 2 }, tags: ['physical', 'ice'],
    cards: [{ cardId: 'wtAxeBloodlust', count: 2 }],
    ability: { name: '氷砕き', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'frostbreakerAxe' }], do: [{ kind: 'damage', amount: 4, element: 'ice', to: 'randomFoe' }] } },
  },
  {
    id: 'crystalStaff', name: '氷晶の杖', slot: 'weapon', weaponType: 'staff', rarity: 'epic', icon: 'staff', scenario: 'frozenKingdom',
    description: '魔法の完全成功でランダムな敵1体に氷属性の追撃4。1ターンに1回。', stats: { int: 8, per: 2 }, tags: ['magic', 'ice'],
    cards: [{ cardId: 'wLightning', count: 2 }],
    ability: { name: '氷晶の輝き', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'magic' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'crystalStaff' }], do: [{ kind: 'damage', amount: 4, element: 'ice', to: 'randomFoe' }] } },
  },
  {
    id: 'whiteWolfFang', name: '白狼の牙', slot: 'weapon', weaponType: 'dagger', rarity: 'rare', icon: 'dagger', scenario: 'frozenKingdom',
    description: '白い狼の牙で作った短剣。力のある者にも馴染む。踊るように何度も斬る技が付く。', stats: { str: 3, dex: 4 }, tags: ['physical'],
    cards: [{ cardId: 'wtDaggerDance', count: 2 }],
  },
  {
    id: 'blizzardBow', name: '吹雪の弓', slot: 'weapon', weaponType: 'bow', rarity: 'rare', icon: 'bow', scenario: 'frozenKingdom',
    description: '吹雪のように、敵全員へ矢を降らせる弓。', stats: { dex: 5, per: 3 }, tags: ['physical'],
    cards: [{ cardId: 'wtBowShower', count: 2 }],
  },
  {
    id: 'springbringerScepter', name: '春告げの錫杖', slot: 'weapon', weaponType: 'scepter', rarity: 'legend', icon: 'scepter', scenario: 'frozenKingdom',
    description: '毎ターンの始めに、味方全員のHPを少し回復する。百年ぶりの、春の光。', stats: { int: 8, vit: 4 }, tags: ['holy', 'heal'],
    cards: [{ cardId: 'wtScepterJudgment', count: 2 }],
    ability: { name: '春の光', effect: { when: 'turnStart', do: [{ kind: 'heal', amount: 4, to: 'allies' }] } },
  },
  // ----- 鎧 -----
  { id: 'whiteWolfFur', name: '白狼の毛皮', slot: 'armor', rarity: 'rare', icon: 'robe', scenario: 'frozenKingdom', description: '氷属性のダメージを半分に和らげる。戦闘の始めにブロックを得る。', maxHp: 8, startBlock: 4, tags: ['ice'], ability: { name: '雪狼の守り', effect: { modifier: 'elementGuard', element: 'ice', mode: 'half' } } },
  { id: 'iceWardArmor', name: '氷除けの鎧', slot: 'armor', rarity: 'epic', icon: 'armor', scenario: 'frozenKingdom', description: '氷属性のダメージを吸収して、その分HPを回復する。', maxHp: 12, tags: ['ice'], ability: { name: '氷の吸収', effect: { modifier: 'elementGuard', element: 'ice', mode: 'absorb' } } },
  { id: 'springWaitCloak', name: '春待ちの外套', slot: 'armor', rarity: 'legend', icon: 'robe', scenario: 'frozenKingdom', description: '氷属性のダメージを受けない。野営でよく休める。', maxHp: 22, explore: { campHeal: 0.5 }, tags: ['ice'], ability: { name: '凍らぬ体', effect: { modifier: 'elementGuard', element: 'ice', mode: 'immune' } } },
  // ----- 装飾品 -----
  { id: 'lampLantern', name: '灯火のランタン', slot: 'accessory', rarity: 'rare', icon: 'charm', scenario: 'frozenKingdom', description: '消えない小さな灯。世界マップで遠くまで見渡せる。', focusMax: 1, explore: { vision: 1 } },
  { id: 'frostFlowerCharm', name: '霜花のお守り', slot: 'accessory', rarity: 'rare', icon: 'charm', scenario: 'frozenKingdom', description: '凍った花の形のお守り。感知と運が上がる。', stats: { per: 5, luk: 4 } },
  { id: 'crystalNecklace', name: '氷晶の首飾り', slot: 'accessory', rarity: 'epic', icon: 'amulet', scenario: 'frozenKingdom', description: '属性の無い物理攻撃に、氷の力が宿る。', tags: ['ice'], stats: { int: 4 }, ability: { name: '氷の付与', effect: { modifier: 'convertElement', into: 'ice' } } },
  { id: 'thawRing', name: '雪解けの指輪', slot: 'accessory', rarity: 'epic', icon: 'ring', scenario: 'frozenKingdom', description: '凍結の状態異常を持つターンの始めに、自分の凍結を治す。', tags: ['ice'], stats: { vit: 4 }, ability: { name: '雪解け', effect: { when: 'turnStart', if: [{ kind: 'selfStatus', status: 'freeze' }], do: [{ kind: 'cleanse', to: 'self' }] } } },
  { id: 'everIceBracer', name: '溶けぬ氷の腕輪', slot: 'accessory', rarity: 'legend', icon: 'crest', scenario: 'frozenKingdom', description: '敵を倒すたびに、固い氷のブロックを得る。', tags: ['ice'], stats: { str: 6, vit: 6 }, ability: { name: '氷の鎧', effect: { when: 'kill', do: [{ kind: 'block', amount: 8 }] } } },
];
