// 点検 2026-11-13 F6: 物語の窓の「つづける」は、押した時に見ていた窓の版を持つ。もう閉じた窓への押しは、次の窓を閉じない
import { describe, expect, it } from 'vitest';
import type { GameState } from '../../types';
import { applyGameCommand, createGame } from '../index';

const P1 = { title: '制覇の物語', lines: ['制覇した。'] };
const P2 = { title: '💀 災厄の知らせ', lines: ['災厄が現れた。'] };

function twoWindows(): GameState {
  const g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: [
    { classId: 'warrior', gender: 'male', name: '仲間1', playerId: 'P1' },
    { classId: 'mage', gender: 'female', name: '仲間2', playerId: 'P2' },
  ] });
  g.world!.story = P1;
  g.world!.storyQueue = [P2];
  return g;
}

describe('物語の窓の版', () => {
  it('2人がほぼ同時に同じ窓の「つづける」を押しても、2つ目の押しは次の窓（災厄の知らせ）を閉じない', () => {
    let g = twoWindows();
    const ver = g.world!.storyVer ?? 0;
    const a = applyGameCommand(g, { type: 'STORY_CONTINUE', playerId: 'P1', storyVer: ver });
    expect(a.error).toBeUndefined();
    g = a.state;
    expect(g.world!.story).toEqual(P2);
    expect(g.world!.storyVer).toBe(ver + 1);
    const b = applyGameCommand(g, { type: 'STORY_CONTINUE', playerId: 'P2', storyVer: ver });
    expect(b.error).toBeUndefined();
    expect(b.state.world!.story).toEqual(P2);
    // 災厄の知らせを見て押すと閉じる
    const c = applyGameCommand(b.state, { type: 'STORY_CONTINUE', playerId: 'P2', storyVer: ver + 1 });
    expect(c.state.world!.story).toBeUndefined();
    expect(c.state.world!.storyQueue).toBeUndefined();
  });
  it('印の無い古い形の「つづける」は、今出ている窓を閉じる（今までどおり）', () => {
    const g = twoWindows();
    const a = applyGameCommand(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    expect(a.state.world!.story).toEqual(P2);
    const b = applyGameCommand(a.state, { type: 'STORY_CONTINUE', playerId: 'P2' });
    expect(b.state.world!.story).toBeUndefined();
  });
  it('古い保存データ（版が無い）は 0 として扱う', () => {
    const g = twoWindows();
    delete g.world!.storyVer;
    const a = applyGameCommand(g, { type: 'STORY_CONTINUE', playerId: 'P1', storyVer: 0 });
    expect(a.state.world!.story).toEqual(P2);
  });
});
