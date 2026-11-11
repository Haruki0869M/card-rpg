// 区切りE: 時の砂時計。敵全員の次の行動の数値を半分にする（乱数は使わない）
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    halveIntents: object;
  }
}

export const effect: EffectHandler<'halveIntents'> = {
  kind: 'halveIntents',
  defaultTo: 'foes',
  apply(ctx) {
    let any = false;
    for (const t of ctx.state.enemies) {
      if (t.dead || !t.intent) continue;
      t.nextActionMultiplier = (t.nextActionMultiplier ?? 1) * 0.5;
      any = true;
    }
    if (any) ctx.parts.push('敵の時間が遅れた');
    return any;
  },
  describe: () => '敵全員の次の行動の数値を半分にする',
};
