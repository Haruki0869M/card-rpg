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
/** 同じ部屋の配列なら、文字列の目印を作らずにすぐ返す（1回の操作の中で何度も呼ばれるため） */
const BY_ROOMS = new WeakMap<object, DungeonGrid>();

/** 部屋のつながりから通路の地図を作る（同じ並びなら同じ地図。軽いので覚えておく） */
export function dungeonGrid(run: Pick<DungeonRun, 'dungeonId' | 'rooms'>): DungeonGrid {
  const quick = BY_ROOMS.get(run.rooms);
  if (quick) return quick;
  const sig = run.dungeonId + '|' + run.rooms.map((r) => `${r.id}:${r.row}:${r.col}`).join(',');
  const hit = CACHE.get(sig);
  if (hit) {
    BY_ROOMS.set(run.rooms, hit);
    return hit;
  }
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
  BY_ROOMS.set(run.rooms, grid);
  return grid;
}

/** 今の位置（古いデータで無ければ入口） */
export function posOf(run: DungeonRun): NonNullable<DungeonRun['pos']> {
  return run.pos ?? { ...dungeonGrid(run).start, facing: 0 };
}

const ACTIVE = new WeakMap<object, { sig: string; keys: Set<string> }>();

/**
 * 選んだ道の上にあるマス（オーナーの案: 選ばなかった扉はただの壁になり、その扉へだけ続いていた通路も無くなる）。
 * 行ごとに「選んだ部屋」（今いる部屋か、通った部屋）を決め、
 * - 部屋のマス: 選んだ部屋。まだ選んでいない行は、1つ前の行の選んだ部屋から行ける部屋（1行目は全部）。ボスの部屋はいつも
 * - 通路のマス: その通路の両側の「残った部屋」（入口の通路は入口のマス）の列の、いちばん左から右まで
 * 保存するものは増やさない（部屋の cleared と currentRoomId から毎回決める。古い保存データもそのまま）
 */
export function activeCells(run: DungeonRun): Set<string> {
  const grid = dungeonGrid(run);
  const sig = `${run.currentRoomId ?? ''}|${run.pos ? `${run.pos.x},${run.pos.y}` : ''}|${run.rooms.map((r) => (r.cleared ? 1 : 0)).join('')}`;
  const hit = ACTIVE.get(run.rooms);
  if (hit && hit.sig === sig) return hit.keys;
  const rows = Math.max(0, ...run.rooms.map((r) => r.row)) + 1;
  const bossRow = rows - 1;
  const keep: Room[][] = [];
  let allowed: Set<string> | null = null;
  for (let row = 0; row < rows; row++) {
    const inRow = run.rooms.filter((r) => r.row === row);
    const chosen = inRow.filter((r) => r.cleared || r.id === run.currentRoomId);
    const cand = inRow.filter((r) => !allowed || allowed.has(r.id) || (row === bossRow && r.next.length === 0));
    const act = chosen.length ? chosen : cand.length ? cand : inRow;
    keep.push(act);
    allowed = new Set(act.flatMap((r) => r.next));
  }
  const xOf = (r: Room) => grid.roomCell.get(r.id)!.x;
  const keys = new Set<string>();
  for (const row of keep) for (const r of row) keys.add(cellKey(xOf(r), 2 * r.row + 1));
  // 古い保存データで、無くなる通路の上に立っていた時は、そこから戻れるように立っている所までは残す
  const p = run.pos;
  for (let s = -1; s < rows - 1; s++) {
    const xs = [...(s < 0 ? [grid.start.x] : keep[s].map(xOf)), ...keep[s + 1].map(xOf), ...(p && p.y === 2 * s + 2 ? [p.x] : [])];
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    for (let x = lo; x <= hi; x++) if (grid.at.has(cellKey(x, 2 * s + 2))) keys.add(cellKey(x, 2 * s + 2));
  }
  ACTIVE.set(run.rooms, { sig, keys });
  return keys;
}

