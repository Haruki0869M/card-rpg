// ラインナップの作り直し 区切りE（docs/tasks/lineup-stageE-plan.md）: 消耗品 50 → 24・保存 v23
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../data/enemies';
import { ITEMS, getItem } from '../../data/items';
import type { BattleState, GameState, PlayerId } from '../../types';
import { applyCommand, applyGameCommand, createBattle, createGame, toPartyMember } from '../index';
import { STATE_VERSION, itemTargetsEnemy } from '../battle/battle';
import { addItem } from '../game/common';
import { findHero } from '../game/heroes';

const P: PlayerId = 'P1';
const wait = [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block' as const, amount: 0 }] }];
const dummy = { icon: 'T', baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence' };
ENEMIES.register({ ...dummy, id: 'stageEIdler', name: '確認用の置物', maxHp: 100000, actions: wait });
ENEMIES.register({ ...dummy, id: 'stageEBig', name: '確認用の大技の置物', maxHp: 100000, actions: [{ id: 'big', name: '大技', big: true, effects: [{ kind: 'damage', amount: 30 }] }] });

const game = (classes: string[]): GameState => createGame({ seed: 11, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((classId, i) => ({ classId, gender: 'female' as const, name: `仲間${i + 1}`, playerId: P })) });
function battle(classes: string[], enemies = ['stageEIdler'], opt: { boss?: boolean } = {}): BattleState {
  const g = game(classes);
  const s = createBattle({ seed: 11, party: g.heroes.map(toPartyMember), encounter: { id: 'stageE', name: '確認', enemies: enemies.map((defId) => ({ defId })), ...(opt.boss ? { boss: true } : {}) } });
  for (const a of s.allies) { a.mana = 3; a.focus = 2; a.hp = a.maxHp = 500; a.block = 0; a.hand = []; }
  return s;
}
/** 戦闘で道具を使う（target = 味方の番号。敵に使う道具は、敵の番号） */
function useItem(s: BattleState, itemId: string, target = 0) {
  const def = getItem(itemId);
  const targetId = itemTargetsEnemy(def.use) ? s.enemies[target].uid : s.allies[target].id;
  return applyCommand(s, { type: 'USE_ITEM', playerId: P, characterId: s.allies[0].id, targetId, itemName: def.name, effects: def.use! });
}

describe('区切りE: 数', () => {
  it('消耗品は24個（コモン5・レア9・エピック7・レジェンド3）。中身が同じ物は無い', () => {
    // 段階7b の「災厄討ちの秘薬」（災厄を倒した時だけ。source: 'scourge'）は、店・宝箱の24個とは別に数える
    const all = ITEMS.all.filter((i) => i.slot === 'consumable' && !i.source);
    expect(all).toHaveLength(24);
    // 2026-11-21: シナリオ2の地図のイベント「薪の番小屋」だけが渡す「薪の束」（source: 'event'）も、24個とは別
    expect(ITEMS.all.filter((i) => i.slot === 'consumable' && i.source).map((i) => i.id).sort()).toEqual(['firewoodBundle', 'scourgeElixir']);
    const n = (r: string) => all.filter((i) => i.rarity === r).length;
    expect([n('common'), n('rare'), n('epic'), n('legend')]).toEqual([5, 9, 7, 3]);
    const uses = all.map((i) => JSON.stringify(i.use));
    expect(new Set(uses).size).toBe(24);
    expect(ITEMS.tryGet('holyWater')).toBeUndefined();
  });
  it('レジェンドの3個はお店で売らない。不死鳥の羽根は1人1本まで', () => {
    for (const id of ['phoenixFeather', 'divineNectar', 'timeHourglass']) expect(getItem(id).noShop, id).toBe(true);
    const g = game(['warrior']);
    const h = g.heroes[0];
    h.pouch = [];
    addItem(g, h, { uid: 'f1', itemId: 'phoenixFeather' }, false);
    const msg = addItem(g, h, { uid: 'f2', itemId: 'phoenixFeather' }, false);
    expect(h.pouch.filter((p) => p.itemId === 'phoenixFeather')).toHaveLength(1);
    expect(msg).toContain('G');
  });
  it('保存の版は v23 以上', () => {
    expect(STATE_VERSION).toBeGreaterThanOrEqual(23);
  });
});

describe('区切りE: 戦闘で使う道具', () => {
  it('閃光の破砕玉: 大技を予告している敵を BREAK・脆弱2。ボスには1戦闘1回', () => {
    const s = battle(['warrior'], ['stageEBig'], { boss: true });
    const r = useItem(s, 'flashShard');
    expect(r.error).toBeUndefined();
    expect(r.state.enemies[0].broken).toBe(true);
    expect(r.state.enemies[0].statuses.vulnerable).toBeGreaterThanOrEqual(2);
    r.state.enemies[0].broken = false;
    expect(useItem(r.state, 'flashShard').error).toBeDefined();
    expect(useItem(battle(['warrior']), 'flashShard').error).toBe('大技を予告している敵がいません');
  });
  it('閃光の破砕玉・氷結の魔石: 狙う敵を選べる（オーナーの決定 2026-11-12）', () => {
    // 1体目は置物・2体目が大技の予告
    const s = battle(['warrior'], ['stageEIdler', 'stageEBig']);
    expect(useItem(s, 'flashShard', 0).error).toBe('その敵は、大技を予告していません');
    const r = useItem(s, 'flashShard', 1);
    expect(r.error).toBeUndefined();
    expect([r.state.enemies[0].broken ?? false, r.state.enemies[1].broken]).toEqual([false, true]);
    // 氷結の魔石は、選んだ敵だけに当たる
    const f = useItem(battle(['warrior'], ['stageEIdler', 'stageEIdler']), 'frostGem', 1).state.enemies;
    expect([f[0].statuses.freeze ?? 0, f[1].statuses.freeze, f[0].hp === f[0].maxHp, f[1].hp < f[1].maxHp]).toEqual([0, 1, true, true]);
    // 倒れた敵・味方を選んだ時は使えない
    const d = battle(['warrior'], ['stageEIdler', 'stageEIdler']);
    const def = getItem('frostGem');
    expect(applyCommand(d, { type: 'USE_ITEM', playerId: P, characterId: d.allies[0].id, targetId: d.allies[0].id, itemName: def.name, effects: def.use! }).error).toBe('狙う敵を選び直してください');
  });
  it('英雄の霊薬: マナ+2・フォーカス+2・2枚引く', () => {
    const s = battle(['warrior']);
    const r = useItem(s, 'heroElixir');
    const a = r.state.allies[0];
    expect([a.mana, a.focus, a.hand.length]).toEqual([5, 4, 2]);
  });
  it('全体治癒の香炉: 状態異常が無くても使える。全員25回復', () => {
    const s = battle(['warrior', 'mage']);
    s.allies[1].hp = 100;
    const r = useItem(s, 'healingCenser');
    expect(r.error).toBeUndefined();
    expect(r.state.allies[1].hp).toBe(125);
  });
  it('鉄壁の陣旗: 全員ブロック15・弱体と脆弱を受けない', () => {
    const r = useItem(battle(['warrior', 'mage']), 'ironBanner');
    expect(r.state.allies.every((a) => a.block === 15)).toBe(true);
    expect(r.state.allies.every((a) => a.abilities?.some((x) => x.name === '鉄壁の陣旗'))).toBe(true);
  });
  it('猛毒の塗薬: この戦闘の間、選んだ味方の攻撃で毒2', () => {
    const r = useItem(battle(['warrior']), 'venomOil');
    const s = r.state;
    s.allies[0].hand.push({ uid: 'st', cardId: 'strike' });
    s.allies[0].mana = 3;
    const r2 = applyCommand(s, { type: 'PLAY_CARD', playerId: P, characterId: s.allies[0].id, cardInstanceId: 'st', targetId: s.enemies[0].uid, focusUsed: 0 });
    expect(r2.error).toBeUndefined();
    expect(r2.state.enemies[0].statuses.poison).toBe(2);
  });
  it('紅蓮の油壺: 敵全員に火傷4。このターン火が弱点', () => {
    const r = useItem(battle(['warrior'], ['stageEIdler', 'stageEIdler']), 'blazeJar');
    expect(r.state.enemies.every((e) => e.statuses.burn === 4 && e.tempWeak === 'fire')).toBe(true);
  });
  it('氷結の魔石: 10の氷・凍結1（ボスには弱体1）', () => {
    expect(useItem(battle(['warrior']), 'frostGem').state.enemies[0].statuses.freeze).toBe(1);
    const b = useItem(battle(['warrior'], ['stageEIdler'], { boss: true }), 'frostGem').state.enemies[0];
    expect([b.statuses.freeze ?? 0, b.statuses.weak]).toEqual([0, 1]);
  });
  it('黄金の招き猫: この戦闘のお金×2・全員フォーカス+1', () => {
    const r = useItem(battle(['warrior', 'mage']), 'luckyCat');
    expect(r.state.goldMul).toBe(2);
    expect(r.state.allies.every((a) => a.focus === 3)).toBe(true);
  });
  it('不死鳥の羽根: 倒れた味方はHP50%で復活、生きていれば全回復', () => {
    const s = battle(['warrior', 'mage']);
    s.allies[1].dead = true;
    s.allies[1].hp = 0;
    const r = useItem(s, 'phoenixFeather', 1);
    expect(r.error).toBeUndefined();
    expect(r.state.allies[1].hp).toBe(250);
    const t = battle(['warrior']);
    t.allies[0].hp = 10;
    expect(useItem(t, 'phoenixFeather').state.allies[0].hp).toBe(500);
  });
  it('時の砂時計: 敵の次の行動の数値を半分・全員2枚引く', () => {
    const r = useItem(battle(['warrior'], ['stageEBig']), 'timeHourglass');
    expect(r.state.enemies[0].nextActionMultiplier).toBe(0.5);
    expect(r.state.allies[0].hand.length).toBe(2);
  });
  it('戦闘の外の道具（テント・砥石・聖結晶・ごちそう）は、戦闘では使えない', () => {
    for (const id of ['campTent', 'whetstone', 'purifyCrystal', 'petFeast']) expect(useItem(battle(['warrior']), id).error, id).toBeDefined();
  });
});

describe('区切りE: 戦闘の外で使う道具', () => {
  const pouch = (g: GameState, itemId: string) => { g.heroes[0].pouch.push({ uid: 'it1', itemId }); return g; };
  const use = (g: GameState, extra: { cardUid?: string } = {}) => applyGameCommand(g, { type: 'USE_POUCH_ITEM', playerId: P, itemUid: 'it1', userId: g.heroes[0].id, targetId: g.heroes[0].id, ...extra });
  it('浄化の聖結晶: 侵食度-3%・全員フォーカス+2', () => {
    const g = pouch(game(['warrior', 'mage']), 'purifyCrystal');
    g.world!.corruption = 10;
    for (const h of g.heroes) h.focus = 0;
    const r = use(g);
    expect(r.error).toBeUndefined();
    expect(r.state.world!.corruption).toBe(7);
    expect(r.state.heroes.every((h) => h.focus === 2)).toBe(true);
  });
  it('テントの設営具: その場で野営（夜襲なし）・HPとフォーカスを50%回復して手番が終わる', () => {
    const g0 = game(['warrior', 'mage']);
    const g = pouch(applyGameCommand(g0, { type: 'STORY_CONTINUE', playerId: P }).state, 'campTent');
    g.world!.tiles[g.world!.pos.h0].f = undefined;
    const h = g.heroes[0];
    h.hp = 1;
    h.focus = 0;
    const r = use(g);
    expect(r.error).toBeUndefined();
    const after = findHero(r.state, 'h0')!;
    expect(after.hp).toBeGreaterThan(1);
    expect(after.focus).toBeGreaterThan(0);
    expect(r.state.world!.turn).toBe('h1');
    expect(after.pouch.some((p) => p.uid === 'it1')).toBe(false);
  });
  it('カード鍛錬の砥石: 選んだカードを強化する（もう強化したカードは選べない）', () => {
    const g = pouch(game(['warrior']), 'whetstone');
    const card = g.heroes[0].deck[0];
    expect(use(g).error).toBe('強化するカードを選んでください');
    const r = use(g, { cardUid: card.uid });
    expect(r.error).toBeUndefined();
    expect(r.state.heroes[0].deck.find((c) => c.uid === card.uid)?.upgraded).toBe(true);
  });
  it('お供の特上ごちそう: 懐き度+30・次の戦闘の1ターン目にお供が3回行動', () => {
    const g = pouch(game(['warrior']), 'petFeast');
    g.heroes[0].pet = { petId: 'cockatiel', color: 'normal', name: 'ぴーちゃん', love: 0, acts: 0 } as never;
    const r = use(g);
    expect(r.error).toBeUndefined();
    expect(r.state.heroes[0].pet?.love).toBe(30);
    expect(r.state.heroes[0].petFeast).toBe(3);
    expect(toPartyMember(r.state.heroes[0]).petFeast).toBe(3);
  });
});
