import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { TIMING } from '../data/balance';
import { speedFactor, useBattle } from '../store/battleStore';

const ICON = { focus: '🌟', hit: '⭕', miss: '❌' } as const;
const STYLE = {
  focus: 'border-amber-300 bg-amber-500/40',
  hit: 'border-emerald-300 bg-emerald-700/50',
  miss: 'border-red-400 bg-red-900/60',
} as const;

/** スロット判定演出（操作をブロックしない） */
export function SlotOverlay() {
  const fx = useBattle((s) => s.rollFx);
  const settings = useBattle((s) => s.settings);
  const [visible, setVisible] = useState<number | null>(null);
  const speed = speedFactor(settings);
  const reveal = TIMING.slotReveal / speed;
  const hold = TIMING.resultPopup / speed;

  useEffect(() => {
    if (!fx) return;
    setVisible(fx.id);
    const t = setTimeout(() => setVisible(null), (reveal + hold) * 1000);
    return () => clearTimeout(t);
  }, [fx, reveal, hold]);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center">
      <AnimatePresence>
        {fx && visible === fx.id && (
          <motion.div
            key={fx.id}
            initial={{ opacity: 1, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.08 }}
            className={`flex flex-col items-center gap-1 rounded-xl border bg-black/85 px-3 py-1.5 ${
              fx.perfect ? 'border-amber-300' : 'border-white/20'
            }`}
          >
            <div className="flex gap-1">
              {fx.results.map((r, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 1.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.05, delay: (reveal / fx.results.length) * i }}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border-2 text-[18px] ${STYLE[r]}`}
                >
                  {ICON[r]}
                </motion.span>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.05, delay: reveal }}
              className={`text-[16px] font-black whitespace-nowrap ${fx.perfect ? 'text-amber-300' : 'text-white'}`}
            >
              {fx.summary}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
