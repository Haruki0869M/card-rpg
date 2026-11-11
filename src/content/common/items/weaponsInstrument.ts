// 楽器（5本）：支援と連携。伴奏・間奏・輪唱・助け合いの調べ（区切りC）
import type { ItemDef } from '../../../types';

export const weaponsInstrument: ItemDef[] = [
  // レア
  // レアの攻撃カードがないため弦打ち（コモン）を使い、癒しの曲で支援を残す。
  {
    id: "resonantLute", name: "響きのリュート", slot: "weapon", weaponType: "instrument", rarity: "rare", icon: "instrument",
    description: "味方への支援が成立した時、その味方に「応援」1。1ターンに1回。（1人の時は、自分への支援でも成立）", stats: {"luk":5}, tags: ["support"],
    cards: [{"cardId":"wtInstStrum","count":1},{"cardId":"wtInstHymn","count":1}],
    ability: {"name":"伴奏","description":"味方への支援が成立した時、その味方に「応援」1。1ターンに1回。（1人の時は、自分への支援でも成立）","effect":{"when":"afterCard","if":[{"kind":"supported"},{"kind":"oncePerTurn","key":"resonantLute"}],"do":[{"kind":"applyStatus","status":"inspired","amount":1,"to":"helped"}]}},
  },
  {
    id: "steadfastLute", name: "堅心のリュート", slot: "weapon", weaponType: "instrument", rarity: "rare", icon: "instrument",
    description: "そのターンに攻撃カードを使わなかったら、ターン終了時に味方全員にブロック3。", stats: {"luk":2,"vit":2}, tags: ["support","block"],
    cards: [{"cardId":"wtInstStrum","count":1},{"cardId":"wtInstHymn","count":1}],
    ability: {"name":"間奏","description":"そのターンに攻撃カードを使わなかったら、ターン終了時に味方全員にブロック3。","effect":{"when":"turnEnd","if":[{"kind":"noAttackThisTurn"}],"do":[{"kind":"block","amount":3,"to":"allies"}]}},
  },
  // エピック
  {
    id: "wellspringLute", name: "湧泉のリュート", slot: "weapon", weaponType: "instrument", rarity: "epic", icon: "instrument",
    description: "自分が「応援」を付けた味方のカードが完全成功したら、自分が1枚引く。1ターンに1回。（1人の時は、自分でも成立）", stats: {"luk":4,"vit":4}, tags: ["support","draw"],
    cards: [{"cardId":"wtInstFinale","count":1},{"cardId":"wtInstHymn","count":1}],
    ability: {"name":"輪唱","description":"自分が「応援」を付けた味方のカードが完全成功したら、自分が1枚引く。1ターンに1回。（1人の時は、自分でも成立）","effect":{"when":"cheerPerfect","if":[{"kind":"oncePerTurn","key":"wellspringLute"}],"do":[{"kind":"draw","amount":1}]}},
  },
  // レジェンド
  // 既存にレジェンド用カードがないため、エピック以下の武器種カードを共有する。
  {
    id: "fellowshipLute", name: "絆のリュート", slot: "weapon", weaponType: "instrument", rarity: "legend", icon: "instrument",
    description: "自分以外の味方への支援が成立した時、味方全員にブロック2・フォーカス+1。1ターンに1回。（1人の時は、自分への支援でも成立）", stats: {"luk":8,"per":4}, tags: ["support","block","focus"],
    cards: [{"cardId":"wtInstFinale","count":1},{"cardId":"wtInstHymn","count":1}],
    ability: {"name":"助け合いの調べ","description":"自分以外の味方への支援が成立した時、味方全員にブロック2・フォーカス+1。1ターンに1回。（1人の時は、自分への支援でも成立）","effect":{"when":"afterCard","if":[{"kind":"supported"},{"kind":"oncePerTurn","key":"fellowshipLute"}],"do":[{"kind":"block","amount":2,"to":"allies"},{"kind":"gainFocus","amount":1}]}},
  },
];
