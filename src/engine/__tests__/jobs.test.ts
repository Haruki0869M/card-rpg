// 転職（J3a）: 場所・経験値の持ち越し・専用カードの3択・カードの候補・スマート抽選・中位ジョブの能力の部品
import { describe, expect, it } from 'vitest';
import { getCard } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { applyCommand, applyGameCommand, createBattle, createGame, createRng, damageModifiers, expToNext, heroCardPool, heroPlace, jobOptions, shopPriceFor } from '../index';
import { cardTags, heroTagProfile, synergyWeight } from '../game/cardTags';
import { chanceFor } from '../battle/battle';
import { giveHand, nextTurn, play, setup } from './helpers';
import { ENEMIES } from '../../data/enemies';
import { applyEffect, dealDamage, makeCtx } from '../battle/effects';
import { loseHp } from '../battle/units';
import { checkBonus, earnGold, restMultiplierOf, statChance } from '../game/common';
import { moveBonusOf, moveSlotsOf } from '../game/common';
import { visionOf } from '../game/world/fog';
import { BALANCE } from '../../data/balance';
import type { BattleState } from '../../types';
import { rollChanceFor, tierDamageAgainst } from '../battle/battle';

const P: PlayerId = 'P1';
ENEMIES.register({ id: 'topJobDummy', name: '検証用の敵', icon: 'T', maxHp: 10000, baseLevel: 1, exp: 1, gold: 1, size: 1.5,
  weak: ['fire'], resist: ['ice'], pattern: 'sequence', actions: [{ id: 'hit', name: '打撃', effects: [{ kind: 'damage', amount: 10 }] }, { id: 'guard', name: '防御', effects: [{ kind: 'block', amount: 12 }] },
    { id: 'multi', name: '連撃', effects: [{ kind: 'damage', amount: 10, hits: 3 }] },
    { id: 'area', name: '全体攻撃', effects: [{ kind: 'damage', amount: 10, to: 'foes' }] },
    { id: 'fire', name: '炎', effects: [{ kind: 'damage', amount: 10, element: 'fire' }] },
    { id: 'ice', name: '氷', effects: [{ kind: 'damage', amount: 10, element: 'ice' }] },
    { id: 'strengthen', name: '強化', effects: [{ kind: 'applyStatus', status: 'holyLight', amount: 4, to: 'self' }] },
  ] });
function topBattle(classes: string[]): BattleState {
  return createBattle({ seed: 19, party: classes.map(classId => ({ classId, gender: 'male', name: classId, playerId: P })), encounter: { id: 'testTop', name: '検証', enemies: [{ defId: 'topJobDummy' }] } });
}
function topPlay(state: BattleState, cardId: string, focus?: number): BattleState {
  const a = state.allies[0];
  giveHand(state, a.id, [cardId]); a.mana = 20; a.focus = 6;
  const r = applyCommand(state, play(a.id, 't0', getCard(cardId).target === 'ally' ? a.id : state.enemies[0].uid, focus ?? getCard(cardId).slots));
  expect(r.error).toBeUndefined();
  return r.state;
}
const newGame = (classes = ['warrior', 'mage']) =>
  createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((c, i) => ({ classId: c, gender: 'male', name: `${c}${i}`, playerId: P })) });

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}

