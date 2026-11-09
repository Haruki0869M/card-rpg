// ===== 画面の飾りの部品（部品集の紺と金。UI刷新 U1） =====
// 見出し・選ぶタイル・画面の上の帯。どの画面でも同じ見た目になるように、ここから使う
import { Check, ChevronLeft, type LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

/** 見出し（左に宝石、右に金の線） */
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mt-4 mb-1.5 flex items-center gap-2">
      <span className="h-[9px] w-[9px] shrink-0 rotate-45 border border-amber-200 bg-gradient-to-br from-amber-100 to-amber-600 shadow-[0_0_6px_rgba(255,200,90,.8)]" />
      <span className="font-display text-outline text-[16px] leading-5 tracking-wider text-amber-100">{children}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-amber-400/70 to-transparent" />
      {right}
    </div>
  );
}

/** 画面の上の帯（戻る・題名・右の物）。題名の左右に金の飾り */
export function TopBar({ title, onBack, right }: { title: ReactNode; onBack?: () => void; right?: ReactNode }) {
  return (
    <div className="relative flex h-14 shrink-0 items-center gap-2 px-2">
      {onBack ? (
        <button onClick={onBack} aria-label="戻る" className="btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
          <ChevronLeft size={22} />
        </button>
      ) : (
        <span className="w-11 shrink-0" />
      )}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        {/* 飾りの線は狭い画面では出さない（360px で「キャラクター作成」が切れないように。フェーズ3） */}
        <span className="hidden h-px w-6 bg-gradient-to-r from-transparent to-amber-300/80 min-[400px]:block" />
        <span className="h-[7px] w-[7px] rotate-45 bg-amber-300" />
        <span className="font-display text-outline truncate text-[20px] leading-7 tracking-wider text-amber-50">{title}</span>
        <span className="h-[7px] w-[7px] rotate-45 bg-amber-300" />
        <span className="hidden h-px w-6 bg-gradient-to-l from-transparent to-amber-300/80 min-[400px]:block" />
      </div>
      <span className="flex w-11 shrink-0 justify-end">{right}</span>
      <div className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
    </div>
  );
}

/**
 * 選ぶタイル（難易度・人数・遊び方など）。選ぶと金の縁が光り、右上に印が付く。
 * accent = タイルの色（アイコンと光）
 */
export function ChoiceTile({
  selected,
  onClick,
  Icon,
  icon,
  label,
  sub,
  accent = '#f2c24a',
  disabled,
  className = '',
  style,
}: {
  selected: boolean;
  onClick: () => void;
  Icon?: LucideIcon;
  icon?: ReactNode;
  label: ReactNode;
  sub?: ReactNode;
  accent?: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`btn relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 ${className} ${disabled ? 'opacity-50' : ''}`}
      style={{
        background: selected
          ? `radial-gradient(120% 90% at 50% 0%, ${accent}55, transparent 70%), linear-gradient(180deg,#3a3258,#1c1830) padding-box, linear-gradient(180deg,#fff2c0,#d9a33a 50%,#8a5a12) border-box`
          : 'linear-gradient(180deg,#2a2440,#16132a) padding-box, linear-gradient(180deg,#7a6640,#3a3020) border-box',
        border: '1.5px solid transparent',
        boxShadow: selected ? `0 0 14px ${accent}88, 0 3px 0 #08070e, inset 0 1px 0 rgba(255,255,255,.2)` : '0 3px 0 #08070e, inset 0 1px 0 rgba(255,255,255,.08)',
        ...style,
      }}
    >
      {selected && (
        <span className="absolute -top-[7px] -right-[5px] flex h-[18px] w-[18px] items-center justify-center rounded-full border border-amber-100 bg-gradient-to-b from-amber-200 to-amber-600 shadow-[0_0_6px_rgba(255,200,90,.9)]">
          <Check size={12} strokeWidth={3.5} className="text-amber-950" />
        </span>
      )}
      {Icon && <Icon size={22} strokeWidth={2} style={{ color: selected ? accent : '#b8ad98', filter: selected ? `drop-shadow(0 0 4px ${accent})` : undefined }} />}
      {icon}
      <span className={`font-display text-[15px] leading-5 ${selected ? 'text-amber-50' : 'text-zinc-300'}`}>{label}</span>
      {sub && <span className="text-[12px] leading-4 text-zinc-400">{sub}</span>}
    </button>
  );
}

/** 舞う光の粒（タイトルなどの背景に重ねる。動きを減らす設定では止まる） */
export function Motes({ count = 18, color = '#ffd98a' }: { count?: number; color?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const left = (i * 53) % 100;
        const size = 2 + ((i * 7) % 4);
        return (
          <span
            key={i}
            className="mote absolute bottom-[-10px] rounded-full"
            style={
              {
                left: `${left}%`,
                width: size,
                height: size,
                background: color,
                boxShadow: `0 0 ${size * 3}px ${color}`,
                '--dur': `${7 + ((i * 13) % 7)}s`,
                '--dx': `${((i * 37) % 60) - 30}px`,
                '--delay': `${-((i * 1.7) % 9)}s`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
