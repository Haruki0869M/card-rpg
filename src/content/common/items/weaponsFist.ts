// 拳（手数と気）。区切りB（2026-11-11）で5本に絞った。1本ごとに、ほかに無い役割を持つ。
import type { ItemDef } from '../../../types';

export const weaponsFist: ItemDef[] = [
  // レア
  {
    id: "ironPalmWraps", name: "鉄掌の手甲", slot: "weapon", weaponType: "fist", rarity: "rare", icon: "fist",
    description: "同じターンの3枚目のカードの後、フォーカス+1。1ターンに1回。", stats: {"vit":5}, tags: ["physical","combo","focus"],
    cards: [{"cardId":"wtFistPalm","count":2}],
    ability: {"name":"連打","description":"同じターンの3枚目のカードの後、フォーカス+1。1ターンに1回。","effect":{"when":"afterCard","if":[{"kind":"playedThisTurn","atLeast":2},{"kind":"oncePerTurn","key":"ironPalmWraps"}],"do":[{"kind":"gainFocus","amount":1}]}},
  },
  {
    id: "steadyWraps", name: "堅実の手甲", slot: "weapon", weaponType: "fist", rarity: "rare", icon: "fist",
    description: "敵の攻撃をブロックで防ぎきったら、次に使うカードのコスト−1。1ターンに1回。", stats: {"vit":2,"agi":2}, tags: ["physical","block"],
    cards: [{"cardId":"wtFistPalm","count":2}],
    ability: {"name":"受け","description":"敵の攻撃をブロックで防ぎきったら、次に使うカードのコスト−1。1ターンに1回。","effect":{"modifier":"cardCost","delta":-1,"if":[{"kind":"counterAtLeast","key":"parry","n":1,"label":"攻撃を防ぎきった後の"}]},"also":[{"when":"afterCard","if":[{"kind":"counterAtLeast","key":"parry","n":1}],"do":[{"kind":"counter","key":"parry","set":0,"silent":true}]},{"when":"blocked","if":[{"kind":"oncePerTurn","key":"steadyWraps"}],"do":[{"kind":"counter","key":"parry","set":1,"text":"次のカードのコスト-1"}]}]},
  },
  // エピック
  {
    id: "galeWraps", name: "疾走の手甲", slot: "weapon", weaponType: "fist", rarity: "epic", icon: "fist",
    description: "同じターンの4枚目からの物理カードの基本ダメージ+4（1回の攻撃ごと。力などの倍率もかかる）。", stats: {"agi":8}, tags: ["physical","combo","multi"],
    cards: [{"cardId":"wtFistThousand","count":2}],
    ability: {"name":"疾走","description":"同じターンの4枚目からの物理カードの基本ダメージ+4（1回の攻撃ごと。力などの倍率もかかる）。","effect":{"modifier":"damageDealt","multiplier":1,"add":4,"if":[{"kind":"cardCategory","category":"physical"},{"kind":"playedThisTurn","atLeast":3}]}},
  },
  {
    id: "stillwaterWraps", name: "静水の手甲", slot: "weapon", weaponType: "fist", rarity: "legend", icon: "fist",
    description: "フォーカスを使ったカードが完全成功したら、フォーカスが1戻る。1ターンに1回。", stats: {"vit":10,"agi":2}, tags: ["physical","focus"],
    cards: [{"cardId":"wtFistKiBlast","count":2}],
    ability: {"name":"気の巡り","description":"フォーカスを使ったカードが完全成功したら、フォーカスが1戻る。1ターンに1回。","effect":{"when":"perfect","if":[{"kind":"usedFocus"},{"kind":"oncePerTurn","key":"stillwaterWraps"}],"do":[{"kind":"gainFocus","amount":1}]}},
  },
  // レジェンド
  // 既存にレジェンド用カードがないため、エピックの武器種カードを共有する。
];
