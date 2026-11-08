import { afterEach, describe, expect, it } from 'vitest';
import { CARDS } from '../../data/cards';
import { BALANCE } from '../../data/balance';
import { CLASSES } from '../../data/classes';
import { EVENTS } from '../../data/events';
import { getScenario } from '../../data/scenarios';
import { SANCTUARIES, TERRAINS } from '../../data/world';
import type { ClassDef, GameCommand, GameState } from '../../types';
import { actorOf, setLocalPlayers } from '../../store/battleConfig';
import { applyCommand, applyGameCommand, createBattle, createGame, createRng, migrateGame } from '../index';
import { makeCtx, dealDamage } from '../battle/effects';
import { recordCheck } from '../game/checks';
import { toPartyMember } from '../game/hero';
import { heroPlace, jobOptions, jobPlaceAllows } from '../game/jobs';
import { neighbors } from '../game/world/hex';
import { addSanctuaries } from '../game/world/sanctuaries';
import { giveHand, play, setup } from './helpers';

afterEach(() => setLocalPlayers(null));
const fresh = (seed = 1) => createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party:
  ['P1', 'P2'].map((playerId, i) => ({ classId: 'warrior', gender: 'male', name: `仲間${i}`, playerId: playerId as 'P1' | 'P2' })) });
const featureTile = (g: GameState, id: string) => g.world!.tiles.findIndex(t => t.f?.id === id);
function enter(g: GameState, id = 'pilgrimTemple', heroId = 'h0') {
  g.world!.story = undefined;
  g.world!.turn = heroId;
  g.world!.pos[heroId] = featureTile(g, id);
  const cmd: GameCommand = { type: 'WORLD_INTERACT', playerId: g.heroes.find(h => h.id === heroId)!.playerId, heroId };
  const result = applyGameCommand(g, cmd);
  expect(result.error).toBeUndefined();
  return result.state;
}
const special: ClassDef = { ...CLASSES.get('swordmaster'), id: 'testSpecialPath', name: '検証用特殊職', tier: 'special', from: ['swordmaster'], altar: 'samurai', requires: { feat: 'kills:weapon:katana', count: 10, text: '刀を装備して10体撃破' } };
CLASSES.register(special);

describe('神殿と祭壇の配置・旧保存の引き継ぎ', () => {
  it('20種類の種で全7施設に徒歩で到達でき、道から2マス以内に置かれる', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const g = fresh(seed), w = g.world!, map = getScenario(g.scenarioId).map!;
      const reached = new Set([w.pos.h0]), q = [w.pos.h0];
      for (let k = 0; k < q.length; k++) for (const n of neighbors(w, q[k])) {
        if (!reached.has(n) && TERRAINS.get(w.tiles[n].t).moveCost > 0) { reached.add(n); q.push(n); }
      }
      for (const def of SANCTUARIES.all) {
        const tile = featureTile(g, def.id);
        expect(tile, `${seed}:${def.id}`).toBeGreaterThanOrEqual(0);
        expect(reached.has(tile)).toBe(true);
        const near = new Set([tile]);
        for (let step = 0; step < 2; step++) for (const i of [...near]) for (const n of neighbors(w, i)) {
          if (TERRAINS.get(w.tiles[n].t).moveCost > 0) near.add(n);
        }
        expect([...near].some(i => w.tiles[i].t === map.roadTerrain)).toBe(true);
      }
      expect(fresh(seed)).toEqual(g);
    }
  });
  it('v8の地図・位置・霧・既存施設・乱数・進行中イベントを保ち、二重追加しない', () => {
    const old = fresh(874651857); old.version = 8;
    for (const t of old.world!.tiles) if (t.f?.kind === 'temple' || t.f?.kind === 'altar') delete t.f;
    old.mode = 'event'; old.party = ['h1']; old.world!.turn = 'h1';
    old.event = { eventId: 'rStrayBird', tile: old.world!.pos.h1, random: true };
    const before = structuredClone(old);
    const m = migrateGame(structuredClone(old))!;
    expect(m).not.toBeNull(); expect(m.version).toBe(11);
    expect(m.rngState).toBe(before.rngState); expect(m.event).toEqual(before.event); expect(m.party).toEqual(before.party); expect(m.mode).toBe('event');
    const withoutFeatures = (g: GameState) => ({ ...g.world!, tiles: g.world!.tiles.map(({ f: _f, ...t }) => t) });
    expect(withoutFeatures(m)).toEqual(withoutFeatures(before));
    before.world!.tiles.forEach((t, i) => { if (t.f) expect(m.world!.tiles[i].f).toEqual(t.f); });
    expect(m.world!.tiles.filter(t => t.f?.kind === 'temple' || t.f?.kind === 'altar')).toHaveLength(7);
    expect(migrateGame(structuredClone(m))).toEqual(m);
    const again = structuredClone(m); expect(addSanctuaries(again, again.world!)).toEqual([]); expect(again).toEqual(m);
  });
  it('v8の分離した戦闘を維持し、装備武器種を補って更新できる', () => {
    const old = fresh(); old.version = 8;
    const b = createBattle({ ...setup(2), party: [toPartyMember(old.heroes[0])] }); b.version = 8;
    delete b.allies[0].equippedWeaponType;
    old.expeditions = [{ id: 'x1', heroes: ['h0'], mode: 'battle', battle: b }];
    const before = structuredClone(old);
    const m = migrateGame(old)!;
    expect(m.expeditions?.[0].battle?.version).toBe(11);
    expect(m.expeditions?.[0].battle?.rngState).toBe(before.expeditions![0].battle!.rngState);
    expect(m.expeditions?.[0].battle?.allies[0].equippedWeaponType).toBe('sword');
    expect(m.expeditions?.[0].heroes).toEqual(['h0']);
  });
  it('空きマスがない地図では既存施設を上書きせず不足を返す', () => {
    const g = fresh(), w = g.world!;
    for (const t of w.tiles) t.f = { kind: 'chest', id: 'occupied' };
    const before = structuredClone(g);
    expect(addSanctuaries(g, w)).toHaveLength(7); expect(g).toEqual(before);
  });
});

