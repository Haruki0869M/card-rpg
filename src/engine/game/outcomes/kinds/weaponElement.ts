// 今の武器に属性が宿る（この冒険の間・その武器を持っている間。属性の無い物理攻撃がその属性になる）
import { getElement } from '../../../../data/elements';
import { addLog } from '../../common';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    /** battles: 次の何戦闘の間だけ続くか（省略は、その武器を持っている間ずっと） */
    weaponElement: { elements: string[]; battles?: number };
  }
}

export const outcome: OutcomeHandler<'weaponElement'> = {
  kind: 'weaponElement',
  apply(ctx, o) {
    const h = ctx.targets()[0];
    const w = h?.equipment.weapon;
    if (!h || !w || !o.elements.length) return;
    const el = o.elements[ctx.rng.int(o.elements.length)];
    h.weaponElement = { uid: w.uid, element: el, ...(o.battles ? { battles: o.battles } : {}) };
    addLog(ctx.game, `${h.name}の武器に${getElement(el).name}の力が宿った！${o.battles ? `（次の${o.battles}戦闘の間）` : ''}`);
  },
  describe: (o) => `今の武器に${o.elements.length === 1 ? getElement(o.elements[0]).name : 'ランダムな属性'}が宿る（${o.battles ? `次の${o.battles}戦闘の間` : 'その武器を持っている間'}）`,
};
