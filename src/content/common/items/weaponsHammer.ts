// 槌（守りを力に）。区切りB（2026-11-11）で5本に絞った。1本ごとに、ほかに無い役割を持つ。
import type { ItemDef } from '../../../types';

export const weaponsHammer: ItemDef[] = [
  // レア
  {
    id: "balancedHammer", name: "釣合いの槌", slot: "weapon", weaponType: "hammer", rarity: "rare", icon: "hammer",
    description: "物理カードが完全成功した後、いちばんHPが低い味方（自分も入る）にブロック4。1ターンに1回。", stats: {"str":2,"dex":2}, tags: ["physical","block","support"],
    cards: [{"cardId":"wIronHammer","count":2}],
    ability: {"name":"守りの一打","description":"物理カードが完全成功した後、いちばんHPが低い味方（自分も入る）にブロック4。1ターンに1回。","effect":{"when":"perfect","if":[{"kind":"cardCategory","category":"physical"},{"kind":"oncePerTurn","key":"balancedHammer"}],"do":[{"kind":"block","amount":4,"to":"lowestAlly"}]}},
  },
  // エピック
  // レジェンド
];
