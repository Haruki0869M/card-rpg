// ===== データの自動検査（spec §2.4・M3-0）=====
// データを足したり変えたりした時の間違い（参照切れ・未登録の種類・説明文が作れない など）をここで見つける。
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { CARDS } from '../../data/cards';
import { CLASSES } from '../../data/classes';
import { contentVersion } from '../../data/contentVersion';
import { DUNGEONS } from '../../data/dungeons';
import { ELEMENTS } from '../../data/elements';
import { ENCOUNTERS, ENEMIES } from '../../data/enemies';
import { EVENTS } from '../../data/events';
import { ITEMS } from '../../data/items';
import { DIFFICULTIES, ROOM_TYPES, WEAPON_TYPES } from '../../data/rules';
import { SCENARIOS } from '../../data/scenarios';
import { STATUSES } from '../../data/statuses';
import { QUESTS, SANCTUARIES, SHRINES, TERRAINS, TOWNS } from '../../data/world';
import type { AbilityDef, Effect, EventOutcome, GameState } from '../../types';
import {
  conditionHandler,
  createGame,
  describeAbility,
  describeEffect,
  describeOutcome,
  describeStatus,
  growthHandler,
  hasConditionKind,
  hasEffectKind,
  hasEnemyAi,
  hasOutcomeKind,
  hasObjectiveKind,
  hasRoomBehavior,
  objectiveHandler,
  migrateGame,
  validateGame,
} from '../index';

const TARGETS = ['target', 'self', 'allies', 'otherAllies', 'foes', 'randomFoe', 'lowestAlly', 'allyTarget', 'otherFoes'];

/** 効果1つを検査（種類・対象・状態異常のID・説明文） */
function checkEffect(e: Effect, where: string) {
  expect(hasEffectKind(e.kind), `${where}: 未登録の効果 ${e.kind}`).toBe(true);
  if (e.to) expect(TARGETS, `${where}: 対象 ${e.to}`).toContain(e.to);
  if (e.kind === 'applyStatus' && e.bossStatus) expect(STATUSES.has(e.bossStatus), `${where}: ボス用の状態異常 ${e.bossStatus}`).toBe(true);
  if (e.kind === 'applyStatus') expect(STATUSES.has(e.status), `${where}: 未登録の状態異常 ${e.status}`).toBe(true);
  if (e.kind === 'damage' && e.element) expect(ELEMENTS.has(e.element), `${where}: 未登録の属性 ${e.element}`).toBe(true);
  expect(() => describeEffect(e), where).not.toThrow();
}

/** 特殊能力を検査（条件・効果・常時型に確率の条件が無いこと・説明文） */
function checkAbility(ab: AbilityDef, where: string) {
  expect(ab.name, where).toBeTruthy();
  const e = ab.effect;
  const conds = 'if' in e ? (e.if ?? []) : [];
  for (const c of conds) expect(hasConditionKind(c.kind), `${where}: 未登録の条件 ${c.kind}`).toBe(true);
  if ('modifier' in e) {
    for (const c of conds) expect(conditionHandler(c.kind).random, `${where}: 常時型の能力に確率の条件は使えない`).toBeFalsy();
  } else {
    expect(e.do.length, `${where}: 効果が空`).toBeGreaterThan(0);
    for (const x of e.do) checkEffect(x, `${where}.do`);
  }
  expect(() => describeAbility(ab), where).not.toThrow();
}

function checkOutcome(o: EventOutcome, where: string) {
  expect(hasOutcomeKind(o.kind), `${where}: 未登録の結果 ${o.kind}`).toBe(true);
  if (o.kind === 'status') expect(STATUSES.has(o.status), where).toBe(true);
  expect(() => describeOutcome(o), where).not.toThrow();
}

