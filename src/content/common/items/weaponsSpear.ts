// 槍（守って返す）。区切りB（2026-11-11）で6本に絞った。1本ごとに、ほかに無い役割を持つ。
import type { ItemDef } from '../../../types';

export const weaponsSpear: ItemDef[] = [
  // レア
  {
    id: "temperedSpear", name: "鍛鋼の槍", slot: "weapon", weaponType: "spear", rarity: "rare", icon: "spear",
    description: "物理カードでダメージを与えた後、ブロック3。1ターンに1回。", stats: {"str":5}, tags: ["physical","block"],
    cards: [{"cardId":"wtSpearHook","count":2}],
    ability: {"name":"槍構え","description":"物理カードでダメージを与えた後、ブロック3。1ターンに1回。","effect":{"when":"afterCard","if":[{"kind":"cardCategory","category":"physical"},{"kind":"dealtDamage"},{"kind":"oncePerTurn","key":"temperedSpear"}],"do":[{"kind":"block","amount":3,"to":"self"}]}},
  },
  {
    id: "balancedSpear", name: "均衡の槍", slot: "weapon", weaponType: "spear", rarity: "rare", icon: "spear",
    description: "敵の番にHPが減らなかったら、次のターン最初の物理カードのダメージ×1.25。", stats: {"str":2,"dex":2}, tags: ["physical","block"],
    cards: [{"cardId":"axReturnStroke","count":2}],
    ability: {"name":"返しの穂先","description":"敵の番にHPが減らなかったら、次のターン最初の物理カードのダメージ×1.25。","effect":{"modifier":"damageDealt","multiplier":1.25,"if":[{"kind":"cardCategory","category":"physical"},{"kind":"playedCategoryCount","category":"physical","max":0},{"kind":"counterAtLeast","key":"unhurtTurn","n":1,"label":"敵の番にHPが減らなかった次のターン"}]}},
  },
  // エピック
  // レジェンド
  // 既存にレジェンド用カードがないため、エピックの武器種カードを共有する。
  {
    id: "dragonlordSpear", name: "竜王の槍", slot: "weapon", weaponType: "spear", rarity: "legend", icon: "spear",
    description: "敵の番を無傷でしのぐたび「構え」1（最大3）。構え1つにつき、与える物理ダメージ+15%。HPが減ると構えは全部消える。", stats: {"str":12}, tags: ["physical","block"],
    cards: [{"cardId":"wtSpearDragon","count":2}],
    ability: {"name":"竜王の構え","description":"敵の番を無傷でしのぐたび「構え」1（最大3）。構え1つにつき、与える物理ダメージ+15%。HPが減ると構えは全部消える。","effect":{"when":"turnStart","if":[{"kind":"counterAtLeast","key":"unhurtTurn","n":1,"label":"敵の番にHPが減らなかった次のターン"}],"do":[{"kind":"applyStatus","status":"stance","amount":1,"to":"self"}]},"also":[{"modifier":"damageDealt","multiplier":1,"scale":{"by":"selfStatus","status":"stance","per":0.15,"max":0.45},"if":[{"kind":"cardCategory","category":"physical"}]}]},
  },
  {
    id: "sentinelSpear", name: "不動の槍", slot: "weapon", weaponType: "spear", rarity: "epic", icon: "spear",
    description: "攻撃カードの後、ブロック4（1ターンに1回）。敵の番にHPが減らなかったら、次のターン最初の物理カードのダメージ×1.3。", stats: {"str":4,"vit":4}, tags: ["physical","block"],
    cards: [{"cardId":"axSpikeArmor","count":2}],
    ability: {"name":"不動","description":"攻撃カードの後、ブロック4（1ターンに1回）。敵の番にHPが減らなかったら、次のターン最初の物理カードのダメージ×1.3。","effect":{"when":"afterCard","if":[{"kind":"cardHasDamage"},{"kind":"oncePerTurn","key":"sentinelSpear"}],"do":[{"kind":"block","amount":4,"to":"self"}]},"also":[{"modifier":"damageDealt","multiplier":1.3,"if":[{"kind":"cardCategory","category":"physical"},{"kind":"playedCategoryCount","category":"physical","max":0},{"kind":"counterAtLeast","key":"unhurtTurn","n":1,"label":"敵の番にHPが減らなかった次のターン"}]}]},
  },
];
