// この戦闘の間だけ、自分に特殊能力を足す（捨て身の覚醒。区切りD）。同じ名前の能力は重ならない
import { describeAbility } from '../../../abilities';
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    grantAbility: { abilities: import('../../../../types').AbilityDef[] };
  }
}

export const effect: EffectHandler<'grantAbility'> = {
  kind: 'grantAbility',
  defaultTo: 'self',
  apply(ctx, e) {
    const u = ctx.source;
    if (isEnemy(u) || u.dead) return false;
    const names = new Set(e.abilities.map((a) => a.name));
    if ((u.abilities ?? []).some((a) => names.has(a.name) && a.source?.kind === 'card')) return false;
    u.abilities = [...(u.abilities ?? []), ...e.abilities.map((a) => ({ ...a, source: { kind: 'card' as const, label: a.name } }))];
    ctx.parts.push(`《${[...names].join('・')}》`);
    return true;
  },
  describe: (e) => `この戦闘の間、自分に《${e.abilities[0]?.name ?? ''}》（${e.abilities.map((a) => describeAbility(a)).join('。')}）`,
};
