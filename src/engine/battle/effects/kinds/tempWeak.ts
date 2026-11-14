// 区切りE: 紅蓮の油壺。このターン、敵全員の弱点に element を足す（次の味方の番の始めに消える）
import { getElement } from '../../../../data/elements';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    tempWeak: { element: string };
  }
}

export const effect: EffectHandler<'tempWeak'> = {
  kind: 'tempWeak',
  defaultTo: 'foes',
  apply(ctx, e) {
    let any = false;
    for (const t of ctx.state.enemies) if (!t.dead) { t.tempWeak = e.element; any = true; }
    if (any) ctx.parts.push(`敵全員が${getElement(e.element).name}に弱くなった`);
    return any;
  },
  describe: (e) => `このターン、敵全員の弱点に${getElement(e.element).name}属性を足す`,
};
