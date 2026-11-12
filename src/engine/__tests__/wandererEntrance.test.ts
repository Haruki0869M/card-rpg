// ===== 回3 E: ダンジョン・町の入口と、そのとなりのマスに、徘徊する敵が湧かない・入らない =====
// オーナーの実機（2人オンライン）で「溶岩の大空洞の入口に P1 がいて、P2 が合流した瞬間、ダンジョンではなく雑魚の戦闘になった」。
// 広い地図（シナリオ1）を、種を変えて数百手ずつ自動で進め、
//   - 施設のマス・入口のとなりのマスに、敵が湧く／動いて入る事があるか
//   - 施設のマスへ動いたのに、途中で敵に当たって戦闘になる事があるか
// を数える。
import { describe, expect, it } from 'vitest';
import type { GameCommand, GameState, WorldState } from '../../types';
import { applyGameCommand, createGame } from '../index';
import { botNextCommand } from '../bot';
import { neighbors } from '../game/world/hex';
import { entranceGuardTiles } from '../game/world/wanderers';

function newGame(seed: number): GameState {
  return createGame({
    seed,
    scenarioId: 'corruptionKing',
    difficulty: 'normal',
    online: true,
    party: [
      { classId: 'warrior', gender: 'male', name: 'A', playerId: 'P1' },
      { classId: 'mage', gender: 'female', name: 'B', playerId: 'P2' },
    ],
  });
}

const target = (cmd: GameCommand, before: GameState): number | undefined => {
  const c = cmd.type === 'SCENE' ? undefined : cmd;
  if (c?.type === 'WORLD_MOVE') return c.to;
  if (c?.type === 'WORLD_MOVE_AGREE') return before.world?.moveProposal?.to;
  return undefined;
};

interface Count {
  /** 敵が施設のマスに（湧いた・動いた）。襲撃と夜襲は除く */
  onFacility: number;
  /** 敵が入口（町・鍵のダンジョン・最後のダンジョン）のとなりに、新しく湧いた・動いて入った */
  intoGuard: number;
  /** 施設のマスへ動いたのに、遭遇（戦闘の前の窓）になった */
  encounterOnWayToFacility: number;
  moves: number;
}

function run(seed: number, steps: number, c: Count) {
  let g = newGame(seed);
  const memo = { interacted: new Set<string>() };
  for (let i = 0; i < steps; i++) {
    if (g.mode === 'ending' || g.mode === 'gameover') break;
    const cmd = botNextCommand(g, memo);
    if (!cmd) break;
    const r = applyGameCommand(g, cmd);
    if (r.error) continue;
    const w0 = g.world;
    const w1 = r.state.world;
    if (w0 && w1) {
      const guard = entranceGuardTiles(w1);
      const old = new Map(w0.wanderers.map((x) => [x.id, x.tile]));
      for (const wd of w1.wanderers) {
        if (old.get(wd.id) === wd.tile) continue;
        // 襲撃（町のマスに置く決まり）・夜襲（野営したキャラのマスに出る）・災厄は別の決まり
        const ambush = Object.values(w1.pos).includes(wd.tile);
        if (wd.raidTown || wd.scourge || ambush) continue;
        if (w1.tiles[wd.tile].f) c.onFacility++;
        if (guard.has(wd.tile)) c.intoGuard++;
      }
      const to = target(cmd, g);
      if (to !== undefined && w0.tiles[to]?.f) {
        c.moves++;
        if (r.state.mode === 'encounter') c.encounterOnWayToFacility++;
      }
    }
    g = r.state;
  }
}

describe('回3 E: 入口のまわりの敵', () => {
  it('入口のとなりのマス: 町・鍵のダンジョン・最後のダンジョンのとなり（ランダムダンジョン・塔などは入らない）', () => {
    const g = newGame(11);
    const w = g.world as WorldState;
    const guard = entranceGuardTiles(w);
    let n = 0;
    w.tiles.forEach((t, i) => {
      if (t.f?.kind !== 'town' && !(t.f?.kind === 'dungeon' && ['emeraldTemple', 'silentCatacomb', 'lavaCavern', 'demonCastle'].includes(t.f.id))) return;
      for (const nb of neighbors(w, i)) {
        if (w.tiles[nb].f) continue;
        expect(guard.has(nb)).toBe(true);
        n++;
      }
    });
    expect(n).toBeGreaterThan(20);
    // 入口のとなりでないマスは入らない（施設のマスそのものも入らない。施設のマスは、もともと敵が入れない）
    for (const i of guard) {
      expect(w.tiles[i].f).toBeUndefined();
      expect(neighbors(w, i).some((nb) => w.tiles[nb].f?.kind === 'town' || w.tiles[nb].f?.kind === 'dungeon')).toBe(true);
    }
  });

  it('種を12個 × 600手: 敵は施設のマスにも、入口のとなりにも、湧かない・動いて入らない。施設へ動いて途中で戦闘にならない', () => {
    const c: Count = { onFacility: 0, intoGuard: 0, encounterOnWayToFacility: 0, moves: 0 };
    for (let s = 0; s < 12; s++) run(1000 + s * 7919, 600, c);
    console.log('回3E 数えた結果', JSON.stringify(c));
    expect(c.moves).toBeGreaterThan(10);
    expect(c).toMatchObject({ onFacility: 0, intoGuard: 0, encounterOnWayToFacility: 0 });
  }, 120_000);
});
