import { describe, expect, it } from 'vitest';
import { getCard } from '../../data/cards';
import { ENCOUNTERS } from '../../data/enemies';
import type { AllyState } from '../../types';
import {
  absorb,
  affinityOf,
  applyCommand,
  calcDamage,
  createBattle,
  createRng,
  drawCards,
  finalChance,
  incomingDamage,
  rollSlots,
  selectTier,
  successDistribution,
  tierDistribution,
  toPercents,
} from '../index';
import { END, giveHand, makeImmortal, nextTurn, party, play, setup } from './helpers';

const statuses = (vulnerable = 0, weak = 0) => ({ vulnerable, weak, burn: 0, poison: 0 });

describe('成功率計算（能力値から適性補正）', () => {
  it('v1と同じ成功率になる', () => {
    expect(finalChance(getCard('heavySwing'), affinityOf({ classId: 'warrior' }))).toBe(75);
    expect(finalChance(getCard('heavySwing'), affinityOf({ classId: 'mage' }))).toBe(55);
    expect(finalChance(getCard('gambleBolt'), affinityOf({ classId: 'mage' }))).toBe(60);
    expect(affinityOf({ classId: 'guardian' })).toEqual({ physical: 0, magic: -20, skill: 10 });
    expect(affinityOf({ classId: 'hunter' })).toEqual({ physical: 0, magic: 0, skill: 5 });
  });
  it('5%〜95%に制限される', () => {
    const card = { ...getCard('guard'), baseChance: 95 };
    expect(finalChance(card, { physical: 0, magic: 0, skill: 10 })).toBe(95);
    const low = { ...getCard('magicArrow'), baseChance: 10 };
    expect(finalChance(low, { physical: 0, magic: -20, skill: 0 })).toBe(5);
  });
});

describe('スロット判定', () => {
  it('フォーカス枠は左に並び確定成功', () => {
    const r = rollSlots(4, 2, 5, createRng(1));
    expect(r.slice(0, 2)).toEqual(['focus', 'focus']);
    expect(r).toHaveLength(4);
  });
  it('同じシードなら同じ結果', () => {
    expect(rollSlots(4, 0, 50, createRng(42))).toEqual(rollSlots(4, 0, 50, createRng(42)));
  });
  it('表示した確率どおりに抽選される（統計）', () => {
    const rng = createRng(7);
    let hits = 0;
    const N = 20000;
    for (let i = 0; i < N; i++) if (rollSlots(1, 0, 70, rng)[0] === 'hit') hits++;
    expect(hits / N).toBeGreaterThan(0.68);
    expect(hits / N).toBeLessThan(0.72);
  });
  it('成功数の確率分布（二項分布 + フォーカス確定）', () => {
    const d = successDistribution(3, 1, 70);
    expect(d[0]).toBe(0);
    expect(toPercents(d)).toEqual([0, 9, 42, 49]);
  });
  it('全フォーカスなら完全成功100%', () => {
    expect(tierDistribution(getCard('heavySwing'), 3, 70)[3]).toBe(1);
  });
});

describe('Tier選択', () => {
  it('成功数に応じたTier', () => {
    const hs = getCard('heavySwing');
    expect(selectTier(hs, 0).effects[0]).toEqual({ kind: 'damage', amount: 3 });
    expect(selectTier(hs, 2).effects[0]).toEqual({ kind: 'damage', amount: 15 });
    expect(selectTier(hs, 3).effects).toHaveLength(2);
  });
  it('ギャンブルボルトは0〜1成功が同じTier', () => {
    const gb = getCard('gambleBolt');
    expect(selectTier(gb, 0)).toBe(selectTier(gb, 1));
    expect(tierDistribution(gb, 0, 50).reduce((a, b) => a + b)).toBeCloseTo(1);
  });
});

