// 短剣（毒と身軽さ）。区切りB（2026-11-11）で6本に絞った。1本ごとに、ほかに無い役割を持つ。
import type { ItemDef } from '../../../types';

export const weaponsDagger: ItemDef[] = [
  // レア
  {
    id: "temperedDagger", name: "鍛鋼の短剣", slot: "weapon", weaponType: "dagger", rarity: "rare", icon: "dagger",
    description: "物理の攻撃カードが完全成功した時、対象に毒2。1ターンに2回まで。", stats: {"dex":5}, tags: ["physical","poison"],
    cards: [{"cardId":"wtDaggerVenom","count":2}],
    ability: {"name":"毒刃","description":"物理の攻撃カードが完全成功した時、対象に毒2。1ターンに2回まで。","effect":{"when":"perfect","if":[{"kind":"cardCategory","category":"physical"},{"kind":"cardHasDamage"},{"kind":"perTurn","key":"temperedDagger","max":2}],"do":[{"kind":"applyStatus","status":"poison","amount":2}]}},
  },
  {
    id: "guardDagger", name: "受け流しの短剣", slot: "weapon", weaponType: "dagger", rarity: "rare", icon: "dagger",
    description: "毎ターン、最初のコスト0のカードの後、1枚引く。", stats: {"dex":2,"agi":2}, tags: ["physical","free","draw"],
    cards: [{"cardId":"axFlowingStrikes","count":2}],
    ability: {"name":"軽業","description":"毎ターン、最初のコスト0のカードの後、1枚引く。","effect":{"when":"afterCard","if":[{"kind":"cardCost","max":0},{"kind":"oncePerTurn","key":"guardDagger"}],"do":[{"kind":"draw","amount":1}]}},
  },
  // エピック
  {
    id: "calmDagger", name: "静心の短剣", slot: "weapon", weaponType: "dagger", rarity: "epic", icon: "dagger",
    description: "1ターンにコスト0のカードを3枚使うと、次の攻撃カードが敵のブロックを無視する。", stats: {"dex":4,"agi":4}, tags: ["physical","free","combo"],
    cards: [{"cardId":"wtDaggerAssassinate","count":2}],
    ability: {"name":"影歩き","description":"1ターンにコスト0のカードを3枚使うと、次の攻撃カードが敵のブロックを無視する。","effect":{"modifier":"ignoreBlock","if":[{"kind":"cardHasDamage"},{"kind":"counterAtLeast","key":"shadowStep","n":1,"label":"コスト0のカードを3枚使った後の"}]},"also":[{"when":"afterCard","if":[{"kind":"cardHasDamage"},{"kind":"counterAtLeast","key":"shadowStep","n":1}],"do":[{"kind":"counter","key":"shadowStep","set":0,"silent":true}]},{"when":"afterCard","if":[{"kind":"cardCost","max":0},{"kind":"nthThisTurn","key":"calmDagger","n":3}],"do":[{"kind":"counter","key":"shadowStep","set":1,"text":"次の攻撃カードがブロックを無視"}]}]},
  },
  // レジェンド
  // 既存にレジェンド用カードがないため、エピックの武器種カードを共有する。
  {
    id: "plagueDagger", name: "疫毒の短剣", slot: "weapon", weaponType: "dagger", rarity: "legend", icon: "dagger",
    description: "毒が10以上の敵に与える物理ダメージ×1.3。", stats: {"dex":10,"per":2}, tags: ["physical","poison"],
    cards: [{"cardId":"wtDaggerMirage","count":2}],
    ability: {"name":"猛毒の牙","description":"毒が10以上の敵に与える物理ダメージ×1.3。","effect":{"modifier":"damageDealt","multiplier":1.3,"if":[{"kind":"cardCategory","category":"physical"},{"kind":"targetStatusAtLeast","status":"poison","n":10}]}},
  },
];
