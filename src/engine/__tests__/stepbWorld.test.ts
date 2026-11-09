// ===== ステップB: 同行して動いたキャラは、そのワールドターンは行動済みになる =====
import { describe, expect, it } from 'vitest';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { BALANCE } from '../../data/balance';
import { TOWNS } from '../../data/world';
import { applyGameCommand, createGame, createRng, defeatOutlook, findHero, handleDefeat, heroMaxHp, reachable } from '../index';

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
/** 移動先: 何もない隣のマス（施設なし） */
function emptyStep(g: GameState) {
  const w = g.world!;
  return [...reachable(w, w.pos.h0, w.move ?? 0)].find(([i, v]) => i !== w.pos.h0 && v.cost <= (w.move ?? 0) && !w.tiles[i].f)![0];
}

describe('同行者の行動済み（ステップB）', () => {
  it('4人中2人を連れて動くと、その2人は行動済み。運転者の番が終わると残りの1人の番、その後ワールドターンが進む', () => {
    let g = ready(['P1', 'P1', 'P1', 'P1']);
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: 'P1', heroId: 'h0', focusUsed: 2 });
    g = run(g, { type: 'WORLD_MOVE', playerId: 'P1', heroId: 'h0', to: emptyStep(g), companions: ['h1', 'h2'] });
    expect(g.mode).toBe('world'); // この種では突発イベントは起きない
    expect(g.world!.acted.sort()).toEqual(['h1', 'h2']);
    expect(g.world!.turn).toBe('h0');
    const corruption = g.world!.corruption;
    g = run(g, { type: 'WORLD_WAIT', playerId: 'P1', heroId: 'h0' });
    expect(g.world!.turn).toBe('h3');
    expect(g.world!.worldTurn).toBe(1);
    g = run(g, { type: 'WORLD_WAIT', playerId: 'P1', heroId: 'h3' });
    expect(g.world!.worldTurn).toBe(2);
    expect(g.world!.corruption).toBeGreaterThan(corruption);
    expect(g.world!.acted).toEqual([]);
    expect(g.world!.turn).toBe('h0');
    // 次のワールドターンでは、同行者も手番を持てる（同行は続いていても、自分で動ける）
    expect(applyGameCommand(g, { type: 'WORLD_ROLL_MOVE', playerId: 'P1', heroId: 'h1', focusUsed: 0 }).error).toBeDefined(); // まだ h0 の番
    g = run(g, { type: 'WORLD_WAIT', playerId: 'P1', heroId: 'h0' });
    expect(g.world!.turn).toBe('h1');
  });

  it('残りが全員同行者なら、運転者の番が終わるとすぐワールドターンが進む（侵食度も今までどおり増える）', () => {
    let g = ready(['P1', 'P1']);
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: 'P1', heroId: 'h0', focusUsed: 2 });
    g = run(g, { type: 'WORLD_MOVE', playerId: 'P1', heroId: 'h0', to: emptyStep(g), companions: ['h1'] });
    expect(g.mode).toBe('world');
    const corruption = g.world!.corruption;
    g = run(g, { type: 'WORLD_WAIT', playerId: 'P1', heroId: 'h0' });
    expect(g.world!.worldTurn).toBe(2);
    expect(g.world!.corruption).toBeGreaterThan(corruption);
    expect(g.world!.turn).toBe('h0');
  });

  it('他の人のキャラ（オンライン・交代）: 提案に同意して動いた時も、同行者は行動済み', () => {
    let g = ready(['P1', 'P2', 'P1']);
    g = run(g, { type: 'WORLD_INVITE', playerId: 'P1', heroId: 'h0', targetId: 'h1' });
    g = run(g, { type: 'WORLD_INVITE_ANSWER', playerId: 'P2', heroId: 'h1', accept: true });
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: 'P1', heroId: 'h0', focusUsed: 2 });
    g = run(g, { type: 'WORLD_MOVE', playerId: 'P1', heroId: 'h0', to: emptyStep(g), companions: ['h1'] });
    // 提案の間はまだ行動済みにしない（断られたら h1 は自分の番を持つ）
    expect(g.world!.acted).not.toContain('h1');
    const refused = run(g, { type: 'WORLD_MOVE_AGREE', playerId: 'P2', accept: false });
    expect(refused.world!.acted).not.toContain('h1');
    g = run(g, { type: 'WORLD_MOVE_AGREE', playerId: 'P2', accept: true });
    expect(g.world!.acted).toContain('h1');
    expect(g.mode).toBe('world');
    g = run(g, { type: 'WORLD_WAIT', playerId: 'P1', heroId: 'h0' });
    expect(g.world!.turn).toBe('h2');
  });

  it('途中で魔物に会っても、同行者は行動済み（戦闘のあと自分の番は来ない）', () => {
    let g = ready(['P1', 'P1', 'P1']);
    g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: 'P1', heroId: 'h0', focusUsed: 2 });
    const to = emptyStep(g);
    g.world!.wanderers.push({ id: 'wx', tile: to, enemies: [{ defId: 'goblinScout', level: 1 }] });
    g = run(g, { type: 'WORLD_MOVE', playerId: 'P1', heroId: 'h0', to, companions: ['h1'] });
    expect(g.mode).toBe('encounter');
    expect(g.world!.acted).toContain('h1');
    expect(g.world!.acted).not.toContain('h2');
  });

  it('突発イベントが起きても、同行者は行動済み', () => {
    let found = false;
    for (let seed = 1; seed <= 200 && !found; seed++) {
      let g = ready(['P1', 'P1', 'P1'], seed);
      g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: 'P1', heroId: 'h0', focusUsed: 2 });
      const to = emptyStep(g);
      if (to === undefined) continue;
      g = run(g, { type: 'WORLD_MOVE', playerId: 'P1', heroId: 'h0', to, companions: ['h1'] });
      if (g.mode !== 'event') continue;
      found = true;
      expect(g.party).toEqual(['h0', 'h1']);
      expect(g.world!.acted).toContain('h1');
      expect(g.world!.acted).not.toContain('h2');
    }
    expect(found).toBe(true);
  });
});

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
