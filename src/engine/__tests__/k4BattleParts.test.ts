// K4 で足した戦闘の部品: 反撃（retaliate）・敵の増援（summonEnemy）・フォーカスを奪う（drainFocus）・遅延（状態異常 delay）
import { describe, expect, it } from 'vitest';
import { applyCommand, applyEffect, createBattle, createRng, makeCtx } from '../index';
import type { BattleState } from '../../types';
import { giveHand, nextTurn, party, play } from './helpers';

const battleWith = (seed: number, enemies: { defId: string; level?: number }[], classes = ['mage', 'warrior']): BattleState =>
  createBattle({ seed, party: party(...classes), encounter: { id: 'test', name: 'テスト', enemies } });

describe('反撃（攻撃してきた相手に返す）', () => {
  it('貝の騎士を叩くと、叩いた味方に4ダメージを返す', () => {
    const s = battleWith(3, [{ defId: 'conchKnight' }]);
    s.enemies[0].block = 0;
    const a = s.allies[0];
    a.block = 0;
    const hp = a.hp;
    const [c] = giveHand(s, a.id, ['strike']);
    const { state, events } = applyCommand(s, play(a.id, c.uid, 'e0', 1));
    expect(state.allies[0].hp).toBe(hp - 4);
    expect(state.allies[1].hp).toBe(s.allies[1].hp); // 叩いていない味方には返さない
    expect(events.some((e) => e.type === 'ability' && e.name === 'とげの殻')).toBe(true);
  });

  it('1ターン2回まで。次のターンにはまた返す', () => {
    let s = battleWith(4, [{ defId: 'conchKnight' }]);
    s.enemies[0].hp = s.enemies[0].maxHp = 999;
    s.enemies[0].block = 0;
    s.allies.forEach((x) => (x.hp = x.maxHp = 500));
    const a = s.allies[0];
    a.mana = 9;
    a.block = 0;
    giveHand(s, a.id, ['strike', 'strike', 'strike']);
    for (let i = 0; i < 3; i++) s = applyCommand(s, play(a.id, s.allies[0].hand[0].uid, 'e0', 1)).state;
    expect(500 - s.allies[0].hp).toBe(8);
    s.enemies[0].intent = undefined;
    s = nextTurn(s);
    s.allies[0].block = 0;
    s.enemies[0].block = 0;
    const before = s.allies[0].hp;
    giveHand(s, a.id, ['strike']);
    s = applyCommand(s, play(a.id, s.allies[0].hand[0].uid, 'e0', 1)).state;
    expect(before - s.allies[0].hp).toBe(4);
  });

  it('攻撃者がいない（毒）・倒れている時は何もしない', () => {
    const s = battleWith(5, [{ defId: 'conchKnight' }]);
    const knight = s.enemies[0];
    const rng = createRng(1);
    // 攻撃者なし
    expect(applyEffect(makeCtx(s, rng, [], knight), { kind: 'retaliate', amount: 4 })).toBe(false);
    // 倒れた攻撃者
    s.allies[0].dead = true;
    expect(applyEffect(makeCtx(s, rng, [], knight, { attacker: s.allies[0] }), { kind: 'retaliate', amount: 4 })).toBe(false);
    // 毒で減っても反撃しない
    const t = battleWith(5, [{ defId: 'conchKnight' }]);
    t.enemies[0].statuses.poison = 3;
    t.enemies[0].intent = undefined;
    const hp = t.allies.map((x) => x.hp);
    const st = nextTurn(t);
    expect(st.enemies[0].hp).toBeLessThan(st.enemies[0].maxHp);
    expect(st.allies.map((x) => x.hp)).toEqual(hp);
  });
});

