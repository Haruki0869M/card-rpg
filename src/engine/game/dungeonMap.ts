// ===== ダンジョンの通路の地図（第3段階: 一人称の探索とオートマッピング） =====
// 部屋のつながり（rooms の row / col / next）から、歩けるマス目の地図を「決まった手順で」作る。乱数は使わない。
// 同じ部屋の並びなら必ず同じ地図になるので、地図そのものは保存しない（保存するのは位置・向き・見たマスだけ）。
//
// 形（北＝奥＝y が大きい方）:
//   y=0        入口の通路（1行目の部屋の手前）
//   y=2r+1     r行目の部屋（扉の奥の小部屋。南側に扉、北側に出口）
//   y=2r+2     r行目の部屋と r+1行目の部屋の間の通路（横に1列）
// 部屋から次の部屋へは「出口→通路→扉」で、まっすぐなら2歩。横にずれるとその分だけ歩く。
import type { DungeonRun, Facing, Room } from '../../types';

export type { Facing } from '../../types';
export type RelDir = 'forward' | 'left' | 'right' | 'back';

export interface MapCell {
  x: number;
  y: number;
  kind: 'hall' | 'room';
  /** 部屋のマスなら部屋のID */
  roomId?: string;
  /** 通路のマスなら、どの行の部屋の後ろの通路か（入口は -1） */
  section: number;
}

export interface DungeonGrid {
  width: number;
  height: number;
  cells: MapCell[];
  at: Map<string, MapCell>;
  roomCell: Map<string, MapCell>;
  start: { x: number; y: number };
}

/** 北・東・南・西の1マスの動き（y は北が＋） */
export const DIRS: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];
export const FACING_NAME = ['北', '東', '南', '西'] as const;

export const cellKey = (x: number, y: number) => `${x},${y}`;

/** その向きから見た、左・右・後ろの向き */
export function turnTo(facing: Facing, rel: RelDir): Facing {
  const add = { forward: 0, right: 1, back: 2, left: 3 }[rel];
  return ((facing + add) % 4) as Facing;
}

/** 行の部屋を置く列（行の部屋の数ごとに、なるべく左右に散らす） */
function laneX(c: number, w: number, gridW: number) {
  if (w <= 1) return Math.floor((gridW - 1) / 2);
  return Math.round((c * (gridW - 1)) / (w - 1));
}

const CACHE = new Map<string, DungeonGrid>();

/** 部屋のつながりから通路の地図を作る（同じ並びなら同じ地図。軽いので覚えておく） */
export function dungeonGrid(run: Pick<DungeonRun, 'dungeonId' | 'rooms'>): DungeonGrid {
  const sig = run.dungeonId + '|' + run.rooms.map((r) => `${r.id}:${r.row}:${r.col}`).join(',');
  const hit = CACHE.get(sig);
  if (hit) return hit;
  const rows = Math.max(0, ...run.rooms.map((r) => r.row)) + 1;
  const widths = Array.from({ length: rows }, (_, r) => run.rooms.filter((x) => x.row === r).length);
  const maxW = Math.max(1, ...widths);
  const gridW = maxW === 1 ? 1 : Math.max(3, maxW);
  const xOf = (r: Pick<Room, 'row' | 'col'>) => laneX(r.col, widths[r.row], gridW);
  const cells: MapCell[] = [];
  const at = new Map<string, MapCell>();
  const roomCell = new Map<string, MapCell>();
  const put = (c: MapCell) => {
    const k = cellKey(c.x, c.y);
    if (at.has(k)) throw new Error(`dungeon map overlap at ${k}`);
    at.set(k, c);
    cells.push(c);
    if (c.roomId) roomCell.set(c.roomId, c);
  };
  // 通路（入口 = section -1。各行の後ろ = section r。最後の行（ボス）の後ろには無い）
  for (let s = -1; s < rows - 1; s++) {
    const xs = run.rooms.filter((r) => r.row === s || r.row === s + 1).map(xOf);
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    for (let x = lo; x <= hi; x++) put({ x, y: 2 * s + 2, kind: 'hall', section: s });
  }
  for (const r of run.rooms) put({ x: xOf(r), y: 2 * r.row + 1, kind: 'room', roomId: r.id, section: r.row });
  const firstXs = run.rooms.filter((r) => r.row === 0).map(xOf);
  const start = { x: Math.floor((Math.min(...firstXs) + Math.max(...firstXs)) / 2), y: 0 };
  const grid: DungeonGrid = { width: gridW, height: 2 * rows, cells, at, roomCell, start };
  if (CACHE.size > 64) CACHE.clear();
  CACHE.set(sig, grid);
  return grid;
}

/** 今の位置（古いデータで無ければ入口） */
export function posOf(run: DungeonRun): NonNullable<DungeonRun['pos']> {
  return run.pos ?? { ...dungeonGrid(run).start, facing: 0 };
}

/** 今の手番で歩けるマス（今いる部屋と、その後ろの通路だけ。部屋に入ると後ろの扉は閉まる） */
export function walkableKeys(run: DungeonRun): Set<string> {
  const grid = dungeonGrid(run);
  const cur = run.currentRoomId ? grid.roomCell.get(run.currentRoomId) : undefined;
  const section = cur ? cur.section : -1;
  const out = new Set<string>();
  for (const c of grid.cells) if (c.kind === 'hall' && c.section === section) out.add(cellKey(c.x, c.y));
  if (cur) out.add(cellKey(cur.x, cur.y));
  return out;
}

