import { AnimatePresence, motion } from 'framer-motion';
import { Layers, Menu, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { findAlly, isDone } from '../engine';
import { useBattle } from '../store/battleStore';

export function TopBar() {
  const turn = useBattle((s) => s.battle.turn);
  const phase = useBattle((s) => s.battle.phase);
  const openSheet = useBattle((s) => s.openSheet);
  // カオスゲージ（演出用の飾り。ターンが進むほど溜まる）
  const chaos = Math.min(1, (turn - 1) / 10);
  return (
    <div className="flex h-11 shrink-0 items-center gap-2 px-2">
      <div className="text-[13px] font-bold whitespace-nowrap text-amber-200">ターン {turn}</div>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <span className="text-[12px] text-fuchsia-300">混沌</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/60">
          <div
            className="h-full w-full origin-left bg-gradient-to-r from-fuchsia-700 to-fuchsia-400 transition-transform"
            style={{ transform: `scaleX(${chaos})` }}
          />
        </div>
      </div>
      <div className={`text-[12px] whitespace-nowrap ${phase === 'enemy' ? 'text-red-300' : 'text-emerald-300'}`}>
        {phase === 'enemy' ? '敵フェーズ' : phase === 'ally' ? '味方フェーズ' : ''}
      </div>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={(e) => {
          e.stopPropagation();
          openSheet('menu');
        }}
        aria-label="メニュー"
        className="flex h-11 w-11 items-center justify-center rounded-lg bg-black/40 text-amber-100"
      >
        <Menu size={22} />
      </motion.button>
    </div>
  );
}

export function BottomBar() {
  const battle = useBattle((s) => s.battle);
  const activeId = useBattle((s) => s.activeId);
  const hint = useBattle((s) => s.hint);
  const endTurn = useBattle((s) => s.endTurn);
  const openSheet = useBattle((s) => s.openSheet);
  const ally = findAlly(battle, activeId);
  const allDone = battle.phase === 'ally' && battle.allies.every((a) => isDone(battle, a));
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!hint) return;
    setShowHint(true);
    const t = setTimeout(() => setShowHint(false), 1800);
    return () => clearTimeout(t);
  }, [hint]);

  const pileBtn = 'flex h-11 min-w-[52px] items-center justify-center gap-1 rounded-lg bg-black/40 px-2 text-[13px] font-bold tabular-nums';

  return (
    <div className="relative flex h-14 shrink-0 items-center gap-2 px-2" onClick={(e) => e.stopPropagation()}>
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => openSheet('draw')} className={pileBtn} aria-label="山札を見る">
        <Layers size={16} className="text-sky-300" />
        {ally?.drawPile.length ?? 0}
      </motion.button>
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => openSheet('discard')} className={pileBtn} aria-label="捨札を見る">
        <Trash2 size={16} className="text-zinc-400" />
        {ally?.discard.length ?? 0}
      </motion.button>
      <div className="min-w-0 flex-1">
        <AnimatePresence>
          {showHint && hint && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-right text-[12px] leading-4 text-amber-200"
            >
              {hint.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={endTurn}
        disabled={battle.phase !== 'ally'}
        className={`relative h-12 w-[124px] shrink-0 rounded-xl text-[16px] font-black ${
          battle.phase !== 'ally'
            ? 'bg-zinc-800 text-zinc-500'
            : allDone
              ? 'bg-gradient-to-b from-amber-300 to-amber-600 text-stone-950 ring-2 ring-amber-200'
              : 'bg-gradient-to-b from-stone-600 to-stone-800 text-amber-50'
        }`}
      >
        {allDone && <span className="glow-pulse pointer-events-none absolute -inset-1 rounded-xl border-2 border-amber-300" />}
        {battle.phase === 'enemy' ? '敵の行動中' : 'ターン終了'}
      </motion.button>
    </div>
  );
}
