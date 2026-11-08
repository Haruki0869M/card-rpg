import { describe, expect, it } from 'vitest';
import { getCard } from '../data/cards';
import { createBattle, createGame, applyGameCommand, applyCommand, createRng, migrateGame, toPartyMember } from '../engine';
import { applyEffect, dealDamage, makeCtx } from '../engine/battle/effects';
import { heroAbilities, heroMaxHp } from '../engine/game/hero';
import { petAbilities } from '../engine/game/pets';
import type { BattleEvent } from '../types';
import { battleFrames, explorationNotices } from './presentation';
import { normalizeSettings } from './settings';

const fresh = () => createGame({ seed: 7, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', name: '確認', gender: 'male', playerId: 'P1' }] });
const roll: BattleEvent = { type: 'roll', characterId: 'a0', cardId: 'strike', targetId: 'e0', chance: 80, results: ['hit'], successes: 1, perfect: true, summary: '確認' };
describe('戦闘の表示順と数値', () => {
  it('最後に届くスロット結果でも、行動者→対象の順に表示し、入力は変更しない', () => {
    const events: BattleEvent[] = [{ type: 'damage', unitId: 'e0', sourceId: 'a0', amount: 7, blocked: 3 }, roll], before = structuredClone(events);
    const frames = battleFrames(events);
    expect(frames[0].motions).toEqual([{ unitId: 'a0', kind: 'attack' }]); expect(frames[0].roll).toEqual(roll);
    expect(frames[1].delay).toBeGreaterThan(0); expect(frames[1].motions).toEqual([{ unitId: 'e0', kind: 'hit' }]);
    expect(frames[1].popups?.map(p => p.text)).toEqual(['-7', '防御3']); expect(events).toEqual(before);
  });
  it('敵の行動でも、敵の踏み込み→味方の被弾の順になる', () => {
    const f = battleFrames([{ type: 'enemyAct', enemyUid: 'e0', actionName: '連撃', targetIds: ['a0'] }, { type: 'damage', sourceId: 'e0', unitId: 'a0', amount: 4, blocked: 0 }]);
    expect(f[0].motions?.[0]).toEqual({ unitId: 'e0', kind: 'attack' }); expect(f[1].motions?.[0]).toEqual({ unitId: 'a0', kind: 'hit' });
  });
  it('凍結・再生なども登録データの名前になり、ブロック・HP・資源と区別する', () => {
    const f = battleFrames([{ type: 'status', unitId: 'e0', status: 'freeze', amount: 1 }, { type: 'status', unitId: 'a0', status: 'regen', amount: 2 }, { type: 'block', unitId: 'a0', amount: 3 }, { type: 'heal', unitId: 'a0', amount: 4 }, { type: 'resource', unitId: 'a0', resource: 'focus', amount: 1 }]);
    expect(f.flatMap(x => x.popups?.map(p => p.text) ?? [])).toEqual(['凍結+1', '再生+2', 'ブロック+3', 'HP+4', 'フォーカス+1']);
  });
  it('3発は個別表示し、長い連撃は総ダメージを失わずまとめる', () => {
    const f = battleFrames(Array.from({ length: 12 }, () => ({ type: 'damage' as const, sourceId: 'a0', unitId: 'e0', amount: 3, blocked: 0 })));
    const damage = f.flatMap(x => x.popups ?? []).filter(p => p.tone === 'damage');
    expect(damage).toHaveLength(3); expect(damage.map(p => Number(p.text.match(/\d+/)![0])).reduce((a, b) => a + b, 0)).toBe(36);
  });
  it('同じお供の連続発動は1件にまとめ、同名でも異なる出所は区別する', () => {
    const pet = { type: 'ability' as const, unitId: 'a0', name: '見切り', source: { kind: 'pet' as const, id: 'owl', label: 'ホー' } };
    const f = battleFrames([pet, pet, { ...pet, source: { kind: 'inherited', id: 'rogue', label: '前の職' } }]);
    expect(f[0].notices).toHaveLength(2); expect(f[0].notices![0].count).toBe(2);
    expect(f.flatMap(x => x.popups ?? [])).toHaveLength(0);
  });
});

describe('能力の出所と開始時の通知', () => {
  it('引き継ぎ・装備・お供に出所が付き、同じ能力データを変更しない', () => {
    const g = fresh(), h = g.heroes[0]; h.carried = 'guardian'; h.equipment.armor = { uid: 'armor', itemId: 'mithrilMail' };
    h.pet = { petId: 'cockatiel', color: 'normal', name: 'ぴー', love: 0, acts: 0 };
    expect(heroAbilities(h).map(a => a.source?.kind)).toEqual(['inherited', 'equipment', 'pet']);
    expect(petAbilities(h)[0].source).toEqual({ kind: 'pet', id: 'cockatiel', label: 'ぴー', effectName: '先読み' });
  });
  it('開幕のお供の脆弱とブロックは実際の発動結果として保持する', () => {
    const g = fresh(), h = g.heroes[0]; h.pet = { petId: 'cockatiel', color: 'normal', name: 'ぴー', love: 0, acts: 0 };
    const b = createBattle({ seed: 7, party: [toPartyMember(h)], encounter: { id: 'test', name: '確認', enemies: [{ defId: 'forestWolf' }] } });
    expect(b.openingEvents?.some(e => e.type === 'ability' && e.source?.kind === 'pet' && e.source.effectName === '先読み')).toBe(true);
    expect(b.enemies[0].statuses.vulnerable).toBe(1);
    const restored = JSON.parse(JSON.stringify(b)); expect(restored.openingEvents).toEqual(b.openingEvents);
  });
  it('属性倍率のお供も実際に適用された攻撃だけ出所を保持し、連撃で重複しない', () => {
    const g = fresh(), h = g.heroes[0]; h.pet = { petId: 'babyDragon', color: 'crimson', name: 'リュー', love: 0, acts: 0 };
    const b = createBattle({ seed: 7, party: [toPartyMember(h)], encounter: { id: 'test', name: '確認', enemies: [{ defId: 'forestWolf' }] } });
    b.enemies[0].hp = b.enemies[0].maxHp = 1000;
    const ctx = makeCtx(b, createRng(7), [], b.allies[0], { card: getCard('fireball') });
    dealDamage(ctx, b.enemies[0], 5, 'fire'); dealDamage(ctx, b.enemies[0], 5, 'fire');
    expect(ctx.fired.filter(n => n.source?.kind === 'pet')).toHaveLength(1);
    const plain = makeCtx(b, createRng(7), [], b.allies[0], { card: getCard('strike') }); dealDamage(plain, b.enemies[0], 5);
    expect(plain.fired.filter(n => n.source?.kind === 'pet')).toHaveLength(0);
  });
  it('剣聖の二の太刀と引き継いだ見切りの発動通知を区別できる', () => {
    const g = fresh(), h = g.heroes[0]; h.classId = 'swordSaint'; h.carried = 'swordmaster';
    const b = createBattle({ seed: 7, party: [toPartyMember(h)], encounter: { id: 'test', name: '確認', enemies: [{ defId: 'forestWolf' }] } });
    b.enemies[0].hp = b.enemies[0].maxHp = 10000; b.allies[0].mana = 20; b.allies[0].focus = 6; b.allies[0].hand = [{ uid: 's', cardId: 'strike' }];
    const r = applyCommand(b, { type: 'PLAY_CARD', playerId: 'P1', characterId: 'h0', cardInstanceId: 's', targetId: 'e0', focusUsed: 1 });
    expect(r.error).toBeUndefined();
    expect(r.events.filter(e => e.type === 'ability').map(e => e.source?.kind)).toContain('inherited');
    expect(r.events.some(e => e.type === 'ability' && e.name === '二の太刀' && e.source?.id === 'swordSaint')).toBe(true);
  });
  it('屍兵の設置と能力名は表示上1回にまとめ、実際に召喚は1体増える', () => {
    const g = fresh(), h = g.heroes[0]; h.classId = 'necromancer';
    const b = createBattle({ seed: 7, party: [toPartyMember(h)], encounter: { id: 'test', name: '確認', enemies: [{ defId: 'forestWolf' }, { defId: 'forestWolf' }] } });
    b.enemies[0].hp = 1; b.allies[0].mana = 20; b.allies[0].focus = 6; b.allies[0].hand = [{ uid: 's', cardId: 'strike' }];
    const r = applyCommand(b, { type: 'PLAY_CARD', playerId: 'P1', characterId: 'h0', cardInstanceId: 's', targetId: 'e0', focusUsed: 1 });
    expect(r.error).toBeUndefined(); expect(r.state.allies[0].summons).toHaveLength(1);
    const n = battleFrames(r.events).flatMap(f => f.notices ?? []).filter(n => n.name === '屍兵');
    expect(n).toHaveLength(1); expect(n[0].source?.kind).toBe('job');
  });
  it('かばうは代わりに受けたキャラの能力として通知する', () => {
    const b = createBattle({ seed: 7, party: ['warrior', 'guardian'].map((classId, i) => ({ classId, name: `確認${i}`, gender: 'male' as const, playerId: 'P1' as const })), encounter: { id: 'test', name: '確認', enemies: [{ defId: 'forestWolf' }] } });
    b.allies[0].hp = 1; b.allies[0].block = 0;
    const events: BattleEvent[] = []; dealDamage(makeCtx(b, createRng(7), events, b.enemies[0]), b.allies[0], 100);
    expect(events.some(e => e.type === 'ability' && e.unitId === 'a1' && e.source?.kind === 'job' && e.source.id === 'guardian')).toBe(true);
    expect(b.allies[0].hp).toBe(1);
  });
  it('旧戦闘は能力の効果・乱数・HPを変えず出所だけ補い、開始イベントを作らない', () => {
    const g = fresh(), h = g.heroes[0]; h.equipment.armor = { uid: 'armor', itemId: 'mithrilMail' };
    g.version = 12; g.mode = 'battle'; g.battle = createBattle({ seed: 7, party: [toPartyMember(h)], encounter: { id: 'test', name: '確認', enemies: [{ defId: 'forestWolf' }] } });
    g.battle.version = 12; delete g.battle.openingEvents; for (const a of g.battle.allies[0].abilities!) delete a.source;
    const original = structuredClone(g), next = migrateGame(structuredClone(g))!;
    expect(next.version).toBe(16); expect(next.battle!.rngState).toBe(original.battle!.rngState); expect(next.rngState).toBe(original.rngState);
    expect(next.battle!.allies[0].abilities![0].effect).toEqual(original.battle!.allies[0].abilities![0].effect);
    expect(next.battle!.allies[0].abilities![0].source?.kind).toBe('equipment'); expect(next.battle!.openingEvents).toBeUndefined();
  });
  it('フォーカスが最大ならお供の資源回復表示も新たに出さない', () => {
    const b = createBattle({ seed: 7, party: [{ classId: 'warrior', name: '確認', gender: 'male', playerId: 'P1' }], encounter: { id: 'test', name: '確認', enemies: [{ defId: 'forestWolf' }] } });
    const a = b.allies[0]; a.focus = a.focusMax;
    const events: BattleEvent[] = [], ctx = makeCtx(b, createRng(7), events, a);
    expect(applyEffect(ctx, { kind: 'gainFocus', amount: 1 })).toBe(false); expect(events).toEqual([]);
    a.focus -= 1;
    expect(applyEffect(ctx, { kind: 'gainFocus', amount: 1 })).toBe(true);
    expect(events).toEqual([{ type: 'resource', unitId: a.id, resource: 'focus', amount: 1 }]);
  });
});

describe('探索のお供通知と旧設定', () => {
  it('移動力の加算は判定時だけで、拒否された同じ操作や描画では通知しない', () => {
    const g = fresh(), h = g.heroes[0]; g.world!.story = undefined;
    h.pet = { petId: 'rabbit', color: 'white', name: 'ぴょん', love: 0, acts: 0 };
    const cmd = { type: 'WORLD_ROLL_MOVE' as const, playerId: 'P1' as const, heroId: h.id, focusUsed: 0 };
    const r = applyGameCommand(g, cmd); expect(r.error).toBeUndefined();
    expect(explorationNotices(g, r.state, cmd).map(n => n.name)).toEqual(['移動力+1']);
    expect(explorationNotices(r.state, r.state, cmd)).toEqual([]);
  });
  it('イベントの判定は失敗でも適用済みボーナスを知らせ、判定なしの選択では出さない', () => {
    const g = fresh(), h = g.heroes[0]; h.pet = { petId: 'foxCub', color: 'inari', name: 'コン', love: 0, acts: 0 };
    g.mode = 'event'; g.party = ['h0']; g.event = { eventId: 'rStrayBird', random: true, tile: g.world!.pos.h0 };
    const cmd = { type: 'CHOOSE_EVENT' as const, playerId: 'P1' as const, heroId: h.id, optionIndex: 0, focusUsed: 0 };
    const r = applyGameCommand(g, cmd); expect(r.error).toBeUndefined(); expect(explorationNotices(g, r.state, cmd).map(n => n.name)).toEqual(['イベントの判定+10%']);
    const skip = { ...cmd, optionIndex: 3 }, skipped = applyGameCommand(g, skip);
    expect(explorationNotices(g, skipped.state, skip)).toEqual([]);
  });
  it('旧設定の高速/振動を維持し、カットインだけ標準で補う', () => {
    expect(normalizeSettings({ fastMode: true, vibration: false })).toEqual({ fastMode: true, vibration: false, cutinMode: 'standard', sfxVolume: 5, bgmVolume: 4, petVolume: 3 });
    expect(normalizeSettings(null)).toEqual({ fastMode: false, vibration: true, cutinMode: 'standard', sfxVolume: 5, bgmVolume: 4, petVolume: 3 });
    expect(normalizeSettings({ cutinMode: 'simple' }).cutinMode).toBe('simple');
    expect(normalizeSettings({ fastMode: 'invalid', vibration: 1, cutinMode: 'invalid' })).toEqual(normalizeSettings(null));
  });
  it('野営で実際に増えた回復を通知し、満タンの野営では通知しない', () => {
    const g = fresh(), h = g.heroes[0]; g.world!.story = undefined;
    g.world!.pos.h0 = g.world!.tiles.findIndex(t => t.t === 'road' && !t.f); g.world!.move = null;
    h.pet = { petId: 'redPanda', color: 'brown', name: 'ふうた', love: 0, acts: 0 }; h.hp = 1;
    const cmd = { type: 'WORLD_CAMP' as const, playerId: 'P1' as const, heroId: 'h0' };
    const r = applyGameCommand(g, cmd); expect(r.error).toBeUndefined();
    expect(explorationNotices(g, r.state, cmd).map(n => n.name)).toContain('野営の回復をお手伝い');
    const full = structuredClone(g); full.heroes[0].hp = heroMaxHp(full.heroes[0]);
    expect(explorationNotices(full, applyGameCommand(full, cmd).state, cmd)).toEqual([]);
  });
  it('宝箱の運の補助は中身を決めた操作だけ通知する', () => {
    const g = fresh(); g.mode = 'chest'; g.party = ['h0'];
    g.heroes[0].pet = { petId: 'blackCat', color: 'black', name: 'クロ', love: 0, acts: 0 };
    g.chest = { tile: g.world!.pos.h0, spec: { rarity: 'common', locked: false }, unlocked: true };
    const cmd = { type: 'OPEN_CHEST' as const, playerId: 'P1' as const, heroId: 'h0', focusUsed: 0 };
    const r = applyGameCommand(g, cmd); expect(r.error).toBeUndefined();
    expect(explorationNotices(g, r.state, cmd).map(n => n.name)).toEqual(['宝箱の運+15%']);
    expect(explorationNotices(r.state, r.state, cmd)).toEqual([]);
  });
  it('夜目は夜へ変わった時だけで、同じ夜の再描画では再通知しない', () => {
    const g = fresh(); g.heroes[0].pet = { petId: 'owl', color: 'brown', name: 'ホー', love: 0, acts: 0 };
    g.world!.worldTurn = 6; const next = structuredClone(g); next.world!.worldTurn = 7;
    const cmd = { type: 'WORLD_WAIT' as const, playerId: 'P1' as const, heroId: 'h0' };
    expect(explorationNotices(g, next, cmd).map(n => n.name)).toContain('夜でもよく見える');
    expect(explorationNotices(next, next, cmd)).toEqual([]);
  });
});
