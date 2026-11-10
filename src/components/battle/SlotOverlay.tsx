import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { rollResultSound } from '../../audio/cues';
import { playSound } from '../../audio/player';
import { TIMING } from '../../data/balance';
import { speedFactor, useBattle } from '../../store/battleStore';
import { isReach, slotTiming } from '../../store/slotTiming';

const STYLE = {
  focus: { bg: 'linear-gradient(180deg,#ffe9a8,#e2a72a)', border: '#fff3c4', color: '#5a3a06', Icon: Star },
  hit: { bg: 'linear-gradient(180deg,#5af2a8,#138a50)', border: '#b8ffd8', color: '#06301a', Icon: Check },
  miss: { bg: 'linear-gradient(180deg,#5a2430,#2a0c12)', border: '#ff7a8a', color: '#ff9aa8', Icon: X },
} as const;

/** 回っている枠の中を流れる絵柄（✓・×・★ が縦に流れる） */
function SpinningReel({ reach }: { reach: boolean }) {
  return (
    <span className={`slot-reel ${reach ? 'slot-reel-reach' : ''}`} data-slot-spinning={reach ? 'reach' : 'spin'}>
      <span className="slot-reel-strip">
        {[Check, X, Star, Check, X, Star].map((Icon, i) => (
          <span key={i} className="flex h-9 items-center justify-center">
            <Icon size={18} strokeWidth={3} className="text-white/70" />
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * スロット判定の演出（段階C）。左の枠から1つずつ止める（1枠0.06〜0.1秒・全体0.3〜0.4秒・高速は半分）。
 * フォーカスの枠は最初から金色の確定枠。最後の1枠で完全成功のリーチなら、その枠の光を強める。
 * 全枠成功は「完全成功！」と金色に弾けて、攻撃のエフェクトへつなぐ（効果のコマはスロットが止まってから出る）。
 * 操作は止めない（演出中も次のカードを選べる）
 */
export function SlotOverlay() {
  const fx = useBattle((s) => s.rollFx);
  const fast = useBattle((s) => s.settings.fastMode);
  const simple = useBattle((s) => s.settings.cutinMode === 'simple');
  const reducedOs = useReducedMotion();
  const calm = simple || !!reducedOs;
  const [visible, setVisible] = useState<number | null>(null);
  const [stopped, setStopped] = useState(0);
  const speed = speedFactor({ fastMode: fast });
  const hold = TIMING.resultPopup / speed;
  const timing = fx ? slotTiming(fx.results) : null;
  const total = (timing?.total ?? 0) / speed;

  useEffect(() => {
    if (!fx || !timing) return;
    setVisible(fx.id);
    const opts = { quiet: fx.quiet }, n = fx.results.length;
    const timers: ReturnType<typeof setTimeout>[] = [];
    // 何枠止まったか（左から数える。フォーカスの枠は最初から止まっている）
    const order = fx.results.map((_, i) => i).sort((a, b) => timing.stops[a] - timing.stops[b]);
    let count = order.filter((i) => timing.stops[i] === 0).length;
    setStopped(count);
    playSound('sfx_slot_spin', opts);
    for (const i of order) {
      if (timing.stops[i] === 0) continue;
      timers.push(setTimeout(() => {
        count++;
        setStopped(count);
        playSound('sfx_slot_stop', opts);
        // リーチ: 3つ以上で、最後の1枠の前まで全部当たり（最後の1つ前が止まった時に鳴らす）
        if (n >= 3 && i === order[order.length - 2] && isReach(fx.results, timing.last)) playSound('sfx_slot_reach', opts);
      }, (timing.stops[i] / speed) * 1000));
    }
    const successes = fx.successes ?? fx.results.filter((r) => r !== 'miss').length;
    timers.push(setTimeout(() => playSound(rollResultSound(successes, n, fx.perfect), opts), total * 1000));
    timers.push(setTimeout(() => setVisible(null), (total + hold) * 1000));
    return () => timers.forEach(clearTimeout);
  }, [fx?.id, speed]);

  if (!fx || !timing) return null;
  // 止まった枠（時刻の順）: 左から数えて stopped 個
  const order = fx.results.map((_, i) => i).sort((a, b) => timing.stops[a] - timing.stops[b]);
  const done = new Set(order.slice(0, stopped));
  const finished = stopped >= fx.results.length;
  const reach = isReach(fx.results, timing.last);
  const summary = fx.perfect ? fx.summary.replace(/^完全成功！?\s*/, '') : fx.summary;

  return (
    <AnimatePresence>
      {visible === fx.id && (
        <motion.div
          key={fx.id}
          initial={{ opacity: 1, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.08 }}
          className={`relative flex max-w-[calc(100%-24px)] flex-col items-center gap-1 rounded-xl border px-3 py-1.5 ${
            fx.perfect && finished ? 'border-amber-300 bg-[#2a1a06]/90 shadow-[0_0_24px_rgba(255,200,80,.45)]' : 'border-white/25 bg-black/80'
          }`}
          data-slot-overlay={finished ? 'done' : 'spinning'}
        >
          {/* 完全成功: 金色に弾ける輪 */}
          {fx.perfect && finished && !calm && <span className="slot-perfect-burst" style={{ animationDuration: `${0.45 / speed}s` }} />}
          <div className="flex gap-1">
            {fx.results.map((r, i) => {
              if (!done.has(i)) return <SpinningReel key={`s${i}`} reach={reach && i === timing.last} />;
              const st = STYLE[r];
              return (
                <motion.span
                  key={`r${i}`}
                  initial={r === 'focus' ? { opacity: 1, scale: 1 } : calm ? { opacity: 0 } : { opacity: 0, scale: 1.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.06 }}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border-2 ${r === 'focus' ? 'slot-focus-locked' : ''}`}
                  style={{ background: st.bg, borderColor: st.border, color: st.color }}
                  data-slot-result={r}
                >
                  <st.Icon size={20} strokeWidth={3.2} />
                </motion.span>
              );
            })}
          </div>
          {finished && fx.perfect && (
            <motion.div
              initial={calm ? { opacity: 0 } : { opacity: 0, scale: 1.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.1 }}
              className="font-display text-outline text-[22px] leading-7 tracking-[0.12em] text-amber-300"
              style={{ textShadow: '0 0 8px rgba(255,200,80,.95), 0 0 18px rgba(255,170,40,.6), 0 1px 2px #000' }}
              data-perfect-callout
            >
              完全成功！
            </motion.div>
          )}
          {finished && !!summary && (
            <motion.div
              initial={{ opacity: 0, scale: 1.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.08 }}
              className={`font-display text-outline line-clamp-2 text-center text-[18px] leading-6 break-words ${fx.perfect ? 'text-amber-200' : 'text-white'}`}
              data-roll-summary
            >
              {summary}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
