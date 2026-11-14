// ===== 低い画面の切り替え（狭い画面の配置の直し 回0。docs/tasks/small-screen-layout-plan.md の「点検の後の直し」2） =====
// 「見えている高さ」（--app-h と同じ値 = useAppHeight の visibleHeight）が 640px 未満で低い形に入り、672px 以上でふつうに戻る。
// 境目に幅を持たせて、アドレスバーの出入りなどで 639↔641 を行き来しても形がばたつかないようにする。
// 指で拡大している時・文字を入力中（キーボード）は測らない（visibleHeight が null = 前の形のまま）。
// 値は描く前に決める（useSyncExternalStore。最初の1コマがふつうの形で出てから切り替わる事が無い）。
// アプリのいちばん外（[data-app-root]）に data-low の印を付け、CSS の `low:` の形（index.css の @custom-variant）でも使う。
import { useSyncExternalStore } from 'react';
import { visibleHeight } from './useAppHeight';

/** これより低いと、低い形に入る */
export const LOW_ENTER = 640;
/** これ以上になると、ふつうの形に戻る */
export const LOW_EXIT = 672;

/**
 * 次の形（true = 低い形）。
 * - prev が null（まだ決めていない）: 640 未満なら低い形
 * - h が null（拡大中・入力中で測らない）: 前の形のまま
 * - 低い形の時: 672 以上で戻る。ふつうの形の時: 640 未満で入る
 */
export function nextLow(prev: boolean | null, h: number | null): boolean {
  if (h === null) return prev ?? false;
  if (prev === null) return h < LOW_ENTER;
  return prev ? h < LOW_EXIT : h < LOW_ENTER;
}

const isTyping = () => {
  const el = typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null);
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable;
};

const measure = (): number | null =>
  typeof window === 'undefined' ? null : visibleHeight({ innerHeight: window.innerHeight, visualViewport: window.visualViewport, typing: isTyping() });

let current: boolean | null = null;
const listeners = new Set<() => void>();

const refresh = () => {
  const next = nextLow(current, measure());
  if (next === current) return;
  current = next;
  listeners.forEach((l) => l());
};

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (listeners.size === 1 && typeof window !== 'undefined') {
    window.visualViewport?.addEventListener('resize', refresh);
    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', refresh);
    // キーボードが閉じた後に測り直す（入力中は測らない）
    document.addEventListener('focusout', refresh);
  }
  // 最初に決めた後に大きさが変わっていたら、ここで合わせる
  refresh();
  return () => {
    listeners.delete(cb);
    if (!listeners.size && typeof window !== 'undefined') {
      window.visualViewport?.removeEventListener('resize', refresh);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('orientationchange', refresh);
      document.removeEventListener('focusout', refresh);
    }
  };
}

function getSnapshot(): boolean {
  if (current === null) current = nextLow(null, measure());
  return current;
}

/** 低い画面か（見えている高さが 640px 未満。672px 以上で戻る） */
export function useLowScreen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
