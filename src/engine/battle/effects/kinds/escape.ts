// 戦闘から逃げる（ボス戦で使えるかは冒険側で判定）
import { addLog } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface EffectParams {
    escape: {};
  }
}

export const effect: EffectHandler<'escape'> = {
  kind: 'escape',
  defaultTo: 'self',
  apply(ctx) {
    ctx.state.phase = 'escaped';
    addLog(ctx.state, '戦闘から逃げ出した！');
    ctx.events.push({ type: 'phase', phase: 'escaped' });
    ctx.parts.push('戦闘から逃げ出した');
    return true;
  },
  describe: () => '戦闘から必ず逃げる（ボス戦では使えない）',
};
