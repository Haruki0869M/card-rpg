// ===== 扉の選択肢と、扉の壁の構図（抜本的な見直し §1-2 案A） =====
// 絵の扉と扉のボタンは、同じ並び（doorChoices）から作る: 1つ=正面、2つ=左・右、3つ=左・真ん中・右。
// マス目の視界（viewSlices）は扉には使わない（絵とボタンが食い違わないように）。乱数は使わない。
import { doorFront, doorKind, dungeonGrid, findPath, omenOfType, reachableRooms, type DoorKind, type DoorOmen, type ViewEnd, type ViewSlice } from '../../engine';
import type { DungeonRun, Room } from '../../types';

/** 前にある扉の選択肢（左から右へ）。押すと扉を開ける（扉1つ＝手番1回） */
export interface DoorChoice {
  room: Room;
  /** 扉の場所（例: 「左の扉」） */
  place: string;
  /** ボタンの文字（例: 「左の扉を開ける」） */
  label: string;
}

/** 扉の場所の名前（数と順番で決まる。絵の並びと同じ） */
export const doorPlace = (n: number, i: number) => (n === 1 ? '正面' : n === 2 ? (i === 0 ? '左' : '右') : n === 3 ? ['左', '真ん中', '右'][i] : `左から${i + 1}番目`);

/** 選べる扉（今の通路の、開けられる扉だけ。後ろの扉・通った扉・選ばなかった扉・入口は出さない）。左から右の順 */
export function doorChoices(run: DungeonRun): DoorChoice[] {
  const grid = dungeonGrid(run);
  const rooms = reachableRooms(run)
    .filter((r) => !r.cleared && r.id !== run.currentRoomId)
    .map((r) => ({ r, c: grid.roomCell.get(r.id), f: doorFront(run, r.id) }))
    .filter((x) => x.c && x.f && findPath(run, x.f))
    .sort((a, b) => a.c!.x - b.c!.x)
    .map((x) => x.r);
  const n = rooms.length;
  return rooms.map((room, i) => ({ room, place: `${doorPlace(n, i)}の扉`, label: `${doorPlace(n, i)}の扉を開ける` }));
}

/** 絵に描く扉（選択肢と同じ順番） */
export interface WallDoor {
  roomId: string;
  kind: DoorKind;
  omen?: DoorOmen;
}

export const wallDoors = (choices: DoorChoice[]): WallDoor[] => choices.map(({ room }) => ({ roomId: room.id, kind: doorKind(room), omen: omenOfType(room.type) }));

/** 絵の中の扉の位置（center = 正面 / left・right = 左右の口の奥） */
export type WallSlot = 'left' | 'center' | 'right';

/** 選択肢の数 → 絵の位置。1つ=正面、2つ=左・右、3つ=左・正面・右（4つ以上は3つまで描く。今のデータに4つの行は無い） */
export function wallSlots(n: number): WallSlot[] {
  if (n <= 0) return [];
  if (n === 1) return ['center'];
  if (n === 2) return ['left', 'right'];
  return ['left', 'center', 'right'];
}

/**
 * 扉の壁の構図（通路の突き当たりに、選択肢と同じ数・同じ並びの扉を必ず描く）。
 * 1つ: 1マス先の正面に大きな扉。2つ・3つ: 横に3マス広い広間（奥行き2マス）の奥の壁に、左・（正面）・右の扉が並ぶ
 */
export function doorWallView(doors: WallDoor[]): { slices: ViewSlice[]; end: ViewEnd; slotOf: Record<string, WallSlot> } {
  const slots = wallSlots(doors.length);
  const at = (slot: WallSlot): WallDoor | undefined => (slots.includes(slot) ? doors[slots.indexOf(slot)] : undefined);
  const slotOf: Record<string, WallSlot> = Object.fromEntries(slots.map((s, i) => [doors[i].roomId, s]));
  const plain = (depth: number): ViewSlice => ({ depth, inRoom: false, left: 'wall', right: 'wall', torch: depth === 0 });
  const face = (d: WallDoor | undefined): 'door' | 'boss' | 'wall' => (d ? (d.kind === 'door' ? 'door' : 'boss') : 'wall');
  const c = at('center');
  if (slots.length <= 1) return { slices: [plain(0)], end: { depth: 1, face: face(c), roomId: c?.roomId }, slotOf };
  const l = at('left');
  const r = at('right');
  // 手前のマスも左右に開けておく（手前の壁で、左右の扉が隠れないように）。手前のマスの「口の先」は描かない（奥のマスへ続く）
  const near: ViewSlice = { depth: 0, inRoom: false, left: 'open', right: 'open', torch: false };
  const wide: ViewSlice = { depth: 1, inRoom: false, left: 'open', right: 'open', leftAhead: face(l), rightAhead: face(r), leftAheadRoomId: l?.roomId, rightAheadRoomId: r?.roomId, torch: false };
  return { slices: [near, wide], end: { depth: 2, face: face(c), roomId: c?.roomId }, slotOf };
}

/** 扉の位置の、画面の真ん中からの横のずれ（通路の1マスの大きさの何倍か）。扉が開く演出で、選んだ扉へ寄るのに使う */
export const WALL_SLOT_X: Record<WallSlot, number> = { left: -0.326, center: 0, right: 0.326 };
