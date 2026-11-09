// ===== 能力値の判定（誰が挑むか・フォーカス・成功率）を選ぶ部品 =====
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { TIMING } from '../../data/balance';
import { useBattle } from '../../store/battleStore';
import { Check, Minus, Plus, Star, X } from 'lucide-react';
import { successDistribution, statChance } from '../../engine';
import { isLocalPlayer } from '../../store/battleConfig';
import type { Hero, SlotResult, StatId } from '../../types';
import { HeroFace, STAT_LABEL } from './game';

/** need 個以上成功する確率 */
export function chanceAtLeast(slots: number, focus: number, chance: number, need: number): number {
  const d = successDistribution(slots, focus, chance);
  return d.slice(need).reduce((a, b) => a + b, 0);
}

export function CheckPanel({
  heroes,
  heroId,
  setHeroId,
  focus,
  setFocus,
  stat,
  tag,
  slots,
  need,
  successLabel,
  bonusOnly,
  event,
}: {
  heroes: Hero[];
  heroId: string;
  setHeroId: (id: string) => void;
  focus: number;
  setFocus: (n: number) => void;
  stat: StatId;
  tag?: string;
  slots: number;
  need: number;
  successLabel: string;
  /** 失敗しても損の無い判定（成功率を「〜の確率」と中立の色で出す） */
  bonusOnly?: boolean;
  /** イベントの判定（お供の上乗せが入る） */
  event?: boolean;
}) {
  const hero = heroes.find((h) => h.id === heroId) ?? heroes[0];
  const chance = hero ? statChance(hero, stat, tag, event) : 0;
  const max = hero ? Math.min(slots, hero.focus) : 0;
  const p = Math.round(chanceAtLeast(slots, Math.min(focus, max), chance, need) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[12px] text-zinc-300">
        判定：<b className="text-amber-200">{STAT_LABEL[stat]}</b>・{slots}枠のうち{need}つ以上成功で{successLabel}
      </div>
      <div className="flex gap-1">
        {heroes.map((h) => {
          const c = statChance(h, stat, tag, event);
          const mine = isLocalPlayer(h.playerId);
          return (
            <button
              key={h.id}
              disabled={h.hp <= 0 || !mine}
              onClick={() => {
                setHeroId(h.id);
                setFocus(0);
              }}
              className={`btn flex min-w-0 flex-1 flex-col items-center rounded-lg border-2 py-1 ${h.id === hero?.id ? 'sel-on' : 'border-white/10 bg-black/30'}`}
            >
              <HeroFace hero={h} size={30} dim={h.hp <= 0} />
              <span className="text-[12px] font-bold tabular-nums">{c}%</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => setFocus(Math.max(0, focus - 1))} disabled={focus <= 0} aria-label="フォーカスを減らす" className="btn btn-dark flex h-11 w-12 items-center justify-center rounded-lg">
          <Minus size={20} />
        </button>
        <div className="flex flex-1 items-center justify-center gap-1">
          {Array.from({ length: slots }, (_, i) => (
            <span
              key={i}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2"
              style={
                i < focus
                  ? { background: 'radial-gradient(circle,#fff3c4,#f2c24a 50%,#8a5a0a)', borderColor: '#fff3c4' }
                  : { background: '#1a1420', borderColor: i < max ? '#6a5a40' : '#2a2430' }
              }
            >
              <Star size={18} className={i < focus ? 'fill-amber-100 text-amber-900' : 'text-amber-200/30'} />
            </span>
          ))}
        </div>
        <button onClick={() => setFocus(Math.min(max, focus + 1))} disabled={focus >= max} aria-label="フォーカスを増やす" className="btn btn-dark flex h-11 w-12 items-center justify-center rounded-lg">
          <Plus size={20} />
        </button>
      </div>
      <div className="text-center text-[13px]">
        {bonusOnly ? `${successLabel}の確率` : '成功率'}{' '}
        <b className={bonusOnly ? 'text-amber-200' : p >= 80 ? 'text-emerald-300' : p >= 50 ? 'text-amber-200' : 'text-red-300'}>{p}%</b>
        <span className="text-zinc-400">
          （フォーカス {hero?.focus ?? 0} → {(hero?.focus ?? 0) - focus}）
        </span>
      </div>
    </div>
  );
}

/** もう回した判定（画面を作り直しても、同じ判定をもう一度回さない） */
const spunRolls = new Set<string>();

/** 画面を開いた時の判定の鍵を覚えておき、その後に新しい判定が出た時だけ「新しい」とする */
export function useFreshRoll(key: string | undefined): boolean {
  const atMount = useRef(key);
  return key !== undefined && key !== atMount.current;
}

/**
 * 判定の結果を「くるくる回してから止める」見た目（フェーズ2-D。世界マップの移動力・ダンジョンの探索力の判定）。
 * 結果は押した時にもう決まっている。見た目だけで、状態・乱数・同期は待たせない。
 * spin が真の間（押した直後だけ）回す。高速モード・動きを減らす設定・簡易の演出の時は回さない。
 */
export function SpinRollStrip({ results, spinKey, fresh, small }: { results: SlotResult[]; /** この判定を表す鍵（同じ判定は2回回さない） */ spinKey: string; /** 画面を開いた後に新しく判定した時だけ真 */ fresh: boolean; small?: boolean }) {
  const reduced = useReducedMotion();
  const quick = useBattle((s) => s.settings.fastMode || s.settings.cutinMode === 'simple');
  const [doSpin] = useState(() => {
    const ok = fresh && !reduced && !quick && !spunRolls.has(spinKey);
    spunRolls.add(spinKey);
    return ok;
  });
  const [spinning, setSpinning] = useState(doSpin);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!doSpin) return;
    const iv = setInterval(() => setTick((t) => t + 1), 70);
    const done = setTimeout(() => setSpinning(false), TIMING.rollSpin * 1000);
    return () => {
      clearInterval(iv);
      clearTimeout(done);
    };
  }, [doSpin]);
  if (!spinning) return <RollStrip results={results} small={small} />;
  const size = small ? 'h-7 w-7' : 'h-10 w-10';
  const icon = small ? 15 : 20;
  return (
    <div className="flex justify-center gap-1" data-roll-spinning>
      {results.map((_, i) => {
        const hit = (tick + i) % 2 === 0;
        return (
          <span key={i} className={`flex ${size} items-center justify-center rounded-full border-2 border-white/40 bg-[#2a2630] text-zinc-200`} style={{ transform: `rotate(${(tick * 70 + i * 40) % 360}deg)` }}>
            {hit ? <Check size={icon} strokeWidth={3} /> : <X size={icon} strokeWidth={3} />}
          </span>
        );
      })}
    </div>
  );
}

