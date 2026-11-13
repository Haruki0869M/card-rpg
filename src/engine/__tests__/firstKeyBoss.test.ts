// 1つ目の鍵のダンジョンのボスだけ、大技の BREAK は今までどおり（2026-11-13 オーナーの OK・pre-deploy19 の問題 A2）
// - 各シナリオの、鍵の順番で1つ目のダンジョン（鍵をくれて、入るのに鍵が要らない）のボスの部屋 → 弱点で攻撃／完全成功／合計ダメージのどれかで崩れる
// - 2つ目より後のボス・中ボス・災厄・ランダムダンジョンのボス → 今の決まり（弱点の属性で、しかも完全成功）
// - 紫の札（特殊な行動）は、どこでも今の決まり（弱点で完全成功）
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { DUNGEONS, isFirstKeyDungeon } from '../../data/dungeons';
import { getEnemy } from '../../data/enemies';
import { getRoomType } from '../../data/rules';
import { SCENARIOS } from '../../data/scenarios';
import type { BattleState, GameState, PlayerId } from '../../types';
import { applyCommand, buildDungeon, createBattle, createGame, createRng, startRoomBattle } from '../index';
import { breakRuleOf } from '../battle/breakRules';
import { breakHowText } from '../../components/format';
import { topicOf } from '../../components/help/helpTopics';
import { giveHand, party, play } from './helpers';

/** 7本の「鍵の順番で1つ目のダンジョン」（データから決まる物を、手で確かめた表） */
const FIRST: Record<string, string> = {
  corruptionKing: 'emeraldTemple',
  frozenKingdom: 'crystalCave',
  sandDynasty: 'scorpionTomb',
  clockworkEmpire: 'gearFactory',
  cursedArchipelago: 'wreckCave',
  starCastle: 'windmillTower',
  dreamLabyrinth: 'echoIceVault',
};

/** そのシナリオの鍵のダンジョンを、鍵の順番（requiresKeys のつながり）に並べる */
function keyOrder(scenarioId: string) {
  const keyed = DUNGEONS.forScenario(scenarioId).filter((d) => d.rewardKey && !d.random);
  const out = keyed.filter((d) => isFirstKeyDungeon(d));
  while (out.length < keyed.length) {
    const next = keyed.find((d) => !out.includes(d) && d.requiresKeys?.includes(out[out.length - 1].rewardKey!));
    if (!next) break;
    out.push(next);
  }
  return out;
}

function gameOf(scenarioId: string): GameState {
  const g = createGame({ seed: 7, scenarioId, difficulty: 'normal', party: ['warrior', 'priest'].map((c, i) => ({ classId: c, gender: 'male', name: `${c}${i}`, playerId: 'P1' as PlayerId })) });
  g.party = g.heroes.map((h) => h.id);
  return g;
}
/** そのダンジョンのボスの部屋の戦闘を、本物の流れ（startRoomBattle）で始める */
function bossBattle(scenarioId: string, dungeonId: string): BattleState {
  const g = gameOf(scenarioId);
  g.dungeon = buildDungeon(dungeonId, createRng(1), 0, []);
  const room = g.dungeon.rooms.find((r) => getRoomType(r.type).battle?.boss)!;
  expect(room, dungeonId).toBeDefined();
  startRoomBattle(g, room, createRng(2));
  return g.battle!;
}
/** そのボスの部屋の戦闘で、ボスに赤い大技（紫でない大技）を予告させる */
function withRedIntent(b: BattleState): BattleState {
  const s = structuredClone(b);
  const e = s.enemies[0];
  const act = getEnemy(e.defId).actions.find((a) => a.big && !a.behavior);
  expect(act, e.defId).toBeDefined();
  e.hp = e.maxHp = 100000;
  e.broken = false;
  e.intent = { actionId: act!.id, targetId: s.allies[0].id };
  for (const a of s.allies) { a.hp = a.maxHp = 9999; a.dead = false; }
  return s;
}
const whys = (events: { type: string }[]) => (events.filter((e) => e.type === 'break') as unknown as { why: string }[]).map((e) => e.why);
/** 属性の無い一撃（ヘビースイング）を完全成功で当てる。exposed = 弱点看破の印（弱点を突いた扱い） */
function perfectHit(b: BattleState, exposed = false) {
  const s = withRedIntent(b);
  if (exposed) s.enemies[0].exposed = true;
  const me = s.allies[0];
  const [card] = giveHand(s, me.id, ['heavySwing']);
  me.focus = me.focusMax = 3;
  me.mana = 10;
  s.phase = 'ally';
  const r = applyCommand(s, play(me.id, card.uid, s.enemies[0].uid, 3));
  expect(r.error).toBeUndefined();
  return whys(r.events);
}

