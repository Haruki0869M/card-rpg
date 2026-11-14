// ===== 狙う敵のチップ（ステップB。敵を狙うカードを選んだ時、フォーカスパネルの中に出す） =====
// 生きている敵1体ごとに「名前・HP・次の行動のアイコン・予測（HP 45 → 12 / → 撃破！）」を1つのチップにする。
// チップを押しても、敵の絵を押しても、狙う敵が変わる（どちらも store の tapEnemy）。
// 予測の数字は、パネルの「予測」と同じ predictCardTotals の「HP減少」（ブロック差し引き後）を使う。
// 成功数ごとに値が違うので、チップには「一番出やすい成功数」の時の値を出す（同じ確率なら上の成功数）。
import { useMemo } from 'react';
import { predictCardTotals, rangeText, type PredictTotals } from '../../engine/battle/battle';
import { canBreak } from '../../engine/battle/effects';
import { unitName } from '../../engine/battle/units';
import { getElement } from '../../data/elements';
import { cardOf } from '../../data/cards';
import { useBattle } from '../../store/battleStore';
import type { BattleState, EnemyState } from '../../types';
import { elementGuide } from './elementGuide';
import { intentView, type IntentPart } from '../format';
import { EffectChip, ELEMENT_ICONS, Shield, Skull, statusStyle, Swords } from '../ui/icons';

/** 次の行動の小さいアイコン（最初の1つだけ。詳しくは敵の上の予告の枠） */
function MiniIntent({ p }: { p?: IntentPart }) {
  if (!p) return null;
  if (p.kind === 'attack' || p.kind === 'attackAll') {
    const el = p.element ? getElement(p.element) : undefined;
    const Icon = el ? (ELEMENT_ICONS[el.icon] ?? Swords) : p.kind === 'attackAll' ? Skull : Swords;
    return (
      <span className="flex shrink-0 items-center gap-px text-red-300 tabular-nums" style={el ? { color: el.color } : undefined}>
        <Icon size={12} strokeWidth={2.6} />
        {p.hidden ? '？' : p.hits > 1 ? `${p.damage}×${p.hits}` : p.damage}
      </span>
    );
  }
  if (p.kind === 'block') return <span className="flex shrink-0 items-center gap-px text-sky-300 tabular-nums"><Shield size={12} strokeWidth={2.6} />{p.hidden ? '？' : p.amount}</span>;
  // 闇の帳（区切り3a）: 特殊な効果の中身は見えない
  if (p.kind === 'veiled') return <span className="shrink-0 text-violet-200">✦？</span>;
  if (p.kind === 'debuff') {
    const st = statusStyle(p.status);
    return <span className="flex shrink-0 items-center" style={{ color: st.color }}><st.Icon size={12} strokeWidth={2.6} /></span>;
  }
  return <span className="shrink-0"><EffectChip e={p.effect} size={12} /></span>;
}

/** 予測の文字（HP 45 → 12 / HP 45 → 撃破！ / 幅がある時は → 撃破〜12） */
export function predictionText(enemy: EnemyState, loss: [number, number] | undefined): string {
  const hp = enemy.hp;
  if (!loss || loss[1] <= 0) return `HP ${hp}`;
  const after = (n: number) => Math.max(0, hp - n);
  if (after(loss[0]) === 0) return `HP ${hp} → 撃破！`;
  if (after(loss[1]) === 0) return `HP ${hp} → 撃破〜${after(loss[0])}`;
  return `HP ${hp} → ${rangeText([after(loss[1]), after(loss[0])])}`;
}

/**
 * チップの予測（一番出やすい段）と撃破バッジ（段階C）を、同じ計算の使い回しで出す（予測は重いので、同じ敵・段は1回だけ）。
 * 撃破バッジ: 今のフォーカスの数で確実に倒せる（全部外れても倒せる）= sure、完全成功なら倒せる = perfect。
 * 「確実」は、フォーカスの枠だけ成功した時に必ず届く一番上の段、「完全」は一番上の段の、少ない方の見込み（ブロック差し引き後のHP減少）で比べる
 */
