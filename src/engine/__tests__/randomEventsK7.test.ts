// K7: 突発イベント20個（地形・お供・夜の条件、懐き度の結果、新しいイベントの結果）
import { describe, expect, it } from 'vitest';
import { EVENTS } from '../../data/events';
import { getPet } from '../../data/pets';
import { BALANCE } from '../../data/balance';
import type { GameCommand, GameState, Hero, PlayerId } from '../../types';
import { applyGameCommand, createGame, eventOptionState } from '../index';
import { pickRandomEvent } from '../game/world/world';
import { createRng } from '../rng';

const P: PlayerId = 'P1';
const newGame = (classes = ['warrior']) =>
  createGame({ seed: 7, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((c, i) => ({ classId: c, gender: 'female', name: `${c}${i}`, playerId: P })) });
const run = (g: GameState, cmd: GameCommand) => {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
};
const givePet = (h: Hero, petId = 'cockatiel') => {
  h.pet = { petId, color: getPet(petId).colors[0].id, name: 'ぴよ', love: 0, acts: 0 };
};
/** 何もないマスを1つ選んで、その地形にする */
const tileOf = (g: GameState, terrain: string) => {
  const i = g.world!.tiles.findIndex((t) => !t.f);
  g.world!.tiles[i].t = terrain;
  return i;
};
const NOON = 1 + BALANCE.turnsPerTimeOfDay;
const NIGHT = 1 + BALANCE.turnsPerTimeOfDay * 3;
/** 何回も抽選して、出たイベントのID */
function picks(g: GameState, tile: number, group: Hero[], n = 400): Set<string> {
  const rng = createRng(123);
  const out = new Set<string>();
  for (let i = 0; i < n; i++) {
    const id = pickRandomEvent(g, rng, tile, group);
    if (id) out.add(id);
  }
  return out;
}
const choose = (g: GameState, eventId: string, label: string) => {
  const h = g.heroes[0];
  g.mode = 'event';
  g.party = [h.id];
  g.event = { tile: g.world!.pos[h.id], eventId, random: true };
  const idx = EVENTS.get(eventId).options.findIndex((o) => o.label.startsWith(label));
  expect(idx, label).toBeGreaterThanOrEqual(0);
  return run(g, { type: 'CHOOSE_EVENT', playerId: P, optionIndex: idx, focusUsed: 0 });
};

describe('K7 突発イベントの出方', () => {
  it('新しい9個がすべてあり、悪いイベントと戦闘には判定のない逃げ道がある', () => {
    const ids = ['rCampfireBard', 'rFlowerField', 'rMushroomRing', 'rRoadsideStatue', 'rPetDiscovery', 'rBanditToll', 'rRopeBridge', 'rWillOWisp', 'rFallenAdventurer'];
    for (const id of ids) expect(EVENTS.get(id).where).toBe('random');
    for (const e of EVENTS.all.filter((x) => x.where === 'random' && (x.tone === 'bad' || x.tone === 'battle'))) {
      expect(e.options.some((o) => !o.check && !o.requiresTag && !o.requiresPet), e.id).toBe(true);
    }
  });

  it('地形の条件: キノコの輪は森、花畑は平原・丘、吊り橋は山・丘でだけ出る', () => {
    const g = newGame();
    g.world!.worldTurn = NOON;
    const forest = picks(g, tileOf(g, 'forest'), [g.heroes[0]]);
    expect(forest.has('rMushroomRing')).toBe(true);
    expect(forest.has('rRopeBridge')).toBe(false);
    expect(forest.has('rFlowerField')).toBe(false);
    const g2 = newGame();
    g2.world!.worldTurn = NOON;
    const plains = picks(g2, tileOf(g2, 'plains'), [g2.heroes[0]]);
    expect(plains.has('rFlowerField')).toBe(true);
    for (const id of ['rMushroomRing', 'rRopeBridge', 'rWillOWisp']) expect(plains.has(id), id).toBe(false);
    const g3 = newGame();
    g3.world!.worldTurn = NOON;
    expect(picks(g3, tileOf(g3, 'mountain'), [g3.heroes[0]]).has('rRopeBridge')).toBe(true);
  });

  it('夜の条件: 吟遊詩人と鬼火は夜だけ（鬼火は沼・瘴気の地の夜）', () => {
    const g = newGame();
    const tile = tileOf(g, 'swamp');
    g.world!.worldTurn = NOON;
    const day = picks(g, tile, [g.heroes[0]]);
    expect(day.has('rCampfireBard')).toBe(false);
    expect(day.has('rWillOWisp')).toBe(false);
    g.world!.worldTurn = NIGHT;
    const night = picks(g, tile, [g.heroes[0]]);
    expect(night.has('rCampfireBard')).toBe(true);
    expect(night.has('rWillOWisp')).toBe(true);
  });

  it('お供の条件: お供連れでないと「お供の大発見」は出ない', () => {
    const g = newGame();
    g.world!.worldTurn = NOON;
    const tile = tileOf(g, 'road');
    const h = g.heroes[0];
    expect(picks(g, tile, [h]).has('rPetDiscovery')).toBe(false);
    givePet(h);
    expect(picks(g, tile, [h]).has('rPetDiscovery')).toBe(true);
  });

  it('絞り込みでは乱数を引かない（1回の抽選で1回だけ引く）', () => {
    const g = newGame();
    const tile = tileOf(g, 'forest');
    const base = createRng(5);
    let calls = 0;
    const rng = { ...base, next: () => { calls++; return base.next(); } };
    pickRandomEvent(g, rng, tile, [g.heroes[0]]);
    expect(calls).toBe(1);
  });
});

