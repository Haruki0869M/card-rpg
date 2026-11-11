// 武器（武器の種類ごとにコモン→レジェンド）
import type { ItemDef } from '../../../types';

export const weapons: ItemDef[] = [
  // 剣
  { id: 'copperSword', name: '銅の剣', slot: 'weapon', weaponType: 'sword', rarity: 'common', icon: 'sword', description: '駆け出しの剣士の相棒。', cards: [{ cardId: 'wSlash', count: 2 }] },
  {
    id: "steelSword", name: "鋼の剣", slot: "weapon", weaponType: "sword", rarity: "rare", icon: "sword",
    description: "物理カードが完全成功した後、自分に「応援」1（次のカードの成功率+10%）。1ターンに1回。", stats: {"str":4}, tags: ["physical"],
    cards: [{"cardId":"wSteelCombo","count":2}],
    ability: {"name":"見切り","description":"物理カードが完全成功した後、自分に「応援」1（次のカードの成功率+10%）。1ターンに1回。","effect":{"when":"perfect","if":[{"kind":"cardCategory","category":"physical"},{"kind":"oncePerTurn","key":"steelSword"}],"do":[{"kind":"applyStatus","status":"inspired","amount":1,"to":"self"}]}},
  },
  {
    id: "mithrilSword", name: "ミスリルソード", slot: "weapon", weaponType: "sword", rarity: "epic", icon: "sword",
    description: "カードが完全成功した後、自分に「応援」1（1ターンに1回）。「応援」を持ったままターンを終えると、応援1つにつきブロック3。", stats: {"str":8,"agi":5}, tags: ["physical","block"],
    cards: [{"cardId":"wMithrilSlash","count":2}],
    ability: {"name":"白銀の冴え","description":"カードが完全成功した後、自分に「応援」1（1ターンに1回）。「応援」を持ったままターンを終えると、応援1つにつきブロック3。","effect":{"when":"perfect","if":[{"kind":"oncePerTurn","key":"mithrilSword"}],"do":[{"kind":"applyStatus","status":"inspired","amount":1,"to":"self"}]},"also":[{"when":"turnEnd","if":[{"kind":"selfStatus","status":"inspired","min":1}],"do":[{"kind":"blockFromStatus","status":"inspired","of":"self","mult":3}]}]},
  },
  { id: 'flameSword', name: '炎の大剣', slot: 'weapon', weaponType: 'sword', rarity: 'legend', icon: 'sword', description: '刀身に炎の精霊が宿る大剣。', stats: { str: 12 }, cards: [{ cardId: 'wFlameSlash', count: 2 }] , ability: { name: '炎の精霊', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'cardHasDamage' }], do: [{ kind: 'applyStatus', status: 'burn', amount: 2 }] } } },
  // 杖
  { id: 'oakStaff', name: '樫の杖', slot: 'weapon', weaponType: 'staff', rarity: 'common', icon: 'staff', description: '魔法を学ぶ者が最初に持つ杖。', cards: [{ cardId: 'wManaBolt', count: 2 }] },
  { id: 'magusStaff', name: '魔導士の杖', slot: 'weapon', weaponType: 'staff', rarity: 'rare', icon: 'staff', description: '魔力を増幅する宝玉付きの杖。', stats: { int: 5 }, cards: [{ cardId: 'wManaTorrent', count: 2 }] },
  { id: 'thunderStaff', name: '雷霆の杖', slot: 'weapon', weaponType: 'staff', rarity: 'epic', icon: 'staff', description: '天の雷を呼ぶ杖。', stats: { int: 8 }, focusMax: 1, cards: [{ cardId: 'wLightning', count: 2 }] , ability: { name: '雷鳴', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'magic' }], do: [{ kind: 'damage', amount: 6, to: 'randomFoe' }] } } },
  { id: 'starStaff', name: '星詠みの杖', slot: 'weapon', weaponType: 'staff', rarity: 'legend', icon: 'staff', description: '星の運行を読む賢者の杖。', stats: { int: 12, luk: 5 }, focusMax: 1, cards: [{ cardId: 'wStarfall', count: 2 }] , ability: { name: '星の加護', effect: { modifier: 'damageDealt', multiplier: 1.25, if: [{ kind: 'cardCategory', category: 'magic' }] } } },
  // 槌
  { id: 'oakHammer', name: '樫の槌', slot: 'weapon', weaponType: 'hammer', rarity: 'common', icon: 'hammer', description: '頑丈な樫で作られた槌。', cards: [{ cardId: 'wPound', count: 2 }] },
  {
    id: "steelHammer", name: "鋼の槌", slot: "weapon", weaponType: "hammer", rarity: "rare", icon: "hammer",
    description: "自分にブロックがある間、物理カードの基本ダメージ+3（1回の攻撃ごと。力などの倍率もかかる）。", stats: {"str":4,"vit":3}, tags: ["physical","block"],
    cards: [{"cardId":"wIronHammer","count":2}],
    ability: {"name":"盾打ち","description":"自分にブロックがある間、物理カードの基本ダメージ+3（1回の攻撃ごと。力などの倍率もかかる）。","effect":{"modifier":"damageDealt","multiplier":1,"add":3,"if":[{"kind":"cardCategory","category":"physical"},{"kind":"selfBlockAtLeast","n":1}]}},
  },
  {
    id: "holyHammer", name: "聖騎士の槌", slot: "weapon", weaponType: "hammer", rarity: "epic", icon: "hammer",
    description: "ターン開始時、前のターンのブロックが残っていれば、HPを2回復。", stats: {"vit":6}, maxHp: 8, tags: ["physical","block","heal"],
    cards: [{"cardId":"wHolyHammer","count":2}],
    ability: {"name":"守りの祈り","description":"ターン開始時、前のターンのブロックが残っていれば、HPを2回復。","effect":{"when":"turnStart","if":[{"kind":"counterAtLeast","key":"blockLeft","n":1,"label":"前のターンのブロックが残っている時"}],"do":[{"kind":"heal","amount":2,"to":"self"}]}},
  },
  { id: 'guardianMaul', name: '守護神の大槌', slot: 'weapon', weaponType: 'hammer', rarity: 'legend', icon: 'hammer', description: '仲間を守る大地の力が宿る。', stats: { vit: 10, str: 5 }, maxHp: 12, cards: [{ cardId: 'wEarthGuard', count: 2 }] , ability: { name: '守護神', effect: { modifier: 'coverLethal', chance: 35 } } },
  // 弓
  { id: 'hunterBow', name: '狩人の弓', slot: 'weapon', weaponType: 'bow', rarity: 'common', icon: 'bow', description: '森の狩人の使い慣れた弓。', cards: [{ cardId: 'wAimedShot', count: 2 }] },
  {
    id: "steelBow", name: "鋼の弓", slot: "weapon", weaponType: "bow", rarity: "rare", icon: "bow",
    description: "大技を予告している敵を狙うカードの成功率+15%。", stats: {"dex":4}, tags: ["physical","single"],
    cards: [{"cardId":"wDoubleShot","count":2}],
    ability: {"name":"崩しの矢","description":"大技を予告している敵を狙うカードの成功率+15%。","effect":{"modifier":"cardChance","bonus":15,"if":[{"kind":"targetBigIntent"}]}},
  },
  {
    id: "skyBow", name: "天穿つ弓", slot: "weapon", weaponType: "bow", rarity: "legend", icon: "bow",
    description: "敵が BREAK した後、その敵を狙う次のカード1枚が必ず完全成功になる。1ターンに1回。", stats: {"dex":10,"per":8}, tags: ["physical","single"],
    cards: [{"cardId":"wSkyPiercer","count":2}],
    ability: {"name":"天穿ち","description":"敵が BREAK した後、その敵を狙う次のカード1枚が必ず完全成功になる。1ターンに1回。","effect":{"modifier":"completeSlots","turnKey":"skyBow","if":[{"kind":"targetBroken"}]}},
  },
  // ---- 転職システムで増えた武器の種類の、最初の武器（spec §6.4）----
  { id: 'clothWraps', name: '布の手甲', slot: 'weapon', weaponType: 'fist', rarity: 'common', icon: 'fist', description: '拳を守る、使い込んだ布の手甲。', cards: [{ cardId: 'wJab', count: 2 }] },
  { id: 'apprenticeTome', name: '見習いの魔導書', slot: 'weapon', weaponType: 'tome', rarity: 'common', icon: 'tome', description: '召喚の呪文が記された古い魔導書。', cards: [{ cardId: 'wSpiritSpark', count: 2 }] },
  { id: 'woodScepter', name: '木の錫杖', slot: 'weapon', weaponType: 'scepter', rarity: 'common', icon: 'scepter', description: '鈴の付いた、祈りのための錫杖。', cards: [{ cardId: 'wChime', count: 2 }] },
  { id: 'rustyDagger', name: '古びた短剣', slot: 'weapon', weaponType: 'dagger', rarity: 'common', icon: 'dagger', description: '刃こぼれした、よく手になじむ短剣。', cards: [{ cardId: 'wQuickStab', count: 2 }] },
  { id: 'ironSpear', name: '鉄の槍', slot: 'weapon', weaponType: 'spear', rarity: 'common', icon: 'spear', description: '長くまっすぐな鉄の槍。', cards: [{ cardId: 'wThrust', count: 2 }] },
  { id: 'plainKatana', name: '無銘の刀', slot: 'weapon', weaponType: 'katana', rarity: 'common', icon: 'katana', description: '銘の無い、よく斬れる刀。', cards: [{ cardId: 'wIaiCut', count: 2 }] },
  { id: 'woodAxe', name: '木こりの斧', slot: 'weapon', weaponType: 'axe', rarity: 'common', icon: 'axe', description: '分厚い刃の、重たい斧。', cards: [{ cardId: 'wCleave', count: 2 }] },
  { id: 'rustyScythe', name: '錆びた大鎌', slot: 'weapon', weaponType: 'scythe', rarity: 'common', icon: 'scythe', description: '刃に黒い染みの残る、不吉な大鎌。', cards: [{ cardId: 'wReap', count: 2 }], tags: ['curse'] },
  { id: 'leatherWhip', name: '革の鞭', slot: 'weapon', weaponType: 'whip', rarity: 'common', icon: 'whip', description: '獣を導くための、しなやかな革の鞭。', cards: [{ cardId: 'wLash', count: 2 }] },
];
