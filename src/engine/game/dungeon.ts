import { RARITY_NAME } from '../../data/terms';
// ===== ダンジョンの生成と移動 =====
import { getRoomType, ROOM_TYPES } from '../../data/rules';
import { getDungeon } from './registry';
import type { ChestSpec, DungeonDef, DungeonRun, Rarity, Room, RoomType } from '../../types';
import type { Rng } from '../rng';

export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legend'];
export const rarityIndex = (r: Rarity) => RARITIES.indexOf(r);
export { RARITY_NAME };
export const raiseRarity = (r: Rarity, n = 1): Rarity => RARITIES[Math.min(RARITIES.length - 1, rarityIndex(r) + n)];

const pick = <T,>(list: readonly T[], rng: Rng) => list[rng.int(list.length)];

/** 部屋の敵を決める（組み合わせと加算レベルは部屋の種類のデータ。レベルはダンジョンの基準 + 深さ + 難易度） */
function rollEnemies(def: DungeonDef, type: RoomType, row: number, levelBonus: number, rng: Rng) {
  const b = getRoomType(type).battle!;
  const ids = b.pool === 'boss' ? def.pools.boss : pick(def.pools[b.pool], rng);
  const depthBonus = Math.floor(row / 3);
  const lv = def.baseLevel + depthBonus + levelBonus + b.levelBonus;
  return ids.map((defId) => ({ defId, level: Math.max(1, lv) }));
}

/** ダンジョンの宝箱の見た目（木箱が中心。奥の行ほど良い箱が出やすい） */
function rollChest(row: number, rng: Rng): ChestSpec {
  const weights = [Math.max(30, 70 - row * 5), 25 + row * 2, 4 + row * 2, 1 + row * 0.5];
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng.next() * total;
  let i = 0;
  while (i < weights.length - 1 && (x -= weights[i]) >= 0) i++;
  return { rarity: RARITIES[i], locked: rng.next() < 0.4 };
}

/** 途中の行の部屋の種類（部屋の種類のデータの layoutWeight の割合。x は 0〜1 の乱数） */
function pickRoomType(x: number): RoomType {
  const list = ROOM_TYPES.all.filter((t) => (t.layoutWeight ?? 0) > 0);
  const total = list.reduce((n, t) => n + t.layoutWeight!, 0);
  let acc = 0;
  for (const t of list) {
    acc += t.layoutWeight! / total;
    if (x < acc) return t.id;
  }
  return list[list.length - 1].id;
}

/** ランダム生成の部屋の並び（1行あたり1〜3部屋。各部屋は次の行の近い部屋につながる） */
function generateLayout(def: DungeonDef, rng: Rng, eventIds: string[]): NonNullable<DungeonDef['layout']> {
  const rows = def.rows ?? 6;
  const widths = Array.from({ length: rows }, (_, i) => (i === 0 ? 1 + rng.int(2) : 1 + rng.int(3)));
  const layout: NonNullable<DungeonDef['layout']> = [];
  for (let r = 0; r < rows; r++) {
    const w = widths[r];
    const nextW = r + 1 < rows ? widths[r + 1] : 1;
    const row = Array.from({ length: w }, (_, c) => {
      // 部屋の種類: 1行目は戦闘。最後の行の手前は休憩が出やすい
      let type: RoomType;
      const x = rng.next();
      if (r === 0) type = 'battle';
      else if (r === rows - 1) type = x < 0.6 ? 'rest' : 'chest';
      else type = pickRoomType(x);
      // 次の行への接続（位置が近い部屋へ。必ず1つ以上）
      const center = nextW === 1 ? 0 : Math.round((c / Math.max(1, w - 1)) * (nextW - 1));
      const next = new Set<number>([center]);
      if (nextW > 1 && rng.next() < 0.5) next.add(Math.min(nextW - 1, Math.max(0, center + (rng.next() < 0.5 ? -1 : 1))));
      return {
        type,
        next: [...next].sort(),
        chest: getRoomType(type).behavior === 'chest' ? rollChest(r, rng) : undefined,
        eventId: getRoomType(type).behavior === 'event' ? pick(eventIds, rng) : undefined,
      };
    });
    layout.push(row);
  }
  // 次の行のどの部屋にも入れない部屋が無いよう、つながっていない部屋へ前の行からつなぐ
  for (let r = 1; r < rows; r++) {
    layout[r].forEach((_, c) => {
      if (!layout[r - 1].some((p) => p.next.includes(c))) {
        const from = Math.min(layout[r - 1].length - 1, Math.round((c / Math.max(1, layout[r].length - 1)) * (layout[r - 1].length - 1)));
        layout[r - 1][from].next = [...new Set([...layout[r - 1][from].next, c])].sort();
      }
    });
  }
  layout.push([{ type: 'boss', next: [] }]);
  return layout;
}

export function buildDungeon(dungeonId: string, rng: Rng, levelBonus: number, eventIds: string[]): DungeonRun {
  const def = getDungeon(dungeonId);
  const random = !!def.random || !def.layout;
  const layout = def.layout ?? generateLayout(def, rng, eventIds);
  const id = (r: number, c: number) => `r${r}c${c}`;
  const rooms: Room[] = layout.flatMap((row, r) =>
    row.map((spec, c) => ({
      id: id(r, c),
      row: r,
      col: c,
      type: spec.type,
      next: spec.next.map((n) => id(r + 1, n)),
      enemies: getRoomType(spec.type).battle ? rollEnemies(def, spec.type, r, levelBonus, rng) : undefined,
      chest: spec.chest ? { ...spec.chest } : undefined,
      eventId: spec.eventId,
      cleared: false,
    })),
  );
  return { dungeonId, name: def.name, random, background: def.background, rooms, gained: [] };
}

export function findRoom(run: DungeonRun, id: string): Room | undefined {
  return run.rooms.find((r) => r.id === id);
}

/** 次に入れる部屋 */
export function reachableRooms(run: DungeonRun): Room[] {
  if (!run.currentRoomId) return run.rooms.filter((r) => r.row === 0);
  const cur = findRoom(run, run.currentRoomId);
  if (!cur || !cur.cleared) return [];
  return cur.next.map((id) => findRoom(run, id)).filter((r): r is Room => !!r);
}
