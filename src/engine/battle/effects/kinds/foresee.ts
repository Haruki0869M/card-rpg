// 先読み: ランダムな敵 count 体の「次のターンの行動」まで決めて見せる。vulnerable があれば弱点を見抜いて脆弱も付ける（オカメインコ）
import { addStatus } from '../../statuses';
import { chooseAction } from '../../intents';
import { isEnemy, nameOf, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    foresee: { count: number; vulnerable?: number };
  }
}

export const effect: EffectHandler<'foresee'> = {
  kind: 'foresee',
  defaultTo: 'randomFoe',
  apply(ctx, e) {
    if (isEnemy(ctx.source)) return false;
    const pool = ctx.state.enemies.filter((x) => !x.dead && !x.queuedActionId);
    const picked = [];
    while (picked.length < e.count && pool.length) picked.push(...pool.splice(ctx.rng.int(pool.length), 1));
    for (const en of picked) {
      en.queuedActionId = chooseAction(en, ctx.state, ctx.rng).id;
      if (e.vulnerable) {
        addStatus(en.statuses, 'vulnerable', e.vulnerable);
        ctx.events.push({ type: 'status', unitId: unitIdOf(en), status: 'vulnerable', amount: e.vulnerable });
      }
      ctx.parts.push(`${nameOf(en)}の次の手を見抜いた`);
    }
    return picked.length > 0;
  },
  describe: (e) => `ランダムな敵${e.count}体の、次のターンの行動まで見せる${e.vulnerable ? `。その敵に「脆弱」${e.vulnerable}` : ''}`,
};
