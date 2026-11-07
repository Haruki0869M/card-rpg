// 経験値（全員。レベルが上がることもある）
import { BALANCE } from '../../../../data/balance';
import { getClass } from '../../../../data/classes';
import { livingHeroes } from '../../heroes';
import { expToNext, heroMaxHp } from '../../hero';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    exp: { amount: number };
  }
}

export const outcome: OutcomeHandler<'exp'> = {
  kind: 'exp',
  apply(ctx, o) {
    for (const h of livingHeroes(ctx.game)) {
      h.exp += o.amount;
      while (h.level < BALANCE.maxLevel && h.exp >= expToNext(h.level, h.classId)) {
        h.exp -= expToNext(h.level, h.classId);
        h.level += 1;
        h.hp = Math.min(heroMaxHp(h), h.hp + getClass(h.classId).hpPerLevel);
      }
    }
  },
  describe: (o) => `全員 経験値+${o.amount}`,
};
