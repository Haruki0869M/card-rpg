import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { getCard } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { ENEMIES } from '../../data/enemies';
import { ITEMS } from '../../data/items';
import { SANCTUARIES } from '../../data/world';
import type { BattleState, GameState } from '../../types';
import { applyCommand, applyGameCommand, createBattle, createGame, createRng, migrateGame, incomingDamage, tierDamageAgainst, unusableReason, jobOptions, toPartyMember } from '../index';
import { applyEffect, dealDamage, makeCtx } from '../battle/effects';
import { addSanctuaries } from '../game/world/sanctuaries';
import { intentView } from '../../components/format';
import { giveHand, nextTurn, play } from './helpers';

const jobs = ['samurai', 'magicKnight', 'timeMage', 'necromancer', 'darkKnight'];
ENEMIES.register({ id: 'specialJobDummy', name: '検証用の敵', icon: 'T', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1,
  weak: ['fire'], resist: ['ice'], pattern: 'sequence', actions: [
    { id: 'attack', name: '攻撃', effects: [{ kind: 'damage', amount: 10 }] },
    { id: 'guard', name: '防御と強化', effects: [{ kind: 'block', amount: 12 }, { kind: 'applyStatus', status: 'holyLight', amount: 2, to: 'self' }] },
  ] });
