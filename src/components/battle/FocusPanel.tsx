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
import { getElement } from '../../data/elements';
import { getStatus } from '../../data/statuses';
import { attackElement } from '../../engine/battle/cardState';
import { convertedElement } from '../../engine/abilities';
import { resistsElement } from '../../engine/battle/effects';
import type { AllyState, BattleState, CardDef } from '../../types';
import { breakPreview, elementNames } from '../format';
import { breakRuleOf } from '../../engine/battle/breakRules';
import { focusFeedOf } from '../../engine/battle/phases';
import { rollChanceFor, findAlly, tierDistribution, toPercents, slotPreviewLimitOf } from '../../engine';
import { useBattle } from '../../store/battleStore';
import { CATEGORY_STYLE, EffectChip, ELEMENT_ICONS } from '../ui/icons';
import { TargetChips } from './TargetChips';
import { elementGuide } from './elementGuide';

const TIER_COLORS = ['#5a4a5e', '#7a6a8a', '#4a8cff', '#3ad08a', '#ffc94a'];

type Range = [number, number];
const maxRange = (list: Range[]): Range | undefined => (list.length ? list.reduce((a, b) => (b[1] > a[1] ? b : a)) : undefined);
/** 予測の合計から、その種類の効果の値（相手に対する計算後の値）を選ぶ */
function pickValue(totals: PredictTotals[], kind: 'damage' | 'block' | 'heal', targetId?: string): Range | undefined {
  const own = targetId ? totals.find((t) => t.id === targetId) : undefined;
  if (own && own[kind][1] > 0) return own[kind];
  return maxRange(totals.map((t) => t[kind]).filter((r) => r[1] > 0));
}

/** 完全成功で必ず付く状態異常の、ひとことの効き目（依頼の文: 氷=行動を止める・雷=30%で行動失敗・火=火傷） */
const STATUS_HINT: Record<string, string> = { freeze: '敵の行動を止める！', paralysis: '30%で敵の行動が失敗！', burn: '毎ターン火傷のダメージ！', poison: '毎ターン毒のダメージ！', curse: '敵の回復が半分！' };

interface CounterHint { kind: 'break' | 'weak' | 'status' | 'miss' | 'lamp'; text: string; color: string; icon?: string }
/**
 * 敵の予告を潰す手がかり。乱数の結果は使わない（完全成功の時に必ず起きる事と、成功数だけで決まる事だけを出す）。
 * - BREAK: 狙う敵（全体カードなら大技を出している敵）が、どの成功数から体勢を崩せるか（大技 48→18 の数字つき）
 * - 弱点: 選んでいる敵の弱点を突く時の「弱点×1.5！（完全成功で火傷確定）」（計画書 第2版 §5-1。BREAK の後に並べる）
 * - 状態異常: 完全成功なら必ず付く、属性の状態異常（耐性のある敵には付かないので出さない）
 */
