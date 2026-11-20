// ===== ランダムダンジョンのテーマ「🧊 氷漬けの宝物庫」（2026-11-14 シナリオ2の作り直し。docs/tasks/scenario2-theme-scourge-proposal.md §1 A案） =====
// シナリオ2だけ・凍えの数え（部屋ごとに+1・HPが凍え×2%・1で止まる・焚き火で0）・奥の氷漬けの箱の格・焚き火の分かれ道・保存して再開・自動プレイ
import { describe, expect, it } from 'vitest';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { DUNGEON_THEMES, getRoomType } from '../../data/rules';
import type { DungeonDef, GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, buildDungeon, chillDoorNote, chillLayoutOk, chillStatus, createGame, createRng, doorDetail, heroMaxHp, migrateGame, roomKind } from '../index';
import { applyRoomChill, chillAfterEntering, chillChestRarity } from '../game/dungeonChill';
import { ensureTileTheme, themesForScenario } from '../game/world/randomDungeons';
import { botStep, type BotLog, type BotMemo } from '../bot';

type Layout = NonNullable<DungeonDef['layout']>;
const FV = 'frozenVault';
const OLD = ['crystalGrotto', 'sealedLabyrinth', 'outlawDen'];
const S2 = 'frozenKingdom';
const evIds = (sid: string) => EVENTS.forScenario(sid).filter((e) => e.where !== 'map' && e.where !== 'spawn').map((e) => e.id);

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
function newGame(scenarioId: string, seed: number, players: PlayerId[] = ['P1']) {
  let g = createGame({ seed, scenarioId, difficulty: 'normal', party: players.map((playerId, i) => ({ classId: ['warrior', 'priest', 'mage', 'thief'][i], gender: 'male' as const, name: `h${i}`, playerId })) });
  g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  return g;
}
const randomTiles = (g: GameState) => g.world!.tiles.flatMap((t, i) => (t.f?.kind === 'dungeon' && DUNGEONS.get(t.f.id).random ? [i] : []));
/** 部屋の並び（行ごと）に戻す */
function layoutOf(rooms: { row: number; col: number; type: string; next: string[]; eventId?: string }[]): Layout {
  const L: Layout = [];
  for (const r of rooms) (L[r.row] ??= [])[r.col] = { type: r.type, next: r.next.map((id) => Number(id.split('c')[1])), eventId: r.eventId };
  return L;
}
/** 拠点から氷漬けの宝物庫に入った形（世界マップを通らない。凍えの数えだけを確かめる） */
function inVault(seed = 3, heroes = 1): GameState {
  const g = createGame({ seed, scenarioId: S2, difficulty: 'normal', party: ['warrior', 'priest', 'mage'].slice(0, heroes).map((c, i) => ({ classId: c, gender: 'male' as const, name: `h${i}`, playerId: 'P1' as PlayerId })) });
  g.mode = 'dungeon';
  g.world = undefined;
  g.dungeon = buildDungeon('frozenCave', createRng(seed), 0, evIds(S2), FV);
  return g;
}

