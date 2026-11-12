// ===== 段階7a: ランダムダンジョンの強化（overhaul-plan-v2 §4） =====
// 全5行・テーマ3つ・1か所1回・最奥の黄金箱と専用の装備・闇商人・晶石の祭壇・専用の装備13個の力（鏡盾は段階7c）・古い保存
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { CARDS, getCard } from '../../data/cards';
import { DUNGEONS } from '../../data/dungeons';
import { ENEMIES } from '../../data/enemies';
import { EVENTS } from '../../data/events';
import { ITEMS, getItem, POUCH_LIMIT } from '../../data/items';
import { DUNGEON_THEMES, getRoomType } from '../../data/rules';
import type { BattleState, CardDef, Command, GameCommand, GameState, PlayerId } from '../../types';
import { applyCommand, applyGameCommand, buildDungeon, createBattle, createGame, createRng, describeAbility, dungeonRows, migrateGame, toPartyMember, validateGame } from '../index';
import { addItem } from '../game/common';
import { pouchLimitOf } from '../game/hero';
import { blackMarketStock, rollEquipment, rollExclusive } from '../game/loot';
import { altarTransmutePool, doCardTask, peddlerBuy } from '../game/tasks';
import { ensureTileTheme } from '../game/world/randomDungeons';
import { roomBehavior } from '../game/rooms';

const RD_IDS = ['thunderChaseKatana', 'gatlingGun', 'gospelScepter', 'madKingMail', 'executionerCloak', 'twinSoulBell', 'endlessHourglass', 'cheatersDice', 'overchargeCore', 'resonanceRing', 'alchemistBelt', 'stormEarring', 'aegisMirror'];
const THEMES = ['crystalGrotto', 'sealedLabyrinth', 'outlawDen'];
const eventIds = EVENTS.forScenario('corruptionKing').filter((e) => e.where !== 'map' && e.where !== 'spawn').map((e) => e.id);

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
const err = (g: GameState, cmd: GameCommand) => applyGameCommand(g, cmd).error;
const randomTiles = (g: GameState) => g.world!.tiles.flatMap((t, i) => (t.f?.kind === 'dungeon' && DUNGEONS.get(t.f.id).random ? [i] : []));
function newGame(scenarioId = 'corruptionKing', seed = 5, players: PlayerId[] = ['P1']) {
  let g = createGame({ seed, scenarioId, difficulty: 'normal', party: players.map((playerId, i) => ({ classId: ['warrior', 'mage', 'priest', 'thief'][i], gender: 'male' as const, name: `h${i}`, playerId })) });
  g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  return g;
}

// ---------- ダンジョンの形 ----------

describe('段階7a: ランダムダンジョンの形（全5行・テーマ）', () => {
  it('テーマは3つ。4行目の部屋は 晶石の祭壇・休憩・闇商人。どれも扉の予兆がある部屋の種類', () => {
    expect(DUNGEON_THEMES.all.map((t) => t.id)).toEqual(THEMES);
    expect(DUNGEON_THEMES.all.map((t) => t.fixedRoom)).toEqual(['crystalAltar', 'rest', 'blackMarket']);
    for (const t of DUNGEON_THEMES.all) expect(getRoomType(t.fixedRoom).name).toBeTruthy();
    expect(DUNGEON_THEMES.get('sealedLabyrinth').enemyLevel).toBe(1);
  });

  it('7本とも rows: 4（ボスの行を入れて全5行）。最奥は黄金箱', () => {
    const randoms = DUNGEONS.all.filter((d) => d.random);
    expect(randoms).toHaveLength(7);
    for (const d of randoms) {
      expect(d.rows, d.id).toBe(4);
      expect(d.bossChest, d.id).toBe('legend');
    }
  });

  it.each(THEMES)('%s: 1行目は戦闘（1〜2部屋）・4行目はテーマの部屋が1つ・5行目はボス。名前は「テーマ（洞窟）」', (theme) => {
    const t = DUNGEON_THEMES.get(theme);
    for (const d of DUNGEONS.all.filter((x) => x.random)) {
      for (let seed = 1; seed <= 40; seed++) {
        const run = buildDungeon(d.id, createRng(seed), 0, eventIds, theme);
        expect(dungeonRows(run)).toBe(5);
        expect(run.theme).toBe(theme);
        expect(run.name).toBe(`${t.name}（${d.name}）`);
        const row = (r: number) => run.rooms.filter((x) => x.row === r);
        expect(row(0).length).toBeGreaterThanOrEqual(1);
        expect(row(0).length).toBeLessThanOrEqual(2);
        expect(row(0).every((x) => x.type === 'battle')).toBe(true);
        expect(row(3).map((x) => x.type)).toEqual([t.fixedRoom]);
        expect(row(4).map((x) => getRoomType(x.type).battle?.boss)).toEqual([true]);
        // 2〜3行目は、テーマの割合に書いた種類（と封魔の宝箱）だけ。3行目には4行目の種類を出さない
        for (const r of [...row(1), ...row(2)]) expect(Object.keys(t.weights).includes(r.type) || r.type === 'sealedChest', `${d.id} ${seed} ${r.type}`).toBe(true);
        expect(row(2).some((x) => x.type === t.fixedRoom)).toBe(false);
      }
    }
  });

  it('封魔の地下迷宮: 敵のレベル+1・封魔の宝箱が出る（2行目から）。休憩は4行目だけ', () => {
    let sealed = 0;
    for (let seed = 1; seed <= 80; seed++) {
      const plain = buildDungeon('randomForest', createRng(seed), 0, eventIds, 'crystalGrotto');
      const hard = buildDungeon('randomForest', createRng(seed), 0, eventIds, 'sealedLabyrinth');
      const boss = (r: typeof plain) => r.rooms.find((x) => x.row === 4)!.enemies![0].level;
      expect(boss(hard)).toBe(boss(plain) + 1);
      sealed += hard.rooms.filter((x) => x.type === 'sealedChest').length;
      expect(hard.rooms.filter((x) => x.type === 'rest').map((x) => x.row)).toEqual([3]);
    }
    expect(sealed).toBeGreaterThan(10);
  });

  it('無法者の隠れ処: 戦闘の部屋の敵は3体以上（数が多い組）', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const run = buildDungeon('scrapCave', createRng(seed), 0, eventIds, 'outlawDen');
      for (const r of run.rooms.filter((x) => x.type === 'battle')) expect(r.enemies!.length).toBeGreaterThanOrEqual(3);
    }
  });
});

