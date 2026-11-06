// ===== オンライン協力の準備（準備完了・状態の要約） =====
import { describe, expect, it } from 'vitest';
import type { BattleState, Command } from '../../types';
import { applyCommand, createBattle, createGame, stableStringify, stateHash, waitingPlayers } from '../index';
import { playToEnd } from './bot';
import { giveHand, setup } from './helpers';

function twoPlayers(): BattleState {
  const s = setup(4, ['warrior', 'mage', 'hunter']);
  s.party[1].playerId = 'P2';
  s.party[2].playerId = 'P2';
  return createBattle({ ...s, readyCheck: true });
}
const end = (p: 'P1' | 'P2'): Command => ({ type: 'END_TURN', playerId: p });

describe('戦闘の準備完了（全員そろったら敵フェーズ）', () => {
  it('1人が押しただけでは進まない。全員そろうと敵フェーズ', () => {
    let s = twoPlayers();
    expect(waitingPlayers(s)).toEqual(['P1', 'P2']);
    const r = applyCommand(s, end('P1'));
    s = r.state;
    expect(r.events).toContainEqual({ type: 'ready', playerId: 'P1' });
    expect(s.phase).toBe('ally');
    expect(waitingPlayers(s)).toEqual(['P2']);
    // 2回押しても同じ
    s = applyCommand(s, end('P1')).state;
    expect(s.phase).toBe('ally');
    s = applyCommand(s, end('P2')).state;
    expect(s.phase).toBe('enemy');
    expect(s.ready).toEqual([]);
  });
  it('カードを使うと、そのプレイヤーの準備完了は取り消し', () => {
    let s = twoPlayers();
    s = applyCommand(s, end('P1')).state;
    giveHand(s, 'a0', ['strike']);
    s = applyCommand(s, { type: 'PLAY_CARD', playerId: 'P1', characterId: 'a0', cardInstanceId: 't0', targetId: s.enemies[0].uid, focusUsed: 0 }).state;
    expect(waitingPlayers(s)).toEqual(['P1', 'P2']);
  });
  it('キャラが全員戦闘不能のプレイヤーは待たない', () => {
    let s = twoPlayers();
    s.allies[0].dead = true;
    expect(waitingPlayers(s)).toEqual(['P2']);
    s = applyCommand(s, end('P2')).state;
    expect(s.phase).toBe('enemy');
  });
  it('ローカルの戦闘（readyCheck なし）は今までどおり1回で進む', () => {
    const s = createBattle(setup(4));
    expect(applyCommand(s, end('P1')).state.phase).toBe('enemy');
  });
});

describe('オンライン協力の冒険', () => {
  it('online の冒険は、戦闘で準備完了を待つ。自動プレイでも最後まで進む', () => {
    const g0 = createGame({
      seed: 3,
      scenarioId: 'corruptionKing',
      difficulty: 'easy',
      online: true,
      party: [
        { classId: 'warrior', gender: 'male', name: 'A', playerId: 'P1' },
        { classId: 'mage', gender: 'female', name: 'B', playerId: 'P2' },
      ],
    });
    expect(g0.online).toBe(true);
    const { log } = playToEnd(g0, 4000);
    expect(log.errors).toEqual([]);
    expect(log.modes.battle ?? 0).toBeGreaterThan(0);
  }, 60_000);
});

describe('状態の要約', () => {
  it('キーの順番・undefined の項目に左右されない', () => {
    expect(stableStringify({ b: 1, a: [1, { d: 2, c: undefined }] })).toBe('{"a":[1,{"d":2}],"b":1}');
    expect(stateHash({ a: 1, b: 2 })).toBe(stateHash({ b: 2, a: 1, c: undefined }));
    expect(stateHash({ a: 1 })).not.toBe(stateHash({ a: 2 }));
    expect(stateHash({ a: 1 })).toMatch(/^[0-9a-f]{8}$/);
  });
  it('JSON にして戻しても同じ（保存・送信しても比べられる）', () => {
    const s = twoPlayers();
    expect(stateHash(JSON.parse(JSON.stringify(s)))).toBe(stateHash(s));
  });
});
