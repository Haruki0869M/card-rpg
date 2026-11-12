// ===== 段階7b: 災厄の中ボス（overhaul-plan-v2 §3） =====
// 4種類のデータ・出る時期と場所・悪さ4つ・倒すと消える／専用の装備を必ず落とす・逃げても残る・塔で見える・秘薬・専用の装備の力・古い保存・同じ種で同じ結果
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { CARDS, getCard } from '../../data/cards';
import { ENEMIES, getEnemy, getEnemyAction } from '../../data/enemies';
import { breakStopsAction } from '../battle/intents';
import { getItem, ITEMS } from '../../data/items';
import { getScenario } from '../../data/scenarios';
import { SCOURGES } from '../../data/world';
import type { BattleState, CardDef, Command, GameCommand, GameState, PlayerId } from '../../types';
import { applyCommand, applyGameCommand, createBattle, createGame, createRng, migrateGame, toPartyMember, validateGame } from '../index';
import { shopPriceFor } from '../game/common';
import { rollConsumable, rollEquipment, rollExclusive } from '../game/loot';
import { colOf, hexDistance } from '../game/world/hex';
import { laneOfTile } from '../game/world/lanes';
import { aliveScourges, scourgeCandidates, scourgeCurse, scourgesDue, spawnScourge, tickScourges } from '../game/world/scourges';
import { wandererLevel } from '../game/world/wanderers';
import { climbWatchtower } from '../game/world/explore';
import { RARITIES } from '../game/dungeon';

const IDS = ['greedKing', 'miasmaNecro', 'nightmareBeast', 'stormWitch', 'infernoDemon'];
const GEAR = ['greedCrown', 'soulReaperScythe', 'nightmarePelt', 'permafrostGown', 'infernoCore'];

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
function newGame(scenarioId = 'corruptionKing', seed = 5, players: PlayerId[] = ['P1'], classes = ['warrior', 'mage', 'priest', 'thief']) {
  let g = createGame({ seed, scenarioId, difficulty: 'normal', party: players.map((playerId, i) => ({ classId: classes[i], gender: 'male' as const, name: `h${i}`, playerId })) });
  g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  return g;
}
/** ワールドターンを1つ終える（全員が待機。物語の窓が出ていたら閉じる） */
function endTurn(g: GameState): GameState {
  const start = g.world!.worldTurn;
  for (let k = 0; k < 10 && g.world!.worldTurn === start && g.mode === 'world'; k++) {
    if (g.world!.story) g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    const h = g.heroes.find((x) => x.id === g.world!.turn)!;
    g = run(g, { type: 'WORLD_WAIT', playerId: h.playerId, heroId: h.id });
  }
  return g;
}
/** 災厄を1体出す（種類を決めて置く） */
function withScourge(g: GameState, id: string): GameState {
  const t = structuredClone(g);
  const w = t.world!;
  w.scourgesMet = IDS.filter((x) => x !== id);
  const wd = spawnScourge(t, w, createRng(3));
  expect(wd?.scourge).toBe(id);
  w.scourgesMet = [id];
  w.story = undefined;
  return t;
}

// ---------- データ ----------

describe('段階7b: 災厄の中ボスのデータ', () => {
  it('5種類（計画 §3-2 の4種類＋段階7c の業火の魔人）。悪さはそれぞれ別の種類・本体の敵と専用の装備がある', () => {
    expect(SCOURGES.all.map((d) => d.id)).toEqual(IDS);
    expect(SCOURGES.all.map((d) => Object.keys(d.curse)[0])).toEqual(['shopPrice', 'corruptionPerTurn', 'campHeal', 'nightLevel', 'battleBurn']);
    expect(SCOURGES.get('infernoDemon').curse.battleBurn).toBe(1);
    expect(SCOURGES.get('infernoDemon').reward).toEqual({ elixir: 1 });
    expect(SCOURGES.get('greedKing').curse.shopPrice).toBe(25);
    expect(SCOURGES.get('miasmaNecro').curse.corruptionPerTurn).toBe(0.5);
    expect(SCOURGES.get('nightmareBeast').curse.campHeal).toBe(0.5);
    expect(SCOURGES.get('stormWitch').curse.nightLevel).toBe(1);
    expect(SCOURGES.get('greedKing').reward.gold).toBe(300);
    expect(SCOURGES.get('miasmaNecro').reward.corruption).toBe(5);
    expect(SCOURGES.get('nightmareBeast').reward.elixir).toBe(1);
    expect(SCOURGES.get('stormWitch').reward.elixir).toBe(1);
    expect(SCOURGES.all.map((d) => d.gear)).toEqual(GEAR);
    for (const d of SCOURGES.all) {
      expect(ENEMIES.has(d.boss), d.id).toBe(true);
      for (const m of d.minions) expect(ENEMIES.has(m), `${d.id} ${m}`).toBe(true);
      expect(d.minions.length).toBeGreaterThanOrEqual(BALANCE.scourge.minions4p);
      expect(getItem(d.gear).source).toBe('scourge');
    }
  });

  it('本体の戦い方は5体とも別々。特殊な行動（大技の予告）は2種類まで・全部に予告の文がある・味方の番を止める行動は無い', () => {
    const shapes = new Set<string>();
    for (const d of SCOURGES.all) {
      const e = getEnemy(d.boss);
      const big = e.actions.filter((a) => a.big);
      expect(big.length, d.id).toBeGreaterThanOrEqual(1);
      expect(big.length, d.id).toBeLessThanOrEqual(2);
      for (const a of big) expect(a.hint, `${d.id} ${a.id}`).toBeTruthy();
      for (const a of e.actions) for (const x of a.effects) if (x.kind === 'applyStatus') expect(['freeze', 'stun', 'sleep']).not.toContain(x.status);
      // 絵は今ある敵の絵（使い回し）
      expect(e.variantOf && ENEMIES.has(e.variantOf), d.id).toBe(true);
      shapes.add(big.map((a) => a.effects.map((x) => x.kind).join('+')).sort().join('|'));
    }
    expect(shapes.size).toBe(5);
  });

  it('専用の装備と秘薬は、宝箱・ドロップ・町の店・行商人・黄金箱・闇商人には出ない', () => {
    const g = newGame('corruptionKing', 5, ['P1', 'P2', 'P3', 'P4'], ['hexer', 'mage', 'priest', 'thief']);
    const rng = createRng(1);
    for (let k = 0; k < 400; k++) {
      expect(rollEquipment(RARITIES[k % 4], g.heroes, rng).source).toBeUndefined();
      expect(rollConsumable('legend', rng).source).toBeUndefined();
      expect(rollExclusive(g, g.heroes, rng)?.source).toBe('randomDungeon');
    }
    const scourgeItems = ITEMS.all.filter((i) => i.source === 'scourge').map((i) => i.id);
    expect(scourgeItems.sort()).toEqual([...GEAR, 'scourgeElixir'].sort());
  });
});

