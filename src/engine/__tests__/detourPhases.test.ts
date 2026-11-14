// ===== 寄り道の値打ち（2026-11-14）柱5: 災厄5体の段階・最後の中ボス7戦の段階（「相方が倒れると段階」） =====
// - データ: 全部に開幕の一手と新しい決まりの説明。災厄5体はちがう決まり・最後の中ボスは7本でちがう決まり（コピペにしない）。1段目の紫の札と重ならない
// - 中ボスの段階は、中ボスの部屋の戦闘だけ（同じ敵がふつうの戦闘に出ても段階は無い）
// - 相方が倒れると、残った方が段階に入る（HPの境目とは別）。開幕の一手を予告する
// - 19体それぞれで、境目を越えて何ターンか戦っても落ちない・保存（JSON）をはさんでも同じ
// - 盗賊王の「宝を抱えて逃げる」: 戦闘が終わり、災厄は地図に残る
import { describe, expect, it } from 'vitest';
import { getEnemy, phasesOf } from '../../data/enemies';
import { SCOURGES } from '../../data/world';
import type { BattleState, EnemyPhaseDef, GameCommand, GameState } from '../../types';
import { applyGameCommand, createBattle, createGame } from '../index';
import { makeImmortal, nextTurn, party } from './helpers';
import { loseHp } from '../battle/units';
import { createRng } from '../rng';
import { aliveScourges, scourgeCandidates, scourgeEnemies } from '../game/world/scourges';
import { hexDistance } from '../game/world/hex';

const SCOURGE_BOSSES = SCOURGES.all.map((d) => d.boss);
/** シナリオ → 最後のダンジョンの中ボスの組 */
const MIDS: Record<string, [string, string]> = {
  corruptionKing: ['gatekeeper', 'darkKnight'],
  frozenKingdom: ['frostGuardian', 'iceSwordsman'],
  sandDynasty: ['colossusStatue', 'stoneCat'],
  cursedArchipelago: ['krakenTentacle', 'ghostDeckhand'],
  starCastle: ['skyPaladin', 'skyKnight'],
  clockworkEmpire: ['furnaceGolem', 'ironCopperKnight'],
  dreamLabyrinth: ['dreamWeaver', 'shadowChild'],
};
const MID_IDS = Object.values(MIDS).flat();

/** 段階の決まりの種類（bossPhaseData.test.ts と同じ見方） */
function ruleKind(ph: EnemyPhaseDef): string {
  const op = ph.actions.find((a) => a.id === ph.openingActionId)!;
  if (ph.weak || ph.actions.some((a) => a.weakWhile)) return 'weakSwap';
  if (ph.addWeak) return 'weakAdd';
  if (op.countdown) return 'countdown';
  if (op.chargeTo) return op.behavior ? `charge+${op.behavior}` : 'charge';
  if (op.effects.some((e) => e.kind === 'healToPct')) return 'rewind';
  if (op.behavior) return op.behavior;
  if (op.effects.some((e) => e.kind === 'applyStatus' && e.status === 'regen')) return 'regen';
  return '?';
}

describe('柱5 データ', () => {
  it('災厄5体: HP50%で段階1つ。開幕の一手・決まりの説明がある。5体ともちがう決まりで、1段目の紫の札の種類と重ならない', () => {
    const kinds = SCOURGE_BOSSES.map((id) => {
      const def = getEnemy(id);
      expect(def.phases, id).toHaveLength(1);
      const ph = def.phases![0];
      expect(ph.belowHpPct, id).toBe(50);
      expect(ph.rule!.length, id).toBeGreaterThan(8);
      expect(ph.actions.some((a) => a.id === ph.openingActionId), id).toBe(true);
      expect(ph.actions.filter((a) => !a.scripted).length, id).toBeGreaterThan(0);
      const k = ruleKind(ph);
      expect(k, id).not.toBe('?');
      const base = new Set(def.actions.map((a) => a.behavior).filter(Boolean));
      expect(base.has(k as never), `${id} ${k}`).toBe(false);
      return k;
    });
    expect(new Set(kinds).size).toBe(5);
  });

  it('最後の中ボス14体（7本×2体）: 中ボスだけの段階（相方が倒れても入る）。ふつうの段階（phases）は持たない。7本でちがう決まり、組の2体は同じ決まり', () => {
    const bySc: string[] = [];
    for (const [sc, ids] of Object.entries(MIDS)) {
      const ks = ids.map((id) => {
        const def = getEnemy(id);
        expect(def.phases, id).toBeUndefined();
        expect(def.midbossPhases, id).toHaveLength(1);
        const ph = def.midbossPhases![0];
        expect(ph.onPartnerDown, id).toBe(true);
        expect(ph.belowHpPct, id).toBe(50);
        expect(ph.rule!.length, id).toBeGreaterThan(8);
        expect(ph.actions.filter((a) => !a.scripted).length, id).toBeGreaterThan(0);
        // 新しい行動のIDは、その敵の元の行動と重ならない
        for (const a of ph.actions) expect(def.actions.some((x) => x.id === a.id), `${id} ${a.id}`).toBe(false);
        return ruleKind(ph);
      });
      expect(ks[0], sc).toBe(ks[1]);
      expect(ks[0], sc).not.toBe('?');
      bySc.push(ks[0]);
    }
    expect(new Set(bySc).size).toBe(7);
  });
});

