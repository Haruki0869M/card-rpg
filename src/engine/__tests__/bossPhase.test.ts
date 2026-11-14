// ボスの段階（2026-11-14・docs/tasks/boss-phase-plan.md）1回目: 共通の仕組みを、確認用のボスで確かめる。
// - 開幕の一手: 境目を切っても今の予告は変えず、次の予告が必ずその段階の開幕の一手（🌀の印）。一撃で2つ越えた時は深い方の物だけ
// - 溜め（chargeTo）: 予告した時に次の予告が決まる（「次: 〇〇」）。BREAK・凍結で溜めが止まると、溜めた行動も消える
// - 数え読み（countdown）: 予告のたびに1つ減り、0で必ずその行動。数えている間の BREAK で1つ戻る
// - 弱点の上書き: 段階で増える（addWeak）・入れ替わる（weak）・予告の間だけ（weakWhile）。読む所は phases.ts の1つ
// - 保存と再開・オンライン（状態を JSON で写しても同じ結果）・古い保存（phaseOpened が無い）でも落ちない・開幕の一手を2回出さない
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../data/enemies';
import { BALANCE } from '../../data/balance';
import type { BattleState, EnemyDef } from '../../types';
import { createBattle, createRng, decideIntent, elementMultiplier, previewNextAction } from '../index';
import { breakEnemy } from '../battle/effects';
import { enemyWeak, pendingOpening, phaseMarks } from '../battle/phases';
import { intentView } from '../../components/format';
import { makeImmortal, nextTurn, party } from './helpers';

const BOSS: EnemyDef = {
  id: 'bpBoss',
  name: '確認用のボス',
  icon: 'B',
  maxHp: 1000,
  baseLevel: 1,
  exp: 1,
  gold: 1,
  weak: ['fire'],
  resist: ['dark'],
  pattern: 'sequence',
  actions: [
    { id: 'hit', name: '叩く', effects: [{ kind: 'damage', amount: 5 }] },
    { id: 'guard', name: '構える', effects: [{ kind: 'block', amount: 5 }] },
  ],
  phases: [
    {
      belowHpPct: 60,
      name: '第二形態',
      pattern: 'sequence',
      openingActionId: 'charge',
      rule: '溜めてから大技',
      addWeak: ['ice'],
      actions: [
        { id: 'charge', name: '溜める', big: true, scripted: true, chargeTo: 'blast', effects: [{ kind: 'block', amount: 1 }] },
        { id: 'blast', name: '大爆発', big: true, scripted: true, effects: [{ kind: 'damage', amount: 20, to: 'foes' }] },
        { id: 'hit2', name: '強く叩く', effects: [{ kind: 'damage', amount: 6 }] },
      ],
    },
    {
      belowHpPct: 30,
      name: '最終形態',
      pattern: 'sequence',
      openingActionId: 'storm0',
      rule: '3回の予告で嵐',
      weak: ['thunder'],
      actions: [
        { id: 'storm0', name: '嵐の前触れ', scripted: true, countdown: { actionId: 'storm', turns: 3 }, effects: [{ kind: 'block', amount: 1 }] },
        { id: 'storm', name: '大嵐', big: true, scripted: true, effects: [{ kind: 'damage', amount: 30, to: 'foes' }] },
        { id: 'hit3', name: 'もっと強く叩く', effects: [{ kind: 'damage', amount: 7 }] },
        { id: 'tide', name: '満ち潮', weakWhile: ['holy'], effects: [{ kind: 'damage', amount: 3 }] },
      ],
    },
  ],
};
if (!ENEMIES.has(BOSS.id)) ENEMIES.register(BOSS);

function fight(seed = 5): BattleState {
  const s = createBattle({ seed, party: party('warrior', 'priest'), encounter: { id: 'bp', name: 'bp', boss: true, enemies: [{ defId: 'bpBoss', level: 1 }] } });
  makeImmortal(s);
  return s;
}
/** ボスのHPを最大の pct% にして、段階の確認を走らせる（味方の攻撃の代わり。ダメージ1の継続ダメージで afterHpLoss を通す） */
function cut(s: BattleState, pct: number) {
  const e = s.enemies[0];
  e.hp = Math.floor((e.maxHp * pct) / 100) + 1;
  e.statuses.poison = 1;
}
const boss = (s: BattleState) => s.enemies[0];

