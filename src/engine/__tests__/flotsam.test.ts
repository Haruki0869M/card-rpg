// ===== ランダムダンジョンのテーマ「🛶 漂流物の洞」（2026-11-16 シナリオ3の作り直し。docs/tasks/scenario3-rework-plan.md §3-3・「憲章の点検の後の直し」B4） =====
// シナリオ3だけ・ほかのシナリオと古い保存のテーマが変わらない・部屋の並び・3択の候補・全員が選べる・袋が満杯・
// 1台で2人・代わりに操作・オンライン（担当の席）・保存して再開・2人で片方が先に選ぶ・自動プレイが止まらない
import { afterEach, describe, expect, it } from 'vitest';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { getItem } from '../../data/items';
import { DUNGEON_THEMES, getRoomType } from '../../data/rules';
import type { GameCommand, GameState, Hero, PlayerId } from '../../types';
import { applyGameCommand, buildDungeon, createGame, createRng, migrateGame, moveIntoRoom, reachableRooms, roomKind } from '../index';
import { dealFlotsam, flotsamPools, flotsamView, swapGold, rollFlotsam } from '../game/flotsam';
import { pouchLimitOf } from '../game/hero';
import { rarityIndex } from '../game/dungeon';
import { dungeonDetourLines } from '../game/world/detour';
import { ensureTileTheme, themesForScenario } from '../game/world/randomDungeons';
import { botStep, type BotLog, type BotMemo } from '../bot';
import { actorOf, isLocalPlayer, setLocalPlayers } from '../../store/battleConfig';

afterEach(() => setLocalPlayers(null));

const FC = 'flotsamCave';
const OLD = ['crystalGrotto', 'sealedLabyrinth', 'outlawDen'];
const S3 = 'cursedArchipelago';
const evIds = (sid: string) => EVENTS.forScenario(sid).filter((e) => e.where !== 'map' && e.where !== 'spawn').map((e) => e.id);

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
function newGame(scenarioId: string, seed: number, players: PlayerId[] = ['P1']) {
  const g = createGame({ seed, scenarioId, difficulty: 'normal', party: players.map((playerId, i) => ({ classId: ['warrior', 'priest', 'mage', 'thief'][i], gender: 'male' as const, name: `h${i}`, playerId })) });
  return run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
}
const randomTiles = (g: GameState) => g.world!.tiles.flatMap((t, i) => (t.f?.kind === 'dungeon' && DUNGEONS.get(t.f.id).random ? [i] : []));

/** 拠点から漂流物の洞に入り、漂流物の山の扉の前まで来た形（世界マップを通らない） */
function beforePile(seed = 3, players: PlayerId[] = ['P1', 'P2']): { g: GameState; pile: string } {
  const g = createGame({ seed, scenarioId: S3, difficulty: 'normal', party: players.map((playerId, i) => ({ classId: ['warrior', 'priest', 'mage'][i], gender: 'male' as const, name: `h${i}`, playerId })) });
  g.world = undefined;
  g.mode = 'dungeon';
  g.dungeon = buildDungeon('tideCave', createRng(seed), 0, evIds(S3), FC);
  const pile = g.dungeon.rooms.find((r) => r.type === 'flotsamPile')!;
  const parent = g.dungeon.rooms.find((r) => r.next.includes(pile.id))!;
  for (const r of g.dungeon.rooms) if (r.row <= parent.row) r.cleared = true;
  g.dungeon.currentRoomId = parent.id;
  moveIntoRoom(g.dungeon, parent.id);
  return { g, pile: pile.id };
}
const enterPile = (seed = 3, players: PlayerId[] = ['P1', 'P2']) => {
  const { g, pile } = beforePile(seed, players);
  return run(g, { type: 'ENTER_ROOM', playerId: 'P1', roomId: pile });
};
const pick = (_g: GameState, h: Hero, index: number): GameCommand => ({ type: 'FLOTSAM_PICK', playerId: h.playerId, heroId: h.id, index });

