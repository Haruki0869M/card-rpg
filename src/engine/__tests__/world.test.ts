// ===== 世界マップ（spec §8・§11.4・§16・§17）のテスト =====
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { getItem } from '../../data/items';
import { getDifficulty } from '../../data/rules';
import { TERRAINS } from '../../data/world';
import type { GameCommand, GameState, PlayerId } from '../../types';
import {
  applyGameCommand,
  campAmbushChance,
  createGame,
  dayOf,
  findHero,
  heroMaxHp,
  hexDistance,
  neighbors,
  reachable,
  timeOfDay,
} from '../index';
import { playToEnd } from './bot';

const P: PlayerId = 'P1';
const party = (classes: string[], players?: PlayerId[]) => classes.map((c, i) => ({ classId: c, gender: 'male' as const, name: `${c}${i}`, playerId: players?.[i] ?? P }));
const newWorld = (seed = 1, classes = ['warrior', 'mage', 'guardian', 'hunter'], difficulty = 'normal') =>
  createGame({ seed, scenarioId: 'corruptionKing', difficulty, party: party(classes) });

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
const tileOf = (g: GameState, kind: string, id: string) => g.world!.tiles.findIndex((t) => t.f?.kind === kind && t.f.id === id);

describe('世界マップの生成', () => {
  it('同じシードなら同じ地図。町・ダンジョン・名所はスタートから歩いて行ける', () => {
    const a = newWorld(5);
    const b = newWorld(5);
    expect(a.world).toEqual(b.world);
    const w = a.world!;
    const start = w.pos.h0;
    const seen = new Set([start]);
    const q = [start];
    while (q.length) {
      const c = q.shift()!;
      for (const n of neighbors(w, c)) if (!seen.has(n) && TERRAINS.get(w.tiles[n].t).moveCost > 0) (seen.add(n), q.push(n));
    }
    w.tiles.forEach((t, i) => {
      if (t.f) expect(seen.has(i), `${t.f.kind}:${t.f.id}`).toBe(true);
    });
    for (const id of ['royalCapital', 'forestVillage', 'swampHamlet', 'foothillVillage']) expect(tileOf(a, 'town', id)).toBeGreaterThanOrEqual(0);
    for (const id of ['emeraldTemple', 'silentCatacomb', 'lavaCavern', 'demonCastle']) expect(tileOf(a, 'dungeon', id)).toBeGreaterThanOrEqual(0);
  });
  it('冒険は物語から始まり、全員が王都にいる。命の灯火は難易度で決まる', () => {
    const g = newWorld(1, ['warrior', 'mage'], 'easy');
    expect(g.mode).toBe('world');
    expect(g.world!.story?.lines.length).toBeGreaterThan(0);
    expect(g.world!.pos.h0).toBe(tileOf(g, 'town', 'royalCapital'));
    expect(g.lives).toBe(5);
    expect(newWorld(1, ['warrior'], 'hard').lives).toBe(2);
  });
  it('霧: 視界の中だけ見える。夜は視界が狭い', () => {
    const g = newWorld(2, ['warrior', 'mage']); // 狩人がいると視界が広い
    const w = g.world!;
    w.tiles.forEach((t, i) => expect(t.seen).toBe(hexDistance(w, i, w.pos.h0) <= BALANCE.visionRange));
    expect(timeOfDay(1)).toBe('morning');
    expect(timeOfDay(1 + BALANCE.turnsPerTimeOfDay * 3)).toBe('night');
    expect(dayOf(1 + BALANCE.turnsPerTimeOfDay * 4)).toBe(2);
  });
});

