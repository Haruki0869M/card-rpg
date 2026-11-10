// ===== ダンジョンの移動演出（画面酔いの手直し）: 遠い扉まで歩いても待ち時間が長くなりすぎない・着いた景色は今と同じ =====
import { describe, expect, it } from 'vitest';
import { TIMING } from '../../data/balance';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { buildDungeon, createRng, dungeonGrid, posOf } from '../../engine';
import type { DungeonRun, Facing } from '../../types';
import { framesBetween, shortenWalk, walkedToDoor } from './DungeonAnim';
import type { Frame } from './DungeonAnim';

const eventIds = EVENTS.all.filter((e) => e.where !== 'map').map((e) => e.id);
const total = (fs: { seconds: number }[]) => fs.reduce((n, f) => n + f.seconds, 0);

/** 部屋 roomId に立った（前を向いた）複製 */
function standIn(run0: DungeonRun, roomId: string): DungeonRun {
  const r = structuredClone(run0);
  r.rooms.find((x) => x.id === roomId)!.cleared = true;
  r.currentRoomId = roomId;
  const c = dungeonGrid(r).roomCell.get(roomId)!;
  r.pos = { x: c.x, y: c.y, facing: 0 };
  return r;
}

describe('扉まで歩く演出の長さ', () => {
  it('どの部屋からどの扉まで歩いても2秒程度まで（高速モードは半分）。最後は今の景色、簡易は1回の切り替え', () => {
    let longest = 0;
    for (const def of DUNGEONS.all) {
      const d = buildDungeon(def.id, createRng(3), 0, eventIds);
      for (const room of d.rooms) {
        const here = standIn(d, room.id);
        const start = { ...here, pos: { ...posOf(here), facing: 0 as Facing } };
        for (const n of room.next) {
          const walked = walkedToDoor(here, n);
          const fs = framesBetween(start, walked, 1, false);
          longest = Math.max(longest, total(fs));
          expect(total(fs), `${def.id} ${room.id}→${n}`).toBeLessThanOrEqual(2.05);
          expect(total(framesBetween(start, walked, 1 / TIMING.fastModeFactor, false))).toBeCloseTo(total(fs) / TIMING.fastModeFactor, 5);
          if (!fs.length) continue;
          expect(fs[fs.length - 1].target).toBe(walked);
          expect(framesBetween(start, walked, 1, true).map((f) => f.kind)).toEqual(['fade']);
        }
      }
    }
    expect(longest).toBeGreaterThan(0);
  });

  it('遠くまで歩く時は、最初と最後の2コマずつだけ見せ、間は暗転1回（見えたマスは間の最後のコマの分まで引き継ぐ）', () => {
    const run = {} as DungeonRun;
    const fs: Frame[] = Array.from({ length: 12 }, (_, i) => ({ target: { ...run, seen: [String(i)] }, kind: 'forward', seconds: TIMING.dungeonWalkStep, moved: true }));
    const out = shortenWalk(fs, 1);
    expect(out.map((f) => f.kind)).toEqual(['forward', 'forward', 'dim', 'forward', 'forward']);
    expect(out[2].target).toBe(fs[9].target);
    expect(out[4].target).toBe(fs[11].target);
    expect(total(out)).toBeLessThanOrEqual(2.05);
    // 短い道はそのまま
    expect(shortenWalk(fs.slice(0, 5), 1)).toHaveLength(5);
  });
});
