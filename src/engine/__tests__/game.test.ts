import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { cardOf, getCard } from '../../data/cards';
import { DUNGEONS } from '../../data/dungeons';
import { EVENTS } from '../../data/events';
import { getItem } from '../../data/items';
import type { GameCommand, GameState, PlayerId } from '../../types';
import {
  applyCommand,
  applyGameCommand,
  battleDeck,
  buildDungeon,
  cardOfferHeroes,
  chestOdds,
  createBattle,
  createGame,
  createRng,
  enemyName,
  eventOptionState,
  findHero,
  heroFocusMax,
  heroMaxHp,
  heroStats,
  isDone,
  reachableRooms,
  doorFront,
  dungeonNavigator,
  findPath,
  posOf,
  retreatLoss,
  statChance,
  unusableReason,
} from '../index';
import { party } from './helpers';
import { cardTargets } from '../battle/targets';
import { unitIdOf } from '../battle/units';

const P: PlayerId = 'P1';
/** ダンジョンの流れを確かめるため、世界マップを外して仮の拠点から始める（世界マップは world.test.ts で確かめる） */
const newGame = (seed = 1, classes = ['warrior', 'mage', 'guardian', 'hunter'], difficulty: GameState['difficulty'] = 'normal') => {
  const g = createGame({
    seed,
    scenarioId: 'corruptionKing',
    difficulty,
    party: classes.map((c, i) => ({ classId: c, gender: i % 2 ? 'female' : 'male', name: `${c}${i}`, playerId: P })),
  });
  g.world = undefined;
  g.mode = 'hub';
  return g;
};

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}

describe('冒険の開始', () => {
  it('初期装備・HP・袋・武器カード', () => {
    const g = newGame();
    expect(g.heroes).toHaveLength(4);
    const w = g.heroes[0];
    expect(getItem(w.equipment.weapon!.itemId).id).toBe('copperSword');
    expect(w.hp).toBe(heroMaxHp(w));
    expect(heroMaxHp(w)).toBe(60 + 5 + 5); // 皮の鎧＋体力70（60を超えた分の半分。M3-C6）
    // 最初の道具（回復薬2つ）はキャラに順番に配られる
    expect(g.heroes.reduce((n, h) => n + h.pouch.length, 0)).toBe(2);
    expect(battleDeck(w).filter((c) => c.fromWeapon).map((c) => c.cardId)).toEqual(['wSlash', 'wSlash']);
    expect(battleDeck(w)).toHaveLength(12);
    expect(g.mode).toBe('hub');
  });
});

describe('ダンジョン', () => {
  it('翠の神殿は固定の並び。最初は1行目だけ入れる', () => {
    let g = newGame();
    g = run(g, { type: 'ENTER_DUNGEON', playerId: P, dungeonId: 'emeraldTemple' });
    expect(g.mode).toBe('dungeon');
    const run1 = g.dungeon!;
    expect(run1.rooms.filter((r) => r.type === 'boss')).toHaveLength(1);
    expect(reachableRooms(run1).map((r) => r.id)).toEqual(['r0c0']);
    expect(applyGameCommand(g, { type: 'ENTER_ROOM', playerId: P, roomId: 'r1c0' }).error).toBeDefined();
  });

  it('ランダムダンジョン: 同じ種なら同じ構造。全部屋が入口から行けて、全部屋からボスへ行ける', () => {
    const ids = EVENTS.all.map((e) => e.id);
    for (let seed = 1; seed <= 60; seed++) {
      const a = buildDungeon('randomForest', createRng(seed), 0, ids);
      const b = buildDungeon('randomForest', createRng(seed), 0, ids);
      expect(a).toEqual(b);
      const byId = new Map(a.rooms.map((r) => [r.id, r]));
      // 入口から到達できる部屋
      const reach = new Set<string>();
      const stack = a.rooms.filter((r) => r.row === 0).map((r) => r.id);
      while (stack.length) {
        const id = stack.pop()!;
        if (reach.has(id)) continue;
        reach.add(id);
        stack.push(...byId.get(id)!.next);
      }
      expect(reach.size).toBe(a.rooms.length);
      // ボス以外の部屋は必ず次がある
      for (const r of a.rooms) if (r.type !== 'boss') expect(r.next.length).toBeGreaterThan(0);
      expect(a.rooms.filter((r) => r.type === 'boss')).toHaveLength(1);
    }
  });
});

