// フェーズ2-A: 町で買った装備を「すぐ装備」する（今の EQUIP の操作）・転職の条件の表示・買った時のお知らせ
import { afterEach, describe, expect, it } from 'vitest';
import { getItem } from '../../data/items';
import { applyGameCommand, canEquip, createGame, jobOptions } from '../../engine';
import { actorOf, setLocalPlayers } from '../../store/battleConfig';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { jobRequirements } from '../JobSheet';
import { boughtNotice } from './BuyNotice';

afterEach(() => setLocalPlayers(null));

function send(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, { ...cmd, playerId: actorOf(g, cmd) } as GameCommand);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}

/** P1・P2 の2人で王都に入る（1台を回して遊ぶ形） */
function inCapital(players: PlayerId[] = ['P1', 'P2']) {
  let g = createGame({ seed: 6, scenarioId: 'corruptionKing', difficulty: 'normal', party: players.map((playerId, i) => ({ playerId, classId: i ? 'mage' : 'warrior', gender: 'male', name: `仲間${i}` })) });
  g = send(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  for (const h of g.heroes) h.gold = 5000;
  // 担当の違う仲間は、誘って承知してもらうと一緒に町に入る
  const lead = g.world!.turn, other = g.heroes.find((h) => h.id !== lead)!.id;
  g = send(g, { type: 'WORLD_INVITE', playerId: 'P1', heroId: lead, targetId: other });
  g = send(g, { type: 'WORLD_INVITE_ANSWER', playerId: 'P1', heroId: other, accept: true });
  return send(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: g.world!.turn, party: g.heroes.map((h) => h.id) });
}

/** そのキャラが装備できる品物の番号 */
const equipIndex = (g: GameState, heroId: string) => {
  const h = g.heroes.find((x) => x.id === heroId)!;
  return g.world!.shops[g.town!.townId].items.findIndex((s) => !s.sold && getItem(s.item.itemId).slot !== 'consumable' && !canEquip(h, getItem(s.item.itemId)));
};

describe('町で買った装備を、すぐ装備する（フェーズ2-A）', () => {
  it('1台で P2 のキャラが買って、すぐ装備できる（画面が P1 として送っても、担当の P2 として届く）', () => {
    let g = inCapital();
    expect(g.mode).toBe('town');
    const i = equipIndex(g, 'h1');
    expect(i).toBeGreaterThanOrEqual(0);
    const entry = g.world!.shops[g.town!.townId].items[i];
    const slot = getItem(entry.item.itemId).slot as 'weapon' | 'armor' | 'accessory';
    const before = g.heroes[1].equipment[slot]?.uid;
    g = send(g, { type: 'TOWN_BUY', playerId: 'P1', heroId: 'h1', kind: 'item', index: i });
    expect(g.heroes[1].stash.some((x) => x.uid === entry.item.uid)).toBe(true);
    g = send(g, { type: 'EQUIP', playerId: 'P1', heroId: 'h1', itemUid: entry.item.uid });
    expect(g.heroes[1].equipment[slot]?.uid).toBe(entry.item.uid);
    // 前の装備は持ち物に戻る
    if (before) expect(g.heroes[1].stash.some((x) => x.uid === before)).toBe(true);
    expect(g.mode).toBe('town');
  });
  it('オンライン（この端末は P2）でも、P2 のキャラとして送られる', () => {
    const g = inCapital();
    setLocalPlayers(['P2']);
    expect(actorOf(g, { type: 'EQUIP', playerId: 'P2', heroId: 'h1', itemUid: 'x' })).toBe('P2');
  });
  it('ほかの人のキャラの装備は変えられない（オンライン）', () => {
    const g = inCapital();
    const i = equipIndex(g, 'h1');
    const entry = g.world!.shops[g.town!.townId].items[i];
    const bought = send(g, { type: 'TOWN_BUY', playerId: 'P2', heroId: 'h1', kind: 'item', index: i });
    expect(applyGameCommand(bought, { type: 'EQUIP', playerId: 'P1', heroId: 'h1', itemUid: entry.item.uid }).error).toBeDefined();
  });
});

describe('買った時のお知らせ', () => {
  it('装備品は「すぐ装備」の窓、道具・カードは短い文', () => {
    expect(boughtNotice(1, 'レオン', 'h0', { kind: 'card', cardName: '払い斬り' })).toEqual({ id: 1, kind: 'text', text: '「払い斬り」をレオンの山札に加えた！' });
    expect(boughtNotice(2, 'レオン', 'h0', { kind: 'item', itemUid: 'i1', itemId: 'holyWater' })).toMatchObject({ kind: 'text', text: expect.stringContaining('道具袋へ') });
    const g = inCapital();
    const i = equipIndex(g, 'h0');
    const it = g.world!.shops[g.town!.townId].items[i].item;
    expect(boughtNotice(3, 'レオン', 'h0', { kind: 'item', itemUid: it.uid, itemId: it.itemId })).toMatchObject({ kind: 'equip', heroId: 'h0', itemUid: it.uid });
  });
});

describe('転職の条件の表示（同じ文を2回出さない）', () => {
  function master(level: number, perfects: number) {
    const g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'swordmaster', gender: 'male', name: 'レオン', playerId: 'P1' }] });
    g.heroes[0].level = level;
    g.heroes[0].feats = { perfects };
    return g;
  }
  const saint = (g: GameState) => jobOptions(g.heroes[0], g).find((o) => o.job.id === 'swordSaint')!;
  it('レベルも条件も足りない時: 2行とも ✗、条件の進み具合 7/15', () => {
    const g = master(3, 7);
    const o = saint(g);
    expect(o.needLevel).toBe(4);
    expect(o.count).toBe(15);
    expect(o.progress).toBe(7);
    expect(jobRequirements(o, 3)).toEqual([
      { ok: false, text: 'Lv4以上（今 Lv3）' },
      { ok: false, text: '完全成功15回', now: 7, need: 15 },
    ]);
  });
  it('レベルだけ足りる時・両方そろった時', () => {
    expect(jobRequirements(saint(master(5, 7)), 5).map((r) => r.ok)).toEqual([true, false]);
    const o = saint(master(4, 15));
    expect(jobRequirements(o, 4).map((r) => r.ok)).toEqual([true, true]);
    expect(o.qualified).toBe(true);
  });
});
