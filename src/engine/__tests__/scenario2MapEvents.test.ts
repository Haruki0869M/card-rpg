// ===== シナリオ2だけの地図のイベント4種類・薪の束・帯ごとの出し分け（2026-11-21。案 docs/tasks/scenario2-events-scenario3-scourge-proposal.md §1） =====
import { afterEach, describe, expect, it } from 'vitest';
import { EVENTS } from '../../data/events';
import { ITEMS, getItem } from '../../data/items';
import { getScenario } from '../../data/scenarios';
import { setLocalPlayers } from '../../store/battleConfig';
import type { GameCommand, GameState } from '../../types';
import { applyGameCommand, createGame, eventOptionState } from '../index';
import { createRng } from '../rng';
import { newItem, rollConsumable } from '../game/loot';
import { startBattleWith } from '../game/game';
import { heroMaxHp, heroWeaponElement } from '../game/hero';
import { applyClimate, isWarm } from '../game/world/climate';
import { colOf } from '../game/world/hex';
import { laneOfCol } from '../game/world/lanes';
import { lastTurnOfDay, lastTurnOfTime, timeOfDay } from '../game/world/time';
import { RARITIES } from '../game/dungeon';

afterEach(() => setLocalPlayers(null));
const FK = 'frozenKingdom';
const def = () => getScenario(FK).map!;
const fresh = (seed = 1, n = 2) =>
  createGame({ seed, scenarioId: FK, difficulty: 'normal', party: Array.from({ length: n }, (_, i) => ({ classId: ['warrior', 'priest', 'mage', 'thief'][i % 4], gender: 'male' as const, name: `仲間${i}`, playerId: 'P1' as const })) });
function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
const lane = (g: GameState, i: number) => laneOfCol(def(), colOf(g.world!, i))?.id;
const regionOf = (g: GameState, i: number) => def().regions[g.world!.tiles[i].r].id;
/** 空いたマスにイベントを置いて、手番のキャラ（と仲間）で入る。rolled = サイコロを振った後の残りの移動力（null = 振る前） */
function enter(g: GameState, eventId: string, rolled: number | null = null): GameState {
  const w = g.world!;
  w.story = undefined;
  const tile = w.tiles.findIndex((t) => !t.f && t.t === 'snow');
  w.tiles[tile].f = { kind: 'event', id: eventId };
  for (const h of g.heroes) w.pos[h.id] = tile;
  w.turn = g.heroes[0].id;
  w.move = rolled;
  return run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: g.heroes[0].id });
}
const choose = (g: GameState, optionIndex: number, heroId?: string, focusUsed = 0) =>
  run(run(g, { type: 'CHOOSE_EVENT', playerId: 'P1', optionIndex, focusUsed, ...(heroId ? { heroId } : {}) }), { type: 'FINISH_EVENT', playerId: 'P1' });
const NEW = ['iceFishingHut', 'firewoodHut', 'giantForge', 'fadingLantern'];

describe('帯ごと・地域ごとの出し分け', () => {
  it('種20個: 釣り小屋は西・番小屋は中央・炉あとは東・灯籠は西と東・焚き火は中央と東にだけ出る。釣り小屋と炉あとは麓に出ない', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const g = fresh(seed);
      g.world!.tiles.forEach((t, i) => {
        if (t.f?.kind !== 'event') return;
        const ev = EVENTS.get(t.f.id);
        if (ev.placed || ev.hiddenIn) return;
        seen.add(ev.id);
        if (ev.lanes) expect(ev.lanes, `種${seed}: ${ev.id} が帯 ${lane(g, i)} に出た`).toContain(lane(g, i));
        if (ev.regions) expect(ev.regions, `種${seed}: ${ev.id} が地域 ${regionOf(g, i)} に出た`).toContain(regionOf(g, i));
      });
    }
    for (const id of [...NEW, 'bonfireTravelers']) expect(seen.has(id), `${id} が1度も出ない`).toBe(true);
  });

  it('欄（lanes・regions）を持つのはシナリオ2のイベントだけ（ほかの6本のくじは変わらない）', () => {
    const withCols = EVENTS.all.filter((e) => e.lanes || e.regions);
    expect(withCols.map((e) => e.id).sort()).toEqual([...NEW, 'bonfireTravelers'].sort());
    for (const e of withCols) expect(EVENTS.scenarioOf(e.id)).toBe(FK);
    // 帯・地域の名前が、地図のデータに実在する
    const lanes = def().lanes!.map((l) => l.id);
    const regions = def().regions.map((r) => r.id);
    for (const e of withCols) {
      for (const l of e.lanes ?? []) expect(lanes).toContain(l);
      for (const r of e.regions ?? []) expect(regions).toContain(r);
    }
  });
});

