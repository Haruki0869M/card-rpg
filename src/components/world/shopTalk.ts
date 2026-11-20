// ===== 店の相談（ステップ2・計画の7）: 残りの数・仲間が買った時のお知らせ・最後の1つの確認 =====
// お知らせは、同期されている店の在庫（sold）の変化から出す（新しい通信も記録も足さない）。
import { useEffect, useRef } from 'react';
import { getItem } from '../../data/items';
import type { GameState, ShopStock } from '../../types';

/** 同じ品物（アイテムID）で、まだ売れていない数 */
export const shopLeft = (stock: ShopStock, itemId: string) => stock.items.filter((x) => x.item.itemId === itemId && !x.sold).length;

/** 遊んでいるプレイヤーが2人以上か（最後の1つを買う前に確かめる） */
export const severalPlayers = (game: GameState) => new Set(game.heroes.filter((h) => !h.retired).map((h) => h.playerId)).size > 1;

/** 前に見た時から売れた品物のお知らせの文（この端末で買った物は除く）。純粋な関数 */
export function soldNotices(game: GameState, stock: ShopStock, before: Set<string>, mine: Set<string>): string[] {
  const out: string[] = [];
  for (const s of stock.items) {
    if (!s.sold || before.has(s.item.uid) || mine.has(s.item.uid)) continue;
    const buyer = game.heroes.find((h) => [...h.stash, ...h.pouch].some((x) => x.uid === s.item.uid));
    out.push(`${buyer?.name ?? '仲間'}が${getItem(s.item.itemId).name}を買った（残り${shopLeft(stock, s.item.itemId)}）`);
  }
  return out;
}

/** 仲間が買った時に、短いお知らせを出す（この端末で買った物は出さない） */
export function useShopNotices(game: GameState, stock: ShopStock | undefined, mine: Set<string>, notify: (text: string) => void) {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!stock) return;
    const sold = new Set(stock.items.filter((x) => x.sold).map((x) => x.item.uid));
    // 画面を開いた時に売れていた物は、お知らせしない
    if (seen.current) for (const text of soldNotices(game, stock, seen.current, mine)) notify(text);
    seen.current = sold;
  }, [game, stock, mine, notify]);
}
