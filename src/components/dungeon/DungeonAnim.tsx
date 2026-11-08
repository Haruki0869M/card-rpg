// ===== ダンジョンの演出（第3段階B2）: 歩く（奥へ寄るズーム）・向きを変える（横に流れる）・扉が開く =====
// 見た目だけ。ゲームの結果はもう決まっていて、ここは「前の景色」から「今の景色」へのつなぎを端末の中で見せるだけ。
// 時間は balance.ts の TIMING。高速は半分、カットイン「簡易」は短い切り替えだけ、OS の動作軽減では演出なし。
import { motion, useReducedMotion, type TargetAndTransition } from 'framer-motion';
import { useLayoutEffect, useRef, useState } from 'react';
import { TIMING } from '../../data/balance';
import { DUNGEONS } from '../../data/dungeons';
import { findPath, posOf } from '../../engine';
import { useBattle } from '../../store/battleStore';
import type { DoorOpen } from '../../store/battleStore';
import type { DungeonRun, Facing } from '../../types';
import type { DoorOmen } from '../../engine';
import { Screen } from '../ui/game';
import { DungeonView } from './DungeonView';

type Kind = 'forward' | 'left' | 'right' | 'back' | 'fade';
interface Frame {
  run: DungeonRun;
  kind: Kind;
  seconds: number;
}

/** 演出の速さ（null = 演出しない） */
function useDungeonTiming() {
  const settings = useBattle((s) => s.settings);
  const reduced = useReducedMotion();
  if (reduced) return null;
  return { factor: settings.fastMode ? 1 / TIMING.fastModeFactor : 1, simple: settings.cutinMode === 'simple' };
}

/** 向き a から b へ回った時の見え方 */
function turnKind(a: Facing, b: Facing): Kind {
  const d = (b - a + 4) % 4;
  return d === 0 ? 'forward' : d === 1 ? 'right' : d === 3 ? 'left' : 'back';
}

/** 前の景色から今の景色までのつなぎ（1歩ずつ）。作れなければ空 */
function framesBetween(prev: DungeonRun, next: DungeonRun, factor: number, simple: boolean): Frame[] {
  if (prev.currentRoomId !== next.currentRoomId) return [];
  const a = posOf(prev);
  const b = posOf(next);
  if (a.x === b.x && a.y === b.y && a.facing === b.facing) return [];
  if (simple) return [{ run: prev, kind: 'fade', seconds: TIMING.dungeonSimple }];
  if (a.x === b.x && a.y === b.y) return [{ run: prev, kind: turnKind(a.facing, b.facing), seconds: TIMING.dungeonTurn * factor }];
  const path = findPath(prev, b);
  if (!path?.length) return [{ run: prev, kind: 'fade', seconds: TIMING.dungeonSimple }];
  const step = (path.length > 1 ? TIMING.dungeonWalkStep : TIMING.dungeonStep) * factor;
  const frames: Frame[] = [];
  let cur = { ...a };
  for (const d of path) {
    // 横や後ろへの1歩は「そちらを向いて進む」: 横に流れる。前への1歩は奥へ寄る
    frames.push({ run: { ...next, pos: { ...cur } }, kind: turnKind(cur.facing, d), seconds: step });
    const [dx, dy] = [[0, 1], [1, 0], [0, -1], [-1, 0]][d];
    cur = { x: cur.x + dx, y: cur.y + dy, facing: d };
  }
  // 着いた後に向きを変えた（扉の前まで歩いて北を向く など）
  if (cur.facing !== b.facing) frames.push({ run: { ...next, pos: { ...cur } }, kind: turnKind(cur.facing, b.facing), seconds: TIMING.dungeonTurn * factor });
  return frames;
}

/** 消えていく前の景色の動き */
const OUT: Record<Kind, TargetAndTransition> = {
  forward: { scale: 1.45, opacity: 0 },
  left: { x: '38%', opacity: 0 },
  right: { x: '-38%', opacity: 0 },
  back: { scale: 0.9, opacity: 0 },
  fade: { opacity: 0 },
};
/** 下から現れる今の景色の動き（始まりの形） */
const IN: Record<Kind, TargetAndTransition> = {
  forward: { scale: 0.88 },
  left: { x: '-30%' },
  right: { x: '30%' },
  back: { scale: 1.08 },
  fade: {},
};