describe('移動と手番', () => {
  function started(seed = 3) {
    let g = newWorld(seed, ['warrior', 'mage']);
    g = run(g, { type: 'STORY_CONTINUE', playerId: P });
    return g;
  }
  it('移動力を判定 → 経路の移動力だけ減る。同行したキャラは一緒に動き、行動を終える', () => {
    let g = started();
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h0', focusUsed: 2 });
    const w = g.world!;
    expect(w.move).toBeGreaterThanOrEqual(BALANCE.moveBase + 2);
    const reach = reachable(w, w.pos.h0, w.move!);
    const [to, info] = [...reach].find(([i, v]) => i !== w.pos.h0 && v.cost <= w.move! && !w.wanderers.some((x) => x.tile === i))!;
    const before = w.move!;
    g = run(g, { type: 'WORLD_MOVE', playerId: P, heroId: 'h0', to, companions: ['h1'] });
    expect(g.world!.pos.h0).toBe(to);
    expect(g.world!.pos.h1).toBe(to);
    expect(g.world!.move).toBe(before - info.cost);
    expect(g.world!.acted).toContain('h1');
    // 待機 → 同行したキャラは行動済みなので、ワールドターンが進む
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h0' });
    expect(g.world!.worldTurn).toBe(2);
    expect(g.world!.corruption).toBe(getDifficulty(g.difficulty).corruptionPerTurn ?? BALANCE.corruptionPerTurn);
    expect(g.world!.turn).toBe('h0');
  });
  it('手番でないキャラ・担当でないプレイヤーは動かせない', () => {
    const g = started();
    expect(applyGameCommand(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h1', focusUsed: 0 }).error).toBeDefined();
    expect(applyGameCommand(g, { type: 'WORLD_ROLL_MOVE', playerId: 'P2', heroId: 'h0', focusUsed: 0 }).error).toBeDefined();
  });
  it('侵食度100%でゲームオーバー', () => {
    let g = started();
    g.world!.corruption = 99;
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h0' });
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h1' });
    expect(g.mode).toBe('gameover');
  });
  it('野営: 回復して手番が終わる。夜襲の確率は夜だけ、守護者がいると下がる', () => {
    let g = started();
    const h = findHero(g, 'h0')!;
    h.hp = 10;
    g.world!.tiles[g.world!.pos.h0].f = undefined; // 町の外として扱う
    g = run(g, { type: 'WORLD_CAMP', playerId: P, heroId: 'h0' });
    expect(findHero(g, 'h0')!.hp).toBeGreaterThan(10);
    expect(g.world!.turn).toBe('h1');
    expect(campAmbushChance(g, 'h1')).toBe(0);
    const night = newWorld(1, ['warrior', 'guardian']);
    night.world!.worldTurn = 1 + BALANCE.turnsPerTimeOfDay * 3;
    expect(campAmbushChance(night, 'h0')).toBe(Math.round(BALANCE.nightAmbushChance * 0.5));
  });
});

describe('遭遇・命の灯火', () => {
  function atEnemy(seed = 4) {
    let g = newWorld(seed, ['warrior', 'mage']);
    g = run(g, { type: 'STORY_CONTINUE', playerId: P });
    const w = g.world!;
    // スタートの隣に敵を置いて、そこへ移動する
    const next = neighbors(w, w.pos.h0).find((n) => TERRAINS.get(w.tiles[n].t).moveCost > 0 && !w.tiles[n].f)!;
    w.wanderers.push({ id: 'wx', tile: next, enemies: [{ defId: 'goblinScout', level: 1 }] });
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h0', focusUsed: 4 });
    g = run(g, { type: 'WORLD_MOVE', playerId: P, heroId: 'h0', to: next, companions: [] });
    return g;
  }
  it('敵のいるマスに入ると遭遇。1マス以内の仲間は参加できる', () => {
    const g = atEnemy();
    expect(g.mode).toBe('encounter');
    expect(g.encounter!.candidates).toEqual(expect.arrayContaining(['h0', 'h1']));
  });
  it('戦う → 勝つと敵が消え、報酬の後は世界マップへ（遭遇したキャラの手番は終わる）', () => {
    let g = atEnemy();
    g = run(g, { type: 'ENCOUNTER_CHOOSE', playerId: P, choice: 'fight', heroId: 'h0', focusUsed: 0, participants: ['h0'] });
    expect(g.mode).toBe('battle');
    expect(g.battle!.allies.map((a) => a.id)).toEqual(['h0']);
    g.battle!.enemies.forEach((e) => ((e.dead = true), (e.hp = 0)));
    g.battle!.phase = 'victory';
    g = run(g, { type: 'FINISH_BATTLE', playerId: P });
    g = run(g, { type: 'PICK_CARD', playerId: P, offerIndex: null });
    while (g.reward?.levelUps.length) g = run(g, { type: 'CHOOSE_GROWTH', playerId: P, optionIndex: 0 });
    g = run(g, { type: 'FINISH_REWARD', playerId: P });
    if (g.mode === 'chest') g = run(g, { type: 'LEAVE_CHEST', playerId: P });
    expect(g.mode).toBe('world');
    expect(g.world!.wanderers.some((x) => x.id === 'wx')).toBe(false);
    expect(g.world!.turn).toBe('h1');
  });
  it('逃げる（成功）: 前のマスへ戻る', () => {
    let g = atEnemy();
    const back = g.world!.prevTile;
    findHero(g, 'h0')!.focus = 3;
    g = run(g, { type: 'ENCOUNTER_CHOOSE', playerId: P, choice: 'flee', heroId: 'h0', focusUsed: 3, participants: ['h0'] });
    expect(g.encounter!.result!.success).toBe(true);
    g = run(g, { type: 'ENCOUNTER_CONTINUE', playerId: P, participants: ['h0'] });
    expect(g.mode).toBe('world');
    expect(g.world!.pos.h0).toBe(back);
  });
  it('奇襲（成功）: 敵は1ターン目に動けない', () => {
    let g = atEnemy();
    findHero(g, 'h0')!.focus = 3;
    g = run(g, { type: 'ENCOUNTER_CHOOSE', playerId: P, choice: 'ambush', heroId: 'h0', focusUsed: 3, participants: ['h0'] });
    g = run(g, { type: 'ENCOUNTER_CONTINUE', playerId: P, participants: ['h0'] });
    expect(g.mode).toBe('battle');
    expect(g.battle!.enemies.every((e) => !e.intent)).toBe(true);
  });
  it('負けると命の灯火を使って最寄りの町でHP半分で復活。灯火が0なら退場し、全員退場でゲームオーバー', () => {
    let g = atEnemy();
    g = run(g, { type: 'ENCOUNTER_CHOOSE', playerId: P, choice: 'fight', heroId: 'h0', focusUsed: 0, participants: ['h0'] });
    const lose = (x: GameState) => {
      x.battle!.allies.forEach((a) => ((a.dead = true), (a.hp = 0)));
      x.battle!.phase = 'defeat';
      return run(x, { type: 'FINISH_BATTLE', playerId: P });
    };
    const lives = g.lives;
    const after = lose(structuredClone(g));
    expect(after.lives).toBe(lives - 1);
    expect(after.mode).toBe('world');
    const h0 = findHero(after, 'h0')!;
    expect(h0.hp).toBe(Math.ceil(heroMaxHp(h0) * BALANCE.reviveHpRatio));
    expect(after.world!.tiles[after.world!.pos.h0].f?.kind).toBe('town');
    // 灯火が0
    const none = structuredClone(g);
    none.lives = 0;
    const out = lose(none);
    expect(findHero(out, 'h0')!.retired).toBe(true);
    expect(out.mode).toBe('world'); // h1 が残っている
    expect(out.world!.turn).toBe('h1');
  });
});

describe('町・祠・依頼', () => {
  function inCapital() {
    let g = newWorld(6, ['warrior', 'mage']);
    g = run(g, { type: 'STORY_CONTINUE', playerId: P });
    g.gold = 1000;
    return run(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0' });
  }
  it('宿屋で全回復。ショップで買える。聖水はいつも売っている', () => {
    let g = inCapital();
    expect(g.mode).toBe('town');
    findHero(g, 'h0')!.hp = 5;
    g = run(g, { type: 'TOWN_INN', playerId: P });
    expect(findHero(g, 'h0')!.hp).toBe(heroMaxHp(findHero(g, 'h0')!));
    g = run(g, { type: 'TOWN_BUY', playerId: P, kind: 'item', index: 0 });
    const stock = g.world!.shops.royalCapital;
    expect(getItem(stock.items[0].item.itemId).id).toBe('holyWater');
    expect(g.pouch.some((i) => i.itemId === 'holyWater')).toBe(true);
    expect(applyGameCommand(g, { type: 'TOWN_BUY', playerId: P, kind: 'item', index: 0 }).error).toBeDefined();
  });
  it('カードの削除（最低枚数は残す）・売却', () => {
    let g = inCapital();
    const h = findHero(g, 'h0')!;
    const n = h.deck.length;
    g = run(g, { type: 'TOWN_REMOVE_CARD', playerId: P, heroId: 'h0', cardUid: h.deck[0].uid });
    expect(findHero(g, 'h0')!.deck.length).toBe(n - 1);
    g.stash.push({ uid: 'sx', itemId: 'steelSword' });
    const gold = g.gold;
    g = run(g, { type: 'TOWN_SELL', playerId: P, itemUid: 'sx' });
    expect(g.gold).toBeGreaterThan(gold);
  });
  it('依頼: 受ける → 目標を達成 → 報告で報酬（届け物は渡す）', () => {
    let g = inCapital();
    g = run(g, { type: 'QUEST_ACCEPT', playerId: P, questId: 'wolfHunt' });
    expect(applyGameCommand(g, { type: 'QUEST_REPORT', playerId: P, questId: 'wolfHunt' }).error).toBeDefined();
    g.world!.quests[0].progress = 3;
    g.world!.quests[0].done = true;
    const gold = g.gold;
    g = run(g, { type: 'QUEST_REPORT', playerId: P, questId: 'wolfHunt' });
    expect(g.gold).toBe(gold + 60);
    expect(g.world!.quests[0].reported).toBe(true);
  });
  it('祠: 永続の加護は1人3つまで', () => {
    let g = newWorld(7, ['warrior']);
    g = run(g, { type: 'STORY_CONTINUE', playerId: P });
    const w = g.world!;
    w.tiles[w.pos.h0].f = { kind: 'shrine', id: 'shrineOfValor' };
    g = run(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0' });
    findHero(g, 'h0')!.blessings = 3;
    expect(applyGameCommand(g, { type: 'SHRINE_CHOOSE', playerId: P, optionIndex: 2, heroId: 'h0' }).error).toBeDefined();
    findHero(g, 'h0')!.blessings = 0;
    g = run(g, { type: 'SHRINE_CHOOSE', playerId: P, optionIndex: 2, heroId: 'h0' });
    expect(findHero(g, 'h0')!.bonusStats.str).toBe(5);
    g = run(g, { type: 'LEAVE_SHRINE', playerId: P });
    expect(g.mode).toBe('world');
    expect(g.world!.tiles[g.world!.pos.h0].f!.used).toBe(true);
  });
  it('魔王城は3つの鍵が無いと入れない', () => {
    let g = newWorld(8, ['warrior']);
    g = run(g, { type: 'STORY_CONTINUE', playerId: P });
    g.world!.pos.h0 = tileOf(g, 'dungeon', 'demonCastle');
    expect(applyGameCommand(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0' }).error).toMatch(/鍵/);
    g.world!.keys = ['emerald', 'azure', 'crimson'];
    g = run(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0' });
    expect(g.mode).toBe('dungeon');
    expect(g.world!.corruption).toBe(BALANCE.corruptionOnDungeonEnter);
  });
});

describe('自動プレイ（シナリオ1をエンディングまで）', () => {
  it('4人・やさしい: どの場面でもエラーが出ず、最後まで（エンディングか、負け）進む。何回かに1回はエンディングに着く', () => {
    let cleared = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const { game, log } = playToEnd(newWorld(seed, ['warrior', 'mage', 'guardian', 'hunter'], 'easy'));
      expect(log.errors, `seed ${seed}`).toEqual([]);
      expect(['ending', 'gameover'], `seed ${seed}`).toContain(game.mode);
      if (game.mode === 'ending') {
        cleared++;
        expect(game.world!.keys.sort()).toEqual(['azure', 'crimson', 'emerald']);
      }
    }
    expect(cleared).toBeGreaterThan(0);
  }, 180_000);
  it('同じシードなら同じ結果（オンライン協力の前提）', () => {
    const a = playToEnd(newWorld(11, ['warrior', 'hunter'], 'easy'), 3000).game;
    const b = playToEnd(newWorld(11, ['warrior', 'hunter'], 'easy'), 3000).game;
    expect(a).toEqual(b);
  }, 60_000);
});
