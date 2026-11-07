import { BALANCE } from '../../data/balance';
import type { Hero, SlotResult, StatId } from '../../types';

/** 確定済みの判定だけ記録する。表示・振る処理からは呼ばない。 */
export function recordCheck(hero: Hero, stat: StatId, results: SlotResult[], need: number, purpose?: 'mechanism') {
  if (!results.length) return;
  const hits = results.filter(r => r !== 'miss').length;
  const f = (hero.feats ??= {});
  if (stat === 'luk') {
    if (hits >= need) f['checks:luk'] = (f['checks:luk'] ?? 0) + 1;
    if (hits === results.length) f['perfects:luk'] = (f['perfects:luk'] ?? 0) + 1;
  }
  if (purpose === 'mechanism' && hits >= need) f['checks:mechanism'] = (f['checks:mechanism'] ?? 0) + 1;
}

/** 能力値の判定の成功率（%）。カードと同じく 5〜95% に制限 */
export function finalChanceOf(value: number): number {
  return Math.max(BALANCE.chanceMin, Math.min(BALANCE.chanceMax, Math.round(value)));
}
