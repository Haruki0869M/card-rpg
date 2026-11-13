// 敵の特殊な行動 1回目（docs/tasks/enemy-behaviors-plan.md §7）: シナリオ1 の敵7体・7種類
// 浄化（脱皮）・手数読み・盾砕き・手負い狙い・かばう・仲間を呼ぶ・癒し封じの呪い
import { describe, expect, it } from 'vitest';
import { CARDS } from '../../data/cards';
import { ENEMIES, getEnemy, getEnemyAction } from '../../data/enemies';
import { behaviorFromEffects } from '../../data/enemyBehaviors';
import { DUNGEONS } from '../../data/dungeons';
import { getScenario } from '../../data/scenarios';
import { getStatus } from '../../data/statuses';
import { intentView } from '../../components/format';
import type { BattleState, CardDef, Command, PlayerId } from '../../types';
import { readWarnings } from '../botClever';
import { applyCommand, createBattle, createRng, decideIntent, fallbackIdOf, incomingDamage } from '../index';

const P: PlayerId = 'P1';
// 確認用のカード（どの成功数でも同じ効果。乱数で結果が変わらないように）
const card = (id: string, target: CardDef['target'], effects: CardDef['tiers'][0]['effects'], cost = 0): CardDef => ({ id, name: id, category: 'skill', cost, slots: 1, baseChance: 80, target, tiers: [{ minSuccesses: 0, effects }] });
CARDS.register(card('ebHit', 'enemy', [{ kind: 'damage', amount: 10 }]));
CARDS.register(card('ebAll', 'allEnemies', [{ kind: 'damage', amount: 10 }]));
CARDS.register(card('ebZero', 'self', [{ kind: 'block', amount: 0 }]));
CARDS.register(card('ebHeal', 'self', [{ kind: 'heal', amount: 20, to: 'self' }]));
CARDS.register(card('ebTaunt', 'enemy', [{ kind: 'taunt' }]));
CARDS.register(card('ebCleanse', 'self', [{ kind: 'cleanse', to: 'self' }]));
// 確認用の置物（何もしない・倒れにくい）
ENEMIES.register({ id: 'ebDummy', icon: 'T', name: '確認用の置物', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence', actions: [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block', amount: 0 }] }] });

/** tough = 敵のHPを1000にする（倒れないように。呼ぶ敵の確認では元のHPのまま） */
function battle(enemies: string[], allies = 1, tough = true): BattleState {
  const s = createBattle({
    seed: 7,
    party: Array.from({ length: allies }, (_, i) => ({ classId: 'warrior', gender: 'male' as const, name: `仲間${i + 1}`, playerId: P })),
    encounter: { id: 'eb', name: '確認', enemies: enemies.map((defId) => ({ defId })) },
  });
  for (const a of s.allies) { a.mana = 30; a.focus = 9; a.hp = a.maxHp = 100; a.block = 0; a.hand = []; a.statuses = { ...a.statuses }; }
  if (tough) for (const e of s.enemies) if (e.defId !== 'ebDummy') { e.hp = e.maxHp = 1000; }
  return s;
}
let uid = 0;
/** カードを1枚使う（focus 1 = 完全成功。大技の予告を BREAK する） */
function use(s: BattleState, cardId: string, targetId?: string, focus = 0, who = 0): BattleState {
  const a = s.allies[who], inst = { uid: `eb${uid++}`, cardId };
  a.hand.push(inst);
  const r = applyCommand(s, { type: 'PLAY_CARD', playerId: P, characterId: a.id, cardInstanceId: inst.uid, targetId, focusUsed: focus } as Command);
  expect(r.error, cardId).toBeUndefined();
  return r.state;
}
const endTurn = (s: BattleState) => applyCommand(s, { type: 'END_TURN', playerId: P }).state;
function nextTurn(s: BattleState): BattleState {
  let st = endTurn(s);
  for (let i = 0; st.phase === 'enemy' && i < 30; i++) st = applyCommand(st, { type: 'ENEMY_STEP' }).state;
  return st;
}
/** その敵の次の行動を決める（予告の対象もいっしょに） */
function setIntent(s: BattleState, i: number, actionId: string, targetId: string | undefined = s.allies[0].id) {
  s.enemies[i].intent = { actionId, targetId };
}
const action = (enemyId: string, id: string) => getEnemy(enemyId).actions.find((a) => a.id === id)!;

