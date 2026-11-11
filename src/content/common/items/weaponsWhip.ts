// 鞭（5本）：お供への号令と弱体。しつけ・号令・追い込み・獣との絆（区切りC。お供の行動は1ターンに4回まで）
import type { ItemDef } from '../../../types';

export const weaponsWhip: ItemDef[] = [
  // レア
  {
    id: "temperedWhip", name: "鋼芯の鞭", slot: "weapon", weaponType: "whip", rarity: "rare", icon: "whip",
    description: "物理カードが完全成功でダメージを与えた時、対象に「弱体」1。1ターンに1回。", stats: {"dex":5}, tags: ["physical","weak"],
    cards: [{"cardId":"wtWhipSweep","count":2}],
    ability: {"name":"しつけ","description":"物理カードが完全成功でダメージを与えた時、対象に「弱体」1。1ターンに1回。","effect":{"when":"perfect","if":[{"kind":"cardCategory","category":"physical"},{"kind":"dealtDamage"},{"kind":"oncePerTurn","key":"temperedWhip"}],"do":[{"kind":"applyStatus","status":"weak","amount":1,"to":"target"}]}},
  },
  // エピック
  {
    id: "companionWhip", name: "相棒の鞭", slot: "weapon", weaponType: "whip", rarity: "rare", icon: "whip",
    description: "物理カードが完全成功した後、お供が1回行動する。1ターンに1回。（お供の行動は、全部合わせて1ターンに4回まで）", stats: {"dex":2,"per":2}, tags: ["physical","pet"],
    cards: [{"cardId":"wtWhipSweep","count":2}],
    ability: {"name":"号令","description":"物理カードが完全成功した後、お供が1回行動する。1ターンに1回。（お供の行動は、全部合わせて1ターンに4回まで）","effect":{"when":"perfect","if":[{"kind":"cardCategory","category":"physical"},{"kind":"hasPet"},{"kind":"oncePerTurn","key":"companionWhip"}],"do":[{"kind":"petAct"}]}},
  },
  {
    id: "rendingWhip", name: "傷裂きの鞭", slot: "weapon", weaponType: "whip", rarity: "epic", icon: "whip",
    description: "「弱体」の敵への、お供・召喚（砲台・罠・群れの獣）の攻撃のダメージ+3。", stats: {"dex":4,"per":4}, tags: ["pet","weak"],
    cards: [{"cardId":"wtWhipTaming","count":2}],
    ability: {"name":"追い込み","description":"「弱体」の敵への、お供・召喚（砲台・罠・群れの獣）の攻撃のダメージ+3。","effect":{"modifier":"damageDealt","multiplier":1,"add":3,"if":[{"kind":"viaCompanion"},{"kind":"targetHasStatus","status":"weak"}]}},
  },
  // レジェンド
  // 既存にレジェンド用カードがないため、エピック以下の武器種カードを共有する。
  {
    id: "beastbondWhip", name: "獣絆の鞭", slot: "weapon", weaponType: "whip", rarity: "legend", icon: "whip",
    description: "お供が行動したターンの間、物理カードのダメージ×1.25。", stats: {"dex":12}, tags: ["physical","pet"],
    cards: [{"cardId":"wtWhipStorm","count":2}],
    ability: {"name":"獣との絆","description":"お供が行動したターンの間、物理カードのダメージ×1.25。","effect":{"modifier":"damageDealt","multiplier":1.25,"if":[{"kind":"cardCategory","category":"physical"},{"kind":"counterAtLeast","key":"petActsTurn","n":1,"label":"お供が行動したターン"}]}},
  },
];
