import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { getCard } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { ENEMIES } from '../../data/enemies';
import { ITEMS } from '../../data/items';
import { WEAPON_TYPES } from '../../data/rules';
import type { BattleState, Command, PlayerId } from '../../types';
import { applyCommand, applyGameCommand, chanceFor, createBattle, createGame, createRng, describeEffect, effectShort, jobOptions, migrateGame, rollChanceFor, rollSlots, slotPreviewLimitOf } from '../index';
import { applyEffect, dealDamage, makeCtx } from '../battle/effects';
import { giveHand, nextTurn } from './helpers';

const jobs = ['shrineMaiden', 'astrologer', 'machinist', 'bard', 'gambler'];
ENEMIES.register({ id: 'finalJobDummy', name: '確認用の敵', icon: 'T', maxHp: 100000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence',
  actions: [{ id: 'hit', name: '連撃', effects: [{ kind: 'damage', amount: 10, hits: 2 }] }] });
function battle(classes = ['astrologer'], seed = 17): BattleState {
  const s = createBattle({ seed, party: classes.map((classId, i) => ({ classId, name: `仲間${i}`, gender: 'male', playerId: `P${i + 1}` as PlayerId })), encounter: { id: 'finalJobs', name: '確認', enemies: [{ defId: 'finalJobDummy' }] } });
  for (const a of s.allies) { a.hp = a.maxHp = 1000; a.mana = 20; a.focus = 6; }
  return s;
}
function cardCommand(s: BattleState, cardId: string, index = 0, focus = getCard(cardId).slots, target = 0): Extract<Command, { type: 'PLAY_CARD' }> {
  const a = s.allies[index]; giveHand(s, a.id, [cardId]); a.mana = 20; a.focus = 6;
  return { type: 'PLAY_CARD', characterId: a.id, playerId: a.playerId, cardInstanceId: 't0', focusUsed: focus, targetId: s.enemies[target]?.uid };
}
function use(s: BattleState, cardId: string, index = 0, focus = getCard(cardId).slots, target = 0) {
  const cmd = cardCommand(s, cardId, index, focus, target), r = applyCommand(s, cmd); expect(r.error).toBeUndefined(); return r.state;
}
function reserve(s: BattleState, index = 0, focus = 0) {
  const cmd = cardCommand(s, 'starRay', index, focus);
  const r = applyCommand(s, { ...cmd, type: 'PREVIEW_CARD' }); expect(r.error).toBeUndefined(); return r.state;
}
const fresh = () => createGame({ seed: 17, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', name: '確認', gender: 'male', playerId: 'P1' }] });

describe('後半5職のデータ・転職', () => {
  it('全44職・特殊10職、後半各6枚と代表3枚、エピック2枚以上を自動登録する', () => {
    expect(CLASSES.all).toHaveLength(44); expect(CLASSES.all.filter(j => j.tier === 'special')).toHaveLength(10);
    expect(new Set(jobs.flatMap(id => CLASSES.get(id).cardPool)).size).toBe(30);
    for (const id of jobs) {
      const j = CLASSES.get(id); expect(j.cardPool).toHaveLength(6); expect(j.signature).toEqual(j.cardPool.slice(0, 3));
      expect(j.cardPool.filter(c => getCard(c).rarity === 'epic').length).toBeGreaterThanOrEqual(2);
    }
  });
  it.each([
    ['shrineMaiden', 'bishop', 'scepter', 'hammer', 'per', 'vit'], ['astrologer', 'bishop', 'tome', 'staff', 'int', 'luk'],
    ['machinist', 'archer', 'gun', 'bow', 'dex', 'int'], ['bard', 'phantomThief', 'instrument', 'dagger', 'luk', 'per'], ['gambler', 'phantomThief', 'dagger', 'instrument', 'luk', 'dex'],
  ] as const)('%sの武器とHP+8・得意+6・補助+4が指定どおり', (id, from, main, sub, primary, secondary) => {
    const j = CLASSES.get(id), base = CLASSES.get(from);
    expect(j.weaponType).toBe(main); expect(j.subWeapons).toEqual([sub]); expect(ITEMS.get(j.startingEquipment.weapon!).weaponType).toBe(main);
    expect(j.baseMaxHp).toBe(base.baseMaxHp + 8); expect(j.stats[primary]).toBe(base.stats[primary] + 6); expect(j.stats[secondary]).toBe(base.stats[secondary] + 4);
  });
  it.each(jobs)('%sは特殊職のLv・実績・神殿で転職し、代表カードを1枚選べる', id => {
    let g = fresh(); const j = CLASSES.get(id), h = g.heroes[0];
    h.classId = j.from![0]; h.level = BALANCE.jobChange.special; h.feats = { [j.requires!.feat]: j.requires!.count };
    const tile = g.world!.tiles.findIndex(t => t.f?.id === 'pilgrimTemple'); g.world!.pos[h.id] = tile;
    g.mode = 'sanctuary'; g.party = [h.id]; g.sanctuary = { sanctuaryId: 'pilgrimTemple', heroId: h.id, tile };
    expect(jobOptions(h, g).find(o => o.job.id === id)?.ready).toBe(true);
    const before = h.deck.length;
    const changed = applyGameCommand(g, { type: 'CHANGE_JOB', playerId: 'P1', heroId: h.id, jobId: id }); expect(changed.error).toBeUndefined(); g = changed.state;
    expect(g.heroes[0].jobPick).toEqual(j.signature);
    const picked = applyGameCommand(g, { type: 'PICK_JOB_CARD', playerId: 'P1', heroId: h.id, cardId: j.signature![0] }); expect(picked.error).toBeUndefined();
    expect(picked.state.heroes[0].deck.length).toBe(before + 1 + (j.jobCards?.length ?? 0));
    expect(picked.state.heroes[0].jobPick).toBeUndefined();
  });
  it('銃と楽器の初期武器には対応する武器カードが2枚ずつ付く', () => {
    for (const [weapon, type, card] of [['antiqueGun', 'gun', 'wGunShot'], ['travelerLute', 'instrument', 'wEncouragingNote']]) {
      expect(WEAPON_TYPES.has(type)).toBe(true); expect(ITEMS.get(weapon).cards).toEqual([{ cardId: card, count: 2 }]);
    }
  });
});

describe('星読みの予約・振り直し・保存', () => {
  it.each([0, 1, 2])('フォーカス%d: 同じ種なら20回やり直しても表示と振り直しの結果・最終状態が一致する', focus => {
    const s = battle(), cmd = cardCommand(s, 'starRay', 0, focus), copy = structuredClone(s);
    const previewCmd: Command = { ...cmd, type: 'PREVIEW_CARD' };
    const expected = applyCommand(s, previewCmd); expect(expected.error).toBeUndefined();
    for (let n = 0; n < 20; n++) expect(applyCommand(s, previewCmd)).toEqual(expected);
    expect(s).toEqual(copy);
    const rng = createRng(s.rngState), chance = rollChanceFor(s.allies[0], getCard('starRay'), focus);
    expect(expected.state.slotPreview?.results).toEqual(rollSlots(2, focus, chance, rng));
    expect(expected.state.slotPreview?.rerollResults).toEqual(rollSlots(2, focus, chance, rng));
    expect(expected.state.rngState).toBe(rng.state);
    expect(expected.state.allies[0].mana).toBe(20); expect(expected.state.allies[0].focus).toBe(6); expect(expected.state.allies[0].hand).toEqual(s.allies[0].hand);
    const reroll: Command = { type: 'REROLL_PREVIEW', playerId: 'P1', characterId: s.allies[0].id };
    const confirm: Command = { type: 'CONFIRM_PREVIEW', playerId: 'P1', characterId: s.allies[0].id };
    const a = applyCommand(expected.state, reroll); expect(a.error).toBeUndefined(); expect(a.state.rngState).toBe(rng.state);
    const done = applyCommand(a.state, confirm); expect(done.error).toBeUndefined();
    expect(done.events.find(e => e.type === 'roll')).toMatchObject({ results: expected.state.slotPreview!.rerollResults });
    expect(done.state.slotPreview).toBeUndefined(); expect(done.state.allies[0].mana).toBe(19); expect(done.state.allies[0].focus).toBe(6 - focus);
    for (let n = 0; n < 20; n++) expect(applyCommand(applyCommand(expected.state, reroll).state, confirm)).toEqual(done);
  });
  it.each([false, true])('振り直し済み=%sで保存・再開しても、表示と確定結果が変わらない', rerolled => {
    const g = fresh(); g.heroes[0].classId = 'astrologer';
    let b = reserve(battle(), 0, 1);
    // 冒険のキャラと戦闘のIDを揃える。
    const owner = b.allies[0]; owner.id = 'h0'; b.slotPreview!.characterId = 'h0';
    if (rerolled) b = applyCommand(b, { type: 'REROLL_PREVIEW', playerId: 'P1', characterId: 'h0' }).state;
    g.mode = 'battle'; g.party = ['h0']; g.battle = b;
    const resumed = migrateGame(JSON.parse(JSON.stringify(g)))!; expect(resumed.battle?.slotPreview).toEqual(b.slotPreview);
    const cmd = { type: 'BATTLE' as const, command: { type: 'CONFIRM_PREVIEW' as const, playerId: 'P1' as const, characterId: 'h0' } };
    expect(applyGameCommand(g, cmd)).toEqual(applyGameCommand(resumed, cmd));
  });
  it('振り直さず確定した場合は最初の結果を使い、再確定や2回目の先読みは拒否する', () => {
    const s = reserve(battle()); const first = s.slotPreview!.results;
    const cmd: Command = { type: 'CONFIRM_PREVIEW', playerId: 'P1', characterId: 'a0' };
    const r = applyCommand(s, cmd); expect(r.error).toBeUndefined(); expect(r.events.find(e => e.type === 'roll')).toMatchObject({ results: first });
    expect(applyCommand(r.state, cmd).error).toBeDefined(); expect(applyCommand(r.state, cmd).state).toEqual(r.state);
    const next = cardCommand(r.state, 'starRay'); expect(applyCommand(r.state, { ...next, type: 'PREVIEW_CARD' }).error).toContain('使えません');
    expect(slotPreviewLimitOf(battle().allies[0])).toBe(1); expect(battle().allies[0].slotPreviewUsed).toBe(0);
  });
  it('振り直しを2回送っても乱数・結果・支払いは進まない', () => {
    const s = reserve(battle()), cmd: Command = { type: 'REROLL_PREVIEW', playerId: 'P1', characterId: 'a0' };
    const first = applyCommand(s, cmd); expect(first.error).toBeUndefined();
    const again = applyCommand(first.state, cmd); expect(again.error).toContain('1回'); expect(again.state).toEqual(first.state);
  });
  it.each(['PLAY_CARD', 'END_TURN', 'ENEMY_STEP', 'AIM', 'USE_ITEM', 'PREVIEW_CARD'] as const)('確認中は%sを拒否し、同じ戦闘の状態と乱数を保つ', type => {
    const s = reserve(battle(['astrologer', 'warrior']));
    const cmd = type === 'PLAY_CARD' || type === 'PREVIEW_CARD' ? { type, playerId: 'P2', characterId: 'a1', cardInstanceId: 'x', focusUsed: 0 }
      : type === 'USE_ITEM' ? { type, playerId: 'P2', characterId: 'a1', targetId: 'a0', itemName: '回復', effects: [{ kind: 'heal', amount: 10 }] }
      : type === 'AIM' ? { type, playerId: 'P2', characterId: 'a1' } : { type, playerId: 'P2' };
    const r = applyCommand(s, cmd as Command); expect(r.error).toContain('待機'); expect(r.state).toEqual(s);
  });
  it('P2の先読みはP2だけが振り直し・確定でき、P1による操作を拒否する', () => {
    const s = reserve(battle(['warrior', 'astrologer']), 1);
    for (const type of ['REROLL_PREVIEW', 'CONFIRM_PREVIEW'] as const) {
      const r = applyCommand(s, { type, playerId: 'P1', characterId: 'a1' }); expect(r.error).toContain('担当'); expect(r.state).toEqual(s);
    }
    expect(applyCommand(s, { type: 'CONFIRM_PREVIEW', playerId: 'P2', characterId: 'a1' }).error).toBeUndefined();
  });
  it('拒否された予約は使用回数・乱数・支払いを変えない', () => {
    const s = battle(), cmd = cardCommand(s, 'starRay');
    for (const invalid of [{ ...cmd, playerId: 'P2' }, { ...cmd, focusUsed: 999 }, { ...cmd, targetId: 'missing' }]) {
      const copy = structuredClone(s), r = applyCommand(s, { ...invalid, type: 'PREVIEW_CARD' } as Command);
      expect(r.error).toBeDefined(); expect(r.state).toEqual(copy); expect(s).toEqual(copy);
    }
  });
  it('応援は予約では消費せず、確定したカードで1回だけ消費する', () => {
    let s = battle(); s.allies[0].statuses.songInspired = 1; s = reserve(s);
    expect(s.allies[0].statuses.songInspired).toBe(1);
    s = applyCommand(s, { type: 'CONFIRM_PREVIEW', playerId: 'P1', characterId: 'a0' }).state;
    expect(s.allies[0].statuses.songInspired).toBe(0); expect(s.allies[0].feats?.mana).toBe(1); expect(s.allies[0].played).toBe(1);
  });
});

describe('巫女の神降ろし', () => {
  it('自分を含む他プレイヤー4人全員を3ターン強化し、HP6・マナ2を1回だけ支払う', () => {
    let s = battle(['shrineMaiden', 'warrior', 'mage', 'hunter']); s.allies[0].drawPile.push({ uid: 'extra', cardId: 'divinePossession' });
    const hp = s.allies[0].hp; s = use(s, 'divinePossession'); expect(s.allies[0].hp).toBe(hp - 6); expect(s.allies[0].mana).toBe(18);
    expect(s.allies.every(a => a.statuses.possession === 3)).toBe(true);
    expect([...s.allies[0].hand, ...s.allies[0].drawPile, ...s.allies[0].discard].some(c => c.cardId === 'divinePossession')).toBe(false);
    const retry = cardCommand(s, 'divinePossession'); expect(applyCommand(s, retry).error).toContain('もう使いました');
  });
  it('残り3・2・1ターンのどれも成功率+10%、ダメージ1.2倍で、3回終了後に消える', () => {
    let s = battle(['shrineMaiden', 'warrior']); const c = getCard('samuraiMoon');
    const base = chanceFor(s.allies[1], c); s = use(s, 'divinePossession');
    for (const turns of [3, 2, 1]) {
      expect(s.allies[1].statuses.possession).toBe(turns); expect(chanceFor(s.allies[1], c)).toBe(base + 10);
      expect(dealDamage(makeCtx(s, createRng(1), [], s.allies[1]), s.enemies[0], 10)).toBe(12);
      s = nextTurn(s);
    }
    expect(s.allies[1].statuses.possession).toBe(0); expect(chanceFor(s.allies[1], c)).toBe(base);
  });
  it('再付与は期間を3に戻し、倍率や成功率を重ねない', () => {
    const s = battle(['shrineMaiden', 'warrior']), ctx = makeCtx(s, createRng(1), [], s.allies[0]);
    applyEffect(ctx, { kind: 'applyStatus', status: 'possession', amount: 3, to: 'allies' });
    s.allies[1].statuses.possession = 1;
    applyEffect(ctx, { kind: 'applyStatus', status: 'possession', amount: 3, to: 'allies' });
    expect(s.allies[1].statuses.possession).toBe(3); expect(dealDamage(makeCtx(s, createRng(1), [], s.allies[1]), s.enemies[0], 10)).toBe(12);
  });
  it('HP6以下では支払い前に拒否し、通常能力はターン開始に味方を1回復する', () => {
    let s = battle(['shrineMaiden', 'warrior']); s.allies[0].hp = 6; const cmd = cardCommand(s, 'divinePossession');
    const r = applyCommand(s, cmd); expect(r.error).toContain('戦闘不能'); expect(r.state).toEqual(s);
    s = battle(['shrineMaiden', 'warrior']); s.allies[1].hp = 100; s.enemies[0].intent = undefined;
    s = nextTurn(s); expect(s.allies[1].hp).toBe(101);
  });
});

describe('機工士の砲台・罠', () => {
  it('開始時は砲台1基、設置カードを繰り返しても砲台1・罠1まで', () => {
    let s = battle(['machinist']); expect(s.allies[0].summons?.map(t => t.id)).toEqual(['turret']);
    for (let i = 0; i < 4; i++) { s = use(s, 'placeTurret'); s = use(s, 'placeTrap'); }
    expect(s.allies[0].summons).toHaveLength(2); expect(s.allies[0].summons?.every(t => t.turns === 3)).toBe(true);
  });
  it.each(['placeTurret', 'placeTrap'])('%sの再設置は新しい対象・残り3ターンで上書きし、古い対象や長い期間を残さない', id => {
    let s = battle(['machinist']); s.enemies.push({ ...structuredClone(s.enemies[0]), uid: 'second' });
    s = use(s, id); const tokenId = id === 'placeTurret' ? 'turret' : 'mechanicalTrap';
    const old = s.allies[0].summons!.find(t => t.id === tokenId)!; old.turns = 8; old.damage = 99;
    s = use(s, id, 0, getCard(id).slots, 1); const token = s.allies[0].summons!.find(t => t.id === tokenId)!;
    expect(token.targetId).toBe('second'); expect(token.turns).toBe(3); expect(token.damage).toBe(id === 'placeTurret' ? 3 : 0);
    expect(s.allies[0].summons!.filter(t => t.id === tokenId)).toHaveLength(1);
  });
  it('砲台は指定した敵に3ダメージ、3回の攻撃で消える', () => {
    let s = battle(['machinist']); s.enemies.push({ ...structuredClone(s.enemies[0]), uid: 'second' });
    s = use(s, 'placeTurret', 0, 2, 1); const hp = s.enemies[1].hp, other = s.enemies[0].hp;
    s = nextTurn(s); expect(s.enemies[1].hp).toBe(hp - 3); expect(s.enemies[0].hp).toBe(other);
    s = nextTurn(s); s = nextTurn(s); expect(s.enemies[1].hp).toBe(hp - 9); expect(s.allies[0].summons).toEqual([]);
  });
  it('罠は敵の行動直前に3ダメージ・弱体1を与え、通常召喚の攻撃とは別に1回だけ発動する', () => {
    let s = battle(['machinist']); s.allies[0].summons = []; s = use(s, 'placeTrap'); s.allies[0].block = 0;
    const hp = s.enemies[0].hp, allyHp = s.allies[0].hp; s = nextTurn(s);
    expect(s.enemies[0].hp).toBe(hp - 3); expect(s.allies[0].hp).toBe(allyHp - 14); expect(s.allies[0].summons).toEqual([]);
  });
  it('敵が休む間は罠が待ち、設置ターンを含む3ターンで期限切れになる', () => {
    let s = battle(['machinist']); s.allies[0].summons = []; s = use(s, 'placeTrap'); const hp = s.enemies[0].hp;
    for (const left of [2, 1, 0]) {
      s.enemies[0].skipNextAction = true; s = nextTurn(s);
      expect(s.allies[0].summons?.[0]?.turns ?? 0).toBe(left); expect(s.enemies[0].hp).toBe(hp);
    }
  });
  it('罠で敵を倒したら敵の攻撃は行われず、別の攻撃で対象が倒れた罠は不発で消える', () => {
    let s = battle(['machinist']); s.allies[0].summons = []; s = use(s, 'placeTrap'); s.enemies[0].hp = 1;
    const hp = s.allies[0].hp; s = nextTurn(s); expect(s.phase).toBe('victory'); expect(s.allies[0].hp).toBe(hp);
    s = battle(['machinist']); s = use(s, 'placeTrap'); s.enemies[0].hp = 1; s = use(s, 'machineShot');
    expect(s.allies[0].summons?.some(t => t.trigger)).toBe(false);
  });
});

describe('吟遊詩人の仲間支援', () => {
  it('P1の歌がP2〜P4全員の次のカード成功率を上げ、同じ歌は重ならない', () => {
    let s = battle(['bard', 'warrior', 'mage', 'hunter']); const card = getCard('samuraiMoon'), base = s.allies.map(a => chanceFor(a, card));
    s = use(s, 'bardCourage'); s = use(s, 'bardCourage');
    for (let i = 0; i < 4; i++) { expect(s.allies[i].statuses.songInspired).toBe(1); expect(chanceFor(s.allies[i], card)).toBe(Math.min(95, base[i] + 10)); }
    s = use(s, 'starRay', 1); expect(s.allies[1].statuses.songInspired).toBe(0); expect(s.allies[2].statuses.songInspired).toBe(1);
  });
  it('他プレイヤーのフォーカスを上限まで回復し、歌の余韻は1ターン1回だけ', () => {
    let s = battle(['bard', 'warrior', 'mage', 'hunter']); for (const a of s.allies.slice(1)) a.focus = 0;
    s = use(s, 'bardFocus'); expect(s.allies.slice(1).map(a => a.focus)).toEqual([1, 1, 1]); expect(s.allies[0].block).toBe(6);
    s = use(s, 'bardFocus'); expect(s.allies[0].block).toBe(10); expect(s.allies[0].feats?.['support:others']).toBe(2);
  });
  it('自分だけの防御や、上限で効果のない支援では余韻を発動しない', () => {
    let s = battle(['bard', 'warrior']); s = use(s, 'starWard'); expect(s.allies[0].block).toBe(10);
    s = use(s, 'bardFocus', 0, 0); expect(s.allies[0].block).toBeLessThanOrEqual(14); expect(s.allies[0].feats?.['support:others']).toBeUndefined();
    expect(s.allies[0].counters?.['once:songAfterglow']).toBeUndefined();
  });
  it('同じ初期状態・P1/P2コマンド列を各端末で処理すると支援と消費が一致する', () => {
    const initial = battle(['bard', 'warrior']); const first = cardCommand(initial, 'bardCourage');
    let a = applyCommand(structuredClone(initial), first).state, b = applyCommand(structuredClone(initial), first).state;
    const second = cardCommand(a, 'starRay', 1); giveHand(b, b.allies[1].id, ['starRay']); b.allies[1].mana = 20; b.allies[1].focus = 6;
    a = applyCommand(a, second).state; b = applyCommand(b, second).state; expect(a).toEqual(b);
    const forged = applyCommand(a, { ...second, playerId: 'P1' }); expect(forged.error).toContain('担当'); expect(forged.state).toEqual(a);
  });
});

describe('賭博師の確率と上下限', () => {
  it('固定した1000種で3種類の結果だけが出て、25/50/25の範囲に収まる', () => {
    const counts = new Map<number, number>();
    for (let seed = 0; seed < 1000; seed++) {
      const s = battle(['gambler']), e = s.enemies[0], hp = e.hp;
      applyEffect(makeCtx(s, createRng(seed), [], s.allies[0], { target: e }), getCard('gambleStrike').tiers[2].effects[0]);
      const loss = hp - e.hp; counts.set(loss, (counts.get(loss) ?? 0) + 1);
    }
    expect([...counts.keys()].sort((a, b) => a - b)).toEqual([6, 8, 12]);
    expect(counts.get(6)).toBeGreaterThan(200); expect(counts.get(6)).toBeLessThan(300);
    expect(counts.get(8)).toBeGreaterThan(450); expect(counts.get(8)).toBeLessThan(550);
    expect(counts.get(12)).toBeGreaterThan(200); expect(counts.get(12)).toBeLessThan(300);
  });
  it('多段攻撃でも追加抽選は1回で、両方に同じ倍率が効く', () => {
    const s = battle(['gambler']), rng = createRng(4), events: import('../../types').BattleEvent[] = [];
    applyEffect(makeCtx(s, rng, events, s.allies[0], { target: s.enemies[0] }), { kind: 'damage', amount: 8, hits: 2, outcomes: BALANCE.specialJobs.gambleOutcomes.map(o => ({ ...o })) });
    const damages = events.filter(e => e.type === 'damage'); expect(damages).toHaveLength(2); expect(damages[0].amount).toBe(damages[1].amount);
    const expected = createRng(4); expected.next(); expect(rng.state).toBe(expected.state);
  });
  it('同じ種なら抽選結果が一致し、説明と短い表示に振れ幅・確率を表示する', () => {
    const s = battle(['gambler']), cmd = cardCommand(s, 'gambleStrike'); expect(applyCommand(s, cmd)).toEqual(applyCommand(s, cmd));
    const e = getCard('gambleStrike').tiers[2].effects[0]; expect(effectShort(e)).toBe('6〜12'); expect(describeEffect(e)).toContain('25%で×0.75');
  });
  it('0成功の攻撃時のフォーカス回復は1ターン1回で、自滅やお金の損失はない', () => {
    let seed = 0, s = battle(['gambler']);
    // 両枠不成功になる種を固定した探索で見つける。
    for (; seed < 10000; seed++) { const probe = createRng(seed); if (probe.next() > 0.95 && probe.next() > 0.95) break; }
    s.rngState = seed; const cmd = cardCommand(s, 'gambleStrike', 0, 0), hp = s.allies[0].hp; s.allies[0].focus = 0;
    const first = applyCommand(s, cmd); expect(first.error).toBeUndefined(); s = first.state; expect(s.allies[0].focus).toBe(1);
    s.rngState = seed; const second = cardCommand(s, 'gambleStrike', 0, 0); s.allies[0].focus = 1;
    s = applyCommand(s, second).state; expect(s.allies[0].focus).toBe(1); expect(s.allies[0].hp).toBe(hp); expect(s.bonusGold).toBeUndefined();
  });
});
