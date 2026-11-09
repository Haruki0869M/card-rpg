// ===== 狙う敵のチップ（ステップB。敵を狙うカードを選んだ時、フォーカスパネルの中に出す） =====
// 生きている敵1体ごとに「名前・HP・次の行動のアイコン・予測（HP 45 → 12 / → 撃破！）」を1つのチップにする。
// チップを押しても、敵の絵を押しても、狙う敵が変わる（どちらも store の tapEnemy）。
// 予測の数字は、パネルの「予測」と同じ predictCardTotals の「HP減少」（ブロック差し引き後）を使う。
// 成功数ごとに値が違うので、チップには「一番出やすい成功数」の時の値を出す（同じ確率なら上の成功数）。
import { useMemo } from 'react';
import { predictCardTotals, rangeText } from '../../engine/battle/battle';
import { unitName } from '../../engine/battle/units';
import { getElement } from '../../data/elements';
import { useBattle } from '../../store/battleStore';
import type { BattleState, EnemyState } from '../../types';
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
        {p.hits > 1 ? `${p.damage}×${p.hits}` : p.damage}
      </span>
    );
  }
  if (p.kind === 'block') return <span className="flex shrink-0 items-center gap-px text-sky-300 tabular-nums"><Shield size={12} strokeWidth={2.6} />{p.amount}</span>;
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

function useChipPredictions(battle: BattleState, allyId: string, cardUid: string, focus: number, tier: number, allyTargetId?: string) {
  return useMemo(() => {
    const out: Record<string, [number, number] | undefined> = {};
    for (const e of battle.enemies) {
      if (e.dead) continue;
      const totals = predictCardTotals(battle, allyId, cardUid, e.uid, focus, tier, allyTargetId);
      out[e.uid] = totals.find((t) => t.id === e.uid)?.hpLoss;
    }
    return out;
  }, [battle, allyId, cardUid, focus, tier, allyTargetId]);
}

export function TargetChips({ allyId, cardUid, focus, tier, tierLabel, targetId, allyTargetId }: { allyId: string; cardUid: string; focus: number; tier: number; tierLabel: string; targetId?: string; allyTargetId?: string }) {
  const battle = useBattle((s) => s.battle);
  const tapEnemy = useBattle((s) => s.tapEnemy);
  const preds = useChipPredictions(battle, allyId, cardUid, focus, tier, allyTargetId);
  const alive = battle.enemies.filter((e) => !e.dead);
  if (!alive.length) return null;
  return (
    <div className="mt-1" data-target-chips>
      <div className="text-center text-[12px] leading-4 text-zinc-400">狙う敵（予測は一番出やすい「{tierLabel}」の時）</div>
      <div className="mt-0.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${alive.length}, minmax(0,1fr))` }}>
        {alive.map((e) => {
          const on = e.uid === targetId;
          const text = predictionText(e, preds[e.uid]);
          const kill = text.includes('撃破！');
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
              className={`flex min-h-11 min-w-0 flex-col justify-center rounded-lg border px-1 py-0.5 text-left leading-4 ${on ? 'border-sky-300 bg-sky-900/60 ring-2 ring-sky-300' : 'border-zinc-600 bg-black/40'}`}
            >
              <span className="flex min-w-0 items-center gap-1 text-[12px]">
                <span className={`min-w-0 flex-1 truncate font-bold ${on ? 'text-sky-50' : 'text-zinc-200'}`}>{unitName(battle, e.uid)}</span>
                <MiniIntent p={intentView(battle, e)?.parts[0]} />
              </span>
              {/* 狭い時は「HP 45」と「→ 12」の間で折り返す（4体・360pxでも数字が切れないように） */}
              <span className={`flex flex-wrap gap-x-1 text-[12px] font-bold tabular-nums ${kill ? 'text-amber-300' : 'text-zinc-100'}`}>
                {text.split(' → ').map((t, i) => <span key={i} className="whitespace-nowrap">{i ? `→ ${t}` : t}</span>)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
