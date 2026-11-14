// 敵の特殊な行動・第2弾: 残り6本のシナリオの41体（docs/tasks/enemy-behaviors-round2-plan.md §3 の表を、
// docs/tasks/enemy-behaviors-fix-plan.md §2・§4・§7 の決定で上書きした物）。
// 表のとおりの割り当て・数値・1ターン目の予告・割り込み・代わりの攻撃・亜種に伝わっていない事・1つの戦闘に2種類まで、を確かめる
import { describe, expect, it } from 'vitest';
import { ENEMIES, getEnemy } from '../../data/enemies';
import { behaviorFromEffects } from '../../data/enemyBehaviors';
import { DUNGEONS } from '../../data/dungeons';
import { getScenario } from '../../data/scenarios';
import type { BattleState, EnemyActionDef, EnemyBehaviorId, PlayerId } from '../../types';
import { applyCommand, createBattle, decideIntent } from '../index';

const P: PlayerId = 'P1';

/** round2 §2 の表の「予告の文」（長押しの文） */
const HINT: Record<EnemyBehaviorId, string> = {
  shatter: '当たるとブロックを全部壊す。BREAK するか、ブロックに頼らずに受ける',
  purify: '状態異常を全部消して回復する。その前に起爆するか、BREAK する',
  punish: 'このターンにカードを4枚以上使った味方に、枚数×2のダメージ',
  healSeal: '味方全員の回復が、2ターン半分になる。BREAK するか、先に回復を使う',
  hunt: 'HPの割合がいちばん低い味方を狙う。HPが半分以下だと×1.5',
  call: '仲間を1体呼ぶ。その前に倒すか、BREAK する',
  guard: '次の味方の番の間、ほかの敵への単体攻撃を代わりに受ける。全体攻撃は通る',
};

interface Row {
  sc: string;
  /** 敵のID・置き換えた行動のID（古い保存のために元のまま） */
  id: string;
  act: string;
  name: string;
  kind: EnemyBehaviorId;
  /** 何番目の地域か（ブロック・浄化の回復の量を決める。表の最初の地域） */
  region: number;
  /** 手負い狙い・盾砕き: 置き換えた攻撃のダメージと属性 */
  amount?: number;
  element?: string;
  /** 仲間を呼ぶ: 呼ぶ敵・呼べない時の行動 */
  summon?: string;
  orElse?: string;
  /** かばう: 1体の時の行動 */
  alone?: string;
  /** 弱めて残した元の状態異常（狙った1人） */
  extra?: [string, number];
}

