import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';
declare module '../../../../types' { interface EffectParams { rememberElement: { unused?: never } } }
export const effect: EffectHandler<'rememberElement'> = {
  kind: 'rememberElement', defaultTo: 'self',
  apply(ctx) {
    if (isEnemy(ctx.source)) return false;
    const element = ctx.tierEffects?.filter(e => e.kind === 'damage' && e.element).at(-1);
    if (!element || element.kind !== 'damage') return false;
    ctx.source.imbuedElement = element.element;
    ctx.parts.push('次の物理攻撃に属性を宿した');
    return true;
  },
  describe: () => '使った攻撃の最後の属性を、次の物理攻撃カードの無属性部分に宿す',
};