describe('1つ目の鍵のダンジョンのボスは、BREAK が今までどおり', () => {
  it('7本とも: 「鍵の順番で1つ目のダンジョン」はデータから1つだけ決まり、鍵の順番の先頭', () => {
    expect(SCENARIOS.all.length).toBe(7);
    for (const sc of SCENARIOS.all) {
      const firsts = DUNGEONS.forScenario(sc.id).filter((d) => isFirstKeyDungeon(d));
      expect(firsts.map((d) => d.id), sc.id).toHaveLength(1);
      // シナリオの鍵の並び（story.keys）の1つ目の鍵をくれる
      expect(firsts[0].rewardKey, sc.id).toBe(Object.keys(sc.story?.keys ?? {})[0]);
      const order = keyOrder(sc.id);
      expect(order.length, sc.id).toBe(3);
      expect(firsts[0].id, sc.id).toBe(FIRST[sc.id]);
      expect(order[0].id, sc.id).toBe(FIRST[sc.id]);
    }
    // ランダムダンジョン・最後のダンジョンは当たらない
    for (const d of DUNGEONS.all.filter((x) => x.random || x.finale)) expect(isFirstKeyDungeon(d), d.id).toBe(false);
  });

  it('7本とも: 1つ目のボスは完全成功（弱点でない一撃）で崩れる。2つ目のボスは崩れない（弱点で完全成功なら崩れる）', () => {
    for (const sc of SCENARIOS.all) {
      const [first, second, third] = keyOrder(sc.id);
      const b1 = bossBattle(sc.id, first.id);
      expect(b1.boss, sc.id).toBe(true);
      expect(b1.firstKeyBoss, `${sc.id} ${first.id}`).toBe(true);
      expect(perfectHit(b1), `${sc.id} ${first.id}`).toEqual(['perfect']);
      const r1 = breakRuleOf(b1, b1.enemies[0]);
      expect(r1.strictBy, sc.id).toBeUndefined();
      expect(r1.damagePct, sc.id).toBe(BALANCE.breakDamagePct);

      for (const later of [second, third]) {
        const b2 = bossBattle(sc.id, later.id);
        expect(b2.boss).toBe(true);
        expect(b2.firstKeyBoss, `${sc.id} ${later.id}`).toBeUndefined();
        const weak = (getEnemy(b2.enemies[0].defId).weak ?? []).length > 0;
        // 弱点を持つボスは、完全成功だけでは崩れない。弱点で完全成功（弱点看破の印）なら崩れる
        expect(perfectHit(b2), `${sc.id} ${later.id}`).toEqual(weak ? [] : ['perfect']);
        expect(perfectHit(b2, true), `${sc.id} ${later.id}`).toEqual(['weak']);
      }
    }
  });

  it('最後のダンジョンの中ボス・ボス、ランダムダンジョンのボスには当たらない', () => {
    for (const sc of SCENARIOS.all) {
      const fin = DUNGEONS.forScenario(sc.id).find((d) => d.finale)!;
      const g = gameOf(sc.id);
      g.dungeon = buildDungeon(fin.id, createRng(1), 0, []);
      for (const room of g.dungeon.rooms.filter((r) => getRoomType(r.type).battle?.boss || getRoomType(r.type).battle?.pool === 'midboss')) {
        startRoomBattle(g, room, createRng(2));
        expect(g.battle!.firstKeyBoss, `${sc.id} ${room.type}`).toBeUndefined();
      }
      const rnd = DUNGEONS.forScenario(sc.id).find((d) => d.random);
      if (rnd) {
        g.dungeon = buildDungeon(rnd.id, createRng(1), 0, []);
        const boss = g.dungeon.rooms.find((r) => getRoomType(r.type).battle?.boss);
        if (boss) {
          startRoomBattle(g, boss, createRng(2));
          expect(g.battle!.firstKeyBoss, `${sc.id} random`).toBeUndefined();
        }
      }
    }
  });

  it('1つ目のボスの戦闘でも、紫の札は今の決まり（弱点で完全成功）', () => {
    const s = createBattle({ seed: 5, party: party('warrior', 'mage'), encounter: { id: 't', name: 't', enemies: [{ defId: 'mireSlime', level: 10 }], boss: true, firstKeyBoss: true } });
    s.enemies[0].hp = s.enemies[0].maxHp = 100000;
    s.enemies[0].intent = { actionId: 'harden', targetId: 'a0' };
    const rule = breakRuleOf(s, s.enemies[0]);
    expect(rule).toMatchObject({ weakAndPerfect: true, strictBy: 'behavior' });
    const [card] = giveHand(s, 'a0', ['heavySwing']);
    s.allies[0].focus = 3;
    expect(whys(applyCommand(s, play('a0', card.uid, 'e0', 3)).events)).toEqual([]);
  });

  it('長押しの文・ヘルプの文も、同じ決まりの関数から', () => {
    const s = createBattle({ seed: 5, party: party('warrior', 'mage'), encounter: { id: 't', name: 't', enemies: [{ defId: 'gatekeeper', level: 10 }], boss: true, firstKeyBoss: true } });
    s.enemies[0].intent = { actionId: 'crush', targetId: 'a0' };
    expect(breakHowText(s, s.enemies[0])).toBe(`弱点の属性（雷）で攻撃・完全成功で攻撃・このターンに最大HPの${BALANCE.breakDamagePct}%のダメージ、のどれかで体勢を崩せる`);
    const text = JSON.stringify(topicOf('battle'));
    expect(text).toContain('1つ目の鍵のダンジョンのボスの大技は、今までどおり崩せます');
  });
});
