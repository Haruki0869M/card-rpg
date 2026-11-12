// ===== 回1: 迷わない導線と、寄り道の見つけ方（play-feedback-1113-plan §2 ①②）=====
// 方角・地域の文、次の目的、扉が開かない時の文、通り過ぎた時の知らせ、分かれ道の立て札、災厄の知らせ（別の窓）
import { describe, expect, it } from 'vitest';
import { DUNGEONS } from '../../data/dungeons';
import { getScenario } from '../../data/scenarios';
import type { GameCommand, GameState } from '../../types';
import { applyGameCommand, createGame, migrateGame } from '../index';
import { createRng } from '../rng';
import { idxOf, neighbors, rowOf } from '../game/world/hex';
import { direction8, dungeonTile, goalLineText, guideGoal, passByNotice, placeName, scourgePlaceText, signposts, signpostText, whereText } from '../game/world/guide';
import { dungeonGateError } from '../game/world/questGate';
import { spawnScourge } from '../game/world/scourges';

const CK = 'corruptionKing';
/** 2つ目の鍵のダンジョンの名前（データから） */
const CAT = DUNGEONS.get('silentCatacomb').name;
const fresh = (seed = 1, scenarioId = CK, n = 2) =>
  createGame({ seed, scenarioId, difficulty: 'normal', party: Array.from({ length: n }, (_, i) => ({ classId: 'warrior', gender: 'male' as const, name: `仲間${i}`, playerId: `P${i + 1}` as 'P1' })) });
function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
const regionIdx = (id: string) => getScenario(CK).map!.regions.findIndex((r) => r.id === id);
/** 鍵のダンジョンを制覇した事にする */
function clear(g: GameState, id: string) {
  g.clearedDungeons.push(id);
  const k = DUNGEONS.get(id).rewardKey;
  if (k) g.world!.keys.push(k);
}

describe('回1: 方角（8つ）と地域の言い方', () => {
  it('方角は地図の上が北。奇数の行の半マスのずれも数える', () => {
    const w = { width: 15 };
    const at = (c: number, r: number) => idxOf(w, c, r);
    expect(direction8(w, at(7, 20), at(12, 20))).toBe('東');
    expect(direction8(w, at(7, 20), at(2, 20))).toBe('西');
    expect(direction8(w, at(7, 20), at(7, 10))).toBe('北');
    expect(direction8(w, at(7, 20), at(7, 30))).toBe('南');
    expect(direction8(w, at(7, 20), at(12, 14))).toBe('北東');
    expect(direction8(w, at(7, 20), at(2, 26))).toBe('南西');
    expect(direction8(w, at(7, 20), at(7, 20))).toBe('');
  });

  it('広い地図: 地域の名前＋帯（西・東）。中央の帯は付けない', () => {
    const g = fresh();
    const w = g.world!;
    expect(placeName(g, w, dungeonTile(w, 'silentCatacomb'))).toBe('嘆きの沼の東');
    expect(placeName(g, w, dungeonTile(w, 'emeraldTemple'))).toBe('翠の森の西');
    expect(placeName(g, w, idxOf(w, 7, 40))).toBe('はじまりの平原');
  });

  it('前の広さの地図（帯の無いシナリオ）: 地域の名前だけ', () => {
    const g = fresh(1, 'frozenKingdom');
    const w = g.world!;
    const t = w.tiles.findIndex((x) => x.f?.kind === 'dungeon');
    expect(placeName(g, w, t)).toBe(getScenario('frozenKingdom').map!.regions[w.tiles[t].r].name);
    expect(signposts(g, w)).toEqual([]);
  });
});