export type KillBadge = 'sure' | 'perfect' | undefined;
function useChipPredictions(battle: BattleState, allyId: string, cardUid: string, focus: number, tier: number, allyTargetId?: string) {
  return useMemo(() => {
    const preds: Record<string, [number, number] | undefined> = {};
    const badges: Record<string, KillBadge> = {};
    // 大技の予告を崩せるか（BREAK）: now = 一番出やすい段で崩せる / perfect = 完全成功なら崩せる
    const breaks: Record<string, 'now' | 'perfect' | undefined> = {};
    // 区切り3b: 吹雪に隠れていて、このカードのダメージは外れる
    const missed: Record<string, boolean | undefined> = {};
    const ally = battle.allies.find((a) => a.id === allyId);
    const inst = ally?.hand.find((c) => c.uid === cardUid);
    const tiers = inst ? cardOf(inst).tiers.map((t) => t.minSuccesses) : [];
    let sure = -1;
    tiers.forEach((m, i) => { if (m <= focus) sure = i; });
    const top = tiers.length - 1;
    for (const e of battle.enemies) {
      if (e.dead) continue;
      const cache = new Map<number, PredictTotals | undefined>();
      const total = (t: number) => {
        if (!cache.has(t)) cache.set(t, predictCardTotals(battle, allyId, cardUid, e.uid, focus, t, allyTargetId).find((x) => x.id === e.uid));
        return cache.get(t);
      };
      const loss = (t: number) => total(t)?.hpLoss;
      if (canBreak(e)) breaks[e.uid] = total(tier)?.breaks ? 'now' : top >= 0 && total(top)?.breaks ? 'perfect' : undefined;
      preds[e.uid] = loss(tier);
      if (total(tier)?.missed) missed[e.uid] = true;
      const s = sure >= 0 ? loss(sure) : undefined;
      if (s && s[0] >= e.hp) badges[e.uid] = 'sure';
      else if (top >= 0 && (loss(top)?.[0] ?? 0) >= e.hp) badges[e.uid] = 'perfect';
    }
    return { preds, badges, breaks, missed };
  }, [battle, allyId, cardUid, focus, tier, allyTargetId]);
}

