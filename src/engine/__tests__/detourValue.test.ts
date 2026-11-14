// ===== 寄り道の値打ち（2026-11-14・docs/tasks/detour-value-plan.md。オーナーの返事 1〜5 すべて A）: エンジン =====
// 災厄の加護5つ・見破り・秘宝の3択（みんなで決める）・抜け道（みんなで決める）・災厄の種類をパーティに合わせる・お金のご褒美の作り直し・
// 保存と再開（JSON をはさんで同じ）・乱数を余分に引かない・古い保存
import { describe, expect, it } from 'vitest';
import { DUNGEONS } from '../../data/dungeons';
import { getItem } from '../../data/items';
import { getRoomType } from '../../data/rules';
import { SCOURGES } from '../../data/world';
import { EVENTS } from '../../data/events';
import type { BattleState, Command, GameCommand, GameState, PlayerId } from '../../types';
import { applyGameCommand, buildDungeon, createGame, createRng, migrateGame, startBattleWith, validateGame } from '../index';
import { breakEnemy, needsWeakPerfect } from '../battle/effects';
import { loseHp } from '../battle/units';
import { hexDistance } from '../game/world/hex';
import { activeBoons, bigEnemyOf, gearUsable, grantInsight, insightTarget, nextKeyDungeon, scourgeFits, shortcutTile } from '../game/world/detour';
import { aliveScourges, scourgeCandidates, scourgeEnemies, spawnScourge } from '../game/world/scourges';
import { shortcutEntrance } from '../game/game';
import { getEnemy } from '../../data/enemies';

const eventIds = EVENTS.forScenario('corruptionKing').filter((e) => e.where !== 'map' && e.where !== 'spawn').map((e) => e.id);

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
const err = (g: GameState, cmd: GameCommand) => applyGameCommand(g, cmd).error;
function newGame(seed = 5, players: PlayerId[] = ['P1'], classes = ['warrior', 'priest', 'thief', 'mage']) {
  let g = createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: players.map((playerId, i) => ({ classId: classes[i], gender: 'male' as const, name: `h${i}`, playerId })) });
  g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  return g;
}
/** 地図に災厄を置く（種類を決めて、置ける候補の前から。パーティに合うかは見ない = 加護を確かめる用） */
function withScourges(g: GameState, ids: string[]): GameState {
  const t = structuredClone(g);
  const w = t.world!;
  for (const id of ids) {
    const tile = scourgeCandidates(t, w)[0];
    w.wanderers.push({ id: `w${w.nextWandererId++}`, tile, enemies: scourgeEnemies(t, w, SCOURGES.get(id), tile), scourge: id });
  }
  w.scourgesMet = [...ids];
  w.story = undefined;
  w.storyQueue = [];
  return t;
}
/** 鍵のダンジョンのボスの部屋の戦闘を、そのまま始める（場面の無い形。startBattleWith を直接呼ぶ） */
function bossBattle(g: GameState, dungeonId = 'emeraldTemple', roomType = 'boss'): GameState {
  const t = structuredClone(g);
  t.dungeon = buildDungeon(dungeonId, createRng(7), 0, eventIds);
  t.party = t.heroes.map((h) => h.id);
  const def = DUNGEONS.get(dungeonId);
  const ids = roomType === 'midboss' ? def.pools.midboss! : def.pools.boss;
  startBattleWith(t, ids.map((defId) => ({ defId, level: def.baseLevel + 2 })), roomType, createRng(11));
  return t;
}
const battleCmd = (g: GameState, command: Command): GameState => run(g, { type: 'BATTLE', command });
/** 敵の番まで進める（味方は何もしない） */
function passTurn(g: GameState): GameState {
  for (const p of new Set(g.battle!.allies.filter((a) => !a.dead).map((a) => a.playerId))) g = battleCmd(g, { type: 'END_TURN', playerId: p });
  for (let k = 0; k < 20 && g.battle?.phase === 'enemy'; k++) g = battleCmd(g, { type: 'ENEMY_STEP' });
  return g;
}

// ---------- 柱1 災厄の加護 ----------

