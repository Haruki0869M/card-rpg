// 防具（K2）。量産は docs/archive/tasks/K2-equipment.md のとおりに足す
import type { ItemDef } from '../../../types';

export const armors2: ItemDef[] = [
  { id: 'wayfarerCloak', name: '旅人の外套', slot: 'armor', rarity: 'rare', icon: 'robe', description: '雨も夜露もしのげる。野営でよく休める。', tags: ['heal', 'block'], maxHp: 6, explore: { campHeal: 0.25 }, ability: { name: '旅の知恵', effect: { when: 'battleStart', do: [{ kind: 'block', amount: 4 }] } } },
  // 宿題3（2026-11-14）: オーバーヒールの入口。星の城だけ → どのシナリオでも（効果は変えない）
  { id: 'angelRobe', name: '天使の羽衣', slot: 'armor', rarity: 'epic', icon: 'robe', description: 'HPを回復するたびに、回復した量の半分のブロックも得る。', maxHp: 12, tags: ['heal', 'block'], ability: { name: '福音', description: 'HPを回復した時、回復した量の50%のブロックも得る', effect: { modifier: 'healToBlock', pct: 0.5 } } },
];
