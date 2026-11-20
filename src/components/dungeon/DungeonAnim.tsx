// ===== ダンジョンの演出（第3段階B2）: 歩く（奥へ寄るズーム）・向きを変える（横に流れる）・扉が開く =====
// 見た目だけ。ゲームの結果はもう決まっていて、ここは「前の景色」から「今の景色」へのつなぎを端末の中で見せるだけ。
// 時間は balance.ts の TIMING。高速は半分、カットイン「簡易」は短い切り替えだけ、OS の動作軽減では演出なし。
// 手直し（チカチカ）: 景色は2枚をずっと置いたまま交互に使う（1歩ごとに作り直さない）。途中の景色は、その位置までに見えたマスだけで描く
// 手直し（画面酔い）: ゆっくり・寄る幅を小さく・なめらかな easeInOut。遠くまで歩く時は最初と最後の2コマずつだけ見せ、間はふわっと暗転（dim）でつなぐ
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { dungeonStepSound } from '../../audio/cues';
import { playSound } from '../../audio/player';
import { TIMING } from '../../data/balance';
import { DUNGEONS } from '../../data/dungeons';
import { DIRS, doorFront, findPath, posOf, revealSeen, visibleFrom } from '../../engine';
import { useBattle } from '../../store/battleStore';
import type { DoorOpen } from '../../store/battleStore';
import type { DungeonRun, Facing } from '../../types';
import { Screen } from '../ui/game';
import { DungeonView, viewUnit } from './DungeonView';
import { doorChoices, doorWallView, WALL_SLOT_X, wallDoors, type WallDoor } from './doors';
import { useElementSize } from '../../hooks/useElementSize';

