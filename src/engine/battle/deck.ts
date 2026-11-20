import { BALANCE } from '../../data/balance';
import type { AllyState } from '../../types';
import { type Rng, shuffle } from '../rng';

/**
 * n枚ドローする（ally を直接書き換える）。
 * 山札が尽きたら捨札をシャッフルして新しい山札にする。手札上限ならそれ以上引かない。
 * turn（戦闘のターン）を渡すと、切り直しは味方1人につき1ターンに1回まで（2回目が要る時は、もう引かない: blocked。
 * 小さな山札で「引く・マナが戻る」札を何百回も使える無限の繰り返しを止める。点検 2026-11-13 F3）。
 * 戻り値: 実際に引いた枚数 / 再シャッフルしたか / 切り直しの回数の上限で引けなかったか
 */
export function drawCards(ally: AllyState, n: number, rng: Rng, turn?: number): { drawn: number; reshuffled: boolean; blocked: boolean } {
  let drawn = 0;
  let reshuffled = false;
  let blocked = false;
  for (let i = 0; i < n; i++) {
    if (ally.hand.length >= BALANCE.handLimit) break;
    if (ally.drawPile.length === 0) {
      if (ally.discard.length === 0) break;
      const cs = (ally.counters ??= {});
      if (turn !== undefined && cs.reshuffleTurn === turn) {
        blocked = true;
        break;
      }
      if (turn !== undefined) cs.reshuffleTurn = turn;
      ally.drawPile = shuffle(ally.discard, rng);
      ally.discard = [];
      reshuffled = true;
    }
    const card = ally.drawPile.shift()!;
    ally.hand.push(card);
    drawn++;
  }
  return { drawn, reshuffled, blocked };
}

/** 切り直しの回数の上限で引けなかった時の知らせ（戦闘の記録に出す） */
export const reshuffleBlockedText = (name: string) => `${name}: 山札の切り直しは1ターンに1回まで。これ以上は引けない`;

/** 手札をすべて捨札へ */
export function discardHand(ally: AllyState): void {
  ally.discard.push(...ally.hand);
  ally.hand = [];
}