// ---------- 出る時期・場所 ----------

describe('段階7b: 出る時期と場所（シナリオ1の広い地図だけ）', () => {
  it('新しい冒険: 広い地図は0体から。前の広さの地図のシナリオには出ない', () => {
    expect(newGame().world!.scourgeCount).toBe(0);
    const other = newGame('frozenKingdom');
    expect(other.world!.scourgeCount).toBeUndefined();
    let g = other;
    g.world!.keys = ['x'];
    g.world!.corruption = 60;
    g = endTurn(g);
    expect(aliveScourges(g.world)).toHaveLength(0);
    expect(g.world!.scourgeCount).toBeUndefined();
  });

  it('節目: 1つ目の鍵（か侵食度15%超え）→ 35% → 55%。1ターンに1体ずつ・最大3体・同じ種類は出ない', () => {
    let g = newGame();
    g = endTurn(g);
    expect(aliveScourges(g.world)).toHaveLength(0);
    g.world!.keys = ['k1'];
    expect(scourgesDue(g.world!)).toBe(1);
    g = endTurn(g);
    expect(aliveScourges(g.world)).toHaveLength(1);
    expect(g.world!.story?.title).toMatch(/^💀 .+が、.+に現れた！$/);
    g.world!.corruption = 56;
    g = endTurn(g);
    expect(aliveScourges(g.world)).toHaveLength(2);
    g = endTurn(g);
    expect(aliveScourges(g.world)).toHaveLength(3);
    g.world!.corruption = 80;
    g = endTurn(g);
    g = endTurn(g);
    expect(aliveScourges(g.world)).toHaveLength(3);
    expect(g.world!.scourgeCount).toBe(3);
    const kinds = aliveScourges(g.world).map((x) => x.def.id);
    expect(new Set(kinds).size).toBe(3);
  });

  it('侵食度15%を越えたら、鍵が無くても1体目', () => {
    let g = newGame();
    g.world!.corruption = 15.5;
    g = endTurn(g);
    expect(aliveScourges(g.world)).toHaveLength(1);
  });

  it('場所: 西か東の帯・街道から3マス以上・一番近いキャラから5〜9マス。動かない', () => {
    for (let seed = 1; seed <= 12; seed++) {
      let g = newGame('corruptionKing', seed);
      g.world!.keys = ['k1'];
      g = endTurn(g);
      const [s] = aliveScourges(g.world);
      expect(s, `seed ${seed}`).toBeTruthy();
      const w = g.world!;
      expect(['west', 'east']).toContain(laneOfTile(g, w, s.wd.tile));
      const road = getScenario('corruptionKing').map!.roadTerrain;
      const roads = w.tiles.flatMap((t, i) => (t.t === road || t.f?.kind === 'town' ? [i] : []));
      expect(Math.min(...roads.map((r) => hexDistance(w, r, s.wd.tile)))).toBeGreaterThanOrEqual(3);
      expect(w.tiles[s.wd.tile].f).toBeUndefined();
      const tile = s.wd.tile;
      for (let k = 0; k < 6; k++) g = endTurn(g);
      expect(aliveScourges(g.world).find((x) => x.def.id === s.def.id)?.wd.tile).toBe(tile);
    }
  });

  it('置けるマスが無ければ出ず、次のターンにもう一度試す', () => {
    let g = newGame();
    g.world!.keys = ['k1'];
    // 全部の陸を何かで埋めたことにする（キャラを遠くの海の上に置く代わりに、候補の関数を見る）
    const t = structuredClone(g);
    for (const h of t.heroes) t.world!.pos[h.id] = 0;
    t.world!.wanderers = [];
    const c = scourgeCandidates(t, t.world!);
    const blocked = structuredClone(t);
    blocked.world!.wanderers = c.map((tile, i) => ({ id: `x${i}`, tile, enemies: [{ defId: 'goblinScout' }] }));
    expect(scourgeCandidates(blocked, blocked.world!)).toHaveLength(0);
    tickScourges(blocked, blocked.world!, createRng(1));
    expect(blocked.world!.scourgeCount).toBe(0);
    blocked.world!.wanderers = [];
    tickScourges(blocked, blocked.world!, createRng(1));
    expect(blocked.world!.scourgeCount).toBe(1);
    g = endTurn(g);
    expect(g.world!.scourgeCount).toBe(1);
  });

  it('同じ種・同じ操作なら、同じ種類が同じマスに出る（保存して再開しても同じ）', () => {
    const play = (g: GameState) => {
      g.world!.keys = ['k1'];
      g = endTurn(g);
      g.world!.corruption = 40;
      return endTurn(g);
    };
    const a = play(newGame('corruptionKing', 77));
    const b = play(newGame('corruptionKing', 77));
    expect(aliveScourges(a.world).map((x) => [x.def.id, x.wd.tile])).toEqual(aliveScourges(b.world).map((x) => [x.def.id, x.wd.tile]));
    // 保存（JSON）して読み直してから進めても同じ
    let c = newGame('corruptionKing', 77);
    c.world!.keys = ['k1'];
    c = endTurn(c);
    c = migrateGame(JSON.parse(JSON.stringify(c)))!;
    c.world!.corruption = 40;
    c = endTurn(c);
    expect(aliveScourges(c.world).map((x) => [x.def.id, x.wd.tile])).toEqual(aliveScourges(a.world).map((x) => [x.def.id, x.wd.tile]));
  });
});

