import { useDetail, usePress } from '../../hooks/usePress';
import type { Statuses } from '../../types';
import { activeStatuses } from '../../engine';
import { MARK_STATUSES, statusStyle } from './icons';

function Chip({
  status,
  amount,
  side,
  by,
  onTap,
}: {
  /** 状態異常のID、または 'taunt'（挑発）・'guard'（かばう） */
  status: string;
  amount: number;
  side: 'ally' | 'enemy';
  by?: string;
  onTap?: () => void;
}) {
  const press = usePress(() => useDetail.getState().show({ type: 'status', status, amount, side, by }), { type: 'status', status, amount, side, by });
  void onTap;
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

export function StatusChips({
  s,
  side,
  onTap,
  tauntedBy,
  guarding,
}: {
  s: Statuses;
  side: 'ally' | 'enemy';
  onTap?: () => void;
  tauntedBy?: string;
  /** かばう（敵の特殊な行動） */
  guarding?: boolean;
}) {
  const list = activeStatuses(s);
  if (!list.length && !tauntedBy && !guarding) return null;
  return (
    <div className="flex max-h-10 flex-wrap justify-center gap-0.5 overflow-y-auto">
      {list.map(({ def, amount }) => (
        <Chip key={def.id} status={def.id} amount={amount} side={side} onTap={onTap} />
      ))}
      {tauntedBy && <Chip status="taunt" amount={1} side={side} by={tauntedBy} onTap={onTap} />}
      {guarding && <Chip status="guard" amount={1} side={side} onTap={onTap} />}
    </div>
  );
}
