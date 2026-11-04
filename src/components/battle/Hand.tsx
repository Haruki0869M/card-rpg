// ===== 手札とカード =====
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useEffect, useMemo, useState } from 'react';
import { TIMING } from '../../data/balance';
import { getCard } from '../../data/cards';
import { chanceFor, findAlly, unusableReason } from '../../engine';
import { useElementSize } from '../../hooks/useElementSize';
import { usePress } from '../../hooks/usePress';
import { useBattle } from '../../store/battleStore';
import { tierRange } from '../format';
import { CATEGORY_STYLE, EffectChip } from '../ui/icons';

export const CARD_H = 160;
const MIN_STEP = 46; // 重なっても指で押せる幅（44px以上）

interface Pos {
  left: number;
  top: number;
  rotate: number;
  z: number;
}

const CardView = memo(function CardView({
  uid,
  cardId,
  allyId,
  chance,
  index,
  width,
  pos,
  selected,
  focus,
  reason,
}: {
  uid: string;
  cardId: string;
  allyId: string;
  chance: number;
  index: number;
  width: number;
  pos: Pos;
  selected: boolean;
  focus: number;
  reason: string | null;
}) {
  const card = getCard(cardId);
  const flash = useBattle((s) => (s.flash?.cardUid === uid ? s.flash : null));
  const tapCard = useBattle((s) => s.tapCard);
  const press = usePress(() => tapCard(uid), () => ({ type: 'card', cardId: card.id, allyId, focus }));
  const cat = CATEGORY_STYLE[card.category];
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (!flash) return;
    setShowFlash(true);
    const t = setTimeout(() => setShowFlash(false), TIMING.reasonFlash * 1000);
    return () => clearTimeout(t);
  }, [flash?.id]);

  return (
    <div
      {...press}
      data-card-index={index}
      data-card-id={card.id}
      data-usable={!reason || undefined}
      className="absolute top-0 left-0"
      style={{
        width,
        height: CARD_H,
        zIndex: pos.z,
        // 位置は CSS の transform + transition で動かす（軽く、確実に最新の位置へ移動する）
        transform: `translate3d(${pos.left}px, ${pos.top + (selected ? -20 : 0)}px, 0) rotate(${selected ? 0 : pos.rotate}deg) scale(${selected ? 1.05 : 1})`,
        transition: 'transform 110ms ease-out',
        willChange: 'transform',
      }}
    >
    <div
      className="card-enter h-full w-full rounded-[10px] p-[2px] transition-[filter] duration-100 active:scale-[.95]"
      style={{
        background: selected
          ? 'linear-gradient(160deg,#fff3c4,#f2c24a 40%,#a86a12)'
          : `linear-gradient(160deg,${cat.glow},${cat.frame} 35%,#1a1018)`,
        boxShadow: selected ? '0 0 18px rgba(255,210,100,.75)' : '0 3px 6px rgba(0,0,0,.6)',
        filter: reason && !selected ? 'grayscale(.85) brightness(.7)' : undefined,
      }}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[8px] px-1 pt-0.5 pb-1" style={{ background: cat.inner }}>
        {/* 透かしのカテゴリアイコン */}
        <cat.Icon size={64} strokeWidth={1.5} className="pointer-events-none absolute right-[-10px] bottom-[-8px] opacity-[0.09]" style={{ color: cat.glow }} />
        <div className="relative flex h-[22px] shrink-0 items-center justify-between">
          <span
            className="font-display flex h-[22px] w-[22px] items-center justify-center rounded-full border text-[14px] leading-none text-white"
            style={{ background: 'radial-gradient(circle at 35% 30%,#bfe6ff,#2a7ad8 55%,#0c2a6a)', borderColor: '#cfeaff' }}
          >
            {card.cost}
          </span>
          <span className="flex gap-[3px] pr-0.5">
            {Array.from({ length: card.slots }, (_, i) => (
              <span
                key={i}
                className="h-[8px] w-[8px] rotate-45 border"
                style={
                  i < focus
                    ? { background: '#ffd54a', borderColor: '#fff3c4', boxShadow: '0 0 5px #ffd54a' }
                    : { background: 'rgba(0,0,0,.45)', borderColor: '#cfc6b0' }
                }
              />
            ))}
          </span>
        </div>
        <div className="font-display relative line-clamp-2 h-[30px] shrink-0 text-[12.5px] leading-[15px] text-amber-50">{card.name}</div>
        <div className="relative flex shrink-0 items-baseline gap-0.5">
          <cat.Icon size={12} strokeWidth={2.6} style={{ color: cat.glow }} />
          <span className="font-display text-outline text-[19px] leading-[22px] text-amber-200 tabular-nums">{chance}</span>
          <span className="text-[12px] font-bold text-amber-200/80">%</span>
        </div>
        <div className="relative mt-0.5 flex min-h-0 flex-col gap-[1px]">
          {card.tiers.map((t, i) => {
            const perfect = t.minSuccesses === card.slots;
            return (
              <div
                key={i}
                className={`flex items-center gap-0.5 rounded-sm px-0.5 text-[12px] leading-[15px] font-bold ${perfect ? 'bg-amber-400/15' : ''}`}
              >
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
        <AnimatePresence>
          {showFlash && flash && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.08 }}
              className="absolute inset-x-0 top-12 border-y border-red-400/60 bg-black/90 px-1 py-1 text-center text-[12px] leading-4 font-bold text-red-300"
            >
              {flash.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </div>
  );
});

/** 手札のレイアウト計算（重ならずに並ぶ幅を優先。押せる幅が足りなければ2段にする） */
function layout(n: number, W: number) {
  const GAP = 3;
  const cardW = Math.max(68, Math.min(98, Math.floor((W - GAP * (n - 1)) / Math.max(n, 1))));
  const oneRowStep = n > 1 ? Math.min(cardW + GAP, (W - cardW) / (n - 1)) : 0;
  const rows: number[][] = [];
  if (n <= 1 || oneRowStep >= MIN_STEP) rows.push([...Array(n).keys()]);
  else {
    const first = Math.ceil(n / 2);
    rows.push([...Array(first).keys()]);
    rows.push([...Array(n - first).keys()].map((i) => i + first));
  }
  const rowOffset = 64;
  const positions: Pos[] = [];
  rows.forEach((row, r) => {
    const m = row.length;
    const step = m > 1 ? Math.min(cardW + GAP, (W - cardW) / (m - 1)) : 0;
    const total = cardW + step * (m - 1);
    const startX = (W - total) / 2;
    row.forEach((cardIdx, i) => {
      const center = (m - 1) / 2;
      const off = m > 1 ? (i - center) / Math.max(center, 1) : 0;
      positions[cardIdx] = {
        left: startX + step * i,
        top: r * rowOffset + 10 + Math.abs(off) * 5,
        rotate: off * (step > cardW ? 1.5 : 3),
        z: r * 20 + i + 1,
      };
    });
  });
  return { cardW, positions, height: CARD_H + (rows.length - 1) * rowOffset + 14 };
}

export function Hand() {
  const battle = useBattle((s) => s.battle);
  const activeId = useBattle((s) => s.activeId);
  const selection = useBattle((s) => s.selection);
  const ally = findAlly(battle, activeId);
  const [ref, size] = useElementSize<HTMLDivElement>();
  const W = size.width || 340;

  const hand = ally && !ally.dead && battle.phase !== 'victory' && battle.phase !== 'defeat' ? ally.hand : [];
  const { cardW, positions, height } = useMemo(() => layout(hand.length, W), [hand.length, W]);

  return (
    <div ref={ref} className="relative mx-1" style={{ height: Math.max(height, CARD_H + 14) }}>
      {hand.length === 0 && (
        <div className="font-display flex h-full items-center justify-center text-[15px] text-zinc-500">
          {battle.phase === 'enemy' ? '敵の行動中…' : ally?.dead ? '戦闘不能' : '手札なし'}
        </div>
      )}
      {ally &&
          hand.map((c, i) => (
            <CardView
              key={c.uid}
              uid={c.uid}
              cardId={c.cardId}
              allyId={ally.id}
              chance={chanceFor(ally, getCard(c.cardId))}
              index={i}
              width={cardW}
              pos={positions[i]}
              selected={selection?.cardUid === c.uid}
              focus={selection?.cardUid === c.uid ? selection.focus : 0}
              reason={unusableReason(battle, ally, getCard(c.cardId))}
            />
          ))}
    </div>
  );
}