describe('施設の担当者と転職場所', () => {
  it('P2が入退場でき、オンラインの他人の退出は拒否し、ローカルでは担当を引き継ぐ', () => {
    const g = enter(fresh(), 'pilgrimTemple', 'h1');
    const cmd: GameCommand = { type: 'LEAVE_SANCTUARY', playerId: 'P1' };
    expect(g.mode).toBe('sanctuary'); expect(heroPlace(g, g.heroes[1])).toBe('temple');
    expect(actorOf(g, cmd)).toBe('P2');
    setLocalPlayers(['P1']); expect(actorOf(g, cmd)).toBe('P1');
    const denied = applyGameCommand(g, cmd); expect(denied.error).toContain('担当'); expect(denied.state).toEqual(g);
    const left = applyGameCommand(g, { ...cmd, playerId: 'P2' });
    expect(left.error).toBeUndefined(); expect(left.state.mode).toBe('world'); expect(left.state.sanctuary).toBeUndefined();
    expect(left.state.world!.turn).toBe('h1'); expect(left.state.world!.tiles[g.sanctuary!.tile].f?.used).toBeUndefined();
  });
  it.each(['town', 'shrine', 'hub', 'map', 'rest'] as const)('%sでは特殊職へ転職できない', place => {
    const g = fresh(), h = g.heroes[0];
    g.mode = place === 'map' ? 'world' : place;
    g.town = { townId: 'royalCapital', heroId: h.id };
    g.shrine = { shrineId: 'unused', heroId: h.id, tile: g.world!.pos[h.id] };
    expect(jobPlaceAllows(g, h, special)).toBe(false);
  });
  it('対応する祭壇のみ許可し、最上位は祭壇を使えない', () => {
    let g = enter(fresh(), 'samuraiAltar'), h = g.heroes[0];
    expect(jobPlaceAllows(g, h, special)).toBe(true);
    expect(jobPlaceAllows(g, h, CLASSES.get('swordSaint'))).toBe(false);
    g = enter(fresh(), 'machinistAltar'); h = g.heroes[0];
    expect(jobPlaceAllows(g, h, special)).toBe(false);
    g = enter(fresh()); h = g.heroes[0];
    expect(jobPlaceAllows(g, h, special)).toBe(true); expect(jobPlaceAllows(g, h, CLASSES.get('swordSaint'))).toBe(true);
  });
  it('特殊はLv3、最上位はLv4で、未達の実績も7/10と表示できる', () => {
    const g = enter(fresh()), h = g.heroes[0]; h.classId = 'swordmaster'; h.level = 2;
    h.feats = { 'kills:weapon:katana': 7, perfects: 15 };
    expect(jobOptions(h, g).find(o => o.job.id === special.id)).toMatchObject({ ready: false, progress: 7 });
    h.level = 3; h.feats['kills:weapon:katana'] = 10;
    expect(jobOptions(h, g).find(o => o.job.id === special.id)?.ready).toBe(true);
    expect(jobOptions(h, g).find(o => o.job.id === 'swordSaint')?.ready).toBe(false);
    h.level = 4; expect(jobOptions(h, g).find(o => o.job.id === 'swordSaint')?.ready).toBe(true);
    h.classId = special.id; expect(jobOptions(h, g)).toEqual([]);
  });
  it('神殿と同じ位置でも、別の場面のキャラは転職できない', () => {
    const g = enter(fresh()), h = g.heroes[0];
    g.expeditions = [{ id: 'x1', mode: 'battle', heroes: [h.id] }];
    expect(heroPlace(g, h)).toBe('busy'); expect(jobPlaceAllows(g, h, special)).toBe(false);
    expect(heroPlace(g, g.heroes[1])).toBe('map');
  });
});