describe('敵の特殊な行動: 割り当てと予告の文（§7）', () => {
  const table: [string, string, string, string][] = [
    ['mireSlime', 'harden', '浄化の脱皮', '状態異常を全部消して回復する。その前に起爆するか、BREAK する'],
    ['reedStalker', 'cover', '手数読み', 'このターンにカードを4枚以上使った味方に、枚数×2のダメージ'],
    ['basaltCrawler', 'horn', '盾砕き', '当たるとブロックを全部壊す。BREAK するか、ブロックに頼らずに受ける'],
    ['cinderHound', 'bite', '手負い狙い', 'HPの割合がいちばん低い味方を狙う。HPが半分以下だと×1.5'],
    ['darkKnight', 'guard', 'かばう', '次の味方の番の間、ほかの敵への単体攻撃を代わりに受ける。全体攻撃は通る'],
    ['siegeImp', 'guard', '仲間を呼ぶ', '仲間を1体呼ぶ。その前に倒すか、BREAK する'],
    ['cursedHound', 'brace', '癒し封じの呪い', '味方全員の回復が、2ターン半分になる。BREAK するか、先に回復を使う'],
  ];
  const kinds: Record<string, string> = { mireSlime: 'purify', reedStalker: 'punish', basaltCrawler: 'shatter', cinderHound: 'hunt', darkKnight: 'guard', siegeImp: 'call', cursedHound: 'healSeal' };
  it.each(table)('%s の「%s」は大技で、予告の文と特殊な行動の種類が付いている', (enemyId, actionId, name, hint) => {
    const a = action(enemyId, actionId);
    expect(a.name).toBe(name);
    expect(a.big).toBe(true);
    expect(a.hint).toBe(hint);
    expect(a.behavior).toBe(kinds[enemyId]);
    // 置き換えたのは1つだけ（ほかの行動は大技ではない）
    expect(getEnemy(enemyId).actions.filter((x) => x.big).map((x) => x.id)).toEqual([actionId]);
  });
  it('HP・経験値・お金・弱点は元のまま', () => {
    expect([getEnemy('mireSlime').maxHp, getEnemy('reedStalker').maxHp, getEnemy('basaltCrawler').maxHp, getEnemy('cinderHound').maxHp, getEnemy('darkKnight').maxHp, getEnemy('siegeImp').maxHp, getEnemy('cursedHound').maxHp]).toEqual([26, 28, 44, 32, 60, 46, 50]);
    expect(getEnemy('darkKnight').exp).toBe(24);
    expect(getEnemy('siegeImp').weak).toEqual(['holy', 'ice']);
  });
});

describe('浄化（沼の大ガマ）', () => {
  it('悪い状態異常を全部消し、1種類につきHP6回復する', () => {
    let s = battle(['mireSlime']);
    const e = s.enemies[0];
    e.hp = 500; e.statuses.poison = 3; e.statuses.weak = 2;
    setIntent(s, 0, 'harden', undefined);
    s = nextTurn(s);
    expect(s.enemies[0].statuses.poison).toBe(0);
    expect(s.enemies[0].statuses.weak).toBe(0);
    expect(s.enemies[0].hp).toBe(512);
  });
  it('何も付いていなければ、何も起きない', () => {
    let s = battle(['mireSlime']);
    s.enemies[0].hp = 500;
    setIntent(s, 0, 'harden', undefined);
    s = nextTurn(s);
    expect(s.enemies[0].hp).toBe(500);
  });
  it('浄化は順番の最後（1ターン目は毒泥の飛沫）', () => {
    expect(getEnemy('mireSlime').actions.map((a) => a.id)).toEqual(['splash', 'tackle', 'harden']);
    expect(getEnemy('mireSlime').firstActionId).toBeUndefined();
    const s = battle(['mireSlime']);
    expect(s.enemies[0].intent?.actionId).toBe('splash');
  });
  it('BREAK すると起きない（状態異常は残る）', () => {
    let s = battle(['mireSlime']);
    s.enemies[0].statuses.poison = 5;
    setIntent(s, 0, 'harden', undefined);
    s = use(s, 'ebHit', s.enemies[0].uid, 1);
    expect(s.enemies[0].broken).toBe(true);
    const hp = s.enemies[0].hp;
    s = nextTurn(s);
    // 毒は消えず、敵の番の終わりに5ダメージ（回復なし）
    expect(s.enemies[0].hp).toBe(hp - 5);
    expect(s.enemies[0].statuses.poison).toBe(4);
  });
});

describe('手数読み（葦陰の狩人）', () => {
  it('3枚の味方には何もせず、4枚の味方には 4×2 のダメージ', () => {
    let s = battle(['reedStalker'], 2);
    setIntent(s, 0, 'cover', undefined);
    for (let i = 0; i < 4; i++) s = use(s, 'ebZero', undefined, 0, 0);
    for (let i = 0; i < 3; i++) s = use(s, 'ebZero', undefined, 0, 1);
    // 予告の「受ける予定」にも出る
    expect(incomingDamage(s, s.allies[0])).toBe(8);
    expect(incomingDamage(s, s.allies[1])).toBe(0);
    s = nextTurn(s);
    expect(s.allies[0].hp).toBe(92);
    expect(s.allies[1].hp).toBe(100);
  });
  it('ブロックで防げる', () => {
    let s = battle(['reedStalker']);
    setIntent(s, 0, 'cover', undefined);
    for (let i = 0; i < 5; i++) s = use(s, 'ebZero');
    s.allies[0].block = 6;
    s = nextTurn(s);
    expect(s.allies[0].hp).toBe(96);
  });
  it('BREAK すると、今の大技の決まりどおり半分（枚数×1）になる', () => {
    let s = battle(['reedStalker']);
    setIntent(s, 0, 'cover', undefined);
    s = use(s, 'ebHit', s.enemies[0].uid, 1);
    expect(s.enemies[0].broken).toBe(true);
    for (let i = 0; i < 3; i++) s = use(s, 'ebZero');
    s = nextTurn(s);
    // 4枚 × 1（BREAK で付くのは脆弱なので、敵の攻撃は減らない。2026-11-13 に弱体から変えた）
    expect(s.allies[0].hp).toBe(96);
  });
});