describe('装備', () => {
  it('武器の種類が合わないと装備できない。入れ替えた装備は持ち物に戻る', () => {
    let g = newGame();
    g.heroes[0].stash.push({ uid: 'x1', itemId: 'steelSword' }, { uid: 'x2', itemId: 'magusStaff' }, { uid: 'x3', itemId: 'heroCrest' });
    expect(applyGameCommand(g, { type: 'EQUIP', playerId: P, heroId: 'h0', itemUid: 'x2' }).error).toBeDefined();
    const before = heroStats(g.heroes[0]).str;
    g = run(g, { type: 'EQUIP', playerId: P, heroId: 'h0', itemUid: 'x1' });
    expect(heroStats(g.heroes[0]).str).toBe(before + 4);
    expect(g.heroes[0].stash.some((s) => s.itemId === 'copperSword')).toBe(true);
    expect(battleDeck(g.heroes[0]).filter((c) => c.fromWeapon).map((c) => c.cardId)).toEqual(['wSteelCombo', 'wSteelCombo']);
    g = run(g, { type: 'EQUIP', playerId: P, heroId: 'h0', itemUid: 'x3' });
    expect(heroFocusMax(g.heroes[0])).toBe(BALANCE.focusMax + 1);
    expect(statChance(g.heroes[0], 'luk')).toBe(Math.min(95, 40 + 5));
  });
});

describe('宝箱', () => {
  function chestGame(locked: boolean) {
    let g = newGame(3);
    g = run(g, { type: 'ENTER_DUNGEON', playerId: P, dungeonId: 'emeraldTemple' });
    g.mode = 'chest';
    g.dungeon!.currentRoomId = 'r2c0';
    g.chest = { roomId: 'r2c0', spec: { rarity: 'common', locked }, unlocked: !locked };
    return g;
  }
  it('フォーカス全投入で完全成功 → 確率が上の格へずれ、抽選した格の中身が入る', () => {
    let g = chestGame(false);
    g.heroes[0].focus = 3;
    g = run(g, { type: 'OPEN_CHEST', playerId: P, heroId: 'h0', focusUsed: 3 });
    const roll = g.chest!.lastRoll!;
    expect(roll.success).toBe(true);
    expect(roll.oddsBefore).toEqual(chestOdds('common', 0));
    expect(roll.odds).toEqual(chestOdds('common', 3));
    expect(roll.grade).toBe(g.chest!.grade);
    expect(roll.gradeChance).toBeCloseTo(roll.odds![['common', 'rare', 'epic', 'legend'].indexOf(roll.grade!)]);
    // 見た目（木箱）は変わらない
    expect(g.chest!.spec.rarity).toBe('common');
    const item = g.chest!.contents!.find((c) => c.kind === 'item');
    expect(item).toBeDefined();
    expect(g.stats.chestsOpened).toBe(1);
    g = run(g, { type: 'LEAVE_CHEST', playerId: P });
    expect(g.mode).toBe('dungeon');
  });
  it('同じシードなら同じ格・同じ中身（オンライン同期の前提）', () => {
    const a = run(chestGame(false), { type: 'OPEN_CHEST', playerId: P, heroId: 'h0', focusUsed: 1 });
    const b = run(chestGame(false), { type: 'OPEN_CHEST', playerId: P, heroId: 'h0', focusUsed: 1 });
    expect(a.chest).toEqual(b.chest);
  });
  it('エピック以上の格では必ずその格の装備が入る', () => {
    const counts: Record<string, number> = {};
    for (let seed = 1; seed <= 400; seed++) {
      let g = chestGame(false);
      g.chest!.spec = { rarity: 'legend', locked: false };
      g.rngState = seed;
      g.heroes[0].focus = 3;
      g = run(g, { type: 'OPEN_CHEST', playerId: P, heroId: 'h0', focusUsed: 3 });
      const grade = g.chest!.grade!;
      counts[grade] = (counts[grade] ?? 0) + 1;
      const main = g.chest!.contents![0];
      expect(main.kind).toBe('item');
      if (main.kind === 'item') {
        const def = getItem(main.item.itemId);
        expect(def.rarity).toBe(grade);
        if (grade === 'epic' || grade === 'legend') {
          expect(def.slot).not.toBe('consumable');
          expect(def.ability).toBeDefined();
        }
      }
      expect(grade).not.toBe('common'); // 黄金箱にコモンは無い
    }
    expect(counts.legend).toBeGreaterThan(0);
    expect(counts.epic).toBeGreaterThan(0);
  });
  it('鍵開けに失敗すると罠（全員5ダメージ）。成功すれば開けられる', () => {
    let failed = false;
    let opened = false;
    for (let seed = 1; seed <= 40 && !(failed && opened); seed++) {
      let g = chestGame(true);
      g.rngState = seed;
      g.heroes.forEach((h) => (h.focus = 0));
      const hp = g.heroes.map((h) => h.hp);
      g = run(g, { type: 'OPEN_CHEST', playerId: P, heroId: 'h1', focusUsed: 0 });
      if (g.chest!.unlocked) opened = true;
      else {
        failed = true;
        expect(g.heroes.map((h) => h.hp)).toEqual(hp.map((x) => x - 5));
      }
    }
    expect(failed && opened).toBe(true);
  });
});

