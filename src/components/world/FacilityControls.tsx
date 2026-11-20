import { facilityMembers, facilityVisit } from '../../engine/game/world/facilities';
import { isLocalPlayer } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import type { GameCommand, GameState } from '../../types';
import { SeatChip, WaitNotes } from '../screens/OnlineScreens';
import { facilityWaits } from '../screens/waitNotes';

// oneRow（2026-11-20 オーナーの決定 A・検証 bot の4人の通しの指摘）: 低い町の画面では、札を横1列にする（入りきらない時は横に送れる）。
// 4人の時、札が縦に3つ並んで、店の一覧と「町を出る」を画面の外へ押し出していた（360×640 で一覧 70px）
export function FacilityRoster({ game, selected, onSelect, oneRow = false }: { game: GameState; selected?: string; onSelect?: (id: string) => void; oneRow?: boolean }) {
  const v = facilityVisit(game);
  return <div className={oneRow ? 'my-1 flex flex-nowrap gap-1 overflow-x-auto overscroll-contain' : 'my-2 flex flex-wrap gap-1'} data-facility-members data-one-row={oneRow ? 1 : undefined}>{game.heroes.filter(h => facilityMembers(game).includes(h.id)).map(h => <button key={h.id} disabled={!onSelect || !isLocalPlayer(h.playerId) || v?.finished?.includes(h.id)} onClick={() => onSelect?.(h.id)} className={`btn min-h-11 rounded-lg border px-2 text-[12px] ${oneRow ? 'shrink-0 whitespace-nowrap' : ''} ${selected === h.id ? 'border-amber-300 bg-amber-950' : 'border-white/20 bg-black/40'}`}>{h.playerId}・{h.name}{v?.finished?.includes(h.id) ? '：利用終了' : '：利用中'}</button>)}</div>;
}

// compact（同じ決定 A）: 低い町の画面では、待ちの文を1行にまとめる（「P1 P2 P4 が、まだ町を利用しています」。2人以上を待っている時だけ）
export function FacilityExit({ game, compact = false }: { game: GameState; compact?: boolean }) {
  const dispatch = useBattle(s => s.dispatchGame);
  const v = facilityVisit(game);
  const pending = game.heroes.filter(h => facilityMembers(game).includes(h.id) && !v?.finished?.includes(h.id) && isLocalPlayer(h.playerId) && h.hp > 0 && !h.retired);
  const type = game.mode === 'town' ? 'LEAVE_TOWN' : game.mode === 'shrine' ? 'LEAVE_SHRINE' : 'LEAVE_SANCTUARY';
  // 回3 A: 自分の分を終えて待っている時は、だれが何をしているかを出す
  const waits = pending.length ? [] : facilityWaits(game, isLocalPlayer);
  return <div className="mt-1"><p className="mb-1 text-center text-[12px] text-zinc-300">全員の利用終了後に地図へ戻ります</p>{compact && waits.length >= 2 ? (
    <div className="mb-1 flex items-center gap-1 rounded-xl bg-black/50 px-2 py-1 text-[13px] leading-5 text-zinc-100" role="status" data-wait-notes data-wait-compact>
      {waits.map((n) => <SeatChip key={n.playerId} p={n.playerId} small />)}
      <span className="min-w-0 truncate">が、{waits[0].what.slice(waits[0].what.indexOf('まだ'))}</span>
    </div>
  ) : <WaitNotes notes={waits} className="mb-1" />}<button disabled={!pending.length} className="btn btn-gold min-h-12 w-full rounded-xl text-[15px] font-bold" data-facility-exit={pending.length ? 'go' : 'wait'} onClick={() => { for (const h of pending) dispatch({ type, playerId: h.playerId, heroId: h.id } as GameCommand); }}>{pending.length ? '世界マップへ' : '仲間の利用終了を待っています'}</button></div>;
}
