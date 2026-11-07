// ===== 成長ボーナスの登録表 =====
// 候補の出し方: 職業の伸びやすい能力値から balance.ts の growthStatPicks 個 + growthExtras の中から1つ。
// 新しい種類: kinds/ にファイルを1つ置き、balance.ts の growthExtras にIDを足す
import { BALANCE } from '../../../data/balance';
import { getClass } from '../../../data/classes';
import type { GrowthOption, Hero, StatId } from '../../../types';
import type { Rng } from '../../rng';
import { STAT_IDS } from '../hero';
import type { GrowthHandler } from './types';
import { jobOptions } from '../jobs';

export type { GrowthHandler } from './types';

const HANDLERS = new Map<string, GrowthHandler>();
for (const [path, mod] of Object.entries(import.meta.glob('./kinds/*.ts', { eager: true }) as Record<string, { growth?: GrowthHandler }>)) {
  if (!mod.growth) throw new Error(`growth file without "export const growth": ${path}`);
  HANDLERS.set(mod.growth.kind, mod.growth);
}

export function growthHandler(kind: string): GrowthHandler {
  const h = HANDLERS.get(kind);
  if (!h) throw new Error(`Unknown growth kind: ${kind}`);
  return h;
}

/** 成長ボーナスの候補（職業の伸びやすい能力値を優先） */
export function growthOptions(hero: Hero, rng: Rng): GrowthOption[] {
  const weights = getClass(hero.classId).growthWeights;
  const bag: StatId[] = STAT_IDS.flatMap((s) => Array.from({ length: 1 + (weights[s] ?? 0) }, () => s));
  const stats: StatId[] = [];
  for (let i = 0; i < 20 && stats.length < BALANCE.growthStatPicks; i++) {
    const s = bag[rng.int(bag.length)];
    if (!stats.includes(s)) stats.push(s);
  }
  const opts: GrowthOption[] = stats.map((s) => ({ ...growthHandler('stat').make(hero), stat: s }));
  const extra = BALANCE.growthExtras.map(growthHandler).filter((h) => h.available?.(hero) ?? true);
  if (extra.length) opts.push(extra[rng.int(extra.length)].make(hero));
  // 転職できるジョブがあれば、その候補も出す（spec §6.4）
  for (const o of jobOptions(hero)) if (o.ready) opts.push({ kind: 'jobChange', amount: 0, jobId: o.job.id });
  return opts;
}