describe('柱1: 災厄の加護（生きている災厄1体につき、大物の戦闘に決まりが1つ）', () => {
  it('8体とも別の種類の加護（区切り3b でシナリオ2の3体を足した）。HP・攻撃の倍率は使わない', () => {
    expect(SCOURGES.all.map((d) => d.boon.kind)).toEqual(['bodyguard', 'regen', 'huntFirst', 'breakWard', 'phaseBurn', 'frostBreath', 'bellToll', 'darkVeil']);
    for (const d of SCOURGES.all) {
      expect(d.boon.name.length, d.id).toBeGreaterThan(0);
      expect(d.boon.text.length, d.id).toBeGreaterThan(0);
    }
  });

  it('災厄がいなければ、ボス戦に加護は無い。いれば、生きている数だけ（戦闘の印 boon.ids）', () => {
    const g0 = newGame();
    expect(bossBattle(g0).battle!.boon).toBeUndefined();
    const g = withScourges(g0, ['miasmaNecro', 'stormWitch']);
    const b = bossBattle(g).battle!;
    expect(b.boon?.ids).toEqual(['miasmaNecro', 'stormWitch']);
    expect(b.boon?.uid).toBe(bigEnemyOf(b)!.uid);
    // 中ボスの部屋（最後のダンジョン）にも掛かる
    expect(bossBattle(g, 'demonCastle', 'midboss').battle!.boon?.ids).toHaveLength(2);
  });

  it('ランダムダンジョンの主・ふつうの戦闘・災厄との戦闘には掛からない', () => {
    const g = withScourges(newGame(), ['miasmaNecro']);
    expect(bossBattle(g, 'randomForest').battle!.boon).toBeUndefined();
    expect(bossBattle(g, 'emeraldTemple', 'battle').battle!.boon).toBeUndefined();
  });

  it('倒した災厄の加護は消える（保存しない。生きている災厄から毎回求める）', () => {
    const g = withScourges(newGame(), ['miasmaNecro']);
    expect(activeBoons(g.world).map((d) => d.id)).toEqual(['miasmaNecro']);
    g.world!.wanderers = g.world!.wanderers.filter((x) => !x.scourge);
    expect(activeBoons(g.world)).toEqual([]);
    expect(bossBattle(g).battle!.boon).toBeUndefined();
  });

  it('用心棒: 戦闘の始めに盗賊の手下が1体（大物と同じレベル・報酬なし）', () => {
    const g = withScourges(newGame(5, ['P1'], ['thief']), ['greedKing']);
    const b = bossBattle(g).battle!;
    const big = bigEnemyOf(b)!;
    const guard = b.enemies.find((e) => e.defId === 'banditThug')!;
    expect(guard).toBeTruthy();
    expect(guard.level).toBe(big.level);
    expect(guard.summoned).toBe(true);
    expect(guard.intent).toBeTruthy();
  });

  it('瘴気の衣: 大物が敵の番の始めに最大HPの4%を回復（癒し封じで半分）', () => {
    let g = withScourges(newGame(), ['miasmaNecro']);
    g = bossBattle(g);
    const big = bigEnemyOf(g.battle!)!;
    big.hp = Math.floor(big.maxHp / 2);
    const before = big.hp;
    const sealed = structuredClone(g);
    sealed.battle!.enemies.find((e) => e.uid === big.uid)!.statuses.healSeal = 3;
    const after = passTurn(g).battle!.enemies.find((e) => e.uid === big.uid)!;
    const gain = Math.ceil((big.maxHp * 4) / 100);
    expect(after.hp - before).toBeGreaterThanOrEqual(gain);
    const halved = passTurn(sealed).battle!.enemies.find((e) => e.uid === big.uid)!;
    expect(halved.hp - before).toBeLessThan(after.hp - before);
  });

  it('悪夢の目: 大物の最初の予告が「悪夢の目」（HPの割合がいちばん低い味方を狙う）', () => {
    let g = withScourges(newGame(5, ['P1', 'P1'] as PlayerId[]), ['nightmareBeast']);
    g.heroes[1].hp = 5;
    g = bossBattle(g);
    const big = bigEnemyOf(g.battle!)!;
    expect(big.intent?.actionId).toBe('boonNightmareEye');
    expect(big.intent?.targetId).toBe(g.heroes[1].id);
  });

  it('凍てつく守り: 大物への最初の BREAK が1回だけ効かない（次の予告からは崩せる）', () => {
    let g = withScourges(newGame(), ['stormWitch']);
    g = bossBattle(g);
    const b = g.battle!;
    expect(b.boon?.ward).toBe(true);
    const big = bigEnemyOf(b)!;
    // 閃光の破砕玉（大技の予告を崩す道具）の代わりに、エンジンの崩しをそのまま呼ぶ
    const s = structuredClone(b) as BattleState;
    const e = s.enemies.find((x) => x.uid === big.uid)!;
    const ctx = { state: s, events: [], parts: [] } as never;
    breakEnemy(ctx, e, 'perfect');
    expect(s.boon!.wardUsed).toBe(true);
    expect(e.nextActionMultiplier).toBeUndefined();
    e.broken = false;
    breakEnemy(ctx, e, 'perfect');
    expect(e.nextActionMultiplier).toBeLessThan(1);
  });

  it('炉の熱: 大物が段階の境目を越えると、味方全員に火傷2', () => {
    let g = withScourges(newGame(), ['infernoDemon']);
    g = bossBattle(g);
    const b = g.battle!;
    const big = bigEnemyOf(b)!;
    expect(getEnemy(big.defId).phases?.length).toBeGreaterThan(0);
    for (const a of b.allies) a.statuses.burn = 0;
    // 大物のHPを境目の少し上にして、カードの代わりにエンジンのダメージで越えさせる
    const pct = getEnemy(big.defId).phases![0].belowHpPct;
    big.hp = Math.floor((big.maxHp * pct) / 100) + 1;
    loseHp(b, big, 2, createRng(1), []);
    expect(big.phase).toBe(1);
    for (const a of b.allies) expect(a.statuses.burn).toBe(2);
  });

  it('加護を付けても、冒険の乱数（rngState）は余分に引かない', () => {
    const g = withScourges(newGame(5, ['P1'], ['thief']), ['greedKing', 'nightmareBeast', 'stormWitch']);
    const plain = newGame(5, ['P1'], ['thief']);
    plain.world = structuredClone(g.world);
    plain.world!.wanderers = plain.world!.wanderers.filter((x) => !x.scourge);
    const a = bossBattle(g);
    const b = bossBattle(plain);
    expect(a.rngState).toBe(b.rngState);
    // 同じ状態から始めれば同じ（JSON をはさんでも）
    expect(JSON.stringify(bossBattle(JSON.parse(JSON.stringify(g))).battle)).toBe(JSON.stringify(a.battle));
  });
});

