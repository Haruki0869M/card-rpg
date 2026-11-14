// 凍てつく王国の固有装備（武器5・鎧3・装飾品5）。このシナリオの宝箱とショップにだけ出る（scenario）
// 方針: 氷の攻撃に強く、凍結や寒さに備えられる。武器の専用カードは、同じ武器種・同じレア度の既存武器と同じ物を使う
// シナリオ2の作り直し 区切り3a（計画 §2-2・§8-2）: 伝説品3つ（春告げの錫杖・春待ちの外套・溶けぬ氷の腕輪）は、このシナリオの災厄の専用の装備に移す（scourgeGear = 落とす災厄）。
// その災厄が登録されてシナリオ2の一覧に入るまでは、今までどおり宝箱・店から出る。広い地図の冒険では災厄だけが落とし、古い 8×35 の地図の冒険では今までどおり（engine/game/world/scourgeGear.ts）
import type { ItemDef } from '../../../../types';

export const frozenGear: ItemDef[] = [
  // ----- 武器 -----
  {
    id: "blizzardBow", name: "吹雪の弓", slot: "weapon", weaponType: "bow", rarity: "rare", icon: "bow", scenario: "frozenKingdom",
    description: "敵全体を狙うカードが完全成功した時、ランダムな敵1体に「凍結」1（ボスには代わりに「弱体」1）。1ターンに1回。", stats: {"dex":5,"per":3}, tags: ["physical","ice","freeze","aoe"],
    cards: [{"cardId":"wtAxeWhirl","count":2}],
    ability: {"name":"吹雪","description":"敵全体を狙うカードが完全成功した時、ランダムな敵1体に「凍結」1（ボスには代わりに「弱体」1）。1ターンに1回。","effect":{"when":"perfect","if":[{"kind":"cardAoe"},{"kind":"oncePerTurn","key":"blizzardBow"}],"do":[{"kind":"applyStatus","status":"freeze","amount":1,"bossStatus":"weak","to":"randomFoe"}]}},
  },
  {
    id: "springbringerScepter", name: "春告げの錫杖", slot: "weapon", weaponType: "scepter", rarity: "legend", icon: "scepter", scenario: "frozenKingdom", scourgeGear: "lampEaterShade",
    description: "ターン開始時、味方全員の悪い状態異常を1つ治す。", stats: {"int":8,"vit":4}, tags: ["heal","support"],
    cards: [{"cardId":"wtScepterMiracle","count":2}],
    ability: {"name":"雪解けの光","description":"ターン開始時、味方全員の悪い状態異常を1つ治す。","effect":{"when":"turnStart","do":[{"kind":"cleanseOne","to":"allies"}]}},
  },
  // ----- 鎧 -----
  { id: 'whiteWolfFur', name: '白狼の毛皮', slot: 'armor', rarity: 'rare', icon: 'robe', description: '氷属性のダメージを半分に和らげる。戦闘の始めにブロックを得る。', maxHp: 8, startBlock: 3, tags: ['ice'], ability: { name: '雪狼の守り', effect: { modifier: 'elementGuard', element: 'ice', mode: 'half' } } },
  { id: 'iceWardArmor', name: '氷除けの鎧', slot: 'armor', rarity: 'epic', icon: 'armor', scenario: 'frozenKingdom', description: '氷属性のダメージを吸収して、その分HPを回復する。', maxHp: 12, tags: ['ice'], ability: { name: '氷の吸収', effect: { modifier: 'elementGuard', element: 'ice', mode: 'absorb' } } },
  { id: 'springWaitCloak', name: '春待ちの外套', slot: 'armor', rarity: 'legend', icon: 'robe', scenario: 'frozenKingdom', scourgeGear: 'whiteWolfKing', description: '「凍結」にならない。凍結を受けるはずだった時、代わりにブロック6を得る。野営でよく休める。', maxHp: 22, explore: { campHeal: 0.5 }, tags: ['ice', 'block'], ability: { name: '春を待つ', effect: { modifier: 'statusGuard', statuses: ['freeze'], block: 6 } } },
  // ----- 装飾品 -----
  { id: 'lampLantern', name: '灯火のランタン', slot: 'accessory', rarity: 'rare', icon: 'charm', scenario: 'frozenKingdom', description: '消えない小さな灯。戦闘ごとに、味方全員が最初に受ける悪い状態異常を1回防ぐ。闇の帳を見通す（灯を喰らう影の加護で隠れた、ボス・中ボスの最初の予告も見える）。', ability: { name: '暖かい灯', effect: { modifier: 'statusGuard', allies: true, perBattle: 1 } } },
  { id: 'crystalNecklace', name: '氷晶の首飾り', slot: 'accessory', rarity: 'epic', icon: 'amulet', description: '属性の無い物理攻撃に、氷の力が宿る。', tags: ['ice'], stats: { int: 4 }, ability: { name: '氷の付与', effect: { modifier: 'convertElement', into: 'ice' } } },
  { id: 'thawRing', name: '雪解けの指輪', slot: 'accessory', rarity: 'epic', icon: 'ring', scenario: 'frozenKingdom', description: '凍結の状態異常を持つターンの始めに、自分の凍結を治す。', tags: ['ice'], stats: { vit: 4 }, ability: { name: '雪解け', effect: { when: 'turnStartBefore', if: [{ kind: 'selfStatus', status: 'freeze' }], do: [{ kind: 'cleanse', to: 'self' }] } } },
  { id: 'everIceBracer', name: '溶けぬ氷の腕輪', slot: 'accessory', rarity: 'legend', icon: 'crest', scenario: 'frozenKingdom', scourgeGear: 'frostBellWraith', description: '戦闘の始めに、ランダムな敵1体を凍らせる（ボスには代わりに「弱体」1）。「凍結」か「弱体」の敵に与えるダメージが1.35倍になる。', tags: ['ice', 'freeze', 'weak'], stats: { int: 8 }, ability: { name: '絶対零度', description: '「凍結」か「弱体」の敵に与えるダメージ×1.35。戦闘開始時：ランダムな敵1体に「凍結」1（ボスとの戦闘では代わりに「弱体」1）', effect: { modifier: 'damageDealt', multiplier: 1.35, if: [{ kind: 'targetAnyStatus', statuses: ['freeze', 'weak'] }] }, also: [{ when: 'battleStart', do: [{ kind: 'applyStatus', status: 'freeze', amount: 1, to: 'randomFoe', bossStatus: 'weak' }] }] } },
];
