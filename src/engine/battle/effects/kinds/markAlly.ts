// 味方に、次の攻撃カードだけの印を付ける（区切りD）
// guided = 次の攻撃カードが「弱点を突いた」扱い（BREAK のきっかけ。×1.5 は付かない。導きの光）
// comboUp = 次の攻撃カードの連携の段階+1（アシスト・パス）
import { resolveTargets, targetOf } from '..';
import { isEnemy, nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    markAlly: { mark: 'guided' | 'comboUp' };
  }
}

export const effect: EffectHandler<'markAlly'> = {
  kind: 'markAlly',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      if (isEnemy(t)) continue;
      if (e.mark === 'guided') t.guided = true;
      else t.comboBoost = 1;
      ctx.parts.push(`${nameOf(t)}に${e.mark === 'guided' ? '導きの光' : '連携のパス'}`);
      any = true;
    }
    return any;
  },
  describe: (e, who) => e.mark === 'guided'
    ? `${who}このターンの次の攻撃カードを「弱点を突いた」扱いにする（BREAK のきっかけ。×1.5 は付かない）`
    : `${who}次の攻撃カードの連携の段階を1つ上げる（1人でも連携になる）`,
};