describe('氷上の釣り小屋', () => {
  it('暖まる（サイコロを振る前）: 全員が今の時間帯の間だけ寒さを受けず、このターンの移動力が0で確定する。HPは回復しない', () => {
    let g = fresh(11);
    for (const h of g.heroes) h.hp = heroMaxHp(h) - 10;
    const hp0 = g.heroes.map((h) => h.hp);
    g = choose(enter(g, 'iceFishingHut'), 0);
    const w = g.world!;
    expect(g.heroes.map((h) => h.hp)).toEqual(hp0);
    const until = lastTurnOfTime(w.worldTurn);
    expect(until).toBeLessThan(lastTurnOfDay(w.worldTurn));
    for (const h of g.heroes) expect(w.warm![h.id]).toBe(until);
    expect(w.move).toBe(0);
    expect(applyGameCommand(g, { type: 'WORLD_ROLL_MOVE', playerId: 'P1', heroId: g.heroes[0].id }).error).toBe('もう移動力を決めました');
    // 効き目は今の時間帯まで。次の時間帯には切れる
    const time0 = timeOfDay(w.worldTurn);
    w.worldTurn = until;
    expect(timeOfDay(w.worldTurn)).toBe(time0);
    expect(isWarm(w, g.heroes[0].id)).toBe(true);
    w.worldTurn = until + 1;
    applyClimate(g);
    expect(isWarm(w, g.heroes[0].id)).toBe(false);
  });

  it('暖まる（振った後）: 残りの移動力が0になる', () => {
    const g = choose(enter(fresh(12), 'iceFishingHut', 4), 0);
    expect(g.world!.move).toBe(0);
  });

  it('帆そり（振る前）: 30G 払い、次のサイコロに+3（内訳に「帆そり」）。手番が終わると持ち越さない', () => {
    let g = fresh(13);
    g.heroes[0].gold = 50;
    g = choose(enter(g, 'iceFishingHut'), 1);
    expect(g.heroes[0].gold).toBe(20);
    expect(g.world!.move).toBeNull();
    expect(g.world!.moveBonus).toEqual({ value: 3, label: '帆そり' });
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: 'P1', heroId: g.heroes[0].id });
    const d = g.world!.moveDice!;
    expect(d.bonus).toContainEqual({ label: '帆そり', value: 3 });
    expect(g.world!.move).toBe(d.face + d.bonus.reduce((n, b) => n + b.value, 0));
    expect(g.world!.moveBonus).toBeUndefined();
  });

  it('帆そり（振った後）: 残りの移動力+3。お金が足りないと選べない', () => {
    let g = fresh(14);
    g.heroes[0].gold = 30;
    g = choose(enter(g, 'iceFishingHut', 2), 1);
    expect(g.world!.move).toBe(5);
    let p = fresh(15);
    for (const h of p.heroes) h.gold = 10;
    p = enter(p, 'iceFishingHut');
    expect(eventOptionState(p, 'iceFishingHut', 1).reason).toContain('ゴールドが足りません');
  });
});

describe('薪の番小屋と「薪の束」', () => {
  it('分けてもらう: 20G で「薪の束」1つ。2つ目は持てない（1人1つまで。お金に換わる）', () => {
    let g = fresh(21);
    g.heroes[0].gold = 100;
    g = choose(enter(g, 'firewoodHut'), 0);
    expect(g.heroes[0].gold).toBe(80);
    expect(g.heroes[0].pouch.map((p) => p.itemId)).toContain('firewoodBundle');
    const n = () => g.heroes[0].pouch.filter((p) => p.itemId === 'firewoodBundle').length;
    expect(n()).toBe(1);
    g.world!.tiles[g.world!.pos[g.heroes[0].id]].f = undefined;
    g = choose(enter(g, 'firewoodHut'), 0);
    expect(n()).toBe(1);
  });

  it('「薪の束」は、宝箱・店・消耗品のくじに出ない（番小屋だけ）', () => {
    const fw = getItem('firewoodBundle');
    expect(fw.source).toBe('event');
    expect(fw.pouchMax).toBe(1);
    expect(fw.scenario).toBeUndefined();
    const rng = createRng(7);
    for (const r of RARITIES) for (let k = 0; k < 200; k++) expect(rollConsumable(r, rng).id).not.toBe('firewoodBundle');
    // 名前で渡すイベントは番小屋だけ
    const givers = EVENTS.all.filter((e) => e.options.some((o) => [...o.success, ...(o.fail ?? [])].some((x) => x.kind === 'giveItem' && x.itemId === 'firewoodBundle')));
    expect(givers.map((e) => e.id)).toEqual(['firewoodHut']);
    expect(ITEMS.all.filter((i) => i.source === 'event').map((i) => i.id)).toEqual(['firewoodBundle']);
  });

  it('使う: 使った相手1人だけが、次の朝まで寒さを受けない。品は無くなる', () => {
    const g0 = fresh(22);
    const [a, b] = g0.heroes;
    g0.world!.story = undefined;
    const it0 = newItem(g0, getItem('firewoodBundle'));
    a.pouch.push(it0);
    const g = run(g0, { type: 'USE_POUCH_ITEM', playerId: 'P1', itemUid: it0.uid, userId: a.id, targetId: a.id });
    const w = g.world!;
    expect(w.warm).toEqual({ [a.id]: lastTurnOfDay(w.worldTurn) });
    expect(isWarm(w, b.id)).toBe(false);
    expect(g.heroes[0].pouch.some((p) => p.itemId === 'firewoodBundle')).toBe(false);
  });
});

