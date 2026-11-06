// 防具
import type { ItemDef } from '../../../types';

export const armors: ItemDef[] = [
  { id: 'leatherArmor', name: '皮の鎧', slot: 'armor', rarity: 'common', icon: 'armor', description: 'なめし皮の軽い鎧。', maxHp: 5 },
  { id: 'travelerClothes', name: '旅人の服', slot: 'armor', rarity: 'common', icon: 'robe', description: '動きやすい丈夫な服。', maxHp: 3, stats: { agi: 5 } },
  { id: 'ironArmor', name: '鉄の鎧', slot: 'armor', rarity: 'rare', icon: 'armor', description: '鉄板を重ねた鎧。', maxHp: 10, startBlock: 3 },
  { id: 'magicRobe', name: '魔法の法衣', slot: 'armor', rarity: 'rare', icon: 'robe', description: '魔力の糸で織られた法衣。', maxHp: 6, stats: { int: 8 } },
  { id: 'knightArmor', name: '騎士の鎧', slot: 'armor', rarity: 'epic', icon: 'armor', description: '王国騎士団の正式な鎧。', maxHp: 15, startBlock: 6, stats: { vit: 5 } , ability: { name: '鉄壁の構え', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 3 }] } } },
  { id: 'sageRobe', name: '賢者のローブ', slot: 'armor', rarity: 'epic', icon: 'robe', description: '賢者が代々受け継いだローブ。', maxHp: 8, stats: { int: 12 }, focusMax: 1 , ability: { name: '瞑想', effect: { when: 'turnStart', if: [{ kind: 'focusNotFull' }, { kind: 'chance', pct: 30 }], do: [{ kind: 'gainFocus', amount: 1 }] } } },
  { id: 'mithrilMail', name: 'ミスリルメイル', slot: 'armor', rarity: 'legend', icon: 'armor', description: '軽く、どんな刃も通さない。', maxHp: 20, startBlock: 8, stats: { agi: 5 } , ability: { name: '聖銀の守り', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 5 }] } } },
  { id: 'dragonArmor', name: '竜鱗の鎧', slot: 'armor', rarity: 'legend', icon: 'armor', description: '古竜の鱗で作られた鎧。', maxHp: 25, startBlock: 10, stats: { str: 5 } , ability: { name: '竜の血', effect: { when: 'turnStart', do: [{ kind: 'heal', amount: 3, to: 'self' }] } } },
];
