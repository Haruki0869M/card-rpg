import { AnimatePresence, motion } from 'framer-motion';
import { TIMING } from '../data/balance';
import { getCard } from '../data/cards';
import { getCharacter } from '../data/characters';
import { getEnemy } from '../data/enemies';
import { findAlly, incomingDamage, isDone, tierDamageAgainst, tierIndex, usableCardCount } from '../engine';
import { usePress } from '../hooks/usePress';
import { speedFactor, useBattle } from '../store/battleStore';
import type { AllyState, EnemyState, Statuses } from '../types';
import { intentView, STATUS_INFO } from './format';

// ---------- 共通部品 ----------

function HpBar({ hp, max, block, tone }: { hp: number; max: number; block: number; tone: 'enemy' | 'ally' }) {
  const ratio = Math.max(0, hp / max);
  return (
    <div className="relative h-4 w-full overflow-hidden rounded-sm border border-black/60 bg-black/60">
      <div
        className={`absolute inset-y-0 left-0 w-full origin-left transition-transform duration-200 ${
          tone === 'enemy' ? 'bg-red-700' : 'bg-emerald-600'
        }`}
        style={{ transform: `scaleX(${ratio})` }}
      />
      <div className="relative flex h-full items-center justify-center text-[12px] leading-none font-bold text-white tabular-nums">
        {hp}/{max}
      </div>
      {block > 0 && (
        <div className="absolute inset-0 rounded-sm border-2 border-sky-300/90" aria-hidden />
      )}
    </div>
  );
}

function BlockBadge({ block }: { block: number }) {
  if (block <= 0) return null;
  return (
    <span className="inline-flex items-center rounded bg-sky-700/90 px-1 text-[12px] leading-4 font-bold text-white tabular-nums">
      🛡{block}
    </span>
  );
}

function StatusChip({
  status,
  amount,
  side,
  by,
  onTap,
}: {
  status: 'vulnerable' | 'weak' | 'taunt';
  amount: number;
  side: 'ally' | 'enemy';
  by?: string;
  onTap?: () => void;
}) {
  const press = usePress(onTap, { type: 'status', status, amount, side, by });
  const info = STATUS_INFO[status];
  return (
    <span
      {...press}
      className="inline-flex items-center rounded bg-black/50 px-0.5 text-[12px] leading-4 text-amber-100 tabular-nums"
    >
      {info.icon}
      {status === 'taunt' ? (by ? getCharacter(by).icon : '') : amount}
    </span>
  );
}

function StatusRow({ s, side, onTap, tauntedBy }: { s: Statuses; side: 'ally' | 'enemy'; onTap?: () => void; tauntedBy?: string }) {
  return (
    <div className="flex min-h-4 flex-wrap justify-center gap-0.5">
      {s.vulnerable > 0 && <StatusChip status="vulnerable" amount={s.vulnerable} side={side} onTap={onTap} />}
      {s.weak > 0 && <StatusChip status="weak" amount={s.weak} side={side} onTap={onTap} />}
      {tauntedBy && <StatusChip status="taunt" amount={1} side={side} by={tauntedBy} onTap={onTap} />}
    </div>
  );
}

