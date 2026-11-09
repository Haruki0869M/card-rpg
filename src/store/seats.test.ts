import { describe, expect, it } from 'vitest';
import type { PlayerId } from '../types';
import { assignSeats, seatModeOf } from './seats';

const party = (n: number) => Array.from({ length: n }, (_, i): { classId: string; name: string; playerId?: PlayerId } => ({ classId: 'warrior', name: `p${i}` }));

describe('担当プレイヤーの2択（フェーズ3）', () => {
  it('1人で全員を操作 → 全員 P1、スマホを回して → P1・P2…', () => {
    expect(assignSeats(party(4), 'solo').map((m) => m.playerId)).toEqual(['P1', 'P1', 'P1', 'P1']);
    expect(assignSeats(party(4), 'pass').map((m) => m.playerId)).toEqual(['P1', 'P2', 'P3', 'P4']);
    expect(assignSeats(party(2), 'pass').map((m) => m.playerId)).toEqual(['P1', 'P2']);
    // ほかの中身は変えない
    expect(assignSeats(party(2), 'pass')[1].name).toBe('p1');
  });
  it('今の形を見分ける（何も決めていない時は「1人で全員」= 今までと同じ）', () => {
    expect(seatModeOf(party(3))).toBe('solo');
    expect(seatModeOf(assignSeats(party(3), 'pass'))).toBe('pass');
    expect(seatModeOf([{ playerId: 'P1' }, { playerId: 'P1' }, { playerId: 'P2' }])).toBe('custom');
  });
});
