// お供（ペット）と突発イベント（J3b）
import { describe, expect, it } from 'vitest';
import { EVENTS } from '../../data/events';
import { PETS } from '../../data/pets';
import type { GameCommand, GameState, PlayerId } from '../../types';
import { applyCommand, applyGameCommand, createBattle, createGame, heroAbilities, petLoveLevel, statChance, toPartyMember } from '../index';
import { getPet } from '../../data/pets';
import { petExplore } from '../game/pets';
import { visionOf } from '../game/world/fog';
import { giveHand, nextTurn, play, setup } from './helpers';

const P: PlayerId = 'P1';
const newGame = (classes = ['warrior']) =>
  createGame({ seed: 7, scenarioId: 'corruptionKing', difficulty: 'normal', party: classes.map((c, i) => ({ classId: c, gender: 'female', name: `${c}${i}`, playerId: P })) });
const run = (g: GameState, cmd: GameCommand) => {
  const r = applyGameCommand(g, cmd);
  if (r.error) throw new Error(`${cmd.type}: ${r.error}`);
  return r.state;
};
/** お供を迎えさせる */
function adopt(g: GameState, petId: string, color?: string, name?: string) {
  g.heroes[0].petOffer = [petId];
  g.heroes[0].petOfferColors = { [petId]: color ?? getPet(petId).colors[0].id };
  return run(g, { type: 'ADOPT_PET', playerId: P, heroId: g.heroes[0].id, petId, color, name });
}

describe('お供のデータ', () => {
  it('12種類。色・名前の候補・能力（ふつうと獣使い）がそろっている', () => {
    expect(PETS.all).toHaveLength(12);
    for (const p of PETS.all) {
      expect(p.colors.length, p.id).toBeGreaterThan(0);
      expect(p.names.length, p.id).toBeGreaterThan(0);
      expect(p.abilities.length, p.id).toBe(p.masterAbilities.length);
    }
    expect(PETS.all.filter((p) => p.perch === 'shoulder').map((p) => p.id).sort()).toEqual(['budgie', 'cockatiel', 'javaSparrow', 'longTailedTit', 'owl'].sort());
  });
});

describe('お供を迎える・撫でる・懐く', () => {
  it('候補に保存された色で名前を付けて迎える。名前が無ければ候補から付く', () => {
    let g = newGame();
    g = adopt(g, 'cockatiel', 'lutino', 'ぴーちゃん');
    expect(g.heroes[0].pet).toMatchObject({ petId: 'cockatiel', color: 'lutino', name: 'ぴーちゃん', love: 0, acts: 0 });
    expect(g.heroes[0].petOffer).toBeUndefined();
    g = adopt(g, 'blackCat');
    expect(g.heroes[0].pet?.petId).toBe('blackCat');
    expect(g.heroes[0].pet?.name.length).toBeGreaterThan(0);
  });

  it('候補にない子は迎えられない・見送れる', () => {
    let g = newGame();
    g.heroes[0].petOffer = ['rabbit'];
    expect(applyGameCommand(g, { type: 'ADOPT_PET', playerId: P, heroId: g.heroes[0].id, petId: 'owl' }).error).toBeTruthy();
    g = run(g, { type: 'ADOPT_PET', playerId: P, heroId: g.heroes[0].id });
    expect(g.heroes[0].pet).toBeUndefined();
    expect(g.heroes[0].petOffer).toBeUndefined();
  });

  it('撫でると懐き、最初の1回だけフォーカス+1', () => {
    let g = adopt(newGame(), 'javaSparrow');
    g.heroes[0].focus = 0;
    g = run(g, { type: 'PET_PAT', playerId: P, heroId: g.heroes[0].id });
    g = run(g, { type: 'PET_PAT', playerId: P, heroId: g.heroes[0].id });
    expect(g.heroes[0].focus).toBe(1);
    expect(g.heroes[0].pet!.love).toBeGreaterThan(0);
  });

  it('懐き度の段階は♡1〜5', () => {
    expect(petLoveLevel(0)).toBe(1);
    expect(petLoveLevel(15)).toBe(2);
    expect(petLoveLevel(9999)).toBe(5);
  });
});

