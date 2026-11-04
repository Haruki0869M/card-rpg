import { BALANCE } from '../../data/balance';
import type { AllyState } from '../../types';
import { type Rng, shuffle } from '../rng';

/**
 * n枚ドローする（ally を直接書き換える）。
 * 山札が尽きたら捨札をシャッフルして新しい山札にする。手札上限ならそれ以上引かない。
 * 戻り値: 実際に引いた枚数 / 再シャッフルしたか
 */
export function drawCards(ally: AllyState, n: number, rng: Rng): { drawn: number; reshuffled: boolean } {
  let drawn = 0;
  let reshuffled = false;
  for (let i = 0; i < n; i++) {
    if (ally.hand.length >= BALANCE.handLimit) break;
    if (ally.drawPile.length === 0) {
      if (ally.discard.length === 0) break;
      ally.drawPile = shuffle(ally.discard, rng);
      ally.discard = [];
      reshuffled = true;
    }
    const card = ally.drawPile.shift()!;
    ally.hand.push(card);
    drawn++;
  }
  return { drawn, reshuffled };
}

/** 手札をすべて捨札へ */
export function discardHand(ally: AllyState): void {
  ally.discard.push(...ally.hand);
  ally.hand = [];
}
