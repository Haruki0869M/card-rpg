// 憲章5（2026-11-12）: 「形が同じで数字だけ違うカード」をまとめた（docs/tasks/charter5-card-merge-plan.md）
import { describe, expect, it } from 'vitest';
import { CARDS, cardLineages, cardWeaponTypes, getCard } from '../../data/cards';
import { MERGED_CARDS, MERGED_PLACEMENT } from '../../data/cards/merged';
import { CLASSES } from '../../data/classes';
import { ITEMS } from '../../data/items';
import { STATE_VERSION } from '../battle/battle';
import { createGame } from '../game/game';
import { jobOnlyCard, signatureCards } from '../game/jobs';
import { migrateGame } from '../game/migrations';

describe('憲章5: 数字だけ違うカードのまとめ', () => {
  it('消した札は登録表に無く、読み替え先は全部ある（85枚＋区切りFの2枚）', () => {
    expect(Object.keys(MERGED_CARDS)).toHaveLength(87);
    for (const [gone, keep] of Object.entries(MERGED_CARDS)) {
      expect(CARDS.tryGet(gone), gone).toBeUndefined();
      expect(CARDS.tryGet(keep), `${gone} → ${keep}`).toBeDefined();
      expect(MERGED_CARDS[keep], `${keep} は消した札ではない`).toBeUndefined();
    }
  });
  it('ジョブ・最初の山札・武器が、消した札を指していない', () => {
    for (const j of CLASSES.all) for (const id of [...j.cardPool, ...(j.signature ?? []), ...j.deck.map((d) => d.cardId), ...(j.jobCards ?? [])]) expect(CARDS.tryGet(id), `${j.id}: ${id}`).toBeDefined();
    for (const i of ITEMS.all) for (const c of i.cards ?? []) expect(CARDS.tryGet(c.cardId), `${i.id}: ${c.cardId}`).toBeDefined();
    // 同じ札が2回並んでいない
    for (const j of CLASSES.all) expect(new Set(j.cardPool).size, j.id).toBe(j.cardPool.length);
  });
  it('残した札は、消した札があった武器種・系統にも置かれる', () => {
    for (const [id, p] of Object.entries(MERGED_PLACEMENT)) {
      const c = getCard(id);
      for (const t of p.weaponTypes ?? []) expect(cardWeaponTypes(c), id).toContain(t);
      for (const l of p.lineages ?? []) expect(cardLineages(c), id).toContain(l);
      if (p.name) expect(c.name).toBe(p.name);
      // 同じ武器種・系統を2回持たない
      expect(new Set(cardWeaponTypes(c)).size, id).toBe(cardWeaponTypes(c).length);
      expect(new Set(cardLineages(c)).size, id).toBe(cardLineages(c).length);
    }
    // 例: 「手早い攻撃」は、剣（踏み込み）・槌（打ち下ろし）・刀（抜き打ち）・系統:武（重ね打ち）の分も持つ
    expect(cardWeaponTypes(getCard('lnGiQuick'))).toEqual(expect.arrayContaining(['bow', 'fist', 'whip', 'sword', 'hammer', 'katana']));
    expect(cardLineages(getCard('lnGiQuick')).sort()).toEqual(['bu', 'gi']);
  });
  it('残した札の数字は変えていない（例）', () => {
    expect(getCard('lnGiQuick').tiers.map((t) => (t.effects[0] as { amount: number }).amount)).toEqual([3, 5, 8]);
    expect(getCard('strike').tiers.map((t) => (t.effects[0] as { amount: number }).amount)).toEqual([4, 7]);
  });
  it('まとめなかった札: 勝負の一撃（当たり外れの幅がある）・急所の一矢・職の名前の必殺技6枚・武器だけに付く札', () => {
    for (const id of ['gambleStrike', 'vitalShot', 'heavenBlade', 'dragonDive', 'samuraiMoon', 'skyPiercer', 'worldBreaker', 'dragonFang', 'wSlash', 'wIaiCut']) expect(CARDS.tryGet(id), id).toBeDefined();
    expect(CLASSES.get('gambler').cardPool).toContain('gambleStrike');
  });
  it('古い保存データ（v23）: 消した札を、残した札に読み替える。敵の行動のIDには触らない', () => {
    const g = createGame({ seed: 1, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: 'P1' }] });
    const old = structuredClone(g) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    old.version = 23;
    old.heroes[0].deck.push({ uid: 'm1', cardId: 'mightyBlow' }, { uid: 'm2', cardId: 'wtSwordLunge', upgraded: true }, { uid: 'm3', cardId: 'cmInstinct' });
    old.heroes[0].jobPick = ['machineShot', 'samuraiFocus'];
    old.memo = { intent: { actionId: 'sweep' }, note: 'sweep' };
    const now = migrateGame(old) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(now).not.toBeNull();
    expect(now.version).toBe(STATE_VERSION);
    const deck = now.heroes[0].deck as { uid: string; cardId: string; upgraded?: boolean }[];
    expect(deck.find((c) => c.uid === 'm1')?.cardId).toBe('lanceCharge');
    expect(deck.find((c) => c.uid === 'm2')).toEqual({ uid: 'm2', cardId: 'lnGiQuick', upgraded: true });
    expect(deck.find((c) => c.uid === 'm3')?.cardId).toBe('pact');
    expect(now.heroes[0].jobPick).toEqual(['lnGiQuick', 'samuraiFocus']);
    expect(now.memo).toEqual({ intent: { actionId: 'sweep' }, note: 'sweep' });
  });
});

