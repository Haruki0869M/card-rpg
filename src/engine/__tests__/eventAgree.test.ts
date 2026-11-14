// 実機の不具合①（2026-11-14）: ダンジョンのイベントの2段階の合意（選ぶ段 → 挑む段）。
// 計画: docs/tasks/realdevice-coop-fix-plan.md の ①・「憲章の点検の後の直し」（F1・F5・F9）
import { afterEach, describe, expect, it } from 'vitest';
import { applyGameCommand, createGame, eventChallenger, eventChallengers, eventPayer, needsVote, statChance, voteCtx } from '..';
import { actorOf, setLocalPlayers } from '../../store/battleConfig';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { botStep, type BotLog } from '../bot';

afterEach(() => setLocalPlayers(null));

const SEATS: PlayerId[] = ['P1', 'P2', 'P3', 'P4'];

/**
 * ダンジョンの「倒れた巨木」（0 = 力の判定 3枠2成功・1 = 迂回）の前にいる組。
 * classes[i] のキャラ（h{i}）の担当は seats[i]。並び（party）は order（省略は h0, h1, …）
 */
function scene(classes: string[], seats: PlayerId[], order?: string[], eventId = 'fallenTree'): GameState {
  const g = createGame({
    seed: 4242,
    scenarioId: 'corruptionKing',
    difficulty: 'normal',
    party: classes.map((classId, i) => ({ playerId: seats[i], classId, gender: 'male' as const, name: `仲間${i}` })),
  });
  g.mode = 'event';
  g.party = order ?? g.heroes.map((h) => h.id);
  g.event = { eventId, roomId: '部屋' };
  return g;
}

/** ダンジョンの場面の中の操作として動かす（applyGameCommand は最後に activeScene を消すので、毎回付け直す） */
function run(g: GameState, cmd: GameCommand): { state: GameState; error?: string } {
  const s = structuredClone(g);
  s.activeScene = '探索中';
  const r = applyGameCommand(s, cmd);
  return { state: r.state, error: r.error };
}
const ok = (g: GameState, cmd: GameCommand) => {
  const r = run(g, cmd);
  expect(r.error).toBeUndefined();
  return r.state;
};
const vote = (p: PlayerId, optionIndex: number, extra: Partial<Extract<GameCommand, { type: 'CHOOSE_EVENT' }>> = {}): GameCommand => ({
  type: 'VOTE',
  playerId: p,
  command: { type: 'CHOOSE_EVENT', playerId: p, optionIndex, focusUsed: 0, ...extra },
});
/** 画面から送る形（actorOf で送る席を決める。1台で2人・代わりに操作の確かめ） */
const fromScreen = (g: GameState, cmd: GameCommand) => {
  const s = structuredClone(g);
  s.activeScene = '探索中';
  return run(g, { ...cmd, playerId: actorOf(s, cmd) } as GameCommand);
};