// ---------- 悪さ ----------

describe('段階7b: 生きている間の悪さ（5つ）', () => {
  it('強欲の盗賊王: 町の店の値段 +25%（売る値段・値引きの順は今までどおり）。倒すと元に戻る', () => {
    const g = withScourge(newGame(), 'greedKing');
    const h = g.heroes[0];
    expect(shopPriceFor(h, 100, g)).toBe(125);
    expect(shopPriceFor(h, 70, g)).toBe(88);
    expect(shopPriceFor(h, 100)).toBe(100);
    expect(scourgeCurse(g).shopPrice).toBe(25);
    g.world!.wanderers = g.world!.wanderers.filter((x) => !x.scourge);
    expect(shopPriceFor(h, 100, g)).toBe(100);
  });

  it('瘴気を紡ぐ死霊術師: 世界マップの番だけ、侵食度 +0.5%（ダンジョンの中の番には掛からない）', () => {
    const base = endTurn(newGame());
    const g = endTurn(withScourge(newGame(), 'miasmaNecro'));
    expect(g.world!.corruption - base.world!.corruption).toBeCloseTo(0.5);
  });

  it('悪夢の魔獣: 野営のHPの回復が半分（フォーカスは変わらない）', () => {
    const camp = (g: GameState) => {
      const h = g.heroes[0];
      h.hp = 1;
      h.focus = 0;
      const t = g.world!.tiles.findIndex((x, i) => !x.f && i !== g.world!.pos[h.id] && hexDistance(g.world!, i, g.world!.pos[h.id]) === 1);
      g.world!.pos[h.id] = t;
      g.world!.worldTurn = 1;
      const n = run(g, { type: 'WORLD_CAMP', playerId: 'P1', heroId: h.id });
      return { hp: n.heroes[0].hp - 1, focus: n.heroes[0].focus };
    };
    const a = camp(newGame());
    const b = camp(withScourge(newGame(), 'nightmareBeast'));
    expect(b.hp).toBe(Math.ceil(a.hp / 2));
    expect(b.focus).toBe(a.focus);
  });

  it('氷嵐の魔女: 夜の敵のレベル +1（昼は変わらない）', () => {
    const g = newGame();
    const w = g.world!;
    const night = BALANCE.turnsPerTimeOfDay * 3 + 1;
    w.worldTurn = night;
    const plain = wandererLevel(g, w, 0);
    w.worldTurn = 1;
    const day = wandererLevel(g, w, 0);
    const s = withScourge(g, 'stormWitch');
    s.world!.worldTurn = night;
    expect(wandererLevel(s, s.world!, 0)).toBe(plain + 1);
    s.world!.worldTurn = 1;
    expect(wandererLevel(s, s.world!, 0)).toBe(day);
  });

  it('業火の魔人（段階7c）: 戦闘の開始時、味方全員に火傷1（1ターン目の間は見えていて、味方の番の終わりに燃える）。倒すと元に戻る', () => {
    const start = (g: GameState, players = ['h0']) => {
      g = fightScourge(g, players);
      return run(g, { type: 'ENCOUNTER_CHOOSE', playerId: 'P1', choice: 'fight', heroId: 'h0', focusUsed: 0, participants: players });
    };
    // 業火の魔人の戦闘（災厄そのものとの戦闘でも付く）
    let g = start(withScourge(newGame('corruptionKing', 5, ['P1', 'P1']), 'infernoDemon'), ['h0', 'h1']);
    expect(g.mode).toBe('battle');
    expect(g.battle!.allies.map((a) => a.statuses.burn)).toEqual([1, 1]);
    expect(g.battle!.log.some((l) => l.text.includes('魔人のせいで、全員に火傷1'))).toBe(true);
    expect(scourgeCurse(g).battleBurn).toBe(1);
    // ほかの災厄では付かない
    const other = start(withScourge(newGame(), 'greedKing'));
    expect(other.battle!.allies[0].statuses.burn ?? 0).toBe(0);
    // 倒すと消える
    g = win(g);
    expect(scourgeCurse(g).battleBurn).toBe(0);
  });
});