describe('開幕の一手', () => {
  it('境目を切っても今の予告は変えず、次の予告が開幕の一手（🌀の印）', () => {
    let s = fight();
    expect(boss(s).intent?.actionId).toBe('hit');
    cut(s, 59);
    s = nextTurn(s);
    // 毒で境目を切った = 敵の番の終わり。予告は次から開幕の一手
    expect(boss(s).phase).toBe(1);
    expect(boss(s).intent?.actionId).toBe('charge');
    expect(boss(s).intent?.opening).toBe(1);
    expect(boss(s).phaseOpened).toBe(1);
    // 溜め: 次の予告が決まっている（「次: 大爆発」）
    expect(boss(s).queuedActionId).toBe('blast');
    s = nextTurn(s);
    expect(boss(s).intent?.actionId).toBe('blast');
    expect(boss(s).intent?.opening).toBeUndefined();
    s = nextTurn(s);
    // 決め方では scripted の行動を選ばない
    expect(boss(s).intent?.actionId).toBe('hit2');
    s = nextTurn(s);
    expect(boss(s).intent?.actionId).toBe('hit2');
  });

  it('味方の番に境目を切っても、今の予告はそのまま実行される', () => {
    let s = fight();
    const e = boss(s);
    e.hp = Math.floor(e.maxHp * 0.5);
    // 段階の確認を味方の番で通す（ダメージを与える代わりに afterHpLoss 相当: phase を直接は変えず、ダメージ1の状態異常で）
    e.phase = 1;
    expect(e.intent?.actionId).toBe('hit');
    s = nextTurn(s);
    expect(s.log.some((l) => l.text.includes('「叩く」'))).toBe(true);
    expect(boss(s).intent?.actionId).toBe('charge');
  });

  it('一撃で2つの境目を越えたら、開幕の一手は深い方の1つだけ', () => {
    let s = fight();
    cut(s, 20);
    s = nextTurn(s);
    expect(boss(s).phase).toBe(2);
    expect(boss(s).intent?.actionId).toBe('storm0');
    expect(boss(s).intent?.opening).toBe(2);
    expect(s.log.some((l) => l.text.includes('「最終形態」'))).toBe(true);
    expect(s.log.some((l) => l.text.includes('🌀次は「嵐の前触れ」'))).toBe(true);
    s = nextTurn(s);
    expect(boss(s).intent?.actionId).not.toBe('charge');
  });

  it('古い保存（phaseOpened が無い・段階の途中）でも落ちず、開幕の一手は1回だけ', () => {
    let s = fight();
    cut(s, 59);
    s = nextTurn(s);
    s = nextTurn(s);
    s = nextTurn(s);
    const old = JSON.parse(JSON.stringify(s)) as BattleState;
    delete old.enemies[0].phaseOpened;
    // 古い保存の順番の位置がはみ出していても落ちない
    old.enemies[0].seqIndex = 99;
    let t = nextTurn(old);
    expect(boss(t).intent?.actionId).toBe('charge');
    t = nextTurn(t);
    t = nextTurn(t);
    t = nextTurn(t);
    t = nextTurn(t);
    // 敵の行動のログ（「確認用のボス「溜める」…」）は、写した後に1回だけ（🌀の知らせ・前のログは数えない）
    const seen = new Set(old.log.map((l) => l.id));
    expect(t.log.filter((l) => !seen.has(l.id) && l.text.includes('「溜める」') && !l.text.startsWith('🌀')).length).toBe(1);
  });

  it('お供の先読みは、まだ出ていない開幕の一手を見せる', () => {
    const s = fight();
    boss(s).phase = 1;
    expect(pendingOpening(boss(s))?.id).toBe('charge');
    expect(previewNextAction(boss(s), s, createRng(1)).id).toBe('charge');
  });

  it('画面: 🌀の札・長押しの説明・HPバーの境目', () => {
    let s = fight();
    expect(phaseMarks(boss(s)).map((m) => m.at)).toEqual([0.6, 0.3]);
    cut(s, 59);
    s = nextTurn(s);
    const v = intentView(s, boss(s))!;
    expect(v.opening?.label).toBe('第2段階');
    expect(v.opening?.long).toContain('溜めてから大技');
    expect(phaseMarks(boss(s)).map((m) => m.at)).toEqual([0.3]);
  });
});

