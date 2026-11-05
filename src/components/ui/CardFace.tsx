// ===== カードの見た目（手札以外: 報酬・デッキ一覧など） =====
import { Sparkles } from 'lucide-react';
import type { CardDef, Rarity } from '../../types';
import { tierRange } from '../format';
import { RARITY_STYLE } from './game';
import { CATEGORY_STYLE, EffectChip } from './icons';

/** レア度の枠の光（レア＝青い縁、エピック・レジェンド＝脈打つ光）。親は relative にする */
export function RarityAura({ rarity }: { rarity?: Rarity }) {
  if (!rarity || rarity === 'common') return null;
  const r = RARITY_STYLE[rarity];
  const strong = rarity === 'epic' || rarity === 'legend';
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute -inset-[2px] rounded-[12px] ${strong ? 'glow-pulse' : ''}`}
      style={{ boxShadow: `0 0 0 2px ${r.color}, 0 0 ${strong ? 16 : 8}px ${r.glow}` }}
    />
  );
}

/** カード名（特殊能力があれば、その名前の帯を2行目に出す） */
export function CardTitle({ card, compact }: { card: CardDef; compact?: boolean }) {
  // 手札（幅が狭い）では、名前は2行のまま、能力の印だけを右上に出す（能力名は長押しの詳細で見る）
  if (card.trait && compact)
    return (
      <div className="font-display relative line-clamp-2 h-[30px] shrink-0 pr-[13px] text-[12.5px] leading-[15px] text-amber-50">
        {card.name}
        <Sparkles size={12} className="absolute top-[1px] right-0" style={{ color: RARITY_STYLE[card.rarity ?? 'epic'].color }} />
      </div>
    );
  if (!card.trait) return <div className="font-display relative line-clamp-2 h-[30px] shrink-0 text-[12.5px] leading-[15px] text-amber-50">{card.name}</div>;
  const r = RARITY_STYLE[card.rarity ?? 'epic'];
  return (
    <div className="relative flex h-[30px] shrink-0 flex-col">
      <div className="font-display truncate text-[12.5px] leading-[15px] text-amber-50">{card.name}</div>
      <div
        className="flex h-[15px] items-center gap-[2px] truncate rounded-sm px-[2px] text-[12px] leading-[15px] font-bold"
        style={{ color: r.color, background: 'rgba(0,0,0,.45)', boxShadow: `inset 0 0 0 1px ${r.color}55` }}
      >
        <Sparkles size={10} className="shrink-0" />
        <span className="truncate">{card.trait.name}</span>
      </div>
    </div>
  );
}

export function CardFace({ card, chance, width = 98, height = 150, glow }: { card: CardDef; chance?: number; width?: number; height?: number; glow?: string }) {
  const cat = CATEGORY_STYLE[card.category];
  return (
    <div
      className="relative shrink-0 rounded-[10px] p-[2px]"
      style={{
        width,
        height,
        background: `linear-gradient(160deg,${cat.glow},${cat.frame} 35%,#1a1018)`,
        boxShadow: glow ? `0 0 14px ${glow}` : '0 3px 6px rgba(0,0,0,.6)',
      }}
    >
      <RarityAura rarity={card.rarity} />
      <div className="relative flex h-full flex-col overflow-hidden rounded-[8px] px-1 pt-0.5 pb-1" style={{ background: cat.inner }}>
        <cat.Icon size={60} strokeWidth={1.5} className="pointer-events-none absolute right-[-10px] bottom-[-8px] opacity-[0.09]" style={{ color: cat.glow }} />
        <div className="relative flex h-[22px] shrink-0 items-center justify-between">
          <span
            className="font-display flex h-[22px] w-[22px] items-center justify-center rounded-full border text-[14px] leading-none text-white"
            style={{ background: 'radial-gradient(circle at 35% 30%,#bfe6ff,#2a7ad8 55%,#0c2a6a)', borderColor: '#cfeaff' }}
          >
            {card.cost}
          </span>
          <span className="flex gap-[3px] pr-0.5">
            {Array.from({ length: card.slots }, (_, i) => (
              <span key={i} className="h-[8px] w-[8px] rotate-45 border" style={{ background: 'rgba(0,0,0,.45)', borderColor: '#cfc6b0' }} />
            ))}
          </span>
        </div>
        <CardTitle card={card} />
        <div className="relative flex shrink-0 items-baseline gap-0.5">
          <cat.Icon size={12} strokeWidth={2.6} style={{ color: cat.glow }} />
          <span className="font-display text-outline text-[18px] leading-[22px] text-amber-200 tabular-nums">{chance ?? card.baseChance}</span>
          <span className="text-[12px] font-bold text-amber-200/80">%</span>
        </div>
        <div className="relative mt-0.5 flex min-h-0 flex-col gap-[1px]">
          {card.tiers.map((t, i) => {
            const perfect = t.minSuccesses === card.slots;
            return (
              <div key={i} className={`flex items-center gap-0.5 rounded-sm px-0.5 text-[12px] leading-[15px] font-bold ${perfect ? 'bg-amber-400/15' : ''}`}>
                <span className={`shrink-0 tabular-nums ${perfect ? 'text-amber-300' : 'text-zinc-400'}`}>{tierRange(card, i)}</span>
                <span className="flex min-w-0 flex-wrap gap-x-1">
                  {t.effects.map((e, j) => (
                    <EffectChip key={j} e={e} />
                  ))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
