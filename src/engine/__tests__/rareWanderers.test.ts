// K3 レアの敵: 徘徊する敵を置く時、地域に rareEncounters があれば、小さな確率でレアの組に置き換わる
import { afterEach, describe, expect, it } from 'vitest';
import { ENEMIES } from '../../data/enemies';
import { getScenario } from '../../data/scenarios';
import { BALANCE } from '../../data/balance';
import { enemyName } from '../battle/units';
import { createGame, createRng } from '../index';
import { spawnWanderer } from '../game/world/wanderers';
import type { EnemyState } from '../../types';

const newGame = (seed = 3) => createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }] });
const regionOf = () => getScenario('corruptionKing').map!.regions[1];

describe('K3 レアの徘徊する敵', () => {
  afterEach(() => {
    delete regionOf().rareEncounters;
  });

  it('rareEncounters が無い地域は、レアは出ず、乱数は従来どおり2回だけ引く', () => {
    const g = newGame();
    const rng = createRng(11);
    const ref = createRng(11);
    const wd = spawnWanderer(g, g.world!, rng, 1)!;
    expect(wd.rare).toBeUndefined();
    ref.next();
    ref.next();
    expect(rng.state).toBe(ref.state);
  });

  it('rareEncounters がある地域では、約6%でレアの組になり、地図に印が付く', () => {
    regionOf().rareEncounters = [['goldenThief']];
    const rng = createRng(5);
    let rare = 0;
    const N = 600;
    for (let i = 0; i < N; i++) {
      const g = newGame(100 + i);
      const wd = spawnWanderer(g, g.world!, rng, 1);
      if (wd?.rare) {
        rare++;
        expect(wd.enemies.map((e) => e.defId)).toEqual(['goldenThief']);
      } else if (wd) {
        expect(wd.enemies.map((e) => e.defId)).not.toContain('goldenThief');
      }
    }
    const pct = (rare * 100) / N;
    expect(pct).toBeGreaterThan(BALANCE.rareWandererChance / 3);
    expect(pct).toBeLessThan(BALANCE.rareWandererChance * 2.5);
  }, 20000); // 冒険を600回作る（段階6a でシナリオ1の地図が2.25倍になり、1回あたり約2ms→5ms。全部のテストを並べて動かすと5秒を超えるため）

  it('同じ種なら、同じ結果になる（オンラインで全員が同じ）', () => {
    regionOf().rareEncounters = [['goldenThief'], ['guardDog']];
    const run = () => {
      const g = newGame();
      const rng = createRng(77);
      return Array.from({ length: 60 }, () => spawnWanderer(g, g.world!, rng, 1)).map((w) => `${w?.tile}:${w?.rare ? 'R' : '-'}:${w?.enemies.map((e) => e.defId).join('+')}`);
    };
    expect(run()).toEqual(run());
  });

  it('場所を決めた配置（襲撃など）ではレアにならない', () => {
    regionOf().rareEncounters = [['goldenThief']];
    const g = newGame();
    const w = g.world!;
    const rng = createRng(1);
    const tile = w.tiles.findIndex((t, i) => t.r === 1 && !w.wanderers.some((x) => x.tile === i));
    for (let i = 0; i < 100; i++) expect(spawnWanderer(g, w, rng, 1, tile)?.rare).toBeUndefined();
  });

  it('rare の敵は、名前に★が付く', () => {
    const def = ENEMIES.get('goldenThief');
    const e = { defId: 'goldenThief', phase: 0 } as unknown as EnemyState;
    expect(enemyName(e)).not.toContain('★');
    def.rare = true;
    try {
      expect(enemyName(e).startsWith('★')).toBe(true);
    } finally {
      delete def.rare;
    }
  });
});
