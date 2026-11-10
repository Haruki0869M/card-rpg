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
  viewOf,
  handleDefeat,
  createRng,
} from '../index';
import { playToEnd } from '../bot';

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
  it('移動力を判定 → 経路の移動力だけ減る。同行したキャラは一緒に動き、自分の手番も持つ', () => {
    let g = started();
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h0' });
    const w = g.world!;
    expect(w.move).toBeGreaterThanOrEqual(1);
    const reach = reachable(w, w.pos.h0, w.move!);
    // 施設・敵のいないマスへ。移動中のランダムイベントは、この確認では起こさない（直前に起きたことにする。乱数の順番で変わるため）
    g.heroes[0].lastRandomEvent = w.worldTurn;
    const [to, info] = [...reach].find(([i, v]) => i !== w.pos.h0 && v.cost <= w.move! && !w.tiles[i].f && !w.wanderers.some((x) => x.tile === i))!;
    const before = w.move!;
    g = run(g, { type: 'WORLD_MOVE', playerId: P, heroId: 'h0', to, companions: ['h1'] });
    expect(g.world!.pos.h0).toBe(to);
    expect(g.world!.pos.h1).toBe(to);
    expect(g.world!.move).toBe(before - info.cost);
    expect(g.world!.acted).not.toContain('h1');
    // 運転者が待機すると同行者の手番。全員終わってからワールドターンが進む
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h0' });
    expect(g.world!.turn).toBe('h1');
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h1' });
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
    g.heroes[0].gold = 1000;
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
    // 町に入ったキャラ（h0）のお金で買い、h0 の袋に入る
    expect(findHero(g, 'h0')!.pouch.some((i) => i.itemId === 'holyWater')).toBe(true);
    expect(findHero(g, 'h1')!.gold).toBe(30);
    expect(applyGameCommand(g, { type: 'TOWN_BUY', playerId: P, kind: 'item', index: 0 }).error).toBeDefined();
  });
  it('カードの削除（最低枚数は残す）・売却', () => {
    let g = inCapital();
    const h = findHero(g, 'h0')!;
    const n = h.deck.length;
    g = run(g, { type: 'TOWN_REMOVE_CARD', playerId: P, heroId: 'h0', cardUid: h.deck[0].uid });
    expect(findHero(g, 'h0')!.deck.length).toBe(n - 1);
    // 滞在メンバーから外れたキャラのカードは消せない
    g.town!.members = ['h0'];
    expect(applyGameCommand(g, { type: 'TOWN_REMOVE_CARD', playerId: P, heroId: 'h1', cardUid: findHero(g, 'h1')!.deck[0].uid }).error).toBeDefined();
    findHero(g, 'h0')!.stash.push({ uid: 'sx', itemId: 'steelSword' });
    const gold = findHero(g, 'h0')!.gold;
    g = run(g, { type: 'TOWN_SELL', playerId: P, itemUid: 'sx' });
    expect(findHero(g, 'h0')!.gold).toBeGreaterThan(gold);
  });
  it('依頼: 受ける → 目標を達成 → 報告で報酬（届け物は渡す）', () => {
    let g = inCapital();
    g = run(g, { type: 'QUEST_ACCEPT', playerId: P, questId: 'wolfHunt' });
    expect(applyGameCommand(g, { type: 'QUEST_REPORT', playerId: P, questId: 'wolfHunt' }).error).toBeDefined();
    g.world!.quests[0].progress = 3;
    g.world!.quests[0].done = true;
    const gold = findHero(g, 'h0')!.gold;
    g = run(g, { type: 'QUEST_REPORT', playerId: P, questId: 'wolfHunt' });
    expect(findHero(g, 'h0')!.gold).toBe(gold + 60);
    expect(g.world!.quests[0].reported).toBe(true);
  });
  it('宿屋は町に入ったキャラだけが自分のお金で休む。他の人の担当の町では操作できない', () => {
    let g = newWorld(6, ['warrior', 'mage'], 'normal');
    g.heroes[1].playerId = 'P2';
    g = run(g, { type: 'STORY_CONTINUE', playerId: P });
    g = run(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0' });
    findHero(g, 'h0')!.hp = 5;
    findHero(g, 'h1')!.hp = 5;
    expect(applyGameCommand(g, { type: 'TOWN_INN', playerId: 'P2' }).error).toMatch(/担当/);
    expect(applyGameCommand(g, { type: 'LEAVE_TOWN', playerId: 'P2' }).error).toMatch(/担当/);
    g = run(g, { type: 'TOWN_INN', playerId: P });
    expect(findHero(g, 'h0')!.hp).toBe(heroMaxHp(findHero(g, 'h0')!));
    expect(findHero(g, 'h1')!.hp).toBe(5);
    expect(findHero(g, 'h0')!.gold).toBe(30 - 15);
    expect(findHero(g, 'h1')!.gold).toBe(30);
  });
  it('同じマスの仲間にお金・持ち物を渡せる。離れていると渡せない', () => {
    let g = newWorld(6, ['warrior', 'mage']);
    g = run(g, { type: 'STORY_CONTINUE', playerId: P });
    g.heroes[0].stash.push({ uid: 'gx', itemId: 'magusStaff' });
    g = run(g, { type: 'GIVE', playerId: P, fromHeroId: 'h0', toHeroId: 'h1', itemUid: 'gx' });
    expect(findHero(g, 'h1')!.stash.map((i) => i.uid)).toContain('gx');
    g = run(g, { type: 'GIVE', playerId: P, fromHeroId: 'h0', toHeroId: 'h1', gold: 10 });
    expect([findHero(g, 'h0')!.gold, findHero(g, 'h1')!.gold]).toEqual([20, 40]);
    expect(applyGameCommand(g, { type: 'GIVE', playerId: P, fromHeroId: 'h0', toHeroId: 'h1', gold: 999 }).error).toBeDefined();
    g.world!.pos.h1 = neighbors(g.world!, g.world!.pos.h0)[0];
    expect(applyGameCommand(g, { type: 'GIVE', playerId: P, fromHeroId: 'h0', toHeroId: 'h1', gold: 1 }).error).toMatch(/同じ場所/);
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
    // ダンジョンは世界マップと別の場面になる
    expect(g.mode).toBe('world');
    expect(g.expeditions?.length).toBe(1);
    expect(viewOf(g, g.expeditions![0].id).mode).toBe('dungeon');
    // 入ると手番が終わり、1人なのでワールドターンも進む
    expect(g.world!.corruption).toBe(BALANCE.corruptionOnDungeonEnter + (getDifficulty(g.difficulty).corruptionPerTurn ?? BALANCE.corruptionPerTurn));
  });
});

