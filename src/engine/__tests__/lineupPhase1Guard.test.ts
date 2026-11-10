// ===== ラインナップ見直し フェーズ1-B: 守護飾り・再起飾り → 攻めの状態異常シナジー =====
// 呪い（深淵の飾り・深淵の大飾り）と 脆弱（急所の飾り・急所の大飾り）を、実際の戦闘の流れで確かめる。
// 確かめる事: 効果の量・1ターン1回のブレーキ・状態異常が無い敵では働かない・持ち主以外のカードでは働かない・説明文。
import { describe, expect, it } from 'vitest';
import { ITEMS } from '../../data/items';
import type { BattleEvent, BattleState, PartyMemberSpec } from '../../types';
import { applyCommand, createBattle, createGame, describeAbility, toPartyMember } from '../index';
import { giveHand, nextTurn, play, setup } from './helpers';

const CURSE_EPIC = 'curseShelterPendant';
const CURSE_LEGEND = 'curseRecoveryPendant';
const VULN_EPIC = 'vulnerableShelterPendant';
const VULN_LEGEND = 'vulnerableRecoveryPendant';
const CHANGED = [CURSE_EPIC, CURSE_LEGEND, VULN_EPIC, VULN_LEGEND];

const HP = 5000;
const FOE_HP = 999;

const parties = new Map<string, PartyMemberSpec[]>();
/** 1人目だけが飾りを着けたパーティ（2人目は飾りなし） */
function partyWith(itemId: string, classIds: string[]): PartyMemberSpec[] {
  const key = `${itemId}:${classIds.join(',')}`;
  let p = parties.get(key);
  if (!p) {
    const g = createGame({
      seed: 1,
      scenarioId: 'corruptionKing',
      difficulty: 'normal',
      party: classIds.map((classId, i) => ({ classId, gender: 'male' as const, name: `h${i}`, playerId: 'P1' })),
    });
    g.heroes[0].equipment.accessory = { uid: 'acc', itemId };
    p = g.heroes.map(toPartyMember);
    parties.set(key, p);
  }
  return structuredClone(p);
}

/** 飾りを着けた1人目 + 飾りなしの2人目で戦闘を始める。HP・マナ・フォーカスは計算しやすい値にそろえる */
function battleWith(itemId: string, classIds: string[] = ['warrior', 'warrior'], seed = 5): BattleState {
  const s = createBattle({ ...setup(seed, classIds), party: partyWith(itemId, classIds) });
  steady(s);
  return s;
}

/** 味方: HPは減った状態（回復が見えるように）・悪い状態異常なし・マナとフォーカスは十分。敵: 倒れないHP・ブロックなし */
function steady(s: BattleState) {
  for (const a of s.allies) {
    a.maxHp = 9999;
    a.hp = HP;
    a.mana = 9;
    a.focus = 4;
    a.block = 0;
    for (const k of Object.keys(a.statuses)) a.statuses[k] = 0;
  }
  for (const e of s.enemies) {
    e.hp = e.maxHp = FOE_HP;
    e.block = 0;
  }
}

/** カードを使う（使えなかった時はテストを失敗にする） */
function use(s: BattleState, who: string, uid: string, targetId: string | undefined, focus: number) {
  const r = applyCommand(s, play(who, uid, targetId, focus));
  expect(r.error, r.error).toBeUndefined();
  return r;
}

const fired = (events: BattleEvent[], name: string) => events.filter((e) => e.type === 'ability' && e.name === name);
const wasPerfect = (events: BattleEvent[]) => events.some((e) => e.type === 'roll' && e.perfect);

