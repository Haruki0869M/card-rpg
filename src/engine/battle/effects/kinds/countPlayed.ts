// 区切りD-5: このターンに使ったカードの枚数を +n と数える（閃光拳《連打》。拳王の百裂拳などが数える）
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    countPlayed: { n: number };
  }
}

export const effect: EffectHandler<'countPlayed'> = {
  kind: 'countPlayed',
  defaultTo: 'self',
  apply(ctx, e) {
    const u = ctx.source;
    if (isEnemy(u)) return false;
    u.played = (u.played ?? 0) + e.n;
    ctx.parts.push(`連打（${e.n}枚多く数える）`);
    return true;
  },
  describe: (e) => `このターンに使ったカードの枚数を+${e.n}と数える`,
};
