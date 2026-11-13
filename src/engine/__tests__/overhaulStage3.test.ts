// ===== 抜本的な見直し 段階3: BREAK（大技の予告を崩す）・連携の段階・封魔の宝箱 =====
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { DUNGEONS } from '../../data/dungeons';
import { ENEMIES, getEnemy } from '../../data/enemies';
import { getRoomType } from '../../data/rules';
import type { BattleState, GameCommand, GameState, PlayerId } from '../../types';
import {
  applyCommand,
  applyGameCommand,
  buildDungeon,
  canBreak,
  comboStage,
  createBattle,
  createGame,
  createRng,
  doorDetail,
  dungeonEnemyLevel,
  dungeonStage,
  heroMaxHp,
  intentHitsOn,
  moveIntoRoom,
  omenInfoOf,
  omenOfType,
  predictCardTotals,
  sealStep,
  viewOf,
} from '../index';
import { botNextCommand, botStep, type BotLog, type BotMemo } from '../bot';
import { giveHand, party, play } from './helpers';

/** 門番ガルザ（弱点は雷。大技 = 大斧の一撃・大旋風）1体との戦闘 */
function gateBattle(seed = 5, classes = ['warrior', 'mage']): BattleState {
  const s = createBattle({ seed, party: party(...classes), encounter: { id: 't', name: 't', enemies: [{ defId: 'gatekeeper', level: 10 }] } });
  s.enemies[0].hp = s.enemies[0].maxHp = 1000;
  for (const a of s.allies) a.hp = a.maxHp = 9999;
  return s;
}
const intend = (s: BattleState, actionId: string) => {
  s.enemies[0].intent = { actionId, targetId: 'a0' };
  return s;
};
const breaks = (events: { type: string }[]) => events.filter((e) => e.type === 'break') as { type: 'break'; why: string }[];