describe('転職の場所と手順', () => {
  it('基本→中位は世界マップでもできる。Lvが足りなければ理由が出る', () => {
    const g = newGame();
    expect(heroPlace(g, g.heroes[0])).toBe('map');
    const opt = jobOptions(g.heroes[0], g).find((o) => o.job.id === 'swordmaster')!;
    expect(opt.ready).toBe(false);
    expect(opt.reason).toContain(`Lv${BALANCE.jobChange.base}`);
    g.heroes[0].level = BALANCE.jobChange.base;
    expect(jobOptions(g.heroes[0], g).find((o) => o.job.id === 'swordmaster')!.ready).toBe(true);
    expect(jobOptions(g.heroes[0], g).map((o) => o.job.id).sort()).toEqual(['berserker', 'swordmaster']);
  });

  it('戦闘中は転職できない', () => {
    const g = newGame();
    g.heroes[0].level = BALANCE.jobChange.base;
    g.mode = 'battle';
    expect(heroPlace(g, g.heroes[0])).toBe('busy');
    expect(applyGameCommand(g, { type: 'CHANGE_JOB', playerId: P, heroId: g.heroes[0].id, jobId: 'swordmaster' }).error).toBeTruthy();
  });

  it('転職するとLv1。経験値はLv2の手前まで持ち越し、専用カード3枚から1枚選ぶ', () => {
    let g = newGame();
    const h = g.heroes[0];
    h.level = BALANCE.jobChange.base + 1;
    h.exp = 999;
    g = run(g, { type: 'CHANGE_JOB', playerId: P, heroId: h.id, jobId: 'swordmaster' });
    const n = g.heroes[0];
    expect(n.classId).toBe('swordmaster');
    expect(n.level).toBe(1);
    expect(n.exp).toBe(expToNext(1, 'swordmaster') - 1);
    expect(n.carried).toBe('warrior');
    expect(n.jobPick).toEqual(CLASSES.get('swordmaster').signature);
    // 選ぶまで次の転職はできない・選べるのは3枚だけ
    expect(applyGameCommand(g, { type: 'PICK_JOB_CARD', playerId: P, heroId: n.id, cardId: 'strike' }).error).toBeTruthy();
    const before = n.deck.length;
    g = run(g, { type: 'PICK_JOB_CARD', playerId: P, heroId: n.id, cardId: 'flashCut' });
    expect(g.heroes[0].deck.length).toBe(before + 1);
    expect(g.heroes[0].deck.some((c) => c.cardId === 'flashCut')).toBe(true);
    expect(g.heroes[0].jobPick).toBeUndefined();
  });

  it('経験値が少なければそのまま持ち越す', () => {
    let g = newGame();
    g.heroes[0].level = BALANCE.jobChange.base;
    g.heroes[0].exp = 3;
    g = run(g, { type: 'CHANGE_JOB', playerId: P, heroId: g.heroes[0].id, jobId: 'berserker' });
    expect(g.heroes[0].exp).toBe(3);
  });

  it('転職後のカードの候補は、今のジョブとこれまでのジョブのもの', () => {
    let g = newGame();
    g.heroes[0].level = BALANCE.jobChange.base;
    g = run(g, { type: 'CHANGE_JOB', playerId: P, heroId: g.heroes[0].id, jobId: 'berserker' });
    const pool = heroCardPool(g.heroes[0]);
    expect(pool).toContain('bloodFeast');
    expect(pool).toContain('mightyBlow');
  });

  it('使えない武器は持ち物へ移り、そのジョブの最初の武器を持つ', () => {
    let g = newGame();
    g.heroes[0].level = BALANCE.jobChange.base;
    g = run(g, { type: 'CHANGE_JOB', playerId: P, heroId: g.heroes[0].id, jobId: 'berserker' });
    // 狂戦士は斧（得意）と剣（使える）→ 銅の剣はそのまま
    expect(g.heroes[0].equipment.weapon?.itemId).toBe('copperSword');
  });
});

describe('スマート抽選', () => {
  it('カードの印は効果から自動で付く', () => {
    expect(cardTags(getCard('plague'))).toEqual(expect.arrayContaining(['magic', 'poison', 'curse', 'aoe', 'highCost']));
    expect(cardTags(getCard('massHeal'))).toEqual(expect.arrayContaining(['heal', 'support']));
  });
  it('山札の印と重なるカードほど重い（上限あり）', () => {
    const g = newGame(['mage']);
    const h = g.heroes[0];
    h.deck.push({ uid: 'x1', cardId: 'hex' }, { uid: 'x2', cardId: 'plague' });
    const prof = heroTagProfile(h);
    expect(synergyWeight(getCard('doomSpell'), prof)).toBeGreaterThan(synergyWeight(getCard('manaBarrier'), prof));
    expect(synergyWeight(getCard('doomSpell'), prof)).toBeLessThanOrEqual(3);
  });
});