describe('深淵の飾り（エピック）: 「呪い」の敵にダメージを与えると、与えたダメージの25%を回復', () => {
  it('「呪い」の敵1体を狙ったカードでHPを削ると、与えたダメージの25%だけ回復する（マナは増えない）', () => {
    const s = battleWith(CURSE_EPIC);
    const me = s.allies[0];
    s.enemies[0].statuses.curse = 3;
    giveHand(s, me.id, ['strike']);
    const { state, events } = use(s, me.id, 't0', s.enemies[0].uid, 1);
    expect(FOE_HP - state.enemies[0].hp).toBe(9); // ストライクの完全成功 7 × 剣の心得 1.3
    expect(state.allies[0].hp).toBe(HP + 2); // 9 × 25% = 2.25 → 2
    expect(state.allies[0].mana).toBe(9 - 1);
    expect(fired(events, '深淵の共鳴')).toEqual([
      { type: 'ability', unitId: me.id, name: '深淵の共鳴', source: { kind: 'equipment', id: CURSE_EPIC, label: '深淵の飾り' } },
    ]);
  });

  it('1ターンに1回だけ。次のターンにはまた働く', () => {
    const s = battleWith(CURSE_EPIC);
    const me = s.allies[0];
    s.enemies[0].statuses.curse = 3;
    giveHand(s, me.id, ['strike', 'strike']);
    const first = use(s, me.id, 't0', s.enemies[0].uid, 1);
    expect(first.state.allies[0].hp).toBe(HP + 2);
    const second = use(first.state, me.id, 't1', s.enemies[0].uid, 1);
    expect(second.state.enemies[0].hp).toBe(FOE_HP - 18); // 2枚目もダメージは入る
    expect(second.state.allies[0].hp).toBe(HP + 2); // でも回復は1回だけ
    expect(fired(second.events, '深淵の共鳴')).toHaveLength(0);

    const next = nextTurn(second.state);
    expect(next.phase).toBe('ally');
    steady(next);
    next.enemies[0].statuses.curse = 3;
    giveHand(next, next.allies[0].id, ['strike']);
    const third = use(next, next.allies[0].id, 't0', next.enemies[0].uid, 1);
    expect(third.state.allies[0].hp).toBe(HP + 2);
    expect(fired(third.events, '深淵の共鳴')).toHaveLength(1);
  });

  it('「呪い」が無い敵では働かない（その回の権利も減らない）', () => {
    const s = battleWith(CURSE_EPIC);
    const me = s.allies[0];
    s.enemies[1].statuses.curse = 3;
    giveHand(s, me.id, ['strike', 'strike']);
    const plain = use(s, me.id, 't0', s.enemies[0].uid, 1); // 呪いが無い敵
    expect(plain.state.enemies[0].hp).toBeLessThan(FOE_HP);
    expect(plain.state.allies[0].hp).toBe(HP);
    expect(fired(plain.events, '深淵の共鳴')).toHaveLength(0);
    const cursed = use(plain.state, me.id, 't1', s.enemies[1].uid, 1); // 呪いの敵
    const dealt = FOE_HP - cursed.state.enemies[1].hp;
    expect(dealt).toBeGreaterThanOrEqual(4);
    expect(cursed.state.allies[0].hp).toBe(HP + Math.floor((dealt * 25) / 100));
    expect(fired(cursed.events, '深淵の共鳴')).toHaveLength(1);
  });

  it('持ち主以外の味方が使ったカードでは働かない（持ち主の権利も減らない）', () => {
    const s = battleWith(CURSE_EPIC);
    const [me, mate] = s.allies;
    s.enemies[0].statuses.curse = 3;
    giveHand(s, mate.id, ['strike']);
    const byMate = use(s, mate.id, 't0', s.enemies[0].uid, 1);
    expect(byMate.state.enemies[0].hp).toBeLessThan(FOE_HP);
    expect(byMate.state.allies.map((a) => a.hp)).toEqual([HP, HP]);
    expect(fired(byMate.events, '深淵の共鳴')).toHaveLength(0);
    giveHand(byMate.state, me.id, ['strike']);
    const byMe = use(byMate.state, me.id, 't0', s.enemies[0].uid, 1);
    expect(byMe.state.allies.map((a) => a.hp)).toEqual([HP + 2, HP]);
  });

  it('ブロックで止められてHPを削れなかった時は働かない（その回の権利も減らない）', () => {
    const s = battleWith(CURSE_EPIC);
    const me = s.allies[0];
    s.enemies[0].statuses.curse = 3;
    s.enemies[0].block = 99;
    giveHand(s, me.id, ['strike', 'strike']);
    const blocked = use(s, me.id, 't0', s.enemies[0].uid, 1);
    expect(blocked.state.enemies[0].hp).toBe(FOE_HP);
    expect(blocked.state.allies[0].hp).toBe(HP);
    expect(fired(blocked.events, '深淵の共鳴')).toHaveLength(0);
    blocked.state.enemies[0].block = 0;
    const open = use(blocked.state, me.id, 't1', s.enemies[0].uid, 1);
    expect(open.state.allies[0].hp).toBe(HP + 2);
  });

  it('敵全体を攻撃するカードでは働かない（狙った1体が決まらないため）', () => {
    const s = battleWith(CURSE_EPIC);
    const me = s.allies[0];
    for (const e of s.enemies) e.statuses.curse = 3;
    giveHand(s, me.id, ['sweep']);
    const { state, events } = use(s, me.id, 't0', undefined, 2);
    expect(state.enemies.every((e) => e.hp < FOE_HP)).toBe(true);
    expect(state.allies[0].hp).toBe(HP);
    expect(fired(events, '深淵の共鳴')).toHaveLength(0);
  });

  it('そのカードで「呪い」が付いた時も働く（判定はカードの効果が終わった後）', () => {
    const s = battleWith(CURSE_EPIC);
    const me = s.allies[0];
    expect(s.enemies[0].statuses.curse ?? 0).toBe(0);
    giveHand(s, me.id, ['hex']); // 呪い釘: 完全成功で 闇5ダメージ + 呪い2
    const { state, events } = use(s, me.id, 't0', s.enemies[0].uid, 2);
    const dealt = FOE_HP - state.enemies[0].hp;
    expect(dealt).toBeGreaterThanOrEqual(4);
    expect(state.enemies[0].statuses.curse).toBeGreaterThanOrEqual(2);
    expect(state.allies[0].hp).toBe(HP + Math.floor((dealt * 25) / 100));
    expect(fired(events, '深淵の共鳴')).toHaveLength(1);
  });
});

