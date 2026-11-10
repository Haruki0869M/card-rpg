// ===== 場面のタブの名前（純粋な関数） =====
// 同じダンジョンに別々に入ると、同じ名前のタブが2つになる（合流は別の段階で作る）。
// 同じ名前が2つ以上ある時だけ、先頭のキャラの名前を付けて見分けられるようにする（2026-11-10 の実機の不具合）
import type { Expedition, Hero } from '../types';

export function sceneTabLabels(exps: Expedition[], heroes: Hero[]): string[] {
  const base = exps.map((x) => x.dungeon?.name ?? 'ダンジョン');
  const count = new Map<string, number>();
  for (const b of base) count.set(b, (count.get(b) ?? 0) + 1);
  return exps.map((x, i) => {
    if ((count.get(base[i]) ?? 0) < 2) return base[i];
    const lead = heroes.find((h) => h.id === x.heroes[0])?.name;
    return lead ? `${base[i]}（${lead}）` : base[i];
  });
}
