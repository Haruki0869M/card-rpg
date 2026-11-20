// かこめ！（2026-11-14・docs/tasks/job-axes-plan2.md 調教師A）: 対象に付いている悪い状態異常1種類につき、
// お供がその敵へ1回行動する（最大 max 回）。状態異常は消さない（オーナーの返事 3A）。
// お供の行動は、全部合わせて1ターン4回まで（petActOnce の中で数える）。対象が倒れていたら、お供は動かない
import { petActOnce } from '../../../abilities';
import { getStatus } from '../../../../data/statuses';
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    petPounce: { max: number };
  }
}

/** 対象に付いている悪い状態異常の種類の数 */
const harmfulKinds = (statuses: Record<string, number | undefined>) =>
  Object.entries(statuses).filter(([id, n]) => (n ?? 0) > 0 && getStatus(id).harmful).length;

export const effect: EffectHandler<'petPounce'> = {
  kind: 'petPounce',
  defaultTo: 'target',
  apply(ctx, e) {
    const t = ctx.target;
    if (!t || !isEnemy(t) || t.dead || isEnemy(ctx.source)) return false;
    // 回数は最初に決める（お供の行動で状態異常が増えても、この1枚の回数は変わらない）
    const n = Math.min(e.max, harmfulKinds(t.statuses));
    if (n <= 0) { ctx.parts.push('悪い状態異常が無い'); return false; }
    let done = 0;
    for (let k = 0; k < n; k++) {
      if (t.dead || ctx.source.dead) break;
      const res = petActOnce(ctx.state, ctx.rng, ctx.events, ctx.source, ctx.depth + 1, t);
      if (!res) break;
      ctx.parts.push(`お供が飛びかかった: ${res}`);
      done++;
    }
    return done > 0;
  },
  describe: (e) => `対象の悪い状態異常1種類につき、お供がその敵へ1回行動（最大${e.max}回。状態異常は消えない）`,
  short: (e) => `お供×${e.max}`,
};