describe('コンテンツの検査', () => {
  it('登録表が空でない（ファイルの置き場所・書き方の間違いを見つける）', () => {
    for (const [name, reg] of Object.entries({ CLASSES, CARDS, ITEMS, ENEMIES, ENCOUNTERS, STATUSES, DUNGEONS, EVENTS, SCENARIOS, WEAPON_TYPES, DIFFICULTIES, ROOM_TYPES }))
      expect(reg.all.length, name).toBeGreaterThan(0);
  });

  it('カード: 効果・特殊能力が正しい', () => {
    for (const c of CARDS.all) {
      for (const t of c.tiers) for (const e of t.effects) checkEffect(e, `card ${c.id}`);
      if (c.trait) checkAbility(c.trait, `card ${c.id} trait`);
    }
  });

  it('職業: 武器の種類・能力が正しい', () => {
    for (const c of CLASSES.all) {
      expect(WEAPON_TYPES.has(c.weaponType), `class ${c.id} weaponType`).toBe(true);
      checkAbility(c.battleAbility, `class ${c.id}`);
    }
  });

  it('装備・消費アイテム: 武器の種類・能力・使った時の効果が正しい', () => {
    for (const i of ITEMS.all) {
      if (i.weaponType) expect(WEAPON_TYPES.has(i.weaponType), `item ${i.id}`).toBe(true);
      if (i.ability) checkAbility(i.ability, `item ${i.id}`);
      // also（同じ名前で持つ2つ目の中身）も同じように調べる
      for (const effect of i.ability?.also ?? []) checkAbility({ name: i.ability!.name, effect }, `item ${i.id} also`);
      for (const e of i.use ?? []) checkEffect(e, `item ${i.id} use`);
    }
  });

  it('敵: 行動の効果・行動の決め方・特殊能力が正しい', () => {
    for (const e of ENEMIES.all) {
      const sets = [{ pattern: e.pattern, actions: e.actions }, ...(e.phases ?? [])];
      for (const s of sets) {
        expect(hasEnemyAi(s.pattern), `enemy ${e.id}: 未登録の行動の決め方 ${s.pattern}`).toBe(true);
        for (const a of s.actions) for (const x of a.effects) checkEffect(x, `enemy ${e.id}.${a.id}`);
      }
      for (const ab of e.abilities ?? []) checkAbility(ab, `enemy ${e.id}`);
      for (const x of [...(e.weak ?? []), ...(e.resist ?? [])]) expect(ELEMENTS.has(x), `enemy ${e.id}: 未登録の属性 ${x}`).toBe(true);
      expect((e.weak ?? []).filter((x) => e.resist?.includes(x)), `enemy ${e.id}: 弱点と耐性が重なっている`).toEqual([]);
    }
  });

  it('状態異常: 説明文が作れる。属性の与える状態異常が登録されている', () => {
    for (const s of STATUSES.all) expect(describeStatus(s), s.id).toBeTruthy();
    for (const el of ELEMENTS.all) if (el.status) expect(STATUSES.has(el.status), `element ${el.id}`).toBe(true);
  });

  it('部屋の種類・難易度: 動きが登録されている', () => {
    for (const r of ROOM_TYPES.all) {
      expect(hasRoomBehavior(r.behavior), `roomType ${r.id}: 未登録の動き ${r.behavior}`).toBe(true);
      if (r.battle) expect(BALANCE.cardRewardOdds[r.battle.cardOdds], `roomType ${r.id} cardOdds`).toBeDefined();
    }
    expect(ROOM_TYPES.all.some((r) => r.battle?.boss)).toBe(true);
    for (const id of ['battle', 'rest', 'chest']) expect(ROOM_TYPES.has(id), `自動生成で使う部屋 ${id}`).toBe(true);
    for (const g of BALANCE.growthExtras) expect(() => growthHandler(g), `growth ${g}`).not.toThrow();
  });

  it('ダンジョン: 部屋の種類・背景の部屋が正しい', () => {
    for (const d of DUNGEONS.all)
      for (const row of d.layout ?? []) for (const r of row) expect(ROOM_TYPES.has(r.type), `dungeon ${d.id}: 部屋 ${r.type}`).toBe(true);
  });

  it('イベント: 結果の種類が正しい', () => {
    for (const ev of EVENTS.all) for (const o of ev.options) for (const x of [...o.success, ...(o.fail ?? [])]) checkOutcome(x, `event ${ev.id}`);
  });

  it('イベント: お金がいる選択肢は、成功した時に実際にそのお金を払う', () => {
    // cost は「払えるか」の条件だけ。実際に減らすのは結果の loseGold（迷い鳥の口笛・珍獣商人で抜けていた）
    const paid = (outs: { kind: string; amount?: number }[]) => outs.filter((x) => x.kind === 'loseGold').reduce((n, x) => n + (x.amount ?? 0), 0);
    for (const ev of EVENTS.all)
      for (const o of ev.options) if (o.cost) expect(paid(o.success), `event ${ev.id}「${o.label}」`).toBeGreaterThanOrEqual(o.cost);
  });

  it('シナリオ: 開始の持ち物が存在する', () => {
    for (const s of SCENARIOS.all) for (const p of [...(s.start.pouch ?? []), ...(s.start.stash ?? [])]) expect(ITEMS.has(p.itemId), `scenario ${s.id}`).toBe(true);
  });

  it('世界マップ: 地形・施設・町・依頼・祠・侵食度の段階が正しい', () => {
    for (const sc of SCENARIOS.all) {
      const m = sc.map;
      if (!m) continue;
      for (const r of m.regions) {
        for (const t of Object.keys(r.terrain)) expect(TERRAINS.has(t), `${sc.id} region ${r.id} terrain ${t}`).toBe(true);
        for (const grp of r.encounters) for (const e of grp) expect(ENEMIES.has(e), `${sc.id} region ${r.id} enemy ${e}`).toBe(true);
        for (const d of r.randomDungeons ?? []) expect(DUNGEONS.has(d), d).toBe(true);
      }
      expect(TERRAINS.has(m.roadTerrain)).toBe(true);
      for (const f of m.features) {
        const reg = { town: TOWNS, dungeon: DUNGEONS, shrine: SHRINES, temple: SANCTUARIES, altar: SANCTUARIES, event: EVENTS, landmark: EVENTS, chest: undefined, tower: undefined }[f.kind];
        if (reg) expect(reg.has(f.id), `${sc.id} feature ${f.kind}:${f.id}`).toBe(true);
        expect(f.at[0] < m.width && f.at[1] < m.height, `${f.id} は地図の中`).toBe(true);
      }
      for (const k of DUNGEONS.forScenario(sc.id).flatMap((d) => [...(d.requiresKeys ?? []), d.rewardKey ?? []].flat()))
        expect(sc.story?.keys?.[k], `鍵 ${k} の名前`).toBeDefined();
    }
    for (const t of TOWNS.all) {
      for (const q of t.quests ?? []) expect(QUESTS.has(q), `town ${t.id} quest ${q}`).toBe(true);
      for (const i of t.shop.fixed ?? []) expect(ITEMS.has(i), `town ${t.id} item ${i}`).toBe(true);
    }
    for (const q of QUESTS.all) {
      expect(hasObjectiveKind(q.objective.kind), `quest ${q.id}`).toBe(true);
      expect(() => objectiveHandler(q.objective).describe(q.objective as never)).not.toThrow();
      for (const o of q.reward) checkOutcome(o, `quest ${q.id}`);
    }
    for (const s of SHRINES.all) for (const o of s.options) for (const x of o.outcomes) checkOutcome(x, `shrine ${s.id}`);
  });

  it('シナリオ専用のデータは、そのシナリオでだけ使われる', () => {
    expect(DUNGEONS.scenarioOf('emeraldTemple')).toBe('corruptionKing');
    expect(DUNGEONS.forScenario('frozenKingdom').some((d) => d.id === 'emeraldTemple')).toBe(false);
    expect(CLASSES.scenarioOf('warrior')).toBeUndefined();
  });

  it('コンテンツの版は同じデータなら同じ値', () => {
    expect(contentVersion()).toMatch(/^[0-9a-f]{16}$/);
    expect(contentVersion()).toBe(contentVersion());
  });
});

