import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TIMING } from '../data/balance';
import { getCard } from '../data/cards';
import { chanceFor, findAlly, unusableReason } from '../engine';
import { usePress } from '../hooks/usePress';
import { useBattle } from '../store/battleStore';
import type { AllyState, CardInstance } from '../types';
import { CATEGORY_ICON, shortEffect, tierRange } from './format';

export const CARD_H = 158;
const MIN_STEP = 46; // 重なっても指で押せる幅（44px以上）

function CardView({
  inst,
  ally,
  index,
  width,
  style,
}: {
  inst: CardInstance;
  ally: AllyState;
  index: number;
  width: number;
  style: { left: number; top: number; rotate: number; z: number };
}) {
  const card = getCard(inst.cardId);
  const battle = useBattle((s) => s.battle);
  const selected = useBattle((s) => s.selection?.cardUid === inst.uid);
  const flash = useBattle((s) => (s.flash?.cardUid === inst.uid ? s.flash : null));
  const tapCard = useBattle((s) => s.tapCard);
  const focus = useBattle((s) => (s.selection?.cardUid === inst.uid ? s.selection.focus : 0));
  const press = usePress(() => tapCard(inst.uid), () => ({ type: 'card', cardId: card.id, allyId: ally.id, focus }));
  const reason = unusableReason(battle, ally, card);
  const chance = chanceFor(ally, card);
  const [showFlash, setShowFlash] = useState(false);

  useEffect(() => {
    if (!flash) return;
    setShowFlash(true);
    const t = setTimeout(() => setShowFlash(false), TIMING.reasonFlash * 1000);
    return () => clearTimeout(t);
  }, [flash?.id]);

  const cat = {
    physical: 'from-red-950 to-stone-900 border-red-800/80',
    magic: 'from-indigo-950 to-stone-900 border-indigo-700/80',
    skill: 'from-emerald-950 to-stone-900 border-emerald-700/80',
  }[card.category];

  return (
    <motion.div
      {...press}
      data-card-index={index}
      data-card-id={card.id}
      data-usable={!reason || undefined}
      initial={false}
      animate={{ x: style.left, y: style.top + (selected ? -18 : 0), rotate: selected ? 0 : style.rotate, scale: selected ? 1.04 : 1 }}
      whileTap={{ scale: selected ? 1.0 : 0.95 }}
      transition={{ type: 'tween', duration: 0.09 }}
      className={`absolute top-0 left-0 flex flex-col overflow-hidden rounded-lg border-2 bg-gradient-to-b px-1 pt-0.5 pb-1 ${cat} ${
        selected ? 'border-amber-300 ring-2 ring-amber-300' : ''
      } ${reason && !selected ? 'opacity-55 grayscale' : ''}`}
      style={{ width, height: CARD_H, zIndex: style.z }}
    >
      <div className="flex h-5 shrink-0 items-center justify-between">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-[12px] font-black text-white">
          {card.cost}
        </span>
        <span className="flex gap-[3px]">
          {Array.from({ length: card.slots }, (_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-[2px] border ${i < focus ? 'border-amber-200 bg-amber-400' : 'border-zinc-300 bg-black/40'}`}
            />
          ))}
        </span>
      </div>
      <div className="line-clamp-2 h-8 shrink-0 text-[12px] leading-4 font-bold tracking-tight text-amber-50">{card.name}</div>
      <div className="flex shrink-0 items-center gap-0.5">
        <span className="text-[12px]">{CATEGORY_ICON[card.category]}</span>
        <span className="text-[16px] leading-5 font-black text-amber-200 tabular-nums">{chance}%</span>
      </div>
      <div className="mt-0.5 flex min-h-0 flex-col">
        {card.tiers.map((t, i) => {
          const perfect = t.minSuccesses === card.slots;
          return (
            <div
              key={i}
              className={`flex gap-0.5 text-[12px] leading-[15px] ${perfect ? 'font-bold text-amber-300' : 'text-zinc-200'}`}
            >
              <span className="shrink-0 text-zinc-400 tabular-nums">{tierRange(card, i)}</span>
              <span className="flex min-w-0 flex-wrap gap-x-0.5">
                {t.effects.map((e, j) => (
                  <span key={j} className="whitespace-nowrap">
                    {shortEffect(e)}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
      <AnimatePresence>
        {showFlash && flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
            className="absolute inset-x-0 top-10 bg-black/85 px-1 py-1 text-center text-[12px] leading-4 font-bold text-red-300"
          >
            {flash.text}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** 手札のレイアウト計算（枚数に応じて重なりを増やす。押せる幅が足りなければ2段にする） */
function layout(n: number, W: number) {
  const GAP = 3;
  // 重ならずに並ぶ幅を優先（68〜96px）。入りきらない時だけ重ねる
  const cardW = Math.max(68, Math.min(96, Math.floor((W - GAP * (n - 1)) / Math.max(n, 1))));
  const oneRowStep = n > 1 ? Math.min(cardW + GAP, (W - cardW) / (n - 1)) : 0;
  const rows: number[][] = [];
  if (n <= 1 || oneRowStep >= MIN_STEP) rows.push([...Array(n).keys()]);
  else {
    const first = Math.ceil(n / 2);
    rows.push([...Array(first).keys()]);
    rows.push([...Array(n - first).keys()].map((i) => i + first));
  }
  const rowOffset = 62;
  const positions: { left: number; top: number; rotate: number; z: number }[] = [];
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
        top: r * rowOffset + 8 + Math.abs(off) * 5,
        rotate: off * (step > cardW ? 1.5 : 3),
        z: r * 20 + i + 1,
      };
    });
  });
  return { cardW, positions, height: CARD_H + (rows.length - 1) * rowOffset + 12 };
}

export function Hand() {
  const battle = useBattle((s) => s.battle);
  const activeId = useBattle((s) => s.activeId);
  const ally = findAlly(battle, activeId);
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(340);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const hand = ally && !ally.dead && battle.phase !== 'victory' && battle.phase !== 'defeat' ? ally.hand : [];
  const { cardW, positions, height } = layout(hand.length, W);

  return (
    <div ref={ref} className="relative mx-1" style={{ height: Math.max(height, CARD_H + 12) }}>
      {hand.length === 0 && (
        <div className="flex h-full items-center justify-center text-[13px] text-zinc-500">
          {battle.phase === 'enemy' ? '敵の行動中…' : ally?.dead ? '戦闘不能' : '手札なし'}
        </div>
      )}
      {ally &&
        hand.map((c, i) => <CardView key={c.uid} inst={c} ally={ally} index={i} width={cardW} style={positions[i]} />)}
    </div>
  );
}