// ---------- 柱2 見破り ----------

describe('柱2: 見破り', () => {
  it('行き先は次に挑む鍵のダンジョン（敵のレベルの低い順）から、まだ見破っていない物。全部済めば最後のダンジョン', () => {
    const g = newGame();
    expect(nextKeyDungeon(g)?.id).toBe('emeraldTemple');
    expect(grantInsight(g)).toBe(DUNGEONS.get('emeraldTemple').name);
    expect(insightTarget(g)?.id).toBe('silentCatacomb');
    g.clearedDungeons.push('emeraldTemple', 'silentCatacomb', 'lavaCavern');
    expect(insightTarget(g)?.id).toBe('demonCastle');
    grantInsight(g);
    expect(insightTarget(g)).toBeUndefined();
    expect(grantInsight(g)).toBeUndefined();
  });

  it('見破ったボスの戦闘: ボスの大技（紫の札も）は、弱点でなくても完全成功で崩せる。取り巻きは今までどおり', () => {
    const g = newGame();
    g.world!.insight = ['silentCatacomb'];
    const b = bossBattle(g, 'silentCatacomb').battle!;
    const big = bigEnemyOf(b)!;
    expect(b.insight).toBe(big.uid);
    expect(needsWeakPerfect(b, big)).toBe(false);
    const other = bossBattle(newGame(), 'silentCatacomb').battle!;
    expect(other.insight).toBeUndefined();
    expect(needsWeakPerfect(other, bigEnemyOf(other)!)).toBe(true);
  });
});

