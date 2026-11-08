import { describe, expect, it } from 'vitest';
import { createGame, stateHash } from '../engine';
import { isScenarioUnlocked } from '../data/scenarios';
import type { GameState, PlayerId } from '../types';
import { clearedScenarioIds, collectSightings, emptyProfile, mergeSightings, normalizeProfile } from './profile';

const game = (): GameState =>
  createGame({
    seed: 7,
    scenarioId: 'corruptionKing',
    difficulty: 'normal',
    party: [
      { classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' },
      { classId: 'mage', gender: 'female', name: 'b', playerId: 'P2' },
    ],
  });
const all = () => true;
const onlyP1 = (p: PlayerId) => p === 'P1';

describe('伝承の書の記録（K5）', () => {
  it('壊れた・空の記録は空から読み、知らない形は捨てる', () => {
    expect(normalizeProfile(null)).toEqual(emptyProfile());
    expect(normalizeProfile('x')).toEqual(emptyProfile());
    const p = normalizeProfile({ cards: { seen: ['a', 1, 'a'], got: ['b'] }, enemies: { kills: { slime: 2, bad: -1, x: 'y' } }, clears: { corruptionKing: 1 }, adventures: -3 });
    expect(p.cards.seen.sort()).toEqual(['a', 'b']);
    expect(p.cards.got).toEqual(['b']);
    expect(p.enemies.kills).toEqual({ slime: 2 });
    expect(p.enemies.seen).toEqual(['slime']);
    expect(p.adventures).toBe(0);
    expect(clearedScenarioIds(p)).toEqual(['corruptionKing']);
  });

  it('記録を集めても冒険の状態（乱数を含む）は変わらない', () => {
    const g = game();
    const before = stateHash(g);
    const json = JSON.stringify(g);
    mergeSightings(emptyProfile(), collectSightings(g, all));
    expect(stateHash(g)).toBe(before);
    expect(JSON.stringify(g)).toBe(json);
  });

  it('見た物は全員分、手に入れた物はこの端末のキャラの分だけ', () => {
    const g = game();
    const p = mergeSightings(emptyProfile(), collectSightings(g, onlyP1));
    expect(p.jobs.got).toEqual(['warrior']);
    expect(p.jobs.seen).toContain('mage');
    const mageCard = g.heroes[1].deck.find((c) => !g.heroes[0].deck.some((d) => d.cardId === c.cardId))!.cardId;
    expect(p.cards.seen).toContain(mageCard);
    expect(p.cards.got).not.toContain(mageCard);
    expect(p.adventures).toBe(1);
  });

  it('同じ冒険・同じ勝利・同じクリアは二重に数えない', () => {
    const g = game();
    let p = mergeSightings(emptyProfile(), collectSightings(g, all));
    const same = mergeSightings(p, collectSightings(g, all));
    expect(same).toBe(p); // 何も増えなければ同じ物（保存しない）
    // 戦闘に勝った
    g.battle = { seed: 5, encounterId: 'e', phase: 'victory', allies: [{ playerId: 'P1' }], enemies: [{ defId: 'slime', hp: 0 }, { defId: 'bat', hp: 3 }] } as unknown as GameState['battle'];
    p = mergeSightings(p, collectSightings(g, all));
    p = mergeSightings(p, collectSightings(g, all));
    expect(p.enemies.kills).toEqual({ slime: 1 });
    expect(p.enemies.seen).toEqual(expect.arrayContaining(['slime', 'bat']));
    // 他の人の戦闘の勝利は数えない
    const other = mergeSightings(emptyProfile(), collectSightings(g, (x) => x === 'P3'));
    expect(other.enemies.kills).toEqual({});
    // クリア
    g.mode = 'ending';
    p = mergeSightings(p, collectSightings(g, all));
    p = mergeSightings(p, collectSightings(g, all));
    expect(p.clears).toEqual({ corruptionKing: 1 });
    expect(p.adventures).toBe(1);
    expect(clearedScenarioIds(p)).toEqual(['corruptionKing']);
  });

  it('お供は色ごとに、候補で会った色も見たとして記録する', () => {
    const g = game();
    g.heroes[0].pet = { petId: 'cockatiel', color: 'normal', name: 'ぴー', love: 0, acts: 0 };
    g.heroes[1].petOffer = ['owl'];
    g.heroes[1].petOfferColors = { owl: 'brown' };
    const p = mergeSightings(emptyProfile(), collectSightings(g, onlyP1));
    expect(p.pets.got).toEqual(['cockatiel:normal']);
    expect(p.pets.seen).toEqual(expect.arrayContaining(['cockatiel:normal', 'owl:brown']));
  });

  it('クリアの記録で、解放の条件のあるシナリオが遊べるようになる（K4 の入口とつなぐ）', () => {
    const locked = { unlocked: false, unlockRequires: { cleared: ['corruptionKing'] } };
    const plain = { unlocked: false };
    const g = game();
    let p = mergeSightings(emptyProfile(), collectSightings(g, all));
    expect(isScenarioUnlocked(locked, clearedScenarioIds(p))).toBe(false);
    g.mode = 'gameover';
    p = mergeSightings(p, collectSightings(g, all));
    expect(isScenarioUnlocked(locked, clearedScenarioIds(p))).toBe(false); // 全滅では解放しない
    const g2 = createGame({ seed: 8, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }] });
    g2.mode = 'ending';
    p = mergeSightings(p, collectSightings(g2, all));
    expect(isScenarioUnlocked(locked, clearedScenarioIds(p))).toBe(true);
    expect(isScenarioUnlocked(plain, clearedScenarioIds(p))).toBe(false); // 条件の無いシナリオは今までどおり
    expect(p.gameovers).toEqual({ corruptionKing: 1 });
    expect(p.adventures).toBe(2);
  });
});
