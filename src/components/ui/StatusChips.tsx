import { useCallback, useRef, useState } from 'react';
import { useDetail, usePress } from '../../hooks/usePress';
import { MARK_STATUSES, statusStyle } from './icons';
import { useBattleLowScreen } from '../battle/lowScreen';
import { useStatusList } from '../battle/StatusListPopup';
import { chipMode, fitMarks, moreChipW, SMALL_CHIP, smallChipW, type Mark } from '../battle/statusMarks';

/** 大きな印（40×40px。押すと・長押しでその印の説明）。印が2つまでの時の今までの見た目 */
function Chip({ status, amount, side, by }: Mark & { side: 'ally' | 'enemy' }) {
  const press = usePress(() => useDetail.getState().show({ type: 'status', status, amount, side, by }), { type: 'status', status, amount, side, by });
  const st = statusStyle(status);
  return (
    <span
      {...press}
      data-status={status}
      className="inline-flex min-h-10 min-w-10 items-center justify-center gap-px rounded-full border px-1 text-[12px] leading-none font-black tabular-nums"
      style={{ background: st.bg, borderColor: st.color, color: st.color }}
    >
      <st.Icon size={11} strokeWidth={2.8} />
      {!MARK_STATUSES.has(status) && amount}
    </span>
  );
}

/** 小さい札（高さ18px・印＋短い数字）。1つずつは押せない（指で押す大きさが無い。下の予告と押し間違えないよう、押すと敵・味方の欄そのものに届く） */
function SmallChip({ m }: { m: Mark }) {
  const st = statusStyle(m.status);
  return (
    <span
      data-status={m.status}
      data-status-small
      className="pointer-events-none inline-flex shrink-0 items-center justify-center gap-px rounded-full border text-[12px] leading-none font-black tabular-nums"
      style={{ width: smallChipW(m), height: SMALL_CHIP.h, background: st.bg, borderColor: st.color, color: st.color }}
      aria-label={`${st.name}${MARK_STATUSES.has(m.status) ? '' : m.amount}`}
    >
      <st.Icon size={SMALL_CHIP.icon} strokeWidth={2.8} />
      {!MARK_STATUSES.has(m.status) && m.amount}
    </span>
  );
}

/** 「＋N」の札。見た目は小さい札と同じ高さで、押せる範囲は 44×44px（見えない広がり）。押すと状態の一覧 */
function MoreChip({ n, onOpen }: { n: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-label={`ほかに${n}つの状態。押すと状態の一覧`}
      data-status-more={n}
      className="relative inline-flex shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-800 text-[12px] leading-none font-black text-zinc-100 tabular-nums before:absolute before:top-1/2 before:left-1/2 before:h-11 before:w-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']"
      style={{ width: moreChipW(n), height: SMALL_CHIP.h }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
    >
      ＋{n}
    </button>
  );
}

/** 幅を測る（印が出たり消えたりしても測り直せるよう、要素が付いた時に見張りを付け直す） */
function useWidth() {
  const [w, setW] = useState(0);
  const ro = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    ro.current = null;
    if (!el) return;
    const up = () => setW((p) => (Math.abs(p - el.clientWidth) < 1 ? p : el.clientWidth));
    up();
    if (typeof ResizeObserver !== 'undefined') {
      ro.current = new ResizeObserver(up);
      ro.current.observe(el);
    }
  }, []);
  return [ref, w] as const;
}

/**
 * 戦闘の敵・味方の状態の印（狭い画面の直し 回3）。
 * - 並べる順は statusMarks.ts（今の手を変える印が先）。marks はその順で渡す
 * - 2つまで: 今までの大きな印。低い画面では小さい札
 * - 3つ以上: 小さい札を1行。入り切らない分は「＋N」（押すと状態の一覧）
 * - unit: 一覧を開く相手。maxW: 幅を測る前に使う幅
 */
export function StatusChips({ marks, side, unit, maxW, inline = false, small = false }: { marks: Mark[]; side: 'ally' | 'enemy'; unit: string; maxW: number; /** 低い画面の味方の欄: マナ・★の行の残りの幅に入れる（欄を伸ばさない） */ inline?: boolean; /** 欄が戦場に入らない時: 2つまででも小さい札にする */ small?: boolean }) {
  const low = useBattleLowScreen();
  const [ref, w] = useWidth();
  if (!marks.length) return null;
  const mode = chipMode(marks.length, low || small);
  if (mode === 'big' && !inline) {
    return (
      <div className="flex max-h-10 flex-wrap justify-center gap-0.5 overflow-y-auto" data-status-row="big" data-status-total={marks.length}>
        {marks.map((m) => (
          <Chip key={m.status} {...m} side={side} />
        ))}
      </div>
    );
  }
  const { shown, more } = fitMarks(marks, w || maxW);
  return (
    <div
      ref={ref}
      className={`flex items-center gap-0.5 ${inline ? `min-w-0 flex-1 ${side === 'ally' ? 'justify-end' : 'justify-start'}` : 'w-full justify-center'}`}
      style={{ height: SMALL_CHIP.h }}
      data-status-row="small"
      data-status-total={marks.length}
      data-status-shown={shown.length}
      data-status-unit={unit}
    >
      {shown.map((m) => (
        <SmallChip key={m.status} m={m} />
      ))}
      {more > 0 && <MoreChip n={more} onOpen={() => useStatusList.getState().show({ side, id: unit })} />}
    </div>
  );
}