describe('漂流物の洞: データとシナリオ', () => {
  it('データの最後の順番・シナリオ3だけ・割合は計画の数字・奥は漂流物の山（宝の予兆・自動生成では出ない）', () => {
    expect(DUNGEON_THEMES.all.map((t) => t.id)).toEqual([...OLD, 'frozenVault', FC]);
    const t = DUNGEON_THEMES.get(FC);
    expect(t).toMatchObject({ name: '漂流物の洞', mark: '🛶', scenario: S3, fixedRoom: 'flotsamPile', flotsam: { choices: 3, epicSlots: 1 } });
    expect(t.weights).toEqual({ battle: 25, elite: 15, event: 30, chest: 15, rest: 15 });
    expect(getRoomType(t.fixedRoom)).toMatchObject({ behavior: 'flotsam', omen: 'treasure', name: '漂流物の山' });
    expect(getRoomType(t.fixedRoom).layoutWeight ?? 0).toBe(0);
    for (const sid of DUNGEONS.all.filter((d) => d.random).map((d) => DUNGEONS.scenarioOf(d.id)!)) {
      const want = sid === S3 ? [...OLD, FC] : sid === 'frozenKingdom' ? [...OLD, 'frozenVault'] : OLD;
      expect(themesForScenario(sid).map((x) => x.id), sid).toEqual(want);
    }
  });

  it('新しい冒険: シナリオ3では選ばれる事がある・ほかのシナリオでは選ばれない', () => {
    let seen = 0;
    for (const sid of DUNGEONS.all.filter((d) => d.random).map((d) => DUNGEONS.scenarioOf(d.id)!)) {
      for (let seed = 1; seed <= (sid === S3 ? 24 : 4); seed++) {
        const g = newGame(sid, seed);
        const themes = randomTiles(g).map((i) => g.world!.tiles[i].f!.theme!);
        if (sid !== S3) expect(themes.includes(FC), `${sid} ${seed}`).toBe(false);
        else seen += themes.filter((x) => x === FC).length;
      }
    }
    expect(seen).toBeGreaterThanOrEqual(2);
  });

  it('ほかのシナリオのテーマ決めは、テーマを足す前と同じ（足す前のデータで測った値）', () => {
    // 2026-11-16: 漂流物の洞のデータを外して測った値と、足した後の値が同じだった（種 1〜5）
    const before: Record<string, string[][]> = {
      corruptionKing: [['sealedLabyrinth', 'crystalGrotto'], ['sealedLabyrinth', 'outlawDen'], ['outlawDen', 'sealedLabyrinth'], ['sealedLabyrinth', 'crystalGrotto'], ['sealedLabyrinth', 'crystalGrotto']],
      // 2026-11-21（オーナーの決定 9-A）: シナリオだけのテーマは必ず1か所に出す。種3・4 は、2か所目が氷漬けの宝物庫に入れ替わった（前は sealedLabyrinth）
      frozenKingdom: [['frozenVault', 'sealedLabyrinth'], ['frozenVault', 'outlawDen'], ['outlawDen', 'frozenVault'], ['crystalGrotto', 'frozenVault'], ['crystalGrotto', 'frozenVault']],
      sandDynasty: [['sealedLabyrinth'], ['crystalGrotto'], ['outlawDen'], ['outlawDen'], ['crystalGrotto']],
    };
    for (const [sid, list] of Object.entries(before)) {
      list.forEach((want, i) => {
        const g = newGame(sid, i + 1);
        expect(randomTiles(g).map((t) => g.world!.tiles[t].f!.theme), `${sid} ${i + 1}`).toEqual(want);
      });
    }
  });

  it('シナリオだけのテーマ（漂流物の洞・氷漬けの宝物庫）は、どの冒険でも必ず1か所に出る（種30個）', () => {
    for (const [sid, own] of [[S3, 'flotsamCave'], ['frozenKingdom', 'frozenVault']] as const) {
      for (let seed = 1; seed <= 30; seed++) {
        const g = newGame(sid, seed);
        const themes = randomTiles(g).map((t) => g.world!.tiles[t].f!.theme);
        expect(themes.length, `${sid} ${seed}`).toBe(2);
        expect(themes.filter((t) => t === own).length, `${sid} ${seed}: ${themes.join()}`).toBe(1);
      }
    }
  });

  it('古い保存（テーマの無いマス）のテーマ決めは前と同じ（シナリオだけのテーマは選ばない）', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const g = newGame(S3, seed);
      const tiles = randomTiles(g);
      for (const t of tiles) delete g.world!.tiles[t].f!.theme;
      expect(ensureTileTheme(g.world!, tiles[tiles.length - 1]), `${seed}`).toBe('crystalGrotto');
      // 片方が漂流物の洞なら、もう片方は前の3つから
      if (tiles.length > 1) {
        g.world!.tiles[tiles[0]].f!.theme = FC;
        delete g.world!.tiles[tiles[1]].f!.theme;
        expect(ensureTileTheme(g.world!, tiles[1])).toBe('crystalGrotto');
        expect(ensureTileTheme(g.world!, tiles[0])).toBe(FC);
      }
    }
  });

  it('入口の文: 漂流物の山の中身（行く前に分かる）。ほかのテーマには出ない', () => {
    const g = newGame(S3, 1);
    const tile = randomTiles(g)[0];
    g.world!.tiles[tile].f!.theme = FC;
    expect(dungeonDetourLines(g, tile)).toContain('🛶漂流物の山: 奥で、全員がそれぞれ消耗品を3つから1つ選べる（1つはエピック以上）。袋がいっぱいだと、選んだ品はお金に換わる');
    g.world!.tiles[tile].f!.theme = 'crystalGrotto';
    expect(dungeonDetourLines(g, tile).some((l) => l.includes('漂流物'))).toBe(false);
  });
});

