// ===== 戦闘の手ごたえの演出（段階B）: 技名の帯・命中のエフェクト・盾で弾く =====
// 見た目だけ。状態・乱数・同期には触れない。粒の置き方は決まった形（乱数を使わない）。
// 高速モードは時間を半分、動きを減らす（OS の設定・ゲームの「簡易」）では揺れ・広がりを抑えて、ふわっと出して消すだけ。
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Swords } from 'lucide-react';
import { memo, useEffect, useState, type CSSProperties } from 'react';
import { ItemImage } from '../../art';
import { TIMING } from '../../data/balance';
import { getCard } from '../../data/cards';
import { getElement } from '../../data/elements';
import { getEnemy } from '../../data/enemies';
import { WEAPON_TYPES } from '../../data/rules';
import { enemyName } from '../../engine';
import { cardElementOf } from '../../store/hitStyle';
import { speedFactor, useBattle, type ImpactFx } from '../../store/battleStore';
import type { EnemyActionDef } from '../../types';
import { CATEGORY_STYLE, ELEMENT_ICONS } from '../ui/icons';

/** 演出の速さと、動きを減らすか */
export function useFxPace() {
  const fast = useBattle((s) => s.settings.fastMode);
  const simple = useBattle((s) => s.settings.cutinMode === 'simple');
  const reduced = useReducedMotion();
  return { k: 1 / speedFactor({ fastMode: fast }), calm: !!reduced || simple };
}

/** id が変わったら、seconds 秒だけ true（同じ id では出し直さない） */
function useFlash(id: number | undefined, seconds: number): number | undefined {
  const [shown, setShown] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (id === undefined) return;
    setShown(id);
    const t = setTimeout(() => setShown((v) => (v === id ? undefined : v)), seconds * 1000);
    return () => clearTimeout(t);
  }, [id]);
  return shown;
}

// ---------- 技名の帯 ----------

/** 敵の技の属性（技の名前から探す。変身後の技も探す） */
function enemyActionElement(defId: string, name: string): string | undefined {
  const def = getEnemy(defId);
  const lists: EnemyActionDef[][] = [def.actions, ...((def.phases ?? []) as { actions?: EnemyActionDef[] }[]).map((p) => p.actions ?? [])];
  for (const list of lists) {
    const a = list.find((x) => x.name === name);
    if (!a) continue;
    for (const e of a.effects as { kind: string; element?: string }[]) if (e.element) return e.element;
    return undefined;
  }
  return undefined;
}

function CalloutIcon({ cardId, element, side }: { cardId?: string; element?: string; side: 'ally' | 'enemy' }) {
  const card = cardId ? getCard(cardId) : undefined;
  const wt = card?.weaponType ? WEAPON_TYPES.tryGet(card.weaponType) : undefined;
  const el = element ?? (card ? cardElementOf(card) : undefined);
  if (wt && !el) return <ItemImage icon={wt.icon} rarity="rare" className="h-[24px] w-[24px]" />;
  if (el) {
    const def = getElement(el);
    const Icon = ELEMENT_ICONS[def.icon] ?? Swords;
    return <Icon size={20} strokeWidth={2.6} style={{ color: def.color, filter: `drop-shadow(0 0 4px ${def.color})` }} />;
  }
  if (card) {
    const cat = CATEGORY_STYLE[card.category];
    return <cat.Icon size={20} strokeWidth={2.6} style={{ color: cat.glow }} />;
  }
  return <Swords size={20} strokeWidth={2.6} className={side === 'enemy' ? 'text-red-300' : 'text-amber-200'} />;
}

