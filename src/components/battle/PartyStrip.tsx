import { PLAYER_COLOR } from '../../data/theme';
// ===== 味方のステータス枠（顔・HP・マナ・フォーカス・被弾予定・担当プレイヤー） =====
import { Droplet, Star } from 'lucide-react';
import { memo } from 'react';
import { CharacterArt } from '../../art';
import { getClass } from '../../data/classes';
import { incomingDamage, isDone, usableCardCount } from '../../engine';
import { usePress } from '../../hooks/usePress';
import { isLocalPlayer } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import type { AllyState } from '../../types';
import { HpBar } from '../ui/HpBar';
import { StatusChips } from '../ui/StatusChips';

export { PLAYER_COLOR };

const AllyCard = memo(function AllyCard({ ally }: { ally: AllyState }) {
  const battle = useBattle((s) => s.battle);
  const activeId = useBattle((s) => s.activeId);
  const spend = useBattle((s) => (s.selection && s.activeId === ally.id ? s.selection.focus : 0));
  const setActive = useBattle((s) => s.setActive);
  const press = usePress(() => setActive(ally.id), { type: 'ally', id: ally.id });
  const cls = getClass(ally.classId);
  const active = activeId === ally.id && battle.phase === 'ally';
  const mine = isLocalPlayer(ally.playerId);
  const done = battle.phase === 'ally' && isDone(battle, ally);
  const incoming = incomingDamage(battle, ally);
  const lethal = !ally.dead && incoming >= ally.hp && incoming > 0;
  const usable = usableCardCount(battle, ally);

  return (
    <div
      {...press}
      data-ally={ally.id}
      data-dead={ally.dead || undefined}
      data-done={done || undefined}
      className={`panel relative flex min-w-0 flex-1 flex-col gap-[3px] rounded-lg px-1 pt-1 pb-1 transition-[opacity,filter] duration-150 active:scale-[.97] ${
        ally.dead ? 'opacity-50 grayscale' : done && !active ? 'opacity-60' : ''
      }`}
      style={
        active
          ? { borderColor: '#ffd36a', boxShadow: '0 0 0 1.5px #ffd36a, 0 0 14px rgba(255,200,90,.45), inset 0 1px 0 rgba(255,236,190,.15)' }
          : undefined
      }
    >
      <span className="absolute top-0 left-2 h-[3px] w-6 rounded-b" style={{ background: PLAYER_COLOR[ally.playerId] }} />
      <div className="flex items-center gap-1">
        <span
          className="relative h-[28px] w-[28px] shrink-0 overflow-hidden rounded-full border-2 bg-[#1d2440]"
          style={{ borderColor: cls.color }}
        >
          <CharacterArt classId={ally.classId} gender={ally.gender} face className="h-full w-full" />
        </span>
        <div className="min-w-0 flex-1 leading-[13px]">
          <div className="truncate text-[12px] font-bold text-amber-50">{ally.name}</div>
          <div className="truncate text-[12px] text-zinc-400">{cls.name}</div>
        </div>
      </div>
      <HpBar hp={ally.hp} max={ally.maxHp} block={ally.block} tone="ally" height={12} />
      <div className="flex items-center justify-between text-[12px] leading-none font-bold tabular-nums">
        <span className="flex items-center gap-px text-sky-300">
          <Droplet size={12} strokeWidth={2.8} className="fill-sky-500/60" />
          {ally.mana}
        </span>
        <span className="flex items-center gap-px text-amber-300">
          <Star size={12} strokeWidth={2.8} className="fill-amber-400/70" />
          {spend ? (
            <>
              {ally.focus - spend}
              <span className="text-amber-500/70">/{ally.focus}</span>
            </>
          ) : (
            ally.focus
          )}
        </span>
        <span className={usable > 0 ? 'text-zinc-200' : 'text-zinc-500'}>
          {ally.dead || !mine ? '' : done ? '済' : `${usable}枚`}
        </span>
      </div>
      <div
        className={`flex h-[17px] items-center justify-center rounded text-[12px] leading-none font-black tabular-nums ${
          ally.dead
            ? 'bg-black/40 text-zinc-500'
            : lethal
              ? 'blink-red bg-red-600 text-white'
              : incoming > 0
                ? 'bg-red-950/80 text-red-300'
                : 'bg-emerald-950/70 text-emerald-300'
        }`}
      >
        {ally.dead ? '戦闘不能' : `${lethal ? '☠ ' : ''}被弾 ${incoming}`}
      </div>
      <div className="absolute -top-2 right-0.5">
        <StatusChips s={ally.statuses} side="ally" onTap={() => setActive(ally.id)} />
      </div>
    </div>
  );
});

export function PartyStrip() {
  const allies = useBattle((s) => s.battle.allies);
  return (
    <div className="flex gap-1 px-1.5 pt-2.5 pb-1">
      {allies.map((a) => (
        <AllyCard key={a.id} ally={a} />
      ))}
    </div>
  );
}