describe('漂流物の洞: 部屋の並び（今の5行の作りのまま）', () => {
  it('種を変えても: 全5行・4行目は漂流物の山・3行目に宝箱が無い（宝の予兆が続かない）・同じ種類が続かない・封魔の宝箱にならない', () => {
    let chests = 0;
    for (const d of DUNGEONS.all.filter((x) => x.random)) {
      const ev = evIds(DUNGEONS.scenarioOf(d.id)!);
      for (let seed = 1; seed <= 100; seed++) {
        const r = buildDungeon(d.id, createRng(seed * 7919 + 13), 0, ev, FC);
        const rows = Math.max(...r.rooms.map((x) => x.row)) + 1;
        expect(rows).toBe(5);
        expect(r.rooms.filter((x) => x.row === 0).every((x) => x.type === 'battle')).toBe(true);
        expect(r.rooms.filter((x) => x.row === 3).map((x) => x.type)).toEqual(['flotsamPile']);
        expect(r.rooms.filter((x) => x.row === 4).map((x) => x.type)).toEqual(['boss']);
        expect(r.rooms.filter((x) => x.row === 2).some((x) => roomKind(x.type) === 'treasure'), `${d.id} ${seed}`).toBe(false);
        const by = new Map(r.rooms.map((x) => [x.id, x]));
        for (const room of r.rooms) for (const nx of room.next) expect(roomKind(by.get(nx)!.type), `${d.id} ${seed}`).not.toBe(roomKind(room.type));
        expect(r.rooms.some((x) => getRoomType(x.type).sealedChest)).toBe(false);
        chests += r.rooms.filter((x) => x.type === 'chest').length;
      }
    }
    // 2行目には宝箱が出る（割合15）
    expect(chests).toBeGreaterThan(50);
  });
});