describe('盾砕き（玄武岩の虫）', () => {
  it('ブロックを全部壊してから、10ダメージ', () => {
    let s = battle(['basaltCrawler']);
    setIntent(s, 0, 'horn');
    s.allies[0].block = 15;
    s = nextTurn(s);
    expect(s.allies[0].hp).toBe(90);
  });
  it('ブロックが無ければ、ふつうの10ダメージ', () => {
    let s = battle(['basaltCrawler']);
    setIntent(s, 0, 'horn');
    s = nextTurn(s);
    expect(s.allies[0].hp).toBe(90);
  });
  it('BREAK するとブロックは壊れず、ダメージは半分', () => {
    let s = battle(['basaltCrawler']);
    setIntent(s, 0, 'horn');
    s = use(s, 'ebHit', s.enemies[0].uid, 1);
    s.allies[0].block = 15;
    s = endTurn(s);
    s = applyCommand(s, { type: 'ENEMY_STEP' }).state;
    // 5 をブロックで受ける（BREAK で付くのは脆弱なので、敵の攻撃は減らない。2026-11-13 に弱体から変えた）
    expect(s.allies[0].hp).toBe(100);
    expect(s.allies[0].block).toBe(10);
  });
});

describe('手負い狙い（炭火の猟犬）', () => {
  const decide = (s: BattleState) => { s.enemies[0].seqIndex = 0; decideIntent(s.enemies[0], s, createRng(1)); };
  it('予告を出す時に、HPの割合がいちばん低い味方を狙う（同じなら並びの前）', () => {
    const s = battle(['cinderHound'], 3);
    s.allies[0].hp = 80; s.allies[1].hp = 60; s.allies[2].hp = 70;
    decide(s);
    expect(s.enemies[0].intent).toEqual({ actionId: 'bite', targetId: s.allies[1].id });
    s.allies[0].hp = 50; s.allies[1].hp = 50; s.allies[2].maxHp = 200; s.allies[2].hp = 100;
    decide(s);
    expect(s.enemies[0].intent?.targetId).toBe(s.allies[0].id);
    // 倒れた味方は狙わない
    s.allies[0].dead = true; s.allies[0].hp = 0;
    decide(s);
    expect(s.enemies[0].intent?.targetId).toBe(s.allies[1].id);
  });
  it('当たる時にHPが半分以下なら×1.5、半分より上なら等倍', () => {
    let s = battle(['cinderHound'], 2);
    s.allies[0].hp = 90; s.allies[1].hp = 50;
    decide(s);
    expect(incomingDamage(s, s.allies[1])).toBe(15);
    s = nextTurn(s);
    expect(s.allies[1].hp).toBe(35);
    s = battle(['cinderHound'], 2);
    s.allies[0].hp = 90; s.allies[1].hp = 51;
    decide(s);
    s = nextTurn(s);
    expect(s.allies[1].hp).toBe(41);
  });
  it('挑発で狙いを変えられる', () => {
    let s = battle(['cinderHound'], 2);
    s.allies[0].hp = 100; s.allies[1].hp = 40;
    decide(s);
    expect(s.enemies[0].intent?.targetId).toBe(s.allies[1].id);
    s = use(s, 'ebTaunt', s.enemies[0].uid, 0, 0);
    expect(s.enemies[0].intent?.targetId).toBe(s.allies[0].id);
    s = nextTurn(s);
    expect(s.allies[1].hp).toBe(40);
    expect(s.allies[0].hp).toBe(90);
  });
  it('BREAK すると半分（5×1.5。BREAK で付くのは脆弱なので、敵の攻撃は減らない）', () => {
    let s = battle(['cinderHound'], 2);
    s.allies[0].hp = 100; s.allies[1].hp = 40;
    decide(s);
    s = use(s, 'ebHit', s.enemies[0].uid, 1);
    expect(s.enemies[0].broken).toBe(true);
    s = endTurn(s);
    s = applyCommand(s, { type: 'ENEMY_STEP' }).state;
    expect(s.allies[1].hp).toBe(33);
  });
});

