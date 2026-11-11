// 砂塵の王朝の固有装備（武器5・鎧3・装飾品5）。このシナリオの宝箱とショップにだけ出る（scenario）
// 方針: 毒（蠍）と火・雷への備え、暑さ寒さをしのぐ。武器の専用カードは、同じ武器種・同じレア度の既存武器と同じ物を使う
import type { ItemDef } from '../../../../types';

export const sandGear: ItemDef[] = [
  // ----- 武器 -----
  {
    id: "sandstormBlade", name: "砂嵐の曲刀", slot: "weapon", weaponType: "sword", rarity: "epic", icon: "sword", scenario: "sandDynasty",
    description: "1ターンに物理カードを3枚使うと、敵全員に「脆弱」1。1ターンに1回。", stats: {"str":6,"dex":4}, tags: ["physical","combo","vulnerable"],
    cards: [{"cardId":"wMithrilSlash","count":2}],
    ability: {"name":"砂嵐","description":"1ターンに物理カードを3枚使うと、敵全員に「脆弱」1。1ターンに1回。","effect":{"when":"afterCard","if":[{"kind":"cardCategory","category":"physical"},{"kind":"playedCategoryCount","category":"physical","min":2},{"kind":"oncePerTurn","key":"sandstormBlade"}],"do":[{"kind":"applyStatus","status":"vulnerable","amount":1,"to":"foes"}]}},
  },
  {
    id: "scorpionSting", name: "蠍の針", slot: "weapon", weaponType: "dagger", rarity: "rare", icon: "dagger", scenario: "sandDynasty",
    description: "まだ毒が付いていない敵に毒を付ける時、毒+2。", stats: {"dex":4,"agi":3}, tags: ["physical","poison"],
    cards: [{"cardId":"wtDaggerVenom","count":2}],
    ability: {"name":"蠍毒","description":"まだ毒が付いていない敵に毒を付ける時、毒+2。","effect":{"modifier":"statusBonus","statuses":["poison"],"amount":2,"if":[{"kind":"targetNoStatus","status":"poison"}]}},
  },
  {
    id: 'sunScepter', name: '太陽の錫杖', slot: 'weapon', weaponType: 'scepter', rarity: 'legend', icon: 'scepter', scenario: 'sandDynasty',
    description: '回復のカードを使うと、自分に「聖光」が1つたまる（1ターンに1回・最大5）。ためた光で、次の聖属性の攻撃が強くなる。', stats: { int: 8, vit: 4 }, tags: ['holy', 'heal'],
    cards: [{ cardId: 'wtScepterJudgment', count: 2 }],
    ability: { name: '日輪の祈り', description: '回復のカードを使った後（1ターンに1回）：自分に「聖光」1（最大5。次の聖属性の攻撃が1つにつき+15%。撃つと消える）', effect: { when: 'afterCard', if: [{ kind: 'cardHasHeal' }, { kind: 'oncePerTurn', key: 'sunScepter' }], do: [{ kind: 'applyStatus', status: 'holyLight', amount: 1, to: 'self' }] } },
  },
  // ----- 鎧 -----
  { id: 'desertCloak', name: '砂漠の外套', slot: 'armor', rarity: 'rare', icon: 'robe', description: '毒属性のダメージを半分に和らげる。戦闘の始めにブロックを得る。', maxHp: 8, startBlock: 3, tags: ['poison'], ability: { name: '毒よけ', effect: { modifier: 'elementGuard', element: 'poison', mode: 'half' } } },
  { id: 'royalBreastplate', name: '王家の胸当て', slot: 'armor', rarity: 'epic', icon: 'armor', scenario: 'sandDynasty', description: '戦闘の始めに、敵全員に弱体1と脆弱1を与える。王の威厳に、敵がひるむ。', maxHp: 12, tags: ['weak', 'vulnerable'], ability: { name: '王の威厳', effect: { when: 'battleStart', do: [{ kind: 'applyStatus', status: 'weak', amount: 1, to: 'foes' }, { kind: 'applyStatus', status: 'vulnerable', amount: 1, to: 'foes' }] } } },
  { id: 'mummyWrappings', name: '千年の包帯', slot: 'armor', rarity: 'legend', icon: 'robe', scenario: 'sandDynasty', description: '自分が「毒」か「呪い」にかかっている間、与えるダメージが1.25倍になる。状態異常を治すと力も消える。野営でよく休める。', maxHp: 20, explore: { campHeal: 0.5 }, tags: ['poison', 'curse'], ability: { name: '千年の呪い', description: '自分が「毒」か「呪い」の間、与えるダメージ×1.25', effect: { modifier: 'damageDealt', multiplier: 1.25, if: [{ kind: 'selfAnyStatus', statuses: ['poison', 'curse'] }] } } },
  // ----- 装飾品 -----
  { id: 'canteen', name: '古い水筒', slot: 'accessory', rarity: 'rare', icon: 'charm', scenario: 'sandDynasty', description: '冷たい水がいつまでも尽きない。野営でよく休める。戦闘開始時、HPを5回復。', tags: ['heal'], explore: { campHeal: 0.25 }, ability: { name: '命の水', effect: { when: 'battleStart', do: [{ kind: 'heal', amount: 5, to: 'self' }] } } },
  { id: 'moonAmulet', name: '月の首飾り', slot: 'accessory', rarity: 'epic', icon: 'amulet', scenario: 'sandDynasty', description: '3ターンごとの始めに、マナ+1を得て、HPが3回復する。', tags: ['mana', 'heal'], stats: { vit: 4 }, ability: { name: '月の満ち欠け', description: '3ターンごとの開始時（3・6・9ターン目…）：マナ+1、HPを3回復', effect: { when: 'turnStart', if: [{ kind: 'everyN', n: 3, key: 'moonAmulet' }], do: [{ kind: 'gainMana', amount: 1 }, { kind: 'heal', amount: 3, to: 'self' }] } } },
  { id: 'kingSignet', name: '王の印章指輪', slot: 'accessory', rarity: 'legend', icon: 'crest', scenario: 'sandDynasty', description: '戦闘の始めの所持金50Gごとに、与えるダメージ+5%（最大+35%）。戦闘に勝った時にもらえるゴールドが25%増える。', tags: ['gold'], stats: { luk: 10, dex: 6 }, goldBonus: 0.25, ability: { name: '黄金律', description: '戦闘の始めの自分の所持金50Gごとに与えるダメージ+5%（最大+35%）。戦闘に勝った時のゴールド+25%', effect: { modifier: 'damageDealt', multiplier: 1, scale: { by: 'gold', step: 50, per: 0.05, max: 0.35 } } } },
];
