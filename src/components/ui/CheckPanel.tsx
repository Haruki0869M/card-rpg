// ===== 能力値の判定（誰が挑むか・フォーカス・成功率）を選ぶ部品 =====
import { motion } from 'framer-motion';
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
}) {
  const hero = heroes.find((h) => h.id === heroId) ?? heroes[0];
  const chance = hero ? statChance(hero, stat, tag) : 0;
  const max = hero ? Math.min(slots, hero.focus) : 0;
  const p = Math.round(chanceAtLeast(slots, Math.min(focus, max), chance, need) * 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[12px] text-zinc-300">
        判定：<b className="text-amber-200">{STAT_LABEL[stat]}</b>・{slots}枠のうち{need}つ以上成功で{successLabel}
      </div>
      <div className="flex gap-1">
        {heroes.map((h) => {
          const c = statChance(h, stat, tag);
          const mine = isLocalPlayer(h.playerId);
          return (
            <button
              key={h.id}
              disabled={h.hp <= 0 || !mine}
              onClick={() => {
                setHeroId(h.id);
                setFocus(0);
              }}
              className={`btn flex min-w-0 flex-1 flex-col items-center rounded-lg border-2 py-1 ${h.id === hero?.id ? 'border-amber-300 bg-amber-500/15' : 'border-white/10 bg-black/30'}`}
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