describe('深淵の大飾り（レジェンド）: エピックの効果 + マナ+1', () => {
  it('回復に加えてマナ+1。どちらも1ターンに1回', () => {
    const s = battleWith(CURSE_LEGEND);
    const me = s.allies[0];
    s.enemies[0].statuses.curse = 3;
    giveHand(s, me.id, ['strike', 'strike']);
    const first = use(s, me.id, 't0', s.enemies[0].uid, 1);
    expect(first.state.allies[0].hp).toBe(HP + 2);
    expect(first.state.allies[0].mana).toBe(9 - 1 + 1);
    expect(fired(first.events, '深淵の大共鳴')).toEqual([
      { type: 'ability', unitId: me.id, name: '深淵の大共鳴', source: { kind: 'equipment', id: CURSE_LEGEND, label: '深淵の大飾り' } },
    ]);
    const second = use(first.state, me.id, 't1', s.enemies[0].uid, 1);
    expect(second.state.allies[0].hp).toBe(HP + 2);
    expect(second.state.allies[0].mana).toBe(9 - 1);
    expect(fired(second.events, '深淵の大共鳴')).toHaveLength(0);
  });

  it('次のターンにはまた働く', () => {
    const s = battleWith(CURSE_LEGEND);
    s.enemies[0].statuses.curse = 3;
    giveHand(s, s.allies[0].id, ['strike']);
    const first = use(s, s.allies[0].id, 't0', s.enemies[0].uid, 1);
    const next = nextTurn(first.state);
    steady(next);
    next.enemies[0].statuses.curse = 3;
    giveHand(next, next.allies[0].id, ['strike']);
    const again = use(next, next.allies[0].id, 't0', next.enemies[0].uid, 1);
    expect(again.state.allies[0].hp).toBe(HP + 2);
    expect(again.state.allies[0].mana).toBe(9 - 1 + 1);
  });

  it('「呪い」が無い敵・持ち主以外のカードでは、回復もマナも無い', () => {
    const s = battleWith(CURSE_LEGEND);
    const [me, mate] = s.allies;
    s.enemies[1].statuses.curse = 3;
    giveHand(s, me.id, ['strike']);
    const plain = use(s, me.id, 't0', s.enemies[0].uid, 1); // 持ち主が、呪いの無い敵へ
    expect(plain.state.allies[0].hp).toBe(HP);
    expect(plain.state.allies[0].mana).toBe(9 - 1);
    giveHand(plain.state, mate.id, ['strike']);
    const byMate = use(plain.state, mate.id, 't0', s.enemies[1].uid, 1); // 仲間が、呪いの敵へ
    expect(byMate.state.allies.map((a) => a.hp)).toEqual([HP, HP]);
    expect(byMate.state.allies.map((a) => a.mana)).toEqual([9 - 1, 9 - 1]);
    expect(fired([...plain.events, ...byMate.events], '深淵の大共鳴')).toHaveLength(0);
  });

  it('HPが満タンでもマナ+1は入る', () => {
    const s = battleWith(CURSE_LEGEND);
    const me = s.allies[0];
    me.hp = me.maxHp;
    s.enemies[0].statuses.curse = 3;
    giveHand(s, me.id, ['strike']);
    const { state, events } = use(s, me.id, 't0', s.enemies[0].uid, 1);
    expect(state.allies[0].hp).toBe(state.allies[0].maxHp);
    expect(state.allies[0].mana).toBe(9 - 1 + 1);
    expect(fired(events, '深淵の大共鳴')).toHaveLength(1);
  });
});

