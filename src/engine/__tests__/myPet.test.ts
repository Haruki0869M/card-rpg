// 伝承の書のマイペット（K5）: スタートの町で1人1回・30Gで呼ぶ。乱数は使わない。オンラインの P2 の操作でも止まらない
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { actorOf } from '../../store/battleConfig';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, createGame, stateHash } from '../index';
import { inStartTown } from '../game/world/town';

function inCapital(): GameState {
  const g = createGame({
    seed: 21,
    scenarioId: 'corruptionKing',
    difficulty: 'normal',
    party: [
      { classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' },
      { classId: 'mage', gender: 'female', name: 'b', playerId: 'P2' },
    ],
  });
  g.world!.story = undefined;
  g.world!.follow = { h1: 'h0' };
  g.heroes.forEach((h) => (h.gold = 100));
  const r = applyGameCommand(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0' });
  expect(r.error).toBeUndefined();
  expect(r.state.mode).toBe('town');
  return r.state;
}
const pet = (over: Partial<{ uid: string; petId: string; color: string; name: string; love: number }> = {}) => ({ uid: 'u1', petId: 'cockatiel', color: 'lutino', name: 'ぴーちゃん', love: 130, ...over });
const call = (g: GameState, heroId: string, playerId: PlayerId, p = pet()): { state: GameState; error?: string } =>
  applyGameCommand(g, { type: 'BRING_MY_PET', playerId, heroId, pet: p });

describe('マイペットを呼ぶ（K5）', () => {
  it('スタートの町で、30Gで、名前・色・懐き度のまま連れて来る。乱数は進まない', () => {
    const g = inCapital();
    expect(inStartTown(g)).toBe(true);
    const rng = g.rngState;
    const r = call(g, 'h0', 'P1');
    expect(r.error).toBeUndefined();
    const h = r.state.heroes[0];
    expect(h.gold).toBe(100 - BALANCE.myPetCost);
    expect(h.pet).toEqual({ petId: 'cockatiel', color: 'lutino', name: 'ぴーちゃん', love: 130, acts: 0, myPetUid: 'u1' });
    expect(h.myPetCalled).toBe(true);
    expect(r.state.rngState).toBe(rng);
    // 同じ操作は、どの端末で計算しても同じ結果になる
    expect(stateHash(call(inCapital(), 'h0', 'P1').state)).toBe(stateHash(r.state));
  });

  it('1人1回だけ。同じ子を2人で呼べない。お金が足りない時は呼べない', () => {
    let g = call(inCapital(), 'h0', 'P1').state;
    expect(call(g, 'h0', 'P1', pet({ uid: 'u2' })).error).toBeTruthy();
    expect(call(g, 'h1', 'P2').error).toBeTruthy(); // 同じ子（u1）
    g.heroes[1].gold = BALANCE.myPetCost - 1;
    expect(call(g, 'h1', 'P2', pet({ uid: 'u2' })).error).toBe('ゴールドが足りません');
    g.heroes[1].gold = BALANCE.myPetCost;
    g = call(g, 'h1', 'P2', pet({ uid: 'u2', petId: 'owl', color: 'brown', name: 'ほー', love: 0 })).state;
    expect(g.heroes[1].pet?.petId).toBe('owl');
    expect(g.heroes[1].gold).toBe(0);
  });

  it('知らない種類・色、長すぎる名前、大きすぎる懐き度は直すか断る', () => {
    const g = inCapital();
    expect(call(g, 'h0', 'P1', pet({ petId: 'dragonX' })).error).toBeTruthy();
    expect(call(g, 'h0', 'P1', pet({ color: 'rainbowX' })).error).toBeTruthy();
    expect(call(g, 'h0', 'P1', pet({ uid: '' })).error).toBeTruthy();
    const h = call(g, 'h0', 'P1', pet({ name: '  とてもながいなまえのこです  ', love: 99999 })).state.heroes[0];
    expect(h.pet!.name.length).toBeLessThanOrEqual(BALANCE.petNameMax);
    expect(h.pet!.love).toBe(BALANCE.petLove[BALANCE.petLove.length - 1]);
    expect(call(g, 'h0', 'P1', pet({ name: '   ' })).state.heroes[0].pet!.name).toBeTruthy();
  });

  it('今のお供とはお別れして入れ替わる', () => {
    const g = inCapital();
    g.heroes[0].pet = { petId: 'owl', color: 'brown', name: 'ほー', love: 3, acts: 1 };
    const r = call(g, 'h0', 'P1');
    expect(r.state.heroes[0].pet?.name).toBe('ぴーちゃん');
    expect(r.state.log.some((l) => l.text.includes('ほー') && l.text.includes('旅立って'))).toBe(true);
  });

  it('スタートの町でないと呼べない。他の人のキャラでは呼べない', () => {
    const g = inCapital();
    expect(call(g, 'h1', 'P1').error).toBeTruthy(); // P1 は P2 のキャラを操作できない
    const other = structuredClone(g);
    other.town!.townId = 'forestVillage';
    expect(inStartTown(other)).toBe(false);
    expect(call(other, 'h0', 'P1').error).toBe('マイペットはスタートの町で呼べます');
  });

  it('1台で遊ぶ時も、P2 のキャラの操作は P2 として送られる（actorOf）', () => {
    const g = inCapital();
    const cmd: GameCommand = { type: 'BRING_MY_PET', playerId: 'P1', heroId: 'h1', pet: pet() };
    expect(actorOf(g, cmd)).toBe('P2');
    expect(call(g, 'h1', actorOf(g, cmd)).error).toBeUndefined();
  });
});
