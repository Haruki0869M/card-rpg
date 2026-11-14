// 自分が持っている力（name）の効果を、その場で1回出す（竜牙突き: 《竜のブレス》・天下割り: 《覇気》）。
// その力を持っていなければ何もしない（転職して、力が変わった後など）
import { applyEffect, makeCtx } from '..';
import { abilitiesOf } from '../../../abilities';
import { abilityTriggered, isEnemy, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    triggerAbility: { name: string };
  }
}

export const effect: EffectHandler<'triggerAbility'> = {
  kind: 'triggerAbility',
  defaultTo: 'self',
  apply(ctx, e) {
    const me = ctx.source;
    if (isEnemy(me) || me.dead) return false;
    const ab = abilitiesOf(me).find((a) => a.name === e.name && 'do' in a.effect);
    if (!ab || !('do' in ab.effect)) return false;
    // カードの効果とは別の物として出す（カードの倍率は乗せない）
    const own = makeCtx(ctx.state, ctx.rng, ctx.events, me, {});
    let any = false;
    for (const eff of ab.effect.do) any = applyEffect(own, eff) || any;
    if (any) { abilityTriggered(ctx.state, unitIdOf(me), ab.name, ctx.events, ab.source); ctx.parts.push(`《${e.name}》`); }
    return any;
  },
  describe: (e) => `自分の《${e.name}》が、その場で1回出る（《${e.name}》を持っている時）`,
};