describe('イベントの2段階の合意（2人以上）', () => {
  it('先頭でない人（P2）が「力の判定」を出し、P1 も同じ選択肢 → 挑む段で止まる。挑む役 = いちばん得意なキャラ（場面の全員から）', () => {
    // 先頭 = P2（P2 が先にダンジョンに入った並び）。P2 は魔道士・P1 は戦士
    const g = scene(['warrior', 'mage'], ['P1', 'P2'], ['h1', 'h0']);
    const best = eventChallengers(g, 0)[0];
    expect(best.id).toBe('h0');
    let s = ok(g, vote('P2', 0, { heroId: 'h1', focusUsed: 1 }));
    expect(s.event?.decided).toBeUndefined();
    const rng = s.rngState;
    s = ok(s, vote('P1', 0, { heroId: 'h0', focusUsed: 2 }));
    // 乱数は引かない（決まっただけ）。票の中のキャラとフォーカスは使わない
    expect(s.rngState).toBe(rng);
    expect(s.event?.result).toBeUndefined();
    expect(s.event?.decided).toEqual({ optionIndex: 0, heroId: 'h0' });
    expect(s.heroes.map((h) => h.focus)).toEqual(g.heroes.map((h) => h.focus));
    expect(s.vote).toBeUndefined();
  });

  it('P1 と P2 が違うフォーカスを出しても、使われるのは挑む役の持ち主が挑む段で決めた数だけ', () => {
    const g = scene(['warrior', 'mage'], ['P1', 'P2'], ['h1', 'h0']);
    let s = ok(g, vote('P2', 0, { heroId: 'h1', focusUsed: 0 }));
    s = ok(s, vote('P1', 0, { heroId: 'h0', focusUsed: 3 }));
    const focus0 = s.heroes[0].focus;
    // 持ち主でない P2 は挑めない
    expect(run(s, { type: 'EVENT_CHALLENGE', playerId: 'P2', heroId: 'h0', focusUsed: 0 }).error).toMatch(/担当/);
    // 挑む役でないキャラの名前で送っても断る
    expect(run(s, { type: 'EVENT_CHALLENGE', playerId: 'P2', heroId: 'h1', focusUsed: 0 }).error).toMatch(/挑むのは/);
    s = ok(s, { type: 'EVENT_CHALLENGE', playerId: 'P1', heroId: 'h0', focusUsed: 1 });
    expect(s.event?.result?.heroId).toBe('h0');
    expect(s.event?.result?.results?.[0]).toBe('focus');
    expect(s.event?.result?.results?.filter((r) => r === 'focus')).toHaveLength(1);
    expect(s.heroes[0].focus).toBe(focus0 - 1);
    expect(s.heroes[1].focus).toBe(g.heroes[1].focus);
    expect(s.event?.decided).toBeUndefined();
  });

  it('判定と乱数の引き方は、今までの1人用の判定と同じ（同じキャラ・同じフォーカスなら同じ結果）', () => {
    const g = scene(['warrior', 'mage'], ['P1', 'P2']);
    let s = ok(g, vote('P1', 0));
    s = ok(s, vote('P2', 0));
    const shared = ok(s, { type: 'EVENT_CHALLENGE', playerId: 'P1', heroId: 'h0', focusUsed: 1 });
    // 同じ状態を1人用（場面が1つの席だけ）の道で動かす
    const solo = structuredClone(s);
    delete solo.event!.decided;
    solo.party = ['h0'];
    const soloR = ok(solo, { type: 'CHOOSE_EVENT', playerId: 'P1', optionIndex: 0, heroId: 'h0', focusUsed: 1 });
    expect(shared.event?.result?.results).toEqual(soloR.event?.result?.results);
    expect(shared.rngState).toBe(soloR.rngState);
  });

  it('押し直し: 自分の票を取り消す（VOTE null）・別の選択肢に入れ直せる。もう決まった後は、古い票（CHOOSE_EVENT）は捨てる', () => {
    const g = scene(['warrior', 'mage'], ['P1', 'P2']);
    let s = ok(g, vote('P1', 0));
    s = ok(s, { type: 'VOTE', playerId: 'P1', command: null });
    expect(s.vote?.picks.P1).toBeUndefined();
    s = ok(s, vote('P1', 1));
    s = ok(s, vote('P1', 0));
    expect((s.vote?.picks.P1 as { optionIndex: number }).optionIndex).toBe(0);
    s = ok(s, vote('P2', 0));
    expect(s.event?.decided?.optionIndex).toBe(0);
    // 挑む段に届いた古い票（別の端末が遅れて送った物）は断る。状態は変わらない
    const late = run(s, vote('P2', 1));
    expect(late.error).toMatch(/決まりました/);
    // 目印に「決まった選択肢」が入る（選ぶ段の票と混ざらない）
    expect(voteCtx(s)).not.toBe(voteCtx(g));
  });

  it('任せる: 挑む役の持ち主だけが、heroId = 今の挑む役・toHeroId = 任せる先で送る。任された持ち主が挑む', () => {
    const g = scene(['warrior', 'mage'], ['P1', 'P2']);
    let s = ok(ok(g, vote('P1', 0)), vote('P2', 0));
    expect(run(s, { type: 'EVENT_HANDOVER', playerId: 'P2', heroId: 'h0', toHeroId: 'h1' }).error).toMatch(/担当/);
    expect(run(s, { type: 'EVENT_HANDOVER', playerId: 'P1', heroId: 'h0', toHeroId: 'h0' }).error).toMatch(/任せられません/);
    s = ok(s, { type: 'EVENT_HANDOVER', playerId: 'P1', heroId: 'h0', toHeroId: 'h1' });
    expect(eventChallenger(s)?.id).toBe('h1');
    expect(run(s, { type: 'EVENT_CHALLENGE', playerId: 'P1', heroId: 'h0', focusUsed: 0 }).error).toMatch(/挑むのは/);
    s = ok(s, { type: 'EVENT_CHALLENGE', playerId: 'P2', heroId: 'h1', focusUsed: 0 });
    expect(s.event?.result?.heroId).toBe('h1');
  });

  it('選び直す: 挑む役の持ち主だけが戻せる。戻ると選ぶ段から（票は空）', () => {
    const g = scene(['warrior', 'mage'], ['P1', 'P2']);
    let s = ok(ok(g, vote('P1', 0)), vote('P2', 0));
    expect(run(s, { type: 'EVENT_RECHOOSE', playerId: 'P2', heroId: 'h0' }).error).toMatch(/担当/);
    s = ok(s, { type: 'EVENT_RECHOOSE', playerId: 'P1', heroId: 'h0' });
    expect(s.event?.decided).toBeUndefined();
    expect(s.vote).toBeUndefined();
    s = ok(ok(s, vote('P1', 1)), vote('P2', 1));
    expect(s.event?.result?.optionIndex).toBe(1);
  });

  it('判定の無い選択肢は、決まったらすぐ実行（今までどおり）', () => {
    const g = scene(['warrior', 'mage'], ['P1', 'P2']);
    const s = ok(ok(g, vote('P1', 1)), vote('P2', 1));
    expect(s.event?.decided).toBeUndefined();
    expect(s.event?.result?.optionIndex).toBe(1);
  });

  it('挑む役が倒れた・場面にいない時は、次に得意なキャラ。同点はパーティの並び順', () => {
    const g = scene(['warrior', 'warrior', 'mage'], ['P1', 'P2', 'P2']);
    // 同じ職業（同じ成功率）: 並び順で h0
    expect(statChance(g.heroes[0], 'str', 'obstacle', true)).toBe(statChance(g.heroes[1], 'str', 'obstacle', true));
    let s = ok(ok(g, vote('P1', 0)), vote('P2', 0));
    expect(s.event?.decided?.heroId).toBe('h0');
    s.heroes[0].hp = 0;
    expect(eventChallenger(s)?.id).toBe('h1');
    // 倒れたキャラの名前では挑めない。次の挑む役の持ち主（P2）が挑める
    expect(run(s, { type: 'EVENT_CHALLENGE', playerId: 'P1', heroId: 'h0', focusUsed: 0 }).error).toBeDefined();
    s = ok(s, { type: 'EVENT_CHALLENGE', playerId: 'P2', heroId: 'h1', focusUsed: 0 });
    expect(s.event?.result?.heroId).toBe('h1');
  });

  it('3人・4人: 選択肢は多数決（同じ数なら先頭の人）。挑む段は1人', () => {
    for (const n of [3, 4]) {
      const seats = SEATS.slice(0, n);
      const g = scene(seats.map((_, i) => (i === n - 1 ? 'warrior' : 'mage')), seats);
      let s = g;
      // 1人だけ「迂回」、残りは「押しのける」
      for (const p of seats) s = ok(s, vote(p, p === 'P1' ? 1 : 0));
      expect(s.event?.decided?.optionIndex).toBe(0);
      const who = eventChallenger(s)!;
      expect(who.id).toBe(`h${n - 1}`);
      // 挑む役の持ち主以外は、だれも挑めない
      for (const p of seats.filter((x) => x !== who.playerId)) expect(run(s, { type: 'EVENT_CHALLENGE', playerId: p, heroId: who.id, focusUsed: 0 }).error).toBeDefined();
      s = ok(s, { type: 'EVENT_CHALLENGE', playerId: who.playerId, heroId: who.id, focusUsed: 0 });
      expect(s.event?.result?.heroId).toBe(who.id);
    }
  });

  it('保存して再開（JSON で読み直し）: 選ぶ段の途中・挑む段の途中でも、同じ結果', () => {
    const g = scene(['warrior', 'mage'], ['P1', 'P2']);
    const half = ok(g, vote('P2', 0));
    const reload = (x: GameState) => JSON.parse(JSON.stringify(x)) as GameState;
    const a = ok(ok(half, vote('P1', 0)), { type: 'EVENT_CHALLENGE', playerId: 'P1', heroId: 'h0', focusUsed: 1 });
    const b1 = ok(reload(half), vote('P1', 0));
    const b = ok(reload(b1), { type: 'EVENT_CHALLENGE', playerId: 'P1', heroId: 'h0', focusUsed: 1 });
    expect(b.event?.result).toEqual(a.event?.result);
    expect(b.rngState).toBe(a.rngState);
    expect(reload(b1).event?.decided).toEqual(b1.event?.decided);
  });

  it('古い保存（投票の途中。票にキャラとフォーカスが入っている形）を読んでも止まらない', () => {
    const g = scene(['warrior', 'mage'], ['P1', 'P2'], ['h1', 'h0']);
    const s = structuredClone(g);
    s.activeScene = '探索中';
    // 前の版の票: P2 が自分の魔道士・フォーカス1 で入れていた
    s.vote = { ctx: voteCtx(s), picks: { P2: { type: 'CHOOSE_EVENT', playerId: 'P2', optionIndex: 0, heroId: 'h1', focusUsed: 1 } } };
    delete s.activeScene;
    const old = JSON.parse(JSON.stringify(s)) as GameState;
    const r = ok(old, vote('P1', 0));
    // 前の版の中身（P2 の魔道士・フォーカス1）では回さず、挑む段に進む
    expect(r.event?.result).toBeUndefined();
    expect(r.event?.decided).toEqual({ optionIndex: 0, heroId: 'h0' });
    expect(r.heroes[1].focus).toBe(g.heroes[1].focus);
  });

  it('1人で遊ぶ時（プレイヤー1人・キャラ2人）は今までどおり: 選ぶ → キャラとフォーカス → 挑戦（1回で決まる）', () => {
    const g = scene(['warrior', 'mage'], ['P1', 'P1']);
    expect(needsVote(g, { type: 'CHOOSE_EVENT', playerId: 'P1', optionIndex: 0, focusUsed: 0 })).toBe(false);
    const s = ok(g, { type: 'CHOOSE_EVENT', playerId: 'P1', optionIndex: 0, heroId: 'h1', focusUsed: 1 });
    expect(s.event?.decided).toBeUndefined();
    expect(s.event?.result?.heroId).toBe('h1');
  });
});

