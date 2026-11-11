// ===== カードの見た目（手札・報酬・デッキ一覧で共通。spec §20.2） =====
// 構成: 枠（レア度の金属）→ 絵の枠（種類・属性の色の光と大きなアイコン。描いた絵があれば差し替え）
//       → 名前の帯 → 成功率 → 成功数ごとの効果
// 描いた絵は src/assets/art/card/<カードID>.webp に置くと使われる
import { Sparkles, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { artImage } from '../../art';
import { getElement } from '../../data/elements';
import type { CardDef, Rarity } from '../../types';
import { tierRange } from '../format';
import { CATEGORY_STYLE, EffectChip, ELEMENT_ICONS } from './icons';

/** レア度ごとの枠の金属（コモン＝鉄、レア＝銀、エピック＝紫の宝石の金、レジェンド＝虹色の箔） */
export const CARD_METAL: Record<Rarity, { frame: string; edge: string; foil?: boolean }> = {
  common: { frame: 'linear-gradient(160deg,#c9ced8 0%,#7a808e 35%,#3a3e48 70%,#5e6472 100%)', edge: '#9aa0ae' },
  rare: { frame: 'linear-gradient(160deg,#f2f8ff 0%,#9cc8f0 30%,#3a6aa0 65%,#a8d0f8 100%)', edge: '#bfe0ff' },
  epic: { frame: 'linear-gradient(160deg,#fff0b8 0%,#e0a8ff 30%,#7a3ac8 60%,#f2c24a 100%)', edge: '#e2b8ff' },
  legend: { frame: 'linear-gradient(115deg,#ffe27a,#ff8ad8,#8ad8ff,#a8ff9a,#ffe27a,#ff8ad8)', edge: '#fff2b0', foil: true },
};

/** カードの属性（一番強い段階のダメージの属性。無ければ undefined） */
function cardElement(card: CardDef): string | undefined {
  for (let i = card.tiers.length - 1; i >= 0; i--) {
    const e = card.tiers[i].effects.find((x) => x.kind === 'damage' && (x as { element?: string }).element) as { element?: string } | undefined;
    if (e?.element) return e.element;
  }
  return undefined;
}

/** 絵の枠（描いた絵が無い間の仮の絵: 種類・属性の色の光と、大きなアイコン） */
function CardArt({ card, height }: { card: CardDef; height: number }) {
  const cat = CATEGORY_STYLE[card.category];
  const img = artImage(`card/${card.id}`);
  const elId = cardElement(card);
  const el = elId ? getElement(elId) : undefined;
  const Icon = (el && ELEMENT_ICONS[el.icon]) || cat.Icon;
  const color = el?.color ?? cat.glow;
  return (
    <div className="relative shrink-0 overflow-hidden rounded-t-[6px]" style={{ height }}>
      {img ? (
        <img src={img} alt="" draggable={false} className="pointer-events-none h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            background: `radial-gradient(circle at 50% 60%, ${color}66 0%, ${cat.frame}55 38%, transparent 72%), repeating-linear-gradient(135deg, rgba(255,255,255,.04) 0 6px, transparent 6px 12px), #0d0a14`,
          }}
        >
          <Icon size={Math.round(height * 0.62)} strokeWidth={1.6} style={{ color, filter: `drop-shadow(0 0 6px ${color})` }} />
        </div>
      )}
      {/* 下に向かって暗く（名前の帯を読みやすく） */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
    </div>
  );
}

/** コストの宝石 */
function CostGem({ cost, changed }: { cost: number; changed?: boolean }) {
  return (
    <span
      className={`font-display absolute top-[3px] left-[3px] z-10 flex h-[24px] w-[24px] items-center justify-center text-[15px] leading-none ${changed ? 'text-lime-200' : 'text-white'}`}
      data-cost-changed={changed || undefined}
      style={{
        clipPath: 'polygon(50% 0,100% 30%,100% 70%,50% 100%,0 70%,0 30%)',
        background: 'linear-gradient(160deg,#d8f0ff 0%,#4aa0ff 40%,#1a4ab0 75%,#0a1e5a 100%)',
        textShadow: '0 1px 2px #001a4a',
      }}
    >
      {cost}
    </span>
  );
}

/** スロットの枠の数（ひし形。focus 個はフォーカスで確定成功＝金色） */
function SlotPips({ slots, focus = 0 }: { slots: number; focus?: number }) {
  return (
    <span className="absolute top-[4px] right-[3px] z-10 flex gap-[3px] rounded-full bg-black/60 px-[4px] py-[3px]">
      {Array.from({ length: slots }, (_, i) => (
        <span
          key={i}
          className="h-[7px] w-[7px] rotate-45 border"
          style={i < focus ? { background: '#ffd54a', borderColor: '#fff3c4', boxShadow: '0 0 5px #ffd54a' } : { background: 'rgba(0,0,0,.5)', borderColor: '#d8cfb6' }}
        />
      ))}
    </span>
  );
}

