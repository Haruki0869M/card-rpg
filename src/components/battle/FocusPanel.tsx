import { cardTargets, isAllyCard, needsCardTarget, secondaryCard, selectedCardTarget, secondaryCardTarget, targetGuide } from '../../engine/battle/targets';
import { unitIdOf } from '../../engine/battle/units';
import { AllyTargetChips } from './TargetChips';
import { unitName } from '../../engine/battle/units';
import { predictCardTotals, predictTexts, rangeText, type PredictTotals } from '../../engine/battle/battle';
import { nameOf } from '../../engine/battle/units';
// ===== フォーカス注入パネル（カード選択時に手札のすぐ上に出る） =====
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Minus, Plus, Star, X } from 'lucide-react';
import { cardOf } from '../../data/cards';
import { rollChanceFor, findAlly, tierDistribution, toPercents, slotPreviewLimitOf } from '../../engine';
import { useBattle } from '../../store/battleStore';
import { CATEGORY_STYLE, EffectChip } from '../ui/icons';
import { TargetChips } from './TargetChips';

const TIER_COLORS = ['#5a4a5e', '#7a6a8a', '#4a8cff', '#3ad08a', '#ffc94a'];

type Range = [number, number];
const maxRange = (list: Range[]): Range | undefined => (list.length ? list.reduce((a, b) => (b[1] > a[1] ? b : a)) : undefined);
/** 予測の合計から、その種類の効果の値（相手に対する計算後の値）を選ぶ */
function pickValue(totals: PredictTotals[], kind: 'damage' | 'block' | 'heal', targetId?: string): Range | undefined {
  const own = targetId ? totals.find((t) => t.id === targetId) : undefined;
  if (own && own[kind][1] > 0) return own[kind];
  return maxRange(totals.map((t) => t[kind]).filter((r) => r[1] > 0));
}

