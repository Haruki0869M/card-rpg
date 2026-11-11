// このターンに使ったカードの属性が min 種類以上（今のカードも数える。カードを使った後のきっかけ）
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    turnElements: { min: number };
  }
}

export const condition: ConditionHandler<'turnElements'> = {
  kind: 'turnElements',
  test: (c, cond) => {
    const turn = c.state?.turn ?? 0;
    return Object.entries((c.self as { counters?: Record<string, number> }).counters ?? {}).filter(([k, v]) => k.startsWith('elTurn:') && v === turn).length >= cond.min;
  },
  describe: (cond) => `同じターンに違う属性のカードを${cond.min}種類使った時`,
};