describe('急所の飾り（エピック）: 「脆弱」の敵に完全成功すると、カードを1枚引く', () => {
  it('「脆弱」の敵1体を狙ったカードが完全成功すると、1枚引く（フォーカスは戻らない）', () => {
    const s = battleWith(VULN_EPIC);
    const me = s.allies[0];
    s.enemies[0].statuses.vulnerable = 3;
    giveHand(s, me.id, ['strike', 'strike', 'strike']);
    const pile = me.drawPile.length;
    expect(pile).toBeGreaterThan(0);
    const { state, events } = use(s, me.id, 't0', s.enemies[0].uid, 1);
    expect(wasPerfect(events)).toBe(true);
    expect(state.allies[0].hand).toHaveLength(3 - 1 + 1);
    expect(state.allies[0].drawPile).toHaveLength(pile - 1);
    expect(state.allies[0].focus).toBe(4 - 1);
    expect(fired(events, '急所の見極め')).toEqual([
      { type: 'ability', unitId: me.id, name: '急所の見極め', source: { kind: 'equipment', id: VULN_EPIC, label: '急所の飾り' } },
    ]);
  });

  it('1ターンに1回だけ。次のターンにはまた働く', () => {
    const s = battleWith(VULN_EPIC);
    const me = s.allies[0];
    s.enemies[0].statuses.vulnerable = 3;
    giveHand(s, me.id, ['strike', 'strike', 'strike']);
    const first = use(s, me.id, 't0', s.enemies[0].uid, 1);
    expect(first.state.allies[0].hand).toHaveLength(3);
    const second = use(first.state, me.id, 't1', s.enemies[0].uid, 1);
    expect(wasPerfect(second.events)).toBe(true);
    expect(second.state.allies[0].hand).toHaveLength(2); // 2枚目は引かない
    expect(fired(second.events, '急所の見極め')).toHaveLength(0);

    const next = nextTurn(second.state);
    expect(next.phase).toBe('ally');
    steady(next);
    next.enemies[0].statuses.vulnerable = 3;
    giveHand(next, next.allies[0].id, ['strike']);
    const third = use(next, next.allies[0].id, 't0', next.enemies[0].uid, 1);
    expect(third.state.allies[0].hand).toHaveLength(1);
    expect(fired(third.events, '急所の見極め')).toHaveLength(1);
  });

  it('「脆弱」が無い敵では働かない（その回の権利も減らない）', () => {
    const s = battleWith(VULN_EPIC);
    const me = s.allies[0];
    s.enemies[1].statuses.vulnerable = 3;
    giveHand(s, me.id, ['strike', 'strike']);
    const plain = use(s, me.id, 't0', s.enemies[0].uid, 1); // 脆弱が無い敵
    expect(wasPerfect(plain.events)).toBe(true);
    expect(plain.state.allies[0].hand).toHaveLength(1);
    expect(fired(plain.events, '急所の見極め')).toHaveLength(0);
    const weakSpot = use(plain.state, me.id, 't1', s.enemies[1].uid, 1); // 脆弱の敵
    expect(weakSpot.state.allies[0].hand).toHaveLength(1);
    expect(fired(weakSpot.events, '急所の見極め')).toHaveLength(1);
  });

  it('持ち主以外の味方が使ったカードでは働かない（持ち主の権利も減らない）', () => {
    const s = battleWith(VULN_EPIC);
    const [me, mate] = s.allies;
    s.enemies[0].statuses.vulnerable = 3;
    giveHand(s, me.id, ['strike']);
    giveHand(s, mate.id, ['strike']);
    const byMate = use(s, mate.id, 't0', s.enemies[0].uid, 1);
    expect(wasPerfect(byMate.events)).toBe(true);
    expect(byMate.state.allies.map((a) => a.hand.length)).toEqual([1, 0]);
    expect(fired(byMate.events, '急所の見極め')).toHaveLength(0);
    const byMe = use(byMate.state, me.id, 't0', s.enemies[0].uid, 1);
    expect(byMe.state.allies.map((a) => a.hand.length)).toEqual([1, 0]);
    expect(fired(byMe.events, '急所の見極め')).toHaveLength(1);
  });

  it('完全成功でなければ働かない（種を変えて、引いた時と完全成功の時がいつも一致する）', () => {
    let perfects = 0;
    let others = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = battleWith(VULN_EPIC, ['warrior', 'warrior'], seed);
      const me = s.allies[0];
      s.enemies[0].statuses.vulnerable = 3;
      giveHand(s, me.id, ['iceLance']); // 2枠・フォーカスなし → 完全成功は運しだい
      const { state, events } = use(s, me.id, 't0', s.enemies[0].uid, 0);
      const perfect = wasPerfect(events);
      if (perfect) perfects++;
      else others++;
      expect(state.allies[0].hand.length, `seed ${seed}`).toBe(perfect ? 1 : 0);
      expect(fired(events, '急所の見極め').length, `seed ${seed}`).toBe(perfect ? 1 : 0);
    }
    expect(perfects).toBeGreaterThan(0);
    expect(others).toBeGreaterThan(0);
  });

  it('敵全体を攻撃するカードでは働かない（狙った1体が決まらないため）', () => {
    const s = battleWith(VULN_EPIC);
    const me = s.allies[0];
    for (const e of s.enemies) e.statuses.vulnerable = 3;
    giveHand(s, me.id, ['sweep']);
    const { state, events } = use(s, me.id, 't0', undefined, 2);
    expect(wasPerfect(events)).toBe(true);
    expect(state.allies[0].hand).toHaveLength(0);
    expect(fired(events, '急所の見極め')).toHaveLength(0);
  });

  it('「脆弱」の味方を狙ったカードでは働かない', () => {
    const s = battleWith(VULN_EPIC);
    const [me, mate] = s.allies;
    mate.statuses.vulnerable = 3;
    giveHand(s, me.id, ['wChime']); // 鈴の音: 味方1人を回復
    const { state, events } = use(s, me.id, 't0', mate.id, 2);
    expect(wasPerfect(events)).toBe(true);
    expect(state.allies[1].statuses.vulnerable).toBe(3);
    expect(state.allies[0].hand).toHaveLength(0);
    expect(fired(events, '急所の見極め')).toHaveLength(0);
  });

  it('そのカードで「脆弱」が付いた時も働く（判定はカードの効果が終わった後）', () => {
    const s = battleWith(VULN_EPIC);
    const me = s.allies[0];
    expect(s.enemies[0].statuses.vulnerable ?? 0).toBe(0);
    giveHand(s, me.id, ['mightyBlow']); // 渾身の一撃: 完全成功で脆弱1
    const { state, events } = use(s, me.id, 't0', s.enemies[0].uid, 2);
    expect(state.enemies[0].statuses.vulnerable).toBeGreaterThanOrEqual(1);
    expect(state.allies[0].hand).toHaveLength(1);
    expect(fired(events, '急所の見極め')).toHaveLength(1);
  });

  it('狩人が着けると、ジョブの「急所狙い」で付いた脆弱でも働く（ジョブの能力が先）', () => {
    const s = battleWith(VULN_EPIC, ['hunter', 'warrior']);
    const me = s.allies[0];
    expect(s.enemies[0].statuses.vulnerable ?? 0).toBe(0);
    giveHand(s, me.id, ['strike']);
    const { state, events } = use(s, me.id, 't0', s.enemies[0].uid, 1);
    const names = events.filter((e) => e.type === 'ability').map((e) => (e.type === 'ability' ? e.name : ''));
    expect(names.indexOf('急所狙い')).toBeGreaterThanOrEqual(0);
    expect(names.indexOf('急所の見極め')).toBeGreaterThan(names.indexOf('急所狙い'));
    expect(state.allies[0].hand).toHaveLength(1);
  });
});

