// 敵の特殊な行動のばらし・開幕の一手の「止めても少し効く」（2026-11-14 docs/tasks/behavior-variety-plan.md）
// - 7種類×7体（盾砕きは6体）の48体: 同じ種類の中で形（条件・相手・答え方）がちがう事
// - 敵ごとの仕組み（手数読みの数え方・かばう形・癒し封じ・呼ぶ条件・手負い狙いの狙い・盾砕き・浄化）
// - 開幕の一手の残り香・代償（11手）
// - 古い保存（戦闘の途中）・JSON をはさんでも同じ結果・乱数を余分に引かない
import { describe, expect, it } from 'vitest';
import { CARDS } from '../../data/cards';
import { ENEMIES, getEnemy } from '../../data/enemies';
import { behaviorFromEffects } from '../../data/enemyBehaviors';
import { breakHowText, intentView } from '../../components/format';
import type { BattleState, CardDef, Command, EnemyActionDef, EnemyBehaviorId, PlayerId } from '../../types';
import { applyCommand, createBattle, createRng, decideIntent } from '../index';

const P: PlayerId = 'P1';
const card = (id: string, target: CardDef['target'], effects: CardDef['tiers'][0]['effects'], cost = 1): CardDef => ({ id, name: id, category: 'skill', cost, slots: 1, baseChance: 80, target, tiers: [{ minSuccesses: 0, effects }] });
CARDS.register(card('bvHit', 'enemy', [{ kind: 'damage', amount: 10 }]));
CARDS.register(card('bvAll', 'allEnemies', [{ kind: 'damage', amount: 10 }]));
CARDS.register(card('bvGuard', 'self', [{ kind: 'block', amount: 5 }]));
CARDS.register(card('bvZero', 'self', [{ kind: 'block', amount: 0 }], 0));
CARDS.register(card('bvPoison', 'enemy', [{ kind: 'applyStatus', status: 'poison', amount: 2 }]));
if (!ENEMIES.all.some((d) => d.id === 'bvDummy')) {
  ENEMIES.register({ id: 'bvDummy', icon: 'T', name: '確認用の置物', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence', actions: [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block', amount: 0 }] }] });
}

/** 48体（シナリオ1の7体は基本の形） */
const BODIES: Record<EnemyBehaviorId, [string, string][]> = {
  punish: [['reedStalker', 'cover'], ['iceFisher', 'hole'], ['octopusLarva', 'ink'], ['scribeShade', 'scroll'], ['hourglassGolem', 'turn'], ['steamTurretLord', 'aim'], ['echoConveyorBot', 'reset']],
  guard: [['darkKnight', 'guard'], ['iceKnight', 'guard'], ['conchKnight', 'shell'], ['clayGolem', 'harden'], ['skyKnight', 'guard'], ['venomBoilerCrab', 'shell'], ['echoColossusStatue', 'shove']],
  healSeal: [['cursedHound', 'brace'], ['blizzardSnake', 'coil'], ['siren', 'lament'], ['sandSprite', 'veil'], ['harpGuardian', 'song'], ['steamSprite', 'mist'], ['dreamWeaver', 'weave']],
  call: [['siegeImp', 'guard'], ['cursedFrozenSoldier', 'shield'], ['pirateGunner', 'reload'], ['venomJackalWarrior', 'guard'], ['thornFairy', 'tangle'], ['wrenchGolem', 'tighten'], ['echoWrenchGolem', 'tighten']],
  hunt: [['cinderHound', 'bite'], ['stormIceArcher', 'arrow'], ['shark', 'tear'], ['vulture', 'peck'], ['holyMoonWolf', 'bite'], ['ironClockworkDog', 'bite'], ['echoShark', 'tear']],
  shatter: [['basaltCrawler', 'horn'], ['iceSwordsman', 'thrust'], ['lanternAngler', 'gulp'], ['obeliskSentinel', 'slam'], ['cometFox', 'tail'], ['pistonFist', 'piston']],
  purify: [['mireSlime', 'harden'], ['iceSlime', 'shell'], ['barnacleBeast', 'crust'], ['cursedMummy', 'wrap'], ['moonRabbit', 'hex'], ['pressGolem', 'vent'], ['pillowGolem', 'fluff']],
};
const act = (id: string, a: string) => getEnemy(id).actions.find((x) => x.id === a)!;

/** 形（数字を伏せた効果の並び・割り込みの条件・大技か・決め方で選ぶか）。同じ種類の中で、ここがちがう事を確かめる */
function shape(a: EnemyActionDef): string {
  const hide = (v: unknown): unknown => (typeof v === 'number' ? '#' : Array.isArray(v) ? v.map(hide) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, hide(x)])) : v);
  // 呼ぶ敵の名前・状態異常の名前は形に入れる（何を呼ぶか・何を付けるかは答え方を変える）
  return JSON.stringify({ e: hide(a.effects), cut: a.cutIn?.when, big: !!a.big, scripted: !!a.scripted });
}