describe('転職の時に選ぶ専用カード3枚（オーナーの決定 2026-11-12）', () => {
  it('そのジョブにしか無い札を先に並べる。共通の名前の札は、足りない時だけ', () => {
    const names = (id: string) => signatureCards(CLASSES.get(id)).map((c) => getCard(c).name);
    // 弓聖: そのジョブにしか無い札は2枚（気合の集中は、竜騎士も持つ）。3枚目だけ、代表の並びの上から足す
    expect(names('bowSaint')).toEqual(['天を貫く矢', '天穹の矢雨', '全力の一撃']);
    // 剣豪: 共通の名前の札は出ない（闘士は、そのジョブにしか無い札が1枚なので、残り2枚は代表の並びから足す）
    for (const id of ['swordmaster']) for (const n of names(id)) expect(['二連撃', '牽制', '不屈の闘志', '見切り反撃']).not.toContain(n);
    for (const j of CLASSES.all.filter((c) => c.tier !== 'base')) {
      const sig = signatureCards(j);
      expect(sig.length, j.id).toBe(3);
      const own = j.cardPool.filter((id) => jobOnlyCard(j, id));
      // そのジョブにしか無い札が3枚以上あれば、3枚ともそれ
      if (own.length >= 3) for (const id of sig) expect(jobOnlyCard(j, id), `${j.id}: ${id}`).toBe(true);
      // 足りなければ、ある分は全部入っている
      else for (const id of own) expect(sig, `${j.id}: ${id}`).toContain(id);
    }
  });
  it('名前を変えた札: 二連撃・静かな集中（ほかのカード・ジョブの力と重ならない名前）', () => {
    expect(getCard('lnBuFlurry').name).toBe('二連撃');
    expect(getCard('sageMeditation').name).toBe('静かな集中');
    const all = CARDS.all.map((c) => c.name);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('報告用: 専用カード3枚の中身', () => {
  it('一覧を書き出す', async () => {
    const fs = await import('node:fs');
    const rows = CLASSES.all.filter((c) => c.tier !== 'base').map((j) => `${j.name}\t${j.cardPool.filter((id) => jobOnlyCard(j, id)).length}\t${signatureCards(j).map((c) => getCard(c).name + (jobOnlyCard(j, c) ? '' : '（共通）')).join('・')}`);
    if (process.env.SIG_OUT) fs.writeFileSync(process.env.SIG_OUT, rows.join('\n'));
    expect(rows.length).toBeGreaterThan(0);
  });
});