describe('氷漬けの宝物庫: データとシナリオ', () => {
  it('データの最後の順番・シナリオ2だけ・宝箱は割合0で封魔にしない・奥は氷漬けの箱（宝の予兆）', () => {
    // その後ろに、シナリオ3だけの漂流物の洞（2026-11-16）
    expect(DUNGEON_THEMES.all.map((t) => t.id)).toEqual([...OLD, FV, 'flotsamCave']);
    const t = DUNGEON_THEMES.get(FV);
    expect(t.scenario).toBe(S2);
    expect(t.sealedChance).toBe(0);
    expect(t.weights.chest ?? 0).toBe(0);
    expect(t.chill).toEqual({ hpPercent: 2, chest: [{ min: 4, rarity: 'legend' }, { min: 2, rarity: 'epic' }, { min: 0, rarity: 'rare' }] });
    expect(getRoomType(t.fixedRoom)).toMatchObject({ behavior: 'chest', omen: 'treasure', name: '氷漬けの箱' });
    expect(getRoomType(t.fixedRoom).layoutWeight ?? 0).toBe(0);
    for (const sid of DUNGEONS.all.filter((d) => d.random).map((d) => DUNGEONS.scenarioOf(d.id)!)) {
      expect(themesForScenario(sid).map((x) => x.id), sid).toEqual(sid === S2 ? [...OLD, FV] : sid === 'cursedArchipelago' ? [...OLD, 'flotsamCave'] : OLD);
    }
  });

  it('新しい冒険: シナリオ2では選ばれる事がある・ほかのシナリオでは選ばれない（2か所は別のテーマ）', () => {
    let seen = 0;
    for (const sid of DUNGEONS.all.filter((d) => d.random).map((d) => DUNGEONS.scenarioOf(d.id)!)) {
      for (let seed = 1; seed <= (sid === S2 ? 12 : 4); seed++) {
        const g = newGame(sid, seed);
        const themes = randomTiles(g).map((i) => g.world!.tiles[i].f!.theme!);
        expect(new Set(themes).size, `${sid} ${seed}`).toBe(themes.length);
        if (sid !== S2) expect(themes.includes(FV), `${sid} ${seed}`).toBe(false);
        else seen += themes.filter((x) => x === FV).length;
      }
    }
    // 2か所 × 12冒険。4つから2つを選ぶので、およそ半分の冒険に出る
    expect(seen).toBeGreaterThanOrEqual(3);
  });

  it('古い保存（テーマの無いマス）のテーマ決めは、テーマを足す前と同じ（データの順で、使っていない最初の物。シナリオだけのテーマは選ばない）', () => {
    // 直す前の決まりの値: 2か所とも無い時は、先に入った方が 古代の晶洞・後が 封魔の地下迷宮。片方が晶洞なら、もう片方は封魔
    for (const sid of [S2, 'corruptionKing']) for (let seed = 1; seed <= 6; seed++) {
      const g = newGame(sid, seed);
      const [a, b] = randomTiles(g);
      delete g.world!.tiles[a].f!.theme;
      delete g.world!.tiles[b].f!.theme;
      expect(ensureTileTheme(g.world!, b), `${sid} ${seed}`).toBe('crystalGrotto');
      expect(ensureTileTheme(g.world!, a), `${sid} ${seed}`).toBe('sealedLabyrinth');
      // 片方が氷漬けの宝物庫でも、もう片方は前の3つから選ぶ
      g.world!.tiles[a].f!.theme = FV;
      delete g.world!.tiles[b].f!.theme;
      expect(ensureTileTheme(g.world!, b)).toBe('crystalGrotto');
      // テーマが付いていれば、そのまま
      expect(ensureTileTheme(g.world!, a)).toBe(FV);
    }
  });
});

describe('氷漬けの宝物庫: 部屋の並び', () => {
  it('種を変えても: 全5行・4行目は氷漬けの箱・途中の行に宝箱が無い・焚き火の扉と焚き火でない扉が並ぶ選択が必ずある・同じ種類が続かない', () => {
    let fallback = 0;
    let n = 0;
    for (const d of DUNGEONS.all.filter((x) => x.random)) {
      const ev = evIds(DUNGEONS.scenarioOf(d.id)!);
      for (let seed = 1; seed <= 150; seed++) {
        const r = buildDungeon(d.id, createRng(seed * 7919 + 13), 0, ev, FV);
        n++;
        const L = layoutOf(r.rooms);
        expect(L).toHaveLength(5);
        expect(L[0].every((x) => x.type === 'battle')).toBe(true);
        expect(L[3].map((x) => x.type)).toEqual(['frozenChest']);
        expect(L[4].map((x) => x.type)).toEqual(['boss']);
        expect(chillLayoutOk(L), `${d.id} ${seed}`).toBe(true);
        for (const x of [...L[1], ...L[2]]) expect(['battle', 'elite', 'event', 'rest'], `${d.id} ${seed}`).toContain(x.type);
        // どの辺も同じ種類（扉の予兆）でない
        const by = new Map(r.rooms.map((x) => [x.id, x]));
        for (const room of r.rooms) for (const nx of room.next) expect(roomKind(by.get(nx)!.type), `${d.id} ${seed}`).not.toBe(roomKind(room.type));
        // 封魔の宝箱にならない
        expect(r.rooms.some((x) => getRoomType(x.type).sealedChest)).toBe(false);
        if (L[1].length === 2 && L[1][0].type === 'rest' && L[1][1].type === 'event' && L[2].length === 2 && L[2][1].type === 'elite' && L[0].length === 1) fallback++;
      }
    }
    // 決まった並び（作り直しても合わなかった時）は、ほとんど使わない
    expect(fallback / n).toBeLessThan(0.05);
  });
});

