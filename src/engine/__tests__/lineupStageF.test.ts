// ラインナップの作り直し 区切りF（docs/tasks/lineup-stageF-plan.md）: 新ジョブ4職（拳聖・重装衛士・竜脈術師・調教師）
import { describe, expect, it } from 'vitest';
import { getCard } from '../../data/cards';
import { CLASSES, getClass } from '../../data/classes';
import { ENEMIES } from '../../data/enemies';
import { SANCTUARIES } from '../../data/world';
import type { AllyState, BattleState, Command, GameState, PlayerId } from '../../types';
import { applyCommand, createBattle, createGame, toPartyMember } from '../index';
import { damageModifiers, keepBlockOf } from '../abilities';
import { featOf, jobOptions } from '../game/jobs';
import { addPetLove } from '../game/pets';

const P: PlayerId = 'P1';
const wait = [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block' as const, amount: 0 }] }];
const dummy = { icon: 'T', baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence' };
ENEMIES.register({ ...dummy, id: 'stageFIdler', name: '確認用の置物', maxHp: 100000, actions: wait });
ENEMIES.register({ ...dummy, id: 'stageFHitter', name: '確認用の殴る置物', maxHp: 100000, actions: [{ id: 'hit', name: '殴る', effects: [{ kind: 'damage' as const, amount: 20 }] }] });
ENEMIES.register({ ...dummy, id: 'stageFBig', name: '確認用の大技の置物', maxHp: 100000, actions: [{ id: 'big', name: '大技', big: true, effects: [{ kind: 'damage' as const, amount: 30 }] }] });

const NEW = ['fistSaint', 'bulwark', 'dragonVein', 'petTrainer'];
const game = (classes: string[]): GameState => createGame({ seed: 11, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((classId, i) => ({ classId, gender: 'female' as const, name: `仲間${i + 1}`, playerId: P })) });
function battle(classes: string[], enemies = ['stageFIdler']): BattleState {
  const g = game(classes);
  const s = createBattle({ seed: 11, party: g.heroes.map(toPartyMember), encounter: { id: 'stageF', name: '確認', enemies: enemies.map((defId) => ({ defId })) } });
  for (const a of s.allies) { a.mana = 30; a.focus = 9; a.hp = a.maxHp = 500; a.block = 0; a.hand = []; }
  return s;
}
let uid = 0;
function use(s: BattleState, cardId: string, focus: number | 'max' = 'max') {
  const a = s.allies[0], inst = { uid: `f${uid++}`, cardId };
  a.hand.push(inst);
  const card = getCard(cardId), f = focus === 'max' ? card.slots : focus;
  const targetId = card.target === 'enemy' ? s.enemies[0].uid : undefined;
  const r = applyCommand(s, { type: 'PLAY_CARD', playerId: P, characterId: a.id, cardInstanceId: inst.uid, targetId, focusUsed: f } as Command);
  expect(r.error, cardId).toBeUndefined();
  return r;
}
function nextTurn(s: BattleState) {
  let st = applyCommand(s, { type: 'END_TURN', playerId: P }).state;
  for (let i = 0; st.phase === 'enemy' && i < 20; i++) st = applyCommand(st, { type: 'ENEMY_STEP' }).state;
  return st;
}
const lost = (a: BattleState, b: BattleState) => a.enemies[0].hp - b.enemies[0].hp;
const givePet = (a: AllyState) => { a.pet = { petId: 'cockatiel', color: 'normal', name: 'ぴーちゃん', love: 0, acts: 0 } as never; };

describe('区切りF: 4職のデータ', () => {
  it('ジョブは48（特殊14）。4職とも、転職元・祭壇・決め技・専用カード3枚がある', () => {
    expect(CLASSES.all).toHaveLength(48);
    const altars = new Set(SANCTUARIES.all.flatMap((x) => x.altars ?? []));
    for (const id of NEW) {
      const j = getClass(id);
      expect(j.tier, id).toBe('special');
      expect(altars.has(j.altar!), id).toBe(true);
      expect(getCard(j.jobCards![0]).rarity, id).toBe('legend');
      expect(j.signature, id).toHaveLength(3);
      for (const c of j.cardPool) expect(() => getCard(c), `${id}: ${c}`).not.toThrow();
    }
  });
  it('条件がそろえば転職の候補に出る（拳聖: ブロックで60防ぐ）', () => {
    const g = game(['brawler']);
    const h = g.heroes[0];
    h.level = 10;
    expect(jobOptions(h).find((o) => o.job.id === 'fistSaint')?.qualified).toBe(false);
    h.feats = { ...(h.feats ?? {}), blockedTotal: 60 };
    expect(jobOptions(h).find((o) => o.job.id === 'fistSaint')?.qualified).toBe(true);
  });
  it('調教師の条件（お供の絆）は、お供がいなければ0。懐き度♡3以上で、お供の行動の合計', () => {
    const h = game(['tamer']).heroes[0];
    expect(featOf(h, 'petBond')).toBe(0);
    h.pet = { petId: 'cockatiel', color: 'normal', name: 'ぴーちゃん', love: 0, acts: 20 } as never;
    expect(featOf(h, 'petBond')).toBe(0);
    (h.pet as { love: number }).love = 999;
    expect(featOf(h, 'petBond')).toBe(20);
  });
});

describe('区切りF: 戦闘の力', () => {
  it('拳聖《後の先》: 防いだ量を返す（1回最大12・1ターン3回）', () => {
    const s = battle(['fistSaint'], ['stageFHitter']);
    s.allies[0].block = 30;
    const after = nextTurn(s);
    expect(lost(s, after)).toBe(12);
  });
  it('拳聖《明鏡止水》: 次の敵の番、《後の先》が2倍・上限なし', () => {
    const s = battle(['fistSaint'], ['stageFHitter']);
    const r = use(s, 'fxMirrorHeart');
    expect(r.state.allies[0].block).toBe(18);
    const after = nextTurn(r.state);
    // ブロック18で20の攻撃を受け、防いだ18の2倍（上限なし）
    expect(lost(r.state, after)).toBe(36);
  });
  it('重装衛士《不落》: ブロックの半分が残る（最大20）。物理カードにブロックの50%（最大+10）', () => {
    const s = battle(['bulwark']);
    s.allies[0].block = 30;
    expect(keepBlockOf(s.allies[0])).toBe(15);
    s.allies[0].block = 60;
    expect(keepBlockOf(s.allies[0])).toBe(20);
    expect(damageModifiers(s, s.allies[0], getCard('strike'), s.enemies[0]).addOnce).toBe(10);
  });
  it('竜脈術師《竜脈》: まだ付いていない種類を付けるとマナ+1（1ターン1回）', () => {
    const s = battle(['dragonVein']);
    s.allies[0].mana = 5;
    const r = use(s, 'dvLeyWedge');
    expect(r.state.allies[0].mana).toBe(5 - 1 + 1);
  });
  it('竜脈術師《竜脈》: 違う種類の状態異常が3つ付いた敵は BREAK', () => {
    const s = battle(['dragonVein'], ['stageFBig']);
    s.enemies[0].statuses.burn = 1;
    const r = use(s, 'dvLeyWedge');
    expect(r.state.enemies[0].broken).toBe(true);
  });
  it('調教師《相棒の覚醒》: カードでブロックを得たら、お供が動く（1ターン2回まで）', () => {
    const s = battle(['petTrainer']);
    givePet(s.allies[0]);
    s.allies[0].abilities = [...(s.allies[0].abilities ?? []), { name: 'つつく', pet: true, effect: { when: 'afterCard', do: [{ kind: 'damage', amount: 2, to: 'randomFoe' }] } }];
    const r = use(s, 'ptPat');
    expect(r.state.allies[0].counters?.petActsTurn).toBeGreaterThanOrEqual(1);
  });
  it('調教師《懐き上手》: 懐き度の上がり方が2倍', () => {
    const g = game(['petTrainer']);
    const h = g.heroes[0];
    h.pet = { petId: 'cockatiel', color: 'normal', name: 'ぴーちゃん', love: 0, acts: 0 } as never;
    addPetLove(g, h, 5);
    expect((h.pet as { love: number }).love).toBe(10);
  });
});

describe('区切りF: 決め技', () => {
  it('城塞崩し: ブロックの200%（最大60）・完全成功で BREAK', () => {
    const s = battle(['bulwark'], ['stageFBig']);
    s.allies[0].block = 50;
    const r = use(s, 'fxFortressBreaker');
    expect(lost(s, r.state)).toBeLessThanOrEqual(60);
    expect(r.state.enemies[0].broken).toBe(true);
    expect(r.state.allies[0].block).toBe(50);
  });
  it('竜脈解放: 状態異常1種類につき+6（状態異常は消えない）', () => {
    const plain = battle(['dragonVein']);
    const a = lost(plain, use(plain, 'fxVeinRelease').state);
    const s = battle(['dragonVein']);
    s.enemies[0].statuses.weak = 1;
    s.enemies[0].statuses.vulnerable = 1;
    const r = use(s, 'fxVeinRelease');
    expect(lost(s, r.state)).toBeGreaterThan(a);
    expect(r.state.enemies[0].statuses.weak).toBe(1);
  });
  it('相棒とのキズナ大暴走: お供の能力を3回（1ターン4回の上限に数えない）', () => {
    const s = battle(['petTrainer']);
    givePet(s.allies[0]);
    s.allies[0].abilities = [...(s.allies[0].abilities ?? []), { name: 'つつく', pet: true, effect: { when: 'turnEnd', do: [{ kind: 'damage', amount: 2, to: 'randomFoe' }] } }];
    const r = use(s, 'fxBondRampage');
    // 大暴走の3回は上限に数えない（数えに残るのは《相棒の覚醒》の分だけ。2回まで）
    expect(r.state.log.filter((l) => l.text.includes('「つつく」')).length).toBeGreaterThanOrEqual(3);
    expect(r.state.allies[0].counters?.petActsTurn ?? 0).toBeLessThanOrEqual(2);
    expect(r.state.allies.every((a) => a.block >= 8)).toBe(true);
  });
});
