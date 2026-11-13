// 山札の切り直し（捨札を山札に戻す）は、味方1人につき1ターンに1回まで（点検 2026-11-13 F3 の無限の繰り返しを止める）
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../data/enemies';
import type { BattleState, PlayerId } from '../../types';
import { applyCommand, createBattle, createGame, toPartyMember } from '../index';
import { drawCards } from '../battle/deck';
import { createRng } from '../rng';
import { nextTurn } from './helpers';

ENEMIES.register({ id: 'reshuffleIdler', name: '確認用の置物', icon: 'T', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence',
  actions: [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block', amount: 1 }] }] });

function battle(classId: string, deck: string[], seed: number, noWeapon = true): BattleState {
  const g = createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId, gender: 'female', name: '仲間1', playerId: 'P1' as PlayerId }] });
  const h = g.heroes[0];
  h.deck = deck.map((cardId, i) => ({ uid: `d${i}`, cardId }));
  if (noWeapon) delete h.equipment.weapon;
  return createBattle({ seed, party: g.heroes.map(toPartyMember), encounter: { id: 'rs', name: '確認', enemies: [{ defId: 'reshuffleIdler' }] } });
}

/** ids のカードを、手札にある限り続けて使う（最大 plays 回） */
function loop(s: BattleState, ids: string[], plays: number) {
  let done = 0;
  for (let k = 0; k < plays; k++) {
    const a = s.allies[0];
    const card = a.hand.find((c) => ids.includes(c.cardId));
    if (!card) break;
    const r = applyCommand(s, { type: 'PLAY_CARD', playerId: 'P1', characterId: a.id, cardInstanceId: card.uid, focusUsed: 0 });
    if (r.error) break;
    s = r.state;
    done++;
  }
  return { s, done };
}

describe('山札の切り直しは1ターンに1回', () => {
  it('drawCards: 同じターンの2回目の切り直しはしない（blocked）。次のターンはまた切り直せる', () => {
    const s = battle('warrior', ['strike', 'strike', 'guard', 'guard', 'strike'], 1);
    const a = s.allies[0];
    a.discard.push(...a.drawPile, ...a.hand);
    a.drawPile = [];
    a.hand = [];
    const r1 = drawCards(a, 2, createRng(1), 3);
    expect(r1).toMatchObject({ drawn: 2, reshuffled: true, blocked: false });
    a.discard.push(...a.drawPile, ...a.hand);
    a.drawPile = [];
    a.hand = [];
    const r2 = drawCards(a, 2, createRng(2), 3);
    expect(r2).toMatchObject({ drawn: 0, reshuffled: false, blocked: true });
    const r3 = drawCards(a, 2, createRng(3), 4);
    expect(r3).toMatchObject({ drawn: 2, reshuffled: true, blocked: false });
  });

  // 前は、契約＋詠唱の栞（山札5〜6枚）・小細工×2（5枚）で、1ターンに300回使えた
  it.each([
    ['召喚士 契約＋詠唱の栞＋3枚（5枚）', 'summoner', ['pact', 'axChantMark', 'phantomClaw', 'phantomClaw', 'guard'], ['pact', 'axChantMark']],
    ['召喚士 契約＋詠唱の栞＋4枚（6枚）', 'summoner', ['pact', 'axChantMark', 'phantomClaw', 'phantomClaw', 'guard', 'guard'], ['pact', 'axChantMark']],
    ['盗賊 小細工×2＋3枚（5枚）', 'thief', ['lnGiTrick', 'lnGiTrick', 'strike', 'strike', 'guard'], ['lnGiTrick']],
  ] as const)('%s: 1ターンに何百回も使えない（2ターン目も）', (_label, cls, deck, ids) => {
    for (let seed = 1; seed <= 3; seed++) {
      const s = battle(cls, [...deck], seed);
      const r1 = loop(s, [...ids], 300);
      expect(r1.done, `種${seed} 1ターン目`).toBeLessThan(20);
      // 止まった時は、遊ぶ人に分かる知らせが戦闘の記録に出ている
      expect(r1.s.log.some((l) => l.text.includes('切り直しは1ターンに1回')), `種${seed}`).toBe(true);
      const r2 = loop(nextTurn(r1.s), [...ids], 300);
      expect(r2.done, `種${seed} 2ターン目`).toBeLessThan(20);
    }
  });

  it('ふつうの山札（10枚以上）: ターンの始めに引く枚数・山札と捨札の動きは前と同じ（切り直しは1回で足りる）', () => {
    const deck = ['strike', 'strike', 'strike', 'strike', 'strike', 'guard', 'guard', 'guard', 'guard', 'guard'];
    let s = battle('warrior', deck, 7, false);
    const total = () => s.allies[0].hand.length + s.allies[0].drawPile.length + s.allies[0].discard.length;
    const n = total();
    expect(n).toBeGreaterThanOrEqual(10);
    for (let t = 0; t < 6; t++) {
      const hand = s.allies[0].hand.length;
      // 5枚（武器などで増える分も含めて）引けている。切り直しで止まっていない
      expect(hand, `ターン${t + 1}`).toBeGreaterThanOrEqual(5);
      expect(s.log.some((l) => l.text.includes('切り直しは1ターンに1回')), `ターン${t + 1}`).toBe(false);
      expect(total()).toBe(n);
      s = nextTurn(s);
    }
  });
});