describe('回1: 次の目的の行', () => {
  it('鍵の順に変わる。文は「次の目的: 名前（方角・地域）」。同じマスなら「ここ」', () => {
    const g = fresh();
    const w = g.world!;
    const start = w.pos[g.heroes[0].id];
    let goal = guideGoal(g)!;
    expect(goal.dungeonId).toBe('emeraldTemple');
    expect(goalLineText(g, goal, start)).toBe(`次の目的: 翠の神殿（${direction8(w, start, goal.tile)}・翠の森の西）`);
    clear(g, 'emeraldTemple');
    goal = guideGoal(g)!;
    expect(goal.dungeonId).toBe('silentCatacomb');
    expect(goalLineText(g, goal, start)).toBe(`次の目的: ${CAT}（${direction8(w, start, goal.tile)}・嘆きの沼の東）`);
    expect(direction8(w, start, goal.tile)).toMatch(/^(北|北東)$/);
    expect(goalLineText(g, goal, goal.tile)).toBe(`次の目的: ${CAT}（ここ）`);
  });

  it('鍵はそろったのに依頼が足りない時: 「町の依頼をあと〇つ」。最後は魔王城', () => {
    const g = fresh();
    clear(g, 'emeraldTemple');
    clear(g, 'silentCatacomb');
    const goal = guideGoal(g)!;
    expect(goal.dungeonId).toBe('lavaCavern');
    expect(goal.questsShort).toBe(1);
    expect(goalLineText(g, goal, 0)).toBe('次の目的: 町の依頼をあと1つ果たす（「溶岩の大空洞」の扉が開く）');
    clear(g, 'lavaCavern');
    expect(guideGoal(g)!.dungeonId).toBe('demonCastle');
  });

  it('前の広さの地図（ほかのシナリオ）でも出る', () => {
    for (const id of ['frozenKingdom', 'sandDynasty', 'cursedArchipelago', 'clockworkEmpire', 'starCastle', 'dreamLabyrinth']) {
      const g = fresh(2, id);
      const goal = guideGoal(g);
      expect(goal, id).toBeDefined();
      expect(goalLineText(g, goal!, g.world!.pos[g.heroes[0].id])).toMatch(/^次の目的: .+（.+）$/);
    }
  });
});

describe('回1: 扉が開かない時の文', () => {
  it('鍵のダンジョンの方角と地域を足す（キャラのいるマスから）', () => {
    const g = fresh();
    clear(g, 'emeraldTemple');
    const w = g.world!;
    const lava = dungeonTile(w, 'lavaCavern');
    const cat = dungeonTile(w, 'silentCatacomb');
    const text = dungeonGateError(g, DUNGEONS.get('lavaCavern'), lava);
    expect(text).toBe(`扉が開かない…。封印の鍵（蒼）が要る。先に「${CAT}」（${direction8(w, lava, cat)}・嘆きの沼の東）を制覇しよう`);
    expect(direction8(w, lava, cat)).toBe('南東');
    // マスを渡さない時は、地域だけ（今までの呼び方でも壊れない）
    expect(dungeonGateError(g, DUNGEONS.get('lavaCavern'))).toBe(`扉が開かない…。封印の鍵（蒼）が要る。先に「${CAT}」（嘆きの沼の東）を制覇しよう`);
  });

  it('エンジンの扉の操作も同じ文で断る（状態は変わらない）', () => {
    let g = fresh();
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    const w = g.world!;
    const lava = dungeonTile(w, 'lavaCavern');
    const h = g.heroes.find((x) => x.id === w.turn)!;
    w.pos[h.id] = lava;
    const r = applyGameCommand(g, { type: 'WORLD_INTERACT', playerId: h.playerId, heroId: h.id });
    expect(r.error).toBe(dungeonGateError(g, DUNGEONS.get('lavaCavern'), lava));
    expect(r.error).toContain(`「${CAT}」（`);
  });
});

describe('回1: 分かれ道の立て札', () => {
  it('3つの鍵のダンジョンに1つずつ。街道の道のマスに立ち、脇道を歩くマスの数と方角が合う（種を3つ）', () => {
    for (const seed of [1, 2, 3]) {
      const g = fresh(seed);
      const w = g.world!;
      const posts = signposts(g, w);
      expect(posts.map((p) => p.dungeonId).sort()).toEqual(['emeraldTemple', 'lavaCavern', 'silentCatacomb']);
      for (const p of posts) {
        expect(w.tiles[p.tile].t).toBe('road');
        expect(w.tiles[p.tile].f?.kind).not.toBe('town');
        expect(p.steps).toBeGreaterThanOrEqual(1);
        expect(p.steps).toBeLessThanOrEqual(8);
        expect(p.dir).toBe(direction8(w, p.tile, dungeonTile(w, p.dungeonId)));
      }
      const cat = posts.find((p) => p.dungeonId === 'silentCatacomb')!;
      expect(cat.dir).toBe('東');
      expect(signpostText(cat)).toBe(`→ 東へ${cat.steps}マス: ${CAT}`);
      // 街道の分かれ道は、ダンジョンと同じ高さのあたり（街道を歩けば通る）
      expect(Math.abs(rowOf(w, cat.tile) - rowOf(w, dungeonTile(w, 'silentCatacomb')))).toBeLessThanOrEqual(4);
    }
  });

  it('保存して読み直しても（v26 の広い地図の途中）、同じマスに出る。乱数の状態は変えない', () => {
    const g = fresh(4);
    const before = JSON.stringify(g);
    const posts = signposts(g, g.world!);
    expect(JSON.stringify(g)).toBe(before);
    const again = migrateGame(JSON.parse(before))!;
    expect(signposts(again, again.world!)).toEqual(posts);
  });
});