describe('画面から送る形（actorOf。CLAUDE.md §7・点検 F1）', () => {
  /** 挑む役が P2 のキャラ（h1 が戦士）の挑む段 */
  const decidedOnP2 = () => {
    const g = scene(['mage', 'warrior'], ['P1', 'P2']);
    const s = ok(ok(g, vote('P1', 0)), vote('P2', 0));
    expect(s.event?.decided?.heroId).toBe('h1');
    return s;
  };

  it('1台で2人: 挑む役が P2 のキャラでも、挑戦する・任せる・選び直すが通る', () => {
    setLocalPlayers(null);
    const s = decidedOnP2();
    expect(fromScreen(s, { type: 'EVENT_CHALLENGE', playerId: 'P1', heroId: 'h1', focusUsed: 1 }).error).toBeUndefined();
    const handed = fromScreen(s, { type: 'EVENT_HANDOVER', playerId: 'P1', heroId: 'h1', toHeroId: 'h0' });
    expect(handed.error).toBeUndefined();
    expect(handed.state.event?.decided?.heroId).toBe('h0');
    expect(fromScreen(handed.state, { type: 'EVENT_CHALLENGE', playerId: 'P1', heroId: 'h0', focusUsed: 0 }).error).toBeUndefined();
    expect(fromScreen(s, { type: 'EVENT_RECHOOSE', playerId: 'P1', heroId: 'h1' }).error).toBeUndefined();
  });

  it('オンライン: 持ち主（P2 の端末）だけが通る。P1 の端末から送ると P1 として送られて断られる', () => {
    const s = decidedOnP2();
    setLocalPlayers(['P2']);
    expect(fromScreen(s, { type: 'EVENT_CHALLENGE', playerId: 'P1', heroId: 'h1', focusUsed: 0 }).error).toBeUndefined();
    setLocalPlayers(['P1']);
    // 画面は P1 の端末にはボタンを出さないが、送っても通らない（持ち主として送られるので、部屋の手前の確かめで止まる。エンジンは P2 の操作として受ける）
    expect(actorOf({ ...s, activeScene: '探索中' }, { type: 'EVENT_CHALLENGE', playerId: 'P1', heroId: 'h1', focusUsed: 0 })).toBe('P2');
  });

  it('ホストの「代わりに操作」（P2 が切断。ホストの端末が P1・P2 を動かす）: 挑戦する・任せる・選び直すが通る', () => {
    const s = decidedOnP2();
    setLocalPlayers(['P1', 'P2']);
    for (const cmd of [
      { type: 'EVENT_CHALLENGE', playerId: 'P1', heroId: 'h1', focusUsed: 0 },
      { type: 'EVENT_HANDOVER', playerId: 'P1', heroId: 'h1', toHeroId: 'h0' },
      { type: 'EVENT_RECHOOSE', playerId: 'P1', heroId: 'h1' },
    ] as GameCommand[]) {
      expect(actorOf({ ...s, activeScene: '探索中' }, cmd)).toBe('P2');
      expect(fromScreen(s, cmd).error).toBeUndefined();
    }
  });

  it('票の取り消し（VOTE null）は、その席として送られる（代わりに操作している席も）', () => {
    const g = scene(['mage', 'warrior'], ['P1', 'P2']);
    setLocalPlayers(['P1', 'P2']);
    const s = { ...g, activeScene: '探索中' };
    expect(actorOf(s, { type: 'VOTE', playerId: 'P2', command: null })).toBe('P2');
    setLocalPlayers(['P1']);
    expect(actorOf(s, { type: 'VOTE', playerId: 'P2', command: null })).toBe('P1');
  });
});

