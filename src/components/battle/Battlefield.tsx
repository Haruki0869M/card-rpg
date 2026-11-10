// ===== 戦場（画面上半分） =====
// 背景の上に、敵（上段）と味方（下段）が向かい合う。動きの演出はラッパー要素の transform だけで行う。

import { motion, useAnimate, useReducedMotion } from 'framer-motion';
import { memo, useEffect, useMemo, type ReactNode } from 'react';
import type React from 'react';
import { BattleBackground, CharacterArt, EnemyArt, preloadEnemyPhases } from '../../art';
import { getPet } from '../../data/pets';
import { PetToken } from '../ui/PetToken';
import { TIMING } from '../../data/balance';
import { PLAYER_COLOR } from '../../data/theme';
import { cardOf } from '../../data/cards';
import { getEnemy, getEnemyAction } from '../../data/enemies';
import { COMBO_NAMES, comboBonusOf, enemyName, findAlly, weaponRarity, sceneBackground } from '../../engine';
import { useElementSize } from '../../hooks/useElementSize';
import { useDetail, usePress } from '../../hooks/usePress';
import { speedFactor, useBattle, type UnitFx } from '../../store/battleStore';
import type { AllyState, BattleState, EnemyState } from '../../types';
import { intentView, type IntentPart } from '../format';
import { HpBar } from '../ui/HpBar';
import { EffectChip, ELEMENT_ICONS, Shield, Skull, statusStyle, Swords } from '../ui/icons';
import { Flame } from 'lucide-react';
import { getElement } from '../../data/elements';
import { StatusChips } from '../ui/StatusChips';
import { UnitPopups } from './Popups';
import { SlotOverlay } from './SlotOverlay';
import { isAllyCard } from '../../engine/battle/targets';
import { isOnlinePlay } from '../../store/battleConfig';
import { seatModeOf } from '../../store/seats';
import './battleFx.css';
import { CalloutBand, GuardLayer, ImpactLayer } from './BattleFx';

/** 個体ごとの呼吸の周期と始まりをずらす（IDの文字から決める。乱数は使わない） */
export function breathStyle(id: string, base: number, spread: number, sway: number): React.CSSProperties {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const period = base + ((h % 7) / 6) * spread;
  return { ['--breath' as string]: `${period.toFixed(2)}s`, ['--breath-delay' as string]: `${(-(h % 13) / 13 * period).toFixed(2)}s`, ['--sway' as string]: `${(h % 2 ? sway : -sway).toFixed(2)}deg` };
}

/** 動きの演出（攻撃・被弾・詠唱）。fx.id が変わった時だけ再生する */
function useUnitMotion(unitId: string, side: 'ally' | 'enemy') {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const fx: UnitFx | undefined = useBattle((s) => s.unitFx[unitId]);
  const fast = useBattle((s) => s.settings.fastMode);
  const simple = useBattle(s => s.settings.cutinMode === 'simple');
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!fx || !scope.current) return;
    const k = 1 / speedFactor({ fastMode: fast });
    const dir = side === 'ally' ? 1 : -1;
    scope.current.dataset.unitMotion = fx.kind;
    scope.current.dataset.motionUnit = unitId;
    const calm = reduced || simple;
    const frames = calm ? { opacity: [1, 0.6, 1] } : fx.kind === 'attack'
      ? { x: [0, 12 * dir, 0], y: [0, -12 * dir, 0], scale: [1, 1.08, 1] }
      : fx.kind === 'cast' ? { y: [0, -10, 0], scale: [1, 1.06, 1] }
      // 被弾（段階B）: 小刻みな揺れ（白いフラッシュは中の絵に重ねる）
      : { x: [0, -6 * dir, 6 * dir, -5 * dir, 4 * dir, -2 * dir, 0] };
    const controls = animate(scope.current, frames, { duration: (calm ? 0.14 : fx.kind === 'hit' ? 0.24 : 0.28) * k, ease: 'easeOut' });
    // 被弾の白いフラッシュ（0.06秒・明るさ2.8倍）。動きを減らす設定では出さない
    const inner = scope.current.firstElementChild as HTMLElement | null;
    const flash = fx.kind === 'hit' && !calm && inner
      ? animate(inner, { filter: ['brightness(2.8)', 'brightness(2.8)', 'brightness(1)'] }, { duration: TIMING.hitFlash * 2 * k, times: [0, 0.5, 1], ease: 'linear' })
      : undefined;
    return () => { controls.stop(); flash?.stop(); };
  }, [fx?.id, fast, simple, reduced]);
  return scope;
}

/**
 * 重なりの段階2以上（Step C）: 戦場の人物を 0.12秒だけ小さく揺らす。高速の設定ではその分短く。
 * OS の「動きを減らす」・カットインの「簡易」では揺らさない。見た目だけ（状態・乱数・同期は変えない）
 */