// ---------- 世界マップ ----------

describe('段階7a: 世界マップのランダムダンジョン', () => {
  it('シナリオ1（広い地図）は2か所・別のテーマ。ほかの6本は1か所でテーマあり。同じ種なら同じ', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const g = newGame('corruptionKing', seed);
      const tiles = randomTiles(g);
      expect(tiles).toHaveLength(2);
      const themes = tiles.map((i) => g.world!.tiles[i].f!.theme);
      expect(new Set(themes).size).toBe(2);
      expect(themes.every((x) => THEMES.includes(x!))).toBe(true);
      expect(randomTiles(newGame('corruptionKing', seed)).map((i) => newGame('corruptionKing', seed).world!.tiles[i].f!.theme)).toEqual(themes);
    }
    for (const sc of ['frozenKingdom', 'sandDynasty', 'cursedArchipelago', 'clockworkEmpire', 'starCastle', 'dreamLabyrinth']) {
      const g = newGame(sc, 3);
      const tiles = randomTiles(g);
      expect(tiles, sc).toHaveLength(1);
      expect(THEMES).toContain(g.world!.tiles[tiles[0]].f!.theme);
    }
  });

  /** 入口に立って入る（1人） */
  function enter(g: GameState, tile: number) {
    g.world!.pos.h0 = tile;
    g.world!.turn = 'h0';
    return run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0'] });
  }
  /** ボスを倒して黄金箱の前にいる形にして、開けて、帰る */
  function clearBoss(g: GameState): GameState {
    const x = g.expeditions![0];
    const d = x.dungeon!;
    const boss = d.rooms.find((r) => getRoomType(r.type).battle?.boss)!;
    for (const r of d.rooms) r.cleared = true;
    d.currentRoomId = boss.id;
    x.mode = 'chest';
    x.chest = { roomId: boss.id, spec: { rarity: 'legend', locked: false, big: true }, unlocked: true };
    const scene = (command: GameCommand): GameCommand => ({ type: 'SCENE', scene: x.id, command });
    let s = run(g, scene({ type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 }));
    s = run(s, scene({ type: 'LEAVE_CHEST', playerId: 'P1' }));
    return run(s, scene({ type: 'RETURN_TO_HUB', playerId: 'P1' }));
  }

  it('入るとテーマの5行のダンジョン。制覇するとマスが踏破済みになり、もう入れない。侵食度が2%下がる', () => {
    let g = newGame('corruptionKing', 7);
    const tile = randomTiles(g)[0];
    const theme = g.world!.tiles[tile].f!.theme;
    g = enter(g, tile);
    const d = g.expeditions![0].dungeon!;
    expect(d.theme).toBe(theme);
    expect(d.tile).toBe(tile);
    expect(dungeonRows(d)).toBe(5);
    g.world!.corruption = 30;
    const after = clearBoss(g);
    expect(after.expeditions ?? []).toHaveLength(0);
    expect(after.world!.tiles[tile].f!.used).toBe(true);
    // 制覇で2%下がる（帰る時にワールドターンが進んだ分は上がる）
    expect(after.log.some((l) => l.text.includes(`${BALANCE.corruptionOnRandomDungeonClear}%下がった`))).toBe(true);
    expect(after.world!.corruption).toBeLessThan(30);
    // もう入れない（踏破済み）。もう1つのランダムダンジョンには入れる
    // （侵食度が15%を越えているので、段階7b の災厄の中ボスの知らせが出ていることがある。読んで閉じる）
    after.world!.story = undefined;
    after.world!.pos.h0 = tile;
    after.world!.turn = 'h0';
    expect(err(after, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0'] })).toContain('踏破済み');
    const other = randomTiles(after).find((i) => i !== tile)!;
    expect(after.world!.tiles[other].f!.used).toBeFalsy();
    expect(() => enter(after, other)).not.toThrow();
  });

  it('負けて出された・撤退した時は踏破済みにならない（入り直せる）', () => {
    let g = newGame('corruptionKing', 8);
    const tile = randomTiles(g)[0];
    g = enter(g, tile);
    const x = g.expeditions![0];
    g = run(g, { type: 'SCENE', scene: x.id, command: { type: 'RETREAT', playerId: 'P1' } });
    expect(g.world!.tiles[tile].f!.used).toBeFalsy();
    expect(() => enter(g, tile)).not.toThrow();
  });

  it('古い保存: テーマの無いマスは、初めて入る時に乱数を引かずに決まる（ほかのマスと別のテーマ）', () => {
    const g = newGame('corruptionKing', 9);
    const [a, b] = randomTiles(g);
    const w = g.world!;
    delete w.tiles[a].f!.theme;
    delete w.tiles[b].f!.theme;
    const old = migrateGame(JSON.parse(JSON.stringify(g)))!;
    expect(old).not.toBeNull();
    const ta = ensureTileTheme(old.world!, a);
    const tb = ensureTileTheme(old.world!, b);
    expect(ta).toBe('crystalGrotto');
    expect(tb).toBe('sealedLabyrinth');
    // 何度呼んでも同じ
    expect(ensureTileTheme(old.world!, a)).toBe(ta);
    const s = enter(old, a);
    expect(s.expeditions![0].dungeon!.theme).toBe(ta);
  });

  it('古い保存: 6行のランダムダンジョンの途中（テーマ・マスの記録なし）も、最後まで進めて、入口のマスが踏破済みになる', () => {
    let g = newGame('corruptionKing', 10);
    const tile = randomTiles(g)[0];
    g = enter(g, tile);
    // 前の形（6行＋ボス・テーマなし・マスの記録なし）に作り直す
    const legacy = buildDungeon('randomForest', createRng(3), 0, eventIds);
    const oldRun = { ...legacy, rooms: [...legacy.rooms] };
    delete (oldRun as { theme?: string }).theme;
    g.expeditions![0].dungeon = oldRun;
    const saved = JSON.parse(JSON.stringify(g));
    delete saved.expeditions[0].dungeon.tile;
    const m = migrateGame(saved)!;
    expect(validateGame(m)).toBe(true);
    const after = clearBoss(m);
    expect(after.world!.tiles[tile].f!.used).toBe(true);
  });
});