describe('払う選択肢（2人以上。オーナーの返事: 払えるキャラのうち並び順で最初のキャラ）', () => {
  /** 行商人（0 = 回復薬 30G・1 = 掘り出し物 90G） */
  const merchant = (gold: number[]) => {
    const g = scene(['warrior', 'mage'], ['P1', 'P2'], undefined, 'wanderingMerchant');
    g.heroes.forEach((h, i) => (h.gold = gold[i]));
    return g;
  };

  it('払えない人も「払う選択肢」に票を入れられる。払うのは払える最初のキャラ', () => {
    const g = merchant([0, 100]);
    expect(eventPayer(g, 1)?.id).toBe('h1');
    let s = ok(g, vote('P1', 1));
    s = ok(s, vote('P2', 1));
    expect(s.event?.result?.optionIndex).toBe(1);
    expect(s.heroes[0].gold).toBe(0);
    expect(s.heroes[1].gold).toBe(10);
  });

  it('2人とも払える時は並び順で最初のキャラ（先頭の人の票でなくても）', () => {
    const g = merchant([100, 100]);
    let s = ok(g, vote('P2', 0));
    s = ok(s, vote('P1', 0));
    expect(s.heroes[0].gold).toBe(70);
    expect(s.heroes[1].gold).toBe(100);
  });

  it('だれも払えない選択肢には票を入れられない', () => {
    const g = merchant([10, 10]);
    expect(run(g, vote('P1', 1)).error).toMatch(/ゴールド/);
  });
});

describe('bot（F9）: 2人以上の bot も、挑む段で止まらない', () => {
  it('2人・3人の組で、イベントの挑む段を通って先へ進む', () => {
    for (const n of [2, 3]) {
      const seats = SEATS.slice(0, n);
      let g = scene(seats.map(() => 'warrior'), seats);
      g.activeScene = '探索中';
      // 選ぶ段 → 挑む段 → 結果 まで、bot の1手ずつで進む
      const log: BotLog = { steps: 0, errors: [], modes: {} };
      for (let i = 0; i < n + 2 && !g.event?.result; i++) {
        g = botStep(g, log, { interacted: new Set() }, true);
        g.activeScene = '探索中';
      }
      expect(log.errors).toEqual([]);
      expect(g.event?.result).toBeDefined();
    }
  });
});