function SynergyShake({ children }: { children: ReactNode }) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const fx = useBattle((s) => s.synergyFx);
  const big = useBattle((s) => s.fieldShake);
  const fast = useBattle((s) => s.settings.fastMode);
  const simple = useBattle((s) => s.settings.cutinMode === 'simple');
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!fx || !scope.current) return;
    scope.current.dataset.synergyShake = String(fx.tier);
    if (reduced || simple) return;
    const controls = animate(scope.current, { x: [0, -3, 3, -2, 0] }, { duration: TIMING.synergyShake / speedFactor({ fastMode: fast }), ease: 'linear' });
    return () => controls.stop();
  }, [fx?.id]);
  // 段階B: 大ダメージ・完全成功で戦場全体（背景ごと）を0.12秒揺らす
  useEffect(() => {
    if (!big || !scope.current) return;
    scope.current.dataset.fieldShake = String(big.id);
    if (reduced || simple) return;
    const controls = animate(scope.current, { x: [0, -5, 5, -4, 3, 0], y: [0, 2, -2, 1, 0, 0] }, { duration: TIMING.fieldShake / speedFactor({ fastMode: fast }), ease: 'linear' });
    return () => controls.stop();
  }, [big?.id]);
  return <div ref={scope} className="absolute inset-0" data-synergy-field>{children}</div>;
}

function TargetFace({ allyId }: { allyId?: string }) {
  const ally = useBattle((s) => (allyId ? findAlly(s.battle, allyId) : undefined));
  if (!ally) return null;
  return (
    <span className="inline-flex h-[22px] w-[22px] overflow-hidden rounded-full border-2 bg-[#1d2440] shadow-[0_0_6px_rgba(255,80,80,.8)]" style={{ borderColor: '#ff6a6a' }} data-intent-target={ally.id}>
      <CharacterArt classId={ally.classId} gender={ally.gender} face className="h-full w-full" />
    </span>
  );
}

/** 予告の宛先に出す短い名前（長い名前は4文字＋「…」）。担当（P1など）は全員同じことがあるので出さない */
export const shortName = (name: string) => ([...name].length > 5 ? `${[...name].slice(0, 4).join('')}…` : name);

function IntentTargetName({ id }: { id?: string }) {
  const a = useBattle(s => s.battle.allies.find(a => a.id === id));
  // 予告の枠の中の一番上の行に出す（枠の下にはみ出して味方の頭と重ならないように）。
  // 敵が3体以上で枠が狭い時も、短い名前で出す（「→P1」だと、2人とも P1 の時に誰か分からない）
  return a ? <span className="order-first w-full truncate text-center text-[12px] leading-4" data-intent-name>→{shortName(a.name)}</span> : null;
}
function IntentPartView({ p }: { p: IntentPart }) {
  switch (p.kind) {
    case 'attack': {
      const el = p.element ? getElement(p.element) : undefined;
      const Icon = el ? (ELEMENT_ICONS[el.icon] ?? Swords) : Swords;
      return (
        <span className="flex max-w-full flex-wrap items-center justify-center gap-0.5 text-red-300" style={el ? { color: el.color } : undefined}>
          <Icon size={14} strokeWidth={2.6} />
          <TargetFace allyId={p.targetId} /><IntentTargetName id={p.targetId} />
          <span className="tabular-nums">{p.hits > 1 ? `${p.damage}×${p.hits}` : p.damage}</span>
        </span>
      );
    }
    case 'attackAll': {
      const el = p.element ? getElement(p.element) : undefined;
      const Icon = el ? (ELEMENT_ICONS[el.icon] ?? Skull) : Skull;
      return (
        <span className="flex max-w-full flex-wrap items-center justify-center gap-0.5 text-red-300" style={el ? { color: el.color } : undefined}>
          <Icon size={14} strokeWidth={2.6} />
          <span className="text-[12px]">味方全員</span>
          <span className="tabular-nums">{p.hits > 1 ? `${p.damage}×${p.hits}` : p.damage}</span>
        </span>
      );
    }
    case 'block':
      return (
        <span className="flex items-center gap-0.5 text-sky-300">
          <Shield size={14} strokeWidth={2.6} />
          {p.others && <span className="text-[12px]">仲間</span>}
          <span className="tabular-nums">{p.amount}</span>
        </span>
      );
    case 'debuff': {
      const st = statusStyle(p.status);
      return (
        <span className="flex items-center gap-0.5" style={{ color: st.color }}>
          <st.Icon size={14} strokeWidth={2.6} />
          {p.all ? <span className="text-[12px]">味方全員</span> : <><TargetFace allyId={p.targetId} /><IntentTargetName id={p.targetId} /></>}
          <span className="tabular-nums">{p.amount}</span>
        </span>
      );
    }
    case 'other':
      return <EffectChip e={p.effect} size={14} />;
  }
}