const ROUND2: Row[] = [
  // シナリオ2「凍てつく王国」
  { sc: 'frozenKingdom', id: 'iceSlime', act: 'shell', name: '凍り直す', kind: 'purify', region: 3 },
  { sc: 'frozenKingdom', id: 'iceFisher', act: 'hole', name: '糸を張って待つ', kind: 'punish', region: 3 },
  { sc: 'frozenKingdom', id: 'iceKnight', act: 'guard', name: '主君の盾', kind: 'guard', region: 3, alone: 'slash' },
  { sc: 'frozenKingdom', id: 'cursedFrozenSoldier', act: 'shield', name: '凍った角笛', kind: 'call', region: 3, summon: 'frozenSoldier', orElse: 'slash' },
  { sc: 'frozenKingdom', id: 'blizzardSnake', act: 'coil', name: '凍傷の牙', kind: 'healSeal', region: 4 },
  { sc: 'frozenKingdom', id: 'iceSwordsman', act: 'thrust', name: '鎧通しの突き', kind: 'shatter', region: 4, amount: 12 },
  { sc: 'frozenKingdom', id: 'stormIceArcher', act: 'arrow', name: '弱った者を射抜く', kind: 'hunt', region: 4, amount: 11, element: 'thunder' },
  // シナリオ3「呪われた群島」
  { sc: 'cursedArchipelago', id: 'pirateGunner', act: 'reload', name: '呼び子を吹く', kind: 'call', region: 3, summon: 'pirateGrunt', orElse: 'point' },
  { sc: 'cursedArchipelago', id: 'siren', act: 'lament', name: '癒しを拒む歌', kind: 'healSeal', region: 3 },
  { sc: 'cursedArchipelago', id: 'octopusLarva', act: 'ink', name: '八本の腕で待ち構える', kind: 'punish', region: 4 },
  { sc: 'cursedArchipelago', id: 'shark', act: 'tear', name: '血の匂いを追う', kind: 'hunt', region: 4, amount: 8 },
  { sc: 'cursedArchipelago', id: 'conchKnight', act: 'shell', name: '殻でかばう', kind: 'guard', region: 4, alone: 'lance' },
  { sc: 'cursedArchipelago', id: 'lanternAngler', act: 'gulp', name: '丸呑み', kind: 'shatter', region: 5, amount: 12 },
  { sc: 'cursedArchipelago', id: 'barnacleBeast', act: 'crust', name: '古い殻を落とす', kind: 'purify', region: 5 },
  // シナリオ4「砂塵の王朝」
  { sc: 'sandDynasty', id: 'vulture', act: 'peck', name: '弱った所をつつく', kind: 'hunt', region: 3, amount: 9 },
  { sc: 'sandDynasty', id: 'sandSprite', act: 'veil', name: '渇きの砂', kind: 'healSeal', region: 3 },
  { sc: 'sandDynasty', id: 'scribeShade', act: 'scroll', name: '行いを書き記す', kind: 'punish', region: 3 },
  { sc: 'sandDynasty', id: 'clayGolem', act: 'harden', name: '身代わりの土人形', kind: 'guard', region: 4, alone: 'fist' },
  { sc: 'sandDynasty', id: 'obeliskSentinel', act: 'slam', name: '石柱で叩き割る', kind: 'shatter', region: 4, amount: 12 },
  { sc: 'sandDynasty', id: 'cursedMummy', act: 'wrap', name: '包帯を巻き直す', kind: 'purify', region: 4 },
  { sc: 'sandDynasty', id: 'venomJackalWarrior', act: 'guard', name: '遠吠えで群れを呼ぶ', kind: 'call', region: 5, summon: 'jackalWarrior', orElse: 'lunge' },
  // シナリオ5「星降る天空城」
  { sc: 'starCastle', id: 'cometFox', act: 'tail', name: '彗星の衝突', kind: 'shatter', region: 3, amount: 11, element: 'holy' },
  { sc: 'starCastle', id: 'moonRabbit', act: 'hex', name: '月の薬を搗く', kind: 'purify', region: 3, extra: ['curse', 1] },
  { sc: 'starCastle', id: 'hourglassGolem', act: 'turn', name: '砂時計で数える', kind: 'punish', region: 4 },
  { sc: 'starCastle', id: 'harpGuardian', act: 'song', name: '癒しを鎮める調べ', kind: 'healSeal', region: 4 },
  { sc: 'starCastle', id: 'thornFairy', act: 'tangle', name: 'いたずら仲間を呼ぶ', kind: 'call', region: 4, summon: 'windSprite', orElse: 'prick' },
  { sc: 'starCastle', id: 'holyMoonWolf', act: 'bite', name: '弱った獲物への牙', kind: 'hunt', region: 5, amount: 14, element: 'holy' },
  { sc: 'starCastle', id: 'skyKnight', act: 'guard', name: '天の盾', kind: 'guard', region: 5, alone: 'lance' },
  // シナリオ6「機械仕掛けの帝国」
  { sc: 'clockworkEmpire', id: 'pressGolem', act: 'vent', name: '蒸気を抜く', kind: 'purify', region: 3 },
  { sc: 'clockworkEmpire', id: 'wrenchGolem', act: 'tighten', name: '人形を組み直す', kind: 'call', region: 3, summon: 'brokenAutomaton', orElse: 'swing' },
  { sc: 'clockworkEmpire', id: 'steamSprite', act: 'mist', name: 'まとわりつく熱気', kind: 'healSeal', region: 3 },
  { sc: 'clockworkEmpire', id: 'steamTurretLord', act: 'aim', name: '動きに照準を合わせる', kind: 'punish', region: 3 },
  { sc: 'clockworkEmpire', id: 'pistonFist', act: 'piston', name: '杭打ち', kind: 'shatter', region: 4, amount: 12 },
  { sc: 'clockworkEmpire', id: 'ironClockworkDog', act: 'bite', name: '喉笛に食らいつく', kind: 'hunt', region: 4, amount: 10 },
  { sc: 'clockworkEmpire', id: 'venomBoilerCrab', act: 'shell', name: '鉄の甲羅でかばう', kind: 'guard', region: 4, alone: 'double' },
  // シナリオ7「夢幻の大迷宮」（盾砕きは置かない。手数読みは夢の機械兵・影の子は下の別のテスト）
  { sc: 'dreamLabyrinth', id: 'pillowGolem', act: 'fluff', name: 'ひと眠り', kind: 'purify', region: 3 },
  { sc: 'dreamLabyrinth', id: 'echoWrenchGolem', act: 'tighten', name: '夢の人形を組み直す', kind: 'call', region: 4, summon: 'echoConveyorBot', orElse: 'swing' },
  { sc: 'dreamLabyrinth', id: 'echoConveyorBot', act: 'reset', name: '動きを点検する', kind: 'punish', region: 4 },
  { sc: 'dreamLabyrinth', id: 'echoShark', act: 'tear', name: '血の匂いを追う', kind: 'hunt', region: 5, amount: 9, element: 'poison' },
  { sc: 'dreamLabyrinth', id: 'dreamWeaver', act: 'weave', name: '覚めない眠りの糸', kind: 'healSeal', region: 5 },
  { sc: 'dreamLabyrinth', id: 'echoColossusStatue', act: 'shove', name: '巨兵が立ちはだかる', kind: 'guard', region: 6, alone: 'fist' },
];