// ---------- 柱3 秘宝の3択 ----------

/** ランダムダンジョンの最奥の黄金箱の前まで（場面）。players の全員で入る */
function atGoldenBox(seed: number, players: PlayerId[] = ['P1']): GameState {
  let g = newGame(seed, players);
  const tile = g.world!.tiles.findIndex((t) => t.f?.kind === 'dungeon' && DUNGEONS.get(t.f.id).random);
  for (const h of g.heroes) g.world!.pos[h.id] = tile;
  g.world!.turn = 'h0';
  for (const h of g.heroes) if (!g.expeditions?.some((x) => x.heroes.includes(h.id))) g = run(g, { type: 'WORLD_INTERACT', playerId: h.playerId, heroId: h.id, party: [h.id] });
  const x = g.expeditions![0];
  const boss = x.dungeon!.rooms.find((r) => getRoomType(r.type).battle?.boss)!;
  x.dungeon!.currentRoomId = boss.id;
  boss.cleared = true;
  x.mode = 'chest';
  x.chest = { roomId: boss.id, spec: { rarity: 'legend', locked: false, big: true }, unlocked: true, ...(players.length > 1 ? { opener: 'h0' } : {}) };
  return g;
}
const scene = (g: GameState, command: GameCommand) => run(g, { type: 'SCENE', scene: g.expeditions![0].id, command });
const vote = (g: GameState, playerId: PlayerId, command: GameCommand) => run(g, { type: 'SCENE', scene: g.expeditions![0].id, command: { type: 'VOTE', playerId, command } });

