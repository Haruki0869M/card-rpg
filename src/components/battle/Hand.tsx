import { needsCardTarget } from '../../engine/battle/targets';
// ===== 手札とカード =====
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useEffect, useMemo, useState } from 'react';
import { TIMING } from '../../data/balance';
import { cardOf } from '../../data/cards';
import { chanceFor, findAlly, unusableReason } from '../../engine';
import { useElementSize } from '../../hooks/useElementSize';
import { usePress } from '../../hooks/usePress';
import { useTallScreen } from '../../hooks/useTallScreen';
import { useBattle } from '../../store/battleStore';
import { CardBody } from '../ui/CardBody';

export const CARD_H = 128;
/** 選んだカード（大きく浮き上がって、段階ごとの効果まで見せる） */
const BIG_H = 172;
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
  containerW,
  tall,
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
  containerW: number;
  /** 画面が高い時だけ、選んだカードを大きく浮かせる（低い画面では敵が隠れないように少し上げるだけ） */
  tall: boolean;
}) {
  const card = cardOf({ cardId, upgraded });
  const flash = useBattle((s) => (s.flash?.cardUid === uid ? s.flash : null));
  const tapCard = useBattle((s) => s.tapCard);
  const press = usePress(() => tapCard(uid), () => ({ type: 'card', cardId: card.id, upgraded, allyId, focus }));
  const [showFlash, setShowFlash] = useState(false);
  // 選んだカードは、ひと回り大きく手前に浮き上がる（画面の外にはみ出さないように左右を寄せる）
  const big = selected && tall && !needsCardTarget(card);
  const w = big ? Math.min(Math.round(width * 1.5), 150) : width;
  const h = big ? BIG_H : CARD_H;
  const x = big ? Math.max(2, Math.min(containerW - w - 2, pos.left + width / 2 - w / 2)) : pos.left;
  const y = selected && needsCardTarget(card) ? pos.top : big ? CARD_H - BIG_H - 10 : selected ? pos.top - 14 : pos.top;

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
        width: w,
        height: h,
        zIndex: selected ? 100 : pos.z,
        // 位置は CSS の transform + transition で動かす（軽く、確実に最新の位置へ移動する）
        transform: `translate3d(${x}px, ${y}px, 0) rotate(${selected ? 0 : pos.rotate}deg)`,
        transformOrigin: '50% 100%',
        // 選んだカードはその場で大きくなる（移動のアニメーションは浮き上がりの演出に任せる）
        transition: selected ? 'none' : 'transform 120ms ease-out',
        willChange: 'transform',
      }}
    >
    <div className={`relative h-full w-full transition-[filter] duration-100 active:scale-[.96] ${selected ? 'card-pop' : 'card-enter'}`}>
      <CardBody card={card} chance={chance} width={w} height={h} focus={focus} selected={selected} dim={!!reason} compact={!big}>
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

/** 手札のレイアウト計算: 少し重ねてゆるい扇形に並べる。押せる幅が足りなければ2段にする */
function layout(n: number, W: number) {
  const cardW = Math.max(76, Math.min(94, Math.floor(W / Math.max(n, 1) + 12)));
  // 傾けると外側の角がはみ出すので、左右に余白をとる
  const PAD = 12;
  const fanStep = (m: number) => (m > 1 ? Math.min(cardW * 0.86, (W - PAD * 2 - cardW) / (m - 1)) : 0);
  const rows: number[][] = [];
  if (n <= 1 || fanStep(n) >= MIN_STEP) rows.push([...Array(n).keys()]);
  else {
    const first = Math.ceil(n / 2);
    rows.push([...Array(first).keys()]);
    rows.push([...Array(n - first).keys()].map((i) => i + first));
  }
  const rowOffset = 58;
  const positions: Pos[] = [];
  rows.forEach((row, r) => {
    const m = row.length;
    const step = fanStep(m);
    const total = cardW + step * (m - 1);
    const startX = (W - total) / 2;
    row.forEach((cardIdx, i) => {
      const center = (m - 1) / 2;
      const off = m > 1 ? (i - center) / Math.max(center, 1) : 0;
      positions[cardIdx] = {
        left: startX + step * i,
        // 扇形: 外側ほど下がって、外へ傾く
        top: r * rowOffset + 6 + off * off * 12,
        rotate: off * 6,
        z: r * 20 + i + 1,
      };
    });
  });
  return { cardW, positions, height: CARD_H + (rows.length - 1) * rowOffset + 20 };
}

export function Hand() {
  const battle = useBattle((s) => s.battle);
  const activeId = useBattle((s) => s.activeId);
  const selection = useBattle((s) => s.selection);
  const ally = findAlly(battle, activeId);
  const [ref, size] = useElementSize<HTMLDivElement>();
  const W = size.width || 340;
  const tall = useTallScreen();

  const hand = ally && !ally.dead && battle.phase !== 'victory' && battle.phase !== 'defeat' ? ally.hand : [];
  const { cardW, positions, height } = useMemo(() => layout(hand.length, W), [hand.length, W]);

  return (
    <div ref={ref} className="relative mx-1" style={{ height: Math.max(height, CARD_H + 14) }}>
      {hand.length === 0 && (
        <div className="font-display flex h-full items-center justify-center text-[15px] text-zinc-500">
          {battle.phase === 'enemy' ? '敵の行動中…' : ally?.dead ? '戦闘不能（勝利でHP1復帰）' : '手札なし'}
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
              containerW={W}
              tall={tall}
            />
          ))}
    </div>
  );
}