/** 選んだ道の上のマスだけを引く（選ばなかった扉・通路は「無い」＝壁として扱う） */
export function activeAt(run: DungeonRun): (x: number, y: number) => MapCell | undefined {
  const grid = dungeonGrid(run);
  const act = activeCells(run);
  return (x, y) => {
    const k = cellKey(x, y);
    return act.has(k) ? grid.at.get(k) : undefined;
  };
}

/** 今の手番で歩けるマス（今いる部屋と、その後ろの通路だけ。部屋に入ると後ろの扉は閉まる。選ばなかった扉へだけ続く通路は除く） */
export function walkableKeys(run: DungeonRun): Set<string> {
  const grid = dungeonGrid(run);
  const act = activeCells(run);
  const cur = run.currentRoomId ? grid.roomCell.get(run.currentRoomId) : undefined;
  const section = cur ? cur.section : -1;
  const out = new Set<string>();
  for (const c of grid.cells) if (c.kind === 'hall' && c.section === section && act.has(cellKey(c.x, c.y))) out.add(cellKey(c.x, c.y));
  if (cur) out.add(cellKey(cur.x, cur.y));
  return out;
}

/** 1マス動けるか（部屋のマスは、北の出口とだけつながる。扉は「扉を開ける」で入る） */
export function canMove(run: DungeonRun, from: { x: number; y: number }, dir: Facing, walk: Set<string> = walkableKeys(run)): boolean {
  const [dx, dy] = DIRS[dir];
  const to = { x: from.x + dx, y: from.y + dy };
  if (!walk.has(cellKey(from.x, from.y)) || !walk.has(cellKey(to.x, to.y))) return false;
  const grid = dungeonGrid(run);
  const a = grid.at.get(cellKey(from.x, from.y))!;
  const b = grid.at.get(cellKey(to.x, to.y))!;
  if (a.kind === 'room') return dir === 0 && b.kind === 'hall';
  if (b.kind === 'room') return dir === 2;
  return dy === 0;
}

/** そのマスの北にある部屋（扉）。今いる部屋の出口側ではなく、通路から入る扉 */
export function doorNorthOf(run: DungeonRun, p: { x: number; y: number }): Room | undefined {
  const at = activeAt(run);
  const here = at(p.x, p.y);
  if (!here || here.kind !== 'hall') return undefined;
  const c = at(p.x, p.y + 1);
  return c?.roomId ? run.rooms.find((r) => r.id === c.roomId) : undefined;
}

/** 部屋の扉の前のマス（部屋の1つ南の通路） */
export function doorFront(run: DungeonRun, roomId: string): { x: number; y: number } | undefined {
  const c = dungeonGrid(run).roomCell.get(roomId);
  return c ? { x: c.x, y: c.y - 1 } : undefined;
}

