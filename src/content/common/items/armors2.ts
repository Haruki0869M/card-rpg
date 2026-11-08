// 防具（K2）。量産は docs/tasks/K2-equipment.md のとおりに足す
import type { ItemDef } from '../../../types';

export const armors2: ItemDef[] = [
  { id: 'wayfarerCloak', name: '旅人の外套', slot: 'armor', rarity: 'rare', icon: 'robe', description: '雨も夜露もしのげる。野営でよく休める。', maxHp: 6, explore: { campHeal: 0.25 }, ability: { name: '旅の知恵', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 4 }] } } },
];
