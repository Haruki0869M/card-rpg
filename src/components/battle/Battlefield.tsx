// ===== 戦場（画面上半分） =====
// 背景の上に、敵（上段）と味方（下段）が向かい合う。動きの演出はラッパー要素の transform だけで行う。

import { motion, useAnimate, useReducedMotion } from 'framer-motion';
import { memo, useEffect, useMemo } from 'react';
import { BattleBackground, CharacterArt, EnemyArt } from '../../art';
import { getPet } from '../../data/pets';
import { PetToken } from '../ui/PetToken';
import { BALANCE, TIMING } from '../../data/balance';
import { PLAYER_COLOR } from '../../data/theme';
import { cardOf } from '../../data/cards';
import { getEnemy, getEnemyAction } from '../../data/enemies';
import { enemyName, findAlly, tierDamageAgainst, tierIndex, weaponRarity, sceneBackground } from '../../engine';
import { useElementSize } from '../../hooks/useElementSize';
import { usePress } from '../../hooks/usePress';
import { speedFactor, useBattle, type UnitFx } from '../../store/battleStore';
import type { AllyState, BattleState, EnemyState } from '../../types';
import { intentView, type IntentPart } from '../format';
import { HpBar } from '../ui/HpBar';
import { EffectChip, ELEMENT_ICONS, Shield, Skull, statusStyle, Swords } from '../ui/icons';
import { getElement } from '../../data/elements';
import { StatusChips } from '../ui/StatusChips';
import { UnitPopups } from './Popups';
import { SlotOverlay } from './SlotOverlay';

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
    const frames = reduced || simple ? { opacity: [1, 0.6, 1] } : fx.kind === 'attack'
      ? { x: [0, 12 * dir, 0], y: [0, -12 * dir, 0], scale: [1, 1.08, 1] }
      : fx.kind === 'cast' ? { y: [0, -10, 0], scale: [1, 1.06, 1] }
      : { x: [0, -7 * dir, 7 * dir, -4 * dir, 0], opacity: [1, 0.35, 1, 0.55, 1] };
    const controls = animate(scope.current, frames, { duration: (reduced || simple ? 0.14 : 0.28) * k, ease: 'easeOut' });
    return () => controls.stop();
  }, [fx?.id, fast, simple, reduced]);
  return scope;
}

function TargetFace({ allyId }: { allyId?: string }) {
  const ally = useBattle((s) => (allyId ? findAlly(s.battle, allyId) : undefined));
  if (!ally) return null;
  return (
    <span className="inline-block h-[22px] w-[22px] overflow-hidden rounded-full border-2 bg-[#1d2440] shadow-[0_0_6px_rgba(255,80,80,.8)]" style={{ borderColor: '#ff6a6a' }} data-intent-target={ally.id}>
      <CharacterArt classId={ally.classId} gender={ally.gender} face className="h-full w-full" />
    </span>
  );
}