// ---------- 戦い・報酬 ----------

/** 災厄のマスへ歩いて入り、戦闘を始める */
function fightScourge(g: GameState, heroes: string[] = ['h0']): GameState {
  const w = g.world!;
  const s = aliveScourges(w)[0];
  const next = w.tiles.findIndex((t, i) => !t.f && hexDistance(w, i, s.wd.tile) === 1 && !w.wanderers.some((x) => x.tile === i));
  for (const id of heroes) w.pos[id] = next;
  w.turn = heroes[0];
  w.move = 3;
  w.moveDice = undefined;
  w.prevTile = next;
  w.tiles[s.wd.tile].seen = true;
  const owner = g.heroes.find((h) => h.id === heroes[0])!.playerId;
  g = run(g, { type: 'WORLD_MOVE', playerId: owner, heroId: heroes[0], to: s.wd.tile, companions: heroes.slice(1).filter((id) => g.heroes.find((h) => h.id === id)!.playerId === owner) });
  expect(g.mode).toBe('encounter');
  return g;
}
function win(g: GameState): GameState {
  const b = g.battle!;
  for (const e of b.enemies) (e.dead = true), (e.hp = 0);
  b.phase = 'victory';
  return run(g, { type: 'FINISH_BATTLE', playerId: 'P1' });
}