describe('かばう（魔王軍の騎士）', () => {
  /** かばう状態にする（直しで足したブロック10は、ここでは外す。ダメージの受け方だけを見るため） */
  function guarded(enemies = ['darkKnight', 'ebDummy']) {
    let s = battle(enemies);
    setIntent(s, 0, 'guard', undefined);
    s = nextTurn(s);
    expect(s.enemies[0].guarding).toBe(true);
    expect(s.enemies[0].block).toBe(10);
    s.enemies[0].block = 0;
    return s;
  }
  it('ほかの敵を狙った単体攻撃のカードは、騎士が受ける', () => {
    let s = guarded();
    const knight = s.enemies[0].hp, dummy = s.enemies[1].hp;
    s = use(s, 'ebHit', s.enemies[1].uid);
    expect(s.enemies[1].hp).toBe(dummy);
    expect(s.enemies[0].hp).toBe(knight - 10);
  });
  it('騎士を狙えば騎士に当たる。全体攻撃は、それぞれに通る', () => {
    let s = guarded();
    const knight = s.enemies[0].hp, dummy = s.enemies[1].hp;
    s = use(s, 'ebAll');
    expect(s.enemies[0].hp).toBe(knight - 10);
    expect(s.enemies[1].hp).toBe(dummy - 10);
    s = use(s, 'ebHit', s.enemies[0].uid);
    expect(s.enemies[0].hp).toBe(knight - 20);
  });
  it('お供・召喚の攻撃は、そのまま通る', () => {
    let s = guarded();
    const dummy = s.enemies[1].hp;
    s.allies[0].summons = [{ id: 'ebTurret', name: '確認用の砲台', icon: 'T', damage: 7, turns: 1, targetId: s.enemies[1].uid }];
    s = endTurn(s);
    expect(s.enemies[1].hp).toBe(dummy - 7);
  });
  it('敵の番の始めに終わる。倒れても終わる', () => {
    let s = guarded();
    s = endTurn(s);
    expect(s.enemies[0].guarding).toBeUndefined();
    s = guarded();
    s.enemies[0].hp = 5;
    s = use(s, 'ebHit', s.enemies[0].uid);
    expect(s.enemies[0].dead).toBe(true);
    expect(s.enemies[0].guarding).toBeUndefined();
    const dummy = s.enemies[1].hp;
    s = use(s, 'ebHit', s.enemies[1].uid);
    expect(s.enemies[1].hp).toBe(dummy - 10);
  });
  it('かばう敵が2体いる時は、並びの前の1体が受ける', () => {
    let s = battle(['darkKnight', 'darkKnight', 'ebDummy']);
    setIntent(s, 0, 'guard', undefined);
    setIntent(s, 1, 'guard', undefined);
    s = nextTurn(s);
    s.enemies[0].block = s.enemies[1].block = 0;
    const [a, b] = [s.enemies[0].hp, s.enemies[1].hp];
    s = use(s, 'ebHit', s.enemies[2].uid);
    expect(s.enemies[0].hp).toBe(a - 10);
    expect(s.enemies[1].hp).toBe(b);
  });
  it('ほかの敵がいない時は「かばう」を選ばず、闇の剣の予告になる', () => {
    const s = battle(['darkKnight']);
    for (let i = 0; i < 40; i++) {
      decideIntent(s.enemies[0], s, createRng(i));
      expect(s.enemies[0].intent?.actionId).not.toBe('guard');
    }
    // 闇の剣に変わった時は、狙う味方も決まっている
    s.enemies[0].history = [];
    const rng = createRng(3);
    let seen = false;
    for (let i = 0; i < 40 && !seen; i++) {
      decideIntent(s.enemies[0], s, rng);
      if (s.enemies[0].intent?.actionId === 'slash') { seen = true; expect(s.enemies[0].intent.targetId).toBe(s.allies[0].id); }
    }
    expect(seen).toBe(true);
    // ほかの敵がいれば、かばうを選ぶ事がある
    const t = battle(['darkKnight', 'ebDummy']);
    const r2 = createRng(5);
    const picked = new Set<string>();
    for (let i = 0; i < 40; i++) { t.enemies[0].history = []; decideIntent(t.enemies[0], t, r2); picked.add(t.enemies[0].intent!.actionId); }
    expect(picked.has('guard')).toBe(true);
  });
  it('かばうの予告の後に、ほかの敵が全部倒れたら、その時点で闇の剣の予告に変わり、敵の番に闇の剣を行う', () => {
    let s = battle(['darkKnight', 'ebDummy']);
    s.enemies[1].hp = 5;
    setIntent(s, 0, 'guard', undefined);
    s.enemies[0].history = ['guard'];
    s = use(s, 'ebHit', s.enemies[1].uid);
    expect(s.enemies[1].dead).toBe(true);
    // 倒れた時点で予告が変わる（狙う味方も決まる）
    expect(s.enemies[0].intent).toEqual({ actionId: 'slash', targetId: s.allies[0].id });
    expect(s.enemies[0].history.at(-1)).toBe('slash');
    const hp = s.allies[0].hp;
    s = nextTurn(s);
    expect(s.enemies[0].guarding).toBeFalsy();
    expect(s.allies[0].hp).toBeLessThan(hp);
    expect(s.log.some((l) => l.text.includes('「闇の剣」'))).toBe(true);
    expect(s.log.some((l) => l.text.includes('「かばう」'))).toBe(false);
  });
  it('古い保存などで「かばう」のまま敵の番になっても、ひとりなら闇の剣を行う', () => {
    let s = battle(['darkKnight']);
    setIntent(s, 0, 'guard', undefined);
    const hp = s.allies[0].hp;
    s = nextTurn(s);
    expect(s.enemies[0].guarding).toBeFalsy();
    expect(s.allies[0].hp).toBeLessThan(hp);
  });
  it('BREAK すると、かばわない', () => {
    let s = battle(['darkKnight', 'ebDummy']);
    setIntent(s, 0, 'guard', undefined);
    s = use(s, 'ebHit', s.enemies[0].uid, 1);
    expect(s.enemies[0].broken).toBe(true);
    s = nextTurn(s);
    expect(s.enemies[0].guarding).toBeFalsy();
  });
});