function midFight(sc: string, seed = 7, midboss = true): BattleState {
  const [a, b] = MIDS[sc];
  const s = createBattle({ seed, party: party('warrior', 'priest'), encounter: { id: 'm', name: 'm', ...(midboss ? { midboss: true } : {}), enemies: [{ defId: a, level: 10 }, { defId: b, level: 10 }] } });
  makeImmortal(s);
  return s;
}

describe('柱5 最後の中ボスの戦闘', () => {
  it.each(Object.keys(MIDS))('%s: 中ボスの部屋だけ段階がある（ふつうの戦闘では、HPが半分を切っても変わらない）', (sc) => {
    const plain = midFight(sc, 3, false);
    expect(plain.enemies[0].phaseSet).toBeUndefined();
    expect(phasesOf(plain.enemies[0])).toBeUndefined();
    loseHp(plain, plain.enemies[0], Math.ceil(plain.enemies[0].maxHp * 0.6), createRng(1), []);
    expect(plain.enemies[0].phase).toBe(0);
    const mid = midFight(sc, 3);
    expect(mid.enemies.every((e) => e.phaseSet === 'midboss')).toBe(true);
    loseHp(mid, mid.enemies[0], Math.ceil(mid.enemies[0].maxHp * 0.6), createRng(1), []);
    expect(mid.enemies[0].phase).toBe(1);
  });

  it.each(Object.keys(MIDS))('%s: 相方が倒れると、残った方が段階に入り、次の予告が開幕の一手', (sc) => {
    for (const k of [0, 1]) {
      let s = midFight(sc, 5);
      const dead = s.enemies[k];
      const left = s.enemies[1 - k];
      loseHp(s, dead, dead.hp, createRng(1), []);
      expect(dead.dead).toBe(true);
      expect(left.phase, `${sc} ${k}`).toBe(1);
      expect(s.log.some((l) => l.text.startsWith('相方が倒れ、'))).toBe(true);
      s = nextTurn(s);
      const e = s.enemies[1 - k];
      expect(e.intent?.opening, `${sc} ${k}`).toBe(1);
      const ph = getEnemy(e.defId).midbossPhases![0];
      // 呼べない時は代わりの行動になる（呼ぶ決まりの組）
      expect([ph.openingActionId, ...ph.actions.map((a) => a.id)]).toContain(e.intent!.actionId);
    }
  });

  it('仲間を呼ぶで来た敵（幽霊水夫）は相方に数えない: 呼ばれた水夫が生きていても、組の相手が倒れれば段階に入る', () => {
    const s = midFight('cursedArchipelago', 5);
    const [kraken, ghost] = s.enemies;
    // 仲間を呼ぶで来た水夫（phaseSet なし・summoned なし）
    s.enemies.push({ ...structuredClone(ghost), uid: 'e2', phaseSet: undefined, phase: 0 });
    loseHp(s, ghost, ghost.hp, createRng(1), []);
    expect(kraken.phase).toBe(1);
  });

  it.each(MID_IDS)('%s: 段階で何ターンか戦っても落ちない。JSON をはさんでも同じ', (id) => {
    const sc = Object.keys(MIDS).find((x) => MIDS[x].includes(id))!;
    const runIt = (copy: boolean) => {
      let s = midFight(sc, 9);
      const e = s.enemies.find((x) => x.defId === id)!;
      e.hp = Math.floor(e.maxHp / 2) + 1;
      e.statuses.poison = 8;
      for (let t = 0; t < 6; t++) {
        if (copy && t === 2) s = JSON.parse(JSON.stringify(s));
        s = nextTurn(s);
      }
      return s;
    };
    const a = runIt(false);
    const b = runIt(true);
    expect(a.enemies.find((x) => x.defId === id)!.phase).toBe(1);
    expect(JSON.parse(JSON.stringify(b.enemies))).toEqual(JSON.parse(JSON.stringify(a.enemies)));
    expect(b.log.map((l) => l.text)).toEqual(a.log.map((l) => l.text));
  });
});