describe('お供の効果', () => {
  it('オカメインコ: 視界+1（獣使いは+2）・夜でもフクロウは視界が狭くならない', () => {
    const g = adopt(newGame(), 'cockatiel');
    const h = g.heroes[0];
    const base = visionOf(newGame(), newGame().world!, newGame().heroes[0].id);
    expect(visionOf(g, g.world!, h.id)).toBe(base + 1);
    h.classId = 'tamer';
    expect(petExplore(h).vision).toBe(2);
  });

  it('黒猫: 宝箱の運の判定+15%・子狐: イベントの判定+10%', () => {
    let g = adopt(newGame(), 'blackCat');
    const h = g.heroes[0];
    expect(statChance(h, 'luk', 'luck') - statChance({ ...h, pet: undefined }, 'luk', 'luck')).toBe(15);
    g = adopt(newGame(), 'foxCub');
    const f = g.heroes[0];
    expect(statChance(f, 'per', undefined, true) - statChance(f, 'per')).toBe(10);
  });

  it('お供の能力は戦闘に入り、名前が付く', () => {
    const g = adopt(newGame(), 'redPanda', 'brown', 'くるみ');
    const names = heroAbilities(g.heroes[0]).map((a) => a.name);
    expect(names).toContain('くるみの威嚇のポーズ');
    const s = createBattle({ ...setup(3, ['warrior']), party: [toPartyMember(g.heroes[0])] });
    expect(s.enemies.every((e) => (e.statuses.weak ?? 0) >= 1)).toBe(true);
    expect(s.allies[0].pet?.name).toBe('くるみ');
  });

  it('オカメインコの先読み: 敵1体の次のターンの行動が決まっていて、その通りに動く', () => {
    const g = adopt(newGame(), 'cockatiel');
    let s = createBattle({ ...setup(3, ['warrior'], 'goblinBand'), party: [toPartyMember(g.heroes[0])] });
    const seen = s.enemies.find((e) => e.queuedActionId);
    expect(seen).toBeTruthy();
    expect(seen!.statuses.vulnerable).toBeGreaterThanOrEqual(1);
    const next = seen!.queuedActionId;
    s.allies[0].hp = s.allies[0].maxHp = 999;
    giveHand(s, s.allies[0].id, []);
    s = nextTurn(s);
    const after = s.enemies.find((e) => e.uid === seen!.uid)!;
    if (!after.dead) expect(after.intent?.actionId).toBe(next);
  });

  it('子狼: ターン終了時に、使った物理カード×2のダメージ', () => {
    const g = adopt(newGame(), 'wolfPup');
    let s = createBattle({ ...setup(3, ['warrior']), party: [toPartyMember(g.heroes[0])] });
    s.allies[0].hp = s.allies[0].maxHp = 999;
    for (const e of s.enemies) e.hp = e.maxHp = 500;
    giveHand(s, s.allies[0].id, ['strike', 'strike']);
    s.allies[0].mana = 5;
    s = applyCommand(s, play(s.allies[0].id, 't0', s.enemies[0].uid, 0)).state;
    s = applyCommand(s, play(s.allies[0].id, 't1', s.enemies[0].uid, 0)).state;
    s = nextTurn(s);
    expect(s.log.some((l) => l.text.includes('噛みつき') && l.text.includes('4'))).toBe(true);
  });
});

