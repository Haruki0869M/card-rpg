// ===== シートの持ち物の行（実機の不具合②⑥ 2026-11-14）: 画面に依らない決まり（テストできるように部品から分けた） =====
import type { GameCommand, GameState, Hero, ItemInstance } from '../types';

/** 同じ場所にいる仲間（ダンジョンの中なら同じパーティ、世界マップなら同じマス）。渡す相手・使う相手の候補 */
export function placeMates(game: GameState, hero: Hero): Hero[] {
  return game.heroes.filter((h) => {
    if (h === hero || h.retired) return false;
    if (game.party) return game.party.includes(h.id) && game.party.includes(hero.id);
    if (game.expeditions?.some((x) => x.heroes.includes(h.id) || x.heroes.includes(hero.id))) return false;
    return !game.world || game.world.pos[h.id] === game.world.pos[hero.id];
  });
}

/** 渡せない理由（渡せる時は null）。ボタンは消さずに、この文を出す */
export function giveBlockReason(game: GameState, hero: Hero): string | null {
  if (game.mode === 'battle') return '戦闘中は渡せません（戦闘が終わってから渡せます）';
  if (!placeMates(game, hero).length) return '同じ場所に仲間がいないので渡せません（同じマスか、同じダンジョンの組の仲間にだけ渡せます）';
  return null;
}

/** 道具を使えない理由（使える時は null）。道具袋のシートと同じ決まり: 戦闘中は行動中のキャラの袋だけ */
export function useBlockReason(game: GameState, hero: Hero, activeId: string): string | null {
  if (game.mode !== 'battle') return null;
  if (hero.id !== activeId) {
    const active = game.heroes.find((h) => h.id === activeId);
    return `戦闘中は、行動中のキャラ${active ? `（${active.name}）` : ''}の道具だけ使えます`;
  }
  if (game.battle && game.battle.phase !== 'ally') return '味方の番の時に使えます';
  return null;
}

/** 持ち物の行: 道具（同じ物はまとめる）と装備の予備 */
export function itemRows(hero: Hero): { pouch: { itemId: string; uids: string[] }[]; stash: ItemInstance[] } {
  const groups = new Map<string, string[]>();
  for (const p of hero.pouch) groups.set(p.itemId, [...(groups.get(p.itemId) ?? []), p.uid]);
  return { pouch: [...groups.entries()].map(([itemId, uids]) => ({ itemId, uids })), stash: hero.stash };
}

/** 開いている行。行の品物がもう無い（仲間が使った・渡した・取り直しで変わった）時は null（古い物を指したまま描かない） */
export type OpenRow = { kind: 'pouch' | 'stash'; uid: string; mode: 'use' | 'give' } | { kind: 'gold'; mode: 'give' };
export function liveRow(hero: Hero | undefined, row: OpenRow | null): OpenRow | null {
  if (!hero || !row) return null;
  if (row.kind === 'gold') return row;
  const bag = row.kind === 'pouch' ? hero.pouch : hero.stash;
  return bag.some((x) => x.uid === row.uid) ? row : null;
}

/** 渡す命令（playerId はストアの actorOf が、渡すキャラの担当の席に直す） */
export function giveCommand(hero: Hero, toHeroId: string, what: { itemUid?: string; gold?: number }): GameCommand {
  return { type: 'GIVE', playerId: hero.playerId, fromHeroId: hero.id, toHeroId, ...what };
}

/** ゴールドを渡す量の候補（10G・50G・全部。持っている分まで） */
export function goldChoices(gold: number): number[] {
  return [10, 50, gold].filter((v, i, a) => v > 0 && v <= gold && a.indexOf(v) === i);
}
