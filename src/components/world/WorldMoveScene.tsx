// ===== 世界マップの移動の演出（1マスずつ → 到着 → 次の場面） =====
// 以前は移動のたびに別の画面へ差し替えていたが、それだと地図と駒が作り直され、地図の大きさやカメラも変わって
// 止まっている駒が湧き直したり、ずれたりして見えた。今は WorldScreen の同じ地図の上で再生する。
// ゲーム状態の確定とは独立した表示。到着するまで次の場面を出さない。
import { useEffect, useState } from 'react';
import { TIMING } from '../../data/balance';
import { speedFactor, useBattle, type WorldMovePresentation } from '../../store/battleStore';
import type { GameState } from '../../types';

export interface MovePlayback {
  i: number;
  arrived: boolean;
  path: number[];
  heroes: string[];
  seq: number;
}

/** 移動の再生位置（何マス目か・到着したか）。移動ごとに最初から数え直す */
export function useMovePlayback(move: WorldMovePresentation | undefined): MovePlayback | undefined {
  const [st, setSt] = useState<{ id: number; i: number; arrived: boolean } | undefined>();
  const fastMode = useBattle((s) => s.settings.fastMode);
  const finish = useBattle((s) => s.finishWorldMove);
  const cur = move && st?.id === move.id ? st : move ? { id: move.id, i: 0, arrived: false } : undefined;
  const lm = move?.game.world?.lastMove;
  const speed = speedFactor({ fastMode });
  useEffect(() => {
    if (!move || !cur || !lm) return;
    const delay = (cur.arrived ? TIMING.worldArrival : TIMING.worldMoveStep) * 1000 / speed;
    const timer = setTimeout(() => {
      if (cur.arrived) finish(move.id);
      else if (cur.i < lm.path.length - 1) setSt({ id: move.id, i: cur.i + 1, arrived: false });
      else setSt({ id: move.id, i: cur.i, arrived: true });
    }, delay);
    return () => clearTimeout(timer);
  }, [move, cur?.id, cur?.i, cur?.arrived, speed, finish, lm]);
  if (!move || !cur || !lm) return undefined;
  return { i: cur.i, arrived: cur.arrived, path: lm.path, heroes: lm.heroes, seq: lm.seq };
}

/** 到着したら新しい視界・敵を見せる。手番と行動済みは移動前のまま（到着の瞬間に光る駒や並びが入れ替わらないように） */
export function arrivalView(move: WorldMovePresentation): GameState {
  const after = move.game, before = move.before;
  if (!before?.world || !after.world) return after;
  return { ...after, world: { ...after.world, turn: before.world.turn, acted: before.world.acted } };
}

/** 到着したところに何かあるか（「！」を付けるか） */
export function moveDiscovery(move: WorldMovePresentation) {
  const w = move.game.world!;
  const lm = w.lastMove!;
  const feature = w.tiles[lm.path[lm.path.length - 1]].f;
  return move.game.mode === 'encounter' || move.game.mode === 'event' || !!feature || !!w.story;
}

/** 下の操作パネルの上に重ねる帯。パネルの大きさは変えないので、地図の大きさやカメラは動かない */
export function MoveStatus({ move, playback }: { move: WorldMovePresentation; playback: MovePlayback }) {
  const { i, arrived, path } = playback;
  const discovery = moveDiscovery(move);
  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-1 rounded-t-2xl bg-[#0b0910]/[.97] px-3 text-center backdrop-blur-sm"
      data-world-moving={arrived ? 'arrival' : 'steps'}
      data-move-index={i}
      data-move-length={path.length}
    >
      <div className="text-[16px] font-bold text-amber-100" role="status">{arrived ? (discovery ? '！ 到着しました' : '到着しました') : '移動中…'}</div>
      <div className="text-[13px] text-zinc-300">{arrived ? '周囲を確かめています' : `${i} / ${path.length - 1} マス`}</div>
    </div>
  );
}
