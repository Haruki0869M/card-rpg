// 区切りG-2（2026-11-12）: 装備の見直し（docs/tasks/lineup-stageG2-plan.md。オーナーの答えは全部 A）
// 鍛鉄の刀《初太刀》→ 成功率+15%・均衡の槍《返しの穂先》→ フォーカス+1・鋼の剣《立て直し》・熾火の剣の札・魔法の法衣と鋼の連撃を無くした
import { describe, expect, it } from 'vitest';
import { CARDS, getCard } from '../../data/cards';
import { MERGED_CARDS } from '../../data/cards/merged';
import { ENEMIES } from '../../data/enemies';
import { ITEMS, getItem } from '../../data/items';
import type { BattleEvent, BattleState, Command, GameState } from '../../types';
import { cardChanceBonus, damageModifiers } from '../abilities';
import { STATE_VERSION } from '../battle/battle';
import { applyCommand, createBattle, createGame, toPartyMember } from '../index';
import { battleDeck } from '../game/hero';
import { migrateGame } from '../game/migrations';

const dummy = { icon: 'T', baseLevel: 1, exp: 1, gold: 1, pattern: 'sequence' };
ENEMIES.register({ ...dummy, id: 'g2Idler', name: '確認用の置物', maxHp: 100000, actions: [{ id: 'wait', name: '様子を見る', effects: [{ kind: 'block', amount: 0 }] }] });
ENEMIES.register({ ...dummy, id: 'g2Hitter', name: '確認用の殴る置物', maxHp: 100000, actions: [{ id: 'hit', name: '殴る', effects: [{ kind: 'damage', amount: 5 }] }] });

function game(weapon?: string): GameState {
  const g = createGame({ seed: 11, scenarioId: 'corruptionKing', difficulty: 'normal', party: [{ classId: 'warrior', gender: 'female', name: '仲間1', playerId: 'P1' }] });
  if (weapon) g.heroes[0].equipment.weapon = { uid: 'w0', itemId: weapon }; else delete g.heroes[0].equipment.weapon;
  return g;
}
/** 確認用の戦闘。マナはたっぷり・HPは多め・手札は空 */
function battle(weapon?: string, enemy = 'g2Idler'): BattleState {
  const s = createBattle({ seed: 11, party: game(weapon).heroes.map(toPartyMember), encounter: { id: 'g2', name: '確認', enemies: [{ defId: enemy }] } });
  for (const a of s.allies) { a.mana = 30; a.hp = a.maxHp = 500; a.block = 0; a.hand = []; }
  return s;
}
let uid = 0;
/** カードを手札に足して使う（フォーカスは使わない＝成功の数は乱数のまま） */
function use(s: BattleState, cardId: string): { state: BattleState; events: BattleEvent[] } {
  const a = s.allies[0], inst = { uid: `g${uid++}`, cardId };
  a.hand.push(inst);
  a.mana = Math.max(a.mana, 10);
  const card = getCard(cardId);
  const cmd: Command = { type: 'PLAY_CARD', playerId: 'P1', characterId: a.id, cardInstanceId: inst.uid, targetId: card.target === 'enemy' ? s.enemies[0].uid : undefined, focusUsed: 0 };
  const r = applyCommand(s, cmd);
  expect(r.error, cardId).toBeUndefined();
  return r;
}
function nextTurn(s: BattleState): BattleState {
  let st = applyCommand(s, { type: 'END_TURN', playerId: 'P1' }).state;
  for (let i = 0; st.phase === 'enemy' && i < 20; i++) st = applyCommand(st, { type: 'ENEMY_STEP' }).state;
  return st;
}
const successesOf = (events: BattleEvent[]) => (events.find((e) => e.type === 'roll') as { successes: number }).successes;
const strikeBonus = (s: BattleState) => cardChanceBonus(s.allies[0], getCard('strike'), s.enemies[0], s);

describe('区切りG-2: 鍛鉄の刀《初太刀》', () => {
  it('毎ターン、最初の物理カードだけ成功率+15%。2枚目には付かない。ダメージの倍率は無い', () => {
    let s = battle('forgedKatana'), bare = battle();
    expect(getItem('forgedKatana').ability?.name).toBe('初太刀');
    expect(strikeBonus(s)).toBe(15);
    expect(damageModifiers(s, s.allies[0], getCard('strike'), s.enemies[0]).multiplier).toBeCloseTo(damageModifiers(bare, bare.allies[0], getCard('strike'), bare.enemies[0]).multiplier);
    expect(cardChanceBonus(s.allies[0], getCard('guard'), s.enemies[0], s)).toBe(0); // 物理でないカードには付かない
    s = use(s, 'guard').state; // 物理でないカードは数えない
    expect(strikeBonus(s)).toBe(15);
    s = use(s, 'strike').state;
    expect(strikeBonus(s)).toBe(0);
    expect(strikeBonus(nextTurn(s))).toBe(15);
  });
});

describe('区切りG-2: 均衡の槍《返しの穂先》', () => {
  const focusAfter = (weapon: string | undefined, enemy: string) => { const s = battle(weapon, enemy); s.allies[0].focus = 0; return nextTurn(s).allies[0]; };
  it('敵の番にHPが減らなかったら、次のターンの始めにフォーカス+1', () => {
    expect(getItem('balancedSpear').ability?.name).toBe('返しの穂先');
    const a = focusAfter('balancedSpear', 'g2Idler'), b = focusAfter(undefined, 'g2Idler');
    expect(a.hp).toBe(500);
    expect(a.focus - b.focus).toBe(1);
    // ダメージの倍率はもう無い
    const s = nextTurn(battle('balancedSpear')), bare = nextTurn(battle());
    expect(damageModifiers(s, s.allies[0], getCard('strike'), s.enemies[0]).multiplier).toBeCloseTo(damageModifiers(bare, bare.allies[0], getCard('strike'), bare.enemies[0]).multiplier);
  });
  it('殴られてHPが減ったら付かない', () => {
    const a = focusAfter('balancedSpear', 'g2Hitter'), b = focusAfter(undefined, 'g2Hitter');
    expect(a.hp).toBeLessThan(500);
    expect(a.focus - b.focus).toBe(0);
  });
});

