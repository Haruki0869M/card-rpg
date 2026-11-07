// ===== 手札とカード =====
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useEffect, useMemo, useState } from 'react';
import { TIMING } from '../../data/balance';
import { cardOf } from '../../data/cards';
import { chanceFor, findAlly, unusableReason } from '../../engine';
import { useElementSize } from '../../hooks/useElementSize';
import { usePress } from '../../hooks/usePress';
import { useBattle } from '../../store/battleStore';
import { CardBody } from '../ui/CardBody';

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
  upgraded,
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
  upgraded: boolean;
  allyId: string;
  chance: number;
  index: number;
  width: number;
  pos: Pos;
  selected: boolean;
  focus: number;
  reason: string | null;
}) {
  const card = cardOf({ cardId, upgraded });
  const flash = useBattle((s) => (s.flash?.cardUid === uid ? s.flash : null));
  const tapCard = useBattle((s) => s.tapCard);
  const press = usePress(() => tapCard(uid), () => ({ type: 'card', cardId: card.id, upgraded, allyId, focus }));
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
    <div className="card-enter relative h-full w-full transition-[filter] duration-100 active:scale-[.95]">
      <CardBody card={card} chance={chance} width={width} height={CARD_H} focus={focus} selected={selected} dim={!!reason}>
        <AnimatePresence>
          {showFlash && flash && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.08 }}
              className="absolute inset-x-0 top-12 z-20 border-y border-red-400/60 bg-black/90 px-1 py-1 text-center text-[12px] leading-4 font-bold text-red-300"
            >
              {flash.text}
            </motion.div>
          )}
        </AnimatePresence>
      </CardBody>
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
              upgraded={!!c.upgraded}
              allyId={ally.id}
              chance={chanceFor(ally, cardOf(c))}
              index={i}
              width={cardW}
              pos={positions[i]}
              selected={selection?.cardUid === c.uid}
              focus={selection?.cardUid === c.uid ? selection.focus : 0}
              reason={unusableReason(battle, ally, cardOf(c))}
            />
          ))}
    </div>
  );
}
