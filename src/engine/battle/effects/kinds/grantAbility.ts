// この戦闘の間だけ、自分に特殊能力を足す（捨て身の覚醒。区切りD）。同じ名前の能力は重ならない
import { describeAbility } from '../../../abilities';
import { resolveTargets, targetOf } from '..';
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    /** turns: 省略 = この戦闘の間 / 0 = この敵の番まで / 1 = 次のターンの終わりまで。to: 'allies' で味方全員に */
    grantAbility: { abilities: import('../../../../types').AbilityDef[]; turns?: number };
  }
}

export const effect: EffectHandler<'grantAbility'> = {
  kind: 'grantAbility',
  defaultTo: 'self',
  apply(ctx, e) {
    const names = new Set(e.abilities.map((a) => a.name));
    let any = false;
    for (const u of resolveTargets(ctx, targetOf(e))) {
      if (isEnemy(u) || u.dead) continue;
      // 戦闘の間ずっとの物は重ならない。一時的な物は、新しい期間で上書き
      if (e.turns === undefined && (u.abilities ?? []).some((a) => names.has(a.name) && a.source?.kind === 'card' && a.untilTurn === undefined)) continue;
      const until = e.turns === undefined ? undefined : ctx.state.turn + e.turns;
      u.abilities = [...(u.abilities ?? []).filter((a) => !(names.has(a.name) && a.source?.kind === 'card' && a.untilTurn !== undefined)), ...e.abilities.map((a) => ({ ...a, source: { kind: 'card' as const, label: a.name }, ...(until !== undefined ? { untilTurn: until } : {}) }))];
      any = true;
    }
    if (any) ctx.parts.push(`《${[...names].join('・')}》`);
    return any;
  },
  describe: (e, who) => `${e.turns === undefined ? 'この戦闘の間' : e.turns === 0 ? 'この敵の番が終わるまで' : '次のターンが終わるまで'}、${who}《${e.abilities[0]?.name ?? ''}》（${e.abilities.map((a) => describeAbility(a)).join('。')}）`,
};
