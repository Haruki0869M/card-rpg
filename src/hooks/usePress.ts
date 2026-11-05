import { useCallback, useEffect, useRef } from 'react';
import { create } from 'zustand';
import { TIMING } from '../data/balance';

/** 長押しで表示する詳細ポップアップの内容 */
export type Detail =
  | { type: 'card'; cardId: string; upgraded?: boolean; allyId: string; focus?: number }
  | { type: 'enemy'; uid: string }
  | { type: 'intent'; uid: string }
  | { type: 'ally'; id: string }
  | { type: 'status'; status: 'vulnerable' | 'weak' | 'burn' | 'poison' | 'taunt'; amount: number; side: 'ally' | 'enemy'; by?: string }
  | { type: 'item'; itemId: string };

export const useDetail = create<{ detail: Detail | null; show: (d: Detail) => void; hide: () => void }>((set) => ({
  detail: null,
  show: (detail) => set({ detail }),
  hide: () => set({ detail: null }),
}));

/**
 * タップ / 長押し（約0.4秒）を扱う。
 * - 長押し中は詳細を表示し、指を離すと閉じる。長押しではタップ動作をしない。
 * - タップのイベントは親へ伝えない（背景タップ＝キャンセル と区別するため）。
 */
export function usePress(onTap: (() => void) | undefined, detail: Detail | (() => Detail | null) | null) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const end = useCallback(() => {
    clear();
    if (longFired.current) useDetail.getState().hide();
  }, [clear]);

  useEffect(() => clear, [clear]);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      longFired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      clear();
      if (!detail) return;
      timer.current = setTimeout(() => {
        const d = typeof detail === 'function' ? detail() : detail;
        if (!d) return;
        longFired.current = true;
        useDetail.getState().show(d);
      }, TIMING.longPress * 1000);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!start.current || longFired.current) return;
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 12) clear();
    },
    onPointerUp: end,
    onPointerCancel: end,
    onPointerLeave: end,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      if (longFired.current) {
        longFired.current = false;
        return;
      }
      onTap?.();
    },
  };
}