describe('急所の大飾り（レジェンド）: エピックの効果 + フォーカス+1', () => {
  it('1枚引き、フォーカス+1。どちらも1ターンに1回', () => {
    const s = battleWith(VULN_LEGEND);
    const me = s.allies[0];
    s.enemies[0].statuses.vulnerable = 3;
    giveHand(s, me.id, ['strike', 'strike', 'strike']);
    const first = use(s, me.id, 't0', s.enemies[0].uid, 1);
    expect(first.state.allies[0].hand).toHaveLength(3);
    expect(first.state.allies[0].focus).toBe(4 - 1 + 1);
    expect(fired(first.events, '急所の極み')).toEqual([
      { type: 'ability', unitId: me.id, name: '急所の極み', source: { kind: 'equipment', id: VULN_LEGEND, label: '急所の大飾り' } },
    ]);
    const second = use(first.state, me.id, 't1', s.enemies[0].uid, 1);
    expect(wasPerfect(second.events)).toBe(true);
    expect(second.state.allies[0].hand).toHaveLength(2);
    expect(second.state.allies[0].focus).toBe(4 - 1);
    expect(fired(second.events, '急所の極み')).toHaveLength(0);
  });

  it('次のターンにはまた働く', () => {
    const s = battleWith(VULN_LEGEND);
    s.enemies[0].statuses.vulnerable = 3;
    giveHand(s, s.allies[0].id, ['strike']);
    const first = use(s, s.allies[0].id, 't0', s.enemies[0].uid, 1);
    const next = nextTurn(first.state);
    steady(next);
    next.enemies[0].statuses.vulnerable = 3;
    giveHand(next, next.allies[0].id, ['strike']);
    const again = use(next, next.allies[0].id, 't0', next.enemies[0].uid, 1);
    expect(again.state.allies[0].hand).toHaveLength(1);
    expect(again.state.allies[0].focus).toBe(4 - 1 + 1);
  });

  it('「脆弱」が無い敵・持ち主以外のカードでは、引かず、フォーカスも増えない', () => {
    const s = battleWith(VULN_LEGEND);
    const [me, mate] = s.allies;
    s.enemies[1].statuses.vulnerable = 3;
    giveHand(s, me.id, ['strike']);
    giveHand(s, mate.id, ['strike']);
    const plain = use(s, me.id, 't0', s.enemies[0].uid, 1); // 持ち主が、脆弱の無い敵へ
    expect(plain.state.allies[0].hand).toHaveLength(0);
    expect(plain.state.allies[0].focus).toBe(4 - 1);
    const byMate = use(plain.state, mate.id, 't0', s.enemies[1].uid, 1); // 仲間が、脆弱の敵へ
    expect(byMate.state.allies.map((a) => a.hand.length)).toEqual([0, 0]);
    expect(byMate.state.allies.map((a) => a.focus)).toEqual([4 - 1, 4 - 1]);
    expect(fired([...plain.events, ...byMate.events], '急所の極み')).toHaveLength(0);
  });
});

