// お供を呼ぶ: ターン終了時に damage で攻撃するお供（幻獣・獣など）を turns ターン呼び出す。同じ id がいれば呼び直し（残りターンを戻す）
import { getElement } from '../../../../data/elements';
import { describeEffect } from '..';
import { summonTurnsBonus } from '../../../abilities';
import { isEnemy, unitIdOf } from '../../units';
import { summonStrikeOnce } from '../../summons';
import type { EnemyState } from '../../../../types';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    /** overflow = もう stackLimit 体いる時は、呼ぶ代わりに、その仲間（同じ id の召喚）が全員1回ずつ攻撃する（段階7b: 魂喰らいの冥獄鎌） */
    summon: { id: string; name: string; icon: string; damage: number; turns: number; element?: string; echoPct?: number; intercept?: boolean; counter?: number; stackLimit?: number; replace?: boolean; targeted?: boolean; trigger?: 'enemyBeforeAction'; effects?: Effect[]; overflow?: boolean };
  }
}

export const effect: EffectHandler<'summon'> = {
  kind: 'summon',
  defaultTo: 'self',
  apply(ctx, e) {
    if (isEnemy(ctx.source)) return false;
    // 残りターンの上乗せ（歯車の目）。戦闘の間ずっといる物（99）は変えない
    const turns = e.turns >= 99 ? e.turns : e.turns + summonTurnsBonus(ctx.source);
    const targetId = e.targeted ? (ctx.target && isEnemy(ctx.target) && !ctx.target.dead ? ctx.target.uid : ctx.card ? undefined : ctx.state.enemies.find(t => !t.dead)?.uid) : undefined;
    if (e.targeted && !targetId) return false;
    const list = (ctx.source.summons ??= []);
    if (e.stackLimit && list.filter(s => s.group === e.id).length >= e.stackLimit) {
      if (!e.overflow) return false;
      // 上限を超えた分: 同じ仲間が全員、ランダムな敵へ1回ずつ攻撃する（残りターンは減らない）
      let hit = 0;
      for (const s of list.filter((x) => x.group === e.id)) {
        const foes = ctx.state.enemies.filter((x) => !x.dead);
        if (!foes.length) break;
        summonStrikeOnce(ctx.state, ctx.source, s, foes[ctx.rng.int(foes.length)] as EnemyState, ctx.rng, ctx.events, '一斉攻撃');
        hit++;
      }
      if (hit) ctx.parts.push(`${e.name}が一斉に攻撃`);
      return hit > 0;
    }
    const cur = e.stackLimit ? undefined : list.find((x) => x.id === e.id);
    if (cur) {
      if (e.replace) Object.assign(cur, { turns, damage: e.damage, targetId, trigger: e.trigger, effects: e.effects, element: e.element });
      else { cur.turns = Math.max(cur.turns, turns); cur.damage = Math.max(cur.damage, e.damage); }
    } else {
      let id = e.id;
      if (e.stackLimit) {
        const counters = (ctx.source.counters ??= {});
        id = `${e.id}:${counters[`summon:${e.id}`] = (counters[`summon:${e.id}`] ?? 0) + 1}`;
      }
      list.push({ id, group: e.stackLimit ? e.id : undefined, name: e.name, icon: e.icon, damage: e.damage, turns, element: e.element, echoPct: e.echoPct, intercept: e.intercept, ...(e.counter ? { counter: e.counter } : {}), targetId, trigger: e.trigger, effects: e.effects });
    }
    ctx.events.push({ type: 'ability', unitId: unitIdOf(ctx.source), name: e.name, source: { kind: 'summon', id: e.id, label: e.name } });
    ctx.parts.push(`${e.name}を呼んだ`);
    return true;
  },
  describe: (e) =>
    e.overflow && e.stackLimit ? `${e.name}を呼ぶ（戦闘の間ずっと、ターン終了時にランダムな敵へ${e.damage}のダメージ、最大${e.stackLimit}体。${e.stackLimit}体いる時は、代わりに${e.name}が全員1回ずつ攻撃）` : e.trigger ? `${e.name}を設置（選んだ敵が行動する直前に${(e.effects ?? []).map(x => describeEffect(x)).join('・')}。最大${e.turns}ターン。同種は新しい対象・期間で上書き）` : e.echoPct ? `${e.name}を呼ぶ（攻撃時に${e.echoPct}%の威力で追撃、被弾時に消えてダメージを0に）` : `${e.name}を呼ぶ（${e.turns >= 99 ? '戦闘の間ずっと' : `${e.turns}ターン`}、ターン終了時に${e.targeted ? '選んだ敵' : 'ランダムな敵'}へ${e.damage}の${e.element ? `${getElement(e.element).name}属性` : ''}ダメージ${e.stackLimit ? `、最大${e.stackLimit}体` : ''}${e.replace ? '。同種は新しい対象・期間で上書き' : ''}）`,
  short: (e) => `${e.damage}`,
};
