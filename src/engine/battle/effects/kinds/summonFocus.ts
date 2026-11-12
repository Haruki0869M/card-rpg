// 狙いを合わせろ（ビーストマスター）: このターンの終わりの、自分の召喚（群れの獣・白狼・砲台など）の攻撃が、全部この敵に向かう
import { isEnemy, nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    summonFocus: { unused?: never };
  }
}

export const effect: EffectHandler<'summonFocus'> = {
  kind: 'summonFocus',
  defaultTo: 'target',
  apply(ctx) {
    const u = ctx.source, t = ctx.target;
    if (isEnemy(u) || !t || !isEnemy(t) || t.dead) return false;
    u.summonFocus = { uid: t.uid, turn: ctx.state.turn };
    ctx.parts.push(`召喚の狙いを${nameOf(t)}に`);
    return true;
  },
  describe: () => 'このターンの終わりの、自分の召喚の攻撃が、全部この敵に向かう',
};
