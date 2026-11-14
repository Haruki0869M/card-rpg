// 区切りD-4 決め技の部品: 英雄たちの交響曲。自分以外の味方（1人の時は自分）に、フォーカス・マナ・次の攻撃カードの倍率
import { isEnemy, type Unit } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    symphony: { focus?: number; mana?: number; boostPct?: number };
  }
}

export const effect: EffectHandler<'symphony'> = {
  kind: 'symphony',
  defaultTo: 'self',
  apply(ctx, e) {
    const others = ctx.state.allies.filter((a) => !a.dead && a !== ctx.source);
    const list: Unit[] = others.length ? others : ctx.source.dead ? [] : [ctx.source];
    for (const u of list) {
      if (isEnemy(u)) continue;
      if (e.focus) u.focus = Math.min(u.focusMax, u.focus + e.focus);
      if (e.mana) u.mana += e.mana;
      if (e.boostPct) (u.counters ??= {}).nextAtkPct = Math.max(u.counters.nextAtkPct ?? 0, e.boostPct);
    }
    if (list.length) ctx.parts.push(e.boostPct ? `次の攻撃×${1 + e.boostPct / 100}` : e.mana ? `マナ+${e.mana}` : `フォーカス+${e.focus}`);
    return list.length > 0;
  },
  describe: (e) => `自分以外の味方全員（1人の時は自分）に${[e.focus ? `フォーカス+${e.focus}` : '', e.mana ? `マナ+${e.mana}` : '', e.boostPct ? `次の攻撃カードのダメージ×${1 + e.boostPct / 100}` : ''].filter(Boolean).join('・')}`,
};
