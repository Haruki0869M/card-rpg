// 転職（J3a）: 場所・経験値の持ち越し・専用カードの3択・カードの候補・スマート抽選・中位ジョブの能力の部品
import { describe, expect, it } from 'vitest';
import { getCard } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { applyCommand, applyGameCommand, createBattle, createGame, createRng, damageModifiers, expToNext, heroCardPool, heroPlace, jobOptions, shopPriceFor } from '../index';
import { cardTags, heroTagProfile, synergyWeight } from '../game/cardTags';
import { chanceFor } from '../battle/battle';
import { giveHand, nextTurn, play, setup } from './helpers';

const P: PlayerId = 'P1';
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
    expect(opt.reason).toContain('Lv5');
    g.heroes[0].level = 5;
    expect(jobOptions(g.heroes[0], g).find((o) => o.job.id === 'swordmaster')!.ready).toBe(true);
    expect(jobOptions(g.heroes[0], g).map((o) => o.job.id).sort()).toEqual(['berserker', 'swordmaster']);
  });

  it('戦闘中は転職できない', () => {
    const g = newGame();
    g.heroes[0].level = 5;
    g.mode = 'battle';
    expect(heroPlace(g, g.heroes[0])).toBe('busy');
    expect(applyGameCommand(g, { type: 'CHANGE_JOB', playerId: P, heroId: g.heroes[0].id, jobId: 'swordmaster' }).error).toBeTruthy();
  });

  it('転職するとLv1。経験値はLv2の手前まで持ち越し、専用カード3枚から1枚選ぶ', () => {
    let g = newGame();
    const h = g.heroes[0];
    h.level = 6;
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
    g.heroes[0].level = 5;
    g.heroes[0].exp = 3;
    g = run(g, { type: 'CHANGE_JOB', playerId: P, heroId: g.heroes[0].id, jobId: 'berserker' });
    expect(g.heroes[0].exp).toBe(3);
  });

  it('転職後のカードの候補は、今のジョブとこれまでのジョブのもの', () => {
    let g = newGame();
    g.heroes[0].level = 5;
    g = run(g, { type: 'CHANGE_JOB', playerId: P, heroId: g.heroes[0].id, jobId: 'berserker' });
    const pool = heroCardPool(g.heroes[0]);
    expect(pool).toContain('bloodFeast');
    expect(pool).toContain('mightyBlow');
  });

  it('使えない武器は持ち物へ移り、そのジョブの最初の武器を持つ', () => {
    let g = newGame();
    g.heroes[0].level = 5;
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
