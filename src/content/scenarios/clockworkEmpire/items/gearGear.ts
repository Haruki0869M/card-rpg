// 機械仕掛けの帝国の固有装備（武器5・鎧3・装飾品5）。このシナリオの宝箱とショップにだけ出る（scenario）
// 方針: 雷と蒸気（火）、仕掛けと罠。武器の専用カードは、同じ武器種・同じレア度の既存武器と同じ物を使う
import type { ItemDef } from '../../../../types';

export const gearGearItems: ItemDef[] = [
  // ----- 武器 -----
  {
    id: 'steamHammerAxe', name: '蒸気ハンマー斧', slot: 'weapon', weaponType: 'axe', rarity: 'epic', icon: 'axe', scenario: 'clockworkEmpire',
    description: '完全成功でランダムな敵1体に火属性の追撃4。1ターンに1回。', stats: { str: 8, vit: 2 }, tags: ['physical', 'fire'],
    cards: [{ cardId: 'wtAxeBloodlust', count: 2 }],
    ability: { name: '蒸気噴射', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'steamHammerAxe' }], do: [{ kind: 'damage', amount: 4, element: 'fire', to: 'randomFoe' }] } },
  },
  {
    id: 'teslaStaff', name: '放電の杖', slot: 'weapon', weaponType: 'staff', rarity: 'epic', icon: 'staff', scenario: 'clockworkEmpire',
    description: '魔法の完全成功でランダムな敵1体に雷属性の追撃4。1ターンに1回。', stats: { int: 8, dex: 2 }, tags: ['magic', 'thunder'],
    cards: [{ cardId: 'wLightning', count: 2 }],
    ability: { name: '放電', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'magic' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'teslaStaff' }], do: [{ kind: 'damage', amount: 4, element: 'thunder', to: 'randomFoe' }] } },
  },
  {
    id: 'gearSpear', name: '歯車の槍', slot: 'weapon', weaponType: 'spear', rarity: 'rare', icon: 'spear', scenario: 'clockworkEmpire',
    description: '穂先が歯車になった槍。力のある者に馴染む。', stats: { str: 5, dex: 3 }, tags: ['physical'],
    cards: [{ cardId: 'wtSpearHook', count: 2 }],
  },
  {
    id: 'clockworkBow', name: '機械仕掛けの弓', slot: 'weapon', weaponType: 'bow', rarity: 'rare', icon: 'bow', scenario: 'clockworkEmpire',
    description: 'ゼンマイ仕掛けで連射できる弓。', stats: { dex: 5, per: 3 }, tags: ['physical'],
    cards: [{ cardId: 'wDoubleShot', count: 2 }],
  },
  {
    id: 'sageScepter', name: '賢者の錫杖', slot: 'weapon', weaponType: 'scepter', rarity: 'legend', icon: 'scepter', scenario: 'clockworkEmpire',
    description: '毎ターンの始めに、味方全員がブロック4を得る。時を刻む杖。', stats: { int: 8, vit: 4 }, tags: ['holy', 'block'],
    cards: [{ cardId: 'wtScepterJudgment', count: 2 }],
    ability: { name: '時の守り', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 4, to: 'allies' }] } },
  },
  // ----- 鎧 -----
  { id: 'insulatedCoat', name: '断熱コート', slot: 'armor', rarity: 'rare', icon: 'robe', scenario: 'clockworkEmpire', description: '火属性のダメージを半分に和らげる。厚手で、最大HPが多めに上がる。戦闘の始めにブロックを得る。', maxHp: 10, startBlock: 2, tags: ['fire'], ability: { name: '熱除け', effect: { modifier: 'elementGuard', element: 'fire', mode: 'half' } } },
  { id: 'steelPlate', name: '鋼鉄の胸当て', slot: 'armor', rarity: 'epic', icon: 'armor', scenario: 'clockworkEmpire', description: 'ダメージを受けるたびに、ブロック3を得る。', maxHp: 12, tags: ['block'], ability: { name: '鋼の守り', effect: { when: 'hurt', do: [{ kind: 'block', amount: 3 }] } } },
  { id: 'gearGuardian', name: '歯車の守護鎧', slot: 'armor', rarity: 'legend', icon: 'armor', scenario: 'clockworkEmpire', description: '戦闘の始めに、歯車の番兵を1体呼ぶ。番兵は毎ターンの終わりに、ランダムな敵へ3ダメージを与える。野営でよく休める。', maxHp: 20, explore: { campHeal: 0.5 }, tags: ['summon'], ability: { name: '歯車の番兵', effect: { when: 'battleStart', do: [{ kind: 'summon', id: 'gearSentinel', name: '歯車の番兵', icon: '⚙', damage: 3, turns: 99 }] } } },
  // ----- 装飾品 -----
  { id: 'engineerGoggles', name: '技師のゴーグル', slot: 'accessory', rarity: 'rare', icon: 'charm', scenario: 'clockworkEmpire', description: '仕掛けや罠がよく見える。器用さが上がり、世界マップで遠くまで見渡せる。', stats: { dex: 4 }, explore: { vision: 1 } },
  { id: 'luckyBolt', name: '幸運のボルト', slot: 'accessory', rarity: 'rare', icon: 'amulet', scenario: 'clockworkEmpire', description: '運と器用さが上がる。', stats: { luk: 5, dex: 4 } },
  { id: 'sparkRing', name: '火花の指輪', slot: 'accessory', rarity: 'epic', icon: 'ring', scenario: 'clockworkEmpire', description: 'コスト0のカードを使うと、ランダムな敵に雷3ダメージと「火傷」1を与える。1ターンに1回。', tags: ['thunder', 'fire', 'free'], stats: { agi: 4 }, ability: { name: '散る火花', description: 'コスト0のカードを使った後（1ターンに1回）：ランダムな敵1体に3の雷属性ダメージ、ランダムな敵1体に「火傷」1', effect: { when: 'afterCard', if: [{ kind: 'cardCost', max: 0 }, { kind: 'oncePerTurn', key: 'sparkRing' }], do: [{ kind: 'damage', amount: 3, element: 'thunder', to: 'randomFoe' }, { kind: 'applyStatus', status: 'burn', amount: 1, to: 'randomFoe' }] } } },
  { id: 'coolantFlask', name: '冷却水のフラスコ', slot: 'accessory', rarity: 'epic', icon: 'charm', scenario: 'clockworkEmpire', description: '同じターンに3枚目のカードを使うと、カードを1枚引く。1ターンに1回。', tags: ['draw', 'free'], stats: { vit: 4 }, ability: { name: '冷却', effect: { when: 'afterCard', if: [{ kind: 'playedThisTurn', atLeast: 2 }, { kind: 'oncePerTurn', key: 'coolantFlask' }], do: [{ kind: 'draw', amount: 1 }] } } },
  { id: 'masterCore', name: 'マスターコア', slot: 'accessory', rarity: 'legend', icon: 'crest', scenario: 'clockworkEmpire', description: '敵を倒すたびに、固いブロックを得る。大機械の心臓の欠片。', tags: ['block'], stats: { str: 6, vit: 6 }, ability: { name: '核の力', effect: { when: 'kill', do: [{ kind: 'block', amount: 8 }] } } },
];