/** 戦場の上の方に、技名をシャープな飾り帯で約0.5秒出す（味方 = 紺と金、敵 = 赤。敵は「敵名：技名」） */
export function CalloutBand({ top }: { top: number }) {
  const callout = useBattle((s) => s.callout);
  const enemies = useBattle((s) => s.battle.enemies);
  const { k, calm } = useFxPace();
  const dur = TIMING.callout * k;
  const shown = useFlash(callout?.id, dur);
  if (!callout || shown !== callout.id) return null;
  const enemy = callout.side === 'enemy' ? enemies.find((e) => e.uid === callout.actorId) : undefined;
  const card = callout.cardId ? getCard(callout.cardId) : undefined;
  const text = callout.side === 'enemy' ? `${enemy ? enemyName(enemy) : '敵'}：${callout.actionName ?? ''}` : card?.name ?? '';
  const element = enemy && callout.actionName ? enemyActionElement(enemy.defId, callout.actionName) : undefined;
  const ally = callout.side === 'ally';
  return (
    <div className="pointer-events-none absolute inset-x-0 z-[28] flex justify-center px-3" style={{ top }}>
      <motion.div
        key={callout.id}
        initial={calm ? { opacity: 0 } : { opacity: 0, x: ally ? -36 : 36, scaleX: 0.7 }}
        animate={calm ? { opacity: [0, 1, 1, 0] } : { opacity: [0, 1, 1, 0], x: [ally ? -36 : 36, 0, 0, 0], scaleX: [0.7, 1, 1, 1] }}
        transition={{ duration: dur, times: [0, 0.16, 0.8, 1], ease: 'easeOut' }}
        className={`callout-band relative flex max-w-full min-w-[60%] items-center justify-center gap-1.5 px-6 py-[3px] ${ally ? 'callout-ally' : 'callout-enemy'}`}
        data-callout={callout.side}
        data-callout-text={text}
      >
        <span className="callout-gem flex h-[26px] w-[26px] shrink-0 items-center justify-center">
          <CalloutIcon cardId={callout.cardId} element={element} side={callout.side} />
        </span>
        <span className={`font-display text-outline truncate text-[17px] leading-6 tracking-[0.12em] ${ally ? 'text-amber-50' : 'text-red-50'}`}>{text}</span>
        {!calm && <span className="callout-sheen" style={{ animationDuration: `${dur}s` }} />}
      </motion.div>
    </div>
  );
}

// ---------- 命中のエフェクト ----------

const SPARK_ANGLES = [18, 62, 108, 152, 200, 244, 290, 334];
const MOTE_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30);

function Sparks({ color, dur, reach = 34 }: { color: string; dur: number; reach?: number }) {
  return (
    <>
      {SPARK_ANGLES.map((a, i) => (
        <span key={a} className="fx-spark" style={{ ['--a' as string]: `${a}deg`, ['--reach' as string]: `${reach + (i % 2) * 10}px`, ['--d' as string]: `${dur}s`, background: `linear-gradient(#fff, ${color})` } as CSSProperties} />
      ))}
    </>
  );
}

function Motes({ color, dur }: { color: string; dur: number }) {
  return (
    <>
      {MOTE_ANGLES.map((a, i) => (
        <span key={a} className="fx-mote" style={{ ['--a' as string]: `${a}deg`, ['--reach' as string]: `${i % 2 ? 26 : 38}px`, ['--d' as string]: `${dur}s`, background: color, boxShadow: `0 0 6px 2px ${color}` } as CSSProperties} />
      ))}
    </>
  );
}