/** 今の位置から見えるマス（自分のマス・前後左右の隣・前の3マス先まで。部屋のマスの先は見えない。通路の壁の扉も見える） */
export function visibleFrom(run: DungeonRun, p: NonNullable<DungeonRun['pos']>): string[] {
  // 選ばなかった扉・その扉へだけ続く通路は「無い」（壁）なので見えない
  const at = activeAt(run);
  const out = new Set<string>([cellKey(p.x, p.y)]);
  for (const [dx, dy] of DIRS) if (at(p.x + dx, p.y + dy)) out.add(cellKey(p.x + dx, p.y + dy));
  const [fx, fy] = DIRS[p.facing];
  for (let i = 1; i <= 3; i++) {
    const c = at(p.x + fx * i, p.y + fy * i);
    if (!c) break;
    out.add(cellKey(c.x, c.y));
    if (c.kind === 'room') break;
  }
  // 通路に立っている時は、見えた通路のマスの壁にある扉（北と南）も見える
  const here = at(p.x, p.y);
  if (here?.kind === 'hall') {
    for (const k of [...out]) {
      const [x, y] = k.split(',').map(Number);
      const c = at(x, y);
      if (c?.kind !== 'hall' || c.y !== p.y) continue;
      for (const dy of [1, -1]) if (at(c.x, c.y + dy)?.kind === 'room') out.add(cellKey(c.x, c.y + dy));
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

/**
 * 地図に描くマス（見たマス ＋ 装備の力で最初から出るマス）と、入る前から種類が分かる部屋。
 * 保存はしない（その場で計算する）ので、探索度・一人称の景色・保存データは変わらない。
 * rest = 休憩部屋のマスが出て、種類も分かる（羅針盤） / layout = 通路と扉のマスが全部出る。種類は出ない（星図）
 */
export function mapKnowledge(run: DungeonRun, reveal: { rest?: boolean; layout?: boolean } = {}): { seen: Set<string>; typed: Set<string> } {
  const seen = new Set(run.seen ?? []);
  const typed = new Set<string>();
  if (!reveal.rest && !reveal.layout) return { seen, typed };
  const act = activeCells(run);
  for (const c of dungeonGrid(run).cells) {
    const k = cellKey(c.x, c.y);
    if (!act.has(k)) continue;
    if (reveal.layout) seen.add(k);
    if (reveal.rest && c.roomId && run.rooms.find((r) => r.id === c.roomId)?.type === 'rest') {
      seen.add(k);
      typed.add(c.roomId);
    }
  }
  return { seen, typed };
}

/** 探索度（見たマス ÷ 全部のマス。%） */
export function exploredPercent(run: DungeonRun): number {
  // 選ばなかった扉と、その扉へだけ続く通路は数えない（100% まで届くように）
  const act = activeCells(run);
  const seen = new Set(run.seen ?? []);
  const n = [...act].filter((k) => seen.has(k)).length;
  return Math.floor((n / Math.max(1, act.size)) * 100);
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
  const walk = walkableKeys(run);
  while (queue.length) {
    const c = queue.shift()!;
    for (let d = 0 as Facing; d < 4; d = (d + 1) as Facing) {
      if (!canMove(run, c, d, walk)) continue;
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

// ===== 一人称の通路の絵の材料（第3段階B）。見たマスだけから「何が見えるか」を決める（画面はこれを描くだけ） =====

/** 壁の面の種類。open = 横に開いた口 / door = 開けられる扉 / locked = 開かない扉 / boss = ボスの扉 / arch = 出てきた部屋の入口 / dark = まだ見ていない */
export type ViewFace = 'wall' | 'open' | 'door' | 'locked' | 'boss' | 'arch' | 'dark';

export interface ViewSlice {
  /** 手前から何マス目か（0 = 今いるマス） */
  depth: number;
  /** このマスは部屋の中か */
  inRoom: boolean;
  left: ViewFace;
  right: ViewFace;
  /** 左右の扉の部屋（left/right が扉の時） */
  leftRoomId?: string;
  rightRoomId?: string;
  /** 横に開いた口の先（隣のマスの正面）に見えるもの。far = さらに続く */
  leftAhead?: ViewFace | 'far';
  rightAhead?: ViewFace | 'far';
  leftAheadRoomId?: string;
  rightAheadRoomId?: string;
  /** 松明（通路の壁。マスの位置で決まる。乱数は使わない） */
  torch: boolean;
}

export interface ViewEnd {
  /** 正面の面がある奥行き（この数のマスの奥の境目）。far = 見える範囲より奥まで続く */
  depth: number;
  face: ViewFace | 'far';
  roomId?: string;
}

/** 一人称の通路に描く奥行き（マス） */
export const VIEW_DEPTH = 4;

/** そのマスから見た部屋のマスの扉の種類 */
function roomFace(run: DungeonRun, roomId: string, fromHall: boolean): ViewFace {
  const room = run.rooms.find((r) => r.id === roomId);
  if (!room) return 'wall';
  if (room.id === run.currentRoomId) return fromHall ? 'arch' : 'wall';
  if (room.cleared) return 'locked';
  if (!reachableKeysOf(run).has(room.id)) return isBossRoomRow(run, room) ? 'boss' : 'locked';
  return isBossRoomRow(run, room) ? 'boss' : 'door';
}

/** ボスの部屋（最後の行） */
const isBossRoomRow = (run: DungeonRun, room: Room) => room.row === Math.max(...run.rooms.map((r) => r.row)) && room.next.length === 0;

/** 今開けられる扉の部屋（reachableRooms と同じ。dungeon.ts を読み込むと循環するのでここで計算） */
function reachableKeysOf(run: DungeonRun): Set<string> {
  if (!run.currentRoomId) return new Set(run.rooms.filter((r) => r.row === 0).map((r) => r.id));
  const cur = run.rooms.find((r) => r.id === run.currentRoomId);
  return new Set(cur?.cleared ? cur.next : []);
}

/** 今の位置と向きから見える通路（手前から奥へ）と、正面の突き当たり */
export function viewSlices(run: DungeonRun): { slices: ViewSlice[]; end: ViewEnd } {
  const seen = new Set(run.seen ?? []);
  const p = posOf(run);
  const [fx, fy] = DIRS[p.facing];
  const [rx, ry] = DIRS[((p.facing + 1) % 4) as Facing];
  // 選ばなかった扉・その扉へだけ続く通路は壁として描く
  const at = activeAt(run);
  const slices: ViewSlice[] = [];
  let x = p.x;
  let y = p.y;
  for (let d = 0; d < VIEW_DEPTH; d++) {
    const c = at(x, y)!;
    const side = (sx: number, sy: number): { face: ViewFace; roomId?: string } => {
      const n = at(x + sx, y + sy);
      if (!n) return { face: 'wall' };
      if (c.kind === 'hall' && n.kind === 'hall') return { face: seen.has(cellKey(n.x, n.y)) ? 'open' : 'dark' };
      if (c.kind === 'hall' && n.kind === 'room') return seen.has(cellKey(n.x, n.y)) ? { face: roomFace(run, n.roomId!, true), roomId: n.roomId } : { face: 'dark' };
      // 部屋の中: 北の出口だけ開いている。南は入ってきた扉（閉まっている）
      if (c.kind === 'room' && n.kind === 'hall') return n.y > c.y ? { face: seen.has(cellKey(n.x, n.y)) ? 'open' : 'dark' } : { face: 'locked' };
      return { face: 'wall' };
    };
    // 横に開いた口の先（隣のマスの、さらに正面のマス）
    const beyond = (sx: number, sy: number): { face?: ViewFace | 'far'; roomId?: string } => {
      const n = at(x + sx + fx, y + sy + fy);
      if (!n) return { face: 'wall' };
      if (!seen.has(cellKey(n.x, n.y))) return { face: 'dark' };
      if (n.kind === 'room') return { face: roomFace(run, n.roomId!, true), roomId: n.roomId };
      return { face: 'far' };
    };
    const l = side(-rx, -ry);
    const r = side(rx, ry);
    const la = l.face === 'open' ? beyond(-rx, -ry) : {};
    const ra = r.face === 'open' ? beyond(rx, ry) : {};
    slices.push({
      depth: d,
      inRoom: c.kind === 'room',
      left: l.face,
      right: r.face,
      leftRoomId: l.roomId,
      rightRoomId: r.roomId,
      leftAhead: la.face,
      rightAhead: ra.face,
      leftAheadRoomId: la.roomId,
      rightAheadRoomId: ra.roomId,
      torch: c.kind === 'hall' && (x + y) % 2 === 0,
    });
    // 正面の次のマス
    const n = at(x + fx, y + fy);
    if (!n) return { slices, end: { depth: d + 1, face: 'wall' } };
    if (!seen.has(cellKey(n.x, n.y))) return { slices, end: { depth: d + 1, face: 'dark' } };
    if (c.kind === 'hall' && n.kind === 'room') return { slices, end: { depth: d + 1, face: roomFace(run, n.roomId!, true), roomId: n.roomId } };
    if (c.kind === 'room') {
      // 部屋から北の出口へは続く。それ以外の向きは壁か、入ってきた扉
      if (!(n.kind === 'hall' && fy === 1)) return { slices, end: { depth: d + 1, face: n.kind === 'hall' ? 'locked' : 'wall' } };
    } else if (n.kind === 'hall' && n.y !== c.y) return { slices, end: { depth: d + 1, face: 'wall' } };
    x = n.x;
    y = n.y;
  }
  return { slices, end: { depth: VIEW_DEPTH, face: 'far' } };
}
