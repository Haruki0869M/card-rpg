// カード強化（山札の1枚を＋にする）
import { CARDS } from '../../../../data/cards';
import type { GrowthHandler } from '../types';

export const growth: GrowthHandler = {
  kind: 'upgradeCard',
  available: (h) => h.deck.some((c) => !c.upgraded),
  make: () => ({ kind: 'upgradeCard', amount: 1 }),
  apply(game, h, _o, cardUid) {
    const c = h.deck.find((x) => x.uid === cardUid);
    if (!c || c.upgraded) return '強化するカードを選んでください';
    c.upgraded = true;
    game.log.push({ id: game.nextLogId++, text: `${h.name}の「${CARDS.get(c.cardId).name}」が強化された` });
    return undefined;
  },
  title: () => 'カード強化',
  text: '山札のカード1枚を強化（成功率+10%・効果アップ）',
  icon: 'arrowUp',
};
