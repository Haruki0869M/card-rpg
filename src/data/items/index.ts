// 装備品・消費アイテム。アイテムを増やすときはここに1件追加する
import type { ItemDef } from '../../types';
import { createRegistry } from '../registry';

const weapons: ItemDef[] = [
  // 剣
  { id: 'copperSword', name: '銅の剣', slot: 'weapon', weaponType: 'sword', rarity: 'common', icon: 'sword', description: '駆け出しの剣士の相棒。', cards: [{ cardId: 'wSlash', count: 2 }] },
  { id: 'steelSword', name: '鋼の剣', slot: 'weapon', weaponType: 'sword', rarity: 'rare', icon: 'sword', description: 'よく鍛えられた鋼の剣。', stats: { str: 4 }, cards: [{ cardId: 'wSteelCombo', count: 2 }] },
  { id: 'mithrilSword', name: 'ミスリルソード', slot: 'weapon', weaponType: 'sword', rarity: 'epic', icon: 'sword', description: '羽のように軽い銀の名剣。', stats: { str: 8, agi: 5 }, cards: [{ cardId: 'wMithrilSlash', count: 2 }] },
  { id: 'flameSword', name: '炎の大剣', slot: 'weapon', weaponType: 'sword', rarity: 'legend', icon: 'sword', description: '刀身に炎の精霊が宿る大剣。', stats: { str: 12 }, cards: [{ cardId: 'wFlameSlash', count: 2 }] },
  // 杖
  { id: 'oakStaff', name: '樫の杖', slot: 'weapon', weaponType: 'staff', rarity: 'common', icon: 'staff', description: '魔法を学ぶ者が最初に持つ杖。', cards: [{ cardId: 'wManaBolt', count: 2 }] },
  { id: 'magusStaff', name: '魔導士の杖', slot: 'weapon', weaponType: 'staff', rarity: 'rare', icon: 'staff', description: '魔力を増幅する宝玉付きの杖。', stats: { int: 5 }, cards: [{ cardId: 'wManaTorrent', count: 2 }] },
  { id: 'thunderStaff', name: '雷霆の杖', slot: 'weapon', weaponType: 'staff', rarity: 'epic', icon: 'staff', description: '天の雷を呼ぶ杖。', stats: { int: 8 }, focusMax: 1, cards: [{ cardId: 'wLightning', count: 2 }] },
  { id: 'starStaff', name: '星詠みの杖', slot: 'weapon', weaponType: 'staff', rarity: 'legend', icon: 'staff', description: '星の運行を読む賢者の杖。', stats: { int: 12, luk: 5 }, focusMax: 1, cards: [{ cardId: 'wStarfall', count: 2 }] },
  // 槌
  { id: 'oakHammer', name: '樫の槌', slot: 'weapon', weaponType: 'hammer', rarity: 'common', icon: 'hammer', description: '頑丈な樫で作られた槌。', cards: [{ cardId: 'wPound', count: 2 }] },
  { id: 'steelHammer', name: '鋼の槌', slot: 'weapon', weaponType: 'hammer', rarity: 'rare', icon: 'hammer', description: '鎧ごと打ち砕く重い槌。', stats: { str: 4, vit: 3 }, cards: [{ cardId: 'wIronHammer', count: 2 }] },
  { id: 'holyHammer', name: '聖騎士の槌', slot: 'weapon', weaponType: 'hammer', rarity: 'epic', icon: 'hammer', description: '祝福を受けた聖騎士の槌。', stats: { vit: 6 }, maxHp: 8, cards: [{ cardId: 'wHolyHammer', count: 2 }] },
  { id: 'guardianMaul', name: '守護神の大槌', slot: 'weapon', weaponType: 'hammer', rarity: 'legend', icon: 'hammer', description: '仲間を守る大地の力が宿る。', stats: { vit: 10, str: 5 }, maxHp: 12, cards: [{ cardId: 'wEarthGuard', count: 2 }] },
  // 弓
  { id: 'hunterBow', name: '狩人の弓', slot: 'weapon', weaponType: 'bow', rarity: 'common', icon: 'bow', description: '森の狩人の使い慣れた弓。', cards: [{ cardId: 'wAimedShot', count: 2 }] },
  { id: 'steelBow', name: '鋼の弓', slot: 'weapon', weaponType: 'bow', rarity: 'rare', icon: 'bow', description: '張りの強い鋼の弓。', stats: { dex: 4 }, cards: [{ cardId: 'wDoubleShot', count: 2 }] },
  { id: 'galeBow', name: '疾風の弓', slot: 'weapon', weaponType: 'bow', rarity: 'epic', icon: 'bow', description: '風の精霊の加護を受けた弓。', stats: { agi: 8, dex: 4 }, cards: [{ cardId: 'wGaleArrow', count: 2 }] },
  { id: 'skyBow', name: '天穿つ弓', slot: 'weapon', weaponType: 'bow', rarity: 'legend', icon: 'bow', description: '天をも射抜くと伝わる神弓。', stats: { dex: 10, per: 8 }, cards: [{ cardId: 'wSkyPiercer', count: 2 }] },
];

