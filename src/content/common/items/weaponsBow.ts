// 弓（狙う）。区切りB（2026-11-11）で6本に絞った。1本ごとに、ほかに無い役割を持つ。
import type { ItemDef } from '../../../types';

export const weaponsBow: ItemDef[] = [
  // レア
  {
    id: "balancedBow", name: "均衡の弓", slot: "weapon", weaponType: "bow", rarity: "rare", icon: "bow",
    description: "「×N回」の攻撃が全部HPに当たったら、1枚引く。1ターンに1回。", stats: {"dex":2,"agi":2}, tags: ["physical","multi","draw"],
    cards: [{"cardId":"lnBuFlurry","count":2}],
    ability: {"name":"二の矢","description":"「×N回」の攻撃が全部HPに当たったら、1枚引く。1ターンに1回。","effect":{"when":"afterCard","if":[{"kind":"allHitsLanded","min":2},{"kind":"oncePerTurn","key":"balancedBow"}],"do":[{"kind":"draw","amount":1}]}},
  },
  // エピック
  {
    id: "surestrikeBow", name: "剛弦の弓", slot: "weapon", weaponType: "bow", rarity: "epic", icon: "bow",
    description: "ブロックが無い敵に与える物理カードのダメージ×1.25。", stats: {"dex":8}, tags: ["physical","single"],
    cards: [{"cardId":"wGaleArrow","count":2}],
    ability: {"name":"剛弦","description":"ブロックが無い敵に与える物理カードのダメージ×1.25。","effect":{"modifier":"damageDealt","multiplier":1.25,"if":[{"kind":"cardCategory","category":"physical"},{"kind":"targetNoBlock"}]}},
  },
  // レジェンド
];