/** シナリオ1で付けた敵（第1弾・直し）と、災厄の中ボス（behavior だけ付けた）。亜種の確かめから外す */
const ROUND1 = new Set(['mireSlime', 'reedStalker', 'basaltCrawler', 'cinderHound', 'darkKnight', 'siegeImp', 'cursedHound']);
/** 災厄の中ボス（第1弾の直しで behavior だけ付けた。亜種の形で書かれている） */
const SCOURGE = new Set(ENEMIES.all.filter((d) => d.id.startsWith('scourge')).map((d) => d.id));
const SCENARIOS =[...new Set(ROUND2.map((r) => r.sc))];

const NO_DAMAGE: EnemyBehaviorId[] = ['punish', 'guard', 'call', 'healSeal'];
const FIRST_TURN: EnemyBehaviorId[] = ['punish', 'guard', 'healSeal', 'hunt', 'shatter'];
const blockFor = (r: Row) => (r.region >= 4 ? 10 : 8);
const actionOf = (r: Row) => getEnemy(r.id).actions.find((a) => a.id === r.act)!;
const eff = <K extends EnemyActionDef['effects'][number]['kind']>(a: EnemyActionDef, kind: K) =>
  a.effects.filter((e) => e.kind === kind) as Extract<EnemyActionDef['effects'][number], { kind: K }>[];

// 確認用の置物（何もしない・倒れにくい）。ほかの敵がいる時の予告を見るため
if (!ENEMIES.all.some((d) => d.id === 'r2Dummy')) {
  ENEMIES.register({ id: 'r2Dummy', icon: 'T', name: '確認用の置物', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence', actions: [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block', amount: 0 }] }] });
}

function battle(enemies: string[], seed = 7, allies = 1): BattleState {
  return createBattle({
    seed,
    party: Array.from({ length: allies }, (_, i) => ({ classId: 'warrior', gender: 'male' as const, name: `仲間${i + 1}`, playerId: P })),
    encounter: { id: 'r2', name: '確認', enemies: enemies.map((defId) => ({ defId })) },
  });
}
function nextTurn(s: BattleState): BattleState {
  let st = applyCommand(s, { type: 'END_TURN', playerId: P }).state;
  for (let i = 0; st.phase === 'enemy' && i < 30; i++) st = applyCommand(st, { type: 'ENEMY_STEP' }).state;
  return st;
}