/** 1マス動けるか（部屋のマスは、北の出口とだけつながる。扉は「扉を開ける」で入る） */
export function canMove(run: DungeonRun, from: { x: number; y: number }, dir: Facing): boolean {
  const [dx, dy] = DIRS[dir];
  const to = { x: from.x + dx, y: from.y + dy };
  const walk = walkableKeys(run);
  if (!walk.has(cellKey(from.x, from.y)) || !walk.has(cellKey(to.x, to.y))) return false;
  const grid = dungeonGrid(run);
  const a = grid.at.get(cellKey(from.x, from.y))!;
  const b = grid.at.get(cellKey(to.x, to.y))!;
  if (a.kind === 'room') return dir === 0 && b.kind === 'hall';
  if (b.kind === 'room') return dir === 2;
  return dy === 0;
}

/** 目の前（北）の扉の部屋（通路に立っていて、北が部屋のマスの時） */
export function doorAhead(run: DungeonRun): Room | undefined {
  const p = posOf(run);
  if (p.facing !== 0) return undefined;
  return doorNorthOf(run, p);
}

/** そのマスの北にある部屋（扉）。今いる部屋の出口側ではなく、通路から入る扉 */
export function doorNorthOf(run: DungeonRun, p: { x: number; y: number }): Room | undefined {
  const grid = dungeonGrid(run);
  const here = grid.at.get(cellKey(p.x, p.y));
  if (!here || here.kind !== 'hall') return undefined;
  const c = grid.at.get(cellKey(p.x, p.y + 1));
  return c?.roomId ? run.rooms.find((r) => r.id === c.roomId) : undefined;
}

/** 部屋の扉の前のマス（部屋の1つ南の通路） */
export function doorFront(run: DungeonRun, roomId: string): { x: number; y: number } | undefined {
  const c = dungeonGrid(run).roomCell.get(roomId);
  return c ? { x: c.x, y: c.y - 1 } : undefined;
}

/** 今の位置から見えるマス（自分のマス・前後左右の隣・前の3マス先まで。部屋のマスの先は見えない。通路の壁の扉も見える） */
export function visibleFrom(run: DungeonRun, p: NonNullable<DungeonRun['pos']>): string[] {
  const grid = dungeonGrid(run);
  const out = new Set<string>([cellKey(p.x, p.y)]);
  for (const [dx, dy] of DIRS) if (grid.at.has(cellKey(p.x + dx, p.y + dy))) out.add(cellKey(p.x + dx, p.y + dy));
  const [fx, fy] = DIRS[p.facing];
  for (let i = 1; i <= 3; i++) {
    const c = grid.at.get(cellKey(p.x + fx * i, p.y + fy * i));
    if (!c) break;
    out.add(cellKey(c.x, c.y));
    if (c.kind === 'room') break;
  }
  // 通路に立っている時は、見えた通路のマスの壁にある扉（北と南）も見える
  const here = grid.at.get(cellKey(p.x, p.y));
  if (here?.kind === 'hall') {
    for (const k of [...out]) {
      const c = grid.at.get(k);
      if (c?.kind !== 'hall' || c.y !== p.y) continue;
      for (const dy of [1, -1]) if (grid.at.get(cellKey(c.x, c.y + dy))?.kind === 'room') out.add(cellKey(c.x, c.y + dy));
    }
  }
  return [...out];
}

/** 見えたマスを地図に描き足す */
export function revealSeen(run: DungeonRun) {
  const seen = new Set(run.seen ?? []);
  for (const k of visibleFrom(run, posOf(run))) seen.add(k);
  run.seen = [...seen];
}

/** 探索度（見たマス ÷ 全部のマス。%） */
export function exploredPercent(run: DungeonRun): number {
  const grid = dungeonGrid(run);
  const seen = new Set(run.seen ?? []);
  const n = grid.cells.filter((c) => seen.has(cellKey(c.x, c.y))).length;
  return Math.floor((n / Math.max(1, grid.cells.length)) * 100);
}

/** 今の位置から目的のマスまでの道順（向きの列）。行けなければ undefined */
export function findPath(run: DungeonRun, to: { x: number; y: number }): Facing[] | undefined {
  const p = posOf(run);
  const goal = cellKey(to.x, to.y);
  const startK = cellKey(p.x, p.y);
  if (goal === startK) return [];
  const prev = new Map<string, { from: string; dir: Facing }>();
  const queue: { x: number; y: number }[] = [{ x: p.x, y: p.y }];
  const done = new Set([startK]);
  while (queue.length) {
    const c = queue.shift()!;
    for (let d = 0 as Facing; d < 4; d = (d + 1) as Facing) {
      if (!canMove(run, c, d)) continue;
      const n = { x: c.x + DIRS[d][0], y: c.y + DIRS[d][1] };
      const k = cellKey(n.x, n.y);
      if (done.has(k)) continue;
      done.add(k);
      prev.set(k, { from: cellKey(c.x, c.y), dir: d });
      if (k === goal) {
        const path: Facing[] = [];
        for (let at = k; at !== startK; at = prev.get(at)!.from) path.unshift(prev.get(at)!.dir);
        return path;
      }
      queue.push(n);
    }
  }
  return undefined;
}

/** 新しく入ったダンジョンの位置と見えたマス */
export function initDungeonPos(run: DungeonRun) {
  const grid = dungeonGrid(run);
  run.pos = { ...grid.start, facing: 0 };
  run.seen = [];
  revealSeen(run);
}

/** 部屋に入った時: 部屋のマスに立って北を向く */
export function moveIntoRoom(run: DungeonRun, roomId: string) {
  const c = dungeonGrid(run).roomCell.get(roomId);
  if (!c) return;
  run.pos = { x: c.x, y: c.y, facing: 0 };
  revealSeen(run);
}