function IntentBubble({ enemy, onTap }: { enemy: EnemyState; onTap: () => void }) {
  const battle = useBattle((s) => s.battle);
  const retargetKey = useBattle((s) => s.retargets[enemy.uid] ?? 0);
  const press = usePress(onTap, { type: 'intent', uid: enemy.uid });
  const view = intentView(battle, enemy);
  return (
    <div {...press} className="flex min-h-[24px] items-center justify-center">
      {view && (
        <motion.div
          key={retargetKey}
          initial={retargetKey ? { scale: 1.45 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="relative flex max-w-full flex-wrap items-center justify-center gap-1 rounded-lg border border-red-300/50 bg-[#1c0a10]/90 px-1.5 py-0.5 text-[14px] leading-5 font-black shadow-[0_2px_0_rgba(0,0,0,.6)]"
          data-intent={enemy.uid}
          data-intent-big={view.big || undefined}
          data-intent-broken={view.broken || undefined}
          style={view.broken ? { borderColor: 'rgba(251,191,36,.9)' } : view.big ? { borderColor: 'rgba(255,90,90,.95)', boxShadow: '0 0 8px rgba(255,80,80,.7), 0 2px 0 rgba(0,0,0,.6)' } : undefined}
        >
          {/* 大技の予告（体勢を崩せる）。崩した後は「BREAK」の札に変わる */}
          {view.broken ? (
            <span className="order-first rounded bg-amber-400 px-1 text-[12px] leading-4 font-black whitespace-nowrap text-amber-950" data-break-mark>⚡BREAK</span>
          ) : view.big ? (
            <span className="order-first flex items-center rounded bg-red-600 px-1 text-[12px] leading-4 font-black whitespace-nowrap text-white" data-big-mark><Flame size={12} strokeWidth={2.8} />大技</span>
          ) : null}
          {view.parts.map((p, i) => (
            <IntentPartView key={i} p={p} />
          ))}
          {/* お供の先読み: 次のターンの行動の名前（枠の中の最後の行。下の味方や狙いの名前に重ねない） */}
          {enemy.queuedActionId && (
            <span className="order-last max-w-full truncate rounded-full bg-sky-950/95 px-1.5 text-[12px] leading-4 font-bold text-sky-200 ring-1 ring-sky-300/60" data-foresee>
              次: {getEnemyAction(enemy.defId, enemy.queuedActionId).name}
            </span>
          )}
        </motion.div>
      )}
    </div>
  );
}

const EnemyUnit = memo(function EnemyUnit({
  enemy,
  left,
  top,
  slotW,
  spriteH,
  boxH,
}: {
  enemy: EnemyState;
  left: number;
  top: number;
  slotW: number;
  /** 大きさ 1 の敵の絵の高さ（絵の高さ = spriteH × size） */
  spriteH: number;
  /** 絵の箱の高さ（一番大きい敵が収まる高さ。絵は箱の下の端に立つ） */
  boxH: number;
}) {
  const def = getEnemy(enemy.defId);
  const tapEnemy = useBattle((s) => s.tapEnemy);
  const selection = useBattle((s) => s.selection);
  const activeId = useBattle((s) => s.activeId);
  const battle = useBattle((s) => s.battle);
  const onTap = () => tapEnemy(enemy.uid);
  const press = usePress(onTap, { type: 'enemy', uid: enemy.uid });
  const scope = useUnitMotion(enemy.uid, 'enemy');

  // カード選択中の対象表示とダメージ予測
  const ally = findAlly(battle, activeId);
  const inst = selection && ally?.hand.find((c) => c.uid === selection.cardUid);
  const card = inst ? cardOf(inst) : null;
  const aoe = !!card && card.target === 'allEnemies' && !enemy.dead;
  const targetable = !!card && (card.target === 'enemy' || aoe) && !enemy.dead;
  const isTarget = aoe || (targetable && selection?.targetId === enemy.uid);
  const waiting = targetable && !aoe && !selection?.targetId;
  // スポットライト（段階A）: 単体の敵を狙って相手が決まっている時、狙う敵を明るく浮かせ、ほかの敵を暗くする
  const spotOn = !!card && card.target === 'enemy' && !!selection?.targetId && !enemy.dead;
  const dimmed = spotOn && !isTarget;
  const lit = spotOn && isTarget;
  const h = spriteH * (def.size ?? 1);
  const barW = Math.min(slotW - 6, 104);
  // 次の攻撃の属性の色（足元のオーラ）
  const auraColor = useMemo(() => {
    if (enemy.dead) return undefined;
    const part = intentView(battle, enemy)?.parts.find((p) => (p.kind === 'attack' || p.kind === 'attackAll') && p.element);
    return part && (part.kind === 'attack' || part.kind === 'attackAll') && part.element ? getElement(part.element).color : undefined;
  }, [battle, enemy]);
  const breath = useMemo(() => breathStyle(enemy.uid + enemy.defId, 2.5, 0.9, 0.6), [enemy.uid, enemy.defId]);
  const footW = Math.min(slotW - 4, h * 0.9);

  return (
    <div
      {...press}
      className="absolute flex flex-col items-center"
      style={{ left: left - slotW / 2, top, width: slotW }}
      data-enemy={enemy.uid}
      data-dead={enemy.dead || undefined}
      data-hp={enemy.hp}
    >
      <div className="relative flex w-full justify-center" style={{ height: boxH, ...breath }}>
        {/* スポットライト: 上から差す光（狙う敵だけ） */}
        {lit && (
          <div
            className="spotlight-beam pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2"
            style={{ width: Math.min(slotW, h * 1.1), height: Math.min(boxH, h * 1.25), background: 'radial-gradient(ellipse 50% 70% at 50% 100%, rgba(255,236,170,.34), rgba(255,220,140,.12) 55%, transparent 75%)' }}
            data-spotlight={enemy.uid}
          />
        )}
        {!enemy.dead && <div className="foot-shadow bottom-[-5px]" style={{ width: footW, height: 16 }} />}
        {auraColor && !enemy.dead && (
          <div className="element-aura bottom-[-8px]" style={{ width: footW * 1.1, height: 24, background: `radial-gradient(closest-side, ${auraColor}aa, ${auraColor}33 60%, transparent)` }} data-element-aura={auraColor} />
        )}
        {(isTarget || waiting) && !lit && (
          <div
            className={`absolute bottom-0 left-1/2 h-[18px] -translate-x-1/2 rounded-[50%] border-2 ${
              isTarget ? 'border-amber-300 bg-amber-400/25' : 'glow-pulse border-amber-200/80'
            }`}
            style={{ width: footW }}
          />
        )}
        {lit && <TargetRing width={footW * 1.12} />}
        <motion.div
          className="absolute bottom-0"
          animate={enemy.dead ? { opacity: 0, scale: 0.85, y: 10 } : { opacity: dimmed ? 0.6 : 1, scale: 1, y: 0 }}
          transition={{ duration: enemy.dead ? 0.45 : 0.15 }}
          style={{ width: h * 0.85, height: h }}
          data-enemy-sprite={enemy.uid}
          data-spot={lit ? 'lit' : dimmed ? 'dim' : undefined}
        >
          <div
            ref={scope}
            className="h-full w-full will-change-transform"
            style={lit ? { filter: 'brightness(1.18) drop-shadow(0 0 8px rgba(255,214,110,.95))' } : isTarget ? { filter: 'drop-shadow(0 0 6px rgba(255,210,90,.95))' } : undefined}
          >
            <div className="idle-live h-full w-full">
              <EnemyArt defId={enemy.defId} phase={enemy.phase} className="h-full w-full" />
            </div>
          </div>
          <ImpactLayer unitId={enemy.uid} />
        </motion.div>
        {/* 狙う敵: 足元の光る輪・絵の発光・頭の上の矢印（予測の数字は下の操作パネルに出す。絵は隠さない） */}
        {isTarget && (
          <motion.div
            className="pointer-events-none absolute z-20 text-[18px] leading-none font-black text-amber-300 drop-shadow-[0_0_4px_rgba(0,0,0,.9)]"
            style={{ top: Math.max(0, boxH - h - 20) }}
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            data-target-arrow={enemy.uid}
          >
            ▼
          </motion.div>
        )}
        {/* 数字は、その敵の絵の頭のすぐ上に出す（箱の上の空きではなく、絵の上の端に合わせる） */}
        <UnitPopups unitId={enemy.uid} top={`${Math.max(0, boxH - h - 6)}px`} />
      </div>
      {!enemy.dead && (
        // 予告は味方の立ち絵より手前に出す（画面が低くて重なっても、狙いと数字を読めるように）
        <div className="relative z-[6] mt-0.5 flex flex-col items-center gap-0.5 transition-opacity duration-150" style={{ width: barW, opacity: dimmed ? 0.8 : 1 }} data-enemy-info>
          <div className="text-outline w-full truncate text-center text-[12px] leading-[14px] font-bold text-zinc-100">
            <span className="text-amber-300">Lv{enemy.level}</span> {enemyName(enemy)}
          </div>
          <HpBar hp={enemy.hp} max={enemy.maxHp} block={enemy.block} tone="enemy" height={12} />
          <ElementMarks defId={enemy.defId} />
          {/* 次の行動の予告（HPのすぐ下。誰を狙っているかの顔つき） */}
          <IntentBubble enemy={enemy} onTap={onTap} />
          <AimMarks battle={battle} enemyUid={enemy.uid} />
          <StatusChips s={enemy.statuses} side="enemy" onTap={onTap} tauntedBy={enemy.tauntedBy} />
        </div>
      )}
    </div>
  );
});

/** 狙う敵の足元で回るターゲットリング（横に寝かせた輪。中の目盛りがゆっくり回る） */
function TargetRing({ width }: { width: number }) {
  const ticks = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <div className="pointer-events-none absolute bottom-[-10px] left-1/2 z-[1]" style={{ width, height: width, marginLeft: -width / 2, transform: 'scaleY(0.3)', transformOrigin: '50% 100%' }} data-target-ring>
      <svg viewBox="0 0 100 100" className="target-ring-spin h-full w-full overflow-visible">
        <circle cx="50" cy="50" r="46" fill="rgba(255,200,80,.18)" stroke="#ffd76a" strokeWidth="3" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="#fff3c4" strokeWidth="1.6" strokeDasharray="10 7" />
        {ticks.map((a) => (
          <rect key={a} x="48.5" y="1" width="3" height="9" fill="#fff3c4" transform={`rotate(${a} 50 50)`} />
        ))}
      </svg>
    </div>
  );
}

/** 敵の弱点（▲ 属性の色）と耐性（▼ 灰色）。長押しの詳細を見なくても分かるように */
function ElementMarks({ defId }: { defId: string }) {
  const def = getEnemy(defId);
  const weak = def.weak ?? [];
  const resist = def.resist ?? [];
  if (!weak.length && !resist.length) return null;
  const mark = (id: string, kind: 'weak' | 'resist') => {
    const el = getElement(id);
    const Icon = ELEMENT_ICONS[el.icon] ?? Swords;
    return (
      <span
        key={`${kind}${id}`}
        className={`flex items-center rounded-full px-1 text-[12px] leading-4 font-black ${kind === 'weak' ? 'bg-black/70 ring-1' : 'bg-black/60 text-zinc-400'}`}
        style={kind === 'weak' ? { color: el.color, boxShadow: `0 0 0 1px ${el.color}` } : undefined}
        title={`${el.name}${kind === 'weak' ? 'に弱い' : 'に強い'}`}
      >
        {kind === 'weak' ? '▲' : '▼'}
        <Icon size={12} strokeWidth={2.6} />
      </span>
    );
  };
  return (
    <div className="flex flex-wrap justify-center gap-0.5" data-elements>
      {weak.map((id) => mark(id, 'weak'))}
      {resist.map((id) => mark(id, 'resist'))}
    </div>
  );
}

/** 仲間が狙っている敵の印（狙っている味方の顔。M3-C5）。このターンに攻撃した味方は「連携」の印 */
function AimMarks({ battle, enemyUid }: { battle: BattleState; enemyUid: string }) {
  const aimers = battle.allies.filter((a) => !a.dead && battle.aims?.[a.id] === enemyUid);
  const enemy = battle.enemies.find((e) => e.uid === enemyUid);
  const activeId = useBattle((s) => s.activeId);
  // 連携の段階: 今選んでいるキャラが次に攻撃した時の段階（自分しか攻撃していない時は、ほかの仲間が攻撃した時の段階）
  const hitBy = enemy?.hitBy ?? [];
  const stage = Math.min(COMBO_NAMES.length - 1, hitBy.filter((x) => x !== activeId).length || hitBy.length);
  const combo = stage > 0;
  if (!aimers.length && !combo) return null;
  return (
    <div className="flex items-center gap-0.5" data-aims={aimers.map((a) => a.id).join(',')}>
      {combo && <span className={`rounded px-1 text-[12px] leading-4 font-black whitespace-nowrap ${stage >= 3 ? 'bg-gradient-to-b from-amber-100 to-amber-400 text-amber-950 ring-1 ring-amber-100' : stage === 2 ? 'bg-amber-400 text-amber-950' : 'bg-amber-500/90 text-amber-950'}`} data-combo-stage={stage}>{COMBO_NAMES[stage]}+{Math.round(comboBonusOf(stage) * 100)}%</span>}
      {aimers.map((a) => (
        <span key={a.id} className="overflow-hidden rounded-full border-2" style={{ width: 20, height: 20, borderColor: PLAYER_COLOR[a.playerId] ?? '#ffd76a' }}>
          <CharacterArt classId={a.classId} gender={a.gender} face className="h-full w-full" />
        </span>
      ))}
    </div>
  );
}

const AllySprite = memo(function AllySprite({ ally, left, bottom, h, active, fieldW }: { fieldW: number; ally: AllyState; left: number; bottom: number; h: number; active: boolean }) {
  const scope = useUnitMotion(ally.id, 'ally');
  const setActive = useBattle((s) => s.setActive);
  const weapon = useBattle((s) => {
    const h = s.game?.heroes.find((x) => x.id === ally.id);
    return h ? weaponRarity(h) : undefined;
  });
  const press = usePress(() => setActive(ally.id), { type: 'ally', id: ally.id });
  const breath = useMemo(() => breathStyle(ally.id + ally.classId, 2.9, 0.8, 0.35), [ally.id, ally.classId]);
  // カードを選んでいる時: 使う人と、回復・支援の相手に印を出す（枠の色だけでなく、立ち絵の上でも分かるように）
  const role = useBattle((s) => {
    const sel = s.selection;
    if (!sel) return null;
    const user = findAlly(s.battle, s.activeId);
    const inst = user?.hand.find((c) => c.uid === sel.cardUid);
    if (!inst) return null;
    const card = cardOf(inst);
    if ((isAllyCard(card) && sel.targetId === ally.id) || (card.secondaryTarget && sel.allyTargetId === ally.id)) return 'target';
    if (s.activeId === ally.id && (isAllyCard(card) || !!card.secondaryTarget)) return 'user';
    return null;
  });
  return (
    <div {...press} className="absolute" style={{ left: left - h * 0.4, bottom, width: h * 0.8, height: h, ...breath }} data-ally-sprite={ally.id}>
      {/* 足もとの影（呼吸に合わせて少し縮む）と陣形の円（敵と向き合う奥行き） */}
      <div className="foot-shadow -bottom-[6px] h-[22px] w-[105%]" />
      <div className="pointer-events-none absolute -bottom-[4px] left-1/2 h-[16px] w-[88%] -translate-x-1/2 rounded-[50%] border border-sky-200/25" style={{ boxShadow: 'inset 0 0 8px rgba(140,190,255,.25)' }} />
      {active && (
        <div className="glow-pulse absolute -bottom-1 left-1/2 h-[16px] w-[90%] -translate-x-1/2 rounded-[50%] border-2 border-amber-300 bg-amber-300/20" />
      )}
      <div ref={scope} className={`h-full w-full will-change-transform ${ally.dead ? 'opacity-40 grayscale' : ''}`}>
        <div className={`h-full w-full ${ally.dead ? '' : 'idle-live'}`}>
          <CharacterArt classId={ally.classId} gender={ally.gender} weapon={weapon} className="h-full w-full" />
        </div>
      </div>
      {/* お供: 鳥は肩、小竜は浮く、それ以外は足元 */}
      {ally.pet && !ally.dead && <AllyPet ownerId={ally.id} pet={ally.pet} h={h} spriteLeft={left - h * 0.4} fieldW={fieldW} />}
      {role && (
        <div className="pointer-events-none absolute inset-x-0 -top-[22px] z-20 flex justify-center" data-ally-role={role}>
          <span className={`rounded-full px-1.5 text-[12px] leading-[18px] font-black whitespace-nowrap shadow ${role === 'target' ? 'bg-sky-300 text-sky-950' : 'bg-amber-300 text-amber-950'}`}>
            {role === 'target' ? '▼対象' : '使う人'}
          </span>
        </div>
      )}
      <ImpactLayer unitId={ally.id} />
      <GuardLayer unitId={ally.id} />
      {/* 数字は、そのキャラの頭のすぐ上に出す */}
      <UnitPopups unitId={ally.id} top="-6px" />
    </div>
  );
});

function AllyPet({ pet, h, ownerId, spriteLeft, fieldW }: { spriteLeft: number; fieldW: number; ownerId: string; pet: NonNullable<AllyState['pet']>; h: number }) {
  const perch = getPet(pet.petId).perch;
  const size = Math.round(h * (perch === 'feet' ? 0.3 : 0.24));
  // 持ち主の立ち絵の幅の中に置く（外に出すと、隣の仲間の足元に立って見えるため）。押せる所は44px
  const w = h * 0.8, box = Math.max(44, size);
  const preferred = perch === 'shoulder' ? w * 0.68 - box / 2 : perch === 'float' ? w * 0.08 - (box - size) / 2 : w * 0.6 - box / 2;
  const inside = Math.max(-(box - size) / 2, Math.min(preferred, w - box + (box - size) / 2));
  const left = Math.max(4 - spriteLeft, Math.min(inside, fieldW - box - 4 - spriteLeft));
  const pos = perch === 'feet' ? { left, bottom: '-2%' } : { left, top: perch === 'shoulder' ? '20%' : '8%' };
  return (
    <div className="pointer-events-none absolute" style={pos}>
      <button aria-label={`${pet.name}の詳細`} className="pointer-events-auto flex min-h-11 min-w-11 items-center justify-center" onClick={e => { e.stopPropagation(); useDetail.getState().show({ type: 'pet', allyId: ownerId }); }}><PetToken ownerId={ownerId} pet={pet} size={size} /></button>
    </div>
  );
}

const Embers = memo(function Embers() {
  const list = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        left: `${8 + i * 13}%`,
        bottom: `${10 + ((i * 37) % 30)}%`,
        dx: `${(i % 2 ? 1 : -1) * (8 + i * 2)}px`,
        dur: `${4.5 + (i % 3)}s`,
        delay: `${-i * 0.9}s`,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {list.map((e, i) => (
        <span
          key={i}
          className="ember"
          style={{ left: e.left, bottom: e.bottom, ['--dx' as string]: e.dx, ['--dur' as string]: e.dur, ['--delay' as string]: e.delay }}
        />
      ))}
    </div>
  );
});

