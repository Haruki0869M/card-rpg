// ===== 戦闘の手ごたえの演出（段階B）: 技名の帯・命中のエフェクト・盾で弾く =====
// 見た目だけ。状態・乱数・同期には触れない。粒の置き方は決まった形（乱数を使わない）。
// 高速モードは時間を半分、動きを減らす（OS の設定・ゲームの「簡易」）では火花と揺れを止める（斬撃の線・魔法陣・白い層は出す。段階4）。
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Swords } from 'lucide-react';
import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { EnemyArt, ItemImage } from '../../art';
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
import { BATTLE_LAYER } from '../ui/layers';

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
  const lists: EnemyActionDef[][] = [def.actions, ...([...(def.phases ?? []), ...(def.midbossPhases ?? [])] as { actions?: EnemyActionDef[] }[]).map((p) => p.actions ?? [])];
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
    <div className="pointer-events-none absolute inset-x-0 flex justify-center px-3" style={{ top, zIndex: BATTLE_LAYER.callout }} data-callout-layer>
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

/** 戦場の中での、ユニットの絵の箱の位置（px） */
export type UnitRect = { id: string; x: number; y: number; w: number; h: number };

/**
 * 命中のエフェクト（段階4）: 敵の立ち絵の外（戦場の直下の専用の層）に、受けたユニットの絵の箱の位置で出す。
 * 倒れる敵の絵と一緒に薄くならない・スロットの板などの重なり順に左右されないように
 */
const ImpactLayer = memo(function ImpactLayer({ rect }: { rect: UnitRect }) {
  const fx = useBattle((s) => s.impactFx[rect.id]);
  const { k, calm } = useFxPace();
  const dur = TIMING.impactFx * k;
  const shown = useFlash(fx?.id, dur + 0.05);
  if (!fx || shown !== fx.id) return null;
  return (
    <div
      key={fx.id}
      className="pointer-events-none absolute"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, ...(fx.big && !calm ? { transform: 'scale(1.35)' } : {}) }}
      data-impact={fx.style}
      data-impact-unit={rect.id}
    >
      <ImpactShape fx={fx} dur={dur} calm={calm} />
    </div>
  );
});

/**
 * 被弾の白いフラッシュ（段階4）: 絵に filter: brightness をかけるのをやめ、白い半透明の層を重ねて消す（端末の GPU との相性の問題を避ける）。
 * 動きを減らす設定（OS・ゲームの「簡易」）の時も出す（最低限の形として残す）
 */
const HitFlash = memo(function HitFlash({ rect }: { rect: UnitRect }) {
  const fx = useBattle((s) => s.unitFx[rect.id]);
  const { k } = useFxPace();
  const dur = TIMING.hitFlash * 2 * k;
  const hit = fx?.kind === 'hit' ? fx.id : undefined;
  const shown = useFlash(hit, dur + 0.05);
  if (hit === undefined || shown !== hit) return null;
  return (
    <span
      key={hit}
      className="fx-hit-flash"
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, ['--d' as string]: `${dur}s` } as CSSProperties}
      data-hit-flash={rect.id}
    />
  );
});

/** 戦場の直下の、命中のエフェクトと白いフラッシュの専用の層（z-35） */
export function ImpactField({ rects }: { rects: UnitRect[] }) {
  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: BATTLE_LAYER.impact }} data-impact-field>
      {rects.map((r) => (
        <HitFlash key={`f${r.id}`} rect={r} />
      ))}
      {rects.map((r) => (
        <ImpactLayer key={`i${r.id}`} rect={r} />
      ))}
    </div>
  );
}

// ---------- 敵が倒れた演出（回2） ----------

/** 破片の飛ぶ向き（度）と大きさ（px）。決まった形（乱数は使わない） */
const SHARDS = [
  { a: 12, r: 1, s: 14 }, { a: 48, r: 0.8, s: 10 }, { a: 84, r: 1.1, s: 16 }, { a: 118, r: 0.85, s: 11 },
  { a: 152, r: 1, s: 13 }, { a: 190, r: 0.75, s: 10 }, { a: 226, r: 1.05, s: 15 }, { a: 262, r: 0.9, s: 12 },
  { a: 298, r: 1, s: 14 }, { a: 334, r: 0.8, s: 10 },
];
const SHARDS_BOSS = [...SHARDS, { a: 30, r: 1.25, s: 12 }, { a: 136, r: 1.3, s: 12 }, { a: 208, r: 1.25, s: 13 }, { a: 316, r: 1.3, s: 12 }];
/** 破片の形（三角・四角の欠け） */
const SHARD_SHAPES = ['polygon(50% 0, 100% 100%, 0 80%)', 'polygon(0 0, 100% 30%, 60% 100%)', 'polygon(20% 0, 100% 50%, 30% 100%, 0 40%)'];

