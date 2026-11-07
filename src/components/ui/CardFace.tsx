// ===== カードの見た目（手札以外: 報酬・デッキ一覧など） =====
import { Sparkles } from 'lucide-react';
import type { CardDef, Rarity } from '../../types';
import { CardBody } from './CardBody';
import { RARITY_STYLE } from './game';

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
  return (
    <div className="relative shrink-0 rounded-[10px]" style={{ width, height, boxShadow: glow ? `0 0 14px ${glow}` : undefined }}>
      <CardBody card={card} chance={chance} width={width} height={height} />
    </div>
  );
}
