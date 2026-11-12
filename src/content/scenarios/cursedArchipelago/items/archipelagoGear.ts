// 呪われた群島の固有装備（武器5・鎧3・装飾品5）。このシナリオの宝箱とショップにだけ出る（scenario）
// 方針: 雷（嵐）と、霧・呪いへの備え。武器の専用カードは、同じ武器種・同じレア度の既存武器と同じ物を使う
import type { ItemDef } from '../../../../types';

export const archipelagoGear: ItemDef[] = [
  // ----- 武器 -----
  {
    id: 'tideStaff', name: '潮騒の杖', slot: 'weapon', weaponType: 'staff', rarity: 'epic', icon: 'staff', scenario: 'cursedArchipelago',
    description: '自分のブロックが8以上ある間、魔法のダメージが1.25倍になる。守りを固めてから撃つ。', stats: { int: 8, vit: 2 }, tags: ['magic', 'block'],
    cards: [{ cardId: 'wLightning', count: 2 }],
    ability: { name: '満ち潮', effect: { modifier: 'damageDealt', multiplier: 1.25, if: [{ kind: 'cardCategory', category: 'magic' }, { kind: 'selfBlockAtLeast', n: 8 }] } },
  },
  {
    id: "harpoon", name: "大物狩りの銛", slot: "weapon", weaponType: "spear", rarity: "rare", icon: "spear", scenario: "cursedArchipelago",
    description: "ボス・中ボスとの戦闘の間、物理カードの成功率+10%。", stats: {"str":6,"dex":2}, tags: ["physical"],
    cards: [{"cardId":"lnBuFlurry","count":2}],
    ability: {"name":"大物狩り","description":"ボス・中ボスとの戦闘の間、物理カードの成功率+10%。","effect":{"modifier":"cardChance","bonus":10,"if":[{"kind":"cardCategory","category":"physical"},{"kind":"bossBattle"}]}},
  },
  {
    id: 'lighthouseScepter', name: '灯台守の錫杖', slot: 'weapon', weaponType: 'scepter', rarity: 'legend', icon: 'scepter', scenario: 'cursedArchipelago',
    description: '回復のカードが完全成功すると、ランダムな敵1体に「脆弱」1を与える。1ターンに1回。灯が霧の中の敵を照らす。', stats: { int: 8, vit: 4 }, tags: ['holy', 'heal', 'vulnerable'],
    cards: [{ cardId: 'lnSeiDivinePunish', count: 2 }],
    ability: { name: '霧払いの灯', description: '回復のカードが完全成功した時（1ターンに1回）：ランダムな敵1体に「脆弱」1', effect: { when: 'perfect', if: [{ kind: 'cardHasHeal' }, { kind: 'oncePerTurn', key: 'lighthouseScepter' }], do: [{ kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'randomFoe' }] } },
  },
  // ----- 鎧 -----
  { id: 'sailorCoat', name: '船乗りの外套', slot: 'armor', rarity: 'rare', icon: 'robe', description: '雷属性のダメージを半分に和らげる。戦闘の始めにブロックを得る。', maxHp: 8, startBlock: 3, tags: ['thunder'], ability: { name: '嵐除け', effect: { modifier: 'elementGuard', element: 'thunder', mode: 'half' } } },
  { id: 'barnacleArmor', name: 'フジツボの鎧', slot: 'armor', rarity: 'epic', icon: 'armor', scenario: 'cursedArchipelago', description: 'ダメージを受けるたびに、攻撃してきた敵に「毒」2と4ダメージを返す。', maxHp: 12, tags: ['poison'], ability: { name: '棘の殻', description: 'ダメージを受けた時：攻撃してきた相手に「毒」2と4ダメージ', effect: { when: 'hurt', do: [{ kind: 'applyStatus', status: 'poison', amount: 2, to: 'attacker' }, { kind: 'retaliate', amount: 4 }] } } },
  { id: 'admiralCloak', name: '提督の外套', slot: 'armor', rarity: 'legend', icon: 'robe', scenario: 'cursedArchipelago', description: '毎ターンの始めに、味方全員がブロック3を得る。野営でよく休める。', maxHp: 20, explore: { campHeal: 0.5 }, tags: ['block'], ability: { name: '号令', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 3, to: 'allies' }] } } },
  // ----- 装飾品 -----
  { id: 'oldCompass', name: '古い羅針盤', slot: 'accessory', rarity: 'rare', icon: 'charm', scenario: 'cursedArchipelago', description: '休む場所を指す羅針盤。ダンジョンの地図に、休憩部屋が最初から出る。', explore: { reveal: 'rest' } },
  { id: 'stormRing', name: '嵐の指輪', slot: 'accessory', rarity: 'epic', icon: 'ring', description: '属性の無い物理攻撃に、雷の力が宿る。', tags: ['thunder'], stats: { agi: 4 }, ability: { name: '雷の付与', effect: { modifier: 'convertElement', into: 'thunder' } } },
  { id: 'mistLantern', name: '霧払いのランタン', slot: 'accessory', rarity: 'epic', icon: 'charm', scenario: 'cursedArchipelago', description: 'そのターンに最初に使うカードの成功率が、15%上がる。', tags: ['heavy', 'highCost'], stats: { vit: 4 }, ability: { name: '霧を払う光', description: 'そのターンに最初に使うカードの成功率+15%', effect: { modifier: 'cardChance', bonus: 15, if: [{ kind: 'playedAtMost', count: 0 }] } } },
  { id: 'goldenAnchor', name: '黄金の錨', slot: 'accessory', rarity: 'legend', icon: 'crest', scenario: 'cursedArchipelago', description: 'ターンの始めに、前のターンのブロックが最大15まで残る。沈まない意志の証。', tags: ['block'], stats: { vit: 10 }, ability: { name: '不動の錨', description: 'ターンの始めに、前のターンのブロックが最大15まで残る', effect: { modifier: 'keepBlock', max: 15 } } },
];
