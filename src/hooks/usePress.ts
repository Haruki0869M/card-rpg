import { useCallback, useEffect, useRef } from 'react';
import { create } from 'zustand';
import { TIMING } from '../data/balance';

/** 詳細の窓に出す内容（長押し・タップで開く。戦闘の外でも開ける） */
export type Detail =
  /** allyId: 戦闘中は味方のID。戦闘の外ではキャラ（Hero）のID（成功率をそのキャラで出す。省略は基礎の成功率） */
  | { type: 'card'; cardId: string; upgraded?: boolean; allyId?: string; focus?: number }
  | { type: 'enemy'; uid: string }
  | { type: 'intent'; uid: string }
  | { type: 'ally'; id: string }
  /** status: 状態異常のID、または 'taunt'（挑発） */
  | { type: 'status'; status: string; amount: number; side: 'ally' | 'enemy'; by?: string }
  /** heroId: 比べる相手のキャラ（その部位の今の装備と比べる）。itemUid: そのキャラが今装備している物なら比べない */
  | { type: 'item'; itemId: string; heroId?: string; itemUid?: string }
  | { type: 'tokens'; allyId: string }
  /** allyId: 戦闘中は味方のID、戦闘の外ではキャラのID */
  | { type: 'pet'; allyId: string };

/**
 * 詳細の窓の状態。
 * - show: 新しく開く（前の窓は閉じる）
 * - open: 今の窓の上に重ねて開く（装備の詳細 → その装備のカードの詳細）。「戻る」で前の窓へ
 * - back: 1つ前の窓へ（無ければ閉じる）。スマホの戻るボタン・Esc で使う
 * - hide: 全部閉じる
 */
export const useDetail = create<{
  detail: Detail | null;
  stack: Detail[];
  show: (d: Detail) => void;
  open: (d: Detail) => void;
  back: () => void;
  hide: () => void;
}>((set, get) => ({
  detail: null,
  stack: [],
  show: (detail) => set({ detail, stack: [] }),
  open: (d) => {
    const { detail, stack } = get();
    set({ detail: d, stack: detail ? [...stack, detail] : stack });
  },
  back: () => {
    const { stack } = get();
    if (!stack.length) set({ detail: null });
    else set({ detail: stack[stack.length - 1], stack: stack.slice(0, -1) });
  },
  hide: () => set({ detail: null, stack: [] }),
}));

// ===== 長押しの後の「指を離した時のクリック」を1回だけ止める =====
// 長押しで窓が開くと、指の下に窓の暗い背景が来る。そのまま指を離すと、ブラウザが
// 「押した所と離した所の共通の親」にクリックを送ることがあり、背景タップ（キャンセル）や
// 選ぶ操作が動いてしまう。長押しが決まった時に、次のクリックを1回だけ捨てる。
let disarm: (() => void) | null = null;
function armClickGuard() {
  disarm?.();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const onClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    off();
  };
  // 指を離した後、クリックが来なければ（スクロール等）少しして解除する
  const onUp = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(off, 400);
  };
  const off = () => {
    if (timer) clearTimeout(timer);
    window.removeEventListener('click', onClick, true);
    window.removeEventListener('pointerup', onUp, true);
    window.removeEventListener('pointercancel', onUp, true);
    if (disarm === off) disarm = null;
  };
  window.addEventListener('click', onClick, true);
  window.addEventListener('pointerup', onUp, true);
  window.addEventListener('pointercancel', onUp, true);
  // 念のため（指を離す合図が来ない時）
  timer = setTimeout(off, 5000);
  disarm = off;
}

/**
 * タップ / 長押し（約0.4秒）を扱う。
 * - 長押しで詳細の窓を開く。指を離しても窓は残る（閉じるボタン・外の暗い所・窓そのもの・戻るボタンで閉じる）。
 * - 長押しの後は、タップの動作（選ぶ等）をしない。
 * - タップのイベントは親へ伝えない（背景タップ＝キャンセル と区別するため）。
 * - 選ばない物（状態異常・お供・装備の文字など）は onTap で詳細を開く（openDetail を渡す）。
 */
export function usePress(onTap: (() => void) | undefined, detail: Detail | (() => Detail | null) | null) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

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
        timer.current = null;
        const d = typeof detail === 'function' ? detail() : detail;
        if (!d) return;
        longFired.current = true;
        armClickGuard();
        useDetail.getState().show(d);
      }, TIMING.longPress * 1000);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!start.current || longFired.current) return;
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 12) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
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

/** 選ばない物（装備の文字・状態異常など）: タップでも長押しでも詳細を開く */
export function useInfoPress(detail: Detail | (() => Detail | null)) {
  const get = () => (typeof detail === 'function' ? detail() : detail);
  return usePress(() => {
    const d = get();
    if (d) useDetail.getState().show(d);
  }, detail);
}
