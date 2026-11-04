import { motion } from 'framer-motion';
import { Minus, Plus, X } from 'lucide-react';
import { getCard } from '../data/cards';
import { chanceFor, findAlly, tierDistribution, toPercents } from '../engine';
import { useBattle } from '../store/battleStore';

/** カード選択時に手札のすぐ上へ出るボトムシート */
export function FocusPanel() {
  const selection = useBattle((s) => s.selection);
  const battle = useBattle((s) => s.battle);
  const activeId = useBattle((s) => s.activeId);
  const setFocus = useBattle((s) => s.setFocus);
  const confirm = useBattle((s) => s.confirm);
  const cancel = useBattle((s) => s.cancel);

  const ally = findAlly(battle, activeId);
  const inst = selection && ally?.hand.find((c) => c.uid === selection.cardUid);
  if (!selection || !ally || !inst) return null;
  const card = getCard(inst.cardId);
  const chance = chanceFor(ally, card);
  const max = Math.min(card.slots, ally.focus);
  const probs = tierDistribution(card, selection.focus, chance);
  const pcts = toPercents(probs);
  const needsTarget = card.target === 'enemy' && !selection.targetId;
  const tierLabel = (i: number) => {
    const t = card.tiers[i];
    if (t.minSuccesses === card.slots) return '完全';
    const hi = i + 1 < card.tiers.length ? card.tiers[i + 1].minSuccesses - 1 : card.slots;
    return t.minSuccesses === hi ? `${hi}成功` : `${t.minSuccesses}-${hi}成功`;
  };

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 24, opacity: 0 }}
      transition={{ duration: 0.1 }}
      onClick={(e) => e.stopPropagation()}
      className="mx-2 rounded-xl border border-amber-400/50 bg-stone-950/95 p-1.5"
    >
      <div className="flex items-center gap-1.5">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={cancel}
          aria-label="キャンセル"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 active:bg-zinc-700"
        >
          <X size={22} />
        </motion.button>
        <div className="min-w-0 flex-1 leading-4">
          <div className="truncate text-[13px] font-bold text-amber-100">{card.name}</div>
          <div className="text-[12px] text-zinc-300">
            成功率 <span className="font-bold text-amber-200">{chance}%</span> × {card.slots}枠
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={confirm}
          className={`flex h-12 w-[112px] shrink-0 flex-col items-center justify-center rounded-xl leading-5 ${
            needsTarget ? 'bg-zinc-700 text-zinc-300' : 'bg-gradient-to-b from-amber-400 to-amber-600 text-stone-950'
          }`}
        >
          <span className="text-[18px] font-black">発動</span>
          <span className="text-[12px] leading-4 font-bold">{needsTarget ? '対象を選択' : `🌟${selection.focus}使用`}</span>
        </motion.button>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setFocus(selection.focus - 1)}
          disabled={selection.focus <= 0}
          aria-label="フォーカスを減らす"
          className="flex h-11 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-white disabled:opacity-30"
        >
          <Minus size={22} />
        </motion.button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
          {Array.from({ length: card.slots }, (_, i) => {
            const usable = i < max;
            const on = i < selection.focus;
            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.85 }}
                disabled={!usable}
                onClick={() => setFocus(on && selection.focus === i + 1 ? i : i + 1)}
                aria-label={`フォーカス${i + 1}`}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[20px] ${
                  on ? 'bg-amber-500/30 ring-1 ring-amber-300' : 'bg-black/30'
                } ${usable ? '' : 'opacity-25'}`}
              >
                <span className={on ? '' : 'opacity-40 grayscale'}>🌟</span>
              </motion.button>
            );
          })}
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setFocus(selection.focus + 1)}
          disabled={selection.focus >= max}
          aria-label="フォーカスを増やす"
          className="flex h-11 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-white disabled:opacity-30"
        >
          <Plus size={22} />
        </motion.button>
      </div>
      <div className="mt-1 flex flex-wrap justify-center gap-x-2 text-[12px] leading-4 tabular-nums">
        {pcts.map((p, i) => {
          const perfect = card.tiers[i].minSuccesses === card.slots;
          return (
            <span key={i} className={perfect ? 'font-bold text-amber-300' : p === 0 ? 'text-zinc-600' : 'text-zinc-200'}>
              {tierLabel(i)} {p === 0 && probs[i] > 0 ? '<1' : p}%
            </span>
          );
        })}
      </div>
      <div className="text-center text-[12px] leading-4 text-zinc-500">
        残りフォーカス {ally.focus - selection.focus}/{ally.focus}
      </div>
    </motion.div>
  );
}