describe('戦闘 → 報酬 → 成長', () => {
  it('勝つと経験値・ゴールド・カード報酬。戦闘不能はHP1で復帰し経験値なし', () => {
    let g = newGame(5, ['warrior', 'mage']);
    g = run(g, { type: 'ENTER_DUNGEON', playerId: P, dungeonId: 'emeraldTemple' });
    g = run(g, { type: 'ENTER_ROOM', playerId: P, roomId: 'r0c0' });
    expect(g.mode).toBe('battle');
    // 勝った状態にする（魔道士は戦闘不能）
    g.battle!.enemies.forEach((e) => (e.dead = true));
    g.battle!.allies[1].dead = true;
    g.battle!.allies[1].hp = 0;
    g.battle!.phase = 'victory';
    g.heroes[0].exp = 19; // あと少しでレベルアップ
    g = run(g, { type: 'FINISH_BATTLE', playerId: P });
    expect(g.mode).toBe('reward');
    // お金は生き残った人（h0）のもの
    expect(g.heroes[0].gold).toBeGreaterThan(30);
    expect(g.heroes[1].gold).toBe(30);
    expect(g.heroes[1].hp).toBe(1);
    expect(g.reward!.exp.map((e) => e.heroId)).toEqual(['h0']);
    expect(g.heroes[0].level).toBe(2);
    expect(g.reward!.levelUps[0].options).toHaveLength(3);
    expect(g.reward!.cardOffers.length).toBeGreaterThan(0);
    // 成長を選ぶまで終われない
    expect(applyGameCommand(g, { type: 'FINISH_REWARD', playerId: P }).error).toBeDefined();
    const opt = g.reward!.levelUps[0].options.findIndex((o) => o.kind === 'stat');
    g = run(g, { type: 'CHOOSE_GROWTH', playerId: P, optionIndex: opt });
    // 生き残ったキャラごとに3枚から1枚（M3-C4）。全員が選ぶまで終われない
    const pickers = cardOfferHeroes(g.reward!);
    expect(pickers).toEqual(g.reward!.exp.map((e) => e.heroId)); // 戦闘不能だったキャラには無い
    expect(applyGameCommand(g, { type: 'FINISH_REWARD', playerId: P }).error).toBeDefined();
    g = run(g, { type: 'PICK_CARD', playerId: P, offerIndex: 0 });
    expect(applyGameCommand(g, { type: 'PICK_CARD', playerId: P, offerIndex: 0 }).error).toBeDefined();
    for (const id of pickers.slice(1)) g = run(g, { type: 'PICK_CARD', playerId: P, offerIndex: g.reward!.cardOffers.findIndex((o) => o.heroId === id) });
    expect(g.reward!.cardPicked).toBe(true);
    expect(g.heroes.reduce((n, h) => n + h.deck.length, 0)).toBe(20 + pickers.length);
    g = run(g, { type: 'FINISH_REWARD', playerId: P });
    expect(['dungeon', 'chest']).toContain(g.mode);
  });

  it('強化したカードは数値と成功率が上がる', () => {
    const base = getCard('strike');
    const up = cardOf({ cardId: 'strike', upgraded: true });
    expect(up.name).toBe('ストライク＋');
    expect(up.baseChance).toBe(base.baseChance + 10);
    expect(up.tiers[1].effects[0]).toEqual({ kind: 'damage', amount: 9 });
  });
});

