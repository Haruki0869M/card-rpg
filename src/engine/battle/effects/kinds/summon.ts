// お供を呼ぶ: ターン終了時に damage で攻撃するお供（幻獣・獣など）を turns ターン呼び出す。同じ id がいれば呼び直し（残りターンを戻す）
import { getElement } from '../../../../data/elements';
import { describeEffect } from '..';
import { isEnemy, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    summon: { id: string; name: string; icon: string; damage: number; turns: number; element?: string; echoPct?: number; intercept?: boolean; stackLimit?: number; replace?: boolean; targeted?: boolean; trigger?: 'enemyBeforeAction'; effects?: Effect[] };
  }
}

export const effect: EffectHandler<'summon'> = {
  kind: 'summon',
  defaultTo: 'self',
  apply(ctx, e) {
    if (isEnemy(ctx.source)) return false;
    const targetId = e.targeted ? (ctx.target && isEnemy(ctx.target) && !ctx.target.dead ? ctx.target.uid : ctx.state.enemies.find(t => !t.dead)?.uid) : undefined;
    if (e.targeted && !targetId) return false;
    const list = (ctx.source.summons ??= []);
    if (e.stackLimit && list.filter(s => s.group === e.id).length >= e.stackLimit) return false;
    const cur = e.stackLimit ? undefined : list.find((x) => x.id === e.id);
    if (cur) {
      if (e.replace) Object.assign(cur, { turns: e.turns, damage: e.damage, targetId, trigger: e.trigger, effects: e.effects, element: e.element });
      else { cur.turns = Math.max(cur.turns, e.turns); cur.damage = Math.max(cur.damage, e.damage); }
    } else {
      let id = e.id;
      if (e.stackLimit) {
        const counters = (ctx.source.counters ??= {});
        id = `${e.id}:${counters[`summon:${e.id}`] = (counters[`summon:${e.id}`] ?? 0) + 1}`;
      }
      list.push({ id, group: e.stackLimit ? e.id : undefined, name: e.name, icon: e.icon, damage: e.damage, turns: e.turns, element: e.element, echoPct: e.echoPct, intercept: e.intercept, targetId, trigger: e.trigger, effects: e.effects });
    }
    ctx.events.push({ type: 'ability', unitId: unitIdOf(ctx.source), name: e.name });
    ctx.parts.push(`${e.name}を呼んだ`);
    return true;
  },
  describe: (e) =>
    e.trigger ? `${e.name}を設置（選んだ敵が行動する直前に${(e.effects ?? []).map(x => describeEffect(x)).join('・')}。最大${e.turns}ターン。同種は新しい対象・期間で上書き）` : e.echoPct ? `${e.name}を呼ぶ（攻撃時に${e.echoPct}%の威力で追撃、被弾時に消えてダメージを0に）` : `${e.name}を呼ぶ（${e.turns >= 99 ? '戦闘の間ずっと' : `${e.turns}ターン`}、ターン終了時に${e.targeted ? '選んだ敵' : 'ランダムな敵'}へ${e.damage}の${e.element ? `${getElement(e.element).name}属性` : ''}ダメージ${e.stackLimit ? `、最大${e.stackLimit}体` : ''}${e.replace ? '。同種は新しい対象・期間で上書き' : ''}）`,
  short: (e) => `${e.damage}`,
};
