// ===== 回3 A: 待っている側に「相手が今何をしているか」を出す（画面用の純粋な関数） =====
// オーナーの実機（2人オンライン）: 強敵に勝った後、P1 は戦利品の「余れば」を押して、
// 「戦利品の取り合いが終わるのを待っています」としか出ないまま約40秒待った（その間 P2 はカード報酬を選んでいた）。
// 待ちが起きる所（報酬・宝箱の取り合い・町や祭壇などの施設）で、だれが・何を選んでいるかを同じ形で返す。
// 1台で全員を動かす時（isLocal がいつも true）は、何も返さない。
import { getItem } from '../../data/items';
import { cardOfferHeroes, findHero } from '../../engine';
import { facilityMembers, facilityVisit } from '../../engine/game/world/facilities';
import type { GameState, LootClaim, PlayerId } from '../../types';

export interface WaitNote {
  /** 待っている相手の席 */
  playerId: PlayerId;
  /** 何をしているか（「〇〇さんが」の後に続く文） */
  what: string;
}

const claimWaits = (game: GameState, c: LootClaim | undefined, isLocal: (p: PlayerId) => boolean): WaitNote[] => {
  if (!c || c.rolls) return [];
  const item = getItem(c.item.itemId).name;
  return c.heroes.flatMap((id) => {
    const h = findHero(game, id);
    return h && !c.choices[id] && !isLocal(h.playerId) ? [{ playerId: h.playerId, what: `${h.name}で、戦利品（${item}）を欲しいか選んでいます` }] : [];
  });
};

/** 戦闘の報酬: レベルアップの成長・カード報酬・戦利品の取り合いで、ほかの人がまだ選んでいる物 */
export function rewardWaits(game: GameState, isLocal: (p: PlayerId) => boolean): WaitNote[] {
  const r = game.reward;
  if (game.mode !== 'reward' || !r) return [];
  const out: WaitNote[] = [];
  const lu = r.levelUps[0];
  const luHero = lu ? findHero(game, lu.heroId) : undefined;
  if (luHero && !isLocal(luHero.playerId)) out.push({ playerId: luHero.playerId, what: `${luHero.name}のレベルアップの成長を選んでいます` });
  for (const id of cardOfferHeroes(r)) {
    if (r.cardDone?.includes(id)) continue;
    const h = findHero(game, id);
    if (h && !isLocal(h.playerId)) out.push({ playerId: h.playerId, what: `${h.name}の山札に加えるカードを選んでいます` });
  }
  // 実機の不具合④(1): 取り合いは、成長とカードが全員そろってから出す。その前は「取り合いを選んでいます」と書かない（まだ見えていないので）
  return [...out, ...(out.length || rewardGrowthOrCardLeft(game) ? [] : claimWaits(game, r.claim, isLocal))];
}

/** 成長かカード報酬が、まだだれかに残っているか（取り合いを出す前の段） */
const rewardGrowthOrCardLeft = (game: GameState) => {
  const r = game.reward;
  return !!r && (r.levelUps.length > 0 || cardOfferHeroes(r).some((id) => !r.cardDone?.includes(id)));
};

/**
 * 実機の不具合④(1)（オーナーの決定 2026-11-14）: 勝利画面の順番は「成長 → 自分のカード → 戦利品の取り合い」。
 * この端末が今すること。エンジンの決まり（成長は先頭から順・カードと取り合いは別に受け付ける）は変えず、画面の出し方だけで順番を作る。
 *   - growth: この端末のキャラのレベルアップ（成長は levelUps の先頭から順。エンジンの決まり）
 *   - card:   この端末のキャラのカード報酬（ほかの人の成長を待つ間も、自分のカードは先に選べる。回3 A のまま）
 *   - claim:  戦利品の取り合いに答える（全員の成長とカードが終わってから。画面の真ん中に出す）
 *   - wait:   ほかの人を待つ（notes = だれが何を選んでいるか）
 *   - finish: 「先へ進む」
 * isAway: 通信が切れていて、だれも代わりに操作していない席。その席の成長・カードの残りは、取り合いを出すのを止めない
 * （切断した人の分で、取り合いがいつまでも出ない、を作らない。その席の分は今までどおり「代わりに操作」で進める）
 */
export type RewardStep = { kind: 'growth' } | { kind: 'card'; heroId: string } | { kind: 'claim' } | { kind: 'wait'; notes: WaitNote[] } | { kind: 'finish' };

export function rewardStep(game: GameState, isLocal: (p: PlayerId) => boolean, isAway: (p: PlayerId) => boolean = () => false): RewardStep {
  const r = game.reward;
  if (!r) return { kind: 'finish' };
  const owner = (id: string) => findHero(game, id)?.playerId;
  const lu = r.levelUps[0];
  const luOwner = lu ? owner(lu.heroId) : undefined;
  if (luOwner && isLocal(luOwner)) return { kind: 'growth' };
  const pending = cardOfferHeroes(r).filter((id) => !r.cardDone?.includes(id));
  const mine = pending.find((id) => isLocal(owner(id) ?? 'P1'));
  if (mine) return { kind: 'card', heroId: mine };
  const c = r.claim;
  if (c && !c.rolls && rewardClaimVisible(game, isAway) && c.heroes.some((id) => !c.choices[id] && isLocal(owner(id) ?? 'P1'))) return { kind: 'claim' };
  if (lu || pending.length || (c && !c.rolls)) return { kind: 'wait', notes: rewardWaits(game, isLocal) };
  return { kind: 'finish' };
}

/** 取り合いのパネルを出してよいか（全員の成長とカードが終わった。結果が出た後も出す） */
export const rewardClaimVisible = (game: GameState, isAway: (p: PlayerId) => boolean = () => false): boolean => {
  const r = game.reward;
  if (!r?.claim) return false;
  if (r.claim.rolls) return true;
  const owner = (id: string) => findHero(game, id)?.playerId;
  const blocking = (id: string) => {
    const p = owner(id);
    return !!p && !isAway(p);
  };
  return !r.levelUps.some((x) => blocking(x.heroId)) && !cardOfferHeroes(r).some((id) => !r.cardDone?.includes(id) && blocking(id));
};

/** 宝箱の中身の取り合い（2人以上で開けた宝箱）で、ほかの人がまだ選んでいる物 */
export function chestClaimWaits(game: GameState, isLocal: (p: PlayerId) => boolean): WaitNote[] {
  if (game.mode !== 'chest') return [];
  return (game.chest?.claims ?? []).flatMap((c) => claimWaits(game, c, isLocal));
}

const PLACE: Partial<Record<GameState['mode'], string>> = { town: '町', shrine: '祠', sanctuary: '施設' };

/** 町・祠・神殿・祭壇: ほかの人のキャラで、まだ利用を終えていない物 */
export function facilityWaits(game: GameState, isLocal: (p: PlayerId) => boolean): WaitNote[] {
  const place = PLACE[game.mode];
  if (!place) return [];
  const v = facilityVisit(game);
  return facilityMembers(game).flatMap((id) => {
    const h = findHero(game, id);
    if (!h || v?.finished?.includes(id) || h.hp <= 0 || h.retired || isLocal(h.playerId)) return [];
    return [{ playerId: h.playerId, what: `${h.name}で、まだ${place}を利用しています` }];
  });
}