// ---------- 黄金箱と専用の装備の出どころ ----------

describe('段階7a: 黄金箱と専用の装備', () => {
  it('専用の装備は13個（武器3・鎧2・装飾品8）。全部 source: randomDungeon・説明文がある・付くカードがある', () => {
    const rd = ITEMS.all.filter((i) => i.source === 'randomDungeon');
    expect(rd.map((i) => i.id).sort()).toEqual([...RD_IDS].sort());
    expect(rd.filter((i) => i.slot === 'weapon')).toHaveLength(3);
    expect(rd.filter((i) => i.slot === 'armor')).toHaveLength(2);
    expect(rd.filter((i) => i.slot === 'accessory')).toHaveLength(8);
    for (const i of rd) {
      expect(i.rarity === 'epic' || i.rarity === 'legend', i.id).toBe(true);
      expect(describeAbility(i.ability!), i.id).toBeTruthy();
      for (const c of i.cards ?? []) expect(CARDS.has(c.cardId), c.cardId).toBe(true);
    }
    // 段階7c: 一覧の14個が全部そろった（イージスの鏡盾・残響の指輪はエピックの装飾品）
    for (const name of ['イージスの鏡盾']) {
      const it7c = rd.find((i) => i.name === name)!;
      expect(it7c.slot, name).toBe('accessory');
      expect(it7c.rarity, name).toBe('epic');
    }
  });

  it('ふつうのくじ引き（宝箱・ドロップ）・町の店・行商人には出ない', () => {
    const g = newGame('corruptionKing', 4, ['P1', 'P2']);
    for (let s = 1; s <= 400; s++) for (const r of ['rare', 'epic', 'legend'] as const) expect(rollEquipment(r, g.heroes, createRng(s), { scenario: 'corruptionKing' }).source).toBeUndefined();
  });

  it('黄金箱のおまけは約60%。1人の冒険では「仲間がいる時だけ」の指輪は出ない', () => {
    const solo = newGame('corruptionKing', 4);
    const duo = newGame('corruptionKing', 4, ['P1', 'P2']);
    for (let s = 1; s <= 300; s++) {
      const ex = rollExclusive(solo, solo.heroes, createRng(s));
      expect(ex?.id).not.toBe('resonanceRing');
    }
    expect([...Array(300)].some((_, s) => rollExclusive(duo, duo.heroes, createRng(s + 1))?.id === 'resonanceRing')).toBe(true);
    // 武器は、だれかのジョブが持てる種類だけ（戦士 = 剣・刀、魔道士 = 杖・魔導書。銃・錫杖は出ない）
    for (let s = 1; s <= 200; s++) {
      const ex = rollExclusive(duo, duo.heroes, createRng(s))!;
      if (ex.slot === 'weapon') expect(ex.weaponType).toBe('katana');
    }
    expect(BALANCE.randomDungeon.exclusiveChance).toBe(60);
  });

  it('ランダムダンジョンのボスの黄金箱を開けると、約60%で専用の装備が1つ余分に入る（ふつうの中身はそのまま）', () => {
    let extra = 0;
    const N = 60;
    for (let s = 0; s < N; s++) {
      let g = newGame('corruptionKing', 20 + s);
      const tile = randomTiles(g)[0];
      g.world!.pos.h0 = tile;
      g.world!.turn = 'h0';
      g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0'] });
      const x = g.expeditions![0];
      const boss = x.dungeon!.rooms.find((r) => getRoomType(r.type).battle?.boss)!;
      x.dungeon!.currentRoomId = boss.id;
      boss.cleared = true;
      x.mode = 'chest';
      x.chest = { roomId: boss.id, spec: { rarity: 'legend', locked: false, big: true }, unlocked: true };
      const s2 = run(g, { type: 'SCENE', scene: x.id, command: { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 } });
      const c = s2.expeditions![0].chest!;
      const items = c.contents!.filter((l) => l.kind === 'item').map((l) => getItem((l as { item: { itemId: string } }).item.itemId));
      // ふつうの中身: 1つ目の装備（専用ではない）と、消耗品
      expect(items[0].source).toBeUndefined();
      if (c.exclusive) {
        extra++;
        expect(items[1].source).toBe('randomDungeon');
        expect(s2.heroes[0].stash.some((i) => getItem(i.itemId).source)).toBe(true);
      } else expect(items.some((i) => i.source)).toBe(false);
    }
    expect(extra / N).toBeGreaterThan(0.4);
    expect(extra / N).toBeLessThan(0.8);
  });

  it('2人の時は、専用の装備も「欲しい／余れば／いらない」の取り合いに入る（だれも止まらない）', () => {
    let g = newGame('corruptionKing', 31, ['P1', 'P2']);
    const tile = randomTiles(g)[0];
    for (const h of g.heroes) g.world!.pos[h.id] = tile;
    g.world!.turn = 'h0';
    g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0'] });
    g = run(g, { type: 'WORLD_INTERACT', playerId: 'P2', heroId: 'h1', party: ['h1'] });
    const x = g.expeditions![0];
    expect(x.heroes).toEqual(['h0', 'h1']);
    const boss = x.dungeon!.rooms.find((r) => getRoomType(r.type).battle?.boss)!;
    x.dungeon!.currentRoomId = boss.id;
    x.mode = 'chest';
    // 何度か試して、専用の装備が入った黄金箱を作る
    let s: GameState | undefined;
    for (let k = 0; k < 30 && !s?.expeditions?.[0]?.chest?.exclusive; k++) {
      const t = structuredClone(g);
      t.rngState = 1000 + k;
      t.expeditions![0].chest = { roomId: boss.id, spec: { rarity: 'legend', locked: false, big: true }, unlocked: true, opener: 'h0' };
      s = run(t, { type: 'SCENE', scene: x.id, command: { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 } });
    }
    const c = s!.expeditions![0].chest!;
    expect(c.exclusive).toBe(true);
    const claim = c.claims!.findIndex((cl) => getItem(cl.item.itemId).source === 'randomDungeon');
    expect(claim).toBeGreaterThanOrEqual(0);
    expect(c.claims![claim].heroes).toEqual(['h0', 'h1']);
  });
});

