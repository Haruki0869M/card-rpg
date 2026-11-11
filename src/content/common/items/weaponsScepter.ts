// 錫杖：オーバーヒールと聖光。朝の祈り・雪解けの光（区切りC。シナリオの錫杖は各シナリオのファイル）
import type { ItemDef } from '../../../types';

export const weaponsScepter: ItemDef[] = [
  // レア
  {
    id: "dawnScepter", name: "朝光の錫杖", slot: "weapon", weaponType: "scepter", rarity: "rare", icon: "scepter",
    description: "HPが満タンの味方を回復した時、その味方にブロック3。1ターンに1回。", stats: {"int":2,"per":2}, tags: ["heal","block","support"],
    cards: [{"cardId":"wtScepterHalo","count":1},{"cardId":"wtScepterBlessing","count":1}],
    ability: {"name":"朝の祈り","description":"HPが満タンの味方を回復した時、その味方にブロック3。1ターンに1回。","effect":{"when":"overheal","if":[{"kind":"healedFull"},{"kind":"oncePerTurn","key":"dawnScepter"}],"do":[{"kind":"block","amount":3,"to":"allyTarget"}]}},
  },
];