describe('ダメージ計算順', () => {
  it('基礎値 × 倍率 → 弱体 → 脆弱 → 切り捨て（途中で切り捨てない）', () => {
    expect(calcDamage(10, statuses(), statuses())).toBe(10);
    expect(calcDamage(10, statuses(0, 1), statuses())).toBe(7);
    expect(calcDamage(15, statuses(), statuses(1))).toBe(22);
    expect(calcDamage(10, statuses(0, 1), statuses(1))).toBe(11);
    expect(calcDamage(8, statuses(), statuses(), 1.25)).toBe(10);
    expect(calcDamage(7, statuses(), statuses(1), 1.25)).toBe(13); // 13.125
  });
  it('ブロックで吸収してから残りをHPへ', () => {
    expect(absorb(10, 4, 30)).toEqual({ block: 0, hp: 24, blocked: 4, hpLoss: 6 });
    expect(absorb(5, 8, 30)).toEqual({ block: 3, hp: 30, blocked: 5, hpLoss: 0 });
    expect(absorb(50, 0, 30)).toEqual({ block: 0, hp: 0, blocked: 0, hpLoss: 30 });
  });
});

describe('山札', () => {
  const mkAlly = (draw: number, discard: number, hand = 0): AllyState => ({
    id: 'a0',
    classId: 'warrior',
    gender: 'male',
    name: 't',
    playerId: 'P1',
    level: 1,
    hp: 1,
    maxHp: 1,
    block: 0,
    mana: 3,
    focus: 4,
    focusMax: 6,
    stats: { str: 60, vit: 60, int: 60, per: 60, dex: 60, agi: 60, luk: 60 },
    extraDraw: 0,
    statuses: statuses(),
    drawPile: Array.from({ length: draw }, (_, i) => ({ uid: `d${i}`, cardId: 'strike' })),
    discard: Array.from({ length: discard }, (_, i) => ({ uid: `x${i}`, cardId: 'guard' })),
    hand: Array.from({ length: hand }, (_, i) => ({ uid: `h${i}`, cardId: 'guard' })),
    dead: false,
  });
  it('山札が尽きたら捨札をシャッフルして引く', () => {
    const a = mkAlly(2, 6);
    expect(drawCards(a, 5, createRng(3))).toEqual({ drawn: 5, reshuffled: true });
    expect(a.hand.slice(0, 2).map((c) => c.uid)).toEqual(['d0', 'd1']);
    expect(a.drawPile).toHaveLength(3);
    expect(a.discard).toHaveLength(0);
  });
  it('手札上限10枚を超えて引かない', () => {
    const a = mkAlly(5, 0, 8);
    expect(drawCards(a, 5, createRng(1)).drawn).toBe(2);
  });
  it('山札も捨札も空なら引けない', () => {
    expect(drawCards(mkAlly(0, 0), 5, createRng(1))).toEqual({ drawn: 0, reshuffled: false });
  });
});

