// 魔導書（5本）：属性の使い分け。書き分け・種まき・契約の書・四元（区切りC）
import type { ItemDef } from '../../../types';

export const weaponsTome: ItemDef[] = [
  // レア
  {
    id: "scholarsTome", name: "賢学の魔導書", slot: "weapon", weaponType: "tome", rarity: "rare", icon: "tome",
    description: "前に使った属性カードと違う属性の魔法カードの成功率+10%。", stats: {"int":5}, tags: ["magic"],
    cards: [{"cardId":"wtTomeForbidden","count":2}],
    ability: {"name":"書き分け","description":"前に使った属性カードと違う属性の魔法カードの成功率+10%。","effect":{"modifier":"cardChance","bonus":10,"if":[{"kind":"cardCategory","category":"magic"},{"kind":"elementChanged"}]}},
  },
  // エピック
  {
    id: "deepthoughtTome", name: "深思の魔導書", slot: "weapon", weaponType: "tome", rarity: "epic", icon: "tome",
    description: "幻獣・召喚（砲台なども）が一緒に戦うターンが+1。", stats: {"int":8}, tags: ["magic","support"],
    cards: [{"cardId":"axBlazeCatalyst","count":2}],
    ability: {"name":"契約の書","description":"幻獣・召喚（砲台なども）が一緒に戦うターンが+1。","effect":{"modifier":"summonTurns","add":1}},
  },
  {
    id: "miasmaTome", name: "瘴気の魔導書", slot: "weapon", weaponType: "tome", rarity: "rare", icon: "tome",
    description: "悪い状態異常が1つも無い敵に、魔法カードで付ける状態異常+1。1ターンに1回。", stats: {"int":2,"dex":2}, tags: ["magic","poison","curse"],
    cards: [{"cardId":"wtTomeVenom","count":2}],
    ability: {"name":"種まき","description":"悪い状態異常が1つも無い敵に、魔法カードで付ける状態異常+1。1ターンに1回。","effect":{"modifier":"statusBonus","statuses":["poison","burn","weak","vulnerable","curse","paralysis","freeze","delay"],"amount":1,"element":true,"if":[{"kind":"cardCategory","category":"magic"},{"kind":"targetClean"},{"kind":"oncePerTurn","key":"miasmaTome"}]}},
  },
  // レジェンド
  // 既存にレジェンド用カードがないため、エピックの武器種カードを共有する。
  {
    id: "auroraTome", name: "極光の魔導書", slot: "weapon", weaponType: "tome", rarity: "legend", icon: "tome",
    description: "同じターンに違う属性のカードを3種類使うと、マナ+1・1枚引く。1ターンに1回。", stats: {"int":8,"per":4}, tags: ["magic","mana","draw"],
    cards: [{"cardId":"wtTomeElements","count":2}],
    ability: {"name":"四元","description":"同じターンに違う属性のカードを3種類使うと、マナ+1・1枚引く。1ターンに1回。","effect":{"when":"afterCard","if":[{"kind":"turnElements","min":3},{"kind":"oncePerTurn","key":"auroraTome"}],"do":[{"kind":"gainMana","amount":1},{"kind":"draw","amount":1}]}},
  },
];