describe('柱3: 黄金箱の秘宝は3つから1つ選ぶ', () => {
  it('開けると候補が3つ（重ならない・パーティの武器に合う）。選ぶまで立ち去れない。選んだ物が中身の2つ目に入り、持ち物へ', () => {
    let g = atGoldenBox(21);
    g = scene(g, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 });
    const c = g.expeditions![0].chest!;
    expect(c.relics).toHaveLength(3);
    expect(new Set(c.relics!.map((r) => r.itemId)).size).toBe(3);
    for (const r of c.relics!) expect(getItem(r.itemId).source).toBe('randomDungeon');
    expect(c.contents!.some((l) => l.kind === 'item' && getItem(l.item.itemId).source)).toBe(false);
    expect(applyGameCommand(g, { type: 'SCENE', scene: g.expeditions![0].id, command: { type: 'LEAVE_CHEST', playerId: 'P1' } }).error).toBe('先に秘宝を1つ選んでください');
    const pick = c.relics![2];
    g = scene(g, { type: 'PICK_RELIC', playerId: 'P1', optionIndex: 2 });
    const c2 = g.expeditions![0].chest!;
    expect(c2.relicPicked).toBe(2);
    expect(c2.contents![1]).toMatchObject({ kind: 'item', item: pick });
    expect(g.heroes[0].stash.some((i) => i.uid === pick.uid)).toBe(true);
    expect(applyGameCommand(g, { type: 'SCENE', scene: g.expeditions![0].id, command: { type: 'PICK_RELIC', playerId: 'P1', optionIndex: 0 } }).error).toBe('もう秘宝を選びました');
    g = scene(g, { type: 'LEAVE_CHEST', playerId: 'P1' });
    expect(g.expeditions?.[0]?.mode ?? g.mode).not.toBe('chest');
  });

  it('JSON をはさんでも同じ。選ぶ時は乱数を使わない', () => {
    let g = atGoldenBox(22);
    g = scene(g, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 });
    const j = JSON.parse(JSON.stringify(g)) as GameState;
    const a = scene(g, { type: 'PICK_RELIC', playerId: 'P1', optionIndex: 1 });
    const b = scene(j, { type: 'PICK_RELIC', playerId: 'P1', optionIndex: 1 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.rngState).toBe(g.rngState);
  });

  it('2人: みんなで決める（全員が選ぶと決まる・多数決・同じ数なら開けた人）。選んだ秘宝は取り合いに入る。だれも止まらない', () => {
    let g = atGoldenBox(23, ['P1', 'P2']);
    g = vote(g, 'P1', { type: 'CHEST_OPENER', playerId: 'P1', heroId: 'h0' });
    g = vote(g, 'P2', { type: 'CHEST_OPENER', playerId: 'P2', heroId: 'h0' });
    g = scene(g, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 });
    const c = g.expeditions![0].chest!;
    expect(c.relics).toHaveLength(3);
    // 1人では決まらない（みんなで決める）
    expect(err(g, { type: 'SCENE', scene: g.expeditions![0].id, command: { type: 'PICK_RELIC', playerId: 'P1', optionIndex: 0 } })).toBeTruthy();
    g = vote(g, 'P2', { type: 'PICK_RELIC', playerId: 'P2', optionIndex: 1 });
    expect(g.expeditions![0].chest!.relicPicked).toBeUndefined();
    g = vote(g, 'P1', { type: 'PICK_RELIC', playerId: 'P1', optionIndex: 0 });
    // 1対1 → 開けた人（h0 = P1）の選んだ物
    const c2 = g.expeditions![0].chest!;
    expect(c2.relicPicked).toBe(0);
    const claim = c2.claims!.find((cl) => cl.item.uid === c.relics![0].uid)!;
    expect(claim.heroes).toEqual(['h0', 'h1']);
    // 取り合いを済ませると立ち去れる
    for (let i = 0; i < c2.claims!.length; i++) for (const h of ['h0', 'h1']) g = scene(g, { type: 'CLAIM_LOOT', playerId: h === 'h0' ? 'P1' : 'P2', heroId: h, choice: 'greed', index: i });
    g = vote(g, 'P1', { type: 'LEAVE_CHEST', playerId: 'P1' });
    g = vote(g, 'P2', { type: 'LEAVE_CHEST', playerId: 'P2' });
    expect(g.expeditions?.[0]?.mode).toBe('cleared');
  });

  it('古い保存（候補の無い黄金箱。今までどおり中身に専用の装備が入っている）は、そのまま立ち去れる', () => {
    let g = atGoldenBox(24);
    g = scene(g, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 });
    const old = structuredClone(g);
    const c = old.expeditions![0].chest!;
    c.contents!.splice(1, 0, { kind: 'item', item: c.relics![0] });
    delete c.relics;
    const m = migrateGame(JSON.parse(JSON.stringify(old)))!;
    expect(validateGame(m)).toBe(true);
    const after = scene(m, { type: 'LEAVE_CHEST', playerId: 'P1' });
    expect(after.expeditions?.[0]?.mode ?? after.mode).not.toBe('chest');
  });
});

// ---------- 柱4 抜け道 ----------