describe('BREAK（大技の予告を崩す。オーナーの決定 3-A）', () => {
  it('完全成功で攻撃を当てると崩れる: 威力が半分・脆弱1・ブロック0。1つの予告に1回だけ', () => {
    const s = intend(gateBattle(), 'crush');
    s.enemies[0].block = 30;
    const before = intentHitsOn(s.enemies[0], s.allies[0])[0];
    expect(canBreak(s.enemies[0])).toBe(true);
    const [card] = giveHand(s, 'a0', ['heavySwing', 'heavySwing']);
    s.allies[0].focus = 6;
    const rng0 = s.rngState;
    const r = applyCommand(s, play('a0', card.uid, 'e0', 3));
    expect(breaks(r.events).map((e) => e.why)).toEqual(['perfect']);
    const e = r.state.enemies[0];
    expect(e.broken).toBe(true);
    expect(e.nextActionMultiplier).toBe(BALANCE.breakPower);
    // BREAK で付く状態は脆弱（2026-11-13 に弱体から変えた）
    expect(BALANCE.breakStatus).toBe('vulnerable');
    // 重い一撃も脆弱を付けるので、BREAK の分は出来事（status）で確かめる
    expect(r.events.some((x) => x.type === 'status' && x.unitId === e.uid && x.status === 'vulnerable' && x.amount === BALANCE.breakWeak)).toBe(true);
    expect(e.statuses.vulnerable).toBeGreaterThanOrEqual(BALANCE.breakWeak);
    expect(e.statuses.weak ?? 0).toBe(0);
    expect(e.block).toBe(0);
    // 予告の数字: 半分（切り捨て）。脆弱は敵の攻撃を減らさない
    const after = intentHitsOn(e, r.state.allies[0])[0];
    expect(after).toBeLessThanOrEqual(Math.ceil(before * 0.5));
    expect(after).toBeGreaterThan(0);
    expect(canBreak(e)).toBe(false);
    // フォーカスで全部の枠を決めたので、乱数の流れは「乱数を使わないカード」と同じだけ（BREAK は乱数を引かない）
    const plain = applyCommand(intend(gateBattle(), 'roar'), play('a0', giveHand(intend(gateBattle(), 'roar'), 'a0', ['heavySwing'])[0].uid, 'e0', 3));
    expect(plain.error).toBeDefined(); // 別の状態の手札なので使えない（下で同じ状態から比べる）
    const same = intend(gateBattle(), 'roar');
    const [c2] = giveHand(same, 'a0', ['heavySwing', 'heavySwing']);
    same.allies[0].focus = 6;
    same.enemies[0].block = 30;
    expect(same.rngState).toBe(rng0);
    expect(applyCommand(same, play('a0', c2.uid, 'e0', 3)).state.rngState).toBe(r.state.rngState);
    // 2回目は崩れない
    const again = applyCommand(r.state, play('a0', r.state.allies[0].hand[0].uid, 'e0', 3));
    expect(breaks(again.events)).toHaveLength(0);
    expect(again.state.enemies[0].nextActionMultiplier).toBe(BALANCE.breakPower);
  });

  it('大技でない予告は、完全成功でも崩れない', () => {
    const s = intend(gateBattle(), 'roar');
    const [card] = giveHand(s, 'a0', ['heavySwing']);
    s.allies[0].focus = 3;
    const r = applyCommand(s, play('a0', card.uid, 'e0', 3));
    expect(breaks(r.events)).toHaveLength(0);
    expect(r.state.enemies[0].broken).toBeUndefined();
  });

  it('弱点の属性で攻撃すると、完全成功でなくても崩れる', () => {
    // 雷のカード（4枠）をフォーカス無しで: 完全成功にならない種を探す
    for (let seed = 1; seed < 40; seed++) {
      const s = intend(gateBattle(seed), 'whirl');
      const [card] = giveHand(s, 'a1', ['gambleBolt']);
      const r = applyCommand(s, play('a1', card.uid, 'e0', 0));
      const roll = r.events.find((e) => e.type === 'roll');
      if (roll?.type !== 'roll' || roll.perfect) continue;
      expect(breaks(r.events).map((e) => e.why)).toEqual(['weak']);
      return;
    }
    throw new Error('完全成功でない種が見つからない');
  });

  it('このターンの合計ダメージが最大HPの2割に届くと崩れる（届くまでは崩れない）', () => {
    for (let seed = 1; seed < 60; seed++) {
      const s = intend(gateBattle(seed), 'crush');
      const [card] = giveHand(s, 'a0', ['heavySwing', 'heavySwing', 'heavySwing']);
      s.allies[0].focus = 0;
      s.allies[0].mana = 9;
      const r = applyCommand(s, play('a0', card.uid, 'e0', 0));
      const roll = r.events.find((e) => e.type === 'roll');
      if (roll?.type !== 'roll' || roll.perfect) continue;
      // HP1000 の2割 = 200 には届かない
      expect(breaks(r.events)).toHaveLength(0);
      expect(r.state.enemies[0].turnDamage).toBe(1000 - r.state.enemies[0].hp);
      // 最大HPを小さくして、同じ一撃が2割に届く形にする
      const small = intend(gateBattle(seed), 'crush');
      small.enemies[0].maxHp = small.enemies[0].hp = Math.max(2, (1000 - r.state.enemies[0].hp) * 4);
      const [c2] = giveHand(small, 'a0', ['heavySwing']);
      small.allies[0].focus = 0;
      const r2 = applyCommand(small, play('a0', c2.uid, 'e0', 0));
      expect(breaks(r2.events).map((e) => e.why)).toEqual(['damage']);
      return;
    }
    throw new Error('完全成功でない種が見つからない');
  });

  it('次のターンになると、数えと「崩した」の印は消える（新しい予告は、また崩せる）', () => {
    const s = intend(gateBattle(), 'crush');
    const [card] = giveHand(s, 'a0', ['heavySwing']);
    s.allies[0].focus = 3;
    let st = applyCommand(s, play('a0', card.uid, 'e0', 3)).state;
    expect(st.enemies[0].broken).toBe(true);
    st = applyCommand(st, { type: 'END_TURN', playerId: 'P1' }).state;
    for (let i = 0; i < 10 && st.phase === 'enemy'; i++) st = applyCommand(st, { type: 'ENEMY_STEP' }).state;
    expect(st.phase).toBe('ally');
    expect(st.enemies[0].broken).toBeUndefined();
    expect(st.enemies[0].turnDamage).toBeUndefined();
    expect(st.enemies[0].nextActionMultiplier).toBeUndefined();
  });

  it('予測（複製で試す）でも、崩せる成功数が分かる。元の状態は変わらない', () => {
    const s = intend(gateBattle(), 'crush');
    const [card] = giveHand(s, 'a0', ['heavySwing']);
    const snap = JSON.stringify(s);
    const top = predictCardTotals(s, 'a0', card.uid, 'e0', 0, 3).find((t) => t.id === 'e0');
    const low = predictCardTotals(s, 'a0', card.uid, 'e0', 0, 0).find((t) => t.id === 'e0');
    expect(top?.breaks).toBe(true);
    expect(low?.breaks).toBeUndefined();
    expect(JSON.stringify(s)).toBe(snap);
  });

  it('データ: ダンジョンの強敵・中ボス・ボスの組には、大技を持つ敵が必ずいる。大技を持つのは、その組に出る敵と隠しボスだけ', () => {
    const big = (id: string) => [getEnemy(id).actions, ...(getEnemy(id).phases ?? []).map((p) => p.actions)].flat().some((a) => a.big);
    const strong = new Set<string>();
    for (const d of DUNGEONS.all) {
      for (const g of d.pools.elite) { expect(g.some(big), `${d.id} 強敵 ${g.join(',')}`).toBe(true); g.forEach((id) => strong.add(id)); }
      expect(d.pools.boss.some(big), `${d.id} ボス`).toBe(true);
      d.pools.boss.forEach((id) => strong.add(id));
      if (d.pools.midboss) { expect(d.pools.midboss.some(big), `${d.id} 中ボス`).toBe(true); d.pools.midboss.forEach((id) => strong.add(id)); }
    }
    // 隠しボス（名所のイベントの戦闘にだけ出る。HPが大きい）も大技を持つ
    // 亜種（絵と行動を元の敵から引き継ぐ）は、元の敵が強敵なら大技も引き継ぐ
    // 敵の特殊な行動（予告の文 hint 付き。docs/tasks/enemy-behaviors-plan.md §7）は、ふつうの敵にも付く大技なので、この2つの決まりの外
    const special = (id: string) => [getEnemy(id).actions, ...(getEnemy(id).phases ?? []).map((p) => p.actions)].flat().some((a) => a.big && !a.hint);
    for (const e of ENEMIES.all) if (special(e.id) && !strong.has(e.id) && !(e.variantOf && strong.has(e.variantOf))) expect(e.maxHp, `${e.id} は強敵の組にも隠しボスにも当てはまらない`).toBeGreaterThanOrEqual(250);
    // 大技は、ダメージのある行動だけ（敵の特殊な行動は除く。ダメージの無い物は BREAK すると起きない）
    for (const e of ENEMIES.all) for (const a of [e.actions, ...(e.phases ?? []).map((p) => p.actions)].flat()) if (a.big && !a.hint) expect(a.effects.some((x) => x.kind === 'damage'), `${e.id}.${a.id}`).toBe(true);
  });
});