export function TargetChips({ allyId, cardUid, focus, tier, tierLabel, targetId, allyTargetId }: { allyId: string; cardUid: string; focus: number; tier: number; tierLabel: string; targetId?: string; allyTargetId?: string }) {
  const battle = useBattle((s) => s.battle);
  const tapEnemy = useBattle((s) => s.tapEnemy);
  const { preds, badges, breaks, missed } = useChipPredictions(battle, allyId, cardUid, focus, tier, allyTargetId);
  const ally = battle.allies.find((a) => a.id === allyId);
  const inst = ally?.hand.find((c) => c.uid === cardUid);
  const card = inst ? cardOf(inst) : undefined;
  const alive = battle.enemies.filter((e) => !e.dead);
  if (!alive.length) return null;
  return (
    <div className="mt-1" data-target-chips>
      <div className="text-center text-[12px] leading-4 text-zinc-400">狙う敵（予測は一番出やすい「{tierLabel}」の時）</div>
      <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${alive.length}, minmax(0,1fr))` }}>
        {alive.map((e) => {
          const on = e.uid === targetId;
          const text = predictionText(e, preds[e.uid]);
          const kill = text.includes('撃破！');
          // 弱点・耐性の案内（計画書 第2版 §5-1）。札の中は短い形だけ（長い文は札の下の1行）
          const guide = elementGuide(battle, ally, card, e);
          const el = guide?.element ? getElement(guide.element) : undefined;
          const WeakIcon = guide?.kind === 'weak' && el ? ELEMENT_ICONS[el.icon] : undefined;
          // 弱点なら札の縁を属性の色に（属性の無い「弱点を突いた扱い」は金色）
          const edge = guide?.kind === 'weak' ? (el?.color ?? '#fcd34d') : undefined;
          return (
            <button
              key={e.uid}
              onClick={(ev) => {
                ev.stopPropagation();
                tapEnemy(e.uid);
              }}
              aria-pressed={on}
              aria-label={`${unitName(battle, e.uid)}を狙う（${text}）`}
              data-target-chip={e.uid}
              data-chip-selected={on || undefined}
              data-chip-prediction={text}
              data-kill-badge={badges[e.uid]}
              data-break-chip={breaks[e.uid]}
              data-miss-chip={missed[e.uid] || undefined}
              data-weak-chip={guide?.kind === 'weak' ? (guide.element ?? 'any') : undefined}
              data-resist-chip={guide?.kind === 'resist' ? guide.element : undefined}
              className={`relative flex min-h-11 min-w-0 flex-col justify-center rounded-lg border px-1 py-0.5 text-left leading-4 ${on ? 'border-sky-300 bg-sky-900/60 ring-2 ring-sky-300' : 'border-zinc-600 bg-black/40'}`}
              style={edge ? { borderColor: edge, borderWidth: 2 } : undefined}
            >
              {badges[e.uid] && (
                <span
                  className={`absolute -top-2.5 right-0.5 rounded-full px-1 text-[12px] leading-4 font-black whitespace-nowrap shadow-[0_1px_3px_rgba(0,0,0,.8)] ${badges[e.uid] === 'sure' ? 'bg-gradient-to-b from-amber-200 to-amber-500 text-amber-950 ring-1 ring-amber-100' : 'bg-gradient-to-b from-sky-200 to-sky-400 text-sky-950 ring-1 ring-sky-100'}`}
                  title={badges[e.uid] === 'sure' ? '今のフォーカスで確実に倒せる' : '完全成功なら倒せる'}
                >
                  {badges[e.uid] === 'sure' ? '確実に撃破' : '完全で撃破'}
                </span>
              )}
              <span className="flex min-w-0 items-center gap-1 text-[12px]">
                <span className={`min-w-0 flex-1 truncate font-bold ${on ? 'text-sky-50' : 'text-zinc-200'}`}>{unitName(battle, e.uid)}</span>
                <MiniIntent p={intentView(battle, e)?.parts[0]} />
              </span>
              {/* 狭い時は「HP 45」と「→ 12」の間で折り返す（4体・360pxでも数字が切れないように） */}
              <span className={`flex flex-wrap gap-x-1 text-[12px] font-bold tabular-nums ${kill ? 'text-amber-300' : 'text-zinc-100'}`}>
                {text.split(' → ').map((t, i) => <span key={i} className="whitespace-nowrap">{i ? `→ ${t}` : t}</span>)}
              </span>
              {/* 大技の予告を出している敵: この攻撃で体勢を崩せるか（順番: 撃破 → BREAK → 弱点） */}
              {missed[e.uid] && <span className="text-[12px] font-black whitespace-nowrap text-sky-100">❄外れる</span>}
              {breaks[e.uid] && !kill && <span className="text-[12px] font-black whitespace-nowrap text-amber-300">{breaks[e.uid] === 'now' ? '⚡BREAK!' : '⚡完全でBREAK'}</span>}
              {guide?.kind === 'weak' && (
                <span className="truncate text-[12px] leading-4 font-black whitespace-nowrap" style={{ color: edge }} data-weak-guide>
                  {WeakIcon && <WeakIcon size={12} strokeWidth={2.8} className="mr-0.5 inline align-[-2px]" />}
                  {guide.chip}
                </span>
              )}
              {guide?.kind === 'resist' && <span className="truncate text-[12px] leading-4 font-bold whitespace-nowrap text-zinc-400" data-resist-guide>{guide.chip}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 回復・支援する味方のチップ（段階A）。操作パネルが味方の枠の上に重なるので、パネルの中でも相手を選べるようにする。
 * 押すと、味方の枠・立ち絵を押した時と同じ store の setActive（選択中のカードの相手を変える）
 */
export function AllyTargetChips({ allyId, candidates, chosen }: { allyId: string; candidates: string[]; chosen?: string }) {
  const allies = useBattle((s) => s.battle.allies);
  const setActive = useBattle((s) => s.setActive);
  const list = allies.filter((a) => candidates.includes(a.id));
  if (!list.length) return null;
  return (
    <div className="mt-1 grid gap-1" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0,1fr))` }} data-ally-target-chips={allyId}>
      {list.map((a) => {
        const on = a.id === chosen;
        const pct = a.maxHp ? Math.max(0, Math.min(100, (a.hp / a.maxHp) * 100)) : 0;
        return (
          <button
            key={a.id}
            onClick={(ev) => {
              ev.stopPropagation();
              setActive(a.id);
            }}
            aria-pressed={on}
            aria-label={`${a.name}を選ぶ（HP ${a.hp}/${a.maxHp}）`}
            data-ally-target-chip={a.id}
            data-chip-selected={on || undefined}
            className={`flex min-h-11 min-w-0 flex-col justify-center gap-0.5 rounded-lg border px-1 py-0.5 text-left leading-4 ${on ? 'border-sky-300 bg-sky-900/60 ring-2 ring-sky-300' : 'border-zinc-600 bg-black/40'}`}
          >
            <span className={`truncate text-[12px] font-bold ${on ? 'text-sky-50' : 'text-zinc-200'}`}>{a.name}</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/70">
                <span className="block h-full rounded-full bg-emerald-400" style={{ width: `${pct}%` }} />
              </span>
              <span className="text-[12px] font-bold text-zinc-100 tabular-nums">{a.dead ? '戦闘不能' : `${a.hp}/${a.maxHp}`}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
