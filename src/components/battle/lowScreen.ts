// ===== 低い画面かどうか（戦闘の状態の印だけが使う、仮の判定。狭い画面の直し 回3） =====
// 別の作業者が作っている useLowScreen()（data-low の印。入る線 640 未満・出る線 672 以上）が main に入ったら、
// useBattleLowScreen の中身を `return useLowScreen();` の1行に差し替える（呼ぶ側は変えない）。
// それまでは、useAppHeight が測った「見えている高さ」（--app-h）を読む。--app-h が無い時は window.innerHeight。
import { useEffect, useState } from 'react';

/** この高さ（px）より低いと「低い画面」（計画 §2 の線と同じ） */
export const LOW_SCREEN_BELOW = 640;

export const isLowHeight = (h: number) => h > 0 && h < LOW_SCREEN_BELOW;

function appHeight(): number {
  if (typeof window === 'undefined') return 0;
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-h'));
  return Number.isFinite(v) && v > 0 ? v : window.innerHeight;
}

/** 低い画面か（仮。後で useLowScreen() に差し替える） */
export function useBattleLowScreen(): boolean {
  const [low, setLow] = useState(() => isLowHeight(appHeight()));
  useEffect(() => {
    let raf = 0;
    // useAppHeight が --app-h を書き直した後に読む（同じ resize の中で順番が前後しても良いように、次のコマで）
    const read = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setLow(isLowHeight(appHeight())));
    };
    read();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', read);
    window.addEventListener('resize', read);
    window.addEventListener('orientationchange', read);
    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener('resize', read);
      window.removeEventListener('resize', read);
      window.removeEventListener('orientationchange', read);
    };
  }, []);
  return low;
}