describe('新しい戦闘の要素', () => {
  it('全体攻撃・全員ブロック・全員回復', () => {
    const s = createBattle({ seed: 1, party: party('warrior', 'guardian'), encounter: { id: 't', name: 't', enemies: [{ defId: 'goblinScout' }, { defId: 'goblinScout' }] } });
    s.allies[0].hand = [{ uid: 'z1', cardId: 'sweep' }];
    let r = applyCommand(s, { type: 'PLAY_CARD', playerId: 'P1', characterId: 'a0', cardInstanceId: 'z1', focusUsed: 2 });
    expect(r.error).toBeUndefined();
    expect(r.state.enemies.every((e) => e.hp === e.maxHp - 10)).toBe(true); // 8 × 剣の心得（完全成功で1.3倍）
    const s2 = r.state;
    s2.allies[1].hand = [{ uid: 'z2', cardId: 'guardFormation' }, { uid: 'z3', cardId: 'holyLight' }];
    s2.allies[0].hp = 30;
    r = applyCommand(s2, { type: 'PLAY_CARD', playerId: 'P1', characterId: 'a1', cardInstanceId: 'z2', focusUsed: 2 });
    expect(r.state.allies.map((a) => a.block)).toEqual([9, 9]);
    r = applyCommand(r.state, { type: 'PLAY_CARD', playerId: 'P1', characterId: 'a1', cardInstanceId: 'z3', focusUsed: 2 });
    // 聖なる光（完全成功）: 全員HP+6 と 再生3
    expect(r.state.allies[0].hp).toBe(36);
    expect(r.state.allies.map((a) => a.statuses.regen)).toEqual([3, 3]);
  });

  it('毒: ターン終了時にダメージ（ブロック無視）して1減る', () => {
    const s = createBattle({ seed: 1, party: party('warrior'), encounter: { id: 't', name: 't', enemies: [{ defId: 'goblinScout' }] } });
    s.allies[0].statuses.poison = 3;
    s.allies[0].block = 50;
    const r = applyCommand(s, { type: 'END_TURN', playerId: 'P1' });
    expect(r.state.allies[0].hp).toBe(60 - 3);
    expect(r.state.allies[0].statuses.poison).toBe(2);
  });

  it('ボスはHP50%以下で第2形態になり、行動が変わる', () => {
    const s = createBattle({ seed: 1, party: party('warrior'), encounter: { id: 't', name: 't', enemies: [{ defId: 'treantKing' }] } });
    const boss = s.enemies[0];
    boss.hp = Math.floor(boss.maxHp / 2) + 3;
    s.allies[0].hand = [{ uid: 'z', cardId: 'heavySwing' }];
    const r = applyCommand(s, { type: 'PLAY_CARD', playerId: 'P1', characterId: 'a0', cardInstanceId: 'z', targetId: 'e0', focusUsed: 3 });
    expect(r.state.enemies[0].phase).toBe(1);
    expect(enemyName(r.state.enemies[0])).toBe('怒れる古樹');
    expect(r.events.some((e) => e.type === 'enemyPhase')).toBe(true);
    // 次のターンの行動は第2形態の行動から選ばれる
    let st = applyCommand(r.state, { type: 'END_TURN', playerId: 'P1' }).state;
    while (st.phase === 'enemy') st = applyCommand(st, { type: 'ENEMY_STEP' }).state;
    expect(['rageStorm', 'stranglingVine', 'rotSpores']).toContain(st.enemies[0].intent?.actionId);
  });

  it('煙玉はボス戦では使えない', () => {
    let g = newGame(2, ['warrior']);
    g.heroes[0].pouch.push({ uid: 'sm', itemId: 'smokeBomb' });
    g = run(g, { type: 'ENTER_DUNGEON', playerId: P, dungeonId: 'emeraldTemple' });
    const boss = g.dungeon!.rooms.find((r) => r.type === 'boss')!;
    g.dungeon!.currentRoomId = boss.id;
    g.battle = createBattle({ seed: 1, party: party('warrior').map((m) => ({ ...m, heroId: 'h0' })), encounter: { id: 'b', name: 'b', enemies: boss.enemies! } });
    g.mode = 'battle';
    expect(applyGameCommand(g, { type: 'USE_POUCH_ITEM', playerId: P, itemUid: 'sm', userId: 'h0', targetId: 'h0' }).error).toBe('ボスからは逃げられない！');
  });
});

