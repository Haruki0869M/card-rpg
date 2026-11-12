// ===== 回1の追加: 届かない施設へ向かう道・短い「次の目的」・町のうわさ（play-feedback-1113-plan §6）=====
import { describe, expect, it } from 'vitest';
import { DUNGEONS } from '../../data/dungeons';
import { DUNGEON_THEMES } from '../../data/rules';
import type { WorldState } from '../../types';
import { createGame } from '../index';
import { hexDistance, idxOf } from '../game/world/hex';
import { goalShortText, guideGoal, placeName, routeToward, rumorText } from '../game/world/guide';

const fresh = (seed = 1, scenarioId = 'corruptionKing') =>
  createGame({ seed, scenarioId, difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male' as const, name: '仲間', playerId: 'P1' as const }] });

/** 小さな地図（横 width マス・1行。地形の並びを決める） */
function strip(terrain: string[]): WorldState {
  return { width: terrain.length, height: 1, tiles: terrain.map((t) => ({ t, seen: true, r: 0 })), wanderers: [], ship: false } as unknown as WorldState;
}

describe('回1の追加: 届かない施設へ向かう道（読むだけ）', () => {
  it('要る移動力は地形のコストの合計。この番で行ける一番先のマスを返す', () => {
    // 平原1・森2・平原1・山3・平原1
    const w = strip(['plains', 'plains', 'forest', 'plains', 'mountain', 'plains']);
    expect(routeToward(w, 0, 5, 3)).toEqual({ total: 1 + 2 + 1 + 3 + 1, stop: 2 });
    expect(routeToward(w, 0, 5, 4)).toEqual({ total: 8, stop: 3 });
    // 最初の1歩も届かない
    expect(routeToward(strip(['plains', 'mountain', 'plains']), 0, 2, 2)).toEqual({ total: 4, stop: undefined });
  });

  it('通れない地形・霧・敵の先は道にならない（回り道が要る）', () => {
    expect(routeToward(strip(['plains', 'water', 'plains']), 0, 2, 6)).toBeUndefined();
    const fog = strip(['plains', 'plains', 'plains']);
    fog.tiles[1].seen = false;
    expect(routeToward(fog, 0, 2, 6)).toBeUndefined();
    const enemy = strip(['plains', 'plains', 'plains']);
    enemy.wanderers = [{ tile: 1 }] as never;
    expect(routeToward(enemy, 0, 2, 6)).toBeUndefined();
  });

  it('ゲームの状態を変えない', () => {
    const g = fresh();
    const w = g.world!;
    const here = w.pos[w.turn];
    const town = w.tiles.findIndex((t, i) => t.f?.kind === 'town' && i !== here);
    for (const t of w.tiles) t.seen = true;
    const snap = JSON.stringify(w);
    routeToward(w, here, town, 3);
    expect(JSON.stringify(w)).toBe(snap);
  });
});

describe('回1の追加: 短い「次の目的」', () => {
  it('「次: 名前（方角）」。同じマスなら「ここ」。依頼が足りない時は依頼の数', () => {
    const g = fresh();
    const goal = guideGoal(g)!;
    const w = g.world!;
    const from = idxOf(w, 7, 40);
    expect(goalShortText(g, goal, from)).toMatch(new RegExp(`^次: ${goal.name}（(東|北東|北|北西|西|南西|南|南東)）$`));
    expect(goalShortText(g, goal, goal.tile)).toBe(`次: ${goal.name}（ここ）`);
    expect(goalShortText(g, { ...goal, questsShort: 2 }, from)).toBe('次: 町の依頼をあと2つ');
  });
});

describe('回1の追加: 町のうわさ', () => {
  it('いちばん近い未踏破のランダムダンジョン。地域の言い方とテーマの名前', () => {
    const g = fresh();
    const w = g.world!;
    const town = w.tiles.findIndex((t) => t.f?.kind === 'town');
    const rds = w.tiles.flatMap((t, i) => (t.f?.kind === 'dungeon' && DUNGEONS.get(t.f.id).random ? [i] : []));
    expect(rds.length).toBeGreaterThan(0);
    const near = rds.slice().sort((a, b) => hexDistance(w, town, a) - hexDistance(w, town, b) || a - b)[0];
    const theme = DUNGEON_THEMES.get(w.tiles[near].f!.theme!).name;
    expect(rumorText(g, w, town)).toBe(`うわさ: ${placeName(g, w, near)}に、${theme}があるらしい`);
    // 踏破したら次に近い物、全部踏破したら出さない
    w.tiles[near].f!.used = true;
    const rest = rds.filter((i) => i !== near);
    if (rest.length) expect(rumorText(g, w, town)).toContain(DUNGEON_THEMES.get(w.tiles[rest[0]].f!.theme!).name);
    for (const i of rds) w.tiles[i].f!.used = true;
    expect(rumorText(g, w, town)).toBeUndefined();
  });

  it('同じ地図なら、いつも同じ文（乱数を使わない）', () => {
    const a = fresh(5);
    const b = fresh(5);
    const ta = a.world!.tiles.findIndex((t) => t.f?.kind === 'town');
    expect(rumorText(a, a.world!, ta)).toBe(rumorText(b, b.world!, ta));
  });
});
