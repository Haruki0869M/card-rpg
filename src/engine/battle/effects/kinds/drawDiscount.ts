// 詠唱の栞（区切りD）: 1枚引く。引いたカードが category なら、そのカードのコストを、このターンだけ delta（1ターンに1回。元の文どおり）
import { getCard } from '../../../../data/cards';
import { drawCards } from '../../deck';
import { isEnemy } from '../../units';
import type { CardCategory } from '../../../../types';
import type { EffectHandler } from '../types';

declare module '../../../../types' {
  interface EffectParams {
    drawDiscount: { category: CardCategory; delta: number };
  }
}

const CAT: Record<CardCategory, string> = { physical: '物理', magic: '魔法', skill: '技' };

export const effect: EffectHandler<'drawDiscount'> = {
  kind: 'drawDiscount',
  defaultTo: 'self',
  apply(ctx, e) {
    const u = ctx.source;
    if (isEnemy(u)) return false;
    const before = u.hand.length;
    drawCards(u, 1, ctx.rng);
    if (u.hand.length <= before) return false;
    const drawn = getCard(u.hand[u.hand.length - 1].cardId);
    ctx.parts.push('1枚引いた');
    const cs = (u.counters ??= {});
    if (drawn.category !== e.category || cs.drawDiscountTurn === ctx.state.turn) return true;
    cs.drawDiscountTurn = ctx.state.turn;
    u.cheapCard = { uid: u.hand[u.hand.length - 1].uid, turn: ctx.state.turn, delta: e.delta };
    ctx.parts.push(`引いた「${drawn.name}」のコスト${e.delta}`);
    return true;
  },
  describe: (e) => `1枚引く。引いたカードが${CAT[e.category]}なら、このターンだけ、そのカードのコスト${e.delta}（1ターンに1回）`,
};