describe('撤退', () => {
  it('このダンジョンで最後に手に入れた装備を失って拠点へ（全回復）', () => {
    let g = newGame(4, ['warrior']);
    g = run(g, { type: 'ENTER_DUNGEON', playerId: P, dungeonId: 'emeraldTemple' });
    g.heroes[0].stash.push({ uid: 'g1', itemId: 'ironArmor' }, { uid: 'g2', itemId: 'steelSword' });
    g.dungeon!.gained.push({ uid: 'g1', itemId: 'ironArmor' }, { uid: 'g2', itemId: 'steelSword' });
    g.heroes[0].hp = 10;
    expect(retreatLoss(g)?.uid).toBe('g2');
    g = run(g, { type: 'RETREAT', playerId: P });
    expect(g.mode).toBe('hub');
    expect(g.heroes[0].stash.map((s) => s.uid)).toEqual(['g1']);
    expect(g.heroes[0].hp).toBe(heroMaxHp(g.heroes[0]));
  });
});

describe('イベント', () => {
  it('【古文書解読】の選択肢は魔道士がいる時だけ出る', () => {
    const withMage = newGame(1, ['mage']);
    const without = newGame(1, ['warrior']);
    const idx = EVENTS.get('ancientStele').options.findIndex((o) => o.requiresTag === 'arcane');
    expect(eventOptionState(withMage, 'ancientStele', idx).visible).toBe(true);
    expect(eventOptionState(without, 'ancientStele', idx).visible).toBe(false);
  });
  it('怪力: 倒木イベントの判定に+15%', () => {
    const g = newGame(1, ['warrior', 'mage']);
    expect(statChance(g.heroes[0], 'str', 'obstacle')).toBe(70 + 15);
    expect(statChance(g.heroes[1], 'str', 'obstacle')).toBe(30);
  });
});