describe('第2弾: 表のとおりの割り当て（行動の名前・札・予告の文・数値）', () => {
  it.each(ROUND2.map((r) => [r.sc, r.id, r.name, r] as const))('%s / %s「%s」', (_sc, _id, _name, r) => {
    const def = getEnemy(r.id);
    const a = actionOf(r);
    expect(a, `${r.id}.${r.act}`).toBeDefined();
    expect(a.name).toBe(r.name);
    // 2026-11-14（特殊な行動のばらし）: 蒸気の精だけ大技でない（BREAK できない）。中身（数値・予告の文・1行の案内）は敵ごと（behaviorVariety.test.ts）
    expect(!!a.big).toBe(r.id !== 'steamSprite');
    expect(a.behavior).toBe(r.kind);
    expect(behaviorFromEffects(a)).toBe(r.kind);
    expect(a.hint && a.hint !== HINT[r.kind], `${r.id} の予告の文は敵ごと`).toBeTruthy();
    expect(a.brief, `${r.id} の1行の案内`).toBeTruthy();
    // 特殊な行動は、この1つだけ（ほかの行動は置き換えていない）
    expect(def.actions.filter((x) => x.behavior).map((x) => x.id)).toEqual([r.act]);
    expect((def.phases ?? []).flatMap((p) => p.actions).filter((x) => x.behavior)).toEqual([]);
    switch (r.kind) {
      case 'purify':
        expect(a.cutIn).toEqual({ when: 'afflicted', rest: 2 });
        // 順番の最後にも残す
        expect(def.actions.at(-1)!.id).toBe(r.act);
        break;
      case 'call': {
        const c = eff(a, 'summonEnemy');
        expect(c.map((e) => [e.enemy, e.call, e.orElse])).toEqual([[r.summon, true, r.orElse]]);
        // 呼ばれる敵は、自分では仲間を呼ばない
        const called = getEnemy(r.summon!);
        expect([...called.actions, ...(called.phases ?? []).flatMap((p) => p.actions)].some((x) => x.effects.some((e) => e.kind === 'summonEnemy'))).toBe(false);
        expect(def.actions.find((x) => x.id === r.orElse)!.effects.some((e) => e.kind === 'damage')).toBe(true);
        break;
      }
      case 'guard':
        expect(a.fallbackIfAloneId).toBe(r.alone);
        expect(def.actions.find((x) => x.id === r.alone)!.effects.some((e) => e.kind === 'damage')).toBe(true);
        break;
    }
  });
});

describe('第2弾: 1ターン目の予告・割り込み・優先', () => {
  it.each(ROUND2.filter((r) => FIRST_TURN.includes(r.kind) && r.id !== 'echoShark').map((r) => [r.id, r.name, r] as const))('%s: 1ターン目に「%s」を予告する（どの種でも）', (_id, _n, r) => {
    expect(getEnemy(r.id).firstActionId).toBe(r.act);
    for (let seed = 1; seed <= 5; seed++) expect(battle([r.id, 'r2Dummy'], seed).enemies[0].intent?.actionId).toBe(r.act);
  });
  it.each(ROUND2.filter((r) => r.kind === 'guard').map((r) => [r.id, r.alone, r] as const))('%s: 1体だけの時は「%s」', (_id, _alone, r) => {
    const s = battle([r.id]);
    expect(s.enemies[0].intent?.actionId).toBe(r.alone);
    expect(s.enemies[0].intent?.targetId).toBeDefined();
  });
  it.each(ROUND2.filter((r) => r.kind === 'call' && actionOf(r).cutIn?.when === 'canSummon').map((r) => [r.id, r] as const))('%s: 呼べる時は1ターン目に増援。呼ぶと仲間が増え、次のターンは続けて呼ばない', (_id, r) => {
    let s = battle([r.id]);
    expect(s.enemies[0].intent?.actionId).toBe(r.act);
    s = nextTurn(s);
    const n = eff(actionOf(r), 'summonEnemy')[0].count ?? 1;
    expect(s.enemies.filter((e) => !e.dead).map((e) => e.defId)).toEqual([r.id, ...Array.from({ length: n }, () => r.summon)]);
    if (!s.enemies[0].dead) expect(s.enemies[0].intent?.actionId).not.toBe(r.act);
  });
  it.each(ROUND2.filter((r) => r.kind === 'purify').map((r) => [r.id, r] as const))('%s: 状態異常が無ければ1ターン目は浄化しない。悪い状態異常があれば割り込む', (_id, r) => {
    const s = battle([r.id]);
    expect(s.enemies[0].intent?.actionId).not.toBe(r.act);
    const e = s.enemies[0];
    e.history = [];
    e.intent = undefined;
    e.statuses = { ...e.statuses, poison: 2 };
    s.turn = 2;
    decideIntent(e, s, { next: () => 0, int: () => 0 } as never);
    expect(s.enemies[0].intent?.actionId).toBe(r.act);
  });
});