describe('K7 突発イベントの結果', () => {
  it('フォーカスを払う選択肢は、選ぶ本人のフォーカスで判定する（道祖神で止まる不具合）', () => {
    let g = newGame(['warrior', 'mage']);
    const [a, b] = g.heroes;
    g.mode = 'event';
    g.party = [a.id, b.id];
    g.activeScene = undefined;
    g.world!.turn = a.id;
    g.event = { tile: g.world!.pos[a.id], eventId: 'rRoadsideStatue', random: true };
    const idx = EVENTS.get('rRoadsideStatue').options.findIndex((o) => o.costFocus);
    a.focus = 0;
    b.focus = 2;
    // 場面のだれかが払えれば選択肢は出るが、本人を指定すると払えないと分かる
    expect(eventOptionState(g, 'rRoadsideStatue', idx).reason).toBeUndefined();
    expect(eventOptionState(g, 'rRoadsideStatue', idx, a).reason).toContain('フォーカス');
    expect(eventOptionState(g, 'rRoadsideStatue', idx, b).reason).toBeUndefined();
    // 本人が払えない時は、同じ理由で断られる（「選べる」と出て断られる食い違いが無い）
    const r = applyGameCommand(g, { type: 'CHOOSE_EVENT', playerId: P, optionIndex: idx, heroId: a.id, focusUsed: 0 });
    expect(r.error).toContain('フォーカス');
    g = run(g, { type: 'CHOOSE_EVENT', playerId: P, optionIndex: idx, heroId: b.id, focusUsed: 0 });
    expect(g.heroes[1].focus).toBe(0);
  });

  it('お供連れの時だけの選択肢: 山賊の関所の「お供が気を引く」', () => {
    const g = newGame();
    const h = g.heroes[0];
    g.mode = 'event';
    g.party = [h.id];
    g.event = { tile: g.world!.pos[h.id], eventId: 'rBanditToll', random: true };
    const idx = EVENTS.get('rBanditToll').options.findIndex((o) => o.requiresPet);
    expect(eventOptionState(g, 'rBanditToll', idx).visible).toBe(false);
    givePet(h);
    expect(eventOptionState(g, 'rBanditToll', idx).visible).toBe(true);
  });

  it('お供の大発見: 撫でると懐き度+12、任せると+8と30G', () => {
    let g = newGame();
    givePet(g.heroes[0]);
    g = choose(g, 'rPetDiscovery', 'たくさん撫でて');
    expect(g.heroes[0].pet!.love).toBe(12);
    let g2 = newGame();
    givePet(g2.heroes[0]);
    const gold = g2.heroes[0].gold;
    g2 = choose(g2, 'rPetDiscovery', 'お供に任せて');
    expect(g2.heroes[0].pet!.love).toBe(8);
    expect(g2.heroes[0].gold).toBe(gold + 30);
  });

  it('花畑のお昼寝: お供を連れている人の懐き度だけ上がる', () => {
    let g = newGame(['warrior', 'mage']);
    givePet(g.heroes[1], 'rabbit');
    g.mode = 'event';
    g.party = g.heroes.map((h) => h.id);
    g.event = { tile: g.world!.pos[g.heroes[0].id], eventId: 'rFlowerField', random: true };
    g = run(g, { type: 'CHOOSE_EVENT', playerId: P, optionIndex: 0, focusUsed: 0 });
    expect(g.heroes[0].pet).toBeUndefined();
    expect(g.heroes[1].pet!.love).toBe(5);
  });

  it('道祖神: 50Gで装飾品、フォーカス2でカード強化、血でカード＋削除', () => {
    let g = newGame();
    g.heroes[0].gold = 100;
    g = choose(g, 'rRoadsideStatue', '50Gを供える');
    expect(g.heroes[0].gold).toBe(50);
    expect(g.event!.result!.loot.some((l) => l.kind === 'item')).toBe(true);
    let g2 = newGame();
    g2.heroes[0].focus = 2;
    g2 = choose(g2, 'rRoadsideStatue', 'フォーカスを2');
    expect(g2.heroes[0].focus).toBe(0);
    expect(g2.heroes[0].cardTask).toBe('upgrade');
    let g3 = newGame();
    const hp = g3.heroes[0].hp;
    g3 = choose(g3, 'rRoadsideStatue', '血を一滴');
    expect(g3.heroes[0].hp).toBeLessThan(hp);
    expect(g3.event!.result!.loot.some((l) => l.kind === 'card')).toBe(true);
    expect(g3.heroes[0].cardTask).toBe('remove');
  });

  it('お金を払う選択肢は本当に払う: 山賊の通行料40G・吟遊詩人の投げ銭30G', () => {
    let g = newGame();
    g.heroes[0].gold = 100;
    g = choose(g, 'rBanditToll', '通行料を払う');
    expect(g.heroes[0].gold).toBe(60);
    let g2 = newGame();
    g2.heroes[0].gold = 100;
    g2 = choose(g2, 'rCampfireBard', '投げ銭');
    expect(g2.heroes[0].gold).toBe(70);
  });

  it('山賊の関所: 押し通るとお金2倍の戦闘になる', () => {
    let g = newGame();
    g.world!.story = undefined;
    g = choose(g, 'rBanditToll', '押し通る');
    g = run(g, { type: 'FINISH_EVENT', playerId: P });
    expect(g.mode).toBe('battle');
    expect(g.battleInfo?.goldMul).toBe(2);
  });

  it('行き倒れの冒険者: 持ち物を拝借すると60Gと侵食度+1%', () => {
    let g = newGame();
    const gold = g.heroes[0].gold;
    const c = g.world!.corruption;
    g = choose(g, 'rFallenAdventurer', '持ち物を拝借');
    expect(g.heroes[0].gold).toBe(gold + 60);
    expect(g.world!.corruption).toBe(c + 1);
  });
});
