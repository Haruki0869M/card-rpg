// 今の武器に属性が宿る（この冒険の間・その武器を持っている間。属性の無い物理攻撃がその属性になる）
import { getElement } from '../../../../data/elements';
import { addLog } from '../../common';
import type { OutcomeHandler } from '../types';

declare module '../../../../types' {
  interface OutcomeParams {
    weaponElement: { elements: string[] };
  }
}

export const outcome: OutcomeHandler<'weaponElement'> = {
  kind: 'weaponElement',
  apply(ctx, o) {
    const h = ctx.targets()[0];
    const w = h?.equipment.weapon;
    if (!h || !w || !o.elements.length) return;
    const el = o.elements[ctx.rng.int(o.elements.length)];
    h.weaponElement = { uid: w.uid, element: el };
    addLog(ctx.game, `${h.name}の武器に${getElement(el).name}の力が宿った！`);
  },
  describe: () => '今の武器にランダムな属性が宿る（この冒険の間）',
};
