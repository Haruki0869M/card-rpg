import { facilityMembers, facilityVisit } from '../../engine/game/world/facilities';
import { isLocalPlayer } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import type { GameCommand, GameState } from '../../types';

export function FacilityRoster({ game, selected, onSelect }: { game: GameState; selected?: string; onSelect?: (id: string) => void }) {
  const v = facilityVisit(game);
  return <div className="my-2 flex flex-wrap gap-1" data-facility-members>{game.heroes.filter(h => facilityMembers(game).includes(h.id)).map(h => <button key={h.id} disabled={!onSelect || !isLocalPlayer(h.playerId) || v?.finished?.includes(h.id)} onClick={() => onSelect?.(h.id)} className={`btn min-h-11 rounded-lg border px-2 text-[12px] ${selected === h.id ? 'border-amber-300 bg-amber-950' : 'border-white/20 bg-black/40'}`}>{h.playerId}・{h.name}{v?.finished?.includes(h.id) ? '：利用終了' : '：利用中'}</button>)}</div>;
}

export function FacilityExit({ game }: { game: GameState }) {
  const dispatch = useBattle(s => s.dispatchGame);
  const v = facilityVisit(game);
  const pending = game.heroes.filter(h => facilityMembers(game).includes(h.id) && !v?.finished?.includes(h.id) && isLocalPlayer(h.playerId) && h.hp > 0 && !h.retired);
  const type = game.mode === 'town' ? 'LEAVE_TOWN' : game.mode === 'shrine' ? 'LEAVE_SHRINE' : 'LEAVE_SANCTUARY';
  return <div className="mt-1"><p className="mb-1 text-center text-[12px] text-zinc-300">全員の利用終了後に地図へ戻ります</p><button disabled={!pending.length} className="btn btn-gold min-h-12 w-full rounded-xl text-[15px] font-bold" onClick={() => { for (const h of pending) dispatch({ type, playerId: h.playerId, heroId: h.id } as GameCommand); }}>{pending.length ? '世界マップへ' : '仲間の利用終了を待っています'}</button></div>;
}