describe('連携の段階（2人目+20%・3人目+35%・4人目+50%）', () => {
  const four = () => {
    const s = gateBattle(5, ['warrior', 'mage', 'guardian', 'hunter']);
    intend(s, 'roar');
    return s;
  };
  const dmg = (s: BattleState, who: string) => {
    const [card] = giveHand(s, who, ['heavySwing']);
    s.allies.find((a) => a.id === who)!.focus = 3;
    const r = applyCommand(s, play(who, card.uid, 'e0', 3));
    return { loss: s.enemies[0].hp - r.state.enemies[0].hp, r };
  };
  it('先に攻撃した「別の味方」の人数で、上乗せが変わる', () => {
    expect(BALANCE.comboBonus).toEqual([0, 0.2, 0.35, 0.5]);
    const base = dmg(four(), 'a0').loss;
    const names = ['', '連携', '大連携', '極連携'];
    for (let n = 1; n <= 3; n++) {
      const s = four();
      s.enemies[0].hitBy = ['a1', 'a2', 'a3'].slice(0, n);
      expect(comboStage(s.allies[0], s.enemies[0])).toBe(n);
      const { loss, r } = dmg(s, 'a0');
      expect(loss).toBe(Math.round(base * (1 + BALANCE.comboBonus[n])));
      expect(r.events.some((e) => e.type === 'ability' && e.name === names[n])).toBe(true);
    }
  });
  it('自分の攻撃は数えない。記録はターンの初めに消える', () => {
    const s = four();
    s.enemies[0].hitBy = ['a0', 'a1'];
    expect(comboStage(s.allies[0], s.enemies[0])).toBe(1);
    expect(comboStage(s.allies[2], s.enemies[0])).toBe(2);
    expect(comboStage(s.enemies[0], s.allies[0])).toBe(0);
  });
});