describe('区切りG-2: 鋼の剣《立て直し》', () => {
  it('付いている札は「全力の一撃」2枚', () => {
    const g = game('steelSword');
    expect(battleDeck(g.heroes[0]).filter((c) => c.fromWeapon).map((c) => c.cardId)).toEqual(['cmAllOut', 'cmAllOut']);
    expect(getItem('steelSword').ability?.name).toBe('立て直し');
  });
  it('物理カードが成功0だった後だけ、次の物理カードの成功率+20%。1ターンに1回', () => {
    let s = battle('steelSword');
    let failed = false, sawHit = false;
    // 全力の一撃（成功率65%・2枠）を、成功0が出るまで同じターンに使う。成功が1以上の時は付かない
    for (let i = 0; i < 60 && !failed; i++) {
      const r = use(s, 'cmAllOut');
      s = r.state;
      if (successesOf(r.events) === 0) failed = true;
      else { sawHit = true; expect(strikeBonus(s)).toBe(0); }
    }
    expect(failed).toBe(true);
    expect(sawHit).toBe(true);
    expect(strikeBonus(s)).toBe(20);
    expect(cardChanceBonus(s.allies[0], getCard('magicArrow'), s.enemies[0], s)).toBe(0); // 魔法カードには付かない
    // 次の物理カードで消える。同じターンにもう一度成功0になっても、もう付かない（1ターンに1回）
    let again = false;
    for (let i = 0; i < 60 && !again; i++) {
      const r = use(s, 'cmAllOut');
      s = r.state;
      expect(strikeBonus(s)).toBe(0);
      if (successesOf(r.events) === 0) again = true;
    }
    expect(again).toBe(true);
    // 次のターンは、また付く
    s = nextTurn(s);
    let next = false;
    for (let i = 0; i < 60 && !next; i++) {
      const r = use(s, 'cmAllOut');
      s = r.state;
      if (successesOf(r.events) === 0) next = true;
    }
    expect(next).toBe(true);
    expect(strikeBonus(s)).toBe(20);
  });
});

describe('区切りG-2: 熾火の剣', () => {
  it('付いている札は「炎の術」1枚と「手早い攻撃」1枚。剣だけで《魔法剣》が動く', () => {
    const g = game('smolderSword');
    expect(battleDeck(g.heroes[0]).filter((c) => c.fromWeapon).map((c) => c.cardId).sort()).toEqual(['bladeFire', 'lnGiQuick']);
    expect(getCard('bladeFire').name).toBe('炎の術');
    expect(getItem('smolderSword').ability?.name).toBe('魔法剣');
    let s = battle('smolderSword');
    expect(strikeBonus(s)).toBe(0);
    s = use(s, 'bladeFire').state;
    expect(strikeBonus(s)).toBe(10);
  });
});

describe('区切りG-2: 無くした物と、古い保存データ', () => {
  it('魔法の法衣と鋼の連撃は無い。鋼の連撃は手早い攻撃に読み替える', () => {
    expect(ITEMS.tryGet('magicRobe')).toBeUndefined();
    expect(CARDS.tryGet('wSteelCombo')).toBeUndefined();
    expect(MERGED_CARDS.wSteelCombo).toBe('lnGiQuick');
    for (const i of ITEMS.all) for (const c of i.cards ?? []) expect(c.cardId, i.id).not.toBe('wSteelCombo');
  });
  it('古い保存データ（v25）: 鋼の連撃 → 手早い攻撃、魔法の法衣 → 学び手の法衣（持ち物・装備・どこにあっても）', () => {
    expect(STATE_VERSION).toBe(26);
    const old = structuredClone(game('steelSword')) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    old.version = 25;
    old.heroes[0].deck.push({ uid: 'sc1', cardId: 'wSteelCombo', upgraded: true });
    old.heroes[0].stash.push({ uid: 'mr1', itemId: 'magicRobe' });
    old.heroes[0].pouch.push({ uid: 'mr2', itemId: 'magicRobe' });
    old.heroes[0].equipment.armor = { uid: 'mr3', itemId: 'magicRobe' };
    old.memo = { shop: { items: [{ kind: 'item', item: { uid: 'mr4', itemId: 'magicRobe' }, price: 10 }] } };
    const now = migrateGame(old) as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(now).not.toBeNull();
    expect(now.version).toBe(STATE_VERSION);
    const h = now.heroes[0];
    expect(h.deck.find((c: { uid: string }) => c.uid === 'sc1')).toEqual({ uid: 'sc1', cardId: 'lnGiQuick', upgraded: true });
    expect(h.stash.find((i: { uid: string }) => i.uid === 'mr1')).toEqual({ uid: 'mr1', itemId: 'commonAdeptRobe' });
    expect(h.pouch.find((i: { uid: string }) => i.uid === 'mr2')).toEqual({ uid: 'mr2', itemId: 'commonAdeptRobe' });
    expect(h.equipment.armor).toEqual({ uid: 'mr3', itemId: 'commonAdeptRobe' });
    expect(now.memo.shop.items[0].item.itemId).toBe('commonAdeptRobe');
    expect(JSON.stringify(now)).not.toMatch(/magicRobe|wSteelCombo/);
  });
});