describe('第2弾: 元の状態異常を弱めて残した敵（効果を並べた時に、全部が働く。2026-11-14 から月のウサギだけ）', () => {
  it.each(ROUND2.filter((r) => r.extra).map((r) => [r.id, r.name, r] as const))('%s「%s」', (_id, _n, r) => {
    let s = battle([r.id, 'r2Dummy'], 7, 2);
    for (const a of s.allies) { a.hp = a.maxHp = 100; a.block = 0; }
    const e = s.enemies[0];
    e.hp = e.maxHp = 1000;
    if (r.kind === 'purify') e.statuses = { ...e.statuses, poison: 2 };
    e.intent = { actionId: r.act, targetId: s.allies[1].id };
    s = nextTurn(s);
    const [st, n] = r.extra!;
    // 狙った1人にだけ付く
    expect(s.allies[1].statuses[st] ?? 0).toBeGreaterThanOrEqual(n);
    expect(s.allies[0].statuses[st] ?? 0).toBe(0);
    if (r.kind === 'healSeal') for (const a of s.allies) expect(a.statuses.healSeal ?? 0).toBeGreaterThan(0);
    if (r.kind === 'purify') expect(s.enemies[0].statuses.poison ?? 0).toBe(0);
    if (NO_DAMAGE.includes(r.kind)) expect(s.enemies[0].block).toBe(blockFor(r));
  });
});

describe('第2弾: 夢幻の大迷宮の変更（fix-plan §7 の4）', () => {
  it('41体（7本目は盾砕きなしの6体）', () => {
    expect(ROUND2).toHaveLength(41);
    expect(ROUND2.filter((r) => r.sc === 'dreamLabyrinth').map((r) => r.kind).sort()).toEqual(['call', 'guard', 'healSeal', 'hunt', 'punish', 'purify']);
  });
  it('影の子: 手数読みは付けない。「かくれんぼ」は ブロック12＋狙った1人のフォーカスを1奪う（4ダメージは外した）。ふつうの行動', () => {
    const def = getEnemy('shadowChild');
    const a = def.actions.find((x) => x.id === 'hideSeek')!;
    expect(a.name).toBe('かくれんぼ');
    expect(a.effects).toEqual([{ kind: 'block', amount: 12 }, { kind: 'drainFocus', amount: 1 }]);
    expect(a.big).toBeUndefined();
    expect(a.behavior).toBeUndefined();
    expect(def.actions.some((x) => x.behavior)).toBe(false);
    expect(def.firstActionId).toBeUndefined();
    // 記憶喰いの単体の「記憶を食べる」と同じ形（狙いの書き方が同じ）
    const eater = getEnemy('memoryEater').actions.find((x) => x.id === 'devour')!.effects.find((e) => e.kind === 'drainFocus')!;
    expect('to' in eater).toBe(false);
    // 戦闘の中で: 狙った味方のフォーカスが1減り、自分にブロック12
    let s = battle(['shadowChild', 'r2Dummy']);
    const t = s.allies[0];
    t.focus = 3;
    s.enemies[0].intent = { actionId: 'hideSeek', targetId: t.id };
    s = nextTurn(s);
    expect(s.enemies[0].block).toBe(12);
  });
  it('元の敵（ベルトコンベアの機械兵・スパナのゴーレム・石像の巨兵）は、夢の再来の変更を持たない', () => {
    expect(getEnemy('conveyorBot').actions.some((a) => a.behavior)).toBe(false);
    expect(getEnemy('colossusStatue').actions.some((a) => a.behavior)).toBe(false);
    // スパナのゴーレムは、自分の表の行（壊れた人形を呼ぶ）。夢の再来は夢の機械兵を呼ぶ
    expect(getEnemy('wrenchGolem').actions.find((a) => a.id === 'tighten')!.effects[0]).toMatchObject({ enemy: 'brokenAutomaton' });
    expect(getEnemy('echoWrenchGolem').actions.find((a) => a.id === 'tighten')!.effects[0]).toMatchObject({ enemy: 'echoConveyorBot' });
  });
});

