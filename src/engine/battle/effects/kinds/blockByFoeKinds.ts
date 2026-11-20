// 区切りF: 竜鱗の守り（竜脈術師）。base ＋ 悪い状態異常の種類が一番多い敵の、その種類の数（最大+max）のブロック
import { BALANCE } from '../../../../data/balance';
import { getStatus } from '../../../../data/statuses';
import { unitIdOf } from '../../units';
import { upgradeAmount, type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    /** per = 1種類につき足すブロック（省略は1） */
    blockByFoeKinds: { base: number; max: number; per?: number };
  }
}

export const effect: EffectHandler<'blockByFoeKinds'> = {
  kind: 'blockByFoeKinds',
  defaultTo: 'self',
  apply(ctx, e) {
    const kinds = Math.max(0, ...ctx.state.enemies.filter((x) => !x.dead).map((x) => Object.entries(x.statuses).filter(([id, n]) => (n ?? 0) > 0 && getStatus(id).harmful).length));
    const n = e.base + Math.min(e.max, kinds * (e.per ?? 1));
    ctx.source.block = Math.min(BALANCE.blockMax, ctx.source.block + n);
    ctx.events.push({ type: 'block', unitId: unitIdOf(ctx.source), amount: n });
    ctx.parts.push(`${n}ブロック`);
    return true;
  },
  describe: (e) => `ブロック${e.base}＋悪い状態異常の種類が一番多い敵の、その種類1つにつき+${e.per ?? 1}（最大+${e.max}）`,
  short: (e) => `${e.base}+`,
  upgrade: (e) => ({ ...e, base: upgradeAmount(e.base) }),
};