// ---------- 闇商人・晶石の祭壇 ----------

describe('段階7a: 闇商人と晶石の祭壇', () => {
  it('闇商人: 1人ずつに、専用の装備1つ（先頭）とレア以上の品2つ。値段は町の1.5倍。買える・買わなくてもよい', () => {
    const g = newGame('corruptionKing', 12, ['P1', 'P2']);
    const h = g.heroes[0];
    const stock = blackMarketStock(g, h, createRng(5));
    expect(stock.kind).toBe('blackMarket');
    expect(stock.cards).toEqual([]);
    expect(stock.items).toHaveLength(3);
    expect(getItem(stock.items[0].item.itemId).source).toBe('randomDungeon');
    for (const s of stock.items) {
      const def = getItem(s.item.itemId);
      expect(s.price).toBe(Math.round(BALANCE.itemPrice[def.rarity] * 1.5));
      expect(['rare', 'epic', 'legend']).toContain(def.rarity);
    }
    expect(stock.items.slice(1).every((s) => !getItem(s.item.itemId).source)).toBe(true);
    // 部屋に入ると、その場の全員に出る。部屋はすぐ片づく（だれも待たない）
    const run2 = buildDungeon('randomForest', createRng(2), 0, eventIds, 'outlawDen');
    g.dungeon = run2;
    g.party = ['h0', 'h1'];
    const room = run2.rooms.find((r) => r.type === 'blackMarket')!;
    roomBehavior('blackMarket').enter(g, room, createRng(1));
    expect(room.cleared).toBe(true);
    expect(g.mode).toBe('dungeon');
    expect(g.heroes.every((x) => x.peddler?.kind === 'blackMarket')).toBe(true);
    const hero = g.heroes[0];
    hero.gold = 10000;
    expect(peddlerBuy(g, hero, 'item', 0)).toBeUndefined();
    expect(hero.stash.some((i) => getItem(i.itemId).source)).toBe(true);
    expect(peddlerBuy(g, hero, undefined, undefined)).toBeUndefined();
    expect(hero.peddler).toBeUndefined();
  });

  it('晶石の祭壇: 全員に「強化か変異」。強化は＋、変異は同じ格の別のカード（同じ種・同じ結果）', () => {
    const g = newGame('corruptionKing', 13, ['P1', 'P2']);
    const run2 = buildDungeon('randomForest', createRng(2), 0, eventIds, 'crystalGrotto');
    g.dungeon = run2;
    g.party = ['h0', 'h1'];
    const room = run2.rooms.find((r) => r.type === 'crystalAltar')!;
    roomBehavior('altar').enter(g, room, createRng(1));
    expect(room.cleared).toBe(true);
    expect(g.mode).toBe('dungeon');
    expect(g.heroes.map((h) => h.cardTask)).toEqual(['altar', 'altar']);
    const [a, b] = g.heroes;
    // 強化
    const c0 = a.deck[0];
    expect(doCardTask(g, a, c0.uid, createRng(1), 'upgrade')).toBeUndefined();
    expect(a.deck[0].upgraded).toBe(true);
    expect(a.cardTask).toBeUndefined();
    // 変異（同じ種なら同じ結果・同じ格）
    const c1 = b.deck.find((c) => altarTransmutePool(g, b, c.cardId).length)!;
    const g2 = structuredClone(g);
    const b2 = g2.heroes[1];
    expect(doCardTask(g, b, c1.uid, createRng(7), 'transmute')).toBeUndefined();
    expect(doCardTask(g2, b2, c1.uid, createRng(7), 'transmute')).toBeUndefined();
    const to = b.deck.find((c) => c.uid === c1.uid)!.cardId;
    expect(to).not.toBe(c1.cardId);
    expect(b2.deck.find((c) => c.uid === c1.uid)!.cardId).toBe(to);
    expect(getCard(to).rarity ?? 'common').toBe(getCard(c1.cardId).rarity ?? 'common');
    // 選び方を書かないと、何もしない
    const g3 = newGame('corruptionKing', 14);
    g3.heroes[0].cardTask = 'altar';
    expect(doCardTask(g3, g3.heroes[0], g3.heroes[0].deck[0].uid, createRng(1))).toBeTruthy();
  });
});

