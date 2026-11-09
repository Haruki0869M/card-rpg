// ===== ピンを画面で使う（ステップ2）: usePins() で「今出ている印」と「指す・消す」を受け取る =====
// 使い方（世界マップなど、ほかの画面でも同じ）:
//   const pins = usePins();
//   pins.enabled                       … オンラインで遊んでいる時だけ true（1台なら false。印を出さない）
//   pins.at({ kind: 'worldTile', id: String(tile) }) … そのマスを指している人の一覧（席・名前・自分か）
//   pins.toggle({ kind: 'worldTile', id: String(tile) }) … 指す（同じ物をもう一度で消す）
//   pins.list                          … 今出ている全部のピン（新しい順）
// ピンは約8秒、または場面の目印（pinContext）が変わると消える。ゲームの状態・記録・乱数には さわらない。
import { useEffect, useReducer } from 'react';
import { activePins, PIN_TTL_MS, samePinTarget, type Pin, type PinTarget } from '../net/pins';
import type { GameState, PlayerId } from '../types';
import { useBattle } from './battleStore';
import { useOnline } from './onlineStore';

/**
 * 場面の目印。手番の人が動く・向きを変える・手番が代わる・場面が変わると、文字が変わる（その前のピンは消える）。
 * 店の中では変わらない（品物の「ほしい！」は時間で消える）
 */
export function pinContext(game: GameState | null | undefined): string {
  if (!game) return '';
  const w = game.world;
  const d = game.dungeon?.pos;
  return [game.mode, game.activeScene ?? '', w?.turn ?? '', w?.worldTurn ?? '', w ? (w.pos[w.turn] ?? '') : '', d ? `${d.x},${d.y},${d.facing}` : '', game.dungeon?.currentRoomId ?? ''].join(':');
}

export interface ShownPin extends Pin {
  uid: string;
  /** 席の名前（部屋の名前。無ければ P2 など） */
  name: string;
  /** この端末が出したピン */
  mine: boolean;
}

export interface PinsApi {
  enabled: boolean;
  list: ShownPin[];
  at: (t: PinTarget) => ShownPin[];
  /** この端末の今のピン */
  mine?: ShownPin;
  toggle: (t: PinTarget) => void;
  clear: () => void;
}

/** 今出ているピン（オンラインの時だけ）。期限が来たら自動で書き直す */
export function usePins(): PinsApi {
  const room = useOnline((s) => s.room);
  useOnline((s) => s.tick);
  const game = useBattle((s) => s.game);
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const ctx = pinContext(game);
  const now = room ? room.backend.now() : 0;
  const list: ShownPin[] = room
    ? activePins(room.pins, now, ctx).map((p) => ({ ...p, name: room.seatName(p.seat) ?? p.seat, mine: p.uid === room.uid }))
    : [];
  // 一番早く消えるピンの期限で書き直す
  const nextExpiry = list.length ? Math.min(...list.map((p) => p.at + PIN_TTL_MS)) - now : -1;
  useEffect(() => {
    if (nextExpiry < 0) return;
    const t = setTimeout(rerender, Math.max(50, nextExpiry + 30));
    return () => clearTimeout(t);
  }, [nextExpiry, list.length]);
  const mine = list.find((p) => p.mine);
  return {
    enabled: !!room?.game,
    list,
    at: (t) => list.filter((p) => samePinTarget(p.target, t)),
    mine,
    toggle: (t) => {
      if (!room) return;
      void room.sendPin(samePinTarget(mine?.target, t) ? null : t, ctx).catch(() => {});
    },
    clear: () => {
      if (room && mine) void room.sendPin(null).catch(() => {});
    },
  };
}

/** ピンの短い言葉（画面の帯に出す） */
export function pinWord(t: PinTarget): string {
  return t.kind === 'shopItem' ? 'ほしい！' : t.kind === 'worldTile' ? 'ここに行きたい' : 'こっち！';
}

export type { Pin, PinTarget, PlayerId };
