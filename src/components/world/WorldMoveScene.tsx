import { useEffect, useState } from 'react';
import { TIMING } from '../../data/balance';
import { speedFactor, useBattle, type WorldMovePresentation } from '../../store/battleStore';
import { Screen } from '../ui/game';
import { WorldMap } from './WorldMap';

/** ゲーム状態の確定とは独立した表示。到着するまで次の場面を出さない。 */
export function WorldMoveScene({ move }: { move: WorldMovePresentation }) {
  const [i, setIndex] = useState(0), [arrived, setArrived] = useState(false);
  const fastMode = useBattle(s => s.settings.fastMode), finish = useBattle(s => s.finishWorldMove);
  const lm = move.game.world!.lastMove!;
  const speed = speedFactor({ fastMode });
  useEffect(() => {
    const delay = (arrived ? TIMING.worldArrival : TIMING.worldMoveStep) * 1000 / speed;
    const timer = setTimeout(() => {
      if (arrived) finish(move.id);
      else if (i < lm.path.length - 1) setIndex(i + 1);
      else setArrived(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [i, arrived, speed, move.id, finish, lm.path.length]);
  const destination = lm.path[lm.path.length - 1], feature = move.game.world!.tiles[destination].f;
  const discovery = move.game.mode === 'encounter' || move.game.mode === 'event' || !!feature || !!move.game.world!.story;
  return <Screen>
    <div className="flex min-h-0 flex-1 flex-col" data-world-moving={arrived ? 'arrival' : 'steps'} data-move-index={i} data-move-length={lm.path.length}>
      <div className="shrink-0 p-3 text-center text-[16px] font-bold text-amber-100" role="status">{arrived ? (discovery ? '！ 到着しました' : '到着しました') : '移動中…'}</div>
      <WorldMap game={move.game} movement={{ ...lm, i, arrived }} onTapTile={() => {}} />
      <div className="shrink-0 p-3 text-center text-[13px] text-zinc-300">{arrived ? '周囲を確かめています' : `${i} / ${lm.path.length - 1} マス`}</div>
    </div>
  </Screen>;
}
