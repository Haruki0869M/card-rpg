import { AnimatePresence, motion } from 'framer-motion';
import { Check, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { rollResultSound } from '../../audio/cues';
import { playSound } from '../../audio/player';
import { TIMING } from '../../data/balance';
import { speedFactor, useBattle } from '../../store/battleStore';

const STYLE = {
  focus: { bg: 'linear-gradient(180deg,#ffe9a8,#e2a72a)', border: '#fff3c4', color: '#5a3a06', Icon: Star },
  hit: { bg: 'linear-gradient(180deg,#5af2a8,#138a50)', border: '#b8ffd8', color: '#06301a', Icon: Check },
  miss: { bg: 'linear-gradient(180deg,#5a2430,#2a0c12)', border: '#ff7a8a', color: '#ff9aa8', Icon: X },
} as const;

/** スロット判定演出（0.15秒で左から順に表示。操作をブロックしない） */
export function SlotOverlay() {
  const fx = useBattle((s) => s.rollFx);
  const fast = useBattle((s) => s.settings.fastMode);
  const [visible, setVisible] = useState<number | null>(null);
  const speed = speedFactor({ fastMode: fast });
  const reveal = TIMING.slotReveal / speed;
  const hold = TIMING.resultPopup / speed;

  useEffect(() => {
    if (!fx) return;
    setVisible(fx.id);
    const t = setTimeout(() => setVisible(null), (reveal + hold) * 1000);
    // 音（K6）: 回り始め → リールが1つずつ止まる → 結果。見た目の時刻に合わせる。速さは見た目と同じ（高速なら詰まる）
    const opts = { quiet: fx.quiet }, n = fx.results.length, step = reveal / Math.max(1, n);
    const sounds: ReturnType<typeof setTimeout>[] = [];
    playSound('sfx_slot_spin', opts);
    fx.results.forEach((_, i) => sounds.push(setTimeout(() => {
      playSound('sfx_slot_stop', opts);
      // リーチ: 3つ以上で、最後の1つの前まで全部当たり
      if (n >= 3 && i === n - 2 && fx.results.slice(0, n - 1).every((r) => r !== 'miss')) playSound('sfx_slot_reach', opts);
    }, step * i * 1000)));
    const successes = fx.successes ?? fx.results.filter((r) => r !== 'miss').length;
    sounds.push(setTimeout(() => playSound(rollResultSound(successes, n, fx.perfect), opts), reveal * 1000));
    return () => { clearTimeout(t); sounds.forEach(clearTimeout); };
  }, [fx, reveal, hold]);

  return (
    <AnimatePresence>
      {fx && visible === fx.id && (
        <motion.div
          key={fx.id}
          initial={{ opacity: 1, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.08 }}
          className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-1.5 ${
            fx.perfect ? 'border-amber-300 bg-[#2a1a06]/90 shadow-[0_0_24px_rgba(255,200,80,.45)]' : 'border-white/25 bg-black/80'
          }`}
        >
          <div className="flex gap-1">
            {fx.results.map((r, i) => {
              const st = STYLE[r];
              return (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 1.8, rotate: -20 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ duration: 0.05, delay: (reveal / fx.results.length) * i }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border-2"
                  style={{ background: st.bg, borderColor: st.border, color: st.color }}
                >
                  <st.Icon size={20} strokeWidth={3.2} />
                </motion.span>
              );
            })}
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 1.3 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.08, delay: reveal }}
            className={`font-display text-outline text-[18px] whitespace-nowrap ${fx.perfect ? 'text-amber-300' : 'text-white'}`}
          >
            {fx.summary}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