describe('敵の増援（敵が敵を呼ぶ）', () => {
  const summonTurn = (s: BattleState) => {
    const g = s.enemies[0];
    g.intent = { actionId: 'crew' };
    let st = applyCommand(s, { type: 'END_TURN', playerId: 'P1' }).state;
    st = applyCommand(st, { type: 'ENEMY_STEP' }).state;
    return st;
  };

  it('ガルドが HP50%以下で幽霊水夫を呼ぶ。呼ばれた敵は次のターンから動き、開幕の特性も働く', () => {
    const s = battleWith(7, [{ defId: 'pirateCaptainGuld' }]);
    s.allies.forEach((x) => (x.hp = x.maxHp = 999));
    const g = s.enemies[0];
    g.hp = Math.floor(g.maxHp * 0.4);
    g.phase = 1;
    const st = summonTurn(s);
    expect(st.enemies).toHaveLength(2);
    const ghost = st.enemies[1];
    expect(ghost).toMatchObject({ uid: 'e1', defId: 'ghostDeckhand', summoned: true, dead: false });
    expect(ghost.intent).toBeUndefined();
    expect(ghost.block).toBe(6); // すり抜ける体
    expect(st.log.some((l) => l.text.includes('幽霊水夫が現れた'))).toBe(true);
    // 敵フェーズを終えると、呼ばれた敵にも行動の予告が付く
    let end = st;
    while (end.phase === 'enemy') end = applyCommand(end, { type: 'ENEMY_STEP' }).state;
    expect(end.enemies[1].intent).toBeDefined();
  });

  it('呼んだ敵のレベル差・人数の補正を引き継ぐ', () => {
    const s = battleWith(8, [{ defId: 'pirateCaptainGuld', level: 9 }], ['mage', 'warrior', 'archer']);
    s.enemies[0].phase = 1;
    const st = summonTurn(s);
    const ghost = st.enemies[1];
    expect(ghost.level).toBe(7); // ガルド Lv7→9 なので、幽霊水夫も Lv5→7
    const solo = battleWith(8, [{ defId: 'ghostDeckhand', level: 7 }], ['mage', 'warrior', 'archer']);
    expect(ghost.maxHp).toBe(solo.enemies[0].maxHp);
    expect(ghost.attackMul).toBeCloseTo(solo.enemies[0].attackMul);
  });

  it('1戦闘2回まで・戦場は4体まで', () => {
    const s = battleWith(9, [{ defId: 'pirateCaptainGuld' }]);
    const g = s.enemies[0];
    const rng = createRng(2);
    const summon = { kind: 'summonEnemy' as const, enemy: 'ghostDeckhand', count: 1, uses: 2 };
    expect(applyEffect(makeCtx(s, rng, [], g), summon)).toBe(true);
    expect(applyEffect(makeCtx(s, rng, [], g), summon)).toBe(true);
    expect(applyEffect(makeCtx(s, rng, [], g), summon)).toBe(false);
    expect(s.enemies.map((e) => e.nameSuffix)).toEqual([undefined, 'A', 'B']);
    const t = battleWith(9, [{ defId: 'pirateCaptainGuld' }, { defId: 'pirateGrunt' }, { defId: 'pirateGrunt' }]);
    expect(applyEffect(makeCtx(t, rng, [], t.enemies[0]), { ...summon, count: 3 })).toBe(true);
    expect(t.enemies).toHaveLength(4);
    expect(applyEffect(makeCtx(t, rng, [], t.enemies[0]), summon)).toBe(false);
  });

  it('同じ状態から同じ結果になる（オンラインで全員そろう）', () => {
    const make = () => {
      const s = battleWith(11, [{ defId: 'pirateCaptainGuld' }]);
      s.enemies[0].phase = 1;
      return summonTurn(s);
    };
    expect(JSON.stringify(make())).toBe(JSON.stringify(make()));
  });
});

describe('フォーカスを奪う', () => {
  it('狙った味方のフォーカスを減らし、0より下にはしない', () => {
    const s = battleWith(12, [{ defId: 'pirateGrunt' }]);
    const e = s.enemies[0];
    e.intent = { actionId: 'saber', targetId: s.allies[0].id };
    s.allies[0].focus = 1;
    const events: never[] = [];
    const ctx = makeCtx(s, createRng(3), events, e);
    expect(applyEffect(ctx, { kind: 'drainFocus', amount: 2 })).toBe(true);
    expect(s.allies[0].focus).toBe(0);
    expect(s.allies[1].focus).toBe(4);
    expect(events).toContainEqual({ type: 'resource', unitId: s.allies[0].id, resource: 'focus', amount: -1 });
    expect(applyEffect(makeCtx(s, createRng(3), [], e), { kind: 'drainFocus', amount: 2 })).toBe(false);
    expect(s.allies[0].focus).toBe(0);
  });
});

describe('遅延（次のターンに引くカードが減る）', () => {
  it('遅延2なら次のターンの手札が2枚少なく、引いた時に消える', () => {
    const base = battleWith(13, [{ defId: 'pirateGrunt' }]);
    base.enemies[0].intent = undefined;
    const slowed = structuredClone(base);
    slowed.allies[0].statuses.delay = 2;
    const a = nextTurn(base);
    const b = nextTurn(slowed);
    expect(b.allies[0].hand.length).toBe(a.allies[0].hand.length - 2);
    expect(b.allies[1].hand.length).toBe(a.allies[1].hand.length);
    expect(b.allies[0].statuses.delay).toBe(0);
    expect(b.allies[0].mana).toBe(a.allies[0].mana); // 凍結（マナ-1）とは別
  });

  it('applyStatus で付けられ、2より多くは重ならない', () => {
    const s = battleWith(14, [{ defId: 'pirateGrunt' }]);
    const e = s.enemies[0];
    e.intent = { actionId: 'saber', targetId: s.allies[0].id };
    for (let i = 0; i < 3; i++) applyEffect(makeCtx(s, createRng(1), [], e), { kind: 'applyStatus', status: 'delay', amount: 1 });
    expect(s.allies[0].statuses.delay).toBe(2);
  });
});
