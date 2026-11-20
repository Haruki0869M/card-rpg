// 自分の召喚（砲台・罠・幻獣・群れの獣・屍兵など）が、今すぐ攻撃する（区切りD）。残りターンは減らない
// 狙う敵: カードの対象の敵（いなければ、ターン終了時の攻撃と同じ選び方）。only = 動かす召喚の id（例: 砲台 = turret）
import { isEnemy } from '../../units';
import { isStrikingSummon, summonStrikeOnce } from '../../summons';
import type { EnemyState } from '../../../../types';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    summonStrike: { only?: string[]; times?: number; label?: string };
  }
}

export const effect: EffectHandler<'summonStrike'> = {
  kind: 'summonStrike',
  defaultTo: 'self',
  apply(ctx, e) {
    const ally = ctx.source;
    if (isEnemy(ally) || ally.dead || !ally.summons?.length) return false;
    let any = false;
    for (let i = 0; i < (e.times ?? 1); i++) {
      for (const s of [...(ally.summons ?? [])]) {
        if (!isStrikingSummon(s) || (e.only && !e.only.includes(s.id))) continue;
        const foes = ctx.state.enemies.filter((x) => !x.dead);
        if (!foes.length) return any;
        const chosen = ctx.target && isEnemy(ctx.target) && !ctx.target.dead ? (ctx.target as EnemyState) : undefined;
        const t = chosen ?? (s.targetId ? foes.find((x) => x.uid === s.targetId) ?? foes[0] : foes[ctx.rng.int(foes.length)]);
        summonStrikeOnce(ctx.state, ally, s, t, ctx.rng, ctx.events, '攻撃（号令）');
        any = true;
      }
    }
    if (any) ctx.parts.push(`${e.label ?? '召喚'}が攻撃`);
    return any;
  },
  describe: (e) => `自分の${e.label ?? '召喚（砲台・罠・幻獣など）'}が、すぐに${(e.times ?? 1) > 1 ? `${e.times}回` : '1回'}攻撃する（残りターンは減らない）`,
};