/**
 * 判定の結果の表示（左から順に出る）。
 * neutral: 失敗しても損が無い判定（宝箱の格上げなど）。失敗の枠を赤ではなく灰色で控えめに出す
 */
export function RollStrip({ results, neutral, small }: { results: SlotResult[]; neutral?: boolean; small?: boolean }) {
  const size = small ? 'h-7 w-7' : 'h-10 w-10';
  const icon = small ? 15 : 20;
  return (
    <div className="flex justify-center gap-1">
      {results.map((r, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, scale: 1.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05, duration: 0.06 }}
          className={`flex ${size} items-center justify-center rounded-full border-2`}
          style={
            r === 'focus'
              ? { background: 'linear-gradient(180deg,#ffe9a8,#e2a72a)', borderColor: '#fff3c4', color: '#5a3a06' }
              : r === 'hit'
                ? { background: 'linear-gradient(180deg,#5af2a8,#138a50)', borderColor: '#b8ffd8', color: '#06301a' }
                : neutral
                  ? { background: 'linear-gradient(180deg,#3a3640,#1e1c22)', borderColor: '#6a6670', color: '#9a96a0' }
                  : { background: 'linear-gradient(180deg,#5a2430,#2a0c12)', borderColor: '#ff7a8a', color: '#ff9aa8' }
          }
        >
          {r === 'focus' ? <Star size={icon} /> : r === 'hit' ? <Check size={icon} strokeWidth={3} /> : <X size={icon} strokeWidth={3} />}
        </motion.span>
      ))}
    </div>
  );
}