describe('保存データの引き継ぎ', () => {
  const fresh = () => createGame({ seed: 1, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }] });

  it('今の版はそのまま読める', () => {
    const g = fresh();
    expect(migrateGame(structuredClone(g))).toEqual(g);
  });

  it('v3（古い特殊能力の書き方）の戦闘中の冒険を直して読める', () => {
    const g = fresh() as GameState & { version: number };
    g.heroes[0].equipment.armor = { uid: 'x', itemId: 'mithrilMail' };
    const old = structuredClone(g) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    old.version = 3;
    old.battle = { version: 3, allies: [{ id: 'h0', abilities: [{ name: '聖銀の守り', effect: { kind: 'turnStartBlock', amount: 5 } }] }] };
    const m = migrateGame(old)!;
    expect(m.version).toBe(g.version);
    expect(m.battle!.allies[0].abilities).toEqual([{ name: '聖銀の守り', effect: { when: 'turnStart', do: [{ kind: 'block', amount: 5 }] }, source: { kind: 'equipment', id: 'mithrilMail', label: 'ミスリルメイル' } }]);
  });

  it('消したデータを参照している冒険は読まない', () => {
    const g = fresh();
    g.heroes[0].stash.push({ uid: 'z', itemId: 'noSuchItem' });
    expect(validateGame(g)).toBe(false);
    expect(migrateGame(g)).toBeNull();
  });

  it('直し方が無い古い版は読まない', () => {
    const g = fresh() as unknown as { version: number };
    g.version = 1;
    expect(migrateGame(g)).toBeNull();
  });
});