// ---------- 専用の装備の力 ----------

const wait = [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block' as const, amount: 0 }] }];
const dummy = { icon: 'T', baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence' };
ENEMIES.register({ ...dummy, id: 'rd7Idler', name: '確認用の置物', maxHp: 100000, actions: wait });
ENEMIES.register({ ...dummy, id: 'rd7Weak', name: '確認用の火に弱い置物', maxHp: 100000, weak: ['fire'], actions: wait });
ENEMIES.register({ ...dummy, id: 'rd7Big', name: '確認用の大技の置物', maxHp: 100000, actions: [{ id: 'big', name: '大技', big: true, effects: [{ kind: 'damage', amount: 5 }] }] });
ENEMIES.register({ ...dummy, id: 'rd7Hitter', name: '確認用の殴る置物', maxHp: 100000, actions: [{ id: 'hit', name: '殴る', effects: [{ kind: 'damage', amount: 7 }] }] });
const card = (c: Partial<CardDef> & Pick<CardDef, 'id' | 'tiers'>): CardDef => ({ name: c.id, category: 'physical', cost: 1, slots: 1, baseChance: 100, target: 'enemy', ...c });
for (const c of [
  card({ id: 'rd7Hit', tiers: [{ minSuccesses: 0, effects: [] }, { minSuccesses: 1, effects: [{ kind: 'damage', amount: 5 }] }] }),
  card({ id: 'rd7Multi', tiers: [{ minSuccesses: 0, effects: [{ kind: 'damage', amount: 1, hits: 3 }] }] }),
  card({ id: 'rd7Fire', category: 'magic', tiers: [{ minSuccesses: 0, effects: [{ kind: 'damage', amount: 2, element: 'fire' }] }] }),
  card({ id: 'rd7Zero', category: 'skill', cost: 0, target: 'self', tiers: [{ minSuccesses: 0, effects: [{ kind: 'block', amount: 1 }] }] }),
  card({ id: 'rd7Block', category: 'skill', target: 'self', tiers: [{ minSuccesses: 0, effects: [{ kind: 'block', amount: 10 }] }] }),
  card({ id: 'rd7Heal', category: 'skill', target: 'ally', tiers: [{ minSuccesses: 0, effects: [{ kind: 'heal', amount: 20 }] }] }),
]) CARDS.register(c);

type Opt = { enemies?: string[]; players?: PlayerId[]; boss?: boolean; armor?: string[]; accessory?: string[] };
function battle(classes: string[], weapons: (string | undefined)[], opt: Opt = {}): BattleState {
  const g = createGame({ seed: 11, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((classId, i) => ({ classId, gender: 'female' as const, name: `仲間${i + 1}`, playerId: opt.players?.[i] ?? 'P1' })) });
  g.heroes.forEach((h, i) => {
    if (weapons[i]) h.equipment.weapon = { uid: `w${i}`, itemId: weapons[i]! };
    else delete h.equipment.weapon;
    if (opt.armor?.[i]) h.equipment.armor = { uid: `a${i}`, itemId: opt.armor[i] };
    else delete h.equipment.armor;
    if (opt.accessory?.[i]) h.equipment.accessory = { uid: `c${i}`, itemId: opt.accessory[i] };
    else delete h.equipment.accessory;
    delete h.pet;
  });
  const s = createBattle({ seed: 11, party: g.heroes.map(toPartyMember), encounter: { id: 'rd7', name: '確認', enemies: (opt.enemies ?? ['rd7Idler']).map((defId) => ({ defId })), ...(opt.boss ? { boss: true } : {}) } });
  for (const a of s.allies) { a.mana = 30; a.focus = 5; a.focusMax = 9; a.hp = a.maxHp = 500; a.block = 0; a.hand = []; }
  return s;
}
let uid = 0;
function use(s: BattleState, cardId: string, o: { ally?: number; target?: number; allyTarget?: number; focus?: number } = {}) {
  const a = s.allies[o.ally ?? 0], inst = { uid: `u${uid++}`, cardId };
  a.hand.push(inst);
  const c = getCard(cardId);
  const cmd: Command = { type: 'PLAY_CARD', playerId: a.playerId, characterId: a.id, cardInstanceId: inst.uid, targetId: c.target === 'enemy' ? s.enemies[o.target ?? 0].uid : c.target === 'ally' ? s.allies[o.allyTarget ?? 0].id : undefined, focusUsed: o.focus ?? 0 };
  const r = applyCommand(s, cmd);
  expect(r.error, cardId).toBeUndefined();
  return r;
}
function nextTurn(s: BattleState): BattleState {
  let st = applyCommand(s, { type: 'END_TURN', playerId: 'P1' }).state;
  for (let i = 0; st.phase === 'enemy' && i < 20; i++) st = applyCommand(st, { type: 'ENEMY_STEP' }).state;
  return st;
}
const dmgTo = (events: { type: string; unitId?: string; amount?: number }[], id: string) => events.filter((e) => e.type === 'damage' && e.unitId === id).reduce((n, e) => n + (e.amount ?? 0), 0);
const fired = (events: { type: string; name?: string }[], name: string) => events.some((e) => e.type === 'ability' && e.name === name);

describe('段階7a: 専用の装備の力（1つずつ）', () => {
  it('連装ガトリング銃: 「×N回」の回数+1（1回の攻撃のカードには付かない）', () => {
    const bare = use(battle(['archer'], [undefined]), 'rd7Multi');
    const gat = use(battle(['archer'], ['gatlingGun']), 'rd7Multi');
    const hits = (r: typeof bare) => r.events.filter((e) => e.type === 'damage' && e.unitId === 'e0').length;
    expect(hits(bare)).toBe(3);
    expect(hits(gat)).toBe(4);
    const single = use(battle(['archer'], ['gatlingGun']), 'rd7Hit');
    expect(single.events.filter((e) => e.type === 'damage' && e.unitId === 'e0').length).toBe(1);
  });

  it('追撃の雷鳴刀: 2人の時は、味方の連携のたびに3の雷（1ターン3回まで）。1人の時は、2枚目からの物理カードのたび', () => {
    // 2人: h1（P1）が先に殴り、h0（刀）が同じ敵を殴る → 連携 → 追撃
    let s = battle(['samurai', 'warrior'], ['thunderChaseKatana', undefined]);
    s = use(s, 'rd7Hit', { ally: 1 }).state;
    const r = use(s, 'rd7Hit', { ally: 0 });
    expect(fired(r.events, '雷鳴の追撃')).toBe(true);
    // 刀を持たない仲間の連携でも、刀を持つキャラが追撃する
    let t = battle(['samurai', 'warrior'], ['thunderChaseKatana', undefined]);
    t = use(t, 'rd7Hit', { ally: 0 }).state;
    const r2 = use(t, 'rd7Hit', { ally: 1 });
    expect(fired(r2.events, '雷鳴の追撃')).toBe(true);
    // 1ターンに3回まで
    let u = battle(['samurai', 'warrior'], ['thunderChaseKatana', undefined]);
    let n = 0;
    for (let k = 0; k < 6; k++) { const x = use(u, 'rd7Hit', { ally: k % 2 }); n += x.events.filter((e) => e.type === 'ability' && e.name === '雷鳴の追撃').length; u = x.state; }
    expect(n).toBe(3);
    // 1人: 1枚目は無し、2枚目から
    let solo = battle(['samurai'], ['thunderChaseKatana']);
    const first = use(solo, 'rd7Hit');
    expect(fired(first.events, '雷鳴の追撃')).toBe(false);
    solo = first.state;
    expect(fired(use(solo, 'rd7Hit').events, '雷鳴の追撃')).toBe(true);
  });

  it('福音の大錫杖: あふれた回復量と同じ聖ダメージ。ボス戦では1回30まで', () => {
    const s = battle(['priest'], ['gospelScepter']);
    s.allies[0].hp = s.allies[0].maxHp - 5;
    const r = use(s, 'rd7Heal', { allyTarget: 0 });
    expect(dmgTo(r.events, 'e0')).toBe(15);
    const big = battle(['priest'], ['gospelScepter'], { boss: true });
    const card2 = { ...getCard('rd7Heal'), id: 'rd7HealBig', tiers: [{ minSuccesses: 0, effects: [{ kind: 'heal' as const, amount: 80 }] }] };
    CARDS.register(card2);
    const r2 = use(big, 'rd7HealBig', { allyTarget: 0 });
    expect(dmgTo(r2.events, 'e0')).toBe(30);
  });

  it('狂王の血鎧: HPが減るたび次の攻撃カード+20%（最大+100%）。使うと0に戻る', () => {
    let s = battle(['warrior'], [undefined], { enemies: ['rd7Hitter'], armor: ['madKingMail'] });
    s = nextTurn(s);
    expect(s.allies[0].counters?.rageAtkPct).toBe(20);
    for (let k = 0; k < 6; k++) s = nextTurn(s);
    expect(s.allies[0].counters?.rageAtkPct).toBe(100);
    const bare = battle(['warrior'], [undefined]);
    const a = dmgTo(use(bare, 'rd7Hit').events, 'e0');
    const r = use(s, 'rd7Hit');
    expect(dmgTo(r.events, 'e0')).toBeGreaterThanOrEqual(a * 2 - 1);
    expect(r.state.allies[0].counters?.rageAtkPct).toBe(0);
  });

  it('処刑人の黒外套: 自分の攻撃で BREAK させたら、マナ+2・フォーカス+1・2枚引く（1ターンに1回）', () => {
    const s = battle(['warrior'], [undefined], { enemies: ['rd7Big'], armor: ['executionerCloak'] });
    for (let k = 0; k < 4; k++) s.allies[0].drawPile.push({ uid: `d${k}`, cardId: 'rd7Hit' });
    s.allies[0].focus = 2;
    const before = s.allies[0].mana;
    // 完全成功（フォーカス1枠）で BREAK
    const r = use(s, 'rd7Hit', { focus: 1 });
    expect(r.events.some((e) => e.type === 'break')).toBe(true);
    expect(fired(r.events, '処刑の合図')).toBe(true);
    const a = r.state.allies[0];
    expect(a.mana).toBe(before - 1 + 2);
    expect(a.focus).toBe(2 - 1 + 1);
    expect(a.hand.length).toBe(2);
  });

  it('双子の魂の鈴: お供の自動の行動が2回（お供の行動の上限4回の中）。カードで動かした時は1回', () => {
    const g = createGame({ seed: 11, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'female', name: 'a', playerId: 'P1' }] });
    const h = g.heroes[0];
    // 子亀《甲羅の守り》: 戦闘開始時に自動でブロック3
    h.pet = { petId: 'turtle', color: 'green', name: 'カメキチ', love: 0 } as typeof h.pet;
    const mk = (bell: boolean) => {
      if (bell) h.equipment.accessory = { uid: 'b', itemId: 'twinSoulBell' };
      else delete h.equipment.accessory;
      return createBattle({ seed: 11, party: [toPartyMember(h)], encounter: { id: 'x', name: 'x', enemies: [{ defId: 'rd7Idler' }] } });
    };
    const acts = (b: BattleState) => b.allies[0].counters?.petActs ?? 0;
    const one = mk(false);
    expect(acts(one)).toBe(1);
    const twice = mk(true);
    expect(acts(twice)).toBe(2);
    expect(twice.allies[0].block).toBe(one.allies[0].block + 3);
    // 2回目は別の名前で知らせる（画面でお供が2回跳ねる）
    expect(twice.openingEvents!.some((e) => e.type === 'ability' && e.name === 'カメキチの甲羅の守り・もう1回' && e.source?.kind === 'pet')).toBe(true);
    // 道具で動かした時（お供の特上ごちそう = 1ターン目に3回）は1回ずつ。お供の行動は全部で1ターン4回まで
    h.petFeast = 3;
    expect(acts(mk(false))).toBe(1 + 3);
    expect(acts(mk(true))).toBe(4);
  });

  it('無限回廊の砂時計: コスト0を3回使うたびマナ+1・1枚引く（1ターン2回まで）', () => {
    const s = battle(['thief'], [undefined], { accessory: ['endlessHourglass'] });
    for (let k = 0; k < 9; k++) s.allies[0].drawPile.push({ uid: `d${k}`, cardId: 'rd7Hit' });
    let st = s;
    let n = 0;
    for (let k = 0; k < 9; k++) { const r = use(st, 'rd7Zero'); if (fired(r.events, '無限回廊')) n++; st = r.state; }
    expect(n).toBe(2);
  });

  it('いかさま師の黄金賽: 成功0が完全成功に（フォーカス+1・1ターンに1回）。星読みで決めた結果に当てても同じ', () => {
    const s = battle(['warrior'], [undefined], { accessory: ['cheatersDice'] });
    const a = s.allies[0];
    const inst = { uid: 'pv', cardId: 'rd7Hit' };
    a.hand.push(inst);
    a.focus = 3;
    // 星読みで先に決めて保存した結果（失敗）を確定する
    s.slotPreview = { characterId: a.id, cardInstanceId: inst.uid, targetId: s.enemies[0].uid, focusUsed: 0, chance: 50, results: ['miss'], rerollResults: ['miss'], rerolled: false };
    const r1 = applyCommand(s, { type: 'CONFIRM_PREVIEW', playerId: 'P1', characterId: a.id });
    const r2 = applyCommand(structuredClone(s), { type: 'CONFIRM_PREVIEW', playerId: 'P1', characterId: a.id });
    expect(r1.error).toBeUndefined();
    const roll = r1.events.find((e) => e.type === 'roll') as { results: string[]; perfect: boolean };
    expect(roll.results).toEqual(['hit']);
    expect(roll.perfect).toBe(true);
    expect(r1.state.allies[0].focus).toBe(4);
    expect(JSON.stringify(r2.state)).toBe(JSON.stringify(r1.state));
    // 同じターンの2回目は変わらない
    const st = r1.state;
    st.slotPreview = { characterId: a.id, cardInstanceId: 'pv2', targetId: st.enemies[0].uid, focusUsed: 0, chance: 50, results: ['miss'], rerollResults: ['miss'], rerolled: false };
    st.allies[0].hand.push({ uid: 'pv2', cardId: 'rd7Hit' });
    const r3 = applyCommand(st, { type: 'CONFIRM_PREVIEW', playerId: 'P1', characterId: a.id });
    expect((r3.events.find((e) => e.type === 'roll') as { results: string[] }).results).toEqual(['miss']);
  });

  it('過充填の魔導炉: 残ったマナを最大2持ち越す', () => {
    const s = battle(['mage'], [undefined], { accessory: ['overchargeCore'] });
    s.allies[0].mana = 5;
    const t = nextTurn(s);
    expect(t.allies[0].mana).toBe(BALANCE.manaPerTurn + 2);
    const bare = battle(['mage'], [undefined]);
    bare.allies[0].mana = 5;
    expect(nextTurn(bare).allies[0].mana).toBe(BALANCE.manaPerTurn);
  });

  it('共鳴する絆の指輪: カードで得たブロックの50%を、HPの割合が一番低いほかの味方に', () => {
    const s = battle(['guardian', 'warrior', 'mage'], [undefined, undefined, undefined], { accessory: ['resonanceRing'] });
    s.allies[2].hp = 100;
    const r = use(s, 'rd7Block');
    expect(r.state.allies[0].block).toBe(10);
    expect(r.state.allies[2].block).toBe(5);
    expect(r.state.allies[1].block).toBe(0);
  });

  it('錬金術師のベルト: 道具袋+2。戦闘で消耗品を使うと味方全員HP4・ブロック4', () => {
    const g = createGame({ seed: 11, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'female', name: 'a', playerId: 'P1' }] });
    const h = g.heroes[0];
    expect(pouchLimitOf(h)).toBe(POUCH_LIMIT);
    h.equipment.accessory = { uid: 'belt', itemId: 'alchemistBelt' };
    expect(pouchLimitOf(h)).toBe(POUCH_LIMIT + 2);
    h.pouch = [];
    for (let k = 0; k < POUCH_LIMIT + 2; k++) addItem(g, h, { uid: `p${k}`, itemId: 'potion' }, false);
    expect(h.pouch).toHaveLength(POUCH_LIMIT + 2);
    const s = battle(['warrior', 'mage'], [undefined, undefined], { accessory: ['alchemistBelt'] });
    s.allies[1].hp = 100;
    const r = applyCommand(s, { type: 'USE_ITEM', playerId: 'P1', characterId: s.allies[0].id, targetId: s.allies[0].id, itemName: '確認の薬', effects: [{ kind: 'block', amount: 1 }] });
    expect(r.error).toBeUndefined();
    expect(r.state.allies[1].hp).toBe(104);
    expect(r.state.allies[1].block).toBe(4);
    expect(fired(r.events, '錬金の滴')).toBe(true);
  });

  it('氷嵐の耳飾り: 弱点を突いたカードのマナを返す（1ターンに1回）', () => {
    const s = battle(['mage'], [undefined], { enemies: ['rd7Weak'], accessory: ['stormEarring'] });
    const m = s.allies[0].mana;
    const r = use(s, 'rd7Fire');
    expect(r.state.allies[0].mana).toBe(m);
    const r2 = use(r.state, 'rd7Fire');
    expect(r2.state.allies[0].mana).toBe(m - 1);
    const plain = use(battle(['mage'], [undefined], { enemies: ['rd7Idler'], accessory: ['stormEarring'] }), 'rd7Fire');
    expect(plain.state.allies[0].mana).toBe(m - 1);
  });
});

