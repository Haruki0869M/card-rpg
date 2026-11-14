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
  return [...out, ...claimWaits(game, r.claim, isLocal)];
}

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
