// 区切りD-4 決め技の部品: minionNight: 屍兵を上限まで呼び、屍兵1体につき敵全員に per の闇ダメージ（百鬼夜行）
import { BALANCE } from '../../../../data/balance';
import { dealDamage, resolveTargets, targetOf } from '..';
import { isEnemy } from '../../units';
import { upgradeAmount, type EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    minionNight: { per: number };
  }
}

export const effect: EffectHandler<'minionNight'> = {
  kind: 'minionNight',
  defaultTo: 'target',
  apply(ctx, e) {
    const u = ctx.source;
    if (isEnemy(u)) return false;
    const list = (u.summons ??= []);
    // 死霊術師の《屍兵》と同じ呼び方（id は skeletonSoldier:番号、group で数える）
    const isMinion = (x: { id: string; group?: string }) => x.group === 'skeletonSoldier' || x.id.startsWith('skeletonSoldier');
    const cs = (u.counters ??= {});
    for (let i = list.filter(isMinion).length; i < BALANCE.specialJobs.minionLimit; i++) {
      cs['summon:skeletonSoldier'] = (cs['summon:skeletonSoldier'] ?? 0) + 1;
      list.push({ id: `skeletonSoldier:${cs['summon:skeletonSoldier']}`, group: 'skeletonSoldier', name: '屍兵', icon: '💀', damage: BALANCE.specialJobs.minionDamage, turns: 99 });
    }
    const n = list.filter(isMinion).length;
    ctx.parts.push(`屍兵${n}体`);
    for (const t of resolveTargets(ctx, targetOf(e))) dealDamage(ctx, t, n * e.per, 'dark');
    return true;
  },
  describe: (e, who) => `屍兵を上限（${BALANCE.specialJobs.minionLimit}体）まで呼び、屍兵1体につき${who}${e.per}の闇属性ダメージ`,
  upgrade: (e) => ({ ...e, per: upgradeAmount(e.per) }),
};