describe('柱5 災厄の段階の戦闘', () => {
  const fight = (id: string, seed: number) => {
    const s = createBattle({ seed, party: party('warrior', 'priest'), encounter: { id: 's', name: 's', midboss: true, enemies: [{ defId: id, level: 8 }] } });
    makeImmortal(s);
    return s;
  };
  it.each(SCOURGE_BOSSES)('%s: 境目を越えると開幕の一手。何ターンか戦っても落ちない。JSON をはさんでも同じ', (id) => {
    const runIt = (copy: boolean) => {
      let s = fight(id, 4);
      const e = s.enemies[0];
      e.hp = Math.floor(e.maxHp / 2) + 1;
      e.statuses.poison = 6;
      const opens: string[] = [];
      for (let t = 0; t < 7 && s.phase !== 'victory'; t++) {
        if (copy && t === 2) s = JSON.parse(JSON.stringify(s));
        s = nextTurn(s);
        const b = s.enemies[0];
        if (b.intent?.opening) opens.push(b.intent.actionId);
      }
      return { s, opens };
    };
    const a = runIt(false);
    const b = runIt(true);
    expect(a.s.enemies[0].phase).toBe(1);
    expect(a.opens).toEqual([getEnemy(id).phases![0].openingActionId]);
    expect(JSON.parse(JSON.stringify(b.s.enemies))).toEqual(JSON.parse(JSON.stringify(a.s.enemies)));
  });

  it('盗賊王: 数え読みが0になると、取り巻きと一緒に逃げて戦闘が終わる（BREAK しなければ）', () => {
    let s = createBattle({ seed: 2, party: party('warrior', 'priest'), encounter: { id: 's', name: 's', midboss: true, enemies: [{ defId: 'scourgeGreedKing', level: 8 }, { defId: 'banditThug', level: 8 }] } });
    makeImmortal(s);
    const e = s.enemies[0];
    loseHp(s, e, Math.ceil(e.maxHp * 0.55), createRng(1), []);
    expect(e.phase).toBe(1);
    for (let t = 0; t < 8 && s.phase !== 'victory'; t++) s = nextTurn(s);
    expect(s.phase).toBe('victory');
    expect(s.enemies.every((x) => x.dead && x.fled)).toBe(true);
  });
});

// ---------- 盗賊王が逃げた時の世界マップ ----------

function run(g: GameState, cmd: GameCommand): GameState {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
}

describe('柱5 盗賊王の「宝を抱えて逃げる」の後', () => {
  it('倒したことにならない: 災厄は地図に残り（悪さと加護も）、パーティは前のマスへ。専用の装備は落とさない', () => {
    let g = createGame({ seed: 5, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'thief', gender: 'male', name: 'h0', playerId: 'P1' }] });
    g = run(g, { type: 'STORY_CONTINUE', playerId: 'P1' });
    const w = g.world!;
    const tile = scourgeCandidates(g, w)[0];
    w.wanderers.push({ id: `w${w.nextWandererId++}`, tile, enemies: scourgeEnemies(g, w, SCOURGES.get('greedKing'), tile), scourge: 'greedKing' });
    w.scourgesMet = ['greedKing'];
    const next = w.tiles.findIndex((t, i) => !t.f && hexDistance(w, i, tile) === 1 && !w.wanderers.some((x) => x.tile === i));
    w.pos.h0 = next;
    w.turn = 'h0';
    w.move = 3;
    w.moveDice = undefined;
    w.prevTile = next;
    w.tiles[tile].seen = true;
    g = run(g, { type: 'WORLD_MOVE', playerId: 'P1', heroId: 'h0', to: tile, companions: [] });
    g = run(g, { type: 'ENCOUNTER_CHOOSE', playerId: 'P1', choice: 'fight', heroId: 'h0', focusUsed: 0, participants: ['h0'] });
    const b = g.battle!;
    for (const e of b.enemies) (e.dead = true), (e.fled = true);
    b.phase = 'victory';
    const stash = g.heroes[0].stash.length;
    g = run(g, { type: 'FINISH_BATTLE', playerId: 'P1' });
    expect(aliveScourges(g.world).map(({ def }) => def.id)).toEqual(['greedKing']);
    expect(g.world!.pos.h0).toBe(next);
    expect(g.heroes[0].stash.length).toBe(stash);
    expect(g.reward?.claim).toBeUndefined();
  });
});