export function Battlefield() {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const enemies = useBattle((s) => s.battle.enemies);
  const allies = useBattle((s) => s.battle.allies);
  const activeId = useBattle((s) => s.activeId);
  const phase = useBattle((s) => s.battle.phase);
  const bgKind = useBattle((s) => (s.game ? sceneBackground(s.game) : 'plains'));
  // ボスの変身後の絵は、戦闘の始め（敵の顔ぶれが決まった時）に先に読む
  const enemyIds = enemies.map((e) => e.defId).join(',');
  useEffect(() => preloadEnemyPhases(enemyIds.split(',')), [enemyIds]);
  const W = size.width;
  const H = size.height;

  // 敵: 上側 58%。味方: 下側。人数が増えたら小さくする
  const nE = enemies.length;
  const enemySlotW = W / nE;
  const enemyTop = 4;
  // 名前 + HP + 行動の予告（狙いの名前の行を含む）+ 先読みの行 + 状態異常
  const foresee = enemies.some((e) => !e.dead && e.queuedActionId);
  // 属性の印の行（16）・各行の間（0.5×5）・3体以上の時に互い違いにずらす分（10）も数える
  // 予告の枠は「→名前」の行（16）＋数字の行（20）＋枠の余白（6）の2行ぶん
  const enemyInfoH = 14 + 14 + 16 + 42 + 16 + (foresee ? 18 : 0) + 18 + 10 + (nE >= 3 ? 10 : 0);
  // 敵の列の下端と味方の頭の間に少し余白を残す（予告の枠が立ち絵の頭に重ならないように）
  const enemySpriteH = Math.max(40, Math.min(H * 0.56 - enemyInfoH, enemySlotW * 1.15));
  // 大きな敵（size > 1）は、絵の箱より上へはみ出して描かれ、戦場の上の端（上の帯）で体が切れていた。
  // 一番大きい敵がちょうど箱に収まるように、大きさ 1 の高さを size で割る（敵どうしの大きさの比は変わらない。
  // 倒れた敵も数えて、途中で並びが動かないようにする）。箱の高さ（＝名前・予告の位置）は今までどおり
  const maxSize = Math.max(1, ...enemies.map((e) => getEnemy(e.defId).size ?? 1));
  const enemyUnitH = enemySpriteH / maxSize;
  const nA = allies.length;
  const allyAreaW = nA <= 2 ? W * 0.62 : W;
  // 味方の立ち絵は、敵の列（予告まで）の下に収まる高さにする。画面が低い時でも元の6割より小さくしない
  const allyFull = Math.min(H * 0.42, (allyAreaW / nA) * 1.25);
  const enemyBottom = enemyTop + enemySpriteH + enemyInfoH;
  const allyH = Math.max(48, allyFull * 0.6, Math.min(allyFull, H - 6 - enemyBottom));
  // 段階A: 操作パネルが戦場に重なってよい高さ（味方の下半身まで＝立ち絵の下45%）。パネルの最大の高さに使う
  useEffect(() => {
    ref.current?.parentElement?.style.setProperty('--ally-reach', `${Math.round(6 + allyH * 0.45)}px`);
  }, [allyH]);

  return (
    <div ref={ref} className="relative min-h-[190px] flex-1 overflow-hidden">
      <SynergyShake>
      {/* 背景も一緒に揺れる（揺れても端が見えないよう少し大きく） */}
      <BattleBackground kind={bgKind} className="absolute -inset-2 h-[calc(100%+16px)] w-[calc(100%+16px)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/45" />
      <Embers />
      {W > 0 && phase === 'ally' && <TargetLines W={W} H={H} enemySlotW={enemySlotW} enemyTop={enemyTop} enemySpriteH={enemySpriteH} allyAreaW={allyAreaW} allyH={allyH} />}
      {W > 0 && (
        <>
          {enemies.map((e, i) => (
            <EnemyUnit
              key={e.uid}
              enemy={e}
              left={enemySlotW * (i + 0.5)}
              top={enemyTop + (nE >= 3 && i % 2 === 1 ? 10 : 0)}
              slotW={enemySlotW}
              spriteH={enemyUnitH}
              boxH={enemySpriteH}
            />
          ))}
          {allies.map((a, i) => (
            <AllySprite
              key={a.id}
              ally={a}
              fieldW={W}
              left={(allyAreaW / nA) * (i + 0.5) + (nA <= 2 ? W * 0.02 : 0)}
              bottom={6 + (nA >= 3 && i % 2 === 1 ? 8 : 0)}
              h={allyH}
              active={a.id === activeId && phase === 'ally'}
            />
          ))}
        </>
      )}
      </SynergyShake>
      <CalloutBand top={22} />
      <div className="pointer-events-none absolute inset-x-0 top-[46%] z-40 flex justify-center">
        <SlotOverlay />
      </div>
      <SeatLabel />
      <PhaseBanner top={enemyTop + Math.max(0, enemySpriteH * 0.4 - 20)} />
      {/* 上下の画面との境目: 影でなじませ、金の飾り線を引く */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#0d0b16] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#0d0b16] via-[#0d0b16]/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-400/60" />
        <span className="mx-1 h-[7px] w-[7px] rotate-45 bg-amber-300 shadow-[0_0_6px_rgba(255,200,90,.9)]" />
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-400/60" />
      </div>
    </div>
  );
}

/** 敵が狙っている味方への赤い破線（味方のフェーズの間。どの敵が誰を狙っているかを一目で） */
function TargetLines({ W, H, enemySlotW, enemyTop, enemySpriteH, allyAreaW, allyH }: { W: number; H: number; enemySlotW: number; enemyTop: number; enemySpriteH: number; allyAreaW: number; allyH: number }) {
  const battle = useBattle((s) => s.battle);
  const nA = battle.allies.length;
  const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
  battle.enemies.forEach((e, i) => {
    if (e.dead || !e.intent?.targetId) return;
    const view = intentView(battle, e);
    if (!view?.parts.some((p) => p.kind === 'attack')) return;
    const ai = battle.allies.findIndex((a) => a.id === e.intent!.targetId);
    if (ai < 0) return;
    const ax = (allyAreaW / nA) * (ai + 0.5) + (nA <= 2 ? W * 0.02 : 0);
    const ay = H - 6 - allyH * 0.7;
    lines.push({ key: e.uid, x1: enemySlotW * (i + 0.5), y1: enemyTop + enemySpriteH * 0.75, x2: ax, y2: ay });
  });
  if (!lines.length) return null;
  return (
    <svg className="pointer-events-none absolute inset-0 z-[5]" width={W} height={H} data-target-lines>
      <defs>
        <marker id="tl-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 0 L10 5 L0 10 Z" fill="#ff5a5a" />
        </marker>
      </defs>
      {lines.map((l) => (
        <line key={l.key} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#ff4a4a" strokeWidth={2} strokeDasharray="6 5" opacity={0.6} markerEnd="url(#tl-arrow)" className="target-dash" />
      ))}
    </svg>
  );
}

/**
 * フェーズが変わった時に一瞬出る帯（操作をブロックしない）。
 * 前の数字の表示が全部終わってから store が出す（phaseBanner）。敵の予告の上ではなく、敵の絵の高さに出す
 */
/**
 * 「スマホを回して」遊ぶ時（担当が P1・P2…と1人ずつの時）だけ、今だれが操作しているかを上に小さく出す（ステップB）。
 * 1人で全員を操作する時・オンライン協力の時は出さない
 */
function SeatLabel() {
  const pass = useBattle((s) => {
    const heroes = s.full?.heroes ?? [];
    return !isOnlinePlay() && heroes.length > 1 && seatModeOf(heroes) === 'pass';
  });
  const active = useBattle((s) => (s.battle.phase === 'ally' ? s.battle.allies.find((a) => a.id === s.activeId && !a.dead) : undefined));
  if (!pass || !active) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0.5 z-30 flex justify-center px-2">
      <span
        className="max-w-full truncate rounded-full border-2 bg-black/75 px-2 text-[12px] leading-4 font-bold text-white shadow-[0_2px_4px_rgba(0,0,0,.7)]"
        style={{ borderColor: PLAYER_COLOR[active.playerId] }}
        data-seat-label={active.playerId}
      >
        {active.playerId}（{active.name}）を操作中
      </span>
    </div>
  );
}