describe('巨人の炉あと', () => {
  it('手番のキャラが最大HPの15%を失い、武器に火が宿る。3回目の戦闘が始まった後に消える', () => {
    let g = fresh(31);
    const max = heroMaxHp(g.heroes[0]);
    g.heroes[0].hp = max;
    const hpB = g.heroes[1].hp;
    g = choose(enter(g, 'giantForge'), 0);
    const a = g.heroes[0];
    expect(a.hp).toBe(max - Math.ceil((max * 15) / 100));
    expect(g.heroes[1].hp).toBe(hpB);
    expect(heroWeaponElement(a)).toBe('fire');
    expect(a.weaponElement!.battles).toBe(3);
    expect(heroWeaponElement(g.heroes[1])).toBeUndefined();
    const rng = createRng(3);
    const enemy = [{ defId: g.world!.wanderers[0]?.enemies[0]?.defId ?? 'snowWolf' }];
    for (let k = 1; k <= 3; k++) {
      startBattleWith(g, enemy, 'battle', rng);
      // この戦闘の中では火（戦闘の味方に写っている）
      expect(g.battle!.allies.find((x) => x.id === a.id)!.weaponElement, `${k}回目の戦闘`).toBe('fire');
      expect(a.weaponElement?.battles).toBe(k < 3 ? 3 - k : undefined);
      g.battle = undefined;
      g.mode = 'world';
    }
    expect(heroWeaponElement(a)).toBeUndefined();
    startBattleWith(g, enemy, 'battle', rng);
    expect(g.battle!.allies.find((x) => x.id === a.id)!.weaponElement).toBeUndefined();
  });

  it('武器を持っていない手番のキャラは選べない（理由が出る・HPも減らない）', () => {
    let g = fresh(32);
    delete g.heroes[0].equipment.weapon;
    const hp = g.heroes[0].hp;
    g = enter(g, 'giantForge');
    expect(eventOptionState(g, 'giantForge', 0).reason).toBe('武器を持っていません');
    expect(applyGameCommand(g, { type: 'CHOOSE_EVENT', playerId: 'P1', optionIndex: 0, focusUsed: 0 }).error).toBe('武器を持っていません');
    expect(g.heroes[0].hp).toBe(hp);
  });

  it('妖精の泉（今までの形）は、戦闘の数で切れない', () => {
    const ev = EVENTS.all.find((e) => e.options.some((o) => o.success.some((x) => x.kind === 'weaponElement' && !x.battles)));
    expect(ev).toBeDefined();
  });
});

describe('消えかけの灯籠', () => {
  it('灯をともし直す: フォーカス2で冬の深さ-2%／油をもらう: 全員フォーカス+2・冬の深さ+1%', () => {
    let g = fresh(41);
    g.world!.corruption = 10;
    g.heroes[0].focus = 2;
    g = choose(enter(g, 'fadingLantern'), 0);
    expect(g.world!.corruption).toBe(8);
    expect(g.heroes[0].focus).toBe(0);
    let p = fresh(42);
    p.world!.corruption = 10;
    for (const h of p.heroes) h.focus = 0;
    p = choose(enter(p, 'fadingLantern'), 1);
    expect(p.world!.corruption).toBe(11);
    for (const h of p.heroes) expect(h.focus).toBe(2);
  });
});