describe('段階7b: 戦い・倒した報酬・逃げても残る', () => {
  it('中ボスと同じ扱いの戦闘（本体＋取り巻き2体。4人の冒険は3体）。レベルは地域の敵+2', () => {
    let g = withScourge(newGame(), 'greedKing');
    const wd = aliveScourges(g.world)[0].wd;
    expect(wd.enemies).toHaveLength(3);
    const reg = getScenario('corruptionKing').map!.regions[g.world!.tiles[wd.tile].r];
    expect(wd.enemies[0].level).toBe(reg.enemyLevel + 2);
    g = fightScourge(g);
    g = run(g, { type: 'ENCOUNTER_CHOOSE', playerId: 'P1', choice: 'fight', heroId: 'h0', focusUsed: 0, participants: ['h0'] });
    expect(g.mode).toBe('battle');
    expect(g.battle!.midboss).toBe(true);
    expect(g.battle!.enemies[0].defId).toBe('scourgeGreedKing');
    const four = withScourge(newGame('corruptionKing', 5, ['P1', 'P2', 'P3', 'P4']), 'greedKing');
    expect(aliveScourges(four.world)[0].wd.enemies).toHaveLength(4);
  });

  it('盗賊王を倒す: 悪さが消え、300G・侵食度 −3%・専用の装備（必ず）・物語の窓', () => {
    let g = withScourge(newGame(), 'greedKing');
    g.world!.corruption = 30;
    const gold = g.heroes[0].gold;
    g = fightScourge(g);
    g = run(g, { type: 'ENCOUNTER_CHOOSE', playerId: 'P1', choice: 'fight', heroId: 'h0', focusUsed: 0, participants: ['h0'] });
    const before = g.world!.corruption;
    g = win(g);
    expect(aliveScourges(g.world)).toHaveLength(0);
    expect(scourgeCurse(g).shopPrice).toBe(0);
    expect(g.world!.corruption).toBeCloseTo(before - 3);
    expect(g.heroes[0].gold - gold).toBeGreaterThanOrEqual(300);
    expect(g.reward!.loot.some((l) => l.kind === 'item' && l.item.itemId === 'greedCrown')).toBe(true);
    expect(g.heroes[0].stash.some((i) => i.itemId === 'greedCrown')).toBe(true);
    const story = g.world!.story!;
    expect([story.title, ...story.lines]).toContain('💀 盗賊王を倒した！');
  });

  it('死霊術師は侵食度 −8%（浄化3＋報酬5）・冥獄鎌。魔獣・魔女・魔人は秘薬も1つ', () => {
    const beat = (id: string) => {
      let g = withScourge(newGame(), id);
      g.world!.corruption = 40;
      g = fightScourge(g);
      g = run(g, { type: 'ENCOUNTER_CHOOSE', playerId: 'P1', choice: 'fight', heroId: 'h0', focusUsed: 0, participants: ['h0'] });
      const before = g.world!.corruption;
      g = win(g);
      return { g, drop: before - g.world!.corruption };
    };
    const n = beat('miasmaNecro');
    expect(n.drop).toBeCloseTo(8);
    expect(n.g.reward!.loot.map((l) => (l.kind === 'item' ? l.item.itemId : ''))).toContain('soulReaperScythe');
    for (const id of ['nightmareBeast', 'stormWitch', 'infernoDemon']) {
      const r = beat(id);
      expect(r.drop).toBeCloseTo(3);
      const got = r.g.reward!.loot.map((l) => (l.kind === 'item' ? l.item.itemId : ''));
      expect(got).toContain(SCOURGES.get(id).gear);
      expect(got).toContain('scourgeElixir');
    }
  });

  it('2人のプレイヤーで倒すと、専用の装備は取り合い（欲しい／余れば／いらない）。だれも止まらない', () => {
    let g = withScourge(newGame('corruptionKing', 5, ['P1', 'P2']), 'stormWitch');
    g = fightScourge(g, ['h0']);
    // 隣のマスの P2 のキャラが「加わる」と答える
    g.world!.pos.h1 = g.world!.pos.h0;
    g.encounter!.candidates = ['h0', 'h1'];
    g = run(g, { type: 'ENCOUNTER_JOIN', playerId: 'P2', heroId: 'h1', join: true });
    g = run(g, { type: 'ENCOUNTER_CHOOSE', playerId: 'P1', choice: 'fight', heroId: 'h0', focusUsed: 0, participants: ['h0', 'h1'] });
    g = win(g);
    const c = g.reward!.claim!;
    expect(c.item.itemId).toBe('permafrostGown');
    expect(c.heroes).toEqual(['h0', 'h1']);
    g = run(g, { type: 'CLAIM_LOOT', playerId: 'P1', heroId: 'h0', choice: 'need' });
    g = run(g, { type: 'CLAIM_LOOT', playerId: 'P2', heroId: 'h1', choice: 'pass' });
    expect(g.heroes[0].stash.some((i) => i.itemId === 'permafrostGown')).toBe(true);
  });

  it('逃げると、災厄は巣に残る（悪さも続く）', () => {
    let g = withScourge(newGame(), 'greedKing');
    g = fightScourge(g);
    // 逃走の判定を何度か試して、成功した物を使う
    let ok: GameState | undefined;
    for (let k = 0; k < 30 && !ok; k++) {
      const t = structuredClone(g);
      t.rngState = 500 + k;
      const r = run(t, { type: 'ENCOUNTER_CHOOSE', playerId: 'P1', choice: 'flee', heroId: 'h0', focusUsed: 0, participants: ['h0'] });
      if (r.encounter?.result?.success) ok = run(r, { type: 'ENCOUNTER_CONTINUE', playerId: 'P1', participants: ['h0'] });
    }
    expect(ok!.mode).toBe('world');
    expect(aliveScourges(ok!.world)).toHaveLength(1);
    expect(scourgeCurse(ok!).shopPrice).toBe(25);
  });
});

// ---------- 見晴らしの塔 ----------

describe('段階7b: 見晴らしの塔で見える', () => {
  it('登ると、地図全体の災厄とランダムダンジョンの場所が見える', () => {
    const g = withScourge(newGame(), 'greedKing');
    const w = g.world!;
    const s = aliveScourges(w)[0].wd;
    w.tiles[s.tile].seen = false;
    const rds = w.tiles.flatMap((t, i) => (t.f?.kind === 'dungeon' && t.f.theme ? [i] : []));
    for (const i of rds) w.tiles[i].seen = false;
    const tower = w.tiles.findIndex((t) => t.f?.kind === 'tower');
    climbWatchtower(g, w, tower);
    expect(w.tiles[s.tile].seen).toBe(true);
    for (const i of rds) expect(w.tiles[i].seen).toBe(true);
  });

  it('登った後に出た災厄も、その塔から12マス以内なら自動で見える（遠ければ霧の中）', () => {
    const g = newGame();
    const w = g.world!;
    for (const t of w.tiles) t.seen = false;
    const towers = w.tiles.flatMap((t, i) => (t.f?.kind === 'tower' ? [i] : []));
    for (const i of towers) w.tiles[i].f!.used = true;
    w.scourgesMet = IDS.slice(1);
    const wd = spawnScourge(g, w, createRng(9))!;
    const near = towers.some((i) => hexDistance(w, i, wd.tile) <= BALANCE.scourge.towerReveal);
    expect(w.tiles[wd.tile].seen).toBe(near);
  });
});

// ---------- 秘薬 ----------

