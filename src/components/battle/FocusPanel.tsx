// ===== フォーカス注入パネル（カード選択時に手札のすぐ上に出る） =====
import { motion } from 'framer-motion';
import { Minus, Plus, Star, X } from 'lucide-react';
import { cardOf } from '../../data/cards';
import { rollChanceFor, findAlly, tierDistribution, toPercents } from '../../engine';
import { useBattle } from '../../store/battleStore';
import { CATEGORY_STYLE, EffectChip } from '../ui/icons';

const TIER_COLORS = ['#5a4a5e', '#7a6a8a', '#4a8cff', '#3ad08a', '#ffc94a'];

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
  const card = cardOf(inst);
  const cat = CATEGORY_STYLE[card.category];
  const chance = rollChanceFor(ally, card, selection.focus);
  const max = Math.min(card.slots, ally.focus);
  const probs = tierDistribution(card, selection.focus, chance);
  const pcts = toPercents(probs);
  const needsTarget = card.target === 'enemy' && !selection.targetId;
  // 色は「最上位Tier = 金」になるよう後ろから割り当てる
  const colorOf = (i: number) => TIER_COLORS[TIER_COLORS.length - (card.tiers.length - i)] ?? TIER_COLORS[0];
  const label = (i: number) => {
    const t = card.tiers[i];
    if (t.minSuccesses === card.slots) return '完全';
    const hi = i + 1 < card.tiers.length ? card.tiers[i + 1].minSuccesses - 1 : card.slots;
    return t.minSuccesses === hi ? `${hi}成功` : `${t.minSuccesses}-${hi}`;
  };

  return (
    <motion.div
      initial={{ y: 28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 28, opacity: 0 }}
      transition={{ duration: 0.1 }}
      onClick={(e) => e.stopPropagation()}
      className="panel panel-gold-edge mx-1.5 rounded-xl p-1.5"
    >
      <div className="flex items-center gap-1.5">
        <button onClick={cancel} aria-label="キャンセル" className="btn btn-dark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
          <X size={22} />
        </button>
        <div className="min-w-0 flex-1 leading-4">
          <div className="font-display flex items-center gap-1 truncate text-[15px] text-amber-50">
            <cat.Icon size={14} style={{ color: cat.glow }} />
            {card.name}
          </div>
          <div className="text-[12px] text-zinc-300">
            成功率 <span className="font-bold text-amber-200">{chance}%</span> × {card.slots}枠
          </div>
        </div>
        <button
          onClick={confirm}
          className={`btn ${needsTarget ? 'btn-dark' : 'btn-gold'} flex h-12 w-[112px] shrink-0 flex-col items-center justify-center rounded-xl leading-5`}
        >
          <span className="font-display text-[19px]">発動</span>
          <span className="text-[12px] leading-4 font-bold">{needsTarget ? '敵をタップ' : selection.focus ? `★${selection.focus} 確定` : '運に任せる'}</span>
        </button>
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <button
          onClick={() => setFocus(selection.focus - 1)}
          disabled={selection.focus <= 0}
          aria-label="フォーカスを減らす"
          className="btn btn-dark flex h-11 w-12 shrink-0 items-center justify-center rounded-lg"
        >
          <Minus size={22} />
        </button>
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
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 disabled:opacity-25"
                style={
                  on
                    ? { background: 'radial-gradient(circle,#fff3c4,#f2c24a 50%,#8a5a0a)', borderColor: '#fff3c4', boxShadow: '0 0 12px rgba(255,200,80,.7)' }
                    : { background: 'radial-gradient(circle,#2a2230,#120c16)', borderColor: '#6a5a40' }
                }
              >
                <Star size={22} strokeWidth={2.4} className={on ? 'fill-amber-100 text-amber-900' : 'text-amber-200/40'} />
              </motion.button>
            );
          })}
        </div>
        <button
          onClick={() => setFocus(selection.focus + 1)}
          disabled={selection.focus >= max}
          aria-label="フォーカスを増やす"
          className="btn btn-dark flex h-11 w-12 shrink-0 items-center justify-center rounded-lg"
        >
          <Plus size={22} />
        </button>
      </div>

      {/* 各結果が出る確率（帯グラフ＋数値＋効果） */}
      <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full border border-black/60 bg-black/50">
        {probs.map((p, i) =>
          p > 0 ? (
            <motion.div key={i} layout transition={{ duration: 0.15 }} style={{ width: `${p * 100}%`, background: colorOf(i) }} />
          ) : null,
        )}
      </div>
      <div className="mt-1 grid gap-x-1 gap-y-0.5" style={{ gridTemplateColumns: `repeat(${card.tiers.length}, minmax(0,1fr))` }}>
        {card.tiers.map((t, i) => (
          <div key={i} className={`flex flex-col items-center leading-4 ${pcts[i] === 0 && probs[i] === 0 ? 'opacity-35' : ''}`}>
            <span className="flex items-center gap-0.5 text-[12px] font-bold whitespace-nowrap" style={{ color: colorOf(i) === '#5a4a5e' ? '#b8a8c0' : colorOf(i) }}>
              {label(i)} <span className="tabular-nums text-zinc-100">{pcts[i] === 0 && probs[i] > 0 ? '<1' : pcts[i]}%</span>
            </span>
            <span className="flex flex-wrap justify-center gap-x-1 text-[12px]">
              {t.effects.map((e, j) => (
                <EffectChip key={j} e={e} size={11} />
              ))}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-0.5 text-center text-[12px] leading-4 text-zinc-500">
        残りフォーカス {ally.focus - selection.focus} / {ally.focus}
      </div>
    </motion.div>
  );
}
