// ===== 手番の人だけが操作する場面（世界マップのマスの祠・イベント・宝箱）で、他の人の画面に出す表示（M3-C） =====
// 画面の下の操作の上に重ねて、押せないようにする（見ることはできる）
import { PLAYER_COLOR } from '../../data/theme';
import { isLocalPlayer } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';

export function TurnLock() {
  const game = useBattle((s) => s.game);
  const screen = useBattle((s) => s.screen);
  useOnline((s) => s.tick);
  if (!game || screen !== 'game' || !game.world || game.activeScene) return null;
  const onTile = (game.mode === 'event' && game.event?.tile !== undefined) || (game.mode === 'chest' && game.chest?.tile !== undefined) || game.mode === 'shrine';
  if (!onTile) return null;
  const turnHero = game.heroes.find((h) => h.id === (game.mode === 'shrine' ? game.shrine?.heroId : game.world!.turn));
  if (!turnHero || isLocalPlayer(turnHero.playerId)) return null;
  const who = useOnline.getState().room?.seatName(turnHero.playerId) ?? turnHero.playerId;
  return (
    <div className="absolute inset-x-0 bottom-0 z-[55] flex h-[34%] items-center justify-center bg-gradient-to-t from-black via-black/90 to-black/40 px-4" role="status">
      <div className="flex items-center gap-1.5 text-[14px] text-zinc-100">
        <span className="rounded px-1 text-[12px] font-bold text-black" style={{ background: PLAYER_COLOR[turnHero.playerId] }}>
          {turnHero.playerId}
        </span>
        {who}さんが{turnHero.name}で選んでいます
      </div>
    </div>
  );
}
