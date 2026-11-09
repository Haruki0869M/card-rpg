// ===== 世界マップの移動の演出（1マスずつ → 到着 → 次の場面） =====
// 以前は移動のたびに別の画面へ差し替えていたが、それだと地図と駒が作り直され、地図の大きさやカメラも変わって
// 止まっている駒が湧き直したり、ずれたりして見えた。今は WorldScreen の同じ地図の上で再生する。
// ゲーム状態の確定とは独立した表示。到着するまで次の場面を出さない。
import { useEffect, useState } from 'react';
import { TIMING } from '../../data/balance';
import { speedFactor, useBattle, type WorldMovePresentation } from '../../store/battleStore';
import type { GameState } from '../../types';
import { footstepSound } from '../../audio/cues';
import { playSound } from '../../audio/player';

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
  // 音（K6）: 1マス進むごとに地形の足音、着いたら到着の音
  useEffect(() => {
    if (!move || !cur || !lm) return;
    if (cur.arrived) playSound('sfx_world_arrive');
    else if (cur.i > 0) playSound(footstepSound(move.game.world?.tiles[lm.path[cur.i]]?.t));
  }, [move?.id, cur?.i, cur?.arrived]);
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

/** 移動中の帯の文言（フェーズ2-D）。1マス = 1歩で「残り○歩」と数える */
export function moveStatusText(i: number, pathLength: number, arrived: boolean, discovery: boolean): { title: string; sub: string } {
  if (arrived) return { title: discovery ? '！ 到着しました' : '到着しました', sub: '周囲を確かめています' };
  const left = Math.max(0, pathLength - 1 - i);
  return { title: `移動中…（残り${left}歩）`, sub: '' };
}

/** 「移動する」のボタンの文言。マスに出る数字（使う移動力）と、歩くマスの数の違いをここで言葉にする */
export function moveButtonText(cost: number | undefined, steps: number | undefined): string {
  return `移動する（移動力${cost ?? '?'}を使う・${steps ?? '?'}マス先）`;
}

/**
 * 移動中は、下の操作パネルの代わりにこの小さな帯（約72px）だけを出す（フェーズ2-D）。
 * 地図が広くなり、歩いている駒が地図の下の端で隠れない。マスの大きさは地図の幅だけで決まるので、駒やマスはずれない
 */
export function MoveStatus({ move, playback }: { move: WorldMovePresentation; playback: MovePlayback }) {
  const { i, arrived, path } = playback;
  const discovery = moveDiscovery(move);
  const t = moveStatusText(i, path.length, arrived, discovery);
  return (
    <div
      className="panel relative z-40 flex h-[72px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-t-2xl px-3 text-center"
      data-world-moving={arrived ? 'arrival' : 'steps'}
      data-move-index={i}
      data-move-length={path.length}
    >
      <div className="text-[17px] font-bold text-amber-100" role="status">{t.title}</div>
      {t.sub && <div className="text-[13px] text-zinc-300">{t.sub}</div>}
    </div>
  );
}