describe('中位ジョブの能力の部品', () => {
  const battle = (classIds: string[]) => createBattle(setup(5, classIds));

  it('狂戦士: HPが減るほどダメージが増える（最大+50%）', () => {
    const s = battle(['berserker']);
    const a = s.allies[0];
    const card = getCard('recklessSwing');
    expect(damageModifiers(s, a, card, s.enemies[0]).multiplier).toBe(1);
    a.hp = Math.round(a.maxHp / 2);
    expect(damageModifiers(s, a, card, s.enemies[0]).multiplier).toBeCloseTo(1 + 0.6 * (1 - a.hp / a.maxHp), 5);
    a.hp = 1;
    expect(damageModifiers(s, a, card, s.enemies[0]).multiplier).toBeCloseTo(1.5, 5);
  });

  it('隠密: 対象の悪い状態異常1種類につき+20%', () => {
    const s = battle(['shadow']);
    const e = s.enemies[0];
    e.statuses.poison = 2;
    e.statuses.weak = 1;
    expect(damageModifiers(s, s.allies[0], getCard('vitalStab'), e).multiplier).toBeCloseTo(1.4, 5);
  });

  it('弓術士: 1体を狙う攻撃の成功率+10%', () => {
    const s = battle(['archer']);
    const a = s.allies[0];
    const one = getCard('aimedShot');
    const aoe = getCard('arrowRain');
    const plain = createBattle(setup(5, ['hunter'])).allies[0];
    expect(chanceFor(a, one) - chanceFor({ ...a, classId: 'hunter', abilities: [] }, one)).toBe(10);
    expect(chanceFor(a, aoe)).toBe(chanceFor({ ...a, classId: 'hunter', abilities: [] }, aoe));
    expect(plain).toBeTruthy();
  });

  it('呪術師: 自分が付ける呪い・毒+1', () => {
    let s = battle(['hexer']);
    giveHand(s, s.allies[0].id, ['poisonNeedle']);
    s.allies[0].focus = 1;
    const e = s.enemies[0];
    const r = applyCommand(s, play(s.allies[0].id, 't0', e.uid, 1));
    expect(r.error).toBeUndefined();
    s = r.state;
    expect(s.enemies.find((x) => x.uid === e.uid)!.statuses.poison).toBe(3);
  });

  it('獣使い: 戦闘の初めから相棒の獣がいて、ターン終了時に攻撃する', () => {
    let s = battle(['tamer']);
    expect(s.allies[0].summons?.map((x) => x.id)).toEqual(['companionBeast']);
    const hp = s.enemies.reduce((n, e) => n + e.hp, 0);
    giveHand(s, s.allies[0].id, []);
    s = nextTurn(s);
    expect(s.enemies.reduce((n, e) => n + Math.max(0, e.hp), 0)).toBeLessThan(hp);
  });

  it('幻獣の召喚は残りターンが0になると帰る', () => {
    let s = battle(['phantomTamer']);
    giveHand(s, s.allies[0].id, ['summonWolfSpirit']);
    s.allies[0].focus = 2;
    s.allies[0].mana = 5;
    s = applyCommand(s, play(s.allies[0].id, 't0', undefined, 2)).state;
    expect(s.allies[0].summons?.find((x) => x.id === 'spiritWolf')?.turns).toBe(3);
    for (let i = 0; i < 3 && s.phase !== 'victory'; i++) {
      giveHand(s, s.allies[0].id, []);
      s = nextTurn(s);
    }
    if (s.phase !== 'victory') expect(s.allies[0].summons?.find((x) => x.id === 'spiritWolf')).toBeUndefined();
  });

  it('聖騎士: ダメージを受けると聖光がたまり、次の聖属性の攻撃で使い切る', () => {
    let s = battle(['paladin']);
    s.allies[0].hp = s.allies[0].maxHp = 999;
    giveHand(s, s.allies[0].id, []);
    s = nextTurn(s);
    const lights = s.allies[0].statuses.holyLight ?? 0;
    expect(lights).toBeGreaterThan(0);
    giveHand(s, s.allies[0].id, ['holyStrike']);
    s.allies[0].mana = 3;
    const e = s.enemies.find((x) => !x.dead)!;
    s = applyCommand(s, play(s.allies[0].id, 't0', e.uid, 0)).state;
    expect(s.allies[0].statuses.holyLight ?? 0).toBe(0);
  });

  it('怪盗: 敵を倒すとお金（勝った時の報酬に足す）', () => {
    let s = battle(['phantomThief']);
    for (const e of s.enemies.slice(1)) e.hp = 0;
    s.enemies.forEach((e, i) => i > 0 && (e.dead = true));
    s.enemies[0].hp = 1;
    giveHand(s, s.allies[0].id, ['feint']);
    s = applyCommand(s, play(s.allies[0].id, 't0', s.enemies[0].uid, 1)).state;
    expect(s.bonusGold).toBe(6);
  });

  it('怪盗の変装: 町の買い物15%引き', () => {
    const g = newGame(['thief']);
    const h = g.heroes[0];
    expect(shopPriceFor(h, 100)).toBe(100);
    h.classId = 'phantomThief';
    expect(shopPriceFor(h, 100)).toBe(85);
  });

  it('剣豪: 完全成功で同じ敵に追加の一撃', () => {
    let s = battle(['swordmaster']);
    giveHand(s, s.allies[0].id, ['doubleSlash']);
    const e = s.enemies[0];
    e.hp = e.maxHp = 999;
    s = applyCommand(s, play(s.allies[0].id, 't0', e.uid, 2)).state;
    expect(s.log.some((l) => l.text.includes('見切り'))).toBe(true);
  });

  it('乱数の種が同じなら結果も同じ', () => {
    const a = createRng(9).next();
    expect(createRng(9).next()).toBe(a);
  });
});