describe('漂流物の山: 3択の候補', () => {
  it('候補の元: エピック以上は10種類（災厄討ちの秘薬を外す）・レア以上の消耗品・出どころの決まった品は出ない', () => {
    const g = newGame(S3, 1);
    const h = g.heroes[0];
    const { epic, rare } = flotsamPools(g, h);
    expect(epic).toEqual(['flashShard', 'heroElixir', 'healingCenser', 'ironBanner', 'frostGem', 'phoenixFeather', 'divineNectar', 'timeHourglass', 'purifyCrystal', 'whetstone']);
    expect(epic).not.toContain('scourgeElixir');
    expect(rare).not.toContain('scourgeElixir');
    for (const id of rare) {
      const d = getItem(id);
      expect(d.slot).toBe('consumable');
      expect(rarityIndex(d.rarity)).toBeGreaterThanOrEqual(1);
      expect(d.source).toBeUndefined();
    }
    // お供のいないキャラには、お供のごちそうは出ない（お供がいれば出る）
    expect(rare).not.toContain('petFeast');
    h.pet = { petId: 'cockatiel', color: 'normal', name: 'ピー', love: 0, acts: 0 } as unknown as Hero['pet'];
    expect(flotsamPools(g, h).rare).toContain('petFeast');
    // 不死鳥の羽根（1人1本）を持っていれば出さない
    h.pouch = [{ uid: 'x1', itemId: 'phoenixFeather' }];
    expect(flotsamPools(g, h).epic).not.toContain('phoenixFeather');
  });

  it('種を変えても: 3つ・重ならない・1つ以上エピック以上・全部レア以上の消耗品・災厄討ちの秘薬は出ない・同じ種なら同じ', () => {
    const g = newGame(S3, 1);
    const h = g.heroes[0];
    const rule = DUNGEON_THEMES.get(FC).flotsam!;
    const count = new Map<string, number>();
    for (let seed = 1; seed <= 400; seed++) {
      const offer = rollFlotsam(g, h, rule, createRng(seed));
      expect(offer).toHaveLength(3);
      expect(new Set(offer).size).toBe(3);
      expect(offer.some((id) => rarityIndex(getItem(id).rarity) >= 2)).toBe(true);
      for (const id of offer) {
        expect(getItem(id).slot).toBe('consumable');
        expect(rarityIndex(getItem(id).rarity)).toBeGreaterThanOrEqual(1);
        count.set(id, (count.get(id) ?? 0) + 1);
      }
      expect(offer).not.toContain('scourgeElixir');
      expect(rollFlotsam(g, h, rule, createRng(seed))).toEqual(offer);
    }
    // エピック以上の10種類は、どれも出る
    for (const id of flotsamPools(g, h).epic) expect(count.get(id) ?? 0, id).toBeGreaterThan(0);
  });
});