describe('作り替えた4つの飾りのデータ', () => {
  it('説明文（自動で作る文）が、効果と合っている', () => {
    expect(describeAbility(ITEMS.get(CURSE_EPIC).ability!)).toBe(
      'カードを使った後（敵1体を狙うカード・対象が「呪い」の時・ダメージを与えた時・1ターンに1回）：HPに与えたダメージの25%だけHPを回復',
    );
    expect(describeAbility(ITEMS.get(CURSE_LEGEND).ability!)).toBe(
      'カードを使った後（敵1体を狙うカード・対象が「呪い」の時・ダメージを与えた時・1ターンに1回）：HPに与えたダメージの25%だけHPを回復、マナ+1',
    );
    expect(describeAbility(ITEMS.get(VULN_EPIC).ability!)).toBe('完全成功時（敵1体を狙うカード・対象が「脆弱」の時・1ターンに1回）：カードを1枚引く');
    expect(describeAbility(ITEMS.get(VULN_LEGEND).ability!)).toBe(
      '完全成功時（敵1体を狙うカード・対象が「脆弱」の時・1ターンに1回）：カードを1枚引く、フォーカス+1',
    );
  });

  it('名前は対で分かり、ほかの装備の名前と重ならない', () => {
    expect(CHANGED.map((id) => ITEMS.get(id).name)).toEqual(['深淵の飾り', '深淵の大飾り', '急所の飾り', '急所の大飾り']);
    const names = ITEMS.all.map((i) => i.name);
    for (const id of CHANGED) expect(names.filter((n) => n === ITEMS.get(id).name), id).toHaveLength(1);
  });

  it('エピックとレジェンドで能力の名前が違う（装備の見比べは名前で「変わった」を判定するため）', () => {
    expect(ITEMS.get(CURSE_EPIC).ability!.name).not.toBe(ITEMS.get(CURSE_LEGEND).ability!.name);
    expect(ITEMS.get(VULN_EPIC).ability!.name).not.toBe(ITEMS.get(VULN_LEGEND).ability!.name);
  });

  it('id・部位・レア度は元のまま。印は「block」を外し、状態異常の印だけ', () => {
    expect(CHANGED.map((id) => [ITEMS.get(id).slot, ITEMS.get(id).rarity])).toEqual([
      ['accessory', 'epic'],
      ['accessory', 'legend'],
      ['accessory', 'epic'],
      ['accessory', 'legend'],
    ]);
    expect(CHANGED.map((id) => ITEMS.get(id).tags)).toEqual([['curse'], ['curse'], ['vulnerable'], ['vulnerable']]);
  });

  it('1ターン1回のブレーキは、エピックとレジェンドで別々に数える', () => {
    const keys = CHANGED.map((id) => {
      const e = ITEMS.get(id).ability!.effect;
      const once = 'if' in e ? e.if?.find((c) => c.kind === 'oncePerTurn') : undefined;
      return once && 'key' in once ? once.key : undefined;
    });
    expect(keys).toEqual(CHANGED);
  });
});