describe('仲間を呼ぶ（砦の小悪魔）', () => {
  /** 呼ばれた敵が動かないように、予告を消してから次のターンへ */
  const quiet = (s: BattleState) => { for (const e of s.enemies) if (e.defId === 'ashBat') e.intent = undefined; return s; };
  it('灰コウモリを1体、呼んだ敵と同じレベル・同じ強さの補正で足す（報酬あり・uid は重ならない）', () => {
    let s = battle(['siegeImp'], 1, false);
    setIntent(s, 0, 'guard', undefined);
    s = nextTurn(s);
    expect(s.enemies).toHaveLength(2);
    const bat = s.enemies[1];
    expect(bat.defId).toBe('ashBat');
    expect(bat.uid).toBe('e1');
    expect(bat.level).toBe(s.enemies[0].level);
    expect(bat.summoned).toBeUndefined();
    // 同じ人数・同じレベルで最初から出た灰コウモリと同じ強さ
    const ref = createBattle({ seed: 1, party: [{ classId: 'warrior', gender: 'male', name: 'x', playerId: P }], encounter: { id: 'r', name: 'r', enemies: [{ defId: 'ashBat', level: bat.level }] } }).enemies[0];
    // HPは呼んだ敵の補正から割り戻すので、端数の切り捨てで1違う事がある（今までの増援と同じ作り）
    expect(Math.abs(bat.maxHp - ref.maxHp)).toBeLessThanOrEqual(1);
    expect(bat.attackMul).toBeCloseTo(ref.attackMul);
    // 呼ばれたターンには動かない（次のターンの予告は出ている）
    expect(bat.intent).toBeDefined();
  });
  it('1戦闘に2回まで。3回目は、ふつうの攻撃（砦の投石 14）', () => {
    let s = battle(['siegeImp'], 1, false);
    for (let i = 0; i < 2; i++) { setIntent(s, 0, 'guard', undefined); s = nextTurn(quiet(s)); }
    expect(s.enemies.map((e) => e.defId)).toEqual(['siegeImp', 'ashBat', 'ashBat']);
    expect(new Set(s.enemies.map((e) => e.uid)).size).toBe(3);
    // 予告を決める時にも、もう呼べない事が分かる → ふつうの攻撃の予告になる
    s.enemies[0].seqIndex = 2;
    decideIntent(s.enemies[0], s, createRng(1));
    expect(s.enemies[0].intent?.actionId).toBe('stone');
    // 予告を書き換えて呼ばせても、呼ばずに攻撃する
    setIntent(s, 0, 'guard', undefined);
    const hp = s.allies[0].hp;
    s = nextTurn(quiet(s));
    expect(s.enemies).toHaveLength(3);
    expect(s.allies[0].hp).toBe(hp - 14);
  });
  it('生きている敵が4体なら呼ばない。倒れた敵は数えない', () => {
    let s = battle(['siegeImp', 'ebDummy', 'ebDummy', 'ebDummy'], 1, false);
    setIntent(s, 0, 'guard', undefined);
    s = nextTurn(s);
    expect(s.enemies).toHaveLength(4);
    expect(s.allies[0].hp).toBe(86);
    // 1体倒れていれば呼べる（並びは5つになる）
    s = battle(['siegeImp', 'ebDummy', 'ebDummy', 'ebDummy'], 1, false);
    s.enemies[3].dead = true; s.enemies[3].hp = 0; s.enemies[3].intent = undefined;
    setIntent(s, 0, 'guard', undefined);
    s = nextTurn(s);
    expect(s.enemies).toHaveLength(5);
    expect(s.enemies[4].uid).toBe('e4');
    expect(s.enemies.filter((e) => !e.dead)).toHaveLength(4);
  });
  it('BREAK すると呼ばない', () => {
    let s = battle(['siegeImp'], 1, false);
    setIntent(s, 0, 'guard', undefined);
    s = use(s, 'ebHit', s.enemies[0].uid, 1);
    expect(s.enemies[0].broken).toBe(true);
    const hp = s.allies[0].hp;
    s = nextTurn(s);
    expect(s.enemies).toHaveLength(1);
    expect(s.allies[0].hp).toBe(hp);
  });
});

describe('癒し封じの呪い（呪紋の魔犬）', () => {
  it('味方全員に「癒し封じ」2。悪い状態異常', () => {
    let s = battle(['cursedHound'], 2);
    setIntent(s, 0, 'brace', undefined);
    s = nextTurn(s);
    expect(s.allies.map((a) => a.statuses.healSeal)).toEqual([2, 2]);
    expect(getStatus('healSeal').harmful).toBe(true);
  });
  it('回復が半分（端数切り捨て）。カードも再生も', () => {
    let s = battle(['cursedHound']);
    setIntent(s, 0, 'brace', undefined);
    s = nextTurn(s);
    s.allies[0].hp = 50;
    s = use(s, 'ebHeal');
    expect(s.allies[0].hp).toBe(60);
    // 再生3 → 1（3 × 0.5 = 1.5 の切り捨て）
    s.allies[0].hp = 50; s.allies[0].statuses.regen = 3;
    s.enemies[0].intent = undefined;
    s = nextTurn(s);
    expect(s.allies[0].hp).toBe(51);
  });
  it('2ターンで消える（味方の番の終わりに1ずつ減る）', () => {
    let s = battle(['ebDummy', 'cursedHound']);
    setIntent(s, 1, 'brace', undefined);
    s = nextTurn(s);
    expect(s.allies[0].statuses.healSeal).toBe(2);
    s.enemies[1].intent = undefined;
    s = nextTurn(s);
    expect(s.allies[0].statuses.healSeal).toBe(1);
    s.enemies[1].intent = undefined;
    s = nextTurn(s);
    expect(s.allies[0].statuses.healSeal).toBe(0);
    s.allies[0].hp = 50;
    s = use(s, 'ebHeal');
    expect(s.allies[0].hp).toBe(70);
  });
  it('状態異常を消す効果で消える', () => {
    let s = battle(['cursedHound']);
    setIntent(s, 0, 'brace', undefined);
    s = nextTurn(s);
    s = use(s, 'ebCleanse');
    expect(s.allies[0].statuses.healSeal).toBe(0);
  });
  it('BREAK すると起きない', () => {
    let s = battle(['cursedHound']);
    setIntent(s, 0, 'brace', undefined);
    s = use(s, 'ebHit', s.enemies[0].uid, 1);
    s = nextTurn(s);
    expect(s.allies[0].statuses.healSeal ?? 0).toBe(0);
  });
});