describe('漂流物の山: 全員がそれぞれ選ぶ（だれも待たない）', () => {
  it('部屋に入ると、その場の全員に候補が配られ、部屋はすぐ片づく（通路に戻り、次の扉が開く）', () => {
    const g = enterPile(3);
    expect(g.mode).toBe('dungeon');
    expect(g.dungeon!.rooms.find((r) => r.type === 'flotsamPile')!.cleared).toBe(true);
    for (const h of g.heroes) expect(h.flotsam, h.name).toHaveLength(3);
    // 選ばなくても、次の扉（ボス）へ進める
    expect(reachableRooms(g.dungeon!).map((r) => r.type)).toEqual(['boss']);
    expect(g.log.some((l) => l.text.includes('🛶流れ着いた品が山になっている'))).toBe(true);
  });

  it('P2 が先に選んでも・P1 が後でも通る。選んだ品は自分の袋に入り、候補は消える。2回は選べない・人のキャラは選べない', () => {
    let g = enterPile(4);
    const [a, b] = g.heroes;
    const bItem = b.flotsam![2];
    // 人のキャラの分は選べない（担当の席でない）
    expect(applyGameCommand(g, { type: 'FLOTSAM_PICK', playerId: 'P1', heroId: b.id, index: 0 }).error).toBe('担当していないキャラです');
    g = run(g, pick(g, b, 2));
    expect(g.heroes[1].flotsam).toBeUndefined();
    expect(g.heroes[1].pouch.map((p) => p.itemId)).toContain(bItem);
    // P1 はまだ選んでいない（P2 が選んでも消えない）
    expect(g.heroes[0].flotsam).toHaveLength(3);
    const aItem = g.heroes[0].flotsam![0];
    g = run(g, pick(g, a, 0));
    expect(g.heroes[0].pouch.map((p) => p.itemId)).toContain(aItem);
    expect(applyGameCommand(g, pick(g, g.heroes[0], 0)).error).toBe('漂流物の山で選べる品はありません');
    expect(g.log.some((l) => l.text.startsWith(`🛶${a.name}は漂流物の山から`))).toBe(true);
  });

  it('袋が満杯: 画面に「満杯」と換わるお金が出る・選ぶとお金に換わる（袋は増えない）', () => {
    let g = enterPile(5, ['P1']);
    const h = g.heroes[0];
    const limit = pouchLimitOf(h);
    h.pouch = Array.from({ length: limit }, (_, i) => ({ uid: `p${i}`, itemId: 'potion' }));
    const v = flotsamView(h);
    expect(v).toMatchObject({ pouch: limit, limit, full: true });
    for (const x of v.items) expect(x.overflowGold).toBe(rarityIndex(getItem(x.itemId).rarity) * 15 + 10);
    const gold = h.gold;
    const id = h.flotsam![0];
    g = run(g, pick(g, h, 0));
    expect(g.heroes[0].pouch).toHaveLength(limit);
    expect(g.heroes[0].gold).toBe(gold + rarityIndex(getItem(id).rarity) * 15 + 10);
    expect(g.log.some((l) => l.text.includes('満杯のため'))).toBe(true);
    // 空きがあれば「満杯」は出ない
    const g2 = enterPile(5, ['P1']);
    expect(flotsamView(g2.heroes[0]).full).toBe(false);
    expect(flotsamView(g2.heroes[0]).items.every((x) => x.overflowGold === undefined)).toBe(true);
  });

  it('袋が満杯: 袋の品1つと入れ替えられる（選んだ品が袋に入り、手放した品がお金に換わる。オーナーの決定 10-A）', () => {
    let g = enterPile(5, ['P1']);
    const h = g.heroes[0];
    const limit = pouchLimitOf(h);
    h.pouch = Array.from({ length: limit }, (_, i) => ({ uid: `p${i}`, itemId: 'potion' }));
    const gold = h.gold;
    const id = h.flotsam![0];
    expect(swapGold('potion')).toBe(rarityIndex(getItem('potion').rarity) * 15 + 10);
    // 袋に無い品とは入れ替えられない
    expect(applyGameCommand(g, { ...pick(g, h, 0), swapUid: 'none' } as GameCommand).error).toBe('入れ替える品が袋にありません');
    g = run(g, { ...pick(g, h, 0), swapUid: 'p1' } as GameCommand);
    const a = g.heroes[0];
    expect(a.pouch).toHaveLength(limit);
    expect(a.pouch.some((p) => p.uid === 'p1')).toBe(false);
    expect(a.pouch.filter((p) => p.itemId === id)).toHaveLength(1);
    expect(a.gold).toBe(gold + swapGold('potion'));
    expect(a.flotsam).toBeUndefined();
    expect(g.log.some((l) => l.text.includes('手放した'))).toBe(true);
    // 空きがある時は、入れ替えを受け付けない（何も手放さない）
    const g2 = enterPile(5, ['P1']);
    const h2 = g2.heroes[0];
    h2.pouch = [{ uid: 'q0', itemId: 'potion' }];
    expect(applyGameCommand(g2, { ...pick(g2, h2, 0), swapUid: 'q0' } as GameCommand).error).toBe('袋がいっぱいの時だけ、入れ替えられます');
  });

  it('退場したキャラには配らない', () => {
    const { g, pile } = beforePile(6, ['P1', 'P2']);
    g.heroes[1].retired = true;
    const s = run(g, { type: 'ENTER_ROOM', playerId: 'P1', roomId: pile });
    expect(s.heroes[0].flotsam).toHaveLength(3);
    expect(s.heroes[1].flotsam).toBeUndefined();
  });
});

