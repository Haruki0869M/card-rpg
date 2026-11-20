// 賢い bot（botSmart.ts）の小さなテスト: 5つの工夫が、それぞれ実際に操作を出すこと・断られても止まらないこと
import { describe, expect, it } from 'vitest';
import { applyGameCommand, createBattle, createGame, heroMaxHp, toPartyMember } from '../index';
import { botStep, playToEnd, type BotLog, type BotMemo } from '../bot';
import { cleverBattleCommand } from '../botClever';
import { newCleverMemo } from '../botClever';
import {
  equipGain,
  hurtLine,
  mainStat,
  newSmartMemo,
  smartBattleItemCommand,
  smartEquipCommand,
  smartFieldItemCommand,
  smartGrowthCommand,
  smartPickCardCommand,
  smartRemoveCardCommand,
  smartTownShopCommand,
  teamAdjust,
  timeLate,
} from '../botSmart';
import { getClass } from '../../data/classes';
import { getCard } from '../../data/cards';
import { getItem } from '../../data/items';
import { ENCOUNTERS } from '../../data/enemies';
import type { GameState, PlayerId } from '../../types';

const newGame = (seed = 1002, classes = ['warrior', 'mage']) =>
  createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((c, i) => ({ classId: c, gender: 'male' as const, name: c + i, playerId: 'P1' as PlayerId })) });

/** スタートの町に入った状態（お金を多めに持たせる） */
function inTown(gold = 1000): GameState {
  const g = newGame();
  g.world!.story = undefined;
  for (const h of g.heroes) h.gold = gold;
  const r = applyGameCommand(g, { type: 'WORLD_INTERACT', playerId: 'P1', heroId: g.heroes[0].id, party: g.heroes.map((h) => h.id) });
  expect(r.error).toBeUndefined();
  expect(r.state.mode).toBe('town');
  return r.state;
}

/** 戦闘中の状態（世界マップの戦闘と同じく、冒険の battle に載せる） */
function inBattle(): GameState {
  const g = newGame();
  g.world!.story = undefined;
  g.mode = 'battle';
  g.battle = createBattle({ seed: 7, party: g.heroes.map((h) => toPartyMember(h)), encounter: ENCOUNTERS.get('goblinBand') });
  return g;
}

