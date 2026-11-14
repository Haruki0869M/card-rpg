// ===== 低い画面かどうか（戦闘の状態の印が使う。狭い画面の直し 回3） =====
// 判定は useLowScreen()（data-low の印。入る線 640 未満・出る線 672 以上）と同じ物を使う。
import { useLowScreen } from '../../hooks/useLowScreen';

/** この高さ（px）より低いと「低い画面」（計画 §2 の線と同じ） */
export const LOW_SCREEN_BELOW = 640;

export const isLowHeight = (h: number) => h > 0 && h < LOW_SCREEN_BELOW;

/** 低い画面か（useLowScreen と同じ判定。data-low の印・入る線 640 未満・出る線 672 以上） */
export function useBattleLowScreen(): boolean {
  return useLowScreen();
}
