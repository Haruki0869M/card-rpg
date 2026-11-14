// ===== 冒険の長さ・転職の速さの見直し（docs/archive/tasks/play-feedback-plan.md §4・§5） =====
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { CLASSES } from '../../data/classes';
import { DUNGEONS } from '../../data/dungeons';
import { SCENARIOS } from '../../data/scenarios';
import { reachable } from '../game/world/hex';
import { finishedQuestCount } from '../game/world/questGate';
import { startTileOf } from '../game/world/start';
import { spawnWanderer } from '../game/world/wanderers';
import { nextGoalLines } from '../game/game';
import { createRng } from '../rng';
import { QUESTS, TOWNS } from '../../data/world';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, createGame } from '../index';

const P: PlayerId = 'P1';
const newWorld = (classes = ['warrior', 'mage']) =>
  createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((c, i) => ({ classId: c, gender: 'male' as const, name: `${c}${i}`, playerId: P })) });
function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
/** 敵も施設も無い、一番安く行けるマス */
function cheapStep(g: GameState, heroId: string): number {
  const w = g.world!;
  const reach = reachable(w, w.pos[heroId], w.move!);
  const free = [...reach].filter(([i, v]) => i !== w.pos[heroId] && v.cost <= w.move! && !w.wanderers.some((x) => x.tile === i) && !w.tiles[i].f);
  free.sort((a, b) => a[1].cost - b[1].cost);
  return free[0][0];
}
/** 移動の後の突発イベントは、この確認では閉じておく（侵食度には関係しない） */
const calm = (g: GameState) => {
  if (g.mode === 'event') {
    g.mode = 'world';
    g.event = undefined;
  }
  return g;
};

describe('交代運転には時間がかかる（§4 A）', () => {
  it('前の人の番で動いたキャラを、別の人の番でまた動かすと侵食度+1。1手番に1回まで。次のワールドターンで数え直す', () => {
    let g = run(newWorld(), { type: 'STORY_CONTINUE', playerId: P });
    const c0 = g.world!.corruption;
    // h0 の番: h1 を連れて動く（初めて動くので上がらない）
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h0' });
    g = calm(run(g, { type: 'WORLD_MOVE', playerId: P, heroId: 'h0', to: cheapStep(g, 'h0'), companions: ['h1'] }));
    expect(g.world!.corruption).toBe(c0);
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h0' });
    expect(g.world!.turn).toBe('h1');
    // h1 の番: h0 を連れてまた動く → 交代運転
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h1' });
    g = calm(run(g, { type: 'WORLD_MOVE', playerId: P, heroId: 'h1', to: cheapStep(g, 'h1'), companions: ['h0'] }));
    expect(g.world!.corruption).toBe(c0 + BALANCE.corruptionPerRelayMove);
    expect(g.log.some((l) => l.text.includes('交代で先へ進んだ'))).toBe(true);
    // 同じ番でもう一度動いても、上がるのは1回まで
    if (g.world!.move! > 0 && g.mode === 'world') {
      g = calm(run(g, { type: 'WORLD_MOVE', playerId: P, heroId: 'h1', to: cheapStep(g, 'h1'), companions: ['h0'] }));
      expect(g.world!.corruption).toBe(c0 + BALANCE.corruptionPerRelayMove);
    }
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h1' });
    expect(g.world!.worldTurn).toBe(2);
    expect(g.world!.movedBy).toBeUndefined();
    const c1 = g.world!.corruption;
    expect(c1).toBe(c0 + BALANCE.corruptionPerRelayMove + BALANCE.corruptionPerTurn);
    // 次のワールドターン: 最初に動く人は上がらない
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h0' });
    g = calm(run(g, { type: 'WORLD_MOVE', playerId: P, heroId: 'h0', to: cheapStep(g, 'h0'), companions: [] }));
    expect(g.world!.corruption).toBe(c1);
  });

  it('別々に動くだけ（同じキャラを2回動かさない）なら上がらない', () => {
    let g = run(newWorld(), { type: 'STORY_CONTINUE', playerId: P });
    const c0 = g.world!.corruption;
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h0' });
    g = calm(run(g, { type: 'WORLD_MOVE', playerId: P, heroId: 'h0', to: cheapStep(g, 'h0'), companions: [] }));
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h0' });
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h1' });
    g = calm(run(g, { type: 'WORLD_MOVE', playerId: P, heroId: 'h1', to: cheapStep(g, 'h1'), companions: [] }));
    expect(g.world!.corruption).toBe(c0);
  });
});