describe('ダンジョンも世界マップの手番の順番で動く（M3-D）', () => {
  /** h0 だけ翠の神殿に入る（h0 の手番） */
  function h0InTemple(classes = ['warrior', 'mage']) {
    let g = newWorld(3, classes, 'normal');
    g = run(g, { type: 'STORY_CONTINUE', playerId: P });
    g.world!.pos.h0 = tileOf(g, 'dungeon', 'emeraldTemple');
    g.world!.turn = 'h0';
    g = run(g, { type: 'WORLD_INTERACT', playerId: P, heroId: 'h0', party: ['h0'] });
    return { g, x: g.expeditions![0].id };
  }
  const inScene = (x: string, command: GameCommand): GameCommand => ({ type: 'SCENE', scene: x, command });

  it('入ると手番は次の人へ。ダンジョンの番が来るまで、ダンジョンの中は動かせない', () => {
    let { g, x } = h0InTemple();
    expect(g.world!.turn).toBe('h1');
    expect(applyGameCommand(g, inScene(x, { type: 'EXPLORE_ROLL', playerId: P, heroId: 'h0', focusUsed: 0 })).error).toMatch(/ほかのキャラの番/);
    // h1 が手番を終えると、ワールドターンが進み、h0（ダンジョン）の番
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h1' });
    expect(g.world!.worldTurn).toBe(2);
    expect(g.world!.turn).toBe('h0');
    // 世界マップの操作はできない
    expect(applyGameCommand(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h0', focusUsed: 0 }).error).toMatch(/ダンジョン/);
  });

  it('探索のサイコロ（1〜3）→ 選べる扉の数。扉を開けると1使う。手番を終えると次の人の番', () => {
    let { g, x } = h0InTemple();
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h1' });
    expect(applyGameCommand(g, inScene(x, { type: 'ENTER_ROOM', playerId: P, roomId: 'r0c0' })).error).toMatch(/サイコロ/);
    g = run(g, inScene(x, { type: 'EXPLORE_ROLL', playerId: P, heroId: 'h0' }));
    const n = viewOf(g, x).dungeon!.explore!;
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(BALANCE.exploreDiceSides);
    g = run(g, inScene(x, { type: 'ENTER_ROOM', playerId: P, roomId: 'r0c0' }));
    expect(viewOf(g, x).dungeon!.explore).toBe(n - 1);
    // 手番を終える → h1 の番（ワールドターンは同じ）
    g.expeditions![0].mode = 'dungeon';
    g.expeditions![0].battle = undefined;
    g = run(g, inScene(x, { type: 'EXPLORE_END', playerId: P }));
    expect(g.world!.turn).toBe('h1');
    expect(g.world!.worldTurn).toBe(2);
    // 次にダンジョンの番が来たら、また判定から
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h1' });
    expect(g.world!.turn).toBe('h0');
    expect(viewOf(g, x).dungeon!.explore).toBeNull();
  });

  it('撤退すると世界マップに戻り、次のワールドターンから地図で動く', () => {
    let { g, x } = h0InTemple();
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h1' });
    g = run(g, inScene(x, { type: 'RETREAT', playerId: P }));
    expect(g.expeditions).toEqual([]);
    expect(g.world!.turn).toBe('h1');
    g = run(g, { type: 'WORLD_WAIT', playerId: P, heroId: 'h1' });
    expect(g.world!.turn).toBe('h0');
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: 'h0', focusUsed: 0 });
  });

  it('全員がダンジョンの中でも、時間（ワールドターン・侵食度）は進む', () => {
    let { g, x } = h0InTemple(['warrior']);
    const turn = g.world!.worldTurn;
    expect(g.world!.turn).toBe('h0');
    expect(turn).toBe(2);
    g = run(g, inScene(x, { type: 'EXPLORE_ROLL', playerId: P, heroId: 'h0', focusUsed: 0 }));
    const c = g.world!.corruption;
    g = run(g, inScene(x, { type: 'EXPLORE_END', playerId: P }));
    expect(g.world!.worldTurn).toBe(turn + 1);
    expect(g.world!.corruption).toBeGreaterThan(c);
    expect(g.world!.turn).toBe('h0');
  });

  it('持ち物の整理は、自分の番でなくてもできる。別の場面のキャラは、その場面からだけ', () => {
    const { g, x } = h0InTemple();
    expect(applyGameCommand(g, { type: 'UNEQUIP', playerId: P, heroId: 'h0', slot: 'weapon' }).error).toMatch(/ダンジョン/);
    expect(applyGameCommand(g, inScene(x, { type: 'UNEQUIP', playerId: P, heroId: 'h0', slot: 'weapon' })).error).toBeUndefined();
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

describe('倒れた仲間を助け起こす（M3-C5）', () => {
  it('命の灯火が無い時に負けると、その場に倒れる。仲間が同じマスに来れば手番を使って助け起こせる', () => {
    let g = createGame({ seed: 7, scenarioId: 'corruptionKing', difficulty: 'normal', party: [
      { classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' },
      { classId: 'mage', gender: 'female', name: 'b', playerId: 'P1' },
    ] });
    g = applyGameCommand(g, { type: 'STORY_CONTINUE', playerId: 'P1' }).state;
    g.lives = 0;
    const w = g.world!;
    const tile = w.pos.h1;
    handleDefeat(g, ['h1'], createRng(1));
    expect(findHero(g, 'h1')!.retired).toBe(true);
    expect(g.world!.downed).toEqual({ h1: tile });
    expect(g.mode).not.toBe('gameover');
    // 手番のキャラを同じマスへ
    g.world!.turn = 'h0';
    g.world!.pos.h0 = tile;
    const r = applyGameCommand(g, { type: 'WORLD_REVIVE', playerId: 'P1', heroId: 'h0', targetId: 'h1' });
    expect(r.error).toBeUndefined();
    const h1 = findHero(r.state, 'h1')!;
    expect(h1.retired).toBe(false);
    expect(h1.hp).toBeGreaterThan(0);
    expect(r.state.world!.pos.h1).toBe(tile);
    expect(r.state.world!.downed).toEqual({});
    // 離れたマスからは助け起こせない
    g.world!.pos.h0 = tile === 0 ? 1 : 0;
    expect(applyGameCommand(g, { type: 'WORLD_REVIVE', playerId: 'P1', heroId: 'h0', targetId: 'h1' }).error).toMatch(/同じマス/);
  });
});