describe('拡張性: データを足すだけで新しいものが動く', () => {
  it('新しい状態異常 + それを使うカード + 特殊能力を持つ敵', async () => {
    const { applyCommand, createBattle } = await import('../index');
    STATUSES.register({ id: 'testBleed', name: '出血', icon: 'droplet', color: '#f00', bg: '#300', harmful: true, tickDamage: 3, decay: 0 });
    CARDS.register({
      id: 'testCut',
      name: '切り裂き',
      category: 'physical',
      cost: 1,
      slots: 1,
      baseChance: 95,
      target: 'enemy',
      tiers: [{ minSuccesses: 0, effects: [{ kind: 'applyStatus', status: 'testBleed', amount: 1 }] }],
    });
    ENEMIES.register({
      id: 'testTroll',
      name: '再生するトロル',
      icon: 'T',
      maxHp: 50,
      baseLevel: 1,
      exp: 1,
      gold: 1,
      pattern: 'sequence',
      actions: [{ id: 'wait', name: '様子見', effects: [{ kind: 'block', amount: 1 }] }],
      abilities: [{ name: '再生', effect: { when: 'turnStart', do: [{ kind: 'heal', amount: 2, to: 'self' }] } }],
    });
    let s = createBattle({
      seed: 1,
      party: [{ classId: 'warrior', gender: 'male', name: 't', playerId: 'P1', deck: [{ uid: 'c1', cardId: 'testCut' }] }],
      encounter: { id: 't', name: 't', enemies: [{ defId: 'testTroll' }] },
    });
    s.allies[0].hand = [{ uid: 'c1', cardId: 'testCut' }];
    s = applyCommand(s, { type: 'PLAY_CARD', playerId: 'P1', characterId: 'a0', cardInstanceId: 'c1', targetId: 'e0', focusUsed: 1 }).state;
    expect(s.enemies[0].statuses.testBleed).toBe(1);
    expect(describeStatus(STATUSES.get('testBleed'))).toContain('3ダメージ');
    s = applyCommand(s, { type: 'END_TURN', playerId: 'P1' }).state;
    const hp = s.enemies[0].hp;
    // 敵のフェーズ開始時に「再生」、終了時に出血3ダメージ（減らない）
    const r = applyCommand(s, { type: 'ENEMY_STEP' });
    s = applyCommand(r.state, { type: 'ENEMY_STEP' }).state;
    expect(s.enemies[0].statuses.testBleed).toBe(1);
    expect(s.enemies[0].hp).toBe(hp - 3);
  });
});