describe('戦闘の生成', () => {
  it('開始時: 各キャラ5枚・マナ3・フォーカス4・インテント表示', () => {
    const s = createBattle(setup(123));
    expect(s.allies.map((a) => a.id)).toEqual(['a0', 'a1']);
    for (const a of s.allies) {
      expect(a.hand).toHaveLength(5);
      expect(a.mana).toBe(3);
      expect(a.focus).toBe(4);
    }
    expect(s.enemies.every((e) => e.intent)).toBe(true);
    expect(s.enemies[1].intent?.actionId).toBe('curse');
    expect(s.enemies[0].intent?.actionId).toBe('slam');
  });
  it('1〜4人で作れる。人数ごとの敵HP倍率', () => {
    const hp = (n: number) => createBattle(setup(1, ['warrior', 'mage', 'guardian', 'hunter'].slice(0, n))).enemies.map((e) => e.maxHp);
    expect(hp(1)).toEqual([31, 21, 15]);
    expect(hp(2)).toEqual([52, 36, 26]);
    expect(hp(3)).toEqual([70, 48, 35]);
    expect(hp(4)).toEqual([88, 61, 44]);
  });
  it('人数・敵の数が範囲外ならエラー', () => {
    expect(() => createBattle({ ...setup(1), party: [] })).toThrow();
    expect(() => createBattle({ ...setup(1), party: party('warrior', 'warrior', 'warrior', 'warrior', 'warrior') })).toThrow();
    expect(() =>
      createBattle({ ...setup(1), encounter: { id: 'x', name: 'x', enemies: Array(5).fill({ defId: 'goblinScout' }) } }),
    ).toThrow();
  });
  it('同じ職業を複数人選べる。同じ敵には A/B が付く', () => {
    const s = createBattle(setup(9, ['warrior', 'warrior'], 'scoutPair'));
    expect(s.allies.map((a) => a.classId)).toEqual(['warrior', 'warrior']);
    expect(s.enemies.map((e) => e.nameSuffix)).toEqual(['A', 'B']);
  });
  it('敵のレベルでHPと攻撃が上がる', () => {
    const base = createBattle(setup(3, ['warrior', 'mage'], 'bruteAlone'));
    const lv = createBattle({ ...setup(3), encounter: { id: 'x', name: 'x', enemies: [{ defId: 'goblinBrute', level: 6 }] } });
    expect(base.enemies[0].level).toBe(4);
    expect(lv.enemies[0].maxHp).toBe(Math.floor(52 * 1.2));
    expect(lv.enemies[0].attackMul).toBeCloseTo(1.16);
    // 叩きつけ 10 → 11（11.6 切り捨て）
    const ally = lv.allies.find((a) => a.id === lv.enemies[0].intent!.targetId)!;
    expect(incomingDamage(lv, ally)).toBe(11);
  });
  it('同じシードなら同じ戦闘', () => {
    expect(createBattle(setup(99))).toEqual(createBattle(setup(99)));
  });
});

describe('カードの使用', () => {
  it('フォーカス全投入で完全成功・コストとフォーカスを消費・捨札へ。元の state は不変', () => {
    const s = createBattle(setup(5));
    const [card] = giveHand(s, 'a0', ['heavySwing']);
    const { state, events, error } = applyCommand(s, play('a0', card.uid, 'e2', 3));
    expect(error).toBeUndefined();
    expect(state.allies[0].mana).toBe(1);
    expect(state.allies[0].focus).toBe(1);
    expect(state.allies[0].discard.map((c) => c.uid)).toContain(card.uid);
    const roll = events[0];
    expect(roll.type === 'roll' && roll.perfect).toBe(true);
    expect(state.enemies[2].dead).toBe(true);
    expect(s.allies[0].mana).toBe(3);
  });
  it('完全成功の脆弱はダメージの後に付与', () => {
    const s = createBattle(setup(5));
    const [card] = giveHand(s, 'a0', ['heavySwing']);
    const { state } = applyCommand(s, play('a0', card.uid, 'e0', 3));
    expect(state.enemies[0].hp).toBe(52 - 26);
    expect(state.enemies[0].statuses.vulnerable).toBe(2);
  });
  it('不正な操作はエラーで状態不変', () => {
    const s = createBattle(setup(5));
    const [card] = giveHand(s, 'a0', ['heavySwing']);
    s.allies[0].mana = 1;
    const r = applyCommand(s, play('a0', card.uid, 'e0', 0));
    expect(r.error).toBe('マナが足りません');
    expect(r.state).toBe(s);
    s.allies[0].mana = 3;
    expect(applyCommand(s, play('a0', card.uid, 'e0', 4)).error).toBeDefined();
    expect(applyCommand(s, play('a0', card.uid, 'e0', 1.5)).error).toBeDefined();
    expect(applyCommand(s, play('a0', card.uid, undefined, 0)).error).toBeDefined();
  });
  it('担当していないプレイヤーは操作できない', () => {
    const s = createBattle({ ...setup(5), party: [{ ...party('warrior')[0], playerId: 'P2' }, party('mage')[0]] });
    const [card] = giveHand(s, 'a0', ['strike']);
    expect(applyCommand(s, play('a0', card.uid, 'e0', 0)).error).toBe('担当していないキャラです');
    expect(applyCommand(s, { ...play('a0', card.uid, 'e0', 0), playerId: 'P2' } as never).error).toBeUndefined();
    expect(applyCommand(s, { type: 'END_TURN', playerId: 'P3' }).error).toBeDefined();
  });
});