type Kind = 'forward' | 'left' | 'right' | 'back' | 'fade' | 'dim';
export interface Frame {
  /** このコマで現れる景色（歩いた先・向いた先。見えたマスは、このコマの位置までに見えた分だけ） */
  target: DungeonRun;
  kind: Kind;
  seconds: number;
  /** 足音を鳴らすか（位置が変わるコマ） */
  moved: boolean;
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

/**
 * 途中の景色（その位置・向きに立った時）。見えたマスは「前の景色で見えていたマス＋ここまでの位置から見えたマス」だけ。
 * 着いた後に見えるはずの横の口が、1歩目から明るくなる（チカチカ）のを防ぐ
 */
function midRun(next: DungeonRun, pos: NonNullable<DungeonRun['pos']>, seen: Set<string>): DungeonRun {
  const r = { ...next, pos: { ...pos } };
  for (const k of visibleFrom(r, pos)) seen.add(k);
  return { ...r, seen: [...seen] };
}

/** 前の景色から今の景色までのつなぎ（1コマずつ）。作れなければ空 */
export function framesBetween(prev: DungeonRun, next: DungeonRun, factor: number, simple: boolean): Frame[] {
  if (prev.currentRoomId !== next.currentRoomId || prev.dungeonId !== next.dungeonId) return [];
  const a = posOf(prev);
  const b = posOf(next);
  if (a.x === b.x && a.y === b.y && a.facing === b.facing) return [];
  const moved = a.x !== b.x || a.y !== b.y;
  if (simple) return [{ target: next, kind: 'fade', seconds: TIMING.dungeonSimple, moved }];
  if (!moved) return [{ target: next, kind: turnKind(a.facing, b.facing), seconds: TIMING.dungeonTurn * factor, moved }];
  const path = findPath(prev, b);
  if (!path?.length) return [{ target: next, kind: 'fade', seconds: TIMING.dungeonSimple, moved }];
  const step = (path.length > 1 ? TIMING.dungeonWalkStep : TIMING.dungeonStep) * factor;
  const turn = TIMING.dungeonTurn * factor;
  const frames: Frame[] = [];
  const seen = new Set(prev.seen ?? []);
  let cur = { ...a };
  for (const d of path) {
    // 横や後ろへの1歩は「そちらを向いてから進む」: 横に流れて（パノラマ）、それから奥へ寄る
    if (d !== cur.facing) {
      const kind = turnKind(cur.facing, d);
      cur = { ...cur, facing: d };
      frames.push({ target: midRun(next, cur, seen), kind, seconds: turn, moved: false });
    }
    const [dx, dy] = [[0, 1], [1, 0], [0, -1], [-1, 0]][d];
    cur = { x: cur.x + dx, y: cur.y + dy, facing: d };
    frames.push({ target: midRun(next, cur, seen), kind: 'forward', seconds: step, moved: true });
  }
  // 着いた後に向きを変えた（扉の前まで歩いて北を向く など）
  if (cur.facing !== b.facing) frames.push({ target: next, kind: turnKind(cur.facing, b.facing), seconds: turn, moved: false });
  else frames[frames.length - 1] = { ...frames[frames.length - 1], target: next };
  return shortenWalk(frames, factor);
}

/** 遠くまで歩く時に見せる、最初と最後のコマの数（間は暗転1回にまとめる） */
const WALK_EDGE = 2;
/**
 * 遠くまで歩く時は、ズームの切り替えを最初と最後の WALK_EDGE コマずつだけにし、間はふわっと暗転してつなぐ（画面酔いの手直し）。
 * 間の景色は飛ばすが、見えたマスは間のコマまでの分を引き継いでいる（midRun が順に足している）ので、着いた後の景色は今と同じ
 */
export function shortenWalk(frames: Frame[], factor: number): Frame[] {
  if (frames.length <= WALK_EDGE * 2 + 1) return frames;
  const mid = frames.slice(WALK_EDGE, -WALK_EDGE);
  const dim: Frame = { target: mid[mid.length - 1].target, kind: 'dim', seconds: TIMING.dungeonWalkFade * factor, moved: true };
  return [...frames.slice(0, WALK_EDGE), dim, ...frames.slice(-WALK_EDGE)];
}

type Val = string | number;
type Pose = { x: Val | Val[]; scale: Val | Val[]; opacity: Val | Val[]; filter: Val | Val[] };
const B = (n: number) => `brightness(${n})`;
const P = (x: string, scale: number, opacity: number, b = 1): Pose => ({ x, scale, opacity, filter: B(b) });
/** 遠くまで歩く間の暗転の暗さ（0〜1。真っ暗にはしない＝チカチカに見えないように） */
const DIM = 0.55;
/**
 * 1コマの動き（前の景色 = old、次の景色 = new）。どちらも不透明な絵なので、黒い隙間が見えないように組む:
 * - 前進: 前の景色は奥へ少し寄りながら（拡大して）下に残り、次の景色がその上に浮かび上がる（画面酔いの手直しで寄る幅を小さく）
 * - 横を向く: 2つの景色が横に並んで流れる（パノラマ）。隙間も二重にもならない
 * - 振り向く・簡易: 次の景色が上に浮かび上がる
 * - 暗転（遠くまで歩く間）: 前の景色が少し暗くなり、暗いまま次の景色に入れ替わって、明るく戻る
 * 急な加速・減速が無いように、簡易の切り替え以外は easeInOut。filter はいつも書いて、暗転の後に暗さが残らないようにする
 */
const MOVES: Record<Kind, { old: [Pose, Pose]; new: [Pose, Pose]; ease: 'easeOut' | 'easeInOut'; times?: number[] }> = {
  forward: { old: [P('0%', 1, 1), P('0%', 1.16, 1)], new: [P('0%', 0.94, 0), P('0%', 1, 1)], ease: 'easeInOut' },
  left: { old: [P('0%', 1, 1), P('100%', 1, 1)], new: [P('-100%', 1, 1), P('0%', 1, 1)], ease: 'easeInOut' },
  right: { old: [P('0%', 1, 1), P('-100%', 1, 1)], new: [P('100%', 1, 1), P('0%', 1, 1)], ease: 'easeInOut' },
  back: { old: [P('0%', 1, 1), P('0%', 1.06, 1)], new: [P('0%', 1.06, 0), P('0%', 1, 1)], ease: 'easeInOut' },
  fade: { old: [P('0%', 1, 1), P('0%', 1, 1)], new: [P('0%', 1, 0), P('0%', 1, 1)], ease: 'easeOut' },
  dim: {
    old: [P('0%', 1, 1), { x: '0%', scale: [1, 1.04, 1.04], opacity: 1, filter: [B(1), B(DIM), B(DIM)] }],
    new: [P('0%', 0.98, 0, DIM), { x: '0%', scale: [0.98, 0.98, 1], opacity: [0, 1, 1], filter: [B(DIM), B(DIM), B(1)] }],
    ease: 'easeInOut',
    times: [0, 0.5, 1],
  },
};

/**
 * 一人称の通路（歩いた・向きを変えた時に、前の景色からつなぐ）。
 * 景色は2枚（0・1）をずっと置いたまま、交互に「前の景色」「次の景色」に使う（1歩ごとに作り直さない）。
 * onShown: 演出の間、画面のほかの所（ミニマップ・探索度・扉の札・ボタン）に出す景色。演出が無い時は null（今の景色）
 */
export function AnimatedDungeonView({ run, background, doors, onShown, onDoor }: {
  run: DungeonRun;
  background: string;
  /** 扉の壁の構図で描く扉（通路で扉を選ぶ時。選択肢と同じ順番） */
  doors?: WallDoor[];
  onShown?: (shown: DungeonRun | null) => void;
  /** 一人称の絵の扉をタップした（部屋のID）。演出の間は押せない */
  onDoor?: (roomId: string) => void;
}) {
  const timing = useDungeonTiming();
  const prev = useRef(run);
  const [layers, setLayers] = useState<[DungeonRun, DungeonRun]>([run, run]);
  const [top, setTop] = useState<0 | 1>(0);
  const [seq, setSeq] = useState<{ id: number; frames: Frame[]; i: number } | null>(null);
  const ids = useRef(0);
  const ctl0 = useAnimationControls();
  const ctl1 = useAnimationControls();
  const ctl = [ctl0, ctl1] as const;
  const shownRef = useRef<DungeonRun | null>(null);
  const report = (r: DungeonRun | null) => {
    if (shownRef.current === r) return;
    shownRef.current = r;
    onShown?.(r);
  };
  useLayoutEffect(() => {
    const from = prev.current;
    prev.current = run;
    if (from === run) return;
    if (!timing) {
      // 動作軽減: 動きは出さないが、音は鳴らす（K6）
      const a = posOf(from), b = posOf(run);
      if (from.dungeonId === run.dungeonId && (a.x !== b.x || a.y !== b.y)) playSound(dungeonStepSound(run.dungeonId, background));
      else if (from.dungeonId === run.dungeonId && a.facing !== b.facing) playSound('sfx_dungeon_turn');
      return;
    }
    // 演出の途中で次の操作が来たら（オンラインでほかの人の操作が届いた時など）、今出ている景色からつなぎ直す
    const shownNow = seq ? layers[1 - top] : from;
    const frames = framesBetween(shownNow, run, timing.factor, timing.simple);
    if (!frames.length) {
      ctl[0].stop();
      ctl[1].stop();
      setSeq(null);
      report(null);
      return;
    }
    const t = (seq ? 1 - top : top) as 0 | 1;
    const l: [DungeonRun, DungeonRun] = [shownNow, shownNow];
    l[1 - t] = frames[0].target;
    setTop(t);
    setLayers(l);
    setSeq({ id: ++ids.current, frames, i: 0 });
    report(shownNow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);
  // 1コマの動き: 2枚の景色を同じ時間で動かし、終わったら役目を入れ替える
  useLayoutEffect(() => {
    if (!seq) return;
    const f = seq.frames[seq.i];
    const m = MOVES[f.kind];
    const oldC = ctl[top];
    const newC = ctl[1 - top];
    oldC.set({ ...m.old[0], zIndex: 0, visibility: 'visible' });
    newC.set({ ...m.new[0], zIndex: 1, visibility: 'visible' });
    const transition = { duration: f.seconds, ease: m.ease, ...(m.times ? { times: m.times } : {}) };
    const { id, i, frames } = seq;
    let alive = true;
    Promise.all([oldC.start({ ...m.old[1], transition }), newC.start({ ...m.new[1], transition })]).then(() => {
      if (!alive) return;
      const nt = (1 - top) as 0 | 1;
      const more = i + 1 < frames.length;
      setTop(nt);
      if (more) {
        const l: [DungeonRun, DungeonRun] = [frames[i].target, frames[i].target];
        l[1 - nt] = frames[i + 1].target;
        setLayers(l);
        report(frames[i].target);
      } else {
        setLayers([prev.current, prev.current]);
        report(null);
      }
      setSeq((s) => (s && s.id === id ? (more ? { ...s, i: i + 1 } : null) : s));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq?.id, seq?.i]);
  // 動いていない時: 上の景色を今の景色にそろえ、下の景色は隠す（置いたまま。次の1歩で使う）
  useLayoutEffect(() => {
    if (seq) return;
    ctl[top].set({ x: '0%', scale: 1, opacity: 1, filter: B(1), zIndex: 1, visibility: 'visible' });
    ctl[1 - top].set({ zIndex: 0, visibility: 'hidden' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq, top]);
  // 音（K6）: 1コマずつ、前進は足音、向きを変えるのは衣ずれ
  const fr = seq?.frames[seq.i];
  useEffect(() => {
    if (!fr) return;
    playSound(fr.moved ? dungeonStepSound(run.dungeonId, background) : 'sfx_dungeon_turn');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq?.id, seq?.i]);
  // 動いていない時の上の景色は、いつも今の景色（保存の読み込み・部屋に入った時など、つなぎが無い変化も）
  const shown: [DungeonRun, DungeonRun] = seq ? layers : top === 0 ? [run, layers[1]] : [layers[0], run];
  return (
    <div className="absolute inset-0 overflow-hidden bg-black" data-dungeon-layers>
      {([0, 1] as const).map((n) => (
        <motion.div key={n} className="absolute inset-0" animate={ctl[n]} initial={false} style={{ willChange: 'transform, opacity' }} data-dungeon-layer={n}>
          <DungeonView run={shown[n]} background={background} doors={!seq ? doors : undefined} main={n === top} onDoor={n === top && !seq ? onDoor : undefined} />
        </motion.div>
      ))}
      {/* 確認スクリプトの目印: 演出の間だけ */}
      {fr && <span hidden data-dungeon-anim={fr.kind} />}
    </div>
  );
}

/** 扉の前まで歩いて、北（扉）を向いた様子（扉を選ぶだけの形。エンジンと同じ道順。見たマスも描き足す） */
export function walkedToDoor(run: DungeonRun, roomId: string | undefined): DungeonRun {
  const front = roomId ? doorFront(run, roomId) : undefined;
  const path = front ? findPath(run, front) : undefined;
  if (!front || !path) return { ...run, pos: { ...posOf(run), facing: 0 } };
  const out: DungeonRun = { ...run, seen: [...(run.seen ?? [])] };
  let p = posOf(run);
  for (const d of path) {
    p = { x: p.x + DIRS[d][0], y: p.y + DIRS[d][1], facing: d };
    out.pos = p;
    revealSeen(out);
  }
  out.pos = { ...p, facing: 0 };
  revealSeen(out);
  return out;
}

/**
 * 扉が開く演出（抜本的な見直し §1-2）: 扉を選んだ時の「扉の壁」をそのまま見せて、選んだ扉へ寄りながら、その扉が開いて暗くなる。
 * 終わったら部屋の画面（戦闘など）へ。タップで飛ばせる。歩く演出は無い（扉の壁は、いつも目の前にある）
 */
export function DoorOpenScene({ door }: { door: DoorOpen }) {
  const finish = useBattle((s) => s.finishDoorOpen);
  const settings = useBattle((s) => s.settings);
  const simple = settings.cutinMode === 'simple';
  const factor = settings.fastMode ? 1 / TIMING.fastModeFactor : 1;
  const seconds = simple ? TIMING.dungeonSimple * 2 : TIMING.dungeonDoor * factor;
  const background = DUNGEONS.tryGet(door.run.dungeonId)?.background ?? door.run.background;
  // 扉を選んだ時の景色（選択肢と同じ並びの扉の壁）
  const run = useMemo(() => ({ ...door.run, pos: { ...posOf(door.run), facing: 0 as Facing } }), [door.run]);
  const doors = useMemo(() => wallDoors(doorChoices(run)), [run]);
  const [ref, size] = useElementSize<HTMLDivElement>();
  // 選んだ扉の位置（画面の真ん中からの横のずれ）へ寄る
  const slot = door.roomId ? doorWallView(doors).slotOf[door.roomId] : undefined;
  const dx = Math.round((slot ? WALL_SLOT_X[slot] : 0) * viewUnit(size.width, size.height));
  const origin = `calc(50% + ${dx}px) 56%`;
  return (
    <Screen>
      <button className="relative min-h-0 flex-1 overflow-hidden" onClick={() => finish(door.id)} aria-label="扉の演出を飛ばす" data-door-open data-door-open-slot={slot ?? 'center'}>
        <div ref={ref} className="absolute inset-0">
          <motion.div
            className="absolute inset-0"
            style={{ transformOrigin: origin }}
            initial={{ scale: 1 }}
            animate={{ scale: simple ? 1 : slot && slot !== 'center' ? 2.6 : 2.0 }}
            transition={{ duration: simple ? seconds : seconds * 0.6, delay: simple ? 0 : seconds * 0.4, ease: 'easeIn' }}
            onAnimationComplete={() => finish(door.id)}
          >
            <DungeonView run={run} background={background} doors={doors} opening={simple ? undefined : seconds * 0.55} openingRoomId={door.roomId} />
          </motion.div>
        </div>
        {/* 扉の奥の暗がりが広がる */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(circle at ${origin}, #000 0%, #000 30%, transparent 62%)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: seconds * 0.6, delay: seconds * 0.4, ease: 'easeIn' }}
        />
        <motion.div className="pointer-events-none absolute inset-0 bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: seconds * 0.4, delay: seconds * 0.6 }} />
      </button>
    </Screen>
  );
}
