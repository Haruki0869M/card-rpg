// ===== 世界マップのマスの場面（イベント・宝箱・祠）で、手番でない人の画面に出す覆い =====
// 2人以上のプレイヤーがいる宝箱（開け役の投票・取り合い）では出さない（showTurnLock）。宝箱の画面が押せる人を出し分ける
import { PLAYER_COLOR } from '../../data/theme';
import { LAYER } from './layers';
import { isLocalPlayer } from '../../store/battleConfig';
import { useBattle } from '../../store/battleStore';
import { useOnline } from '../../store/onlineStore';
import { showTurnLock } from '../screens/worldTurnGate';

export function TurnLock() {
  const game = useBattle((s) => s.game);
  const screen = useBattle((s) => s.screen);
  useOnline((s) => s.tick);
  if (!game || screen !== 'game' || !showTurnLock(game, isLocalPlayer)) return null;
  const turnHero = game.heroes.find((h) => h.id === (game.mode === 'shrine' ? game.shrine?.heroId : game.world!.turn))!;
  const who = useOnline.getState().room?.seatName(turnHero.playerId) ?? turnHero.playerId;
  return (
    <div style={{ zIndex: LAYER.turnLock }} className="absolute inset-x-0 bottom-0 flex h-[34%] items-center justify-center bg-gradient-to-t from-black via-black/90 to-black/40 px-4" role="status" data-turn-lock>
      <div className="flex items-center gap-1.5 text-[14px] text-zinc-100">
        <span className="rounded px-1 text-[12px] font-bold text-black" style={{ background: PLAYER_COLOR[turnHero.playerId] }}>
          {turnHero.playerId}
        </span>
        {who}さんが{turnHero.name}で選んでいます
      </div>
    </div>
  );
}
