// 剣（完全成功をつなぐ）。区切りB（2026-11-11）で7本に絞った。1本ごとに、ほかに無い役割を持つ。
import type { ItemDef } from '../../../types';

export const weaponsSword: ItemDef[] = [
  // レア
  {
    id: "smolderSword", name: "熾火の剣", slot: "weapon", weaponType: "sword", rarity: "rare", icon: "sword",
    description: "魔法カードを使った後、次の物理カードの成功率+10%。1ターンに1回。", stats: {"str":2,"int":2}, tags: ["physical","magic"],
    cards: [{"cardId":"bladeFire","count":1},{"cardId":"lnGiQuick","count":1}],
    ability: {"name":"魔法剣","description":"魔法カードを使った後、次の物理カードの成功率+10%。1ターンに1回。","effect":{"modifier":"cardChance","bonus":10,"if":[{"kind":"cardCategory","category":"physical"},{"kind":"counterAtLeast","key":"magicBlade","n":1,"label":"魔法カードを使った後の"}]},"also":[{"when":"afterCard","if":[{"kind":"cardCategory","category":"physical"},{"kind":"counterAtLeast","key":"magicBlade","n":1}],"do":[{"kind":"counter","key":"magicBlade","set":0,"silent":true}]},{"when":"afterCard","if":[{"kind":"cardCategory","category":"magic"},{"kind":"oncePerTurn","key":"smolderSword"}],"do":[{"kind":"counter","key":"magicBlade","set":1,"text":"次の物理カードの成功率+10%"}]}]},
  },
  // エピック
  // レジェンド
  {
    id: "oathkeeperSword", name: "誓約の剣", slot: "weapon", weaponType: "sword", rarity: "legend", icon: "sword",
    description: "物理カードが完全成功した後、味方全員に「応援」1（1人の時は自分に2）。1ターンに1回。", stats: {"str":12}, tags: ["physical","support"],
    cards: [{"cardId":"wFlameSlash","count":2}],
    ability: {"name":"誓約","description":"物理カードが完全成功した後、味方全員に「応援」1（1人の時は自分に2）。1ターンに1回。","effect":{"when":"perfect","if":[{"kind":"cardCategory","category":"physical"},{"kind":"oncePerTurn","key":"oathkeeperSword"}],"do":[{"kind":"applyStatus","status":"inspired","amount":1,"to":"allies"}]},"also":[{"when":"perfect","if":[{"kind":"cardCategory","category":"physical"},{"kind":"allyCount","max":1},{"kind":"oncePerTurn","key":"oathkeeperSwordSolo"}],"do":[{"kind":"applyStatus","status":"inspired","amount":1,"to":"self"}]}]},
  },
];