function battle(classId: string): BattleState {
  const s = createBattle({ seed: 19, party: [{ classId, gender: 'male', name: '検証', playerId: 'P1' }], encounter: { id: 'specialTest', name: '検証', enemies: [{ defId: 'specialJobDummy' }] } });
  s.allies[0].hp = s.allies[0].maxHp = 1000;
  return s;
}
function use(s: BattleState, id: string, focus = getCard(id).slots): BattleState {
  giveHand(s, s.allies[0].id, [id]); s.allies[0].mana = 20; s.allies[0].focus = 6;
  const r = applyCommand(s, play(s.allies[0].id, 't0', s.enemies[0].uid, focus));
  expect(r.error).toBeUndefined(); return r.state;
}
const fresh = () => createGame({ seed: 874651857, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: '検証', playerId: 'P1' }] });
function inTemple(): GameState {
  const g = fresh(), w = g.world!;
  w.story = undefined; w.pos.h0 = w.tiles.findIndex(t => t.f?.id === 'pilgrimTemple');
  const r = applyGameCommand(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0' });
  expect(r.error).toBeUndefined(); return r.state;
}

describe('特殊職5職のデータと転職', () => {
  it('専用6枚ずつ計30枚が自動登録され、各職にエピック2枚以上ある', () => {
    expect(new Set(jobs.flatMap(id => CLASSES.get(id).cardPool)).size).toBe(30);
    for (const id of jobs) {
      const j = CLASSES.get(id); expect(j.tier).toBe('special'); expect(j.cardPool).toHaveLength(6);
      expect(j.signature).toEqual(j.cardPool.slice(0, 3));
      expect(j.cardPool.filter(c => getCard(c).rarity === 'epic').length).toBeGreaterThanOrEqual(2);
    }
  });
  it.each([
    ['samurai', 'katana', 'sword'], ['magicKnight', 'sword', 'staff'], ['timeMage', 'tome', 'staff'],
    ['necromancer', 'scythe', 'tome'], ['darkKnight', 'sword', 'hammer'],
  ])('%sの得意・補助武器と初期武器が指定の表に一致する', (id, main, sub) => {
    const j = CLASSES.get(id); expect(j.weaponType).toBe(main); expect(j.subWeapons).toEqual([sub]);
    expect(ITEMS.get(j.startingEquipment.weapon!).weaponType).toBe(main);
  });
  it.each(jobs)('%sはLv3・実績・神殿を満たして転職し、初期武器と代表3枚を得る', id => {
    let g = inTemple(); const j = CLASSES.get(id), h = g.heroes[0]; h.classId = j.from![0]; h.level = 2; delete h.equipment.weapon;
    h.feats = { [j.requires!.feat]: j.requires!.count };
    expect(jobOptions(h, g).find(o => o.job.id === id)?.ready).toBe(false);
    h.level = 3; h.feats[j.requires!.feat]--;
    expect(jobOptions(h, g).find(o => o.job.id === id)?.progress).toBe(j.requires!.count - 1);
    h.feats[j.requires!.feat]++;
    const r = applyGameCommand(g, { type: 'CHANGE_JOB', playerId: 'P1', heroId: h.id, jobId: id }); expect(r.error).toBeUndefined(); g = r.state;
    expect(g.heroes[0].classId).toBe(id); expect(g.heroes[0].level).toBe(1); expect(g.heroes[0].jobPick).toEqual(j.signature);
    expect(g.heroes[0].equipment.weapon?.itemId).toBe(j.startingEquipment.weapon);
    expect(jobOptions(g.heroes[0], g)).toEqual([]);
    if (id === 'timeMage') expect(g.heroes[0].deck.some(c => c.cardId === 'timeStop')).toBe(true);
  });
  it.each(jobs)('%sは共用する祭壇で転職でき、別の祭壇では条件が揃っていても転職できない', id => {
    const g = fresh(), h = g.heroes[0], j = CLASSES.get(id), w = g.world!;
    h.classId = j.from![0]; h.level = 3; h.feats = { [j.requires!.feat]: j.requires!.count };
    const own = SANCTUARIES.all.find(s => s.altars?.includes(id))!, other = SANCTUARIES.all.find(s => s.kind === 'altar' && !s.altars?.includes(id))!;
    for (const [def, ready] of [[own, true], [other, false]] as const) {
      const tile = w.tiles.findIndex(t => t.f?.id === def.id); w.pos.h0 = tile;
      g.mode = 'sanctuary'; g.party = ['h0']; g.sanctuary = { sanctuaryId: def.id, heroId: 'h0', tile };
      expect(jobOptions(h, g).find(o => o.job.id === id)?.ready).toBe(ready);
    }
  });
});

describe('侍の居合', () => {
  it('未使用ターンで2倍→4倍、3回待ってもbalanceの上限4倍を超えない', () => {
    let s = battle('samurai');
    s = nextTurn(s); expect(s.allies[0].attackCharge?.multiplier).toBe(BALANCE.specialJobs.chargeFactor);
    s = nextTurn(s); expect(s.allies[0].attackCharge?.multiplier).toBe(BALANCE.specialJobs.chargeMax);
    s = nextTurn(s); expect(s.allies[0].attackCharge?.multiplier).toBe(4);
  });
  it('防御カードを使ったターンは蓄積せず、すでに蓄えた倍率は維持する', () => {
    let s = use(battle('samurai'), 'samuraiPoise'); s = nextTurn(s); expect(s.allies[0].attackCharge).toBeUndefined();
    s = nextTurn(s); expect(s.allies[0].attackCharge?.multiplier).toBe(2);
    s = use(s, 'samuraiFocus'); s = nextTurn(s); expect(s.allies[0].attackCharge?.multiplier).toBe(2);
  });
  it('2回攻撃の各回に倍率とブロックを適用し、1枚使うと消費する', () => {
    let s = nextTurn(battle('samurai')); const e = s.enemies[0]; e.block = 5;
    const hp = e.hp; s = use(s, 'samuraiSwallow');
    expect(hp - s.enemies[0].hp).toBe(31); expect(s.allies[0].attackCharge).toBeUndefined();
    const hp2 = s.enemies[0].hp; s = use(s, 'samuraiDrawCut'); expect(hp2 - s.enemies[0].hp).toBe(9);
  });
  it('予測と実ダメージが一致し、魔法攻撃では消費しない', () => {
    let s = nextTurn(battle('samurai')); s = use(s, 'bladeFire'); expect(s.allies[0].attackCharge?.multiplier).toBe(2);
    const card = getCard('samuraiDrawCut'), predicted = tierDamageAgainst(s.allies[0], card, s.enemies[0]).at(-1)!;
    const hp = s.enemies[0].hp; s = use(s, card.id); expect(hp - s.enemies[0].hp).toBe(predicted);
  });
});

describe('魔剣士の魔法剣', () => {
  it.each([['bladeFire', 'fire', 13], ['bladeIce', 'ice', 4]])('%sの属性を次の物理攻撃に宿し弱点・耐性を反映する', (id, element, damage) => {
    let s = use(battle('magicKnight'), id); expect(s.allies[0].imbuedElement).toBe(element);
    const predicted = tierDamageAgainst(s.allies[0], getCard('bladeStrike'), s.enemies[0]).at(-1)!;
    const hp = s.enemies[0].hp; s = use(s, 'bladeStrike');
    expect(hp - s.enemies[0].hp).toBe(damage); expect(predicted).toBe(damage); expect(s.allies[0].imbuedElement).toBeUndefined();
  });
  it('防御と次ターンを挟んでも保持し、多段物理カード全体へ属性を乗せる', () => {
    let s = use(battle('magicKnight'), 'bladeFire'); s = use(s, 'bladeBarrier'); s = nextTurn(s);
    expect(s.allies[0].imbuedElement).toBe('fire');
    const hp = s.enemies[0].hp; s = use(s, 'bladeRelease'); expect(hp - s.enemies[0].hp).toBe(48); expect(s.allies[0].imbuedElement).toBeUndefined();
  });
  it('元からある属性は上書きせず、無属性部分にだけ記憶した属性を使う', () => {
    const s = battle('magicKnight'), a = s.allies[0], e = s.enemies[0]; a.imbuedElement = 'fire';
    const ctx = makeCtx(s, createRng(1), [], a, { card: getCard('bladeStrike'), target: e });
    const hp = e.hp; applyEffect(ctx, { kind: 'damage', amount: 10, element: 'ice' }); expect(hp - e.hp).toBe(5);
    applyEffect(ctx, { kind: 'damage', amount: 10 }); expect(hp - e.hp).toBe(20);
  });
  it('複数属性の魔法は最後の属性を記憶し、属性のない魔法では記憶を変えない', () => {
    let s = use(battle('magicKnight'), 'elementRevelation'); expect(s.allies[0].imbuedElement).toBe('thunder');
    s = use(s, 'timeArrow'); expect(s.allies[0].imbuedElement).toBe('thunder');
  });
});

describe('時魔道士の時間操作', () => {
  it('最初のターンだけマナ+1を得る', () => {
    const initial = battle('timeMage'); expect(initial.allies[0].mana).toBe(BALANCE.manaPerTurn + 1);
    const next = nextTurn(initial); expect(next.allies[0].mana).toBe(BALANCE.manaPerTurn);
  });
  it.each(['attack', 'guard'])('%sの行動全体を休みにし、次のインテントは通常順へ戻る', actionId => {
    let s = battle('timeMage'); s.enemies[0].intent = { actionId, targetId: s.allies[0].id };
    s = use(s, 'timeStop', 0); const hp = s.allies[0].hp;
    expect(incomingDamage(s, s.allies[0])).toBe(0); expect(intentView(s, s.enemies[0])?.name).toContain('休み');
    s = nextTurn(s); expect(s.allies[0].hp).toBe(hp); expect(s.enemies[0].block).toBe(0); expect(s.enemies[0].statuses.holyLight).toBe(0);
    expect(s.enemies[0].skipNextAction).toBeUndefined(); expect(s.enemies[0].intent).toBeDefined();
  });
  it('同名の複数枚も含め1戦闘1回、次の戦闘では戻る', () => {
    let s = battle('timeMage'); s.allies[0].drawPile.push({ uid: 'duplicateStop', cardId: 'timeStop' });
    s = use(s, 'timeStop'); const a = s.allies[0];
    expect(a.exhaustedCards).toContain('timeStop'); expect([...a.hand, ...a.drawPile, ...a.discard].some(c => c.cardId === 'timeStop')).toBe(false);
    expect(unusableReason(s, a, getCard('timeStop'))).toContain('もう使いました');
    expect(unusableReason(battle('timeMage'), battle('timeMage').allies[0], getCard('timeStop'))).toBeNull();
  });
});

describe('死霊術師の屍兵', () => {
  it('仲間が倒した敵からは自分の屍兵を作らない', () => {
    const s = battle('necromancer'), warrior = battle('samurai').allies[0]; warrior.id = 'other'; s.allies.push(warrior);
    s.enemies[0].hp = 1; dealDamage(makeCtx(s, createRng(1), [], warrior), s.enemies[0], 100);
    expect(s.allies[0].summons ?? []).toEqual([]);
  });
  it('自分の撃破で増え、通常召喚と別に3体で止まり、戦闘中だけ持続する', () => {
    const s = battle('necromancer'), a = s.allies[0], e = s.enemies[0];
    applyEffect(makeCtx(s, createRng(1), [], a), { kind: 'summon', id: 'otherSummon', name: '別の召喚', icon: 'X', damage: 1, turns: 99 });
    for (let i = 0; i < 5; i++) { e.dead = false; e.hp = 1; dealDamage(makeCtx(s, createRng(1), [], a), e, 10); }
    const minions = a.summons!.filter(x => x.group === 'skeletonSoldier');
    expect(minions).toHaveLength(3); expect(new Set(minions.map(m => m.id)).size).toBe(3);
    expect(minions.every(m => m.damage === 3 && m.turns === 99)).toBe(true); expect(a.summons).toHaveLength(4);
    expect(battle('necromancer').allies[0].summons ?? []).toEqual([]);
  });
  it('屍兵3体が各ターン終了時に3ダメージずつ与え、残りターンは減らない', () => {
    let s = battle('necromancer'), e = s.enemies[0];
    for (let i = 0; i < 3; i++) { e.dead = false; e.hp = 1; dealDamage(makeCtx(s, createRng(1), [], s.allies[0]), e, 10); }
    e.dead = false; e.hp = 1000; s = nextTurn(s); expect(s.enemies[0].hp).toBe(991);
    expect(s.allies[0].summons?.every(x => x.turns === 99)).toBe(true);
  });
});

describe('暗黒騎士とHP支払い', () => {
  it.each([[100, 10], [50, 15], [1, 19]])('HP%s/100で通常攻撃のダメージは%s、最大約2倍', (hp, damage) => {
    const s = battle('darkKnight'), a = s.allies[0]; a.hp = hp; a.maxHp = 100;
    expect(dealDamage(makeCtx(s, createRng(1), [], a), s.enemies[0], 10)).toBe(damage);
  });
  it('HP支払いが先に入り、支払い後の倍率による予測と実ダメージが一致する', () => {
    let s = battle('darkKnight'); s.allies[0].hp = 50; s.allies[0].maxHp = 100;
    const predicted = tierDamageAgainst(s.allies[0], getCard('bloodBlade'), s.enemies[0]).at(-1)!;
    const hp = s.enemies[0].hp; s = use(s, 'bloodBlade'); expect(s.allies[0].hp).toBe(47);
    expect(hp - s.enemies[0].hp).toBe(15); expect(predicted).toBe(15);
  });
  it.each(['bloodBlade', 'bloodShield', 'bloodOffering', 'bloodSweep', 'bloodAbyss', 'graveWhisper'])('%sのHP支払いで戦闘不能になる場合、支払い・乱数・効果の前に拒否する', id => {
    const s = battle('darkKnight'), a = s.allies[0], card = getCard(id);
    a.hp = card.tiers[0].effects.filter(e => e.kind === 'payHp').reduce((n, e) => n + e.amount, 0);
    a.mana = 20; giveHand(s, a.id, [id]); const copy = structuredClone(s);
    const r = applyCommand(s, play(a.id, 't0', s.enemies[0].uid, 0));
    expect(r.error).toContain('戦闘不能'); expect(r.state).toEqual(copy); expect(s).toEqual(copy);
  });
  it('HP支払い後に1残るなら使用でき、再発動でもHPの支払いは1回', () => {
    let s = battle('darkKnight'); s.allies[0].hp = 4; s = use(s, 'bloodBlade'); expect(s.allies[0].hp).toBe(1);
    const e = s.enemies[0], a = s.allies[0]; a.hp = 10;
    const ctx = makeCtx(s, createRng(1), [], a, { target: e, card: getCard('bloodBlade'), tierEffects: getCard('bloodBlade').tiers[0].effects });
    applyEffect(ctx, { kind: 'repeatCard' }); expect(a.hp).toBe(10);
  });
});

describe('祭壇の半減と保存再開', () => {
  it('新規地図は祭壇5・神殿2で、10職すべての印を共用祭壇がカバーする', () => {
    const g = fresh(), fs = g.world!.tiles.map(t => t.f);
    expect(fs.filter(f => f?.kind === 'altar')).toHaveLength(5); expect(fs.filter(f => f?.kind === 'temple')).toHaveLength(2);
    expect(new Set(SANCTUARIES.all.flatMap(s => s.altars ?? [])).size).toBe(10);
  });
  it('旧10祭壇の保存を5か所へ整理し、滞在中の祭壇・地形・位置・乱数を保つ', () => {
    const old = fresh(); old.version = 9; const w = old.world!;
    const pairs = SANCTUARIES.all.filter(s => s.kind === 'altar');
    for (const def of pairs) {
      const tile = w.tiles.findIndex(t => !t.f && t.t === 'road'); w.tiles[tile].f = { kind: 'altar', id: def.legacyIds![0] };
    }
    const tile = w.tiles.findIndex(t => t.f?.id === 'necromancerAltar'); old.mode = 'sanctuary'; old.party = ['h0'];
    old.sanctuary = { sanctuaryId: 'necromancerAltar', heroId: 'h0', tile }; w.pos.h0 = tile;
    const before = structuredClone(old), next = migrateGame(structuredClone(old))!;
    expect(next.version).toBe(11); expect(next.world!.tiles.filter(t => t.f?.kind === 'altar')).toHaveLength(5);
    expect(next.sanctuary).toEqual({ sanctuaryId: 'timeMageAltar', heroId: 'h0', tile }); expect(next.world!.tiles[tile].f?.id).toBe('timeMageAltar');
    expect(next.rngState).toBe(before.rngState); expect(next.world!.pos).toEqual(before.world!.pos);
    next.world!.tiles.forEach((t, i) => { expect(t.t).toBe(before.world!.tiles[i].t); expect(t.seen).toBe(before.world!.tiles[i].seen); });
    expect(migrateGame(structuredClone(next))).toEqual(next); expect(addSanctuaries(next, next.world!)).toEqual([]);
  });
  it.each(jobs)('%sの能力状態を保存して再開しても、同じコマンドで同じ結果になり入力は変わらない', id => {
    const g = fresh(), h = g.heroes[0]; h.classId = id;
    const s = createBattle({ seed: 6, party: [toPartyMember(h)], encounter: { id: 'special', name: '検証', enemies: [{ defId: 'specialJobDummy' }] } });
    s.allies[0].attackCharge = { multiplier: 4, category: 'physical' }; s.allies[0].imbuedElement = 'fire';
    s.enemies[0].skipNextAction = true; giveHand(s, h.id, ['samuraiDrawCut']); s.allies[0].mana = 20;
    g.mode = 'battle'; g.battle = s; g.party = [h.id];
    const resumed = migrateGame(JSON.parse(JSON.stringify(g)))!; const copy = structuredClone(g);
    const cmd = { type: 'BATTLE' as const, command: play(h.id, 't0', s.enemies[0].uid, 0) };
    expect(applyGameCommand(g, cmd)).toEqual(applyGameCommand(resumed, cmd)); expect(g).toEqual(copy);
  });
});
