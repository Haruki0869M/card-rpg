// お供を呼ぶ: ターン終了時に damage で攻撃するお供（幻獣・獣など）を turns ターン呼び出す。同じ id がいれば呼び直し（残りターンを戻す）
import { getElement } from '../../../../data/elements';
import { isEnemy, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    summon: { id: string; name: string; icon: string; damage: number; turns: number; element?: string; echoPct?: number; intercept?: boolean };
  }
}

export const effect: EffectHandler<'summon'> = {
  kind: 'summon',
  defaultTo: 'self',
  apply(ctx, e) {
    if (isEnemy(ctx.source)) return false;
    const list = (ctx.source.summons ??= []);
    const cur = list.find((x) => x.id === e.id);
    if (cur) {
      cur.turns = Math.max(cur.turns, e.turns);
      cur.damage = Math.max(cur.damage, e.damage);
    } else list.push({ id: e.id, name: e.name, icon: e.icon, damage: e.damage, turns: e.turns, element: e.element, echoPct: e.echoPct, intercept: e.intercept });
    ctx.events.push({ type: 'ability', unitId: unitIdOf(ctx.source), name: e.name });
    ctx.parts.push(`${e.name}を呼んだ`);
    return true;
  },
  describe: (e) =>
    e.echoPct ? `${e.name}を呼ぶ（攻撃時に${e.echoPct}%の威力で追撃、被弾時に消えてダメージを0に）` : `${e.name}を呼ぶ（${e.turns >= 99 ? '戦闘の間ずっと' : `${e.turns}ターン`}、ターン終了時にランダムな敵へ${e.damage}の${e.element ? `${getElement(e.element).name}属性` : ''}ダメージ）`,
  short: (e) => `${e.damage}`,
};
