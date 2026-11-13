// 強敵の計画（2026-11-13 docs/tasks/elite-plan.md）の柱1・柱2・柱4 を確かめる。
// 柱1 強敵の本気: 強敵の戦闘の本体（強敵の組から来た敵）が、HPが最大の半分を切った後の予告で、いちばん強い攻撃を ×1.5 で予告する。1戦闘に1回。
//   奥で足されるふつうの戦闘の敵・ふつうの戦闘・ボスでは起きない。味方の番に半分を切っても、今の予告は書き換えない（次の敵の番の予告から）。
// 柱2 強敵の本体のHP: BALANCE.enemyHpByRank.elite は本体だけに掛かる（足されるふつうの敵・町を襲う敵には掛からない）。
// 柱4 強敵の装備のエピック率: 深層ボーナスの段で 10 / 10 / 20 / 35%。
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { DUNGEONS } from '../../data/dungeons';
import { getEnemy } from '../../data/enemies';
import { getRoomType, ROOM_TYPES } from '../../data/rules';
import type { BattleState, EncounterSpec, PlayerId } from '../../types';
import { applyCommand, buildDungeon, createBattle, createGame, createRng, equipmentEpicChance, frenzyReady, intentHitsOn, startBattleWith, startRoomBattle, strongestAttack } from '../index';
import { intentView } from '../../components/format';
import { giveHand, makeImmortal, nextTurn, party, play } from './helpers';

/** 門番ガルザ（本体）＋魔王軍の騎士（足された敵の役）。flags で戦闘の格を決める */
function fight(flags: Partial<Pick<EncounterSpec, 'elite' | 'boss' | 'midboss'>> = { elite: true }, seed = 3, classes = ['warrior', 'priest']): BattleState {
  const s = createBattle({
    seed,
    party: party(...classes),
    encounter: { id: 't', name: 't', enemies: [{ defId: 'gatekeeper', level: 10, eliteBody: true }, { defId: 'darkKnight', level: 10 }], ...flags },
  });
  makeImmortal(s);
  return s;
}
const half = (s: BattleState, i: number) => {
  s.enemies[i].hp = Math.floor(s.enemies[i].maxHp * 0.5) - 1;
};

