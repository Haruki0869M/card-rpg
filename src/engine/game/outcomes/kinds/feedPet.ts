// お供のおやつ（K2）: 使った相手のお供の懐き度を増やす
import { addPetLove } from '../../pets';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    feedPet: { amount: number };
  }
}

export const outcome: OutcomeHandler<'feedPet'> = {
  kind: 'feedPet',
  apply(ctx, o) {
    for (const h of ctx.targets()) addPetLove(ctx.game, h, o.amount);
  },
  check: (ctx) => (ctx.targets().some((h) => h.pet) ? null : 'お供がいません'),
  describe: (o) => `お供の懐き度+${o.amount}`,
};
