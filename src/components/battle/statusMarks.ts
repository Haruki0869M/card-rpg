// ===== 状態の印の並べ方（狭い画面の直し 回3。計画 項目2・決まりの8・Q3 = A） =====
// 戦闘の敵・味方の「状態の印」を、どの順に・いくつ並べ、入り切らない分を「＋N」にするかを決める（画面に描く前の純粋な計算）。
//   - 並べる順: 今の手を変える印（❄隠れている・🕯喰った灯・挑発・かばう）を先に。その後は今までの順（状態異常の登録順）
//   - 印が2つまで: 今までの大きな印（40×40px）。ただし低い画面では小さい札（高さ18px）
//   - 印が3つ以上: どの画面でも小さい札を1行。入り切らない分は「＋N」の札（押すと状態の一覧）
import { activeStatuses } from '../../engine';
import { focusFeedOf } from '../../engine/battle/phases';
import type { AllyState, EnemyState, Statuses } from '../../types';
import { MARK_STATUSES } from '../ui/icons';

/** 状態の印1つ。status = 状態異常のID、または 'hidden'・'lamp'・'taunt'・'guard' */
export type Mark = { status: string; amount: number; by?: string };

/** 今の手を変える印（先に並べる。この順） */
export const PRIORITY_MARKS = ['hidden', 'lamp', 'taunt', 'guard'] as const;

/** この数から、小さい札の1行にする */
export const SMALL_FROM = 3;

/** 小さい札の寸法（px）。StatusChips の見た目と同じ数（幅は描く時もこの値に固定するので、計算と画面がずれない） */
export const SMALL_CHIP = {
  h: 18,
  gap: 2,
  /** 枠線 1px×2 ＋ 左右の余白 3px×2 */
  pad: 8,
  icon: 11,
  /** 数字1けたの幅（12px の太字・等幅の数字） */
  digit: 7,
} as const;

/** 印を並べる（手を変える印が先） */
export function collectMarks(
  s: Statuses | undefined,
  extra: { tauntedBy?: string; guarding?: boolean; hidden?: boolean; lamp?: number } = {},
): Mark[] {
  const first: Mark[] = [];
  if (extra.hidden) first.push({ status: 'hidden', amount: 1 });
  if (extra.lamp !== undefined) first.push({ status: 'lamp', amount: extra.lamp });
  if (extra.tauntedBy) first.push({ status: 'taunt', amount: 1, by: extra.tauntedBy });
  if (extra.guarding) first.push({ status: 'guard', amount: 1 });
  return [...first, ...activeStatuses(s).map(({ def, amount }) => ({ status: def.id, amount }))];
}

/** 敵の印（喰った灯は、決まりが働いている時だけ） */
export function enemyMarks(e: EnemyState): Mark[] {
  const feed = focusFeedOf(e);
  return collectMarks(e.statuses, { tauntedBy: e.tauntedBy, guarding: e.guarding, hidden: e.hidden, lamp: feed ? Math.min(feed.max, e.lampEaten ?? 0) : undefined });
}

/** 味方の印 */
export function allyMarks(a: AllyState): Mark[] {
  return collectMarks(a.statuses);
}

/** 大きな印（今までの見た目）か、小さい札か */
export function chipMode(count: number, low: boolean): 'big' | 'small' {
  return count >= SMALL_FROM || (low && count > 0) ? 'small' : 'big';
}

/** 小さい札1つの幅（px） */
export function smallChipW(m: Mark): number {
  const num = MARK_STATUSES.has(m.status) ? 0 : 1 + String(m.amount).length * SMALL_CHIP.digit;
  return SMALL_CHIP.pad + SMALL_CHIP.icon + num;
}

/** 「＋N」の札の幅（px。見た目。押せる範囲は 44px に広げる） */
export function moreChipW(n: number): number {
  return SMALL_CHIP.pad + (1 + String(n).length) * SMALL_CHIP.digit;
}

/**
 * 幅 maxW の1行に入るだけ並べ、入り切らない分を「＋N」にする。
 * 全部入るなら「＋N」は出さない。入らない時は「＋N」の札の場所も取ってから、前から順に入るだけ。
 * 1つも入らない時は「＋N」だけ（N = 全部の数）
 */
export function fitMarks(marks: Mark[], maxW: number): { shown: Mark[]; more: number } {
  const gap = SMALL_CHIP.gap;
  const total = marks.reduce((w, m, i) => w + smallChipW(m) + (i ? gap : 0), 0);
  if (total <= maxW) return { shown: marks, more: 0 };
  const shown: Mark[] = [];
  let w = 0;
  for (const m of marks) {
    const rest = marks.length - shown.length - 1;
    const add = smallChipW(m) + (shown.length ? gap : 0);
    // この札を入れた後に残る分の「＋N」の札も入るか
    const tail = rest > 0 ? gap + moreChipW(rest) : 0;
    if (w + add + tail > maxW) break;
    shown.push(m);
    w += add;
  }
  return { shown, more: marks.length - shown.length };
}