type DeathItem = { key: number; rect: UnitRect; defId: string; phase?: number; boss: boolean; dur: number; lead: number; calm: boolean };

/**
 * 敵が倒れた演出: 白く光る → 赤黒く光って砕けて散る（破片・少し揺れる）→ 消える。
 * とどめのコマ（store の deathFx）で始める（命中の演出の後に見える）。絵の写しをこの層に描くので、
 * 「仲間を呼ぶ」で倒れた敵の枠が外れても、演出は最後まで続く。
 * 動きを減らす設定（OS・ゲームの「簡易」）では、白く光って消えるだけ（破片と揺れは出さない）
 */
export function DeathField({ rects, enemies, bossLike }: { rects: UnitRect[]; enemies: { uid: string; defId: string; phase?: number }[]; bossLike: (uid: string) => boolean }) {
  const deathFx = useBattle((s) => s.deathFx);
  const { k, calm } = useFxPace();
  const [list, setList] = useState<DeathItem[]>([]);
  // 出し始める前からあった合図（戦場を出し直した時など）は、もう一度は出さない
  const seen = useRef<Set<number>>(null as unknown as Set<number>);
  if (!seen.current) seen.current = new Set(Object.values(useBattle.getState().deathFx).map((x) => x.id));
  const latest = useRef({ rects, enemies, bossLike, k, calm });
  latest.current = { rects, enemies, bossLike, k, calm };
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    const add: DeathItem[] = [];
    const now = latest.current;
    for (const [uid, fx] of Object.entries(deathFx)) {
      if (seen.current.has(fx.id)) continue;
      seen.current.add(fx.id);
      const rect = now.rects.find((r) => r.id === uid);
      const e = now.enemies.find((x) => x.uid === uid);
      if (!rect || !e) continue;
      const boss = now.bossLike(uid);
      const dur = (boss ? TIMING.enemyDeathBoss : TIMING.enemyDeath) * now.k;
      const lead = TIMING.enemyDeathLead * now.k;
      add.push({ key: fx.id, rect, defId: e.defId, phase: e.phase, boss, dur, lead, calm: now.calm });
      timers.current.push(setTimeout(() => setList((l) => l.filter((x) => x.key !== fx.id)), (lead + dur + 0.05) * 1000));
    }
    if (add.length) setList((l) => [...l, ...add]);
  }, [deathFx]);
  if (!list.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: BATTLE_LAYER.death }} data-death-field>
      {list.map((d) => (
        <DeathBurst key={d.key} d={d} />
      ))}
    </div>
  );
}

function DeathBurst({ d }: { d: DeathItem }) {
  const { rect, dur, lead, calm, boss } = d;
  const shards = boss ? SHARDS_BOSS : SHARDS;
  const reach = Math.max(36, rect.w * (boss ? 0.75 : 0.6));
  const grow = boss ? 1.4 : 1;
  return (
    <div
      className={`death-burst ${calm ? 'death-calm' : ''}`}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, ['--d' as string]: `${dur}s`, ['--lead' as string]: `${lead}s` } as CSSProperties}
      data-death={d.key}
      data-death-boss={boss || undefined}
      data-death-calm={calm || undefined}
    >
      {/* 絵の写し（揺れて、少しふくらんでから消える） */}
      <div className="death-ghost">
        <EnemyArt defId={d.defId} phase={d.phase} className="h-full w-full" />
      </div>
      <span className="death-white" />
      {!calm && <span className="death-red" />}
      {!calm &&
        shards.map((s, i) => (
          <span
            key={i}
            className="death-shard"
            style={{
              ['--a' as string]: `${s.a}deg`,
              ['--reach' as string]: `${Math.round(reach * s.r)}px`,
              ['--spin' as string]: `${(i % 2 ? 1 : -1) * (120 + i * 25)}deg`,
              width: Math.round(s.s * grow),
              height: Math.round(s.s * grow),
              clipPath: SHARD_SHAPES[i % SHARD_SHAPES.length],
            } as CSSProperties}
          />
        ))}
    </div>
  );
}

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