describe('鍵のダンジョン（§4 B・C）', () => {
  it.each(SCENARIOS.all.map((s) => [s.id] as const))('%s: 2つ目の鍵のダンジョンは1つ目の鍵、3つ目は2つ目の鍵と町の依頼1つが要る。制覇の侵食度は共通の値', (sid) => {
    const keyed = DUNGEONS.forScenario(sid).filter((d) => d.rewardKey && !d.random).sort((a, b) => a.baseLevel - b.baseLevel);
    expect(keyed).toHaveLength(3);
    expect(keyed[0].requiresKeys ?? []).toEqual([]);
    expect(keyed[1].requiresKeys).toEqual([keyed[0].rewardKey]);
    expect(keyed[1].requiresQuests ?? 0).toBe(0);
    expect(keyed[2].requiresKeys).toEqual([keyed[1].rewardKey]);
    expect(keyed[2].requiresQuests).toBe(1);
    // 関門の依頼は、3つ目の鍵を取る前に果たせるものがある（3つ目・最後のダンジョンの制覇が目標の依頼だけではない）
    const late = DUNGEONS.forScenario(sid).filter((d) => d === keyed[2] || d.finale).map((d) => d.id);
    const quests = SCENARIOS.get(sid).map!.features.filter((f) => f.kind === 'town').flatMap((f) => TOWNS.get(f.id).quests ?? []);
    const doable = quests.filter((q) => {
      const def = QUESTS.get(q);
      return !def.reward.some((o) => o.kind === 'ship') && !(def.objective.kind === 'clearDungeon' && late.includes(def.objective.dungeonId));
    });
    expect(doable.length, sid).toBeGreaterThanOrEqual(2);
    for (const d of keyed) expect(d.corruptionOnClear, d.id).toBeUndefined();
    expect(BALANCE.corruptionOnKeyDungeonClear).toBe(3);
  });

  it('鍵が無いと扉が開かず、どこで鍵が手に入るかを伝える。鍵があれば入れる', () => {
    let g = run(newWorld(['warrior']), { type: 'STORY_CONTINUE', playerId: P });
    const w = g.world!;
    const tile = w.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === 'silentCatacomb');
    w.pos.h0 = tile;
    const r = applyGameCommand(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0' });
    expect(r.error).toContain('扉が開かない');
    expect(r.error).toContain(DUNGEONS.get('emeraldTemple').name);
    g.world!.keys.push('emerald');
    const before = g.world!.corruption;
    g = run(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0' });
    // 入った（1人なので、そのままワールドターンも進む）
    expect(g.world!.corruption).toBeGreaterThanOrEqual(before + BALANCE.corruptionOnDungeonEnter);
    expect([g.dungeon, ...(g.expeditions ?? []).map((e) => e.dungeon)].some((d) => d?.dungeonId === 'silentCatacomb')).toBe(true);
  });
});

describe('3つ目の鍵のダンジョンの関門（町の依頼）', () => {
  it('2つ目の鍵があっても、依頼を果たして報告するまでは開かない。何をすればよいかを伝える', () => {
    let g = run(newWorld(['warrior']), { type: 'STORY_CONTINUE', playerId: P });
    const w = g.world!;
    w.pos.h0 = w.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === 'lavaCavern');
    let r = applyGameCommand(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0' });
    expect(r.error).toContain(DUNGEONS.get('silentCatacomb').name);
    w.keys.push('emerald', 'azure');
    r = applyGameCommand(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0' });
    expect(r.error).toBe('扉が開かない…。町の依頼をあと1つ果たして、報告してから来よう');
    // 受けただけ・達成しただけ（報告していない）では開かない
    w.quests.push({ id: 'wolfHunt', town: 'royalCapital', progress: 3, done: true, reported: false });
    expect(applyGameCommand(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0' }).error).toContain('町の依頼');
    w.quests[0].reported = true;
    g = run(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0' });
    expect([g.dungeon, ...(g.expeditions ?? []).map((e) => e.dungeon)].some((d) => d?.dungeonId === 'lavaCavern')).toBe(true);
  });

  it('船を借りる依頼は数えない（群島）', () => {
    const g = createGame({ seed: 3, scenarioId: 'cursedArchipelago', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: P }] });
    g.world!.quests.push({ id: 'borrowShip', town: 'harborTown', progress: 1, done: true, reported: true });
    expect(finishedQuestCount(g)).toBe(0);
  });

  it('2つ目の鍵を取った時の物語で、依頼が要ることを伝える', () => {
    const g = run(newWorld(['warrior']), { type: 'STORY_CONTINUE', playerId: P });
    g.world!.keys.push('emerald', 'azure');
    g.clearedDungeons.push('emeraldTemple', 'silentCatacomb');
    expect(nextGoalLines(g)).toEqual(['鍵はあと1つ。', `「${DUNGEONS.get('lavaCavern').name}」は、町の依頼を果たしてから。`]);
  });
});

describe('引き締めた地図（高さ35。抜本的な見直し §2-6）', () => {
  // 段階6a（overhaul-plan-v2 §2-1）: 広い地図（帯のある地図）は 15列×42行・スタート [7,40]。行の差は同じ比率で約1.2倍（13・11・12）
  it.each(SCENARIOS.all.map((s) => [s.id] as const))('%s: 鍵のダンジョンまでの行の差が 11・9・10、高さ35（広い地図は 13・11・12、高さ42）', (sid) => {
    const map = SCENARIOS.get(sid).map!;
    const wide = !!map.lanes?.length;
    expect(map.height).toBe(wide ? 42 : 35);
    expect(map.start).toEqual(wide ? [7, 40] : [3, 33]);
    const keyed = DUNGEONS.forScenario(sid).filter((d) => d.rewardKey && !d.random).sort((a, b) => a.baseLevel - b.baseLevel);
    const row = (id: string) => map.features.find((f) => f.id === id)!.at[1];
    const gaps = wide ? [13, 11, 12] : [11, 9, 10];
    expect(map.start[1] - row(keyed[0].id)).toBe(gaps[0]);
    expect(row(keyed[0].id) - row(keyed[1].id)).toBe(gaps[1]);
    expect(row(keyed[1].id) - row(keyed[2].id)).toBe(gaps[2]);
    expect(row(DUNGEONS.forScenario(sid).find((d) => d.finale)!.id)).toBe(0);
    // 地域は隙間なく、上から下までつながっている
    const regions = [...map.regions].sort((a, b) => a.rows[0] - b.rows[0]);
    expect(regions[0].rows[0]).toBe(0);
    for (let i = 1; i < regions.length; i++) expect(regions[i].rows[0]).toBe(regions[i - 1].rows[1] + 1);
    expect(regions[regions.length - 1].rows[1]).toBe(map.height - 1);
    // 町・ダンジョン・名所は地図の中で、同じマスに重ならない
    const at = map.features.map((f) => f.at.join());
    expect(new Set(at).size).toBe(at.length);
    for (const f of map.features) expect(f.at[1], f.id).toBeLessThan(map.height);
    // 見晴らしの塔は3か所のまま（高さ24以上）
    expect(map.height).toBeGreaterThanOrEqual(BALANCE.watchtowerTallMap);
  });
});

describe('ダンジョンの中の番の侵食度（提案 +0.5%）', () => {
  it('1人でもダンジョンの中にいるワールドターンは +0.5%、だれもいない時は +1%', () => {
    let g = run(newWorld(['warrior', 'mage']), { type: 'STORY_CONTINUE', playerId: P });
    const w = g.world!;
    w.pos.h0 = w.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === 'emeraldTemple');
    g = run(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0', party: ['h0'] });
    const c0 = g.world!.corruption;
    // h1 は外で待つ。手番を終えるとワールドターンが終わる
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h1' });
    expect(g.world!.corruption).toBe(c0 + BALANCE.corruptionPerDungeonTurn);
    expect(BALANCE.corruptionPerDungeonTurn).toBe(0.5);
    expect(BALANCE.corruptionPerTurn).toBe(1);
  });
});

describe('古い保存データ（高さの違う前の地図）', () => {
  it('地図を作り直さず、徘徊する敵は記録した地域のマスに出る。スタートの町はそのまま見つかる', () => {
    const g = run(newWorld(['warrior']), { type: 'STORY_CONTINUE', playerId: P });
    const w = g.world!;
    // 高さ28の古い地図に見せかける（上の28行だけ残し、スタートの町を元の位置に置く）。高さ49の地図も同じ考え方で、保存されたマスをそのまま使う
    const old = { ...w, height: 28, tiles: w.tiles.slice(0, 28 * w.width).map((t) => ({ ...t, f: t.f?.kind === 'town' && t.f.id === 'royalCapital' ? undefined : t.f })) };
    old.tiles[26 * w.width + 3].f = { kind: 'town', id: 'royalCapital' };
    expect(startTileOf(g, old)).toBe(26 * w.width + 3);
    g.world = old;
    old.wanderers = [];
    for (let k = 0; k < 20; k++) {
      const wd = spawnWanderer(g, old, createRng(k), 1);
      if (wd) expect(old.tiles[wd.tile].r).toBe(1);
    }
  });
});

describe('転職の速さ（§5）', () => {
  it('転職できるレベルは 中位5・最上位6・特殊5（抜本的な見直し。戦闘25〜32回の冒険に合わせた）', () => {
    expect(BALANCE.jobChange).toEqual({ base: 5, mid: 6, special: 5 });
  });
  it('最上位・特殊職の条件の数（計画書 §2-6 の表。聖王 20・幻獣王 80 は 2026-11-11 の依頼文の例に合わせた）', () => {
    const want: Record<string, number> = {
      // 2026-11-14 宿題6A: 2つ目の鍵の中でそろうように減らした（聖王・教皇・大怪盗・覇王・ビーストマスター・大賢者・冥王・死霊術師・忍者・拳聖。docs/review/2026-11-14-growth-fix.md）
      swordSaint: 22, bowSaint: 20, holyKing: 6, bard: 12, phantomKing: 80, timeMage: 70, fistKing: 35, pope: 9, grandThief: 150, overlord: 7, beastMaster: 4,
      greatSage: 3, magicKnight: 6, hadesLord: 2, necromancer: 2, ninja: 4, dragoon: 2, darkKnight: 3, samurai: 6, gambler: 6, astrologer: 3, machinist: 3, shrineMaiden: 2,
      // 区切りF の新ジョブ4職
      fistSaint: 50, bulwark: 3, dragonVein: 4, petTrainer: 15,
    };
    const withReq = CLASSES.all.filter((c) => c.requires);
    expect(withReq.map((c) => c.id).sort()).toEqual(Object.keys(want).sort());
    for (const c of withReq) {
      expect(c.requires!.count, c.id).toBe(want[c.id]);
      // 説明の文の数字も同じ
      expect(c.requires!.text, c.id).toContain(String(want[c.id]));
    }
  });
  it('中位に転職すると記録を数え直す（最上位・特殊職の条件は、中位になってからの数）', () => {
    let g = run(newWorld(['warrior']), { type: 'STORY_CONTINUE', playerId: P });
    const h = g.heroes[0];
    h.level = BALANCE.jobChange.base;
    h.feats = { perfects: 30, kills: 20 };
    g = run(g, { type: 'CHANGE_JOB', playerId: P, heroId: h.id, jobId: 'swordmaster' });
    expect(g.heroes[0].feats).toEqual({});
  });
});