// ===== 敵の特殊な行動の直し（docs/tasks/enemy-behaviors-fix-plan.md §3・2026-11-13） =====

/** 予告の行動のIDを、ターンごとに並べる（ブロックや状態異常で邪魔されないように、味方のHPは毎ターン戻す） */
function intentsOver(s: BattleState, turns: number, each?: (s: BattleState) => void): string[] {
  const ids: string[] = [s.enemies[0].intent!.actionId];
  for (let i = 1; i < turns; i++) {
    each?.(s);
    s = nextTurn(s);
    for (const a of s.allies) { a.hp = a.maxHp; a.statuses = { ...a.statuses, healSeal: 0, poison: 0 }; }
    ids.push(s.enemies[0].intent!.actionId);
  }
  return ids;
}

describe('直し: 何ターン目に予告するか（7体）', () => {
  it('葦陰の狩人: 1ターン目に手数読み。2ターン目からは葦の鎌・二枚の刃・手数読みの順', () => {
    expect(getEnemy('reedStalker').firstActionId).toBe('cover');
    expect(intentsOver(battle(['reedStalker']), 5)).toEqual(['cover', 'slash', 'pair', 'cover', 'slash']);
  });
  it('呪紋の魔犬: 1ターン目に癒し封じ。2ターン目からは呪紋の牙・二連の爪・癒し封じの順', () => {
    expect(intentsOver(battle(['cursedHound']), 5)).toEqual(['brace', 'bite', 'flurry', 'brace', 'bite']);
  });
  it('魔王軍の騎士: ほかの敵がいる時は1ターン目に必ずかばう（どの種でも）。1体だけの時は闇の剣', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = createBattle({ seed, party: [{ classId: 'warrior', gender: 'male', name: 'x', playerId: P }], encounter: { id: 'k', name: 'k', enemies: [{ defId: 'darkKnight' }, { defId: 'ashBat' }] } });
      expect(s.enemies[0].intent?.actionId).toBe('guard');
      const lone = createBattle({ seed, party: [{ classId: 'warrior', gender: 'male', name: 'x', playerId: P }], encounter: { id: 'k', name: 'k', enemies: [{ defId: 'darkKnight' }] } });
      expect(lone.enemies[0].intent?.actionId).toBe('slash');
      expect(lone.enemies[0].intent?.targetId).toBeDefined();
    }
  });
  it('炭火の猟犬・玄武岩の虫: 順番はそのまま（1ターン目に手負い狙い・盾砕き）', () => {
    expect(battle(['cinderHound']).enemies[0].intent?.actionId).toBe('bite');
    expect(battle(['basaltCrawler']).enemies[0].intent?.actionId).toBe('horn');
  });
  it('沼の大ガマ: 状態異常が無ければ、ふつうの順番（1ターン目は毒泥の飛沫）', () => {
    expect(intentsOver(battle(['mireSlime']), 4)).toEqual(['splash', 'tackle', 'harden', 'splash']);
  });
  it('砦の小悪魔: 呼べる時は1ターン目に増援', () => {
    expect(battle(['siegeImp'], 1, false).enemies[0].intent?.actionId).toBe('guard');
  });
});

describe('直し: 浄化の割り込み（沼の大ガマ）', () => {
  it('悪い状態異常がある時は割り込む。割り込んだら次の2ターンは割り込まない。順番の位置は進めない', () => {
    const s = battle(['mireSlime']);
    const e = s.enemies[0];
    // 1ターン目: 毒泥の飛沫（順番の位置は1へ）
    expect(e.intent?.actionId).toBe('splash');
    expect(e.seqIndex).toBe(1);
    e.statuses.poison = 3;
    const rng = createRng(1);
    const at = (turn: number) => { s.turn = turn; decideIntent(e, s, rng); return [e.intent!.actionId, e.seqIndex]; };
    expect(at(1)).toEqual(['harden', 1]); // 割り込み（位置はそのまま）
    expect(at(2)).toEqual(['tackle', 2]); // 休み1（元の順番の続き）
    expect(at(3)).toEqual(['harden', 0]); // 休み2（順番の3番目にも残っている）
    expect(at(4)).toEqual(['harden', 0]); // 3ターン後に、また割り込める
    expect(e.cutInTurn).toBe(4);
    e.statuses.poison = 0;
    expect(at(5)).toEqual(['splash', 1]); // 状態異常が無ければ割り込まない
  });
  it('戦闘の中で: 毒を付けると次のターンに浄化を予告し、敵の番に消して回復する', () => {
    let s = battle(['mireSlime']);
    s.enemies[0].hp = 500;
    s.enemies[0].statuses.poison = 5;
    s = nextTurn(s);
    expect(s.enemies[0].intent?.actionId).toBe('harden');
    const hp = s.enemies[0].hp;
    s = nextTurn(s);
    expect(s.enemies[0].statuses.poison).toBe(0);
    expect(s.enemies[0].hp).toBe(hp + 6);
  });
  it('BREAK で付く脆弱でも割り込む（悪い状態異常なので）', () => {
    const s = battle(['mireSlime']);
    s.enemies[0].statuses.vulnerable = 1;
    s.turn = 1;
    decideIntent(s.enemies[0], s, createRng(1));
    expect(s.enemies[0].intent?.actionId).toBe('harden');
  });
  it('休みの長さは行動のデータ（rest）で決まる（既定2）', () => {
    expect(action('mireSlime', 'harden').cutIn).toEqual({ when: 'afflicted', rest: 2 });
  });
});

