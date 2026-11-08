// フェーズ1の2回目: 回復の最初の相手・ターン終了の確認・予告の宛先の名前
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBattle, createGame, predictCardTotals } from '../engine';
import { giveHand, setup } from '../engine/__tests__/helpers';
import { shortName } from '../components/battle/Battlefield';
import { canStillAct, useBattle } from './battleStore';
import { setLocalPlayers } from './battleConfig';
import { incomingDamage, pickAllyTarget } from './healTarget';
import type { BattleState } from '../types';

vi.hoisted(() => {
  const map = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k, v), removeItem: (k: string) => map.delete(k) });
});
afterEach(() => { setLocalPlayers(null); useBattle.getState().abandonGame(); vi.useRealTimers(); });

function load(b: BattleState) {
  vi.useFakeTimers();
  const g = createGame({ seed: 2, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'priest', gender: 'male', name: '回復役', playerId: 'P1' }] });
  g.mode = 'battle'; g.battle = b; useBattle.getState().loadRemote(g); useBattle.setState({ activeId: b.allies[0].id });
}
/** 敵全員の狙いを、この味方に向ける（予告のダメージの合計を大きくする） */
function aimAll(b: BattleState, allyId: string) {
  for (const e of b.enemies) if (e.intent) e.intent.targetId = allyId;
}

describe('回復の最初の相手', () => {
  it('HPが減っている味方のうち、割合が一番低い味方', () => {
    const b = createBattle(setup(2, ['priest', 'warrior', 'mage']));
    b.allies[1].hp = Math.floor(b.allies[1].maxHp * 0.8); b.allies[2].hp = Math.floor(b.allies[2].maxHp * 0.5);
    aimAll(b, b.allies[1].id);
    expect(pickAllyTarget(b, b.allies)).toBe(b.allies[2].id);
  });
  it('全員満タンなら、敵の予告のダメージの合計が一番大きい味方', () => {
    const b = createBattle(setup(2, ['priest', 'warrior', 'mage']));
    aimAll(b, b.allies[2].id);
    expect(incomingDamage(b, b.allies[2].id)).toBeGreaterThan(incomingDamage(b, b.allies[0].id));
    expect(pickAllyTarget(b, b.allies)).toBe(b.allies[2].id);
  });
  it('カードを選んだ時の最初の相手も同じ順で選ばれる', () => {
    const b = createBattle(setup(2, ['priest', 'warrior', 'mage']));
    giveHand(b, b.allies[0].id, ['mend']); b.allies[0].mana = 5; aimAll(b, b.allies[1].id);
    load(b);
    useBattle.getState().tapCard('t0');
    expect(useBattle.getState().selection?.targetId).toBe(b.allies[1].id);
  });
  it('満タンの相手でも、回復の力（HPを1にして試した値）を予測できる。元の状態は変えない', () => {
    const b = createBattle(setup(2, ['priest', 'warrior']));
    giveHand(b, b.allies[0].id, ['mend']); b.allies[0].mana = 5;
    const before = structuredClone(b);
    const now = predictCardTotals(b, b.allies[0].id, 't0', b.allies[1].id, 0, 1);
    const hurt = predictCardTotals(b, b.allies[0].id, 't0', b.allies[1].id, 0, 1, undefined, true);
    expect(now.every((t) => t.heal[1] === 0)).toBe(true);
    expect(hurt.find((t) => t.id === b.allies[1].id)!.heal[1]).toBeGreaterThan(0);
    expect(b).toEqual(before);
  });
});

describe('ターン終了の確認', () => {
  it('まだ行動できる仲間がいる時は、確認の窓を出して終えない。「ターンを終了する」で終える', () => {
    const b = createBattle(setup(2, ['warrior', 'mage'])); b.allies[1].playerId = 'P2';
    load(b);
    useBattle.getState().endTurn();
    expect(useBattle.getState().confirmEndTurn).toBe(true);
    expect(useBattle.getState().full!.battle!.phase).toBe('ally');
    useBattle.getState().endTurn(true);
    expect(useBattle.getState().confirmEndTurn).toBe(false);
    expect(useBattle.getState().full!.battle!.phase).toBe('enemy');
  });
  it('使えるカードが0枚なら、確認なしですぐ終える（1台で P2 の担当がいても止まらない）', () => {
    const b = createBattle(setup(2, ['warrior', 'mage'])); b.allies[1].playerId = 'P2';
    for (const a of b.allies) a.hand = [];
    load(b);
    expect(canStillAct(useBattle.getState().battle)).toBe(false);
    useBattle.getState().endTurn();
    expect(useBattle.getState().confirmEndTurn).toBe(false);
    expect(useBattle.getState().full!.battle!.phase).toBe('enemy');
  });
  it('オンラインでは自分の担当のキャラだけで判断する（他の人の仲間が動けても聞かない）', () => {
    const b = createBattle(setup(2, ['warrior', 'mage'])); b.allies[1].playerId = 'P2';
    b.allies[0].hand = [];
    setLocalPlayers(['P1']);
    expect(canStillAct(b)).toBe(false);
    setLocalPlayers(['P2']);
    expect(canStillAct(b)).toBe(true);
  });
});

describe('予告の宛先の名前', () => {
  it('短い名前はそのまま、長い名前は4文字＋「…」', () => {
    expect(shortName('レオン')).toBe('レオン');
    expect(shortName('ルーシア')).toBe('ルーシア');
    expect(shortName('アレクサンドラ')).toBe('アレクサ…');
  });
});