describe('氷漬けの宝物庫: 凍え', () => {
  it('部屋に入るたびに凍え+1・HPが凍え×2%（切り上げ）減る・焚き火で0（寒さなし）', () => {
    const g = inVault(3, 2);
    const hs = g.heroes;
    for (const h of hs) h.hp = heroMaxHp(h);
    const battle = g.dungeon!.rooms.find((r) => r.type === 'battle')!;
    const rest = { ...battle, type: 'rest' };
    const expected = (chill: number, h: (typeof hs)[number]) => Math.max(1, Math.ceil((heroMaxHp(h) * chill * 2) / 100));
    let hp = hs.map((h) => h.hp);
    for (let chill = 1; chill <= 4; chill++) {
      applyRoomChill(g, battle);
      expect(g.dungeon!.chill).toBe(chill);
      hs.forEach((h, i) => expect(hp[i] - h.hp, `${chill}`).toBe(expected(chill, h)));
      hp = hs.map((h) => h.hp);
    }
    applyRoomChill(g, rest);
    expect(g.dungeon!.chill).toBe(0);
    expect(hs.map((h) => h.hp)).toEqual(hp);
    applyRoomChill(g, battle);
    expect(g.dungeon!.chill).toBe(1);
  });

  it('HPは1で止まる・倒れているキャラは受けない', () => {
    const g = inVault(4, 2);
    const [a, b] = g.heroes;
    a.hp = 2;
    b.hp = 0;
    const battle = g.dungeon!.rooms.find((r) => r.type === 'battle')!;
    g.dungeon!.chill = 20;
    applyRoomChill(g, battle);
    expect(a.hp).toBe(1);
    applyRoomChill(g, battle);
    expect(a.hp).toBe(1);
    expect(b.hp).toBe(0);
  });

  it('氷漬けの箱の格: 入った時の凍え 1 = 鉄箱 / 2・3 = 装飾箱 / 4以上 = 黄金箱（鍵なし。乱数は使わない）', () => {
    const rule = DUNGEON_THEMES.get(FV).chill!;
    expect([0, 1, 2, 3, 4, 5, 9].map((c) => chillChestRarity(rule, c))).toEqual(['rare', 'rare', 'epic', 'epic', 'legend', 'legend', 'legend']);
    for (const [before, want] of [[0, 'rare'], [1, 'epic'], [3, 'legend']] as const) {
      const g = inVault(5);
      const box = g.dungeon!.rooms.find((r) => r.type === 'frozenChest')!;
      g.dungeon!.chill = before;
      applyRoomChill(g, box);
      expect(box.chest).toEqual({ rarity: want, locked: false });
    }
  });

  it('道の選び方と箱（案の表）: 焚き火に寄らない = 凍え4で黄金箱・HP合計30% / 2行目で焚き火 = 装飾箱・14% / 3行目で焚き火 = 鉄箱・12%', () => {
    const rule = DUNGEON_THEMES.get(FV).chill!;
    const walk = (types: string[]) => {
      let chill = 0;
      let pct = 0;
      let box: string | undefined;
      for (const t of types) {
        chill = chillAfterEntering({ chill }, { type: t });
        if (t !== 'rest') pct += chill * rule.hpPercent;
        if (t === 'frozenChest') box = chillChestRarity(rule, chill);
      }
      return { box, pct };
    };
    expect(walk(['battle', 'elite', 'event', 'frozenChest', 'boss'])).toEqual({ box: 'legend', pct: 30 });
    expect(walk(['battle', 'rest', 'event', 'frozenChest', 'boss'])).toEqual({ box: 'epic', pct: 14 });
    expect(walk(['battle', 'event', 'rest', 'frozenChest', 'boss'])).toEqual({ box: 'rare', pct: 12 });
  });

  it('ENTER_ROOM で凍えが数えられる。ほかのテーマ・固定のダンジョンでは凍えが無い（HPも減らない）', () => {
    const g = inVault(6, 2);
    for (const h of g.heroes) h.hp = heroMaxHp(h);
    const before = g.heroes.map((h) => h.hp);
    const s = run(g, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' });
    expect(s.dungeon!.chill).toBe(1);
    s.heroes.forEach((h, i) => expect(h.hp).toBe(before[i] - Math.ceil(heroMaxHp(h) * 0.02)));
    for (const theme of [...OLD, undefined]) {
      const o = inVault(6, 2);
      o.dungeon = buildDungeon(theme ? 'frozenCave' : 'crystalCave', createRng(6), 0, evIds(S2), theme);
      for (const h of o.heroes) h.hp = heroMaxHp(h);
      const t = run(o, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' });
      expect(t.dungeon!.chill).toBeUndefined();
      t.heroes.forEach((h) => expect(h.hp).toBe(heroMaxHp(h)));
      expect(chillStatus(t.dungeon)).toBeUndefined();
    }
  });

  it('画面の文: 帯（今の凍え・次の部屋）・扉（焚き火で0・HP−%・箱の格）・先読み（箱の格）', () => {
    const g = inVault(7);
    const run0 = g.dungeon!;
    expect(chillStatus(run0)).toEqual({ chill: 0, text: '🧊凍え0・次の部屋でHP−2%', note: '🔥焚き火で凍えは0に戻る。奥の氷漬けの箱は、凍えているほど良い（凍え2で装飾箱・4で黄金箱）' });
    run0.chill = 3;
    const box = run0.rooms.find((r) => r.type === 'frozenChest')!;
    const battle = run0.rooms.find((r) => r.type === 'battle')!;
    expect(chillDoorNote(run0, { ...battle, type: 'rest' })).toBe('🔥凍えが0に（寒さなし）');
    expect(chillDoorNote(run0, battle)).toBe('凍え4：HP−8%');
    expect(chillDoorNote(run0, box)).toBe('凍え4：HP−8%・今なら黄金箱');
    // 先読み: 箱の扉の前にいる時、今のまま着いた時の格
    const parent = run0.rooms.find((r) => r.next.includes(box.id))!;
    run0.currentRoomId = parent.id;
    parent.cleared = true;
    g.dungeon!.watchedAt = parent.id;
    expect(doorDetail(g, box)).toBe('黄金箱（今の凍えのまま着いた時）');
  });

  it('保存して再開しても同じ（JSON で読み直して、同じ部屋に入ると同じ凍え・HP・箱）', () => {
    let g = inVault(8, 2);
    g = run(g, { type: 'ENTER_ROOM', playerId: 'P1', roomId: 'r0c0' });
    g.battle = undefined;
    g.mode = 'dungeon';
    g.dungeon!.rooms[0].cleared = true;
    const saved = JSON.parse(JSON.stringify(g)) as GameState;
    const loaded = migrateGame(JSON.parse(JSON.stringify(g)))!;
    expect(loaded.dungeon!.chill).toBe(1);
    // 焚き火でない次の部屋（焚き火なら凍えは0）
    const nextRoom = g.dungeon!.rooms[0].next.map((id) => g.dungeon!.rooms.find((r) => r.id === id)!).find((r) => r.type !== 'rest')!;
    const next = nextRoom.id;
    const a = run(g, { type: 'ENTER_ROOM', playerId: 'P1', roomId: next });
    const b = run(saved, { type: 'ENTER_ROOM', playerId: 'P1', roomId: next });
    expect(a.dungeon!.chill).toBe(2);
    expect(JSON.stringify(b.dungeon)).toBe(JSON.stringify(a.dungeon));
    expect(b.heroes.map((h) => h.hp)).toEqual(a.heroes.map((h) => h.hp));
  });
});

describe('氷漬けの宝物庫: 世界マップから入って、自動プレイが止まらない', () => {
  /** 氷漬けの宝物庫のあるシナリオ2の冒険（players 人） */
  function vaultGame(players: PlayerId[]): { g: GameState; tile: number } {
    for (let seed = 1; seed <= 60; seed++) {
      const g = newGame(S2, seed, players);
      const tile = randomTiles(g).find((i) => g.world!.tiles[i].f!.theme === FV);
      if (tile !== undefined) return { g, tile };
    }
    throw new Error('氷漬けの宝物庫が出る種が無い');
  }

  it.each([[['P1']], [['P1', 'P2']], [['P1', 'P2', 'P3', 'P4']]] as PlayerId[][][])('%j: 全員で入って、bot が奥まで進む（だれの番でも止まらない・凍えが数えられる）', (players) => {
    const { g: g0, tile } = vaultGame(players);
    let g = g0;
    for (const h of g.heroes) g.world!.pos[h.id] = tile;
    g.world!.turn = g.heroes[0].id;
    // 1人ずつ（それぞれの担当の人が）入る。全員が同じダンジョンの場面にそろう
    for (const h of g.heroes) g = run(g, { type: 'WORLD_INTERACT', playerId: h.playerId, heroId: h.id, party: [h.id] });
    const x = g.expeditions![0];
    expect(x.heroes).toEqual(g.heroes.map((h) => h.id));
    expect(x.dungeon!.theme).toBe(FV);
    const log: BotLog = { steps: 0, errors: [], modes: {} };
    const memo: BotMemo = { interacted: new Set<string>() };
    let maxChill = 0;
    let boxSeen = false;
    let stuck = 0;
    for (let i = 0; i < 4000; i++) {
      const d = g.expeditions?.find((e) => e.id === x.id)?.dungeon;
      if (!d) break;
      const c = d.chill ?? 0;
      maxChill = Math.max(maxChill, c);
      if (d.rooms.some((r) => r.type === 'frozenChest' && r.cleared)) boxSeen = true;
      if (g.mode === 'gameover' || g.mode === 'ending') break;
      // 戦闘の強さは見ない（凍えと部屋の流れを確かめる）: 敵のHPを1にして、bot の一撃で倒せるようにする
      const xb = g.expeditions?.find((e) => e.id === x.id)?.battle;
      if (xb) for (const e of xb.enemies) e.hp = Math.min(e.hp, 1);
      const next = botStep(g, log, memo);
      stuck = next === g ? stuck + 1 : 0;
      expect(stuck, `止まった: ${g.mode} ${log.errors.join(' / ')}`).toBeLessThan(50);
      g = next;
    }
    expect(log.errors).toEqual([]);
    // 寒さは、その場の全員が受ける（ログに全員の名前）
    const chillLogs = g.log.filter((l) => l.text.startsWith('🧊凍え1:'));
    expect(chillLogs.length).toBeGreaterThanOrEqual(1);
    for (const h of g.heroes) expect(chillLogs[0].text, h.name).toContain(`${h.name}−`);
    expect(boxSeen).toBe(true);
    // 奥の箱まで行けた（倒れて終わる時もあるので、凍えが数えられた事だけは必ず確かめる）
    expect(maxChill).toBeGreaterThanOrEqual(1);
    for (const h of g.heroes) expect(h.hp).toBeGreaterThanOrEqual(0);
  });
});