// ---------- 封魔の宝箱 ----------

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}
const err = (g: GameState, cmd: GameCommand) => applyGameCommand(g, cmd).error;
const inScene = (x: string, command: GameCommand): GameCommand => ({ type: 'SCENE', scene: x, command });
const vote = (x: string, p: PlayerId, command: GameCommand): GameCommand => inScene(x, { type: 'VOTE', playerId: p, command });
const tileOf = (g: GameState, id: string) => g.world!.tiles.findIndex((t) => t.f?.kind === 'dungeon' && t.f.id === id);

/** 2人で翠の神殿に入り、封魔の宝箱の部屋に入った形にする */
function atSealedChest(players: PlayerId[] = ['P1', 'P1']) {
  let g = createGame({ seed: 3, scenarioId: 'corruptionKing', difficulty: 'normal', party: players.map((playerId, i) => ({ classId: i === 0 ? 'warrior' : 'mage', gender: 'male' as const, name: `h${i}`, playerId })) });
  g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
  g.world!.pos.h0 = g.world!.pos.h1 = tileOf(g, 'emeraldTemple');
  g.world!.turn = 'h0';
  if (players[1] !== players[0]) {
    g = run(g, { type: 'WORLD_INVITE', playerId: 'P1', heroId: 'h0', targetId: 'h1' });
    g = run(g, { type: 'WORLD_INVITE_ANSWER', playerId: players[1], heroId: 'h1', accept: true });
  }
  g = run(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: 'h0', party: ['h0', 'h1'] });
  const e = g.expeditions![0];
  const d = e.dungeon!;
  const room = d.rooms.find((r) => getRoomType(r.type).behavior === 'chest' && r.row >= 2)!;
  room.type = 'sealedChest';
  room.chest = { rarity: 'epic', locked: false, sealed: true };
  room.enemies = [{ defId: 'treeWarden', level: 5 }];
  d.currentRoomId = room.id;
  moveIntoRoom(d, room.id);
  d.opened = true;
  e.chest = { roomId: room.id, spec: room.chest, unlocked: true };
  e.mode = 'chest';
  for (const h of g.heroes) h.focus = 3;
  return { g, x: e.id, roomId: room.id };
}

/** 番人との戦闘を「勝ち」にして、報酬の画面を自動で済ませる */
function winGuard(g: GameState, x: string): GameState {
  g = structuredClone(g);
  const e = g.expeditions!.find((q) => q.id === x)!;
  e.battle!.phase = 'victory';
  for (const en of e.battle!.enemies) { en.hp = 0; en.dead = true; }
  const log: BotLog = { steps: 0, errors: [], modes: {} };
  const memo: BotMemo = { interacted: new Set() };
  for (let i = 0; i < 60 && viewOf(g, x).mode !== 'chest' && viewOf(g, x).mode !== 'dungeon'; i++) g = botStep(g, log, memo);
  expect(log.errors).toEqual([]);
  return g;
}