describe('回1: 通り過ぎた時の知らせ', () => {
  it('次の目的の鍵のダンジョンの地域を出て、新しい地域に初めて入った時: 地域の紹介の後に、別の窓で1回だけ', () => {
    let g = fresh(1, CK, 1);
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    clear(g, 'emeraldTemple');
    const w = g.world!;
    const swamp = regionIdx('swamp');
    const volcano = regionIdx('volcano');
    w.visitedRegions = [regionIdx('plains'), regionIdx('forest'), swamp];
    w.wanderers = [];
    // 沼の一番上の行の、火山に入る隣のマスがあるマスに立つ
    const from = w.tiles.findIndex((t, i) => t.r === swamp && neighbors(w, i).some((n) => w.tiles[n].r === volcano && w.tiles[n].t === 'road'));
    const to = neighbors(w, from).find((n) => w.tiles[n].r === volcano && w.tiles[n].t === 'road')!;
    const h = g.heroes[0];
    w.pos[h.id] = from;
    w.turn = h.id;
    w.move = 3;
    w.tiles[to].seen = true;
    const rngBefore = g.rngState;
    g = run(g, { type: 'WORLD_MOVE', playerId: h.playerId, heroId: h.id, to, companions: [] });
    expect(g.rngState).toBe(rngBefore);
    expect(g.world!.story?.title).toBe('灼熱の火山');
    expect(g.world!.storyQueue?.map((s) => s.title)).toEqual(['まだ行っていない場所']);
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    const cat = dungeonTile(g.world!, 'silentCatacomb');
    expect(g.world!.story).toEqual({
      title: 'まだ行っていない場所',
      lines: [`まだ「${CAT}」に行っていない（${whereText(g, g.world!, to, cat)}）。`, 'この先のダンジョンには、封印の鍵（蒼）が要る。'],
    });
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    expect(g.world!.story).toBeUndefined();
    expect(g.world!.storyQueue).toBeUndefined();
  });

  it('目的地の地域にまだ入っていない時・鍵を取った後は出ない', () => {
    const g = fresh();
    const w = g.world!;
    clear(g, 'emeraldTemple');
    w.visitedRegions = [regionIdx('plains'), regionIdx('forest')];
    expect(passByNotice(g, w, regionIdx('volcano'), 0)).toBeUndefined();
    w.visitedRegions.push(regionIdx('swamp'));
    expect(passByNotice(g, w, regionIdx('volcano'), 0)).toBeDefined();
    clear(g, 'silentCatacomb');
    expect(passByNotice(g, w, regionIdx('volcano'), 0)).toBeUndefined();
  });
});

describe('回1: 災厄が出た時の知らせ（別の窓）と場所の文', () => {
  it('制覇の物語が出ている時は、後ろに足さずに、閉じた後の別の窓で出す。題に地域', () => {
    let g = fresh(5, CK, 1);
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    const w = g.world!;
    w.story = { title: '翠の神殿', lines: ['神殿の封印が解けた。'] };
    w.scourgesMet = ['miasmaNecro', 'nightmareBeast', 'stormWitch', 'infernoDemon'];
    const wd = spawnScourge(g, w, createRng(3))!;
    expect(wd.scourge).toBe('greedKing');
    expect(w.story).toEqual({ title: '翠の神殿', lines: ['神殿の封印が解けた。'] });
    expect(w.storyQueue).toHaveLength(1);
    const page = w.storyQueue![0];
    expect(page.title).toBe(`💀 強欲の盗賊王が、${placeName(g, w, wd.tile)}に現れた！`);
    expect(page.title).toMatch(/の(西|東)に現れた！$/);
    expect(page.lines.slice(1)).toEqual(['すべての町の店の値段が25%高い（売る値段は変わらない）。', '倒すと元に戻り、専用の装備を落とす。', 'くわしい場所は、見晴らしの塔に登ると分かる。']);
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    expect(g.world!.story?.title).toBe(page.title);
  });

  it('場所の文: 見えていない時は地域まで。見えたら「地図の💀の所」', () => {
    const g = fresh();
    const w = g.world!;
    const t = dungeonTile(w, 'silentCatacomb');
    expect(scourgePlaceText(g, w, t, false)).toBe('場所: 嘆きの沼の東（くわしい場所は、塔に登ると分かる）');
    expect(scourgePlaceText(g, w, t, true)).toBe('場所: 地図の💀の所');
  });
});