describe('最上位13職の転職とカード', () => {
  const topJobs = CLASSES.all.filter(c => c.tier === 'top');
  it('13職それぞれが専用5枚・代表3枚を持つ', () => {
    expect(topJobs).toHaveLength(13);
    expect(new Set(topJobs.flatMap(j => j.cardPool)).size).toBe(65);
    for (const j of topJobs) { expect(j.cardPool).toHaveLength(5); expect(j.signature).toEqual(j.cardPool.slice(0, 3)); }
  });
  it.each(topJobs.map(j => [j.id, j] as const))('%s: レベル・実績・場所を満たした時だけ転職できる', (_, j) => {
    let g = newGame(['warrior']);
    const h = g.heroes[0]; h.classId = j.from![0]; h.level = BALANCE.jobChange.mid - 1;
    expect(jobOptions(h, g).find(o => o.job.id === j.id)?.ready).toBe(false);
    h.level = BALANCE.jobChange.mid; h.feats = { [j.requires!.feat]: j.requires!.count - 1 };
    expect(jobOptions(h, g).find(o => o.job.id === j.id)?.progress).toBe(j.requires!.count - 1);
    expect(jobOptions(h, g).find(o => o.job.id === j.id)?.qualified).toBe(false);
    h.feats[j.requires!.feat]++;
    expect(jobOptions(h, g).find(o => o.job.id === j.id)?.qualified).toBe(true);
    expect(jobOptions(h, g).find(o => o.job.id === j.id)?.ready).toBe(false);
    g.mode = 'shrine'; g.shrine = { heroId: h.id, shrineId: 'unused' } as GameState['shrine'];
    const before = h.deck.length;
    g = run(g, { type: 'CHANGE_JOB', playerId: P, heroId: h.id, jobId: j.id });
    expect(g.heroes[0].level).toBe(1); expect(g.heroes[0].carried).toBe(j.from![0]);
    expect(g.heroes[0].deck.length).toBe(before + (j.jobCards?.length ?? 0));
    expect(g.heroes[0].jobPick).toEqual(j.signature);
  });
  it.each(['miracle', 'plunder', 'jump'])('%s: 同名の複数枚も含め1戦闘1回、次の戦闘で使える', id => {
    let s = topBattle(['warrior']);
    s.allies[0].drawPile.push({ uid: 'duplicate', cardId: id });
    s = topPlay(s, id);
    const a = s.allies[0];
    expect(a.exhaustedCards).toContain(id);
    expect([...a.hand, ...a.drawPile, ...a.discard].some(c => c.cardId === id)).toBe(false);
    giveHand(s, a.id, [id]);
    expect(applyCommand(s, play(a.id, 't0', s.enemies[0].uid, 0)).error).toContain('もう使いました');
    expect(topPlay(topBattle(['warrior']), id).allies[0].exhaustedCards).toContain(id);
  });
});

