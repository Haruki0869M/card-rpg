// 呪われた群島の固有装備（武器5・鎧3・装飾品5）。このシナリオの宝箱とショップにだけ出る（scenario）
// 方針: 雷（嵐）と、霧・呪いへの備え。武器の専用カードは、同じ武器種・同じレア度の既存武器と同じ物を使う
import type { ItemDef } from '../../../../types';

export const archipelagoGear: ItemDef[] = [
  // ----- 武器 -----
  {
    id: 'tempestAxe', name: '嵐呼びの斧', slot: 'weapon', weaponType: 'axe', rarity: 'epic', icon: 'axe', scenario: 'cursedArchipelago',
    description: '完全成功でランダムな敵1体に雷属性の追撃4。1ターンに1回。', stats: { str: 8, agi: 2 }, tags: ['physical', 'thunder'],
    cards: [{ cardId: 'wtAxeBloodlust', count: 2 }],
    ability: { name: '嵐の一撃', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'tempestAxe' }], do: [{ kind: 'damage', amount: 4, element: 'thunder', to: 'randomFoe' }] } },
  },
  {
    id: 'tideStaff', name: '潮騒の杖', slot: 'weapon', weaponType: 'staff', rarity: 'epic', icon: 'staff', scenario: 'cursedArchipelago',
    description: '魔法の完全成功で、味方全員がブロック3を得る。1ターンに1回。', stats: { int: 8, vit: 2 }, tags: ['magic', 'block'],
    cards: [{ cardId: 'wLightning', count: 2 }],
    ability: { name: '潮の守り', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'magic' }, { kind: 'oncePerTurn', key: 'tideStaff' }], do: [{ kind: 'block', amount: 3, to: 'allies' }] } },
  },
  {
    id: 'harpoon', name: '大物狩りの銛', slot: 'weapon', weaponType: 'spear', rarity: 'rare', icon: 'spear', scenario: 'cursedArchipelago',
    description: '大きな魚も一突き。力のある者に馴染む。', stats: { str: 5, dex: 3 }, tags: ['physical'],
    cards: [{ cardId: 'wtSpearHook', count: 2 }],
  },
  {
    id: 'mermaidDagger', name: '人魚の短剣', slot: 'weapon', weaponType: 'dagger', rarity: 'rare', icon: 'dagger', scenario: 'cursedArchipelago',
    description: '真珠色の刃を持つ短剣。素早い者に馴染む。', stats: { dex: 4, agi: 3 }, tags: ['physical'],
    cards: [{ cardId: 'wtDaggerVenom', count: 2 }],
  },
  {
    id: 'lighthouseScepter', name: '灯台守の錫杖', slot: 'weapon', weaponType: 'scepter', rarity: 'legend', icon: 'scepter', scenario: 'cursedArchipelago',
    description: '毎ターンの始めに、味方全員のHPを少し回復する。霧を払う、やさしい灯。', stats: { int: 8, vit: 4 }, tags: ['holy', 'heal'],
    cards: [{ cardId: 'wtScepterJudgment', count: 2 }],
    ability: { name: '霧払いの灯', effect: { when: 'turnStart', do: [{ kind: 'heal', amount: 4, to: 'allies' }] } },
  },
  // ----- 鎧 -----
  { id: 'sailorCoat', name: '船乗りの外套', slot: 'armor', rarity: 'rare', icon: 'robe', scenario: 'cursedArchipelago', description: '雷属性のダメージを半分に和らげる。戦闘の始めにブロックを得る。', maxHp: 8, startBlock: 3, tags: ['thunder'], ability: { name: '嵐除け', effect: { modifier: 'elementGuard', element: 'thunder', mode: 'half' } } },
  { id: 'barnacleArmor', name: 'フジツボの鎧', slot: 'armor', rarity: 'epic', icon: 'armor', scenario: 'cursedArchipelago', description: 'ダメージを受けるたびに、ブロック3を得る。', maxHp: 12, tags: ['block'], ability: { name: '硬い殻', effect: { when: 'hurt', do: [{ kind: 'block', amount: 3 }] } } },
  { id: 'admiralCloak', name: '提督の外套', slot: 'armor', rarity: 'legend', icon: 'robe', scenario: 'cursedArchipelago', description: '毎ターンの始めに、味方全員がブロック3を得る。野営でよく休める。', maxHp: 20, explore: { campHeal: 0.5 }, tags: ['block'], ability: { name: '号令', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 3, to: 'allies' }] } } },
  // ----- 装飾品 -----
  { id: 'oldCompass', name: '古い羅針盤', slot: 'accessory', rarity: 'rare', icon: 'charm', scenario: 'cursedArchipelago', description: '霧の中でも、進む先が分かる。世界マップで遠くまで見渡せる。', stats: { per: 4 }, explore: { vision: 1 } },
  { id: 'pearlNecklace', name: '真珠の首飾り', slot: 'accessory', rarity: 'rare', icon: 'amulet', scenario: 'cursedArchipelago', description: '運と器用さが上がる。', stats: { luk: 5, dex: 4 } },
  { id: 'stormRing', name: '嵐の指輪', slot: 'accessory', rarity: 'epic', icon: 'ring', scenario: 'cursedArchipelago', description: '属性の無い物理攻撃に、雷の力が宿る。', tags: ['thunder'], stats: { agi: 4 }, ability: { name: '雷の付与', effect: { modifier: 'convertElement', into: 'thunder' } } },
  { id: 'mistLantern', name: '霧払いのランタン', slot: 'accessory', rarity: 'epic', icon: 'charm', scenario: 'cursedArchipelago', description: '戦闘の始めに、味方全員の悪い状態異常が治る。', stats: { vit: 4 }, ability: { name: '霧を払う光', effect: { when: 'battleStart', do: [{ kind: 'cleanse', to: 'allies' }] } } },
  { id: 'goldenAnchor', name: '黄金の錨', slot: 'accessory', rarity: 'legend', icon: 'crest', scenario: 'cursedArchipelago', description: '敵を倒すたびに、固いブロックを得る。沈まない意志の証。', tags: ['block'], stats: { str: 6, vit: 6 }, ability: { name: '碇を下ろす', effect: { when: 'kill', do: [{ kind: 'block', amount: 8 }] } } },
];