const armors: ItemDef[] = [
  { id: 'leatherArmor', name: '皮の鎧', slot: 'armor', rarity: 'common', icon: 'armor', description: 'なめし皮の軽い鎧。', maxHp: 5 },
  { id: 'travelerClothes', name: '旅人の服', slot: 'armor', rarity: 'common', icon: 'robe', description: '動きやすい丈夫な服。', maxHp: 3, stats: { agi: 5 } },
  { id: 'ironArmor', name: '鉄の鎧', slot: 'armor', rarity: 'rare', icon: 'armor', description: '鉄板を重ねた鎧。', maxHp: 10, startBlock: 3 },
  { id: 'magicRobe', name: '魔法の法衣', slot: 'armor', rarity: 'rare', icon: 'robe', description: '魔力の糸で織られた法衣。', maxHp: 6, stats: { int: 8 } },
  { id: 'knightArmor', name: '騎士の鎧', slot: 'armor', rarity: 'epic', icon: 'armor', description: '王国騎士団の正式な鎧。', maxHp: 15, startBlock: 6, stats: { vit: 5 } },
  { id: 'sageRobe', name: '賢者のローブ', slot: 'armor', rarity: 'epic', icon: 'robe', description: '賢者が代々受け継いだローブ。', maxHp: 8, stats: { int: 12 }, focusMax: 1 },
  { id: 'mithrilMail', name: 'ミスリルメイル', slot: 'armor', rarity: 'legend', icon: 'armor', description: '軽く、どんな刃も通さない。', maxHp: 20, startBlock: 8, stats: { agi: 5 } },
  { id: 'dragonArmor', name: '竜鱗の鎧', slot: 'armor', rarity: 'legend', icon: 'armor', description: '古竜の鱗で作られた鎧。', maxHp: 25, startBlock: 10, stats: { str: 5 } },
];

const accessories: ItemDef[] = [
  { id: 'luckyCharm', name: '幸運のお守り', slot: 'accessory', rarity: 'common', icon: 'charm', description: '宝箱を開ける時に頼りになる。', stats: { luk: 10 } },
  { id: 'swiftBoots', name: '疾風の靴', slot: 'accessory', rarity: 'common', icon: 'boots', description: '足取りが軽くなる靴。', stats: { agi: 10 } },
  { id: 'powerBracelet', name: '力の腕輪', slot: 'accessory', rarity: 'rare', icon: 'ring', description: '腕に力がみなぎる。', stats: { str: 8 } },
  { id: 'wisdomPin', name: '知恵の髪飾り', slot: 'accessory', rarity: 'rare', icon: 'charm', description: '頭が冴えわたる髪飾り。', stats: { int: 8 } },
  { id: 'focusRing', name: '集中の指輪', slot: 'accessory', rarity: 'rare', icon: 'ring', description: 'フォーカスの最大値+1。', focusMax: 1 },
  { id: 'foresightAmulet', name: '先読みの首飾り', slot: 'accessory', rarity: 'epic', icon: 'amulet', description: '毎ターン、カードを1枚多く引く。', extraDraw: 1 },
  { id: 'guardTalisman', name: '守りの護符', slot: 'accessory', rarity: 'epic', icon: 'amulet', description: '戦闘開始時にブロック5。', startBlock: 5, stats: { vit: 5 } },
  { id: 'heroCrest', name: '英雄の紋章', slot: 'accessory', rarity: 'legend', icon: 'crest', description: '伝説の英雄の証。', stats: { str: 5, vit: 5, int: 5, per: 5, dex: 5, agi: 5, luk: 5 }, focusMax: 1 },
];

const consumables: ItemDef[] = [
  { id: 'potion', name: '回復薬', slot: 'consumable', rarity: 'common', icon: 'potion', description: '味方1人のHPを20回復。', use: { kind: 'heal', amount: 20 } },
  { id: 'hiPotion', name: '上回復薬', slot: 'consumable', rarity: 'rare', icon: 'potion', description: '味方1人のHPを45回復。', use: { kind: 'heal', amount: 45 } },
  { id: 'ether', name: '気付け薬', slot: 'consumable', rarity: 'common', icon: 'ether', description: '味方1人のフォーカスを2回復。', use: { kind: 'focus', amount: 2 } },
  { id: 'antidote', name: '万能薬', slot: 'consumable', rarity: 'common', icon: 'antidote', description: '味方1人の悪い状態異常をすべて治す。', use: { kind: 'cleanse' } },
  { id: 'smokeBomb', name: '煙玉', slot: 'consumable', rarity: 'rare', icon: 'smoke', description: '戦闘から必ず逃げられる（ボス戦では使えない）。', use: { kind: 'escape' } },
];

export const ITEMS = createRegistry<ItemDef>('item', [...weapons, ...armors, ...accessories, ...consumables]);
export const getItem = (id: string) => ITEMS.get(id);

/** 消費アイテムの袋の上限 */
export const POUCH_LIMIT = 8;
