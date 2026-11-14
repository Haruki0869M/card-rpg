// 星降る天空城の固有装備（武器5・鎧3・装飾品5）。このシナリオの宝箱とショップにだけ出る（scenario）
// 方針: 雷・聖と星。武器の専用カードは、同じ武器種・同じレア度の既存武器と同じ物を使う
import type { ItemDef } from '../../../../types';

export const starGear: ItemDef[] = [
  // ----- 武器 -----
  {
    id: 'constellationStaff', name: '星座の杖', slot: 'weapon', weaponType: 'staff', rarity: 'epic', icon: 'staff', scenario: 'starCastle',
    description: '相手に付いている悪い状態異常が多いほど、魔法のダメージが増える。1種類につき+8%（最大+24%）。', stats: { int: 8, per: 2 }, tags: ['magic'],
    cards: [{"cardId":"axElementChain","count":2}],
    ability: { name: '星座を結ぶ', effect: { modifier: 'damageDealt', multiplier: 1, scale: { by: 'targetStatuses', per: 0.08, max: 0.24 }, if: [{ kind: 'cardCategory', category: 'magic' }] } },
  },
  {
    id: 'starScepter', name: '星環の錫杖', slot: 'weapon', weaponType: 'scepter', rarity: 'legend', icon: 'scepter', scenario: 'starCastle',
    description: '1回の戦闘で2回、次に使うカードのスロットを先に見て、1回だけ振り直せる。星を読み続けた女王の環。', stats: { int: 8, vit: 4 }, tags: ['holy', 'focus'],
    cards: [{ cardId: 'lnSeiDivinePunish', count: 2 }],
    ability: { name: '星の導き手', effect: { modifier: 'slotPreview', uses: 2 } },
  },
  // ----- 鎧 -----
  { id: 'cloudCloak', name: '雲の外套', slot: 'armor', rarity: 'rare', icon: 'robe', description: '聖属性のダメージを半分に和らげる。戦闘の始めにブロックを得る。', maxHp: 8, startBlock: 3, tags: ['holy'], ability: { name: '光よけ', effect: { modifier: 'elementGuard', element: 'holy', mode: 'half' } } },
  { id: 'stardustArmor', name: '星屑の鎧', slot: 'armor', rarity: 'legend', icon: 'armor', scenario: 'starCastle', description: '2枠以上のカードが完全成功すると、味方全員に「応援」1（次のカードの成功率+10%・最大3）。1ターンに1回。野営でよく休める。', maxHp: 20, explore: { campHeal: 0.5 }, tags: ['focus'], ability: { name: '降る星屑', description: '2枠以上のカードが完全成功した時（1ターンに1回）：味方全員に「応援」1（次に使うカードの成功率+10%。最大3）', effect: { when: 'perfect', if: [{ kind: 'cardSlots', min: 2 }, { kind: 'oncePerTurn', key: 'stardustArmor' }], do: [{ kind: 'applyStatus', status: 'inspired', amount: 1, to: 'allies' }] } } },
  // ----- 装飾品 -----
  { id: 'oldStarChart', name: '古い星図', slot: 'accessory', rarity: 'rare', icon: 'charm', scenario: 'starCastle', description: '星の位置から、道が分かる。ダンジョンの地図に、通路と扉の場所が最初から出る（部屋の種類は入るまで分からない）。', explore: { reveal: 'layout' } },
  { id: 'meteorRing', name: '流星の指輪', slot: 'accessory', rarity: 'epic', icon: 'ring', description: '属性の無い物理攻撃に、聖なる力が宿る。', tags: ['holy'], stats: { dex: 4 }, ability: { name: '聖の付与', effect: { modifier: 'convertElement', into: 'holy' } } },
  { id: 'clockworkWatch', name: '時計仕掛けの懐中時計', slot: 'accessory', rarity: 'epic', icon: 'charm', scenario: 'starCastle', description: 'カードのスロットが全部失敗した時、マナ+2を得て、カードを1枚引く。1回の戦闘で1回だけ。', tags: ['mana', 'draw'], stats: { vit: 4 }, ability: { name: '時を戻す', description: 'カードのスロットが全部失敗した時（1回の戦闘で1回まで）：マナ+2、カードを1枚引く', effect: { when: 'afterCard', if: [{ kind: 'cardSlots', min: 1 }, { kind: 'successesAtMost', count: 0 }, { kind: 'perBattle', key: 'clockworkWatch', max: 1 }], do: [{ kind: 'gainMana', amount: 2 }, { kind: 'draw', amount: 1 }] } } },
  { id: 'starRingCrown', name: '星環の冠', slot: 'accessory', rarity: 'legend', icon: 'crest', scenario: 'starCastle', description: '戦闘の始めに、マナ+2を得て、カードを1枚引く。星に選ばれた者の証。', tags: ['mana', 'draw'], stats: { per: 8, int: 6 }, ability: { name: '星々の導き', effect: { when: 'battleStart', do: [{ kind: 'gainMana', amount: 2 }, { kind: 'draw', amount: 1 }] } } },
];
