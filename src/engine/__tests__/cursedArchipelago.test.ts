// ===== シナリオ3「呪われた群島」（K4 手順1: 地図・地域・町・船）のテスト =====
import { describe, expect, it } from 'vitest';
import { corruptionName, getScenario } from '../../data/scenarios';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { ITEMS } from '../../data/items';
import { QUESTS, TERRAINS, TOWNS } from '../../data/world';
import { createRng } from '../rng';
import { applyGameCommand, canReportQuest, createGame, handleDefeat, hexDistance, neighbors } from '../index';

const newGame = (seed = 5) =>
  createGame({ seed, scenarioId: 'cursedArchipelago', difficulty: 'normal', party: ['warrior', 'mage'].map((c, i) => ({ classId: c, gender: 'male' as const, name: `${c}${i}`, playerId: 'P1' })) });

/** from から歩いて（船なしで）行けるマス、船ありで行けるマス */
function flood(g: ReturnType<typeof newGame>, from: number, ship: boolean): Set<number> {
  const w = g.world!;
  const seen = new Set([from]);
  const q = [from];
  while (q.length) {
    const cur = q.shift()!;
    for (const n of neighbors(w, cur)) {
      const t = TERRAINS.get(w.tiles[n].t);
      const ok = t.moveCost > 0 || (ship && t.sea);
      if (!ok || seen.has(n)) continue;
      seen.add(n);
      q.push(n);
    }
  }
  return seen;
}

describe('呪われた群島', () => {
  it('町・ダンジョン・依頼・鍵がそろっていて、鍵3つで最終ダンジョンが開く', () => {
    const sc = getScenario('cursedArchipelago');
    for (const f of sc.map!.features) {
      if (f.kind === 'town') expect(TOWNS.has(f.id), f.id).toBe(true);
      if (f.kind === 'dungeon') expect(DUNGEONS.has(f.id), f.id).toBe(true);
    }
    const keys = Object.keys(sc.story!.keys!);
    const ds = DUNGEONS.forScenario('cursedArchipelago');
    expect(ds.map((d) => d.rewardKey).filter(Boolean).sort()).toEqual([...keys].sort());
    expect([...(ds.find((d) => d.finale)!.requiresKeys ?? [])].sort()).toEqual([...keys].sort());
    for (const id of ['borrowShip', 'seaRaiders', 'tideStoneQuest', 'pirateCaptainQuest', 'sunkenTempleQuest']) expect(QUESTS.has(id), id).toBe(true);
    expect(corruptionName('cursedArchipelago')).toBe('霧の濃さ');
  });

  // 区切り2（15×42）から: 船が無くても中央の街道と東は歩ける（海賊の隠れ島と西の島は船）。歩ける所の細かい確かめは scenario3Map.test.ts
  it('どの種でも: 船が無くても町を出て歩ける、船があれば町・ダンジョンの全部に行ける。海のマスが十分ある', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const g = newGame(seed);
      const w = g.world!;
      const start = w.pos[g.heroes[0].id];
      const land = flood(g, start, false);
      const all = flood(g, start, true);
      const targets = w.tiles.map((t, i) => (t.f?.kind === 'town' || t.f?.kind === 'dungeon' ? i : -1)).filter((i) => i >= 0);
      for (const i of targets) expect(all.has(i), `seed ${seed} tile ${i}`).toBe(true);
      expect(w.tiles.filter((t) => TERRAINS.get(t.t).sea).length, `seed ${seed}`).toBeGreaterThan(40);
      // 港の島の中に、船をもらったあとの目的地（最初の依頼の町）があり、陸だけでも町を出られる広さがある
      expect(land.size, `seed ${seed}`).toBeGreaterThanOrEqual(7);
    }
  });

  it('最初の町で「船を借りる」を受けて報告すると船がもらえる（海を進めるようになる）', () => {
    let g = newGame();
    const w = g.world!;
    w.story = undefined;
    const run = (cmd: Parameters<typeof applyGameCommand>[1]) => {
      const r = applyGameCommand(g, cmd);
      if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
      g = r.state;
    };
    const hero = g.world!.turn;
    run({ type: 'WORLD_INTERACT', playerId: 'P1', heroId: hero, party: [hero] });
    expect(g.mode).toBe('town');
    expect(g.world!.ship).toBeUndefined();
    run({ type: 'QUEST_ACCEPT', playerId: 'P1', questId: 'borrowShip' });
    expect(canReportQuest(g, 'borrowShip')).toBe(true);
    run({ type: 'QUEST_REPORT', playerId: 'P1', questId: 'borrowShip' });
    expect(g.world!.ship).toBe(true);
  });
});

describe('戦闘に負けた時の復活の町（船が無い時に、島から出られなくならない）', () => {
  it('どの種でも: 海の向こうの町ではなく、船なしで行ける町で目を覚ます（種874651857は、近い町が霧の海域の島にあった）', () => {
    for (const seed of [874651857, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const g = newGame(seed);
      const w = g.world!;
      const h = g.heroes[0];
      // 最初のダンジョン（難破船の洞窟）の上で負けた。
      // 道を長くしてから、船が無いと洞窟まで歩いて行けない種が多い。その時は、船なしで歩いて行けるマスのうち洞窟に一番近いマスで負けたことにする
      const cave = w.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === 'wreckCave');
      const start = w.pos[h.id];
      const onFoot = [...flood(g, start, false)];
      const dungeon = onFoot.includes(cave) ? cave : onFoot.sort((a, b) => hexDistance(w, a, cave) - hexDistance(w, b, cave) || a - b)[0];
      w.pos[h.id] = dungeon;
      g.lives = 3;
      handleDefeat(g, [h.id], createRng(1));
      const at = w.pos[h.id];
      expect(w.tiles[at].f?.kind, `seed ${seed}`).toBe('town');
      // 負けた場所から、船なしで歩いて行ける
      expect(flood(g, dungeon, false).has(at), `seed ${seed}: 町 ${at} は陸でつながっている`).toBe(true);
    }
  });
});

describe('呪われた群島の中身（手順4）', () => {
  it('固有装備7個（宿題3で黄金の錨はどこでも出るようにした）・突発イベント5つは、このシナリオだけで使われる', () => {
    const gear = ITEMS.all.filter((i) => i.scenario === 'cursedArchipelago');
    expect(gear.length).toBe(7);
    const own = ['seaStorm', 'seaDriftingSailor', 'seaFloatingChest', 'seaDolphin', 'mistPetSeasick'];
    const mine = EVENTS.forScenario('cursedArchipelago').map((e) => e.id);
    for (const id of own) {
      expect(mine).toContain(id);
      expect(EVENTS.forScenario('corruptionKing').map((e) => e.id)).not.toContain(id);
      expect(EVENTS.forScenario('frozenKingdom').map((e) => e.id)).not.toContain(id);
    }
  });

  it('鍵のダンジョンの制覇後の物語は2〜3行・1行30字まで。ボス手前は物語の部屋', () => {
    const ds = DUNGEONS.forScenario('cursedArchipelago');
    for (const d of ds.filter((x) => x.rewardKey)) {
      expect(d.clearStory!.length).toBeGreaterThanOrEqual(2);
      expect(d.clearStory!.length).toBeLessThanOrEqual(3);
      for (const l of d.clearStory!) expect([...l].length, l).toBeLessThanOrEqual(30);
    }
    for (const d of ds.filter((x) => x.layout)) {
      const rows = d.layout!;
      const before = rows[rows.length - 2];
      expect(before.some((r) => r.type === 'event'), d.id).toBe(true);
    }
  });
});
