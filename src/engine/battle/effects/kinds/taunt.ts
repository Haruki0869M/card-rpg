// 挑発: 相手の単体攻撃を自分に向ける（次の相手のフェーズ終了まで）
import { resolveTargets, targetOf } from '..';
import { applyTaunt } from '../../intents';
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface EffectParams {
    taunt: {};
  }
}

export const effect: EffectHandler<'taunt'> = {
  kind: 'taunt',
  defaultTo: 'target',
  apply(ctx, e) {
    if (isEnemy(ctx.source)) return false;
    const ts = resolveTargets(ctx, targetOf(e));
    for (const t of ts) if (isEnemy(t)) applyTaunt(t, ctx.source.id, ctx.events);
    if (ts.length) ctx.parts.push(ts.length > 1 || targetOf(e) === 'foes' ? '全体挑発' : '挑発');
    return ts.length > 0;
  },
  describe: (_e, who) => (who === '敵全員に' ? '敵全体の単体攻撃を自分に向ける' : '対象の敵の単体攻撃を自分に向ける'),
  short: (e) => (e.to === 'foes' ? '全' : ''),
};