describe('漂流物の山: 担当の席（CLAUDE.md §7 の P1 扱い）', () => {
  it('1台で2人: P2 のキャラの操作は P2 として送られ、通る', () => {
    const g = enterPile(7);
    const b = g.heroes[1];
    const cmd: GameCommand = { type: 'FLOTSAM_PICK', playerId: 'P1', heroId: b.id, index: 1 };
    expect(actorOf(g, cmd)).toBe('P2');
    expect(isLocalPlayer('P2')).toBe(true);
    const r = applyGameCommand(g, { ...cmd, playerId: actorOf(g, cmd) } as GameCommand);
    expect(r.error).toBeUndefined();
    expect(r.state.heroes[1].flotsam).toBeUndefined();
  });

  it('オンライン: 自分の席（P1）だけの端末からは、P2 のキャラの分は P2 の担当（この端末では出さない・送れない）', () => {
    const g = enterPile(7);
    setLocalPlayers(['P1']);
    const b = g.heroes[1];
    expect(actorOf(g, { type: 'FLOTSAM_PICK', playerId: 'P1', heroId: b.id, index: 0 })).toBe('P2');
    expect(isLocalPlayer(b.playerId)).toBe(false);
    // P2 の端末からは自分の分が送れる
    setLocalPlayers(['P2']);
    expect(actorOf(g, { type: 'FLOTSAM_PICK', playerId: 'P2', heroId: b.id, index: 0 })).toBe('P2');
    expect(applyGameCommand(g, pick(g, b, 0)).error).toBeUndefined();
  });

  it('代わりに操作（ホストが P2 の席も動かす）: P2 のキャラの分は P2 として送られ、通る', () => {
    const g = enterPile(8);
    setLocalPlayers(['P1', 'P2']);
    const b = g.heroes[1];
    const cmd: GameCommand = { type: 'FLOTSAM_PICK', playerId: 'P1', heroId: b.id, index: 2 };
    expect(actorOf(g, cmd)).toBe('P2');
    const r = applyGameCommand(g, { ...cmd, playerId: actorOf(g, cmd) } as GameCommand);
    expect(r.error).toBeUndefined();
    expect(r.state.heroes[1].pouch.length).toBe(g.heroes[1].pouch.length + 1);
  });
});

describe('漂流物の山: 保存して再開', () => {
  it('同じ種・同じ状態から入れば同じ候補（JSON で読み直しても同じ）。配った後に保存しても候補は残り、同じ品が選べる', () => {
    const { g, pile } = beforePile(9);
    const loaded = migrateGame(JSON.parse(JSON.stringify(g)))!;
    const a = run(g, { type: 'ENTER_ROOM', playerId: 'P1', roomId: pile });
    const b = run(loaded, { type: 'ENTER_ROOM', playerId: 'P1', roomId: pile });
    expect(b.heroes.map((h) => h.flotsam)).toEqual(a.heroes.map((h) => h.flotsam));
    const c = migrateGame(JSON.parse(JSON.stringify(a)))!;
    expect(c.heroes.map((h) => h.flotsam)).toEqual(a.heroes.map((h) => h.flotsam));
    const x = run(a, pick(a, a.heroes[0], 1));
    const y = run(c, pick(c, c.heroes[0], 1));
    expect(JSON.stringify(y.heroes)).toBe(JSON.stringify(x.heroes));
  });

  it('dealFlotsam は冒険の乱数だけを使う（同じ乱数なら同じ）', () => {
    const { g } = beforePile(10);
    const g2 = structuredClone(g);
    dealFlotsam(g, createRng(42));
    dealFlotsam(g2, createRng(42));
    expect(g2.heroes.map((h) => h.flotsam)).toEqual(g.heroes.map((h) => h.flotsam));
  });
});