export function CardBody({
  card,
  cost,
  chance,
  width,
  height,
  focus,
  selected,
  dim,
  compact,
  children,
}: {
  card: CardDef;
  /** 今のコスト（装備などで変わっている時。無ければカードの元のコスト） */
  cost?: number;
  chance?: number;
  width: number;
  height: number;
  /** フォーカスで確定成功にする枠の数（選んでいる時） */
  focus?: number;
  selected?: boolean;
  /** 使えない時は暗く */
  dim?: boolean;
  /** 手札の通常時: 段階ごとの一覧を隠し、完全成功の数値だけを出す（タップで大きなカードに詳細） */
  compact?: boolean;
  /** 上に重ねる物（使えない理由の表示など） */
  children?: ReactNode;
}) {
  const cat = CATEGORY_STYLE[card.category];
  const rarity = card.rarity ?? 'common';
  const metal = CARD_METAL[rarity];
  const artH = Math.round(height * (compact ? 0.42 : 0.27));
  const best = card.tiers[card.tiers.length - 1];
  const strong = rarity === 'epic' || rarity === 'legend';
  return (
    <div
      className={`relative h-full w-full rounded-[10px] p-[3px] ${metal.foil && !selected ? 'card-foil' : ''}`}
      style={{
        width,
        height,
        background: selected ? 'linear-gradient(160deg,#fff8d8,#ffd54a 40%,#c0841c 75%,#fff0b0)' : metal.frame,
        boxShadow: selected
          ? '0 0 0 1px #fff3c4, 0 0 20px rgba(255,210,100,.85)'
          : strong
            ? `0 0 10px ${metal.edge}aa, 0 4px 8px rgba(0,0,0,.65)`
            : '0 4px 8px rgba(0,0,0,.65)',
        filter: dim && !selected ? 'grayscale(.85) brightness(.65)' : undefined,
      }}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[7px]" style={{ background: cat.inner, boxShadow: `inset 0 0 0 1px ${cat.frame}` }}>
        <CostGem cost={cost ?? card.cost} changed={cost !== undefined && cost !== card.cost} />
        <SlotPips slots={card.slots} focus={focus} />
        <CardArt card={card} height={artH} />
        {/* 名前の帯（種類の色の縁） */}
        <div
          className="relative -mt-[13px] flex min-h-[26px] shrink-0 items-center justify-center px-[3px] text-center"
          style={{ background: `linear-gradient(90deg, transparent, rgba(8,6,12,.92) 12%, rgba(8,6,12,.92) 88%, transparent)`, borderTop: `1px solid ${cat.glow}88`, borderBottom: `1px solid ${cat.glow}88` }}
        >
          {/* 長い名前は2行に。行の長さをそろえて、変な所で切れないように */}
          <span className="font-display line-clamp-2 text-[12.5px] leading-[13px] text-amber-50" style={{ textWrap: 'balance' }}>
            {card.name}
          </span>
          {card.trait && <Sparkles size={11} className="absolute top-[-6px] right-[2px]" style={{ color: metal.edge, filter: `drop-shadow(0 0 3px ${metal.edge})` }} />}
        </div>
        <div className="flex shrink-0 items-center justify-between px-[4px] pt-[1px]">
          <span className="flex items-center gap-[2px] text-[12px] font-bold" style={{ color: cat.glow }}>
            <cat.Icon size={12} strokeWidth={2.6} />
          </span>
          <span className="flex items-baseline">
            <span className="font-display text-outline text-[19px] leading-[21px] text-amber-200 tabular-nums">{chance ?? card.baseChance}</span>
            <span className="text-[12px] font-bold text-amber-200/80">%</span>
          </span>
        </div>
        {compact && card.trait && (
          // エピック以上: 特殊能力の名前の帯（詳細はタップで）
          <div className="mx-[3px] mt-[1px] flex h-[15px] items-center justify-center gap-[2px] overflow-hidden rounded-sm bg-black/50 px-[2px] text-[12px] leading-[15px] font-bold whitespace-nowrap" style={{ color: metal.edge, boxShadow: `inset 0 0 0 1px ${metal.edge}66` }} data-trait>
            <Sparkles size={10} className="shrink-0" />
            <span className="truncate">{card.trait.name}</span>
          </div>
        )}
        {compact ? (
          // 完全成功の時の数値（一番強い段階）
          <div className="mx-[3px] mt-auto mb-[3px] flex items-center justify-center gap-1 rounded-md bg-amber-400/15 px-0.5 py-[1px] text-[12px] leading-[16px] font-bold" data-best>
            <Star size={11} className="shrink-0 fill-amber-300 text-amber-300" />
            <span className="flex min-w-0 flex-wrap justify-center gap-x-1">
              {best.effects.map((e, j) => (
                <EffectChip key={j} e={e} />
              ))}
            </span>
          </div>
        ) : (
        <div className="flex min-h-0 flex-col gap-[1px] px-[2px] pb-[2px]">
          {card.tiers.map((t, i) => {
            const perfect = t.minSuccesses === card.slots;
            return (
              <div key={i} className={`flex items-center gap-0.5 rounded-sm px-0.5 text-[12px] leading-[15px] font-bold ${perfect ? 'bg-amber-400/15' : 'bg-black/20'}`}>
                <span className={`shrink-0 tabular-nums ${perfect ? 'text-amber-300' : 'text-zinc-400'}`}>{tierRange(card, i)}</span>
                <span className="flex min-w-0 flex-wrap gap-x-1">
                  {t.effects.map((e, j) => (
                    <EffectChip key={j} e={e} />
                  ))}
                </span>
              </div>
            );
          })}
          {card.trait && (
            <div className="mt-0.5 rounded-sm bg-black/40 px-1 text-[12px] leading-[15px]" style={{ color: metal.edge }}>
              <Sparkles size={10} className="mr-0.5 inline" />
              {card.trait.name}
            </div>
          )}
        </div>
        )}
        {children}
      </div>
    </div>
  );
}