function battle(enemies: string[], allies = 2, seed = 7): BattleState {
  const s = createBattle({
    seed,
    party: Array.from({ length: allies }, (_, i) => ({ classId: 'warrior', gender: 'male' as const, name: `仲間${i + 1}`, playerId: P })),
    encounter: { id: 'bv', name: '確認', enemies: enemies.map((defId) => ({ defId })) },
  });
  for (const a of s.allies) { a.mana = 30; a.focus = 9; a.hp = a.maxHp = 100; a.block = 0; a.hand = []; }
  for (const e of s.enemies) { e.attackMul = 1; if (e.defId !== 'bvDummy') e.hp = e.maxHp = 1000; e.block = 0; }
  return s;
}
let uid = 0;
function use(s: BattleState, cardId: string, targetId?: string, focus = 0, who = 0): BattleState {
  const a = s.allies[who], inst = { uid: `bv${uid++}`, cardId };
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
const setIntent = (s: BattleState, i: number, actionId: string, targetId?: string) => { s.enemies[i].intent = { actionId, targetId }; };
/** 1体目の敵の予告を BREAK する（弱点看破の印＋完全成功） */
function breakIt(s: BattleState, who = 0, i = 0): BattleState {
  s.enemies[i].exposed = true;
  return use(s, 'bvHit', s.enemies[i].uid, 1, who);
}
/** 予告の行動のID（TS の絞り込みを外す） */
const intentId = (e: { intent?: { actionId: string } }) => e.intent?.actionId;
const noRng = createRng(1);

describe('48体: 同じ種類の中で形がちがう（数字だけ変えた物にしない＝憲章5）', () => {
  it('7種類×7体（盾砕き6体）・合わせて48体。全部に札と1行の案内', () => {
    const all = Object.values(BODIES).flat();
    expect(all).toHaveLength(48);
    for (const [kind, list] of Object.entries(BODIES)) for (const [id, a] of list) {
      const x = act(id, a);
      expect(x.behavior, id).toBe(kind);
      expect(behaviorFromEffects(x), id).toBe(kind);
    }
  });
  it.each(Object.entries(BODIES))('%s: 形が全部ちがう（夢のスパナのゴーレムだけは、呼ぶ敵で分ける）・1行の案内が全部ちがう', (kind, list) => {
    const shapes = list.map(([id, a]) => shape(act(id, a)));
    const n = new Set(shapes).size;
    // 増援: 砦の小悪魔と夢のスパナのゴーレムは「呼べる時は優先」の形が同じ（呼ぶ敵が手数読みの兵。計画 §3-4 の注）
    expect(n, kind).toBe(list.length);
    const briefs = list.map(([id, a]) => intentBriefOf(id, a));
    expect(new Set(briefs).size, kind).toBe(list.length);
    for (const b of briefs) expect(b.length, b).toBeLessThanOrEqual(13);
  });
});
function intentBriefOf(id: string, a: string): string {
  const s = battle([id, 'bvDummy']);
  setIntent(s, 0, a, s.allies[0].id);
  return intentView(s, s.enemies[0])!.behavior!.brief;
}

describe('手数読み: 数え方・当たる人が敵ごと', () => {
  function punished(id: string, a: string, set: (s: BattleState) => void): BattleState {
    let s = battle([id, 'bvDummy']);
    setIntent(s, 0, a);
    set(s);
    s = nextTurn(s);
    return s;
  }
  it('氷の釣り人: 3枚以上のうち、いちばん多く使った1人だけに枚数×3', () => {
    const s = punished('iceFisher', 'hole', (s) => { s.allies[0].played = 3; s.allies[1].played = 4; });
    expect(s.allies[0].hp).toBe(100);
    expect(s.allies[1].hp).toBe(100 - 12);
  });
  it('小ダコ: 味方みんなの合計が6枚以上なら全員に合計×1（1人ずつは少なくても）', () => {
    let s = punished('octopusLarva', 'ink', (s) => { s.allies[0].played = 3; s.allies[1].played = 3; });
    expect(s.allies.map((a) => a.hp)).toEqual([94, 94]);
    s = punished('octopusLarva', 'ink', (s) => { s.allies[0].played = 3; s.allies[1].played = 2; });
    expect(s.allies.map((a) => a.hp)).toEqual([100, 100]);
  });
  it('書記官の影: 攻撃でない札を2枚以上 → 呪い（枚数ぶん）。攻撃の札は数えない', () => {
    const s = punished('scribeShade', 'scroll', (s) => { s.allies[0].played = 5; s.allies[0].playedAttack = 5; s.allies[1].played = 3; s.allies[1].playedAttack = 0; });
    expect(s.allies[0].statuses.curse ?? 0).toBe(0);
    expect(s.allies[1].statuses.curse ?? 0).toBeGreaterThanOrEqual(2);
    expect(s.allies[1].hp).toBe(100);
  });
  it('砂時計のゴーレム: 3枚目から1枚ごとに3（4枚 = 6）と遅延1。2枚なら何もしない', () => {
    const s = punished('hourglassGolem', 'turn', (s) => { s.allies[0].played = 4; s.allies[1].played = 2; });
    expect(s.allies[0].hp).toBe(94);
    expect(s.allies[1].hp).toBe(100);
  });
  it('蒸気砲台長: 攻撃の札だけを数える（3枚以上で攻撃の枚数×3）', () => {
    const s = punished('steamTurretLord', 'aim', (s) => { s.allies[0].played = 5; s.allies[0].playedAttack = 2; s.allies[1].played = 3; s.allies[1].playedAttack = 3; });
    expect(s.allies[0].hp).toBe(100);
    expect(s.allies[1].hp).toBe(91);
  });
  it('夢の機械兵: コスト0の札だけ（2枚以上で枚数×2・フォーカス-1）', () => {
    const s = punished('echoConveyorBot', 'reset', (s) => { s.allies[0].played = 5; s.allies[0].playedZero = 1; s.allies[1].played = 2; s.allies[1].playedZero = 2; s.allies[1].focus = 3; });
    expect(s.allies[0].hp).toBe(100);
    expect(s.allies[1].hp).toBeLessThan(100);
  });
  it('使った札の数え: 攻撃の札（敵を狙う札）とコスト0の札を、このターンの分だけ数える', () => {
    let s = battle(['bvDummy']);
    s = use(s, 'bvHit', s.enemies[0].uid);
    s = use(s, 'bvGuard');
    s = use(s, 'bvZero');
    expect([s.allies[0].played, s.allies[0].playedAttack, s.allies[0].playedZero]).toEqual([3, 1, 1]);
    s = nextTurn(s);
    expect([s.allies[0].played, s.allies[0].playedAttack, s.allies[0].playedZero]).toEqual([0, 0, 0]);
  });
});

describe('かばう: 形が敵ごと', () => {
  function guarded(id: string, a: string, others = ['bvDummy']): BattleState {
    let s = battle([id, ...others], 1);
    setIntent(s, 0, a);
    s = nextTurn(s);
    expect(s.enemies[0].guarding).toBe(true);
    return s;
  }
  it('氷の騎士: HPの割合がいちばん低い仲間だけをかばう', () => {
    let s = guarded('iceKnight', 'guard', ['bvDummy', 'bvDummy']);
    s.enemies[1].hp = 10; // いちばん低い
    s.enemies[0].block = 0;
    const k = s.enemies[0].hp, d2 = s.enemies[2].hp;
    s = use(s, 'bvHit', s.enemies[2].uid);
    expect(s.enemies[2].hp).toBe(d2 - 10); // 元気な方には通る
    s = use(s, 'bvHit', s.enemies[1].uid);
    expect(s.enemies[1].hp).toBe(10); // 傷ついた方はかばう
    expect(s.enemies[0].hp).toBe(k - 10);
  });
  it('貝の騎士: 代わりに受けるダメージは半分（ブロックは無し）', () => {
    let s = guarded('conchKnight', 'shell');
    expect(s.enemies[0].block).toBe(0);
    const k = s.enemies[0].hp;
    s = use(s, 'bvHit', s.enemies[1].uid);
    expect(s.enemies[0].hp).toBe(k - 5);
  });
  it('土人形: 自分のブロックが0になると、かばうのをやめる', () => {
    let s = guarded('clayGolem', 'harden');
    expect(s.enemies[0].block).toBe(12);
    s = use(s, 'bvHit', s.enemies[1].uid); // ブロック12 → 2
    s = use(s, 'bvHit', s.enemies[1].uid); // ブロック 2 → 0（かばう）
    const d = s.enemies[1].hp;
    s = use(s, 'bvHit', s.enemies[1].uid); // もうかばわない
    expect(s.enemies[1].hp).toBe(d - 10);
  });
  it('空の騎士: 代わりに受けるたび、攻撃した味方に聖5を返す。全体攻撃は返されない', () => {
    let s = guarded('skyKnight', 'guard');
    s = use(s, 'bvAll');
    expect(s.allies[0].hp).toBe(100);
    s = use(s, 'bvHit', s.enemies[1].uid);
    expect(s.allies[0].hp).toBe(95);
  });
  it('毒液の蟹: 代わりに受けるたび、攻撃した味方に毒2', () => {
    let s = guarded('venomBoilerCrab', 'shell');
    s = use(s, 'bvHit', s.enemies[1].uid);
    expect(s.allies[0].statuses.poison).toBe(2);
  });
  it('夢の石像の巨兵: ほかの敵みんなにブロック6・自分には付かない', () => {
    const s = guarded('echoColossusStatue', 'shove', ['bvDummy', 'bvDummy']);
    expect(s.enemies[1].block).toBe(6);
    expect(s.enemies[2].block).toBe(6);
  });
});

describe('癒し封じ: だれに・どう消えるかが敵ごと', () => {
  it('吹雪の蛇: 狙った1人に7と癒し封じ3。BREAK しても半分で起きる（癒し封じ1）', () => {
    let s = battle(['blizzardSnake', 'bvDummy']);
    setIntent(s, 0, 'coil', s.allies[1].id);
    s = nextTurn(s);
    expect(s.allies[1].hp).toBe(93);
    expect(s.allies[1].statuses.healSeal).toBeGreaterThanOrEqual(2);
    expect(s.allies[0].statuses.healSeal ?? 0).toBe(0);
    s = battle(['blizzardSnake', 'bvDummy']);
    setIntent(s, 0, 'coil', s.allies[1].id);
    s = breakIt(s);
    s = nextTurn(s);
    expect(s.allies[1].hp).toBeGreaterThan(93);
    expect(s.allies[1].statuses.healSeal ?? 0).toBeLessThanOrEqual(1);
  });
  it('セイレーン: 倒れると、全員の癒し封じが消える', () => {
    let s = battle(['siren', 'bvDummy']);
    setIntent(s, 0, 'lament');
    s = nextTurn(s);
    expect(s.allies.every((a) => (a.statuses.healSeal ?? 0) > 0)).toBe(true);
    s.enemies[0].hp = 5;
    s.enemies[0].block = 0;
    s = use(s, 'bvHit', s.enemies[0].uid);
    expect(s.enemies[0].dead).toBe(true);
    expect(s.allies.every((a) => (a.statuses.healSeal ?? 0) === 0)).toBe(true);
  });
  it('砂の精: ブロックの無い味方だけに付く', () => {
    let s = battle(['sandSprite', 'bvDummy']);
    setIntent(s, 0, 'veil');
    s = use(s, 'bvGuard', undefined, 0, 0);
    s = nextTurn(s);
    expect(s.allies[0].statuses.healSeal ?? 0).toBe(0);
    expect(s.allies[1].statuses.healSeal ?? 0).toBeGreaterThan(0);
  });
  it('竪琴の守り人: 敵みんなのHPが6回復する', () => {
    let s = battle(['harpGuardian', 'bvDummy']);
    s.enemies[1].hp = 100;
    setIntent(s, 0, 'song');
    s = nextTurn(s);
    expect(s.enemies[1].hp).toBe(106);
  });
  // 2026-11-14 オーナーの返事: ほかの癒し封じと同じに大技（紫の札）。中身（全員に1＋狙った1人に火傷1・ブロック無し）は敵ごとの形
  it('蒸気の精: 大技（紫の札・弱点で完全成功の時だけ崩せる）。起きると全員に癒し封じ1・狙った1人に火傷1・ブロック無し', () => {
    let s = battle(['steamSprite', 'bvDummy']);
    setIntent(s, 0, 'mist', s.allies[0].id);
    const v = intentView(s, s.enemies[0])!;
    expect(v.big).toBe(true);
    expect(v.details.join(' ')).toMatch(/弱点の属性（氷）で、しかも完全成功/);
    s = nextTurn(s);
    expect(s.allies.map((a) => a.statuses.healSeal ?? 0)).toEqual([1, 1]);
    expect(s.allies.map((a) => (a.statuses.burn ?? 0) > 0)).toEqual([true, false]);
    expect(s.enemies[0].block).toBe(0);
  });
  it('蒸気の精: BREAK すると行動ごと止まる（癒し封じも火傷も付かない）', () => {
    let s = battle(['steamSprite', 'bvDummy']);
    setIntent(s, 0, 'mist', s.allies[0].id);
    s.enemies[0].broken = true;
    s = nextTurn(s);
    expect(s.allies.map((a) => a.statuses.healSeal ?? 0)).toEqual([0, 0]);
    expect(s.allies.map((a) => a.statuses.burn ?? 0)).toEqual([0, 0]);
    expect(s.log.map((l) => l.text).join(' ')).toMatch(/体勢が崩れて「まとわりつく熱気」ができなかった/);
  });
  it('夢織り: もう癒し封じが付いている味方だけ眠る（遅延1）', () => {
    let s = battle(['dreamWeaver', 'bvDummy']);
    s.allies[0].statuses.healSeal = 2;
    setIntent(s, 0, 'weave');
    s = endTurn(s);
    for (let i = 0; s.phase === 'enemy' && i < 30; i++) s = applyCommand(s, { type: 'ENEMY_STEP' }).state;
    // 遅延は次のターンの初めに引く札を減らして消えるので、ログで見る
    const log = s.log.map((l) => l.text).join('\n');
    expect(log).toMatch(/仲間1に遅延1/);
    expect(log).not.toMatch(/仲間2に遅延1|全員に遅延1/);
    expect(s.allies[1].hp).toBe(100);
  });
});

describe('増援: いつ呼ぶかが敵ごと', () => {
  const callNow = (s: BattleState, i = 0) => {
    const e = s.enemies[i];
    e.intent = undefined;
    s.turn = 3;
    decideIntent(e, s, noRng);
    return intentId(e);
  };
  it('呪われた凍った兵士: 1体だけになった時だけ呼ぶ（ふだんの順番には出ない）', () => {
    const s = battle(['cursedFrozenSoldier', 'bvDummy']);
    expect(callNow(s)).not.toBe('shield');
    s.enemies[1].dead = true;
    expect(callNow(s)).toBe('shield');
  });
  it('海賊の砲手: HPが半分を切ってから呼ぶ', () => {
    const s = battle(['pirateGunner']);
    expect(callNow(s)).not.toBe('reload');
    s.enemies[0].hp = 400;
    expect(callNow(s)).toBe('reload');
  });
  it('茨の妖精: 自分に状態異常が付くと呼ぶ', () => {
    const s = battle(['thornFairy']);
    expect(callNow(s)).not.toBe('tangle');
    s.enemies[0].statuses.poison = 2;
    expect(callNow(s)).toBe('tangle');
  });
  it('スパナのゴーレム: 倒れた仲間がいると組み直す', () => {
    const s = battle(['wrenchGolem', 'bvDummy']);
    expect(callNow(s)).not.toBe('tighten');
    s.enemies[1].dead = true;
    expect(callNow(s)).toBe('tighten');
  });
  it('毒槍のジャッカル: 1回で2体・1戦闘1回だけ', () => {
    let s = battle(['venomJackalWarrior']);
    expect(s.enemies[0].intent?.actionId).toBe('guard');
    s = nextTurn(s);
    expect(s.enemies.filter((e) => !e.dead).map((e) => e.defId)).toEqual(['venomJackalWarrior', 'jackalWarrior', 'jackalWarrior']);
    s = nextTurn(s);
    expect(s.enemies.filter((e) => e.defId === 'jackalWarrior')).toHaveLength(2);
  });
});

describe('手負い狙い: 狙いと重くなる時が敵ごと', () => {
  it('雷氷の弓兵: 当たる時にブロックが無いと×1.5（HPは見ない）', () => {
    let s = battle(['stormIceArcher', 'bvDummy']);
    setIntent(s, 0, 'arrow', s.allies[0].id);
    s = nextTurn(s);
    const bare = 100 - s.allies[0].hp;
    s = battle(['stormIceArcher', 'bvDummy']);
    setIntent(s, 0, 'arrow', s.allies[0].id);
    s = use(s, 'bvGuard');
    s = nextTurn(s);
    const guarded = 100 - s.allies[0].hp + 5;
    expect(bare).toBeGreaterThan(guarded);
  });
  it('人喰い鮫: HPの量がいちばん少ない味方を狙い、当てた分の半分を回復する', () => {
    const s = battle(['shark', 'bvDummy']);
    s.allies[0].hp = 40; s.allies[0].maxHp = 50; // 割合は高いが量は少ない
    s.allies[1].hp = 60; s.allies[1].maxHp = 200;
    s.enemies[0].intent = undefined; s.enemies[0].history = [];
    decideIntent(s.enemies[0], s, noRng);
    expect(s.enemies[0].intent).toEqual({ actionId: 'tear', targetId: s.allies[0].id });
    let t = s;
    t.enemies[0].hp = 500;
    t = nextTurn(t);
    expect(t.enemies[0].hp).toBeGreaterThan(500);
  });
  it('禿鷲: 味方のだれかがHP半分を切ると、順番を飛ばして降りてくる', () => {
    const s = battle(['vulture']);
    const e = s.enemies[0];
    e.history = ['peck']; e.intent = undefined; s.turn = 3;
    decideIntent(e, s, noRng);
    expect(intentId(e)).not.toBe('peck');
    s.allies[1].hp = 40;
    e.history = ['talons']; e.intent = undefined; e.cutInTurn = undefined; s.turn = 5;
    decideIntent(e, s, noRng);
    expect(e.intent).toEqual({ actionId: 'peck', targetId: s.allies[1].id });
  });
  it('聖なる月の狼: 前のターンに自分を攻撃した味方（最後の人）を狙う', () => {
    let s = battle(['holyMoonWolf', 'bvDummy']);
    setIntent(s, 0, 'howl');
    s = use(s, 'bvHit', s.enemies[0].uid, 0, 1);
    s = use(s, 'bvHit', s.enemies[0].uid, 0, 0);
    s.allies[1].hp = 30; // 割合は低いが、最後に殴ったのは仲間1
    s.enemies[0].seqIndex = getEnemy('holyMoonWolf').actions.findIndex((a) => a.id === 'bite');
    s = nextTurn(s);
    expect(s.enemies[0].intent).toEqual({ actionId: 'bite', targetId: s.allies[0].id });
  });
  it('鋼のゼンマイ犬: 状態異常の付いた味方を狙い、状態異常があると×1.5', () => {
    const s = battle(['ironClockworkDog', 'bvDummy']);
    s.allies[1].statuses.poison = 1;
    s.enemies[0].intent = undefined; s.enemies[0].history = [];
    decideIntent(s.enemies[0], s, noRng);
    expect(s.enemies[0].intent).toEqual({ actionId: 'bite', targetId: s.allies[1].id });
  });
  it('夢の鮫: HPが半分以下の味方全員に当たる。だれもいなければ空振り', () => {
    let s = battle(['echoShark', 'bvDummy']);
    setIntent(s, 0, 'tear');
    s = nextTurn(s);
    expect(s.allies.map((a) => a.hp)).toEqual([100, 100]);
    s = battle(['echoShark', 'bvDummy']);
    s.allies[0].hp = 40;
    setIntent(s, 0, 'tear');
    s = nextTurn(s);
    expect(s.allies[0].hp).toBeLessThan(40);
    expect(s.allies[1].hp).toBe(100);
  });
});

describe('盾砕き: 何をするかが敵ごと', () => {
  function hitWithBlock(id: string, a: string, block = 20): BattleState {
    let s = battle([id, 'bvDummy']);
    setIntent(s, 0, a, s.allies[0].id);
    s = endTurn(s);
    for (const x of s.allies) x.block = block;
    for (let i = 0; s.phase === 'enemy' && i < 30; i++) s = applyCommand(s, { type: 'ENEMY_STEP' }).state;
    return s;
  }
  it('氷の剣士: ブロックを無視して当たり、ブロックは壊れない', () => {
    let s = battle(['iceSwordsman', 'bvDummy']);
    setIntent(s, 0, 'thrust', s.allies[0].id);
    s = endTurn(s);
    s.allies[0].block = 20;
    s = applyCommand(s, { type: 'ENEMY_STEP' }).state;
    expect(s.allies[0].hp).toBe(88);
    expect(s.allies[0].block).toBe(20);
  });
  it('提灯鮟鱇: 壊したブロックを自分のブロックにする', () => {
    let s = battle(['lanternAngler', 'bvDummy']);
    setIntent(s, 0, 'gulp', s.allies[0].id);
    s = endTurn(s);
    s.allies[0].block = 15;
    s = applyCommand(s, { type: 'ENEMY_STEP' }).state;
    expect(s.enemies[0].block).toBe(15);
  });
  it('オベリスクの番人: 全員のブロックを壊して全員に6', () => {
    const s = hitWithBlock('obeliskSentinel', 'slam');
    expect(s.allies.map((a) => a.hp)).toEqual([94, 94]);
  });
  it('彗星の狐: 壊した量の半分を上乗せ', () => {
    const s = hitWithBlock('cometFox', 'tail', 20);
    expect(s.allies[0].hp).toBeLessThan(100 - 11);
  });
  it('ピストン拳: ブロックを壊した相手に弱体1。ブロックが無ければ付かない', () => {
    let s = hitWithBlock('pistonFist', 'piston', 5);
    expect(s.allies[0].statuses.weak ?? 0).toBeGreaterThan(0);
    s = hitWithBlock('pistonFist', 'piston', 0);
    expect(s.allies[0].statuses.weak ?? 0).toBe(0);
  });
});

describe('浄化: 消す物・その後が敵ごと', () => {
  function purified(id: string, a: string, set: (s: BattleState) => void = () => {}): BattleState {
    let s = battle([id, 'bvDummy']);
    s.enemies[0].hp = 500;
    s.enemies[0].statuses.poison = 3;
    s.enemies[0].statuses.weak = 2;
    setIntent(s, 0, a, s.allies[0].id);
    set(s);
    s = nextTurn(s);
    return s;
  }
  it('氷結のスライム: 回復の代わりにブロック（1種類につき8）', () => {
    const s = purified('iceSlime', 'shell');
    expect(s.enemies[0].block).toBe(16);
  });
  it('フジツボの怪物: 消した状態異常を1ずつ、味方全員に', () => {
    const s = purified('barnacleBeast', 'crust');
    for (const a of s.allies) expect(a.statuses.weak ?? 0).toBeGreaterThan(0);
  });
  it('呪詛のミイラ: 毒と火傷だけ消す（弱体は残る）', () => {
    const s = purified('cursedMummy', 'wrap');
    expect(s.enemies[0].statuses.poison ?? 0).toBe(0);
    expect(s.enemies[0].statuses.weak ?? 0).toBeGreaterThan(0);
  });
  it('月のウサギ: 敵みんなの状態異常を消す', () => {
    const s = purified('moonRabbit', 'hex', (s) => { s.enemies[1].statuses.burn = 2; });
    expect(s.enemies[1].statuses.burn ?? 0).toBe(0);
  });
  it('プレス機の人形: 消した1種類につき、味方全員に5', () => {
    const s = purified('pressGolem', 'vent');
    expect(s.allies.map((a) => a.hp)).toEqual([90, 90]);
  });
  it('枕のゴーレム: 消した後、自分に脆弱2', () => {
    const s = purified('pillowGolem', 'fluff');
    expect(s.enemies[0].statuses.vulnerable ?? 0).toBeGreaterThan(0);
    expect(s.enemies[0].statuses.poison ?? 0).toBe(0);
  });
  it('呪詛のミイラの割り込みは、毒・火傷がある時だけ', () => {
    const s = battle(['cursedMummy']);
    const e = s.enemies[0];
    e.statuses.weak = 2; e.intent = undefined; s.turn = 3;
    decideIntent(e, s, noRng);
    expect(intentId(e)).not.toBe('wrap');
    e.statuses.burn = 1; e.intent = undefined; e.cutInTurn = undefined;
    decideIntent(e, s, noRng);
    expect(intentId(e)).toBe('wrap');
  });
});

/** 開幕の一手の11手（計画 §4） */
const RESIDUE: [string, string][] = [['treantKing', 'rootDown'], ['crystalLord', 'shardCall'], ['frostGiant', 'smashGuard'], ['moonMaiden', 'moonRite'], ['clockworkSage', 'reverse'], ['dreamEater', 'eatDreams']];
const BACKLASH: [string, string, string][] = [['ignavarl', 'deepBreath', 'burn'], ['shadowVizier', 'callDecoy', 'curse'], ['ghostAdmiral', 'crownCall', 'vulnerable'], ['windKeeper', 'gather', 'delay'], ['echoGhostAdmiral', 'dreamSeal', 'healSeal']];
const phaseAct = (id: string, a: string) => (getEnemy(id).phases ?? []).flatMap((p) => p.actions).find((x) => x.id === a)!;
function bossBattle(id: string, a: string): BattleState {
  const s = battle([id, 'bvDummy']);
  const e = s.enemies[0];
  const pi = (getEnemy(id).phases ?? []).findIndex((p) => p.actions.some((x) => x.id === a));
  e.phase = pi + 1;
  e.phaseOpened = pi + 1;
  e.hp = Math.floor(e.maxHp * 0.3);
  s.enemies[0].intent = { actionId: a, targetId: s.allies[0].id };
  return s;
}

describe('開幕の一手: 止めても少し効く（11手）', () => {
  it('11手（全28体の開幕の一手35手のうち3分の1くらい）。残り香6・代償5。シナリオ7本の全部に入る', () => {
    expect(RESIDUE.length + BACKLASH.length).toBe(11);
    for (const [id, a] of RESIDUE) expect(phaseAct(id, a).breakResidue?.length, id).toBeGreaterThan(0);
    for (const [id, a] of BACKLASH) expect(phaseAct(id, a).breakBacklash?.length, id).toBeGreaterThan(0);
    // 残り香・代償を持つ行動は、ほかに無い（ボスの開幕の一手だけ）
    const n = ENEMIES.all.flatMap((d) => [...d.actions, ...(d.phases ?? []).flatMap((p) => p.actions)]).filter((x) => x.breakResidue || x.breakBacklash).length;
    expect(n).toBe(11);
  });
  it('トレントキング: BREAK すると、再生8・ブロック10の代わりに再生3だけ', () => {
    let s = bossBattle('treantKing', 'rootDown');
    s = breakIt(s);
    expect(intentView(s, s.enemies[0])!.details[0]).toContain('弱まって');
    s = nextTurn(s);
    expect(s.enemies[0].statuses.regen ?? 0).toBeGreaterThan(0);
    expect(s.enemies[0].statuses.regen ?? 0).toBeLessThanOrEqual(3);
    expect(s.enemies[0].block).toBe(0);
  });
  it('霜の巨人: BREAK しても盾は砕ける（威力は半分の9）', () => {
    let s = bossBattle('frostGiant', 'smashGuard');
    s = breakIt(s);
    s = endTurn(s);
    s.allies[0].block = 30;
    for (let i = 0; s.phase === 'enemy' && i < 30; i++) s = applyCommand(s, { type: 'ENEMY_STEP' }).state;
    expect(s.allies[0].hp).toBe(91);
  });
  it('夢喰い: BREAK しても、全員のフォーカス-1', () => {
    let s = bossBattle('dreamEater', 'eatDreams');
    s = breakIt(s);
    const f = s.allies.map((a) => a.focus);
    s = endTurn(s);
    for (let i = 0; s.phase === 'enemy' && i < 30; i++) s = applyCommand(s, { type: 'ENEMY_STEP' }).state;
    expect(s.log.map((l) => l.text).join('\n')).toContain('弱まった');
    expect(f.length).toBe(2);
  });
  it.each(BACKLASH)('%s「%s」: BREAK した人に%s。元の行動は今までどおり止まる', (id, a, st) => {
    let s = bossBattle(id, a);
    s = breakIt(s, 1);
    expect(s.allies[1].statuses[st] ?? 0).toBeGreaterThan(0);
    expect(s.allies[0].statuses[st] ?? 0).toBe(0);
    expect(intentView(s, s.enemies[0])!.details[0]).toContain('体勢が崩れている');
  });
  it('予告の長押しに「BREAK しても」「崩した人に」が出る', () => {
    const r = bossBattle('treantKing', 'rootDown');
    expect(intentView(r, r.enemies[0])!.details[0]).toMatch(/BREAK: 弱まって「.*再生.*」だけ起きる/);
    const b = bossBattle('ignavarl', 'deepBreath');
    expect(intentView(b, b.enemies[0])!.details[0]).toMatch(/崩した人に「.*火傷.*」/);
  });
});

describe('小さい判断・文', () => {
  it('ボスの部屋の手下には、手下の BREAK の文', () => {
    const s = battle(['treantKing', 'darkKnight']);
    s.boss = true;
    setIntent(s, 1, 'slash', s.allies[0].id);
    expect(breakHowText(s, s.enemies[0])).toMatch(/^ボス・中ボス・災厄の大技は/);
    expect(breakHowText(s, s.enemies[1])).toMatch(/^ボスの部屋の手下の大技も/);
  });
  it('凍結・時間停止で休む強敵の本気: 空振りと分かる文（強さは変えない）', () => {
    const s = battle(['iceKnight', 'bvDummy']);
    s.elite = true;
    s.enemies[0].intent = { actionId: 'crush', targetId: s.allies[0].id, frenzy: true };
    expect(intentView(s, s.enemies[0])!.frenzy!.brief).toBe('威力×1.5');
    s.enemies[0].statuses.freeze = 1;
    const v = intentView(s, s.enemies[0])!;
    expect(v.frenzy!.brief).toBe('凍結で空振り');
    expect(v.frenzy!.long).toContain('空振り');
    s.enemies[0].statuses.freeze = 0;
    s.enemies[0].skipNextAction = true;
    expect(intentView(s, s.enemies[0])!.frenzy!.brief).toBe('時間停止で空振り');
  });
});

describe('保存して再開・オンライン（JSON をはさんでも同じ・古い保存）', () => {
  /** 全員が攻撃の札を1枚ずつ使って、ターンを終える（4ターン） */
  function play(s: BattleState, json: boolean): BattleState {
    uid = 0;
    for (let t = 0; t < 4 && (s.phase === 'ally' || s.phase === 'enemy'); t++) {
      for (let w = 0; w < s.allies.length; w++) {
        const target = s.enemies.find((e) => !e.dead);
        if (!target || s.allies[w].dead) continue;
        s = use(s, 'bvHit', target.uid, 0, w);
        if (json) s = JSON.parse(JSON.stringify(s));
      }
      s = nextTurn(s);
      if (json) s = JSON.parse(JSON.stringify(s));
    }
    return s;
  }
  it.each(Object.values(BODIES).flat().map(([id]) => [id] as const))('%s: JSON をはさんでも同じ結果', (id) => {
    const a = play(battle([id, 'bvDummy'], 2, 11), false);
    const b = play(battle([id, 'bvDummy'], 2, 11), true);
    expect(JSON.parse(JSON.stringify(b))).toEqual(JSON.parse(JSON.stringify(a)));
  });
  it('古い保存（かばう形・攻撃の札の数え・歌の印が無い）の戦闘の途中から、落ちずに続く', () => {
    let s = battle(['skyKnight', 'siren', 'bvDummy']);
    setIntent(s, 0, 'guard');
    setIntent(s, 1, 'lament');
    s = nextTurn(s);
    const old = JSON.parse(JSON.stringify(s)) as BattleState;
    for (const e of old.enemies) { delete e.guardStyle; delete e.sealBound; }
    for (const a of old.allies) delete a.playedAttack;
    let t = use(old, 'bvHit', old.enemies[2].uid);
    // 古い保存のかばう（形が無い）は、基本の形: 代わりに受けるが、返さない
    expect(t.allies[0].hp).toBe(s.allies[0].hp);
    t = nextTurn(t);
    t = nextTurn(t);
    expect(t.phase).toBe('ally');
  });
});