/** 一人称の通路（歩いた・向きを変えた時に、前の景色からつなぐ） */
export function AnimatedDungeonView({ run, background, omens }: { run: DungeonRun; background: string; omens?: Record<string, DoorOmen> }) {
  const timing = useDungeonTiming();
  const prev = useRef(run);
  const [seq, setSeq] = useState<{ id: number; frames: Frame[]; i: number } | null>(null);
  const ids = useRef(0);
  useLayoutEffect(() => {
    const from = prev.current;
    prev.current = run;
    if (from === run || !timing) return;
    const frames = framesBetween(from, run, timing.factor, timing.simple);
    // 演出の途中で次の操作が来たら、残りは飛ばして新しいつなぎから
    setSeq(frames.length ? { id: ++ids.current, frames, i: 0 } : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  if (!seq) return <DungeonView run={run} background={background} omens={omens} />;
  const f = seq.frames[seq.i];
  const base = seq.frames[seq.i + 1]?.run ?? run;
  const next = () => setSeq((s) => (s && s.id === seq.id ? (s.i + 1 < s.frames.length ? { ...s, i: s.i + 1 } : null) : s));
  return (
    <div className="absolute inset-0 overflow-hidden" data-dungeon-anim={f.kind}>
      <motion.div key={`b${seq.id}-${seq.i}`} className="absolute inset-0" initial={IN[f.kind]} animate={{ x: 0, scale: 1 }} transition={{ duration: f.seconds, ease: 'easeOut' }}>
        <DungeonView run={base} background={background} omens={omens} />
      </motion.div>
      <motion.div
        key={`o${seq.id}-${seq.i}`}
        className="pointer-events-none absolute inset-0"
        initial={{ x: 0, scale: 1, opacity: 1 }}
        animate={OUT[f.kind]}
        transition={{ duration: f.seconds, ease: 'easeIn' }}
        onAnimationComplete={next}
      >
        <DungeonView run={f.run} background={background} omens={omens} />
      </motion.div>
    </div>
  );
}

/** 扉が開く演出（扉へ寄りながら暗くなる）。終わったら部屋の画面（戦闘など）へ。タップで飛ばせる */
export function DoorOpenScene({ door }: { door: DoorOpen }) {
  const finish = useBattle((s) => s.finishDoorOpen);
  const settings = useBattle((s) => s.settings);
  const simple = settings.cutinMode === 'simple';
  const seconds = simple ? TIMING.dungeonSimple * 2 : TIMING.dungeonDoor * (settings.fastMode ? 1 / TIMING.fastModeFactor : 1);
  const background = DUNGEONS.tryGet(door.run.dungeonId)?.background ?? door.run.background;
  // 扉の前に立って北を向いた景色（ここまで歩いた時は、もう扉の前にいる）
  const run = { ...door.run, pos: { ...posOf(door.run), facing: 0 as Facing } };
  return (
    <Screen>
      <button className="relative min-h-0 flex-1 overflow-hidden" onClick={() => finish(door.id)} aria-label="扉の演出を飛ばす" data-door-open>
        <motion.div
          className="absolute inset-0"
          style={{ transformOrigin: '50% 58%' }}
          initial={{ scale: 1 }}
          animate={{ scale: simple ? 1 : 2.6 }}
          transition={{ duration: simple ? seconds : seconds * 0.6, delay: simple ? 0 : seconds * 0.4, ease: 'easeIn' }}
          onAnimationComplete={() => finish(door.id)}
        >
          <DungeonView run={run} background={background} opening={simple ? undefined : seconds * 0.55} />
        </motion.div>
        {/* 扉の奥の暗がりが広がる */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at 50% 58%, #000 0%, #000 30%, transparent 62%)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: seconds * 0.6, delay: seconds * 0.4, ease: 'easeIn' }}
        />
        <motion.div className="pointer-events-none absolute inset-0 bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: seconds * 0.4, delay: seconds * 0.6 }} />
      </button>
    </Screen>
  );
}
