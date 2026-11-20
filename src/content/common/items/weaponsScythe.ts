// 鎌（5本）：呪いの起爆。呪い刈り・屍の手・呪い移し・死の刻（区切りC。呪いを起爆するカードは区切りDで足す）
import type { ItemDef } from '../../../types';

export const weaponsScythe: ItemDef[] = [
  // レア
  {
    id: "temperedScythe", name: "鍛鋼の大鎌", slot: "weapon", weaponType: "scythe", rarity: "rare", icon: "scythe",
    description: "「呪い」を起爆して消した時、消した呪い1つにつきHPを1回復（最大6）。", stats: {"str":3,"int":2}, tags: ["curse","heal"],
    cards: [{"cardId":"axCurseHarvest","count":2}],
    ability: {"name":"呪い刈り","description":"「呪い」を起爆して消した時、消した呪い1つにつきHPを1回復（最大6）。","effect":{"when":"detonate","if":[{"kind":"statusIs","status":"curse"}],"do":[{"kind":"healPctOfDealt","pct":100,"max":6}]}},
  },
  {
    id: "duskScythe", name: "夕闇の大鎌", slot: "weapon", weaponType: "scythe", rarity: "rare", icon: "scythe",
    description: "敵を倒した時、ランダムな敵1体に「呪い」2。1ターンに1回。", stats: {"str":2,"int":2}, tags: ["curse"],
    cards: [{"cardId":"wtScytheHarvest","count":2}],
    ability: {"name":"屍の手","description":"敵を倒した時、ランダムな敵1体に「呪い」2。1ターンに1回。","effect":{"when":"kill","if":[{"kind":"oncePerTurn","key":"duskScythe"}],"do":[{"kind":"applyStatus","status":"curse","amount":2,"to":"randomFoe"}]}},
  },
  // エピック
  {
    id: "nightfallScythe", name: "宵闇の大鎌", slot: "weapon", weaponType: "scythe", rarity: "epic", icon: "scythe",
    description: "敵1体への攻撃カードが完全成功した時、自分に付いている「呪い」を全部その敵に移す。1ターンに1回。", stats: {"str":4,"int":4}, tags: ["curse","single"],
    cards: [{"cardId":"wtScytheEmbrace","count":2}],
    ability: {"name":"呪い移し","description":"敵1体への攻撃カードが完全成功した時、自分に付いている「呪い」を全部その敵に移す。1ターンに1回。","effect":{"when":"perfect","if":[{"kind":"cardHasDamage"},{"kind":"cardSingleTarget"},{"kind":"selfStatus","status":"curse","min":1},{"kind":"oncePerTurn","key":"nightfallScythe"}],"do":[{"kind":"moveStatus","status":"curse","to":"target"}]}},
  },
  // レジェンド
  // 既存にレジェンド用カードがないため、エピックの武器種カードを共有する。
  {
    id: "fatefulScythe", name: "運命の大鎌", slot: "weapon", weaponType: "scythe", rarity: "legend", icon: "scythe",
    description: "HPが25%以下の敵（ボス・中ボスとの戦闘では10%以下）に攻撃カードが完全成功した時、追加で20ダメージ。", stats: {"str":8,"int":4}, tags: ["heavy","single"],
    cards: [{"cardId":"wtScytheCondemn","count":2}],
    ability: {"name":"死の刻","description":"HPが25%以下の敵（ボス・中ボスとの戦闘では10%以下）に攻撃カードが完全成功した時、追加で20ダメージ。","effect":{"when":"perfect","if":[{"kind":"cardHasDamage"},{"kind":"targetHpAtMost","pct":25,"bossPct":10}],"do":[{"kind":"damage","amount":20,"to":"target"}]}},
  },
];