describe('柱4: 抜け道', () => {
  /** ランダムダンジョンを制覇した直後（cleared）まで */
  function cleared(seed: number, players: PlayerId[] = ['P1']): GameState {
    let g = atGoldenBox(seed, players);
    if (players.length > 1) {
      g = vote(g, 'P1', { type: 'CHEST_OPENER', playerId: 'P1', heroId: 'h0' });
      g = vote(g, 'P2', { type: 'CHEST_OPENER', playerId: 'P2', heroId: 'h0' });
    }
    g = scene(g, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 });
    if (players.length > 1) {
      for (const p of players) g = vote(g, p, { type: 'PICK_RELIC', playerId: p, optionIndex: 0 });
      const c = g.expeditions![0].chest!;
      for (let i = 0; i < c.claims!.length; i++) for (const h of ['h0', 'h1']) g = scene(g, { type: 'CLAIM_LOOT', playerId: h === 'h0' ? 'P1' : 'P2', heroId: h, choice: 'greed', index: i });
      for (const p of players) g = vote(g, p, { type: 'LEAVE_CHEST', playerId: p });
    } else {
      g = scene(g, { type: 'PICK_RELIC', playerId: 'P1', optionIndex: 0 });
      g = scene(g, { type: 'LEAVE_CHEST', playerId: 'P1' });
    }
    expect(g.expeditions![0].mode).toBe('cleared');
    return g;
  }

  it('出口は入口から歩いて8歩以内の空きマスで、次に挑む鍵のダンジョンに一番近い所（乱数を使わない）。入口より近い', () => {
    const g = cleared(31);
    const x = g.expeditions![0];
    const w = g.world!;
    const entrance = x.entranceTile!;
    const view = { ...g, dungeon: x.dungeon } as GameState;
    const tile = shortcutTile(view, entrance)!;
    expect(tile).toBeDefined();
    expect(w.tiles[tile].f).toBeUndefined();
    const goal = w.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === nextKeyDungeon(g)!.id);
    expect(hexDistance(w, tile, goal)).toBeLessThan(hexDistance(w, entrance, goal));
  });

  it('抜け道を通ると、場面のキャラが出口のマスに出る。入口へ戻る選び方も残る。島の外の仲間は動かない', () => {
    const g = cleared(32);
    const x = g.expeditions![0];
    const view = { ...g, dungeon: x.dungeon, activeScene: x.id } as GameState;
    const tile = shortcutTile(g, shortcutEntrance(view))!;
    const a = scene(g, { type: 'RETURN_TO_HUB', playerId: 'P1', kind: 'shortcut' });
    expect(a.world!.pos.h0).toBe(tile);
    const b = scene(g, { type: 'RETURN_TO_HUB', playerId: 'P1' });
    expect(b.world!.pos.h0).toBe(x.entranceTile);
  });

  it('2人: 抜け道もみんなで決める（場面にいる人だけ）。全員が選ぶと動く', () => {
    let g = cleared(33, ['P1', 'P2']);
    expect(err(g, { type: 'SCENE', scene: g.expeditions![0].id, command: { type: 'RETURN_TO_HUB', playerId: 'P1', kind: 'shortcut' } })).toBeTruthy();
    g = vote(g, 'P1', { type: 'RETURN_TO_HUB', playerId: 'P1', kind: 'shortcut' });
    expect(g.expeditions?.length).toBe(1);
    g = vote(g, 'P2', { type: 'RETURN_TO_HUB', playerId: 'P2', kind: 'shortcut' });
    expect(g.world!.pos.h0).toBe(g.world!.pos.h1);
    expect(g.world!.tiles[g.world!.pos.h0].f).toBeUndefined();
  });

  it('制覇すると見破りがつく（次に挑む鍵のダンジョン）', () => {
    const g = cleared(34);
    expect(g.world!.insight).toEqual(['emeraldTemple']);
    // 制覇の画面の知らせ用: この制覇で新しく見破った物（点検21）
    expect((g.dungeon ?? g.expeditions?.[0]?.dungeon)?.insightGained).toBe('emeraldTemple');
  });
});

// ---------- 柱3 の2・3 ----------

describe('柱3: 災厄の種類をパーティに合わせる・お金のご褒美', () => {
  it('黄金冠（お金を得た時に働く）は、お金を得るカードを持つジョブにたどり着けるキャラがいる時だけ。冥獄鎌は鎌を持てるジョブにたどり着ける時だけ', () => {
    const solo = (c: string) => newGame(5, ['P1'], [c]).heroes;
    expect(gearUsable(solo('thief'), getItem('greedCrown'))).toBe(true);
    expect(gearUsable(solo('priest'), getItem('greedCrown'))).toBe(false);
    expect(scourgeFits(solo('priest'), SCOURGES.get('greedKing'))).toBe(false);
    // ほかの3つ（毛皮・ドレス・炉心）はだれでも
    for (const id of ['nightmareBeast', 'stormWitch', 'infernoDemon']) expect(scourgeFits(solo('priest'), SCOURGES.get(id)), id).toBe(true);
  });

  it('使えない種類は出ない（何度出しても）', () => {
    const g = newGame(5, ['P1'], ['priest']);
    for (let s = 1; s <= 30; s++) {
      const t = structuredClone(g);
      for (let k = 0; k < 5; k++) spawnScourge(t, t.world!, createRng(s * 10 + k));
      expect(aliveScourges(t.world).some(({ def }) => def.id === 'greedKing')).toBe(false);
    }
  });
});