function PhaseBanner({ top }: { top: number }) {
  const banner = useBattle((s) => s.phaseBanner);
  const fast = useBattle((s) => s.settings.fastMode);
  if (!banner) return null;
  const { phase, turn } = banner;
  const k = 1 / speedFactor({ fastMode: fast });
  return (
    <motion.div
      key={banner.id}
      initial={{ opacity: 0, scaleX: 0.6 }}
      animate={{ opacity: [0, 1, 1, 0], scaleX: [0.6, 1, 1, 1.05] }}
      transition={{ duration: TIMING.phaseBanner * k, times: [0, 0.2, 0.75, 1] }}
      className="pointer-events-none absolute inset-x-0 z-30 flex justify-center"
      style={{ top }}
      data-phase-banner={phase}
    >
      <div
        className={`font-display text-outline w-full py-1 text-center text-[22px] tracking-[0.3em] ${
          phase === 'ally' ? 'text-amber-100' : 'text-red-200'
        }`}
        style={{
          background:
            phase === 'ally'
              ? 'linear-gradient(90deg,transparent,rgba(40,70,140,.85),transparent)'
              : 'linear-gradient(90deg,transparent,rgba(120,20,30,.85),transparent)',
        }}
      >
        {phase === 'ally' ? `ターン ${turn}` : '敵のターン'}
      </div>
    </motion.div>
  );
}