describe('段階7b: 災厄討ちの秘薬', () => {
  it('道具袋から使う: 選んだキャラの選んだ能力値が、この冒険の間+5。能力値を選ばないと使えない', () => {
    const g = newGame('corruptionKing', 5, ['P1', 'P2']);
    g.heroes[0].pouch.push({ uid: 'el1', itemId: 'scourgeElixir' });
    const before = g.heroes[1].bonusStats.agi ?? 0;
    expect(applyGameCommand(g, { type: 'USE_POUCH_ITEM', playerId: 'P1', itemUid: 'el1', userId: 'h0', targetId: 'h0' }).error).toBe('上げる能力値を選んでください');
    g.world!.pos.h1 = g.world!.pos.h0;
    const n = run(g, { type: 'USE_POUCH_ITEM', playerId: 'P1', itemUid: 'el1', userId: 'h0', targetId: 'h1', stat: 'agi' });
    expect(n.heroes[1].bonusStats.agi).toBe(before + 5);
    expect(n.heroes[0].pouch.some((p) => p.uid === 'el1')).toBe(false);
  });
});

// ---------- 専用の装備の力 ----------

const wait = [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block' as const, amount: 0 }] }];
const dummy = { icon: 'T', baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence' };
ENEMIES.register({ ...dummy, id: 'sc7Idler', name: '確認用の置物', maxHp: 100000, actions: wait });
ENEMIES.register({ ...dummy, id: 'sc7Frail', name: '確認用のもろい置物', maxHp: 1, actions: wait });
ENEMIES.register({ ...dummy, id: 'sc7Hitter', name: '確認用の殴る置物', maxHp: 100000, actions: [{ id: 'hit', name: '殴る', effects: [{ kind: 'damage', amount: 7 }] }] });
ENEMIES.register({ ...dummy, id: 'sc7Icer', name: '確認用の氷の置物', maxHp: 100000, actions: [{ id: 'ice', name: '冷気', effects: [{ kind: 'damage', amount: 9, element: 'ice' }] }] });
ENEMIES.register({ ...dummy, id: 'sc7Poisoner', name: '確認用の毒の置物', maxHp: 100000, actions: [{ id: 'p', name: '毒', effects: [{ kind: 'applyStatus', status: 'poison', amount: 2 }] }] });
const card = (c: Partial<CardDef> & Pick<CardDef, 'id' | 'tiers'>): CardDef => ({ name: c.id, category: 'physical', cost: 1, slots: 1, baseChance: 100, target: 'enemy', ...c });
for (const c of [
  card({ id: 'sc7Hit', tiers: [{ minSuccesses: 0, effects: [{ kind: 'damage', amount: 5 }] }] }),
  card({ id: 'sc7Gold', category: 'skill', target: 'self', tiers: [{ minSuccesses: 0, effects: [{ kind: 'gainGold', amount: 30 }] }] }),
  card({ id: 'sc7Curse', category: 'magic', tiers: [{ minSuccesses: 0, effects: [{ kind: 'applyStatus', status: 'curse', amount: 1 }] }] }),
  card({ id: 'sc7SelfBurn', category: 'skill', target: 'self', tiers: [{ minSuccesses: 0, effects: [{ kind: 'applyStatus', status: 'burn', amount: 2, to: 'self' }] }] }),
]) CARDS.register(c);

type Opt = { enemies?: string[]; weapon?: string; armor?: string; accessory?: string; classId?: string; midboss?: boolean };
function battle(opt: Opt = {}): BattleState {
  const g = createGame({ seed: 11, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: opt.classId ?? 'warrior', gender: 'female' as const, name: '仲間', playerId: 'P1' }] });
  const h = g.heroes[0];
  if (opt.weapon) h.equipment.weapon = { uid: 'w', itemId: opt.weapon };
  if (opt.armor) h.equipment.armor = { uid: 'a', itemId: opt.armor };
  else delete h.equipment.armor;
  if (opt.accessory) h.equipment.accessory = { uid: 'c', itemId: opt.accessory };
  else delete h.equipment.accessory;
  delete h.pet;
  const s = createBattle({ seed: 11, party: [toPartyMember(h)], encounter: { id: 'sc7', name: '確認', enemies: (opt.enemies ?? ['sc7Idler', 'sc7Idler']).map((defId) => ({ defId })), ...(opt.midboss ? { midboss: true } : {}) } });
  for (const a of s.allies) { a.mana = 30; a.focus = 5; a.hp = a.maxHp = 500; a.block = 0; a.hand = []; }
  return s;
}
let uid = 0;
function use(s: BattleState, cardId: string, target = 0) {
  const a = s.allies[0], inst = { uid: `u${uid++}`, cardId };
  a.hand.push(inst);
  const c = getCard(cardId);
  const cmd: Command = { type: 'PLAY_CARD', playerId: a.playerId, characterId: a.id, cardInstanceId: inst.uid, targetId: c.target === 'enemy' ? s.enemies[target].uid : undefined, focusUsed: 0 };
  const r = applyCommand(s, cmd);
  expect(r.error, cardId).toBeUndefined();
  return r;
}
function enemyTurn(s: BattleState): BattleState {
  let st = applyCommand(s, { type: 'END_TURN', playerId: 'P1' }).state;
  for (let i = 0; st.phase === 'enemy' && i < 20; i++) st = applyCommand(st, { type: 'ENEMY_STEP' }).state;
  return st;
}
const dmgTo = (events: { type: string; unitId?: string; amount?: number }[], id: string) => events.filter((e) => e.type === 'damage' && e.unitId === id).reduce((n, e) => n + (e.amount ?? 0), 0);