describe('直し: 仲間を呼ぶの優先（砦の小悪魔）', () => {
  const quiet = (s: BattleState) => { for (const e of s.enemies) if (e.defId === 'ashBat') e.intent = undefined; };
  it('呼べる時は優先するが、2ターン続けては呼ばない。2回呼んだら順番に戻る', () => {
    const s = battle(['siegeImp'], 1, false);
    const ids = intentsOver(s, 7, quiet);
    // 呼ぶ（優先）→ 投石（順番の1番目）→ 呼ぶ（優先・2回目）→ 火の粉（順番の続き）→ 順番の「呼ぶ」は回数切れで投石 → 投石 → 火の粉
    expect(ids).toEqual(['guard', 'stone', 'guard', 'scatter', 'stone', 'stone', 'scatter']);
    // 2ターン続けて「仲間を呼ぶ」が並ばない
    for (let i = 1; i < ids.length; i++) expect(ids[i] === 'guard' && ids[i - 1] === 'guard').toBe(false);
  });
  it('生きている敵が4体の時は優先しない（ふつうの順番）', () => {
    const s = battle(['siegeImp', 'ebDummy', 'ebDummy', 'ebDummy'], 1, false);
    expect(s.enemies[0].intent?.actionId).toBe('stone');
  });
  it('順番で「仲間を呼ぶ」に来ても、前のターンに呼んでいたら代わりの攻撃', () => {
    const s = battle(['siegeImp'], 1, false);
    const e = s.enemies[0];
    e.history = ['guard']; e.seqIndex = 2; e.cutInTurn = 5; s.turn = 6;
    decideIntent(e, s, createRng(1));
    expect(e.intent?.actionId).toBe('stone');
  });
});

describe('直し: 空振りを無くす（代わりのふつうの攻撃）', () => {
  it('呼ぶ予告の後に満員になったら、敵の番に砦の投石を行う（ブロックは付かない）', () => {
    let s = battle(['siegeImp', 'ebDummy', 'ebDummy'], 1, false);
    setIntent(s, 0, 'guard', undefined);
    // 予告の後に、もう1体が出てきて満員（4体）になった
    s.enemies.push({ ...s.enemies[1], uid: 'e3', intent: undefined });
    const hp = s.allies[0].hp;
    s = nextTurn(s);
    expect(s.enemies).toHaveLength(4);
    expect(s.allies[0].hp).toBe(hp - 14);
    expect(s.enemies[0].block).toBe(0);
    expect(s.log.some((l) => l.text.includes('「砦の投石」'))).toBe(true);
  });
  it('かばう・仲間を呼ぶを持つ敵は、全部、代わりの行動を持っている（データに無ければ落ちる）', () => {
    let n = 0;
    for (const def of ENEMIES.all) {
      for (const a of [...def.actions, ...(def.phases ?? []).flatMap((p) => p.actions)]) {
        const conditional = a.effects.some((e) => e.kind === 'guardAllies' || (e.kind === 'summonEnemy' && e.call));
        if (!conditional) continue;
        n++;
        const fb = fallbackIdOf(a);
        expect(fb, `${def.id}.${a.id}`).toBeDefined();
        // 代わりの行動は、同じ敵のふつうの攻撃（ダメージがある）
        expect(getEnemyAction(def.id, fb!).effects.some((e) => e.kind === 'damage'), `${def.id}.${a.id} → ${fb}`).toBe(true);
      }
    }
    expect(n).toBeGreaterThanOrEqual(2);
  });
  it('特殊な行動の効果を持つ行動には、全部、種類の印（behavior）が付いている', () => {
    for (const def of ENEMIES.all) {
      for (const a of [...def.actions, ...(def.phases ?? []).flatMap((p) => p.actions)]) {
        expect(a.behavior, `${def.id}.${a.id}`).toBe(behaviorFromEffects(a));
      }
    }
  });
});

describe('直し: 特殊な行動のブロックと BREAK', () => {
  const table: [string, string, number][] = [['reedStalker', 'cover', 8], ['darkKnight', 'guard', 10], ['siegeImp', 'guard', 8], ['cursedHound', 'brace', 8]];
  it.each(table)('%s の「%s」はブロック%iが付く', (enemyId, actionId, block) => {
    let s = battle([enemyId, 'ebDummy'], 1, enemyId !== 'siegeImp');
    setIntent(s, 0, actionId, undefined);
    s = nextTurn(s);
    expect(s.enemies[0].block).toBe(block);
  });
  it.each(table)('%s の「%s」は BREAK されるとブロックが付かない（BREAK でブロック0のまま）', (enemyId, actionId) => {
    let s = battle([enemyId, 'ebDummy'], 1, enemyId !== 'siegeImp');
    setIntent(s, 0, actionId, undefined);
    s.enemies[0].block = 5;
    s = use(s, 'ebHit', s.enemies[0].uid, 1);
    expect(s.enemies[0].broken).toBe(true);
    expect(s.enemies[0].block).toBe(0);
    s = nextTurn(s);
    expect(s.enemies[0].block).toBe(0);
  });
  it('BREAK された手数読みは、今の決まりどおり半分（枚数×1）で起き、ブロックは付かない', () => {
    let s = battle(['reedStalker']);
    setIntent(s, 0, 'cover', undefined);
    s = use(s, 'ebHit', s.enemies[0].uid, 1);
    for (let i = 0; i < 3; i++) s = use(s, 'ebZero');
    s = nextTurn(s);
    expect(s.allies[0].hp).toBe(96);
    expect(s.enemies[0].block).toBe(0);
  });
  it('BREAK された他の特殊な行動（かばう・呼ぶ・癒し封じ）は、行動ごと起きない', () => {
    let s = battle(['darkKnight', 'ebDummy']);
    setIntent(s, 0, 'guard', undefined);
    s = use(s, 'ebHit', s.enemies[0].uid, 1);
    s = nextTurn(s);
    expect(s.enemies[0].guarding).toBeFalsy();
  });
});