describe('封魔の宝箱（金の扉。罠・戦闘つきの高レア箱）', () => {
  it('部屋の種類のデータ: 金の扉のまま、名前と説明が「封魔の宝箱」。番人は強敵の組でレベル+2', () => {
    const t = getRoomType('sealedChest');
    expect(t.behavior).toBe('chest');
    expect(omenOfType('sealedChest')).toBe('treasure');
    expect(omenInfoOf('sealedChest')).toMatchObject({ omen: 'treasure', name: '封魔の宝箱', color: omenInfoOf('chest')!.color });
    expect(omenInfoOf('chest')!.name).toBe('宝物庫');
    expect(t.battle).toMatchObject({ pool: 'elite', levelBonus: 2 });
    expect(t.battle!.levelBonus).toBeGreaterThan(getRoomType('elite').battle!.levelBonus);
    expect(t.layoutWeight ?? 0).toBe(0);
  });

  it('ダンジョンを作る時: 奥の宝箱の部屋が一定の割合で封魔の宝箱になる（手前の行には出ない。箱は装飾箱か黄金箱・鍵なし・番人つき）', () => {
    const s = BALANCE.sealedChest;
    let chests = 0;
    let sealed = 0;
    for (const def of DUNGEONS.all.filter((d) => d.layout)) {
      for (let seed = 1; seed <= 12; seed++) {
        const d = buildDungeon(def.id, createRng(seed), 0, []);
        for (const r of d.rooms) {
          if (getRoomType(r.type).behavior !== 'chest') continue;
          if (r.type === 'sealedChest') {
            sealed++;
            expect(r.row).toBeGreaterThanOrEqual(s.fromRow);
            expect(r.chest).toMatchObject({ locked: false, sealed: true });
            expect(['epic', 'legend']).toContain(r.chest!.rarity);
            expect(r.enemies!.length).toBeGreaterThan(0);
            // 番人のレベル = 同じ行の強敵より1つ上
            expect(r.enemies![0].level).toBe(def.baseLevel + Math.floor(r.row / BALANCE.depthBonus.rowsPerStep) + 2);
          } else {
            expect(r.chest?.sealed).toBeUndefined();
            expect(r.enemies).toBeUndefined();
          }
          if (r.row >= s.fromRow) chests++;
        }
        // 同じ種なら同じ結果（保存して再開・オンラインで同じ）
        expect(buildDungeon(def.id, createRng(seed), 0, []).rooms.map((r) => r.type)).toEqual(d.rooms.map((r) => r.type));
      }
    }
    expect(sealed).toBeGreaterThan(0);
    const rate = (sealed / chests) * 100;
    expect(rate).toBeGreaterThan(s.chance - 8);
    expect(rate).toBeLessThan(s.chance + 8);
  });

  it('流れ: 封印を解く（器用の判定）→ 番人との戦闘 → 勝つと運のスロットで開けられる', () => {
    let { g, x, roomId } = atSealedChest();
    expect(sealStep(viewOf(g, x).chest!)).toBe('sealed');
    // 封印を解く前なら、立ち去れる
    expect(err(g, inScene(x, { type: 'LEAVE_CHEST', playerId: 'P1' }))).toBeUndefined();
    // フォーカス2（鍵開けと同じ2枠）で、必ず罠を避ける
    const hp = g.heroes.map((h) => h.hp);
    g = run(g, inScene(x, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 2 }));
    let v = viewOf(g, x);
    expect(v.mode).toBe('chest');
    expect(v.chest!.seal).toBe('broken');
    expect(v.chest!.lastRoll).toMatchObject({ kind: 'seal', success: true });
    expect(g.heroes.map((h) => h.hp)).toEqual(hp);
    expect(g.heroes.find((h) => h.id === 'h0')!.focus).toBe(1);
    expect(sealStep(v.chest!)).toBe('guard');
    // 封印を解いたら、もう立ち去れない
    expect(err(g, inScene(x, { type: 'LEAVE_CHEST', playerId: 'P1' }))).toContain('立ち去れない');
    // 番人との戦闘（フォーカスは払わない）
    expect(err(g, inScene(x, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 1 }))).toBeDefined();
    g = run(g, inScene(x, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 }));
    v = viewOf(g, x);
    expect(v.mode).toBe('battle');
    expect(v.battle!.enemies.map((e) => e.defId)).toEqual(['treeWarden']);
    expect(v.chest!.seal).toBe('broken');
    // 勝つ → 報酬 → 宝箱の画面へ戻る（隠し宝箱は出ない）
    g = winGuard(g, x);
    v = viewOf(g, x);
    expect(v.mode).toBe('chest');
    expect(v.chest).toMatchObject({ roomId, seal: 'cleared' });
    expect(sealStep(v.chest!)).toBeUndefined();
    // 運のスロットで開ける → 中身
    g = run(g, inScene(x, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 }));
    v = viewOf(g, x);
    expect(v.chest!.contents?.length).toBeGreaterThan(0);
    expect(v.chest!.lastRoll?.kind).toBe('luck');
    g = run(g, inScene(x, { type: 'LEAVE_CHEST', playerId: 'P1' }));
    expect(viewOf(g, x).dungeon!.rooms.find((r) => r.id === roomId)!.cleared).toBe(true);
  });

  it('罠: 器用の判定に失敗すると、全員が最大HPの15%のダメージと、番人との戦闘の初めに脆弱', () => {
    const s = BALANCE.sealedChest;
    for (let seed = 1; seed < 80; seed++) {
      const { g: g0, x } = atSealedChest();
      g0.rngState = createRng(seed).state;
      const before = g0.heroes.map((h) => h.hp);
      const g = run(g0, inScene(x, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h1', focusUsed: 0 }));
      const roll = viewOf(g, x).chest!.lastRoll!;
      if (roll.success) continue;
      expect(roll.trap).toContain('罠');
      g.heroes.forEach((h, i) => {
        expect(h.hp).toBe(Math.max(1, before[i] - Math.ceil((heroMaxHp(h) * s.trapHpPct) / 100)));
        expect(h.nextBattleStatuses.vulnerable).toBe(s.trapVulnerable);
      });
      const b = viewOf(run(g, inScene(x, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h1', focusUsed: 0 })), x).battle!;
      expect(b.allies.every((a) => a.statuses.vulnerable === s.trapVulnerable)).toBe(true);
      return;
    }
    throw new Error('失敗する種が見つからない');
  });

  it('番人から逃げる・番人に負けると、宝箱は消える', () => {
    let { g, x, roomId } = atSealedChest();
    g = run(g, inScene(x, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 2 }));
    g = run(g, inScene(x, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 }));
    const esc = structuredClone(g);
    esc.expeditions![0].battle!.phase = 'escaped';
    const after = run(esc, inScene(x, { type: 'FINISH_BATTLE', playerId: 'P1' }));
    expect(viewOf(after, x).mode).toBe('dungeon');
    expect(viewOf(after, x).chest).toBeUndefined();
    expect(after.expeditions![0].dungeon!.rooms.find((r) => r.id === roomId)!.cleared).toBe(true);
  });

  it('2人のプレイヤー: 開け役をみんなで決め、その担当の人だけが封印を解き、番人との戦闘を始められる（P2 のキャラでも動く）', () => {
    let { g, x } = atSealedChest(['P1', 'P2']);
    // 開け役が決まるまでは開けられない
    expect(err(g, inScene(x, { type: 'OPEN_CHEST', playerId: 'P2', heroId: 'h1', focusUsed: 0 }))).toBeDefined();
    const pickH1: GameCommand = { type: 'CHEST_OPENER', playerId: 'P1', heroId: 'h1' };
    g = run(g, vote(x, 'P1', pickH1));
    expect(viewOf(g, x).chest!.opener).toBeUndefined();
    g = run(g, vote(x, 'P2', { ...pickH1, playerId: 'P2' }));
    expect(viewOf(g, x).chest!.opener).toBe('h1');
    // 他人（P1）は、P2 のキャラでは解けない
    expect(err(g, inScene(x, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h1', focusUsed: 0 }))).toBeDefined();
    expect(err(g, inScene(x, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 }))).toBeDefined();
    g = run(g, inScene(x, { type: 'OPEN_CHEST', playerId: 'P2', heroId: 'h1', focusUsed: 2 }));
    expect(viewOf(g, x).chest!.seal).toBe('broken');
    // 立ち去る票は、封印を解いた後は入れられない
    expect(err(g, vote(x, 'P1', { type: 'LEAVE_CHEST', playerId: 'P1' }))).toContain('立ち去れない');
    expect(err(g, inScene(x, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h1', focusUsed: 0 }))).toBeDefined();
    g = run(g, inScene(x, { type: 'OPEN_CHEST', playerId: 'P2', heroId: 'h1', focusUsed: 0 }));
    expect(viewOf(g, x).mode).toBe('battle');
    expect(viewOf(g, x).battle!.allies.map((a) => a.id).sort()).toEqual(['h0', 'h1']);
  });

  it('同じ操作の並びなら、別の端末でも同じ結果（乱数は種から）', () => {
    const a = atSealedChest(['P1', 'P2']);
    const b = atSealedChest(['P1', 'P2']);
    const cmds: GameCommand[] = [
      vote(a.x, 'P1', { type: 'CHEST_OPENER', playerId: 'P1', heroId: 'h0' }),
      vote(a.x, 'P2', { type: 'CHEST_OPENER', playerId: 'P2', heroId: 'h0' }),
      inScene(a.x, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 }),
      inScene(a.x, { type: 'OPEN_CHEST', playerId: 'P1', heroId: 'h0', focusUsed: 0 }),
    ];
    let ga = a.g;
    let gb = b.g;
    for (const c of cmds) { ga = run(ga, c); gb = run(gb, c); }
    expect(JSON.stringify(ga)).toBe(JSON.stringify(gb));
  });

  it('先読み: 箱の種類と番人の名前が分かる', () => {
    const { g, x, roomId } = atSealedChest();
    const e = g.expeditions![0];
    const d = e.dungeon!;
    // 1つ前の通路に戻した形（その部屋が「次の扉」になる）
    const room = d.rooms.find((r) => r.id === roomId)!;
    const prev = d.rooms.find((r) => r.next.includes(roomId))!;
    prev.cleared = true;
    d.currentRoomId = prev.id;
    d.watchedAt = prev.id;
    e.mode = 'dungeon';
    e.chest = undefined;
    expect(doorDetail(viewOf(g, x), room)).toBe(`装飾箱・番人：${getEnemy('treeWarden').name}`);
  });
});

// ---------- 直行 bot の扉の選び方・ダンジョンの順番 ----------

describe('自動プレイの扉の選び方（抜本的な見直し §3-1）', () => {
  /** 翠の神殿で、左が戦闘・右が休憩（宝箱）の2つの扉の前に立った形 */
  function atFork(rightType: string, hurt: boolean) {
    const { g, x } = atSealedChest();
    const e = g.expeditions![0];
    const d = e.dungeon!;
    const prev = d.rooms.find((r) => r.next.length >= 2)!;
    const [left, right] = prev.next.map((id) => d.rooms.find((r) => r.id === id)!).sort((a, b) => a.col - b.col);
    for (const r of d.rooms) if (r.row < prev.row) r.cleared = true;
    prev.cleared = true;
    left.type = 'battle';
    left.chest = undefined;
    left.enemies = [{ defId: 'treeWarden', level: 3 }];
    right.type = rightType;
    right.enemies = undefined;
    right.chest = rightType === 'chest' ? { rarity: 'common', locked: false } : undefined;
    d.currentRoomId = prev.id;
    moveIntoRoom(d, prev.id);
    d.opened = undefined;
    e.mode = 'dungeon';
    e.chest = undefined;
    for (const h of g.heroes) h.hp = hurt ? 1 : heroMaxHp(h);
    return { g, x, left: left.id, right: right.id };
  }
  const pick = (g: GameState, straight: boolean) => {
    const cmd = botNextCommand(g, { interacted: new Set(), straight });
    const inner = cmd?.type === 'SCENE' ? cmd.command : cmd;
    return inner?.type === 'ENTER_ROOM' ? inner.roomId : undefined;
  };
  it('普通の bot は予兆の色で選ぶ: 傷ついていれば緑（休憩）、そうでなければ金（宝）。無ければ左端', () => {
    const rest = atFork('rest', true);
    expect(pick(rest.g, false)).toBe(rest.right);
    const fine = atFork('rest', false);
    expect(pick(fine.g, false)).toBe(fine.left);
    const gold = atFork('chest', false);
    expect(pick(gold.g, false)).toBe(gold.right);
  });
  it('直行 bot は予兆を見ない: いつも左端の扉', () => {
    for (const [type, hurt] of [['rest', true], ['chest', false]] as const) {
      const f = atFork(type, hurt);
      expect(pick(f.g, true)).toBe(f.left);
    }
  });
});

describe('ダンジョンの順番ごとの敵のレベル（オーナーが選べるつまみ。今は 0）', () => {
  it('鍵のダンジョンは基準レベルの低い順に 0・1・2、最後のダンジョンは 3、ランダムダンジョンは無し', () => {
    for (const sid of new Set(DUNGEONS.all.map((d) => DUNGEONS.scenarioOf(d.id)))) {
      const list = DUNGEONS.forScenario(sid!);
      const keyed = list.filter((d) => d.rewardKey && !d.random && !d.finale).sort((a, b) => a.baseLevel - b.baseLevel);
      expect(keyed.map(dungeonStage)).toEqual(keyed.map((_, i) => i));
      expect(dungeonStage(list.find((d) => d.finale)!)).toBe(3);
      for (const d of list.filter((q) => q.random)) expect(dungeonStage(d)).toBeUndefined();
    }
  });
  it('今の値は全部 0（敵の基準レベルはデータのまま）', () => {
    expect(BALANCE.dungeonStageLevel).toEqual([0, 0, 0, 0]);
    for (const d of DUNGEONS.all) expect(dungeonEnemyLevel(d)).toBe(d.baseLevel);
  });
});
