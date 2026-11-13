// 敵の特殊な行動 1回目（docs/tasks/enemy-behaviors-plan.md §7）: シナリオ1 の敵7体・7種類
// 浄化（脱皮）・手数読み・盾砕き・手負い狙い・かばう・仲間を呼ぶ・癒し封じの呪い
import { describe, expect, it } from 'vitest';
import { CARDS } from '../../data/cards';
import { ENEMIES, getEnemy } from '../../data/enemies';
import { getStatus } from '../../data/statuses';
import type { BattleState, CardDef, Command, PlayerId } from '../../types';
import { applyCommand, createBattle, createRng, decideIntent, incomingDamage } from '../index';

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
  it.each(table)('%s の「%s」は大技で、予告の文が付いている', (enemyId, actionId, name, hint) => {
    const a = action(enemyId, actionId);
    expect(a.name).toBe(name);
    expect(a.big).toBe(true);
    expect(a.hint).toBe(hint);
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
  function guarded(enemies = ['darkKnight', 'ebDummy']) {
    let s = battle(enemies);
    setIntent(s, 0, 'guard', undefined);
    s = nextTurn(s);
    expect(s.enemies[0].guarding).toBe(true);
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
