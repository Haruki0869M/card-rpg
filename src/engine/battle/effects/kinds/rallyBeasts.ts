// 区切りD-4 決め技の部品: rallyBeasts: 味方全員のお供が行動し、召喚がすぐに攻撃する（times 回。百獣の王の咆哮・神獣バハムート降臨）
import { petActOnce } from '../../../abilities';
import { isEnemy } from '../../units';
import { isStrikingSummon, summonStrikeOnce } from '../../summons';
import type { EnemyState } from '../../../../types';
import { type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    rallyBeasts: { times: number };
  }
}

export const effect: EffectHandler<'rallyBeasts'> = {
  kind: 'rallyBeasts',
  defaultTo: 'allies',
  apply(ctx, e) {
    let any = false;
    const chosen = ctx.target && isEnemy(ctx.target) && !ctx.target.dead ? (ctx.target as EnemyState) : undefined;
    for (let i = 0; i < e.times; i++) {
      for (const a of ctx.state.allies) {
        if (a.dead) continue;
        if (a.pet && petActOnce(ctx.state, ctx.rng, ctx.events, a, ctx.depth + 1)) any = true;
        for (const s of [...(a.summons ?? [])]) {
          if (!isStrikingSummon(s)) continue;
          const foes = ctx.state.enemies.filter((x) => !x.dead);
          if (!foes.length) return any;
          const t = chosen && !chosen.dead ? chosen : (s.targetId ? foes.find((x) => x.uid === s.targetId) ?? foes[0] : foes[ctx.rng.int(foes.length)]);
          summonStrikeOnce(ctx.state, a, s, t, ctx.rng, ctx.events, '攻撃（号令）');
          any = true;
        }
      }
    }
    if (any) ctx.parts.push('お供と召喚が攻撃');
    return any;
  },
  describe: (e) => `味方全員のお供が行動し、召喚（砲台・幻獣・群れの獣など）がすぐに攻撃する${e.times > 1 ? `（${e.times}回）` : ''}`,
};
