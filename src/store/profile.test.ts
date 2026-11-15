import { describe, expect, it } from 'vitest';
import { createGame, stateHash } from '../engine';
import { isScenarioUnlocked as rawUnlocked } from '../data/scenarios';

// 解放の条件そのものの決まりは、全部開ける設定（OPEN_ALL_SCENARIOS）を外して確かめる
const isScenarioUnlocked = (sc: Parameters<typeof rawUnlocked>[0], cleared?: readonly string[]) => rawUnlocked(sc, cleared, false);
import type { GameState, PlayerId } from '../types';
import { canBeMyPet, clearedScenarioIds, collectSightings, emptyProfile, isNewPetCoat, mergeSightings, normalizeProfile, setMyPet, uchinokoTotals } from './profile';

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

  it('うちの子図鑑: 自分のキャラのお供を1匹ずつ、名前・懐き度・思い出と一緒に残す', () => {
    const g = game();
    g.heroes[0].pet = { petId: 'cockatiel', color: 'lutino', name: 'ぴー', love: 20, acts: 2 };
    g.heroes[1].pet = { petId: 'owl', color: 'brown', name: 'ほー', love: 0, acts: 0 };
    let p = mergeSightings(emptyProfile(), collectSightings(g, onlyP1));
    expect(p.uchinoko).toHaveLength(1); // P2 のお供は載せない
    const e = p.uchinoko[0];
    expect(e).toMatchObject({ petId: 'cockatiel', color: 'lutino', name: 'ぴー', love: 20, scenarioId: 'corruptionKing' });
    expect(canBeMyPet(e)).toBe(false);
    expect(setMyPet(p, e.uid, true)).toBe(p); // 条件を満たさない子は登録しない
    // ダンジョンを一緒に3回クリア（1回の冒険の中でもよい）
    g.heroes[0].pet!.dungeonClears = 3;
    g.heroes[0].pet!.acts = 5;
    p = mergeSightings(p, collectSightings(g, onlyP1));
    expect(p.uchinoko).toHaveLength(1);
    expect(uchinokoTotals(p.uchinoko[0])).toEqual({ adventures: 1, clears: 0, dungeonClears: 3, acts: 5 });
    expect(canBeMyPet(p.uchinoko[0])).toBe(true);
    p = setMyPet(p, e.uid, true);
    expect(p.myPets).toEqual([e.uid]);
    // クリアで思い出に残る。同じ観察を繰り返しても変わらない
    g.mode = 'ending';
    p = mergeSightings(p, collectSightings(g, onlyP1));
    expect(uchinokoTotals(p.uchinoko[0]).clears).toBe(1);
    expect(mergeSightings(p, collectSightings(g, onlyP1))).toBe(p);
    // 次の冒険でマイペットとして呼んだ子は、同じ子として思い出が増える
    const g2 = createGame({ seed: 99, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'mage', gender: 'male', name: 'c', playerId: 'P1' }] });
    g2.heroes[0].pet = { petId: 'cockatiel', color: 'lutino', name: 'ぴー', love: 140, acts: 1, myPetUid: e.uid };
    p = mergeSightings(p, collectSightings(g2, all));
    expect(p.uchinoko).toHaveLength(1);
    expect(p.uchinoko[0].love).toBe(140);
    expect(uchinokoTotals(p.uchinoko[0])).toMatchObject({ adventures: 2, clears: 1, acts: 6 });
    // 保存して読み直しても同じ
    expect(normalizeProfile(JSON.parse(JSON.stringify(p)))).toEqual(p);
    expect(setMyPet(p, e.uid, false).myPets).toEqual([]);
  });

  it('♡5の子はダンジョンをクリアしていなくても登録できる。壊れたうちの子の記録は捨てる', () => {
    const p = normalizeProfile({ uchinoko: [{ uid: 'a', petId: 'owl', color: 'brown', name: 'ほー', love: 130, runs: {} }, { uid: 'a', petId: 'x', color: 'y' }, { petId: 'no-uid' }], myPets: ['a', 'ghost'] });
    expect(p.uchinoko).toHaveLength(1);
    expect(p.myPets).toEqual(['a']);
    expect(canBeMyPet(p.uchinoko[0])).toBe(true);
  });
});

describe('お供を迎える画面の NEW!（フェーズ3）', () => {
  it('迎えたことのない種類・毛色だけ NEW。出会っただけ（seen）なら NEW のまま', () => {
    const p = emptyProfile();
    expect(isNewPetCoat(p, 'cockatiel', 'lutino')).toBe(true);
    p.pets.seen.push('cockatiel:lutino');
    expect(isNewPetCoat(p, 'cockatiel', 'lutino')).toBe(true);
    p.pets.got.push('cockatiel:lutino');
    expect(isNewPetCoat(p, 'cockatiel', 'lutino')).toBe(false);
    expect(isNewPetCoat(p, 'cockatiel', 'pearl')).toBe(true);
    expect(isNewPetCoat(p, 'rabbit', 'lutino')).toBe(true);
  });
});