const BOSS_PHASE_ECHOES = new Set(['echoWhiteQueen', 'echoSandPharaoh', 'echoGhostAdmiral']);
describe('第2弾: 亜種に伝わっていない事', () => {
  const listed = new Set(ROUND2.map((r) => r.id));
  it('表に無い亜種は、特殊な行動も、1ターン目の行動も持たない（元の敵を変えても伝わらない）', () => {
    let n = 0;
    const bad: string[] = [];
    for (const def of ENEMIES.all) {
      // ボスの段階（2026-11-14・オーナーの返事 4-A）: 夢の鍵のボス3体は、元のボスに無い段階の決まり（増援・癒し封じ）を持つ
      if (!def.variantOf || listed.has(def.id) || ROUND1.has(def.id) || SCOURGE.has(def.id) || BOSS_PHASE_ECHOES.has(def.id)) continue;
      n++;
      const acts = [...def.actions, ...(def.phases ?? []).flatMap((p) => p.actions)];
      if (acts.some((a) => a.behavior || behaviorFromEffects(a)) || def.firstActionId) bad.push(def.id);
    }
    expect(bad).toEqual([]);
    expect(n).toBeGreaterThan(20);
  });
  it('表の亜種は、その亜種だけを変えた（元の敵は表に無ければ、特殊な行動を持たない）', () => {
    for (const r of ROUND2) {
      const base = getEnemy(r.id).variantOf;
      if (!base || listed.has(base)) continue;
      const b = getEnemy(base);
      expect(b.actions.filter((a) => a.behavior).map((a) => a.id), base).toEqual([]);
      expect(b.firstActionId, base).toBeUndefined();
    }
  });
  it('表に無い夢の再来（夢の氷の剣士・夢の氷の騎士・夢の月ウサギ）: 置き換えなかった行動は元の敵と同じ（ダメージ+1・属性だけ違う）。置き換えた行動は元の名前のまま', () => {
    const cases: [string, string, string, string][] = [
      ['echoIceSwordsman', 'iceSwordsman', 'thrust', '氷刃の突き'],
      ['echoIceKnight', 'iceKnight', 'guard', '氷鎧の構え'],
      ['echoMoonRabbit', 'moonRabbit', 'hex', '月影の呪い'],
    ];
    for (const [echoId, baseId, replaced, oldName] of cases) {
      const echo = getEnemy(echoId);
      const base = getEnemy(baseId);
      expect(echo.actions.map((a) => a.id).sort(), echoId).toEqual(base.actions.map((a) => a.id).sort());
      for (const a of echo.actions) {
        if (a.id === replaced) {
          expect(a.name, echoId).toBe(oldName);
          continue;
        }
        const b = base.actions.find((x) => x.id === a.id)!;
        expect(a.name).toBe(b.name);
        expect(a.effects.map((e) => (e.kind === 'damage' ? { ...e, amount: e.amount - 1, element: undefined } : e)), `${echoId}.${a.id}`).toEqual(
          b.effects.map((e) => (e.kind === 'damage' ? { ...e, element: undefined } : e)),
        );
      }
    }
  });
  it('表の元の敵の亜種（表に無い物）は、元の行動のまま（同じIDの行動に札が付いていない）', () => {
    for (const r of ROUND2) {
      for (const v of ENEMIES.all.filter((d) => d.variantOf === r.id && !listed.has(d.id))) {
        const same = v.actions.find((a) => a.id === r.act);
        if (same) expect(same.behavior, v.id).toBeUndefined();
        expect(v.firstActionId, v.id).toBeUndefined();
      }
    }
  });
});

/** そのシナリオの敵の組（世界マップの組・レアの組・海の組・ダンジョンの戦闘・強敵・中ボス・ボス） */
function groupsOf(sc: string): { where: string; group: string[] }[] {
  const map = getScenario(sc).map!;
  const out: { where: string; group: string[] }[] = [];
  const dungeons = new Set<string>();
  for (const reg of map.regions) {
    for (const g of [...(reg.encounters ?? []), ...(reg.rareEncounters ?? []), ...(reg.seaEncounters ?? [])]) out.push({ where: reg.id, group: g });
    for (const d of reg.randomDungeons ?? []) dungeons.add(d);
  }
  for (const f of map.features) if (f.kind === 'dungeon') dungeons.add(f.id);
  for (const id of dungeons) {
    const p = DUNGEONS.get(id).pools;
    for (const g of [...p.battle, ...p.elite]) out.push({ where: id, group: g });
    out.push({ where: `${id}.boss`, group: p.boss });
    if (p.midboss) out.push({ where: `${id}.midboss`, group: p.midboss });
  }
  return out;
}
const kindsIn = (group: string[]) => new Set(group.flatMap((id) => getEnemy(id).actions.map((a) => a.behavior).filter(Boolean)));

describe('第2弾: 1つの戦闘に特殊な行動は2種類まで', () => {
  it.each(SCENARIOS)('%s: 全部の敵の組で2種類まで', (sc) => {
    const groups = groupsOf(sc);
    expect(groups.length).toBeGreaterThan(10);
    const over = groups.filter((g) => kindsIn(g.group).size > 2).map((g) => `${g.where}: ${g.group.join('+')}`);
    expect(over).toEqual([]);
  });
});
