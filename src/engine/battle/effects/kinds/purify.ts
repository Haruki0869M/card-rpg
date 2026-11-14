// 浄化（敵の特殊な行動・沼の大ガマの脱皮）: 自分の悪い状態異常を全部消し、消した1種類につきHPを amount 回復する。
// 何も付いていなければ、何も起きない。乱数は使わない
// 2026-11-14（特殊な行動のばらし・docs/tasks/behavior-variety-plan.md §3-7）: 敵ごとに中身を変えられる
// - gain: block = 回復の代わりに、1種類につきブロック amount（氷結のスライム）
// - only: この状態異常だけ消す（呪詛のミイラ: 毒と火傷）
// - scatter: 消した状態異常を1ずつ、味方全員に付ける（フジツボの怪物）
// - blast: 消した1種類につき、味方全員に blast のダメージ（プレス機の人形）
// - to: allies = 敵みんなの状態異常を消す（月のウサギ）
import { dealDamage, resolveTargets, targetOf } from '..';
import { BALANCE } from '../../../../data/balance';
import { getStatus } from '../../../../data/statuses';
import { activeStatuses, addStatus } from '../../statuses';
import { foesOf, healUnit, isEnemy, nameOf, unitIdOf } from '../../units';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    purify: { amount: number; gain?: 'block'; only?: string[]; scatter?: boolean; blast?: number };
  }
}

export const effect: EffectHandler<'purify'> = {
  kind: 'purify',
  defaultTo: 'self',
  apply(ctx, e) {
    let any = false;
    const removed: string[] = [];
    for (const t of resolveTargets(ctx, targetOf(e))) {
      const kinds = activeStatuses(t.statuses).filter(({ def }) => def.harmful && (!e.only || e.only.includes(def.id)));
      if (!kinds.length) continue;
      for (const { def } of kinds) {
        t.statuses[def.id] = 0;
        if (!removed.includes(def.id)) removed.push(def.id);
      }
      any = true;
      if (e.gain === 'block') {
        const add = e.amount * kinds.length;
        t.block = Math.min(BALANCE.blockMax, t.block + add);
        ctx.events.push({ type: 'block', unitId: unitIdOf(t), amount: add });
        ctx.parts.push(`${nameOf(t)}の状態異常${kinds.length}種類が消えた・ブロック+${add}`);
      } else {
        const healed = e.amount > 0 ? healUnit(t, e.amount * kinds.length, ctx.events) : 0;
        ctx.parts.push(`${nameOf(t)}の状態異常${kinds.length}種類が消えた${healed > 0 ? `・HP+${healed}` : ''}`);
      }
    }
    if (!removed.length || !isEnemy(ctx.source)) return any;
    const foes = foesOf(ctx.state, ctx.source).filter((a) => !a.dead);
    // 殻ごと投げ返す: 消した状態異常を1ずつ、味方全員に
    if (e.scatter) {
      for (const a of foes) for (const id of removed) {
        addStatus(a.statuses, id, 1);
        ctx.events.push({ type: 'status', unitId: unitIdOf(a), status: id, amount: 1 });
      }
      ctx.parts.push(`全員に${removed.map((id) => `${getStatus(id).name}1`).join('・')}`);
    }
    // 蒸気: 消した1種類につき、味方全員にダメージ
    if (e.blast) for (const a of foes) if (!a.dead) ctx.parts.push(`${nameOf(a)}に${dealDamage(ctx, a, e.blast * removed.length)}`);
    return any;
  },
  describe: (e, who) => {
    const whose = who === '自分に' ? '自分の' : who.replace(/に$/, 'の');
    const what = e.only ? `「${e.only.map((id) => getStatus(id).name).join('」「')}」だけ` : '悪い状態異常を全部';
    const gain = e.gain === 'block' ? `消した1種類につきブロック${e.amount}` : e.amount > 0 ? `消した1種類につきHP${e.amount}回復` : '';
    const extra = [
      ...(gain ? [gain] : []),
      ...(e.scatter ? ['消した状態異常を1ずつ、味方全員に付ける'] : []),
      ...(e.blast ? [`消した1種類につき、味方全員に${e.blast}のダメージ`] : []),
    ];
    return `${whose}${what}消し、${extra.join('。')}（何も付いていなければ何も起きない）`;
  },
  short: (e) => `+${e.amount}`,
};
