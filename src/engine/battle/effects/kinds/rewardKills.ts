// 区切りD-4 決め技の部品: rewardKills: このカードで倒した敵1体につき、味方全員のフォーカス+focus（覇王滅砕撃）
import { type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    rewardKills: { focus: number };
  }
}

export const effect: EffectHandler<'rewardKills'> = {
  kind: 'rewardKills',
  defaultTo: 'allies',
  apply(ctx, e) {
    const n = ctx.state.enemies.filter((x) => x.dead && ctx.hitIds.includes(x.uid)).length;
    if (n <= 0) return false;
    for (const a of ctx.state.allies) if (!a.dead) a.focus = Math.min(a.focusMax, a.focus + n * e.focus);
    ctx.parts.push(`覇道の圧（フォーカス+${n * e.focus}）`);
    return true;
  },
  describe: (e) => `このカードで倒した敵1体につき、味方全員のフォーカス+${e.focus}`,
};
