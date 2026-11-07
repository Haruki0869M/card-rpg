import { PLAYER_COLOR } from '../../data/theme';
// ===== 味方のステータス枠（顔・HP・マナ・フォーカス・被弾予定・担当プレイヤー） =====
import { Star } from 'lucide-react';
import { memo } from 'react';
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
      className={`panel relative flex min-w-0 flex-1 flex-col gap-[3px] rounded-xl px-1.5 pt-1 pb-1 transition-[transform,opacity,filter,box-shadow] duration-150 active:scale-[.97] ${
        ally.dead ? 'opacity-50 grayscale' : done && !active ? 'opacity-60' : ''
      }`}
      style={
        active
          ? { transform: 'translateY(-6px)', boxShadow: '0 0 16px rgba(255,200,90,.65), 0 0 4px rgba(255,220,140,.9), 0 6px 10px rgba(0,0,0,.6)' }
          : undefined
      }
    >
      <span className="absolute top-0 left-2 h-[3px] w-6 rounded-b" style={{ background: PLAYER_COLOR[ally.playerId] }} />
      {battle.readyCheck && battle.phase === 'ally' && !ally.dead && battle.ready?.includes(ally.playerId) && (
        <span className="absolute -top-2 right-1 z-10 rounded-full bg-emerald-500 px-1.5 text-[12px] leading-4 font-bold text-black">準備完了</span>
      )}
      <div className="flex items-center gap-1">
        <span className={`min-w-0 flex-1 truncate text-[12px] leading-[14px] font-bold ${active ? 'text-amber-100' : 'text-zinc-200'}`}>{ally.name}</span>
        {/* 被弾の予告（HPバーの上の赤い点滅と同じ量） */}
        {!ally.dead && incoming > 0 && (
          <span className={`absolute top-[14px] -right-1 z-10 rounded-full px-1.5 text-[12px] leading-4 font-black tabular-nums shadow-[0_2px_4px_rgba(0,0,0,.7)] ${lethal ? 'blink-red bg-red-600 text-white' : 'bg-red-950 text-red-200 ring-1 ring-red-500'}`} data-incoming={incoming}>
            {lethal ? '☠' : ''}-{incoming}
          </span>
        )}
      </div>
      <HpBar hp={ally.hp} max={ally.maxHp} block={ally.block} tone="ally" height={12} incoming={ally.dead ? 0 : incoming} />
      <div className="flex items-center gap-1.5 text-[12px] leading-none font-bold tabular-nums">
        {/* 残りのマナ（カードのコストの宝石と同じ青）は大きく */}
        <span className="flex items-center gap-0.5 text-sky-200" aria-label="マナ">
          <span
            className="font-display flex h-[20px] w-[20px] items-center justify-center text-[14px] text-white"
            style={{ clipPath: 'polygon(50% 0,100% 30%,100% 70%,50% 100%,0 70%,0 30%)', background: 'linear-gradient(160deg,#d8f0ff 0%,#4aa0ff 40%,#1a4ab0 75%,#0a1e5a 100%)' }}
          >
            {ally.mana}
          </span>
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
        <span className={`ml-auto ${usable > 0 ? 'text-zinc-200' : 'text-zinc-500'}`}>{ally.dead ? '戦闘不能' : !mine ? '' : done ? '済' : `${usable}枚`}</span>
      </div>
      <div className="absolute -top-2 right-0.5">
        <StatusChips s={ally.statuses} side="ally" onTap={() => setActive(ally.id)} />
      </div>
      {/* 呼び出したお供（幻獣・獣など）: 枠の左上に小さく。ターン終了時に攻撃する */}
      {!ally.dead && ally.airborne && <span className="absolute -top-3 left-7 rounded-full bg-sky-950 px-1 text-[12px] text-sky-100" data-airborne>跳躍中</span>}
      {!ally.dead && !!ally.summons?.length && (
        <div className="absolute -top-3 left-7 flex gap-0.5" data-summons>
          {ally.summons.slice(0, 2).map((m) => (
            <span key={m.id} className="summon-bob flex h-[20px] items-center gap-px rounded-full bg-black/80 px-1 text-[12px] leading-none ring-1 ring-violet-300/60" aria-label={`${m.name}（あと${m.turns >= 99 ? 'ずっと' : `${m.turns}ターン`}）`}>
              <span aria-hidden>{m.icon}</span>
              {m.turns < 99 && <span className="font-bold text-violet-200 tabular-nums">{m.turns}</span>}
            </span>
          ))}
          {ally.summons.length > 2 && <span className="flex h-[20px] items-center rounded-full bg-black/80 px-1 text-[12px] font-bold text-violet-200">×{ally.summons.length}</span>}
        </div>
      )}
    </div>
  );
});

export function PartyStrip() {
  const allies = useBattle((s) => s.battle.allies);
  return (
    <div className="flex gap-1 px-1.5 pt-3 pb-1">
      {allies.map((a) => (
        <AllyCard key={a.id} ally={a} />
      ))}
    </div>
  );
}