function counterHints(battle: BattleState, ally: AllyState, card: CardDef, targetId: string | undefined, preds: PredictTotals[][], label: (i: number) => string): CounterHint[] {
  const out: CounterHint[] = [];
  const foes = battle.enemies.filter((e) => !e.dead && (card.target === 'allEnemies' || e.uid === targetId));
  if (card.target !== 'enemy' && card.target !== 'allEnemies') return out;
  // 区切り3b: 吹雪に隠れている敵（白狼王）には、単体のカードのダメージは外れる（かばう敵に逸らされる時は除く）
  const hiddenFoe = card.target === 'enemy' ? foes.find((e) => e.hidden) : undefined;
  if (hiddenFoe && !battle.enemies.some((x) => !x.dead && x.guarding && x !== hiddenFoe))
    out.push({ kind: 'miss', color: '#d8f0ff', text: `❄${unitName(battle, hiddenFoe.uid)}は吹雪に隠れている: ダメージは外れる（全体攻撃・お供・毒・道具は当たる。BREAK はできる）` });
  for (const e of foes) {
    const bp = breakPreview(battle, e);
    if (!bp) continue;
    const from = preds.findIndex((p) => p.some((t) => t.id === e.uid && t.breaks));
    const who = foes.length > 1 ? `${unitName(battle, e.uid)}：` : '';
    if (from < 0) {
      // 2026-11-13: ボス・中ボス・災厄の大技と紫の札（特殊な行動）で、このカードが弱点を突かない時は「完全成功だけでは崩れない」と、崩せる属性を出す。
      // 決まりは breakRules.ts の breakRuleOf（エンジンと同じ関数）。BREAK の予測（engine の breaks）が出ない時だけなので、嘘の「BREAK!」は出ない
      const rule = breakRuleOf(battle, e);
      const guarded = card.target === 'enemy' && battle.enemies.some((x) => !x.dead && x.guarding && x !== e);
      if (rule.weakAndPerfect && !guarded && elementGuide(battle, ally, card, e)?.kind !== 'weak')
        out.push({ kind: 'break', color: '#fcd34d', text: `⚡${who}完全成功だけでは崩れない（弱点の${elementNames(rule.weak)}で完全成功なら BREAK）` });
      continue;
    }
    const power = bp.stops ? `（${bp.name}を止める）` : bp.from !== undefined && bp.to !== undefined ? `（${bp.name} ${bp.from}→${bp.to}）` : `（${bp.name}の威力が半分）`;
    out.push({ kind: 'break', color: '#fcd34d', text: `⚡${who}${from === 0 ? 'この攻撃' : `${label(from)}${from < preds.length - 1 ? '以上' : ''}`}で BREAK！${power}` });
  }
  // 弱点の案内（選んでいる敵だけ）。「確定」は完全成功の予測で、その敵に本当に付く時だけ
  const target = card.target === 'enemy' ? foes[0] : undefined;
  const guide = target ? elementGuide(battle, ally, card, target, preds[preds.length - 1]?.find((t) => t.id === target.uid)?.statuses) : undefined;
  if (guide?.kind === 'weak' && guide.line) {
    const el = guide.element ? getElement(guide.element) : undefined;
    out.push({ kind: 'weak', color: el?.color ?? '#fcd34d', icon: el?.icon, text: guide.line });
  }
  // 完全成功の段の、最初の属性つきの攻撃
  const top = card.tiers[card.tiers.length - 1];
  if (top && top.minSuccesses === card.slots) {
    const seen = new Set<string>();
    for (const eff of top.effects) {
      if (eff.kind !== 'damage') continue;
      const id = convertedElement(ally, card, attackElement(ally, card, eff.element));
      const el = id ? getElement(id) : undefined;
      if (!el?.status || seen.has(el.status)) continue;
      if (!foes.some((e) => !resistsElement(e, el.id))) continue;
      // 選んでいる敵の弱点を突く時は、上の「弱点×1.5！（完全成功で…）」の行に任せて、重ねて出さない
      if (guide?.kind === 'weak') continue;
      seen.add(el.status);
      const st = getStatus(el.status);
      out.push({ kind: 'status', color: el.color, icon: el.icon, text: `完全成功で${st.name}${STATUS_HINT[el.status] ? `（${STATUS_HINT[el.status]}）` : ''}` });
    }
  }
  return out;
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
  const chance = rollChanceFor(ally, card, selection.focus, selectedCardTarget(battle, ally, card, selection.targetId), battle);
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

  // 予告を潰す手がかり（抜本的な見直し §3-2）: 大技の予告を崩せる成功数と、完全成功で必ず付く属性の状態異常
  const hints = !preds || needsTarget ? [] : counterHints(battle, ally, card, selection.targetId, preds.map((p) => p.now), label);
  // 灯喰い（区切り3b）: フォーカスを使うと、影の攻撃が強くなる
  for (const e of battle.enemies) {
    const f = focusFeedOf(e);
    if (!f) continue;
    const now = Math.min(f.max, e.lampEaten ?? 0);
    const next = Math.min(f.max, now + selection.focus);
    hints.push({ kind: 'lamp', color: '#e0b0ff', text: selection.focus > 0 && next > now ? `🕯フォーカスを使うと${unitName(battle, e.uid)}の攻撃+${(next - now) * f.per}（喰った灯 ${now}→${next}/${f.max}。BREAK で0）` : `🕯フォーカス1つにつき${unitName(battle, e.uid)}の攻撃+${f.per}（喰った灯 ${now}/${f.max}）` });
  }

  // 一番出やすい成功数（同じ確率なら上の成功数）。狙う敵のチップの予測に使う
  const likelyTier = probs.reduce((best, p, i) => (p >= probs[best] ? i : best), 0);

  // 確率の帯の下の数字: 下の詳しい予測と同じ「今の相手に対する計算後の値」。同じ種類の効果が2つ以上ある時は、最初の1つに合計を出す
  const chipsOf = (i: number) => {
    const p = preds?.[i];
    const used = new Set<string>();
    return card.tiers[i].effects.flatMap((e) => {
      if (!p || (e.kind !== 'damage' && e.kind !== 'block' && e.kind !== 'heal')) return [{ e, value: undefined as string | undefined }];
      // 区切り3b: 吹雪に隠れている敵には外れる
      if (e.kind === 'damage' && p.now.find((t) => t.id === selection.targetId)?.missed) {
        if (used.has(e.kind)) return [];
        used.add(e.kind);
        return [{ e, value: '外れ' }];
      }
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
      // 自動の確認用の見えない印（B5）: 今の指定（★の数）と、指定できる最大（枠の数とフォーカスの残りの小さい方。「フォーカスを増やす」が押せなくなる数）
      data-focus-spend={selection.focus}
      data-focus-max={max}
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
          data-card-go
          className={`btn ${needsTarget ? 'btn-dark' : 'btn-gold'} flex h-12 w-[112px] shrink-0 flex-col items-center justify-center rounded-xl leading-5`}
        >
          <span className="font-display text-[19px]">発動</span>
          <span className="text-[12px] leading-4 font-bold">{needsTarget ? (card.target === 'enemy' ? '敵をタップ' : '味方をタップ') : selection.focus ? `★${selection.focus} 確定` : '運に任せる'}</span>
        </button>
      </div>

      {needsCardTarget(card) && <div className="mt-1 text-center text-[12px] text-sky-100" data-target-guide>{targetGuide(card)}{selected && `（選択中：${nameOf(selected)}）`}</div>}
      {card.target === 'enemy' && <TargetChips allyId={ally.id} cardUid={inst.uid} focus={selection.focus} tier={likelyTier} tierLabel={label(likelyTier)} targetId={selection.targetId} allyTargetId={selection.allyTargetId} />}
      {hints.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-0.5" data-counter-hints>
          {hints.map((h, i) => (
            <div key={i} className={`max-w-full rounded-md bg-black/55 px-2 text-center text-[14px] leading-5 font-black ${h.kind !== 'status' ? '[overflow-wrap:anywhere] [word-break:keep-all]' : ''}`} style={{ color: h.color, boxShadow: `0 0 0 1px ${h.color}` }} data-counter-hint={h.kind}>{h.icon && ELEMENT_ICONS[h.icon] ? (() => { const I = ELEMENT_ICONS[h.icon!]; return <I size={14} strokeWidth={2.8} className="mr-0.5 inline align-[-2px]" />; })() : null}{h.text}</div>
          ))}
        </div>
      )}
      {isAllyCard(card) && !card.secondaryTarget && <AllyTargetChips allyId={ally.id} candidates={cardTargets(battle, ally, card).map(unitIdOf)} chosen={selection.targetId} />}
      {card.secondaryTarget && <div className="text-center text-[12px] text-sky-100" data-secondary-target-guide>回復・支援する味方をタップしてください{secondary && `（選択中：${nameOf(secondary)}）`}</div>}
      {card.secondaryTarget && <AllyTargetChips allyId={ally.id} candidates={cardTargets(battle, ally, secondaryCard(card)).map(unitIdOf)} chosen={selection.allyTargetId} />}
      {(ally.slotPreviewUsed ?? 0) < slotPreviewLimitOf(ally) && <button onClick={preview} disabled={needsTarget} className="btn btn-dark mt-1 min-h-11 w-full rounded-lg text-[14px] font-bold" data-preview-start>星読みで結果を見る（この戦闘であと{slotPreviewLimitOf(ally) - (ally.slotPreviewUsed ?? 0)}回）</button>}

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