describe('溜め', () => {
  it('溜めを BREAK で止めると、溜めた行動も消える', () => {
    let s = fight();
    cut(s, 59);
    s = nextTurn(s);
    expect(boss(s).queuedActionId).toBe('blast');
    boss(s).broken = true;
    s = nextTurn(s);
    expect(boss(s).intent?.actionId).not.toBe('blast');
    expect(s.log.some((l) => l.text.includes('「溜める」ができなかった'))).toBe(true);
  });
  it('凍結で溜めが止まっても、溜めた行動は消える', () => {
    let s = fight();
    cut(s, 59);
    s = nextTurn(s);
    boss(s).statuses.freeze = 1;
    s = nextTurn(s);
    expect(boss(s).intent?.actionId).not.toBe('blast');
  });
});

describe('数え読み', () => {
  it('予告のたびに1つ減り、0で必ずその行動。出したら最初の数に戻る', () => {
    let s = fight();
    cut(s, 20);
    s = nextTurn(s);
    expect(boss(s).countdown).toEqual({ actionId: 'storm', turns: 3, left: 3 });
    expect(intentView(s, boss(s))!.countdown?.left).toBe(3);
    s = nextTurn(s);
    expect(boss(s).countdown?.left).toBe(2);
    s = nextTurn(s);
    expect(boss(s).countdown?.left).toBe(1);
    s = nextTurn(s);
    expect(boss(s).intent?.actionId).toBe('storm');
    expect(boss(s).intent?.countdownFire).toBe(true);
    expect(intentView(s, boss(s))!.countdown).toMatchObject({ left: 0, fire: true });
    s = nextTurn(s);
    expect(boss(s).countdown?.left).toBe(2);
    expect(boss(s).intent?.actionId).not.toBe('storm');
  });
  it('数えている間に BREAK すると1つ戻る（最初の数まで）', () => {
    let s = fight();
    cut(s, 20);
    s = nextTurn(s);
    s = nextTurn(s);
    const e = boss(s);
    expect(e.countdown?.left).toBe(2);
    breakEnemy({ state: s, events: [], parts: [] } as never, e, 'weak');
    expect(e.countdown?.left).toBe(3);
    breakEnemy({ state: s, events: [], parts: [] } as never, e, 'weak');
    expect(e.countdown?.left).toBe(3);
  });
});

describe('弱点の上書き', () => {
  it('段階で増える・入れ替わる・予告の間だけ（読む所は1つ）。耐性は変わらない', () => {
    const s = fight();
    const e = boss(s);
    expect(enemyWeak(e)).toEqual(['fire']);
    e.phase = 1;
    expect(enemyWeak(e)).toEqual(['fire', 'ice']);
    expect(elementMultiplier(e, 'ice')).toBe(BALANCE.elementWeakMul);
    e.phase = 2;
    expect(enemyWeak(e)).toEqual(['thunder']);
    expect(elementMultiplier(e, 'fire')).toBe(1);
    expect(elementMultiplier(e, 'dark')).toBe(BALANCE.elementResistMul);
    e.intent = { actionId: 'tide' };
    expect(enemyWeak(e)).toEqual(['holy']);
    expect(elementMultiplier(e, 'holy')).toBe(BALANCE.elementWeakMul);
    expect(intentView(s, e)!.details.some((t) => t.includes('この予告の間の弱点'))).toBe(true);
  });
});

describe('保存と再開・オンライン（同じ種・同じ操作で同じ結果）', () => {
  it('途中で JSON に写して続けても、まっすぐ続けた時と同じ', () => {
    const run = (copyAt: number) => {
      let s = fight(11);
      cut(s, 59);
      for (let i = 0; i < 8; i++) {
        if (i === copyAt) s = JSON.parse(JSON.stringify(s));
        if (i === 3) cut(s, 20);
        s = nextTurn(s);
      }
      return s;
    };
    const a = run(-1);
    const b = run(4);
    expect(JSON.stringify(b.enemies)).toBe(JSON.stringify(a.enemies));
    expect(b.log.map((l) => l.text)).toEqual(a.log.map((l) => l.text));
  });
  it('予告を決める時に乱数を余分に引かない（開幕の一手・数え読みは乱数を使わない）', () => {
    const s = fight();
    boss(s).phase = 2;
    const rng = createRng(7);
    const before = createRng(7);
    decideIntent(boss(s), s, rng);
    // 大嵐の前触れは対象が要らない → 乱数は引かない
    expect(rng.next()).toBe(before.next());
  });
});