describe('突発イベント', () => {
  it('共通の突発イベントは20個あり（シナリオ限定は数えない）、すべての選択肢に結果がある', () => {
    const list = EVENTS.all.filter((e) => e.where === 'random' && !EVENTS.scenarioOf(e.id));
    expect(list).toHaveLength(20);
    for (const e of list) for (const o of e.options) expect(o.success.length, `${e.id}: ${o.label}`).toBeGreaterThan(0);
  });

  it('何もないマスに移動し終えると、確率で突発イベントが起きる（同じキャラに2手番続けては起きない）', () => {
    let hits = 0;
    for (let seed = 1; seed <= 40; seed++) {
      let g = createGame({ seed, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'male', name: 'a', playerId: P }] });
      g.world!.story = undefined;
      const h = g.heroes[0];
      g = run(g, { type: 'WORLD_ROLL_MOVE', playerId: P, heroId: h.id });
      const w = g.world!;
      const from = w.pos[h.id];
      const to = w.tiles.findIndex((t, i) => i !== from && !t.f && Math.abs(i - from) === 1 && !w.wanderers.some((x) => x.tile === i));
      if (to < 0) continue;
      const r = applyGameCommand(g, { type: 'WORLD_MOVE', playerId: P, heroId: h.id, to, companions: [] });
      if (r.error) continue;
      if (r.state.event?.random) {
        hits++;
        expect(r.state.mode).toBe('event');
        expect(r.state.heroes[0].lastRandomEvent).toBe(r.state.world!.worldTurn);
      }
    }
    expect(hits).toBeGreaterThan(0);
    expect(hits).toBeLessThan(25);
  });

  it('待ち伏せを迎え撃つ: イベントを閉じると戦闘が始まる', () => {
    let g = newGame();
    g.world!.story = undefined;
    const h = g.heroes[0];
    g.mode = 'event';
    g.party = [h.id];
    g.event = { tile: g.world!.pos[h.id], eventId: 'rAmbush', random: true };
    const idx = EVENTS.get('rAmbush').options.findIndex((o) => o.label.startsWith('迎え撃つ'));
    g = run(g, { type: 'CHOOSE_EVENT', playerId: P, optionIndex: idx, focusUsed: 0 });
    expect(g.mode).toBe('event');
    g = run(g, { type: 'FINISH_EVENT', playerId: P });
    expect(g.mode).toBe('battle');
    expect(g.battleInfo?.goldMul).toBe(1.5);
  });

  it('老武芸者の秘伝: カードを1枚選んで山札から外す', () => {
    let g = newGame();
    const h = g.heroes[0];
    g.mode = 'event';
    g.party = [h.id];
    g.event = { tile: g.world!.pos[h.id], eventId: 'rOldMaster', random: true };
    g = run(g, { type: 'CHOOSE_EVENT', playerId: P, optionIndex: 1, focusUsed: 0 });
    expect(g.heroes[0].cardTask).toBe('remove');
    const n = g.heroes[0].deck.length;
    g = run(g, { type: 'CARD_TASK', playerId: P, heroId: h.id, cardUid: g.heroes[0].deck[0].uid });
    expect(g.heroes[0].deck.length).toBe(n - 1);
    expect(g.heroes[0].cardTask).toBeUndefined();
  });

  it('行商人: 30%引きの品物を買える', () => {
    let g = newGame();
    const h = g.heroes[0];
    h.gold = 999;
    g.mode = 'event';
    g.party = [h.id];
    g.event = { tile: g.world!.pos[h.id], eventId: 'rPeddler', random: true };
    g = run(g, { type: 'CHOOSE_EVENT', playerId: P, optionIndex: 0, focusUsed: 0 });
    const shop = g.heroes[0].peddler!;
    expect(shop.items.length + shop.cards.length).toBeGreaterThan(0);
    const kind = shop.items.length ? 'item' : 'card';
    const price = kind === 'item' ? shop.items[0].price : shop.cards[0].price;
    g = run(g, { type: 'PEDDLER_BUY', playerId: P, heroId: h.id, kind, index: 0 });
    expect(g.heroes[0].gold).toBe(999 - price);
    g = run(g, { type: 'PEDDLER_BUY', playerId: P, heroId: h.id });
    expect(g.heroes[0].peddler).toBeUndefined();
  });

  it('仮面商人: フォーカスが足りなければ選べない', () => {
    const g = newGame();
    const h = g.heroes[0];
    h.focus = 1;
    g.mode = 'event';
    g.party = [h.id];
    g.event = { tile: g.world!.pos[h.id], eventId: 'rMaskedMerchant', random: true };
    expect(applyGameCommand(g, { type: 'CHOOSE_EVENT', playerId: P, optionIndex: 2, focusUsed: 0 }).error).toContain('フォーカス');
  });
});