function ImpactShape({ fx, dur, calm }: { fx: ImpactFx; dur: number; calm: boolean }) {
  const gold = '#ffd76a';
  switch (fx.style) {
    case 'slash':
      return (
        <>
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
            <defs>
              <linearGradient id={`sl${fx.id}`} x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#fff" stopOpacity="0" />
                <stop offset="0.45" stopColor="#fff" />
                <stop offset="1" stopColor={fx.color ?? gold} />
              </linearGradient>
            </defs>
            <motion.path d="M12 84 Q 46 58 90 12" fill="none" stroke={`url(#sl${fx.id})`} strokeWidth="10" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 5px rgba(255,236,170,.95))' }}
              initial={{ pathLength: calm ? 1 : 0, opacity: 1 }} animate={{ pathLength: 1, opacity: [1, 1, 0] }} transition={{ duration: dur, times: [0, 0.45, 1] }} />
            <motion.path d="M22 92 Q 54 66 94 26" fill="none" stroke="#fff6d2" strokeWidth="2.5" strokeLinecap="round"
              initial={{ pathLength: calm ? 1 : 0, opacity: 0.9 }} animate={{ pathLength: 1, opacity: [0.9, 0.9, 0] }} transition={{ duration: dur * 0.9, delay: dur * 0.05, times: [0, 0.4, 1] }} />
          </svg>
          {!calm && <Sparks color={fx.color ?? gold} dur={dur} />}
        </>
      );
    case 'enemy':
      return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
          {[0, 1, 2].map((i) => (
            <motion.path key={i} d={`M${24 + i * 16} 20 Q ${34 + i * 16} 50 ${30 + i * 16} 82`} fill="none" stroke="#ff5a4a" strokeWidth="5" strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 4px rgba(255,60,40,.9))' }}
              initial={{ pathLength: calm ? 1 : 0, opacity: 1 }} animate={{ pathLength: 1, opacity: [1, 1, 0] }} transition={{ duration: dur, delay: i * 0.03, times: [0, 0.4, 1] }} />
          ))}
        </svg>
      );
    case 'impact':
      return (
        <>
          <span className="fx-ring" style={{ ['--d' as string]: `${dur}s`, borderColor: fx.color ?? '#fff3c4' } as CSSProperties} />
          <span className="fx-ring" style={{ ['--d' as string]: `${dur}s`, animationDelay: `${dur * 0.18}s`, borderColor: fx.color ?? gold, borderWidth: 2 } as CSSProperties} />
          {!calm && <Sparks color={fx.color ?? gold} dur={dur * 0.8} reach={26} />}
        </>
      );
    case 'shot':
      return (
        <>
          <span className="fx-shot" style={{ ['--d' as string]: `${dur * 0.5}s`, background: `linear-gradient(to top, transparent, ${fx.color ?? '#fff3c4'})` } as CSSProperties} />
          <span className="fx-ring fx-ring-small" style={{ ['--d' as string]: `${dur * 0.6}s`, animationDelay: `${dur * 0.4}s`, borderColor: fx.color ?? '#fff3c4' } as CSSProperties} />
        </>
      );
    case 'magic': {
      const c = fx.color ?? '#c9a8ff';
      return (
        <>
          <motion.svg viewBox="0 0 100 100" className="absolute inset-[6%] overflow-visible"
            initial={calm ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: 0 }} animate={calm ? { opacity: [0, 1, 0] } : { opacity: [0, 1, 0], scale: [0.4, 1.05, 1.15], rotate: [0, 60, 90] }}
            transition={{ duration: dur, times: [0, 0.35, 1] }}>
            <circle cx="50" cy="50" r="44" fill="none" stroke={c} strokeWidth="2.5" style={{ filter: `drop-shadow(0 0 4px ${c})` }} />
            <circle cx="50" cy="50" r="34" fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="5 4" />
            <polygon points="50,10 85,70 15,70" fill="none" stroke={c} strokeWidth="1.5" />
            <polygon points="50,90 15,30 85,30" fill="none" stroke={c} strokeWidth="1.5" />
          </motion.svg>
          {!calm && <Motes color={c} dur={dur} />}
        </>
      );
    }
    case 'barrier':
      return (
        <motion.svg viewBox="0 0 100 100" className="absolute inset-[4%] overflow-visible"
          initial={{ opacity: 0, scale: calm ? 1 : 0.8 }} animate={{ opacity: [0, 0.95, 0], scale: calm ? 1 : [0.8, 1.04, 1] }} transition={{ duration: dur, times: [0, 0.3, 1] }}>
          <polygon points="50,4 90,27 90,73 50,96 10,73 10,27" fill="rgba(90,170,255,.22)" stroke="#9ad4ff" strokeWidth="3" style={{ filter: 'drop-shadow(0 0 6px rgba(90,170,255,.9))' }} />
          <polygon points="50,18 78,34 78,66 50,82 22,66 22,34" fill="none" stroke="#cfe9ff" strokeWidth="1.2" opacity=".7" />
        </motion.svg>
      );
    case 'heal':
    case 'buff': {
      const c = fx.style === 'heal' ? '#5af2a8' : '#ffd76a';
      return (
        <>
          <span className="fx-pillar" style={{ ['--d' as string]: `${dur}s`, background: `linear-gradient(to top, ${c}cc, ${c}44 60%, transparent)` } as CSSProperties} />
          {!calm && [0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="fx-rise" style={{ left: `${22 + i * 11}%`, ['--d' as string]: `${dur}s`, animationDelay: `${(i % 3) * dur * 0.12}s`, background: c, boxShadow: `0 0 5px 1px ${c}` } as CSSProperties} />
          ))}
        </>
      );
    }
  }
}

