// 武器（武器の種類ごとにコモン→レジェンド）
import type { ItemDef } from '../../../types';

export const weapons: ItemDef[] = [
  // 剣
  { id: 'copperSword', name: '銅の剣', slot: 'weapon', weaponType: 'sword', rarity: 'common', icon: 'sword', description: '駆け出しの剣士の相棒。', cards: [{ cardId: 'wSlash', count: 2 }] },
  { id: 'steelSword', name: '鋼の剣', slot: 'weapon', weaponType: 'sword', rarity: 'rare', icon: 'sword', description: 'よく鍛えられた鋼の剣。', stats: { str: 4 }, cards: [{ cardId: 'wSteelCombo', count: 2 }] },
  { id: 'mithrilSword', name: 'ミスリルソード', slot: 'weapon', weaponType: 'sword', rarity: 'epic', icon: 'sword', description: '羽のように軽い銀の名剣。', stats: { str: 8, agi: 5 }, cards: [{ cardId: 'wMithrilSlash', count: 2 }] , ability: { name: '見切り', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }], do: [{ kind: 'gainFocus', amount: 1 }] } } },
  { id: 'flameSword', name: '炎の大剣', slot: 'weapon', weaponType: 'sword', rarity: 'legend', icon: 'sword', description: '刀身に炎の精霊が宿る大剣。', stats: { str: 12 }, cards: [{ cardId: 'wFlameSlash', count: 2 }] , ability: { name: '炎の精霊', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }, { kind: 'cardHasDamage' }], do: [{ kind: 'applyStatus', status: 'burn', amount: 2 }] } } },
  // 杖
  { id: 'oakStaff', name: '樫の杖', slot: 'weapon', weaponType: 'staff', rarity: 'common', icon: 'staff', description: '魔法を学ぶ者が最初に持つ杖。', cards: [{ cardId: 'wManaBolt', count: 2 }] },
  { id: 'magusStaff', name: '魔導士の杖', slot: 'weapon', weaponType: 'staff', rarity: 'rare', icon: 'staff', description: '魔力を増幅する宝玉付きの杖。', stats: { int: 5 }, cards: [{ cardId: 'wManaTorrent', count: 2 }] },
  { id: 'thunderStaff', name: '雷霆の杖', slot: 'weapon', weaponType: 'staff', rarity: 'epic', icon: 'staff', description: '天の雷を呼ぶ杖。', stats: { int: 8 }, focusMax: 1, cards: [{ cardId: 'wLightning', count: 2 }] , ability: { name: '雷鳴', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'magic' }], do: [{ kind: 'damage', amount: 6, to: 'randomFoe' }] } } },
  { id: 'starStaff', name: '星詠みの杖', slot: 'weapon', weaponType: 'staff', rarity: 'legend', icon: 'staff', description: '星の運行を読む賢者の杖。', stats: { int: 12, luk: 5 }, focusMax: 1, cards: [{ cardId: 'wStarfall', count: 2 }] , ability: { name: '星の加護', effect: { modifier: 'damageDealt', multiplier: 1.25, if: [{ kind: 'cardCategory', category: 'magic' }] } } },
  // 槌
  { id: 'oakHammer', name: '樫の槌', slot: 'weapon', weaponType: 'hammer', rarity: 'common', icon: 'hammer', description: '頑丈な樫で作られた槌。', cards: [{ cardId: 'wPound', count: 2 }] },
  { id: 'steelHammer', name: '鋼の槌', slot: 'weapon', weaponType: 'hammer', rarity: 'rare', icon: 'hammer', description: '鎧ごと打ち砕く重い槌。', stats: { str: 4, vit: 3 }, cards: [{ cardId: 'wIronHammer', count: 2 }] },
  { id: 'holyHammer', name: '聖騎士の槌', slot: 'weapon', weaponType: 'hammer', rarity: 'epic', icon: 'hammer', description: '祝福を受けた聖騎士の槌。', stats: { vit: 6 }, maxHp: 8, cards: [{ cardId: 'wHolyHammer', count: 2 }] , ability: { name: '祝福', effect: { when: 'turnStart', do: [{ kind: 'heal', amount: 2, to: 'self' }] } } },
  { id: 'guardianMaul', name: '守護神の大槌', slot: 'weapon', weaponType: 'hammer', rarity: 'legend', icon: 'hammer', description: '仲間を守る大地の力が宿る。', stats: { vit: 10, str: 5 }, maxHp: 12, cards: [{ cardId: 'wEarthGuard', count: 2 }] , ability: { name: '守護神', effect: { modifier: 'coverLethal', chance: 35 } } },
  // 弓
  { id: 'hunterBow', name: '狩人の弓', slot: 'weapon', weaponType: 'bow', rarity: 'common', icon: 'bow', description: '森の狩人の使い慣れた弓。', cards: [{ cardId: 'wAimedShot', count: 2 }] },
  { id: 'steelBow', name: '鋼の弓', slot: 'weapon', weaponType: 'bow', rarity: 'rare', icon: 'bow', description: '張りの強い鋼の弓。', stats: { dex: 4 }, cards: [{ cardId: 'wDoubleShot', count: 2 }] },
  { id: 'galeBow', name: '疾風の弓', slot: 'weapon', weaponType: 'bow', rarity: 'epic', icon: 'bow', description: '風の精霊の加護を受けた弓。', stats: { agi: 8, dex: 4 }, cards: [{ cardId: 'wGaleArrow', count: 2 }] , ability: { name: '追い風', effect: { when: 'perfect', do: [{ kind: 'draw', amount: 1 }] } } },
  { id: 'skyBow', name: '天穿つ弓', slot: 'weapon', weaponType: 'bow', rarity: 'legend', icon: 'bow', description: '天をも射抜くと伝わる神弓。', stats: { dex: 10, per: 8 }, cards: [{ cardId: 'wSkyPiercer', count: 2 }] , ability: { name: '天眼', effect: { when: 'perfect', if: [{ kind: 'cardCategory', category: 'physical' }], do: [{ kind: 'damage', amount: 10, to: 'randomFoe' }] } } },
  // ---- 転職システムで増えた武器の種類の、最初の武器（spec §6.4）----
  { id: 'clothWraps', name: '布の手甲', slot: 'weapon', weaponType: 'fist', rarity: 'common', icon: 'fist', description: '拳を守る、使い込んだ布の手甲。', cards: [{ cardId: 'wJab', count: 2 }] },
  { id: 'apprenticeTome', name: '見習いの魔導書', slot: 'weapon', weaponType: 'tome', rarity: 'common', icon: 'tome', description: '召喚の呪文が記された古い魔導書。', cards: [{ cardId: 'wSpiritSpark', count: 2 }] },
  { id: 'woodScepter', name: '木の錫杖', slot: 'weapon', weaponType: 'scepter', rarity: 'common', icon: 'scepter', description: '鈴の付いた、祈りのための錫杖。', cards: [{ cardId: 'wChime', count: 2 }] },
  { id: 'rustyDagger', name: '古びた短剣', slot: 'weapon', weaponType: 'dagger', rarity: 'common', icon: 'dagger', description: '刃こぼれした、よく手になじむ短剣。', cards: [{ cardId: 'wQuickStab', count: 2 }] },
  { id: 'ironSpear', name: '鉄の槍', slot: 'weapon', weaponType: 'spear', rarity: 'common', icon: 'spear', description: '長くまっすぐな鉄の槍。', cards: [{ cardId: 'wThrust', count: 2 }] },
  { id: 'plainKatana', name: '無銘の刀', slot: 'weapon', weaponType: 'katana', rarity: 'common', icon: 'katana', description: '銘の無い、よく斬れる刀。', cards: [{ cardId: 'wIaiCut', count: 2 }] },
];