describe('最上位の戦闘能力', () => {
  it('剣聖: 同じ成功段の効果を再発動し、支払い・使用枚数・実績は1回分', () => {
    let s = topBattle(['swordSaint']);
    s = topPlay(s, 'saintSlash');
    expect(10000 * 0.6 - s.enemies[0].hp).toBe(18);
    expect(s.allies[0].block).toBe(6); expect(s.allies[0].mana).toBe(19);
    expect(s.allies[0].played).toBe(1); expect(s.allies[0].feats?.perfects).toBe(1);
    const hp = s.enemies[0].hp;
    s = topPlay(s, 'saintSlash');
    expect(hp - s.enemies[0].hp).toBe(9);
    s = nextTurn(s);
    const hp2 = s.enemies[0].hp;
    s = topPlay(s, 'saintSlash'); expect(hp2 - s.enemies[0].hp).toBe(18);
  });
  it('覇王: 仲間の撃破でも全員が強まり、最大50%で止まる', () => {
    const s = topBattle(['overlord', 'warrior']);
    const ctx = makeCtx(s, createRng(1), [], s.allies[1]);
    for (let i = 0; i < 8; i++) { const e = s.enemies[0]; e.dead = false; e.hp = 1; dealDamage(ctx, e, 1); }
    for (const a of s.allies) expect(a.damageBonus).toBeCloseTo(0.5);
  });
  it('拳王: 最後の攻撃対象へ使ったカード数×2の追撃', () => {
    let s = topBattle(['fistKing']); s = topPlay(s, 'saintSlash'); s = topPlay(s, 'breathControl');
    const hp = s.enemies[0].hp;
    s = applyCommand(s, { type: 'END_TURN', playerId: P }).state;
    expect(hp - s.enemies[0].hp).toBe(4);
  });
  it('大賢者: 弱点だけ1.3倍、予測値と実ダメージが一致する', () => {
    const s = topBattle(['greatSage']); const a = s.allies[0], e = s.enemies[0];
    const ctx = makeCtx(s, createRng(1), [], a);
    expect(dealDamage(ctx, e, 10, 'fire')).toBe(19);
    expect(dealDamage(ctx, e, 10, 'ice')).toBe(5);
    expect(dealDamage(ctx, e, 10)).toBe(10);
    const predicted = tierDamageAgainst(a, getCard('sageFlame'), e).at(-1)!;
    const hp = e.hp; const n = topPlay(s, 'sageFlame'); expect(hp - n.enemies[0].hp).toBe(predicted);
  });
  it('冥王: ターン開始にHP3を払いマナ1を得る', () => {
    const s = topBattle(['hadesLord']); expect(s.allies[0].hp).toBe(s.allies[0].maxHp - 3); expect(s.allies[0].mana).toBe(BALANCE.manaPerTurn + 1);
  });
  it('幻獣王とビーストマスター: 常駐召喚は99ターンで消えない', () => {
    let s = topBattle(['phantomKing', 'beastMaster']);
    expect(s.allies[0].summons?.map(x => x.damage)).toEqual([8]); expect(s.allies[1].summons?.map(x => x.damage)).toEqual([4, 4, 4]);
    s = nextTurn(s); expect(s.allies[0].summons?.[0].turns).toBe(99);
    expect(s.enemies[0].hp).toBeLessThan(10000);
  });
  it('聖王: 味方が倒れると30%で復活、2回目は復活しない（継続ダメージも対象）', () => {
    const s = topBattle(['holyKing', 'warrior']); const a = s.allies[1];
    loseHp(s, a, a.hp, createRng(1), []);
    expect(a.dead).toBe(false); expect(a.hp).toBe(Math.round(a.maxHp * 0.3));
    loseHp(s, a, a.hp, createRng(1), []); expect(a.dead).toBe(true);
  });
  it('聖王: 自分が倒れた時も1度だけ復活できる', () => {
    const s = topBattle(['holyKing']); const a = s.allies[0];
    loseHp(s, a, a.hp, createRng(1), []); expect(a.dead).toBe(false);
    loseHp(s, a, a.hp, createRng(1), []); expect(a.dead).toBe(true);
  });
  it('聖王が2人いても同時に復活回数を使い切らない', () => {
    const s = topBattle(['holyKing', 'holyKing', 'warrior']); const a = s.allies[2];
    for (let i = 0; i < 2; i++) { loseHp(s, a, a.hp, createRng(1), []); expect(a.dead).toBe(false); }
    loseHp(s, a, a.hp, createRng(1), []); expect(a.dead).toBe(true);
  });
  it('竜騎士: ターン終了時に敵全員へ4ダメージ', () => {
    let s = topBattle(['dragoon']); const hp = s.enemies[0].hp;
    s = applyCommand(s, { type: 'END_TURN', playerId: P }).state; expect(hp - s.enemies[0].hp).toBe(4);
  });
  it('教皇: ターン開始に味方全員を2回復', () => {
    const spec = setup(7, ['pope', 'warrior']);
    spec.party.forEach(a => { a.hp = 10; }); const s = createBattle(spec);
    expect(s.allies.map(a => a.hp)).toEqual([12, 12]);
  });
  it('弓聖: フォーカス1でも単体攻撃は全成功、全体攻撃は対象外', () => {
    let s = topBattle(['bowSaint']); s.allies[0].statuses.paralysis = 100;
    expect(rollChanceFor(s.allies[0], getCard('skyPiercer'), 1)).toBe(100);
    expect(rollChanceFor(s.allies[0], getCard('skyPiercer'), 0)).toBeLessThan(100);
    const r = topPlay(s, 'skyPiercer', 1); expect(r.stats.perfects).toBe(1);
    const baseline = structuredClone(s); baseline.allies[0].classId = 'archer';
    const n = topPlay(s, 'heavenRain', 1); expect(n.stats.perfects).toBe(topPlay(baseline, 'heavenRain', 1).stats.perfects);
  });
  it('忍者: 分身2体が各半分で追撃し、被弾ごとに1体消える', () => {
    let s = topBattle(['ninja']); s = topPlay(s, 'shadowShuriken');
    expect(6000 - s.enemies[0].hp).toBe(16);
    const a = s.allies[0], hp = a.hp; const ctx = makeCtx(s, createRng(1), [], s.enemies[0]);
    dealDamage(ctx, a, 10); expect(a.hp).toBe(hp); expect(a.summons).toHaveLength(1);
    dealDamage(ctx, a, 10); expect(a.hp).toBe(hp); expect(a.summons).toHaveLength(0);
    dealDamage(ctx, a, 10); expect(a.hp).toBe(hp - 10);
  });
  it('奇跡: 呪いによる回復減少も残さず、全員を全回復する', () => {
    let s = topBattle(['pope', 'warrior']); s.allies.forEach(a => { a.hp = 1; a.statuses.curse = 3; a.statuses.poison = 2; });
    s = topPlay(s, 'miracle'); for (const a of s.allies) { expect(a.hp).toBe(a.maxHp); expect(a.statuses.curse).toBe(0); expect(a.statuses.poison).toBe(0); }
  });
  it('跳躍: 敵の攻撃を受けず、次のターンに着地して攻撃する', () => {
    let s = topPlay(topBattle(['warrior']), 'jump'); const hp = s.allies[0].hp, foeHp = s.enemies[0].hp;
    s = nextTurn(s); expect(s.allies[0].hp).toBe(hp); expect(s.allies[0].airborne).toBeUndefined(); expect(foeHp - s.enemies[0].hp).toBe(40);
  });
  it('強奪: 攻撃の半分を敵に与え、ブロックは増えず、敵の次の攻撃だけ半減する', () => {
    let s = topBattle(['warrior']); const foeHp = s.enemies[0].hp, block = s.allies[0].block;
    s = topPlay(s, 'plunder'); const a = s.allies[0];
    expect(foeHp - s.enemies[0].hp).toBe(5);
    expect(s.enemies[0].nextActionMultiplier).toBe(0.5); expect(a.block).toBe(block);
    a.block = 0;
    const hp = a.hp; s = nextTurn(s); expect(hp - s.allies[0].hp).toBe(5); expect(s.enemies[0].nextActionMultiplier).toBeUndefined();
  });
  it('強奪: 連撃は同じ3回で攻撃し、敵の連撃も各回半減する', () => {
    let s = topBattle(['warrior']); const e = s.enemies[0];
    e.intent = { actionId: 'multi', targetId: s.allies[0].id }; e.block = 6;
    const events: import('../../types').BattleEvent[] = [];
    const ctx = makeCtx(s, createRng(1), events, s.allies[0], { target: e, card: getCard('plunder') });
    const hp = e.hp;
    applyEffect(ctx, { kind: 'stealIntent', multiplier: 0.5 });
    expect(events.filter(x => x.type === 'damage').map(x => [x.amount, x.blocked])).toEqual([[0, 5], [4, 1], [5, 0]]);
    expect(hp - e.hp).toBe(9); expect(ctx.dealt).toBe(9); expect(s.allies[0].block).toBe(0);
    const allyHp = s.allies[0].hp;
    s = nextTurn(s); expect(allyHp - s.allies[0].hp).toBe(15);
    expect(s.enemies[0].nextActionMultiplier).toBeUndefined();
  });
  it.each([['fire', 12], ['ice', 2]] as const)('強奪: %s属性の弱点・耐性、自分の倍率、敵のブロックを通常どおり計算する', (actionId, loss) => {
    const s = topBattle(['warrior']), a = s.allies[0], e = s.enemies[0];
    a.damageBonus = 1; e.block = 3; e.intent = { actionId };
    const hp = e.hp;
    applyEffect(makeCtx(s, createRng(1), [], a, { target: e, card: getCard('plunder') }), { kind: 'stealIntent', multiplier: 0.5 });
    expect(hp - e.hp).toBe(loss); expect(e.block).toBe(0); expect(a.block).toBe(0);
  });
  it('強奪: 全体攻撃を盗んでも選んだ敵1体にだけダメージを与える', () => {
    const s = topBattle(['warrior', 'mage']); const e = s.enemies[0];
    s.enemies.push({ ...structuredClone(e), uid: 'otherEnemy' }); e.intent = { actionId: 'area' };
    const hp = e.hp, otherHp = s.enemies[1].hp, allyHp = s.allies.map(a => a.hp);
    applyEffect(makeCtx(s, createRng(1), [], s.allies[0], { target: e, card: getCard('plunder') }), { kind: 'stealIntent', multiplier: 0.5 });
    expect(hp - e.hp).toBe(5); expect(s.enemies[1].hp).toBe(otherHp); expect(s.allies.map(a => a.hp)).toEqual(allyHp);
  });
  it('強奪: 強化は今までどおり自分が半分を受け取る', () => {
    const s = topBattle(['warrior']); s.enemies[0].intent = { actionId: 'strengthen' };
    applyEffect(makeCtx(s, createRng(1), [], s.allies[0], { target: s.enemies[0] }), { kind: 'stealIntent', multiplier: 0.5 });
    expect(s.allies[0].statuses.holyLight).toBe(2); expect(s.enemies[0].nextActionMultiplier).toBe(0.5);
  });
  it('強奪: 防御行動も半減し、同じ種類の効果を受け取る', () => {
    const s = topBattle(['warrior']); s.enemies[0].intent = { actionId: 'guard' };
    const ctx = makeCtx(s, createRng(1), [], s.allies[0], { target: s.enemies[0] });
    applyEffect(ctx, { kind: 'stealIntent', multiplier: 0.5 }); expect(s.allies[0].block).toBe(6);
  });
  it('同じコマンドと種なら分身・召喚を含め結果が一致し、入力は変わらない', () => {
    const s = topBattle(['ninja', 'phantomKing']); giveHand(s, 'a0', ['shadowShuriken']); const copy = structuredClone(s);
    const cmd = play('a0', 't0', s.enemies[0].uid, 1);
    expect(applyCommand(s, cmd)).toEqual(applyCommand(s, cmd)); expect(s).toEqual(copy);
  });
});

