// 弾込め（区切りD）: 次に使う「×N回」の攻撃カードの回数+1（1ターンに1回）
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    loadRound: object;
  }
}

export const effect: EffectHandler<'loadRound'> = {
  kind: 'loadRound',
  defaultTo: 'self',
  apply(ctx) {
    const u = ctx.source;
    if (isEnemy(u)) return false;
    const cs = (u.counters ??= {});
    if (cs.loadRoundTurn === ctx.state.turn) return false;
    cs.loadRoundTurn = ctx.state.turn;
    u.extraHits = 1;
    ctx.parts.push('次の連射+1回');
    return true;
  },
  describe: () => '次に使う「×N回」の攻撃カードの回数+1（1ターンに1回）',
};