describe('ターンと状態異常', () => {
  it('脆弱2は「付与ターン＋次の味方フェーズ」まで続く', () => {
    let s = createBattle(setup(5));
    s.enemies[0].statuses.vulnerable = 2;
    s = nextTurn(s);
    expect(s.turn).toBe(2);
    expect(s.enemies[0].statuses.vulnerable).toBe(1);
    s = nextTurn(s);
    expect(s.enemies[0].statuses.vulnerable).toBe(0);
  });
  it('ターン終了で手札は捨札へ、敵ブロックは敵フェーズ開始時に0', () => {
    const s = createBattle(setup(5));
    s.enemies[0].block = 9;
    const { state } = applyCommand(s, END);
    expect(state.phase).toBe('enemy');
    expect(state.allies.every((a) => a.hand.length === 0 && a.discard.length === 5)).toBe(true);
    expect(state.enemies[0].block).toBe(0);
  });
});

describe('挑発', () => {
  function tauntSetup() {
    const s = createBattle(setup(11));
    s.enemies[0].intent = { actionId: 'slam', targetId: 'a1' };
    s.enemies[1].intent = { actionId: 'curse', targetId: 'a1' };
    s.enemies[2].intent = { actionId: 'aimedShot', targetId: 'a1' };
    return s;
  }
  it('完全成功: 敵全体の単体攻撃が使用者に向く（デバフは不変）', () => {
    const s = tauntSetup();
    const [card] = giveHand(s, 'a0', ['warCry']);
    const { state, events } = applyCommand(s, play('a0', card.uid, 'e1', 2));
    expect(state.enemies[0].intent?.targetId).toBe('a0');
    expect(state.enemies[2].intent?.targetId).toBe('a0');
    expect(state.enemies[1].intent?.targetId).toBe('a1');
    expect(state.allies[0].block).toBe(16);
    expect(events.filter((e) => e.type === 'retarget')).toHaveLength(2);
    expect(incomingDamage(state, state.allies[0])).toBe(3);
    expect(incomingDamage(state, state.allies[1])).toBe(0);
  });
  it('挑発した味方が倒れたら挑発解除・対象を決め直す', () => {
    const s = tauntSetup();
    const [card] = giveHand(s, 'a0', ['warCry']);
    let st = applyCommand(s, play('a0', card.uid, 'e1', 2)).state;
    st.allies[0].hp = 1;
    st.allies[0].block = 0;
    st = applyCommand(st, END).state;
    st = applyCommand(st, { type: 'ENEMY_STEP' }).state;
    expect(st.allies[0].dead).toBe(true);
    expect(st.enemies[2].tauntedBy).toBeUndefined();
    expect(st.enemies[2].intent?.targetId).toBe('a1');
  });
});

describe('敵の行動ルール', () => {
  it('獣人の重装兵は決まった順番', () => {
    let s = createBattle(setup(2));
    makeImmortal(s);
    const seen: string[] = [];
    for (let t = 0; t < 6; t++) {
      seen.push(s.enemies[0].intent!.actionId);
      s = nextTurn(s);
    }
    expect(seen).toEqual(['slam', 'brace', 'bigSwing', 'slam', 'brace', 'bigSwing']);
  });
  it('シャーマンは同じ行動を2連続しない / 斥候は3連続しない', () => {
    let s = createBattle(setup(77));
    makeImmortal(s);
    const shaman: string[] = [];
    const scout: string[] = [];
    for (let t = 0; t < 60; t++) {
      shaman.push(s.enemies[1].intent!.actionId);
      scout.push(s.enemies[2].intent!.actionId);
      s = nextTurn(s);
    }
    for (let i = 1; i < shaman.length; i++) expect(shaman[i]).not.toBe(shaman[i - 1]);
    for (let i = 2; i < scout.length; i++) expect(scout[i] === scout[i - 1] && scout[i] === scout[i - 2]).toBe(false);
  });
  it('シャーマン単独なら「守護の印」は「混沌の波」になる', () => {
    let s = createBattle({ ...setup(8), encounter: { id: 'x', name: 'x', enemies: [{ defId: 'chaosShaman' }] } });
    makeImmortal(s);
    const seen = new Set<string>();
    for (let t = 0; t < 30; t++) {
      s = nextTurn(s);
      seen.add(s.enemies[0].intent!.actionId);
    }
    expect(seen.has('ward')).toBe(false);
  });
});