function UnitPopups({ unitId }: { unitId: string }) {
  const popups = useBattle((s) => s.popups);
  const settings = useBattle((s) => s.settings);
  const dur = TIMING.resultPopup / speedFactor(settings);
  const mine = popups.filter((p) => p.unitId === unitId);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-6 z-20 flex flex-col items-center">
      <AnimatePresence>
        {mine.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, y: 0, scale: 1.25 }}
            animate={{ opacity: 0, y: -26, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur, ease: 'easeOut' }}
            className={`absolute text-[18px] font-black drop-shadow-[0_1px_0_#000] ${
              p.tone === 'damage'
                ? 'text-red-400'
                : p.tone === 'block'
                  ? 'text-sky-300'
                  : p.tone === 'status'
                    ? 'text-fuchsia-300'
                    : 'text-zinc-300'
            }`}
            style={{ top: i * 4 }}
          >
            {p.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------- 敵 ----------

function useSelectedCard() {
  const selection = useBattle((s) => s.selection);
  const battle = useBattle((s) => s.battle);
  const activeId = useBattle((s) => s.activeId);
  const ally = findAlly(battle, activeId);
  const inst = selection && ally?.hand.find((c) => c.uid === selection.cardUid);
  if (!selection || !ally || !inst) return null;
  return { selection, ally, card: getCard(inst.cardId) };
}

function IntentChip({ enemy, onTap }: { enemy: EnemyState; onTap: () => void }) {
  const battle = useBattle((s) => s.battle);
  const retargetKey = useBattle((s) => s.retargets[enemy.uid] ?? 0);
  const press = usePress(onTap, { type: 'intent', uid: enemy.uid });
  const view = intentView(battle, enemy);
  return (
    <div {...press} className="flex h-9 w-full items-center justify-center">
      {view ? (
        <motion.div
          key={retargetKey}
          initial={retargetKey ? { scale: 1.35, backgroundColor: 'rgba(250,204,21,0.6)' } : false}
          animate={{ scale: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
          transition={{ duration: 0.3 }}
          className="flex max-w-full items-center gap-1 rounded-md border border-white/15 px-1 py-0.5 text-[13px] leading-5 font-bold whitespace-nowrap"
        >
          {view.parts.map((p, i) => (
            <span key={i} className={`flex items-center ${p.danger ? 'text-red-300' : 'text-sky-200'}`}>
              <span className="text-[12px]">{p.icon}</span>
              {p.target && <span className="text-[12px]">{p.target}</span>}
              <span className="tabular-nums">{p.text}</span>
            </span>
          ))}
        </motion.div>
      ) : (
        <span className="text-[12px] text-zinc-500">{enemy.dead ? '' : '…'}</span>
      )}
    </div>
  );
}

function EnemyUnit({ enemy }: { enemy: EnemyState }) {
  const def = getEnemy(enemy.defId);
  const tapEnemy = useBattle((s) => s.tapEnemy);
  const acting = useBattle((s) => s.actingEnemy === enemy.uid && s.battle.phase === 'enemy');
  const sel = useSelectedCard();
  const onTap = () => tapEnemy(enemy.uid);
  const press = usePress(onTap, { type: 'enemy', uid: enemy.uid });

  const targetable = !!sel && sel.card.target === 'enemy' && !enemy.dead;
  const isTarget = targetable && sel!.selection.targetId === enemy.uid;
  const waitingTarget = targetable && !sel!.selection.targetId;

  let prediction: string | null = null;
  if (targetable && sel!.card.tiers.some((t) => t.effects.some((e) => e.kind === 'damage'))) {
    const dmg = tierDamageAgainst(sel!.ally, sel!.card, enemy);
    const from = tierIndex(sel!.card, sel!.selection.focus);
    const range = dmg.slice(from).filter((d) => d > 0);
    if (range.length) {
      const lo = Math.min(...range);
      const hi = Math.max(...range);
      prediction = lo === hi ? `${lo}` : `${lo}〜${hi}`;
    }
  }

  return (
    <motion.div
      {...press}
      data-enemy={enemy.uid}
      data-dead={enemy.dead || undefined}
      data-hp={enemy.hp}
      whileTap={{ scale: 0.97 }}
      animate={acting ? { y: [0, 10, 0] } : { y: 0 }}
      transition={{ duration: 0.25 }}
      className={`relative flex min-w-0 flex-1 flex-col items-center rounded-lg border px-1 pb-1 ${
        isTarget
          ? 'border-amber-300 bg-amber-900/30'
          : targetable
            ? 'border-amber-200/60 bg-white/5'
            : 'border-white/10 bg-black/25'
      } ${enemy.dead ? 'opacity-35 grayscale' : ''}`}
    >
      {waitingTarget && <div className="glow-pulse pointer-events-none absolute -inset-0.5 rounded-lg border-2 border-amber-300" />}
      <IntentChip enemy={enemy} onTap={onTap} />
      <div className="relative flex h-11 items-center justify-center text-[34px] leading-none">
        {def.icon}
        {isTarget && <span className="absolute -right-4 -top-1 text-[16px]">🎯</span>}
      </div>
      <div className="w-full truncate text-center text-[12px] leading-4 text-zinc-200">{def.name}</div>
      <div className="mt-0.5 flex w-full items-center gap-0.5">
        <BlockBadge block={enemy.block} />
        <HpBar hp={enemy.hp} max={enemy.maxHp} block={enemy.block} tone="enemy" />
      </div>
      <div className="mt-0.5">
        <StatusRow s={enemy.statuses} side="enemy" onTap={onTap} tauntedBy={enemy.tauntedBy} />
      </div>
      {prediction && (
        <div className="pointer-events-none absolute inset-x-0 top-9 flex justify-center">
          <span className="rounded bg-red-900/95 px-1.5 text-[13px] leading-5 font-black text-amber-100 tabular-nums ring-1 ring-red-300">
            予測 {prediction}
          </span>
        </div>
      )}
      {enemy.dead && <div className="absolute inset-0 flex items-center justify-center text-[14px] font-bold text-zinc-300">撃破</div>}
      <UnitPopups unitId={enemy.uid} />
    </motion.div>
  );
}

export function EnemyRow() {
  const enemies = useBattle((s) => s.battle.enemies);
  return (
    <div className="flex gap-1.5 px-2">
      {enemies.map((e) => (
        <EnemyUnit key={e.uid} enemy={e} />
      ))}
    </div>
  );
}

// ---------- 味方 ----------

function FocusOrbs({ n, max = 6, spend = 0 }: { n: number; max?: number; spend?: number }) {
  return (
    <div className="flex justify-center gap-px" aria-label={`フォーカス ${n}`}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full border ${
            i < n - spend
              ? 'border-amber-200 bg-amber-400'
              : i < n
                ? 'border-amber-200 bg-amber-400/30'
                : 'border-zinc-600 bg-transparent'
          }`}
        />
      ))}
    </div>
  );
}

function AllyFrame({ ally }: { ally: AllyState }) {
  const def = getCharacter(ally.id);
  const battle = useBattle((s) => s.battle);
  const activeId = useBattle((s) => s.activeId);
  const selection = useBattle((s) => s.selection);
  const setActive = useBattle((s) => s.setActive);
  const press = usePress(() => setActive(ally.id), { type: 'ally', id: ally.id });
  const active = activeId === ally.id && battle.phase === 'ally';
  const done = battle.phase === 'ally' && isDone(battle, ally);
  const incoming = incomingDamage(battle, ally);
  const lethal = !ally.dead && incoming >= ally.hp && incoming > 0;
  const usable = usableCardCount(battle, ally);
  const spend = active && selection ? selection.focus : 0;

  return (
    <motion.div
      {...press}
      data-ally={ally.id}
      data-dead={ally.dead || undefined}
      data-done={done || undefined}
      whileTap={{ scale: 0.96 }}
      className={`relative flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg border px-1 py-1 ${
        active ? 'border-amber-300 bg-amber-950/50 ring-1 ring-amber-300' : 'border-white/10 bg-black/30'
      } ${ally.dead ? 'grayscale opacity-50' : done && !active ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-0.5 text-[12px] leading-4">
        <span className="text-[14px]">{def.icon}</span>
        <span className="truncate font-bold">{def.name}</span>
      </div>
      <div className="flex items-center gap-0.5">
        <BlockBadge block={ally.block} />
        <HpBar hp={ally.hp} max={ally.maxHp} block={ally.block} tone="ally" />
      </div>
      <div className="flex items-center justify-between text-[12px] leading-4 tabular-nums">
        <span className="text-sky-300">💧{ally.mana}</span>
        <span className={usable > 0 ? 'text-zinc-200' : 'text-zinc-500'}>{ally.dead ? '' : done ? '完了' : `可${usable}`}</span>
      </div>
      <FocusOrbs n={ally.focus} spend={spend} />
      <div
        className={`flex items-center justify-center rounded text-[12px] leading-4 font-bold tabular-nums ${
          ally.dead
            ? 'text-zinc-500'
            : lethal
              ? 'blink-red bg-red-700 text-white'
              : incoming > 0
                ? 'bg-red-950/70 text-red-300'
                : 'bg-emerald-950/60 text-emerald-300'
        }`}
      >
        {ally.dead ? '戦闘不能' : `${lethal ? '☠' : ''}被弾 ${incoming}`}
      </div>
      <StatusRow s={ally.statuses} side="ally" onTap={() => setActive(ally.id)} />
      <UnitPopups unitId={ally.id} />
    </motion.div>
  );
}

export function PartyRow() {
  const allies = useBattle((s) => s.battle.allies);
  return (
    <div className="flex gap-1.5 px-2">
      {allies.map((a) => (
        <AllyFrame key={a.id} ally={a} />
      ))}
    </div>
  );
}

export { FocusOrbs };
