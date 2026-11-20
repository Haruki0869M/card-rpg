// 銃（5本）：多段と早撃ち。弾込め・連射・観測射撃・早撃ち（区切りC。docs/tasks/lineup-final-gear.md）
import type { ItemDef } from '../../../types';

export const weaponsGun: ItemDef[] = [
  // レア
  {
    id: "rifledGun", name: "精密銃", slot: "weapon", weaponType: "gun", rarity: "rare", icon: "gun",
    description: "使わずに残したマナ1につき、次のターン最初の物理カードの最初の1発のダメージ+4（最大+8）。", stats: {"dex":5}, tags: ["physical","mana"],
    cards: [{"cardId":"axLoadRound","count":2}],
    ability: {"name":"弾込め","description":"使わずに残したマナ1につき、次のターン最初の物理カードの最初の1発のダメージ+4（最大+8）。","effect":{"when":"turnEnd","do":[{"kind":"counter","key":"loaded","fromMana":true,"max":2,"text":"弾を込めた"}]},"also":[{"modifier":"damageDealt","multiplier":1,"add":4,"once":true,"if":[{"kind":"cardCategory","category":"physical"},{"kind":"playedCategoryCount","category":"physical","max":0},{"kind":"counterAtLeast","key":"loaded","n":1,"label":"弾を込めた次のターン"}]},{"modifier":"damageDealt","multiplier":1,"add":4,"once":true,"if":[{"kind":"cardCategory","category":"physical"},{"kind":"playedCategoryCount","category":"physical","max":0},{"kind":"counterAtLeast","key":"loaded","n":2,"label":"弾を2発込めた次のターン"}]}]},
  },
  {
    id: "balancedGun", name: "安定銃", slot: "weapon", weaponType: "gun", rarity: "rare", icon: "gun",
    description: "「×N回」の攻撃を持つカードの成功率+10%。", stats: {"dex":2,"agi":2}, tags: ["physical","multi"],
    cards: [{"cardId":"wtGunFanFire","count":2}],
    ability: {"name":"連射","description":"「×N回」の攻撃を持つカードの成功率+10%。","effect":{"modifier":"cardChance","bonus":10,"if":[{"kind":"cardMultiHit"}]}},
  },
  // エピック
  {
    id: "marksmanGun", name: "狙撃銃", slot: "weapon", weaponType: "gun", rarity: "epic", icon: "gun",
    description: "自分の砲台・罠・召喚が敵にダメージを与えた後、自分に「応援」1（次のカードの成功率+10%）。1ターンに1回。", stats: {"per":8}, tags: ["physical","support"],
    cards: [{"cardId":"wtGunHeadshot","count":2}],
    ability: {"name":"観測射撃","description":"自分の砲台・罠・召喚が敵にダメージを与えた後、自分に「応援」1（次のカードの成功率+10%）。1ターンに1回。","effect":{"when":"summonHit","if":[{"kind":"oncePerTurn","key":"marksmanGun"}],"do":[{"kind":"applyStatus","status":"inspired","amount":1,"to":"self"}]}},
  },
  // レジェンド
  // 既存にレジェンド用カードがないため、エピック以下の武器種カードを共有する。
  {
    id: "duelistsGun", name: "早抜きの銃", slot: "weapon", weaponType: "gun", rarity: "legend", icon: "gun",
    description: "戦闘の1ターン目、物理カードのコスト−1（0より下がらない）。", stats: {"dex":12}, tags: ["physical","mana"],
    cards: [{"cardId":"axQuickDraw","count":2}],
    ability: {"name":"早撃ち","description":"戦闘の1ターン目、物理カードのコスト−1（0より下がらない）。","effect":{"modifier":"cardCost","delta":-1,"if":[{"kind":"cardCategory","category":"physical"},{"kind":"turnAtMost","turn":1}]}},
  },
];