/** ユニットの上の命中のエフェクト（受けたユニットの絵の箱に重ねる） */
export const ImpactLayer = memo(function ImpactLayer({ unitId }: { unitId: string }) {
  const fx = useBattle((s) => s.impactFx[unitId]);
  const { k, calm } = useFxPace();
  const dur = TIMING.impactFx * k;
  const shown = useFlash(fx?.id, dur + 0.05);
  if (!fx || shown !== fx.id) return null;
  return (
    <div key={fx.id} className="pointer-events-none absolute inset-0 z-[25]" style={fx.big && !calm ? { transform: 'scale(1.35)' } : undefined} data-impact={fx.style} data-impact-unit={unitId}>
      <ImpactShape fx={fx} dur={dur} calm={calm} />
    </div>
  );
});

/** 敵の攻撃を味方のブロックで防いだ: 味方の前に青い盾が出て「ブロック！」と弾く */
export const GuardLayer = memo(function GuardLayer({ unitId }: { unitId: string }) {
  const fx = useBattle((s) => s.guardFx[unitId]);
  const { k, calm } = useFxPace();
  const dur = TIMING.guardFx * k;
  const shown = useFlash(fx?.id, dur);
  return (
    <AnimatePresence>
      {fx && shown === fx.id && (
        <motion.div
          key={fx.id}
          className="pointer-events-none absolute inset-x-0 top-[22%] z-[26] flex flex-col items-center"
          initial={calm ? { opacity: 0 } : { opacity: 0, scale: 0.5, y: 10 }}
          animate={calm ? { opacity: [0, 1, 1, 0] } : { opacity: [0, 1, 1, 0], scale: [0.5, 1.15, 1, 1], y: [10, -6, 0, 0] }}
          exit={{ opacity: 0, transition: { duration: 0 } }}
          transition={{ duration: dur, times: [0, 0.25, 0.75, 1] }}
          data-guard={unitId}
        >
          <span className="font-display text-outline text-[16px] leading-5 text-sky-100" style={{ textShadow: '0 0 6px rgba(90,170,255,.95), 0 1px 2px #000' }}>ブロック！</span>
          <svg viewBox="0 0 60 70" className="h-[46px] w-[40px] overflow-visible" style={{ filter: 'drop-shadow(0 0 8px rgba(90,170,255,.95))' }}>
            <path d="M30 3 L56 13 L52 42 Q 46 58 30 67 Q 14 58 8 42 L4 13 Z" fill="rgba(40,110,210,.75)" stroke="#cfe9ff" strokeWidth="3" />
            <path d="M30 14 L30 56 M14 24 L46 24" stroke="#e8f4ff" strokeWidth="3" strokeLinecap="round" />
          </svg>
          {!calm && <Sparks color="#9ad4ff" dur={dur * 0.7} reach={30} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
});
