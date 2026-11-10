// 星降る天空城の固有装備（武器5・鎧3・装飾品5）。このシナリオの宝箱とショップにだけ出る（scenario）
// 方針: 雷・聖と星。武器の専用カードは、同じ武器種・同じレア度の既存武器と同じ物を使う
import type { ItemDef } from '../../../../types';

export const starGear: ItemDef[] = [
  // ----- 武器 -----
  {
    id: 'meteorAxe', name: '流星の斧', slot: 'weapon', weaponType: 'axe', rarity: 'epic', icon: 'axe', scenario: 'starCastle',
    description: '完全成功でランダムな敵1体に聖属性の追撃4。1ターンに1回。', stats: { str: 8, luk: 2 }, tags: ['physical', 'holy'],
    cards: [{ cardId: 'wtAxeBloodlust', count: 2 }],
    ability: { name: '流星の一撃', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'meteorAxe' }], do: [{ kind: 'damage', amount: 4, element: 'holy', to: 'randomFoe' }] } },
  },
  {
    id: 'constellationStaff', name: '星座の杖', slot: 'weapon', weaponType: 'staff', rarity: 'epic', icon: 'staff', scenario: 'starCastle',
    description: '魔法の完全成功でランダムな敵1体に雷属性の追撃4。1ターンに1回。', stats: { int: 8, per: 2 }, tags: ['magic', 'thunder'],
    cards: [{ cardId: 'wLightning', count: 2 }],
    ability: { name: '星座の雷', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'magic' }, { kind: 'dealtDamage' }, { kind: 'oncePerTurn', key: 'constellationStaff' }], do: [{ kind: 'damage', amount: 4, element: 'thunder', to: 'randomFoe' }] } },
  },
  {
    id: 'angelSpear', name: '天使の槍', slot: 'weapon', weaponType: 'spear', rarity: 'rare', icon: 'spear', scenario: 'starCastle',
    description: '白い羽根のついた槍。力のある者に馴染む。', stats: { str: 5, dex: 3 }, tags: ['physical', 'holy'],
    cards: [{ cardId: 'wtSpearHook', count: 2 }],
  },
  {
    id: 'moonDagger', name: '三日月の短剣', slot: 'weapon', weaponType: 'dagger', rarity: 'rare', icon: 'dagger', scenario: 'starCastle',
    description: '三日月の形をした短剣。素早い者に馴染む。', stats: { dex: 4, agi: 3 }, tags: ['physical'],
    cards: [{ cardId: 'wtDaggerVenom', count: 2 }],
  },
  {
    id: 'starScepter', name: '星環の錫杖', slot: 'weapon', weaponType: 'scepter', rarity: 'legend', icon: 'scepter', scenario: 'starCastle',
    description: '毎ターンの始めに、味方全員のHPを少し回復する。星の光のやさしさ。', stats: { int: 8, vit: 4 }, tags: ['holy', 'heal'],
    cards: [{ cardId: 'wtScepterJudgment', count: 2 }],
    ability: { name: '星の癒やし', effect: { when: 'turnStart', do: [{ kind: 'heal', amount: 4, to: 'allies' }] } },
  },
  // ----- 鎧 -----
  { id: 'cloudCloak', name: '雲の外套', slot: 'armor', rarity: 'rare', icon: 'robe', scenario: 'starCastle', description: '雷属性のダメージを半分に和らげる。戦闘の始めにブロックを得る。', maxHp: 8, startBlock: 3, tags: ['thunder'], ability: { name: '雷除け', effect: { modifier: 'elementGuard', element: 'thunder', mode: 'half' } } },
  { id: 'angelRobe', name: '天使の羽衣', slot: 'armor', rarity: 'epic', icon: 'robe', scenario: 'starCastle', description: 'ダメージを受けるたびに、ブロック3を得る。', maxHp: 12, tags: ['block'], ability: { name: '羽の守り', effect: { when: 'hurt', do: [{ kind: 'block', amount: 3 }] } } },
  { id: 'stardustArmor', name: '星屑の鎧', slot: 'armor', rarity: 'legend', icon: 'armor', scenario: 'starCastle', description: '毎ターンの始めに、味方全員がブロック3を得る。野営でよく休める。', maxHp: 20, explore: { campHeal: 0.5 }, tags: ['block'], ability: { name: '星の加護', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 3, to: 'allies' }] } } },
  // ----- 装飾品 -----
  { id: 'oldStarChart', name: '古い星図', slot: 'accessory', rarity: 'rare', icon: 'charm', scenario: 'starCastle', description: '星の位置から、道が分かる。世界マップで遠くまで見渡せる。', stats: { per: 4 }, explore: { vision: 1 } },
  { id: 'moonlightPendant', name: '月光のペンダント', slot: 'accessory', rarity: 'rare', icon: 'amulet', scenario: 'starCastle', description: '知力と運が上がる。', stats: { int: 5, luk: 4 } },
  { id: 'meteorRing', name: '流星の指輪', slot: 'accessory', rarity: 'epic', icon: 'ring', scenario: 'starCastle', description: '属性の無い物理攻撃に、聖なる力が宿る。', tags: ['holy'], stats: { dex: 4 }, ability: { name: '聖の付与', effect: { modifier: 'convertElement', into: 'holy' } } },
  { id: 'clockworkWatch', name: '時計仕掛けの懐中時計', slot: 'accessory', rarity: 'epic', icon: 'charm', scenario: 'starCastle', description: 'カードのスロットが全部失敗した時、マナ+2を得て、カードを1枚引く。1回の戦闘で1回だけ。', tags: ['mana', 'draw'], stats: { vit: 4 }, ability: { name: '時を戻す', description: 'カードのスロットが全部失敗した時（1回の戦闘で1回まで）：マナ+2、カードを1枚引く', effect: { when: 'afterCard', if: [{ kind: 'cardSlots', min: 1 }, { kind: 'successesAtMost', count: 0 }, { kind: 'perBattle', key: 'clockworkWatch', max: 1 }], do: [{ kind: 'gainMana', amount: 2 }, { kind: 'draw', amount: 1 }] } } },
  { id: 'starRingCrown', name: '星環の冠', slot: 'accessory', rarity: 'legend', icon: 'crest', scenario: 'starCastle', description: '戦闘の始めに、マナ+2を得て、カードを1枚引く。星に選ばれた者の証。', tags: ['mana', 'draw'], stats: { per: 8, int: 6 }, ability: { name: '星々の導き', effect: { when: 'battleStart', do: [{ kind: 'gainMana', amount: 2 }, { kind: 'draw', amount: 1 }] } } },
];