describe('段階7b: 専用の装備の力', () => {
  it('強欲王の黄金冠: 戦闘中にお金を得るたび、敵全員に同じダメージ（1回20まで）＋ブロック3。1ターンに2回まで', () => {
    let s = battle({ accessory: 'greedCrown' });
    const r = use(s, 'sc7Gold');
    expect(dmgTo(r.events, 'e0')).toBe(20);
    expect(dmgTo(r.events, 'e1')).toBe(20);
    expect(r.state.allies[0].block).toBe(3);
    s = use(r.state, 'sc7Gold').state;
    const third = use(s, 'sc7Gold');
    expect(dmgTo(third.events, 'e0')).toBe(0);
    const bare = use(battle(), 'sc7Gold');
    expect(dmgTo(bare.events, 'e0')).toBe(0);
  });

  it('魂喰らいの冥獄鎌: 倒すたび・呪いを与えるたび（呪いは1ターン2回）屍兵。3体いる時は、屍兵が全員1回ずつ攻撃', () => {
    let s = battle({ classId: 'hexer', weapon: 'soulReaperScythe', enemies: ['sc7Frail', 'sc7Idler'] });
    s = use(s, 'sc7Hit', 0).state;
    expect(s.allies[0].summons?.filter((x) => x.group === 'skeletonSoldier')).toHaveLength(1);
    s = use(s, 'sc7Curse', 1).state;
    s = use(s, 'sc7Curse', 1).state;
    expect(s.allies[0].summons?.filter((x) => x.group === 'skeletonSoldier')).toHaveLength(3);
    // 1ターンに2回まで: 3回目の呪いでは呼ばない
    const third = use(s, 'sc7Curse', 1);
    expect(third.state.allies[0].summons?.filter((x) => x.group === 'skeletonSoldier')).toHaveLength(3);
    expect(dmgTo(third.events, 'e1')).toBe(0);
    // 次のターン: 3体いるので、呪いのたびに一斉攻撃（3体×3）
    let t = enemyTurn(third.state);
    t.allies[0].mana = 30;
    const hp = t.enemies[1].hp;
    const volley = use(t, 'sc7Curse', 1);
    t = volley.state;
    expect(hp - t.enemies[1].hp).toBe(9);
  });

  it('永久凍土の女皇衣: 攻撃してきた敵に弱体1（50%で凍結1）。氷属性のダメージを受けない。中ボスには凍結の代わりに弱体', () => {
    let froze = 0;
    for (let seed = 1; seed <= 20; seed++) {
      let s = battle({ armor: 'permafrostGown', enemies: ['sc7Hitter'] });
      s.rngState = seed * 7919 + 1;
      s = enemyTurn(s);
      expect(s.enemies[0].statuses.weak ?? 0, `seed ${seed}`).toBeGreaterThanOrEqual(1);
      if ((s.enemies[0].statuses.freeze ?? 0) > 0) froze++;
    }
    expect(froze).toBeGreaterThan(0);
    expect(froze).toBeLessThan(20);
    let mb = 0;
    for (let seed = 1; seed <= 10; seed++) {
      let s = battle({ armor: 'permafrostGown', enemies: ['sc7Hitter'], midboss: true });
      s.rngState = seed * 7919 + 1;
      s = enemyTurn(s);
      expect(s.enemies[0].statuses.freeze ?? 0).toBe(0);
      mb += s.enemies[0].statuses.weak ?? 0;
    }
    expect(mb).toBeGreaterThan(10);
    const ice = enemyTurn(battle({ armor: 'permafrostGown', enemies: ['sc7Icer'] }));
    expect(ice.allies[0].hp).toBe(500);
  });

  it('悪夢の毛皮: 自分に悪い状態異常が付くたび、同じ物を敵全員に（自分のカードの代償でも）。1ターンに2回まで', () => {
    let s = battle({ armor: 'nightmarePelt' });
    s = use(s, 'sc7SelfBurn').state;
    expect(s.enemies[0].statuses.burn).toBe(2);
    expect(s.enemies[1].statuses.burn).toBe(2);
    s = use(s, 'sc7SelfBurn').state;
    s = use(s, 'sc7SelfBurn').state;
    expect(s.enemies[0].statuses.burn).toBe(4);
    const p = enemyTurn(battle({ armor: 'nightmarePelt', enemies: ['sc7Poisoner'] }));
    expect(p.enemies[0].statuses.poison ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('紅蓮魔人の炉心核（段階7c）: 毎ターンの始めに マナ+1・1枚引く・自分と敵全員に火傷1。カードを使っても増えない。自分の火傷で倒れる事はある', () => {
    const bare = enemyTurn(battle());
    const core = enemyTurn(battle({ accessory: 'infernoCore' }));
    expect(core.allies[0].mana).toBe(bare.allies[0].mana + 1);
    expect(core.allies[0].hand.length).toBe(bare.allies[0].hand.length + 1);
    // 1ターン目に付いた火傷1は味方の番の終わりに燃え（4）、2ターン目の始めに新しく1付く。敵の火傷は敵の番の始めに燃える
    expect(core.allies[0].statuses.burn).toBe(1);
    expect(core.allies[0].hp).toBe(bare.allies[0].hp - 4);
    expect(core.enemies.map((e) => e.statuses.burn)).toEqual([1, 1]);
    expect(core.enemies[0].hp).toBe(bare.enemies[0].hp - 4);
    // カードを何枚使っても、マナ・手札は増えない（毎ターンの始めだけ）
    let s = core;
    const mana = s.allies[0].mana;
    for (let k = 0; k < 3; k++) s = use(s, 'sc7Hit').state;
    expect(s.allies[0].mana).toBe(mana - 3);
    // 悪夢の毛皮と組むと、自分に付く火傷が敵全員にもうつる
    const both = battle({ accessory: 'infernoCore', armor: 'nightmarePelt' });
    expect(both.enemies[0].statuses.burn).toBe(2);
    // 自分の火傷で倒れる（今の火傷の決まりのまま。4ダメージでHPが0になれば戦闘不能）
    const low = battle({ accessory: 'infernoCore', enemies: ['sc7Idler'] });
    low.allies[0].hp = 3;
    const end = enemyTurn(low);
    expect(end.allies[0].dead).toBe(true);
    expect(end.phase).toBe('defeat');
  });

  it('業火の魔人（段階7c）: 噴火で火傷を重ね、業火の炸裂で起爆（1つにつき4・1人24まで）。炸裂は BREAK で止まる', () => {
    expect(getEnemy('scourgeInfernoDemon').actions.filter((a) => a.big).map((a) => a.id)).toEqual(['eruption', 'inferno']);
    expect(breakStopsAction(getEnemyAction('scourgeInfernoDemon', 'inferno'))).toBe(true);
    const blast = (burn: number) => {
      const s = battle({ enemies: ['scourgeInfernoDemon'] });
      s.allies[0].statuses.burn = burn;
      s.enemies[0].intent = { actionId: 'inferno', targetId: s.allies[0].id };
      const t = enemyTurn(s);
      expect(t.allies[0].statuses.burn ?? 0).toBe(0);
      return 500 - t.allies[0].hp;
    };
    // 味方の番の終わりに火傷が1回燃えて（4）1減り、残りを起爆する: 3 → 4＋2×4=12 / 7 → 4＋24 / 10 → 4＋24（1人24まで）
    expect(blast(3)).toBe(12);
    expect(blast(7)).toBe(28);
    expect(blast(10)).toBe(28);
    // BREAK された炸裂は起きない
    const s = battle({ enemies: ['scourgeInfernoDemon'] });
    s.allies[0].statuses.burn = 6;
    s.enemies[0].intent = { actionId: 'inferno', targetId: s.allies[0].id };
    s.enemies[0].broken = true;
    const t = enemyTurn(s);
    // 火傷が1回燃えた分（4）だけ。火傷は残る
    expect(500 - t.allies[0].hp).toBe(4);
    expect(t.allies[0].statuses.burn).toBe(5);
  });
});

// ---------- 古い保存 ----------

describe('段階7b: 古い保存（v26・災厄のいない地図の途中）', () => {
  it('広い地図の古い保存: もう越えた節目の分は出さず、これから越える節目で出る。読み込み・検査は通る', () => {
    let g = newGame();
    delete g.world!.scourgeCount;
    delete g.world!.scourgesMet;
    g.world!.keys = ['k1'];
    g.world!.corruption = 40;
    g = migrateGame(JSON.parse(JSON.stringify(g)))!;
    expect(validateGame(g)).toBe(true);
    g = endTurn(g);
    expect(aliveScourges(g.world)).toHaveLength(0);
    expect(g.world!.scourgeCount).toBe(2);
    g.world!.corruption = 55;
    g = endTurn(g);
    expect(aliveScourges(g.world)).toHaveLength(1);
    expect(g.world!.scourgeCount).toBe(3);
  });

  it('前の広さ（8列）の地図の古い保存には、災厄は出ない', () => {
    const g = newGame();
    const narrow = { ...g.world!, width: 8 };
    expect(scourgeCandidates({ ...g, world: narrow }, narrow).length).toBeGreaterThanOrEqual(0);
    const t = structuredClone(g);
    t.world!.width = 8;
    delete t.world!.scourgeCount;
    tickScourges(t, t.world!, createRng(1));
    expect(t.world!.scourgeCount).toBeUndefined();
    expect(colOf(t.world!, 9)).toBe(1);
  });
});
