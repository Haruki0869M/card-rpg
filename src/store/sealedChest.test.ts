// 見直しの段階3: 封魔の宝箱の操作（封印を解く・番人と戦う・運のスロットで開ける）は、どれも今ある OPEN_CHEST。
// 1台で遊ぶ時（ローカル協力）に、P2 以降のキャラで押しても、そのキャラの担当の人として送られること（P1 扱いにならないこと）を確かめる。
import { describe, expect, it } from 'vitest';
import { applyGameCommand, createGame, moveIntoRoom, sealStep, viewOf } from '../engine';
import type { GameCommand, GameState } from '../types';
import { actorOf } from './battleConfig';

function sealedGame(): { g: GameState; x: string } {
  let g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: (['P1', 'P2'] as const).map((playerId, i) => ({ classId: i === 0 ? 'warrior' : 'mage', gender: 'male' as const, name: `h${i}`, playerId })) });
  const run = (cmd: GameCommand) => {
    const r = applyGameCommand(g, cmd);
    if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
    g = r.state;
  };
  run({ type: 'STORY_CONTINUE', playerId: 'P1' });
  g.world!.pos.h0 = g.world!.pos.h1 = g.world!.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === 'emeraldTemple');
  g.world!.turn = 'h0';
  run({ type: 'WORLD_INVITE', playerId: 'P1', heroId: 'h0', targetId: 'h1' });
  run({ type: 'WORLD_INVITE_ANSWER', playerId: 'P2', heroId: 'h1', accept: true });
  run({ type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0', 'h1'] });
  const e = g.expeditions![0];
  const d = e.dungeon!;
  const room = d.rooms.find((r) => r.type === 'chest')!;
  Object.assign(room, { type: 'sealedChest', chest: { rarity: 'epic', locked: false, sealed: true }, enemies: [{ defId: 'treeWarden', level: 4 }] });
  d.currentRoomId = room.id;
  moveIntoRoom(d, room.id);
  d.opened = true;
  e.chest = { roomId: room.id, spec: room.chest!, unlocked: true, opener: 'h1' };
  e.mode = 'chest';
  for (const h of g.heroes) h.focus = 3;
  return { g, x: e.id };
}

describe('封魔の宝箱の操作を送る人（1台で遊ぶ時）', () => {
  it('P2 のキャラ（開け役）で「封印を解く」「番人と戦う」を押すと、P2 として送られて通る', () => {
    let { g, x } = sealedGame();
    for (const step of ['sealed', 'guard'] as const) {
      const v = viewOf(g, x);
      expect(sealStep(v.chest!)).toBe(step);
      // 画面は、押したキャラ（h1）を付けて送る。送る人は、そのキャラの担当（P2）
      const cmd: GameCommand = { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h1', focusUsed: step === 'sealed' ? 2 : 0 };
      const actor = actorOf(v, cmd);
      expect(actor).toBe('P2');
      // P1 のままでは通らない（今までの不具合の形）。P2 として送ると通る
      expect(applyGameCommand(g, { type: 'SCENE', scene: x, command: cmd }).error).toBeDefined();
      const r = applyGameCommand(g, { type: 'SCENE', scene: x, command: { ...cmd, playerId: actor } });
      expect(r.error).toBeUndefined();
      g = r.state;
    }
    expect(viewOf(g, x).mode).toBe('battle');
  });
});