describe('最上位の探索能力と実績', () => {
  it('大賢者のイベント補正、弓聖の複合能力、大怪盗の宝箱と値引き', () => {
    const g = newGame(); const h = g.heroes[0]; h.classId = 'greatSage';
    expect(statChance(h, 'luk', undefined, true) - statChance(h, 'luk')).toBe(20);
    h.classId = 'bowSaint'; expect(checkBonus(h, 'ambush')).toBe(15); expect(visionOf(g, g.world!, h.id)).toBe(BALANCE.visionRange + 2);
    h.classId = 'grandThief'; expect(checkBonus(h, 'luck')).toBe(20); expect(shopPriceFor(h, 100)).toBe(75);
    h.classId = 'dragoon'; expect(moveSlotsOf(h)).toBe(BALANCE.moveSlots + 2);
    h.classId = 'pope'; expect(restMultiplierOf(h)).toBe(2);
  });
  it('ビーストマスターは夜も視界が狭まらない', () => {
    const g = newGame(); const h = g.heroes[0]; h.classId = 'beastMaster'; g.world!.worldTurn = BALANCE.turnsPerTimeOfDay * 3 + 1;
    expect(visionOf(g, g.world!, h.id)).toBe(BALANCE.visionRange);
    expect(moveBonusOf(h)).toBe(1);
  });
  it('稼いだ金額は支出後も残り、初期所持金を含めない', () => {
    const g = newGame(); const h = g.heroes[0]; expect(h.feats?.goldEarned ?? 0).toBe(0);
    earnGold(h, 150); h.gold -= 100; earnGold(h, 150); expect(h.feats?.goldEarned).toBe(300);
  });
  it('状態異常の敵の撃破と回復カードの成功を記録する', () => {
    let s = topBattle(['warrior']); s.enemies[0].hp = 1; s.enemies[0].statuses.weak = 1;
    s = topPlay(s, 'saintSlash'); expect(s.allies[0].feats?.['kills:status']).toBe(1);
    s = topPlay(topBattle(['priest']), 'papalPrayer'); expect(s.allies[0].feats?.['success:heal']).toBe(1);
  });
});
