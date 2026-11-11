// ごほうび（区切りD）: お供の「ターン終了時」の能力を、今すぐ1回働かせる（その能力が無いお供・お供がいない時はフォーカス+1）。1ターンに1回
import { abilitiesOf, fireAbilities } from '../../../abilities';
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    petTreat: object;
  }
}

export const effect: EffectHandler<'petTreat'> = {
  kind: 'petTreat',
  defaultTo: 'self',
  apply(ctx) {
    const u = ctx.source;
    if (isEnemy(u)) return false;
    const cs = (u.counters ??= {});
    if (cs.petTreatTurn === ctx.state.turn) return false;
    cs.petTreatTurn = ctx.state.turn;
    const list = abilitiesOf(u).filter((ab) => ab.pet && 'when' in ab.effect && ab.effect.when === 'turnEnd');
    const res = list.length ? fireAbilities(ctx.state, ctx.rng, ctx.events, u, 'turnEnd', { list, depth: ctx.depth + 1 }) : [];
    if (res.length) {
      ctx.parts.push(`ごほうび: ${res.join('・')}`);
      return true;
    }
    u.focus = Math.min(u.focusMax, u.focus + 1);
    ctx.parts.push('フォーカス+1');
    return true;
  },
  describe: () => 'お供の「ターン終了時」の能力が、すぐに1回働く（その能力が無い時はフォーカス+1）。1ターンに1回',
};
