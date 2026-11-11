// 刀（一太刀）。区切りB（2026-11-11）で5本に絞った。1本ごとに、ほかに無い役割を持つ。
import type { ItemDef } from '../../../types';

export const weaponsKatana: ItemDef[] = [
  // レア
  {
    id: "forgedKatana", name: "鍛鉄の刀", slot: "weapon", weaponType: "katana", rarity: "rare", icon: "katana",
    description: "毎ターン、最初に使う物理カードのダメージ×1.2（2枚目からは無し）。", stats: {"per":5}, tags: ["physical","heavy"],
    cards: [{"cardId":"wtSwordNotch","count":2}],
    ability: {"name":"初太刀","description":"毎ターン、最初に使う物理カードのダメージ×1.2（2枚目からは無し）。","effect":{"modifier":"damageDealt","multiplier":1.2,"if":[{"kind":"cardCategory","category":"physical"},{"kind":"playedCategoryCount","category":"physical","max":0}]}},
  },
  {
    id: "guardKatana", name: "受け流しの刀", slot: "weapon", weaponType: "katana", rarity: "rare", icon: "katana",
    description: "そのターンに物理カードを1枚だけ使ったら、ターン終了時にブロック5。", stats: {"per":2,"agi":2}, tags: ["physical","block"],
    cards: [{"cardId":"wtSwordNotch","count":2}],
    ability: {"name":"残心","description":"そのターンに物理カードを1枚だけ使ったら、ターン終了時にブロック5。","effect":{"when":"turnEnd","if":[{"kind":"playedCategoryCount","category":"physical","min":1,"max":1}],"do":[{"kind":"block","amount":5,"to":"self"}]}},
  },
  // エピック
  {
    id: "crowdcleaverKatana", name: "陣割りの刀", slot: "weapon", weaponType: "katana", rarity: "epic", icon: "katana",
    description: "そのターン最初の物理カードで敵を倒したら、そのカードのマナを返し、1枚引く。1ターンに1回。", stats: {"per":8}, tags: ["physical","mana","draw"],
    cards: [{"cardId":"wtKatanaSplit","count":2}],
    ability: {"name":"陣割り","description":"そのターン最初の物理カードで敵を倒したら、そのカードのマナを返し、1枚引く。1ターンに1回。","effect":{"when":"kill","if":[{"kind":"cardCategory","category":"physical"},{"kind":"playedCategoryCount","category":"physical","max":0},{"kind":"oncePerTurn","key":"crowdcleaverKatana"}],"do":[{"kind":"refundCost"},{"kind":"draw","amount":1}]}},
  },
  // レジェンド。専用のレジェンド武器カードがないため、既存の花吹雪を共有する。
  {
    id: "peerlessKatana", name: "天下無双", slot: "weapon", weaponType: "katana", rarity: "legend", icon: "katana",
    description: "毎ターン、最初に使う物理カードのダメージ×1.3。そのカードが完全成功なら、敵のブロックを無視する。", stats: {"per":12}, tags: ["physical","heavy"],
    cards: [{"cardId":"wtKatanaPetals","count":2}],
    ability: {"name":"天下無双","description":"毎ターン、最初に使う物理カードのダメージ×1.3。そのカードが完全成功なら、敵のブロックを無視する。","effect":{"modifier":"damageDealt","multiplier":1.3,"if":[{"kind":"cardCategory","category":"physical"},{"kind":"playedCategoryCount","category":"physical","max":0}]},"also":[{"modifier":"ignoreBlock","if":[{"kind":"cardCategory","category":"physical"},{"kind":"playedCategoryCount","category":"physical","max":0},{"kind":"perfect"}]}]},
  },
];
