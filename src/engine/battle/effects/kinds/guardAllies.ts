// かばう（敵の特殊な行動・魔王軍の騎士）: 行動した後、次の味方の番が終わるまで「かばう」状態になる。
// その間、ほかの敵を狙った「敵1体が対象のカード」のダメージは、この敵が受ける（effects/index.ts の dealDamage）。
// 全体攻撃・お供と召喚の攻撃は、そのまま通る。敵の番の始め（battle.ts の endTurn）・倒れた時（units.ts）に消える
import { isEnemy, nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    guardAllies: { unused?: never };
  }
}

export const effect: EffectHandler<'guardAllies'> = {
  kind: 'guardAllies',
  defaultTo: 'self',
  apply(ctx) {
    const { source } = ctx;
    if (!isEnemy(source) || source.dead) return false;
    source.guarding = true;
    ctx.parts.push(`${nameOf(source)}が仲間の前に立った`);
    return true;
  },
  describe: () => '次の味方の番の間、ほかの敵を狙った単体攻撃のカードを代わりに受ける（全体攻撃・お供と召喚の攻撃は通る）',
  short: () => '',
};