export function FocusPanel() {
  const selection = useBattle((s) => s.selection);
  const battle = useBattle((s) => s.battle);
  const activeId = useBattle((s) => s.activeId);
  const setFocus = useBattle((s) => s.setFocus);
  const confirm = useBattle((s) => s.confirm);
  const cancel = useBattle((s) => s.cancel);
  const preview = useBattle(s => s.preview);

  const ally = findAlly(battle, activeId);
  const inst = selection && ally?.hand.find((c) => c.uid === selection.cardUid);
  // 成功数ごとの予測（今の相手に対する計算後の値）。hurt = 回復の相手のHPを1にして試した値（満タンでも回復の力を見せる）
  const preds = useMemo(() => {
    if (!selection || !ally || !inst) return null;
    const c = cardOf(inst);
    if ((needsCardTarget(c) && !selectedCardTarget(battle, ally, c, selection.targetId)) || (c.secondaryTarget && !secondaryCardTarget(battle, ally, c, selection.allyTargetId))) return null;
    const heals = c.tiers.some((t) => t.effects.some((e) => e.kind === 'heal'));
    return c.tiers.map((_, i) => ({
      now: predictCardTotals(battle, ally.id, inst.uid, selection.targetId, selection.focus, i, selection.allyTargetId),
      hurt: heals ? predictCardTotals(battle, ally.id, inst.uid, selection.targetId, selection.focus, i, selection.allyTargetId, true) : [],
    }));
  }, [battle, ally, inst, selection]);
  if (!selection || !ally || !inst) return null;
  const card = cardOf(inst);
  const cat = CATEGORY_STYLE[card.category];
  const chance = rollChanceFor(ally, card, selection.focus);
  const max = Math.min(card.slots, ally.focus);
  const probs = tierDistribution(card, selection.focus, chance);
  const pcts = toPercents(probs);
  const selected = selectedCardTarget(battle, ally, card, selection.targetId);
  const secondary = secondaryCardTarget(battle, ally, card, selection.allyTargetId);
  const needsTarget = (needsCardTarget(card) && !selected) || (!!card.secondaryTarget && !secondary);
  // 色は「最上位Tier = 金」になるよう後ろから割り当てる
  const colorOf = (i: number) => TIER_COLORS[TIER_COLORS.length - (card.tiers.length - i)] ?? TIER_COLORS[0];
  const label = (i: number) => {
    const t = card.tiers[i];
    if (t.minSuccesses === card.slots) return '完全';
    const hi = i + 1 < card.tiers.length ? card.tiers[i + 1].minSuccesses - 1 : card.slots;
    return t.minSuccesses === hi ? `${hi}成功` : `${t.minSuccesses}-${hi}`;
  };

  // 一番出やすい成功数（同じ確率なら上の成功数）。狙う敵のチップの予測に使う
  const likelyTier = probs.reduce((best, p, i) => (p >= probs[best] ? i : best), 0);

  // 確率の帯の下の数字: 下の詳しい予測と同じ「今の相手に対する計算後の値」。同じ種類の効果が2つ以上ある時は、最初の1つに合計を出す
  const chipsOf = (i: number) => {
    const p = preds?.[i];
    const used = new Set<string>();
    return card.tiers[i].effects.flatMap((e) => {
      if (!p || (e.kind !== 'damage' && e.kind !== 'block' && e.kind !== 'heal')) return [{ e, value: undefined as string | undefined }];
      const r = pickValue(e.kind === 'heal' ? p.hurt : p.now, e.kind, e.kind === 'heal' ? selection.allyTargetId ?? selection.targetId : selection.targetId);
      if (!r) return [{ e, value: undefined }];
      if (used.has(e.kind)) return [];
      used.add(e.kind);
      return [{ e, value: rangeText(r) }];
    });
  };
  // 下の詳しい予測の行。回復の相手が満タンの時は「HP回復 +4／+7／+10（今は満タン）」の1行で回復の力を見せる
  const healOnly = !!preds && card.tiers.some((t) => t.effects.some((e) => e.kind === 'heal'));
  const fullHeal = healOnly && preds!.every((p) => !p.now.some((t) => t.heal[1] > 0)) && preds!.some((p) => p.hurt.some((t) => t.heal[1] > 0));
  const lines = !preds ? [] : fullHeal
    ? [`HP回復 ${preds.map((p) => { const r = maxRange(p.hurt.map((t) => t.heal).filter((x) => x[1] > 0)); return r ? `+${rangeText(r)}` : '0'; }).join('／')}（今は満タン）`]
    : card.tiers.flatMap((t, i) => {
      if (!(pcts[i] > 0)) return [];
      const text = predictTexts(preds[i].now).map((p) => `${unitName(battle, p.id)} ${p.text}`).join('／');
      if (text) return [`${label(i)}：${text}`];
      return t.effects.length ? [] : [`${label(i)}：効果なし`];
    });

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 40, opacity: 0 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      onClick={(e) => e.stopPropagation()}
      // 段階A: 戦場を縮めず、味方の枠と手札の上に重ねる（すりガラス調の重い枠。下の端は手札の下の端にそろえる）
      className="absolute inset-x-1.5 bottom-0.5 z-50"
      data-focus-panel
    >
      {/* 高さ: 味方の枠と手札の高さ＋味方の下半身まで（頭と上半身は見える）。低い画面でも操作できる高さは残す */}
      <div className="glass-panel relative min-h-0 overflow-y-auto overscroll-contain rounded-xl p-1.5" style={{ maxHeight: 'min(46dvh, max(250px, calc(var(--dock-h, 220px) + var(--ally-reach, 60px))))' }}>
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
          <span className="text-[12px] leading-4 font-bold">{needsTarget ? (card.target === 'enemy' ? '敵をタップ' : '味方をタップ') : selection.focus ? `★${selection.focus} 確定` : '運に任せる'}</span>
        </button>
      </div>

      {needsCardTarget(card) && <div className="mt-1 text-center text-[12px] text-sky-100" data-target-guide>{targetGuide(card)}{selected && `（選択中：${nameOf(selected)}）`}</div>}
      {card.target === 'enemy' && <TargetChips allyId={ally.id} cardUid={inst.uid} focus={selection.focus} tier={likelyTier} tierLabel={label(likelyTier)} targetId={selection.targetId} allyTargetId={selection.allyTargetId} />}
      {isAllyCard(card) && !card.secondaryTarget && <AllyTargetChips allyId={ally.id} candidates={cardTargets(battle, ally, card).map(unitIdOf)} chosen={selection.targetId} />}
      {card.secondaryTarget && <div className="text-center text-[12px] text-sky-100" data-secondary-target-guide>回復・支援する味方をタップしてください{secondary && `（選択中：${nameOf(secondary)}）`}</div>}
      {card.secondaryTarget && <AllyTargetChips allyId={ally.id} candidates={cardTargets(battle, ally, secondaryCard(card)).map(unitIdOf)} chosen={selection.allyTargetId} />}
      {(ally.slotPreviewUsed ?? 0) < slotPreviewLimitOf(ally) && <button onClick={preview} disabled={needsTarget} className="btn btn-dark mt-1 min-h-11 w-full rounded-lg text-[14px] font-bold" data-preview-start>星読みで結果を見る（1戦闘1回）</button>}

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
        {card.tiers.map((_, i) => (
          <div key={i} className={`flex flex-col items-center leading-4 ${pcts[i] === 0 && probs[i] === 0 ? 'opacity-35' : ''}`} data-tier-label={label(i)} data-tier-values={chipsOf(i).map((c) => c.value ?? '').join(',')}>
            <span className="flex items-center gap-0.5 text-[12px] font-bold whitespace-nowrap" style={{ color: colorOf(i) === '#5a4a5e' ? '#b8a8c0' : colorOf(i) }}>
              {label(i)} <span className="tabular-nums text-zinc-100">{pcts[i] === 0 && probs[i] > 0 ? '<1' : pcts[i]}%</span>
            </span>
            <span className="flex flex-wrap justify-center gap-x-1 text-[12px]">
              {chipsOf(i).map(({ e, value }, j) => (
                <EffectChip key={j} e={e} size={11} value={value} />
              ))}
            </span>
          </div>
        ))}
      </div>
      {!needsTarget && lines.length > 0 && <div className="mt-1 max-h-[88px] overflow-y-auto rounded bg-black/30 px-1 text-[12px]" data-card-predictions>{lines.map((l, i) => <div key={i}>{l}</div>)}</div>}
      <div className="mt-0.5 text-center text-[12px] leading-4 text-zinc-500">
        予測は成功数ごとの目安です（抽選・追加効果で変動）。残りフォーカス {ally.focus - selection.focus} / {ally.focus}
      </div>
      </div>
      <span className="glass-panel-crest" />
    </motion.div>
  );
}