describe('漂流物の洞: 世界マップから入って、止まらない', () => {
  /** シナリオ3の冒険で、ランダムダンジョンの入口を漂流物の洞にして、全員がその入口に立った形 */
  function caveGame(players: PlayerId[]): { g: GameState; tile: number } {
    const g = newGame(S3, 2, players);
    const tile = randomTiles(g)[0];
    g.world!.tiles[tile].f!.theme = FC;
    for (const h of g.heroes) g.world!.pos[h.id] = tile;
    g.world!.turn = g.heroes[0].id;
    return { g, tile };
  }
  function enterAll(g0: GameState): GameState {
    let g = g0;
    for (const h of g.heroes) g = run(g, { type: 'WORLD_INTERACT', playerId: h.playerId, heroId: h.id, party: [h.id] });
    return g;
  }
  const stepUntil = (g0: GameState, done: (g: GameState) => boolean, log: BotLog, memo: BotMemo) => {
    let g = g0;
    let stuck = 0;
    for (let i = 0; i < 4000 && !done(g); i++) {
      if (g.mode === 'gameover' || g.mode === 'ending') break;
      // 戦闘の強さは見ない（部屋の流れを確かめる）: 敵のHPを1に
      for (const x of g.expeditions ?? []) for (const e of x.battle?.enemies ?? []) e.hp = Math.min(e.hp, 1);
      for (const e of g.battle?.enemies ?? []) e.hp = Math.min(e.hp, 1);
      const next = botStep(g, log, memo);
      stuck = next === g ? stuck + 1 : 0;
      expect(stuck, `止まった: ${g.mode} ${log.errors.join(' / ')}`).toBeLessThan(50);
      g = next;
    }
    return g;
  };

  it.each([[['P1']], [['P1', 'P2']], [['P1', 'P2', 'P3', 'P4']]] as PlayerId[][][])('%j: 全員で入って、bot が奥まで進み、全員が1つずつ選ぶ（止まらない）', (players) => {
    const { g: g0 } = caveGame(players);
    let g = enterAll(g0);
    const x = g.expeditions![0];
    expect(x.heroes).toEqual(g.heroes.map((h) => h.id));
    expect(x.dungeon!.theme).toBe(FC);
    const log: BotLog = { steps: 0, errors: [], modes: {} };
    const memo: BotMemo = { interacted: new Set<string>() };
    const before = g.heroes.map((h) => h.pouch.length + h.gold);
    g = stepUntil(g, (s) => !s.expeditions?.some((e) => e.id === x.id), log, memo);
    expect(log.errors).toEqual([]);
    const picked = g.log.filter((l) => l.text.startsWith('🛶') && l.text.includes('は漂流物の山から'));
    // 倒れずに奥まで行けたキャラは全員1つずつ選んだ（候補が残っていない）
    if (g.log.some((l) => l.text.includes('🛶流れ着いた品が山になっている'))) {
      expect(picked.length).toBe(g.heroes.filter((h) => !h.retired && h.hp > 0).length);
      for (const h of g.heroes.filter((y) => y.hp > 0)) expect(h.flotsam, h.name).toBeUndefined();
      g.heroes.forEach((h, i) => h.hp > 0 && expect(h.pouch.length + h.gold, h.name).toBeGreaterThan(before[i]));
    } else throw new Error('漂流物の山まで行けなかった');
  });

  it('2人（別の席）: 片方が先に選び終えても、もう片方は後で選べる（手番・場面に関係なく）。先に選んだ側は待たずに先へ進める', () => {
    const { g: g0 } = caveGame(['P1', 'P2']);
    let g = enterAll(g0);
    const x = g.expeditions![0];
    const log: BotLog = { steps: 0, errors: [], modes: {} };
    const memo: BotMemo = { interacted: new Set<string>() };
    // 漂流物の山に入るまで bot で進める
    g = stepUntil(g, (s) => s.heroes.some((h) => h.flotsam?.length), log, memo);
    const [a, b] = g.heroes;
    expect(a.flotsam).toHaveLength(3);
    expect(b.flotsam).toHaveLength(3);
    // P1 が先に選ぶ（画面のように場面を通さずに送る）
    g = run(g, pick(g, a, 0));
    expect(g.heroes[1].flotsam).toHaveLength(3);
    // P1 の組は待たずに次の扉（ボス）へ進める
    const d = g.expeditions!.find((e) => e.id === x.id)!.dungeon!;
    expect(reachableRooms(d).map((r) => r.type)).toEqual(['boss']);
    // 手番が P1 のままでも、P2 は自分の分を選べる
    g.world!.turn = a.id;
    g = run(g, pick(g, g.heroes[1], 1));
    expect(g.heroes[1].flotsam).toBeUndefined();
    // 最後まで止まらない
    g = stepUntil(g, (s) => !s.expeditions?.some((e) => e.id === x.id), log, memo);
    expect(log.errors).toEqual([]);
  });

  it('ほかのテーマ・固定のダンジョンでは、候補は配られない', () => {
    for (const theme of [...OLD, undefined]) {
      const g = createGame({ seed: 3, scenarioId: S3, difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'h0', playerId: 'P1' }] });
      g.world = undefined;
      g.mode = 'dungeon';
      g.dungeon = buildDungeon(theme ? 'tideCave' : 'wreckCave', createRng(3), 0, evIds(S3), theme);
      expect(g.dungeon.rooms.some((r) => r.type === 'flotsamPile')).toBe(false);
    }
  });
});
