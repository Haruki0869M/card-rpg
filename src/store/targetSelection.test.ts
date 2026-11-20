import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBattle, createGame } from '../engine';
import { giveHand, setup } from '../engine/__tests__/helpers';
import { useBattle } from './battleStore';
import { setLocalPlayers } from './battleConfig';

const values = vi.hoisted(() => {
  const map = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k,v), removeItem: (k: string) => map.delete(k) });
  return map;
});
afterEach(() => { setLocalPlayers(null); useBattle.getState().abandonGame(); vi.useRealTimers(); });
function load() {
  vi.useFakeTimers();
  const g = createGame({ seed: 2, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'priest', gender: 'male', name: '回復役', playerId: 'P1' }] });
  const b = createBattle(setup(2, ['priest','warrior','mage']));
  b.allies[1].playerId = 'P2'; b.allies[2].playerId = 'P3'; b.allies[1].hp = 1;
  giveHand(b, b.allies[0].id, ['mend']); b.allies[0].mana = 5;
  g.mode = 'battle'; g.battle = b; useBattle.getState().loadRemote(g); useBattle.setState({ activeId: b.allies[0].id });
  return b;
}
describe('対象選択の画面状態', () => {
  it('最低HPを初期選択し、他人の味方をタップしても操作キャラは変わらない', () => {
    const b = load(); setLocalPlayers(['P1']);
    useBattle.getState().tapCard('t0'); expect(useBattle.getState().selection?.targetId).toBe(b.allies[1].id);
    useBattle.getState().setActive(b.allies[2].id);
    expect(useBattle.getState().selection?.targetId).toBe(b.allies[2].id); expect(useBattle.getState().activeId).toBe(b.allies[0].id);
  });
  it('同じカードの再タップは使用せず取消し、マナ・乱数を消費しない', () => {
    load(); const before = structuredClone(useBattle.getState().full);
    useBattle.getState().tapCard('t0'); useBattle.getState().tapCard('t0');
    expect(useBattle.getState().selection).toBeNull(); expect(useBattle.getState().full).toEqual(before);
  });
  it('複合カードの味方選択は敵の選択を消さない', () => {
    const b = load(); giveHand(b, b.allies[0].id, ['sanctify']);
    useBattle.setState({ battle: b }); useBattle.getState().tapCard('t0');
    useBattle.getState().tapEnemy(b.enemies[1].uid); useBattle.getState().setActive(b.allies[2].id);
    expect(useBattle.getState().selection?.targetId).toBe(b.enemies[1].uid);
    expect(useBattle.getState().selection?.allyTargetId).toBe(b.allies[2].id);
  });
  it('選んだ他人のキャラへ回復できる', () => {
    const b = load(); setLocalPlayers(['P1']); useBattle.getState().tapCard('t0');
    useBattle.getState().setActive(b.allies[2].id); useBattle.getState().confirm();
    expect(useBattle.getState().selection).toBeNull(); expect(useBattle.getState().full!.battle!.allies[0].hand).toHaveLength(0);
  });
  it('つづきから: 保存した時に選んでいたキャラを保つ（勝った後の画面でも・行動済みなら次のキャラへ）', () => {
    const b = load(); setLocalPlayers(['P1']); b.allies[1].playerId = 'P1'; b.allies[1].hp = 20; giveHand(b, b.allies[1].id, ['mend']); b.allies[1].mana = 5;
    const before = structuredClone(useBattle.getState().full);
    // 味方の番の途中: 2人目を選んだまま再開 → 2人目のまま
    useBattle.setState({ activeId: b.allies[1].id }); useBattle.getState().continueGame();
    expect(useBattle.getState().activeId).toBe(b.allies[1].id);
    // 勝った後の画面（もう誰も行動できない）: 2人目のまま
    b.phase = 'victory'; useBattle.setState({ activeId: b.allies[1].id }); useBattle.getState().continueGame();
    expect(useBattle.getState().activeId).toBe(b.allies[1].id);
    // 選んでいたキャラが倒れている・他の人のキャラ・保存に無い時は、これまでどおり自分の先頭のキャラ
    b.phase = 'ally'; b.allies[1].dead = true; useBattle.getState().continueGame();
    expect(useBattle.getState().activeId).toBe(b.allies[0].id);
    useBattle.setState({ activeId: b.allies[2].id }); useBattle.getState().continueGame();
    expect(useBattle.getState().activeId).toBe(b.allies[0].id);
    useBattle.setState({ activeId: '' }); useBattle.getState().continueGame();
    expect(useBattle.getState().activeId).toBe(b.allies[0].id);
    // ゲームの中身は変わらない（dead と phase はテストが書き換えた分だけ戻して比べる）
    b.allies[1].dead = false;
    expect(useBattle.getState().full).toEqual(before);
  });
  it('冒険の初期化は保存待ちも取り消し、古いデータを復活させない', () => {
    load(); useBattle.getState().continueGame(); useBattle.getState().abandonGame(); useBattle.getState().setScreen('setup'); vi.runAllTimers();
    expect(useBattle.getState().screen).toBe('setup'); expect(useBattle.getState().full).toBeNull(); expect(values.has('card-rpg/adventure')).toBe(false);
  });
  it('P1が入った町でも、P2の受け渡しをP2の担当として送れる', () => {
    vi.useFakeTimers();
    const g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: [
      { classId: 'warrior', gender: 'male', name: '先頭', playerId: 'P1' },
      { classId: 'mage', gender: 'female', name: '同行者', playerId: 'P2' },
    ] });
    g.mode = 'town'; g.town = { townId: 'royalCapital', heroId: 'h0', members: ['h0','h1'] }; g.party = ['h0','h1'];
    g.heroes[1].gold = 100;
    useBattle.getState().loadRemote(g);
    expect(useBattle.getState().dispatchGame({ type: 'GIVE', playerId: 'P1', fromHeroId: 'h1', toHeroId: 'h0', gold: 10 })).toBeUndefined();
    expect(useBattle.getState().full!.heroes.map(h => h.gold)).toEqual([40,90]);
  });
});