/** 自動プレイ: 部屋を順に選び、戦闘は攻撃カード優先、報酬は先頭を選ぶ */
function autoPlay(g: GameState, dungeonId: string, maxSteps = 4000): GameState {
  g = run(g, { type: 'ENTER_DUNGEON', playerId: P, dungeonId });
  for (let step = 0; step < maxSteps; step++) {
    switch (g.mode) {
      case 'dungeon': {
        const rooms = reachableRooms(g.dungeon!);
        const room = rooms[step % rooms.length];
        // 第3段階: 扉の前まで歩いてから開ける
        const front = doorFront(g.dungeon!, room.id)!;
        for (const d of findPath(g.dungeon!, front)!) {
          const rel = (['forward', 'right', 'back', 'left'] as const)[(d - posOf(g.dungeon!).facing + 4) % 4];
          g = run(g, { type: 'DUNGEON_STEP', playerId: P, heroId: dungeonNavigator(g)!.id, dir: rel });
        }
        g = run(g, { type: 'ENTER_ROOM', playerId: P, roomId: room.id });
        break;
      }
      case 'battle': {
        const b = g.battle!;
        if (b.phase === 'ally') {
          let played = false;
          for (const a of b.allies) {
            if (isDone(b, a)) continue;
            const c = a.hand.find((h) => !unusableReason(b, a, cardOf(h)));
            if (!c) continue;
            const card = cardOf(c);
            const target = b.enemies.find((e) => !e.dead)?.uid;
            const focus = card.slots >= 3 ? Math.min(card.slots, a.focus) : 0;
            g = run(g, { type: 'BATTLE', command: { type: 'PLAY_CARD', playerId: P, characterId: a.id, cardInstanceId: c.uid, targetId: card.target === 'enemy' ? target : card.target === 'ally' ? cardTargets(b, a, card).map(unitIdOf)[0] : undefined, focusUsed: focus } });
            played = true;
            break;
          }
          if (!played) g = run(g, { type: 'BATTLE', command: { type: 'END_TURN', playerId: P } });
        } else if (b.phase === 'enemy') g = run(g, { type: 'BATTLE', command: { type: 'ENEMY_STEP' } });
        else g = run(g, { type: 'FINISH_BATTLE', playerId: P });
        break;
      }
      case 'reward': {
        const r = g.reward!;
        if (r.levelUps.length) {
          const lu = r.levelUps[0];
          const h = findHero(g, lu.heroId)!;
          const i = lu.options.findIndex((o) => o.kind !== 'upgradeCard');
          g = run(g, { type: 'CHOOSE_GROWTH', playerId: P, optionIndex: i >= 0 ? i : 0, cardUid: h.deck.find((c) => !c.upgraded)?.uid });
        } else if (!r.cardPicked) {
          const i = r.cardOffers.findIndex((o) => !r.cardDone?.includes(o.heroId));
          g = run(g, { type: 'PICK_CARD', playerId: P, offerIndex: i >= 0 ? i : null });
        }
        else g = run(g, { type: 'FINISH_REWARD', playerId: P });
        break;
      }
      case 'chest': {
        const c = g.chest!;
        if (c.contents) g = run(g, { type: 'LEAVE_CHEST', playerId: P });
        else {
          const h = g.heroes.find((x) => x.hp > 0)!;
          g = run(g, { type: 'OPEN_CHEST', playerId: P, heroId: h.id, focusUsed: 0 });
          if (!g.chest!.unlocked && step % 3 === 2) g = run(g, { type: 'LEAVE_CHEST', playerId: P });
        }
        break;
      }
      case 'event': {
        const ev = g.event!;
        if (ev.result) g = run(g, { type: 'FINISH_EVENT', playerId: P });
        else {
          const def = EVENTS.get(ev.eventId);
          const idx = def.options.findIndex((_, i) => {
            const st = eventOptionState(g, ev.eventId, i);
            return st.visible && !st.reason;
          });
          g = run(g, { type: 'CHOOSE_EVENT', playerId: P, optionIndex: idx, heroId: g.heroes.find((h) => h.hp > 0)!.id, focusUsed: 0 });
        }
        break;
      }
      case 'rest':
        g = run(g, { type: 'REST', playerId: P, kind: 'hp' });
        break;
      case 'cleared':
      case 'gameover':
        return g;
      case 'hub':
        return g;
    }
    // 不変条件
    for (const h of g.heroes) {
      expect(h.hp).toBeLessThanOrEqual(heroMaxHp(h));
      expect(h.focus).toBeLessThanOrEqual(heroFocusMax(h));
      expect(h.focus).toBeGreaterThanOrEqual(0);
    }
  }
  throw new Error('終わらない');
}

describe('自動プレイ（ダンジョンを最後まで）', () => {
  it('翠の神殿・ランダムダンジョンを、例外なく制覇または全滅まで進む', () => {
    const results: string[] = [];
    for (let seed = 1; seed <= 12; seed++) {
      for (const d of Object.values(DUNGEONS.all).map((x) => x.id)) {
        const g = autoPlay(newGame(seed, ['warrior', 'mage', 'guardian', 'hunter'], 'easy'), d);
        results.push(g.mode);
        expect(['cleared', 'gameover']).toContain(g.mode);
        if (g.mode === 'cleared') {
          expect(g.stats.dungeonsCleared).toBe(1);
          const back = run(g, { type: 'RETURN_TO_HUB', playerId: P });
          expect(back.mode).toBe('hub');
          expect(back.clearedDungeons).toContain(d);
        }
      }
    }
    // 4人・やさしいなら、かなりの割合で制覇できる
    expect(results.filter((r) => r === 'cleared').length).toBeGreaterThan(results.length / 3);
    // 第3段階: 扉の前まで1歩ずつ歩く分だけ操作が増え、単独で約3秒（以前は約2.8秒）。
    // テスト全体を同時に流すと既定の5秒に近づき時々時間切れになるため、このテストだけ15秒にする（確認する中身は同じ）
  }, 15000);

  it('同じシードなら同じ結果（オンライン協力で全員の結果が一致する前提）', () => {
    const a = autoPlay(newGame(9), 'emeraldTemple');
    const b = autoPlay(newGame(9), 'emeraldTemple');
    expect(a).toEqual(b);
  });
});
