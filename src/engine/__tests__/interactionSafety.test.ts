import { ENEMIES } from '../../data/enemies';
import { describe, expect, it } from 'vitest';
import { CARDS, getCard } from '../../data/cards';
import type { BattleState, CardDef, Command, GameCommand, GameState, PlayerId } from '../../types';
import { applyCommand, applyGameCommand, createBattle, createGame, heroPlace, migrateGame, predictCard } from '../index';
import { cardTargets } from '../battle/targets';
import { followingGroup } from '../game/world/group';
import { giveHand } from './helpers';

ENEMIES.register({ id: 'uxDummy', icon: 'T', name: '検証敵', maxHp: 10000, baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence', actions: [{ id: 'hit', name: '攻撃', effects: [{ kind: 'damage', amount: 8 }] }] });
const fixture: CardDef = { id: 'testChooseFriend', name: '検証用支援', category: 'skill', cost: 1, slots: 1, baseChance: 80, target: 'otherAlly', tiers: [{ minSuccesses: 0, effects: [{ kind: 'gainFocus', amount: 1, to: 'target' }] }] };
CARDS.register(fixture);
CARDS.register({ ...fixture, id: 'testChooseFallen', target: 'fallenAlly', tiers: [{ minSuccesses: 0, effects: [{ kind: 'revive', pct: 30 }] }] });
function battle(): BattleState {
  const s = createBattle({ seed: 8, party: ['astrologer', 'warrior', 'mage', 'priest'].map((classId, i) => ({ classId, playerId: `P${i+1}` as PlayerId, name: `仲間${i}`, gender: 'male' })), encounter: { id: 'test', name: '検証', enemies: [{ defId: 'uxDummy' }, { defId: 'uxDummy' }] } });
  for (const a of s.allies) { a.mana = 20; a.focus = 6; a.hp = 10; }
  return s;
}
function command(s: BattleState, cardId: string, targetId?: string): Extract<Command, { type: 'PLAY_CARD' }> {
  giveHand(s, s.allies[0].id, [cardId]);
  return { type: 'PLAY_CARD', playerId: 'P1', characterId: s.allies[0].id, cardInstanceId: 't0', focusUsed: getCard(cardId).slots, targetId };
}
function world(count = 4): GameState {
  const g = createGame({ seed: 12, difficulty: 'normal', scenarioId: 'corruptionKing', party: Array.from({ length: count }, (_, i) => ({ classId: 'warrior', name: `仲間${i}`, gender: 'male', playerId: `P${i+1}` as PlayerId })) });
  const w = g.world!; w.story = undefined; w.visitedRegions = Array.from({ length: 100 }, (_, i) => i); w.wanderers = []; w.move = 4;
  w.tiles.forEach(t => { t.f = undefined; t.t = 'road'; t.seen = true; });
  g.heroes.forEach(h => { w.pos[h.id] = 0; h.lastRandomEvent = w.worldTurn; });
  w.follow = Object.fromEntries(g.heroes.slice(1).map(h => [h.id, 'h0']));
  return g;
}
function run(g: GameState, cmd: GameCommand) { const r = applyGameCommand(g, cmd); expect(r.error).toBeUndefined(); return r.state; }

describe('単体支援の対象と星読み', () => {
  it.each(['mend', 'greaterHeal', 'purify', 'timeMend', 'papalPrayer', 'maidenHeal', 'wChime'])('%sは指定した仲間に効き、自動で最低HPへ飛ばない', id => {
    const s = battle(); s.allies[2].hp = 1; s.allies[1].statuses.poison = 3;
    const cmd = command(s, id, s.allies[1].id), before = structuredClone(s);
    const r = applyCommand(s, cmd); expect(r.error).toBeUndefined();
    expect(r.state.allies[2].hp).toBe(1);
    expect(r.state.allies[1].hp > before.allies[1].hp || r.state.allies[1].statuses.poison === 0).toBe(true);
    expect(r.state.allies[0].feats?.support).toBe((before.allies[0].feats?.support ?? 0) + 1);
    expect(s).toEqual(before);
  });
  it('他人の担当へ支援できるが、他人のカードを操作できない', () => {
    const s = battle(), cmd = command(s, 'mend', s.allies[2].id);
    expect(applyCommand(s, cmd).state.allies[2].hp).toBeGreaterThan(10);
    expect(applyCommand(s, { ...cmd, playerId: 'P2' }).error).toContain('担当');
  });
  it('自分以外の1人を3人の候補から選べる', () => {
    const s = battle(), cmd = command(s, fixture.id, s.allies[2].id);
    s.allies.forEach(a => { a.focus = 0; }); cmd.focusUsed = 0;
    const r = applyCommand(s, cmd); expect(r.error).toBeUndefined();
    expect(r.state.allies.map(a => a.focus)).toEqual([0, 0, 1, 0]);
    expect(applyCommand(s, { ...cmd, targetId: s.allies[0].id }).error).toBeTruthy();
  });
  it('復活は戦闘不能だけを選べる', () => {
    const s = battle(); s.allies[2].dead = true; s.allies[2].hp = 0;
    const cmd = command(s, 'testChooseFallen', s.allies[2].id);
    expect(cardTargets(s, s.allies[0], getCard('testChooseFallen')).map(a => 'id' in a ? a.id : '')).toEqual([s.allies[2].id]);
    const r = applyCommand(s, cmd); expect(r.error).toBeUndefined(); expect(r.state.allies[2].dead).toBe(false);
    expect(applyCommand(s, { ...cmd, targetId: s.allies[1].id }).error).toBeTruthy();
  });
  it.each(['mend', 'plunder', 'timeStop', 'placeTrap'])('%sの対象を星読み・振り直し・保存再開後も維持する', id => {
    const s = battle(), target = getCard(id).target === 'ally' ? s.allies[2].id : s.enemies[1].uid;
    const cmd = command(s, id, target); const reserved = applyCommand(s, { ...cmd, type: 'PREVIEW_CARD' });
    expect(reserved.error).toBeUndefined(); expect(reserved.state.slotPreview?.targetId).toBe(target);
    const saved = JSON.parse(JSON.stringify(reserved.state));
    const rerolled = applyCommand(saved, { type: 'REROLL_PREVIEW', playerId: 'P1', characterId: s.allies[0].id });
    expect(rerolled.state.slotPreview?.targetId).toBe(target);
    const result = applyCommand(rerolled.state, { type: 'CONFIRM_PREVIEW', playerId: 'P1', characterId: s.allies[0].id });
    expect(result.error).toBeUndefined(); expect(result.events.find(e => e.type === 'roll')?.targetId).toBe(target);
    expect(applyCommand(JSON.parse(JSON.stringify(reserved.state)), { type: 'REROLL_PREVIEW', playerId: 'P1', characterId: s.allies[0].id }).state).toEqual(rerolled.state);
  });
  it('対象が不正なら資源・乱数・状態を消費しない', () => {
    const s = battle(), cmd = command(s, 'mend', s.enemies[0].uid), before = structuredClone(s);
    const r = applyCommand(s, cmd); expect(r.error).toBeTruthy(); expect(r.state).toEqual(before);
  });
  it.each(['sanctify','papalLight'])('%sは攻撃先と回復先を別々に選び、星読みでも両方を維持する', id => {
    const s = battle(), cmd = command(s, id, s.enemies[1].uid); cmd.allyTargetId = s.allies[2].id;
    s.allies[1].hp = 1;
    const reserved = applyCommand(s, { ...cmd, type: 'PREVIEW_CARD' }); expect(reserved.error).toBeUndefined();
    expect(reserved.state.slotPreview?.targetId).toBe(s.enemies[1].uid); expect(reserved.state.slotPreview?.allyTargetId).toBe(s.allies[2].id);
    const rerolled = applyCommand(JSON.parse(JSON.stringify(reserved.state)), { type: 'REROLL_PREVIEW', playerId: 'P1', characterId: s.allies[0].id });
    const r = applyCommand(rerolled.state, { type: 'CONFIRM_PREVIEW', playerId: 'P1', characterId: s.allies[0].id }); expect(r.error).toBeUndefined();
    expect(r.state.enemies[1].hp).toBeLessThan(s.enemies[1].hp); expect(r.state.enemies[0].hp).toBe(s.enemies[0].hp);
    expect(r.state.allies[2].hp).toBeGreaterThan(10); expect(r.state.allies[1].hp).toBe(1);
  });
  it('複合カードの回復先が不適切なら予約・支払い・乱数消費をしない', () => {
    const s = battle(), cmd = command(s, 'sanctify', s.enemies[1].uid); cmd.allyTargetId = s.enemies[0].uid;
    expect(applyCommand(s, cmd).state).toEqual(s);
    expect(applyCommand(s, { ...cmd, type: 'PREVIEW_CARD' }).state).toEqual(s);
  });
  it('能力で複合カードを再発動しても、同じ敵と味方へ効果を使い支払いを増やさない', () => {
    const s = battle(), cmd = command(s, 'sanctify', s.enemies[1].uid); cmd.allyTargetId = s.allies[2].id;
    s.allies[0].abilities = [{ name: '検証用の再発動', effect: { when: 'perfect', do: [{ kind: 'repeatCard' }] } }];
    const r = applyCommand(s, cmd); expect(r.error).toBeUndefined();
    expect(r.state.allies[2].hp).toBe(18); expect(r.state.allies[1].hp).toBe(10);
    expect(r.state.allies[0].mana).toBe(s.allies[0].mana - getCard('sanctify').cost);
    expect(r.events.filter(e => e.type === 'heal' && e.unitId === cmd.allyTargetId)).toHaveLength(2);
  });
  it('予測は実回復量・HP上限と一致し、予約・乱数・元の状態を変更しない', () => {
    const s = battle(), cmd = command(s, 'mend', s.allies[2].id); s.allies[2].hp = s.allies[2].maxHp - 2;
    const before = structuredClone(s), p = predictCard(s, cmd.characterId, cmd.cardInstanceId, cmd.targetId, cmd.focusUsed, 2);
    expect(p.find(p => p.id === cmd.targetId)?.text).toContain('HP回復2'); expect(s).toEqual(before);
    const r = applyCommand(s, cmd); expect(r.state.allies[2].hp).toBe(r.state.allies[2].maxHp);
  });
  it.each([
    ['samurai', 'samuraiDrawCut'], ['magicKnight', 'bladeStrike'], ['darkKnight', 'bloodBlade'], ['warrior', 'strike'],
  ])('%sの倍率・属性・ブロックを含む予測を実際の攻撃と照合する', (job, id) => {
    const s = battle(); s.allies[0].classId = job;
    s.allies[0].attackCharge = { category: 'physical', multiplier: 4 };
    s.allies[0].imbuedElement = 'fire'; s.allies[0].statuses.possession = 3;
    s.enemies[1].statuses.vulnerable = 2; s.enemies[1].block = 7;
    const cmd = command(s, id, s.enemies[1].uid), before = structuredClone(s);
    const p = predictCard(s, cmd.characterId, cmd.cardInstanceId, cmd.targetId, cmd.focusUsed, getCard(id).tiers.length-1);
    expect(s).toEqual(before); const r = applyCommand(s, cmd); expect(r.error).toBeUndefined();
    const events = r.events.filter(e => e.type === 'damage' && e.unitId === cmd.targetId);
    const raw = events.reduce((n,e) => n + (e.type === 'damage' ? e.rawAmount ?? e.amount+e.blocked : 0),0);
    const hp = events.reduce((n,e) => n + (e.type === 'damage' ? e.amount : 0),0);
    expect(p.find(p => p.id === cmd.targetId)?.text).toContain(`ダメージ${raw}`);
    expect(p.find(p => p.id === cmd.targetId)?.text).toContain(`HP減少${hp}`);
  });
  it('全カードの単体指定は共通の対象検証を利用し、手動支援を自動選択へ戻さない', () => {
    const s = battle();
    for (const c of CARDS.all) {
      if (c.target === 'enemy') expect(cardTargets(s, s.allies[0], c)).toEqual(s.enemies);
      if (c.target === 'ally') {
        expect(cardTargets(s, s.allies[0], c)).toEqual(s.allies);
        expect(c.tiers.flatMap(t => t.effects).some(e => e.to === 'lowestAlly')).toBe(false);
      }
      if (c.target === 'self' && !c.id.startsWith('test')) expect(c.tiers.flatMap(t => t.effects).some(e => e.to === 'lowestAlly')).toBe(false);
      if (c.tiers.some(t => t.effects.some(e => e.to === 'allyTarget'))) expect(c.secondaryTarget).toBe('ally');
    }
  });
  it('旧保存の味方回復予約だけ従来の対象を補い、乱数を消費しない', () => {
    const g = world(), b = battle(), cmd = command(b, 'mend'); b.allies[2].hp = 1;
    g.version = 13; b.version = 13; b.slotPreview = { characterId: cmd.characterId, cardInstanceId: 't0', focusUsed: 0, chance: 80, results: ['hit','miss'], rerollResults: ['miss','hit'], rerolled: false };
    g.battle = b; const next = migrateGame(JSON.parse(JSON.stringify(g)))!;
    expect(next.battle!.slotPreview!.targetId).toBe(b.allies[2].id); expect(next.battle!.rngState).toBe(b.rngState); expect(next.rngState).toBe(g.rngState);
  });
  it('旧複合カードの予約は敵対象を維持して回復先だけ補う', () => {
    const g = world(), b = battle(), cmd = command(b, 'sanctify', b.enemies[1].uid); b.allies[1].hp = 1;
    g.version = 13; b.version = 13;
    b.slotPreview = { characterId: cmd.characterId, cardInstanceId: 't0', targetId: cmd.targetId, focusUsed: 0, chance: 80, results: ['hit','miss'], rerollResults: ['miss','hit'], rerolled: false };
    g.battle = b; const next = migrateGame(JSON.parse(JSON.stringify(g)))!;
    expect(next.battle!.slotPreview?.targetId).toBe(cmd.targetId);
    expect(next.battle!.slotPreview?.allyTargetId).toBe(b.allies[1].id);
    expect(next.battle!.slotPreview?.results).toEqual(b.slotPreview.results); expect(next.battle!.rngState).toBe(b.rngState);
  });
});

describe('同行の交代運転と共同施設', () => {
  it('2端末が同じ操作列を受け取り、移動提案の保存再開を挟んでも座標・乱数が一致する', () => {
    let a = world(), b = JSON.parse(JSON.stringify(a)) as GameState;
    const commands: GameCommand[] = [{ type: 'WORLD_MOVE', playerId: 'P1', heroId: 'h0', to: 1, companions: ['h1','h2','h3'] }, ...(['P2','P3','P4'] as PlayerId[]).map(playerId => ({ type: 'WORLD_MOVE_AGREE' as const, playerId, accept: true }))];
    for (const cmd of commands) {
      a = run(a, cmd); b = run(b, cmd); expect(b).toEqual(a);
      b = JSON.parse(JSON.stringify(b));
    }
    expect(a.world!.lastMove?.path).toEqual([0,1]);
    expect(new Set(Object.values(a.world!.pos))).toEqual(new Set([1]));
  });
  it('4人でP1→P2→P3→P4へ回り、行動済みの仲間も乗客になれる', () => {
    let g = world();
    for (let i=0; i<4; i++) {
      expect(g.world!.turn).toBe(`h${i}`); g.world!.move = 2;
      const to = i + 1;
      g = run(g, { type: 'WORLD_MOVE', playerId: `P${i+1}` as PlayerId, heroId: `h${i}`, to, companions: g.heroes.filter(h => h.id !== `h${i}`).map(h => h.id) });
      for (const p of g.heroes.filter(h => h.playerId !== `P${i+1}`)) g = run(g, { type: 'WORLD_MOVE_AGREE', playerId: p.playerId, accept: true });
      expect(new Set(Object.values(g.world!.pos))).toEqual(new Set([to]));
      expect(g.world!.lastMove!.path).toEqual([i, to]); expect(followingGroup(g, `h${i}`)).toHaveLength(4);
      g = run(g, { type: 'WORLD_WAIT', playerId: `P${i+1}` as PlayerId, heroId: `h${i}` });
    }
    expect(g.world!.worldTurn).toBe(2); expect(g.world!.turn).toBe('h0');
  });
  it('P2が同行解除しても残る3人の同行を保つ', () => {
    let g = world(); g.world!.turn = 'h1';
    g = run(g, { type: 'WORLD_UNFOLLOW', playerId: 'P2', heroId: 'h1' });
    expect(followingGroup(g, 'h1')).toEqual(['h1']); expect(followingGroup(g, 'h0').sort()).toEqual(['h0','h2','h3']);
  });
  it('同行全員が町を使い、自分の金だけで宿泊し、全員終了後に戻る', () => {
    let g = world(2); g.world!.tiles[0].f = { kind: 'town', id: 'royalCapital' };
    g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0' });
    expect(g.town!.members).toEqual(['h0','h1']); expect(heroPlace(g, g.heroes[1])).toBe('town');
    g.heroes[1].hp = 1; const gold = g.heroes[0].gold;
    g = run(g, { type: 'TOWN_INN', playerId: 'P2', heroId: 'h1' });
    expect(g.heroes[0].gold).toBe(gold); expect(g.heroes[1].hp).toBeGreaterThan(1);
    expect(applyGameCommand(g, { type: 'TOWN_INN', playerId: 'P1', heroId: 'h1' }).error).toBeTruthy();
    g = run(g, { type: 'LEAVE_TOWN', playerId: 'P1', heroId: 'h0' }); expect(g.mode).toBe('town');
    g = run(g, { type: 'LEAVE_TOWN', playerId: 'P2', heroId: 'h1' }); expect(g.mode).toBe('world');
  });
  it('単に同じ場所にいる別行動の人は施設の参加者にしない', () => {
    let g = world(2); g.world!.follow = {}; g.world!.tiles[0].f = { kind: 'town', id: 'royalCapital' };
    g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0' });
    expect(g.town!.members).toEqual(['h0']); expect(heroPlace(g, g.heroes[1])).toBe('map');
  });
  it('P2も祈りと転職場所を利用でき、祠の恩恵は一度だけ', () => {
    let g = world(2);
    // 実際の地図にある祠を使う。
    const original = createGame({ seed: 12, difficulty: 'normal', scenarioId: 'corruptionKing', party: [{ classId: 'warrior', name: '確認', gender: 'male', playerId: 'P1' }] });
    const shrine = original.world!.tiles.find(t => t.f?.kind === 'shrine')!.f!;
    g.world!.tiles[0].f = structuredClone(shrine);
    g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0' });
    expect(heroPlace(g, g.heroes[1])).toBe('shrine');
    g = run(g, { type: 'SHRINE_CHOOSE', playerId: 'P2', heroId: 'h1', optionIndex: 0 });
    expect(g.heroes[1].feats?.prayers).toBe(1); expect(g.heroes[0].feats?.prayers ?? 0).toBe(0);
    expect(applyGameCommand(g, { type: 'SHRINE_CHOOSE', playerId: 'P1', heroId: 'h0', optionIndex: 0 }).error).toBeTruthy();
  });
  it('P2の宝箱判定の記録と報酬の受取人を分ける', () => {
    let g = world(2); g.world!.turn = 'h1'; g.world!.tiles[0].f = { kind: 'chest', id: 'test' };
    g = run(g, { type: 'WORLD_INTERACT', playerId: 'P2', heroId: 'h1' });
    g = run(g, { type: 'OPEN_CHEST', playerId: 'P2', heroId: 'h1', recipientId: 'h0', focusUsed: 2 });
    expect(g.heroes[1].feats?.['checks:luk']).toBe(1); expect(g.heroes[0].feats?.['checks:luk'] ?? 0).toBe(0);
    for (const loot of g.chest!.contents ?? []) if ('to' in loot) expect(loot.to).toEqual(loot.kind === 'gold' ? ['h0'] : 'h0'); else if ('heroId' in loot) expect(loot.heroId).toBe('h0');
  });
});
