// ===== 移動のサイコロの見た目（オーナーの案: すごろくのように、自分の番に応援できるサイコロ） =====
// 結果は押した時にもう決まっている（エンジンの乱数）。ここは見た目だけで、状態・乱数・同期には触れない。
// 真ん中でサイコロが約1秒転がり、目がぽんと出る。横に「＋1（素早さ）」。オンラインの仲間の画面でも、同じ目が同じように転がる。
// 高速モードは半分の時間、動きを減らす設定（OS）では転がさずに結果だけを静かに出す。
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { TIMING } from '../../data/balance';
import { useBattle } from '../../store/battleStore';
import type { DiceRoll } from '../../types';

/** 目の点の位置（3×3 のどこに点を打つか） */
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** サイコロの面（点で目を出す） */
export function DieFace({ face, size = 56, color = '#2a1d10' }: { face: number; size?: number; color?: string }) {
  const pip = Math.max(4, Math.round(size * 0.17));
  return (
    <span
      className="relative inline-grid shrink-0 grid-cols-3 grid-rows-3 rounded-[22%] border-2 border-amber-900/40 bg-gradient-to-br from-[#fffaf0] to-[#e9dcc0] shadow-[0_3px_0_#b9a37a,0_6px_14px_rgba(0,0,0,.45)]"
      style={{ width: size, height: size, padding: size * 0.12 }}
      aria-label={`サイコロの目 ${face}`}
      data-die-face={face}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="flex items-center justify-center">
          {(PIPS[face] ?? []).includes(i) && <span className="rounded-full" style={{ width: pip, height: pip, background: face === 1 && size >= 40 ? '#b3261e' : color }} />}
        </span>
      ))}
    </span>
  );
}

/** ボーナスの文字（例: 「＋1（素早さ）」） */
export const bonusText = (d: DiceRoll) => d.bonus.map((b) => `＋${b.value}（${b.label}）`).join(' ');

/** 小さな結果の表示（パネルの中）: 目・ボーナス・合計（unit が空なら「〇の目」だけ） */
export function DiceResult({ dice, unit }: { dice: DiceRoll; unit: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[12px] leading-4 text-zinc-200" data-dice-result={dice.total}>
      <DieFace face={dice.face} size={26} />
      {dice.bonus.length > 0 && <span className="min-w-0 truncate text-amber-200">{bonusText(dice)}</span>}
      {unit ? (
        <span className="shrink-0">
          → {unit}
          <b className="font-display text-[15px] text-amber-200 tabular-nums">{dice.total}</b>
        </span>
      ) : (
        <span className="shrink-0 text-zinc-400">の目</span>
      )}
    </span>
  );
}

/** もう転がしたサイコロ（同じサイコロを2回転がさない。画面を開き直した時など） */
const shownDice = new Set<string>();

/** 転がる途中に見せる目（見た目だけ。順番は決まっている） */
const TUMBLE = [3, 5, 2, 6, 1, 4, 2, 5, 3, 6, 1, 4];

/**
 * 真ん中で転がるサイコロ。diceKey が新しくなった時だけ出す（この画面を開いた時にもうあったサイコロは出さない）。
 * pointer-events は通さない（押せる物の邪魔をしない）
 */
export function DiceOverlay({ dice, diceKey, title }: { dice: DiceRoll | undefined; /** このサイコロを表す鍵（例: move:種:seq） */ diceKey: string | undefined; title: string }) {
  const reduced = useReducedMotion();
  const fast = useBattle((s) => s.settings.fastMode);
  const atMount = useRef(diceKey);
  const [show, setShow] = useState<{ key: string; dice: DiceRoll } | null>(null);
  const [rolling, setRolling] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!dice || !diceKey || diceKey === atMount.current || shownDice.has(diceKey)) return;
    shownDice.add(diceKey);
    setShow({ key: diceKey, dice });
    setRolling(!reduced);
    setTick(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diceKey]);
  const factor = fast ? 1 / TIMING.fastModeFactor : 1;
  const rollMs = TIMING.diceRoll * 1000 * factor;
  const holdMs = TIMING.diceHold * 1000 * factor;
  useEffect(() => {
    if (!show) return;
    if (!rolling) {
      const t = setTimeout(() => setShow(null), holdMs);
      return () => clearTimeout(t);
    }
    const iv = setInterval(() => setTick((n) => n + 1), 90);
    const t = setTimeout(() => setRolling(false), rollMs);
    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
  }, [show, rolling, rollMs, holdMs]);
  const d = show?.dice;
  const face = d ? (rolling ? (TUMBLE[(tick + d.seq) % TUMBLE.length] % d.sides) + 1 : d.face) : 1;
  return (
    <AnimatePresence>
      {d && show && (
        <motion.div
          key={show.key}
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.15 : 0.18 }}
          data-dice-overlay={rolling ? 'rolling' : 'done'}
        >
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-black/65 px-5 py-3 shadow-[0_0_30px_rgba(0,0,0,.6)] backdrop-blur-[2px]">
            <span className="text-[13px] font-bold text-amber-100">{title}</span>
            <div className="flex items-center gap-3">
              <motion.span
                animate={
                  rolling
                    ? { rotate: [0, -25, 200, 380, 540, 720], y: [0, -26, 0, -12, 0, -4], x: [-50, -30, -10, 0, 0, 0] }
                    : { rotate: 720, y: 0, x: 0, scale: [1.25, 1] }
                }
                transition={rolling ? { duration: rollMs / 1000, ease: 'easeOut' } : { duration: 0.22, ease: 'easeOut' }}
                className="inline-flex"
              >
                <DieFace face={face} size={64} />
              </motion.span>
              {!rolling && (
                <motion.span initial={reduced ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 16 }} className="flex flex-col items-start leading-tight">
                  {d.bonus.map((b) => (
                    <span key={b.label} className="text-[14px] font-bold text-sky-200" data-dice-bonus>
                      ＋{b.value}（{b.label}）
                    </span>
                  ))}
                  <span className="font-display text-[34px] leading-9 text-amber-200 tabular-nums" data-dice-total>
                    {d.bonus.length ? `= ${d.total}` : d.total}
                  </span>
                </motion.span>
              )}
            </div>
            {!rolling && d.rerolled && <span className="text-[12px] text-zinc-300">フォーカスで振り直した（前の目は{d.first}）</span>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
