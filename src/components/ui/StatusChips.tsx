import { usePress } from '../../hooks/usePress';
import type { Statuses } from '../../types';
import { STATUS_STYLE } from './icons';

function Chip({
  status,
  amount,
  side,
  by,
  onTap,
}: {
  status: 'vulnerable' | 'weak' | 'taunt';
  amount: number;
  side: 'ally' | 'enemy';
  by?: string;
  onTap?: () => void;
}) {
  const press = usePress(onTap, { type: 'status', status, amount, side, by });
  const st = STATUS_STYLE[status];
  return (
    <span
      {...press}
      className="inline-flex h-[19px] items-center gap-px rounded-full border px-1 text-[12px] leading-none font-black tabular-nums"
      style={{ background: st.bg, borderColor: st.color, color: st.color }}
    >
      <st.Icon size={11} strokeWidth={2.8} />
      {status !== 'taunt' && amount}
    </span>
  );
}

export function StatusChips({
  s,
  side,
  onTap,
  tauntedBy,
}: {
  s: Statuses;
  side: 'ally' | 'enemy';
  onTap?: () => void;
  tauntedBy?: string;
}) {
  if (!s.vulnerable && !s.weak && !tauntedBy) return null;
  return (
    <div className="flex flex-wrap justify-center gap-0.5">
      {s.vulnerable > 0 && <Chip status="vulnerable" amount={s.vulnerable} side={side} onTap={onTap} />}
      {s.weak > 0 && <Chip status="weak" amount={s.weak} side={side} onTap={onTap} />}
      {tauntedBy && <Chip status="taunt" amount={1} side={side} by={tauntedBy} onTap={onTap} />}
    </div>
  );
}
