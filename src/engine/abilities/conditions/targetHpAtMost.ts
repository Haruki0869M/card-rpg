// 相手（対象）のHPが pct% 以下
import type { ConditionHandler } from './types';

declare module '../../../types' {
  interface ConditionParams {
    targetHpAtMost: { pct: number; /** ボス・中ボスとの戦闘では、代わりにこの割合で見る（死の刻） */ bossPct?: number };
  }
}

export const condition: ConditionHandler<'targetHpAtMost'> = {
  kind: 'targetHpAtMost',
  test: (c, cond) => !!c.target && c.target.hp * 100 <= c.target.maxHp * (cond.bossPct !== undefined && (c.state?.boss || c.state?.midboss) ? cond.bossPct : cond.pct),
  describe: (cond) => `対象のHPが${cond.pct}%以下${cond.bossPct !== undefined ? `（ボス・中ボスとの戦闘では${cond.bossPct}%以下）` : ''}なら`,
};
