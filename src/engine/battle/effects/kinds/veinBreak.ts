// 区切りF: 竜脈術師《竜脈》(2)。違う種類の悪い状態異常が need 個以上付いた敵は、大技の予告が BREAK する（敵1体につき1戦闘1回）
import { breakEnemy, canBreak } from '..';
import { getStatus } from '../../../../data/statuses';
import { isEnemy } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    veinBreak: { need: number };
  }
}

export const effect: EffectHandler<'veinBreak'> = {
  kind: 'veinBreak',
  defaultTo: 'target',
  apply(ctx, e) {
    const t = ctx.target;
    if (!t || !isEnemy(t) || t.dead || t.veinBroken || !canBreak(t)) return false;
    const kinds = Object.entries(t.statuses).filter(([id, n]) => (n ?? 0) > 0 && getStatus(id).harmful).length;
    if (kinds < e.need) return false;
    t.veinBroken = true;
    breakEnemy(ctx, t, 'weak');
    ctx.parts.push('竜脈が崩した');
    return true;
  },
  describe: (e) => `違う種類の悪い状態異常が${e.need}つ付いた敵の大技の予告を BREAK する（敵1体につき1戦闘1回）`,
};