describe('直し: 予告の札と1行の案内（行動のデータから決まる）', () => {
  const table: [string, string, string, string][] = [
    ['reedStalker', 'cover', '⚠️手数読み', '4枚以上使うと反撃'],
    ['darkKnight', 'guard', '🛡️かばう', '単体攻撃を代わりに受ける'],
    ['cursedHound', 'brace', '🚫癒し封じ', '回復が2ターン半分'],
    ['siegeImp', 'guard', '📢増援', '仲間を1体呼ぶ'],
    ['cinderHound', 'bite', '🎯手負い狙い', 'HPの低い味方を狙う'],
    ['basaltCrawler', 'horn', '🔨盾砕き', 'ブロックを全部壊す'],
    ['mireSlime', 'harden', '✨浄化', '状態異常を消して回復'],
  ];
  it.each(table)('%s の「%s」: 札 %s・案内「%s」', (enemyId, actionId, mark, brief) => {
    const s = battle([enemyId, 'ebDummy']);
    setIntent(s, 0, actionId);
    const v = intentView(s, s.enemies[0])!;
    expect(`${v.behavior!.icon}${v.behavior!.label}`).toBe(mark);
    expect(v.behavior!.brief).toBe(brief);
    // 長押しの長い文はそのまま
    expect(v.hint).toBe(action(enemyId, actionId).hint);
  });
  it('ふつうの行動には札が付かない。BREAK した後は、予告にブロックが出ない', () => {
    const s = battle(['reedStalker']);
    setIntent(s, 0, 'slash');
    expect(intentView(s, s.enemies[0])!.behavior).toBeUndefined();
    setIntent(s, 0, 'cover', undefined);
    expect(intentView(s, s.enemies[0])!.parts.some((p) => p.kind === 'block')).toBe(true);
    s.enemies[0].broken = true;
    expect(intentView(s, s.enemies[0])!.parts.some((p) => p.kind === 'block')).toBe(false);
  });
});

describe('直し: bot が予告を読む所（新しい形でも働く）', () => {
  it('手数読み（ブロック付き）・盾砕き・癒し封じ（ブロック付き）の予告を読める', () => {
    const s = battle(['reedStalker', 'basaltCrawler', 'cursedHound'], 2);
    setIntent(s, 0, 'cover', undefined);
    setIntent(s, 1, 'horn', s.allies[1].id);
    setIntent(s, 2, 'brace', undefined);
    const w = readWarnings(s);
    expect(w.playLimit).toBe(3);
    expect([...w.shieldBreak]).toEqual([s.allies[1].id]);
    expect(w.healSeal).toBe(true);
  });
});

describe('直し: 火山の敵の組', () => {
  const specialKinds = (group: string[]) => new Set(group.flatMap((id) => getEnemy(id).actions.map((a) => a.behavior).filter(Boolean)));
  it('世界マップの火山: 5組のうち4組に特殊な行動の敵がいる。1つの戦闘に特殊な行動は2種類まで', () => {
    const groups = getScenario('corruptionKing').map!.regions.find((r) => r.id === 'volcano')!.encounters!;
    expect(groups).toHaveLength(5);
    expect(groups.filter((g) => specialKinds(g).size > 0)).toHaveLength(4);
    for (const g of groups) expect(specialKinds(g).size).toBeLessThanOrEqual(2);
  });
  it('火山のダンジョン（溶岩の洞窟）: 特殊な行動の敵がいる組が半分以上。2種類まで', () => {
    const groups = DUNGEONS.get('lavaCavern').pools.battle;
    expect(groups.filter((g) => specialKinds(g).size > 0).length * 2).toBeGreaterThanOrEqual(groups.length);
    for (const g of groups) expect(specialKinds(g).size).toBeLessThanOrEqual(2);
  });
});

describe('直し: 古い保存の敵の状態', () => {
  it('cutInTurn の無い敵（古い保存）でも、予告を決められ、戦闘が進む', () => {
    let s = battle(['mireSlime', 'siegeImp', 'darkKnight']);
    for (const e of s.enemies) delete e.cutInTurn;
    // 古い保存の形: JSON を通した状態（任意の項目が無い）
    s = JSON.parse(JSON.stringify(s)) as BattleState;
    s.enemies[0].statuses.poison = 2;
    for (let i = 0; i < 4; i++) s = nextTurn(s);
    expect(s.phase).toBe('ally');
    for (const e of s.enemies) if (!e.dead) expect(e.intent).toBeDefined();
  });
  it('途中まで進んだ古い保存（history あり・seqIndex 途中）でも、1ターン目の行動は出さず、順番の続きから', () => {
    const s = battle(['reedStalker']);
    const e = s.enemies[0];
    e.history = ['slash']; e.seqIndex = 1; delete e.cutInTurn;
    decideIntent(e, s, createRng(1));
    expect(e.intent?.actionId).toBe('pair');
  });
});