describe('柱1 強敵の本気', () => {
  it('本体だけに印が付き、HPが半分を切った後の予告で、いちばん強い攻撃を ×1.5 で予告する', () => {
    const s = fight();
    expect(s.enemies[0].eliteBody).toBe(true);
    expect(s.enemies[1].eliteBody).toBeUndefined();
    expect(s.enemies[0].intent?.frenzy).toBeUndefined();
    half(s, 0);
    half(s, 1);
    const t = nextTurn(s);
    const g = t.enemies[0];
    expect(g.intent?.frenzy).toBe(true);
    // 2人の時: 大斧の一撃 24（単体）＞ 大旋風 11×2人 = 22
    expect(g.intent?.actionId).toBe('crush');
    expect(g.nextActionMultiplier).toBe(BALANCE.eliteFrenzy.power);
    expect(g.frenzyUsed).toBe(true);
    // 足された敵（本体でない）は本気にならない
    expect(t.enemies[1].intent?.frenzy).toBeUndefined();
    expect(t.enemies[1].frenzyUsed).toBeUndefined();
    // 画面: 🔥本気の札・案内
    const v = intentView(t, g)!;
    expect(v.frenzy?.label).toBe('本気');
    expect(v.frenzy?.long).toContain('HPが半分を切って本気になった');
    expect(v.big).toBe(true);
  });

  it('全体攻撃は生きている味方の人数で数える（3人なら 大旋風 11×3 = 33 ＞ 24）', () => {
    const s = fight({ elite: true }, 3, ['warrior', 'mage', 'priest']);
    half(s, 0);
    expect(strongestAttack(s.enemies[0], s)?.id).toBe('whirl');
  });

  it('威力は ×1.5（予告の値と、実際に受けるダメージが同じ）', () => {
    const s = fight();
    half(s, 0);
    const t = nextTurn(s);
    const g = t.enemies[0];
    const target = t.allies.find((a) => a.id === g.intent!.targetId)!;
    const hits = intentHitsOn(g, target);
    const plain = intentHitsOn({ ...g, nextActionMultiplier: undefined }, target);
    expect(hits[0]).toBeGreaterThan(plain[0]);
    // 敵の番: 足された敵に先に動かれないよう、騎士は倒しておく
    const u = structuredClone(t);
    u.enemies[1].dead = true;
    u.enemies[1].intent = undefined;
    const ph = applyCommand(u, { type: 'END_TURN', playerId: 'P1' }).state;
    const tg = ph.allies.find((a) => a.id === g.intent!.targetId)!;
    const expected = intentHitsOn(ph.enemies[0], tg);
    const step = applyCommand(ph, { type: 'ENEMY_STEP' });
    const dealt = step.events.filter((e) => e.type === 'damage' && e.unitId === tg.id).map((e) => (e.type === 'damage' ? e.rawAmount ?? e.amount + e.blocked : 0));
    expect(dealt).toEqual(expected);
    // 大斧の一撃 24 × 1.5 = 36 が元の値（攻撃の補正の前）
    expect(Math.floor(24 * BALANCE.eliteFrenzy.power)).toBe(36);
  });

  it('1戦闘に1回だけ（本気の後もHPが半分より下のままでも、次の予告はふつう）', () => {
    const s = fight();
    half(s, 0);
    let t = nextTurn(s);
    expect(t.enemies[0].intent?.frenzy).toBe(true);
    t = nextTurn(t);
    expect(t.enemies[0].hp).toBeLessThan(t.enemies[0].maxHp / 2);
    expect(t.enemies[0].intent?.frenzy).toBeUndefined();
    expect(t.enemies[0].nextActionMultiplier).toBeUndefined();
    t = nextTurn(t);
    expect(t.enemies[0].intent?.frenzy).toBeUndefined();
  });

  it('味方の番に半分を切っても、今の予告は書き換えない（次の敵の番の予告から本気）', () => {
    const s = fight();
    const before = structuredClone(s.enemies[0].intent);
    const me = s.allies[0];
    const [card] = giveHand(s, me.id, ['heavySwing']);
    me.mana = 10;
    s.enemies[0].hp = Math.floor(s.enemies[0].maxHp * 0.5) + 1; // 一撃で半分を切る所に
    const r = applyCommand(s, play(me.id, card.uid, s.enemies[0].uid, 0));
    expect(r.error).toBeUndefined();
    const e = r.state.enemies[0];
    if (!e.dead) {
      expect(e.hp).toBeLessThan(e.maxHp / 2);
      expect(e.intent).toEqual(before);
      expect(e.nextActionMultiplier ?? 1).not.toBe(BALANCE.eliteFrenzy.power);
      expect(frenzyReady(e, r.state)).toBe(true);
    }
  });

  it('ふつうの戦闘・ボス・中ボスでは起きない（本体の印が付いていても）', () => {
    for (const f of [{}, { elite: true, boss: true }, { elite: true, midboss: true }, { boss: true }]) {
      const s = fight(f as never);
      half(s, 0);
      const t = nextTurn(s);
      expect(t.enemies[0].intent?.frenzy, JSON.stringify(f)).toBeUndefined();
      expect(t.enemies[0].eliteBody, JSON.stringify(f)).toBeUndefined();
    }
  });

  it('保存して再開しても同じ（JSON に書き出して読み直した戦闘で、同じ予告・同じ結果）', () => {
    const s = fight();
    half(s, 0);
    const a = nextTurn(structuredClone(s));
    const b = nextTurn(JSON.parse(JSON.stringify(s)) as BattleState);
    expect(b.enemies[0].intent).toEqual(a.enemies[0].intent);
    expect(b.enemies[0].nextActionMultiplier).toBe(a.enemies[0].nextActionMultiplier);
    const a2 = nextTurn(a);
    const b2 = nextTurn(JSON.parse(JSON.stringify(b)) as BattleState);
    expect(b2.allies.map((x) => x.hp)).toEqual(a2.allies.map((x) => x.hp));
    expect(b2.rngState).toBe(a2.rngState);
  });

  it('凍結・時間停止で本気の行動を休ませると、本気はそのまま使い切り（1戦闘に1回）', () => {
    const s = fight();
    half(s, 0);
    const t = nextTurn(s);
    t.enemies[0].skipNextAction = true;
    const u = nextTurn(t);
    expect(u.enemies[0].frenzyUsed).toBe(true);
    expect(u.enemies[0].intent?.frenzy).toBeUndefined();
  });

  it('強敵の組にいる敵は、どれもダメージの行動を持つ（本気になれる）', () => {
    const ids = new Set(DUNGEONS.all.flatMap((d) => d.pools.elite.flat()));
    for (const id of ids) expect(getEnemy(id).actions.some((a) => a.effects.some((e) => e.kind === 'damage')), id).toBe(true);
  });
});

function gameOf(classes = ['warrior', 'priest']) {
  const g = createGame({ seed: 7, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((c, i) => ({ classId: c, gender: 'male', name: `${c}${i}`, playerId: 'P1' as PlayerId })) });
  g.party = g.heroes.map((h) => h.id);
  return g;
}

