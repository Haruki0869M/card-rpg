// ===== ワールドマップの駒（チェスの駒のようなミニチュア）の並べ方と色 =====
// 見た目だけの計算。ゲームの状態・乱数・保存には関係しない。
import { PLAYER_COLOR } from '../../data/theme';

/** 台座の輪の色。戦闘・キャラ作成で使っているプレイヤーの色（data/theme.ts）と同じにする */
export const PLAYER_COLORS = PLAYER_COLOR;

export interface PieceSpot {
  /** マスの中心からのずれ（R = マスの半径 を1とする） */
  dx: number;
  dy: number;
  /** 駒の大きさ（R を1とする） */
  size: number;
  /** 重なりの順（大きいほど手前） */
  z: number;
}

/** 1マスにいる人数ごとの駒の大きさ。人数が多いほど少し小さくして、全員が見えるようにする */
const SIZE_BY_COUNT = [1.25, 1.0, 0.88, 0.8];

/**
 * 同じマスの駒を、左奥から右手前へ斜めに並べる。
 * 手前（右下）の駒ほど上に重ねるので、奥の駒の顔は左上にずれて隠れない。
 */
export function pieceSpots(count: number): PieceSpot[] {
  const n = Math.max(1, Math.min(4, count));
  const size = SIZE_BY_COUNT[n - 1];
  if (n === 1) return [{ dx: 0, dy: 0, size, z: 0 }];
  // 4人だと隣のマスに少しはみ出すが、全員の顔が見えることを優先する
  const stepX = size * (n === 4 ? 0.52 : 0.62);
  const stepY = size * 0.26;
  return Array.from({ length: n }, (_, k) => {
    const t = k - (n - 1) / 2;
    return { dx: t * stepX, dy: t * stepY, size, z: k };
  });
}

/**
 * マスにいるキャラの並び順。手番のキャラを一番手前（最後）にし、ほかは元の順のまま。
 */
export function orderOnTile(ids: string[], activeId?: string): string[] {
  if (!activeId || !ids.includes(activeId)) return ids;
  return [...ids.filter((id) => id !== activeId), activeId];
}