function IntentPartView({ p }: { p: IntentPart }) {
  switch (p.kind) {
    case 'attack': {
      const el = p.element ? getElement(p.element) : undefined;
      const Icon = el ? (ELEMENT_ICONS[el.icon] ?? Swords) : Swords;
      return (
        <span className="flex items-center gap-0.5 text-red-300" style={el ? { color: el.color } : undefined}>
          <Icon size={14} strokeWidth={2.6} />
          <TargetFace allyId={p.targetId} />
          <span className="tabular-nums">{p.hits > 1 ? `${p.damage}×${p.hits}` : p.damage}</span>
        </span>
      );
    }
    case 'attackAll': {
      const el = p.element ? getElement(p.element) : undefined;
      const Icon = el ? (ELEMENT_ICONS[el.icon] ?? Skull) : Skull;
      return (
        <span className="flex items-center gap-0.5 text-red-300" style={el ? { color: el.color } : undefined}>
          <Icon size={14} strokeWidth={2.6} />
          <span className="text-[12px]">全</span>
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
          {p.all ? <span className="text-[12px]">全</span> : <TargetFace allyId={p.targetId} />}
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
          className="relative flex items-center gap-1 rounded-lg border border-red-300/50 bg-[#1c0a10]/90 px-1.5 py-0.5 text-[14px] leading-5 font-black whitespace-nowrap shadow-[0_2px_0_rgba(0,0,0,.6)]"
        >
          {view.parts.map((p, i) => (
            <IntentPartView key={i} p={p} />
          ))}
          {/* お供の先読み: 次のターンの行動の名前 */}
          {enemy.queuedActionId && (
            <span className="absolute -bottom-[18px] left-1/2 -translate-x-1/2 rounded-full bg-sky-950/95 px-1.5 text-[12px] leading-4 font-bold text-sky-200 ring-1 ring-sky-300/60" data-foresee>
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
}: {
  enemy: EnemyState;
  left: number;
  top: number;
  slotW: number;
  spriteH: number;
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
  let prediction: string | null = null;
  if (targetable && ally && card && card.tiers.some((t) => t.effects.some((e) => e.kind === 'damage'))) {
    const dmg = tierDamageAgainst(ally, card, enemy).slice(tierIndex(card, selection!.focus)).filter((d) => d > 0);
    if (dmg.length) {
      const lo = Math.min(...dmg);
      const hi = Math.max(...dmg);
      prediction = lo === hi ? `${lo}` : `${lo}〜${hi}`;
    }
  }
  const h = spriteH * (def.size ?? 1);
  const barW = Math.min(slotW - 6, 104);

  return (
    <div
      {...press}
      className="absolute flex flex-col items-center"
      style={{ left: left - slotW / 2, top, width: slotW }}
      data-enemy={enemy.uid}
      data-dead={enemy.dead || undefined}
      data-hp={enemy.hp}
    >
      <div className="relative flex w-full justify-center" style={{ height: spriteH }}>
        {(isTarget || waiting) && (
          <div
            className={`absolute bottom-0 left-1/2 h-[18px] -translate-x-1/2 rounded-[50%] border-2 ${
              isTarget ? 'border-amber-300 bg-amber-400/25' : 'glow-pulse border-amber-200/80'
            }`}
            style={{ width: Math.min(slotW - 4, h * 0.9) }}
          />
        )}
        <motion.div
          className="absolute bottom-0"
          animate={enemy.dead ? { opacity: 0, scale: 0.85, y: 10 } : { opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{ width: h * 0.85, height: h }}
        >
          <div ref={scope} className="h-full w-full will-change-transform">
            <div className="idle-bob h-full w-full" style={{ animationDelay: `${(enemy.uid.charCodeAt(1) % 4) * -0.7}s` }}>
              <EnemyArt defId={enemy.defId} phase={enemy.phase} className="h-full w-full" />
            </div>
          </div>
        </motion.div>
        {prediction && (
          <div className="pointer-events-none absolute top-[30%] z-20 rounded-md border border-red-300 bg-[#3a0610]/95 px-1.5 text-[13px] leading-5 font-black text-amber-100 tabular-nums">
            予測 {prediction}
          </div>
        )}
        <UnitPopups unitId={enemy.uid} top="10%" />
      </div>
      {!enemy.dead && (
        <div className="mt-0.5 flex flex-col items-center gap-0.5" style={{ width: barW }}>
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
  const combo = !!enemy?.hitBy?.length;
  if (!aimers.length && !combo) return null;
  return (
    <div className="flex items-center gap-0.5" data-aims={aimers.map((a) => a.id).join(',')}>
      {combo && <span className="rounded bg-amber-500/90 px-1 text-[12px] leading-4 font-black text-amber-950">連携+{Math.round(BALANCE.comboBonus * 100)}%</span>}
      {aimers.map((a) => (
        <span key={a.id} className="overflow-hidden rounded-full border-2" style={{ width: 20, height: 20, borderColor: PLAYER_COLOR[a.playerId] ?? '#ffd76a' }}>
          <CharacterArt classId={a.classId} gender={a.gender} face className="h-full w-full" />
        </span>
      ))}
    </div>
  );
}

const AllySprite = memo(function AllySprite({ ally, left, bottom, h, active }: { ally: AllyState; left: number; bottom: number; h: number; active: boolean }) {
  const scope = useUnitMotion(ally.id, 'ally');
  const setActive = useBattle((s) => s.setActive);
  const weapon = useBattle((s) => {
    const h = s.game?.heroes.find((x) => x.id === ally.id);
    return h ? weaponRarity(h) : undefined;
  });
  const press = usePress(() => setActive(ally.id), { type: 'ally', id: ally.id });
  return (
    <div {...press} className="absolute" style={{ left: left - h * 0.4, bottom, width: h * 0.8, height: h }}>
      {/* 足もとの影と陣形の円（敵と向き合う奥行き） */}
      <div className="pointer-events-none absolute -bottom-[6px] left-1/2 h-[22px] w-[105%] -translate-x-1/2 rounded-[50%]" style={{ background: 'radial-gradient(closest-side, rgba(0,0,0,.75), rgba(0,0,0,.35) 60%, transparent)' }} />
      <div className="pointer-events-none absolute -bottom-[4px] left-1/2 h-[16px] w-[88%] -translate-x-1/2 rounded-[50%] border border-sky-200/25" style={{ boxShadow: 'inset 0 0 8px rgba(140,190,255,.25)' }} />
      {active && (
        <div className="glow-pulse absolute -bottom-1 left-1/2 h-[16px] w-[90%] -translate-x-1/2 rounded-[50%] border-2 border-amber-300 bg-amber-300/20" />
      )}
      <div ref={scope} className={`h-full w-full will-change-transform ${ally.dead ? 'opacity-40 grayscale' : ''}`}>
        <div className={`h-full w-full ${ally.dead ? '' : 'idle-breathe'}`} style={{ animationDelay: `${Number(ally.id.slice(1)) * -0.6}s` }}>
          <CharacterArt classId={ally.classId} gender={ally.gender} weapon={weapon} className="h-full w-full" />
        </div>
      </div>
      {/* お供: 鳥は肩、小竜は浮く、それ以外は足元 */}
      {ally.pet && !ally.dead && <AllyPet ownerId={ally.id} pet={ally.pet} h={h} />}
      <UnitPopups unitId={ally.id} top="5%" />
    </div>
  );
});

function AllyPet({ pet, h, ownerId }: { ownerId: string; pet: NonNullable<AllyState['pet']>; h: number }) {
  const perch = getPet(pet.petId).perch;
  const size = Math.round(h * (perch === 'feet' ? 0.3 : 0.24));
  const pos = perch === 'shoulder' ? { right: '-2%', top: '20%' } : perch === 'float' ? { left: '-22%', top: '8%' } : { left: '-26%', bottom: '-2%' };
  return (
    <div className="pointer-events-none absolute" style={pos}>
      <PetToken ownerId={ownerId} pet={pet} size={size} />
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
  const W = size.width;
  const H = size.height;

  // 敵: 上側 58%。味方: 下側。人数が増えたら小さくする
  const nE = enemies.length;
  const enemySlotW = W / nE;
  const enemyTop = 4;
  const enemyInfoH = 14 + 14 + 26 + 18; // 名前 + HP + 行動の予告 + 状態異常
  const enemySpriteH = Math.max(40, Math.min(H * 0.58 - enemyInfoH, enemySlotW * 1.15));
  const nA = allies.length;
  const allyAreaW = nA <= 2 ? W * 0.62 : W;
  const allyH = Math.max(48, Math.min(H * 0.42, (allyAreaW / nA) * 1.25));

  return (
    <div ref={ref} className="relative min-h-[190px] flex-1 overflow-hidden">
      <BattleBackground kind={bgKind} className="absolute inset-0 h-full w-full" />
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
              spriteH={enemySpriteH}
            />
          ))}
          {allies.map((a, i) => (
            <AllySprite
              key={a.id}
              ally={a}
              left={(allyAreaW / nA) * (i + 0.5) + (nA <= 2 ? W * 0.02 : 0)}
              bottom={6 + (nA >= 3 && i % 2 === 1 ? 8 : 0)}
              h={allyH}
              active={a.id === activeId && phase === 'ally'}
            />
          ))}
        </>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-[46%] z-40 flex justify-center">
        <SlotOverlay />
      </div>
      <PhaseBanner />
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

/** フェーズが変わった時に一瞬出る帯（操作をブロックしない） */
function PhaseBanner() {
  const phase = useBattle((s) => s.battle.phase);
  const turn = useBattle((s) => s.battle.turn);
  const fast = useBattle((s) => s.settings.fastMode);
  if (phase !== 'ally' && phase !== 'enemy') return null;
  const k = 1 / speedFactor({ fastMode: fast });
  return (
    <motion.div
      key={`${phase}-${turn}`}
      initial={{ opacity: 0, scaleX: 0.6 }}
      animate={{ opacity: [0, 1, 1, 0], scaleX: [0.6, 1, 1, 1.05] }}
      transition={{ duration: (TIMING.resultPopup + 0.4) * k, times: [0, 0.2, 0.75, 1] }}
      className="pointer-events-none absolute inset-x-0 top-[40%] z-30 flex justify-center"
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
