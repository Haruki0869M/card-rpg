import { usePress } from '../../hooks/usePress';
import type { Statuses } from '../../types';
import { activeStatuses } from '../../engine';
import { statusStyle } from './icons';

function Chip({
  status,
  amount,
  side,
  by,
  onTap,
}: {
  /** 状態異常のID、または 'taunt'（挑発） */
  status: string;
  amount: number;
  side: 'ally' | 'enemy';
  by?: string;
  onTap?: () => void;
}) {
  const press = usePress(onTap, { type: 'status', status, amount, side, by });
  const st = statusStyle(status);
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
  const list = activeStatuses(s);
  if (!list.length && !tauntedBy) return null;
  return (
    <div className="flex flex-wrap justify-center gap-0.5">
      {list.map(({ def, amount }) => (
        <Chip key={def.id} status={def.id} amount={amount} side={side} onTap={onTap} />
      ))}
      {tauntedBy && <Chip status="taunt" amount={1} side={side} by={tauntedBy} onTap={onTap} />}
    </div>
  );
}