describe('全遭遇 × 1〜4人で最後まで進む（無限ループ・例外がない）', () => {
  const lineups = [['warrior'], ['mage', 'hunter'], ['guardian', 'warrior', 'mage'], ['warrior', 'mage', 'guardian', 'hunter']];
  for (const enc of ENCOUNTERS.all) {
    for (const lineup of lineups) {
      it(`${enc.id} / ${lineup.length}人`, () => {
        let s = createBattle(setup(lineup.length * 31 + enc.id.length, lineup, enc.id));
        for (let t = 0; t < 200 && (s.phase === 'ally' || s.phase === 'enemy'); t++) {
          // 使えるカードを全部、最初の生存敵に使う
          for (const a of s.allies) {
            for (let k = 0; k < 10; k++) {
              const cur = s.allies.find((x) => x.id === a.id)!;
              const c = cur.hand.find((h) => getCard(h.cardId).cost <= cur.mana);
              const target = s.enemies.find((e) => !e.dead);
              if (!c || !target || s.phase !== 'ally') break;
              const r = applyCommand(s, play(a.id, c.uid, target.uid, 0));
              if (r.error) break;
              s = r.state;
            }
          }
          if (s.phase === 'ally') s = nextTurn(s);
        }
        expect(['victory', 'defeat']).toContain(s.phase);
        // 全カードの所在が保存されている（増えたり消えたりしない）
        for (const a of s.allies) {
          const total = a.hand.length + a.drawPile.length + a.discard.length;
          expect(total).toBe(10);
        }
      });
    }
  }
});

describe('連携攻撃と狙いの印（M3-C5）', () => {
  const hit = (s: ReturnType<typeof createBattle>, who: string) => {
    const [card] = giveHand(s, who, ['heavySwing']);
    return applyCommand(s, play(who, card.uid, 'e0', 3));
  };
  it('このターンに別の味方が攻撃した敵には、ダメージが上乗せされる（自分の2回目には付かない）', () => {
    const s = createBattle(setup(5));
    s.enemies[0].hp = s.enemies[0].maxHp = 999;
    const alone = 999 - hit(structuredClone(s), 'a0').state.enemies[0].hp;
    const after = structuredClone(s);
    after.enemies[0].hitBy = ['a1'];
    const r = hit(after, 'a0');
    expect(999 - r.state.enemies[0].hp).toBe(Math.round(alone * 1.2));
    expect(r.events.some((e) => e.type === 'ability' && e.name === '連携')).toBe(true);
    const self = structuredClone(s);
    self.enemies[0].hitBy = ['a0'];
    expect(999 - hit(self, 'a0').state.enemies[0].hp).toBe(alone);
    // 攻撃した味方が記録され、次のターンで消える
    expect(r.state.enemies[0].hitBy).toEqual(['a1', 'a0']);
  });
  it('狙っている敵を見せられる。カードを使うと消える。他人のキャラは狙わせられない', () => {
    const s = createBattle(setup(5));
    const r = applyCommand(s, { type: 'AIM', playerId: 'P1', characterId: 'a0', targetId: 'e1' });
    expect(r.state.aims).toEqual({ a0: 'e1' });
    expect(applyCommand(s, { type: 'AIM', playerId: 'P2', characterId: 'a0', targetId: 'e1' }).error).toBeDefined();
    expect(hit(r.state, 'a0').state.aims).toEqual({});
  });
});