// ---------- 段階7c: イージスの鏡盾・残響の指輪 ----------

ENEMIES.register({ ...dummy, id: 'rd7Smasher', name: '確認用の強く殴る置物', maxHp: 100000, actions: [{ id: 'smash', name: '強打', effects: [{ kind: 'damage', amount: 25 }] }] });
ENEMIES.register({ ...dummy, id: 'rd7Crusher', name: '確認用のとても強く殴る置物', maxHp: 100000, actions: [{ id: 'crush', name: '豪打', effects: [{ kind: 'damage', amount: 45 }] }] });
/** 敵の番を1回まわして、起きた出来事を全部集める */
function enemyRound(s: BattleState) {
  let r = applyCommand(s, { type: 'END_TURN', playerId: 'P1' });
  const events = [...r.events];
  for (let i = 0; r.state.phase === 'enemy' && i < 20; i++) {
    r = applyCommand(r.state, { type: 'ENEMY_STEP' });
    events.push(...r.events);
  }
  return { state: r.state, events };
}

describe('段階7c: 黄金箱の装備（一覧の残り2個）', () => {
  /** 敵の攻撃1回を、ブロック block で受けた時。taken = 減ったHP・back = 攻撃してきた敵が受けたダメージの合計 */
  const guard = (classId: string, enemy: string, block: number, o: { mirror?: boolean; boss?: boolean; mirrorHeart?: boolean } = {}) => {
    let s = battle([classId], [undefined], { enemies: [enemy], accessory: o.mirror ? ['aegisMirror'] : undefined, boss: o.boss });
    if (o.mirrorHeart) s = use(s, 'fxMirrorHeart', { focus: 1 }).state;
    s.allies[0].block = block;
    const r = enemyRound(s);
    return { taken: 500 - r.state.allies[0].hp, back: dmgTo(r.events, 'e0'), mirror: r.events.filter((e) => e.type === 'ability' && e.name === '鏡の反射').length };
  };

  it('イージスの鏡盾: ブロックで完全に防いだら、防いだ量をその敵にはね返す（ボス・中ボスへは1回30まで）。一部しか防げない時は無し', () => {
    // 攻撃の量（ブロック無しで受けた量）
    expect(guard('warrior', 'rd7Hitter', 0).taken).toBe(7);
    expect(guard('warrior', 'rd7Smasher', 0).taken).toBe(25);
    expect(guard('warrior', 'rd7Crusher', 0).taken).toBe(45);
    // 完全に防いだ: 防いだ量と同じ
    expect(guard('warrior', 'rd7Hitter', 100, { mirror: true })).toEqual({ taken: 0, back: 7, mirror: 1 });
    expect(guard('warrior', 'rd7Crusher', 100, { mirror: true }).back).toBe(45);
    // ボス戦では1回30まで
    expect(guard('warrior', 'rd7Crusher', 100, { mirror: true, boss: true }).back).toBe(30);
    // 一部しか防げない（HPが減った）時は、はね返さない
    expect(guard('warrior', 'rd7Hitter', 3, { mirror: true })).toEqual({ taken: 4, back: 0, mirror: 0 });
    // 鏡盾が無ければ何も起きない
    expect(guard('warrior', 'rd7Hitter', 100).back).toBe(0);
  });

  it('拳聖＋イージスの鏡盾: 《後の先》（1回12まで）と鏡盾（防いだ量）の両方が出る。1回の攻撃への反撃の合計', () => {
    // 7の攻撃: 後の先7 ＋ 鏡盾7 = 14
    expect(guard('fistSaint', 'rd7Hitter', 100).back).toBe(7);
    expect(guard('fistSaint', 'rd7Hitter', 100, { mirror: true }).back).toBe(14);
    // 25の攻撃: 後の先12 ＋ 鏡盾25 = 37
    expect(guard('fistSaint', 'rd7Smasher', 100).back).toBe(12);
    expect(guard('fistSaint', 'rd7Smasher', 100, { mirror: true }).back).toBe(37);
    // 45の攻撃: 後の先12 ＋ 鏡盾45 = 57。ボス戦は 後の先12 ＋ 鏡盾30 = 42
    expect(guard('fistSaint', 'rd7Crusher', 100, { mirror: true }).back).toBe(57);
    expect(guard('fistSaint', 'rd7Crusher', 100, { mirror: true, boss: true }).back).toBe(42);
    // 明鏡止水（後の先が2倍・上限なし）の後: 25の攻撃に 後の先50 ＋ 鏡盾25 = 75。ボス戦の45の攻撃に 後の先90 ＋ 鏡盾30 = 120
    expect(guard('fistSaint', 'rd7Smasher', 100, { mirror: true, mirrorHeart: true }).back).toBe(75);
    expect(guard('fistSaint', 'rd7Crusher', 100, { mirror: true, mirrorHeart: true, boss: true }).back).toBe(120);
  });
});