describe('特殊職の条件記録', () => {
  it('宝箱の解錠と運の判定を別々に記録し、開封後は増えない', () => {
    let g = fresh(); g.mode = 'chest'; g.party = ['h0'];
    g.chest = { tile: g.world!.pos.h0, spec: { rarity: 'common', locked: true }, unlocked: false };
    g.heroes[0].focus = 20;
    const cmd: GameCommand = { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: BALANCE.lockSlots };
    const lock = applyGameCommand(g, cmd); expect(lock.error).toBeUndefined(); g = lock.state;
    expect(g.heroes[0].feats?.['checks:mechanism']).toBe(1);
    expect(g.heroes[0].feats?.['checks:luk']).toBeUndefined();
    const open = applyGameCommand(g, { ...cmd, focusUsed: BALANCE.chestLuckSlots }); expect(open.error).toBeUndefined(); g = open.state;
    expect(g.heroes[0].feats?.['checks:luk']).toBe(1); expect(g.heroes[0].feats?.['perfects:luk']).toBe(1);
    const again = applyGameCommand(g, { ...cmd, focusUsed: 0 }); expect(again.error).toBeDefined(); expect(again.state).toEqual(g);
  });
  it('同じ状態・コマンドでは施設と実績が一致し、入力を変更しない', () => {
    const g = fresh(); g.world!.story = undefined; g.world!.pos.h0 = featureTile(g, 'pilgrimTemple');
    const before = structuredClone(g);
    const cmd: GameCommand = { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0' };
    expect(applyGameCommand(g, cmd)).toEqual(applyGameCommand(g, cmd)); expect(g).toEqual(before);
    expect(applyGameCommand(g, cmd).state.rngState).toBe(g.rngState);
  });
  it('運の成功・完全成功と仕掛けの成功を区別し、失敗や空の判定は数えない', () => {
    const h = fresh().heroes[0];
    recordCheck(h, 'luk', ['hit', 'miss'], 1); recordCheck(h, 'luk', ['focus', 'focus'], 1);
    recordCheck(h, 'luk', ['miss', 'miss'], 1); recordCheck(h, 'str', ['hit', 'hit'], 1);
    recordCheck(h, 'dex', ['focus', 'hit'], 2, 'mechanism'); recordCheck(h, 'per', ['miss'], 1, 'mechanism');
    recordCheck(h, 'luk', [], 0);
    expect(h.feats).toEqual({ 'checks:luk': 2, 'perfects:luk': 1, 'checks:mechanism': 1 });
  });
  it('祠の祈りは実際に恵みを受けたキャラへ1回だけ記録する', () => {
    let g = fresh(); const tile = g.world!.tiles.findIndex(t => t.f?.kind === 'shrine');
    g.world!.story = undefined; g.world!.pos.h0 = tile;
    const r = applyGameCommand(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0' }); expect(r.error).toBeUndefined(); g = r.state;
    const cmd: GameCommand = { type: 'SHRINE_CHOOSE', playerId: 'P1', heroId: 'h0', optionIndex: 0 };
    const denied = applyGameCommand(g, { ...cmd, playerId: 'P2' }); expect(denied.error).toBeDefined(); expect(denied.state.heroes[0].feats?.prayers).toBeUndefined();
    const ok = applyGameCommand(g, cmd); expect(ok.error).toBeUndefined(); expect(ok.state.heroes[0].feats?.prayers).toBe(1);
    const twice = applyGameCommand(ok.state, cmd); expect(twice.error).toBeDefined(); expect(twice.state.heroes[0].feats?.prayers).toBe(1);
  });
  it('イベント判定は実行時に記録し、再選択と別担当の操作では増えない', () => {
    EVENTS.register({ id: 'testMechanismCheck', title: '検証', text: '検証', icon: 'trap', options: [{ label: '判定', check: { stat: 'luk', slots: 2, need: 1, purpose: 'mechanism' }, success: [], successText: '成功' }] });
    const g = fresh(); g.mode = 'event'; g.party = ['h1']; g.world!.turn = 'h1'; g.event = { eventId: 'testMechanismCheck', tile: g.world!.pos.h1 };
    const cmd: GameCommand = { type: 'CHOOSE_EVENT', playerId: 'P2', optionIndex: 0, heroId: 'h1', focusUsed: 2 };
    expect(applyGameCommand(g, { ...cmd, playerId: 'P1' }).error).toBeDefined();
    const r = applyGameCommand(g, cmd); expect(r.error).toBeUndefined();
    expect(r.state.heroes[1].feats).toEqual({ 'checks:luk': 1, 'perfects:luk': 1, 'checks:mechanism': 1 });
    const again = applyGameCommand(r.state, cmd); expect(again.error).toBeDefined(); expect(again.state).toEqual(r.state);
  });
  it('装備中の刀による撃破は倒した人にだけ数え、戦闘から冒険へ1度だけ引き継ぐ', () => {
    let g = fresh(); g.heroes[0].equipment.weapon = { uid: 'katana', itemId: 'plainKatana' };
    const member = toPartyMember(g.heroes[0]);
    const b = createBattle({ ...setup(3), party: [member] }); b.enemies[0].hp = 1;
    dealDamage(makeCtx(b, createRng(1), [], b.allies[0]), b.enemies[0], 1000);
    expect(b.allies[0].feats?.['kills:weapon:katana']).toBe(1);
    b.phase = 'escaped'; g.mode = 'battle'; g.battle = b; g.party = ['h0'];
    const r = applyGameCommand(g, { type: 'FINISH_BATTLE', playerId: 'P1' }); expect(r.error).toBeUndefined(); g = r.state;
    expect(g.heroes[0].feats?.['kills:weapon:katana']).toBe(1); expect(g.heroes[1].feats?.['kills:weapon:katana']).toBeUndefined();
    const again = applyGameCommand(g, { type: 'FINISH_BATTLE', playerId: 'P1' }); expect(again.error).toBeDefined(); expect(again.state.heroes[0].feats?.['kills:weapon:katana']).toBe(1);
  });
  it('仲間への実際の支援だけを数え、自分への支援の既存記録は維持する', () => {
    CARDS.register({ id: 'testPartyFocus', name: '支援', category: 'skill', cost: 0, slots: 1, baseChance: 95, target: 'self', tiers: [{ minSuccesses: 0, effects: [] }, { minSuccesses: 1, effects: [{ kind: 'gainFocus', amount: 1, to: 'otherAllies' }, { kind: 'block', amount: 2, to: 'allies' }] }] });
    CARDS.register({ id: 'testSelfSupport', name: '自衛', category: 'skill', cost: 0, slots: 1, baseChance: 95, target: 'self', tiers: [{ minSuccesses: 0, effects: [{ kind: 'block', amount: 2 }] }] });
    let b = createBattle(setup(1)); giveHand(b, 'a0', ['testPartyFocus']);
    const r = applyCommand(b, play('a0', 't0', undefined, 1)); expect(r.error).toBeUndefined(); b = r.state;
    expect(b.allies[0].feats?.['support:others']).toBe(1); expect(b.allies[0].feats?.support).toBe(1);
    giveHand(b, 'a0', ['testSelfSupport']); b = applyCommand(b, play('a0', 't0', undefined, 0)).state;
    expect(b.allies[0].feats?.['support:others']).toBe(1); expect(b.allies[0].feats?.support).toBe(2);
    b.allies[1].dead = true; giveHand(b, 'a0', ['testPartyFocus']); b = applyCommand(b, play('a0', 't0', undefined, 1)).state;
    expect(b.allies[0].feats?.['support:others']).toBe(1);
  });
});