describe('賢い bot（botSmart.ts）', () => {
  it('買い物と装備: 点が上がる装備を付け、町では品物を買い、要らない装備を売る', () => {
    const g = newGame();
    const h = g.heroes[0];
    h.stash.push({ uid: 'crest', itemId: 'heroCrest' });
    expect(equipGain(h, getItem('heroCrest'))).toBeGreaterThan(0);
    const sm = newSmartMemo();
    const p = smartEquipCommand(g, sm);
    expect(p?.cmd).toMatchObject({ type: 'EQUIP', heroId: h.id, itemUid: 'crest' });
    expect(applyGameCommand(g, p!.cmd).error).toBeUndefined();

    const t = inTown();
    const v = t.heroes[0];
    v.stash.push({ uid: 'junk', itemId: 'leatherArmor' });
    v.equipment.armor = { uid: 'good', itemId: 'dragonArmor' };
    const sell = smartTownShopCommand(t, sm);
    expect(sell?.cmd).toMatchObject({ type: 'TOWN_SELL', itemUid: 'junk' });
    const t2 = applyGameCommand(t, sell!.cmd);
    expect(t2.error).toBeUndefined();
    const buy = smartTownShopCommand(t2.state, sm);
    expect(buy?.cmd.type).toBe('TOWN_BUY');
    expect(applyGameCommand(t2.state, buy!.cmd).error).toBeUndefined();
  });

  it('装備: 付けられない武器は点が付かない（-Infinity）', () => {
    const g = newGame();
    const mage = g.heroes[1];
    const sword = getItem(g.heroes[0].equipment.weapon!.itemId);
    if (getClass('mage').weaponType !== sword.weaponType && !(getClass('mage').subWeapons ?? []).includes(sword.weaponType!)) expect(equipGain(mage, sword)).toBe(-Infinity);
  });

  it('カード: 山札に合う良い札は取り、合わない札は取らない。成長は主に使う能力値。町では弱い札を削る', () => {
    const g = newGame();
    const w = g.heroes[0];
    expect(mainStat(w)).toBe('str');
    const sm = newSmartMemo();
    const base = { gold: 0, exp: [], levelUps: [], cardPicked: false, loot: [] };
    // 基本の札だけ（山札の平均より良くない）→ 取らない
    g.reward = { ...base, cardOffers: [{ cardId: 'strike', heroId: w.id }, { cardId: 'guard', heroId: w.id }] };
    const skip = smartPickCardCommand(g, sm, () => 'P1');
    expect(skip?.cmd).toMatchObject({ type: 'PICK_CARD', offerIndex: null, heroId: w.id });
    // レア以上の、力で使う攻撃札（剣士の報酬の候補から探す）→ 取る
    const good = getClass('warrior').cardPool.find((id) => {
      const c = getCard(id);
      return (c.rarity ?? 'common') !== 'common' && c.category === 'physical' && !c.stat && c.tiers.some((t) => t.effects.some((e) => e.kind === 'damage'));
    })!;
    expect(good).toBeDefined();
    g.reward = { ...base, cardOffers: [{ cardId: 'strike', heroId: w.id }, { cardId: good, heroId: w.id }] };
    const take = smartPickCardCommand(g, sm, () => 'P1');
    expect(take?.cmd).toMatchObject({ type: 'PICK_CARD', offerIndex: 1 });
    // 成長: 力が候補にあれば力
    g.reward = { ...base, cardOffers: [], levelUps: [{ heroId: w.id, level: 2, options: [{ kind: 'stat', stat: 'per', amount: 2 }, { kind: 'maxHp', amount: 5 }, { kind: 'stat', stat: 'str', amount: 2 }] }] };
    expect(smartGrowthCommand(g, sm)?.cmd).toMatchObject({ type: 'CHOOSE_GROWTH', optionIndex: 2 });
    // 町で削る（山札を大きくしてから）
    const t = inTown();
    const v = t.heroes[0];
    for (let i = 0; i < 4; i++) v.deck.push({ uid: `x${i}`, cardId: getClass('warrior').cardPool[0] });
    const rm = smartRemoveCardCommand(t, sm);
    expect(rm?.cmd.type).toBe('TOWN_REMOVE_CARD');
    const r = applyGameCommand(t, rm!.cmd);
    expect(r.error).toBeUndefined();
    expect(r.state.heroes[0].deck.length).toBe(v.deck.length - 1);
    // 1回の訪問で1枚まで
    expect(smartRemoveCardCommand(r.state, sm)).toBeUndefined();
  });

  it('消耗品: 倒れそうな味方に回復薬を使う（戦闘の中・外）。断られた操作は同じ場面で二度と出さない', () => {
    const g = inBattle();
    const h = g.heroes[0];
    h.pouch = [{ uid: 'pot', itemId: 'potion' }];
    const a = g.battle!.allies.find((x) => x.id === h.id)!;
    a.hp = 3;
    const sm = newSmartMemo();
    const p = smartBattleItemCommand(g, sm, g.battle!);
    expect(p?.cmd).toMatchObject({ type: 'USE_POUCH_ITEM', itemUid: 'pot', targetId: h.id });
    const r = applyGameCommand(g, p!.cmd);
    expect(r.error).toBeUndefined();
    expect(r.state.battle!.allies.find((x) => x.id === h.id)!.hp).toBeGreaterThan(3);
    // 断られたことにすると、同じ場面ではもう出さない（ほかの手に移り、いつかは何も出さなくなる）
    const seen = new Set<string>();
    let q = p;
    for (let i = 0; i < 20 && q; i++) {
      expect(seen.has(q.key)).toBe(false);
      seen.add(q.key);
      sm.refused.add(q.key);
      q = smartBattleItemCommand(g, sm, g.battle!);
    }
    expect(q).toBeUndefined();

    const f = newGame();
    f.world!.story = undefined;
    const fh = f.heroes[0];
    fh.hp = 5;
    fh.pouch = [{ uid: 'pot', itemId: 'potion' }];
    const fp = smartFieldItemCommand(f, newSmartMemo(), f.heroes);
    expect(fp?.cmd).toMatchObject({ type: 'USE_POUCH_ITEM', targetId: fh.id });
    const fr = applyGameCommand(f, fp!.cmd);
    expect(fr.error).toBeUndefined();
    expect(fr.state.heroes[0].hp).toBeGreaterThan(5);
  });

  it('連携: 倒し切れる敵を先に。被弾予定で倒れる味方のブロックを上げる', () => {
    const g = inBattle();
    const b = g.battle!;
    const adj = teamAdjust(b);
    const a = b.allies[0];
    const card = getCard('strike');
    const e = b.enemies[0];
    const before = adj.attack(a, card, e, { score: 20, focus: 0 }).score;
    e.hp = 1;
    e.block = 0;
    const lethal = teamAdjust(b).attack(a, card, e, { score: 20, focus: 0 }).score;
    expect(lethal).toBeGreaterThan(before);
    // 殴られない味方のブロックは下げる、倒れる味方のブロックは上げる（被弾予定は画面の値）
    for (const x of b.enemies) delete x.intent;
    expect(teamAdjust(b).other(a, getCard('guard'), 'block', 10)).toBeLessThan(10);
    // 工夫する bot の戦闘に渡しても、操作が出る
    expect(cleverBattleCommand(b, teamAdjust(b))).toBeDefined();
  });

  it('時間: 侵食度が高く残りのダンジョンが多い時は「時間が足りない」。町へ戻るHPの線を下げる', () => {
    const g = newGame();
    expect(timeLate(g)).toBe(false);
    expect(hurtLine(g, newSmartMemo())).toBe(0.5);
    g.world!.corruption = 90;
    expect(timeLate(g)).toBe(true);
    expect(hurtLine(g, newSmartMemo())).toBeLessThan(0.5);
    expect(hurtLine(g, newSmartMemo(['time']))).toBe(0.5);
  });

  it('工夫は1つずつ外せる（外した工夫の操作は出ない）', () => {
    const t = inTown();
    const log: BotLog = { steps: 0, errors: [], modes: {} };
    const memo: BotMemo = { interacted: new Set(), clever: newCleverMemo(), smart: newSmartMemo(['shop', 'cards']) };
    let g = t;
    for (let i = 0; i < 10 && g.mode === 'town'; i++) g = botStep(g, log, memo);
    // 全員HPが満タンなので宿にも泊まらない: 買い物・カードを削る、を外すと、お金は1Gも減らない
    expect(t.heroes.every((h) => h.hp === heroMaxHp(h))).toBe(true);
    expect(g.heroes.map((h) => h.gold)).toEqual(t.heroes.map((h) => h.gold));
    expect(log.errors).toEqual([]);
  });

  it('賢い bot で1冒険を最後まで流しても、操作の失敗が無く止まらない', () => {
    const { game, log } = playToEnd(newGame(1001), 60000, { smart: true });
    expect(['ending', 'gameover']).toContain(game.mode);
    expect(log.errors).toEqual([]);
    // 1冒険を最後まで流すので、ほかのテストと並ぶと数秒かかる
  }, 120_000);

  it('比べのパーティ: 召喚士（魔法の基本職）は、最初の山札にも報酬の候補にも回復のカードを持たない', () => {
    const cls = getClass('summoner');
    expect(cls.tier).toBe('base');
    const ids = [...cls.deck.map((d) => d.cardId), ...cls.cardPool];
    const heals = ids.filter((id) => getCard(id).tiers.some((t) => t.effects.some((e) => e.kind === 'heal')));
    expect(heals).toEqual([]);
  });
});
