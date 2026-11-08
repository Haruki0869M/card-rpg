// お供の懐き度を上げる（K7 の突発イベント・K2 のお供のおやつで共通に使う。乱数は使わない）
import { addPetLove } from '../../pets';
import type { Hero } from '../../../../types';
import type { OutcomeCtx, OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    /** amount: 上げる点数 / all: 場面の全員のお供 */
    petLove: { amount: number; all?: boolean };
  }
}

/** 対象のうちお供を連れているキャラ。1人だけの時、対象がお供を連れていなければ、場面でお供を連れている先頭のキャラ */
function petOwners(ctx: OutcomeCtx, all?: boolean): Hero[] {
  const withPet = ctx.targets(all).filter((h) => h.pet);
  if (withPet.length || all) return withPet;
  return ctx.targets(true).filter((h) => h.pet).slice(0, 1);
}

export const outcome: OutcomeHandler<'petLove'> = {
  kind: 'petLove',
  apply(ctx, o) {
    for (const h of petOwners(ctx, o.all)) addPetLove(ctx.game, h, o.amount);
  },
  check: (ctx, o) => (ctx.targets(o.all).some((h) => h.pet) ? null : 'お供を連れていません'),
  describe: (o) => `${o.all ? '全員の' : ''}お供の懐き度+${o.amount}`,
};