describe('柱1・柱2 強敵の本体の見分け方とHP', () => {
  it('ダンジョンの強敵の部屋: 強敵の組の敵だけが本体（4行目から足されるふつうの戦闘の敵は本体でない）', () => {
    const run = buildDungeon('emeraldTemple', createRng(5), 0, []);
    const deep = run.rooms.filter((r) => r.type === 'elite' && r.row >= 4);
    expect(deep.length).toBeGreaterThan(0);
    const pools = DUNGEONS.get('emeraldTemple').pools;
    for (const r of run.rooms.filter((x) => x.type === 'elite')) {
      const bodies = r.enemies!.filter((e) => e.eliteBody).map((e) => e.defId);
      expect(pools.elite.some((g) => g.join() === bodies.join()), r.id).toBe(true);
      if (r.row >= 4 && bodies.length < BALANCE.maxEnemies) expect(r.enemies!.at(-1)!.eliteBody, r.id).toBeUndefined();
    }
    // ふつうの戦闘・ボスの部屋には付かない
    for (const r of run.rooms.filter((x) => x.type !== 'elite' && !getRoomType(x.type).sealedChest)) for (const e of r.enemies ?? []) expect(e.eliteBody, r.id).toBeUndefined();
  });

  it('封魔の宝箱の番人も、強敵の組なので本体', () => {
    const sealed = ROOM_TYPES.all.find((t) => t.sealedChest)!;
    for (let seed = 1; seed < 200; seed++) {
      const run = buildDungeon('demonCastle', createRng(seed), 0, []);
      const room = run.rooms.find((r) => r.type === sealed.id);
      if (!room) continue;
      expect(room.enemies!.some((e) => e.eliteBody)).toBe(true);
      return;
    }
    throw new Error('封魔の宝箱が出る種が見つからない');
  });

  it('本体だけHPが enemyHpByRank.elite 倍（足された敵は1倍）', () => {
    const g = gameOf();
    g.dungeon = buildDungeon('emeraldTemple', createRng(5), 0, []);
    const room = g.dungeon.rooms.find((r) => r.type === 'elite' && r.row >= 4 && r.enemies!.some((e) => !e.eliteBody))!;
    expect(room).toBeDefined();
    startRoomBattle(g, room, createRng(2));
    const withMul = g.battle!.enemies.map((e) => e.maxHp);
    const flags = g.battle!.enemies.map((e) => !!e.eliteBody);
    const g2 = gameOf();
    g2.dungeon = structuredClone(g.dungeon);
    const room2 = g2.dungeon.rooms.find((r) => r.id === room.id)!;
    room2.enemies = room2.enemies!.map(({ defId, level }) => ({ defId, level }));
    startRoomBattle(g2, room2, createRng(2));
    const plain = g2.battle!.enemies.map((e) => e.maxHp);
    const mul = BALANCE.enemyHpByRank.elite ?? 1;
    flags.forEach((body, i) => {
      if (body) expect(Math.abs(withMul[i] - plain[i] * mul)).toBeLessThanOrEqual(1);
      else expect(withMul[i]).toBe(plain[i]);
    });
    expect(flags.some(Boolean)).toBe(true);
    // 本体の印の無い戦闘（町を襲う敵と同じ形）は、だれも本気にならない
    expect(g2.battle!.enemies.every((e) => !e.eliteBody)).toBe(true);
  });

  it('町を襲う敵（強敵の部屋の種類だが、組はふつうの徘徊の組）は本体でない: HPの倍率も本気も無い', () => {
    const g = gameOf();
    startBattleWith(g, [{ defId: 'darkKnight', level: 8 }], 'elite', createRng(1));
    expect(g.battle!.elite).toBe(true);
    expect(g.battle!.enemies[0].eliteBody).toBeUndefined();
    const g2 = gameOf();
    startBattleWith(g2, [{ defId: 'darkKnight', level: 8 }], 'battle', createRng(1));
    expect(g.battle!.enemies[0].maxHp).toBe(g2.battle!.enemies[0].maxHp);
  });
});

describe('柱4 強敵の装備のエピック率（深さで上がる）', () => {
  it('入口・浅層 10% → 中層 20% → 深層 35%（それより深くても 35%）', () => {
    const drop = getRoomType('elite').battle!.equipmentDrop!;
    expect([0, 1, 2, 3, 4].map((t) => equipmentEpicChance(drop, t))).toEqual([10, 10, 20, 35, 35]);
    expect(BALANCE.eliteEpicChanceByDepth).toEqual([10, 10, 20, 35]);
  });
  it('中ボスの部屋は今までどおり（深さで変わらない）', () => {
    const drop = getRoomType('midboss').battle!.equipmentDrop!;
    expect([0, 1, 2, 3].map((t) => equipmentEpicChance(drop, t))).toEqual([30, 30, 30, 30]);
  });
});
