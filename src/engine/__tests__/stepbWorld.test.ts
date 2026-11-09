// ===== ステップB: 全滅の画面の「この後どうなるか」（灯火・退却の町・復帰のHP）=====
import { describe, expect, it } from 'vitest';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { BALANCE } from '../../data/balance';
import { TOWNS } from '../../data/world';
import { applyGameCommand, createGame, createRng, defeatOutlook, findHero, handleDefeat, heroMaxHp } from '../index';

const party = (players: PlayerId[]) =>
  players.map((p, i) => ({ classId: ['warrior', 'mage', 'guardian', 'hunter'][i], gender: 'male' as const, name: `h${i}`, playerId: p }));
function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
/** 物語を閉じ、地方の紹介・魔物を消して、全員を同じマスに置いた状態 */
function ready(players: PlayerId[], seed = 3) {
  let g = createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: party(players) });
  g = run(g, { type: 'STORY_CONTINUE', playerId: players[0] });
  const w = g.world!;
  w.visitedRegions = Array.from({ length: 100 }, (_, i) => i);
  w.wanderers = [];
  for (const id of Object.keys(w.pos)) w.pos[id] = w.pos.h0;
  return g;
}

describe('全滅の画面の「この後どうなるか」（ステップB）', () => {
  it('灯火が残っていれば: 実際に目を覚ます町の名前・灯火の数（前→後）・復帰のHPが、handleDefeat の結果と同じ', () => {
    const g = ready(['P1', 'P1']);
    const w = g.world!;
    // 町から離れたマスで負けた形にする
    const far = w.tiles.findIndex((t, i) => !t.f && i !== w.pos.h0 && Math.abs(i - w.pos.h0) > 30);
    w.pos.h0 = w.pos.h1 = far;
    g.lives = 3;
    const o = defeatOutlook(g, ['h0', 'h1']);
    expect(o.kind).toBe('retreat');
    if (o.kind !== 'retreat') return;
    expect(o.livesBefore).toBe(3);
    expect(o.livesAfter).toBe(2);
    expect(o.hpPercent).toBe(Math.round(BALANCE.reviveHpRatio * 100));
    expect(o.hpPercent).toBe(50);
    handleDefeat(g, ['h0', 'h1'], createRng(1));
    expect(g.lives).toBe(2);
    const f = g.world!.tiles[g.world!.pos.h0].f!;
    expect(f.kind).toBe('town');
    expect(o.townName).toBe(TOWNS.get(f.id).name);
    const h0 = findHero(g, 'h0')!;
    expect(h0.hp).toBe(Math.ceil(heroMaxHp(h0) * BALANCE.reviveHpRatio));
    expect(g.mode).not.toBe('gameover');
  });
  it('灯火が無く、ほかに仲間が残っていれば「倒れる」。誰も残らなければ本当のゲームオーバー', () => {
    const g = ready(['P1', 'P1']);
    g.lives = 0;
    expect(defeatOutlook(g, ['h0'])).toEqual({ kind: 'downed' });
    expect(defeatOutlook(g, ['h0', 'h1'])).toEqual({ kind: 'gameover' });
    const a = structuredClone(g);
    handleDefeat(a, ['h0'], createRng(1));
    expect(a.mode).not.toBe('gameover');
    handleDefeat(g, ['h0', 'h1'], createRng(1));
    expect(g.mode).toBe('gameover');
  });
});
