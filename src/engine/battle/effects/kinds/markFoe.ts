// 敵に、このターンだけの印を付ける（区切りD）
// exposed = 次に味方が攻撃した時、弱点を突いた扱い（×1.5・BREAK のきっかけ。弱点看破）
// pincer = 挟撃の陣（1 = だれが殴っても連携 / 2 = 殴った味方にブロック3 / 3 = ブロック4とフォーカス+1）
import { resolveTargets, targetOf } from '..';
import { isEnemy, nameOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    markFoe: { mark: 'exposed' | 'pincer'; level?: number };
  }
}

export const effect: EffectHandler<'markFoe'> = {
  kind: 'markFoe',
  defaultTo: 'target',
  apply(ctx, e) {
    let any = false;
    for (const t of resolveTargets(ctx, targetOf(e))) {
      if (!isEnemy(t)) continue;
      if (e.mark === 'exposed') { t.exposed = true; ctx.parts.push(`${nameOf(t)}の弱点を見抜いた`); }
      else { t.pincer = Math.max(t.pincer ?? 0, e.level ?? 1); ctx.parts.push('挟撃の陣'); }
      any = true;
    }
    return any;
  },
  describe: (e, who) => e.mark === 'exposed'
    ? `このターン、味方が${who.replace(/に$/, '')}へ使う最初の攻撃を「弱点を突いた」扱いにする`
    : (e.level ?? 1) >= 3 ? `このターン、${who.replace(/に$/, '')}を殴った味方は連携になり、殴るたびにブロック4・フォーカス+1（フォーカスは1人1回）`
    : (e.level ?? 1) >= 2 ? `このターン、${who.replace(/に$/, '')}を殴った味方は連携になり、殴るたびにブロック3`
    : `このターン、${who.replace(/に$/, '')}を殴ると、1人でも連携になる（連携+20%）`,
};
