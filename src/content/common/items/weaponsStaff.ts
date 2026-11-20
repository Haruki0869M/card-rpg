// 杖：弱点を突く。弱点突き・詠唱・星詠み（区切りC。基本の杖は weapons.ts、シナリオの杖は各シナリオのファイル）
import type { ItemDef } from '../../../types';

export const weaponsStaff: ItemDef[] = [
  // レア
  {
    id: "balancedStaff", name: "調律の杖", slot: "weapon", weaponType: "staff", rarity: "rare", icon: "staff",
    description: "そのターン最初の魔法カードがコスト2以上なら、成功率+10%。", stats: {"int":2,"luk":2}, tags: ["magic","heavy"],
    cards: [{"cardId":"wLightning","count":2}],
    ability: {"name":"詠唱","description":"そのターン最初の魔法カードがコスト2以上なら、成功率+10%。","effect":{"modifier":"cardChance","bonus":10,"if":[{"kind":"cardCategory","category":"magic"},{"kind":"cardCost","min":2},{"kind":"playedCategoryCount","category":"magic","max":0}]}},
  },
];
