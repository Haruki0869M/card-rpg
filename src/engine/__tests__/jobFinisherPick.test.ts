// 点検（2026-11-13・F4）: 転職で必ず入る札（決め技）が、転職の時に選べる3枚にもう一度出ない
import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../data/balance';
import { CLASSES } from '../../data/classes';
import { finisherCards, heroCardPool, heroJobCardPool, signatureCards } from '../game/jobs';
import { applyGameCommand, createGame, jobOptions } from '../index';
import { cardRewardOdds, rollCardOffers } from '../game/loot';
import { altarTransmutePool, doCardTask } from '../game/tasks';
import { outcome as cardOutcome } from '../game/outcomes/kinds/card';
import { outcome as peddlerOutcome } from '../game/outcomes/kinds/peddler';
import { createRng } from '../rng';
import type { Hero, Loot, PlayerId } from '../../types';

describe('決め技は、転職（jobCards）からだけ入る。ほかの出どころの候補に出ない（全48職・2026-11-13）', () => {
  const fin = finisherCards();
  const withFin = CLASSES.all.filter((j) => j.jobCards?.length);
  it('決め技の一覧（最上位・特殊の職の jobCards）', () => {
    expect(withFin.length).toBeGreaterThan(10);
    for (const j of withFin) for (const c of j.jobCards!) expect(fin.has(c)).toBe(true);
  });
  it.each(CLASSES.all.map((j) => j.id))('%s: 報酬・イベントのカード・祭壇の変異・休憩の変異・行商人・町の店の候補に、決め技が出ない', (id) => {
    const party = [0, 1].map((i) => ({ classId: 'warrior', gender: 'male' as const, name: `p${i}`, playerId: `P${i + 1}` as PlayerId }));
    const g = createGame({ seed: 5, scenarioId: 'corruptionKing', difficulty: 'normal', party });
    const h: Hero = g.heroes[0];
    const j = CLASSES.get(id);
    h.classId = id;
    // これまでの職（その職へ来た道の職）も、候補に入る形にする
    h.jobs = [...(j.from ?? [])];
    delete h.equipment.weapon;
    const bad = (ids: string[], where: string) => expect(ids.filter((c) => fin.has(c)), `${id} ${where}`).toEqual([]);
    for (const solo of [false, true]) {
      bad(heroCardPool(h, solo), '候補');
      bad(heroJobCardPool(h, solo), 'ジョブ寄りの候補');
    }
    // 祭壇の変異（同じ格）: 決め技の格ごとに見本を1枚ずつ
    for (const c of fin) bad(altarTransmutePool(g, h, c), `祭壇の変異 ${c}`);
    for (let seed = 1; seed <= 40; seed++) {
      const rng = createRng(seed);
      bad(rollCardOffers(g, [h.id], rng, cardRewardOdds('boss', 3)).map((o) => o.cardId), '報酬');
      const loot: Loot[] = [];
      cardOutcome.apply({ game: g, rng, actor: h, loot, targets: () => [h] }, { kind: 'card' } as never);
      bad(loot.flatMap((l) => (l.kind === 'card' ? [l.cardId] : [])), 'イベントのカード1枚');
      peddlerOutcome.apply({ game: g, rng, actor: h, loot: [], targets: () => [h] }, { kind: 'peddler', discount: 30, rarity: [1, 3] } as never);
      bad((h.peddler?.cards ?? []).map((c) => c.cardId), '行商人');
      // 休憩・イベントの変異（別の系統のレア以上の札へ）
      h.deck = [{ uid: 'mut', cardId: 'strike' }, ...h.deck];
      h.cardTask = 'mutate';
      expect(doCardTask(g, h, 'mut', rng)).toBeUndefined();
      bad([h.deck.find((c) => c.uid === 'mut')!.cardId], '変異');
      h.deck = h.deck.filter((c) => c.uid !== 'mut');
    }
  });
});

describe('転職で必ず入る札は、選べる候補に出ない', () => {
  it('時魔道士: 選べる3枚に「時間停止」が無い（前は2枚目が取れた）', () => {
    const j = CLASSES.get('timeMage');
    expect(j.jobCards).toContain('timeStop');
    expect(signatureCards(j)).not.toContain('timeStop');
    expect(signatureCards(j)).toHaveLength(3);
  });
  it.each(CLASSES.all.filter((j) => j.jobCards?.length).map((j) => j.id))('%s: 選べる候補と、必ず入る札が重ならない', (id) => {
    const j = CLASSES.get(id);
    const sig = signatureCards(j);
    for (const c of j.jobCards ?? []) expect(sig, `${id}: ${c}`).not.toContain(c);
  });
  it('時魔道士に転職して選んでも、時間停止は1枚だけ', () => {
    let g = createGame({ seed: 17, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', name: '確認', gender: 'male', playerId: 'P1' }] });
    const j = CLASSES.get('timeMage');
    const h = g.heroes[0];
    h.classId = j.from![0];
    h.level = BALANCE.jobChange.special;
    h.feats = { [j.requires!.feat]: j.requires!.count };
    // 神殿のマスに立たせる（finalSpecialJobs.test.ts と同じ形）
    const tile = g.world!.tiles.findIndex((t) => t.f?.id === 'pilgrimTemple');
    g.world!.pos[h.id] = tile;
    g.mode = 'sanctuary';
    g.party = [h.id];
    g.sanctuary = { sanctuaryId: 'pilgrimTemple', heroId: h.id, tile };
    expect(jobOptions(h, g).find((o) => o.job.id === 'timeMage')?.ready).toBe(true);
    const changed = applyGameCommand(g, { type: 'CHANGE_JOB', playerId: 'P1', heroId: h.id, jobId: 'timeMage' });
    expect(changed.error).toBeUndefined();
    g = changed.state;
    for (const cardId of g.heroes[0].jobPick ?? []) {
      const picked = applyGameCommand(g, { type: 'PICK_JOB_CARD', playerId: 'P1', heroId: h.id, cardId });
      expect(picked.error).toBeUndefined();
      expect(picked.state.heroes[0].deck.filter((c) => c.cardId === 'timeStop')).toHaveLength(1);
    }
  });
});
