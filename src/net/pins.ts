// ===== ピン（「こっち！」「ほしい！」の印。ステップ2） =====
// オンライン協力で、手番でない人が「この扉・この方向・このマス・この品物」を指して、全員の画面に短く印を出す。
// しくみ: rooms/{合言葉}/pins/{端末ID} = { seat, target, at, ctx }（1人1つ。新しく指すと置き換わる。null で消す）
// - スタンプと同じく、ゲームの状態・記録（log）・乱数には一切さわらない（ホストも通らない）
// - 約8秒（PIN_TTL_MS）で自動で消える。場面の目印（ctx）が変わったら（手番の人が動いた・向きを変えた・手番が代わった）消える
// - 1台で遊ぶ時は使わない（部屋が無ければ送らない）
import type { PlayerId } from '../types';

/** 指す物の種類（id の中身） */
export type PinKind =
  /** ダンジョンの地図のマス: "x,y" */
  | 'dungeonCell'
  /** ダンジョンの扉: 部屋ID */
  | 'door'
  /** ダンジョンの方向ボタン: 'forward' | 'left' | 'right' | 'back' */
  | 'dir'
  /** 世界マップのマス: マスの番号（文字にしたもの） */
  | 'worldTile'
  /** 町の店の品物: 品物の uid */
  | 'shopItem';

export interface PinTarget {
  kind: PinKind;
  id: string;
}

/** 部屋に書くピン */
export interface Pin {
  seat: PlayerId;
  target: PinTarget;
  /** 送った時刻（部屋の時計） */
  at: number;
  /** 送った時の場面の目印（pinContext）。今の目印と違えば出さない */
  ctx: string;
}

/** ピンが消えるまでの時間 */
export const PIN_TTL_MS = 8000;

export const samePinTarget = (a: PinTarget | undefined | null, b: PinTarget | undefined | null) => !!a && !!b && a.kind === b.kind && a.id === b.id;

/** 今出すピン（古い物・場面の違う物を除く。新しい順）。純粋な関数 */
export function activePins(pins: Record<string, Pin | null | undefined>, now: number, ctx: string, ttl = PIN_TTL_MS): (Pin & { uid: string })[] {
  return Object.entries(pins)
    .filter((e): e is [string, Pin] => !!e[1] && !!e[1].target && typeof e[1].at === 'number')
    .filter(([, p]) => p.ctx === ctx && now - p.at < ttl && p.at - now < ttl)
    .map(([uid, p]) => ({ ...p, uid }))
    .sort((a, b) => b.at - a.at);
}
